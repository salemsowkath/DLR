import { store } from './src/store.js';
import { renderHeader, attachHeaderEvents } from './src/components/Header.js';
import { renderSidebar, attachSidebarEvents } from './src/components/Sidebar.js';
import { renderToasts } from './src/components/Toast.js';
import { renderLogin, attachLoginEvents } from './src/pages/Login.js';
import { renderDashboard, attachDashboardEvents } from './src/pages/Dashboard.js';
import { renderUploadDocument, attachUploadDocumentEvents } from './src/pages/UploadDocument.js';
import { renderProcessingResult, attachProcessingResultEvents } from './src/pages/ProcessingResult.js';
import { renderLandRecords, attachLandRecordsEvents } from './src/pages/LandRecords.js';
import { renderLandRecordDetails, attachLandRecordDetailsEvents } from './src/pages/LandRecordDetails.js';
import { renderApplications, attachApplicationsEvents } from './src/pages/Applications.js';
import { renderProfile, attachProfileEvents } from './src/pages/Profile.js';

const views = {
  dashboard: [renderDashboard, attachDashboardEvents],
  upload: [renderUploadDocument, attachUploadDocumentEvents],
  'processing-result': [renderProcessingResult, attachProcessingResultEvents],
  'my-records': [renderLandRecords, attachLandRecordsEvents],
  'record-details': [renderLandRecordDetails, attachLandRecordDetailsEvents],
  applications: [renderApplications, attachApplicationsEvents],
  profile: [renderProfile, attachProfileEvents],
};

function render() {
  const app = document.getElementById('app');
  if (!store.isAuthenticated) {
    app.innerHTML = `${renderHeader()}${renderLogin()}${renderToasts()}`;
    attachHeaderEvents();
    attachLoginEvents();
    return;
  }
  const [renderView, attachView] = views[store.activeTab] || views.dashboard;
  app.innerHTML = `<div class="app-container">${renderSidebar()}<div class="main-content-wrapper">${renderHeader()}${renderView()}</div></div>${renderToasts()}`;
  attachSidebarEvents();
  attachHeaderEvents();
  attachView();
}

store.subscribe(render);
render();
void store.init();
