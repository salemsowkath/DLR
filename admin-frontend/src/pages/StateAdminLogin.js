import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';

let isLoading = false;
let errorMessage = '';

export function renderStateAdminLogin() {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">🏢</div>
          <h1>State Admin Portal</h1>
          <p>Sign in with your State Administrator credentials</p>
        </div>

        ${errorMessage ? `<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${escapeHtml(errorMessage)}</div>` : ''}

        <form id="state-admin-login-form">
          <div class="form-group">
            <label class="form-label" for="state-admin-username-input">State Admin Username</label>
            <input
              type="text"
              id="state-admin-username-input"
              class="form-control"
              autocomplete="username"
              placeholder="e.g. Tamil_Nadu_admin"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="state-admin-password-input">Password</label>
            <input
              type="password"
              id="state-admin-password-input"
              class="form-control"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary" id="state-admin-submit-btn" style="width:100%;font-size:1rem;padding:0.85rem;" ${isLoading ? 'disabled' : ''}>
            ${isLoading ? '<div class="spinner"></div> Authenticating...' : 'Sign in to State Admin Portal →'}
          </button>
        </form>

        <div style="margin-top:1.25rem;text-align:center;font-size:0.88rem;">
          <span style="color:var(--text-muted);">Super Administrator?</span>
          <a href="#" id="switch-to-super-admin" style="color:var(--primary);font-weight:600;text-decoration:none;margin-left:0.35rem;">Super Admin Sign In →</a>
        </div>

        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-color);display:flex;justify-content:center;">
          <a href="#" id="state-admin-back-to-portal" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
        </div>

        <div style="margin-top:1.25rem;padding-top:0.75rem;border-top:1px solid var(--border-color);text-align:center;font-size:0.78rem;color:var(--text-subtle);">
          Restricted access · Single State Jurisdiction · STATE_ADMIN role required
        </div>
      </div>
    </div>
  `;
}

export function attachStateAdminLoginEvents() {
  document.getElementById('state-admin-back-to-portal')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorMessage = '';
    store.activeTab = 'portal';
    store.notify();
  });

  document.getElementById('switch-to-super-admin')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorMessage = '';
    store.activeTab = 'super-admin-login';
    store.notify();
  });

  document.getElementById('state-admin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('state-admin-username-input')?.value || '').trim();
    const password = document.getElementById('state-admin-password-input')?.value || '';

    if (!username || !password) {
      errorMessage = 'Please enter your State Admin username and password.';
      store.notify();
      return;
    }

    isLoading = true;
    errorMessage = '';
    store.notify();

    try {
      const result = await api.stateAdminLogin({ username, password });
      const user = result?.user || result?.data?.user;
      if (!user) throw new Error('State Admin login response did not contain user data.');

      // Verify role client-side
      const role = String(user.role || user.primary_role || '').toUpperCase();
      if (role !== 'STATE_ADMIN') {
        throw new Error(`Access denied. This portal is for State Administrators only. Your role is: ${role}`);
      }

      errorMessage = '';
      store.addToast('success', `Authenticated as State Administrator for ${user.state_name || user.state || 'assigned state'}.`);
      await store.setAuthenticatedUser(user);
    } catch (error) {
      errorMessage = error.message || 'State Admin sign in failed. Please check your credentials.';
    } finally {
      isLoading = false;
      store.notify();
    }
  });
}
