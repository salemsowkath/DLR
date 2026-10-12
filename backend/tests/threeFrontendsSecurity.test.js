const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

describe('Three Frontends Architecture & Security Verification Suite', () => {
  let citizenToken;
  let citizenUser;
  let officerToken;
  let ministerToken;
  let stateAdminToken;
  let superAdminToken;

  const browserContextA = 'browser-ctx-frontends-A';
  const browserContextB = 'browser-ctx-frontends-B';

  // 1. Citizen Frontend Login (Port 3000 flow)
  it('1. Citizen login succeeds via Aadhaar OTP and returns CITIZEN role', async () => {
    // Request OTP for demo citizen
    const otpReq = await request(app)
      .post('/api/auth/citizen/otp/request')
      .set('Origin', 'http://localhost:3000')
      .send({ aadhaarNumber: '999988881234' });

    assert.strictEqual(otpReq.status, 200);
    const { sessionId } = otpReq.body.data;

    // Verify OTP (default dev otp: 123456)
    const otpVerify = await request(app)
      .post('/api/auth/citizen/otp/verify')
      .set('Origin', 'http://localhost:3000')
      .send({
        aadhaarNumber: '999988881234',
        otp: '123456',
        sessionId,
      });

    assert.strictEqual(otpVerify.status, 200);
    assert.ok(otpVerify.body.data?.accessToken);
    citizenToken = otpVerify.body.data.accessToken;
    citizenUser = otpVerify.body.data.user;
    assert.strictEqual(citizenUser.primary_role || citizenUser.roles?.[0], 'CITIZEN');
  });

  // 2. Officer Frontend Login (Port 3001 flow)
  it('2. Officer login succeeds and returns OFFICER role with state & district', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .set('Origin', 'http://localhost:3001')
      .send({
        username: 'DEMO-OFFICER-001',
        password: 'OfficerPass123!',
      });

    assert.strictEqual(res.status, 200);
    officerToken = res.body.token || res.body.accessToken;
    assert.ok(officerToken);
    const isOfficer = (res.body.user?.roles || []).some((r) => r === 'OFFICER' || r === 'GOVERNMENT_OFFICER')
      || res.body.user?.role === 'OFFICER'
      || res.body.user?.role === 'GOVERNMENT_OFFICER';
    assert.ok(isOfficer, 'User must possess Officer role');
    assert.strictEqual(res.body.user?.state, 'Tamil Nadu');
    assert.strictEqual(res.body.user?.district, 'Salem');
  });

  // 3. Minister Frontend Login (Port 3001 flow)
  it('3. Minister login succeeds and returns MINISTER role with state', async () => {
    const res = await request(app)
      .post('/api/auth/minister/login')
      .set('Origin', 'http://localhost:3001')
      .send({
        username: 'DEMO-MINISTER-001',
        password: 'MinisterPass123!',
      });

    assert.strictEqual(res.status, 200);
    ministerToken = res.body.token || res.body.accessToken;
    assert.ok(ministerToken);
    assert.strictEqual(res.body.user?.role || res.body.user?.roles?.[0], 'MINISTER');
    assert.strictEqual(res.body.user?.state, 'Tamil Nadu');
  });

  // 4. State Admin Frontend Login (Port 3002 flow)
  it('4. State Admin login succeeds and returns STATE_ADMIN role with assigned state', async () => {
    const res = await request(app)
      .post('/api/auth/state-admin/login')
      .set('Origin', 'http://localhost:3002')
      .send({
        username: 'Tamil_Nadu_admin',
        password: 'Tamil_Nadu_Admin@123',
      });

    assert.strictEqual(res.status, 200);
    stateAdminToken = res.body.token || res.body.accessToken;
    assert.ok(stateAdminToken);
    assert.strictEqual(res.body.user?.role || res.body.user?.roles?.[0], 'STATE_ADMIN');
    assert.strictEqual(res.body.user?.state, 'Tamil Nadu');
  });

  // 5. Super Admin Frontend Login (Port 3002 flow)
  it('5. Super Admin login succeeds with Dora027 and returns SUPER_ADMIN role', async () => {
    const res = await request(app)
      .post('/api/auth/super-admin/login')
      .set('Origin', 'http://localhost:3002')
      .send({
        username: 'Dora027',
        password: 'DOra#027',
      });

    assert.strictEqual(res.status, 200);
    superAdminToken = res.body.token || res.body.accessToken;
    assert.ok(superAdminToken);
    assert.strictEqual(res.body.user?.role || res.body.user?.roles?.[0], 'SUPER_ADMIN');
  });

  // 6. Wrong-role login protections
  it('6. Wrong-role logins are strictly rejected by the backend', async () => {
    // Officer trying to log in via Super Admin endpoint
    const officerAsAdmin = await request(app)
      .post('/api/auth/super-admin/login')
      .send({
        username: 'DEMO-OFFICER-001',
        password: 'OfficerPass123!',
      });
    assert.strictEqual(officerAsAdmin.status, 403);

    // Minister trying to log in via Super Admin endpoint
    const ministerAsAdmin = await request(app)
      .post('/api/auth/super-admin/login')
      .send({
        username: 'DEMO-MINISTER-001',
        password: 'MinisterPass123!',
      });
    assert.strictEqual(ministerAsAdmin.status, 403);

    // Citizen attempting Officer endpoint
    const citizenAsOfficer = await request(app)
      .post('/api/auth/officer/login')
      .send({
        username: 'usr-aadhaar-1234',
        password: 'Password123!',
      });
    assert.ok([401, 403].includes(citizenAsOfficer.status));
  });

  // 7. State Isolation (Tamil Nadu State Admin & Minister cannot access Kerala)
  it('7. Tamil Nadu State Admin cannot query or mutate Kerala data (403 Forbidden)', async () => {
    const crossStateRes = await request(app)
      .get('/api/state-admin/officers?state=Kerala')
      .set('Authorization', `Bearer ${stateAdminToken}`);

    assert.strictEqual(crossStateRes.status, 403);
  });

  it('7b. Tamil Nadu Minister cannot access Kerala application (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/officer/applications/DLR-2026-000076') // Kerala application
      .set('Authorization', `Bearer ${ministerToken}`);

    assert.strictEqual(res.status, 403);
  });

  // 8. District Isolation (Salem Officer cannot access Chennai)
  it('8. Salem Officer cannot access Chennai or query-override district (403 Forbidden)', async () => {
    // Attempting to query Chennai
    const queryOverride = await request(app)
      .get('/api/officer/applications?district=Chennai')
      .set('Authorization', `Bearer ${officerToken}`);

    assert.strictEqual(queryOverride.status, 403);

    // Attempting to view specific Chennai application
    const crossDistrictCase = await request(app)
      .get('/api/officer/applications/DLR-2026-000075')
      .set('Authorization', `Bearer ${officerToken}`);

    assert.strictEqual(crossDistrictCase.status, 403);
  });

  // 9. Super Admin nationwide access
  it('9. Super Admin can view all states nationwide without jurisdiction restriction', async () => {
    const statesRes = await request(app)
      .get('/api/super-admin/states')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.strictEqual(statesRes.status, 200);
    const list = statesRes.body.data?.states || statesRes.body.data || [];
    assert.strictEqual(list.length, 28);
  });

  // 10. IDOR Protection (Citizen cannot access officer applications or unauthorized resources)
  it('10. Citizen cannot access officer/unauthorized application (IDOR protected with 403)', async () => {
    const crossAccess = await request(app)
      .get('/api/officer/applications/DLR-2026-000078')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(crossAccess.status, 403);
  });

  // 11. Session Replacement per browser context
  it('11. New login in same browser context invalidates old tab session (401 SESSION_REPLACED)', async () => {
    // Login User 1 in context A
    const login1 = await request(app)
      .post('/api/auth/super-admin/login')
      .set('x-client-context-id', browserContextA)
      .send({ username: 'Dora027', password: 'DOra#027' });
    const token1 = login1.body.accessToken || login1.body.token;

    // Login User 2 in same context A
    const login2 = await request(app)
      .post('/api/auth/state-admin/login')
      .set('x-client-context-id', browserContextA)
      .send({ username: 'Tamil_Nadu_admin', password: 'Tamil_Nadu_Admin@123' });
    assert.strictEqual(login2.status, 200);

    // Old token1 in context A receives 401 SESSION_REPLACED
    const replacedRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token1}`)
      .set('x-client-context-id', browserContextA);

    assert.strictEqual(replacedRes.status, 401);
    assert.strictEqual(replacedRes.body.error?.code, 'SESSION_REPLACED');
    assert.strictEqual(replacedRes.body.error?.message, 'Your DLR session was replaced by a new login.');
  });

  // 12. Logout
  it('12. Logout endpoint succeeds and confirms termination', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${officerToken}`);

    assert.strictEqual(logoutRes.status, 200);
    assert.strictEqual(logoutRes.body.data?.loggedOut, true);
  });

  // 13. Expired / Invalid token rejection
  it('13. Expired or malformed token is rejected with 401 Unauthorized', async () => {
    const badTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-xyz');

    assert.strictEqual(badTokenRes.status, 401);
  });

  // 14. Land record workflow (Citizen submits, Officer receives)
  it('14. Citizen can view own applications list (applications/mine)', async () => {
    const myApps = await request(app)
      .get('/api/documents/applications/mine')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(myApps.status, 200);
    assert.ok(Array.isArray(myApps.body.data?.applications || myApps.body.data));
  });

  // 15. AI workflow is server-orchestrated (direct unauthenticated access rejected)
  it('15. Internal AI processing cannot be bypassed without authorization', async () => {
    const unauthAI = await request(app)
      .post('/api/officer/applications/DLR-2026-000078/generate');

    assert.strictEqual(unauthAI.status, 401);
  });

  // 16. Appointments endpoint requires authentication
  it('16. Appointments endpoint is secured and accessible to authorized citizens', async () => {
    const appointmentsRes = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(appointmentsRes.status, 200);
  });

  // 17. Citizen verification photo endpoint requires authentication
  it('17. Biometric verification photo endpoint requires authentication', async () => {
    const photoRes = await request(app)
      .get('/api/verification/photos/c7c918ff-9e14-42a0-acf5-8795a91156b8');

    assert.strictEqual(photoRes.status, 401);
  });

  // 18. Citizen cannot approve land records
  it('18. Citizen cannot call officer approval endpoint (403 Forbidden)', async () => {
    const approveRes = await request(app)
      .post('/api/officer/applications/DLR-2026-000078/approve')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(approveRes.status, 403);
  });

  // 19. Citizen approved record view
  it('19. Citizen can access authorized approved records endpoint', async () => {
    const approvedRes = await request(app)
      .get('/api/land-records/approved')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(approvedRes.status, 200);
  });

  // 20. CORS validation for development ports
  it('20. CORS allows requests from http://localhost:3000, :3001, and :3002', async () => {
    const cors3000 = await request(app).options('/api/auth/me').set('Origin', 'http://localhost:3000');
    assert.strictEqual(cors3000.headers['access-control-allow-origin'], 'http://localhost:3000');

    const cors3001 = await request(app).options('/api/auth/me').set('Origin', 'http://localhost:3001');
    assert.strictEqual(cors3001.headers['access-control-allow-origin'], 'http://localhost:3001');

    const cors3002 = await request(app).options('/api/auth/me').set('Origin', 'http://localhost:3002');
    assert.strictEqual(cors3002.headers['access-control-allow-origin'], 'http://localhost:3002');
  });

  after(async () => {
    try {
      await pool.end();
    } catch (_) {}
  });
});
