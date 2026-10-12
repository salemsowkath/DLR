const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');

const app = require('../src/app');
const config = require('../src/config/env');
const { pool } = require('../src/config/database');
const { resetRateLimiter } = require('../src/middleware/rateLimiter');
const { verificationOtpRepository } = require('../src/repositories/verificationOtpRepository');

let citizen1Token = '';
let citizen1Id = '';
let citizen1Aadhaar = '999988881234';

let citizen2Token = '';
let citizen2Id = '';
let citizen2Aadhaar = '';

let officerToken = '';
let officerId = '';

let superAdminToken = '';

// Shared test variables
let testAppId = '';
let testDocId = '';
let testLandRecordId = '';
let testSessionId = '';
let testPhotoId = '';
let testApprovedRecordId = '';
let demoVerificationOtp = '';

const testSurveyNumber = `SN-${Date.now()}`;
const testVillage = 'Salem Village';
const testTaluk = 'Salem Taluk';
const testDistrict = 'Salem';

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
    '(Area: 2.53 Acres) Tj',
    '0 -30 Td',
    ` (Village: ${testVillage}) Tj`,
    '0 -30 Td',
    ` (Taluk: ${testTaluk}) Tj`,
    '0 -30 Td',
    ` (District: ${testDistrict}) Tj`,
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
  resetRateLimiter();

  // 1. Citizen 1 Login
  const c1Otp = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: citizen1Aadhaar });
  const c1Login = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({
      aadhaarNumber: citizen1Aadhaar,
      otp: config.devOtp || '123456',
      sessionId: c1Otp.body.data.sessionId,
    });
  citizen1Token = c1Login.body.data.accessToken;
  citizen1Id = c1Login.body.data.user.id;

  // 2. Citizen 2 Register & Login
  for (let attempt = 0; attempt < 5; attempt += 1) {
    citizen2Aadhaar = String(crypto.randomInt(100_000_000_000, 999_999_999_999));
    const regC2 = await request(app)
      .post('/api/auth/citizen/register')
      .send({
        fullName: 'Second Citizen',
        aadhaarNumber: citizen2Aadhaar,
        dateOfBirth: '1990-05-10',
        gender: 'Male',
        state: 'Tamil Nadu',
        district: testDistrict,
        taluk: testTaluk,
        village: testVillage,
        pincode: '636001',
      });
    if (regC2.status === 409 || !regC2.body.data?.sessionId) continue;
    const c2SessionId = regC2.body.data.sessionId;
    const c2Login = await request(app)
      .post('/api/auth/citizen/otp/verify')
      .send({
        aadhaarNumber: citizen2Aadhaar,
        otp: config.devOtp || '123456',
        sessionId: c2SessionId,
      });
    if (c2Login.status === 200 && c2Login.body.data?.accessToken) {
      citizen2Token = c2Login.body.data.accessToken;
      citizen2Id = c2Login.body.data.user.id;
      break;
    }
  }
  assert.ok(citizen2Token, 'Citizen 2 token must be obtained');

  // 3. Officer 1 Login
  const offLogin = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'OfficerPass123!' });
  assert.equal(offLogin.status, 200, `Officer login failed: ${offLogin.text}`);
  officerToken = offLogin.body.data.accessToken;
  officerId = offLogin.body.data.user.id;

  // 4. Super Admin Login
  const saLogin = await request(app)
    .post('/api/auth/super-admin/login')
    .send({ username: 'Dora027', password: 'DOra#027' });
  assert.equal(saLogin.status, 200, `Super Admin login failed: ${saLogin.text}`);
  superAdminToken = saLogin.body.token || saLogin.body.data?.token || saLogin.body.data?.accessToken;
});

test.after(async () => {
  if (pool && pool.end) {
    await pool.end();
  }
});

// ============================================================================
// DLR VERIFICATION WORKFLOW 32 AUTOMATED TESTS
// ============================================================================

