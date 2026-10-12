import { store } from '../store.js';
import { escapeHtml, formatDate, statusClass } from '../utils/format.js';

export function renderAppointments() {
  if (store.appointmentsLoading) {
    return `
      <div class="page-content">
        <div class="loading-state"><span class="spinner"></span> Loading appointments…</div>
      </div>
    `;
  }

  if (store.appointmentsError) {
    return `
      <div class="page-content">
        <div class="notice notice-error">${escapeHtml(store.appointmentsError)}</div>
      </div>
    `;
  }

  const appointments = store.appointments || [];

  return `
    <div class="page-content">
      <div class="page-heading heading-actions">
        <div>
          <h1>Land Record Verification Appointments</h1>
          <p>Scheduled government office appointments for physical document verification and biometrics.</p>
        </div>
        <button id="refresh-appointments-btn" class="btn btn-outline btn-sm">Refresh Appointments</button>
      </div>

      <section class="card">
        ${appointments.length ? `
          <div style="display: grid; gap: 1.25rem;">
            ${appointments.map((apt) => {
              const isScheduled = apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED';
              return `
                <div class="card" style="background: var(--bg-surface); border: 1px solid ${isScheduled ? 'var(--primary)' : 'var(--border-color)'}; border-left: 4px solid ${isScheduled ? 'var(--primary)' : 'var(--border-color)'}; padding: 1.25rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em;">Land Record Verification Appointment</span>
                      <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0.2rem 0; color: var(--text-main);">Application: ${escapeHtml(apt.case_id || '—')}</h2>
                    </div>
                    <span class="badge ${statusClass(apt.status)}" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">
                      ${escapeHtml(apt.status)}
                    </span>
                  </div>

                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px;">
                    <div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Appointment Date</div>
                      <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-top: 0.2rem;">
                        📅 ${escapeHtml(apt.appointment_date || '—')}
                      </div>
                    </div>
                    <div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Time Slot</div>
                      <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-top: 0.2rem;">
                        ⏰ ${escapeHtml(apt.appointment_time || '—')}
                      </div>
                    </div>
                    <div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Government Office</div>
                      <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-top: 0.2rem;">
                        🏛️ ${escapeHtml(apt.office_location || 'Revenue Divisional Office')}
                      </div>
                    </div>
                    <div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Verification Officer</div>
                      <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-top: 0.2rem;">
                        👮 ${escapeHtml(apt.officer_id || 'Assigned Officer')}
                      </div>
                    </div>
                  </div>

                  <div style="margin-top: 0.75rem; font-size: 0.88rem; color: var(--text-muted);">
                    <strong>Purpose:</strong> ${escapeHtml(apt.purpose || 'Original document scrutiny and physical land owner verification.')}
                  </div>

                  ${apt.notes ? `
                    <div style="margin-top: 0.5rem; font-size: 0.82rem; color: var(--text-subtle);">
                      <strong>Instructions:</strong> ${escapeHtml(apt.notes)}
                    </div>
                  ` : ''}

                  <div class="notice notice-info" style="margin-top: 1rem; margin-bottom: 0; font-size: 0.85rem;">
                    💡 <strong>What to bring:</strong> Please bring your original land deeds/patta documents and government-issued photo identity proof (Aadhaar/Voter ID) to the designated office.
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
            <h2>No Appointments Scheduled</h2>
            <p>When the reviewing officer initiates physical verification for your land record, your appointment details will appear here.</p>
          </div>
        `}
      </section>
    </div>
  `;
}

export function attachAppointmentsEvents() {
  document.getElementById('refresh-appointments-btn')?.addEventListener('click', () => {
    void store.loadAppointments();
  });
}
