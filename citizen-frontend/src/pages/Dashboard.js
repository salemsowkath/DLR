import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';

export function renderDashboard() {
  const { user, myDocuments, approvedRecords, appointments } = store;

  const totalRecords = myDocuments.length;
  const verifiedRecordsCount = (approvedRecords || []).length;
  const scheduledAppointmentsCount = (appointments || []).filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;
  const pendingApplications = store.applications.filter((application) =>
    ['PENDING_REVIEW', 'PENDING_OFFICER_REVIEW', 'UNDER_OFFICER_REVIEW', 'IN_REVIEW', 'CORRECTION_REQUIRED', 'APPOINTMENT_SCHEDULED', 'CITIZEN_VERIFICATION'].includes(application.status)
  ).length;

  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 0.25rem;">Citizen Dashboard</h1>
          <p style="color: var(--text-muted);">Welcome back, <strong>${escapeHtml(user?.name || 'Citizen')}</strong></p>
        </div>
        <button id="quick-upload-btn" class="btn btn-primary">
          <span>📤</span> Submit Land Record
        </button>
      </div>

      <!-- Metric Cards -->
      <div class="grid-metrics" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Submitted Applications</div>
            <div class="value">${totalRecords}</div>
          </div>
          <div class="metric-icon" style="background: rgba(79, 70, 229, 0.15); color: var(--primary);">📁</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Government Verified</div>
            <div class="value">${verifiedRecordsCount}</div>
          </div>
          <div class="metric-icon" style="background: var(--success-bg); color: var(--success);">🏛️</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Active In Review</div>
            <div class="value">${pendingApplications}</div>
          </div>
          <div class="metric-icon" style="background: var(--warning-bg); color: var(--warning);">⏳</div>
        </div>

        <div class="card metric-card">
          <div class="metric-info">
            <div class="label">Upcoming Appointments</div>
            <div class="value">${scheduledAppointmentsCount}</div>
          </div>
          <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: var(--info);">📅</div>
        </div>
      </div>

      <!-- Quick Action Cards Grid -->
      <h2 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 1rem;">Quick Actions</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-bottom: 2.5rem;">
        <div class="card action-card" id="card-action-upload" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">📄</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">Submit Land Record</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Upload original deed document and declare land ownership details.</p>
          <div class="btn btn-outline btn-sm">Submit Record →</div>
        </div>

        <div class="card action-card" id="card-action-records" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">📜</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">My Land Records</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Browse verified digital certificates, survey numbers, and download records.</p>
          <div class="btn btn-outline btn-sm">View Land Records →</div>
        </div>

        <div class="card action-card" id="card-action-applications" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">🔍</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">Track Application Status</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">Monitor officer review progress through the 8-stage verification lifecycle.</p>
          <div class="btn btn-outline btn-sm">Track Applications →</div>
        </div>

        <div class="card action-card" id="card-action-appointments" style="cursor: pointer;">
          <div style="font-size: 2rem; margin-bottom: 0.75rem;">📅</div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.35rem;">My Appointments</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">View scheduled government office visits for physical scrutiny & biometrics.</p>
          <div class="btn btn-outline btn-sm">View Appointments →</div>
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
            <p style="font-size: 0.85rem; margin-top: 0.25rem;">Click "Submit Land Record" above to start the government verification workflow.</p>
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
  document.getElementById('quick-upload-btn')?.addEventListener('click', () => store.setActiveTab('upload'));
  document.getElementById('card-action-upload')?.addEventListener('click', () => store.setActiveTab('upload'));
  document.getElementById('card-action-records')?.addEventListener('click', () => store.setActiveTab('my-records'));
  document.getElementById('card-action-applications')?.addEventListener('click', () => store.setActiveTab('applications'));
  document.getElementById('card-action-appointments')?.addEventListener('click', () => store.setActiveTab('my-appointments'));
  document.getElementById('view-all-records-btn')?.addEventListener('click', () => store.setActiveTab('my-records'));

  document.querySelectorAll('.view-doc-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const docId = btn.getAttribute('data-id');
      store.setActiveTab('record-details', docId);
    });
  });
}
