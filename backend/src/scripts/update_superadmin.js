const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { hashPassword, verifyPassword } = require('../services/passwordService');

async function updateSuperAdmin() {
  const newUsername = 'Dora027';
  const newPassword = 'DOra#027';
  const superAdminId = 'usr-superadmin-001';

  console.log('1. Checking uniqueness of username:', newUsername);
  const checkUnique = await pool.query(
    'SELECT id, username FROM users WHERE (username = ? OR external_reference = ?) AND id != ?',
    [newUsername, newUsername, superAdminId]
  );

  if (checkUnique.rows.length > 0) {
    throw new Error(`Username ${newUsername} is already taken by user ID ${checkUnique.rows[0].id}`);
  }
  console.log('   Username is unique!');

  console.log('2. Hashing new password with bcrypt (salt rounds = 10)...');
  const passwordHash = await hashPassword(newPassword);
  console.log('   Hash generated:', passwordHash.substring(0, 15) + '...');

  // Verify hash matches
  const matches = await verifyPassword(newPassword, passwordHash);
  if (!matches) {
    throw new Error('Self-check verification failed: hash does not match new password!');
  }
  console.log('   Self-check verification passed!');

  console.log('3. Updating existing SUPER_ADMIN in MySQL...');
  await pool.query(
    'UPDATE users SET username = ?, password_hash = ?, updated_at = NOW() WHERE id = ?',
    [newUsername, passwordHash, superAdminId]
  );

  // Check the updated user
  const userRes = await pool.query(`
    SELECT u.id, u.username, u.name, u.email, u.status, u.password_hash, GROUP_CONCAT(r.role_name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.id = ?
    GROUP BY u.id
  `, [superAdminId]);

  const updatedUser = userRes.rows[0];
  console.log('4. Verification from MySQL:');
  console.log('   ID:', updatedUser.id);
  console.log('   Username:', updatedUser.username);
  console.log('   Roles:', updatedUser.roles);
  console.log('   Status:', updatedUser.status);
  console.log('   Hash starts with bcrypt prefix:', updatedUser.password_hash.startsWith('$2'));
  console.log('   Hash is not plaintext:', updatedUser.password_hash !== newPassword);

  console.log('Successfully updated Super Admin account!');
  process.exit(0);
}

updateSuperAdmin().catch((err) => {
  console.error('Failed to update Super Admin:', err);
  process.exit(1);
});
