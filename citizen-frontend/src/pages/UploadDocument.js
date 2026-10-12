import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';
import { INDIAN_STATES } from '../utils/states.js';

let selectedFile = null;
let uploadState = 'idle';
let errorMessage = '';
let duplicateWarning = null;
let duplicateCheckTimeout = null;

const manualDetails = {
  owner_name: '',
  aadhaar_number: '',
  survey_number: '',
  subdivision_number: '',
  area: '',
  area_unit: 'Acres',
  village: '',
  taluk: '',
  district: '',
  state: 'Tamil Nadu',
  classification: 'Agricultural (Ryotwari)',
  patta_number: '',
  document_type: 'Sale Deed',
  document_date: '',
  description: '',
};

const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
const maxBytes = 10 * 1024 * 1024;

function fileSummary(file) {
  return `${escapeHtml(file.name)} · ${(file.size / 1024 / 1024).toFixed(2)} MB · ${escapeHtml(file.type || 'unknown')}`;
}

function setFile(file) {
  errorMessage = '';
  if (!file) return;
  if (!acceptedTypes.includes(file.type) || file.size > maxBytes) {
    selectedFile = null;
    errorMessage = file.size > maxBytes
      ? 'File exceeds the 10 MB limit.'
      : 'Upload a PDF, JPG, JPEG, or PNG document.';
  } else {
    selectedFile = file;
  }
  store.notify();
}

async function triggerDuplicateCheck() {
  if (duplicateCheckTimeout) {
    clearTimeout(duplicateCheckTimeout);
  }
  duplicateCheckTimeout = setTimeout(async () => {
    const s = manualDetails.survey_number?.trim();
    const v = manualDetails.village?.trim();
    const t = manualDetails.taluk?.trim();
    const d = manualDetails.district?.trim();

    if (s && v && t && d) {
      try {
        const res = await api.checkDuplicateRecord({
          surveyNumber: s,
          village: v,
          taluk: t,
          district: d,
        });
        if (res?.isDuplicate) {
          duplicateWarning = {
            message: res.message || `Survey Number ${s} is already registered for this location.`,
            warning: '⚠️ POSSIBLE DUPLICATE LAND RECORD',
          };
        } else {
          duplicateWarning = null;
        }
        store.notify();
      } catch (_) {
        // Silent duplicate check failure
      }
    } else {
      if (duplicateWarning) {
        duplicateWarning = null;
        store.notify();
      }
    }
  }, 400);
}

