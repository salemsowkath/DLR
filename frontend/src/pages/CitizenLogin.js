import { renderLogin, attachLoginEvents, setLoginMode } from './Login.js';

export function renderCitizenLogin() {
  setLoginMode('login');
  return renderLogin();
}

export function attachCitizenLoginEvents() {
  attachLoginEvents();
}
