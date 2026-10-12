const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');

const app = require('../src/app');
const config = require('../src/config/env');
let citizenToken;

test.before(async () => {
  const otpResponse = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });
  assert.equal(otpResponse.status, 200);
  assert.equal(otpResponse.body.data.devOtp, undefined);

  const loginResponse = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({
      aadhaarNumber: '999988881234',
      otp: config.devOtp || '123456',
      sessionId: otpResponse.body.data.sessionId,
    });
  assert.equal(loginResponse.status, 200);
  citizenToken = loginResponse.body.data.accessToken;
});

function authenticatedUpload() {
  return request(app)
    .post('/api/documents/upload')
    .set('Authorization', `Bearer ${citizenToken}`);
}

function makeUploadBuffer({ name, mimeType, content, extension }) {
  const fileBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  return {
    name,
    mimeType,
    extension,
    file: fileBuffer,
  };
}

function uniqueContent(content) {
  return Buffer.concat([Buffer.from(content), Buffer.from(crypto.randomUUID())]);
}

test('POST /api/documents/upload accepts a valid PDF', async () => {
  const pdfBuffer = uniqueContent('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

  const response = await authenticatedUpload()
    .attach('file', pdfBuffer, { filename: 'test-document.pdf', contentType: 'application/pdf' });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.match(response.body.data.document_id, /^DOC-\d{8}-[a-z0-9]+$/i);
  assert.equal(response.body.data.file_type, 'pdf');
  assert.equal(response.body.data.processing_status, 'UPLOADED');
});

test('POST /api/documents/upload accepts a valid JPG', async () => {
  const jpgBuffer = uniqueContent([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

  const response = await authenticatedUpload()
    .attach('file', jpgBuffer, { filename: 'scan.jpg', contentType: 'image/jpeg' });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.file_type, 'jpg');
  assert.equal(response.body.data.mime_type, 'image/jpeg');
});

test('POST /api/documents/upload accepts a valid PNG', async () => {
  const pngBuffer = uniqueContent([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

  const response = await authenticatedUpload()
    .attach('file', pngBuffer, { filename: 'map.png', contentType: 'image/png' });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.file_type, 'png');
  assert.equal(response.body.data.mime_type, 'image/png');
});

test('POST /api/documents/upload rejects unsupported files', async () => {
  const response = await authenticatedUpload()
    .attach('file', Buffer.from('not-a-real-land-document'), { filename: 'notes.txt', contentType: 'text/plain' });

  assert.equal(response.status, 415);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'INVALID_FILE_TYPE');
});

test('POST /api/documents/upload rejects oversized files', async () => {
  const largeContent = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(11 * 1024 * 1024)]);

  const response = await authenticatedUpload()
    .attach('file', largeContent, { filename: 'large.pdf', contentType: 'application/pdf' });

  assert.equal(response.status, 413);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'FILE_TOO_LARGE');
});

test('POST /api/documents/upload rejects missing file', async () => {
  const response = await authenticatedUpload();

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'INVALID_FILE');
});

test('POST /api/documents/upload creates document metadata', async () => {
  const response = await authenticatedUpload()
    .attach('file', uniqueContent('%PDF-1.4\nTest metadata'), { filename: 'metadata-check.pdf', contentType: 'application/pdf' });

  assert.equal(response.status, 200);
  assert.ok(response.body.data.document_id);
  assert.ok(response.body.data.stored_filename);
  assert.equal(response.body.data.processing_status, 'UPLOADED');
  assert.equal(response.body.data.original_filename, 'metadata-check.pdf');
});

test('POST /api/documents/upload generates a safe document ID', async () => {
  const response = await authenticatedUpload()
    .attach('file', uniqueContent('%PDF-1.4\nSafe file'), { filename: '../unsafe/../demo.pdf', contentType: 'application/pdf' });

  assert.equal(response.status, 200);
  assert.match(response.body.data.document_id, /^DOC-\d{8}-[a-z0-9]+$/i);
  assert.ok(!response.body.data.stored_filename.includes('..'));
});
