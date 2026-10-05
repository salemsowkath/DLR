const bcrypt = require('bcryptjs');

async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string.');
  }
  const saltRounds = 10;
  return bcrypt.hash(plainPassword, saltRounds);
}

async function verifyPassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) {
    return false;
  }
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
