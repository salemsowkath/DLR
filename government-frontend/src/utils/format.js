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
  if (['WARNING', 'CORRECTION_REQUIRED', 'ON_HOLD', 'PENDING_REVIEW', 'IN_REVIEW', 'REVIEW_REQUIRED', 'PENDING_OFFICER_VERIFICATION'].includes(normalized)) return 'badge-warning';
  return 'badge-info';
}

export function normalizeFieldValue(val, fallback = 'Officer Verification Required') {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '—' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'NOT_DETECTED' || trimmed === '[object Object]') {
      return fallback;
    }
    return trimmed;
  }
  if (typeof val === 'number') {
    return String(val);
  }
  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return fallback;
    return val.map((item) => normalizeFieldValue(item, '')).filter(Boolean).join(', ') || fallback;
  }
  if (typeof val === 'object') {
    if (val.value !== undefined && val.value !== null) {
      return normalizeFieldValue(val.value, fallback);
    }
    if (val.text !== undefined && val.text !== null) {
      return normalizeFieldValue(val.text, fallback);
    }
    if (val.name !== undefined && val.name !== null) {
      return normalizeFieldValue(val.name, fallback);
    }
    const keys = Object.keys(val);
    if (keys.length === 0) return fallback;
    const vals = keys.map((k) => `${k}: ${normalizeFieldValue(val[k], '')}`).filter((s) => !s.endsWith(': '));
    if (vals.length > 0) return vals.join('; ');
    return fallback;
  }
  return String(val) || fallback;
}

export function fieldValue(field, fallback = '—') {
  return normalizeFieldValue(field, fallback);
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : num.toLocaleString('en-IN');
}
