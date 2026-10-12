const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const config = require('../src/config/env');
const { pool } = require('../src/config/database');
const { userRepository } = require('../src/repositories/userRepository');
const { resetRateLimiter } = require('../src/middleware/rateLimiter');
const DocumentMetadata = require('../src/models/documentMetadata');
const testOtp = config.devOtp || '123456';
let createdCitizenWithPasswordUsername = '';

function randomAadhaar() {
  return String(require('crypto').randomInt(0, 1_000_000_000_000)).padStart(12, '0');
}

async function registerTestCitizen() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const aadhaarNumber = randomAadhaar();
    const registration = await request(app)
      .post('/api/auth/citizen/register')
      .send({
        aadhaarNumber,
        fullName: `Access Test ${Date.now()}`,
        dateOfBirth: '1995-11-20',
        gender: 'Female',
        state: 'Tamil Nadu',
        district: 'Salem',
        taluk: 'Attur',
        village: 'Attur Town',
        pincode: '636102',
      });
    if (registration.status === 409) continue;
    assert.equal(registration.status, 200, registration.text);
    const verification = await request(app)
      .post('/api/auth/citizen/otp/verify')
      .send({ aadhaarNumber, otp: testOtp, sessionId: registration.body.data.sessionId });
    assert.equal(verification.status, 200, verification.text);
    return verification.body.data;
  }
  throw new Error('Could not create a unique citizen identity for the access-control test.');
}

test.beforeEach(() => {
  resetRateLimiter();
});

// Helper to run tests with REQUIRE_AUTH='true'
async function withEnforcedAuth(fn) {
  const prevEnv = process.env.REQUIRE_AUTH;
  process.env.REQUIRE_AUTH = 'true';
  try {
    await fn();
  } finally {
    if (prevEnv === undefined) delete process.env.REQUIRE_AUTH;
    else process.env.REQUIRE_AUTH = prevEnv;
  }
}

test('1. Citizen OTP request returns session ID and masked Aadhaar reference', async () => {
  const response = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.maskedAadhaar, 'XXXX-XXXX-1234');
  assert.ok(response.body.data.sessionId);
  assert.equal(response.body.data.devOtp, undefined);
});

test('2. Citizen OTP verification returns authenticated citizen session and JWT token', async () => {
  const reqRes = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });

  const { sessionId } = reqRes.body.data;

  const response = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({ aadhaarNumber: '999988881234', otp: testOtp, sessionId });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.user.primary_role, 'CITIZEN');
  assert.ok(response.body.data.accessToken);
  assert.equal(response.body.data.expiresIn, 3600);
});

test('3. Invalid OTP returns 401 Unauthorized', async () => {
  const reqRes = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });

  const { sessionId } = reqRes.body.data;

  const response = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({ aadhaarNumber: '999988881234', otp: '000000', sessionId });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'INVALID_OTP');
});

test('4. Expired OTP returns 401 Unauthorized', async () => {
  const reqRes = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });

  const { sessionId } = reqRes.body.data;

  await require('../src/config/database').pool.query(
    'UPDATE otp_verifications SET expires_at = ? WHERE session_id = ?',
    [new Date(Date.now() - 1000), sessionId],
  );

  const response = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({ aadhaarNumber: '999988881234', otp: '123456', sessionId });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'EXPIRED_OTP');
});

test('5. Officer valid login returns 200 with access token and OFFICER role', async () => {
  const response = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'OfficerPass123!' });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.user.external_reference, 'DEMO-OFFICER-001');
  assert.ok(response.body.data.accessToken);
});

test('6. Officer invalid password returns 401 Unauthorized', async () => {
  const response = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'WrongPassword!' });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});

test('7. Minister valid login returns 200 with access token and MINISTER role', async () => {
  const response = await request(app)
    .post('/api/auth/minister/login')
    .send({ username: 'DEMO-MINISTER-001', password: 'MinisterPass123!' });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.user.external_reference, 'DEMO-MINISTER-001');
  assert.ok(response.body.data.accessToken);
});

test('8. Invalid login with non-existent username returns 401 Unauthorized', async () => {
  const response = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'NON_EXISTENT_USER', password: 'Password123!' });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});

