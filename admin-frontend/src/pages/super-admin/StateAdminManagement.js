import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml, formatDate } from '../../utils/format.js';
import { INDIAN_STATES } from '../../utils/states.js';

let stateAdmins = [];
let availableStates = INDIAN_STATES;
let total = 0;
let isLoading = false;
let searchQuery = '';
let stateFilter = '';
let statusFilter = '';
let showAddModal = false;
let showEditModal = false;
let showResetPasswordModal = false;
let activeAdmin = null;
let formError = '';
let formSubmitting = false;

export function renderStateAdminManagement() {
  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">State Admin Management</h1>
          <p style="color: var(--text-muted);">
            Manage State Administrators across all 28 states. Each State Administrator is strictly bound to exactly one state.
          </p>
        </div>
        <button id="open-add-state-admin-modal-btn" class="btn btn-primary">
          <span>➕</span> Add State Admin
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="state-admin-search-input"
              class="form-control"
              placeholder="Search by name, username, state, or email..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div style="width: 200px;">
            <select id="state-admin-state-filter-select" class="form-control" style="appearance: auto;">
              <option value="">All 28 States</option>
              ${availableStates.map((s) => `
                <option value="${escapeHtml(s)}" ${stateFilter.toLowerCase() === s.toLowerCase() ? 'selected' : ''}>
                  ${escapeHtml(s)}
                </option>
              `).join('')}
            </select>
          </div>
          <div style="width: 160px;">
            <select id="state-admin-status-filter-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active Only</option>
              <option value="INACTIVE" ${statusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive Only</option>
            </select>
          </div>
          <button id="search-state-admins-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="reset-state-admins-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- State Admins Table -->
      <div class="card" style="padding: 1.5rem;">
        ${
          isLoading
            ? `
          <div class="loading-state" style="padding: 3rem 0; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading State Administrators from MySQL...</p>
          </div>
        `
            : stateAdmins.length === 0
            ? `
          <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏢</div>
            <h3 style="font-weight: 700;">No State Administrators Found</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              ${searchQuery || stateFilter || statusFilter ? 'No administrators match your query filters.' : 'Click "+ Add State Admin" to assign a State Administrator.'}
            </p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Admin Name</th>
                  <th style="padding: 0.75rem 1rem;">Username</th>
                  <th style="padding: 0.75rem 1rem;">Assigned State</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem;">Created</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${stateAdmins
                  .map(
                    (admin) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      <div>${escapeHtml(admin.name)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(admin.email || '—')}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      ${escapeHtml(admin.username || admin.external_reference)}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge badge-primary" style="font-weight: 700;">
                        📍 ${escapeHtml(admin.state_name || admin.state || 'Unassigned')}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">
                      ${escapeHtml(admin.department || 'Land Records & Revenue')}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${admin.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                        ${admin.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${formatDate(admin.created_at)}
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem;">
                        <button class="btn btn-outline btn-sm edit-state-admin-btn" data-id="${admin.id}" title="Edit Profile">
                          ✏️ Edit
                        </button>
                        <button class="btn btn-outline btn-sm toggle-state-admin-status-btn" data-id="${admin.id}" data-status="${admin.status}" title="${admin.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}">
                          ${admin.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="btn btn-outline btn-sm reset-state-admin-pwd-btn" data-id="${admin.id}" title="Reset Password">
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            <div>Showing ${stateAdmins.length} State Administrator(s)</div>
          </div>
        `
        }
      </div>

      <!-- Add State Admin Modal -->
      ${renderAddModal()}

      <!-- Edit State Admin Modal -->
      ${renderEditModal()}

      <!-- Reset Password Modal -->
      ${renderResetPasswordModal()}
    </div>
  `;
}

function renderAddModal() {
  if (!showAddModal) return '';
  return `
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Add New State Administrator</h2>
          <button id="close-add-sa-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Each State Administrator must belong to exactly one state from the controlled 28-state list. Only one active administrator per state is allowed.
        </p>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="add-state-admin-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-sa-name">Full Name *</label>
            <input type="text" id="add-sa-name" class="form-control" placeholder="e.g. Tamil Nadu State Administrator" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="add-sa-username">Username *</label>
              <input type="text" id="add-sa-username" class="form-control" placeholder="e.g. Tamil_Nadu_admin" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="add-sa-email">Email Address</label>
              <input type="email" id="add-sa-email" class="form-control" placeholder="admin@tn.gov.in" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="add-sa-password">Temporary Password *</label>
            <input type="password" id="add-sa-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="add-sa-state">State Jurisdiction *</label>
              <select id="add-sa-state" class="form-control" required style="appearance: auto;">
                <option value="">Select State (28 States)...</option>
                ${availableStates.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="add-sa-dept">Department</label>
              <input type="text" id="add-sa-dept" class="form-control" value="Land Records & Revenue" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
            <button type="button" id="cancel-add-sa-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Creating...' : 'Create State Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderEditModal() {
  if (!showEditModal || !activeAdmin) return '';
  return `
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 500px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Edit State Administrator</h2>
          <button id="close-edit-sa-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="edit-state-admin-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">Username (Immutable)</label>
            <input type="text" class="form-control" value="${escapeHtml(activeAdmin.username || activeAdmin.external_reference)}" disabled />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-sa-name">Full Name *</label>
            <input type="text" id="edit-sa-name" class="form-control" value="${escapeHtml(activeAdmin.name)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="edit-sa-email">Email</label>
            <input type="email" id="edit-sa-email" class="form-control" value="${escapeHtml(activeAdmin.email || '')}" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 1.5rem;">
            <div class="form-group">
              <label class="form-label" for="edit-sa-state">State Jurisdiction (Controlled)</label>
              <select id="edit-sa-state" class="form-control" style="appearance: auto;">
                ${availableStates.map((s) => `
                  <option value="${escapeHtml(s)}" ${(activeAdmin.state_name || activeAdmin.state || '').toLowerCase() === s.toLowerCase() ? 'selected' : ''}>
                    ${escapeHtml(s)}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-sa-dept">Department</label>
              <input type="text" id="edit-sa-dept" class="form-control" value="${escapeHtml(activeAdmin.department || 'Land Records & Revenue')}" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-edit-sa-modal-btn" class="btn btn-outline">Cancel</button>
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
  if (!showResetPasswordModal || !activeAdmin) return '';
  return `
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 450px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Reset State Admin Password</h2>
          <button id="close-reset-sa-pwd-modal-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
          Resetting password for <strong>${escapeHtml(activeAdmin.name)}</strong> (<code>${escapeHtml(activeAdmin.username || activeAdmin.external_reference)}</code>) of <strong>${escapeHtml(activeAdmin.state_name || activeAdmin.state)}</strong>.
        </p>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="reset-state-admin-pwd-form">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="reset-sa-new-pwd">New Temporary Password *</label>
            <input type="password" id="reset-sa-new-pwd" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-reset-sa-pwd-modal-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-danger" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function attachStateAdminManagementEvents() {
  // Add modal open/close
  document.getElementById('open-add-state-admin-modal-btn')?.addEventListener('click', () => {
    showAddModal = true;
    formError = '';
    store.notify();
  });
  document.getElementById('close-add-sa-modal-btn')?.addEventListener('click', () => {
    showAddModal = false;
    store.notify();
  });
  document.getElementById('cancel-add-sa-modal-btn')?.addEventListener('click', () => {
    showAddModal = false;
    store.notify();
  });

  // Submit Add
  document.getElementById('add-state-admin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      const name = document.getElementById('add-sa-name')?.value?.trim();
      const username = document.getElementById('add-sa-username')?.value?.trim();
      const email = document.getElementById('add-sa-email')?.value?.trim();
      const password = document.getElementById('add-sa-password')?.value;
      const state = document.getElementById('add-sa-state')?.value?.trim();
      const department = document.getElementById('add-sa-dept')?.value?.trim() || 'Land Records & Revenue';

      await api.createStateAdmin({
        name,
        username,
        email,
        password,
        state,
        department,
      });

      showAddModal = false;
      store.addToast('success', `State Administrator created for ${state}.`);
      await loadStateAdmins();
    } catch (err) {
      formError = err.message || 'Failed to create State Administrator.';
      store.notify();
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  // Filters
  document.getElementById('search-state-admins-btn')?.addEventListener('click', () => {
    searchQuery = (document.getElementById('state-admin-search-input')?.value || '').trim();
    stateFilter = document.getElementById('state-admin-state-filter-select')?.value || '';
    statusFilter = document.getElementById('state-admin-status-filter-select')?.value || '';
    void loadStateAdmins();
  });

  document.getElementById('reset-state-admins-filter-btn')?.addEventListener('click', () => {
    searchQuery = '';
    stateFilter = '';
    statusFilter = '';
    void loadStateAdmins();
  });

  // Edit actions
  document.querySelectorAll('.edit-state-admin-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeAdmin = stateAdmins.find((a) => a.id === id) || null;
      if (activeAdmin) {
        showEditModal = true;
        formError = '';
        store.notify();
      }
    });
  });
  document.getElementById('close-edit-sa-modal-btn')?.addEventListener('click', () => {
    showEditModal = false;
    activeAdmin = null;
    store.notify();
  });
  document.getElementById('cancel-edit-sa-modal-btn')?.addEventListener('click', () => {
    showEditModal = false;
    activeAdmin = null;
    store.notify();
  });
  document.getElementById('edit-state-admin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeAdmin) return;
    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      const name = document.getElementById('edit-sa-name')?.value?.trim();
      const email = document.getElementById('edit-sa-email')?.value?.trim();
      const state = document.getElementById('edit-sa-state')?.value?.trim();
      const department = document.getElementById('edit-sa-dept')?.value?.trim();

      await api.updateStateAdmin(activeAdmin.id, {
        name,
        email,
        state,
        department,
      });

      showEditModal = false;
      activeAdmin = null;
      store.addToast('success', `State Admin "${name}" updated.`);
      await loadStateAdmins();
    } catch (err) {
      formError = err.message || 'Failed to update State Administrator.';
      store.notify();
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  // Toggle status
  document.querySelectorAll('.toggle-state-admin-status-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const currentStatus = btn.getAttribute('data-status');
      const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const admin = stateAdmins.find((a) => a.id === id);

      if (!confirm(`Are you sure you want to set State Administrator "${admin?.name || id}" to ${nextStatus}?`)) {
        return;
      }

      try {
        await api.setStateAdminStatus(id, nextStatus);
        store.addToast('success', `State Admin status changed to ${nextStatus}.`);
        await loadStateAdmins();
      } catch (err) {
        store.addToast('error', err.message || 'Failed to update status.');
      }
    });
  });

  // Reset password
  document.querySelectorAll('.reset-state-admin-pwd-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeAdmin = stateAdmins.find((a) => a.id === id) || null;
      if (activeAdmin) {
        showResetPasswordModal = true;
        formError = '';
        store.notify();
      }
    });
  });
  document.getElementById('close-reset-sa-pwd-modal-btn')?.addEventListener('click', () => {
    showResetPasswordModal = false;
    activeAdmin = null;
    store.notify();
  });
  document.getElementById('cancel-reset-sa-pwd-modal-btn')?.addEventListener('click', () => {
    showResetPasswordModal = false;
    activeAdmin = null;
    store.notify();
  });
  document.getElementById('reset-state-admin-pwd-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeAdmin) return;
    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      const newPassword = document.getElementById('reset-sa-new-pwd')?.value;
      await api.resetStateAdminPassword(activeAdmin.id, newPassword);
      showResetPasswordModal = false;
      activeAdmin = null;
      store.addToast('success', 'State Administrator password reset successfully.');
    } catch (err) {
      formError = err.message || 'Failed to reset password.';
      store.notify();
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  if (stateAdmins.length === 0 && !isLoading) {
    void loadStateAdmins();
  }
}

async function loadStateAdmins() {
  isLoading = true;
  store.notify();

  try {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (stateFilter) params.state = stateFilter;
    if (statusFilter) params.status = statusFilter;

    const data = await api.getSuperAdminStateAdmins(params);
    stateAdmins = data?.stateAdmins || data?.users || [];
    total = data?.total || stateAdmins.length;
  } catch (err) {
    store.addToast('error', err.message || 'Failed to load State Administrators.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
