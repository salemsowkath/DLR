import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';

let isLoading = false;
let errorMessage = '';

export function renderSuperAdminLogin() {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">🔐</div>
          <h1>Super Admin Portal</h1>
          <p>Sign in with your Super Administrator credentials</p>
        </div>

        ${errorMessage ? `<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${escapeHtml(errorMessage)}</div>` : ''}

        <form id="super-admin-login-form">
          <div class="form-group">
            <label class="form-label" for="super-admin-username-input">Super Admin Username</label>
            <input
              type="text"
              id="super-admin-username-input"
              class="form-control"
              autocomplete="username"
              placeholder="e.g. superadmin"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="super-admin-password-input">Password</label>
            <input
              type="password"
              id="super-admin-password-input"
              class="form-control"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary" id="super-admin-submit-btn" style="width:100%;font-size:1rem;padding:0.85rem;" ${isLoading ? 'disabled' : ''}>
            ${isLoading ? '<div class="spinner"></div> Authenticating...' : 'Sign in to Admin Portal →'}
          </button>
        </form>

        <div style="margin-top:1.25rem;text-align:center;font-size:0.88rem;">
          <span style="color:var(--text-muted);">State Administrator?</span>
          <a href="#" id="switch-to-state-admin" style="color:#a855f7;font-weight:600;text-decoration:none;margin-left:0.35rem;">State Admin Sign In →</a>
        </div>

        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-color);display:flex;justify-content:center;">
          <a href="#" id="super-admin-back-to-portal" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
        </div>

        <div style="margin-top:1.25rem;padding-top:0.75rem;border-top:1px solid var(--border-color);text-align:center;font-size:0.78rem;color:var(--text-subtle);">
          Restricted access · All actions are immutably logged · SUPER_ADMIN role required
        </div>
      </div>
    </div>
  `;
}

export function attachSuperAdminLoginEvents() {
  document.getElementById('super-admin-back-to-portal')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorMessage = '';
    store.activeTab = 'portal';
    store.notify();
  });

  document.getElementById('switch-to-state-admin')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorMessage = '';
    store.activeTab = 'state-admin-login';
    store.notify();
  });

  document.getElementById('super-admin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('super-admin-username-input')?.value || '').trim();
    const password = document.getElementById('super-admin-password-input')?.value || '';

    if (!username || !password) {
      errorMessage = 'Please enter your Super Admin username and password.';
      store.notify();
      return;
    }

    isLoading = true;
    errorMessage = '';
    store.notify();

    try {
      const result = await api.superAdminLogin({ username, password });
      const user = result?.user || result?.data?.user;
      if (!user) throw new Error('Super Admin login response did not contain user data.');

      // Verify role client-side
      const role = String(user.role || user.primary_role || '').toUpperCase();
      if (role !== 'SUPER_ADMIN') {
        throw new Error(`Access denied. This portal is for Super Administrators only. Your role is: ${role}`);
      }

      errorMessage = '';
      store.addToast('success', 'Authenticated as Super Administrator.');
      await store.setAuthenticatedUser(user);
    } catch (error) {
      errorMessage = error.message || 'Super Admin sign in failed. Please check your credentials.';
    } finally {
      isLoading = false;
      store.notify();
    }
  });
}
