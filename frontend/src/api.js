const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function getStoredToken() {
  return localStorage.getItem('dlr_citizen_token') || null;
}

function setStoredToken(token) {
  if (token) {
    localStorage.setItem('dlr_citizen_token', token);
  } else {
    localStorage.removeItem('dlr_citizen_token');
  }
}

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredToken();

  const headers = {
    ...(options.headers || {}),
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
      window.dispatchEvent(new CustomEvent('dlr:unauthorized'));
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

  async officerLogin({ username, password }) {
    const res = await apiFetch('/api/auth/officer/login', {
      method: 'POST',
      body: { username, password },
    });

    if (res?.accessToken) {
      setStoredToken(res.accessToken);
    }
    return res;
  },

  async ministerLogin({ username, password }) {
    const res = await apiFetch('/api/auth/minister/login', {
      method: 'POST',
      body: { username, password },
    });

    if (res?.accessToken) {
      setStoredToken(res.accessToken);
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

  async processDocument(file, { language = 'eng', geometry = null, crs = '' } = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    if (geometry) {
      formData.append('geometry', typeof geometry === 'string' ? geometry : JSON.stringify(geometry));
    }
    if (crs) {
      formData.append('crs', crs);
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

  async getMyApplications() {
    const res = await apiFetch('/api/documents/applications/mine');
    return res?.applications || [];
  },
};
