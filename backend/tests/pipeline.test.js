const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const http = require('node:http');
const request = require('supertest');

const app = require('../src/app');
const config = require('../src/config/env');
const { landRecordPipelineService } = require('../src/services/landRecordPipelineService');

let citizenToken;

test.before(async () => {
  const otp = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });
  assert.equal(otp.status, 200, otp.text);
  const login = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({
      aadhaarNumber: '999988881234',
      otp: config.devOtp || '123456',
      sessionId: otp.body.data.sessionId,
    });
  assert.equal(login.status, 200, login.text);
  citizenToken = login.body.data.accessToken;
});

function aiResponses({
  reviewRequired = true,
  gisReviewRequired = true,
  ocrConfidence = 91.25,
  fields = {
    owner_name: { value: 'TEST_OWNER_NAME', confidence: 0.96, source_page: 1, source_bbox: { left: 1, top: 2, width: 30, height: 10 }, method: 'rule' },
    survey_number: { value: '125/3A', confidence: 0.97, source_page: 1, source_bbox: { left: 3, top: 5, width: 20, height: 9 }, method: 'rule' },
    area: { value: '2.50 Acres', confidence: 0.95, method: 'rule' },
    village: { value: 'Test Village', confidence: 0.95, method: 'rule' },
    taluk: { value: 'Test Taluk', confidence: 0.95, method: 'rule' },
    district: { value: 'Test District', confidence: 0.95, method: 'rule' },
  },
} = {}) {
  return {
    '/health': { success: true, status: 'ok', service: 'dlr-ai-service' },
    '/api/v1/documents/process': {
      success: true,
      document: { document_id: 'ai-generated-document', filename: 'source-record', pages: 1 },
      ocr: { language: 'eng', text: 'Owner: TEST_OWNER_NAME', confidence: ocrConfidence },
      fields,
    },
    '/api/v1/validation/land-record': {
      success: true,
      validation: {
        status: reviewRequired ? 'REVIEW_REQUIRED' : 'PASS',
        overall_score: reviewRequired ? 72 : 98,
        checks: [],
        issues: reviewRequired ? [{ rule: 'LOW_CONFIDENCE', field: 'area', severity: 'WARNING', message: 'Officer verification required.' }] : [],
        review_required: reviewRequired,
      },
    },
    '/api/v1/gis/land-record': {
      success: true,
      crs: 'EPSG:32644',
      gis_validation: {
        geometry_type: 'Polygon',
        geometry_valid: true,
        area: { value: 10000, unit: 'square_metre', warning: null },
        boundary: { status: 'VALID', issues: [] },
        spatial_confidence: 0.88,
        review_required: gisReviewRequired,
        issues: [],
        score: 88,
        factors: [],
      },
      document_area: { value: 2.5, unit: 'acre' },
      gis_area: { value: 10000, unit: 'square_metre' },
      area_difference: { absolute: 117.14, percentage: 1.16 },
      classification: 'MINOR_VARIANCE',
      review_required: gisReviewRequired,
      geometry_valid: true,
      spatial_relationships: [],
    },
    '/api/v1/review/cases': {
      success: true,
      case: { case_id: 'CASE-TEST-001', status: 'PENDING_REVIEW' },
    },
  };
}

async function startAIStub({ responses = aiResponses(), delayPath = null, delayMs = 0, statusByPath = {} } = {}) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    calls.push({ method: req.method, path: req.url, headers: req.headers, body: body.toString('utf8') });

    if (req.url === delayPath && delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (res.destroyed) return;
    }

    const payload = responses[req.url];
    if (!payload) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ detail: { error: 'NOT_FOUND', message: 'No mock route.' } }));
      return;
    }
    res.writeHead(statusByPath[req.url] || 200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(payload));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    calls,
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function pdfBuffer() {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
}

function pngBuffer() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
}

function squarePolygon() {
  return {
    type: 'Polygon',
    coordinates: [[[500000, 1300000], [500010, 1300000], [500010, 1300010], [500000, 1300010], [500000, 1300000]]],
  };
}

