import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';

export function renderProfile() {
  const user = store.user || {};
  const identity = String(user.external_reference || '').replace(/^AADHAAR-/, '') || 'Not available';
  return `<div class="page-content narrow-page"><div class="page-heading"><h1>Citizen profile</h1><p>Account information provided by your authenticated session.</p></div><section class="card"><div class="detail-list"><div class="detail-row"><span>Name</span><strong>${escapeHtml(user.name || 'Citizen')}</strong></div><div class="detail-row"><span>Identity reference</span><strong>${escapeHtml(identity)}</strong></div><div class="detail-row"><span>Role</span><strong>${escapeHtml(user.primary_role || user.roles?.[0] || 'CITIZEN')}</strong></div><div class="detail-row"><span>Account status</span><strong>${escapeHtml(user.status || 'ACTIVE')}</strong></div></div></section></div>`;
}
export function attachProfileEvents() {}
