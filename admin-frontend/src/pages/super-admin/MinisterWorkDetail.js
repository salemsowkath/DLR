import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';

let ministerData = null;
let isLoading = false;
let loadError = '';

export function renderMinisterWorkDetail() {
  const ministerId = store.selectedMinisterWorkId || 'DEMO-MINISTER-001';

  if (isLoading && !ministerData) {
    return `
      <div class="page-content">
        <div class="loading-state">
          <div class="spinner"></div>
          <h2 style="margin-top: 1rem;">Loading Minister Work Profile...</h2>
          <p>Retrieving real-time governance metrics, oversight activity, and audit trails for <strong>${escapeHtml(ministerId)}</strong>.</p>
        </div>
      </div>
    `;
  }

  if (loadError && !ministerData) {
    return `
      <div class="page-content">
        <button id="back-to-minister-work-btn" class="btn btn-outline btn-sm" style="margin-bottom: 1rem;">
          ← Back to Minister Work
        </button>
        <div class="notice notice-error">
          ⚠️ ${escapeHtml(loadError)}
          <button id="retry-minister-detail-btn" class="btn btn-secondary btn-sm" style="margin-left: 1rem;">Retry</button>
        </div>
      </div>
    `;
  }

  const p = ministerData?.profile || {
    ministerId: ministerId,
    name: 'Honorable Minister',
    username: ministerId,
    state: 'Tamil Nadu',
    department: 'Revenue Administration',
    status: 'ACTIVE',
    assignedArea: 'Tamil Nadu',
    lastLogin: null,
    lastActivity: null,
  };

  const ms = ministerData?.monitoringStatistics || {
    totalMonitored: 0,
    pendingItems: 0,
    approvedItems: 0,
    rejectedItems: 0,
    reportsViewed: 0,
    actionsCount: 0,
  };

  const recentActivity = ministerData?.recentActivity || [];
  const reports = ministerData?.reports || [];
  const workHistory = ministerData?.workHistory || [];
  const auditTrail = ministerData?.auditTrail || [];

  return `
    <div class="page-content">
      <!-- Header & Navigation -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button id="back-to-minister-work-btn" class="btn btn-outline btn-sm">
            ← Back to Minister Work
          </button>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Operations / <strong style="color: var(--text-main);">Minister Work Profile (${escapeHtml(p.ministerId || p.username)})</strong>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="refresh-minister-detail-btn" class="btn btn-outline btn-sm">
            <span>🔄</span> Refresh
          </button>
          <button id="print-minister-profile-btn" class="btn btn-secondary btn-sm">
            <span>🖨️</span> Print Profile
          </button>
        </div>
      </div>

      <!-- Section A & B: Profile & Assigned Area -->
      <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid #a855f7;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(168, 85, 247, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #a855f7;">
              🏛️
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h1 style="font-size: 1.5rem; font-weight: 800; margin: 0;">${escapeHtml(p.name)}</h1>
                <span class="badge ${p.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">${escapeHtml(p.status)}</span>
              </div>
              <div style="display: flex; gap: 1.5rem; margin-top: 0.25rem; font-size: 0.9rem; color: var(--text-muted); flex-wrap: wrap;">
                <span>Minister ID: <strong style="font-family: monospace; color: #a855f7;">${escapeHtml(p.ministerId || p.username)}</strong></span>
                <span>Username: <strong style="font-family: monospace;">${escapeHtml(p.username)}</strong></span>
                <span>Department: <strong>${escapeHtml(p.department || 'Revenue')}</strong></span>
              </div>
            </div>
          </div>
          <div style="text-align: right; font-size: 0.85rem; color: var(--text-muted);">
            <div>Last Login: <strong>${p.lastLogin ? new Date(p.lastLogin).toLocaleString() : 'Never logged in'}</strong></div>
            <div style="margin-top: 0.25rem;">Last Activity: <strong>${p.lastActivity ? new Date(p.lastActivity).toLocaleString() : '—'}</strong></div>
          </div>
        </div>

        <!-- Section B: Assigned Area -->
        <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; gap: 2rem; flex-wrap: wrap; font-size: 0.9rem;">
          <div>
            <span style="color: var(--text-subtle);">Assigned State/Region:</span>
            <strong style="margin-left: 0.25rem;">${escapeHtml(p.state || 'Tamil Nadu')}</strong>
          </div>
          <div>
            <span style="color: var(--text-subtle);">Governance Jurisdiction:</span>
            <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #a855f7; margin-left: 0.25rem;">
              Statewide Revenue Oversight
            </span>
          </div>
          <div>
            <span style="color: var(--text-subtle);">Official Email:</span>
            <strong style="margin-left: 0.25rem;">${escapeHtml(p.email || '—')}</strong>
          </div>
        </div>
      </div>

      <!-- Section C: Monitoring Statistics -->
      <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <span>📊</span> MONITORING & GOVERNANCE STATISTICS
      </h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Records Monitored</div>
            <div class="value" style="color: #60a5fa;">${ms.totalMonitored}</div>
          </div>
          <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">📜</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Pending Items</div>
            <div class="value" style="color: #fbbf24;">${ms.pendingItems}</div>
          </div>
          <div class="metric-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Approved Items</div>
            <div class="value" style="color: #34d399;">${ms.approvedItems}</div>
          </div>
          <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Reports Viewed</div>
            <div class="value" style="color: #c084fc;">${ms.reportsViewed}</div>
          </div>
          <div class="metric-icon" style="background: rgba(192, 132, 252, 0.15); color: #a855f7;">📊</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Total Actions</div>
            <div class="value" style="color: #38bdf8;">${ms.actionsCount}</div>
          </div>
          <div class="metric-icon" style="background: rgba(56, 189, 248, 0.15); color: #0284c7;">⚡</div>
        </div>
      </div>

      <!-- Section D: Recent Activity -->
      <div class="card" style="padding: 1.5rem; margin-bottom: 2rem;">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>⚡</span> RECENT OVERSIGHT ACTIVITY
        </h2>

        ${
          recentActivity.length === 0
            ? `
          <div class="empty-state" style="padding: 1.5rem;">
            <p>No recent activity recorded for this minister in the database.</p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Date/Time</th>
                  <th style="padding: 0.75rem 1rem;">Action</th>
                  <th style="padding: 0.75rem 1rem;">Target/Resource</th>
                  <th style="padding: 0.75rem 1rem;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${recentActivity
                  .map(
                    (act) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.82rem; white-space: nowrap;">
                      ${new Date(act.dateTime).toLocaleString()}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      ${escapeHtml(act.action)}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; color: var(--primary);">
                      ${escapeHtml(act.target)}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge badge-primary">
                        ${escapeHtml(act.status)}
                      </span>
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

      <!-- Section E & F: Reports & Work History -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        <!-- Section E: Reports Viewed / Generated -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📈</span> Executive Reports Telemetry
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${reports
              .map(
                (rep) => `
              <div style="padding: 0.75rem; background: var(--bg-surface); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem;">
                <div>
                  <div style="font-weight: 600;">${escapeHtml(rep.name)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Last Accessed: ${rep.viewedAt ? new Date(rep.viewedAt).toLocaleDateString() : '—'}</div>
                </div>
                <span class="badge badge-success">${escapeHtml(rep.status)}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Section F: Work History -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📜</span> Executive Work History
          </h2>
          ${
            workHistory.length === 0
              ? '<p style="color: var(--text-muted); font-size: 0.9rem;">No governance actions logged.</p>'
              : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 350px; overflow-y: auto;">
              ${workHistory
                .slice(0, 10)
                .map(
                  (item) => `
                <div style="padding: 0.75rem; background: var(--bg-surface); border-radius: 6px; border-left: 3px solid #a855f7; font-size: 0.88rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <strong>${escapeHtml(item.title)}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '—'}</span>
                  </div>
                  <div style="color: var(--text-muted); font-size: 0.82rem;">${escapeHtml(item.description)}</div>
                </div>
              `
                )
                .join('')}
            </div>
          `
          }
        </div>
      </div>

      <!-- Section G: Audit Trail -->
      <div class="card" style="padding: 1.5rem;">
        <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>🛡️</span> Security & Compliance Audit Trail
        </h2>
        ${
          auditTrail.length === 0
            ? '<p style="color: var(--text-muted); font-size: 0.9rem;">No audit logs for this minister.</p>'
            : `
          <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 350px; overflow-y: auto;">
            ${auditTrail
              .slice(0, 15)
              .map(
                (audit) => `
              <div style="padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                  <span class="badge ${audit.event_type.includes('FAIL') ? 'badge-danger' : 'badge-primary'}" style="font-size: 0.7rem;">
                    ${escapeHtml(audit.event_type)}
                  </span>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(audit.created_at).toLocaleString()}</span>
                </div>
                <div style="font-family: monospace; font-size: 0.75rem; color: var(--text-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(JSON.stringify(audit.metadata || {}))}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
      </div>
    </div>
  `;
}

export async function attachMinisterWorkDetailEvents() {
  document.getElementById('back-to-minister-work-btn')?.addEventListener('click', () => {
    store.setActiveTab('super-admin-minister-work');
    window.history.pushState(null, '', '/super-admin/minister-work');
  });

  document.getElementById('retry-minister-detail-btn')?.addEventListener('click', async () => {
    await fetchMinisterProfileData();
  });

  document.getElementById('refresh-minister-detail-btn')?.addEventListener('click', async () => {
    await fetchMinisterProfileData(true);
  });

  document.getElementById('print-minister-profile-btn')?.addEventListener('click', () => {
    window.print();
  });

  const ministerId = store.selectedMinisterWorkId || 'DEMO-MINISTER-001';
  if (!ministerData || ministerData.profile?.username?.toUpperCase() !== ministerId.toUpperCase()) {
    await fetchMinisterProfileData();
  }
}

async function fetchMinisterProfileData(force = false) {
  if (isLoading) return;
  const ministerId = store.selectedMinisterWorkId || 'DEMO-MINISTER-001';

  isLoading = true;
  loadError = '';
  store.notify();

  try {
    const res = await api.getSuperAdminMinisterProfile(ministerId);
    ministerData = res?.data || res;
  } catch (err) {
    loadError = err.message || `Failed to load minister work profile for '${ministerId}'.`;
    store.addToast('error', loadError);
  } finally {
    isLoading = false;
    store.notify();
  }
}
