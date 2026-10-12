import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml, formatDate } from '../../utils/format.js';

let records = [];
let totalRecords = 0;
let isLoading = false;
let searchQuery = '';
let statusFilter = '';
let selectedRecord = null;
let page = 1;
const limit = 20;

export function renderSuperAdminLandRecords() {
  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">Land Records Overview</h1>
          <p style="color: var(--text-muted);">State-wide land parcel records, OCR extraction status, and verification state in MySQL.</p>
        </div>
        <button id="refresh-records-btn" class="btn btn-outline btn-sm">
          <span>🔄</span> Refresh Records
        </button>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 260px;">
            <input
              type="text"
              id="records-search-input"
              class="form-control"
              placeholder="Search by owner name, survey number, or record ref..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div style="width: 200px;">
            <select id="records-status-select" class="form-control">
              <option value="">All Verification States</option>
              <option value="VERIFIED" ${statusFilter === 'VERIFIED' ? 'selected' : ''}>Verified</option>
              <option value="PENDING_VERIFICATION" ${statusFilter === 'PENDING_VERIFICATION' ? 'selected' : ''}>Pending Verification</option>
              <option value="NEEDS_REVIEW" ${statusFilter === 'NEEDS_REVIEW' ? 'selected' : ''}>Needs Review</option>
              <option value="DISPUTED" ${statusFilter === 'DISPUTED' ? 'selected' : ''}>Disputed</option>
              <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
            </select>
          </div>
          <button id="search-records-btn" class="btn btn-secondary btn-sm">Search</button>
          <button id="reset-records-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Land Records Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface);">
          <div style="font-weight: 700; font-size: 0.95rem;">
            Total Records: <span style="color: var(--primary);">${totalRecords}</span>
          </div>
          ${isLoading ? '<div style="font-size: 0.85rem; color: var(--text-muted);">Loading land records...</div>' : ''}
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
            <thead>
              <tr style="background: var(--bg-surface-elevated, rgba(0,0,0,0.02)); border-bottom: 1px solid var(--border-color); color: var(--text-subtle); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">
                <th style="padding: 0.85rem 1rem;">Record Ref</th>
                <th style="padding: 0.85rem 1rem;">Owner Name</th>
                <th style="padding: 0.85rem 1rem;">Survey No</th>
                <th style="padding: 0.85rem 1rem;">Location (Vill / Taluk / Dist)</th>
                <th style="padding: 0.85rem 1rem;">Area</th>
                <th style="padding: 0.85rem 1rem;">Status</th>
                <th style="padding: 0.85rem 1rem;">AI Status</th>
                <th style="padding: 0.85rem 1rem;">Created</th>
                <th style="padding: 0.85rem 1rem; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                records.length === 0
                  ? `
                <tr>
                  <td colspan="9" style="padding: 3rem 1rem; text-align: center; color: var(--text-muted);">
                    ${isLoading ? 'Fetching records...' : 'No land records found matching criteria.'}
                  </td>
                </tr>
              `
                  : records
                      .map((rec) => {
                        const statusBadge =
                          rec.verification_status === 'VERIFIED' || rec.status === 'ACTIVE'
                            ? '<span class="badge badge-success">Verified</span>'
                            : rec.verification_status === 'DISPUTED' || rec.is_duplicate
                            ? '<span class="badge badge-danger">Disputed / Dupl</span>'
                            : '<span class="badge badge-warning">Pending Review</span>';

                        const aiBadge = rec.ai_status
                          ? `<span class="badge badge-info" style="font-size: 0.72rem;">${escapeHtml(rec.ai_status)}</span>`
                          : '<span style="color: var(--text-muted); font-size: 0.75rem;">—</span>';

                        const location = [rec.village, rec.taluk, rec.district].filter(Boolean).join(', ') || '—';
                        const areaStr = rec.area_value ? `${rec.area_value} ${rec.area_unit || 'Acres'}` : '—';

                        return `
                        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;">
                          <td style="padding: 0.85rem 1rem; font-family: monospace; font-weight: 600; color: var(--primary);">
                            ${escapeHtml(rec.record_reference || rec.id || '—')}
                          </td>
                          <td style="padding: 0.85rem 1rem; font-weight: 600;">
                            ${escapeHtml(rec.owner_name || '—')}
                          </td>
                          <td style="padding: 0.85rem 1rem;">
                            <span style="background: rgba(0,0,0,0.05); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-family: monospace;">
                              ${escapeHtml(rec.survey_number || '—')}
                            </span>
                          </td>
                          <td style="padding: 0.85rem 1rem; color: var(--text-muted); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(location)}">
                            ${escapeHtml(location)}
                          </td>
                          <td style="padding: 0.85rem 1rem; font-weight: 500;">
                            ${escapeHtml(areaStr)}
                          </td>
                          <td style="padding: 0.85rem 1rem;">
                            ${statusBadge}
                          </td>
                          <td style="padding: 0.85rem 1rem;">
                            ${aiBadge}
                          </td>
                          <td style="padding: 0.85rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                            ${formatDate(rec.created_at)}
                          </td>
                          <td style="padding: 0.85rem 1rem; text-align: right;">
                            <button class="btn btn-outline btn-xs view-record-btn" data-id="${rec.id}">
                              View
                            </button>
                          </td>
                        </tr>
                      `;
                      })
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Record Details Modal -->
      <div id="record-details-modal" class="modal-backdrop" style="display: ${selectedRecord ? 'flex' : 'none'};">
        <div class="modal-card" style="max-width: 650px; width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <h3 style="margin: 0; font-weight: 800;">Land Record Specification</h3>
            <button class="btn-close close-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer;">&times;</button>
          </div>

          ${
            selectedRecord
              ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Record Ref</label>
                <div style="font-family: monospace; font-weight: 700; color: var(--primary);">${escapeHtml(selectedRecord.record_reference || selectedRecord.id)}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Owner Name</label>
                <div style="font-weight: 700;">${escapeHtml(selectedRecord.owner_name || '—')}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Survey Number</label>
                <div style="font-family: monospace; font-weight: 700;">${escapeHtml(selectedRecord.survey_number || '—')}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Classification</label>
                <div>${escapeHtml(selectedRecord.classification || 'Agricultural / Ryotwari')}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Area</label>
                <div>${selectedRecord.area_value ? `${selectedRecord.area_value} ${selectedRecord.area_unit || 'Acres'}` : '—'}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Duplicate Check</label>
                <div>${selectedRecord.is_duplicate ? '<span class="badge badge-danger">Potential Duplicate Detected</span>' : '<span class="badge badge-success">Unique Parcel</span>'}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">State / District</label>
                <div>${escapeHtml([selectedRecord.state, selectedRecord.district].filter(Boolean).join(', ') || '—')}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Taluk / Village</label>
                <div>${escapeHtml([selectedRecord.taluk, selectedRecord.village].filter(Boolean).join(', ') || '—')}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">AI Extraction Status</label>
                <div>${escapeHtml(selectedRecord.ai_status || 'Processed')}</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Verification State</label>
                <div>${escapeHtml(selectedRecord.verification_status || selectedRecord.status || 'ACTIVE')}</div>
              </div>
            </div>
            ${
              selectedRecord.duplicate_reason
                ? `
              <div style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid var(--danger); padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.85rem;">
                <strong>Duplicate Reason:</strong> ${escapeHtml(selectedRecord.duplicate_reason)}
              </div>
            `
                : ''
            }
          `
              : ''
          }

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <button class="btn btn-secondary close-modal-btn">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function attachSuperAdminLandRecordsEvents() {
  const refreshBtn = document.getElementById('refresh-records-btn');
  const searchBtn = document.getElementById('search-records-btn');
  const resetBtn = document.getElementById('reset-records-btn');
  const searchInput = document.getElementById('records-search-input');
  const statusSelect = document.getElementById('records-status-select');

  refreshBtn?.addEventListener('click', loadRecords);

  searchBtn?.addEventListener('click', () => {
    searchQuery = searchInput?.value.trim() || '';
    statusFilter = statusSelect?.value || '';
    page = 1;
    loadRecords();
  });

  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchQuery = searchInput.value.trim();
      statusFilter = statusSelect?.value || '';
      page = 1;
      loadRecords();
    }
  });

  statusSelect?.addEventListener('change', () => {
    statusFilter = statusSelect.value;
    page = 1;
    loadRecords();
  });

  resetBtn?.addEventListener('click', () => {
    searchQuery = '';
    statusFilter = '';
    page = 1;
    if (searchInput) searchInput.value = '';
    if (statusSelect) statusSelect.value = '';
    loadRecords();
  });

  document.querySelectorAll('.view-record-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      selectedRecord = records.find((r) => String(r.id) === String(id)) || null;
      store.notify();
    });
  });

  document.querySelectorAll('.close-modal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedRecord = null;
      store.notify();
    });
  });

  if (records.length === 0 && !isLoading) {
    loadRecords();
  }
}

async function loadRecords() {
  try {
    isLoading = true;
    store.notify();

    const res = await api.getSuperAdminLandRecords({
      search: searchQuery || undefined,
      status: statusFilter || undefined,
      page,
      limit,
    });

    const data = res?.data || res || {};
    records = data.records || [];
    totalRecords = data.total || records.length;
  } catch (error) {
    console.error('Failed to load land records:', error);
    store.addToast(error.message || 'Failed to load land records', 'error');
  } finally {
    isLoading = false;
    store.notify();
  }
}
