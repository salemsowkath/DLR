import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';
import { INDIAN_STATES } from '../../utils/states.js';

let officers = [];
let total = 0;
let isLoading = false;
let searchQuery = '';
let statusFilter = '';
let showAddModal = false;
let showEditModal = false;
let showResetPasswordModal = false;
let activeOfficer = null;
let formError = '';
let formSubmitting = false;

export function renderOfficerManagement() {
  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">Officer Management</h1>
          <p style="color: var(--text-muted);">Manage Land Revenue Officers, activate/deactivate access, and reset officer credentials.</p>
        </div>
        <button id="open-add-officer-modal-btn" class="btn btn-primary">
          <span>➕</span> Add Officer
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="officer-search-input"
              class="form-control"
              placeholder="Search by name, username, district, or department..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div style="width: 180px;">
            <select id="officer-status-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active Only</option>
              <option value="INACTIVE" ${statusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive Only</option>
            </select>
          </div>
          <button id="search-officers-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-officers-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Officers Table -->
      <div class="card" style="padding: 1.5rem;">
        ${
          isLoading
            ? `
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Loading officers from MySQL...</p>
          </div>
        `
            : officers.length === 0
            ? `
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👮</div>
            <h3>No Officers Found</h3>
            <p>${searchQuery || statusFilter ? 'No officers match your query.' : 'Click "+ Add Officer" to create a new Land Revenue Officer.'}</p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Name</th>
                  <th style="padding: 0.75rem 1rem;">Username</th>
                  <th style="padding: 0.75rem 1rem;">Email</th>
                  <th style="padding: 0.75rem 1rem;">District</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem;">Created</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${officers
                  .map(
                    (officer) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">${escapeHtml(officer.name)}</td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">${escapeHtml(officer.username || officer.external_reference)}</td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${escapeHtml(officer.email || '—')}</td>
                    <td style="padding: 0.75rem 1rem;">${escapeHtml(officer.district || '—')}</td>
                    <td style="padding: 0.75rem 1rem;">${escapeHtml(officer.department || 'Land Records')}</td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${officer.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                        ${officer.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${officer.created_at ? new Date(officer.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end;">
                        <button class="btn btn-outline btn-sm edit-officer-btn" data-id="${officer.id}" title="Edit Officer">
                          ✏️ Edit
                        </button>
                        <button class="btn ${officer.status === 'ACTIVE' ? 'btn-secondary' : 'btn-primary'} btn-sm toggle-status-btn" data-id="${officer.id}" data-current="${officer.status}">
                          ${officer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="btn btn-outline btn-sm reset-pwd-btn" data-id="${officer.id}" title="Reset Password">
                          🔑 Reset
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
            Showing ${officers.length} of ${total} officer accounts in MySQL
          </div>
        `
        }
      </div>

      <!-- Add Officer Modal -->
      ${renderAddOfficerModal()}

      <!-- Edit Officer Modal -->
      ${renderEditOfficerModal()}

      <!-- Reset Password Modal -->
      ${renderResetPasswordModal()}
    </div>
  `;
}

function renderAddOfficerModal() {
  if (!showAddModal) return '';
  return `
    <div class="modal-overlay" id="add-officer-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Add New Land Revenue Officer</h2>
          <button id="close-add-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="add-officer-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-officer-name">Full Name *</label>
            <input type="text" id="add-officer-name" class="form-control" placeholder="e.g. R. Subramanian" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="add-officer-username">Username *</label>
              <input type="text" id="add-officer-username" class="form-control" placeholder="e.g. officer_salem_01" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="add-officer-email">Email Address</label>
              <input type="email" id="add-officer-email" class="form-control" placeholder="officer@tn.gov.in" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-officer-password">Temporary Password *</label>
            <input type="password" id="add-officer-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="add-officer-state">State *</label>
              <select id="add-officer-state" class="form-control" required style="appearance: auto;">
                ${INDIAN_STATES.map((s) => `<option value="${escapeHtml(s)}" ${s === 'Tamil Nadu' ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="add-officer-district">District *</label>
              <input type="text" id="add-officer-district" class="form-control" placeholder="e.g. Salem" required />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="add-officer-department">Department</label>
            <input type="text" id="add-officer-department" class="form-control" value="Land Records & Revenue" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-add-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Creating...' : 'Create Officer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderEditOfficerModal() {
  if (!showEditModal || !activeOfficer) return '';
  return `
    <div class="modal-overlay" id="edit-officer-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 500px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Edit Officer Profile</h2>
          <button id="close-edit-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="edit-officer-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">Username (Immutable)</label>
            <input type="text" class="form-control" value="${escapeHtml(activeOfficer.username || activeOfficer.external_reference)}" disabled />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-officer-name">Full Name *</label>
            <input type="text" id="edit-officer-name" class="form-control" value="${escapeHtml(activeOfficer.name)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-officer-email">Email</label>
            <input type="email" id="edit-officer-email" class="form-control" value="${escapeHtml(activeOfficer.email || '')}" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="edit-officer-state">State *</label>
              <select id="edit-officer-state" class="form-control" style="appearance: auto;">
                ${INDIAN_STATES.map((s) => `
                  <option value="${escapeHtml(s)}" ${(activeOfficer.state || 'Tamil Nadu').toLowerCase() === s.toLowerCase() ? 'selected' : ''}>
                    ${escapeHtml(s)}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-officer-district">District</label>
              <input type="text" id="edit-officer-district" class="form-control" value="${escapeHtml(activeOfficer.district || '')}" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="edit-officer-department">Department</label>
            <input type="text" id="edit-officer-department" class="form-control" value="${escapeHtml(activeOfficer.department || 'Land Records')}" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-edit-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderResetPasswordModal() {
  if (!showResetPasswordModal || !activeOfficer) return '';
  return `
    <div class="modal-overlay" id="reset-pwd-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 450px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Reset Officer Password</h2>
          <button id="close-reset-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
          Resetting password for <strong>${escapeHtml(activeOfficer.name)}</strong> (<code>${escapeHtml(activeOfficer.username || activeOfficer.external_reference)}</code>).
        </p>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="reset-password-form">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="new-officer-password">New Password *</label>
            <input type="password" id="new-officer-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-reset-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export async function attachOfficerManagementEvents() {
  const addBtn = document.getElementById('open-add-officer-modal-btn');
  addBtn?.addEventListener('click', () => {
    showAddModal = true;
    formError = '';
    store.notify();
  });

  const closeAddBtn = document.getElementById('close-add-modal-btn');
  const cancelAddBtn = document.getElementById('cancel-add-modal-btn');
  [closeAddBtn, cancelAddBtn].forEach((btn) => {
    btn?.addEventListener('click', () => {
      showAddModal = false;
      store.notify();
    });
  });

  const addForm = document.getElementById('add-officer-form');
  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-officer-name')?.value?.trim();
    const username = document.getElementById('add-officer-username')?.value?.trim();
    const email = document.getElementById('add-officer-email')?.value?.trim();
    const password = document.getElementById('add-officer-password')?.value;
    const state = document.getElementById('add-officer-state')?.value?.trim();
    const district = document.getElementById('add-officer-district')?.value?.trim();
    const department = document.getElementById('add-officer-department')?.value?.trim();

    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      await api.createOfficer({ name, username, email, password, state, district, department });
      showAddModal = false;
      store.addToast('success', `Officer "${username}" created successfully.`);
      await loadOfficers();
    } catch (err) {
      formError = err.message || 'Failed to create officer.';
      store.addToast('error', formError);
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  // Search & Filter
  const searchInput = document.getElementById('officer-search-input');
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchQuery = e.target.value.trim();
      loadOfficers();
    }
  });

  const searchBtn = document.getElementById('search-officers-btn');
  searchBtn?.addEventListener('click', () => {
    searchQuery = document.getElementById('officer-search-input')?.value?.trim() || '';
    statusFilter = document.getElementById('officer-status-select')?.value || '';
    loadOfficers();
  });

  const resetBtn = document.getElementById('reset-officers-filter-btn');
  resetBtn?.addEventListener('click', () => {
    searchQuery = '';
    statusFilter = '';
    loadOfficers();
  });

  // Edit Officer
  const editBtns = document.querySelectorAll('.edit-officer-btn');
  editBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeOfficer = officers.find((o) => o.id === id);
      if (activeOfficer) {
        showEditModal = true;
        formError = '';
        store.notify();
      }
    });
  });

  const closeEditBtn = document.getElementById('close-edit-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-modal-btn');
  [closeEditBtn, cancelEditBtn].forEach((btn) => {
    btn?.addEventListener('click', () => {
      showEditModal = false;
      activeOfficer = null;
      store.notify();
    });
  });

  const editForm = document.getElementById('edit-officer-form');
  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeOfficer) return;
    const name = document.getElementById('edit-officer-name')?.value?.trim();
    const email = document.getElementById('edit-officer-email')?.value?.trim();
    const state = document.getElementById('edit-officer-state')?.value?.trim();
    const district = document.getElementById('edit-officer-district')?.value?.trim();
    const department = document.getElementById('edit-officer-department')?.value?.trim();

    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      await api.updateOfficer(activeOfficer.id, { name, email, state, district, department });
      showEditModal = false;
      activeOfficer = null;
      store.addToast('success', 'Officer profile updated.');
      await loadOfficers();
    } catch (err) {
      formError = err.message || 'Failed to update officer.';
      store.addToast('error', formError);
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  // Toggle Status (Activate / Deactivate)
  const toggleStatusBtns = document.querySelectorAll('.toggle-status-btn');
  toggleStatusBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const current = btn.getAttribute('data-current');
      const newStatus = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      try {
        await api.setOfficerStatus(id, newStatus);
        store.addToast('success', `Officer account marked as ${newStatus}.`);
        await loadOfficers();
      } catch (err) {
        store.addToast('error', err.message || 'Failed to update officer status.');
      }
    });
  });

  // Reset Password
  const resetBtns = document.querySelectorAll('.reset-pwd-btn');
  resetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeOfficer = officers.find((o) => o.id === id);
      if (activeOfficer) {
        showResetPasswordModal = true;
        formError = '';
        store.notify();
      }
    });
  });

  const closeResetBtn = document.getElementById('close-reset-modal-btn');
  const cancelResetBtn = document.getElementById('cancel-reset-modal-btn');
  [closeResetBtn, cancelResetBtn].forEach((btn) => {
    btn?.addEventListener('click', () => {
      showResetPasswordModal = false;
      activeOfficer = null;
      store.notify();
    });
  });

  const resetPwdForm = document.getElementById('reset-password-form');
  resetPwdForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeOfficer) return;
    const newPassword = document.getElementById('new-officer-password')?.value;
    if (!newPassword || newPassword.length < 6) {
      formError = 'Password must be at least 6 characters.';
      store.notify();
      return;
    }

    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      await api.resetOfficerPassword(activeOfficer.id, newPassword);
      showResetPasswordModal = false;
      activeOfficer = null;
      store.addToast('success', 'Password reset successfully.');
    } catch (err) {
      formError = err.message || 'Failed to reset password.';
      store.addToast('error', formError);
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  if (officers.length === 0 && !isLoading) {
    await loadOfficers();
  }
}

async function loadOfficers() {
  isLoading = true;
  store.notify();
  try {
    const res = await api.getSuperAdminOfficers({ search: searchQuery, status: statusFilter });
    const data = res?.data || res;
    officers = data.officers || [];
    total = data.total || officers.length;
  } catch (err) {
    store.addToast('error', err.message || 'Failed to fetch officers from MySQL.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
