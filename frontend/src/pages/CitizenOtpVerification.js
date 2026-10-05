import { renderLogin, attachLoginEvents, setLoginMode } from './Login.js';

export function renderCitizenOtpVerification() {
  setLoginMode('otp');
  return renderLogin();
}

export function attachCitizenOtpVerificationEvents() {
  attachLoginEvents();
}
