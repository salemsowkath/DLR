import { store } from './src/store.js';
import { renderHeader, attachHeaderEvents } from './src/components/Header.js';
import { renderSidebar, attachSidebarEvents } from './src/components/Sidebar.js';
import { renderToasts } from './src/components/Toast.js';

// Unauthenticated Views
import { renderAdminPortal, attachAdminPortalEvents } from './src/pages/AdminPortal.js';
import { renderStateAdminLogin, attachStateAdminLoginEvents } from './src/pages/StateAdminLogin.js';
import { renderSuperAdminLogin, attachSuperAdminLoginEvents } from './src/pages/SuperAdminLogin.js';

// State Admin Views
import { renderStateAdminDashboard, attachStateAdminDashboardEvents } from './src/pages/state-admin/StateAdminDashboard.js';
import { renderStateAdminOfficers, attachStateAdminOfficersEvents } from './src/pages/state-admin/StateAdminOfficers.js';
import { renderStateAdminMinisters, attachStateAdminMinistersEvents } from './src/pages/state-admin/StateAdminMinisters.js';
import { renderStateAdminCitizens, attachStateAdminCitizensEvents } from './src/pages/state-admin/StateAdminCitizens.js';
import { renderStateAdminLandRecords, attachStateAdminLandRecordsEvents } from './src/pages/state-admin/StateAdminLandRecords.js';
import { renderStateAdminReports, attachStateAdminReportsEvents } from './src/pages/state-admin/StateAdminReports.js';

// Super Admin Views
import { renderSuperAdminDashboard, attachSuperAdminDashboardEvents } from './src/pages/super-admin/SuperAdminDashboard.js';
import { renderStateAdminManagement, attachStateAdminManagementEvents } from './src/pages/super-admin/StateAdminManagement.js';
import { renderOfficerManagement, attachOfficerManagementEvents } from './src/pages/super-admin/OfficerManagement.js';
import { renderMinisterManagement, attachMinisterManagementEvents } from './src/pages/super-admin/MinisterManagement.js';
import { renderCitizenManagement, attachCitizenManagementEvents } from './src/pages/super-admin/CitizenManagement.js';
import { renderSuperAdminLandRecords, attachSuperAdminLandRecordsEvents } from './src/pages/super-admin/SuperAdminLandRecords.js';
import { renderSuperAdminAuditLogs, attachSuperAdminAuditLogsEvents } from './src/pages/super-admin/SuperAdminAuditLogs.js';
import { renderSuperAdminSettings, attachSuperAdminSettingsEvents } from './src/pages/super-admin/SuperAdminSettings.js';
import { renderOfficerWork, attachOfficerWorkEvents } from './src/pages/super-admin/OfficerWork.js';
import { renderOfficerWorkDetail, attachOfficerWorkDetailEvents } from './src/pages/super-admin/OfficerWorkDetail.js';
import { renderMinisterWork, attachMinisterWorkEvents } from './src/pages/super-admin/MinisterWork.js';
import { renderMinisterWorkDetail, attachMinisterWorkDetailEvents } from './src/pages/super-admin/MinisterWorkDetail.js';
import { renderSuperAdminReports, attachSuperAdminReportsEvents } from './src/pages/super-admin/SuperAdminReports.js';

const STATE_ADMIN_VIEWS = {
  'state-admin-dashboard':      [renderStateAdminDashboard,     attachStateAdminDashboardEvents],
  'state-admin-officers':       [renderStateAdminOfficers,      attachStateAdminOfficersEvents],
  'state-admin-ministers':      [renderStateAdminMinisters,     attachStateAdminMinistersEvents],
  'state-admin-citizens':       [renderStateAdminCitizens,      attachStateAdminCitizensEvents],
  'state-admin-records':        [renderStateAdminLandRecords,   attachStateAdminLandRecordsEvents],
  'state-admin-tax':            [renderStateAdminReports,       attachStateAdminReportsEvents],
  'state-admin-reports':        [renderStateAdminReports,       attachStateAdminReportsEvents],
  'state-admin-audit':          [renderStateAdminReports,       attachStateAdminReportsEvents],
  'state-admin-profile':        [renderStateAdminDashboard,     attachStateAdminDashboardEvents],
};

