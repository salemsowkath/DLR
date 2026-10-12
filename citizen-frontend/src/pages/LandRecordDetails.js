import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml, fieldValue, formatDate, statusClass } from '../utils/format.js';

function title(value) {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

function fieldList(fields) {
  return Object.entries(fields || {}).map(([key, item]) => `
    <div class="detail-row">
      <span>${escapeHtml(title(key))}</span>
      <strong>${escapeHtml(fieldValue(item) ?? 'Not available')}</strong>
      ${typeof item === 'object' && typeof item?.confidence === 'number' ? `<small>${Math.round(item.confidence * 100)}% confidence</small>` : ''}
    </div>
  `).join('');
}

function formatMaskedAadhaar(aadhaar) {
  if (!aadhaar) return '—';
  const clean = String(aadhaar).trim();
  if (clean.includes('X')) return clean;
  if (clean.length === 12) {
    return `XXXX-XXXX-${clean.slice(8)}`;
  }
  return clean.replace(/\d(?=\d{4})/g, 'X');
}

export function renderLandRecordDetails() {
  if (store.recordLoading) {
    return '<div class="page-content"><div class="loading-state"><span class="spinner"></span> Loading record details…</div></div>';
  }
  if (store.recordError) {
    return `<div class="page-content"><div class="notice notice-error">${escapeHtml(store.recordError)}</div><button id="back-to-records" class="btn btn-outline">Back to records</button></div>`;
  }

  const document = store.selectedRecord;
  if (!document) {
    return '<div class="page-content"><div class="empty-state"><h1>Record unavailable</h1><p>Select a document from My Land Records.</p></div></div>';
  }

  const result = document.processing_result;
  const record = document.land_record;
  const reviewCase = document.review_case;
  const recordStatus = record?.status || record?.verification_status;

  const citizenStatus = recordStatus === 'VERIFIED'
    ? 'VERIFIED DIGITAL LAND RECORD'
    : recordStatus === 'REJECTED' || reviewCase?.status === 'REJECTED'
      ? 'REJECTED'
      : reviewCase?.status === 'CORRECTION_REQUIRED'
        ? 'CORRECTION REQUIRED'
        : 'PENDING OFFICER VERIFICATION';

  const citizenSubmitted = record?.citizen_submitted_data || record?.fields?.citizen_submitted_data || {};
  const isDuplicate = Boolean(record?.is_duplicate || reviewCase?.is_duplicate);
  const aiStatus = reviewCase?.ai_status || record?.ai_status || 'NOT_STARTED';
  const aiExtracted = record?.ai_extracted_data || result?.ai_extracted_data || result?.extraction || {};

  return `
    <div class="page-content">
      <div class="page-heading heading-actions">
        <div>
          <button id="back-to-records" class="text-button" style="cursor: pointer; background: none; border: none; color: #2563eb; font-weight: 600; padding: 0; margin-bottom: 0.5rem;">← Back to My Land Records</button>
          <h1>${escapeHtml(document.original_filename)}</h1>
          <p>${escapeHtml(document.document_id)} · Application: ${escapeHtml(reviewCase?.case_id || '—')} · Submitted ${formatDate(document.uploaded_at)}</p>
        </div>
        <span class="badge ${statusClass(recordStatus || reviewCase?.status || 'PENDING_OFFICER_VERIFICATION')}" style="font-size: 0.95rem; padding: 0.4rem 0.8rem;">
          ${escapeHtml(citizenStatus)}
        </span>
      </div>

      ${isDuplicate ? `
        <div class="notice notice-warning" style="margin-bottom: 1rem;">
          <strong>⚠️ POSSIBLE DUPLICATE LAND RECORD:</strong> ${escapeHtml(record?.duplicate_reason || reviewCase?.duplicate_reason || 'Survey Number already registered for this location in MySQL.')}
        </div>
      ` : ''}

      <div class="two-column">
        <!-- CITIZEN SUBMITTED DATA -->
        <section class="card">
          <h2>Citizen Submitted Data</h2>
          <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 1rem;">Manual land details entered during document submission.</p>
          <div class="detail-list">
            <div class="detail-row"><span>Owner Name</span><strong>${escapeHtml(citizenSubmitted.owner_name || record?.owner_name || '—')}</strong></div>
            <div class="detail-row"><span>Aadhaar Number</span><code>${escapeHtml(formatMaskedAadhaar(citizenSubmitted.aadhaar_number))}</code></div>
            <div class="detail-row"><span>Survey Number</span><strong>${escapeHtml(citizenSubmitted.survey_number || record?.survey_number || '—')}</strong></div>
            <div class="detail-row"><span>Area</span><strong>${escapeHtml(citizenSubmitted.area || (record?.area_value ? `${record.area_value} ${record.area_unit || ''}`.trim() : '—'))}</strong></div>
            <div class="detail-row"><span>Village</span><strong>${escapeHtml(citizenSubmitted.village || record?.village || '—')}</strong></div>
            <div class="detail-row"><span>Taluk</span><strong>${escapeHtml(citizenSubmitted.taluk || record?.taluk || '—')}</strong></div>
            <div class="detail-row"><span>District</span><strong>${escapeHtml(citizenSubmitted.district || record?.district || '—')}</strong></div>
          </div>
        </section>

        <!-- DOCUMENT METADATA -->
        <section class="card">
          <div class="heading-actions" style="margin-bottom: 1rem;">
            <h2>Uploaded Document</h2>
            <button id="view-doc-file-btn" class="btn btn-outline btn-sm">👁️ View Document</button>
          </div>
          <div class="detail-list">
            <div class="detail-row"><span>Original Filename</span><strong>${escapeHtml(document.original_filename)}</strong></div>
            <div class="detail-row"><span>File Type</span><strong>${escapeHtml(document.file_type || 'PDF').toUpperCase()}</strong></div>
            <div class="detail-row"><span>File Size</span><strong>${document.file_size ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB` : '—'}</strong></div>
            <div class="detail-row"><span>Storage Reference</span><code>${escapeHtml(document.storage_path)}</code></div>
            <div class="detail-row"><span>AI Processing Status</span><span class="badge ${aiStatus === 'COMPLETED' ? 'badge-success' : aiStatus === 'FAILED' ? 'badge-error' : 'badge-neutral'}">${escapeHtml(aiStatus)}</span></div>
            <div class="detail-row"><span>Officer Review Status</span><strong>${escapeHtml(reviewCase?.status || 'PENDING_REVIEW')}</strong></div>
            ${reviewCase?.officer_notes ? `<div class="detail-row"><span>Officer Remarks</span><strong>${escapeHtml(reviewCase.officer_notes)}</strong></div>` : ''}
            ${reviewCase?.rejection_reason ? `<div class="detail-row" style="color: #b91c1c;"><span>Rejection Reason</span><strong>${escapeHtml(reviewCase.rejection_reason)}</strong></div>` : ''}
          </div>
        </section>
      </div>

      ${aiStatus === 'COMPLETED' ? `
        <div class="two-column" style="margin-top: 1.5rem;">
          <section class="card">
            <h2>AI Extracted Data</h2>
            <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 1rem;">OCR & document understanding results for official review.</p>
            <div class="detail-list">${fieldList(aiExtracted)}</div>
          </section>

          <section class="card">
            <h2>AI Validation & Findings</h2>
            <p><span class="badge ${statusClass(result?.validation?.status || record?.validation_status)}">${escapeHtml(result?.validation?.status || record?.validation_status || 'PROCESSED')}</span> Score: <strong>${result?.validation?.score ?? reviewCase?.validation_score ?? '—'} / 100</strong></p>
            ${(reviewCase?.anomalies || []).length ? `
              <ul class="issue-list" style="margin-top: 1rem;">
                ${reviewCase.anomalies.map((anom) => `
                  <li><span class="badge ${statusClass(anom.severity)}">${escapeHtml(anom.severity)}</span> ${escapeHtml(anom.message || anom.title)}</li>
                `).join('')}
              </ul>
            ` : '<p class="muted" style="margin-top: 1rem;">No validation issues reported.</p>'}
          </section>
        </div>
      ` : `
        <section class="card" style="margin-top: 1.5rem; text-align: center; padding: 2rem; background: #f8fafc;">
          <h3>AI Processing: ${escapeHtml(aiStatus)}</h3>
          <p style="color: #64748b; max-width: 500px; margin: 0.5rem auto 0;">
            ${aiStatus === 'NOT_STARTED'
              ? 'AI document extraction is initiated by the reviewing officer during official government verification. Your document is safely persisted.'
              : aiStatus === 'PROCESSING'
                ? 'Document analysis is currently underway by the reviewing officer.'
                : 'Document processing can be retried by the reviewing officer.'}
          </p>
        </section>
      `}
    </div>
  `;
}

export function attachLandRecordDetailsEvents() {
  document.getElementById('back-to-records')?.addEventListener('click', () => {
    store.setActiveTab('records');
  });

  document.getElementById('view-doc-file-btn')?.addEventListener('click', async () => {
    const documentId = store.selectedRecord?.document_id;
    if (!documentId) return;
    try {
      const file = await api.getDocumentFile(documentId);
      const url = URL.createObjectURL(file);
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      store.addToast('error', error.message);
    }
  });
}
