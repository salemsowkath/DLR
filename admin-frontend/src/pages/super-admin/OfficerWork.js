import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';

let officers = [];
let total = 0;
let isLoading = false;
let searchQuery = '';
let stateFilter = '';
let districtFilter = '';
let departmentFilter = '';
let statusFilter = '';
let sortBy = 'workload';
let sortOrder = 'DESC';

export function renderOfficerWork() {
  const totalApps = officers.reduce((sum, o) => sum + (o.totalApplications || 0), 0);
  const totalPending = officers.reduce((sum, o) => sum + (o.pendingApplications || 0), 0);
  const totalApproved = officers.reduce((sum, o) => sum + (o.approvedApplications || 0), 0);
  const totalRejected = officers.reduce((sum, o) => sum + (o.rejectedApplications || 0), 0);

  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800;">Officer Work Monitoring</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">OPERATIONS</span>
          </div>
          <p style="color: var(--text-muted);">Monitor real-time application processing, verification workloads, and decisions across all Land Revenue Officers.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button id="refresh-officer-work-btn" class="btn btn-outline btn-sm" title="Refresh Live Work Data">
            <span>🔄</span> Refresh Workload
          </button>
        </div>
      </div>

      <!-- Quick KPI Summary Strip -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Officers Monitored</div>
            <div class="value" style="font-size: 1.6rem; color: #818cf8;">${total}</div>
          </div>
          <div class="metric-icon" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">👮</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Total Handled</div>
            <div class="value" style="font-size: 1.6rem; color: #60a5fa;">${totalApps}</div>
          </div>
          <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">📝</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Pending Verification</div>
            <div class="value" style="font-size: 1.6rem; color: #fbbf24;">${totalPending}</div>
          </div>
          <div class="metric-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Approved Decisions</div>
            <div class="value" style="font-size: 1.6rem; color: #34d399;">${totalApproved}</div>
          </div>
          <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Rejected Decisions</div>
            <div class="value" style="font-size: 1.6rem; color: #f87171;">${totalRejected}</div>
          </div>
          <div class="metric-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">❌</div>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; align-items: center;">
          <div style="grid-column: span 2; min-width: 240px;">
            <input
              type="text"
              id="work-officer-search"
              class="form-control"
              placeholder="Search officer by ID, username, name, or area..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div>
            <select id="work-officer-state" class="form-control" style="appearance: auto;">
              <option value="">All States</option>
              <option value="Tamil Nadu" ${stateFilter === 'Tamil Nadu' ? 'selected' : ''}>Tamil Nadu</option>
              <option value="Karnataka" ${stateFilter === 'Karnataka' ? 'selected' : ''}>Karnataka</option>
              <option value="Kerala" ${stateFilter === 'Kerala' ? 'selected' : ''}>Kerala</option>
            </select>
          </div>
          <div>
            <select id="work-officer-district" class="form-control" style="appearance: auto;">
              <option value="">All Districts</option>
              <option value="Salem" ${districtFilter === 'Salem' ? 'selected' : ''}>Salem</option>
              <option value="Tiruvannamalai" ${districtFilter === 'Tiruvannamalai' ? 'selected' : ''}>Tiruvannamalai</option>
              <option value="Chennai" ${districtFilter === 'Chennai' ? 'selected' : ''}>Chennai</option>
              <option value="Coimbatore" ${districtFilter === 'Coimbatore' ? 'selected' : ''}>Coimbatore</option>
            </select>
          </div>
          <div>
            <select id="work-officer-status" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
              <option value="INACTIVE" ${statusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          <div>
            <select id="work-officer-sort" class="form-control" style="appearance: auto;">
              <option value="workload" ${sortBy === 'workload' ? 'selected' : ''}>Sort by Workload</option>
              <option value="recent_activity" ${sortBy === 'recent_activity' ? 'selected' : ''}>Sort by Recent Activity</option>
              <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
            </select>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem;">
          <button id="apply-officer-work-filters-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-officer-work-filters-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Officers Work Table -->
      <div class="card" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700;">Officer Work Performance Ledger</h2>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Showing ${officers.length} of ${total} officers</span>
        </div>

        ${
          isLoading
            ? `
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Querying officer workload and activity from MySQL...</p>
          </div>
        `
            : officers.length === 0
            ? `
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💼</div>
            <h3>No Officers Found</h3>
            <p>${searchQuery || statusFilter || districtFilter ? 'No officers match your filter criteria.' : 'No officers currently registered.'}</p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Officer ID</th>
                  <th style="padding: 0.75rem 1rem;">Name</th>
                  <th style="padding: 0.75rem 1rem;">State</th>
                  <th style="padding: 0.75rem 1rem;">District</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Applications</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Pending</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Approved</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Rejected</th>
                  <th style="padding: 0.75rem 1rem;">Last Activity</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${officers
                  .map(
                    (officer) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 700; color: var(--primary);">
                      ${escapeHtml(officer.officerId || officer.username || '—')}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      ${escapeHtml(officer.name)}
                      <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">${escapeHtml(officer.department || 'Land Records')}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${escapeHtml(officer.state || 'Tamil Nadu')}</td>
                    <td style="padding: 0.75rem 1rem; font-weight: 500;">${escapeHtml(officer.district || 'Salem')}</td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-weight: 700;">
                        ${officer.totalApplications}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge ${officer.pendingApplications > 0 ? 'badge-warning' : ''}" style="${officer.pendingApplications === 0 ? 'opacity:0.6;' : ''}">
                        ${officer.pendingApplications}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge ${officer.approvedApplications > 0 ? 'badge-success' : ''}" style="${officer.approvedApplications === 0 ? 'opacity:0.6;' : ''}">
                        ${officer.approvedApplications}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge ${officer.rejectedApplications > 0 ? 'badge-danger' : ''}" style="${officer.rejectedApplications === 0 ? 'opacity:0.6;' : ''}">
                        ${officer.rejectedApplications}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">
                      ${officer.lastActivity ? new Date(officer.lastActivity).toLocaleString() : '—'}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${officer.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                        ${escapeHtml(officer.status)}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right; white-space: nowrap;">
                      <button class="btn btn-primary btn-sm view-officer-work-btn" data-officer-id="${escapeHtml(officer.officerId || officer.username || officer.id)}">
                        <span>🔍</span> View Work
                      </button>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        }
      </div>
    </div>
  `;
}

export async function attachOfficerWorkEvents() {
  // Filter apply
  document.getElementById('apply-officer-work-filters-btn')?.addEventListener('click', async () => {
    searchQuery = document.getElementById('work-officer-search')?.value || '';
    stateFilter = document.getElementById('work-officer-state')?.value || '';
    districtFilter = document.getElementById('work-officer-district')?.value || '';
    statusFilter = document.getElementById('work-officer-status')?.value || '';
    sortBy = document.getElementById('work-officer-sort')?.value || 'workload';
    await fetchOfficerWorkData();
  });

  // Filter reset
  document.getElementById('reset-officer-work-filters-btn')?.addEventListener('click', async () => {
    searchQuery = '';
    stateFilter = '';
    districtFilter = '';
    departmentFilter = '';
    statusFilter = '';
    sortBy = 'workload';
    if (document.getElementById('work-officer-search')) document.getElementById('work-officer-search').value = '';
    if (document.getElementById('work-officer-state')) document.getElementById('work-officer-state').value = '';
    if (document.getElementById('work-officer-district')) document.getElementById('work-officer-district').value = '';
    if (document.getElementById('work-officer-status')) document.getElementById('work-officer-status').value = '';
    if (document.getElementById('work-officer-sort')) document.getElementById('work-officer-sort').value = 'workload';
    await fetchOfficerWorkData();
  });

  // Refresh
  document.getElementById('refresh-officer-work-btn')?.addEventListener('click', async () => {
    await fetchOfficerWorkData();
  });

  // Action: View Work
  document.querySelectorAll('.view-officer-work-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const officerId = btn.getAttribute('data-officer-id');
      if (officerId) {
        store.setActiveTab('super-admin-officer-detail', officerId);
        window.history.pushState(null, '', `/super-admin/officer-work/${encodeURIComponent(officerId)}`);
      }
    });
  });

  if (officers.length === 0 && !isLoading) {
    await fetchOfficerWorkData();
  }
}

async function fetchOfficerWorkData() {
  if (isLoading) return;
  isLoading = true;
  store.notify();

  try {
    const res = await api.getSuperAdminOfficerWork({
      search: searchQuery,
      state: stateFilter,
      district: districtFilter,
      department: departmentFilter,
      status: statusFilter,
      sortBy,
      sortOrder,
    });
    officers = res?.officers || res?.data?.officers || [];
    total = res?.total || res?.data?.total || officers.length;
  } catch (err) {
    store.addToast('error', err.message || 'Failed to load officer work metrics.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
