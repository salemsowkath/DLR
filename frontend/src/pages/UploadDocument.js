import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';

let selectedFile = null;
let uploadState = 'idle';
let errorMessage = '';

const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
const maxBytes = 5 * 1024 * 1024;

function fileSummary(file) {
  return `${escapeHtml(file.name)} · ${(file.size / 1024 / 1024).toFixed(2)} MB · ${escapeHtml(file.type || 'unknown')}`;
}

function setFile(file) {
  errorMessage = '';
  if (!file) return;
  if (!acceptedTypes.includes(file.type) || file.size > maxBytes) {
    selectedFile = null;
    errorMessage = file.size > maxBytes
      ? 'The file exceeds the 5 MB limit.'
      : 'Upload a PDF, JPG, JPEG, or PNG document.';
  } else {
    selectedFile = file;
  }
  store.notify();
}

export function renderUploadDocument() {
  return `
    <div class="page-content narrow-page">
      <div class="page-heading"><div><h1>Upload land document</h1><p>Submit a PDF or clear image for OCR, extraction, validation, and officer review when required.</p></div></div>
      <div class="notice notice-info">AI output is advisory. A government officer remains responsible for verification and approval.</div>
      <section class="card">
        <input id="document-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden />
        <div id="document-dropzone" class="dropzone" role="button" tabindex="0" aria-label="Choose a land document">
          <div class="dropzone-icon">⇧</div><h2>Drop your document here</h2><p>or select a file from your device</p>
          <button id="browse-document-btn" type="button" class="btn btn-outline">Browse files</button>
          <p class="helper-text">PDF, JPG, JPEG, or PNG · maximum 5 MB</p>
        </div>
        ${selectedFile ? `<div class="file-row"><div><strong>${escapeHtml(selectedFile.name)}</strong><p>${fileSummary(selectedFile)}</p></div><button id="remove-document-btn" class="btn btn-outline btn-sm">Remove</button></div>` : ''}
        ${errorMessage ? `<div class="notice notice-error">${escapeHtml(errorMessage)}</div>` : ''}
        <div class="upload-actions"><button id="process-document-btn" class="btn btn-primary" ${!selectedFile || uploadState === 'processing' ? 'disabled' : ''}>${uploadState === 'processing' ? '<span class="spinner"></span> Processing document…' : 'Upload and process document'}</button></div>
      </section>
    </div>`;
}

export function attachUploadDocumentEvents() {
  const input = document.getElementById('document-file-input');
  const zone = document.getElementById('document-dropzone');
  const browse = document.getElementById('browse-document-btn');
  const remove = document.getElementById('remove-document-btn');
  const submit = document.getElementById('process-document-btn');
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
    uploadState = 'processing'; errorMessage = ''; store.notify();
    try {
      const result = await api.processDocument(selectedFile);
      selectedFile = null;
      store.addToast('success', 'Document processed successfully.');
      store.setLastProcessResult(result);
    } catch (error) {
      errorMessage = error.status >= 500 ? 'Document processing failed. Please try again or upload a clearer document.' : error.message;
      uploadState = 'idle'; store.notify();
    }
  });
}
