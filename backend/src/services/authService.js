const { userRepository } = require('../repositories/userRepository');
const { auditRepository } = require('../repositories/auditRepository');
const { otpProvider, maskAadhaar } = require('./otpProvider');
const { verifyPassword } = require('./passwordService');
const { signToken } = require('./jwtService');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

class AuthService {
  constructor({ users = userRepository, audit = auditRepository, otps = otpProvider } = {}) {
    this.users = users;
    this.audit = audit;
    this.otps = otps;
  }

  async registerCitizen({ aadhaarNumber, fullName, dateOfBirth, gender, state, district, taluk, village, pincode }) {
    if (!aadhaarNumber || typeof aadhaarNumber !== 'string') {
      throw createAppError(400, 'INVALID_AADHAAR', 'A valid 12-digit Aadhaar number is required.');
    }

    const clean = aadhaarNumber.replace(/[\s-]/g, '');
    if (clean.length !== 12 || !/^\d{12}$/.test(clean)) {
      throw createAppError(400, 'INVALID_AADHAAR', 'Aadhaar number must contain exactly 12 numeric digits.');
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      throw createAppError(400, 'MISSING_FIELD', 'Full name is required.');
    }
    if (fullName.trim().length > 150) {
      throw createAppError(400, 'INVALID_FIELD', 'Full name exceeds maximum allowed length.');
    }
    if (!dateOfBirth || typeof dateOfBirth !== 'string' || dateOfBirth.trim().length === 0) {
      throw createAppError(400, 'MISSING_FIELD', 'Date of birth is required.');
    }
    if (!gender || typeof gender !== 'string' || gender.trim().length === 0) {
      throw createAppError(400, 'MISSING_FIELD', 'Gender is required.');
    }
    const validGenders = ['male', 'female', 'other', 'prefer not to say'];
    if (!validGenders.includes(gender.trim().toLowerCase())) {
      throw createAppError(400, 'INVALID_GENDER', 'Gender must be Male, Female, Other, or Prefer not to say.');
    }
    if (!state || typeof state !== 'string' || state.trim().length === 0) {
      throw createAppError(400, 'MISSING_FIELD', 'State is required.');
    }
    if (!district || typeof district !== 'string' || district.trim().length === 0) {
      throw createAppError(400, 'MISSING_FIELD', 'District is required.');
    }
    if (!taluk || typeof taluk !== 'string' || taluk.trim().length === 0) {
      throw createAppError(400, 'MISSING_FIELD', 'Taluk is required.');
    }
    if (!village || typeof village !== 'string' || village.trim().length === 0) {
      throw createAppError(400, 'MISSING_FIELD', 'Village is required.');
    }
    if (!pincode || typeof pincode !== 'string' || !/^\d{6}$/.test(pincode.trim())) {
      throw createAppError(400, 'INVALID_PINCODE', 'Pincode must contain exactly 6 numeric digits.');
    }

    const maskedRef = maskAadhaar(clean);
    const externalRef = `AADHAAR-${maskedRef}`;

    const existingUser = await this.users.findByExternalReference(externalRef);
    if (existingUser) {
      throw createAppError(409, 'DUPLICATE_IDENTITY', 'This identity is already registered. Please use Citizen Login.');
    }

    const registrationData = {
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth.trim(),
      gender: gender.trim(),
      state: state.trim(),
      district: district.trim(),
      taluk: taluk.trim(),
      village: village.trim(),
      pincode: pincode.trim(),
    };

    const otpResult = await this.otps.requestOtp({ identifier: clean, registrationData });

    await this.audit.logAuditEvent({
      eventType: 'CITIZEN_REGISTRATION_STARTED',
      actorType: 'CITIZEN',
      actorReference: maskedRef,
      metadata: { maskedAadhaar: maskedRef },
    });

    await this.audit.logAuditEvent({
      eventType: 'CITIZEN_OTP_REQUESTED',
      actorType: 'CITIZEN',
      actorReference: maskedRef,
      metadata: { maskedAadhaar: maskedRef },
    });

    return {
      success: true,
      message: 'OTP has been requested successfully for registration.',
      maskedAadhaar: maskedRef,
      sessionId: otpResult.sessionId,
      expiresAt: otpResult.expiresAt,
    };
  }

