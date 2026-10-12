import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';

let isLoading = false;
let errorMessage = '';

export function renderMinisterLogin() {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 0.4rem; font-weight: 700;">
            DLR Government Portal
          </div>
          <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">🏛️</div>
          <h1 style="font-size: 1.6rem; font-weight: 700; margin-bottom: 0.35rem;">Government Minister Sign In</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">State Revenue Administration & Land Governance Oversight</p>
        </div>

        ${errorMessage ? `<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;display:block;text-align:center;">⚠️ ${escapeHtml(errorMessage)}</div>` : ''}

        <form id="minister-login-form">
          <div class="form-group">
            <label class="form-label" for="minister-username-input">Minister Username</label>
            <input
              type="text"
              id="minister-username-input"
              class="form-control"
              autocomplete="username"
              placeholder="e.g. DEMO-MINISTER-001"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="minister-password-input">Password</label>
            <input
              type="password"
              id="minister-password-input"
              class="form-control"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary" id="minister-submit-btn" style="width:100%;font-size:1rem;padding:0.85rem;" ${isLoading ? 'disabled' : ''}>
            ${isLoading ? '<div class="spinner"></div> Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style="margin-top:1.25rem;text-align:center;font-size:0.88rem;">
          <span style="color:var(--text-muted);">Authorized Officer?</span>
          <a href="#" id="switch-to-officer-login" style="color:var(--primary);font-weight:600;text-decoration:none;margin-left:0.35rem;">Officer Sign In →</a>
        </div>

        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-color);display:flex;justify-content:center;">
          <a href="#" id="minister-back-to-portal" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
        </div>

        <div style="margin-top:1.25rem;padding-top:0.75rem;border-top:1px solid var(--border-color);text-align:center;font-size:0.78rem;color:var(--text-subtle);">
          Secured by JWT Bearer Token + RBAC · State Ministers only<br />
          Unauthorized access attempts are audited.
        </div>
      </div>
    </div>
  `;
}

export function attachMinisterLoginEvents() {
  document.getElementById('minister-back-to-portal')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorMessage = '';
    store.activeTab = 'portal';
    store.notify();
  });

  document.getElementById('switch-to-officer-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorMessage = '';
    store.activeTab = 'officer-login';
    store.notify();
  });

  document.getElementById('minister-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('minister-username-input')?.value || '').trim();
    const password = document.getElementById('minister-password-input')?.value || '';

    if (!username || !password) {
      errorMessage = 'Please enter your minister username and password.';
      store.notify();
      return;
    }

    isLoading = true;
    errorMessage = '';
    store.notify();

    try {
      const result = await api.ministerLogin({ username, password });
      if (!result?.user) throw new Error('Minister login response did not contain user data.');

      // Verify role client-side (backend enforces via RBAC)
      const role = String(result.user.role || result.user.primary_role || '').toUpperCase();
      if (!['MINISTER', 'ADMIN'].includes(role)) {
        throw new Error(`Access denied. This portal is for Ministers only. Your role is: ${role}`);
      }

      errorMessage = '';
      store.addToast('success', `Welcome, ${result.user.name || username}. Signed in to Minister Portal.`);
      await store.setAuthenticatedUser(result.user);
    } catch (error) {
      errorMessage = error.message || 'Minister sign in failed. Please check your credentials.';
    } finally {
      isLoading = false;
      store.notify();
    }
  });
}
