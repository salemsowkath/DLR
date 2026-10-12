import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml, formatDate, statusClass } from '../utils/format.js';

let searchTerm = '';
let statusFilter = 'ALL';
let activeApprovedRecord = null;
let showApprovedModal = false;

function formatMaskedAadhaar(aadhaar) {
  if (!aadhaar) return '—';
  const clean = String(aadhaar).trim();
  if (clean.includes('X')) return clean;
  if (clean.length === 12) {
    return `XXXX-XXXX-${clean.slice(8)}`;
  }
  return clean.replace(/\d(?=\d{4})/g, 'X');
}

function getDisplayStatus(document) {
  const lr = document.land_record;
  const rc = document.review_case;

  if (rc?.status === 'GOVERNMENT_APPROVED' || lr?.status === 'GOVERNMENT_APPROVED' || lr?.status === 'VERIFIED' || rc?.status === 'APPROVED') {
    return 'GOVERNMENT APPROVED';
  }
  if (lr?.status === 'REJECTED' || rc?.status === 'REJECTED') {
    return 'REJECTED';
  }
  if (rc?.status === 'CORRECTION_REQUIRED') {
    return 'CORRECTION REQUIRED';
  }
  return rc?.status || 'PENDING OFFICER REVIEW';
}

function renderApprovedRecordModal() {
  if (!showApprovedModal || !activeApprovedRecord) return '';

  const r = activeApprovedRecord;
  return `
    <div class="modal-overlay" id="approved-record-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="max-width: 650px; width: 100%; max-height: 90vh; overflow-y: auto; background: var(--bg-surface); border: 2px solid var(--success); box-shadow: 0 10px 30px rgba(0,0,0,0.7);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 2rem;">🏛️</div>
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--success); font-weight: 800; letter-spacing: 0.08em;">Government of India · Digital Land Record</div>
              <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--text-main); margin: 0.15rem 0;">GOVERNMENT VERIFIED DIGITAL LAND RECORD</h2>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Record ID: <strong style="color: var(--text-main);">${escapeHtml(r.record_id || r.id)}</strong></div>
            </div>
          </div>
          <button id="close-approved-modal-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Verification Status</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--success); display: flex; align-items: center; gap: 0.35rem;">
              <span>✓</span> GOVERNMENT APPROVED
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8rem; color: var(--text-muted);">Approval Date</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-main);">${formatDate(r.approval_date || r.created_at)}</div>
          </div>
        </div>

        <div class="detail-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.85rem; margin-bottom: 1.25rem;">
          <div class="detail-row"><span>Application ID</span><strong>${escapeHtml(r.case_id || '—')}</strong></div>
          <div class="detail-row"><span>Owner Name</span><strong>${escapeHtml(r.owner_name || '—')}</strong></div>
          <div class="detail-row"><span>Survey Number</span><strong>${escapeHtml(r.survey_number || '—')}</strong></div>
          <div class="detail-row"><span>Khasra Number</span><strong>${escapeHtml(r.khasra_number || '—')}</strong></div>
          <div class="detail-row"><span>Khata Number</span><strong>${escapeHtml(r.khata_number || '—')}</strong></div>
          <div class="detail-row"><span>Area</span><strong>${escapeHtml(`${r.area_value || ''} ${r.area_unit || ''}`.trim() || '—')}</strong></div>
          <div class="detail-row"><span>Village</span><strong>${escapeHtml(r.village || '—')}</strong></div>
          <div class="detail-row"><span>Taluk</span><strong>${escapeHtml(r.taluk || '—')}</strong></div>
          <div class="detail-row"><span>District</span><strong>${escapeHtml(r.district || '—')}</strong></div>
          <div class="detail-row"><span>State</span><strong>${escapeHtml(r.state || 'Tamil Nadu')}</strong></div>
          <div class="detail-row"><span>Classification</span><strong>${escapeHtml(r.classification || 'Agricultural')}</strong></div>
          <div class="detail-row"><span>Verified By</span><strong>${escapeHtml(r.approved_by_officer_id || 'Authorized Officer')}</strong></div>
        </div>

        <div class="notice notice-info" style="font-size: 0.82rem; margin-bottom: 1.25rem;">
          🔒 This record is cryptographically signed and stored in the central Land Records Registry database following physical document verification and biometrics.
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <button id="download-approved-btn" class="btn btn-primary">
            📥 Download Certificate
          </button>
          <button id="dismiss-approved-modal-btn" class="btn btn-outline">Close</button>
        </div>
      </div>
    </div>
  `;
}

