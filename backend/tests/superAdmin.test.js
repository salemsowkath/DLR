const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const config = require('../src/config/env');
const { pool } = require('../src/config/database');
const { userRepository } = require('../src/repositories/userRepository');
const { resetRateLimiter } = require('../src/middleware/rateLimiter');
const { verifyPassword } = require('../src/services/passwordService');

test.beforeEach(() => {
  resetRateLimiter();
});

test('Super Admin Module Test Suite - Phase 18 Comprehensive Verification', async (t) => {
  let superAdminToken = '';
  let superAdminUserId = '';
  let testOfficerId = '';
  let testOfficerUsername = `test_officer_${Date.now()}`;
  let testMinisterId = '';
  let testMinisterUsername = `test_minister_${Date.now()}`;

  // -------------------------------------------------------------
  // Test 1: Super Admin login succeeds with valid credentials
  // -------------------------------------------------------------
  await t.test('1. Super Admin login succeeds with valid credentials', async () => {
    // Verify old credentials are now rejected
    const oldRes = await request(app)
      .post('/api/auth/super-admin/login')
      .send({
        username: 'superadmin',
        password: 'SuperAdminPass123!',
      });
    assert.equal(oldRes.status, 401, 'Old superadmin credentials must be rejected');

    // Login with new credentials
    const res = await request(app)
      .post('/api/auth/super-admin/login')
      .send({
        username: 'Dora027',
        password: 'DOra#027',
      });

    assert.equal(res.status, 200, `Expected 200 but got ${res.status}: ${res.text}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token, 'Token should be returned');
    assert.equal(res.body.user.role, 'SUPER_ADMIN');
    assert.equal(res.body.user.username, 'Dora027');
    assert.equal(res.body.user.password, undefined, 'Password should never be returned');

    superAdminToken = res.body.token;
    superAdminUserId = res.body.user.id;

    // Verify JWT payload does NOT contain password or sensitive info
    const decoded = jwt.decode(superAdminToken);
    assert.ok(decoded.sub, 'Token should have sub');
    assert.equal(decoded.role, 'SUPER_ADMIN');
    assert.equal(decoded.password, undefined, 'JWT must not contain password');
    assert.equal(decoded.aadhaar, undefined, 'JWT must not contain aadhaar');
  });

  // -------------------------------------------------------------
  // Test 2: Wrong password fails with 401
  // -------------------------------------------------------------
  await t.test('2. Wrong password fails with 401', async () => {
    const res = await request(app)
      .post('/api/auth/super-admin/login')
      .send({
        username: 'Dora027',
        password: 'WrongPassword999!',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // -------------------------------------------------------------
  // Test 3: Citizen cannot use Super Admin login
  // -------------------------------------------------------------
  await t.test('3. Citizen credentials rejected by Super Admin login (403 Forbidden)', async () => {
    // Attempting login with citizen identity
    const res = await request(app)
      .post('/api/auth/super-admin/login')
      .send({
        username: 'CITIZEN-TEST-USER',
        password: 'CitizenPass123!',
      });

    // Should return 401 (if user does not exist) or 403 (if user exists but lacks SUPER_ADMIN role)
    assert.ok([401, 403].includes(res.status));
    assert.equal(res.body.success, false);
  });

  // -------------------------------------------------------------
  // Test 4: Officer cannot use Super Admin login (403 Forbidden)
  // -------------------------------------------------------------
  await t.test('4. Officer cannot use Super Admin login (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/auth/super-admin/login')
      .send({
        username: 'DEMO-OFFICER-001',
        password: 'OfficerPass123!',
      });

    assert.equal(res.status, 403, `Expected 403 for Officer role but got ${res.status}`);
    assert.equal(res.body.success, false);
  });

  // -------------------------------------------------------------
  // Test 5: Minister cannot use Super Admin login (403 Forbidden)
  // -------------------------------------------------------------
  await t.test('5. Minister cannot use Super Admin login (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/auth/super-admin/login')
      .send({
        username: 'DEMO-MINISTER-001',
        password: 'MinisterPass123!',
      });

    assert.equal(res.status, 403, `Expected 403 for Minister role but got ${res.status}`);
    assert.equal(res.body.success, false);
  });

  // -------------------------------------------------------------
  // Test 6: Super Admin can access dashboard & real MySQL counts
  // -------------------------------------------------------------
  await t.test('6. Super Admin can access dashboard and receives real statistics', async () => {
    const res = await request(app)
      .get('/api/super-admin/dashboard')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);
    assert.ok(typeof res.body.data.citizens === 'number');
    assert.ok(typeof res.body.data.officers === 'number');
    assert.ok(typeof res.body.data.ministers === 'number');
    assert.ok(typeof res.body.data.landRecords === 'number');
    assert.ok(Array.isArray(res.body.data.recentActivities));
  });

  // -------------------------------------------------------------
  // Test 7 & 8: Officer creation works, password is never plaintext
  // -------------------------------------------------------------
  await t.test('7 & 8. Officer creation works and password is safely hashed', async () => {
    const res = await request(app)
      .post('/api/super-admin/officers')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Inspector Rajan',
        username: testOfficerUsername,
        password: 'OfficerSecret999!',
        email: `${testOfficerUsername}@tn.gov.in`,
        state: 'Tamil Nadu',
        district: 'Salem',
        department: 'Land Records',
      });

    assert.equal(res.status, 201, `Failed to create officer: ${res.text}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.username, testOfficerUsername);
    assert.equal(res.body.data.password, undefined, 'Password must never be returned in API');
    testOfficerId = res.body.data.id;

    // Direct database verification: password must be bcrypt hash (starting with $2a$ or $2b$)
    const createdUser = await userRepository.findById(testOfficerId);
    assert.ok(createdUser);
    assert.notEqual(createdUser.password_hash, 'OfficerSecret999!');
    assert.ok(createdUser.password_hash.startsWith('$2'));

    const passwordMatches = await verifyPassword('OfficerSecret999!', createdUser.password_hash);
    assert.equal(passwordMatches, true);
  });

  // -------------------------------------------------------------
  // Test 9: Officer can login using created credentials
  // -------------------------------------------------------------
  await t.test('9. Officer can login using created credentials', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .send({
        identifier: testOfficerUsername,
        password: 'OfficerSecret999!',
      });

    assert.equal(res.status, 200, `Officer login failed: ${res.text}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
  });

  // -------------------------------------------------------------
  // Test 10 & 11: Minister creation works, password is safe
  // -------------------------------------------------------------
  await t.test('10 & 11. Minister creation works and password is safe', async () => {
    const res = await request(app)
      .post('/api/super-admin/ministers')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Honorable Revenue Minister',
        username: testMinisterUsername,
        password: 'MinisterSecret999!',
        email: `${testMinisterUsername}@revenue.tn.gov.in`,
        state: 'Tamil Nadu',
        department: 'Revenue Administration',
      });

    assert.equal(res.status, 201, `Failed to create minister: ${res.text}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.password, undefined);
    testMinisterId = res.body.data.id;

    const ministerUser = await userRepository.findById(testMinisterId);
    assert.ok(ministerUser);
    assert.notEqual(ministerUser.password_hash, 'MinisterSecret999!');
    assert.ok(ministerUser.password_hash.startsWith('$2'));
  });

  // -------------------------------------------------------------
  // Test 12: Minister can login using created credentials
  // -------------------------------------------------------------
  await t.test('12. Minister can login using created credentials', async () => {
    const res = await request(app)
      .post('/api/auth/minister/login')
      .send({
        identifier: testMinisterUsername,
        password: 'MinisterSecret999!',
      });

    assert.equal(res.status, 200, `Minister login failed: ${res.text}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
  });

  // -------------------------------------------------------------
  // Test 13: Duplicate username is rejected with 409 Conflict
  // -------------------------------------------------------------
  await t.test('13. Duplicate username is rejected with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/super-admin/officers')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Another Officer',
        username: testOfficerUsername, // duplicate!
        password: 'Password123!',
        email: `another_${Date.now()}@tn.gov.in`,
        state: 'Tamil Nadu',
        district: 'Salem',
      });

    assert.equal(res.status, 409, `Expected 409 Conflict on duplicate username but got ${res.status}`);
    assert.equal(res.body.success, false);
  });

  // -------------------------------------------------------------
  // Test 14: Officer deactivation prevents login
  // -------------------------------------------------------------
  await t.test('14. Officer deactivation prevents login', async () => {
    // Super admin deactivates officer
    const patchRes = await request(app)
      .patch(`/api/super-admin/officers/${testOfficerId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'INACTIVE' });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.status, 'INACTIVE');

    // Deactivated officer tries to login
    const loginRes = await request(app)
      .post('/api/auth/officer/login')
      .send({
        identifier: testOfficerUsername,
        password: 'OfficerSecret999!',
      });

    assert.ok([401, 403].includes(loginRes.status), `Expected 401/403 for inactive user but got ${loginRes.status}`);
    assert.equal(loginRes.body.success, false);
  });

  // -------------------------------------------------------------
  // Test 15: Minister deactivation prevents login
  // -------------------------------------------------------------
  await t.test('15. Minister deactivation prevents login', async () => {
    const patchRes = await request(app)
      .patch(`/api/super-admin/ministers/${testMinisterId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'SUSPENDED' });

    assert.equal(patchRes.status, 200);

    const loginRes = await request(app)
      .post('/api/auth/minister/login')
      .send({
        identifier: testMinisterUsername,
        password: 'MinisterSecret999!',
      });

    assert.ok([401, 403].includes(loginRes.status));
    assert.equal(loginRes.body.success, false);
  });

  // -------------------------------------------------------------
  // Test 16 & 17: Citizen list works and Aadhaar remains strictly masked
  // -------------------------------------------------------------
  await t.test('16 & 17. Citizen list works and Aadhaar remains strictly masked', async () => {
    const res = await request(app)
      .get('/api/super-admin/citizens')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.citizens));

    // Check that every citizen in list has masked Aadhaar and no raw Aadhaar
    for (const citizen of res.body.data.citizens) {
      if (citizen.maskedAadhaar) {
        assert.match(citizen.maskedAadhaar, /^XXXX-XXXX-\d{4}$/, 'Aadhaar must be formatted as XXXX-XXXX-9012');
      }
      assert.equal(citizen.aadhaarNumber, undefined, 'Raw aadhaarNumber must not be present');
      assert.equal(citizen.aadhaar_number, undefined, 'Raw aadhaar_number must not be present');
    }
  });

  // -------------------------------------------------------------
  // Test 18: Reset Officer password and verify new password works
  // -------------------------------------------------------------
  await t.test('18. Password reset updates credentials securely', async () => {
    // Re-activate officer first
    await request(app)
      .patch(`/api/super-admin/officers/${testOfficerId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'ACTIVE' });

    // Reset password
    const resetRes = await request(app)
      .post(`/api/super-admin/officers/${testOfficerId}/reset-password`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ newPassword: 'NewOfficerSecret456!' });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);
    assert.equal(resetRes.body.password, undefined);

    // Old password should fail
    const oldLogin = await request(app)
      .post('/api/auth/officer/login')
      .send({
        identifier: testOfficerUsername,
        password: 'OfficerSecret999!',
      });
    assert.equal(oldLogin.status, 401);

    // New password should succeed
    const newLogin = await request(app)
      .post('/api/auth/officer/login')
      .send({
        identifier: testOfficerUsername,
        password: 'NewOfficerSecret456!',
      });
    assert.equal(newLogin.status, 200);
    assert.equal(newLogin.body.success, true);
  });

  // -------------------------------------------------------------
  // Test 19: Audit logs are recorded in MySQL
  // -------------------------------------------------------------
  await t.test('19. Audit logs are recorded and retrievable by Super Admin', async () => {
    const res = await request(app)
      .get('/api/super-admin/audit-logs')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.logs));
    assert.ok(res.body.data.logs.length > 0, 'Should have logged events');

    // Confirm no audit log contains passwords or secrets
    for (const log of res.body.data.logs) {
      const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata || {};
      assert.equal(meta.password, undefined, 'Audit log must never contain password');
      assert.equal(meta.newPassword, undefined, 'Audit log must never contain newPassword');
      assert.equal(meta.token, undefined, 'Audit log must never contain token');
    }
  });

  // -------------------------------------------------------------
  // Test 20: Non-superadmin cannot access Super Admin APIs (RBAC)
  // -------------------------------------------------------------
  await t.test('20. Non-superadmin cannot access Super Admin APIs (RBAC)', async () => {
    // Login as existing officer
    const officerLogin = await request(app)
      .post('/api/auth/officer/login')
      .send({
        identifier: 'DEMO-OFFICER-001',
        password: 'OfficerPass123!',
      });

    assert.equal(officerLogin.status, 200);
    const officerToken = officerLogin.body.token;

    // Try accessing super-admin dashboard with Officer token
    const res = await request(app)
      .get('/api/super-admin/dashboard')
      .set('Authorization', `Bearer ${officerToken}`);

    assert.equal(res.status, 403, `Officer should be denied access to Super Admin dashboard: ${res.status}`);
  });

  // -------------------------------------------------------------
  // Test 21: Existing Officer login still works
  // -------------------------------------------------------------
  await t.test('21. Existing Officer login still works intact', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .send({
        identifier: 'DEMO-OFFICER-001',
        password: 'OfficerPass123!',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
  });

  // -------------------------------------------------------------
  // Test 22: Existing Minister login still works
  // -------------------------------------------------------------
  await t.test('22. Existing Minister login still works intact', async () => {
    const res = await request(app)
      .post('/api/auth/minister/login')
      .send({
        identifier: 'DEMO-MINISTER-001',
        password: 'MinisterPass123!',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
  });

  // -------------------------------------------------------------
  // Test 23: Super Admin Land Records Overview endpoint works
  // -------------------------------------------------------------
  await t.test('23. Land Records overview endpoint works', async () => {
    const res = await request(app)
      .get('/api/super-admin/land-records')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.records));
  });

  // -------------------------------------------------------------
  // Test 24: Unauthenticated requests are rejected (401)
  // -------------------------------------------------------------
  await t.test('24. Unauthenticated requests are rejected (401)', async () => {
    const res = await request(app)
      .get('/api/super-admin/dashboard');

    assert.equal(res.status, 401);
  });
});
