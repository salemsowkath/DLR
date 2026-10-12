import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';

let officers = [];
let total = 0;
let isLoading = false;
let searchQuery = '';
let districtFilter = '';
let statusFilter = '';
let showAddModal = false;
let showEditModal = false;
let showResetPasswordModal = false;
let activeOfficer = null;
let formError = '';
let formSubmitting = false;

export function renderStateAdminOfficers() {
  const user = store.user || {};
  const stateName = user.state_name || user.state || 'Tamil Nadu';

  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">Officer Management</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">${escapeHtml(stateName)}</span>
          </div>
          <p style="color: var(--text-muted);">
            Manage Land Revenue Officers strictly inside <strong>${escapeHtml(stateName)}</strong>. Cross-state officers are strictly hidden.
          </p>
        </div>
        <button id="open-state-admin-add-officer-btn" class="btn btn-primary">
          <span>➕</span> Add Officer in ${escapeHtml(stateName)}
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
            <input
              type="text"
              id="state-admin-officer-search"
              class="form-control"
              placeholder="Search by officer name, username, or district..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
          <div style="width: 180px;">
            <input
              type="text"
              id="state-admin-officer-district-filter"
              class="form-control"
              placeholder="Filter by district..."
              value="${escapeHtml(districtFilter)}"
            />
          </div>
          <div style="width: 160px;">
            <select id="state-admin-officer-status-select" class="form-control" style="appearance: auto;">
              <option value="">All Statuses</option>
              <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active Only</option>
              <option value="INACTIVE" ${statusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive Only</option>
            </select>
          </div>
          <button id="state-admin-filter-officers-btn" class="btn btn-secondary btn-sm">Filter</button>
          <button id="state-admin-reset-officers-filter-btn" class="btn btn-outline btn-sm">Reset</button>
        </div>
      </div>

      <!-- Officers Table -->
      <div class="card" style="padding: 1.5rem;">
        ${
          isLoading
            ? `
          <div class="loading-state" style="padding: 3rem 0; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading officers in ${escapeHtml(stateName)}...</p>
          </div>
        `
            : officers.length === 0
            ? `
          <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👮</div>
            <h3 style="font-weight: 700;">No Officers Found in ${escapeHtml(stateName)}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              ${searchQuery || districtFilter || statusFilter ? 'No officers match your query filters.' : `Click "+ Add Officer in ${escapeHtml(stateName)}" to create a Land Revenue Officer.`}
            </p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Officer Name</th>
                  <th style="padding: 0.75rem 1rem;">Username</th>
                  <th style="padding: 0.75rem 1rem;">District Jurisdiction</th>
                  <th style="padding: 0.75rem 1rem;">Department</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${officers
                  .map(
                    (officer) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      <div>${escapeHtml(officer.name)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(officer.email || 'No email')}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      ${escapeHtml(officer.username || officer.external_reference)}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge badge-secondary" style="font-weight: 600;">
                        📍 ${escapeHtml(officer.district || 'Unassigned')}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">
                      ${escapeHtml(officer.department || 'Land Records & Revenue')}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${officer.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                        ${officer.status}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem;">
                        <button class="btn btn-outline btn-sm state-admin-edit-officer-btn" data-id="${officer.id}" title="Edit Profile">
                          ✏️ Edit
                        </button>
                        <button class="btn btn-outline btn-sm state-admin-toggle-officer-status-btn" data-id="${officer.id}" data-status="${officer.status}" title="${officer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}">
                          ${officer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="btn btn-outline btn-sm state-admin-reset-officer-pwd-btn" data-id="${officer.id}" title="Reset Password">
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
            <div>Showing ${officers.length} officer(s) in ${escapeHtml(stateName)}</div>
          </div>
        `
        }
      </div>

      <!-- Add Officer Modal -->
      ${renderAddModal(stateName)}

      <!-- Edit Officer Modal -->
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
          <h2 style="font-size: 1.25rem; font-weight: 700;">Add Officer in ${escapeHtml(stateName)}</h2>
          <button id="close-sa-add-officer-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Officer jurisdiction will be locked strictly to <strong>${escapeHtml(stateName)}</strong>.
        </p>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="sa-add-officer-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-add-officer-name">Full Name *</label>
            <input type="text" id="sa-add-officer-name" class="form-control" placeholder="e.g. R. Subramanian" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label" for="sa-add-officer-username">Username *</label>
              <input type="text" id="sa-add-officer-username" class="form-control" placeholder="e.g. officer_salem_01" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="sa-add-officer-email">Email Address</label>
              <input type="email" id="sa-add-officer-email" class="form-control" placeholder="officer@tn.gov.in" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-add-officer-password">Temporary Password *</label>
            <input type="password" id="sa-add-officer-password" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label">State Jurisdiction (Locked)</label>
              <input type="text" class="form-control" value="${escapeHtml(stateName)}" disabled style="background: var(--bg-card); opacity: 0.8;" />
            </div>
            <div class="form-group">
              <label class="form-label" for="sa-add-officer-district">Assigned District *</label>
              <input type="text" id="sa-add-officer-district" class="form-control" placeholder="e.g. Salem" required />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-add-officer-dept">Department</label>
            <input type="text" id="sa-add-officer-dept" class="form-control" value="Land Records & Revenue" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-add-officer-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-primary" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Creating...' : 'Create Officer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderEditModal(stateName) {
  if (!showEditModal || !activeOfficer) return '';
  return `
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 500px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Edit Officer Profile</h2>
          <button id="close-sa-edit-officer-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="sa-edit-officer-form">
          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label">Username (Immutable)</label>
            <input type="text" class="form-control" value="${escapeHtml(activeOfficer.username || activeOfficer.external_reference)}" disabled />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-edit-officer-name">Full Name *</label>
            <input type="text" id="sa-edit-officer-name" class="form-control" value="${escapeHtml(activeOfficer.name)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.9rem;">
            <label class="form-label" for="sa-edit-officer-email">Email</label>
            <input type="email" id="sa-edit-officer-email" class="form-control" value="${escapeHtml(activeOfficer.email || '')}" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem;">
            <div class="form-group">
              <label class="form-label">State (Locked)</label>
              <input type="text" class="form-control" value="${escapeHtml(stateName)}" disabled style="background: var(--bg-card); opacity: 0.8;" />
            </div>
            <div class="form-group">
              <label class="form-label" for="sa-edit-officer-district">District Jurisdiction *</label>
              <input type="text" id="sa-edit-officer-district" class="form-control" value="${escapeHtml(activeOfficer.district || '')}" required />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-edit-officer-dept">Department</label>
            <input type="text" id="sa-edit-officer-dept" class="form-control" value="${escapeHtml(activeOfficer.department || 'Land Records & Revenue')}" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-edit-officer-btn" class="btn btn-outline">Cancel</button>
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
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
      <div class="card" style="width: 100%; max-width: 450px; padding: 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Reset Officer Password</h2>
          <button id="close-sa-reset-officer-pwd-btn" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">✕</button>
        </div>

        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
          Resetting password for <strong>${escapeHtml(activeOfficer.name)}</strong> (<code>${escapeHtml(activeOfficer.username || activeOfficer.external_reference)}</code>).
        </p>

        ${formError ? `<div class="notice notice-error" style="margin-bottom: 1rem;">⚠️ ${escapeHtml(formError)}</div>` : ''}

        <form id="sa-reset-officer-pwd-form">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="sa-new-officer-pwd">New Temporary Password *</label>
            <input type="password" id="sa-new-officer-pwd" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="cancel-sa-reset-officer-pwd-btn" class="btn btn-outline">Cancel</button>
            <button type="submit" class="btn btn-danger" ${formSubmitting ? 'disabled' : ''}>
              ${formSubmitting ? '<div class="spinner"></div> Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function attachStateAdminOfficersEvents() {
  // Add modal open/close
  document.getElementById('open-state-admin-add-officer-btn')?.addEventListener('click', () => {
    showAddModal = true;
    formError = '';
    store.notify();
  });
  document.getElementById('close-sa-add-officer-btn')?.addEventListener('click', () => {
    showAddModal = false;
    store.notify();
  });
  document.getElementById('cancel-sa-add-officer-btn')?.addEventListener('click', () => {
    showAddModal = false;
    store.notify();
  });

  // Submit Add Officer
  document.getElementById('sa-add-officer-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      const name = document.getElementById('sa-add-officer-name')?.value?.trim();
      const username = document.getElementById('sa-add-officer-username')?.value?.trim();
      const email = document.getElementById('sa-add-officer-email')?.value?.trim();
      const password = document.getElementById('sa-add-officer-password')?.value;
      const district = document.getElementById('sa-add-officer-district')?.value?.trim();
      const department = document.getElementById('sa-add-officer-dept')?.value?.trim() || 'Land Records & Revenue';

      await api.createStateAdminOfficer({
        name,
        username,
        email,
        password,
        district,
        department,
      });

      showAddModal = false;
      store.addToast('success', `Officer "${name}" created successfully in ${district}.`);
      await loadOfficers();
    } catch (err) {
      formError = err.message || 'Failed to create officer.';
      store.notify();
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  // Filter actions
  document.getElementById('state-admin-filter-officers-btn')?.addEventListener('click', () => {
    searchQuery = (document.getElementById('state-admin-officer-search')?.value || '').trim();
    districtFilter = (document.getElementById('state-admin-officer-district-filter')?.value || '').trim();
    statusFilter = document.getElementById('state-admin-officer-status-select')?.value || '';
    void loadOfficers();
  });

  document.getElementById('state-admin-reset-officers-filter-btn')?.addEventListener('click', () => {
    searchQuery = '';
    districtFilter = '';
    statusFilter = '';
    void loadOfficers();
  });

  // Edit actions
  document.querySelectorAll('.state-admin-edit-officer-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeOfficer = officers.find((o) => o.id === id) || null;
      if (activeOfficer) {
        showEditModal = true;
        formError = '';
        store.notify();
      }
    });
  });
  document.getElementById('close-sa-edit-officer-btn')?.addEventListener('click', () => {
    showEditModal = false;
    activeOfficer = null;
    store.notify();
  });
  document.getElementById('cancel-sa-edit-officer-btn')?.addEventListener('click', () => {
    showEditModal = false;
    activeOfficer = null;
    store.notify();
  });
  document.getElementById('sa-edit-officer-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeOfficer) return;
    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      const name = document.getElementById('sa-edit-officer-name')?.value?.trim();
      const email = document.getElementById('sa-edit-officer-email')?.value?.trim();
      const district = document.getElementById('sa-edit-officer-district')?.value?.trim();
      const department = document.getElementById('sa-edit-officer-dept')?.value?.trim();

      await api.updateStateAdminOfficer(activeOfficer.id, {
        name,
        email,
        district,
        department,
      });

      showEditModal = false;
      activeOfficer = null;
      store.addToast('success', `Officer "${name}" profile updated.`);
      await loadOfficers();
    } catch (err) {
      formError = err.message || 'Failed to update officer profile.';
      store.notify();
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  // Toggle status
  document.querySelectorAll('.state-admin-toggle-officer-status-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const currentStatus = btn.getAttribute('data-status');
      const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const officer = officers.find((o) => o.id === id);

      if (!confirm(`Are you sure you want to set officer "${officer?.name || id}" to ${nextStatus}?`)) {
        return;
      }

      try {
        await api.setStateAdminOfficerStatus(id, nextStatus);
        store.addToast('success', `Officer status changed to ${nextStatus}.`);
        await loadOfficers();
      } catch (err) {
        store.addToast('error', err.message || 'Failed to update officer status.');
      }
    });
  });

  // Reset password
  document.querySelectorAll('.state-admin-reset-officer-pwd-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      activeOfficer = officers.find((o) => o.id === id) || null;
      if (activeOfficer) {
        showResetPasswordModal = true;
        formError = '';
        store.notify();
      }
    });
  });
  document.getElementById('close-sa-reset-officer-pwd-btn')?.addEventListener('click', () => {
    showResetPasswordModal = false;
    activeOfficer = null;
    store.notify();
  });
  document.getElementById('cancel-sa-reset-officer-pwd-btn')?.addEventListener('click', () => {
    showResetPasswordModal = false;
    activeOfficer = null;
    store.notify();
  });
  document.getElementById('sa-reset-officer-pwd-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeOfficer) return;
    formSubmitting = true;
    formError = '';
    store.notify();

    try {
      const newPassword = document.getElementById('sa-new-officer-pwd')?.value;
      await api.resetStateAdminOfficerPassword(activeOfficer.id, newPassword);
      showResetPasswordModal = false;
      activeOfficer = null;
      store.addToast('success', 'Officer password has been securely reset.');
    } catch (err) {
      formError = err.message || 'Failed to reset password.';
      store.notify();
    } finally {
      formSubmitting = false;
      store.notify();
    }
  });

  if (officers.length === 0 && !isLoading) {
    void loadOfficers();
  }
}

async function loadOfficers() {
  isLoading = true;
  store.notify();

  try {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (districtFilter) params.district = districtFilter;
    if (statusFilter) params.status = statusFilter;

    const data = await api.getStateAdminOfficers(params);
    officers = data?.officers || data?.users || [];
    total = data?.total || officers.length;
  } catch (err) {
    store.addToast('error', err.message || 'Failed to load officers.');
  } finally {
    isLoading = false;
    store.notify();
  }
}
