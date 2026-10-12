import { api, broadcastNewLogin } from './api.js';

export function isCitizenUser(user) {
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles : [user.primary_role || user.role || 'CITIZEN'];
  return roles.some((r) => String(r).toUpperCase() === 'CITIZEN');
}

class CitizenStore {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.activeTab = 'citizen-login';
    this.selectedRecordId = null;
    this.lastProcessResult = null;
    this.myDocuments = [];
    this.applications = [];
    this.applicationsLoading = false;
    this.applicationsError = '';
    this.selectedRecord = null;
    this.recordLoading = false;
    this.recordError = '';
    this.appointments = [];
    this.appointmentsLoading = false;
    this.appointmentsError = '';
    this.approvedRecords = [];
    this.approvedRecordsLoading = false;
    this.notifications = [];
    this.unreadNotificationsCount = 0;
    this.notificationsLoading = false;
    this.toasts = [];
    this.loading = false;
    this.listeners = new Set();

    // Standard session expiration
    window.addEventListener('dlr:unauthorized', () => {
      this._resetSession();
      this.addToast('error', 'Session expired. Please log in again.');
      this.notify();
    });

    // Single active session replacement across browser context
    window.addEventListener('dlr:session-replaced', (event) => {
      this._resetSession();
      const message = event.detail?.message || 'Your DLR session was replaced by a new login.';
      this.addToast('error', message);
      this.notify();
    });
  }

  _resetSession() {
    this.user = null;
    this.isAuthenticated = false;
    this.activeTab = 'citizen-login';
    this.myDocuments = [];
    this.applications = [];
    this.appointments = [];
    this.approvedRecords = [];
    this.notifications = [];
    this.unreadNotificationsCount = 0;
    this.selectedRecord = null;
    this.selectedRecordId = null;
  }

  get isCitizen() {
    return isCitizenUser(this.user);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  addToast(type, message) {
    const id = Date.now() + Math.random();
    this.toasts.push({ id, type, message });
    this.notify();
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.notify();
    }, 4000);
  }

  async init() {
    const token = api.getStoredToken();
    if (!token) {
      this.notify();
      return;
    }

    try {
      this.loading = true;
      this.notify();
      const user = await api.getMe();

      if (!isCitizenUser(user)) {
        // Non-citizen token should not be active in the citizen portal
        api.setStoredToken(null);
        this._resetSession();
        return;
      }

      this.user = user;
      this.isAuthenticated = true;
      this.activeTab = 'dashboard';
      await this._loadWorkspace();
    } catch (error) {
      api.setStoredToken(null);
      this._resetSession();
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  async setAuthenticatedUser(user) {
    if (!isCitizenUser(user)) {
      this.addToast('error', 'Access denied. This portal is for Citizens only.');
      return;
    }
    this.user = user;
    this.isAuthenticated = true;
    this.activeTab = 'dashboard';
    broadcastNewLogin(user);
    await this._loadWorkspace();
    this.notify();
  }

  async _loadWorkspace() {
    await Promise.all([
      this.loadMyDocuments(),
      this.loadApplications(),
      this.loadAppointments(),
      this.loadApprovedRecords(),
      this.loadNotifications(),
    ]);
  }

  setActiveTab(tab, recordId = null) {
    const normalized = tab === 'records' ? 'my-records' : tab;

    // Reject officer / minister / admin tabs
    if (
      normalized.startsWith('officer-') ||
      normalized.startsWith('minister-') ||
      normalized.startsWith('super-admin-') ||
      normalized.startsWith('state-admin-')
    ) {
      this.addToast('error', 'Access denied. That area is restricted to Government / Admin portals.');
      return;
    }

    this.activeTab = normalized;
    if (recordId) {
      this.selectedRecordId = recordId;
    }
    this.notify();

    if (normalized === 'record-details') void this.loadSelectedRecord();
    if (normalized === 'applications') void this.loadApplications();
    if (normalized === 'my-records') void this.loadMyDocuments();
    if (normalized === 'appointments' || normalized === 'my-appointments') void this.loadAppointments();
    if (normalized === 'approved-records') void this.loadApprovedRecords();
    if (normalized === 'notifications') void this.loadNotifications();
  }

  async loadMyDocuments() {
    try {
      const data = await api.getMyDocuments();
      this.myDocuments = Array.isArray(data) ? data : data?.documents || [];
      this.notify();
    } catch (e) {
      // non-blocking
    }
  }

  async loadApplications() {
    this.applicationsLoading = true;
    this.applicationsError = '';
    this.notify();
    try {
      const data = await api.getMyApplications();
      this.applications = Array.isArray(data) ? data : data?.applications || [];
    } catch (error) {
      this.applicationsError = error.message;
    } finally {
      this.applicationsLoading = false;
      this.notify();
    }
  }

  async loadAppointments() {
    this.appointmentsLoading = true;
    this.appointmentsError = '';
    this.notify();
    try {
      const data = await api.getAppointments();
      this.appointments = Array.isArray(data) ? data : data?.appointments || [];
    } catch (error) {
      this.appointmentsError = error.message;
    } finally {
      this.appointmentsLoading = false;
      this.notify();
    }
  }

  async loadApprovedRecords() {
    this.approvedRecordsLoading = true;
    this.notify();
    try {
      const data = await api.getApprovedRecords();
      this.approvedRecords = Array.isArray(data) ? data : data?.records || [];
    } catch (e) {
      // non-blocking
    } finally {
      this.approvedRecordsLoading = false;
      this.notify();
    }
  }

  async loadSelectedRecord() {
    if (!this.selectedRecordId) return;
    this.recordLoading = true;
    this.recordError = '';
    this.notify();
    try {
      const data = await api.getDocument(this.selectedRecordId);
      this.selectedRecord = data;
    } catch (error) {
      this.recordError = error.message;
    } finally {
      this.recordLoading = false;
      this.notify();
    }
  }

  async loadNotifications() {
    this.notificationsLoading = true;
    try {
      const data = await api.getNotifications();
      const list = Array.isArray(data) ? data : data?.notifications || [];
      this.notifications = list;
      this.unreadNotificationsCount = list.filter((n) => !n.is_read).length;
    } catch (e) {
      // non-blocking
    } finally {
      this.notificationsLoading = false;
      this.notify();
    }
  }

  async logout() {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    } finally {
      api.setStoredToken(null);
      this._resetSession();
      this.addToast('success', 'Logged out successfully.');
      this.notify();
    }
  }
}

export const store = new CitizenStore();
