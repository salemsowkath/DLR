function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    // When accessing via LAN IP or non-localhost host, automatically use the current host on backend port 4000
    if (host !== 'localhost' && host !== '127.0.0.1') {
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        const protocol = window.location.protocol || 'http:';
        return `${protocol}//${host}:4000`;
      }
    }
  }
  return envUrl || 'http://localhost:4000';
}

const API_BASE_URL = resolveApiBaseUrl();

function getStoredToken() {
  return localStorage.getItem('dlr_admin_token') || null;
}

function setStoredToken(token) {
  if (token) {
    localStorage.setItem('dlr_admin_token', token);
  } else {
    localStorage.removeItem('dlr_admin_token');
  }
}

function getClientContextId() {
  let ctx = localStorage.getItem('dlr_browser_context_id');
  if (!ctx) {
    ctx = 'ctx-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
    localStorage.setItem('dlr_browser_context_id', ctx);
  }
  return ctx;
}

const sessionChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('dlr_browser_session_channel')
  : null;

if (sessionChannel) {
  sessionChannel.onmessage = (event) => {
    const role = event.data?.role;
    // If a login occurs for a non-admin role (e.g. Citizen, Officer, Minister)
    if (event.data?.type === 'DLR_NEW_LOGIN' && role !== 'SUPER_ADMIN' && role !== 'STATE_ADMIN') {
      setStoredToken(null);
      window.dispatchEvent(new CustomEvent('dlr:session-replaced', {
        detail: { message: 'Your DLR session was replaced by a new login.', newRole: role },
      }));
    }
  };
}

export function broadcastNewLogin(user, role) {
  if (sessionChannel && user) {
    sessionChannel.postMessage({
      type: 'DLR_NEW_LOGIN',
      role: role || user.role || user.roles?.[0] || 'SUPER_ADMIN',
      userId: user.id,
      timestamp: Date.now(),
      contextId: getClientContextId(),
    });
  }
}

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredToken();

  const headers = {
    ...(options.headers || {}),
    'x-client-context-id': getClientContextId(),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!options.isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    method: options.method || 'GET',
    headers,
    body: options.isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    throw new Error('Network error: Unable to communicate with DLR backend service.');
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      setStoredToken(null);
      if (data?.error?.code === 'SESSION_REPLACED') {
        window.dispatchEvent(new CustomEvent('dlr:session-replaced', {
          detail: { message: data.error.message || 'Your DLR session was replaced by a new login.' },
        }));
      } else {
        window.dispatchEvent(new CustomEvent('dlr:unauthorized'));
      }
    }
    const errorMessage = data?.error?.message || data?.message || `API Error (${response.status})`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = data?.error?.code || 'API_ERROR';
    error.details = data?.error?.details || null;
    throw error;
  }

  return data?.data || data;
}

