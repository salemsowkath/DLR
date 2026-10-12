import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';

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

export function renderStateAdminMinisters() {
  const user = store.user || {};
  const stateName = user.state_name || user.state || 'Tamil Nadu';

  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">Minister Management</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">${escapeHtml(stateName)}</span>
          </div>
          <p style="color: var(--text-muted);">
            Manage Revenue Ministers assigned to <strong>${escapeHtml(stateName)}</strong>. Ministers have statewide oversight across all districts.
          </p>
        </div>
        <button id="open-state-admin-add-minister-btn" class="btn btn-primary">
          <span>➕</span> Add Minister in ${escapeHtml(stateName)}
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="state-admin-minister-search"
              class="form-control"
              placeholder="Search by minister name, username, or department..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div style="width: 160px;">
            <select id="state-admin-minister-status-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active Only</option>
              <option value="INACTIVE" ${statusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive Only</option>
            </select>
          </div>
          <button id="state-admin-filter-ministers-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="state-admin-reset-ministers-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Ministers Table -->
      <div class="card" style="padding: 1.5rem;">
        ${
          isLoading
            ? `
          <div class="loading-state" style="padding: 3rem 0; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading ministers in ${escapeHtml(stateName)}...</p>
          </div>
        `
            : ministers.length === 0
            ? `
          <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏛️</div>
            <h3 style="font-weight: 700;">No Ministers Found in ${escapeHtml(stateName)}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              ${searchQuery || statusFilter ? 'No ministers match your query filters.' : `Click "+ Add Minister in ${escapeHtml(stateName)}" to create a state minister account.`}
            </p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Minister Name</th>
                  <th style="padding: 0.75rem 1rem;">Username</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem;">State Jurisdiction</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${ministers
                  .map(
                    (minister) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      <div>${escapeHtml(minister.name)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(minister.email || 'No email')}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      ${escapeHtml(minister.username || minister.external_reference)}
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">
                      ${escapeHtml(minister.department || 'Revenue & Land Records')}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge badge-secondary" style="font-weight: 600;">
                        📍 ${escapeHtml(stateName)} (All Districts)
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${minister.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                        ${minister.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem;">
                        <button class="btn btn-outline btn-sm state-admin-edit-minister-btn" data-id="${minister.id}" title="Edit Profile">
                          ✏️ Edit
                        </button>
                        <button class="btn btn-outline btn-sm state-admin-toggle-minister-status-btn" data-id="${minister.id}" data-status="${minister.status}" title="${minister.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}">
                          ${minister.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="btn btn-outline btn-sm state-admin-reset-minister-pwd-btn" data-id="${minister.id}" title="Reset Password">
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
            <div>Showing ${ministers.length} minister(s) in ${escapeHtml(stateName)}</div>
          </div>
        `
        }
      </div>

      <!-- Add Minister Modal -->
      ${renderAddModal(stateName)}

      <!-- Edit Minister Modal -->
      ${renderEditModal(stateName)}

      <!-- Reset Password Modal -->
      ${renderResetPasswordModal()}
    </div>
  `;
}

function renderAddModal(stateName) {
  if (!showAddModal) return '';
  return `
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 550px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Add Minister in ${escapeHtml(stateName)}</h2>
          <button id="close-sa-add-minister-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Minister will receive statewide visibility across all districts of <strong>${escapeHtml(stateName)}</strong>.
        </p>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="sa-add-minister-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-add-minister-name">Full Name *</label>
            <input type="text" id="sa-add-minister-name" class="form-control" placeholder="e.g. Tamil Nadu Revenue Minister" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="sa-add-minister-username">Username *</label>
              <input type="text" id="sa-add-minister-username" class="form-control" placeholder="e.g. tn_minister_01" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="sa-add-minister-email">Email Address</label>
              <input type="email" id="sa-add-minister-email" class="form-control" placeholder="minister@tn.gov.in" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-add-minister-password">Temporary Password *</label>
            <input type="password" id="sa-add-minister-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">State Jurisdiction (Locked)</label>
            <input type="text" class="form-control" value="${escapeHtml(stateName)}" disabled style="background: var(--bg-card); opacity: 0.8;" />
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-add-minister-dept">Department</label>
            <input type="text" id="sa-add-minister-dept" class="form-control" value="Revenue & Land Records" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-add-minister-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Creating...' : 'Create Minister'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderEditModal(stateName) {
  if (!showEditModal || !activeMinister) return '';
  return `
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 500px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Edit Minister Profile</h2>
          <button id="close-sa-edit-minister-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="sa-edit-minister-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">Username (Immutable)</label>
            <input type="text" class="form-control" value="${escapeHtml(activeMinister.username || activeMinister.external_reference)}" disabled />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-edit-minister-name">Full Name *</label>
            <input type="text" id="sa-edit-minister-name" class="form-control" value="${escapeHtml(activeMinister.name)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-edit-minister-email">Email</label>
            <input type="email" id="sa-edit-minister-email" class="form-control" value="${escapeHtml(activeMinister.email || '')}" />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">State Jurisdiction (Locked)</label>
            <input type="text" class="form-control" value="${escapeHtml(stateName)}" disabled style="background: var(--bg-card); opacity: 0.8;" />
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-edit-minister-dept">Department</label>
            <input type="text" id="sa-edit-minister-dept" class="form-control" value="${escapeHtml(activeMinister.department || 'Revenue & Land Records')}" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-edit-minister-btn" class="btn btn-outline">Cancel</button>
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
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 450px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Reset Minister Password</h2>
          <button id="close-sa-reset-minister-pwd-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
          Resetting password for <strong>${escapeHtml(activeMinister.name)}</strong> (<code>${escapeHtml(activeMinister.username || activeMinister.external_reference)}</code>).
        </p>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="sa-reset-minister-pwd-form">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-new-minister-pwd">New Temporary Password *</label>
            <input type="password" id="sa-new-minister-pwd" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-reset-minister-pwd-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-danger" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function attachStateAdminMinistersEvents() {
  // Add modal open/close
  document.getElementById('open-state-admin-add-minister-btn')?.addEventListener('click', () => {
    showAddModal = true;
    formError = '';
    store.notify();
  });
  document.getElementById('close-sa-add-minister-btn')?.addEventListener('click', () => {
    showAddModal = false;
    store.notify();
  });
  document.getElementById('cancel-sa-add-minister-btn')?.addEventListener('click', () => {
    showAddModal = false;
    store.notify();
  });

  // Submit Add Minister
  document.getElementById('sa-add-minister-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      const name = document.getElementById('sa-add-minister-name')?.value?.trim();
      const username = document.getElementById('sa-add-minister-username')?.value?.trim();
      const email = document.getElementById('sa-add-minister-email')?.value?.trim();
      const password = document.getElementById('sa-add-minister-password')?.value;
      const department = document.getElementById('sa-add-minister-dept')?.value?.trim() || 'Revenue & Land Records';

      await api.createStateAdminMinister({
        name,
        username,
        email,
        password,
        department,
      });

      showAddModal = false;
      store.addToast('success', `Minister "${name}" created successfully.`);
      await loadMinisters();
    } catch (err) {
      formError = err.message || 'Failed to create minister.';
      store.notify();
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  // Filter actions
  document.getElementById('state-admin-filter-ministers-btn')?.addEventListener('click', () => {
    searchQuery = (document.getElementById('state-admin-minister-search')?.value || '').trim();
    statusFilter = document.getElementById('state-admin-minister-status-select')?.value || '';
    void loadMinisters();
  });

  document.getElementById('state-admin-reset-ministers-filter-btn')?.addEventListener('click', () => {
    searchQuery = '';
    statusFilter = '';
    void loadMinisters();
  });

  // Edit actions
  document.querySelectorAll('.state-admin-edit-minister-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeMinister = ministers.find((m) => m.id === id) || null;
      if (activeMinister) {
        showEditModal = true;
        formError = '';
        store.notify();
      }
    });
  });
  document.getElementById('close-sa-edit-minister-btn')?.addEventListener('click', () => {
    showEditModal = false;
    activeMinister = null;
    store.notify();
  });
  document.getElementById('cancel-sa-edit-minister-btn')?.addEventListener('click', () => {
    showEditModal = false;
    activeMinister = null;
    store.notify();
  });
  document.getElementById('sa-edit-minister-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeMinister) return;
    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      const name = document.getElementById('sa-edit-minister-name')?.value?.trim();
      const email = document.getElementById('sa-edit-minister-email')?.value?.trim();
      const department = document.getElementById('sa-edit-minister-dept')?.value?.trim();

      await api.updateStateAdminMinister(activeMinister.id, {
        name,
        email,
        department,
      });

      showEditModal = false;
      activeMinister = null;
      store.addToast('success', `Minister "${name}" profile updated.`);
      await loadMinisters();
    } catch (err) {
      formError = err.message || 'Failed to update minister profile.';
      store.notify();
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  // Toggle status
  document.querySelectorAll('.state-admin-toggle-minister-status-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const currentStatus = btn.getAttribute('data-status');
      const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const minister = ministers.find((m) => m.id === id);

      if (!confirm(`Are you sure you want to set minister "${minister?.name || id}" to ${nextStatus}?`)) {
        return;
      }

      try {
        await api.setStateAdminMinisterStatus(id, nextStatus);
        store.addToast('success', `Minister status changed to ${nextStatus}.`);
        await loadMinisters();
      } catch (err) {
        store.addToast('error', err.message || 'Failed to update minister status.');
      }
    });
  });

  // Reset password
  document.querySelectorAll('.state-admin-reset-minister-pwd-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeMinister = ministers.find((m) => m.id === id) || null;
      if (activeMinister) {
        showResetPasswordModal = true;
        formError = '';
        store.notify();
      }
    });
  });
  document.getElementById('close-sa-reset-minister-pwd-btn')?.addEventListener('click', () => {
    showResetPasswordModal = false;
    activeMinister = null;
    store.notify();
  });
  document.getElementById('cancel-sa-reset-minister-pwd-btn')?.addEventListener('click', () => {
    showResetPasswordModal = false;
    activeMinister = null;
    store.notify();
  });
  document.getElementById('sa-reset-minister-pwd-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeMinister) return;
    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      const newPassword = document.getElementById('sa-new-minister-pwd')?.value;
      await api.resetStateAdminMinisterPassword(activeMinister.id, newPassword);
      showResetPasswordModal = false;
      activeMinister = null;
      store.addToast('success', 'Minister password has been securely reset.');
    } catch (err) {
      formError = err.message || 'Failed to reset password.';
      store.notify();
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  if (ministers.length === 0 && !isLoading) {
    void loadMinisters();
  }
}

async function loadMinisters() {
  isLoading = true;
  store.notify();

  try {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (statusFilter) params.status = statusFilter;

    const data = await api.getStateAdminMinisters(params);
    ministers = data?.ministers || data?.users || [];
    total = data?.total || ministers.length;
  } catch (err) {
    store.addToast('error', err.message || 'Failed to load ministers.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