async function runUpload({ filename, contentType, file, aiUrl, timeoutMs = 1000, geometry, crs, formFields = {} }) {
  const priorUrl = process.env.AI_SERVICE_URL;
  const priorTimeout = process.env.AI_SERVICE_TIMEOUT_MS;
  const previousDependencies = {
    documents: landRecordPipelineService.documents,
    landRecords: landRecordPipelineService.landRecords,
    reviews: landRecordPipelineService.reviews,
    audit: landRecordPipelineService.audit,
  };
  const documentStore = new Map();
  const uploadPaths = new Set();
  const landRecords = new Map();
  const documents = {
    async uploadDocument(req) {
      uploadPaths.add(req.file.path);
      const record = {
        document_id: `DOC-TEST-${crypto.randomUUID()}`,
        created_by_user_id: req.user.id,
        original_filename: req.file.originalname,
        file_type: path.extname(req.file.originalname).slice(1).toLowerCase(),
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        storage_path: req.file.path,
        processing_status: 'UPLOADED',
      };
      documentStore.set(record.document_id, record);
      return record;
    },
    async updateDocumentStatus(documentId, status) {
      const document = documentStore.get(documentId);
      document.processing_status = status;
      return document;
    },
    async updateDocumentLandRecord(documentId, landRecordId) {
      documentStore.get(documentId).land_record_id = landRecordId;
    },
    async saveProcessingResult(documentId, result) {
      documentStore.get(documentId).processing_result = result;
    },
  };
  const reviews = {
    cases: [],
    async createCase(caseData) {
      const reviewCase = { ...caseData, case_id: 'CASE-TEST-001' };
      this.cases.push(reviewCase);
      return reviewCase;
    },
  };
  const audit = { async logAuditEvent() {} };
  landRecordPipelineService.documents = documents;
  landRecordPipelineService.landRecords = {
    async create(recordData) {
      const record = { ...recordData, id: `LAND-TEST-${crypto.randomUUID()}` };
      landRecords.set(record.id, record);
      return record;
    },
    async createValidationResult() {},
  };
  landRecordPipelineService.reviews = reviews;
  landRecordPipelineService.audit = audit;
  process.env.AI_SERVICE_URL = aiUrl;
  process.env.AI_SERVICE_TIMEOUT_MS = String(timeoutMs);
  try {
    let call = request(app)
      .post('/api/documents/process')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('language', 'eng');
    if (geometry) {
      call = call.field('geometry', JSON.stringify(geometry)).field('crs', crs || '');
    }
    for (const [key, value] of Object.entries(formFields)) {
      if (value !== undefined && value !== null) call = call.field(key, String(value));
    }
    const response = await call.attach('file', file, { filename, contentType });
    const cleanup = () => {
      landRecordPipelineService.documents = previousDependencies.documents;
      landRecordPipelineService.landRecords = previousDependencies.landRecords;
      landRecordPipelineService.reviews = previousDependencies.reviews;
      landRecordPipelineService.audit = previousDependencies.audit;
      for (const uploadPath of uploadPaths) {
        if (fs.existsSync(uploadPath)) fs.unlinkSync(uploadPath);
      }
    };
    return {
      response,
      cleanup,
      documentStore,
      landRecords,
      reviews,
    };
  } finally {
    landRecordPipelineService.documents = previousDependencies.documents;
    landRecordPipelineService.landRecords = previousDependencies.landRecords;
    landRecordPipelineService.reviews = previousDependencies.reviews;
    landRecordPipelineService.audit = previousDependencies.audit;
    if (priorUrl === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = priorUrl;
    if (priorTimeout === undefined) delete process.env.AI_SERVICE_TIMEOUT_MS;
    else process.env.AI_SERVICE_TIMEOUT_MS = priorTimeout;
  }
}

test('POST /api/documents/process sends a PDF through OCR, extraction, validation, review, and persistence', async () => {
  const stub = await startAIStub();
  const result = await runUpload({ filename: 'land-record.pdf', contentType: 'application/pdf', file: pdfBuffer(), aiUrl: stub.url });
  try {
    const { response } = result;
    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.success, true);
    const data = response.body.data;
    assert.equal(data.document.status, 'PROCESSED');
    assert.equal(data.ocr.confidence, 0.9125);
    assert.equal(data.extraction.owner_name.value, 'TEST_OWNER_NAME');
    assert.equal(data.validation.review_required, true);
    assert.equal(data.review.required, true);
    assert.equal(data.review.case_id, 'CASE-TEST-001');
    assert.equal(stub.calls[0].path, '/api/v1/documents/process');
    assert.match(stub.calls[0].headers['content-type'], /^multipart\/form-data; boundary=/);
    assert.ok(stub.calls.some((call) => call.path === '/api/v1/validation/land-record'));
    assert.ok(!stub.calls.some((call) => call.path === '/api/v1/review/cases'));
    assert.equal(result.documentStore.get(data.document.document_id).processing_status, 'PROCESSED');
    assert.equal(result.documentStore.get(data.document.document_id).land_record_id, data.document.land_record_id);
    assert.ok(result.landRecords.has(data.document.land_record_id));
    assert.equal(result.reviews.cases[0].status, 'PENDING_REVIEW');
  } finally {
    result.cleanup();
    await stub.close();
  }
});

