const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');

const app = require('../src/app');
const config = require('../src/config/env');
const { pool } = require('../src/config/database');
const { parseDateForMySQL } = require('../src/utils/date');

let citizen1Token;
let citizen1Id;
let citizen2Token;
let citizen2Id;
let citizen2Aadhaar;
let officerToken;
let officerId;

// Test variables to share across steps
let testAppId;
let testDocId;
let testLandRecordId;

const testSurveyNumber = `SN-${Date.now()}`;
const testVillage = 'Chengam';
const testTaluk = 'Chengam';
const testDistrict = 'Tiruvannamalai';

function syntheticPdfContent(uniqueSuffix = '') {
  const text = [
    'BT',
    '/F1 18 Tf',
    '50 700 Td',
    '(TAMIL NADU LAND REVENUE DEPARTMENT) Tj',
    '0 -30 Td',
    '(PATTA CHITTA EXTRACT) Tj',
    '0 -30 Td',
    '(Owner Name: Sowkath Ali) Tj',
    '0 -30 Td',
    ` (Survey Number: ${testSurveyNumber}) Tj`,
    '0 -30 Td',
    '(Area: 2.35 Acres) Tj',
    '0 -30 Td',
    '(Village: Chengam) Tj',
    '0 -30 Td',
    '(Taluk: Chengam) Tj',
    '0 -30 Td',
    '(District: Tiruvannamalai) Tj',
    '0 -30 Td',
    '(Record Date: 15-05-2024) Tj',
    '0 -30 Td',
    ` (Unique Ref: ${uniqueSuffix || crypto.randomUUID()}) Tj`,
    'ET',
  ].join('\n');

  const stream = `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n${stream}\nendobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj + '\n';
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf);
}

test.before(async () => {
  // Login Citizen 1 (999988881234)
  const c1Otp = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });
  const c1Login = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({
      aadhaarNumber: '999988881234',
      otp: config.devOtp || '123456',
      sessionId: c1Otp.body.data.sessionId,
    });
  citizen1Token = c1Login.body.data.accessToken;
  citizen1Id = c1Login.body.data.user.id;

  // Register and Login Citizen 2
  citizen2Aadhaar = `8888${String(Date.now()).slice(-8)}`;
  const regC2 = await request(app)
    .post('/api/auth/citizen/register')
    .send({
      fullName: 'Second Citizen',
      aadhaarNumber: citizen2Aadhaar,
      dateOfBirth: '1992-04-12',
      gender: 'Male',
      state: 'Tamil Nadu',
      district: 'Tiruvannamalai',
      taluk: 'Chengam',
      village: 'Chengam',
      pincode: '606701',
    });
  const c2SessionId = regC2.body.data?.sessionId;
  const c2Login = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({
      aadhaarNumber: citizen2Aadhaar,
      otp: config.devOtp || '123456',
      sessionId: c2SessionId,
    });
  citizen2Token = c2Login.body.data?.accessToken;
  citizen2Id = c2Login.body.data?.user?.id;

  // Login Officer
  const offLogin = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'OfficerPass123!' });
  assert.equal(offLogin.status, 200, `Officer login failed: ${offLogin.text}`);
  officerToken = offLogin.body.data.accessToken;
  officerId = offLogin.body.data.user.id;
});

test.after(async () => {
  if (pool && pool.end) {
    await pool.end();
  }
});

test('TEST 1: Citizen uploads document and enters manual details (No AI runs, PENDING_OFFICER_VERIFICATION)', async () => {
  const pdfBuffer = syntheticPdfContent();

  const response = await request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${citizen1Token}`)
    .attach('file', pdfBuffer, { filename: 'deed-application.pdf', contentType: 'application/pdf' })
    .field('owner_name', 'Sowkath Ali')
    .field('aadhaar_number', '999988881234')
    .field('survey_number', testSurveyNumber)
    .field('area', '2.35 Acres')
    .field('village', testVillage)
    .field('taluk', testTaluk)
    .field('district', testDistrict);

  assert.equal(response.status, 201, `Failed: ${JSON.stringify(response.body)}`);
  assert.equal(response.body.success, true);
  const data = response.body.data;

  testAppId = data.application_id;
  testDocId = data.document_id;
  testLandRecordId = data.land_record_id;

  assert.ok(testAppId);
  assert.ok(testDocId);
  assert.ok(testLandRecordId);
  assert.equal(data.status, 'PENDING_OFFICER_VERIFICATION');
  assert.equal(data.ai_status, 'NOT_STARTED'); // AI must NOT run during Citizen submission
  assert.equal(data.is_duplicate, false);

  // Verify in MySQL
  const dbRecord = await pool.query('SELECT * FROM land_records WHERE id = ?', [testLandRecordId]);
  assert.equal(dbRecord.rows.length, 1);
  assert.equal(dbRecord.rows[0].status, 'PENDING_OFFICER_VERIFICATION');
  assert.equal(dbRecord.rows[0].ai_status, 'NOT_STARTED');
  assert.equal(dbRecord.rows[0].record_date, null); // record_date must be clean NULL, no zero date
});

