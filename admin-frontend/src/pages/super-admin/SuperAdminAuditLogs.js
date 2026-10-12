import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';

let auditLogs = [];
let total = 0;
let isLoading = false;
let actionFilter = '';
let actorFilter = '';
let dateFilter = '';
let page = 1;
const limit = 50;

export function renderSuperAdminAuditLogs() {
  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">System Audit Trail</h1>
          <p style="color: var(--text-muted);">Immutable audit logs recording every authentication, user management, and land-record action in MySQL.</p>
        </div>
        <button id="refresh-audits-btn" class="btn btn-outline btn-sm">
          <span>🔄</span> Refresh Logs
        </button>
      </div>

      <!-- Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 200px;">
            <input
              type="text"
              id="audit-action-input"
              class="form-control"
              placeholder="Filter by action (e.g. LOGIN, OFFICER_CREATED)..."
              value="${escapeHtml(actionFilter)}"
            />
          </div>
          <div style="flex: 1; min-width: 180px;">
            <input
              type="text"
              id="audit-actor-input"
              class="form-control"
              placeholder="Filter by actor reference/ID..."
              value="${escapeHtml(actorFilter)}"
            />
          </div>
          <div style="width: 170px;">
            <input
              type="date"
              id="audit-date-input"
              class="form-control"
              value="${escapeHtml(dateFilter)}"
            />
          </div>
          <button id="search-audits-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-audits-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <div class="card" style="padding: 1.5rem;">
        ${
          isLoading
            ? `
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Fetching audit events from MySQL...</p>
          </div>
        `
            : auditLogs.length === 0
            ? `
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📋</div>
            <h3>No Audit Logs Found</h3>
            <p>${actionFilter || actorFilter || dateFilter ? 'No events matched your filter criteria.' : 'No audit records logged yet.'}</p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Timestamp</th>
                  <th style="padding: 0.75rem 1rem;">Action</th>
                  <th style="padding: 0.75rem 1rem;">Actor Type</th>
                  <th style="padding: 0.75rem 1rem;">Actor Reference</th>
                  <th style="padding: 0.75rem 1rem;">Target Case</th>
                  <th style="padding: 0.75rem 1rem;">Safe Metadata</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${auditLogs
                  .map((log) => {
                    const isFailure = log.event_type.includes('FAIL') || log.event_type.includes('DENIED') || log.event_type.includes('REJECT');
                    return `
                      <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem; white-space: nowrap;">
                          ${new Date(log.created_at).toLocaleString()}
                        </td>
                        <td style="padding: 0.75rem 1rem; font-weight: 700;">
                          <span class="badge ${isFailure ? 'badge-danger' : log.event_type.includes('LOGIN') ? 'badge-primary' : 'badge-success'}">
                            ${escapeHtml(log.event_type)}
                          </span>
                        </td>
                        <td style="padding: 0.75rem 1rem;">
                          <span style="font-weight: 600;">${escapeHtml(log.actor_type || 'SYSTEM')}</span>
                        </td>
                        <td style="padding: 0.75rem 1rem; font-family: monospace; font-size: 0.8rem; color: var(--text-subtle);">
                          ${escapeHtml(String(log.actor_reference || '—'))}
                        </td>
                        <td style="padding: 0.75rem 1rem; font-size: 0.8rem;">
                          ${log.case_id ? `<span class="badge badge-outline">${escapeHtml(log.case_id)}</span>` : '—'}
                        </td>
                        <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(JSON.stringify(log.metadata || {}))}">
                          ${escapeHtml(JSON.stringify(log.metadata || {}))}
                        </td>
                        <td style="padding: 0.75rem 1rem;">
                          <span class="badge ${isFailure ? 'badge-danger' : 'badge-success'}">
                            ${isFailure ? 'FLAGGED' : 'SUCCESS'}
                          </span>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
          <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--text-muted);">
            <div>Showing ${auditLogs.length} of ${total} audit records in MySQL</div>
          </div>
        `
        }
      </div>
    </div>
  `;
}

export async function attachSuperAdminAuditLogsEvents() {
  const refreshBtn = document.getElementById('refresh-audits-btn');
  refreshBtn?.addEventListener('click', () => loadAuditLogs());

  const searchBtn = document.getElementById('search-audits-btn');
  searchBtn?.addEventListener('click', () => {
    actionFilter = document.getElementById('audit-action-input')?.value?.trim() || '';
    actorFilter = document.getElementById('audit-actor-input')?.value?.trim() || '';
    dateFilter = document.getElementById('audit-date-input')?.value || '';
    loadAuditLogs();
  });

  const resetBtn = document.getElementById('reset-audits-btn');
  resetBtn?.addEventListener('click', () => {
    actionFilter = '';
    actorFilter = '';
    dateFilter = '';
    loadAuditLogs();
  });

  const actionInput = document.getElementById('audit-action-input');
  actionInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      actionFilter = e.target.value.trim();
      loadAuditLogs();
    }
  });

  if (auditLogs.length === 0 && !isLoading) {
    await loadAuditLogs();
  }
}

async function loadAuditLogs() {
  isLoading = true;
  store.notify();
  try {
    const res = await api.getSuperAdminAuditLogs({
      action: actionFilter,
      actor: actorFilter,
      date: dateFilter,
      page,
      limit,
    });
    const data = res?.data || res;
    auditLogs = data.events || [];
    total = data.total || auditLogs.length;
  } catch (err) {
    store.addToast('error', err.message || 'Failed to fetch audit logs.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
