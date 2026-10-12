import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';
import { INDIAN_STATES } from '../../utils/states.js';

let ministers = [];
let total = 0;
let isLoading = false;
let searchQuery = '';
let statusFilter = '';
let showAddModal = false;
let showEditModal = false;
let showResetPasswordModal = false;
let activeMinister = null;
let formError = '';
let formSubmitting = false;

export function renderMinisterManagement() {
  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">Minister Management</h1>
          <p style="color: var(--text-muted);">Manage Ministry and Executive Administrator accounts, departmental access, and security credentials.</p>
        </div>
        <button id="open-add-minister-modal-btn" class="btn btn-primary">
          <span>➕</span> Add Minister
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="minister-search-input"
              class="form-control"
              placeholder="Search by name, username, or department..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div style="width: 180px;">
            <select id="minister-status-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active Only</option>
              <option value="INACTIVE" ${statusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive Only</option>
            </select>
          </div>
          <button id="search-ministers-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-ministers-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Ministers Table -->
      <div class="card" style="padding: 1.5rem;">
        ${
          isLoading
            ? `
          <div class="loading-state">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Loading ministers from MySQL...</p>
          </div>
        `
            : ministers.length === 0
            ? `
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏛️</div>
            <h3>No Ministers Found</h3>
            <p>${searchQuery || statusFilter ? 'No ministers match your query.' : 'Click "+ Add Minister" to create a new Ministry executive account.'}</p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Name</th>
                  <th style="padding: 0.75rem 1rem;">Username</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem;">State</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem;">Created</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${ministers
                  .map(
                    (minister) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">${escapeHtml(minister.name)}</td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">${escapeHtml(minister.username || minister.external_reference)}</td>
                    <td style="padding: 0.75rem 1rem;">${escapeHtml(minister.department || 'Revenue')}</td>
                    <td style="padding: 0.75rem 1rem;">${escapeHtml(minister.state || 'Tamil Nadu')}</td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${minister.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                        ${minister.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${minister.created_at ? new Date(minister.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end;">
                        <button class="btn btn-outline btn-sm edit-minister-btn" data-id="${minister.id}" title="Edit Minister">
                          ✏️ Edit
                        </button>
                        <button class="btn ${minister.status === 'ACTIVE' ? 'btn-secondary' : 'btn-primary'} btn-sm toggle-minister-status-btn" data-id="${minister.id}" data-current="${minister.status}">
                          ${minister.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="btn btn-outline btn-sm reset-minister-pwd-btn" data-id="${minister.id}" title="Reset Password">
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
            Showing ${ministers.length} of ${total} minister accounts in MySQL
          </div>
        `
        }
      </div>

      <!-- Add Minister Modal -->
      ${renderAddMinisterModal()}

      <!-- Edit Minister Modal -->
      ${renderEditMinisterModal()}

      <!-- Reset Password Modal -->
      ${renderResetPasswordModal()}
    </div>
  `;
}

function renderAddMinisterModal() {
  if (!showAddModal) return '';
  return `
    <div class="modal-overlay" id="add-minister-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Add New Minister Account</h2>
          <button id="close-add-minister-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="add-minister-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-minister-name">Full Name *</label>
            <input type="text" id="add-minister-name" class="form-control" placeholder="e.g. Thiru. M. K. Anbalagan" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="add-minister-username">Username *</label>
              <input type="text" id="add-minister-username" class="form-control" placeholder="e.g. minister_revenue" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="add-minister-email">Email Address</label>
              <input type="email" id="add-minister-email" class="form-control" placeholder="minister.rev@tn.gov.in" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-minister-password">Temporary Password *</label>
            <input type="password" id="add-minister-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 1.5rem;">
            <div class="form-group">
              <label class="form-label" for="add-minister-state">State *</label>
              <select id="add-minister-state" class="form-control" required style="appearance: auto;">
                ${INDIAN_STATES.map((s) => `<option value="${escapeHtml(s)}" ${s === 'Tamil Nadu' ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="add-minister-department">Department</label>
              <input type="text" id="add-minister-department" class="form-control" value="Revenue & Disaster Management" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-add-minister-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Creating...' : 'Create Minister'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderEditMinisterModal() {
  if (!showEditModal || !activeMinister) return '';
  return `
    <div class="modal-overlay" id="edit-minister-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 500px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Edit Minister Profile</h2>
          <button id="close-edit-minister-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="edit-minister-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">Username (Immutable)</label>
            <input type="text" class="form-control" value="${escapeHtml(activeMinister.username || activeMinister.external_reference)}" disabled />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-minister-name">Full Name *</label>
            <input type="text" id="edit-minister-name" class="form-control" value="${escapeHtml(activeMinister.name)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-minister-email">Email</label>
            <input type="email" id="edit-minister-email" class="form-control" value="${escapeHtml(activeMinister.email || '')}" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 1.5rem;">
            <div class="form-group">
              <label class="form-label" for="edit-minister-state">State *</label>
              <select id="edit-minister-state" class="form-control" style="appearance: auto;">
                ${INDIAN_STATES.map((s) => `
                  <option value="${escapeHtml(s)}" ${(activeMinister.state || 'Tamil Nadu').toLowerCase() === s.toLowerCase() ? 'selected' : ''}>
                    ${escapeHtml(s)}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-minister-department">Department</label>
              <input type="text" id="edit-minister-department" class="form-control" value="${escapeHtml(activeMinister.department || 'Revenue')}" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-edit-minister-modal-btn" class="btn btn-outline">Cancel</button>
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
  if (!showResetPasswordModal || !activeMinister) return '';
  return `
    <div class="modal-overlay" id="reset-minister-pwd-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 450px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Reset Minister Password</h2>
          <button id="close-reset-minister-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
          Resetting password for <strong>${escapeHtml(activeMinister.name)}</strong> (<code>${escapeHtml(activeMinister.username || activeMinister.external_reference)}</code>).
        </p>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="reset-minister-password-form">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="new-minister-password">New Password *</label>
            <input type="password" id="new-minister-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-reset-minister-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export async function attachMinisterManagementEvents() {
  const addBtn = document.getElementById('open-add-minister-modal-btn');
  addBtn?.addEventListener('click', () => {
    showAddModal = true;
    formError = '';
    store.notify();
  });

  const closeAddBtn = document.getElementById('close-add-minister-modal-btn');
  const cancelAddBtn = document.getElementById('cancel-add-minister-modal-btn');
  [closeAddBtn, cancelAddBtn].forEach((btn) => {
    btn?.addEventListener('click', () => {
      showAddModal = false;
      store.notify();
    });
  });

  const addForm = document.getElementById('add-minister-form');
  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-minister-name')?.value?.trim();
    const username = document.getElementById('add-minister-username')?.value?.trim();
    const email = document.getElementById('add-minister-email')?.value?.trim();
    const password = document.getElementById('add-minister-password')?.value;
    const state = document.getElementById('add-minister-state')?.value?.trim();
    const department = document.getElementById('add-minister-department')?.value?.trim();

    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      await api.createMinister({ name, username, email, password, state, department });
      showAddModal = false;
      store.addToast('success', `Minister "${username}" created successfully.`);
      await loadMinisters();
    } catch (err) {
      formError = err.message || 'Failed to create minister.';
      store.addToast('error', formError);
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  // Search & Filter
  const searchInput = document.getElementById('minister-search-input');
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchQuery = e.target.value.trim();
      loadMinisters();
    }
  });

  const searchBtn = document.getElementById('search-ministers-btn');
  searchBtn?.addEventListener('click', () => {
    searchQuery = document.getElementById('minister-search-input')?.value?.trim() || '';
    statusFilter = document.getElementById('minister-status-select')?.value || '';
    loadMinisters();
  });

  const resetBtn = document.getElementById('reset-ministers-filter-btn');
  resetBtn?.addEventListener('click', () => {
    searchQuery = '';
    statusFilter = '';
    loadMinisters();
  });

  // Edit Minister
  const editBtns = document.querySelectorAll('.edit-minister-btn');
  editBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeMinister = ministers.find((m) => m.id === id);
      if (activeMinister) {
        showEditModal = true;
        formError = '';
        store.notify();
      }
    });
  });

  const closeEditBtn = document.getElementById('close-edit-minister-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-minister-modal-btn');
  [closeEditBtn, cancelEditBtn].forEach((btn) => {
    btn?.addEventListener('click', () => {
      showEditModal = false;
      activeMinister = null;
      store.notify();
    });
  });

  const editForm = document.getElementById('edit-minister-form');
  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeMinister) return;
    const name = document.getElementById('edit-minister-name')?.value?.trim();
    const email = document.getElementById('edit-minister-email')?.value?.trim();
    const state = document.getElementById('edit-minister-state')?.value?.trim();
    const department = document.getElementById('edit-minister-department')?.value?.trim();

    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      await api.updateMinister(activeMinister.id, { name, email, state, department });
      showEditModal = false;
      activeMinister = null;
      store.addToast('success', 'Minister profile updated.');
      await loadMinisters();
    } catch (err) {
      formError = err.message || 'Failed to update minister.';
      store.addToast('error', formError);
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  // Toggle Status
  const toggleStatusBtns = document.querySelectorAll('.toggle-minister-status-btn');
  toggleStatusBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const current = btn.getAttribute('data-current');
      const newStatus = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      try {
        await api.setMinisterStatus(id, newStatus);
        store.addToast('success', `Minister account marked as ${newStatus}.`);
        await loadMinisters();
      } catch (err) {
        store.addToast('error', err.message || 'Failed to update minister status.');
      }
    });
  });

  // Reset Password
  const resetBtns = document.querySelectorAll('.reset-minister-pwd-btn');
  resetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeMinister = ministers.find((m) => m.id === id);
      if (activeMinister) {
        showResetPasswordModal = true;
        formError = '';
        store.notify();
      }
    });
  });

  const closeResetBtn = document.getElementById('close-reset-minister-modal-btn');
  const cancelResetBtn = document.getElementById('cancel-reset-minister-modal-btn');
  [closeResetBtn, cancelResetBtn].forEach((btn) => {
    btn?.addEventListener('click', () => {
      showResetPasswordModal = false;
      activeMinister = null;
      store.notify();
    });
  });

  const resetPwdForm = document.getElementById('reset-minister-password-form');
  resetPwdForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeMinister) return;
    const newPassword = document.getElementById('new-minister-password')?.value;
    if (!newPassword || newPassword.length < 6) {
      formError = 'Password must be at least 6 characters.';
      store.notify();
      return;
    }

    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      await api.resetMinisterPassword(activeMinister.id, newPassword);
      showResetPasswordModal = false;
      activeMinister = null;
      store.addToast('success', 'Password reset successfully.');
    } catch (err) {
      formError = err.message || 'Failed to reset password.';
      store.addToast('error', formError);
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  if (ministers.length === 0 && !isLoading) {
    await loadMinisters();
  }
}

async function loadMinisters() {
  isLoading = true;
  store.notify();
  try {
    const res = await api.getSuperAdminMinisters({ search: searchQuery, status: statusFilter });
    const data = res?.data || res;
    ministers = data.ministers || [];
    total = data.total || ministers.length;
  } catch (err) {
    store.addToast('error', err.message || 'Failed to fetch ministers from MySQL.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