test('9. Missing token returns 401 Unauthorized when auth is enforced', async () => {
  await withEnforcedAuth(async () => {
    const response = await request(app).get('/api/auth/me');

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'MISSING_TOKEN');
  });
});

test('10. Invalid token returns 401 Unauthorized', async () => {
  await withEnforcedAuth(async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'INVALID_TOKEN');
  });
});

test('11. Citizen accessing officer review API returns 403 Forbidden', async () => {
  // Login as citizen
  const reqRes = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });
  const verifyRes = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({ aadhaarNumber: '999988881234', otp: testOtp, sessionId: reqRes.body.data.sessionId });

  const citizenToken = verifyRes.body.data.accessToken;

  await withEnforcedAuth(async () => {
    const response = await request(app)
      .get('/api/review/cases')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });
});

test('12. Officer accessing minister-only admin API returns 403 Forbidden', async () => {
  const loginRes = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'OfficerPass123!' });

  const officerToken = loginRes.body.data.accessToken;

  await withEnforcedAuth(async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${officerToken}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });
});

test('13. Minister accessing authorized admin API returns 200 OK', async () => {
  const loginRes = await request(app)
    .post('/api/auth/minister/login')
    .send({ username: 'DEMO-MINISTER-001', password: 'MinisterPass123!' });

  const ministerToken = loginRes.body.data.accessToken;

  await withEnforcedAuth(async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${ministerToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.system_status);
  });
});

test('14. Citizen can access their own uploaded document', async () => {
  const reqRes = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });
  const verifyRes = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({ aadhaarNumber: '999988881234', otp: testOtp, sessionId: reqRes.body.data.sessionId });
  const token = verifyRes.body.data.accessToken;
  const citizenId = verifyRes.body.data.user.id;

  // Create a document record owned by citizenId
  const pdfBuffer = Buffer.from(`%PDF-1.4\nCitizen doc ${Date.now()} ${Math.random()}`);
  const uploadRes = await request(app)
    .post('/api/documents/upload')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', pdfBuffer, { filename: `my-deed-${Date.now()}.pdf`, contentType: 'application/pdf' });

  const documentId = uploadRes.body.data.document_id;

  await withEnforcedAuth(async () => {
    const getRes = await request(app)
      .get(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.document_id, documentId);
  });
});

test("15. Citizen cannot access another citizen's document (returns 403 Forbidden)", async () => {
  const citizen1Request = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });
  const citizen1Login = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({ aadhaarNumber: '999988881234', otp: testOtp, sessionId: citizen1Request.body.data.sessionId });
  const token1 = citizen1Login.body.data.accessToken;
  const token2 = (await registerTestCitizen()).accessToken;

  // Citizen 1 uploads a document
  const pdfBuffer = Buffer.from(`%PDF-1.4\nCitizen 1 private doc ${Date.now()} ${Math.random()}`);
  const uploadRes = await request(app)
    .post('/api/documents/upload')
    .set('Authorization', `Bearer ${token1}`)
    .attach('file', pdfBuffer, { filename: `private-${Date.now()}.pdf`, contentType: 'application/pdf' });

  const docId = uploadRes.body.data.document_id;

  await withEnforcedAuth(async () => {
    // Citizen 2 tries to access Citizen 1's document
    const response = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${token2}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });
});