export function renderLandRecords() {
  const approvedRecords = store.approvedRecords || [];

  const documents = store.myDocuments.filter((doc) => {
    const search = searchTerm.toLowerCase();
    const lr = doc.land_record || {};
    const cit = lr.citizen_submitted_data || {};
    const matchesSearch = !search || [
      doc.original_filename,
      doc.document_id,
      doc.review_case?.case_id,
      lr.owner_name,
      cit.owner_name,
      lr.survey_number,
      cit.survey_number,
      lr.village,
      cit.village,
    ].some((v) => String(v || '').toLowerCase().includes(search));

    const status = getDisplayStatus(doc);
    return matchesSearch && (statusFilter === 'ALL' || status === statusFilter);
  });

  return `
    <div class="page-content">
      <div class="page-heading heading-actions">
        <div>
          <h1>My Land Records</h1>
          <p>Digitized land records, official government verification certificates, and registered deeds.</p>
        </div>
        <button id="records-upload-btn" class="btn btn-primary">+ Submit Land Record</button>
      </div>

      <!-- Government Approved Records Section -->
      ${approvedRecords.length ? `
        <section class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--success); background: var(--bg-surface);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--success); font-weight: 800; letter-spacing: 0.05em;">Official Government Verified Records</div>
              <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-top: 0.2rem;">Approved Digital Land Records (${approvedRecords.length})</h2>
            </div>
            <span class="badge badge-success" style="font-weight: 700;">✓ CERTIFIED BY GOVERNMENT</span>
          </div>

          <div style="display: grid; gap: 1rem;">
            ${approvedRecords.map((r) => `
              <div class="card" style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <strong style="color: var(--text-main); font-size: 1.05rem;">Survey No: ${escapeHtml(r.survey_number)}</strong>
                    <span class="badge badge-success" style="font-size: 0.75rem;">GOVERNMENT APPROVED</span>
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                    Record ID: <code>${escapeHtml(r.record_id || r.id)}</code> · App: <strong>${escapeHtml(r.case_id || '—')}</strong>
                  </div>
                  <div style="font-size: 0.82rem; color: var(--text-subtle); margin-top: 0.2rem;">
                    Area: <strong>${escapeHtml(`${r.area_value || ''} ${r.area_unit || ''}`.trim() || '—')}</strong> · ${escapeHtml(r.village || '')}, ${escapeHtml(r.district || '')} · Approved ${formatDate(r.approval_date || r.created_at)}
                  </div>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-primary btn-sm view-approved-record-btn" data-id="${escapeHtml(r.id)}">
                    👁️ View Approved Record
                  </button>
                  <button class="btn btn-outline btn-sm download-approved-record-btn" data-id="${escapeHtml(r.id)}">
                    📥 Download
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- All Submitted Applications Table -->
      <section class="card">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem;">All Applications & Land Documents</h2>
        <div class="toolbar" style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem;">
          <input id="record-search" class="form-control" style="flex: 1;" value="${escapeHtml(searchTerm)}" placeholder="Search by survey number, owner name, village, or ID..." />
          <select id="record-status-filter" class="form-control" style="width: 250px;">
            <option value="ALL">All Application Statuses</option>
            <option value="GOVERNMENT APPROVED" ${statusFilter === 'GOVERNMENT APPROVED' ? 'selected' : ''}>Government Approved</option>
            <option value="PENDING OFFICER REVIEW" ${statusFilter === 'PENDING OFFICER REVIEW' ? 'selected' : ''}>Pending Officer Review</option>
            <option value="CORRECTION REQUIRED" ${statusFilter === 'CORRECTION REQUIRED' ? 'selected' : ''}>Correction Required</option>
            <option value="REJECTED" ${statusFilter === 'REJECTED' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>

        ${documents.length ? `
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Application / Doc ID</th>
                  <th>Owner Name</th>
                  <th>Aadhaar</th>
                  <th>Survey No</th>
                  <th>Area</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${documents.map((doc) => {
                  const lr = doc.land_record || {};
                  const rc = doc.review_case || {};
                  const cit = lr.citizen_submitted_data || {};
                  const ownerName = cit.owner_name || lr.owner_name || '—';
                  const aadhaar = cit.aadhaar_number || '—';
                  const surveyNo = cit.survey_number || lr.survey_number || '—';
                  const area = cit.area || (lr.area_value ? `${lr.area_value} ${lr.area_unit || ''}`.trim() : '—');
                  const village = cit.village || lr.village || '—';
                  const taluk = cit.taluk || lr.taluk || '—';
                  const district = cit.district || lr.district || '—';
                  const isDuplicate = Boolean(lr.is_duplicate || rc.is_duplicate);
                  const displayStatus = getDisplayStatus(doc);
                  const appId = rc.case_id || `APP-${doc.document_id.slice(-6)}`;

                  return `
                    <tr>
                      <td>
                        <strong>${escapeHtml(appId)}</strong>
                        <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(doc.original_filename)}</div>
                      </td>
                      <td><strong>${escapeHtml(ownerName)}</strong></td>
                      <td><code>${escapeHtml(formatMaskedAadhaar(aadhaar))}</code></td>
                      <td>
                        <strong>${escapeHtml(surveyNo)}</strong>
                        ${isDuplicate ? `<br><span class="badge badge-warning" title="${escapeHtml(lr.duplicate_reason || 'Survey number exists in this location')}">⚠️ Possible Duplicate</span>` : ''}
                      </td>
                      <td>${escapeHtml(area)}</td>
                      <td>
                        <div>${escapeHtml(village)}</div>
                        <small style="color: #64748b;">${escapeHtml(taluk)}, ${escapeHtml(district)}</small>
                      </td>
                      <td>
                        <span class="badge ${statusClass(displayStatus)}">${escapeHtml(displayStatus)}</span>
                      </td>
                      <td>${formatDate(doc.uploaded_at)}</td>
                      <td>
                        <button class="btn btn-outline btn-sm open-record" data-id="${escapeHtml(doc.document_id)}">View Details</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <h2>No land applications found</h2>
            <p>${store.myDocuments.length ? 'Try clearing your search query or changing filters.' : 'You have not submitted any land applications yet. Upload your first land document to get started.'}</p>
          </div>
        `}
      </section>

      <!-- Modal View for Approved Record -->
      ${renderApprovedRecordModal()}
    </div>
  `;
}

export function attachLandRecordsEvents() {
  document.getElementById('records-upload-btn')?.addEventListener('click', () => store.setActiveTab('upload'));
  document.getElementById('record-search')?.addEventListener('input', (event) => {
    searchTerm = event.target.value;
    store.notify();
  });
  document.getElementById('record-status-filter')?.addEventListener('change', (event) => {
    statusFilter = event.target.value;
    store.notify();
  });
  document.querySelectorAll('.open-record').forEach((button) => {
    button.addEventListener('click', () => store.setActiveTab('record-details', button.dataset.id));
  });

  document.querySelectorAll('.view-approved-record-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      activeApprovedRecord = (store.approvedRecords || []).find((r) => r.id === id);
      showApprovedModal = true;
      store.notify();
    });
  });

  document.querySelectorAll('.download-approved-record-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const rec = (store.approvedRecords || []).find((r) => r.id === id);
      if (rec) {
        void downloadCertificatePdf(rec);
      }
    });
  });

  document.getElementById('close-approved-modal-btn')?.addEventListener('click', () => {
    showApprovedModal = false;
    store.notify();
  });

  document.getElementById('dismiss-approved-modal-btn')?.addEventListener('click', () => {
    showApprovedModal = false;
    store.notify();
  });

  document.getElementById('download-approved-btn')?.addEventListener('click', () => {
    if (activeApprovedRecord) {
      void downloadCertificatePdf(activeApprovedRecord);
    }
  });
}

async function downloadCertificatePdf(record) {
  try {
    store.addToast('info', 'Generating official Government Verified PDF Certificate...');
    const blob = await api.downloadApprovedLandRecordPdf(record.id || record.record_id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DLR_Verified_Land_Record_${(record.survey_number || record.record_id || record.id).replace(/[\/\\]/g, '_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    store.addToast('success', 'Digital Land Record PDF downloaded successfully!');
  } catch (error) {
    store.addToast('error', `Download failed: ${error.message}`);
  }
}
