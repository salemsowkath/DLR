import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/format.js';

let aadhaarInput = '';
let regFormData = {
  aadhaarNumber: '',
  fullName: '',
  dateOfBirth: '',
  gender: '',
  state: '',
  district: '',
  taluk: '',
  village: '',
  pincode: '',
};

let otpValues = ['', '', '', '', '', ''];
let maskedAadhaarRef = '';
let maskedPhoneEnding = '';
let currentSessionId = '';
let isLoading = false;
let errorMessage = '';
let otpMode = false; // false = aadhaar entry / register; true = otp verification
let isRegistrationOtp = false;

let countdown = 45;
let timerId = null;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function startCountdown() {
  if (timerId) clearInterval(timerId);
  countdown = 45;
  timerId = setInterval(() => {
    countdown -= 1;
    if (countdown <= 0) { clearInterval(timerId); timerId = null; }
    store.notify();
  }, 1000);
}

function resetCitizenState() {
  aadhaarInput = '';
  otpValues = ['', '', '', '', '', ''];
  maskedAadhaarRef = '';
  maskedPhoneEnding = '';
  currentSessionId = '';
  isLoading = false;
  errorMessage = '';
  otpMode = false;
  isRegistrationOtp = false;
  if (timerId) { clearInterval(timerId); timerId = null; }
}

