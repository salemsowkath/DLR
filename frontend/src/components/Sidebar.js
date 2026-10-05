import { store } from '../store.js';

export function renderSidebar() {
  const { activeTab, isAuthenticated } = store;

  if (!isAuthenticated) return '';

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'my-records', label: 'My Land Records', icon: '📁' },
    { id: 'upload', label: 'Upload Document', icon: '📤' },
    { id: 'applications', label: 'Track Applications', icon: '📝' },
    { id: 'profile', label: 'Citizen Profile', icon: '👤' },
  ];

  return `
    <aside class="app-sidebar" id="sidebar">
      <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-subtle); padding: 0.5rem 1rem; letter-spacing: 0.08em;">
        Main Menu
      </div>
      ${items
        .map(
          (item) => `
        <div class="nav-item ${activeTab === item.id ? 'active' : ''}" data-tab="${item.id}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </div>
      `
        )
        .join('')}

      <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-color);">
        <div class="nav-item" id="sidebar-logout-btn" style="color: var(--danger);">
          <span class="nav-icon">🚪</span>
          <span>Logout</span>
        </div>
      </div>
    </aside>
  `;
}

export function attachSidebarEvents() {
  const navItems = document.querySelectorAll('.app-sidebar .nav-item[data-tab]');
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      store.setActiveTab(tab);
    });
  });

  const logoutBtn = document.getElementById('sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      store.logout();
    });
  }
}