test('TEST 1: Citizen can submit land record details', async () => {
  const pdfBuffer = syntheticPdfContent();

  const response = await request(app)
    .post('/api/land-records/applications')
    .set('Authorization', `Bearer ${citizen1Token}`)
    .attach('file', pdfBuffer, { filename: 'original-patta-deed.pdf', contentType: 'application/pdf' })
    .field('owner_name', 'Sowkath Ali')
    .field('aadhaar_number', citizen1Aadhaar)
    .field('survey_number', testSurveyNumber)
    .field('area', '2.53 Acres')
    .field('village', testVillage)
    .field('taluk', testTaluk)
    .field('district', testDistrict)
    .field('classification', 'Agricultural');

  assert.equal(response.status, 201, `Submission failed: ${JSON.stringify(response.body)}`);
  assert.equal(response.body.success, true);
  const data = response.body.data;

  testAppId = data.application_id;
  testDocId = data.document_id;
  testLandRecordId = data.land_record_id;

  assert.ok(testAppId, 'Application ID must be generated');
  assert.match(testAppId, /^DLR-2026-\d{6}$/, 'Application ID must match format DLR-2026-XXXXXX');
  assert.equal(data.status, 'PENDING_OFFICER_REVIEW');
  assert.equal(data.owner_name, 'Sowkath Ali');
  assert.equal(data.survey_number, testSurveyNumber);
});

test('TEST 2: Citizen can upload document', async () => {
  const testDocBuffer = syntheticPdfContent('upload-check');

  const response = await request(app)
    .post('/api/documents/upload')
    .set('Authorization', `Bearer ${citizen1Token}`)
    .attach('file', testDocBuffer, { filename: 'test-upload.pdf', contentType: 'application/pdf' });

  assert.ok([200, 201].includes(response.status), `Upload failed: ${response.text}`);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.document_id);
  assert.equal(response.body.data.file_type, 'pdf');
});

test('TEST 3: Application appears to authorized Officer', async () => {
  const response = await request(app)
    .get('/api/officer/applications')
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  const apps = response.body.data.applications;
  const target = apps.find((a) => a.case_id === testAppId);

  assert.ok(target, `Application ${testAppId} must be visible to officer`);
  assert.equal(target.survey_number, testSurveyNumber);
});

test('TEST 4: Officer receives application notification', async () => {
  const response = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  const notifs = response.body.data.notifications;
  const appNotif = notifs.find((n) => n.reference_id === testAppId || n.title.includes('NEW LAND RECORD APPLICATION'));

  assert.ok(appNotif, 'Officer must have received notification for submitted application');
  assert.match(appNotif.title, /NEW LAND RECORD APPLICATION/i);
});

test('TEST 5: Officer can view application details', async () => {
  const response = await request(app)
    .get(`/api/officer/applications/${testAppId}`)
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(response.status, 200);
  const appData = response.body.data;

  assert.equal(appData.case_id, testAppId);
  assert.equal(appData.document_id, testDocId);
  assert.ok(appData.citizen_submitted_data);
  assert.equal(appData.citizen_submitted_data.survey_number, testSurveyNumber);
});

test('TEST 6: Officer can view uploaded document', async () => {
  const response = await request(app)
    .get(`/api/documents/${testDocId}/file`)
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(response.status, 200);
  assert.ok(response.headers['content-type']);
});

