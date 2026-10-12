import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';

let ministers = [];
let total = 0;
let isLoading = false;
let searchQuery = '';
let stateFilter = '';
let departmentFilter = '';
let statusFilter = '';
let sortBy = 'activity';
let sortOrder = 'DESC';

export function renderMinisterWork() {
  const totalMonitored = ministers.reduce((sum, m) => sum + (m.recordsMonitored || 0), 0);
  const totalActions = ministers.reduce((sum, m) => sum + (m.actionsCount || 0), 0);
  const totalReports = ministers.reduce((sum, m) => sum + (m.reportsViewed || 0), 0);

  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800;">Minister Work Monitoring</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">OPERATIONS</span>
          </div>
          <p style="color: var(--text-muted);">Surveillance of executive oversight, minister review decisions, monitored records, and report telemetry.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button id="refresh-minister-work-btn" class="btn btn-outline btn-sm" title="Refresh Live Minister Work">
            <span>🔄</span> Refresh Workload
          </button>
        </div>
      </div>

      <!-- Quick KPI Strip -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Ministers Monitored</div>
            <div class="value" style="font-size: 1.6rem; color: #c084fc;">${total}</div>
          </div>
          <div class="metric-icon" style="background: rgba(192, 132, 252, 0.15); color: #a855f7;">🏛️</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Monitored Records</div>
            <div class="value" style="font-size: 1.6rem; color: #60a5fa;">${totalMonitored}</div>
          </div>
          <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">📜</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Governance Actions</div>
            <div class="value" style="font-size: 1.6rem; color: #38bdf8;">${totalActions}</div>
          </div>
          <div class="metric-icon" style="background: rgba(56, 189, 248, 0.15); color: #0284c7;">⚡</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Reports Viewed</div>
            <div class="value" style="font-size: 1.6rem; color: #34d399;">${totalReports}</div>
          </div>
          <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">📊</div>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="card" style="padding: 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; align-items: center;">
          <div style="grid-column: span 2; min-width: 240px;">
            <input
              type="text"
              id="work-minister-search"
              class="form-control"
              placeholder="Search minister by ID, username, name, department..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div>
            <select id="work-minister-state" class="form-control" style="appearance: auto;">
              <option value="">All States</option>
              <option value="Tamil Nadu" ${stateFilter === 'Tamil Nadu' ? 'selected' : ''}>Tamil Nadu</option>
              <option value="Karnataka" ${stateFilter === 'Karnataka' ? 'selected' : ''}>Karnataka</option>
              <option value="Kerala" ${stateFilter === 'Kerala' ? 'selected' : ''}>Kerala</option>
            </select>
          </div>
          <div>
            <select id="work-minister-department" class="form-control" style="appearance: auto;">
              <option value="">All Departments</option>
              <option value="Revenue" ${departmentFilter === 'Revenue' ? 'selected' : ''}>Revenue</option>
              <option value="Revenue Administration" ${departmentFilter === 'Revenue Administration' ? 'selected' : ''}>Revenue Administration</option>
              <option value="Land Records" ${departmentFilter === 'Land Records' ? 'selected' : ''}>Land Records</option>
            </select>
          </div>
          <div>
            <select id="work-minister-status" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
              <option value="INACTIVE" ${statusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          <div>
            <select id="work-minister-sort" class="form-control" style="appearance: auto;">
              <option value="activity" ${sortBy === 'activity' ? 'selected' : ''}>Sort by Activity</option>
              <option value="records" ${sortBy === 'records' ? 'selected' : ''}>Sort by Records</option>
              <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
            </select>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem;">
          <button id="apply-minister-work-filters-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-minister-work-filters-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Ministers Work Table -->
      <div class="card" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700;">Minister Oversight & Telemetry Ledger</h2>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Showing ${ministers.length} of ${total} ministers</span>
        </div>

        ${
          isLoading
            ? `
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Loading minister governance logs from MySQL...</p>
          </div>
        `
            : ministers.length === 0
            ? `
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏛️</div>
            <h3>No Ministers Found</h3>
            <p>${searchQuery || statusFilter ? 'No ministers match your query.' : 'No ministers currently registered.'}</p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Minister ID</th>
                  <th style="padding: 0.75rem 1rem;">Name</th>
                  <th style="padding: 0.75rem 1rem;">State</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Records Monitored</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Pending</th>
                  <th style="padding: 0.75rem 1rem; text-align: center;">Actions</th>
                  <th style="padding: 0.75rem 1rem;">Last Activity</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${ministers
                  .map(
                    (m) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 700; color: #a855f7;">
                      ${escapeHtml(m.ministerId || m.username || '—')}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      ${escapeHtml(m.name)}
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${escapeHtml(m.state || 'Tamil Nadu')}</td>
                    <td style="padding: 0.75rem 1rem;">${escapeHtml(m.department || 'Revenue')}</td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #6366f1; font-weight: 700;">
                        ${m.recordsMonitored}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge badge-warning">
                        ${m.pendingItems}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: center;">
                      <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #0284c7; font-weight: 700;">
                        ${m.actionsCount}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">
                      ${m.lastActivity ? new Date(m.lastActivity).toLocaleString() : '—'}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${m.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                        ${escapeHtml(m.status)}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right; white-space: nowrap;">
                      <button class="btn btn-primary btn-sm view-minister-work-btn" data-minister-id="${escapeHtml(m.ministerId || m.username || m.id)}">
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

export async function attachMinisterWorkEvents() {
  document.getElementById('apply-minister-work-filters-btn')?.addEventListener('click', async () => {
    searchQuery = document.getElementById('work-minister-search')?.value || '';
    stateFilter = document.getElementById('work-minister-state')?.value || '';
    departmentFilter = document.getElementById('work-minister-department')?.value || '';
    statusFilter = document.getElementById('work-minister-status')?.value || '';
    sortBy = document.getElementById('work-minister-sort')?.value || 'activity';
    await fetchMinisterWorkData();
  });

  document.getElementById('reset-minister-work-filters-btn')?.addEventListener('click', async () => {
    searchQuery = '';
    stateFilter = '';
    departmentFilter = '';
    statusFilter = '';
    sortBy = 'activity';
    if (document.getElementById('work-minister-search')) document.getElementById('work-minister-search').value = '';
    if (document.getElementById('work-minister-state')) document.getElementById('work-minister-state').value = '';
    if (document.getElementById('work-minister-department')) document.getElementById('work-minister-department').value = '';
    if (document.getElementById('work-minister-status')) document.getElementById('work-minister-status').value = '';
    if (document.getElementById('work-minister-sort')) document.getElementById('work-minister-sort').value = 'activity';
    await fetchMinisterWorkData();
  });

  document.getElementById('refresh-minister-work-btn')?.addEventListener('click', async () => {
    await fetchMinisterWorkData();
  });

  document.querySelectorAll('.view-minister-work-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ministerId = btn.getAttribute('data-minister-id');
      if (ministerId) {
        store.setActiveTab('super-admin-minister-detail', ministerId);
        window.history.pushState(null, '', `/super-admin/minister-work/${encodeURIComponent(ministerId)}`);
      }
    });
  });

  if (ministers.length === 0 && !isLoading) {
    await fetchMinisterWorkData();
  }
}

async function fetchMinisterWorkData() {
  if (isLoading) return;
  isLoading = true;
  store.notify();

  try {
    const res = await api.getSuperAdminMinisterWork({
      search: searchQuery,
      state: stateFilter,
      department: departmentFilter,
      status: statusFilter,
      sortBy,
      sortOrder,
    });
    ministers = res?.ministers || res?.data?.ministers || [];
    total = res?.total || res?.data?.total || ministers.length;
  } catch (err) {
    store.addToast('error', err.message || 'Failed to load minister work metrics.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