  async requestCitizenOtp({ aadhaarNumber }) {
    if (!aadhaarNumber || typeof aadhaarNumber !== 'string') {
      throw createAppError(400, 'INVALID_AADHAAR', 'A valid 12-digit Aadhaar number is required.');
    }

    const clean = aadhaarNumber.replace(/[\s-]/g, '');
    if (clean.length !== 12 || !/^\d{12}$/.test(clean)) {
      throw createAppError(400, 'INVALID_AADHAAR', 'Aadhaar number must contain exactly 12 numeric digits.');
    }

    const maskedRef = maskAadhaar(clean);
    const externalRef = `AADHAAR-${maskedRef}`;

    const existingUser = await this.users.findByExternalReference(externalRef);
    if (!existingUser) {
      throw createAppError(404, 'CITIZEN_NOT_FOUND', 'Citizen account not found. Please register first.');
    }

    const otpResult = await this.otps.requestOtp({ identifier: clean });

    await this.audit.logAuditEvent({
      eventType: 'OTP_REQUESTED',
      actorType: 'CITIZEN',
      actorReference: maskedRef,
      metadata: { maskedAadhaar: maskedRef },
    });

    return {
      success: true,
      message: 'OTP has been requested successfully.',
      maskedAadhaar: maskedRef,
      sessionId: otpResult.sessionId,
      expiresAt: otpResult.expiresAt,
    };
  }

  async verifyCitizenOtp({ aadhaarNumber, otp, sessionId }) {
    if (!aadhaarNumber || !otp || !sessionId) {
      throw createAppError(400, 'INVALID_REQUEST', 'Aadhaar number, OTP code, and session ID are required.');
    }

    const clean = aadhaarNumber.replace(/[\s-]/g, '');
    const maskedRef = maskAadhaar(clean);

    const otpResult = await this.otps.verifyOtp({ sessionId, otp });

    const externalRef = `AADHAAR-${maskedRef}`;
    let user;

    if (otpResult.registrationData) {
      // Registration verification
      user = await this.users.createCitizenWithIdentity({
        externalReference: externalRef,
        fullName: otpResult.registrationData.fullName,
        dateOfBirth: otpResult.registrationData.dateOfBirth,
        gender: otpResult.registrationData.gender,
        state: otpResult.registrationData.state,
        district: otpResult.registrationData.district,
        taluk: otpResult.registrationData.taluk,
        village: otpResult.registrationData.village,
        pincode: otpResult.registrationData.pincode,
        maskedAadhaar: maskedRef,
      });

      await this.audit.logAuditEvent({
        eventType: 'CITIZEN_OTP_VERIFIED',
        actorType: 'CITIZEN',
        actorReference: user.id,
        metadata: { maskedAadhaar: maskedRef },
      });

      await this.audit.logAuditEvent({
        eventType: 'CITIZEN_REGISTERED',
        actorType: 'CITIZEN',
        actorReference: user.id,
        metadata: { maskedAadhaar: maskedRef },
      });
    } else {
      // Login verification
      user = await this.users.findByExternalReference(externalRef);
      if (!user) {
        throw createAppError(404, 'CITIZEN_NOT_FOUND', 'Citizen account not found. Please register first.');
      }

      await this.audit.logAuditEvent({
        eventType: 'OTP_VERIFIED',
        actorType: 'CITIZEN',
        actorReference: user.id,
        metadata: { maskedAadhaar: maskedRef },
      });

      await this.audit.logAuditEvent({
        eventType: 'LOGIN_SUCCESS',
        actorType: 'CITIZEN',
        actorReference: user.id,
        metadata: { maskedAadhaar: maskedRef },
      });
    }

    const accessToken = signToken(user);

    return {
      success: true,
      user: user.toPublicJSON(),
      accessToken,
      expiresIn: 3600,
    };
  }

