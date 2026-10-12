const crypto = require('crypto');
const { pool } = require('../config/database');

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

class InMemoryVerificationOtpRepository {
  constructor({ ttlMs = 10 * 60 * 1000, maxAttempts = 3 } = {}) {
    this.ttlMs = ttlMs;
    this.maxAttempts = maxAttempts;
    this.otps = new Map(); // sessionId -> item
  }

  async createOtp({ sessionId, caseId, citizenId, otp = null }) {
    const code = otp || String(crypto.randomInt(100000, 999999));
    const otpHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + this.ttlMs).toISOString();
    const id = crypto.randomUUID();

    const item = {
      id,
      session_id: sessionId,
      case_id: caseId,
      citizen_id: citizenId,
      otp_hash: otpHash,
      attempts: 0,
      max_attempts: this.maxAttempts,
      verified: 0,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };
    this.otps.set(sessionId, item);

    return {
      id,
      sessionId,
      expiresAt,
      otp: code, // returned only to notification dispatcher, never stored
    };
  }

  async verifyOtp({ sessionId, otp }) {
    const item = this.otps.get(sessionId);
    if (!item) {
      const err = new Error('No active verification OTP found for this session.');
      err.statusCode = 404;
      err.code = 'OTP_SESSION_NOT_FOUND';
      throw err;
    }

    if (item.verified) {
      const err = new Error('This verification OTP has already been used.');
      err.statusCode = 409;
      err.code = 'OTP_ALREADY_VERIFIED';
      throw err;
    }

    if (new Date() > new Date(item.expires_at)) {
      const err = new Error('Verification OTP has expired. Please request a new OTP.');
      err.statusCode = 400;
      err.code = 'OTP_EXPIRED';
      throw err;
    }

    if (item.attempts >= item.max_attempts) {
      const err = new Error('Maximum verification attempts exceeded. Please request a new OTP.');
      err.statusCode = 429;
      err.code = 'MAX_ATTEMPTS_EXCEEDED';
      throw err;
    }

    const providedHash = hashOtp(otp);
    if (providedHash !== item.otp_hash) {
      item.attempts += 1;
      const remaining = item.max_attempts - item.attempts;
      const err = new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`);
      err.statusCode = 400;
      err.code = 'INVALID_OTP';
      err.remainingAttempts = remaining;
      throw err;
    }

    item.verified = 1;
    item.verified_at = new Date().toISOString();
    return {
      success: true,
      verified: true,
      sessionId,
    };
  }
}

class MySQLVerificationOtpRepository {
  constructor(databasePool, { ttlMs = 10 * 60 * 1000, maxAttempts = 3 } = {}) {
    this.pool = databasePool;
    this.ttlMs = ttlMs;
    this.maxAttempts = maxAttempts;
  }

  async createOtp({ sessionId, caseId, citizenId, otp = null }) {
    const code = otp || String(crypto.randomInt(100000, 999999));
    const otpHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + this.ttlMs);
    const id = crypto.randomUUID();

    // Invalidate previous OTPs for this session
    await this.pool.query(
      'DELETE FROM verification_otps WHERE session_id = ?',
      [sessionId]
    );

    const query = `
      INSERT INTO verification_otps (
        id, session_id, case_id, citizen_id,
        otp_hash, attempts, max_attempts, verified,
        expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, NOW(6))
    `;
    await this.pool.query(query, [
      id, sessionId, caseId, citizenId,
      otpHash, this.maxAttempts, expiresAt,
    ]);

    return {
      id,
      sessionId,
      expiresAt: expiresAt.toISOString(),
      otp: code, // returned solely for immediate secure dispatch, NEVER stored in plaintext
    };
  }

  async verifyOtp({ sessionId, otp }) {
    if (!otp || !String(otp).trim()) {
      const err = new Error('6-digit OTP code is required.');
      err.statusCode = 400;
      err.code = 'INVALID_OTP_INPUT';
      throw err;
    }

    const query = `
      SELECT id, session_id, case_id, citizen_id, otp_hash, attempts, max_attempts, verified, expires_at
      FROM verification_otps
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const res = await this.pool.query(query, [sessionId]);
    const row = res.rows[0];

    if (!row) {
      const err = new Error('No active verification OTP found for this session.');
      err.statusCode = 404;
      err.code = 'OTP_SESSION_NOT_FOUND';
      throw err;
    }

    if (row.verified) {
      const err = new Error('This verification OTP has already been verified.');
      err.statusCode = 409;
      err.code = 'OTP_ALREADY_VERIFIED';
      throw err;
    }

    const now = new Date();
    const expiry = new Date(row.expires_at);
    if (now > expiry) {
      const err = new Error('Verification OTP has expired. Please request a new OTP.');
      err.statusCode = 400;
      err.code = 'OTP_EXPIRED';
      throw err;
    }

    if (row.attempts >= row.max_attempts) {
      const err = new Error('Maximum verification attempts exceeded. Please request a new OTP.');
      err.statusCode = 429;
      err.code = 'MAX_ATTEMPTS_EXCEEDED';
      throw err;
    }

    const providedHash = hashOtp(otp);
    if (providedHash !== row.otp_hash) {
      const newAttempts = row.attempts + 1;
      await this.pool.query(
        'UPDATE verification_otps SET attempts = ? WHERE id = ?',
        [newAttempts, row.id]
      );
      const remaining = Math.max(0, row.max_attempts - newAttempts);
      const err = new Error(
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt(s) remaining.`
          : 'Maximum verification attempts exceeded. Please request a new OTP.'
      );
      err.statusCode = remaining > 0 ? 400 : 429;
      err.code = remaining > 0 ? 'INVALID_OTP' : 'MAX_ATTEMPTS_EXCEEDED';
      err.remainingAttempts = remaining;
      throw err;
    }

    await this.pool.query(
      'UPDATE verification_otps SET verified = 1, verified_at = NOW(6) WHERE id = ?',
      [row.id]
    );

    return {
      success: true,
      verified: true,
      sessionId,
      caseId: row.case_id,
      citizenId: row.citizen_id,
    };
  }
}

const verificationOtpRepository = new MySQLVerificationOtpRepository(pool);

module.exports = {
  InMemoryVerificationOtpRepository,
  MySQLVerificationOtpRepository,
  verificationOtpRepository,
  hashOtp,
};
