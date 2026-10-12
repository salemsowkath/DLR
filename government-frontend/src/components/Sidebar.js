import { store } from '../store.js';

export function renderSidebar() {
  const activeTab = store.activeTab;
  const isMinister = store.isMinister;

  const items = isMinister
    ? [
        { id: 'minister-dashboard', label: 'State Dashboard', icon: '🏛️' },
        { id: 'officer-cases', label: 'State Applications', icon: '⚖️' },
        { id: 'profile', label: 'Minister Profile', icon: '👤' },
      ]
    : [
        { id: 'officer-cases', label: 'Pending Applications', icon: '⚖️' },
        { id: 'profile', label: 'Officer Profile', icon: '👤' },
      ];

  const sectionLabel = isMinister ? 'MINISTER GOVERNANCE' : 'OFFICER VERIFICATION';

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">🏛️</div>
        <div>
          <div style="font-weight:700; font-size:1.05rem;">DLR Government</div>
          <div style="font-size:0.7rem; color:#94a3b8;">${sectionLabel}</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">${sectionLabel}</div>
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
          Jurisdiction Scoped<br />
          <span style="color:#22c55e;">● Official Authority</span>
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
