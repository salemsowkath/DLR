const request = require('supertest');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { pool } = require('../config/database');

async function testCredentials() {
  console.log('=====================================================');
  console.log('VERIFYING UPDATED SUPER ADMIN CREDENTIALS');
  console.log('=====================================================\n');

  // 1. Verify Database State
  console.log('1. Checking MySQL database user records...');
  const saQuery = await pool.query(`
    SELECT u.id, u.username, u.name, u.email, u.status, u.password_hash, GROUP_CONCAT(r.role_name) as roles
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE r.role_name = 'SUPER_ADMIN'
    GROUP BY u.id
  `);

  assert.equal(saQuery.rows.length, 1, 'There must be exactly ONE SUPER_ADMIN account in the database');
  const dbUser = saQuery.rows[0];
  console.log('   Super Admin ID:', dbUser.id);
  console.log('   Username in MySQL:', dbUser.username);
  console.log('   Roles:', dbUser.roles);
  console.log('   Status:', dbUser.status);
  assert.equal(dbUser.username, 'Dora027');
  assert.equal(dbUser.roles, 'SUPER_ADMIN');
  assert.equal(dbUser.status, 'ACTIVE');

  // Verify hash is bcrypt and not plaintext
  assert.ok(dbUser.password_hash.startsWith('$2'), 'Password hash must start with bcrypt prefix ($2)');
  assert.notEqual(dbUser.password_hash, 'DOra#027', 'Password MUST NOT be stored in plaintext');
  assert.notEqual(dbUser.password_hash, 'SuperAdminPass123!', 'Old password hash must be gone');
  console.log('   Password hash verified as bcrypt ($2a/$2b standard hash)');
  console.log('   No plaintext stored in database.\n');

  // 2. Test Login with New Credentials
  console.log('2. Testing POST /api/auth/super-admin/login with new credentials (Dora027 / DOra#027)...');
  const newLoginRes = await request(app)
    .post('/api/auth/super-admin/login')
    .send({
      username: 'Dora027',
      password: 'DOra#027',
    });

  console.log('   Response Status:', newLoginRes.status);
  assert.equal(newLoginRes.status, 200, `Login failed: ${newLoginRes.text}`);
  assert.equal(newLoginRes.body.success, true);
  assert.ok(newLoginRes.body.token, 'Token must be returned');
  assert.equal(newLoginRes.body.user.username, 'Dora027');
  assert.equal(newLoginRes.body.user.role, 'SUPER_ADMIN');
  assert.equal(newLoginRes.body.user.password, undefined, 'Password MUST NOT be returned in API response');
  assert.equal(newLoginRes.body.data.password, undefined, 'Password MUST NOT be returned in API response data');

  const token = newLoginRes.body.token;
  const decoded = jwt.decode(token);
  console.log('   Decoded JWT sub:', decoded.sub);
  console.log('   Decoded JWT role:', decoded.role);
  assert.equal(decoded.role, 'SUPER_ADMIN');
  assert.equal(decoded.sub, dbUser.id);
  assert.equal(decoded.password, undefined, 'JWT MUST NOT contain password');
  console.log('   New login succeeded and returned valid JWT with SUPER_ADMIN role!\n');

  // 3. Test Old Credentials are Rejected
  console.log('3. Testing POST /api/auth/super-admin/login with old credentials (superadmin / SuperAdminPass123!)...');
  const oldLoginRes = await request(app)
    .post('/api/auth/super-admin/login')
    .send({
      username: 'superadmin',
      password: 'SuperAdminPass123!',
    });

  console.log('   Response Status for old credentials:', oldLoginRes.status);
  assert.equal(oldLoginRes.status, 401, 'Old credentials must be rejected with 401');
  assert.equal(oldLoginRes.body.success, false);
  console.log('   Old Super Admin credentials rejected with 401 Unauthorized!\n');

  // 4. Test wrong password for Dora027 is Rejected
  console.log('4. Testing POST /api/auth/super-admin/login with wrong password for Dora027...');
  const wrongPassRes = await request(app)
    .post('/api/auth/super-admin/login')
    .send({
      username: 'Dora027',
      password: 'WrongPassword!',
    });
  assert.equal(wrongPassRes.status, 401);
  console.log('   Wrong password for Dora027 rejected with 401 Unauthorized!\n');

  // 5. Test Access to Super Admin Dashboard API
  console.log('5. Testing GET /api/super-admin/dashboard using new Super Admin token...');
  const dashRes = await request(app)
    .get('/api/super-admin/dashboard')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(dashRes.status, 200);
  assert.equal(dashRes.body.success, true);
  console.log('   Super Admin dashboard API returned 200 with dynamic metrics.\n');

  // 6. Test Officer, Minister, and Citizen are Unaffected
  console.log('6. Verifying Officer, Minister, and Citizen accounts remain unaffected...');
  
  // Officer login
  const officerLogin = await request(app)
    .post('/api/auth/officer/login')
    .send({
      username: 'DEMO-OFFICER-001',
      password: 'OfficerPass123!',
    });
  assert.equal(officerLogin.status, 200, 'Officer login must work');
  assert.ok(officerLogin.body.token);
  console.log('   Officer account: OK (200)');

  // Minister login
  const ministerLogin = await request(app)
    .post('/api/auth/minister/login')
    .send({
      username: 'DEMO-MINISTER-001',
      password: 'MinisterPass123!',
    });
  assert.equal(ministerLogin.status, 200, 'Minister login must work');
  assert.ok(ministerLogin.body.token);
  console.log('   Minister account: OK (200)');

  // Citizen OTP request
  const citizenOtp = await request(app)
    .post('/api/auth/citizen/otp/request')
    .send({
      aadhaarNumber: '999988881234',
    });
  assert.equal(citizenOtp.status, 200, 'Citizen OTP request must work');
  console.log('   Citizen account: OK (200)\n');

  console.log('=====================================================');
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('=====================================================');
  process.exit(0);
}

testCredentials().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
