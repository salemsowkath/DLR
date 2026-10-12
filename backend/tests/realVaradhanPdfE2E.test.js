const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const request = require('supertest');

const app = require('../src/app');
const config = require('../src/config/env');
const { pool } = require('../src/config/database');

let citizenToken;
let citizenId;
let citizenAadhaar;
let officerToken;
let officerId;
let unauthorizedOfficerToken;

let testAppId;
let testDocId;
let testLandRecordId;
let testApprovedRecordId;
let verificationSessionId;

const realPdfPath = path.join(
  __dirname,
  '../uploads/documents/1791397662741-6a51cf4f45bcd8-VARADHAN-alaputhur.pdf'
);

test.before(async () => {
  assert.ok(fs.existsSync(realPdfPath), `Real sample PDF must exist at ${realPdfPath}`);

  // 1. Citizen registration & login
  citizenAadhaar = `77${String(Date.now()).slice(-8)}${Math.floor(10 + Math.random() * 90)}`;

  const regRes = await request(app)
    .post('/api/auth/citizen/register')
    .send({
      fullName: 'Varadhan Real Test Citizen',
      aadhaarNumber: citizenAadhaar,
      dateOfBirth: '1985-06-15',
      gender: 'Male',
      state: 'Tamil Nadu',
      district: 'Salem',
      taluk: 'Salem',
      village: 'Alaputhur',
      pincode: '636001',
    });
  assert.equal(regRes.status, 200, `Registration should succeed: ${JSON.stringify(regRes.body)}`);

  const otpVerify = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({
      aadhaarNumber: citizenAadhaar,
      otp: config.devOtp || '123456',
      sessionId: regRes.body.data.sessionId,
    });
  assert.equal(otpVerify.status, 200);
  citizenToken = otpVerify.body.data.accessToken;
  citizenId = otpVerify.body.data.user.id;

  // 2. Salem Officer Login
  const officerLogin = await request(app)
    .post('/api/auth/officer/login')
    .send({
      username: 'DEMO-OFFICER-001',
      password: 'OfficerPass123!',
    });
  assert.equal(officerLogin.status, 200);
  officerToken = officerLogin.body.data.accessToken;
  officerId = officerLogin.body.data.user.id;

  // 3. Unauthorized Officer in another district/state
  const jwt = require('jsonwebtoken');
  const unauthId = crypto.randomUUID();
  const unauthUsername = `CHENNAI-OFFICER-${Date.now().toString().slice(-4)}`;
  await pool.query(
    "INSERT INTO users (id, username, name, status, state, district, external_reference) VALUES (?, ?, 'Chennai Officer', 'ACTIVE', 'Tamil Nadu', 'Chennai', ?)",
    [unauthId, unauthUsername, `OFFICER-${unauthUsername}`]
  );
  const { rows: rRows } = await pool.query("SELECT id FROM roles WHERE role_name IN ('OFFICER', 'GOVERNMENT_OFFICER') LIMIT 1");
  if (rRows.length > 0) {
    await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [unauthId, rRows[0].id]);
  }
  unauthorizedOfficerToken = jwt.sign(
    { sub: unauthId, user_id: unauthId, username: unauthUsername, role: 'OFFICER', state: 'Tamil Nadu', district: 'Chennai' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
});

test('STEP 1: Citizen submits application with real VARADHAN alaputhur.pdf document', async () => {
  try {
    const response = await request(app)
      .post('/api/land-records/applications')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('owner_name', 'Varadhan')
      .field('aadhaar_number', citizenAadhaar)
      .field('survey_number', '13/3B')
      .field('subdivision_number', '3B')
      .field('area', '0.06')
      .field('area_unit', 'Acres')
      .field('village', 'Alaputhur')
      .field('taluk', 'Salem')
      .field('district', 'Salem')
      .field('state', 'Tamil Nadu')
      .field('classification', 'Agricultural (Ryotwari)')
      .field('patta_number', '2104')
      .field('document_type', 'Sale Deed')
      .attach('file', realPdfPath);

    console.error('STEP 1 RAW RESPONSE:', response.status, JSON.stringify(response.body));
    assert.equal(response.status, 201, `Upload should succeed: ${JSON.stringify(response.body)}`);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.application_id, 'Must assign unique application_id');
    assert.equal(response.body.data.status, 'PENDING_OFFICER_REVIEW');

    testAppId = response.body.data.application_id;
    testDocId = response.body.data.document_id;
    testLandRecordId = response.body.data.land_record_id;
  } catch (err) {
    console.error('STEP 1 CAUGHT ERROR:', err);
    throw err;
  }
});

test('STEP 2: Officer in Salem receives the new application under jurisdiction', async () => {
  const response = await request(app)
    .get('/api/officer/applications')
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data.applications));
  const found = response.body.data.applications.find((a) => a.case_id === testAppId);
  assert.ok(found, `Application ${testAppId} must be present in Salem officer queue`);
  assert.equal(found.status, 'PENDING_OFFICER_REVIEW');
});

