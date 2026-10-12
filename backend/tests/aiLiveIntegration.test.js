const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');

const app = require('../src/app');
const DocumentMetadata = require('../src/models/documentMetadata');
const { pool } = require('../src/config/database');

const liveEnabled = process.env.DLR_RUN_AI_INTEGRATION === '1' && Boolean(process.env.AI_SERVICE_URL);
const liveGeometry = {
  type: 'Polygon',
  coordinates: [[[500000, 1300000], [500010, 1300000], [500010, 1300010], [500000, 1300010], [500000, 1300000]]],
};

function syntheticLandRecordPdf() {
  const content = [
    'BT',
    '/F1 24 Tf',
    '72 720 Td',
    '(Owner: TEST_OWNER_NAME) Tj',
    '0 -42 Td',
    '(Survey No: 125/3A) Tj',
    '0 -42 Td',
    '(Area: 2.50 Acres) Tj',
    '0 -42 Td',
    '(Village: TEST_VILLAGE) Tj',
    '0 -42 Td',
    '(Taluk: TEST_TALUK) Tj',
    'ET',
    '',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}endstream`,
  ];
  let output = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, 'ascii'));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(output, 'ascii');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    output += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(output, 'ascii');
}

test('live backend upload reaches the configured AI service and returns a pipeline result', {
  skip: !liveEnabled
    ? 'Set DLR_RUN_AI_INTEGRATION=1 and AI_SERVICE_URL to run the live AI integration test.'
    : false,
}, async () => {
  const originalFilename = `dlr-ai-live-${Date.now()}.pdf`;
  const uploadPath = path.join(__dirname, originalFilename);
  const originalIds = new Set(DocumentMetadata.store.keys());
  fs.writeFileSync(uploadPath, syntheticLandRecordPdf());
  const previousTimeout = process.env.AI_SERVICE_TIMEOUT_MS;
  process.env.AI_SERVICE_TIMEOUT_MS = process.env.AI_SERVICE_TIMEOUT_MS || '120000';

  try {
    const config = require('../src/config/env');
    const otp = await request(app)
      .post('/api/auth/citizen/otp/request')
      .send({ aadhaarNumber: '999988881234' });
    const login = await request(app)
      .post('/api/auth/citizen/otp/verify')
      .send({
        aadhaarNumber: '999988881234',
        otp: config.devOtp || '123456',
        sessionId: otp.body.data.sessionId,
      });
    const citizenToken = login.body.data.accessToken;

    const response = await request(app)
      .post('/api/documents/process')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('language', 'eng')
      .field('geometry', JSON.stringify(liveGeometry))
      .field('crs', 'EPSG:32644')
      .attach('file', uploadPath, { filename: path.basename(uploadPath), contentType: 'application/pdf' });

    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.document.status, 'PROCESSED');
    assert.equal(response.body.data.ocr.status, 'COMPLETED');
    assert.ok(response.body.data.ocr.confidence === null || response.body.data.ocr.confidence >= 0);
    assert.ok(response.body.data.extraction && typeof response.body.data.extraction === 'object');
    assert.equal(response.body.data.extraction.owner_name.value, 'TEST_OWNER_NAME');
    assert.equal(response.body.data.extraction.survey_number.value, '125/3A');
    assert.ok(response.body.data.extraction.survey_number.source_page >= 1);
    assert.ok(response.body.data.validation && typeof response.body.data.validation.status === 'string');
    assert.ok(response.body.data.gis && typeof response.body.data.gis.status === 'string');
    assert.equal(response.body.data.review.required, true);
    assert.ok(response.body.data.review.case_id);

    if (pool) {
      const documentResult = await pool.query(
        'SELECT processing_status FROM documents WHERE document_id = ?',
        [response.body.data.document.document_id],
      );
      assert.equal(documentResult.rows[0]?.processing_status, 'PROCESSED');

      const caseResult = await pool.query(
        'SELECT land_record_id, case_data FROM review_cases WHERE case_id = ? AND document_id = ?',
        [response.body.data.review.case_id, response.body.data.document.document_id],
      );
      assert.equal(caseResult.rows.length, 1);
      const landRecordId = caseResult.rows[0].land_record_id;
      assert.ok(landRecordId);
      const caseData = typeof caseResult.rows[0].case_data === 'string' ? JSON.parse(caseResult.rows[0].case_data) : caseResult.rows[0].case_data;
      assert.ok(caseData.validation_result);
      assert.ok(caseData.gis_result);

      const [fields, validation] = await Promise.all([
        pool.query('SELECT count(*) AS count FROM land_record_fields WHERE land_record_id = ?', [landRecordId]),
        pool.query('SELECT count(*) AS count FROM validation_results WHERE land_record_id = ?', [landRecordId]),
      ]);
      assert.ok(Number(fields.rows[0].count) > 0);
      assert.equal(Number(validation.rows[0].count), 1);
    }
  } finally {
    if (previousTimeout === undefined) delete process.env.AI_SERVICE_TIMEOUT_MS;
    else process.env.AI_SERVICE_TIMEOUT_MS = previousTimeout;
    fs.rmSync(uploadPath, { force: true });

    if (pool) {
      const documentResult = await pool.query(
        'SELECT document_id, stored_filename FROM documents WHERE original_filename = ?',
        [originalFilename],
      );
      for (const document of documentResult.rows) {
        const casesResult = await pool.query(
          'SELECT case_id, land_record_id FROM review_cases WHERE document_id = ?',
          [document.document_id],
        );
        for (const reviewCase of casesResult.rows) {
          await pool.query('DELETE FROM review_cases WHERE case_id = ?', [reviewCase.case_id]);
        }
        await pool.query('DELETE FROM documents WHERE document_id = ?', [document.document_id]);
        for (const reviewCase of casesResult.rows) {
          if (reviewCase.land_record_id) {
            await pool.query('DELETE FROM land_records WHERE id = ?', [reviewCase.land_record_id]);
          }
        }
        fs.rmSync(path.resolve(__dirname, '..', 'uploads', 'documents', document.stored_filename), { force: true });
      }
    }

    for (const [documentId, record] of DocumentMetadata.store.entries()) {
      if (originalIds.has(documentId)) continue;
      DocumentMetadata.store.delete(documentId);
      fs.rmSync(path.resolve(__dirname, '..', record.storage_path), { force: true });
    }
  }
});
