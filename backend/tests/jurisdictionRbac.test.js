const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const config = require('../src/config/env');
const { pool } = require('../src/config/database');
const { auditRepository } = require('../src/repositories/auditRepository');
const { stateRepository } = require('../src/repositories/stateRepository');
const { reviewRepository } = require('../src/repositories/reviewRepository');
const { landRecordRepository } = require('../src/repositories/landRecordRepository');

let superAdminToken = '';
let tnStateAdminToken = '';
let klStateAdminToken = '';
let tnOfficerToken = '';
let klOfficerToken = '';
let tnMinisterToken = '';
let klMinisterToken = '';
let citizenToken = '';
let salemCaseId = '';
let chennaiCaseId = '';
let kochiCaseId = '';

test.before(async () => {
  // Ensure Tamil Nadu and Kerala land records & review cases exist for testing
  const salemRecord = await landRecordRepository.create({
    owner_name: 'Salem Land Owner',
    survey_number: 'SLM-7788',
    state: 'Tamil Nadu',
    district: 'Salem',
    taluk: 'Salem',
    village: 'Salem Central',
    status: 'PENDING_OFFICER_REVIEW',
  });

  const chennaiRecord = await landRecordRepository.create({
    owner_name: 'Chennai Land Owner',
    survey_number: 'CHN-1122',
    state: 'Tamil Nadu',
    district: 'Chennai',
    taluk: 'Egmore',
    village: 'Nungambakkam',
    status: 'PENDING_OFFICER_REVIEW',
  });

  const kochiRecord = await landRecordRepository.create({
    owner_name: 'Kochi Land Owner',
    survey_number: 'KCH-9900',
    state: 'Kerala',
    district: 'Kochi',
    taluk: 'Kanayannur',
    village: 'Ernakulam',
    status: 'PENDING_OFFICER_REVIEW',
  });

  const cSalem = await reviewRepository.create({
    landRecordId: salemRecord.id,
    status: 'PENDING_OFFICER_REVIEW',
    priority: 'MEDIUM',
    citizenSubmittedData: {
      owner_name: 'Salem Land Owner',
      survey_number: 'SLM-7788',
      state: 'Tamil Nadu',
      district: 'Salem',
    },
  });
  salemCaseId = cSalem.case_id;

  const cChennai = await reviewRepository.create({
    landRecordId: chennaiRecord.id,
    status: 'PENDING_OFFICER_REVIEW',
    priority: 'MEDIUM',
    citizenSubmittedData: {
      owner_name: 'Chennai Land Owner',
      survey_number: 'CHN-1122',
      state: 'Tamil Nadu',
      district: 'Chennai',
    },
  });
  chennaiCaseId = cChennai.case_id;

  const cKochi = await reviewRepository.create({
    landRecordId: kochiRecord.id,
    status: 'PENDING_OFFICER_REVIEW',
    priority: 'MEDIUM',
    citizenSubmittedData: {
      owner_name: 'Kochi Land Owner',
      survey_number: 'KCH-9900',
      state: 'Kerala',
      district: 'Kochi',
    },
  });
  kochiCaseId = cKochi.case_id;
});

// ==========================================
// 1. AUTHENTICATION (Tests 1 - 5)
// ==========================================

test('1. Super Admin login success with existing Dora027 credentials', async () => {
  const res = await request(app)
    .post('/api/auth/super-admin/login')
    .send({ username: 'Dora027', password: 'DOra#027' });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, 'SUPER_ADMIN');
  superAdminToken = res.body.token;
});

test('2. State Admin login success (Tamil Nadu & Kerala)', async () => {
  const resTN = await request(app)
    .post('/api/auth/state-admin/login')
    .send({ username: 'Tamil_Nadu_admin', password: 'Tamil_Nadu_Admin@123' });

  assert.equal(resTN.status, 200);
  assert.equal(resTN.body.success, true);
  assert.ok(resTN.body.token);
  assert.equal(resTN.body.user.state, 'Tamil Nadu');
  assert.ok(resTN.body.user.roles.includes('STATE_ADMIN'));
  tnStateAdminToken = resTN.body.token;

  const resKL = await request(app)
    .post('/api/auth/state-admin/login')
    .send({ username: 'Kerala_admin', password: 'Kerala_Admin@123' });

  assert.equal(resKL.status, 200);
  assert.equal(resKL.body.success, true);
  assert.ok(resKL.body.token);
  assert.equal(resKL.body.user.state, 'Kerala');
  klStateAdminToken = resKL.body.token;
});