test('STEP 3: Unauthorized Officer from Chennai cannot view Salem application (Jurisdiction RBAC)', async () => {
  const response = await request(app)
    .get(`/api/officer/applications/${testAppId}`)
    .set('Authorization', `Bearer ${unauthorizedOfficerToken}`);

  assert.equal(response.status, 403, 'Cross-district officer access must be rejected with 403 Forbidden');
});

test('STEP 4: Authorized Officer opens application details and inspects original document metadata', async () => {
  const response = await request(app)
    .get(`/api/officer/applications/${testAppId}`)
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.case_id, testAppId);
  assert.ok(response.body.data.document_id || response.body.data.filename);

  // 4a. Authorized officer fetches protected document stream
  const docStreamRes = await request(app)
    .get(`/api/officer/applications/${testAppId}/document`)
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(docStreamRes.status, 200);
  assert.equal(docStreamRes.headers['content-type'], 'application/pdf');
  assert.ok(docStreamRes.headers['content-disposition'].includes('inline'));
  assert.ok(docStreamRes.body.length > 500);
  assert.equal(docStreamRes.body.subarray(0, 5).toString(), '%PDF-');

  // 4b. Unauthorized officer from another district is denied document access (403)
  const unauthDocRes = await request(app)
    .get(`/api/officer/applications/${testAppId}/document`)
    .set('Authorization', `Bearer ${unauthorizedOfficerToken}`);

  assert.equal(unauthDocRes.status, 403, 'Cross-district officer must receive 403 on document stream');
});

test('STEP 5: Officer triggers real Python AI service to process VARADHAN alaputhur.pdf', async () => {
  const response = await request(app)
    .post(`/api/officer/applications/${testAppId}/generate`)
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(response.status, 200, `AI processing should succeed: ${JSON.stringify(response.body)}`);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'AI_GENERATED');
  assert.ok(response.body.data.draft || response.body.data.land_record, 'Must create Digital Land Record draft');

  const draft = response.body.data.draft || response.body.data.land_record;
  assert.ok(draft.owner_name !== undefined, 'Owner name extracted or evaluated');
  assert.ok(draft.survey_number !== undefined, 'Survey number extracted or evaluated');
});