export function renderCitizenLogin() {
  const showReg = store.activeTab === 'citizen-register';

  if (otpMode) {
    return `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📱</div>
            <h1>Verify Your Identity</h1>
            <p>OTP sent to mobile ending in ${escapeHtml(maskedPhoneEnding || '••••' + (maskedAadhaarRef || '').slice(-4))}</p>
          </div>

          ${errorMessage ? `<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${escapeHtml(errorMessage)}</div>` : ''}

          <form id="citizen-otp-form">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
              <label class="form-label" style="margin:0;">Verified Identity Reference</label>
              <span class="badge badge-info">${escapeHtml(maskedAadhaarRef)}</span>
            </div>

            <div class="otp-inputs-container" style="display:flex;gap:0.5rem;justify-content:center;margin:1.5rem 0;">
              ${[0,1,2,3,4,5].map((i) => `
                <input type="text" class="otp-box" data-index="${i}" maxlength="1" inputmode="numeric" pattern="[0-9]*" value="${escapeHtml(otpValues[i] || '')}" ${i === 0 ? 'autofocus' : ''} />
              `).join('')}
            </div>

            <button type="submit" id="citizen-otp-submit-btn" class="btn btn-primary" style="width:100%;font-size:1rem;padding:0.85rem;" ${isLoading ? 'disabled' : ''}>
              ${isLoading ? '<div class="spinner"></div> Verifying...' : isRegistrationOtp ? 'Verify & Register' : 'Verify OTP & Enter Portal'}
            </button>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.25rem;padding:0.75rem 1rem;background:rgba(0,0,0,0.2);border-radius:var(--radius-md);border:1px solid var(--border-color);">
              <button type="button" id="citizen-resend-otp-btn" class="btn btn-outline" style="font-size:0.85rem;padding:0.4rem 0.75rem;" ${countdown > 0 || isLoading ? 'disabled' : ''}>
                Resend OTP
              </button>
              <span style="font-family:monospace;font-size:1.1rem;font-weight:700;color:${countdown > 0 ? 'var(--primary)' : 'var(--text-muted)'};">
                ${formatTime(countdown)}
              </span>
            </div>

            <button type="button" id="citizen-otp-back-btn" class="btn btn-outline" style="width:100%;margin-top:1rem;">
              ← Back to ${isRegistrationOtp ? 'Registration' : 'Login'}
            </button>
          </form>

          <div style="margin-top:1.5rem;text-align:center;">
            <a href="#" id="back-to-portal-link-otp" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
          </div>
        </div>
      </div>
    `;
  }

  if (showReg) {
    return `
      <div class="auth-container">
        <div class="auth-card wide-card">
          <div class="auth-header">
            <div style="font-size:2.5rem;margin-bottom:0.5rem;">📝</div>
            <h1>Create Citizen Account</h1>
            <p>Register your identity with official land records</p>
          </div>

          ${errorMessage ? `<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${escapeHtml(errorMessage)}</div>` : ''}

          <form id="citizen-register-form">
            <div style="margin-bottom:1rem;border-bottom:1px solid var(--border-color);padding-bottom:0.5rem;">
              <h3 style="font-size:0.9rem;text-transform:uppercase;color:var(--primary);letter-spacing:0.05em;font-weight:700;">Identity Details</h3>
            </div>
            <div class="two-column" style="margin-top:0;margin-bottom:1rem;">
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-aadhaar">Aadhaar Number *</label>
                <input type="text" id="reg-aadhaar" class="form-control" placeholder="12-digit number" maxlength="14" value="${escapeHtml(regFormData.aadhaarNumber)}" required />
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-name">Full Name *</label>
                <input type="text" id="reg-name" class="form-control" placeholder="As per official documents" value="${escapeHtml(regFormData.fullName)}" required />
              </div>
            </div>
            <div class="two-column" style="margin-top:0;margin-bottom:1.25rem;">
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-dob">Date of Birth *</label>
                <input type="date" id="reg-dob" class="form-control" value="${escapeHtml(regFormData.dateOfBirth)}" required />
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-gender">Gender *</label>
                <select id="reg-gender" class="form-control" required style="appearance:auto;">
                  <option value="">Select Gender</option>
                  <option value="Male" ${regFormData.gender === 'Male' ? 'selected' : ''}>Male</option>
                  <option value="Female" ${regFormData.gender === 'Female' ? 'selected' : ''}>Female</option>
                  <option value="Other" ${regFormData.gender === 'Other' ? 'selected' : ''}>Other</option>
                  <option value="Prefer not to say" ${regFormData.gender === 'Prefer not to say' ? 'selected' : ''}>Prefer not to say</option>
                </select>
              </div>
            </div>

            <div style="margin-bottom:1rem;border-bottom:1px solid var(--border-color);padding-bottom:0.5rem;">
              <h3 style="font-size:0.9rem;text-transform:uppercase;color:var(--primary);letter-spacing:0.05em;font-weight:700;">Address Details</h3>
            </div>
            <div class="two-column" style="margin-top:0;margin-bottom:0.75rem;">
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-state">State *</label>
                <input type="text" id="reg-state" class="form-control" placeholder="e.g. Tamil Nadu" value="${escapeHtml(regFormData.state)}" required />
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-district">District *</label>
                <input type="text" id="reg-district" class="form-control" placeholder="e.g. Salem" value="${escapeHtml(regFormData.district)}" required />
              </div>
            </div>
            <div class="two-column" style="margin-top:0;margin-bottom:1.25rem;">
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-taluk">Taluk *</label>
                <input type="text" id="reg-taluk" class="form-control" placeholder="e.g. Attur" value="${escapeHtml(regFormData.taluk)}" required />
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" for="reg-village">Village / Town *</label>
                <input type="text" id="reg-village" class="form-control" placeholder="e.g. Attur Town" value="${escapeHtml(regFormData.village)}" required />
              </div>
            </div>
            <div class="form-group" style="margin-bottom:1.5rem;">
              <label class="form-label" for="reg-pincode">Pincode *</label>
              <input type="text" id="reg-pincode" class="form-control" placeholder="6-digit pincode" maxlength="6" value="${escapeHtml(regFormData.pincode)}" required />
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;font-size:1rem;padding:0.85rem;" ${isLoading ? 'disabled' : ''}>
              ${isLoading ? '<div class="spinner"></div> Processing Registration...' : 'Verify & Send OTP →'}
            </button>
          </form>

          <div style="margin-top:1.25rem;text-align:center;font-size:0.9rem;">
            <span style="color:var(--text-muted);">Already registered?</span>
            <a href="#" id="link-go-citizen-login" style="color:var(--primary);font-weight:600;text-decoration:none;margin-left:0.35rem;">Login here</a>
          </div>
          <div style="margin-top:0.75rem;text-align:center;">
            <a href="#" id="back-to-portal-link-reg" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
          </div>
        </div>
      </div>
    `;
  }

  // Default: Aadhaar login
  return `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">👤</div>
          <h1>Citizen Land Portal</h1>
          <p>Aadhaar Identity Authentication</p>
        </div>

        ${errorMessage ? `<div class="badge badge-danger" style="width:100%;padding:0.75rem;margin-bottom:1.25rem;font-size:0.85rem;text-transform:none;">⚠️ ${escapeHtml(errorMessage)}</div>` : ''}

        <form id="citizen-otp-request-form">
          <div class="form-group">
            <label class="form-label" for="citizen-aadhaar-input">12-Digit Aadhaar Number</label>
            <input type="text" id="citizen-aadhaar-input" class="form-control" placeholder="e.g. 9999 8888 1234" maxlength="14" value="${escapeHtml(aadhaarInput)}" required autocomplete="off" />
            <div style="font-size:0.75rem;color:var(--text-subtle);margin-top:0.35rem;">
              Your Aadhaar is used for identity verification only. Full Aadhaar is never stored or displayed.
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;" ${isLoading ? 'disabled' : ''}>
            ${isLoading ? '<div class="spinner"></div> Requesting OTP...' : 'Send OTP →'}
          </button>
        </form>

        <div style="margin-top:1.25rem;text-align:center;font-size:0.9rem;">
          <span style="color:var(--text-muted);">New citizen?</span>
          <a href="#" id="link-go-citizen-register" style="color:var(--primary);font-weight:600;text-decoration:none;margin-left:0.35rem;">Register Now</a>
        </div>
        <div style="margin-top:0.75rem;text-align:center;">
          <a href="#" id="back-to-portal-link" style="font-size:0.85rem;color:var(--text-muted);text-decoration:none;">← Back to Portal Selection</a>
        </div>
      </div>
    </div>
  `;
}

