import { store } from '../store.js';
import { escapeHtml, formatDate } from '../utils/format.js';

let showNotificationsPanel = false;

export function renderHeader() {
  const { user, isAuthenticated, notifications, unreadNotificationsCount } = store;

  if (!isAuthenticated || !user) {
    return `
      <header class="app-header">
        <div class="header-left">
          <div class="emblem-badge">
            <div class="emblem-icon">🏛️</div>
            <div>
              <div style="font-weight:700;">DLR Citizen Portal</div>
              <div class="gov-tag">Government of India · SIH 2026 Problem 26018</div>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  const identityDisplay = (user.fullName || user.external_reference || 'CITIZEN-USER').replace('AADHAAR-', '');

  return `
    <header class="app-header">
      <div class="header-left">
        <button id="mobile-menu-toggle" class="btn btn-outline btn-sm" style="display:none;">☰</button>
        <div class="emblem-badge">
          <div class="emblem-icon">📜</div>
          <div>
            <div style="font-size:1.05rem; font-weight:700;">DLR Citizen Portal</div>
            <div class="gov-tag">Public Land Record Digitization & Validation</div>
          </div>
        </div>
      </div>

      <div class="header-right" style="display:flex; align-items:center; gap:0.75rem; position:relative;">
        <!-- Notification Bell Icon -->
        <div style="position:relative;">
          <button id="header-notif-btn" class="btn btn-outline btn-sm" title="Notifications" style="position:relative; font-size:1.1rem; padding:0.4rem 0.65rem;">
            🔔
            ${
              unreadNotificationsCount > 0
                ? `<span style="position:absolute; top:-4px; right:-4px; background:#dc2626; color:#fff; border-radius:50%; width:18px; height:18px; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center;">${unreadNotificationsCount}</span>`
                : ''
            }
          </button>

          <!-- Notifications Dropdown -->
          ${
            showNotificationsPanel
              ? `
            <div id="notifications-dropdown" style="position:absolute; right:0; top:calc(100% + 8px); width:340px; background:#1e293b; border:1px solid #334155; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.4); z-index:9999; overflow:hidden;">
              <div style="padding:0.75rem 1rem; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600; font-size:0.9rem;">Notifications</span>
                <span style="font-size:0.75rem; color:#94a3b8;">${unreadNotificationsCount} unread</span>
              </div>
              <div style="max-height:260px; overflow-y:auto;">
                ${
                  notifications.length === 0
                    ? `<div style="padding:1.5rem; text-align:center; color:#64748b; font-size:0.85rem;">No notifications at this time.</div>`
                    : notifications.slice(0, 8).map(n => `
                      <div class="notif-item ${!n.is_read ? 'unread' : ''}" data-id="${escapeHtml(n.id)}" style="padding:0.65rem 1rem; border-bottom:1px solid #1e293b; cursor:pointer; background:${!n.is_read ? 'rgba(59,130,246,0.08)' : 'transparent'};">
                        <div style="font-size:0.82rem; font-weight:600; color:${!n.is_read ? '#60a5fa' : '#cbd5e1'};">${escapeHtml(n.title)}</div>
                        <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">${escapeHtml(n.message)}</div>
                        <div style="font-size:0.7rem; color:#64748b; margin-top:3px;">${formatDate(n.created_at)}</div>
                      </div>
                    `).join('')
                }
              </div>
              <div style="padding:0.5rem 1rem; border-top:1px solid #334155; text-align:center;">
                <button id="view-all-notifs-btn" class="btn btn-ghost btn-sm" style="font-size:0.75rem; width:100%;">View All in Notifications Tab</button>
              </div>
            </div>
          `
              : ''
          }
        </div>

        <!-- User Identity Tag -->
        <div class="user-info">
          <div style="font-size:0.85rem; font-weight:600;">${escapeHtml(identityDisplay)}</div>
          <div style="font-size:0.7rem; color:#38bdf8;">Verified Citizen</div>
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

  const notifBtn = document.getElementById('header-notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showNotificationsPanel = !showNotificationsPanel;
      store.notify();
    });
  }

  const viewAllBtn = document.getElementById('view-all-notifs-btn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      showNotificationsPanel = false;
      store.setActiveTab('notifications');
    });
  }

  document.addEventListener('click', (e) => {
    if (showNotificationsPanel && !e.target.closest('#header-notif-btn') && !e.target.closest('#notifications-dropdown')) {
      showNotificationsPanel = false;
      store.notify();
    }
  }, { once: true });
}