const SUPER_ADMIN_VIEWS = {
  'super-admin-dashboard':      [renderSuperAdminDashboard,     attachSuperAdminDashboardEvents],
  'super-admin-state-admins':   [renderStateAdminManagement,    attachStateAdminManagementEvents],
  'super-admin-officers':       [renderOfficerManagement,       attachOfficerManagementEvents],
  'super-admin-ministers':      [renderMinisterManagement,      attachMinisterManagementEvents],
  'super-admin-citizens':       [renderCitizenManagement,       attachCitizenManagementEvents],
  'super-admin-records':        [renderSuperAdminLandRecords,   attachSuperAdminLandRecordsEvents],
  'super-admin-audit-logs':     [renderSuperAdminAuditLogs,     attachSuperAdminAuditLogsEvents],
  'super-admin-settings':       [renderSuperAdminSettings,      attachSuperAdminSettingsEvents],
  'super-admin-officer-work':   [renderOfficerWork,             attachOfficerWorkEvents],
  'super-admin-officer-detail': [renderOfficerWorkDetail,       attachOfficerWorkDetailEvents],
  'super-admin-minister-work':  [renderMinisterWork,            attachMinisterWorkEvents],
  'super-admin-minister-detail':[renderMinisterWorkDetail,      attachMinisterWorkDetailEvents],
  'super-admin-reports':        [renderSuperAdminReports,       attachSuperAdminReportsEvents],
};

const AUTH_VIEWS = {
  'portal':             [renderAdminPortal,        attachAdminPortalEvents],
  'state-admin-login':  [renderStateAdminLogin,    attachStateAdminLoginEvents],
  'super-admin-login':  [renderSuperAdminLogin,    attachSuperAdminLoginEvents],
};

const PATH_TO_TAB = {
  '/':                      'portal',
  '/portal':                'portal',
  '/state-admin/login':     'state-admin-login',
  '/super-admin/login':     'super-admin-login',
  '/state-admin/dashboard': 'state-admin-dashboard',
  '/state-admin/officers':  'state-admin-officers',
  '/state-admin/ministers': 'state-admin-ministers',
  '/state-admin/citizens':  'state-admin-citizens',
  '/state-admin/records':   'state-admin-records',
  '/state-admin/tax':       'state-admin-tax',
  '/state-admin/reports':   'state-admin-reports',
  '/state-admin/audit':     'state-admin-audit',
  '/state-admin/profile':   'state-admin-profile',
  '/super-admin/dashboard': 'super-admin-dashboard',
  '/super-admin/state-admins': 'super-admin-state-admins',
  '/super-admin/officers':  'super-admin-officers',
  '/super-admin/ministers': 'super-admin-ministers',
  '/super-admin/citizens':  'super-admin-citizens',
  '/super-admin/records':   'super-admin-records',
  '/super-admin/audit-logs':'super-admin-audit-logs',
  '/super-admin/settings':  'super-admin-settings',
  '/super-admin/officer-work':  'super-admin-officer-work',
  '/super-admin/minister-work': 'super-admin-minister-work',
  '/super-admin/reports':       'super-admin-reports',
};

