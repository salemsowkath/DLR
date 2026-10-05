import { store } from '../store.js';
import { escapeHtml, fieldValue, statusClass } from '../utils/format.js';

const steps = ['Document uploaded', 'OCR processing', 'Information extraction', 'AI validation', 'GIS validation', 'Officer review'];

function labelFor(name) {
  return String(name).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderField(name, field) {
  const confidence = typeof field === 'object' ? field.confidence : null;
  const value = fieldValue(field);
  return `<div class="result-field"><dt>${escapeHtml(labelFor(name))}</dt><dd>${escapeHtml(value ?? 'Not extracted')}${typeof confidence === 'number' ? `<span>Confidence: ${Math.round(confidence * 100)}%</span>` : ''}${typeof confidence === 'number' && confidence < 0.8 ? '<small class="warning-text">Officer verification required</small>' : ''}</dd></div>`;
}

export function renderProcessingResult() {
  const result = store.lastProcessResult;
  if (!result) {
    return `<div class="page-content"><div class="empty-state"><h1>No processing result selected</h1><p>Choose a document from My Land Records to view its results.</p><button id="go-records" class="btn btn-primary">My Land Records</button></div></div>`;
  }
  const reviewStatus = result.review?.required ? (result.review.status || 'PENDING_REVIEW') : 'NO_REVIEW_REQUIRED';
  const validation = result.validation || {};
  const issues = validation.issues || [];
  return `<div class="page-content">
    <div class="page-heading heading-actions"><div><h1>Processing result</h1><p>${escapeHtml(result.document?.filename || 'Land document')} · ${escapeHtml(result.document?.document_id || '')}</p></div><button id="view-processed-record" class="btn btn-outline">View saved record</button></div>
    <div class="notice notice-info">Extraction and validation results support officer review. They are not a legal land-record determination.</div>
    <section class="card"><h2>Processing workflow</h2><div class="pipeline-steps">${steps.map((step, index) => `<div class="step-item completed"><span class="step-icon">✓</span><span>${step}</span>${index === 5 ? `<span class="badge ${statusClass(reviewStatus)}">${escapeHtml(reviewStatus)}</span>` : ''}</div>`).join('')}</div></section>
    <div class="two-column">
      <section class="card"><h2>Extracted land-record information</h2><dl class="result-grid">${Object.entries(result.extraction || {}).map(([name, field]) => renderField(name, field)).join('') || '<p>No structured fields were returned.</p>'}</dl></section>
      <section class="card"><h2>Validation summary</h2><p><span class="badge ${statusClass(validation.status)}">${escapeHtml(validation.status || 'UNAVAILABLE')}</span></p><p class="metric-inline">Confidence score: <strong>${validation.score ?? '—'}</strong></p>${issues.length ? `<ul class="issue-list">${issues.map((issue) => `<li><span class="badge ${statusClass(issue.severity)}">${escapeHtml(issue.severity || 'WARNING')}</span> ${escapeHtml(issue.message || issue.rule || 'Validation issue')}</li>`).join('')}</ul>` : '<p class="muted">No validation issues were reported.</p>'}<h3>GIS validation</h3><p><span class="badge ${statusClass(result.gis?.status)}">${escapeHtml(result.gis?.status || 'UNAVAILABLE')}</span></p><p class="muted">${result.gis?.status === 'UNAVAILABLE' ? 'No geometry was supplied with this document.' : `Area comparison: ${escapeHtml(result.gis?.area_match || 'Unavailable')}`}</p></section>
    </div>
  </div>`;
}

export function attachProcessingResultEvents() {
  document.getElementById('go-records')?.addEventListener('click', () => store.setActiveTab('my-records'));
  document.getElementById('view-processed-record')?.addEventListener('click', () => store.setActiveTab('record-details', store.lastProcessResult?.document?.document_id));
}