test('3. Officer login success (Salem TN & Kochi Kerala)', async () => {
  const resTN = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'OfficerPass123!' });

  assert.equal(resTN.status, 200);
  assert.equal(resTN.body.success, true);
  assert.ok(resTN.body.token);
  assert.equal(resTN.body.user.state, 'Tamil Nadu');
  assert.equal(resTN.body.user.district, 'Salem');
  tnOfficerToken = resTN.body.token;

  const resKL = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'officer_kochi_01', password: 'OfficerPass123!' });

  assert.equal(resKL.status, 200);
  assert.equal(resKL.body.success, true);
  assert.ok(resKL.body.token);
  assert.equal(resKL.body.user.state, 'Kerala');
  assert.equal(resKL.body.user.district, 'Kochi');
  klOfficerToken = resKL.body.token;
});

test('4. Minister login success (TN Minister & Kerala Minister)', async () => {
  const resTN = await request(app)
    .post('/api/auth/minister/login')
    .send({ username: 'DEMO-MINISTER-001', password: 'MinisterPass123!' });

  assert.equal(resTN.status, 200);
  assert.equal(resTN.body.success, true);
  assert.ok(resTN.body.token);
  assert.equal(resTN.body.user.state, 'Tamil Nadu');
  tnMinisterToken = resTN.body.token;

  const resKL = await request(app)
    .post('/api/auth/minister/login')
    .send({ username: 'kerala_minister_01', password: 'MinisterPass123!' });

  assert.equal(resKL.status, 200);
  assert.equal(resKL.body.success, true);
  assert.ok(resKL.body.token);
  assert.equal(resKL.body.user.state, 'Kerala');
  klMinisterToken = resKL.body.token;
});

test('5. Citizen login success via Aadhaar OTP verification', async () => {
  const otpReq = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '123412341234' });

  assert.equal(otpReq.status, 200);
  const { sessionId } = otpReq.body.data;

  const otpVer = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({ aadhaarNumber: '123412341234', otp: '123456', sessionId });

  assert.equal(otpVer.status, 200);
  assert.ok(otpVer.body.data.accessToken);
  citizenToken = otpVer.body.data.accessToken;
});

// ==========================================
// 2. ROLE ISOLATION (Tests 6 - 10)
// ==========================================