export function attachCitizenLoginEvents() {
  // Back to portal
  ['back-to-portal-link', 'back-to-portal-link-otp', 'back-to-portal-link-reg'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      e.preventDefault();
      resetCitizenState();
      store.activeTab = 'portal';
      store.notify();
    });
  });

  // Switch to register
  document.getElementById('link-go-citizen-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorMessage = '';
    store.activeTab = 'citizen-register';
    store.notify();
  });

  // Switch back to login from register
  document.getElementById('link-go-citizen-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorMessage = '';
    store.activeTab = 'citizen-login';
    store.notify();
  });

  // OTP Request form
  document.getElementById('citizen-otp-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawValue = (document.getElementById('citizen-aadhaar-input')?.value || '').trim();
    const cleanAadhaar = rawValue.replace(/[\s-]/g, '');
    if (cleanAadhaar.length !== 12 || !/^\d{12}$/.test(cleanAadhaar)) {
      errorMessage = 'Please enter a valid 12-digit Aadhaar number.';
      store.notify();
      return;
    }
    aadhaarInput = cleanAadhaar;
    isLoading = true;
    errorMessage = '';
    store.notify();
    try {
      const res = await api.citizenLogin(cleanAadhaar);
      maskedAadhaarRef = res.maskedAadhaar || `XXXX-XXXX-${cleanAadhaar.slice(-4)}`;
      maskedPhoneEnding = `••••${cleanAadhaar.slice(-4)}`;
      currentSessionId = res.sessionId;
      isRegistrationOtp = false;
      otpValues = ['', '', '', '', '', ''];
      otpMode = true;
      startCountdown();
      store.addToast('success', `OTP sent to mobile registered with ${maskedAadhaarRef}.`);
    } catch (error) {
      errorMessage = error.status === 404 || error.code === 'CITIZEN_NOT_FOUND'
        ? 'Citizen account not found. Please register first.'
        : error.message || 'Failed to request OTP.';
    } finally {
      isLoading = false;
      store.notify();
    }
  });

  // Register form submit
  document.getElementById('citizen-register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const aadhaarVal = (document.getElementById('reg-aadhaar')?.value || '').trim().replace(/[\s-]/g, '');
    const nameVal = (document.getElementById('reg-name')?.value || '').trim();
    const dobVal = (document.getElementById('reg-dob')?.value || '').trim();
    const genderVal = (document.getElementById('reg-gender')?.value || '').trim();
    const stateVal = (document.getElementById('reg-state')?.value || '').trim();
    const districtVal = (document.getElementById('reg-district')?.value || '').trim();
    const talukVal = (document.getElementById('reg-taluk')?.value || '').trim();
    const villageVal = (document.getElementById('reg-village')?.value || '').trim();
    const pincodeVal = (document.getElementById('reg-pincode')?.value || '').trim();

    regFormData = { aadhaarNumber: aadhaarVal, fullName: nameVal, dateOfBirth: dobVal, gender: genderVal, state: stateVal, district: districtVal, taluk: talukVal, village: villageVal, pincode: pincodeVal };

    if (aadhaarVal.length !== 12 || !/^\d{12}$/.test(aadhaarVal)) { errorMessage = 'Aadhaar number must contain exactly 12 numeric digits.'; store.notify(); return; }
    if (!nameVal) { errorMessage = 'Full Name is required.'; store.notify(); return; }
    if (!dobVal) { errorMessage = 'Date of Birth is required.'; store.notify(); return; }
    if (!genderVal) { errorMessage = 'Please select a Gender option.'; store.notify(); return; }
    if (!stateVal || !districtVal || !talukVal || !villageVal) { errorMessage = 'State, District, Taluk, and Village are all required.'; store.notify(); return; }
    if (pincodeVal.length !== 6 || !/^\d{6}$/.test(pincodeVal)) { errorMessage = 'Pincode must contain exactly 6 numeric digits.'; store.notify(); return; }

    aadhaarInput = aadhaarVal;
    isLoading = true;
    errorMessage = '';
    store.notify();

    try {
      const res = await api.citizenRegister(regFormData);
      maskedAadhaarRef = res.maskedAadhaar || `XXXX-XXXX-${aadhaarVal.slice(-4)}`;
      maskedPhoneEnding = `••••${aadhaarVal.slice(-4)}`;
      currentSessionId = res.sessionId;
      isRegistrationOtp = true;
      otpValues = ['', '', '', '', '', ''];
      otpMode = true;
      startCountdown();
      store.addToast('success', `Registration initiated! OTP sent for ${maskedAadhaarRef}.`);
    } catch (error) {
      errorMessage = error.status === 409 || error.code === 'DUPLICATE_IDENTITY' || error.code === 'CITIZEN_ALREADY_REGISTERED'
        ? 'This identity is already registered. Please use Citizen Login.'
        : error.message || 'Registration failed. Please try again.';
    } finally {
      isLoading = false;
      store.notify();
    }
  });

  // OTP box inputs
  document.querySelectorAll('.otp-box').forEach((box) => {
    box.addEventListener('input', (e) => {
      const idx = parseInt(box.getAttribute('data-index'), 10);
      const val = e.target.value.replace(/\D/g, '');
      box.value = val ? val.slice(-1) : '';
      otpValues[idx] = box.value;
      if (val && idx < 5) document.querySelector(`.otp-box[data-index="${idx + 1}"]`)?.focus();
    });

    box.addEventListener('keydown', (e) => {
      const idx = parseInt(box.getAttribute('data-index'), 10);
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        const prev = document.querySelector(`.otp-box[data-index="${idx - 1}"]`);
        if (prev) { prev.focus(); prev.value = ''; otpValues[idx - 1] = ''; }
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6).split('');
      digits.forEach((d, i) => {
        otpValues[i] = d;
        const b = document.querySelector(`.otp-box[data-index="${i}"]`);
        if (b) b.value = d;
      });
      document.querySelector(`.otp-box[data-index="${Math.min(digits.length, 5)}"]`)?.focus();
    });
  });

  // OTP submit
  document.getElementById('citizen-otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredOtp = otpValues.join('');
    if (enteredOtp.length !== 6 || !/^\d{6}$/.test(enteredOtp)) {
      errorMessage = 'Please enter the complete 6-digit OTP code.';
      store.notify();
      return;
    }
    isLoading = true;
    errorMessage = '';
    store.notify();
    try {
      const res = await api.citizenVerifyOtp({ aadhaarNumber: aadhaarInput, otp: enteredOtp, sessionId: currentSessionId });
      if (timerId) clearInterval(timerId);
      resetCitizenState();
      store.addToast('success', isRegistrationOtp ? 'Account created & verified! Welcome to the Citizen Portal.' : 'Authentication successful! Welcome to the Citizen Portal.');
      await store.setAuthenticatedUser(res.user);
    } catch (error) {
      errorMessage = error.message || 'Verification failed. Incorrect or expired OTP code.';
      isLoading = false;
      store.notify();
    }
  });

  // Resend OTP
  document.getElementById('citizen-resend-otp-btn')?.addEventListener('click', async () => {
    if (countdown > 0 || isLoading) return;
    isLoading = true;
    errorMessage = '';
    store.notify();
    try {
      const res = isRegistrationOtp ? await api.citizenRegister(regFormData) : await api.citizenLogin(aadhaarInput);
      currentSessionId = res.sessionId;
      otpValues = ['', '', '', '', '', ''];
      startCountdown();
      store.addToast('success', `A new OTP has been sent for ${maskedAadhaarRef}.`);
    } catch (error) {
      errorMessage = error.message || 'Failed to resend OTP.';
    } finally {
      isLoading = false;
      store.notify();
    }
  });

  // Back from OTP
  document.getElementById('citizen-otp-back-btn')?.addEventListener('click', () => {
    if (timerId) clearInterval(timerId);
    otpMode = false;
    errorMessage = '';
    store.notify();
  });
}