test('16. Officer can access authorized review case details', async () => {
  const loginRes = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'OfficerPass123!' });

  const token = loginRes.body.data.accessToken;

  await withEnforcedAuth(async () => {
    const listResponse = await request(app)
      .get('/api/review/cases')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(listResponse.status, 200, listResponse.text);
    const reviewCase = listResponse.body.data.cases[0];
    assert.ok(reviewCase?.case_id, 'Expected an available review case.');
    const response = await request(app)
      .get(`/api/review/cases/${reviewCase.case_id}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.case_id, reviewCase.case_id);
  });
});

test('17. Unauthorized review action (Citizen attempting review approve) is blocked (403)', async () => {
  const reqRes = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });
  const verifyRes = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({ aadhaarNumber: '999988881234', otp: testOtp, sessionId: reqRes.body.data.sessionId });
  const citizenToken = verifyRes.body.data.accessToken;

  await withEnforcedAuth(async () => {
    const response = await request(app)
      .post('/api/review/cases/CASE-TEST-001/approve')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });
});

test('18. Audit events are recorded for important auth events', async () => {
  const login = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'OfficerPass123!' });

  assert.equal(login.status, 200);
  const events = await pool.query(
    'SELECT event_type FROM audit_events WHERE actor_reference = ? AND event_type = ? ORDER BY created_at DESC LIMIT 1',
    [login.body.data.user.id, 'LOGIN_SUCCESS'],
  );
  assert.equal(events.rows[0]?.event_type, 'LOGIN_SUCCESS');
});

test('19. Password hash never appears in API login or user profile responses', async () => {
  const loginRes = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'OfficerPass123!' });

  assert.equal(loginRes.body.data.user.password_hash, undefined);

  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

  assert.equal(meRes.body.data.password_hash, undefined);
});

test('20. JWT token payload contains only minimal safe claims (no password, Aadhaar, or raw secrets)', async () => {
  const loginRes = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'OfficerPass123!' });

  const token = loginRes.body.data.accessToken;
  const decoded = jwt.decode(token);

  assert.ok(decoded.sub);
  assert.ok(decoded.user_id);
  assert.ok(decoded.role);
  assert.equal(decoded.password, undefined);
  assert.equal(decoded.password_hash, undefined);
  assert.equal(decoded.aadhaarNumber, undefined);
});

test('21. Citizen OTP request validation rejects invalid Aadhaar format with 400', async () => {
  const response = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '1234' });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'INVALID_AADHAAR');
});

test('22. Maximum OTP verification attempts triggers 401 MAX_OTP_ATTEMPTS_EXCEEDED', async () => {
  const reqRes = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });

  const { sessionId } = reqRes.body.data;

  // Attempt wrong OTP 3 times
  await request(app).post('/api/auth/citizen/otp/verify').send({ aadhaarNumber: '999988881234', otp: '000001', sessionId });
  await request(app).post('/api/auth/citizen/otp/verify').send({ aadhaarNumber: '999988881234', otp: '000002', sessionId });
  await request(app).post('/api/auth/citizen/otp/verify').send({ aadhaarNumber: '999988881234', otp: '000003', sessionId });

  // 4th attempt should throw max attempts exceeded
  const response = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({ aadhaarNumber: '999988881234', otp: '123456', sessionId });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'MAX_OTP_ATTEMPTS_EXCEEDED');
});

test('23. Citizen account cannot authenticate through officer login endpoint (403)', async () => {
  const username = `CITIZEN-WITH-PASS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  createdCitizenWithPasswordUsername = username;
  await userRepository.create({
    external_reference: username,
    name: 'Citizen With Password',
    password_hash: require('bcryptjs').hashSync('CitizenPass123!', 10),
    status: 'ACTIVE',
    roles: ['CITIZEN'],
  });

  const response = await request(app)
    .post('/api/auth/officer/login')
    .send({ username, password: 'CitizenPass123!' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('24. Citizen account cannot authenticate through minister login endpoint (403)', async () => {
  const response = await request(app)
    .post('/api/auth/minister/login')
    .send({ username: createdCitizenWithPasswordUsername, password: 'CitizenPass123!' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('25. Citizen attempting to access admin dashboard returns 403 Forbidden', async () => {
  const reqRes = await request(app).post('/api/auth/citizen/otp/request').send({ aadhaarNumber: '999988881234' });
  const verifyRes = await request(app).post('/api/auth/citizen/otp/verify').send({ aadhaarNumber: '999988881234', otp: testOtp, sessionId: reqRes.body.data.sessionId });
  const citizenToken = verifyRes.body.data.accessToken;

  await withEnforcedAuth(async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });
});

test('26. Citizen can retrieve own applications via GET /api/documents/applications/mine', async () => {
  const reqRes = await request(app).post('/api/auth/citizen/otp/request').send({ aadhaarNumber: '999988881234' });
  const verifyRes = await request(app).post('/api/auth/citizen/otp/verify').send({ aadhaarNumber: '999988881234', otp: testOtp, sessionId: reqRes.body.data.sessionId });
  const citizenToken = verifyRes.body.data.accessToken;

  await withEnforcedAuth(async () => {
    const response = await request(app)
      .get('/api/documents/applications/mine')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(Array.isArray(response.body.data.applications));
  });
});

test('27. POST /api/auth/logout succeeds and confirms logout', async () => {
  const loginRes = await request(app)
    .post('/api/auth/officer/login')
    .send({ username: 'DEMO-OFFICER-001', password: 'OfficerPass123!' });

  const token = loginRes.body.data.accessToken;

  const response = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.loggedOut, true);
});

test('28. Expired JWT token is rejected with 401 TOKEN_EXPIRED', async () => {
  const expiredToken = jwt.sign(
    { sub: 'usr-officer-001', user_id: 'usr-officer-001', role: 'OFFICER' },
    config.jwtSecret,
    { expiresIn: -10 }
  );

  await withEnforcedAuth(async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'TOKEN_EXPIRED');
  });
});

test('29. Inactive user account is rejected upon token verification', async () => {
  const externalReference = `SUSPENDED-USER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const suspendedUser = await userRepository.create({
    external_reference: externalReference,
    name: 'Suspended User',
    status: 'SUSPENDED',
    roles: ['CITIZEN'],
  });

  const token = jwt.sign(
    { sub: suspendedUser.id, user_id: suspendedUser.id, role: 'CITIZEN' },
    config.jwtSecret,
    { expiresIn: 3600 }
  );

  await withEnforcedAuth(async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'USER_SUSPENDED');
  });
});

test('30. Admin user login and access to admin dashboard returns 200 with dynamic stats', async () => {
  const loginRes = await request(app)
    .post('/api/auth/minister/login')
    .send({ username: 'DEMO-ADMIN-001', password: 'AdminPass123!' });

  assert.equal(loginRes.status, 200);
  const token = loginRes.body.data.accessToken;

  await withEnforcedAuth(async () => {
    const dashRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(dashRes.status, 200);
    assert.ok(typeof dashRes.body.data.total_users === 'number');
    assert.ok(typeof dashRes.body.data.citizens === 'number');
    assert.ok(typeof dashRes.body.data.officers === 'number');
  });
});

test('31. Aadhaar number is masked in responses and logs', async () => {
  const response = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '999988881234' });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.maskedAadhaar, 'XXXX-XXXX-1234');
  assert.equal(response.body.data.aadhaarNumber, undefined);
});

test('32. Rate limiting returns 429 TOO_MANY_REQUESTS when limit exceeded', async () => {
  const express = require('express');
  const { rateLimiter } = require('../src/middleware/rateLimiter');
  const errorHandler = require('../src/middleware/errorHandler');

  const testApp = express();
  const limiter = rateLimiter({ windowMs: 60000, maxRequests: 2 });

  testApp.post('/test-limit', (req, res, next) => {
    limiter(req, res, next);
  }, (req, res) => res.json({ success: true }));
  testApp.use(errorHandler);

  const prevEnv = process.env.ENABLE_RATE_LIMITER;
  process.env.ENABLE_RATE_LIMITER = 'true';
  try {
    const res1 = await request(testApp).post('/test-limit');
    const res2 = await request(testApp).post('/test-limit');
    const res3 = await request(testApp).post('/test-limit');

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.equal(res3.status, 429);
    assert.equal(res3.body.error.code, 'TOO_MANY_REQUESTS');
  } finally {
    if (prevEnv === undefined) delete process.env.ENABLE_RATE_LIMITER;
    else process.env.ENABLE_RATE_LIMITER = prevEnv;
  }
});

test('33. Citizen Registration validation fails on invalid Aadhaar (400)', async () => {
  const res = await request(app)
    .post('/api/auth/citizen/register')
    .send({
      aadhaarNumber: '1234',
      fullName: 'Test Citizen',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      taluk: 'Bengaluru South',
      village: 'Jayanagar',
      pincode: '560041',
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'INVALID_AADHAAR');
});

test('34. Citizen Registration validation fails on invalid pincode (400)', async () => {
  const res = await request(app)
    .post('/api/auth/citizen/register')
    .send({
      aadhaarNumber: '888877776666',
      fullName: 'Test Citizen',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      taluk: 'Bengaluru South',
      village: 'Jayanagar',
      pincode: '5600',
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'INVALID_PINCODE');
});

test('35. Citizen Registration validation fails on missing required fields (400)', async () => {
  const res = await request(app)
    .post('/api/auth/citizen/register')
    .send({
      aadhaarNumber: '888877776666',
      fullName: '',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      taluk: 'Bengaluru South',
      village: 'Jayanagar',
      pincode: '560041',
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'MISSING_FIELD');
});

test('36. Citizen Registration fails if identity is already registered (409)', async () => {
  const res = await request(app)
    .post('/api/auth/citizen/register')
    .send({
      aadhaarNumber: '999988881234', // Pre-seeded citizen identity
      fullName: 'Duplicate Citizen',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      taluk: 'Bengaluru South',
      village: 'Jayanagar',
      pincode: '560041',
    });

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'DUPLICATE_IDENTITY');
});

test('37. Complete Citizen Registration -> OTP Verification -> DB User Creation -> Login -> GET /api/auth/me', async () => {
  const randSuffix = String(Math.floor(1000 + Math.random() * 9000));
  const testAadhaar = `77776666${randSuffix}`;
  const maskedExpected = `XXXX-XXXX-${randSuffix}`;

  const regRes = await request(app)
    .post('/api/auth/citizen/register')
    .send({
      aadhaarNumber: testAadhaar,
      fullName: 'Ramesh Kumar',
      dateOfBirth: '1985-05-15',
      gender: 'Male',
      state: 'Tamil Nadu',
      district: 'Chennai',
      taluk: 'Egmore',
      village: 'Nungambakkam',
      pincode: '600034',
    });

  assert.equal(regRes.status, 200);
  assert.equal(regRes.body.success, true);
  assert.equal(regRes.body.data.maskedAadhaar, maskedExpected);
  assert.ok(regRes.body.data.sessionId);
  assert.equal(regRes.body.data.devOtp, undefined);

  const { sessionId } = regRes.body.data;

  // Verify OTP & create citizen in DB
  const verifyRes = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({ aadhaarNumber: testAadhaar, otp: testOtp, sessionId });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.success, true);
  assert.ok(verifyRes.body.data.accessToken);
  assert.equal(verifyRes.body.data.user.name, 'Ramesh Kumar');
  assert.equal(verifyRes.body.data.user.date_of_birth, '1985-05-15');
  assert.equal(verifyRes.body.data.user.gender, 'Male');
  assert.equal(verifyRes.body.data.user.state, 'Tamil Nadu');
  assert.equal(verifyRes.body.data.user.pincode, '600034');
  assert.equal(verifyRes.body.data.user.primary_role, 'CITIZEN');

  const token = verifyRes.body.data.accessToken;

  // Verify GET /api/auth/me
  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.data.name, 'Ramesh Kumar');
  assert.equal(meRes.body.data.state, 'Tamil Nadu');
  assert.equal(meRes.body.data.pincode, '600034');
  assert.equal(meRes.body.data.identity_verified, true);
  assert.equal(meRes.body.data.aadhaarNumber, undefined);
  assert.equal(meRes.body.data.password_hash, undefined);

  // Subsequent Login using registered Aadhaar should succeed
  const loginOtpReq = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: testAadhaar });

  assert.equal(loginOtpReq.status, 200);
  assert.equal(loginOtpReq.body.data.maskedAadhaar, maskedExpected);

  const loginVerify = await request(app)
    .post('/api/auth/citizen/otp/verify')
    .send({
      aadhaarNumber: testAadhaar,
      otp: testOtp,
      sessionId: loginOtpReq.body.data.sessionId,
    });

  assert.equal(loginVerify.status, 200);
  assert.equal(loginVerify.body.data.user.name, 'Ramesh Kumar');
});

test('38. Unregistered citizen login request returns 404 CITIZEN_NOT_FOUND', async () => {
  const res = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({ aadhaarNumber: '000000000000' });

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'CITIZEN_NOT_FOUND');
});
