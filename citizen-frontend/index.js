import { store } from './src/store.js';
import { renderHeader, attachHeaderEvents } from './src/components/Header.js';
import { renderSidebar, attachSidebarEvents } from './src/components/Sidebar.js';
import { renderToasts } from './src/components/Toast.js';

// Citizen Pages
import { renderCitizenLogin, attachCitizenLoginEvents } from './src/pages/CitizenLogin.js';
import { renderDashboard, attachDashboardEvents } from './src/pages/Dashboard.js';
import { renderUploadDocument, attachUploadDocumentEvents } from './src/pages/UploadDocument.js';
import { renderProcessingResult, attachProcessingResultEvents } from './src/pages/ProcessingResult.js';
import { renderLandRecords, attachLandRecordsEvents } from './src/pages/LandRecords.js';
import { renderLandRecordDetails, attachLandRecordDetailsEvents } from './src/pages/LandRecordDetails.js';
import { renderApplications, attachApplicationsEvents } from './src/pages/Applications.js';
import { renderAppointments, attachAppointmentsEvents } from './src/pages/Appointments.js';
import { renderProfile, attachProfileEvents } from './src/pages/Profile.js';

const CITIZEN_VIEWS = {
  'dashboard':          [renderDashboard,         attachDashboardEvents],
  'upload':             [renderUploadDocument,     attachUploadDocumentEvents],
  'processing-result':  [renderProcessingResult,   attachProcessingResultEvents],
  'my-records':         [renderLandRecords,        attachLandRecordsEvents],
  'records':            [renderLandRecords,        attachLandRecordsEvents],
  'record-details':     [renderLandRecordDetails,  attachLandRecordDetailsEvents],
  'applications':       [renderApplications,       attachApplicationsEvents],
  'my-appointments':    [renderAppointments,       attachAppointmentsEvents],
  'appointments':       [renderAppointments,       attachAppointmentsEvents],
  'profile':            [renderProfile,            attachProfileEvents],
};

const AUTH_VIEWS = {
  'citizen-login':      [renderCitizenLogin,       attachCitizenLoginEvents],
  'citizen-register':   [renderCitizenLogin,       attachCitizenLoginEvents],
};

const PATH_TO_TAB = {
  '/':                      'citizen-login',
  '/login':                 'citizen-login',
  '/citizen/login':         'citizen-login',
  '/citizen/register':      'citizen-register',
  '/register':              'citizen-register',
  '/dashboard':             'dashboard',
  '/citizen/dashboard':     'dashboard',
  '/upload':                'upload',
  '/citizen/upload':        'upload',
  '/my-records':            'my-records',
  '/records':               'my-records',
  '/citizen/records':       'my-records',
  '/applications':          'applications',
  '/citizen/applications':  'applications',
  '/appointments':          'my-appointments',
  '/citizen/appointments':  'my-appointments',
  '/profile':               'profile',
  '/citizen/profile':       'profile',
};

const TAB_TO_PATH = {
  'citizen-login':          '/login',
  'citizen-register':       '/register',
  'dashboard':              '/dashboard',
  'upload':                 '/upload',
  'processing-result':      '/dashboard',
  'my-records':             '/records',
  'records':                '/records',
  'record-details':         '/records',
  'applications':           '/applications',
  'my-appointments':        '/appointments',
  'appointments':           '/appointments',
  'profile':                '/profile',
};

function handleDirectUrlRoute(pathname = window.location.pathname) {
  const cleanPath = pathname.toLowerCase().replace(/\/$/, '') || '/';
  const requestedTab = PATH_TO_TAB[cleanPath];

  if (!store.isAuthenticated) {
    if (requestedTab === 'citizen-register') {
      store.activeTab = 'citizen-register';
    } else {
      store.activeTab = 'citizen-login';
    }
    return;
  }

  // Authenticated
  if (requestedTab && CITIZEN_VIEWS[requestedTab]) {
    store.activeTab = requestedTab;
  } else {
    store.activeTab = 'dashboard';
  }
}

function render() {
  const app = document.getElementById('app');

  // Unauthenticated
  if (!store.isAuthenticated) {
    const tab = store.activeTab || 'citizen-login';
    const [renderView, attachView] = AUTH_VIEWS[tab] || AUTH_VIEWS['citizen-login'];
    app.innerHTML = `${renderHeader()}${renderView()}${renderToasts()}`;
    attachHeaderEvents();
    attachView();

    const currentPath = TAB_TO_PATH[store.activeTab];
    if (currentPath && window.location.pathname !== currentPath) {
      window.history.replaceState(null, '', currentPath);
    }
    return;
  }

  // Authenticated Citizen
  const activeTab = store.activeTab;
  const [renderView, attachView] = CITIZEN_VIEWS[activeTab] || CITIZEN_VIEWS['dashboard'];

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