export function renderUploadDocument() {
  return `
    <div class="page-content narrow-page">
      <div class="page-heading">
        <div>
          <h1>Upload Land Document</h1>
          <p>Submit your property document and manual land details for official government verification.</p>
        </div>
      </div>
      <div class="notice notice-info">
        Note: AI document processing will only be initiated by the reviewing officer during official verification. Your document and details are securely stored directly in the government database.
      </div>
      <section class="card">
        <input id="document-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden />
        <div id="document-dropzone" class="dropzone" role="button" tabindex="0" aria-label="Choose a land document">
          <div class="dropzone-icon">📄</div>
          <h2>Drop your land document here</h2>
          <p>or click to select from your device</p>
          <button id="browse-document-btn" type="button" class="btn btn-outline">Browse files</button>
          <p class="helper-text">Supported: PDF, JPG, JPEG, PNG · Maximum 10 MB</p>
        </div>
        ${selectedFile ? `<div class="file-row" style="margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div><strong>${escapeHtml(selectedFile.name)}</strong><p style="margin: 0; font-size: 0.85rem; color: #64748b;">${fileSummary(selectedFile)}</p></div>
          <button id="remove-document-btn" class="btn btn-outline btn-sm">Remove</button>
        </div>` : ''}
        ${errorMessage ? `<div class="notice notice-error" style="margin-top: 1rem;">${escapeHtml(errorMessage)}</div>` : ''}

        <h3 style="margin-top: 1.5rem; margin-bottom: 0.5rem; font-size: 1.1rem; color: #1e293b;">Citizen Land Details</h3>
        <p style="margin-bottom: 1rem; font-size: 0.9rem; color: #64748b;">Enter manual details from your original deed. Aadhaar will be securely masked.</p>

        <div class="form-grid" style="display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
          <label class="field"><span>Owner Name *</span><input id="citizen-owner-name" class="form-control" value="${escapeHtml(manualDetails.owner_name)}" placeholder="e.g. Varadhan" required /></label>
          <label class="field"><span>Aadhaar Number *</span><input id="citizen-aadhaar-number" class="form-control" inputmode="numeric" value="${escapeHtml(manualDetails.aadhaar_number)}" placeholder="12-digit Aadhaar" required /></label>
          <label class="field"><span>Survey Number *</span><input id="citizen-survey-number" class="form-control" value="${escapeHtml(manualDetails.survey_number)}" placeholder="e.g. 13/3B or 928/375A" required /></label>
          <label class="field"><span>Sub-Division Number</span><input id="citizen-subdivision-number" class="form-control" value="${escapeHtml(manualDetails.subdivision_number)}" placeholder="e.g. 3B" /></label>
          <label class="field"><span>Area / Extent *</span><input id="citizen-area" class="form-control" value="${escapeHtml(manualDetails.area)}" placeholder="e.g. 0.06 or 2.35" required /></label>
          <label class="field">
            <span>Area Unit *</span>
            <select id="citizen-area-unit" class="form-control">
              ${['Acres', 'Hectares', 'Cents', 'Sq. Feet', 'Sq. Meters', 'Guntha'].map((u) => `
                <option value="${u}" ${manualDetails.area_unit === u ? 'selected' : ''}>${u}</option>
              `).join('')}
            </select>
          </label>
          <label class="field"><span>Village *</span><input id="citizen-village" class="form-control" value="${escapeHtml(manualDetails.village)}" placeholder="e.g. Alaputhur" required /></label>
          <label class="field"><span>Taluk *</span><input id="citizen-taluk" class="form-control" value="${escapeHtml(manualDetails.taluk)}" placeholder="e.g. Salem" required /></label>
          <label class="field"><span>District *</span><input id="citizen-district" class="form-control" value="${escapeHtml(manualDetails.district)}" placeholder="e.g. Salem" required /></label>
          <label class="field">
            <span>State *</span>
            <select id="citizen-state" class="form-control">
              ${INDIAN_STATES.map((s) => `
                <option value="${s}" ${manualDetails.state === s ? 'selected' : ''}>${s}</option>
              `).join('')}
            </select>
          </label>
          <label class="field">
            <span>Land Classification *</span>
            <select id="citizen-classification" class="form-control">
              ${[
                'Agricultural (Ryotwari)',
                'Agricultural (Nanjai/Wet)',
                'Agricultural (Punjai/Dry)',
                'Residential',
                'Commercial',
                'Industrial',
                'Grama Natham',
                'Poramboke / Government',
              ].map((c) => `
                <option value="${c}" ${manualDetails.classification === c ? 'selected' : ''}>${c}</option>
              `).join('')}
            </select>
          </label>
          <label class="field"><span>Patta Number (if available)</span><input id="citizen-patta-number" class="form-control" value="${escapeHtml(manualDetails.patta_number)}" placeholder="e.g. 2104" /></label>
          <label class="field">
            <span>Document Type</span>
            <select id="citizen-document-type" class="form-control">
              ${['Sale Deed', 'Settlement Deed', 'Patta Passbook', 'Partition Deed', 'Gift Deed', 'Title Deed', 'Court Decree'].map((d) => `
                <option value="${d}" ${manualDetails.document_type === d ? 'selected' : ''}>${d}</option>
              `).join('')}
            </select>
          </label>
          <label class="field"><span>Document Date</span><input id="citizen-document-date" type="date" class="form-control" value="${escapeHtml(manualDetails.document_date)}" /></label>
          <label class="field" style="grid-column: 1 / -1;"><span>Property Description / Remarks</span><input id="citizen-description" class="form-control" value="${escapeHtml(manualDetails.description)}" placeholder="Optional deed or boundary remarks" /></label>
        </div>

        ${duplicateWarning ? `
          <div class="notice notice-warning" style="margin-top: 1.25rem; border-left: 4px solid #f59e0b; background: #fffbeb; padding: 1rem; border-radius: 6px;">
            <div style="font-weight: 700; color: #b45309; font-size: 1.05rem;">${escapeHtml(duplicateWarning.warning)}</div>
            <p style="margin: 0.25rem 0 0.5rem; color: #92400e; font-weight: 600;">${escapeHtml(duplicateWarning.message)}</p>
            <small style="color: #78350f; display: block; line-height: 1.4;">
              Survey Number duplicate detected for this location. Possible reasons include ownership transfer, inheritance, mutation, subdivision, or duplicate data entry. Your application can still be submitted and will be flagged for Government Officer verification.
            </small>
          </div>
        ` : ''}

        <div class="upload-actions" style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
          <button id="process-document-btn" class="btn btn-primary" ${!selectedFile || uploadState === 'processing' ? 'disabled' : ''}>
            ${uploadState === 'processing' ? '<span class="spinner"></span> Submitting Application…' : 'Submit Land Application'}
          </button>
        </div>
      </section>
    </div>`;
}

