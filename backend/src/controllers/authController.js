const { successResponse } = require('../utils/response');
const { authService } = require('../services/authService');
const { sessionService } = require('../services/sessionService');

function getClientContextId(req) {
  return req.headers['x-client-context-id'] || req.body?.clientContextId || req.headers['x-session-context'] || null;
}

async function requestCitizenOtp(req, res, next) {
  try {
    const { aadhaarNumber } = req.body || {};
    const result = await authService.requestCitizenOtp({ aadhaarNumber });
    return res.status(200).json(successResponse('OTP requested successfully.', result));
  } catch (error) {
    return next(error);
  }
}

async function verifyCitizenOtp(req, res, next) {
  try {
    const { aadhaarNumber, otp, sessionId } = req.body || {};
    const result = await authService.verifyCitizenOtp({ aadhaarNumber, otp, sessionId });
    const clientContextId = getClientContextId(req);
    if (clientContextId && result.accessToken) {
      sessionService.registerSession(clientContextId, {
        userId: result.user?.id,
        role: 'CITIZEN',
        token: result.accessToken,
      });
    }
    return res.status(200).json(successResponse('Citizen authenticated successfully.', result));
  } catch (error) {
    return next(error);
  }
}

async function officerLogin(req, res, next) {
  try {
    const username = req.body?.username || req.body?.identifier;
    const { password } = req.body || {};
    const result = await authService.loginOfficer({ username, password });
    const clientContextId = getClientContextId(req);
    if (clientContextId && result.accessToken) {
      sessionService.registerSession(clientContextId, {
        userId: result.user?.id,
        role: 'OFFICER',
        token: result.accessToken,
      });
    }
    return res.status(200).json({
      ...successResponse('Officer logged in successfully.', result),
      token: result.accessToken,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return next(error);
  }
}

async function ministerLogin(req, res, next) {
  try {
    const username = req.body?.username || req.body?.identifier;
    const { password } = req.body || {};
    const result = await authService.loginMinister({ username, password });
    const clientContextId = getClientContextId(req);
    if (clientContextId && result.accessToken) {
      sessionService.registerSession(clientContextId, {
        userId: result.user?.id,
        role: 'MINISTER',
        token: result.accessToken,
      });
    }
    return res.status(200).json({
      ...successResponse('Minister logged in successfully.', result),
      token: result.accessToken,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return res.status(200).json(successResponse('Current user profile retrieved.', user));
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const clientContextId = getClientContextId(req);
    if (clientContextId) {
      sessionService.invalidateSession(clientContextId);
    }
    return res.status(200).json(successResponse('Logged out successfully.', { loggedOut: true }));
  } catch (error) {
    return next(error);
  }
}

async function registerCitizen(req, res, next) {
  try {
    const { aadhaarNumber, fullName, dateOfBirth, gender, state, district, taluk, village, pincode } = req.body || {};
    const result = await authService.registerCitizen({
      aadhaarNumber,
      fullName,
      dateOfBirth,
      gender,
      state,
      district,
      taluk,
      village,
      pincode,
    });
    return res.status(200).json(successResponse('Citizen registration initiated. OTP sent.', result));
  } catch (error) {
    return next(error);
  }
}

async function stateAdminLogin(req, res, next) {
  try {
    const username = req.body?.username || req.body?.identifier;
    const { password } = req.body || {};
    const result = await authService.loginStateAdmin({ username, password });
    const clientContextId = getClientContextId(req);
    const token = result.accessToken || result.token;
    if (clientContextId && token) {
      sessionService.registerSession(clientContextId, {
        userId: result.user?.id,
        role: 'STATE_ADMIN',
        token,
      });
    }
    return res.status(200).json({
      ...successResponse('State Admin logged in successfully.', result),
      token: result.accessToken,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return next(error);
  }
}

async function superAdminLogin(req, res, next) {
  try {
    const username = req.body?.username || req.body?.identifier;
    const { password } = req.body || {};
    const result = await authService.loginSuperAdmin({ username, password });
    const clientContextId = getClientContextId(req);
    const token = result.accessToken || result.token;
    if (clientContextId && token) {
      sessionService.registerSession(clientContextId, {
        userId: result.user?.id,
        role: 'SUPER_ADMIN',
        token,
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Super Admin login successful',
      token: result.token,
      accessToken: result.accessToken,
      user: result.user,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerCitizen,
  requestCitizenOtp,
  verifyCitizenOtp,
  officerLogin,
  ministerLogin,
  stateAdminLogin,
  superAdminLogin,
  getMe,
  logout,
};
