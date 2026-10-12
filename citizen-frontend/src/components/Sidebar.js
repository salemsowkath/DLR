import { store } from '../store.js';

export function renderSidebar() {
  const activeTab = store.activeTab;

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'upload', label: 'Submit Land Record', icon: '📤' },
    { id: 'my-records', label: 'My Land Records', icon: '📜' },
    { id: 'applications', label: 'Applications', icon: '📋' },
    { id: 'my-appointments', label: 'Appointments', icon: '📅' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">🏛️</div>
        <div>
          <div style="font-weight:700; font-size:1.05rem;">DLR Portal</div>
          <div style="font-size:0.7rem; color:#94a3b8;">Citizen Services</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">CITIZEN SERVICES</div>
        ${items.map(item => `
          <button
            class="sidebar-nav-item ${activeTab === item.id ? 'active' : ''}"
            data-tab="${item.id}"
          >
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
          </button>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <div style="font-size:0.75rem; color:#64748b; line-height:1.4;">
          Secure DLR Session<br />
          <span style="color:#22c55e;">● Authenticated</span>
        </div>
      </div>
    </aside>
  `;
}

export function attachSidebarEvents() {
  const navButtons = document.querySelectorAll('.sidebar-nav-item');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) {
        store.setActiveTab(tab);
      }
    });
  });
}
