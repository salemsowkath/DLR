import { store } from '../store.js';

function getPortalUrl(port, path = '') {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol || 'http:';
    const host = window.location.hostname;
    return `${protocol}//${host}:${port}${path}`;
  }
  return `http://localhost:${port}${path}`;
}

export function renderGovernmentPortal() {
  const citizenUrl = getPortalUrl(3000, '/citizen/login');
  const adminUrl = getPortalUrl(3002, '/portal');

  return `
    <div class="auth-container">
      <div class="auth-card" style="max-width:620px;">
        <div class="auth-header">
          <div style="font-size:2.8rem;margin-bottom:0.5rem;">🏛️</div>
          <h1 style="font-size:1.6rem;font-weight:700;">DLR Portal Selection</h1>
          <p style="color:#94a3b8;font-size:0.9rem;">
            Intelligent Land Record Digitization & Validation System<br />
            Select your portal and administrative role to continue
          </p>
        </div>

        <div style="display:flex;flex-direction:column;gap:1.25rem;margin:1.5rem 0;">
          <!-- 1. GOVERNMENT PORTAL (HOSTED ON PORT 3001) -->
          <div style="border: 2px solid #3b82f6; border-radius: 12px; padding: 1.25rem; background: rgba(59, 130, 246, 0.05);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
              <div style="font-weight: 700; font-size: 1rem; color: #93c5fd; display: flex; align-items: center; gap: 0.5rem;">
                <span>🏛️</span> GOVERNMENT PORTAL
              </div>
              <span class="badge badge-primary" style="font-size: 0.72rem;">THIS PLATFORM · PORT 3001</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div
                id="portal-select-officer"
                style="border: 1px solid #334155; border-radius: 8px; padding: 1rem; background: #1e293b; cursor: pointer; transition: all 0.2s;"
                onmouseover="this.style.borderColor='#3b82f6';this.style.transform='translateY(-2px)';"
                onmouseout="this.style.borderColor='#334155';this.style.transform='translateY(0)';"
              >
                <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
                  <span style="font-size: 1.4rem;">👮</span>
                  <div style="font-weight: 700; color: #f8fafc; font-size: 0.95rem;">OFFICER LOGIN</div>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.3;">
                  Document Review, AI Verification & Approvals
                </div>
              </div>

              <div
                id="portal-select-minister"
                style="border: 1px solid #334155; border-radius: 8px; padding: 1rem; background: #1e293b; cursor: pointer; transition: all 0.2s;"
                onmouseover="this.style.borderColor='#a855f7';this.style.transform='translateY(-2px)';"
                onmouseout="this.style.borderColor='#334155';this.style.transform='translateY(0)';"
              >
                <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
                  <span style="font-size: 1.4rem;">🏛️</span>
                  <div style="font-weight: 700; color: #c084fc; font-size: 0.95rem;">MINISTER LOGIN</div>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.3;">
                  State Land Governance, Analytics & Reports
                </div>
              </div>
            </div>
          </div>

          <!-- 2. CITIZEN PORTAL (PORT 3000) -->
          <div style="border: 1px solid #334155; border-radius: 10px; padding: 1rem 1.25rem; background: #1e293b; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #f8fafc; display: flex; align-items: center; gap: 0.5rem;">
                <span>👥</span> CITIZEN PORTAL
              </div>
              <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.2rem;">
                Submit land records, track status, view verified documents (Port 3000)
              </div>
            </div>
            <a href="${citizenUrl}" class="btn btn-outline btn-sm" style="font-weight: 600; text-decoration: none;">
              Citizen Sign In →
            </a>
          </div>

          <!-- 3. ADMINISTRATION PORTAL (PORT 3002) -->
          <div style="border: 1px solid #334155; border-radius: 10px; padding: 1rem 1.25rem; background: #1e293b;">
            <div style="font-weight: 700; font-size: 0.95rem; color: #f8fafc; margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>🛡️</span> ADMINISTRATION PORTAL (Port 3002)
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <a href="${getPortalUrl(3002, '/state-admin/login')}" class="btn btn-outline btn-sm" style="text-decoration: none; justify-content: center; font-size: 0.82rem;">
                🏢 STATE ADMIN LOGIN →
              </a>
              <a href="${getPortalUrl(3002, '/super-admin/login')}" class="btn btn-outline btn-sm" style="text-decoration: none; justify-content: center; font-size: 0.82rem;">
                🛡️ SUPER ADMIN LOGIN →
              </a>
            </div>
          </div>
        </div>

        <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #334155;text-align:center;font-size:0.8rem;color:#64748b;">
          Government of India · Problem Statement 26018 · SIH 2026<br />
          Role-Based Access Control and Jurisdiction Enforcement Active.
        </div>
      </div>
    </div>
  `;
}

export function attachGovernmentPortalEvents() {
  document.getElementById('portal-select-officer')?.addEventListener('click', () => {
    store.activeTab = 'officer-login';
    store.notify();
  });

  document.getElementById('portal-select-minister')?.addEventListener('click', () => {
    store.activeTab = 'minister-login';
    store.notify();
  });
}
