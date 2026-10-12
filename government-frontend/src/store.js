import { api, broadcastNewLogin } from './api.js';

function getRoles(user) {
  if (!user) return [];
  return Array.isArray(user.roles) ? user.roles : [user.primary_role || user.role || ''];
}

function hasRole(user, ...check) {
  return getRoles(user).some((r) => check.includes(String(r || '').toUpperCase()));
}

export function isOfficerUser(user) {
  return hasRole(user, 'OFFICER', 'GOVERNMENT_OFFICER');
}

export function isMinisterUser(user) {
  return hasRole(user, 'MINISTER', 'ADMIN');
}

class GovernmentStore {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.activeTab = 'officer-login';
    this.reviewCases = [];
    this.reviewCasesLoading = false;
    this.reviewCasesError = '';
    this.selectedReviewCase = null;
    this.reviewCaseLoading = false;
    this.reviewCaseError = '';
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
    this.activeTab = 'officer-login';
    this.reviewCases = [];
    this.selectedReviewCase = null;
    this.notifications = [];
    this.unreadNotificationsCount = 0;
  }

  get isOfficer() {
    return isOfficerUser(this.user);
  }

  get isMinister() {
    return isMinisterUser(this.user);
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

      if (!isOfficerUser(user) && !isMinisterUser(user)) {
        api.setStoredToken(null);
        this._resetSession();
        return;
      }

      this.user = user;
      this.isAuthenticated = true;
      this.activeTab = isMinisterUser(user) ? 'minister-dashboard' : 'officer-cases';
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
    if (!isOfficerUser(user) && !isMinisterUser(user)) {
      this.addToast('error', 'Access denied. This portal is for Government Officers and Ministers only.');
      return;
    }
    this.user = user;
    this.isAuthenticated = true;
    this.activeTab = isMinisterUser(user) ? 'minister-dashboard' : 'officer-cases';
    broadcastNewLogin(user, isMinisterUser(user) ? 'MINISTER' : 'OFFICER');
    await this._loadWorkspace();
    this.notify();
  }

  async _loadWorkspace() {
    if (this.isOfficer) {
      await Promise.all([this.loadReviewCases(), this.loadNotifications()]);
    } else if (this.isMinister) {
      await Promise.all([this.loadMinisterDashboard(), this.loadNotifications()]);
    }
  }

  async loadMinisterDashboard() {
    try {
      this.ministerDashboardData = await api.getMinisterDashboard();
      this.notify();
    } catch (e) {
      console.error('Failed to load minister dashboard:', e);
    }
  }

  setActiveTab(tab, caseId = null) {
    // Only allow officer and minister tabs
    if (tab.startsWith('super-admin-') || tab.startsWith('state-admin-')) {
      this.addToast('error', 'Access denied. That area is restricted to Administration portals.');
      return;
    }

    this.activeTab = tab;
    if (caseId) {
      this.selectedReviewCase = caseId;
    }
    this.notify();

    if (tab === 'officer-cases') void this.loadReviewCases();
    if (tab === 'notifications') void this.loadNotifications();
  }

  async loadReviewCases() {
    this.reviewCasesLoading = true;
    this.reviewCasesError = '';
    this.notify();
    try {
      const res = await api.getOfficerApplications();
      this.reviewCases = Array.isArray(res) ? res : (res?.applications || []);
      if (res?.stats) {
        this.officerStats = res.stats;
      }
    } catch (error) {
      this.reviewCasesError = error.message;
    } finally {
      this.reviewCasesLoading = false;
      this.notify();
    }
  }

  async loadSelectedReviewCase(caseId) {
    if (!caseId) return;
    this.reviewCaseLoading = true;
    this.reviewCaseError = '';
    this.notify();
    try {
      const data = await api.getOfficerApplicationById(caseId);
      this.selectedReviewCase = data;
    } catch (error) {
      this.reviewCaseError = error.message;
      this.selectedReviewCase = null;
    } finally {
      this.reviewCaseLoading = false;
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

export const store = new GovernmentStore();
