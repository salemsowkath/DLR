import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';

export function renderHeader() {
  const { user, isAuthenticated } = store;

  if (!isAuthenticated || !user) {
    return `
      <header class="app-header">
        <div class="header-left">
          <div class="emblem-badge">
            <div class="emblem-icon">🏛️</div>
            <div>
              <div>DLR Citizen Portal</div>
              <div class="gov-tag">Government of India • SIH 2026</div>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  // Identity reference display - ensure masked format (e.g. XXXX-XXXX-1234)
  const identityDisplay = user.external_reference || 'CITIZEN-USER';
  const maskedAadhaarDisplay = identityDisplay.replace('AADHAAR-', '');

  return `
    <header class="app-header">
      <div class="header-left">
        <button id="mobile-menu-toggle" class="btn btn-outline btn-sm" style="display: none;">☰</button>
        <div class="emblem-badge">
          <div class="emblem-icon">📜</div>
          <div>
            <div style="font-size: 1.05rem;">DLR Citizen Portal</div>
            <div class="gov-tag">Intelligent Land Digitization</div>
          </div>
        </div>
      </div>

      <div class="header-right">
        <div class="user-pill">
          <div class="user-avatar">👤</div>
          <div>
            <div style="font-weight: 600; line-height: 1.2;">${escapeHtml(user.name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(maskedAadhaarDisplay)}</div>
          </div>
        </div>

        <button id="header-profile-btn" class="btn btn-outline btn-sm" title="View Profile">Profile</button>
        <button id="header-logout-btn" class="btn btn-secondary btn-sm">Logout</button>
      </div>
    </header>
  `;
}

export function attachHeaderEvents() {
  const logoutBtn = document.getElementById('header-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      store.logout();
    });
  }

  const profileBtn = document.getElementById('header-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      store.setActiveTab('profile');
    });
  }
}