  async loginOfficer({ username, identifier, password }) {
    const loginUser = username || identifier;
    if (!loginUser || !password) {
      throw createAppError(400, 'MISSING_CREDENTIALS', 'Username and password are required.');
    }

    const user = await this.users.findByUsername(loginUser);

    if (!user || user.status !== 'ACTIVE' || !user.password_hash) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'OFFICER',
        actorReference: String(loginUser),
        metadata: { reason: 'User not found or inactive' },
      });
      throw createAppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'OFFICER',
        actorReference: user.id,
        metadata: { reason: 'Invalid password' },
      });
      throw createAppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    const isOfficer = roles.some((r) => r === 'OFFICER' || r === 'GOVERNMENT_OFFICER');

    if (!isOfficer) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'OFFICER',
        actorReference: user.id,
        metadata: { reason: 'User lacks OFFICER role' },
      });
      throw createAppError(403, 'FORBIDDEN', 'User is not authorized for Officer role.');
    }

    const accessToken = signToken(user);

    await this.audit.logAuditEvent({
      eventType: 'LOGIN_SUCCESS',
      actorType: 'OFFICER',
      actorReference: user.id,
      metadata: { role: 'OFFICER' },
    });

    return {
      success: true,
      user: user.toPublicJSON(),
      accessToken,
      expiresIn: 3600,
    };
  }

  async loginMinister({ username, identifier, password }) {
    const loginUser = username || identifier;
    if (!loginUser || !password) {
      throw createAppError(400, 'MISSING_CREDENTIALS', 'Username and password are required.');
    }

    const user = await this.users.findByUsername(loginUser);

    if (!user || user.status !== 'ACTIVE' || !user.password_hash) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'MINISTER',
        actorReference: String(loginUser),
        metadata: { reason: 'User not found or inactive' },
      });
      throw createAppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'MINISTER',
        actorReference: user.id,
        metadata: { reason: 'Invalid password' },
      });
      throw createAppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    const isMinister = roles.some((r) => r === 'MINISTER' || r === 'ADMIN');

    if (!isMinister) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'MINISTER',
        actorReference: user.id,
        metadata: { reason: 'User lacks MINISTER role' },
      });
      throw createAppError(403, 'FORBIDDEN', 'User is not authorized for Minister role.');
    }

    const accessToken = signToken(user);

    await this.audit.logAuditEvent({
      eventType: 'LOGIN_SUCCESS',
      actorType: 'MINISTER',
      actorReference: user.id,
      metadata: { role: 'MINISTER' },
    });

    return {
      success: true,
      user: user.toPublicJSON(),
      accessToken,
      expiresIn: 3600,
    };
  }

  async loginStateAdmin({ username, identifier, password }) {
    const loginUser = username || identifier;
    if (!loginUser || !password) {
      throw createAppError(400, 'MISSING_CREDENTIALS', 'Username and password are required.');
    }

    const user = await this.users.findByUsername(loginUser);

    if (!user || user.status !== 'ACTIVE' || !user.password_hash) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'STATE_ADMIN',
        actorReference: String(loginUser),
        metadata: { reason: 'User not found or inactive' },
      });
      throw createAppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'STATE_ADMIN',
        actorReference: user.id,
        metadata: { reason: 'Invalid password' },
      });
      throw createAppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    const isStateAdmin = roles.some((r) => String(r).toUpperCase() === 'STATE_ADMIN');

    if (!isStateAdmin) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'STATE_ADMIN',
        actorReference: user.id,
        metadata: { reason: 'User lacks STATE_ADMIN role' },
      });
      throw createAppError(403, 'FORBIDDEN', 'User is not authorized for State Admin role.');
    }

    if (!user.state && !user.state_id) {
      throw createAppError(500, 'MISSING_JURISDICTION', 'State Admin has no assigned state.');
    }

    const accessToken = signToken(user);

    await this.audit.logAuditEvent({
      eventType: 'LOGIN_SUCCESS',
      actorType: 'STATE_ADMIN',
      actorReference: user.id,
      metadata: { role: 'STATE_ADMIN', username: user.username, state: user.state },
    });

    return {
      success: true,
      message: 'State Admin login successful',
      token: accessToken,
      accessToken,
      user: user.toPublicJSON(),
      expiresIn: 3600,
    };
  }

  async loginSuperAdmin({ username, identifier, password }) {
    const loginUser = username || identifier;
    if (!loginUser || !password) {
      throw createAppError(400, 'MISSING_CREDENTIALS', 'Username and password are required.');
    }

    const user = await this.users.findByUsername(loginUser);

    if (!user || user.status !== 'ACTIVE' || !user.password_hash) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'SUPER_ADMIN',
        actorReference: String(loginUser),
        metadata: { reason: 'User not found or inactive' },
      });
      throw createAppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'SUPER_ADMIN',
        actorReference: user.id,
        metadata: { reason: 'Invalid password' },
      });
      throw createAppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    const isSuperAdmin = roles.some((r) => String(r).toUpperCase() === 'SUPER_ADMIN');

    if (!isSuperAdmin) {
      await this.audit.logAuditEvent({
        eventType: 'LOGIN_FAILED',
        actorType: 'SUPER_ADMIN',
        actorReference: user.id,
        metadata: { reason: 'User lacks SUPER_ADMIN role' },
      });
      throw createAppError(403, 'FORBIDDEN', 'User is not authorized for Super Admin role.');
    }

    const accessToken = signToken(user);

    await this.audit.logAuditEvent({
      eventType: 'SUPER_ADMIN_LOGIN',
      actorType: 'SUPER_ADMIN',
      actorReference: user.id,
      metadata: { role: 'SUPER_ADMIN', username: user.username },
    });

    return {
      success: true,
      message: 'Super Admin login successful',
      token: accessToken,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username || user.external_reference,
        role: 'SUPER_ADMIN',
        roles: user.roles,
      },
      expiresIn: 3600,
    };
  }

  async getCurrentUser(userId) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw createAppError(404, 'USER_NOT_FOUND', 'User was not found.');
    }
    return user.toPublicJSON();
  }
}

const authService = new AuthService();

module.exports = {
  AuthService,
  authService,
};
