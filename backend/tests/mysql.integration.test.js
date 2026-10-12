const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const config = require('../src/config/env');

const mysqlConfigured = process.env.DLR_RUN_MYSQL_INTEGRATION === '1'
  && config.persistenceBackend === 'mysql'
  && config.mysql.host
  && config.mysql.database
  && config.mysql.user
  && config.mysql.password;

test('MySQL citizen registration and login persist the required records', { skip: !mysqlConfigured }, async () => {
  process.env.PERSISTENCE_BACKEND = 'mysql';
  const { pool } = require('../src/config/database');
  const { AuthService } = require('../src/services/authService');
  const { MySQLUserRepository } = require('../src/repositories/userRepository');
  const { MySQLAuditRepository } = require('../src/repositories/auditRepository');
  const { MySQLOtpProvider } = require('../src/services/otpProvider');

  const users = new MySQLUserRepository(pool);
  const audit = new MySQLAuditRepository(pool);
  const otps = new MySQLOtpProvider(pool);
  const auth = new AuthService({ users, audit, otps });
  let aadhaar;
  let externalReference;
  do {
    aadhaar = String(crypto.randomInt(0, 1_000_000_000_000)).padStart(12, '0');
    externalReference = `AADHAAR-XXXX-XXXX-${aadhaar.slice(-4)}`;
  } while (await users.findByExternalReference(externalReference));

  const registration = await auth.registerCitizen({
    aadhaarNumber: aadhaar,
    fullName: `MySQL Integration ${crypto.randomUUID()}`,
    dateOfBirth: '1995-11-20',
    gender: 'Female',
    state: 'Tamil Nadu',
    district: 'Salem',
    taluk: 'Attur',
    village: 'Attur Town',
    pincode: '636102',
  });
  assert.equal(registration.maskedAadhaar, `XXXX-XXXX-${aadhaar.slice(-4)}`);

  const verified = await auth.verifyCitizenOtp({
    aadhaarNumber: aadhaar,
    otp: require('../src/config/env').devOtp || '123456',
    sessionId: registration.sessionId,
  });
  assert.ok(verified.accessToken);
  assert.equal(verified.user.primary_role, 'CITIZEN');

  const duplicate = auth.registerCitizen({
    aadhaarNumber: aadhaar,
    fullName: 'Duplicate Citizen',
    dateOfBirth: '1995-11-20',
    gender: 'Female',
    state: 'Tamil Nadu',
    district: 'Salem',
    taluk: 'Attur',
    village: 'Attur Town',
    pincode: '636102',
  });
  await assert.rejects(duplicate, (error) => error.statusCode === 409 && error.code === 'DUPLICATE_IDENTITY');

  const [userRows] = await pool.rawPool.execute('SELECT id FROM users WHERE external_reference = ?', [externalReference]);
  assert.equal(userRows.length, 1);
  const userId = userRows[0].id;
  const [roleRows] = await pool.rawPool.execute(
    `SELECT r.role_name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?`,
    [userId],
  );
  assert.ok(roleRows.some((row) => row.role_name === 'CITIZEN'));
  const [identityRows] = await pool.rawPool.execute(
    'SELECT masked_reference, verification_status FROM identity_verifications WHERE user_id = ?',
    [userId],
  );
  assert.deepEqual(identityRows[0], {
    masked_reference: `XXXX-XXXX-${aadhaar.slice(-4)}`,
    verification_status: 'VERIFIED',
  });
  const [auditRows] = await pool.rawPool.execute(
    'SELECT COUNT(*) AS count FROM audit_events WHERE actor_reference = ?',
    [userId],
  );
  assert.ok(Number(auditRows[0].count) >= 2);
});