test('low OCR confidence and missing fields remain AI-generated and require officer review', async () => {
  const stub = await startAIStub({
    responses: aiResponses({
      ocrConfidence: 0.42,
      fields: {
        owner_name: { value: 'TEST_OWNER_NAME', confidence: 0.48 },
        survey_number: { value: '125/3A', confidence: 0.54 },
      },
    }),
  });
  const result = await runUpload({
    filename: 'low-confidence.pdf',
    contentType: 'application/pdf',
    file: pdfBuffer(),
    aiUrl: stub.url,
  });
  try {
    assert.equal(result.response.status, 200, result.response.text);
    const data = result.response.body.data;
    assert.equal(data.ocr.confidence, 0.42);
    assert.equal(data.land_record.owner_name, 'TEST_OWNER_NAME');
    assert.equal(data.land_record.survey_number, '125/3A');
    assert.equal(data.land_record.area_value, null);
    assert.equal(data.land_record.village, null);
    assert.equal(data.land_record.status, 'AI_GENERATED');
    assert.equal(data.review.status, 'PENDING_REVIEW');
    assert.equal(
      result.reviews.cases[0].anomalies.filter((anomaly) => anomaly.type === 'LOW_FIELD_CONFIDENCE').length,
      2,
    );
  } finally {
    result.cleanup();
    await stub.close();
  }
});

test('POST /api/documents/process stores citizen-submitted details separately and shows pending officer verification', async () => {
  const stub = await startAIStub({
    responses: aiResponses({
      fields: {
        owner_name: { value: 'AI Owner', confidence: 0.91, method: 'rule' },
        survey_number: { value: '928/375A', confidence: 0.92, method: 'rule' },
        area: { value: '2.30 Acres', confidence: 0.90, method: 'rule' },
        village: { value: 'Alaputhur', confidence: 0.89, method: 'rule' },
        taluk: { value: 'Salem', confidence: 0.88, method: 'rule' },
        district: { value: 'Salem', confidence: 0.87, method: 'rule' },
      },
    }),
  });
  const result = await runUpload({
    filename: 'manual-details.pdf',
    contentType: 'application/pdf',
    file: pdfBuffer(),
    aiUrl: stub.url,
    formFields: {
      owner_name: 'Sowkath Ali',
      aadhaar_number: '123456789012',
      survey_number: '928/375A',
      area: '2.35 Acres',
      village: 'Alaputhur',
      taluk: 'Salem',
      district: 'Salem',
    },
  });
  try {
    const { response } = result;
    assert.equal(response.status, 200, response.text);
    const data = response.body.data;
    assert.equal(data.status, 'PENDING_OFFICER_VERIFICATION');
    assert.equal(data.document_status, 'PENDING_OFFICER_VERIFICATION');
    assert.deepEqual(data.citizen_submitted_data, {
      owner_name: 'Sowkath Ali',
      aadhaar_number: 'XXXX-XXXX-9012',
      survey_number: '928/375A',
      area: '2.35 Acres',
      village: 'Alaputhur',
      taluk: 'Salem',
      district: 'Salem',
    });
    assert.equal(data.ai_extracted_data.owner_name, 'AI Owner');
    assert.equal(data.ai_extracted_data.survey_number, '928/375A');
    assert.equal(data.ai_extracted_data.area, '2.30 Acres');
    assert.equal(data.ai_extracted_data.aadhaar_number, null);
    assert.equal(data.citizen_submitted_data.aadhaar_number, 'XXXX-XXXX-9012');
  } finally {
    result.cleanup();
    await stub.close();
  }
});

