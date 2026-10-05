import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';

export function renderDashboard() {
  const { user, myDocuments } = store;

  const totalRecords = myDocuments.length;
  const processedRecords = myDocuments.filter((d) => d.processing_status === 'PROCESSED').length;
  const pendingRecords = myDocuments.filter((d) => d.processing_status === 'UPLOADED' || d.processing_status === 'PROCESSING').length;
  const failedRecords = myDocuments.filter((d) => d.processing_status === 'FAILED').length;
  const pendingApplications = store.applications.filter((application) => ['PENDING_REVIEW', 'IN_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD'].includes(application.status)).length;

  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 0.25rem;">Citizen Dashboard</h1>
          <p style="color: var(--text-muted);">Welcome back, <strong>${escapeHtml(user?.name || 'Citizen')}</strong></p>
        </div>
        <button id="quick-upload-btn" class="btn btn-primary">
          <span>📤</span> Upload Land Document
        </button>
      </div>

      ${failedRecords ? `<div class="notice notice-error">${failedRecords} document${failedRecords > 1 ? 's need' : ' needs'} attention. Open My Land Records to view the processing status.</div>` : ''}

      <!-- Metric Cards -->
      <div class="grid-metrics">
        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Submitted Documents</div>
            <div class="value">${totalRecords}</div>
          </div>
          <div class="metric-icon" style="background: rgba(79, 70, 229, 0.15); color: var(--primary);">📁</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Processed</div>
            <div class="value">${processedRecords}</div>
          </div>
          <div class="metric-icon" style="background: var(--success-bg); color: var(--success);">✅</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Pending Processing</div>
            <div class="value">${pendingRecords}</div>
          </div>
          <div class="metric-icon" style="background: var(--warning-bg); color: var(--warning);">⏳</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Pending Applications</div>
            <div class="value">${pendingApplications}</div>
          </div>
          <div class="metric-icon" style="background: ${pendingApplications ? 'var(--warning-bg)' : 'var(--success-bg)'}; color: ${pendingApplications ? 'var(--warning)' : 'var(--success)'};">${pendingApplications ? '⚠️' : '✓'}</div>
        </div>
      </div>

      <!-- Quick Action Cards Grid -->
      <h2 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 1rem;">Quick Actions</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2.5rem;">
        <div class="card action-card" id="card-action-upload" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">📄</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">Digitize Land Document</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Upload Patta/Chitta or sale deed PDF/image for automated AI OCR & GIS extraction.</p>
          <div class="btn btn-outline btn-sm">Upload Document →</div>
        </div>

        <div class="card action-card" id="card-action-records" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">📜</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">View My Land Records</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Browse extracted land details, survey numbers, and official verification statuses.</p>
          <div class="btn btn-outline btn-sm">View Land Records →</div>
        </div>

        <div class="card action-card" id="card-action-applications" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">🔍</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">Track Application Status</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Monitor officer review cases, anomaly resolution, and status timeline updates.</p>
          <div class="btn btn-outline btn-sm">Track Applications →</div>
        </div>
      </div>

      <!-- Recent Uploads Table -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.15rem; font-weight: 600;">Recent Document Submissions</h2>
          <button id="view-all-records-btn" class="btn btn-outline btn-sm">View All Records</button>
        </div>

        ${
          myDocuments.length === 0
            ? `
          <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📭</div>
            <p>No land documents submitted yet.</p>
            <p style="font-size: 0.85rem; margin-top: 0.25rem;">Click "Upload Land Document" above to start AI extraction and validation.</p>
          </div>
        `
            : `
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Document ID</th>
                  <th>Original Filename</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Uploaded Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${myDocuments
                  .slice(0, 5)
                  .map(
                    (doc) => `
                  <tr>
                    <td><strong style="font-family: monospace;">${doc.document_id}</strong></td>
                    <td>${doc.original_filename}</td>
                    <td><span class="badge badge-info">${(doc.file_type || 'PDF').toUpperCase()}</span></td>
                    <td>
                      <span class="badge ${
                        doc.processing_status === 'PROCESSED'
                          ? 'badge-success'
                          : doc.processing_status === 'FAILED'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }">
                        ${doc.processing_status}
                      </span>
                    </td>
                    <td>${new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <button class="btn btn-outline btn-sm view-doc-btn" data-id="${doc.document_id}">
                        View Details
                      </button>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        }
      </div>
    </div>
  `;
}

export function attachDashboardEvents() {
  const quickUploadBtn = document.getElementById('quick-upload-btn');
  if (quickUploadBtn) {
    quickUploadBtn.addEventListener('click', () => store.setActiveTab('upload'));
  }

  const cardUpload = document.getElementById('card-action-upload');
  if (cardUpload) {
    cardUpload.addEventListener('click', () => store.setActiveTab('upload'));
  }

  const cardRecords = document.getElementById('card-action-records');
  if (cardRecords) {
    cardRecords.addEventListener('click', () => store.setActiveTab('my-records'));
  }

  const cardApplications = document.getElementById('card-action-applications');
  if (cardApplications) {
    cardApplications.addEventListener('click', () => store.setActiveTab('applications'));
  }

  const viewAllBtn = document.getElementById('view-all-records-btn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => store.setActiveTab('my-records'));
  }

  const viewButtons = document.querySelectorAll('.view-doc-btn');
  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const docId = btn.getAttribute('data-id');
      store.setActiveTab('record-details', docId);
    });
  });
}