const TAB_TO_PATH = {
  'portal':                 '/portal',
  'state-admin-login':      '/state-admin/login',
  'super-admin-login':      '/super-admin/login',
  'state-admin-dashboard':  '/state-admin/dashboard',
  'state-admin-officers':   '/state-admin/officers',
  'state-admin-ministers':  '/state-admin/ministers',
  'state-admin-citizens':   '/state-admin/citizens',
  'state-admin-records':    '/state-admin/records',
  'state-admin-tax':        '/state-admin/tax',
  'state-admin-reports':    '/state-admin/reports',
  'state-admin-audit':      '/state-admin/audit',
  'state-admin-profile':    '/state-admin/profile',
  'super-admin-dashboard':  '/super-admin/dashboard',
  'super-admin-state-admins': '/super-admin/state-admins',
  'super-admin-officers':   '/super-admin/officers',
  'super-admin-ministers':  '/super-admin/ministers',
  'super-admin-citizens':   '/super-admin/citizens',
  'super-admin-records':    '/super-admin/records',
  'super-admin-audit-logs': '/super-admin/audit-logs',
  'super-admin-settings':   '/super-admin/settings',
  'super-admin-officer-work':  '/super-admin/officer-work',
  'super-admin-officer-detail':'/super-admin/officer-work',
  'super-admin-minister-work': '/super-admin/minister-work',
  'super-admin-minister-detail':'/super-admin/minister-work',
  'super-admin-reports':       '/super-admin/reports',
};

function handleDirectUrlRoute(pathname = window.location.pathname) {
  const cleanPath = pathname.toLowerCase().replace(/\/$/, '') || '/';
  const requestedTab = PATH_TO_TAB[cleanPath];

  if (!store.isAuthenticated) {
    if (requestedTab && AUTH_VIEWS[requestedTab]) {
      store.activeTab = requestedTab;
    } else {
      store.activeTab = 'portal';
    }
    return;
  }

  // Authenticated
  const defaultTab = store.isSuperAdmin ? 'super-admin-dashboard' : 'state-admin-dashboard';
  const allowedViews = store.isSuperAdmin ? SUPER_ADMIN_VIEWS : STATE_ADMIN_VIEWS;

  if (cleanPath.startsWith('/super-admin') && !store.isSuperAdmin) {
    store.addToast('error', 'Access denied. You must be a Super Administrator to access this area.');
    store.activeTab = defaultTab;
    return;
  }

  if (requestedTab && allowedViews[requestedTab]) {
    store.activeTab = requestedTab;
  } else {
    store.activeTab = defaultTab;
  }
}

function render() {
  const app = document.getElementById('app');

  // Unauthenticated
  if (!store.isAuthenticated) {
    const tab = store.activeTab || 'portal';
    const [renderView, attachView] = AUTH_VIEWS[tab] || AUTH_VIEWS['portal'];
    app.innerHTML = `${renderHeader()}${renderView()}${renderToasts()}`;
    attachHeaderEvents();
    attachView();

    const currentPath = TAB_TO_PATH[store.activeTab];
    if (currentPath && window.location.pathname !== currentPath) {
      window.history.replaceState(null, '', currentPath);
    }
    return;
  }

  // Authenticated Admin (State Admin or Super Admin)
  const allowedViews = store.isSuperAdmin ? SUPER_ADMIN_VIEWS : STATE_ADMIN_VIEWS;
  const defaultTab = store.isSuperAdmin ? 'super-admin-dashboard' : 'state-admin-dashboard';
  const activeTab = store.activeTab;

  const [renderView, attachView] = allowedViews[activeTab] || allowedViews[defaultTab];

  app.innerHTML = `
    <div class="app-container">
      ${renderSidebar()}
      <div class="main-content-wrapper">
        ${renderHeader()}
        ${renderView()}
      </div>
    </div>
    ${renderToasts()}
  `;
  attachSidebarEvents();
  attachHeaderEvents();
  attachView();

  const currentPath = TAB_TO_PATH[store.activeTab];
  if (currentPath && window.location.pathname !== currentPath) {
    window.history.replaceState(null, '', currentPath);
  }
}

window.addEventListener('popstate', () => {
  handleDirectUrlRoute(window.location.pathname);
  render();
});

store.subscribe(render);

// Initialize application
(async () => {
  handleDirectUrlRoute(window.location.pathname);
  await store.init();
  handleDirectUrlRoute(window.location.pathname);
  render();
})();
