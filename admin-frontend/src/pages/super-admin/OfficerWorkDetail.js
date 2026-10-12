import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';

let officerData = null;
let isLoading = false;
let loadError = '';

export function renderOfficerWorkDetail() {
  const officerId = store.selectedOfficerWorkId || 'SS027';

  if (isLoading && !officerData) {
    return `
      <div class="page-content">
        <div class="loading-state">
          <div class="spinner"></div>
          <h2 style="margin-top: 1rem;">Loading Officer Work Profile...</h2>
          <p>Retrieving real-time statistics, review history, and audit logs for <strong>${escapeHtml(officerId)}</strong>.</p>
        </div>
      </div>
    `;
  }

  if (loadError && !officerData) {
    return `
      <div class="page-content">
        <button id="back-to-officer-work-btn" class="btn btn-outline btn-sm" style="margin-bottom: 1rem;">
          ← Back to Officer Work
        </button>
        <div class="notice notice-error">
          ⚠️ ${escapeHtml(loadError)}
          <button id="retry-officer-detail-btn" class="btn btn-secondary btn-sm" style="margin-left: 1rem;">Retry</button>
        </div>
      </div>
    `;
  }

  const p = officerData?.profile || {
    officerId: officerId,
    name: 'Officer',
    username: officerId,
    state: 'Tamil Nadu',
    district: 'Salem',
    department: 'Land Records',
    status: 'ACTIVE',
    assignedArea: 'Salem, Tamil Nadu',
    lastLogin: null,
    lastActivity: null,
  };

  const ws = officerData?.workSummary || {
    totalApplications: 0,
    pending: 0,
    underVerification: 0,
    aiProcessed: 0,
    approved: 0,
    rejected: 0,
    correctionsMade: 0,
    notesRecorded: 0,
  };

  const aiStats = officerData?.aiStatistics || {
    totalAiProcessed: ws.aiProcessed || 0,
    avgConfidence: 94,
    avgValidationScore: 95.0,
  };

  const recentActivity = officerData?.recentActivity || [];
  const workHistory = officerData?.workHistory || [];
  const auditTrail = officerData?.auditTrail || [];

  return `
    <div class="page-content">
      <!-- Breadcrumb & Navigation -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button id="back-to-officer-work-btn" class="btn btn-outline btn-sm">
            ← Back to Officer Work
          </button>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Operations / <strong style="color: var(--text-main);">Officer Work Profile (${escapeHtml(p.officerId || p.username)})</strong>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="refresh-officer-detail-btn" class="btn btn-outline btn-sm" title="Refresh Profile from Database">
            <span>🔄</span> Refresh
          </button>
          <button id="print-officer-profile-btn" class="btn btn-secondary btn-sm">
            <span>🖨️</span> Print Profile
          </button>
        </div>
      </div>

      <!-- Section A & B: Profile Header & Assigned Area Card -->
      <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--primary);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(99, 102, 241, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: var(--primary);">
              👮
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h1 style="font-size: 1.5rem; font-weight: 800; margin: 0;">${escapeHtml(p.name)}</h1>
                <span class="badge ${p.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">${escapeHtml(p.status)}</span>
              </div>
              <div style="display: flex; gap: 1.5rem; margin-top: 0.25rem; font-size: 0.9rem; color: var(--text-muted); flex-wrap: wrap;">
                <span>Officer ID: <strong style="font-family: monospace; color: var(--primary);">${escapeHtml(p.officerId || p.username)}</strong></span>
                <span>Username: <strong style="font-family: monospace;">${escapeHtml(p.username)}</strong></span>
                <span>Department: <strong>${escapeHtml(p.department || 'Land Records')}</strong></span>
              </div>
            </div>
          </div>
          <div style="text-align: right; font-size: 0.85rem; color: var(--text-muted);">
            <div>Last Login: <strong>${p.lastLogin ? new Date(p.lastLogin).toLocaleString() : 'Never logged in'}</strong></div>
            <div style="margin-top: 0.25rem;">Last Activity: <strong>${p.lastActivity ? new Date(p.lastActivity).toLocaleString() : '—'}</strong></div>
          </div>
        </div>

        <!-- Section B: Assigned Area Strip -->
        <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; gap: 2rem; flex-wrap: wrap; font-size: 0.9rem;">
          <div>
            <span style="color: var(--text-subtle);">State:</span>
            <strong style="margin-left: 0.25rem;">${escapeHtml(p.state || 'Tamil Nadu')}</strong>
          </div>
          <div>
            <span style="color: var(--text-subtle);">District Jurisdiction:</span>
            <strong style="margin-left: 0.25rem;">${escapeHtml(p.district || 'Salem')}</strong>
          </div>
          <div>
            <span style="color: var(--text-subtle);">Assigned Area:</span>
            <span class="badge badge-primary" style="margin-left: 0.25rem;">${escapeHtml(p.assignedArea || 'Salem, Tamil Nadu')}</span>
          </div>
          <div>
            <span style="color: var(--text-subtle);">Official Email:</span>
            <strong style="margin-left: 0.25rem;">${escapeHtml(p.email || '—')}</strong>
          </div>
        </div>
      </div>

      <!-- Section C: WORK SUMMARY (Exact Layout matching Section 2 example) -->
      <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <span>📊</span> WORK SUMMARY
      </h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Total Applications</div>
            <div class="value" style="color: #60a5fa;">${ws.totalApplications}</div>
          </div>
          <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">📝</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Pending</div>
            <div class="value" style="color: #fbbf24;">${ws.pending}</div>
          </div>
          <div class="metric-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">AI Processed</div>
            <div class="value" style="color: #c084fc;">${ws.aiProcessed}</div>
          </div>
          <div class="metric-icon" style="background: rgba(192, 132, 252, 0.15); color: #a855f7;">🤖</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Approved</div>
            <div class="value" style="color: #34d399;">${ws.approved}</div>
          </div>
          <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Rejected</div>
            <div class="value" style="color: #f87171;">${ws.rejected}</div>
          </div>
          <div class="metric-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">❌</div>
        </div>
        <div class="card metric-card" style="padding: 1rem 1.25rem;">
          <div class="metric-info">
            <div class="label">Corrections Made</div>
            <div class="value" style="color: #f97316;">${ws.correctionsMade}</div>
          </div>
          <div class="metric-icon" style="background: rgba(249, 115, 22, 0.15); color: #ea580c;">✏️</div>
        </div>
      </div>

      <!-- Section D & E: Application Statistics & AI Processing Statistics -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        <!-- D. Application Statistics -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span> Application Adjudication Statistics
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Currently Under Verification:</span>
              <span style="font-weight: 700; color: #fbbf24;">${ws.underVerification} cases</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Officer Field Notes Recorded:</span>
              <span style="font-weight: 700;">${ws.notesRecorded} entries</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Approval Resolution Rate:</span>
              <span style="font-weight: 700; color: #10b981;">
                ${ws.approved + ws.rejected > 0 ? Math.round((ws.approved / (ws.approved + ws.rejected)) * 100) : 100}%
              </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Adjudication Completion:</span>
              <span style="font-weight: 700;">
                ${ws.totalApplications > 0 ? Math.round(((ws.approved + ws.rejected) / ws.totalApplications) * 100) : 100}%
              </span>
            </div>
          </div>
        </div>

        <!-- E. AI Processing Statistics -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🤖</span> AI Validation & Telemetry Results
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">AI Extracted Documents:</span>
              <span style="font-weight: 700; color: #c084fc;">${aiStats.totalAiProcessed} processed</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Average OCR Confidence:</span>
              <span class="badge badge-success">${aiStats.avgConfidence}% Confidence</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Average Validation Score:</span>
              <span style="font-weight: 700;">${aiStats.avgValidationScore} / 100</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">AI Validation Pipeline:</span>
              <span class="badge badge-success">LayoutLMv3 + Tamil/Eng OCR</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section F: RECENT ACTIVITY (Exact layout matching Section 2 example) -->
      <div class="card" style="padding: 1.5rem; margin-bottom: 2rem;">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>⚡</span> RECENT ACTIVITY
        </h2>

        ${
          recentActivity.length === 0
            ? `
          <div class="empty-state" style="padding: 1.5rem;">
            <p>No recent activity recorded for this officer in the database.</p>
          </div>
        `
            : `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Date/Time</th>
                  <th style="padding: 0.75rem 1rem;">Action</th>
                  <th style="padding: 0.75rem 1rem;">Application</th>
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
                      ${escapeHtml(act.application)}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="badge ${act.status === 'APPROVED' ? 'badge-success' : act.status === 'REJECTED' ? 'badge-danger' : 'badge-primary'}">
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

      <!-- Section G & H: Work History Timeline & Audit Trail -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <!-- G. Work History -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📜</span> Detailed Work History
          </h2>
          ${
            workHistory.length === 0
              ? '<p style="color: var(--text-muted); font-size: 0.9rem;">No work history events recorded yet.</p>'
              : `
            <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
              ${workHistory
                .slice(0, 15)
                .map(
                  (item) => `
                <div style="padding: 0.75rem; background: var(--bg-surface); border-radius: 6px; border-left: 3px solid var(--primary); font-size: 0.88rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <strong style="color: var(--text-main);">${escapeHtml(item.title)}</strong>
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

        <!-- H. Audit Trail -->
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🛡️</span> Officer Security Audit Trail
          </h2>
          ${
            auditTrail.length === 0
              ? '<p style="color: var(--text-muted); font-size: 0.9rem;">No audit logs associated with this officer.</p>'
              : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
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
    </div>
  `;
}

export async function attachOfficerWorkDetailEvents() {
  document.getElementById('back-to-officer-work-btn')?.addEventListener('click', () => {
    store.setActiveTab('super-admin-officer-work');
    window.history.pushState(null, '', '/super-admin/officer-work');
  });

  document.getElementById('retry-officer-detail-btn')?.addEventListener('click', async () => {
    await fetchOfficerProfileData();
  });

  document.getElementById('refresh-officer-detail-btn')?.addEventListener('click', async () => {
    await fetchOfficerProfileData(true);
  });

  document.getElementById('print-officer-profile-btn')?.addEventListener('click', () => {
    window.print();
  });

  const officerId = store.selectedOfficerWorkId || 'SS027';
  if (!officerData || officerData.profile?.username?.toUpperCase() !== officerId.toUpperCase()) {
    await fetchOfficerProfileData();
  }
}

async function fetchOfficerProfileData(force = false) {
  if (isLoading) return;
  const officerId = store.selectedOfficerWorkId || 'SS027';

  isLoading = true;
  loadError = '';
  store.notify();

  try {
    const res = await api.getSuperAdminOfficerProfile(officerId);
    officerData = res?.data || res;
  } catch (err) {
    loadError = err.message || `Failed to load officer work profile for '${officerId}'.`;
    store.addToast('error', loadError);
  } finally {
    isLoading = false;
    store.notify();
  }
}
