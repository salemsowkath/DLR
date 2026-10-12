import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml, formatDate } from '../../utils/format.js';

let citizens = [];
let total = 0;
let isLoading = false;
let searchQuery = '';
let districtFilter = '';

export function renderStateAdminCitizens() {
  const user = store.user || {};
  const stateName = user.state_name || user.state || 'Tamil Nadu';

  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">Citizens Directory</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">${escapeHtml(stateName)}</span>
          </div>
          <p style="color: var(--text-muted);">
            Directory of registered citizens belonging to <strong>${escapeHtml(stateName)}</strong>. Aadhaar details are masked for privacy compliance.
          </p>
        </div>
      </div>

      <!-- Search Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="state-admin-citizen-search"
              class="form-control"
              placeholder="Search by name, reference ID, or district..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div style="width: 200px;">
            <input
              type="text"
              id="state-admin-citizen-district-filter"
              class="form-control"
              placeholder="Filter by district..."
              value="${escapeHtml(districtFilter)}"
            />
          </div>
          <button id="state-admin-filter-citizens-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="state-admin-reset-citizens-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Citizens Table -->
      <div class="card" style="padding: 1.5rem;">
        ${
          isLoading
            ? `
          <div class="loading-state" style="padding: 3rem 0; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading citizen directory for ${escapeHtml(stateName)}...</p>
          </div>
        `
            : citizens.length === 0
            ? `
          <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👤</div>
            <h3 style="font-weight: 700;">No Citizens Found in ${escapeHtml(stateName)}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              ${searchQuery || districtFilter ? 'No citizen records match the search filter.' : `No citizens currently registered in ${escapeHtml(stateName)}.`}
            </p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Citizen Name</th>
                  <th style="padding: 0.75rem 1rem;">Masked Identifier</th>
                  <th style="padding: 0.75rem 1rem;">District</th>
                  <th style="padding: 0.75rem 1rem;">Phone</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem;">Registered</th>
                </tr>
              </thead>
              <tbody>
                ${citizens
                  .map(
                    (c) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      <div>${escapeHtml(c.name || 'Citizen User')}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(c.email || '—')}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      🔒 ${escapeHtml(maskAadhaarRef(c.external_reference || c.username))}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge badge-secondary" style="font-weight: 600;">
                        📍 ${escapeHtml(c.district || 'Unassigned')}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">
                      ${escapeHtml(c.phone ? maskPhone(c.phone) : '—')}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                        ${c.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${formatDate(c.created_at)}
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            <div>Showing ${citizens.length} citizen(s) in ${escapeHtml(stateName)}</div>
          </div>
        `
        }
      </div>
    </div>
  `;
}

function maskAadhaarRef(ref) {
  if (!ref) return 'XXXX-XXXX-XXXX';
  const clean = String(ref).replace(/^AADHAAR-/, '');
  if (clean.length >= 4) {
    return `XXXX-XXXX-${clean.slice(-4)}`;
  }
  return 'XXXX-XXXX-XXXX';
}

function maskPhone(phone) {
  if (!phone) return '—';
  const str = String(phone);
  if (str.length >= 4) {
    return `XXXXXX${str.slice(-4)}`;
  }
  return 'XXXXXXXXXX';
}

export function attachStateAdminCitizensEvents() {
  document.getElementById('state-admin-filter-citizens-btn')?.addEventListener('click', () => {
    searchQuery = (document.getElementById('state-admin-citizen-search')?.value || '').trim();
    districtFilter = (document.getElementById('state-admin-citizen-district-filter')?.value || '').trim();
    void loadCitizens();
  });

  document.getElementById('state-admin-reset-citizens-filter-btn')?.addEventListener('click', () => {
    searchQuery = '';
    districtFilter = '';
    void loadCitizens();
  });

  if (citizens.length === 0 && !isLoading) {
    void loadCitizens();
  }
}

async function loadCitizens() {
  isLoading = true;
  store.notify();

  try {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (districtFilter) params.district = districtFilter;

    const data = await api.getStateAdminCitizens(params);
    citizens = data?.citizens || data?.users || [];
    total = data?.total || citizens.length;
  } catch (err) {
    store.addToast('error', err.message || 'Failed to load citizens.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
