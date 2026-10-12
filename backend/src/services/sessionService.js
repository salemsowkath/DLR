/**
 * Session tracking per browser context.
 * Enables single active session enforcement per browser context without
 * globally invalidating sessions across different computers or devices.
 */

class SessionService {
  constructor() {
    // Map of clientContextId -> { userId, role, token, updatedAt }
    this.activeSessions = new Map();
  }

  registerSession(clientContextId, { userId, role, token }) {
    if (!clientContextId || typeof clientContextId !== 'string') {
      return;
    }
    this.activeSessions.set(clientContextId, {
      userId,
      role,
      token,
      updatedAt: Date.now(),
    });
  }

  isSessionActive(clientContextId, token) {
    if (!clientContextId || typeof clientContextId !== 'string') {
      // If no client context ID is supplied (e.g. CLI, tests, non-browser clients),
      // allow token validation without browser-context constraint.
      return true;
    }

    const session = this.activeSessions.get(clientContextId);
    if (!session) {
      // No active session registered for this client context yet; allow
      return true;
    }

    // Token must match the latest registered token for this client context
    return session.token === token;
  }

  getActiveSession(clientContextId) {
    if (!clientContextId) return null;
    return this.activeSessions.get(clientContextId) || null;
  }

  invalidateSession(clientContextId) {
    if (clientContextId) {
      this.activeSessions.delete(clientContextId);
    }
  }

  clear() {
    this.activeSessions.clear();
  }
}

const sessionService = new SessionService();

module.exports = {
  SessionService,
  sessionService,
};