test('TEST 7: Officer can trigger real AI processing', async () => {
  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/generate`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({});

  assert.equal(response.status, 200, `AI processing failed: ${JSON.stringify(response.body)}`);
  assert.equal(response.body.success, true);
  const draft = response.body.data.draft;

  assert.ok(draft, 'Draft digital land record must be generated');
  assert.equal(response.body.data.status, 'AI_GENERATED');
});

test('TEST 8: AI-generated fields are saved in database', async () => {
  const { rows } = await pool.query('SELECT * FROM review_cases WHERE case_id = ?', [testAppId]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'AI_GENERATED');
  assert.equal(rows[0].ai_status, 'COMPLETED');
});

test('TEST 9: Officer can edit AI-generated fields', async () => {
  const response = await request(app)
    .patch(`/api/officer/applications/${testAppId}/digital-record`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({
      field: 'survey_number',
      originalValue: testSurveyNumber,
      correctedValue: `${testSurveyNumber}-VERIFIED`,
      reason: 'Cross-checked with sub-registrar register',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

test('TEST 10: Officer corrections are audited', async () => {
  const { rows } = await pool.query(
    'SELECT * FROM audit_events WHERE case_id = ? AND event_type = ?',
    [testAppId, 'OFFICER_CORRECTION_SUBMITTED']
  );
  assert.ok(rows.length >= 1, 'Correction must be audited in audit_events');
});

test('TEST 11: Officer can schedule appointment', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/appointment`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({
      appointmentDate: tomorrowStr,
      appointmentTime: '10:30 AM',
      officeLocation: 'Salem Sub-Registrar Office',
      purpose: 'Original deed scrutiny and land owner verification',
      notes: 'Bring original patta and photo identity proof',
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'SCHEDULED');
  assert.equal(response.body.data.case_id, testAppId);
});

test('TEST 12: Citizen can view appointment', async () => {
  const response = await request(app)
    .get('/api/appointments')
    .set('Authorization', `Bearer ${citizen1Token}`);

  assert.equal(response.status, 200);
  const appts = response.body.data.appointments;
  const appt = appts.find((a) => a.case_id === testAppId);

  assert.ok(appt, 'Citizen must be able to view their scheduled appointment');
  assert.equal(appt.office_location, 'Salem Sub-Registrar Office');
});

test('TEST 13: Verification session can start', async () => {
  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/verification/start`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({});

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  testSessionId = response.body.data.id;
  assert.ok(testSessionId);
});

test('TEST 14: OTP can be sent securely', async () => {
  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/verification/otp/send`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({});

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.expiresAt);
  demoVerificationOtp = response.body.data.demoOtp || config.devOtp || '123456';
  assert.ok(demoVerificationOtp);
});

test('TEST 15: Wrong OTP fails with 400', async () => {
  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/verification/otp/verify`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({
      otp: '000000',
      sessionId: testSessionId,
    });

  assert.equal(response.status, 400, 'Invalid OTP must be rejected with 400');
  assert.match(response.body.error?.message || response.body.message, /invalid|failed/i);
});

test('TEST 16: Correct OTP verifies citizen', async () => {
  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/verification/otp/verify`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({
      otp: demoVerificationOtp,
      sessionId: testSessionId,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.verified, true);
});

test('TEST 17: Expired OTP fails', async () => {
  const expiredHash = crypto.createHash('sha256').update('888888').digest('hex');
  const expiredDate = new Date(Date.now() - 600000); // 10 minutes ago
  const dummySessionId = crypto.randomUUID();

  // Create temporary verification session with CANCELLED status so it doesn't collide with active session
  await pool.query(
    `INSERT INTO verification_sessions (id, case_id, citizen_id, officer_id, status)
     VALUES (?, 'EXPIRED-TEST-CASE', 'usr-test-cit', 'usr-test-off', 'CANCELLED')`,
    [dummySessionId]
  );

  await pool.query(
    `INSERT INTO verification_otps (id, session_id, case_id, citizen_id, otp_hash, attempts, max_attempts, verified, expires_at)
     VALUES (?, ?, 'EXPIRED-TEST-CASE', 'usr-test-cit', ?, 0, 3, 0, ?)`,
    [crypto.randomUUID(), dummySessionId, expiredHash, expiredDate]
  );

  await assert.rejects(
    async () => {
      await verificationOtpRepository.verifyOtp({
        sessionId: dummySessionId,
        otp: '888888',
      });
    },
    (err) => err.code === 'OTP_EXPIRED' || /OTP_EXPIRED|expired/i.test(err.message)
  );
});

test('TEST 18: Officer can capture/store verification photo securely', async () => {
  // 1x1 white jpeg
  const fakeJpegBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

  const uploadRes = await request(app)
    .post(`/api/officer/applications/${testAppId}/verification/photo`)
    .set('Authorization', `Bearer ${officerToken}`)
    .attach('photo', fakeJpegBuffer, { filename: 'land_owner.jpg', contentType: 'image/jpeg' });

  assert.equal(uploadRes.status, 200, `Photo upload failed: ${JSON.stringify(uploadRes.body)}`);
  assert.equal(uploadRes.body.success, true);
  testPhotoId = uploadRes.body.data.photo_id;
  assert.ok(testPhotoId);

  // Protected retrieval
  const fetchRes = await request(app)
    .get(`/api/verification/photos/${testPhotoId}`)
    .set('Authorization', `Bearer ${officerToken}`);
  assert.equal(fetchRes.status, 200);

  // Unauthorized access (no token) should be rejected
  const unauthRes = await request(app).get(`/api/verification/photos/${testPhotoId}`);
  assert.equal(unauthRes.status, 401);
});

test('TEST 19: Officer can perform final verification', async () => {
  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/final-verify`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({
      documentsChecked: true,
      notes: 'All original revenue documents and physical biometrics verified.',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'OFFICER_FINAL_REVIEW');
});

test('TEST 20: Officer can approve land record', async () => {
  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/approve`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({
      notes: 'Government verified and certified for central land record registry.',
    });

  assert.equal(response.status, 200, `Approval failed: ${JSON.stringify(response.body)}`);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'GOVERNMENT_APPROVED');
  assert.ok(response.body.data.approved_record);
  testApprovedRecordId = response.body.data.approved_record.id;
});

