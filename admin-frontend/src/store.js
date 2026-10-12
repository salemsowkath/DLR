import { api, broadcastNewLogin } from './api.js';

function getRoles(user) {
  if (!user) return [];
  return Array.isArray(user.roles) ? user.roles : [user.primary_role || user.role || ''];
}

function hasRole(user, ...check) {
  return getRoles(user).some((r) => check.includes(String(r || '').toUpperCase()));
}

export function isSuperAdminUser(user) {
  return hasRole(user, 'SUPER_ADMIN');
}

export function isStateAdminUser(user) {
  return hasRole(user, 'STATE_ADMIN');
}

class AdminStore {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.activeTab = 'portal';
    this.selectedOfficerWorkId = null;
    this.selectedMinisterWorkId = null;
    this.activeReportCategory = 'officer-performance';
    this.notifications = [];
    this.unreadNotificationsCount = 0;
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
    this.activeTab = 'portal';
    this.selectedOfficerWorkId = null;
    this.selectedMinisterWorkId = null;
    this.notifications = [];
    this.unreadNotificationsCount = 0;
  }

  get isSuperAdmin() {
    return isSuperAdminUser(this.user);
  }

  get isStateAdmin() {
    return isStateAdminUser(this.user);
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

      if (!isSuperAdminUser(user) && !isStateAdminUser(user)) {
        api.setStoredToken(null);
        this._resetSession();
        return;
      }

      this.user = user;
      this.isAuthenticated = true;
      this.activeTab = isSuperAdminUser(user) ? 'super-admin-dashboard' : 'state-admin-dashboard';
    } catch (error) {
      api.setStoredToken(null);
      this._resetSession();
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  async setAuthenticatedUser(user) {
    if (!isSuperAdminUser(user) && !isStateAdminUser(user)) {
      this.addToast('error', 'Access denied. This portal is for Administrators only.');
      return;
    }
    this.user = user;
    this.isAuthenticated = true;
    this.activeTab = isSuperAdminUser(user) ? 'super-admin-dashboard' : 'state-admin-dashboard';
    broadcastNewLogin(user, isSuperAdminUser(user) ? 'SUPER_ADMIN' : 'STATE_ADMIN');
    this.notify();
  }

  setActiveTab(tab, recordId = null, extraData = null) {
    // Role boundary guard
    if (tab.startsWith('super-admin-') && !this.isSuperAdmin) {
      this.addToast('error', 'Access denied. You must be a Super Administrator to access this area.');
      return;
    }

    this.activeTab = tab;
    if (recordId) {
      if (tab === 'super-admin-officer-detail') {
        this.selectedOfficerWorkId = recordId;
      } else if (tab === 'super-admin-minister-detail') {
        this.selectedMinisterWorkId = recordId;
      } else if (tab === 'super-admin-reports') {
        this.activeReportCategory = recordId;
      }
    }
    if (extraData && typeof extraData === 'string' && tab === 'super-admin-reports') {
      this.activeReportCategory = extraData;
    }
    this.notify();
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

export const store = new AdminStore();