test('STEP 6: Officer corrects a field and saves draft with OFFICER_CORRECTION status', async () => {
  const updateRes = await request(app)
    .patch(`/api/officer/applications/${testAppId}/digital-record`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({
      field: 'owner_name',
      correctedValue: 'Varadhan',
      reason: 'Officer verified deed text on page 2 against registration stamps',
      status: 'OFFICER_CORRECTION',
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.data.status, 'OFFICER_CORRECTION');

  // Verify persistence in MySQL
  const { rows } = await pool.query('SELECT status FROM review_cases WHERE case_id = ?', [testAppId]);
  assert.equal(rows[0].status, 'OFFICER_CORRECTION', 'Draft status must persist in MySQL');
});

test('STEP 7: Officer schedules physical verification appointment and Citizen views it', async () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 2);
  const dateStr = futureDate.toISOString().split('T')[0];

  const schedRes = await request(app)
    .post(`/api/officer/applications/${testAppId}/appointment`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({
      appointmentDate: dateStr,
      appointmentTime: '10:30 AM',
      officeLocation: 'Salem Land Records Office',
      purpose: 'Physical Deed and Biometric Verification',
      notes: 'Bring original registered sale deed and Aadhaar card.',
    });

  assert.equal(schedRes.status, 201);
  assert.equal(schedRes.body.data.status, 'SCHEDULED');

  // Citizen retrieves appointment
  const citApptRes = await request(app)
    .get('/api/appointments')
    .set('Authorization', `Bearer ${citizenToken}`);

  assert.equal(citApptRes.status, 200);
  const citAppt = citApptRes.body.data.appointments.find((a) => a.case_id === testAppId);
  assert.ok(citAppt, 'Citizen must see scheduled appointment');
  assert.equal(citAppt.appointment_time, '10:30 AM');
});

test('STEP 8: Officer starts physical verification session and issues verification OTP', async () => {
  const startRes = await request(app)
    .post(`/api/officer/applications/${testAppId}/verification/start`)
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(startRes.status, 200);
  assert.ok(['IN_PROGRESS', 'CITIZEN_VERIFICATION'].includes(startRes.body.data.status));
  verificationSessionId = startRes.body.data.id || startRes.body.data.session_id;
  assert.ok(verificationSessionId, 'Verification session ID must be generated');

  // Send verification OTP
  const otpRes = await request(app)
    .post(`/api/officer/applications/${testAppId}/verification/otp/send`)
    .set('Authorization', `Bearer ${officerToken}`);

  assert.equal(otpRes.status, 200);
  assert.ok(otpRes.body.data.expiresAt, 'OTP expiration must be provided');
  // Security rule: plaintext OTP must NEVER be leaked in API response
  assert.equal(otpRes.body.data.otp, undefined, 'Plaintext OTP must not be leaked');
});

test('STEP 9: Verification OTP is validated and bound to session', async () => {
  // 1. Wrong OTP rejected
  const wrongRes = await request(app)
    .post(`/api/officer/applications/${testAppId}/verification/otp/verify`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({ otp: '000000', sessionId: verificationSessionId });
  assert.equal(wrongRes.status, 400);

  // 2. Correct dev OTP verified
  const verifyRes = await request(app)
    .post(`/api/officer/applications/${testAppId}/verification/otp/verify`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({ otp: config.devOtp || '123456', sessionId: verificationSessionId });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.data.verified, true);
});

test('STEP 10: Officer captures and uploads land-owner verification photo', async () => {
  const fakeJpegBuffer = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    'base64'
  );

  const photoRes = await request(app)
    .post(`/api/officer/applications/${testAppId}/verification/photo`)
    .set('Authorization', `Bearer ${officerToken}`)
    .attach('photo', fakeJpegBuffer, { filename: 'land_owner.jpg', contentType: 'image/jpeg' });

  assert.equal(photoRes.status, 200);
  assert.ok(photoRes.body.data.photo_id, 'Photo ID must be created');

  // Verify photo endpoint requires auth
  const photoGet = await request(app)
    .get(`/api/verification/photos/${photoRes.body.data.photo_id}`);
  assert.equal(photoGet.status, 401, 'Public access to biometric photo must be blocked');
});

test('STEP 11: Officer completes physical verification checklist and approves land record', async () => {
  // Checklist completion
  const checklistRes = await request(app)
    .post(`/api/officer/applications/${testAppId}/final-verify`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({
      documentsChecked: true,
      identityVerified: true,
      notes: 'All 10 scanned deed pages scrutinized against physical original documents. Biometrics verified.',
    });
  assert.equal(checklistRes.status, 200);
  assert.equal(checklistRes.body.data.status, 'OFFICER_FINAL_REVIEW');

  // Legal Government Approval in single transactional commit
  const approveRes = await request(app)
    .post(`/api/officer/applications/${testAppId}/approve`)
    .set('Authorization', `Bearer ${officerToken}`)
    .send({ notes: 'Officially approved Government Verified Digital Land Record' });

  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.body.data.status, 'GOVERNMENT_APPROVED');
  assert.ok(approveRes.body.data.record_id, 'Must generate DLR-GOV-XXXXXX record ID');
  assert.ok(approveRes.body.data.record_id.startsWith('DLR-GOV-'));

  testApprovedRecordId = approveRes.body.data.id || approveRes.body.data.record_id;
});

test('STEP 12: Citizen views approved record and downloads official PDF certificate', async () => {
  // 1. Citizen retrieves approved records
  const appRecordsRes = await request(app)
    .get('/api/land-records/approved')
    .set('Authorization', `Bearer ${citizenToken}`);

  assert.equal(appRecordsRes.status, 200);
  const foundRecord = (appRecordsRes.body.data.records || []).find((r) => r.case_id === testAppId);
  assert.ok(foundRecord, 'Citizen must find their approved record');
  assert.equal(foundRecord.status, 'GOVERNMENT_APPROVED');

  const recordLookupId = foundRecord.id || foundRecord.record_id;
  // 2. Citizen downloads the generated PDF certificate
  const pdfRes = await request(app)
    .get(`/api/land-records/approved/${recordLookupId}/pdf`)
    .set('Authorization', `Bearer ${citizenToken}`);

  assert.equal(pdfRes.status, 200);
  assert.equal(pdfRes.headers['content-type'], 'application/pdf');
  assert.ok(pdfRes.body.length > 500);
  assert.equal(pdfRes.body.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdfRes.body.toString('latin1').includes('/Count 12'), 'Approved PDF must have exactly 12 statutory pages');
});

test('STEP 13: IDOR Protection verifies other citizens cannot access this record', async () => {
  const c2Aadhaar = `55${String(Date.now()).slice(-8)}${Math.floor(10 + Math.random() * 90)}`;

  const citizen2Res = await request(app)
    .post('/api/auth/citizen/register')
    .send({
      fullName: 'Another Citizen',
      aadhaarNumber: c2Aadhaar,
      dateOfBirth: '1992-04-12',
      gender: 'Female',
      state: 'Tamil Nadu',
      district: 'Salem',
      taluk: 'Salem',
      village: 'Alaputhur',
      pincode: '636001',
    });

  const c2Login = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({
      aadhaarNumber: c2Aadhaar,
      otp: config.devOtp || '123456',
      sessionId: citizen2Res.body.data.sessionId,
    });
  const citizen2Token = c2Login.body.data.accessToken;

  // Citizen 2 tries to download Citizen 1's PDF
  const idorPdf = await request(app)
    .get(`/api/land-records/approved/${testApprovedRecordId}/pdf`)
    .set('Authorization', `Bearer ${citizen2Token}`);

  assert.ok([403, 404].includes(idorPdf.status), 'Citizen 2 must receive 403 Forbidden on Citizen 1 record');
});