export const api = {
  getStoredToken,
  setStoredToken,

  async requestOtp(aadhaarNumber) {
    return apiFetch('/api/auth/citizen/otp/request', {
      method: 'POST',
      body: { aadhaarNumber },
    });
  },

  async citizenLogin(aadhaarNumber) {
    return this.requestOtp(aadhaarNumber);
  },

  async citizenRegister(registrationData) {
    return apiFetch('/api/auth/citizen/register', {
      method: 'POST',
      body: registrationData,
    });
  },

  async verifyOtp({ aadhaarNumber, otp, sessionId }) {
    const res = await apiFetch('/api/auth/citizen/otp/verify', {
      method: 'POST',
      body: { aadhaarNumber, otp, sessionId },
    });

    if (res?.accessToken) {
      setStoredToken(res.accessToken);
    }
    return res;
  },

  async citizenVerifyOtp({ aadhaarNumber, otp, sessionId }) {
    return this.verifyOtp({ aadhaarNumber, otp, sessionId });
  },

  async citizenVerifyRegistrationOtp({ aadhaarNumber, otp, sessionId }) {
    return this.verifyOtp({ aadhaarNumber, otp, sessionId });
  },

  async officerLogin({ username, identifier, password }) {
    const loginUser = username || identifier;
    const res = await apiFetch('/api/auth/officer/login', {
      method: 'POST',
      body: { username: loginUser, identifier: loginUser, password },
    });

    if (res?.accessToken) {
      setStoredToken(res.accessToken);
    }
    return res;
  },

  async ministerLogin({ username, identifier, password }) {
    const loginUser = username || identifier;
    const res = await apiFetch('/api/auth/minister/login', {
      method: 'POST',
      body: { username: loginUser, identifier: loginUser, password },
    });

    if (res?.accessToken) {
      setStoredToken(res.accessToken);
    }
    return res;
  },

  async superAdminLogin({ username, identifier, password }) {
    const loginUser = username || identifier;
    const res = await apiFetch('/api/auth/super-admin/login', {
      method: 'POST',
      body: { username: loginUser, identifier: loginUser, password },
    });

    const token = res?.token || res?.accessToken || res?.data?.token || res?.data?.accessToken;
    if (token) {
      setStoredToken(token);
    }
    return res;
  },

  async stateAdminLogin({ username, identifier, password }) {
    const loginUser = username || identifier;
    const res = await apiFetch('/api/auth/state-admin/login', {
      method: 'POST',
      body: { username: loginUser, identifier: loginUser, password },
    });

    const token = res?.token || res?.accessToken || res?.data?.token || res?.data?.accessToken;
    if (token) {
      setStoredToken(token);
    }
    return res;
  },

  async getMe() {
    return apiFetch('/api/auth/me');
  },

  async logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch('/api/documents/upload', {
      method: 'POST',
      isFormData: true,
      body: formData,
    });
  },

  async checkDuplicateRecord({ surveyNumber, village, taluk, district }) {
    return apiFetch('/api/documents/check-duplicate', {
      method: 'POST',
      body: { surveyNumber, village, taluk, district },
    });
  },

  async submitCitizenApplication(file, { citizenData = {} } = {}) {
    const formData = new FormData();
    formData.append('file', file);
    for (const [key, value] of Object.entries(citizenData)) {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    }
    return apiFetch('/api/documents', {
      method: 'POST',
      isFormData: true,
      body: formData,
    });
  },

  async processDocument(file, { language = 'eng', geometry = null, crs = '', citizenData = {} } = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    if (geometry) {
      formData.append('geometry', typeof geometry === 'string' ? geometry : JSON.stringify(geometry));
    }
    if (crs) {
      formData.append('crs', crs);
    }

    for (const [key, value] of Object.entries(citizenData)) {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    }

    return apiFetch('/api/documents/process', {
      method: 'POST',
      isFormData: true,
      body: formData,
    });
  },

  async getMyDocuments() {
    const res = await apiFetch('/api/documents/mine');
    return res?.documents || res || [];
  },

  async getDocumentById(documentId) {
    return apiFetch(`/api/documents/${documentId}`);
  },

  async getDocumentFile(documentId) {
    const response = await fetch(`${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}/file`, {
      headers: getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {},
    });
    if (!response.ok) {
      if (response.status === 401) {
        setStoredToken(null);
        window.dispatchEvent(new CustomEvent('dlr:unauthorized'));
      }
      const error = new Error(response.status === 403 ? 'You do not have access to this document.' : 'Unable to load the original document.');
      error.status = response.status;
      throw error;
    }
    return response.blob();
  },

  getDocumentFileUrl(documentId) {
    return `${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}/file`;
  },

  async getMyApplications() {
    const res = await apiFetch('/api/documents/applications/mine');
    return res?.applications || [];
  },

  // Officer / Review Workflow APIs
  async getReviewCases(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.priority) query.set('priority', params.priority);
    if (params.limit) query.set('limit', params.limit);
    if (params.offset) query.set('offset', params.offset);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/api/review/cases${qs}`);
  },

  async getReviewCaseById(caseId) {
    return apiFetch(`/api/review/cases/${caseId}`);
  },

  async triggerAiProcessCase(caseId, { language = 'eng' } = {}) {
    return apiFetch(`/api/review/cases/${caseId}/process-ai`, {
      method: 'POST',
      body: { language },
    });
  },

  async startReviewCase(caseId) {
    return apiFetch(`/api/review/cases/${caseId}/start`, { method: 'POST' });
  },

  async getReviewStats() {
    return apiFetch('/api/review/stats');
  },

  async approveReviewCase(caseId, { notes = '' } = {}) {
    return apiFetch(`/api/review/cases/${caseId}/approve`, {
      method: 'POST',
      body: { officerNotes: notes },
    });
  },

  async rejectReviewCase(caseId, { reason, notes = '' }) {
    return apiFetch(`/api/review/cases/${caseId}/reject`, {
      method: 'POST',
      body: { reason, officerNotes: notes },
    });
  },

  async requestCorrectionCase(caseId, { reason, notes = '' }) {
    return apiFetch(`/api/review/cases/${caseId}/request-correction`, {
      method: 'POST',
      body: { reason, officerNotes: notes },
    });
  },

  async holdReviewCase(caseId, { reason, notes = '' }) {
    return apiFetch(`/api/review/cases/${caseId}/hold`, {
      method: 'POST',
      body: { reason },
    });
  },

  async createOfficerCorrection(caseId, { fieldName, originalValue, correctedValue, reason = '' }) {
    return apiFetch(`/api/review/cases/${caseId}/correction`, {
      method: 'POST',
      body: { field: fieldName, originalValue, correctedValue, reason },
    });
  },

  async addReviewNote(caseId, { noteText, isInternal = true }) {
    return apiFetch(`/api/review/cases/${caseId}/notes`, {
      method: 'POST',
      body: { note: noteText },
    });
  },

  async resolveAnomaly(caseId, anomalyId, { resolutionType = 'OVERRIDDEN', notes = '' }) {
    return apiFetch(`/api/review/cases/${caseId}/anomalies/${anomalyId}/resolve`, {
      method: 'POST',
      body: { resolutionType, notes },
    });
  },

  // ==========================================
  // SUPER ADMIN API METHODS
  // ==========================================
  async getSuperAdminDashboard() {
    return apiFetch('/api/super-admin/dashboard');
  },

  async getSuperAdminOfficers(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/super-admin/officers${qs ? '?' + qs : ''}`);
  },

  async createOfficer(data) {
    return apiFetch('/api/super-admin/officers', {
      method: 'POST',
      body: data,
    });
  },

  async updateOfficer(id, data) {
    return apiFetch(`/api/super-admin/officers/${id}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async setOfficerStatus(id, status) {
    return apiFetch(`/api/super-admin/officers/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  async resetOfficerPassword(id, newPassword) {
    return apiFetch(`/api/super-admin/officers/${id}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    });
  },

  async getSuperAdminMinisters(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/super-admin/ministers${qs ? '?' + qs : ''}`);
  },

  async createMinister(data) {
    return apiFetch('/api/super-admin/ministers', {
      method: 'POST',
      body: data,
    });
  },

  async updateMinister(id, data) {
    return apiFetch(`/api/super-admin/ministers/${id}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async setMinisterStatus(id, status) {
    return apiFetch(`/api/super-admin/ministers/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  async resetMinisterPassword(id, newPassword) {
    return apiFetch(`/api/super-admin/ministers/${id}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    });
  },

  async getSuperAdminCitizens(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/super-admin/citizens${qs ? '?' + qs : ''}`);
  },

  async setCitizenStatus(id, status) {
    return apiFetch(`/api/super-admin/citizens/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  async getSuperAdminAuditLogs(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/super-admin/audit-logs${qs ? '?' + qs : ''}`);
  },

  async getSuperAdminLandRecords(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/super-admin/land-records${qs ? '?' + qs : ''}`);
  },

  async resetUserPassword(id, newPassword) {
    return apiFetch(`/api/super-admin/users/${id}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    });
  },

  // ── Super Admin State Master & State Admin Management ──
  async getStates() {
    return apiFetch('/api/super-admin/states');
  },

  async getSuperAdminStateAdmins(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/super-admin/state-admins${qs ? '?' + qs : ''}`);
  },

  async getSuperAdminStateAdmin(id) {
    return apiFetch(`/api/super-admin/state-admins/${id}`);
  },

  async createStateAdmin(data) {
    return apiFetch('/api/super-admin/state-admins', {
      method: 'POST',
      body: data,
    });
  },

  async updateStateAdmin(id, data) {
    return apiFetch(`/api/super-admin/state-admins/${id}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async setStateAdminStatus(id, status) {
    return apiFetch(`/api/super-admin/state-admins/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  async resetStateAdminPassword(id, newPassword) {
    return apiFetch(`/api/super-admin/state-admins/${id}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    });
  },

  // ==========================================
  // STATE ADMIN API METHODS (State Scoped)
  // ==========================================
  async getStateAdminDashboard() {
    return apiFetch('/api/state-admin/dashboard');
  },

  async getStateAdminOfficers(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/state-admin/officers${qs ? '?' + qs : ''}`);
  },

  async getStateAdminOfficer(id) {
    return apiFetch(`/api/state-admin/officers/${id}`);
  },

  async createStateAdminOfficer(data) {
    return apiFetch('/api/state-admin/officers', {
      method: 'POST',
      body: data,
    });
  },

  async updateStateAdminOfficer(id, data) {
    return apiFetch(`/api/state-admin/officers/${id}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async setStateAdminOfficerStatus(id, status) {
    return apiFetch(`/api/state-admin/officers/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  async resetStateAdminOfficerPassword(id, newPassword) {
    return apiFetch(`/api/state-admin/officers/${id}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    });
  },

  async getStateAdminMinisters(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/state-admin/ministers${qs ? '?' + qs : ''}`);
  },

  async getStateAdminMinister(id) {
    return apiFetch(`/api/state-admin/ministers/${id}`);
  },

  async createStateAdminMinister(data) {
    return apiFetch('/api/state-admin/ministers', {
      method: 'POST',
      body: data,
    });
  },

  async updateStateAdminMinister(id, data) {
    return apiFetch(`/api/state-admin/ministers/${id}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async setStateAdminMinisterStatus(id, status) {
    return apiFetch(`/api/state-admin/ministers/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  async resetStateAdminMinisterPassword(id, newPassword) {
    return apiFetch(`/api/state-admin/ministers/${id}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    });
  },

  async getStateAdminCitizens(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/state-admin/citizens${qs ? '?' + qs : ''}`);
  },

  async getStateAdminCitizen(id) {
    return apiFetch(`/api/state-admin/citizens/${id}`);
  },

  async getStateAdminLandRecords(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/state-admin/land-records${qs ? '?' + qs : ''}`);
  },

  async getStateAdminLandRecord(id) {
    return apiFetch(`/api/state-admin/land-records/${id}`);
  },

  async getStateAdminApplications(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/state-admin/applications${qs ? '?' + qs : ''}`);
  },

  async getStateAdminApplication(id) {
    return apiFetch(`/api/state-admin/applications/${id}`);
  },

  async getStateAdminReports(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/state-admin/reports${qs ? '?' + qs : ''}`);
  },

  // ── Super Admin Work Monitoring ──
  async getSuperAdminOfficerWork(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/admin/work/officers${qs ? '?' + qs : ''}`);
  },

  async getSuperAdminOfficerProfile(officerId) {
    return apiFetch(`/api/admin/work/officers/${encodeURIComponent(officerId)}`);
  },

  async getSuperAdminMinisterWork(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    const qs = q.toString();
    return apiFetch(`/api/admin/work/ministers${qs ? '?' + qs : ''}`);
  },

  async getSuperAdminMinisterProfile(ministerId) {
    return apiFetch(`/api/admin/work/ministers/${encodeURIComponent(ministerId)}`);
  },

  // ── Super Admin Reporting Portal ──
  async getSuperAdminReportsOverview() {
    return apiFetch('/api/admin/reports/overview');
  },

  async getSuperAdminReport(category, params = {}) {
    const q = new URLSearchParams({ category });
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.append(k, v);
    }
    return apiFetch(`/api/admin/reports/query?${q.toString()}`);
  },

  // ==========================================
  // DLR MAIN VERIFICATION WORKFLOW APIS
  // ==========================================
  async getOfficerApplications(params = {}) {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.page) q.set('page', params.page);
    if (params.limit) q.set('limit', params.limit);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/api/officer/applications${qs}`);
  },

  async getOfficerApplicationById(id) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}`);
  },

  async generateDigitalLandRecord(id, options = {}) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/generate`, {
      method: 'POST',
      body: options,
    });
  },

  async getDigitalRecordDraft(id) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/digital-record`);
  },

  async updateDigitalRecordDraft(id, data) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/digital-record`, {
      method: 'PATCH',
      body: data,
    });
  },

  async scheduleAppointment(id, data) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/appointment`, {
      method: 'POST',
      body: data,
    });
  },

  async startVerification(id, data = {}) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/verification/start`, {
      method: 'POST',
      body: data,
    });
  },

  async sendVerificationOtp(id, data = {}) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/verification/otp/send`, {
      method: 'POST',
      body: data,
    });
  },

  async verifyVerificationOtp(id, data) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/verification/otp/verify`, {
      method: 'POST',
      body: data,
    });
  },

  async uploadVerificationPhoto(id, formData) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/verification/photo`, {
      method: 'POST',
      isFormData: true,
      body: formData,
    });
  },

  async performFinalVerification(id, data = {}) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/final-verify`, {
      method: 'POST',
      body: data,
    });
  },

  async approveApplication(id, data = {}) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: data,
    });
  },

  async rejectApplication(id, data) {
    return apiFetch(`/api/officer/applications/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: data,
    });
  },

  // ── Citizen Endpoints ──
  async submitLandRecordApplication(formData) {
    return apiFetch('/api/land-records/applications', {
      method: 'POST',
      isFormData: true,
      body: formData,
    });
  },

  async getMyLandApplications() {
    return apiFetch('/api/land-records/my-applications');
  },

  async getMyAppointments() {
    return apiFetch('/api/appointments');
  },

  async getApprovedLandRecords() {
    return apiFetch('/api/land-records/approved');
  },

  async getApprovedLandRecordById(id) {
    return apiFetch(`/api/land-records/approved/${encodeURIComponent(id)}`);
  },

  // ── Notifications ──
  async getNotifications(params = {}) {
    const q = new URLSearchParams();
    if (params.unreadOnly) q.set('unreadOnly', 'true');
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/api/notifications${qs}`);
  },

  async markNotificationRead(id) {
    return apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead() {
    return apiFetch('/api/notifications/read-all', {
      method: 'PATCH',
    });
  },

  getVerificationPhotoUrl(photoId) {
    return `${API_BASE_URL}/api/verification/photos/${encodeURIComponent(photoId)}`;
  },
};

