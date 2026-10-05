const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const request = require('supertest');

const app = require('../src/app');
const DocumentMetadata = require('../src/models/documentMetadata');

function aiResponses({ reviewRequired = true, gisReviewRequired = true } = {}) {
  return {
    '/health': { success: true, status: 'ok', service: 'dlr-ai-service' },
    '/api/v1/documents/process': {
      success: true,
      document: { document_id: 'ai-generated-document', filename: 'source-record', pages: 1 },
      ocr: { language: 'eng', text: 'Owner: TEST_OWNER_NAME', confidence: 91.25 },
      fields: {
        owner_name: { value: 'TEST_OWNER_NAME', confidence: 0.96, source_page: 1, source_bbox: { left: 1, top: 2, width: 30, height: 10 }, method: 'rule' },
        survey_number: { value: '125/3A', confidence: 0.97, source_page: 1, source_bbox: { left: 3, top: 5, width: 20, height: 9 }, method: 'rule' },
        area: { value: '2.50 Acres', confidence: 0.95, method: 'rule' },
        village: { value: 'Test Village', confidence: 0.95, method: 'rule' },
        taluk: { value: 'Test Taluk', confidence: 0.95, method: 'rule' },
        district: { value: 'Test District', confidence: 0.95, method: 'rule' },
      },
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

async function runUpload({ filename, contentType, file, aiUrl, timeoutMs = 1000, geometry, crs }) {
  const priorUrl = process.env.AI_SERVICE_URL;
  const priorTimeout = process.env.AI_SERVICE_TIMEOUT_MS;
  process.env.AI_SERVICE_URL = aiUrl;
  process.env.AI_SERVICE_TIMEOUT_MS = String(timeoutMs);
  const existingIds = new Set(DocumentMetadata.store.keys());
  try {
    let call = request(app).post('/api/documents/process').field('language', 'eng');
    if (geometry) {
      call = call.field('geometry', JSON.stringify(geometry)).field('crs', crs || '');
    }
    const response = await call.attach('file', file, { filename, contentType });
    return {
      response,
      cleanup: () => {
        for (const [documentId, record] of DocumentMetadata.store.entries()) {
          if (existingIds.has(documentId)) continue;
          DocumentMetadata.store.delete(documentId);
          const storedPath = path.resolve(__dirname, '..', record.storage_path);
          if (fs.existsSync(storedPath)) fs.unlinkSync(storedPath);
        }
      },
    };
  } finally {
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
    assert.equal(data.ocr.confidence, 91.25);
    assert.equal(data.extraction.owner_name.value, 'TEST_OWNER_NAME');
    assert.equal(data.validation.review_required, true);
    assert.equal(data.review.required, true);
    assert.equal(data.review.case_id, 'CASE-TEST-001');
    assert.equal(stub.calls[0].path, '/api/v1/documents/process');
    assert.match(stub.calls[0].headers['content-type'], /^multipart\/form-data; boundary=/);
    assert.ok(stub.calls.some((call) => call.path === '/api/v1/validation/land-record'));
    assert.ok(stub.calls.some((call) => call.path === '/api/v1/review/cases'));
    const stored = await request(app).get(`/api/documents/${data.document.document_id}`);
    assert.equal(stored.status, 200);
    assert.equal(stored.body.data.processing_status, 'PROCESSED');
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
    const stored = await request(app).get(`/api/documents/${result.response.body.error.details.document_id}`);
    assert.equal(stored.status, 200);
    assert.equal(stored.body.data.processing_status, 'FAILED');
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
