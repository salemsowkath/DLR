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
              <div style="font-weight:700;">DLR Administration Portal</div>
              <div class="gov-tag">Governance & Jurisdiction Oversight · SIH 2026</div>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  const isSuperAdmin = store.isSuperAdmin;
  const portalTitle = isSuperAdmin ? 'DLR Super Admin Portal' : 'DLR State Administration';
  const portalSubtitle = isSuperAdmin
    ? 'Nationwide System Administration & Governance (All 28 States)'
    : `State Jurisdiction: ${user.state_name || user.state || 'Assigned State'}`;
  const portalIcon = isSuperAdmin ? '🛡️' : '🏢';

  const identityDisplay = user.username || (isSuperAdmin ? 'SUPER ADMIN' : 'STATE ADMIN');

  return `
    <header class="app-header">
      <div class="header-left">
        <button id="mobile-menu-toggle" class="btn btn-outline btn-sm" style="display:none;">☰</button>
        <div class="emblem-badge">
          <div class="emblem-icon">${portalIcon}</div>
          <div>
            <div style="font-size:1.05rem; font-weight:700;">${portalTitle}</div>
            <div class="gov-tag">${portalSubtitle}</div>
          </div>
        </div>
      </div>

      <div class="header-right" style="display:flex; align-items:center; gap:0.75rem; position:relative;">
        <!-- Jurisdiction Pill -->
        <div style="background:${isSuperAdmin ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)'}; border:1px solid ${isSuperAdmin ? '#3b82f6' : '#a855f7'}; padding:0.3rem 0.75rem; border-radius:20px; font-size:0.75rem; font-weight:700; color:${isSuperAdmin ? '#60a5fa' : '#c084fc'};">
          ${isSuperAdmin ? '🌐 INDIA-WIDE' : `📍 ${user.state || 'STATE SCOPED'}`}
        </div>

        <!-- Identity info -->
        <div class="user-info">
          <div style="font-size:0.85rem; font-weight:600;">${escapeHtml(identityDisplay)}</div>
          <div style="font-size:0.7rem; color:${isSuperAdmin ? '#60a5fa' : '#c084fc'}; font-weight:600;">
            ${isSuperAdmin ? 'Super Administrator' : 'State Administrator'}
          </div>
        </div>

        <button id="header-logout-btn" class="btn btn-outline btn-sm">Logout</button>
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
}
