import { store } from '../store.js';

function getPortalUrl(port, path = '') {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol || 'http:';
    const host = window.location.hostname;
    return `${protocol}//${host}:${port}${path}`;
  }
  return `http://localhost:${port}${path}`;
}

export function renderAdminPortal() {
  const citizenUrl = getPortalUrl(3000, '/citizen/login');
  const govUrl = getPortalUrl(3001, '/portal');

  return `
    <div class="auth-container">
      <div class="auth-card" style="max-width:620px;">
        <div class="auth-header">
          <div style="font-size:2.8rem;margin-bottom:0.5rem;">🛡️</div>
          <h1 style="font-size:1.6rem;font-weight:700;">DLR Portal Selection</h1>
          <p style="color:#94a3b8;font-size:0.9rem;">
            Intelligent Land Record Digitization & Governance System<br />
            Select your administrative level or portal to continue
          </p>
        </div>

        <div style="display:flex;flex-direction:column;gap:1.25rem;margin:1.5rem 0;">
          <!-- 1. ADMINISTRATION PORTAL (HOSTED ON PORT 3002) -->
          <div style="border: 2px solid #a855f7; border-radius: 12px; padding: 1.25rem; background: rgba(168, 85, 247, 0.05);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
              <div style="font-weight: 700; font-size: 1rem; color: #d8b4fe; display: flex; align-items: center; gap: 0.5rem;">
                <span>🛡️</span> ADMINISTRATION PORTAL
              </div>
              <span class="badge badge-warning" style="font-size: 0.72rem; background: rgba(168,85,247,0.2); color: #c084fc; border-color: rgba(168,85,247,0.4);">THIS PLATFORM · PORT 3002</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div
                id="portal-select-state-admin"
                style="border: 1px solid #334155; border-radius: 8px; padding: 1rem; background: #1e293b; cursor: pointer; transition: all 0.2s;"
                onmouseover="this.style.borderColor='#a855f7';this.style.transform='translateY(-2px)';"
                onmouseout="this.style.borderColor='#334155';this.style.transform='translateY(0)';"
              >
                <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
                  <span style="font-size: 1.4rem;">🏢</span>
                  <div style="font-weight: 700; color: #f8fafc; font-size: 0.92rem;">STATE ADMIN LOGIN</div>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.3;">
                  State Officers, Ministers & Land Governance
                </div>
              </div>

              <div
                id="portal-select-super-admin"
                style="border: 1px solid #334155; border-radius: 8px; padding: 1rem; background: #1e293b; cursor: pointer; transition: all 0.2s;"
                onmouseover="this.style.borderColor='#3b82f6';this.style.transform='translateY(-2px)';"
                onmouseout="this.style.borderColor='#334155';this.style.transform='translateY(0)';"
              >
                <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
                  <span style="font-size: 1.4rem;">🛡️</span>
                  <div style="font-weight: 700; color: #60a5fa; font-size: 0.92rem;">SUPER ADMIN LOGIN</div>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.3;">
                  Nationwide System (All 28 States) & Logs
                </div>
              </div>
            </div>
          </div>

          <!-- 2. GOVERNMENT PORTAL (PORT 3001) -->
          <div style="border: 1px solid #334155; border-radius: 10px; padding: 1rem 1.25rem; background: #1e293b;">
            <div style="font-weight: 700; font-size: 0.95rem; color: #f8fafc; margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>🏛️</span> GOVERNMENT PORTAL (Port 3001)
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <a href="${getPortalUrl(3001, '/officer/login')}" class="btn btn-outline btn-sm" style="text-decoration: none; justify-content: center; font-size: 0.82rem;">
                👮 OFFICER LOGIN →
              </a>
              <a href="${getPortalUrl(3001, '/minister/login')}" class="btn btn-outline btn-sm" style="text-decoration: none; justify-content: center; font-size: 0.82rem;">
                🏛️ MINISTER LOGIN →
              </a>
            </div>
          </div>

          <!-- 3. CITIZEN PORTAL (PORT 3000) -->
          <div style="border: 1px solid #334155; border-radius: 10px; padding: 1rem 1.25rem; background: #1e293b; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #f8fafc; display: flex; align-items: center; gap: 0.5rem;">
                <span>👥</span> CITIZEN PORTAL
              </div>
              <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.2rem;">
                Citizen verification, submissions & appointments (Port 3000)
              </div>
            </div>
            <a href="${citizenUrl}" class="btn btn-outline btn-sm" style="font-weight: 600; text-decoration: none;">
              Citizen Sign In →
            </a>
          </div>
        </div>

        <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #334155;text-align:center;font-size:0.8rem;color:#64748b;">
          Government of India · Problem Statement 26018 · SIH 2026<br />
          Administrative credentials and session integrity strictly monitored.
        </div>
      </div>
    </div>
  `;
}

export function attachAdminPortalEvents() {
  document.getElementById('portal-select-state-admin')?.addEventListener('click', () => {
    store.activeTab = 'state-admin-login';
    store.notify();
  });

  document.getElementById('portal-select-super-admin')?.addEventListener('click', () => {
    store.activeTab = 'super-admin-login';
    store.notify();
  });
}