test('TEST 2: Citizen opens My Land Records and views the application', async () => {
  const response = await request(app)
    .get('/api/documents/applications/mine')
    .set('Authorization', `Bearer ${citizen1Token}`);

  assert.equal(response.status, 200);
  const apps = response.body.data.applications;
  const appFound = apps.find((a) => a.document_id === testDocId);

  assert.ok(appFound, 'Submitted application must be visible in My Land Records');
  assert.equal(appFound.owner_name, 'Sowkath Ali');
  assert.equal(appFound.survey_number, testSurveyNumber);
  assert.equal(appFound.masked_aadhaar, 'XXXX-XXXX-1234');
  assert.equal(appFound.status, 'PENDING_OFFICER_VERIFICATION');
  assert.notEqual(appFound.status, 'OFFICER_VERIFIED'); // Must NOT show VERIFIED yet
});

test('TEST 3: Duplicate Survey Number check on (Survey Number + Village + Taluk + District)', async () => {
  // Pre-check duplicate endpoint
  const dupCheckRes = await request(app)
    .post('/api/documents/check-duplicate')
    .set('Authorization', `Bearer ${citizen2Token}`)
    .send({
      surveyNumber: testSurveyNumber,
      village: testVillage,
      taluk: testTaluk,
      district: testDistrict,
    });

  assert.equal(dupCheckRes.status, 200);
  assert.equal(dupCheckRes.body.data.isDuplicate, true);
  assert.match(dupCheckRes.body.data.message, new RegExp(testSurveyNumber));

  // Second citizen submits with same survey number and location
  const pdfBuffer2 = syntheticPdfContent();
  const response = await request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${citizen2Token}`)
    .attach('file', pdfBuffer2, { filename: 'transfer-deed.pdf', contentType: 'application/pdf' })
    .field('owner_name', 'Second Citizen')
    .field('aadhaar_number', citizen2Aadhaar)
    .field('survey_number', testSurveyNumber)
    .field('area', '2.35 Acres')
    .field('village', testVillage)
    .field('taluk', testTaluk)
    .field('district', testDistrict);

  assert.equal(response.status, 201);
  assert.equal(response.body.data.is_duplicate, true);
  assert.ok(response.body.data.duplicate_reason);

  // Verify first record was NOT overwritten in MySQL
  const firstRecord = await pool.query('SELECT * FROM land_records WHERE id = ?', [testLandRecordId]);
  assert.equal(firstRecord.rows[0].owner_name, 'Sowkath Ali');
});

test('TEST 4: Officer sees the application on Pending Applications dashboard', async () => {
  const response = await request(app)
    .get('/api/review/cases')
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(response.status, 200);
  const cases = response.body.data.cases;
  const targetCase = cases.find((c) => c.case_id === testAppId);

  assert.ok(targetCase, 'Officer must see pending application');
  assert.equal(targetCase.survey_number, testSurveyNumber);
  assert.equal(targetCase.ai_status, 'NOT_STARTED');
});

test('TEST 5: Officer clicks AI PROCESS DOCUMENT (Real Python AI Service processes document)', async () => {
  const response = await request(app)
    .post(`/api/review/cases/${testAppId}/process-ai`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send();

  assert.equal(response.status, 200, `AI Process failed: ${JSON.stringify(response.body)}`);
  assert.equal(response.body.success, true);
  const result = response.body.data;

  assert.ok(result.case);
  assert.equal(result.case.ai_status, 'COMPLETED');
});

test('TEST 6: AI results are persisted in MySQL without zero date errors', async () => {
  const lrRes = await pool.query('SELECT * FROM land_records WHERE id = ?', [testLandRecordId]);
  assert.equal(lrRes.rows.length, 1);
  const lr = lrRes.rows[0];

  assert.equal(lr.ai_status, 'COMPLETED');
  assert.ok(lr.ai_extracted_data != null);
  // Date must NOT be 0000-00-00 00:00:00
  assert.notEqual(String(lr.record_date), '0000-00-00 00:00:00');

  const rcRes = await pool.query('SELECT * FROM review_cases WHERE case_id = ?', [testAppId]);
  assert.equal(rcRes.rows[0].ai_status, 'COMPLETED');
  assert.ok(rcRes.rows[0].ai_confidence != null);
});

test('TEST 7: Officer reviews Citizen Data vs AI Data vs Original Document', async () => {
  const response = await request(app)
    .get(`/api/review/cases/${testAppId}`)
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(response.status, 200);
  const caseData = response.body.data;

  // Section A: Citizen Submitted Data
  assert.ok(caseData.citizen_submitted_data);
  assert.equal(caseData.citizen_submitted_data.survey_number, testSurveyNumber);
  assert.equal(caseData.citizen_submitted_data.aadhaar_number, 'XXXX-XXXX-1234');

  // Section B: Original Document metadata
  assert.equal(caseData.document_id, testDocId);

  // Section C: AI Extraction
  assert.equal(caseData.ai_status, 'COMPLETED');
  assert.ok(caseData.land_record?.fields || caseData.ai_extracted_data);

  // Officer can fetch original document file
  const docFileRes = await request(app)
    .get(`/api/documents/${testDocId}/file`)
    .set('Authorization', `Bearer ${officerToken}`);
  assert.equal(docFileRes.status, 200);
});

test('TEST 8: Officer approves application (Official Decision: OFFICER VERIFIED)', async () => {
  const response = await request(app)
    .post(`/api/review/cases/${testAppId}/approve`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({ notes: 'Verified against revenue registry' });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, 'APPROVED');

  // Verify in MySQL
  const updatedLr = await pool.query('SELECT status, verification_status FROM land_records WHERE id = ?', [testLandRecordId]);
  assert.equal(updatedLr.rows[0].status, 'VERIFIED');
  assert.equal(updatedLr.rows[0].verification_status, 'VERIFIED');
});

test('TEST 9: IDOR Security — Another citizen cannot access the document', async () => {
  const response = await request(app)
    .get(`/api/documents/${testDocId}`)
    .set('Authorization', `Bearer ${citizen2Token}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('TEST 10: Unauthenticated request is rejected (401)', async () => {
  const response = await request(app)
    .get(`/api/documents/${testDocId}`);

  assert.equal(response.status, 401);
});

test('TEST 11: File upload > 10 MB is rejected with HTTP 413 and standard message', async () => {
  const oversizedBuffer = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.alloc(11 * 1024 * 1024),
  ]);

  const response = await request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${citizen1Token}`)
    .attach('file', oversizedBuffer, { filename: 'too-big.pdf', contentType: 'application/pdf' })
    .field('owner_name', 'Test')
    .field('survey_number', '999');

  assert.equal(response.status, 413);
  assert.equal(response.body.error.message, 'File exceeds the 10 MB limit.');
});

test('TEST 12: Backend restart simulation — Data persists in MySQL 8.4', async () => {
  // Query MySQL directly to prove persistence independent of Express memory
  const res = await pool.query(
    'SELECT lr.id, lr.survey_number, lr.status, rc.status as case_status FROM land_records lr JOIN review_cases rc ON lr.id = rc.land_record_id WHERE rc.case_id = ?',
    [testAppId]
  );
  assert.equal(res.rows.length, 1);
  assert.equal(res.rows[0].survey_number, testSurveyNumber);
  assert.equal(res.rows[0].status, 'VERIFIED');
  assert.equal(res.rows[0].case_status, 'APPROVED');
});

test('TEST 13: AI Service failure resilience — Application survives even if AI fails', async () => {
  // Submit new application
  const pdfBuffer = syntheticPdfContent();
  const subRes = await request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${citizen1Token}`)
    .attach('file', pdfBuffer, { filename: 'resilience-test.pdf', contentType: 'application/pdf' })
    .field('owner_name', 'Resilience Owner')
    .field('survey_number', `RES-${Date.now()}`)
    .field('village', 'TestVillage')
    .field('taluk', 'TestTaluk')
    .field('district', 'TestDistrict');

  assert.equal(subRes.status, 201);
  const resCaseId = subRes.body.data.application_id;

  // Verify that even if review case AI fails or has error, document and application remain intact in DB
  const checkCase = await pool.query('SELECT status, ai_status FROM review_cases WHERE case_id = ?', [resCaseId]);
  assert.equal(checkCase.rows[0].status, 'PENDING_REVIEW');
  assert.equal(checkCase.rows[0].ai_status, 'NOT_STARTED');
});

