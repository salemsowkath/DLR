import { store } from '../store.js';
import { escapeHtml, formatDate, statusClass } from '../utils/format.js';

let searchTerm = '';
let statusFilter = 'ALL';

export function renderLandRecords() {
  const documents = store.myDocuments.filter((document) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !search || [document.original_filename, document.document_id].some((value) => String(value || '').toLowerCase().includes(search));
    return matchesSearch && (statusFilter === 'ALL' || document.processing_status === statusFilter);
  });
  return `<div class="page-content"><div class="page-heading heading-actions"><div><h1>My Land Records</h1><p>Documents and digitized records associated with your verified account.</p></div><button id="records-upload-btn" class="btn btn-primary">Upload document</button></div>
    <section class="card"><div class="toolbar"><input id="record-search" class="form-control" value="${escapeHtml(searchTerm)}" placeholder="Search by document name or ID" /><select id="record-status-filter" class="form-control"><option value="ALL">All statuses</option>${['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'].map((status) => `<option value="${status}" ${statusFilter === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>
    ${documents.length ? `<div class="table-responsive"><table class="table"><thead><tr><th>Document</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>${documents.map((document) => `<tr><td><strong>${escapeHtml(document.original_filename)}</strong><br><small>${escapeHtml(document.document_id)}</small></td><td><span class="badge ${statusClass(document.processing_status)}">${escapeHtml(document.processing_status)}</span></td><td>${formatDate(document.uploaded_at)}</td><td><button class="btn btn-outline btn-sm open-record" data-id="${escapeHtml(document.document_id)}">View details</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><h2>No matching records</h2><p>${store.myDocuments.length ? 'Try changing the search or status filter.' : 'Upload a land document to begin digitization.'}</p></div>`}</section></div>`;
}

export function attachLandRecordsEvents() {
  document.getElementById('records-upload-btn')?.addEventListener('click', () => store.setActiveTab('upload'));
  document.getElementById('record-search')?.addEventListener('input', (event) => { searchTerm = event.target.value; store.notify(); });
  document.getElementById('record-status-filter')?.addEventListener('change', (event) => { statusFilter = event.target.value; store.notify(); });
  document.querySelectorAll('.open-record').forEach((button) => button.addEventListener('click', () => store.setActiveTab('record-details', button.dataset.id)));
}
