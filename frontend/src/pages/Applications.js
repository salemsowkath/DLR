import { store } from '../store.js';
import { escapeHtml, formatDate, statusClass } from '../utils/format.js';

export function renderApplications() {
  if (store.applicationsLoading) return '<div class="page-content"><div class="loading-state"><span class="spinner"></span> Loading applications…</div></div>';
  if (store.applicationsError) return `<div class="page-content"><div class="notice notice-error">${escapeHtml(store.applicationsError)}</div></div>`;
  const applications = store.applications || [];
  return `<div class="page-content"><div class="page-heading"><h1>Applications and review status</h1><p>Only submissions that require an officer review are listed here.</p></div><section class="card">${applications.length ? `<div class="table-responsive"><table class="table"><thead><tr><th>Application ID</th><th>Land record</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>${applications.map((application) => `<tr><td><strong>${escapeHtml(application.application_id)}</strong></td><td>${escapeHtml(application.survey_number || application.filename)}</td><td>${formatDate(application.submitted_at)}</td><td><span class="badge ${statusClass(application.status)}">${escapeHtml(application.status)}</span></td><td><button class="btn btn-outline btn-sm application-record" data-id="${escapeHtml(application.document_id)}">View</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><h2>No review applications</h2><p>Documents that need officer review will appear here after processing.</p></div>'}</section></div>`;
}
export function attachApplicationsEvents() { document.querySelectorAll('.application-record').forEach((button) => button.addEventListener('click', () => store.setActiveTab('record-details', button.dataset.id))); }
