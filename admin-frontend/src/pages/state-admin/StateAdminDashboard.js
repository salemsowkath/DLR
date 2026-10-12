import { api } from '../../api.js';
import { store } from '../../store.js';
import { escapeHtml, formatNumber } from '../../utils/format.js';

let dashboardData = null;
let isLoading = false;
let errorMessage = '';

export function renderStateAdminDashboard() {
  const user = store.user || {};
  const stateName = dashboardData?.state || user.state_name || user.state || 'Tamil Nadu';
  const kpis = dashboardData?.kpis || {
    total_officers: dashboardData?.totalOfficers ?? 0,
    active_officers: dashboardData?.activeOfficers ?? 0,
    total_ministers: dashboardData?.totalMinisters ?? 0,
    active_ministers: dashboardData?.activeMinisters ?? 0,
    total_citizens: dashboardData?.totalCitizens ?? 0,
    total_land_records: dashboardData?.totalLandRecords ?? 0,
    pending_applications: dashboardData?.pendingApplications ?? 0,
    ai_processed: dashboardData?.aiProcessed ?? 0,
    pending_verification: dashboardData?.pendingVerification ?? 0,
    approved_records: dashboardData?.approvedRecords ?? 0,
    rejected_records: dashboardData?.rejectedRecords ?? 0,
    tax_statistics: {
      total_collected: dashboardData?.taxStatistics?.totalCollected ?? 0,
    },
  };
  const charts = dashboardData?.charts || {};
  const appsByDistrict = charts.applications_by_district || charts.applicationsByDistrict || [];
  const landByDistrict = charts.land_records_by_district || charts.landRecordsByDistrict || [];

  return `
    <div class="page-content">
      <!-- Portal Header Banner -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.75rem; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1.25rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem;">
            <span style="font-size: 1.8rem;">🏢</span>
            <h1 style="font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; margin: 0;">
              State Administration Portal
            </h1>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="badge badge-primary" style="font-size: 0.85rem; padding: 0.3rem 0.8rem; font-weight: 700;">
              📍 State: ${escapeHtml(stateName)}
            </span>
            <span style="color: var(--text-muted); font-size: 0.9rem;">
              Strict State Jurisdiction Oversight · SIH 2026
            </span>
          </div>
        </div>
        <button id="refresh-state-admin-dashboard-btn" class="btn btn-outline btn-sm">
          🔄 Refresh Metrics
        </button>
      </div>

      ${errorMessage ? `<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${escapeHtml(errorMessage)}</div>` : ''}

      ${
        isLoading && !dashboardData
          ? `
        <div class="loading-state" style="padding: 4rem 0; text-align: center;">
          <div class="spinner"></div>
          <p style="margin-top: 1rem; color: var(--text-muted);">Aggregating state data for ${escapeHtml(stateName)}...</p>
        </div>
      `
          : `
        <!-- KPI Metrics Grid (12 Cards as per Specification) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          
          <div class="card" style="padding: 1.25rem; border-left: 4px solid var(--primary);">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Total Officers</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--text);">${formatNumber(kpis.total_officers ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Assigned to ${escapeHtml(stateName)}</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #10b981;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Active Officers</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #10b981;">${formatNumber(kpis.active_officers ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Active status</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #8b5cf6;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Total Ministers</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--text);">${formatNumber(kpis.total_ministers ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">State leadership</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #06b6d4;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Active Ministers</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #06b6d4;">${formatNumber(kpis.active_ministers ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">In office</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #f59e0b;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Total Citizens</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--text);">${formatNumber(kpis.total_citizens ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Registered residents</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #3b82f6;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Total Land Records</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--text);">${formatNumber(kpis.total_land_records ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Registered parcels</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #ec4899;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Pending Applications</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #ec4899;">${formatNumber(kpis.pending_applications ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Awaiting officer review</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #6366f1;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">AI Processed</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #6366f1;">${formatNumber(kpis.ai_processed ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">FastAPI ML validated</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #eab308;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Pending Verification</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #eab308;">${formatNumber(kpis.pending_verification ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Physical & OTP flow</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #22c55e;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Approved Records</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #22c55e;">${formatNumber(kpis.approved_records ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Digital deed minted</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #ef4444;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Rejected Records</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #ef4444;">${formatNumber(kpis.rejected_records ?? 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">Failed validation</div>
          </div>

          <div class="card" style="padding: 1.25rem; border-left: 4px solid #14b8a6;">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Tax Statistics</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #14b8a6;">₹${formatNumber(kpis.tax_statistics?.total_collected || 0)}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.25rem;">State revenue collected</div>
          </div>

        </div>

        <!-- Breakdown & District Analytics Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          
          <!-- Applications by District -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Applications by District</span>
              <span class="badge badge-secondary" style="font-size: 0.75rem;">${escapeHtml(stateName)}</span>
            </h3>
            ${
              appsByDistrict.length === 0
                ? '<div style="color: var(--text-muted); font-size: 0.88rem; padding: 1.5rem 0; text-align: center;">No application records in this state.</div>'
                : `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${appsByDistrict.slice(0, 8).map((d) => `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                      <span style="font-weight: 600;">${escapeHtml(d.district || 'Unassigned')}</span>
                      <span style="color: var(--text-muted); font-family: monospace;">${formatNumber(d.count)} cases</span>
                    </div>
                    <div style="height: 6px; background: var(--bg-surface); border-radius: 99px; overflow: hidden;">
                      <div style="height: 100%; background: var(--primary); width: ${Math.min(100, Math.max(8, (d.count / (kpis.pending_applications || 1)) * 100))}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `
            }
          </div>

          <!-- Land Records by District -->
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Land Records by District</span>
              <span class="badge badge-secondary" style="font-size: 0.75rem;">${escapeHtml(stateName)}</span>
            </h3>
            ${
              landByDistrict.length === 0
                ? '<div style="color: var(--text-muted); font-size: 0.88rem; padding: 1.5rem 0; text-align: center;">No land records digitized in this state.</div>'
                : `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${landByDistrict.slice(0, 8).map((d) => `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                      <span style="font-weight: 600;">${escapeHtml(d.district || 'Unassigned')}</span>
                      <span style="color: var(--text-muted); font-family: monospace;">${formatNumber(d.count)} records</span>
                    </div>
                    <div style="height: 6px; background: var(--bg-surface); border-radius: 99px; overflow: hidden;">
                      <div style="height: 100%; background: #3b82f6; width: ${Math.min(100, Math.max(8, (d.count / (kpis.total_land_records || 1)) * 100))}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `
            }
          </div>

        </div>

        <!-- Quick Jurisdiction Navigation Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
          
          <div class="card" style="padding: 1.5rem; cursor: pointer;" id="card-nav-officers">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">👮</div>
            <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.35rem;">Manage Officers</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
              Manage and appoint Land Revenue Officers strictly inside ${escapeHtml(stateName)}.
            </p>
            <span class="btn btn-primary btn-sm">View Officers →</span>
          </div>

          <div class="card" style="padding: 1.5rem; cursor: pointer;" id="card-nav-ministers">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🏛️</div>
            <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.35rem;">Manage Ministers</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
              Manage Revenue Ministers assigned to ${escapeHtml(stateName)}.
            </p>
            <span class="btn btn-secondary btn-sm">View Ministers →</span>
          </div>

          <div class="card" style="padding: 1.5rem; cursor: pointer;" id="card-nav-records">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📜</div>
            <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.35rem;">Land Records</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
              Explore land records and pending verification sessions across all districts.
            </p>
            <span class="btn btn-outline btn-sm">Explore Records →</span>
          </div>

        </div>
      `
      }
    </div>
  `;
}

export function attachStateAdminDashboardEvents() {
  document.getElementById('refresh-state-admin-dashboard-btn')?.addEventListener('click', () => {
    void loadDashboard();
  });

  document.getElementById('card-nav-officers')?.addEventListener('click', () => {
    store.setActiveTab('state-admin-officers');
  });

  document.getElementById('card-nav-ministers')?.addEventListener('click', () => {
    store.setActiveTab('state-admin-ministers');
  });

  document.getElementById('card-nav-records')?.addEventListener('click', () => {
    store.setActiveTab('state-admin-records');
  });

  if (!dashboardData && !isLoading) {
    void loadDashboard();
  }
}

async function loadDashboard() {
  isLoading = true;
  errorMessage = '';
  store.notify();

  try {
    const data = await api.getStateAdminDashboard();
    dashboardData = data;
  } catch (err) {
    errorMessage = err.message || 'Failed to load State Admin dashboard.';
  } finally {
    isLoading = false;
    store.notify();
  }
}
