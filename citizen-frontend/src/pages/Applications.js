import { store } from '../store.js';
import { escapeHtml, formatDate, statusClass } from '../utils/format.js';

const STATUS_STEPS = [
  { key: 'PENDING_OFFICER_REVIEW', label: 'Submitted' },
  { key: 'UNDER_OFFICER_REVIEW', label: 'Officer Review' },
  { key: 'AI_PROCESSING', label: 'AI Processing' },
  { key: 'AI_GENERATED', label: 'AI Generated' },
  { key: 'OFFICER_CORRECTION', label: 'Correction' },
  { key: 'APPOINTMENT_SCHEDULED', label: 'Appointment' },
  { key: 'CITIZEN_VERIFICATION', label: 'Verification' },
  { key: 'GOVERNMENT_APPROVED', label: 'Govt Approved' },
];

function getStepProgress(currentStatus) {
  const norm = String(currentStatus || '').toUpperCase();
  if (norm === 'REJECTED') return -1;
  const idx = STATUS_STEPS.findIndex((s) => s.key === norm);
  if (idx !== -1) return idx;
  if (norm === 'APPROVED') return STATUS_STEPS.length - 1;
  if (norm === 'IN_REVIEW') return 1;
  return 0;
}

export function renderApplications() {
  if (store.applicationsLoading) {
    return `
      <div class="page-content">
        <div class="loading-state"><span class="spinner"></span> Loading applications…</div>
      </div>
    `;
  }

  if (store.applicationsError) {
    return `
      <div class="page-content">
        <div class="notice notice-error">${escapeHtml(store.applicationsError)}</div>
      </div>
    `;
  }

  const applications = store.applications || [];

  return `
    <div class="page-content">
      <div class="page-heading heading-actions">
        <div>
          <h1>Track Application Status</h1>
          <p>Real-time progress and government verification lifecycle of your land digitization applications.</p>
        </div>
        <button id="refresh-apps-btn" class="btn btn-outline btn-sm">Refresh Status</button>
      </div>

      <section class="card">
        ${applications.length ? `
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            ${applications.map((app) => {
              const currentStep = getStepProgress(app.status);
              const isRejected = app.status === 'REJECTED';
              const isApproved = app.status === 'GOVERNMENT_APPROVED' || app.status === 'APPROVED';

              return `
                <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-color); padding: 1.25rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Land Record Application</div>
                      <h2 style="font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin: 0.2rem 0;">
                        ${escapeHtml(app.application_id || app.case_id || 'DLR-APP')}
                      </h2>
                      <div style="font-size: 0.82rem; color: var(--text-muted);">
                        Survey No: <strong>${escapeHtml(app.survey_number || '—')}</strong> · ${escapeHtml(app.village || '')} · Submitted ${formatDate(app.submitted_at || app.created_at)}
                      </div>
                    </div>
                    <span class="badge ${statusClass(app.status)}" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">
                      ${escapeHtml(app.status)}
                    </span>
                  </div>

                  <!-- Workflow Timeline Stepper -->
                  <div style="margin: 1.25rem 0; padding: 1rem 0.5rem; background: rgba(0,0,0,0.25); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; position: relative; gap: 0.25rem; overflow-x: auto;">
                      ${STATUS_STEPS.map((step, idx) => {
                        const isDone = !isRejected && currentStep >= idx;
                        const isCurrent = !isRejected && currentStep === idx;
                        return `
                          <div style="flex: 1; min-width: 80px; text-align: center; position: relative;">
                            <div style="width: 26px; height: 26px; border-radius: 50%; margin: 0 auto 0.4rem; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; background: ${isDone ? 'var(--success)' : isCurrent ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; color: #fff; border: 2px solid ${isCurrent ? '#fff' : 'transparent'};">
                              ${isDone ? '✓' : idx + 1}
                            </div>
                            <div style="font-size: 0.7rem; font-weight: ${isCurrent ? '700' : '500'}; color: ${isCurrent ? 'var(--text-main)' : isDone ? 'var(--success)' : 'var(--text-subtle)'}; line-height: 1.2;">
                              ${escapeHtml(step.label)}
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  ${isApproved ? `
                    <div class="notice notice-info" style="margin-top: 0.75rem; margin-bottom: 0;">
                      🎉 <strong>Approved:</strong> This land record has been officially verified and approved by the Government Officer. You can view the verified digital certificate in <strong>My Land Records</strong>.
                    </div>
                  ` : isRejected ? `
                    <div class="notice notice-error" style="margin-top: 0.75rem; margin-bottom: 0;">
                      ✕ <strong>Application Rejected:</strong> ${escapeHtml(app.rejection_reason || 'Document verification could not be completed.')}
                    </div>
                  ` : `
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">
                      Current Stage: <strong>${escapeHtml(app.status)}</strong>. The assigned Government Officer is processing your record.
                    </div>
                  `}

                  <div style="display: flex; justify-content: flex-end; margin-top: 1rem; gap: 0.5rem;">
                    <button class="btn btn-outline btn-sm application-record" data-id="${escapeHtml(app.document_id || '')}">
                      View Document Details →
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📝</div>
            <h2>No Applications Found</h2>
            <p>You have not submitted any land applications requiring verification yet.</p>
            <button id="goto-upload-btn" class="btn btn-primary" style="margin-top: 1rem;">Submit Land Record</button>
          </div>
        `}
      </section>
    </div>
  `;
}

export function attachApplicationsEvents() {
  document.getElementById('refresh-apps-btn')?.addEventListener('click', () => {
    void store.loadApplications();
  });

  document.getElementById('goto-upload-btn')?.addEventListener('click', () => {
    store.setActiveTab('upload');
  });

  document.querySelectorAll('.application-record').forEach((button) => {
    button.addEventListener('click', () => {
      const docId = button.dataset.id;
      if (docId) store.setActiveTab('record-details', docId);
    });
  });
}
