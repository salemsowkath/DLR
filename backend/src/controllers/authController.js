const { successResponse } = require('../utils/response');
const { authService } = require('../services/authService');

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
    return res.status(200).json(successResponse('Citizen authenticated successfully.', result));
  } catch (error) {
    return next(error);
  }
}

async function officerLogin(req, res, next) {
  try {
    const { username, password } = req.body || {};
    const result = await authService.loginOfficer({ username, password });
    return res.status(200).json(successResponse('Officer logged in successfully.', result));
  } catch (error) {
    return next(error);
  }
}

async function ministerLogin(req, res, next) {
  try {
    const { username, password } = req.body || {};
    const result = await authService.loginMinister({ username, password });
    return res.status(200).json(successResponse('Minister logged in successfully.', result));
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

module.exports = {
  registerCitizen,
  requestCitizenOtp,
  verifyCitizenOtp,
  officerLogin,
  ministerLogin,
  getMe,
  logout,
};