export function attachUploadDocumentEvents() {
  const input = document.getElementById('document-file-input');
  const zone = document.getElementById('document-dropzone');
  const browse = document.getElementById('browse-document-btn');
  const remove = document.getElementById('remove-document-btn');
  const submit = document.getElementById('process-document-btn');

  const detailInputs = [
    ['owner_name', document.getElementById('citizen-owner-name')],
    ['aadhaar_number', document.getElementById('citizen-aadhaar-number')],
    ['survey_number', document.getElementById('citizen-survey-number')],
    ['subdivision_number', document.getElementById('citizen-subdivision-number')],
    ['area', document.getElementById('citizen-area')],
    ['area_unit', document.getElementById('citizen-area-unit')],
    ['village', document.getElementById('citizen-village')],
    ['taluk', document.getElementById('citizen-taluk')],
    ['district', document.getElementById('citizen-district')],
    ['state', document.getElementById('citizen-state')],
    ['classification', document.getElementById('citizen-classification')],
    ['patta_number', document.getElementById('citizen-patta-number')],
    ['document_type', document.getElementById('citizen-document-type')],
    ['document_date', document.getElementById('citizen-document-date')],
    ['description', document.getElementById('citizen-description')],
  ];

  for (const [fieldName, element] of detailInputs) {
    if (!element) continue;
    const updateHandler = (event) => {
      manualDetails[fieldName] = event.target.value;
      if (['survey_number', 'village', 'taluk', 'district'].includes(fieldName)) {
        triggerDuplicateCheck();
      }
    };
    element.addEventListener('input', updateHandler);
    element.addEventListener('change', updateHandler);
  }

  browse?.addEventListener('click', (event) => { event.stopPropagation(); input?.click(); });
  zone?.addEventListener('click', () => input?.click());
  zone?.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') input?.click(); });
  input?.addEventListener('change', () => setFile(input.files?.[0]));
  for (const type of ['dragenter', 'dragover']) zone?.addEventListener(type, (event) => { event.preventDefault(); zone.classList.add('active'); });
  for (const type of ['dragleave', 'drop']) zone?.addEventListener(type, (event) => { event.preventDefault(); zone.classList.remove('active'); });
  zone?.addEventListener('drop', (event) => setFile(event.dataTransfer?.files?.[0]));
  remove?.addEventListener('click', () => { selectedFile = null; errorMessage = ''; store.notify(); });

  submit?.addEventListener('click', async () => {
    if (!selectedFile) return;

    if (!manualDetails.owner_name?.trim() || !manualDetails.survey_number?.trim() ||
        !manualDetails.village?.trim() || !manualDetails.district?.trim()) {
      errorMessage = 'Please provide Owner Name, Survey Number, Village, and District.';
      store.notify();
      return;
    }

    uploadState = 'processing';
    errorMessage = '';
    store.notify();

    try {
      const citizenData = Object.fromEntries(
        Object.entries(manualDetails).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      );

      const result = await api.submitCitizenApplication(selectedFile, { citizenData });
      selectedFile = null;
      uploadState = 'idle';
      duplicateWarning = null;

      // Reset manual details
      for (const k of Object.keys(manualDetails)) {
        manualDetails[k] = '';
      }

      store.addToast('success', 'Land application submitted successfully! Status: PENDING OFFICER VERIFICATION.');
      // Refresh user documents and redirect to My Land Records
      await store.loadMyDocuments();
      store.setActiveTab('records');
    } catch (error) {
      if (error.status === 413 || error.code === 'FILE_TOO_LARGE') {
        errorMessage = 'File exceeds the 10 MB limit.';
      } else {
        errorMessage = error.status >= 500
          ? 'Application submission failed. Please try again or upload a clearer document.'
          : error.message;
      }
      uploadState = 'idle';
      store.notify();
    }
  });
}
