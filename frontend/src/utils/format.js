export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function statusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (['PROCESSED', 'APPROVED', 'PASS', 'VALID', 'COMPLETED'].includes(normalized)) return 'badge-success';
  if (['FAILED', 'REJECTED', 'CRITICAL', 'ERROR', 'INVALID'].includes(normalized)) return 'badge-danger';
  if (['WARNING', 'CORRECTION_REQUIRED', 'ON_HOLD', 'PENDING_REVIEW', 'IN_REVIEW', 'REVIEW_REQUIRED'].includes(normalized)) return 'badge-warning';
  return 'badge-info';
}

export function fieldValue(field) {
  return typeof field === 'object' && field !== null ? field.value : field;
}