test('6. State Admin cannot access Super Admin endpoints (403 Forbidden)', async () => {
  const res = await request(app)
    .get('/api/super-admin/dashboard')
    .set('Authorization', `Bearer ${tnStateAdminToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('7. Officer cannot access State Admin endpoints (403 Forbidden)', async () => {
  const res = await request(app)
    .get('/api/state-admin/dashboard')
    .set('Authorization', `Bearer ${tnOfficerToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('8. Minister cannot access State Admin endpoints (403 Forbidden)', async () => {
  const res = await request(app)
    .get('/api/state-admin/dashboard')
    .set('Authorization', `Bearer ${tnMinisterToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('9. Citizen cannot access State Admin endpoints (403 Forbidden)', async () => {
  const res = await request(app)
    .get('/api/state-admin/dashboard')
    .set('Authorization', `Bearer ${citizenToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('10. State Admin cannot manage another State Admin or access Super Admin state-admins API (403)', async () => {
  const res = await request(app)
    .get('/api/super-admin/state-admins')
    .set('Authorization', `Bearer ${tnStateAdminToken}`);

  assert.equal(res.status, 403);
});

// ==========================================
// 3. STATE ISOLATION (Tests 11 - 14)
// ==========================================

test('11. Tamil Nadu State Admin can access Tamil Nadu data (200 OK)', async () => {
  const res = await request(app)
    .get('/api/state-admin/dashboard')
    .set('Authorization', `Bearer ${tnStateAdminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.state, 'Tamil Nadu');
});

test('12. Tamil Nadu State Admin cannot query or mutate Kerala data (403 Forbidden)', async () => {
  const resQuery = await request(app)
    .get('/api/state-admin/officers?state=Kerala')
    .set('Authorization', `Bearer ${tnStateAdminToken}`);

  assert.equal(resQuery.status, 403);

  const resIdor = await request(app)
    .get(`/api/state-admin/applications/${kochiCaseId}`)
    .set('Authorization', `Bearer ${tnStateAdminToken}`);

  assert.equal(resIdor.status, 403);
});

test('13. Tamil Nadu Minister can access Tamil Nadu records (200 OK)', async () => {
  const res = await request(app)
    .get('/api/officer/applications')
    .set('Authorization', `Bearer ${tnMinisterToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('14. Tamil Nadu Minister cannot access Kerala application (403 Forbidden)', async () => {
  const res = await request(app)
    .get(`/api/officer/applications/${kochiCaseId}`)
    .set('Authorization', `Bearer ${tnMinisterToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

// ==========================================
// 4. DISTRICT ISOLATION (Tests 15 - 17)
// ==========================================

test('15. Salem Officer can access Salem application (200 OK)', async () => {
  const res = await request(app)
    .get(`/api/officer/applications/${salemCaseId}`)
    .set('Authorization', `Bearer ${tnOfficerToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('16. Salem Officer cannot access Chennai application in same state (403 Forbidden)', async () => {
  const res = await request(app)
    .get(`/api/officer/applications/${chennaiCaseId}`)
    .set('Authorization', `Bearer ${tnOfficerToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('17. Salem Officer cannot access Kerala application (403 Forbidden)', async () => {
  const res = await request(app)
    .get(`/api/officer/applications/${kochiCaseId}`)
    .set('Authorization', `Bearer ${tnOfficerToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

// ==========================================
// 5. MANAGEMENT (Tests 18 - 21)
// ==========================================

test('18. Tamil Nadu State Admin can create a Tamil Nadu Officer', async () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const res = await request(app)
    .post('/api/state-admin/officers')
    .set('Authorization', `Bearer ${tnStateAdminToken}`)
    .send({
      name: `Salem Officer ${rand}`,
      username: `officer_salem_${rand}`,
      password: 'TemporaryPass123!',
      district: 'Salem',
      department: 'Land Records & Revenue',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.state, 'Tamil Nadu');
  assert.equal(res.body.data.district, 'Salem');
});

test('19. Tamil Nadu State Admin cannot create Kerala Officer (403 Forbidden)', async () => {
  const res = await request(app)
    .post('/api/state-admin/officers')
    .set('Authorization', `Bearer ${tnStateAdminToken}`)
    .send({
      name: 'Kerala Officer Fake',
      username: `officer_kl_fake_${Date.now()}`,
      password: 'TemporaryPass123!',
      state: 'Kerala',
      district: 'Kochi',
    });

  assert.equal(res.status, 403);
});

test('20. Tamil Nadu State Admin can create a Tamil Nadu Minister', async () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const res = await request(app)
    .post('/api/state-admin/ministers')
    .set('Authorization', `Bearer ${tnStateAdminToken}`)
    .send({
      name: `TN Minister ${rand}`,
      username: `minister_tn_${rand}`,
      password: 'TemporaryPass123!',
      department: 'Revenue & Land Records',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.state, 'Tamil Nadu');
});

test('21. Tamil Nadu State Admin cannot create Kerala Minister (403 Forbidden)', async () => {
  const res = await request(app)
    .post('/api/state-admin/ministers')
    .set('Authorization', `Bearer ${tnStateAdminToken}`)
    .send({
      name: 'Kerala Minister Fake',
      username: `minister_kl_fake_${Date.now()}`,
      password: 'TemporaryPass123!',
      state: 'Kerala',
    });

  assert.equal(res.status, 403);
});

// ==========================================
// 6. SUPER ADMIN NATIONWIDE CAPABILITIES (Tests 22 - 25)
// ==========================================

test('22. Super Admin can list states and create a State Admin for an unassigned state', async () => {
  const statesRes = await request(app)
    .get('/api/super-admin/states')
    .set('Authorization', `Bearer ${superAdminToken}`);

  assert.equal(statesRes.status, 200);
  assert.equal(statesRes.body.data.total, 28);

  const existingAdminsRes = await request(app)
    .get('/api/super-admin/state-admins')
    .set('Authorization', `Bearer ${superAdminToken}`);

  const assignedStates = (existingAdminsRes.body.data?.stateAdmins || []).map(a => a.state || a.state_name);
  const unassignedState = (statesRes.body.data.states || []).find(s => !assignedStates.includes(s.state_name)) || statesRes.body.data.states[0];

  const rand = Math.floor(1000 + Math.random() * 9000);
  const res = await request(app)
    .post('/api/super-admin/state-admins')
    .set('Authorization', `Bearer ${superAdminToken}`)
    .send({
      name: `${unassignedState.state_name} Administrator`,
      username: `${unassignedState.state_code}_admin_${rand}`,
      password: 'StateAdminPass123!',
      state: unassignedState.state_name,
      department: 'Revenue & Land Records',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.state, unassignedState.state_name);
});

test('23. Super Admin can create cross-state Officers in any state', async () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const res = await request(app)
    .post('/api/super-admin/officers')
    .set('Authorization', `Bearer ${superAdminToken}`)
    .send({
      name: `Gujarat Officer ${rand}`,
      username: `officer_gj_${rand}`,
      password: 'OfficerPass123!',
      state: 'Gujarat',
      district: 'Ahmedabad',
      department: 'Land Records',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.state, 'Gujarat');
});

test('24. Super Admin can create cross-state Ministers in any state', async () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const res = await request(app)
    .post('/api/super-admin/ministers')
    .set('Authorization', `Bearer ${superAdminToken}`)
    .send({
      name: `Maharashtra Minister ${rand}`,
      username: `minister_mh_${rand}`,
      password: 'MinisterPass123!',
      state: 'Maharashtra',
      department: 'Revenue',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.state, 'Maharashtra');
});

test('25. Super Admin can view all states data nationwide (200 OK)', async () => {
  const res = await request(app)
    .get('/api/super-admin/dashboard')
    .set('Authorization', `Bearer ${superAdminToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.body.data.totalUsers >= 1);
});

// ==========================================
// 7. SECURITY & INTEGRITY (Tests 26 - 32)
// ==========================================

test('26. IDOR attempt on application returns 403 Forbidden', async () => {
  // Salem officer accessing Kochi application
  const res = await request(app)
    .get(`/api/officer/applications/${kochiCaseId}`)
    .set('Authorization', `Bearer ${tnOfficerToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('27. Unauthorized query parameter cannot bypass jurisdiction', async () => {
  // Officer tries ?district=Chennai or ?state=Kerala
  const res = await request(app)
    .get('/api/officer/applications?district=Chennai')
    .set('Authorization', `Bearer ${tnOfficerToken}`);

  // Query guard rejects illegal district query parameter with 403
  assert.equal(res.status, 403);
});

test('28. No password or hash is leaked in API responses', async () => {
  const res = await request(app)
    .get('/api/super-admin/officers')
    .set('Authorization', `Bearer ${superAdminToken}`);

  assert.equal(res.status, 200);
  const officers = res.body.data.officers || [];
  for (const off of officers) {
    assert.equal(off.password_hash, undefined);
    assert.equal(off.password, undefined);
  }
});

test('29. No OTP values leaked in API responses', async () => {
  const res = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '123412341234' });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.otp, undefined);
});

test('30. No raw full Aadhaar numbers leaked in responses', async () => {
  const res = await request(app)
    .get('/api/super-admin/citizens')
    .set('Authorization', `Bearer ${superAdminToken}`);

  assert.equal(res.status, 200);
  const citizens = res.body.data.citizens || [];
  for (const c of citizens) {
    assert.equal(c.aadhaar_number, undefined);
    if (c.masked_aadhaar) {
      assert.ok(c.masked_aadhaar.startsWith('XXXX-XXXX-'));
    }
  }
});

test('31. JWT token contains no sensitive credentials (no password, OTP, or raw Aadhaar)', () => {
  const decoded = jwt.decode(tnStateAdminToken);
  assert.ok(decoded);
  assert.equal(decoded.password, undefined);
  assert.equal(decoded.password_hash, undefined);
  assert.equal(decoded.otp, undefined);
  assert.equal(decoded.aadhaar, undefined);
});

test('32. Audit events are recorded for unauthorized access attempts', async () => {
  // Trigger unauthorized access attempt
  await request(app)
    .get(`/api/officer/applications/${kochiCaseId}`)
    .set('Authorization', `Bearer ${tnOfficerToken}`);

  const { events } = await auditRepository.getAuditLogs({ limit: 10, offset: 0 });
  const hasAttemptLog = events.some(e =>
    e.event_type === 'UNAUTHORIZED_STATE_ACCESS_ATTEMPT' ||
    e.event_type === 'UNAUTHORIZED_DISTRICT_ACCESS_ATTEMPT'
  );

  assert.ok(hasAttemptLog, 'Audit log should record unauthorized access attempt');
});

test.after(async () => {
  try {
    await pool.end();
  } catch (_) {}
});
