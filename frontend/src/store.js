import { api } from './api.js';

class AppStore {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.activeTab = 'dashboard';
    this.selectedRecordId = null;
    this.lastProcessResult = null;
    this.myDocuments = [];
    this.applications = [];
    this.applicationsLoading = false;
    this.applicationsError = '';
    this.selectedRecord = null;
    this.recordLoading = false;
    this.recordError = '';
    this.toasts = [];
    this.loading = false;
    this.listeners = new Set();

    // Listen for unauthorized 401 events
    window.addEventListener('dlr:unauthorized', () => {
      this.user = null;
      this.isAuthenticated = false;
      this.activeTab = 'login';
      this.addToast('error', 'Session expired. Please log in again with your Aadhaar number.');
      this.notify();
    });
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
      this.activeTab = 'login';
      this.notify();
      return;
    }

    try {
      this.loading = true;
      this.notify();
      const user = await api.getMe();
      this.user = user;
      this.isAuthenticated = true;
      this.activeTab = 'dashboard';
      await Promise.all([this.loadMyDocuments(), this.loadApplications()]);
    } catch (error) {
      api.setStoredToken(null);
      this.user = null;
      this.isAuthenticated = false;
      this.activeTab = 'login';
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  async setAuthenticatedUser(user) {
    this.user = user;
    this.isAuthenticated = true;
    this.activeTab = 'dashboard';
    await Promise.all([this.loadMyDocuments(), this.loadApplications()]);
    this.notify();
  }

  async loadMyDocuments() {
    if (!this.isAuthenticated) return;
    try {
      const docs = await api.getMyDocuments();
      this.myDocuments = Array.isArray(docs) ? docs : [];
      this.notify();
    } catch (error) {
      console.warn('Failed to load citizen documents:', error.message);
    }
  }

  async loadApplications() {
    if (!this.isAuthenticated) return;
    this.applicationsLoading = true;
    this.applicationsError = '';
    this.notify();
    try {
      this.applications = await api.getMyApplications();
    } catch (error) {
      this.applicationsError = error.message || 'Unable to load applications.';
    } finally {
      this.applicationsLoading = false;
      this.notify();
    }
  }

  async loadSelectedRecord(documentId = this.selectedRecordId) {
    if (!documentId || !this.isAuthenticated) return;
    this.recordLoading = true;
    this.recordError = '';
    this.selectedRecord = null;
    this.notify();
    try {
      this.selectedRecord = await api.getDocumentById(documentId);
    } catch (error) {
      this.recordError = error.status === 403 ? 'You do not have access to this record.' : (error.message || 'Unable to load this record.');
    } finally {
      this.recordLoading = false;
      this.notify();
    }
  }

  async logout() {
    try {
      await api.logout();
    } catch (e) {
      // Ignore network errors on logout
    }
    this.user = null;
    this.isAuthenticated = false;
    this.myDocuments = [];
    this.applications = [];
    this.lastProcessResult = null;
    this.selectedRecord = null;
    this.activeTab = 'login';
    this.addToast('info', 'Logged out successfully.');
    this.notify();
  }

  setActiveTab(tab, recordId = null) {
    this.activeTab = tab;
    if (recordId) {
      this.selectedRecordId = recordId;
    }
    this.notify();
    if (tab === 'record-details') void this.loadSelectedRecord();
    if (tab === 'applications') void this.loadApplications();
  }

  setLastProcessResult(result) {
    this.lastProcessResult = result;
    void this.loadMyDocuments();
    void this.loadApplications();
    this.setActiveTab('processing-result');
  }
}

export const store = new AppStore();
