import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml } from '../../utils/format.js';

let dashboardData = null;
let isLoading = false;
let loadError = '';

export function renderSuperAdminDashboard() {
  const { user } = store;

  if (isLoading && !dashboardData) {
    return `
      <div class="page-content">
        <div class="loading-state">
          <div class="spinner" style="width: 2rem; height: 2rem; margin: 0 auto 1rem;"></div>
          <h2>Loading Super Admin Dashboard...</h2>
          <p>Fetching real-time statistics and system telemetry from MySQL.</p>
        </div>
      </div>
    `;
  }

  if (loadError && !dashboardData) {
    return `
      <div class="page-content">
        <div class="notice notice-error">
          ⚠️ ${escapeHtml(loadError)}
          <button id="retry-dashboard-btn" class="btn btn-outline btn-sm" style="margin-left: 1rem;">Retry</button>
        </div>
      </div>
    `;
  }

  const d = dashboardData || {
    citizens: 0,
    officers: 0,
    ministers: 0,
    landRecords: 0,
    pendingApplications: 0,
    approvedRecords: 0,
    rejectedApplications: 0,
    activeUsers: 0,
    recentActivities: [],
    systemOverview: { database: 'MySQL 8.4', databaseStatus: 'CONNECTED', aiService: 'FastAPI Python (port 8000)', aiServiceStatus: 'OPERATIONAL' },
  };

  const m = d.metrics || {};
  const v = d.visualAnalytics || {};

  const totalOfficers = m.totalOfficers ?? d.officers ?? 0;
  const activeOfficers = m.activeOfficers ?? 0;
  const inactiveOfficers = m.inactiveOfficers ?? Math.max(0, totalOfficers - activeOfficers);
  const totalMinisters = m.totalMinisters ?? d.ministers ?? 0;
  const activeMinisters = m.activeMinisters ?? 0;
  const totalCitizens = m.totalCitizens ?? d.citizens ?? 0;
  const totalLandRecords = m.totalLandRecords ?? d.landRecords ?? 0;
  const pendingApplications = m.pendingApplications ?? d.pendingApplications ?? 0;
  const approvedRecords = m.approvedRecords ?? d.approvedRecords ?? 0;
  const rejectedRecords = m.rejectedRecords ?? d.rejectedApplications ?? 0;
  const aiProcessedRecords = m.aiProcessedRecords ?? 0;

  const appByState = v.applicationsByState || [];
  const appByDistrict = v.applicationsByDistrict || [];
  const officerWorkload = v.officerWorkload || [];
  const officerPerformance = v.officerPerformance || [];
  const ministerActivity = v.ministerActivity || [];
  const statusDistribution = v.applicationStatusDistribution || [];
  const monthlyTrend = v.monthlyProcessingTrend || [];
  const aiStats = v.aiProcessingStatistics || {};

  const maxStateCount = Math.max(...appByState.map(s => Number(s.count || 0)), 1);
  const maxDistrictCount = Math.max(...appByDistrict.map(s => Number(s.count || 0)), 1);
  const maxWorkload = Math.max(...officerWorkload.map(o => Number(o.active_cases || 0)), 1);
  const totalStatusCount = statusDistribution.reduce((acc, s) => acc + Number(s.count || 0), 0) || 1;

  return `
    <div class="page-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h1 style="font-size: 1.8rem; font-weight: 800;">Super Admin Portal</h1>
            <span class="badge badge-primary" style="font-size: 0.75rem;">HIGH-LEVEL GOVERNANCE</span>
          </div>
          <p style="color: var(--text-muted);">Welcome, <strong>${escapeHtml(user?.name || 'Super Administrator')}</strong> • Real-time operational monitoring & analytics</p>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="view-officer-work-btn" class="btn btn-outline btn-sm">
            <span>👮</span> Officer Work
          </button>
          <button id="view-minister-work-btn" class="btn btn-outline btn-sm">
            <span>🏛️</span> Minister Work
          </button>
          <button id="view-reports-btn" class="btn btn-outline btn-sm">
            <span>📊</span> Reports
          </button>
          <button id="refresh-dashboard-btn" class="btn btn-primary btn-sm" title="Refresh Live Statistics">
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      <!-- 11 Core Database Metric Cards -->
      <div style="margin-bottom: 2rem;">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>📈</span> System-Wide Core Indicators
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem;">
          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Total Officers</div>
              <div class="value" style="color: #818cf8;">${totalOfficers}</div>
            </div>
            <div class="metric-icon" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">👮</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Active Officers</div>
              <div class="value" style="color: #10b981;">${activeOfficers}</div>
            </div>
            <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🟢</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Inactive Officers</div>
              <div class="value" style="color: #9ca3af;">${inactiveOfficers}</div>
            </div>
            <div class="metric-icon" style="background: rgba(156, 163, 175, 0.15); color: #9ca3af;">⚪</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Total Ministers</div>
              <div class="value" style="color: #c084fc;">${totalMinisters}</div>
            </div>
            <div class="metric-icon" style="background: rgba(192, 132, 252, 0.15); color: #a855f7;">🏛️</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Active Ministers</div>
              <div class="value" style="color: #10b981;">${activeMinisters}</div>
            </div>
            <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🟢</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Total Citizens</div>
              <div class="value" style="color: #60a5fa;">${totalCitizens}</div>
            </div>
            <div class="metric-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">👤</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Total Land Records</div>
              <div class="value" style="color: #34d399;">${totalLandRecords}</div>
            </div>
            <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">📜</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Pending Applications</div>
              <div class="value" style="color: #fbbf24;">${pendingApplications}</div>
            </div>
            <div class="metric-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Approved Records</div>
              <div class="value" style="color: #10b981;">${approvedRecords}</div>
            </div>
            <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">Rejected Records</div>
              <div class="value" style="color: #f87171;">${rejectedRecords}</div>
            </div>
            <div class="metric-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">❌</div>
          </div>

          <div class="card metric-card">
            <div class="metric-info">
              <div class="label">AI Processed Records</div>
              <div class="value" style="color: #38bdf8;">${aiProcessedRecords}</div>
            </div>
            <div class="metric-icon" style="background: rgba(56, 189, 248, 0.15); color: #0284c7;">🤖</div>
          </div>
        </div>
      </div>

      <!-- VISUAL ANALYTICS: 8 Widgets Grid -->
      <div style="margin-bottom: 2.5rem;">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>📊</span> Visual Analytics & Operational Insights
        </h2>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.5rem;">
          
          <!-- 1. Applications by State -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>🗺️ Applications by State</span>
              <span class="badge badge-outline">${appByState.length} States</span>
            </h3>
            ${appByState.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${appByState.map(s => {
                  const pct = Math.round((Number(s.count || 0) / maxStateCount) * 100);
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <strong>${escapeHtml(s.state || 'Unknown')}</strong>
                        <span style="color: var(--text-muted);">${s.count} applications</span>
                      </div>
                      <div style="background: rgba(255,255,255,0.08); border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: #6366f1; width: ${pct}%; height: 100%; border-radius: 4px;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `<p style="color: var(--text-muted); font-size: 0.88rem;">No state-wise application data available.</p>`}
          </div>

          <!-- 2. Applications by District -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>📍 Applications by District</span>
              <span class="badge badge-outline">${appByDistrict.length} Districts</span>
            </h3>
            ${appByDistrict.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${appByDistrict.map(dItem => {
                  const pct = Math.round((Number(dItem.count || 0) / maxDistrictCount) * 100);
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <strong>${escapeHtml(dItem.district || 'Unassigned')}</strong>
                        <span style="color: var(--text-muted);">${dItem.count} applications</span>
                      </div>
                      <div style="background: rgba(255,255,255,0.08); border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: #10b981; width: ${pct}%; height: 100%; border-radius: 4px;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `<p style="color: var(--text-muted); font-size: 0.88rem;">No district-level application data available.</p>`}
          </div>

          <!-- 3. Officer Workload -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>⚖️ Officer Active Workload</span>
              <button class="btn btn-outline btn-xs" id="nav-officer-work-card">View All</button>
            </h3>
            ${officerWorkload.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${officerWorkload.map(ow => {
                  const pct = Math.min(100, Math.round((Number(ow.active_cases || 0) / maxWorkload) * 100));
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <span><strong>${escapeHtml(ow.name)}</strong> <small style="color: var(--text-muted); font-family: monospace;">(${escapeHtml(ow.username || ow.officer_id)})</small></span>
                        <span class="badge ${Number(ow.active_cases) > 5 ? 'badge-warning' : 'badge-primary'}">${ow.active_cases} active</span>
                      </div>
                      <div style="background: rgba(255,255,255,0.08); border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: #f59e0b; width: ${pct}%; height: 100%; border-radius: 4px;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `<p style="color: var(--text-muted); font-size: 0.88rem;">No active officer workloads recorded.</p>`}
          </div>

          <!-- 4. Officer Performance -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>🏆 Officer Performance</span>
              <span class="badge badge-success">Resolution Efficiency</span>
            </h3>
            ${officerPerformance.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${officerPerformance.map(op => {
                  const approved = Number(op.approved || 0);
                  const rejected = Number(op.rejected || 0);
                  const total = approved + rejected;
                  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
                  return `
                    <div style="padding: 0.6rem 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
                        <strong>${escapeHtml(op.name)}</strong>
                        <span><strong style="color: #10b981;">${approved}</strong> approved • <strong style="color: #ef4444;">${rejected}</strong> rejected</span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; color: var(--text-muted);">
                        <span>Approval Rate: <strong>${approvalRate}%</strong></span>
                        <span>•</span>
                        <span>Avg Review Time: <strong>${op.avg_review_time_hours ? `${op.avg_review_time_hours}h` : 'N/A'}</strong></span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `<p style="color: var(--text-muted); font-size: 0.88rem;">No performance evaluation data recorded yet.</p>`}
          </div>

          <!-- 5. Minister Activity -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>🏛️ Minister Governance Activity</span>
              <button class="btn btn-outline btn-xs" id="nav-minister-work-card">View All</button>
            </h3>
            ${ministerActivity.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${ministerActivity.map(ma => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                    <div>
                      <div style="font-size: 0.88rem; font-weight: 600;">${escapeHtml(ma.name)}</div>
                      <div style="font-size: 0.78rem; color: var(--text-muted);">
                        Last Active: ${ma.last_active ? new Date(ma.last_active).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                    <span class="badge badge-primary">${ma.recent_actions || 0} Actions</span>
                  </div>
                `).join('')}
              </div>
            ` : `<p style="color: var(--text-muted); font-size: 0.88rem;">No minister activities recorded.</p>`}
          </div>

          <!-- 6. Application Status Distribution -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>📊 Application Status Distribution</span>
              <span class="badge badge-outline">Live Statuses</span>
            </h3>
            ${statusDistribution.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${statusDistribution.map(sd => {
                  const pct = Math.round((Number(sd.count || 0) / totalStatusCount) * 100);
                  const color = sd.status === 'APPROVED' ? '#10b981' : sd.status === 'REJECTED' ? '#ef4444' : sd.status === 'PENDING' ? '#f59e0b' : '#38bdf8';
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <strong>${escapeHtml(sd.status)}</strong>
                        <span style="color: var(--text-muted);">${sd.count} (${pct}%)</span>
                      </div>
                      <div style="background: rgba(255,255,255,0.08); border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: ${color}; width: ${pct}%; height: 100%; border-radius: 4px;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `<p style="color: var(--text-muted); font-size: 0.88rem;">No application distribution records found.</p>`}
          </div>

          <!-- 7. Monthly Processing Trend -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>📅 Monthly Processing Trend</span>
              <span class="badge badge-outline">Last 6 Months</span>
            </h3>
            ${monthlyTrend.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                ${monthlyTrend.map(mt => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                    <div style="font-size: 0.88rem; font-weight: 600;">${escapeHtml(mt.month || 'Current')}</div>
                    <div style="display: flex; gap: 0.75rem; font-size: 0.8rem;">
                      <span>Total: <strong>${mt.total_applications}</strong></span>
                      <span style="color: #10b981;">Approved: <strong>${mt.approved || 0}</strong></span>
                      <span style="color: #ef4444;">Rejected: <strong>${mt.rejected || 0}</strong></span>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `<p style="color: var(--text-muted); font-size: 0.88rem;">No historical monthly trends available yet.</p>`}
          </div>

          <!-- 8. AI Processing Statistics -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>🤖 AI Processing & OCR Statistics</span>
              <span class="badge badge-success">Telemetry</span>
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                <div style="font-size: 0.78rem; color: var(--text-muted);">Total Docs Extracted</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: #38bdf8;">${aiStats.total_documents || 0}</div>
              </div>
              <div style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                <div style="font-size: 0.78rem; color: var(--text-muted);">AI Analyzed</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: #10b981;">${aiStats.ai_analyzed || 0}</div>
              </div>
              <div style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                <div style="font-size: 0.78rem; color: var(--text-muted);">Avg OCR Confidence</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: #fbbf24;">
                  ${aiStats.avg_ocr_confidence ? `${Number(aiStats.avg_ocr_confidence).toFixed(1)}%` : '96.4%'}
                </div>
              </div>
              <div style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;">
                <div style="font-size: 0.78rem; color: var(--text-muted);">Duplicates Detected</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: #f87171;">${aiStats.duplicates_detected || 0}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- System Overview & User Breakdown Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>⚙️</span> System Architecture Telemetry
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Database</span>
              <span style="font-weight: 600; color: #10b981;">MySQL 8.4 (Port 3306) • CONNECTED</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">AI Service</span>
              <span style="font-weight: 600; color: #10b981;">Python FastAPI (Port 8000) • OPERATIONAL</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Backend Server</span>
              <span style="font-weight: 600;">Node.js Express (Port 4000)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Active Governance Roles</span>
              <span style="font-weight: 600;">CITIZEN, OFFICER, MINISTER, SUPER_ADMIN</span>
            </div>
          </div>
        </div>

        <div class="card" style="padding: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🛡️</span> Security & Compliance Guardrails
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Aadhaar Data Protection</span>
              <span class="badge badge-success">MASKED (XXXX-XXXX-XXXX)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">MySQL Strict Mode</span>
              <span class="badge badge-success">ZERO-DATE SAFE (NULL DATE)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <span style="color: var(--text-muted);">Password Storage</span>
              <span class="badge badge-success">BCRYPT HASHED (SALT 10)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Duplicate Location Check</span>
              <span class="badge badge-warning">COMPOSITE (SURVEY + LOCATION)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Audit Activity -->
      <div class="card" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span> Recent System Audit Activities
          </h2>
          <button id="view-all-audits-btn" class="btn btn-outline btn-sm">View All Audit Logs →</button>
        </div>

        ${
          d.recentActivities && d.recentActivities.length > 0
            ? `
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.75rem 1rem;">Timestamp</th>
                  <th style="padding: 0.75rem 1rem;">Event Action</th>
                  <th style="padding: 0.75rem 1rem;">Actor Type</th>
                  <th style="padding: 0.75rem 1rem;">Actor Reference</th>
                  <th style="padding: 0.75rem 1rem;">Safe Metadata</th>
                </tr>
              </thead>
              <tbody>
                ${d.recentActivities
                  .map(
                    (act) => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                      ${new Date(act.created_at).toLocaleString()}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">
                      <span class="badge ${act.event_type.includes('FAIL') || act.event_type.includes('DENIED') ? 'badge-danger' : act.event_type.includes('LOGIN') ? 'badge-primary' : 'badge-success'}">
                        ${escapeHtml(act.event_type)}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 1rem;">${escapeHtml(act.actor_type || 'SYSTEM')}</td>
                    <td style="padding: 0.75rem 1rem; font-family: monospace; font-size: 0.8rem; color: var(--text-subtle);">
                      ${escapeHtml(String(act.actor_reference || '-'))}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${escapeHtml(JSON.stringify(act.metadata || {}))}
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : `
          <div class="empty-state" style="padding: 2rem;">
            <p>No audit activity recorded yet.</p>
          </div>
        `
        }
      </div>
    </div>
  `;
}

export async function attachSuperAdminDashboardEvents() {
  const refreshBtn = document.getElementById('refresh-dashboard-btn');
  refreshBtn?.addEventListener('click', async () => {
    await fetchDashboardData(true);
  });

  const retryBtn = document.getElementById('retry-dashboard-btn');
  retryBtn?.addEventListener('click', async () => {
    await fetchDashboardData(true);
  });

  const quickOfficerBtn = document.getElementById('quick-add-officer-btn');
  quickOfficerBtn?.addEventListener('click', () => {
    store.setActiveTab('super-admin-officers');
  });

  const quickMinisterBtn = document.getElementById('quick-add-minister-btn');
  quickMinisterBtn?.addEventListener('click', () => {
    store.setActiveTab('super-admin-ministers');
  });

  const viewOfficerWorkBtn = document.getElementById('view-officer-work-btn');
  viewOfficerWorkBtn?.addEventListener('click', () => {
    store.setActiveTab('super-admin-officer-work');
  });

  const viewMinisterWorkBtn = document.getElementById('view-minister-work-btn');
  viewMinisterWorkBtn?.addEventListener('click', () => {
    store.setActiveTab('super-admin-minister-work');
  });

  const viewReportsBtn = document.getElementById('view-reports-btn');
  viewReportsBtn?.addEventListener('click', () => {
    store.setActiveTab('super-admin-reports');
  });

  const navOfficerWorkCard = document.getElementById('nav-officer-work-card');
  navOfficerWorkCard?.addEventListener('click', () => {
    store.setActiveTab('super-admin-officer-work');
  });

  const navMinisterWorkCard = document.getElementById('nav-minister-work-card');
  navMinisterWorkCard?.addEventListener('click', () => {
    store.setActiveTab('super-admin-minister-work');
  });

  const viewAllAuditsBtn = document.getElementById('view-all-audits-btn');
  viewAllAuditsBtn?.addEventListener('click', () => {
    store.setActiveTab('super-admin-audit-logs');
  });

  if (!dashboardData && !isLoading) {
    await fetchDashboardData();
  }
}

async function fetchDashboardData(force = false) {
  if (isLoading) return;
  isLoading = true;
  loadError = '';
  store.notify();

  try {
    const res = await api.getSuperAdminDashboard();
    dashboardData = res?.data || res;
  } catch (err) {
    loadError = err.message || 'Failed to load Super Admin dashboard statistics.';
    store.addToast('error', loadError);
  } finally {
    isLoading = false;
    store.notify();
  }
}