test('POST /api/documents/process sends a JPG and optional geometry to GIS', async () => {
  const stub = await startAIStub({ responses: aiResponses({ reviewRequired: false, gisReviewRequired: false }) });
  const result = await runUpload({
    filename: 'parcel.jpg',
    contentType: 'image/jpeg',
    file: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]),
    aiUrl: stub.url,
    geometry: squarePolygon(),
    crs: 'EPSG:32644',
  });
  try {
    const { response } = result;
    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.data.gis.status, 'VALID');
    assert.equal(response.body.data.gis.area_match, 'MINOR_VARIANCE');
    assert.deepEqual(response.body.data.gis.overlaps, []);
    assert.ok(stub.calls.some((call) => call.path === '/api/v1/gis/land-record' && call.body.includes('EPSG:32644')));
    assert.ok(!stub.calls.some((call) => call.path === '/api/v1/review/cases'));
  } finally {
    result.cleanup();
    await stub.close();
  }
});

test('POST /api/documents/process rejects invalid files before contacting AI', async () => {
  const stub = await startAIStub();
  try {
    const response = await request(app)
      .post('/api/documents/process')
      .set('Authorization', `Bearer ${citizenToken}`)
      .attach('file', Buffer.from('not a supported document'), { filename: 'notes.txt', contentType: 'text/plain' });
    assert.equal(response.status, 415);
    assert.equal(response.body.error.code, 'INVALID_FILE_TYPE');
    assert.equal(stub.calls.length, 0);
  } finally {
    await stub.close();
  }
});

test('POST /api/documents/process reports AI service unavailable and persists FAILED status', async () => {
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const unavailableUrl = `http://127.0.0.1:${probe.address().port}`;
  await new Promise((resolve) => probe.close(resolve));
  const result = await runUpload({ filename: 'offline.pdf', contentType: 'application/pdf', file: pdfBuffer(), aiUrl: unavailableUrl, timeoutMs: 500 });
  try {
    assert.equal(result.response.status, 503);
    assert.equal(result.response.body.error.code, 'AI_SERVICE_UNAVAILABLE');
    assert.equal(result.documentStore.get(result.response.body.error.details.document_id).processing_status, 'FAILED');
  } finally {
    result.cleanup();
  }
});

test('POST /api/documents/process reports AI timeout distinctly', async () => {
  const stub = await startAIStub({ delayPath: '/api/v1/documents/process', delayMs: 100 });
  const result = await runUpload({ filename: 'slow.pdf', contentType: 'application/pdf', file: pdfBuffer(), aiUrl: stub.url, timeoutMs: 20 });
  try {
    assert.equal(result.response.status, 504);
    assert.equal(result.response.body.error.code, 'AI_SERVICE_TIMEOUT');
  } finally {
    result.cleanup();
    await stub.close();
  }
});

test('POST /api/documents/process returns upstream validation errors instead of hiding them', async () => {
  const stub = await startAIStub({ statusByPath: { '/api/v1/validation/land-record': 503 } });
  const result = await runUpload({ filename: 'validation-error.pdf', contentType: 'application/pdf', file: pdfBuffer(), aiUrl: stub.url });
  try {
    assert.equal(result.response.status, 502);
    assert.equal(result.response.body.error.code, 'AI_VALIDATION_FAILED');
  } finally {
    result.cleanup();
    await stub.close();
  }
});
