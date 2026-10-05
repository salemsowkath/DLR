const crypto = require('crypto');
const config = require('../config/env');

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
      // Clearly marked development OTP
      devOtp: config.nodeEnv !== 'production' ? otp : undefined,
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

const otpProvider = new MockOtpProvider();

module.exports = {
  MockOtpProvider,
  otpProvider,
  maskAadhaar,
};