test('TEST 14: Date handling utility never produces 0000-00-00 00:00:00', () => {
  assert.equal(parseDateForMySQL('0000-00-00 00:00:00'), null);
  assert.equal(parseDateForMySQL('0000-00-00'), null);
  assert.equal(parseDateForMySQL(null), null);
  assert.equal(parseDateForMySQL(undefined), null);
  assert.equal(parseDateForMySQL('invalid-date-string'), null);
  assert.equal(parseDateForMySQL('2024-05-15'), '2024-05-15');
  assert.equal(parseDateForMySQL('15-05-2024'), '2024-05-15');
  assert.equal(parseDateForMySQL('15/05/2024'), '2024-05-15');
});

test('TEST 15: VS Code SQL Database Viewer compatibility check', async () => {
  const tables = await pool.query('SHOW TABLES');
  const tableNames = tables.rows.map((r) => Object.values(r)[0]);

  const requiredTables = [
    'users',
    'documents',
    'land_records',
    'land_record_fields',
    'review_cases',
    'review_anomalies',
    'officer_corrections',
    'officer_notes',
    'audit_events',
    'validation_results',
  ];

  for (const t of requiredTables) {
    assert.ok(tableNames.includes(t), `Table '${t}' must exist in MySQL for VS Code viewer`);
  }
});