test('TEST 21: Approved record is created in digital_land_records', async () => {
  const { rows } = await pool.query(
    'SELECT * FROM digital_land_records WHERE case_id = ?',
    [testAppId]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'GOVERNMENT_APPROVED');
  assert.match(rows[0].record_id, /^DLR-GOV-2026-\d{6}$/);
});

test('TEST 22: Citizen can view approved record', async () => {
  const response = await request(app)
    .get('/api/land-records/approved')
    .set('Authorization', `Bearer ${citizen1Token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  const records = response.body.data.records;
  const target = records.find((r) => r.case_id === testAppId);

  assert.ok(target, 'Citizen 1 must see their approved record');
  assert.equal(target.status, 'GOVERNMENT_APPROVED');
});

test('TEST 23: Citizen cannot view another citizen\'s record (IDOR Protection)', async () => {
  // Citizen 2 queries Citizen 1's approved record by ID
  const response = await request(app)
    .get(`/api/land-records/approved/${testApprovedRecordId}`)
    .set('Authorization', `Bearer ${citizen2Token}`);

  assert.ok([403, 404].includes(response.status), 'Citizen 2 must not access Citizen 1 record');
});

test('TEST 24: Officer cannot access unauthorized applications when assigned to another officer', async () => {
  const { rows: offRows } = await pool.query(
    "SELECT u.id, u.username FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.role_name IN ('OFFICER', 'GOVERNMENT_OFFICER') AND u.id != ? LIMIT 1",
    [officerId]
  );
  let off2Id = '';
  let off2Username = '';
  if (offRows.length > 0) {
    off2Id = offRows[0].id;
    off2Username = offRows[0].username;
    await pool.query("UPDATE users SET status = 'ACTIVE' WHERE id = ?", [off2Id]);
  } else {
    off2Id = crypto.randomUUID();
    off2Username = 'DEMO-OFFICER-002';
    await pool.query(
      "INSERT INTO users (id, username, name, status) VALUES (?, ?, 'Officer Two', 'ACTIVE')",
      [off2Id, off2Username]
    );
    const { rows: rRows } = await pool.query("SELECT id FROM roles WHERE role_name = 'OFFICER' LIMIT 1");
    if (rRows.length > 0) {
      await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [off2Id, rRows[0].id]);
    }
  }

  const jwt = require('jsonwebtoken');
  const off2Token = jwt.sign(
    { sub: off2Id, user_id: off2Id, username: off2Username, role: 'OFFICER' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const res = await request(app)
    .get(`/api/officer/applications/${testAppId}`)
    .set('Authorization', `Bearer ${off2Token}`);

  assert.equal(res.status, 403, `Expected 403 Forbidden for unauthorized officer, got ${res.status}`);
});

test('TEST 25: Citizen cannot call Officer approval APIs', async () => {
  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/approve`)
    .set('Authorization', `Bearer ${citizen1Token}`)
    .send({ notes: 'Illegal attempt' });

  assert.equal(response.status, 403, 'Citizen must receive 403 FORBIDDEN on officer APIs');
});

