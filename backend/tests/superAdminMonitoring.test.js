const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const config = require('../src/config/env');
const { pool } = require('../src/config/database');
const { resetRateLimiter } = require('../src/middleware/rateLimiter');

test.beforeEach(() => {
  resetRateLimiter();
});

test('Super Admin Monitoring & Reporting Extended Test Suite', async (t) => {
  let superAdminToken = '';
  let officerToken = '';
  let ministerToken = '';
  let citizenToken = '';

  // -------------------------------------------------------------
  // Setup: Authenticate All Roles
  // -------------------------------------------------------------
  await t.test('1. Super Admin login succeeds with valid credentials (Dora027 / DOra#027)', async () => {
    // Ensure demo users are ACTIVE
    await pool.query("UPDATE users SET status = 'ACTIVE' WHERE username IN ('DEMO-OFFICER-001', 'DEMO-MINISTER-001', 'Dora027')");

    const res = await request(app)
      .post('/api/auth/super-admin/login')
      .send({
        username: 'Dora027',
        password: 'DOra#027',
      });

    assert.equal(res.status, 200, `Expected 200: ${res.text}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token, 'Token must be returned');
    assert.equal(res.body.user.role, 'SUPER_ADMIN');
    assert.equal(res.body.user.password, undefined);
    assert.equal(res.body.user.password_hash, undefined);

    superAdminToken = res.body.token;
  });

  await t.test('2. Existing Officer login still works intact (DEMO-OFFICER-001)', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .send({
        username: 'DEMO-OFFICER-001',
        password: 'OfficerPass123!',
      });

    assert.equal(res.status, 200, `Expected 200: ${res.text}`);
    assert.equal(res.body.success, true);
    const token = res.body.data?.token || res.body.token;
    assert.ok(token, 'Officer token must be present');
    officerToken = token;
  });

  await t.test('3. Existing Minister login still works intact (DEMO-MINISTER-001)', async () => {
    const res = await request(app)
      .post('/api/auth/minister/login')
      .send({
        username: 'DEMO-MINISTER-001',
        password: 'MinisterPass123!',
      });

    assert.equal(res.status, 200, `Expected 200: ${res.text}`);
    assert.equal(res.body.success, true);
    const token = res.body.data?.token || res.body.token;
    assert.ok(token, 'Minister token must be present');
    ministerToken = token;
  });

  await t.test('4. Existing Citizen authentication works', async () => {
    const { signToken } = require('../src/services/jwtService');
    const citizenRes = await pool.query(`
      SELECT u.id, u.username, u.name 
      FROM users u 
      JOIN user_roles ur ON u.id = ur.user_id 
      JOIN roles r ON ur.role_id = r.id 
      WHERE r.role_name = 'CITIZEN' AND u.status = 'ACTIVE' 
      LIMIT 1
    `);
    const citizenUser = citizenRes.rows[0];
    assert.ok(citizenUser, 'Must find an active citizen in database');
    citizenToken = signToken({
      id: citizenUser.id,
      roles: ['CITIZEN'],
      name: citizenUser.name,
    });
    assert.ok(citizenToken);
  });

  // -------------------------------------------------------------
  // Work Monitoring Tests
  // -------------------------------------------------------------
  await t.test('5. Super Admin can view Officer Work list with database metrics', async () => {
    const res = await request(app)
      .get('/api/admin/work/officers')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200, `Expected 200: ${res.text}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.officers), 'Officers array must be returned');
    assert.ok(res.body.data.officers.length > 0, 'Should return officers from DB');

    // Also check alias route /api/super-admin/work/officers
    const aliasRes = await request(app)
      .get('/api/super-admin/work/officers')
      .set('Authorization', `Bearer ${superAdminToken}`);
    assert.equal(aliasRes.status, 200);

    const firstOfficer = res.body.data.officers[0];
    assert.ok(firstOfficer.officer_id || firstOfficer.id);
    assert.ok(firstOfficer.name);
    assert.notEqual(firstOfficer.total_applications, undefined);
    assert.notEqual(firstOfficer.pending_applications, undefined);
    assert.notEqual(firstOfficer.approved_applications, undefined);
    assert.notEqual(firstOfficer.rejected_applications, undefined);
  });

  await t.test('6. Super Admin can view specific Officer SS027 work profile', async () => {
    const res = await request(app)
      .get('/api/admin/work/officers/SS027')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200, `Expected 200: ${res.text}`);
    assert.equal(res.body.success, true);

    const p = res.body.data;
    assert.ok(p.profile, 'Profile section must exist');
    assert.equal(p.profile.username.toLowerCase(), 'ss027');
    assert.equal(p.profile.state, 'Tamil Nadu');
    assert.equal(p.profile.district, 'Salem');
    assert.equal(p.profile.department, 'Land Records');
    assert.equal(p.profile.status, 'ACTIVE');

    // Section C & D: Work & Application Statistics
    assert.ok(p.workSummary, 'Work summary must exist');
    assert.equal(typeof p.workSummary.totalApplications, 'number');
    assert.equal(typeof p.workSummary.pendingApplications, 'number');
    assert.equal(typeof p.workSummary.approvedApplications, 'number');
    assert.equal(typeof p.workSummary.rejectedApplications, 'number');
    assert.equal(typeof p.workSummary.aiProcessed, 'number');
    assert.equal(typeof p.workSummary.correctionsMade, 'number');

    // Work statistics must come from DB (seeded 5 cases)
    assert.ok(p.workSummary.totalApplications >= 5, `Expected >= 5 applications, got ${p.workSummary.totalApplications}`);

    // Section F & G: Recent activity & work history
    assert.ok(Array.isArray(p.recentActivity), 'Recent activity must be an array');
    assert.ok(Array.isArray(p.workHistory), 'Work history must be an array');
    assert.ok(Array.isArray(p.auditTrail), 'Audit trail must be an array');
  });

  await t.test('7. Super Admin can view Minister Work list and detail profile', async () => {
    const res = await request(app)
      .get('/api/admin/work/ministers')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200, `Expected 200: ${res.text}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.ministers), 'Ministers array must be returned');
    assert.ok(res.body.data.ministers.length > 0, 'Should return ministers from DB');

    const firstMinister = res.body.data.ministers[0];
    const mId = firstMinister.minister_id || firstMinister.id;

    // View detail
    const detailRes = await request(app)
      .get(`/api/admin/work/ministers/${mId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(detailRes.status, 200, `Expected 200: ${detailRes.text}`);
    assert.equal(detailRes.body.success, true);
    assert.ok(detailRes.body.data.profile);
    assert.ok(detailRes.body.data.monitoringSummary);
    assert.ok(Array.isArray(detailRes.body.data.recentActivity));
  });

  // -------------------------------------------------------------
  // Reporting Portal Tests
  // -------------------------------------------------------------
  await t.test('8. Super Admin can access all 9 Report APIs with filters', async () => {
    const reportEndpoints = [
      '/api/admin/reports/overview',
      '/api/admin/reports/officers',
      '/api/admin/reports/ministers',
      '/api/admin/reports/land-records',
      '/api/admin/reports/verification',
      '/api/admin/reports/ai-processing',
      '/api/admin/reports/status',
      '/api/admin/reports/state-wise',
      '/api/admin/reports/district-wise',
      '/api/admin/reports/activity',
    ];

    for (const endpoint of reportEndpoints) {
      const res = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200, `Report ${endpoint} failed with ${res.status}: ${res.text}`);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data, `Report ${endpoint} data missing`);
    }
  });

  // -------------------------------------------------------------
  // Extended Dashboard Metrics & Visual Analytics
  // -------------------------------------------------------------
  await t.test('9. Extended Dashboard includes 11 database metrics and 8 visual analytics widgets', async () => {
    const res = await request(app)
      .get('/api/super-admin/dashboard')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const m = res.body.data.metrics;
    assert.ok(m, 'metrics object must be returned');
    assert.equal(typeof m.totalOfficers, 'number');
    assert.equal(typeof m.activeOfficers, 'number');
    assert.equal(typeof m.inactiveOfficers, 'number');
    assert.equal(typeof m.totalMinisters, 'number');
    assert.equal(typeof m.activeMinisters, 'number');
    assert.equal(typeof m.totalCitizens, 'number');
    assert.equal(typeof m.totalLandRecords, 'number');
    assert.equal(typeof m.pendingApplications, 'number');
    assert.equal(typeof m.approvedRecords, 'number');
    assert.equal(typeof m.rejectedRecords, 'number');
    assert.equal(typeof m.aiProcessedRecords, 'number');

    const v = res.body.data.visualAnalytics;
    assert.ok(v, 'visualAnalytics object must be returned');
    assert.ok(Array.isArray(v.applicationsByState), 'applicationsByState must be array');
    assert.ok(Array.isArray(v.applicationsByDistrict), 'applicationsByDistrict must be array');
    assert.ok(Array.isArray(v.officerWorkload), 'officerWorkload must be array');
    assert.ok(Array.isArray(v.officerPerformance), 'officerPerformance must be array');
    assert.ok(Array.isArray(v.ministerActivity), 'ministerActivity must be array');
    assert.ok(Array.isArray(v.applicationStatusDistribution), 'applicationStatusDistribution must be array');
    assert.ok(Array.isArray(v.monthlyProcessingTrend), 'monthlyProcessingTrend must be array');
    assert.ok(v.aiProcessingStatistics, 'aiProcessingStatistics must exist');
  });

  // -------------------------------------------------------------
  // RBAC Tests: Non-SuperAdmin Forbidden
  // -------------------------------------------------------------
  await t.test('10. Officer cannot access Super Admin Work or Report APIs (RBAC 403)', async () => {
    const resWork = await request(app)
      .get('/api/admin/work/officers')
      .set('Authorization', `Bearer ${officerToken}`);
    assert.equal(resWork.status, 403, 'Officer must be denied from /api/admin/work/officers');

    const resReport = await request(app)
      .get('/api/admin/reports/overview')
      .set('Authorization', `Bearer ${officerToken}`);
    assert.equal(resReport.status, 403, 'Officer must be denied from /api/admin/reports/overview');
  });

  await t.test('11. Minister cannot access Super Admin Work or Report APIs (RBAC 403)', async () => {
    const resWork = await request(app)
      .get('/api/admin/work/ministers')
      .set('Authorization', `Bearer ${ministerToken}`);
    assert.equal(resWork.status, 403, 'Minister must be denied from /api/admin/work/ministers');

    const resReport = await request(app)
      .get('/api/admin/reports/overview')
      .set('Authorization', `Bearer ${ministerToken}`);
    assert.equal(resReport.status, 403, 'Minister must be denied from /api/admin/reports/overview');
  });

  await t.test('12. Citizen cannot access Super Admin Work or Report APIs (RBAC 403)', async () => {
    const resWork = await request(app)
      .get('/api/admin/work/officers')
      .set('Authorization', `Bearer ${citizenToken}`);
    assert.equal(resWork.status, 403, 'Citizen must be denied from /api/admin/work/officers');

    const resReport = await request(app)
      .get('/api/admin/reports/overview')
      .set('Authorization', `Bearer ${citizenToken}`);
    assert.equal(resReport.status, 403, 'Citizen must be denied from /api/admin/reports/overview');
  });

  await t.test('13. Unauthenticated requests are rejected with 401', async () => {
    const resWork = await request(app).get('/api/admin/work/officers');
    assert.equal(resWork.status, 401);

    const resReport = await request(app).get('/api/admin/reports/overview');
    assert.equal(resReport.status, 401);
  });

  // -------------------------------------------------------------
  // Security & Privacy: No Aadhaar / Password / OTP leakage
  // -------------------------------------------------------------
  await t.test('14. Responses never leak plaintext passwords, password hashes, or OTPs', async () => {
    const endpoints = [
      '/api/admin/work/officers',
      '/api/admin/work/officers/SS027',
      '/api/admin/work/ministers',
      '/api/admin/reports/overview',
      '/api/super-admin/dashboard',
    ];

    for (const ep of endpoints) {
      const res = await request(app)
        .get(ep)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const bodyText = JSON.stringify(res.body);
      assert.doesNotMatch(bodyText, /"password":/i);
      assert.doesNotMatch(bodyText, /"password_hash":/i);
      assert.doesNotMatch(bodyText, /\$2b\$10\$/i); // bcrypt hash prefix
      assert.doesNotMatch(bodyText, /"otp":/i);
    }
  });

  await t.test('15. Citizen Aadhaar numbers are masked in citizen reports and lists', async () => {
    const res = await request(app)
      .get('/api/super-admin/citizens')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    const citizens = res.body.data?.citizens || [];
    for (const c of citizens) {
      if (c.aadhaar_number) {
        assert.match(
          c.aadhaar_number,
          /^XXXX-XXXX-\d{4}$/,
          `Aadhaar must be masked, got: ${c.aadhaar_number}`
        );
      }
    }
  });

  test.after(async () => {
    try {
      await pool.end();
    } catch (_) {}
  });
});
