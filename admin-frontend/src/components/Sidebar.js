import { store } from '../store.js';

export function renderSidebar() {
  const activeTab = store.activeTab;
  const isSuperAdmin = store.isSuperAdmin;

  const assignedState = store.user?.state_name || store.user?.state || 'Tamil Nadu';

  const stateAdminItems = [
    { id: 'state-admin-dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'state-admin-officers',  label: 'Officers',  icon: '👮' },
    { id: 'state-admin-ministers', label: 'Ministers', icon: '🏛️' },
    { id: 'state-admin-records',   label: 'Land Records', icon: '📜' },
    { id: 'state-admin-tax',       label: 'Tax / Revenue', icon: '💰' },
    { id: 'state-admin-reports',   label: 'Reports',   icon: '📈' },
    { id: 'state-admin-audit',     label: 'Activity / Audit', icon: '📋' },
    { id: 'state-admin-profile',   label: 'Profile',   icon: '👤' },
  ];

  const superAdminItems = [
    { id: 'super-admin-dashboard',      label: 'Nationwide Dashboard', icon: '📊' },
    { id: 'super-admin-state-admins',   label: 'State Admins',         icon: '🏢' },
    { id: 'super-admin-officers',       label: 'Officers Management',  icon: '👮' },
    { id: 'super-admin-ministers',      label: 'Ministers Management', icon: '🏛️' },
    { id: 'super-admin-citizens',       label: 'Citizens Overview',    icon: '👥' },
    { id: 'super-admin-records',        label: 'Land Records',         icon: '📜' },
    { id: 'super-admin-officer-work',   label: 'Officer Work',         icon: '💼' },
    { id: 'super-admin-minister-work',  label: 'Minister Work',        icon: '👔' },
    { id: 'super-admin-reports',        label: 'Nationwide Reports',   icon: '📈' },
    { id: 'super-admin-audit-logs',     label: 'Audit Logs',           icon: '📋' },
    { id: 'super-admin-settings',       label: 'System Settings',      icon: '⚙️' },
  ];

  const items = isSuperAdmin ? superAdminItems : stateAdminItems;
  const brandTitle = isSuperAdmin ? 'DLR SUPER ADMIN' : 'STATE ADMIN';
  const brandSubtitle = isSuperAdmin ? 'Nationwide Governance' : assignedState;
  const sectionLabel = isSuperAdmin ? 'SUPER ADMIN GOVERNANCE' : `${assignedState.toUpperCase()} ADMINISTRATION`;

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">${isSuperAdmin ? '🛡️' : '🏢'}</div>
        <div>
          <div style="font-weight:800; font-size:1.05rem; letter-spacing:0.02em; color:#f8fafc;">${brandTitle}</div>
          <div style="font-size:0.75rem; color:${isSuperAdmin ? '#60a5fa' : '#c084fc'}; font-weight:700;">${brandSubtitle}</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">${sectionLabel}</div>
        ${items.map(item => `
          <button
            class="sidebar-nav-item ${activeTab === item.id || (item.id === 'super-admin-officer-work' && activeTab === 'super-admin-officer-detail') || (item.id === 'super-admin-minister-work' && activeTab === 'super-admin-minister-detail') ? 'active' : ''}"
            data-tab="${item.id}"
          >
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
          </button>
        `).join('')}

        <button class="sidebar-nav-item" id="sidebar-logout-btn" style="color:#f87171; margin-top: auto;">
          <span class="nav-icon">🚪</span>
          <span>Logout</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div style="font-size:0.75rem; color:#64748b; line-height:1.4;">
          ${isSuperAdmin ? 'All 28 States Active' : `Scope: ${assignedState}`}<br />
          <span style="color:#22c55e;">● Verified Authority</span>
        </div>
      </div>
    </aside>
  `;
}

export function attachSidebarEvents() {
  const navButtons = document.querySelectorAll('.sidebar-nav-item[data-tab]');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) {
        store.setActiveTab(tab);
      }
    });
  });

  document.getElementById('sidebar-logout-btn')?.addEventListener('click', async () => {
    await store.logout();
  });
}
