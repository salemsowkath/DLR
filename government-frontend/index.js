import { store } from './src/store.js';
import { renderHeader, attachHeaderEvents } from './src/components/Header.js';
import { renderSidebar, attachSidebarEvents } from './src/components/Sidebar.js';
import { renderToasts } from './src/components/Toast.js';

// Unauthenticated Views
import { renderGovernmentPortal, attachGovernmentPortalEvents } from './src/pages/GovernmentPortal.js';
import { renderOfficerLogin, attachOfficerLoginEvents } from './src/pages/OfficerLogin.js';
import { renderMinisterLogin, attachMinisterLoginEvents } from './src/pages/MinisterLogin.js';

// Authenticated Views
import { renderOfficerReview, attachOfficerReviewEvents } from './src/pages/OfficerReview.js';
import { renderMinisterDashboard, attachMinisterDashboardEvents } from './src/pages/MinisterDashboard.js';
import { renderProfile, attachProfileEvents } from './src/pages/Profile.js';

const OFFICER_VIEWS = {
  'officer-cases':      [renderOfficerReview,      attachOfficerReviewEvents],
  'profile':            [renderProfile,            attachProfileEvents],
};

const MINISTER_VIEWS = {
  'minister-dashboard': [renderMinisterDashboard,  attachMinisterDashboardEvents],
  'officer-cases':      [renderOfficerReview,      attachOfficerReviewEvents],
  'profile':            [renderProfile,            attachProfileEvents],
};

const AUTH_VIEWS = {
  'portal':             [renderGovernmentPortal,   attachGovernmentPortalEvents],
  'officer-login':      [renderOfficerLogin,       attachOfficerLoginEvents],
  'minister-login':     [renderMinisterLogin,      attachMinisterLoginEvents],
};

const PATH_TO_TAB = {
  '/':                      'portal',
  '/portal':                'portal',
  '/officer/login':         'officer-login',
  '/minister/login':        'minister-login',
  '/officer/dashboard':     'officer-cases',
  '/officer/review':        'officer-cases',
  '/officer/cases':         'officer-cases',
  '/officer/applications':  'officer-cases',
  '/minister/dashboard':    'minister-dashboard',
  '/profile':               'profile',
};

const TAB_TO_PATH = {
  'portal':                 '/portal',
  'officer-login':          '/officer/login',
  'minister-login':         '/minister/login',
  'officer-cases':          '/officer/applications',
  'minister-dashboard':     '/minister/dashboard',
  'profile':                '/profile',
};

function handleDirectUrlRoute(pathname = window.location.pathname) {
  const cleanPath = pathname.toLowerCase().replace(/\/$/, '') || '/';

  // Check /officer/applications/:applicationId pattern
  const appMatch = pathname.match(/^\/officer\/applications\/([A-Za-z0-9_-]+)/i);
  if (appMatch) {
    const applicationId = appMatch[1];
    if (!store.isAuthenticated) {
      store.activeTab = 'officer-login';
      return;
    }
    if (store.isOfficer) {
      store.activeTab = 'officer-cases';
      if (store.selectedReviewCase?.case_id !== applicationId) {
        void store.loadSelectedReviewCase(applicationId);
      }
    }
    return;
  }

  if (cleanPath === '/officer/applications' || cleanPath === '/officer/dashboard') {
    if (store.isAuthenticated && store.isOfficer) {
      store.activeTab = 'officer-cases';
      // If navigating explicitly to list, clear selection
      if (window.location.pathname.toLowerCase() === '/officer/applications') {
        store.selectedReviewCase = null;
      }
    }
    return;
  }

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
  const defaultTab = store.isMinister ? 'minister-dashboard' : 'officer-cases';
  const allowedViews = store.isMinister ? MINISTER_VIEWS : OFFICER_VIEWS;

  if (cleanPath.startsWith('/minister') && !store.isMinister) {
    store.addToast('error', 'Access denied. You must be an authorized Minister to access this area.');
    store.activeTab = defaultTab;
    return;
  }

  if (cleanPath.startsWith('/officer') && store.isMinister) {
    store.addToast('error', 'Ministers should use the Minister Dashboard.');
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

  // Authenticated (Officer or Minister)
  const allowedViews = store.isMinister ? MINISTER_VIEWS : OFFICER_VIEWS;
  const defaultTab = store.isMinister ? 'minister-dashboard' : 'officer-cases';
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

  let currentPath = TAB_TO_PATH[store.activeTab];
  if (store.activeTab === 'officer-cases') {
    if (store.selectedReviewCase?.case_id) {
      currentPath = `/officer/applications/${store.selectedReviewCase.case_id}`;
    } else {
      currentPath = '/officer/applications';
    }
  }
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
