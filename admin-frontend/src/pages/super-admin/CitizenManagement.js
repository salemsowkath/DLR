import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';

let citizens = [];
let total = 0;
let isLoading = false;
let searchQuery = '';
let statusFilter = '';
let districtFilter = '';
let villageFilter = '';
let activeCitizen = null;
let showDetailsModal = false;

export function renderCitizenManagement() {
  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">Citizen Management</h1>
          <p style="color: var(--text-muted);">Manage registered citizen identities, view privacy-compliant masked profiles, and control account status.</p>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 2; min-width: 240px;">
            <input
              type="text"
              id="citizen-search-input"
              class="form-control"
              placeholder="Search by citizen name, district, or village..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div style="flex: 1; min-width: 150px;">
            <input
              type="text"
              id="citizen-district-input"
              class="form-control"
              placeholder="Filter district..."
              value="${escapeHtml(districtFilter)}"
            />
          </div>
          <div style="width: 160px;">
            <select id="citizen-status-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active Only</option>
              <option value="INACTIVE" ${statusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive Only</option>
            </select>
          </div>
          <button id="search-citizens-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-citizens-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Citizens Table -->
      <div class="card" style="padding: 1.5rem;">
        ${
          isLoading
            ? `
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Loading citizens from MySQL...</p>
          </div>
        `
            : citizens.length === 0
            ? `
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👤</div>
            <h3>No Citizen Records Found</h3>
            <p>${searchQuery || statusFilter || districtFilter ? 'No citizens match the selected filters.' : 'No citizen accounts registered yet in MySQL.'}</p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Name</th>
                  <th style="padding: 0.75rem 1rem;">Protected Aadhaar</th>
                  <th style="padding: 0.75rem 1rem;">District</th>
                  <th style="padding: 0.75rem 1rem;">Taluk</th>
                  <th style="padding: 0.75rem 1rem;">Village</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem;">Registered</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${citizens
                  .map(
                    (citizen) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">${escapeHtml(citizen.name)}</td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary); font-weight: 600;">
                      ${escapeHtml(citizen.maskedAadhaar || citizen.masked_aadhaar || 'XXXX-XXXX-••••')}
                    </td>
                    <td style="padding: 0.75rem 1rem;">${escapeHtml(citizen.district || '—')}</td>
                    <td style="padding: 0.75rem 1rem;">${escapeHtml(citizen.taluk || '—')}</td>
                    <td style="padding: 0.75rem 1rem;">${escapeHtml(citizen.village || '—')}</td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${citizen.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                        ${citizen.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${citizen.created_at ? new Date(citizen.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end;">
                        <button class="btn btn-outline btn-sm view-citizen-btn" data-id="${citizen.id}" title="View Details">
                          🔍 View
                        </button>
                        <button class="btn ${citizen.status === 'ACTIVE' ? 'btn-secondary' : 'btn-primary'} btn-sm toggle-citizen-status-btn" data-id="${citizen.id}" data-current="${citizen.status}">
                          ${citizen.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            Showing ${citizens.length} of ${total} registered citizens in MySQL
          </div>
        `
        }
      </div>

      <!-- Citizen Details Modal -->
      ${renderCitizenDetailsModal()}
    </div>
  `;
}

function renderCitizenDetailsModal() {
  if (!showDetailsModal || !activeCitizen) return '';
  const c = activeCitizen;

  return `
    <div class="modal-overlay" id="citizen-details-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Citizen Identity Details</h2>
          <button id="close-citizen-details-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Full Legal Name</span>
            <span style="font-weight: 600;">${escapeHtml(c.name)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Aadhaar Status</span>
            <span style="font-family: monospace; font-weight: 700; color: var(--primary);">
              ${escapeHtml(c.maskedAadhaar || c.masked_aadhaar || 'XXXX-XXXX-••••')} (Protected)
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Date of Birth</span>
            <span>${escapeHtml(c.date_of_birth || c.dateOfBirth || '—')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Gender</span>
            <span>${escapeHtml(c.gender || '—')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Village</span>
            <span>${escapeHtml(c.village || '—')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Taluk</span>
            <span>${escapeHtml(c.taluk || '—')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">District</span>
            <span>${escapeHtml(c.district || '—')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">State & Pincode</span>
            <span>${escapeHtml(c.state || 'Tamil Nadu')} - ${escapeHtml(c.pincode || '')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Account Status</span>
            <span class="badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">${c.status}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Registration Timestamp</span>
            <span style="font-size: 0.82rem; color: var(--text-muted);">${c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</span>
          </div>
        </div>

        <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
          <button id="close-citizen-details-btn-2" class="btn btn-primary btn-sm">Close</button>
        </div>
      </div>
    </div>
  `;
}

export async function attachCitizenManagementEvents() {
  const searchInput = document.getElementById('citizen-search-input');
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchQuery = e.target.value.trim();
      loadCitizens();
    }
  });

  const searchBtn = document.getElementById('search-citizens-btn');
  searchBtn?.addEventListener('click', () => {
    searchQuery = document.getElementById('citizen-search-input')?.value?.trim() || '';
    districtFilter = document.getElementById('citizen-district-input')?.value?.trim() || '';
    statusFilter = document.getElementById('citizen-status-select')?.value || '';
    loadCitizens();
  });

  const resetBtn = document.getElementById('reset-citizens-filter-btn');
  resetBtn?.addEventListener('click', () => {
    searchQuery = '';
    districtFilter = '';
    statusFilter = '';
    loadCitizens();
  });

  // View Details
  const viewBtns = document.querySelectorAll('.view-citizen-btn');
  viewBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeCitizen = citizens.find((c) => c.id === id);
      if (activeCitizen) {
        showDetailsModal = true;
        store.notify();
      }
    });
  });

  const closeBtns = [
    document.getElementById('close-citizen-details-btn'),
    document.getElementById('close-citizen-details-btn-2'),
  ];
  closeBtns.forEach((btn) => {
    btn?.addEventListener('click', () => {
      showDetailsModal = false;
      activeCitizen = null;
      store.notify();
    });
  });

  // Toggle Citizen Status
  const toggleBtns = document.querySelectorAll('.toggle-citizen-status-btn');
  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const current = btn.getAttribute('data-current');
      const newStatus = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      try {
        await api.setCitizenStatus(id, newStatus);
        store.addToast('success', `Citizen account marked as ${newStatus}.`);
        await loadCitizens();
      } catch (err) {
        store.addToast('error', err.message || 'Failed to update citizen status.');
      }
    });
  });

  if (citizens.length === 0 && !isLoading) {
    await loadCitizens();
  }
}

async function loadCitizens() {
  isLoading = true;
  store.notify();
  try {
    const res = await api.getSuperAdminCitizens({
      search: searchQuery,
      district: districtFilter,
      status: statusFilter,
    });
    const data = res?.data || res;
    citizens = data.citizens || [];
    total = data.total || citizens.length;
  } catch (err) {
    store.addToast('error', err.message || 'Failed to fetch citizens from MySQL.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
