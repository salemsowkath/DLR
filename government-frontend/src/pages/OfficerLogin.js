import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';

let isLoading = false;
let errorMessage = '';

export function renderOfficerLogin() {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">👮</div>
          <h1>Government Officer Sign In</h1>
          <p>DLR Officer Review Console — Authorized Personnel Only</p>
        </div>

        ${errorMessage ? `<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${escapeHtml(errorMessage)}</div>` : ''}

        <form id="officer-login-form">
          <div class="form-group">
            <label class="form-label" for="officer-username-input">Officer Username</label>
            <input
              type="text"
              id="officer-username-input"
              class="form-control"
              autocomplete="username"
              placeholder="e.g. DEMO-OFFICER-001"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="officer-password-input">Password</label>
            <input
              type="password"
              id="officer-password-input"
              class="form-control"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary" id="officer-submit-btn" style="width:100%;font-size:1rem;padding:0.85rem;" ${isLoading ? 'disabled' : ''}>
            ${isLoading ? '<div class="spinner"></div> Signing in...' : 'Sign in to Officer Console →'}
          </button>
        </form>

        <div style="margin-top:1.25rem;text-align:center;font-size:0.88rem;">
          <span style="color:var(--text-muted);">Honorable Minister?</span>
          <a href="#" id="switch-to-minister-login" style="color:#a855f7;font-weight:600;text-decoration:none;margin-left:0.35rem;">Minister Sign In →</a>
        </div>

        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-color);display:flex;justify-content:center;">
          <a href="#" id="officer-back-to-portal" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
        </div>

        <div style="margin-top:1.25rem;padding-top:0.75rem;border-top:1px solid var(--border-color);text-align:center;font-size:0.78rem;color:var(--text-subtle);">
          Secured by JWT Bearer Token + RBAC · Officers only<br/>
          Unauthorized access attempts are logged and audited.
        </div>
      </div>
    </div>
  `;
}

export function attachOfficerLoginEvents() {
  document.getElementById('officer-back-to-portal')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorMessage = '';
    store.activeTab = 'portal';
    store.notify();
  });

  document.getElementById('switch-to-minister-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorMessage = '';
    store.activeTab = 'minister-login';
    store.notify();
  });

  document.getElementById('officer-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('officer-username-input')?.value || '').trim();
    const password = document.getElementById('officer-password-input')?.value || '';

    if (!username || !password) {
      errorMessage = 'Please enter your officer username and password.';
      store.notify();
      return;
    }

    isLoading = true;
    errorMessage = '';
    store.notify();

    try {
      const result = await api.officerLogin({ username, password });
      if (!result?.user) throw new Error('Officer login response did not contain user data.');

      // Verify role on client side (backend already enforces this via RBAC)
      const role = String(result.user.role || result.user.primary_role || '').toUpperCase();
      if (!['OFFICER', 'GOVERNMENT_OFFICER'].includes(role)) {
        throw new Error(`Access denied. This portal is for Officers only. Your role is: ${role}`);
      }

      errorMessage = '';
      store.addToast('success', `Welcome, ${result.user.name || username}. Signed in to Officer Review Console.`);
      await store.setAuthenticatedUser(result.user);
    } catch (error) {
      errorMessage = error.message || 'Officer sign in failed. Please check your credentials.';
    } finally {
      isLoading = false;
      store.notify();
    }
  });
}
