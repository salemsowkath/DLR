const crypto = require('crypto');
const config = require('../config/env');
const { pool } = require('../config/database');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function maskAadhaar(aadhaarNumber) {
  if (!aadhaarNumber || typeof aadhaarNumber !== 'string') {
    return 'XXXX-XXXX-0000';
  }
  const clean = aadhaarNumber.replace(/[\s-]/g, '');
  if (clean.length < 4) {
    return 'XXXX-XXXX-0000';
  }
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

class MockOtpProvider {
  constructor({ ttlMs = 5 * 60 * 1000, maxAttempts = 3 } = {}) {
    this.ttlMs = ttlMs;
    this.maxAttempts = maxAttempts;
    this.sessions = new Map();
  }

  async requestOtp({ identifier, registrationData = null }) {
    if (!identifier) {
      throw createAppError(400, 'INVALID_IDENTIFIER', 'Identity reference is required for OTP request.');
    }

    const maskedRef = maskAadhaar(identifier);
    const sessionId = `OTP-${crypto.randomUUID()}`;
    const otp = config.devOtp || '123456';
    const expiresAt = Date.now() + this.ttlMs;

    const sessionData = {
      sessionId,
      maskedRef,
      otp,
      expiresAt,
      attempts: 0,
      verified: false,
      registrationData,
    };

    this.sessions.set(sessionId, sessionData);

    return {
      success: true,
      sessionId,
      maskedRef,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  async verifyOtp({ sessionId, otp }) {
    if (!sessionId || !otp) {
      throw createAppError(400, 'INVALID_OTP_REQUEST', 'Session ID and OTP code are required.');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw createAppError(401, 'INVALID_OTP_SESSION', 'Invalid or expired OTP session.');
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      throw createAppError(401, 'EXPIRED_OTP', 'The OTP code has expired. Please request a new OTP.');
    }

    if (session.attempts >= this.maxAttempts) {
      this.sessions.delete(sessionId);
      throw createAppError(401, 'MAX_OTP_ATTEMPTS_EXCEEDED', 'Maximum OTP verification attempts exceeded.');
    }

    session.attempts += 1;

    if (session.otp !== String(otp).trim()) {
      throw createAppError(401, 'INVALID_OTP', 'The OTP code provided is incorrect.');
    }

    session.verified = true;
    const registrationData = session.registrationData || null;
    this.sessions.delete(sessionId);

    return {
      success: true,
      sessionId,
      maskedRef: session.maskedRef,
      registrationData,
    };
  }

  clear() {
    this.sessions.clear();
  }
}

class MySQLOtpProvider {
  constructor(databasePool, { ttlMs = 5 * 60 * 1000, maxAttempts = 3 } = {}) {
    this.pool = databasePool;
    this.ttlMs = ttlMs;
    this.maxAttempts = maxAttempts;
  }

  async requestOtp({ identifier, registrationData = null }) {
    if (!identifier) {
      throw createAppError(400, 'INVALID_IDENTIFIER', 'Identity reference is required for OTP request.');
    }
    const maskedRef = maskAadhaar(identifier);
    const sessionId = `OTP-${crypto.randomUUID()}`;
    const otp = config.devOtp || '123456';
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.pool.query(
      `INSERT INTO otp_verifications
        (session_id, masked_reference, otp_code, attempts, max_attempts, verified, registration_data, expires_at)
       VALUES (?, ?, ?, 0, ?, FALSE, ?, ?)`,
      [sessionId, maskedRef, otp, this.maxAttempts, registrationData ? JSON.stringify(registrationData) : null, expiresAt],
    );
    return {
      success: true,
      sessionId,
      maskedRef,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async verifyOtp({ sessionId, otp }) {
    if (!sessionId || !otp) {
      throw createAppError(400, 'INVALID_OTP_REQUEST', 'Session ID and OTP code are required.');
    }
    const result = await this.pool.query(
      'SELECT * FROM otp_verifications WHERE session_id = ? AND verified = FALSE',
      [sessionId],
    );
    const session = result.rows[0];
    if (!session) throw createAppError(401, 'INVALID_OTP_SESSION', 'Invalid or expired OTP session.');
    if (new Date(session.expires_at).getTime() < Date.now()) {
      await this.pool.query('DELETE FROM otp_verifications WHERE session_id = ?', [sessionId]);
      throw createAppError(401, 'EXPIRED_OTP', 'The OTP code has expired. Please request a new OTP.');
    }
    if (session.attempts >= session.max_attempts) {
      await this.pool.query('DELETE FROM otp_verifications WHERE session_id = ?', [sessionId]);
      throw createAppError(401, 'MAX_OTP_ATTEMPTS_EXCEEDED', 'Maximum OTP verification attempts exceeded.');
    }
    await this.pool.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE session_id = ?', [sessionId]);
    if (String(session.otp_code) !== String(otp).trim()) {
      throw createAppError(401, 'INVALID_OTP', 'The OTP code provided is incorrect.');
    }
    await this.pool.query('UPDATE otp_verifications SET verified = TRUE, verified_at = NOW(6) WHERE session_id = ?', [sessionId]);
    let registrationData = session.registration_data;
    if (typeof registrationData === 'string') registrationData = JSON.parse(registrationData);
    return { success: true, sessionId, maskedRef: session.masked_reference, registrationData: registrationData || null };
  }

  async clear() {
    await this.pool.query('DELETE FROM otp_verifications');
  }
}

const otpProvider = new MySQLOtpProvider(pool);

module.exports = {
  MockOtpProvider,
  MySQLOtpProvider,
  otpProvider,
  maskAadhaar,
};
