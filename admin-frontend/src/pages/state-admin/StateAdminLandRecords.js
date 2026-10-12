import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml, formatDate } from '../../utils/format.js';

let activeSubTab = 'records'; // 'records' | 'applications'
let records = [];
let applications = [];
let isLoading = false;
let searchQuery = '';
let districtFilter = '';
let statusFilter = '';
let selectedItem = null;
let showDetailModal = false;

export function renderStateAdminLandRecords() {
  const user = store.user || {};
  const stateName = user.state_name || user.state || 'Tamil Nadu';

  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">State Land Records & Applications</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">${escapeHtml(stateName)}</span>
          </div>
          <p style="color: var(--text-muted);">
            Digitized land parcels and registration workflows strictly inside <strong>${escapeHtml(stateName)}</strong> across all districts.
          </p>
        </div>
      </div>

      <!-- Sub Tabs: Land Records vs Applications -->
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
        <button
          id="sa-subtab-records"
          class="btn ${activeSubTab === 'records' ? 'btn-primary' : 'btn-outline'} btn-sm"
        >
          📜 Land Records
        </button>
        <button
          id="sa-subtab-apps"
          class="btn ${activeSubTab === 'applications' ? 'btn-primary' : 'btn-outline'} btn-sm"
        >
          📝 Applications & Workflow
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="state-admin-records-search"
              class="form-control"
              placeholder="Search by survey number, owner name, or village..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div style="width: 180px;">
            <input
              type="text"
              id="state-admin-records-district-filter"
              class="form-control"
              placeholder="Filter by district..."
              value="${escapeHtml(districtFilter)}"
            />
          </div>
          <button id="state-admin-filter-records-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="state-admin-reset-records-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Content Table -->
      <div class="card" style="padding: 1.5rem;">
        ${
          isLoading
            ? `
          <div class="loading-state" style="padding: 3rem 0; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading data for ${escapeHtml(stateName)}...</p>
          </div>
        `
            : activeSubTab === 'records'
            ? renderRecordsTable(stateName)
            : renderApplicationsTable(stateName)
        }
      </div>

      <!-- Detail Modal -->
      ${renderDetailModal()}
    </div>
  `;
}

function renderRecordsTable(stateName) {
  if (records.length === 0) {
    return `
      <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📜</div>
        <h3 style="font-weight: 700;">No Land Records Found</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          No land records match the filter criteria in ${escapeHtml(stateName)}.
        </p>
      </div>
    `;
  }

  return `
    <div class="table-container" style="overflow-x: auto;">
      <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
            <th style="padding: 0.75rem 1rem;">Survey Number</th>
            <th style="padding: 0.75rem 1rem;">Owner Name</th>
            <th style="padding: 0.75rem 1rem;">Location (District / Village)</th>
            <th style="padding: 0.75rem 1rem;">Area / Extent</th>
            <th style="padding: 0.75rem 1rem;">AI Validation</th>
            <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${records
            .map(
              (r) => `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 0.75rem 1rem; font-weight: 700; font-family: monospace; color: var(--primary);">
                ${escapeHtml(r.survey_number || r.plot_number || 'N/A')}
              </td>
              <td style="padding: 0.75rem 1rem; font-weight: 600;">
                ${escapeHtml(r.owner_name || '—')}
              </td>
              <td style="padding: 0.75rem 1rem;">
                <span class="badge badge-secondary" style="font-weight: 600;">
                  📍 ${escapeHtml(r.district || '—')}
                </span>
                <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.35rem;">
                  ${escapeHtml(r.village || r.taluk || '')}
                </span>
              </td>
              <td style="padding: 0.75rem 1rem; color: var(--text-muted);">
                ${escapeHtml(r.extent_acres ? `${r.extent_acres} Acres` : r.area_sqft ? `${r.area_sqft} sq ft` : '—')}
              </td>
              <td style="padding: 0.75rem 1rem;">
                <span class="badge ${r.ai_status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}">
                  ${r.ai_status || 'PENDING'}
                </span>
              </td>
              <td style="padding: 0.75rem 1rem; text-align: right;">
                <button class="btn btn-outline btn-sm sa-view-record-detail-btn" data-id="${r.id}">
                  👁️ Inspect
                </button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
      <div>Showing ${records.length} land record(s) in ${escapeHtml(stateName)}</div>
    </div>
  `;
}

function renderApplicationsTable(stateName) {
  if (applications.length === 0) {
    return `
      <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📝</div>
        <h3 style="font-weight: 700;">No Applications Found</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          No review cases or applications match the query in ${escapeHtml(stateName)}.
        </p>
      </div>
    `;
  }

  return `
    <div class="table-container" style="overflow-x: auto;">
      <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
            <th style="padding: 0.75rem 1rem;">Case / App ID</th>
            <th style="padding: 0.75rem 1rem;">Survey / Property</th>
            <th style="padding: 0.75rem 1rem;">District</th>
            <th style="padding: 0.75rem 1rem;">Workflow Status</th>
            <th style="padding: 0.75rem 1rem;">Created</th>
            <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${applications
            .map(
              (a) => `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 700; color: var(--primary);">
                ${escapeHtml(a.case_id || a.application_id || a.id)}
              </td>
              <td style="padding: 0.75rem 1rem; font-weight: 600;">
                ${escapeHtml(a.survey_number || a.document_id || 'Application Parcel')}
              </td>
              <td style="padding: 0.75rem 1rem;">
                <span class="badge badge-secondary" style="font-weight: 600;">
                  📍 ${escapeHtml(a.district || 'Unassigned')}
                </span>
              </td>
              <td style="padding: 0.75rem 1rem;">
                <span class="badge ${getStatusBadgeClass(a.status)}">
                  ${escapeHtml(a.status || 'PENDING')}
                </span>
              </td>
              <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted);">
                ${formatDate(a.created_at)}
              </td>
              <td style="padding: 0.75rem 1rem; text-align: right;">
                <button class="btn btn-outline btn-sm sa-view-app-detail-btn" data-id="${a.case_id || a.application_id || a.id}">
                  🔍 Details
                </button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
      <div>Showing ${applications.length} application(s) in ${escapeHtml(stateName)}</div>
    </div>
  `;
}

function getStatusBadgeClass(status) {
  const s = String(status || '').toUpperCase();
  if (s.includes('APPROV')) return 'badge-success';
  if (s.includes('REJECT')) return 'badge-danger';
  if (s.includes('HOLD') || s.includes('CORRECTION')) return 'badge-warning';
  return 'badge-primary';
}

function renderDetailModal() {
  if (!showDetailModal || !selectedItem) return '';
  return `
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 600px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); max-height: 85vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Record Details & Metadata</h2>
          <button id="close-sa-detail-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-weight: 600;">ID / Survey No:</span>
            <span style="font-family: monospace; font-weight: 700; color: var(--primary);">${escapeHtml(selectedItem.id || selectedItem.case_id || selectedItem.survey_number)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-weight: 600;">State Scope:</span>
            <span>📍 ${escapeHtml(selectedItem.state || 'Tamil Nadu')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-weight: 600;">District:</span>
            <span>${escapeHtml(selectedItem.district || 'Unassigned')}</span>
          </div>

          ${selectedItem.owner_name ? `
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted); font-weight: 600;">Owner:</span>
              <span style="font-weight: 600;">${escapeHtml(selectedItem.owner_name)}</span>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-weight: 600;">Status:</span>
            <span><span class="badge ${getStatusBadgeClass(selectedItem.status || selectedItem.ai_status)}">${escapeHtml(selectedItem.status || selectedItem.ai_status || 'ACTIVE')}</span></span>
          </div>

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-weight: 600;">Created At:</span>
            <span style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(selectedItem.created_at)}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
          <button id="ok-sa-detail-modal-btn" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `;
}

export function attachStateAdminLandRecordsEvents() {
  document.getElementById('sa-subtab-records')?.addEventListener('click', () => {
    activeSubTab = 'records';
    void loadData();
  });

  document.getElementById('sa-subtab-apps')?.addEventListener('click', () => {
    activeSubTab = 'applications';
    void loadData();
  });

  document.getElementById('state-admin-filter-records-btn')?.addEventListener('click', () => {
    searchQuery = (document.getElementById('state-admin-records-search')?.value || '').trim();
    districtFilter = (document.getElementById('state-admin-records-district-filter')?.value || '').trim();
    void loadData();
  });

  document.getElementById('state-admin-reset-records-filter-btn')?.addEventListener('click', () => {
    searchQuery = '';
    districtFilter = '';
    void loadData();
  });

  document.querySelectorAll('.sa-view-record-detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      selectedItem = records.find((r) => r.id === id) || null;
      if (selectedItem) {
        showDetailModal = true;
        store.notify();
      }
    });
  });

  document.querySelectorAll('.sa-view-app-detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      selectedItem = applications.find((a) => (a.case_id || a.application_id || a.id) === id) || null;
      if (selectedItem) {
        showDetailModal = true;
        store.notify();
      }
    });
  });

  document.getElementById('close-sa-detail-modal-btn')?.addEventListener('click', () => {
    showDetailModal = false;
    selectedItem = null;
    store.notify();
  });

  document.getElementById('ok-sa-detail-modal-btn')?.addEventListener('click', () => {
    showDetailModal = false;
    selectedItem = null;
    store.notify();
  });

  if (records.length === 0 && applications.length === 0 && !isLoading) {
    void loadData();
  }
}

async function loadData() {
  isLoading = true;
  store.notify();

  try {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (districtFilter) params.district = districtFilter;

    if (activeSubTab === 'records') {
      const data = await api.getStateAdminLandRecords(params);
      records = data?.records || data?.land_records || [];
    } else {
      const data = await api.getStateAdminApplications(params);
      applications = data?.applications || data?.cases || [];
    }
  } catch (err) {
    store.addToast('error', err.message || 'Failed to load records.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