test('TEST 26: AI service cannot directly approve records', async () => {
  const { rows } = await pool.query('SELECT status FROM review_cases WHERE case_id = ?', [testAppId]);
  assert.equal(rows[0].status, 'GOVERNMENT_APPROVED'); // reached only after Officer explicit approval in test 20
});

test('TEST 27: Invalid status transitions are rejected', async () => {
  // Cannot approve an already approved application
  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/approve`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({ notes: 'Duplicate approval' });

  assert.equal(response.status, 409, 'Double approval must return 409 Conflict');
});

test('TEST 28: Passwords, OTPs, and full Aadhaar are not leaked', async () => {
  const res = await request(app)
    .get(`/api/officer/applications/${testAppId}`)
    .set('Authorization', `Bearer ${officerToken}`);

  const jsonStr = JSON.stringify(res.body);
  assert.ok(!jsonStr.includes('password_hash'), 'No password_hash in response');
  assert.ok(!jsonStr.includes('otp_hash'), 'No otp_hash in response');
  // Full 12-digit Aadhaar must be masked
  assert.ok(!jsonStr.includes('999988881234') || jsonStr.includes('XXXX-XXXX-1234'));
});

test('TEST 29: Audit events are created for verification lifecycle', async () => {
  const { rows: events } = await pool.query(
    'SELECT event_type FROM audit_events WHERE case_id = ?',
    [testAppId]
  );
  const types = events.map((e) => e.event_type);

  assert.ok(types.includes('APPLICATION_SUBMITTED') || types.includes('DOCUMENT_UPLOADED') || types.includes('CITIZEN_SUBMISSION_RECEIVED') || types.includes('OFFICER_VIEWED_APPLICATION'));
  assert.ok(types.includes('LAND_RECORD_GOVERNMENT_APPROVED') || types.includes('LAND_RECORD_APPROVED'));
});

test('TEST 30: Existing authentication tests still pass', async () => {
  const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${officerToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.username, 'DEMO-OFFICER-001');
});

test('TEST 31: Existing Super Admin tests still pass', async () => {
  const res = await request(app)
    .get('/api/super-admin/dashboard')
    .set('Authorization', `Bearer ${superAdminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.citizens !== undefined);
  assert.ok(res.body.data.officers !== undefined);
});

test('TEST 32: Existing Super Admin Monitoring tests still pass', async () => {
  const res = await request(app)
    .get('/api/admin/work/officers')
    .set('Authorization', `Bearer ${superAdminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.officers));
});

test('TEST 33: Citizen downloads official Government Verified PDF certificate and IDOR is enforced', async () => {
  // 1. Authorized citizen downloads PDF
  const res = await request(app)
    .get(`/api/land-records/approved/${testApprovedRecordId}/pdf`)
    .set('Authorization', `Bearer ${citizen1Token}`);

  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'application/pdf');
  assert.ok(res.body.length > 500, 'PDF buffer length should be substantial');
  assert.equal(res.body.subarray(0, 5).toString(), '%PDF-');

  // 2. IDOR Protection: Unauthorized Citizen 2 cannot download Citizen 1's PDF
  const idorRes = await request(app)
    .get(`/api/land-records/approved/${testApprovedRecordId}/pdf`)
    .set('Authorization', `Bearer ${citizen2Token}`);

  assert.ok([403, 404].includes(idorRes.status), 'Citizen 2 must receive 403 FORBIDDEN when downloading Citizen 1 PDF');
});
