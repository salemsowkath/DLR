import { renderLogin, attachLoginEvents, setLoginMode } from './Login.js';

export function renderCitizenRegister() {
  setLoginMode('register');
  return renderLogin();
}

export function attachCitizenRegisterEvents() {
  attachLoginEvents();
}
