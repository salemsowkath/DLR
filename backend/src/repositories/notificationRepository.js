const crypto = require('crypto');
const { pool } = require('../config/database');

class InMemoryNotificationRepository {
  constructor() {
    this.notifications = new Map();
  }

  async createNotification({ userId = null, targetRole = null, title, message, type = 'INFO', referenceId = null }) {
    const id = crypto.randomUUID();
    const item = {
      id,
      user_id: userId,
      target_role: targetRole,
      title,
      message,
      type,
      reference_id: referenceId,
      is_read: 0,
      created_at: new Date().toISOString(),
    };
    this.notifications.set(id, item);
    return item;
  }

  async getNotifications({ userId = null, role = null, limit = 50, unreadOnly = false }) {
    const list = [];
    for (const n of this.notifications.values()) {
      if (userId && n.user_id && n.user_id !== userId) continue;
      if (role && n.target_role && n.target_role !== role && !n.user_id) continue;
      if (unreadOnly && n.is_read) continue;
      list.push({ ...n });
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
  }

  async markAsRead(id, userId = null) {
    const n = this.notifications.get(id);
    if (!n) return null;
    if (userId && n.user_id && n.user_id !== userId) return null;
    n.is_read = 1;
    return n;
  }

  async markAllAsRead(userId = null, role = null) {
    let count = 0;
    for (const n of this.notifications.values()) {
      if (userId && n.user_id === userId) {
        n.is_read = 1;
        count++;
      } else if (role && n.target_role === role) {
        n.is_read = 1;
        count++;
      }
    }
    return count;
  }

  async getUnreadCount(userId = null, role = null) {
    const list = await this.getNotifications({ userId, role, unreadOnly: true });
    return list.length;
  }
}

class MySQLNotificationRepository {
  constructor(databasePool) {
    this.pool = databasePool;
  }

  async createNotification({ userId = null, targetRole = null, title, message, type = 'INFO', referenceId = null }) {
    const id = crypto.randomUUID();
    const query = `
      INSERT INTO notifications (id, user_id, target_role, title, message, type, reference_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(6))
    `;
    await this.pool.query(query, [id, userId, targetRole, title, message, type, referenceId]);
    return {
      id,
      user_id: userId,
      target_role: targetRole,
      title,
      message,
      type,
      reference_id: referenceId,
      is_read: 0,
      created_at: new Date().toISOString(),
    };
  }

  async getNotifications({ userId = null, role = null, limit = 50, unreadOnly = false }) {
    const conditions = [];
    const params = [];
    const roleList = Array.isArray(role)
      ? role
      : (role === 'OFFICER' || role === 'GOVERNMENT_OFFICER')
        ? ['OFFICER', 'GOVERNMENT_OFFICER']
        : [role].filter(Boolean);

    if (userId && roleList.length) {
      const placeholders = roleList.map(() => '?').join(', ');
      conditions.push(`(user_id = ? OR (user_id IS NULL AND target_role IN (${placeholders})))`);
      params.push(userId, ...roleList);
    } else if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    } else if (roleList.length) {
      const placeholders = roleList.map(() => '?').join(', ');
      conditions.push(`target_role IN (${placeholders})`);
      params.push(...roleList);
    }

    if (unreadOnly) {
      conditions.push('is_read = 0');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT id, user_id, target_role, title, message, type, reference_id, is_read, created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `;
    params.push(Number(limit));

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      ...row,
      is_read: Boolean(row.is_read),
    }));
  }

  async markAsRead(id, userId = null) {
    let query = 'UPDATE notifications SET is_read = 1 WHERE id = ?';
    const params = [id];
    if (userId) {
      query += ' AND (user_id = ? OR user_id IS NULL)';
      params.push(userId);
    }
    const result = await this.pool.query(query, params);
    return result.rows.affectedRows > 0;
  }

  async markAllAsRead(userId = null, role = null) {
    const conditions = [];
    const params = [];
    const roleList = Array.isArray(role)
      ? role
      : (role === 'OFFICER' || role === 'GOVERNMENT_OFFICER')
        ? ['OFFICER', 'GOVERNMENT_OFFICER']
        : [role].filter(Boolean);

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    if (roleList.length) {
      const placeholders = roleList.map(() => '?').join(', ');
      conditions.push(`target_role IN (${placeholders})`);
      params.push(...roleList);
    }
    if (!conditions.length) return 0;

    const query = `UPDATE notifications SET is_read = 1 WHERE ${conditions.join(' OR ')}`;
    const result = await this.pool.query(query, params);
    return result.rows.affectedRows || 0;
  }

  async getUnreadCount(userId = null, role = null) {
    const conditions = ['is_read = 0'];
    const params = [];
    const roleList = Array.isArray(role)
      ? role
      : (role === 'OFFICER' || role === 'GOVERNMENT_OFFICER')
        ? ['OFFICER', 'GOVERNMENT_OFFICER']
        : [role].filter(Boolean);

    if (userId && roleList.length) {
      const placeholders = roleList.map(() => '?').join(', ');
      conditions.push(`(user_id = ? OR (user_id IS NULL AND target_role IN (${placeholders})))`);
      params.push(userId, ...roleList);
    } else if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    } else if (roleList.length) {
      const placeholders = roleList.map(() => '?').join(', ');
      conditions.push(`target_role IN (${placeholders})`);
      params.push(...roleList);
    }

    const query = `SELECT COUNT(*) AS unread_count FROM notifications WHERE ${conditions.join(' AND ')}`;
    const result = await this.pool.query(query, params);
    return Number(result.rows[0]?.unread_count || 0);
  }
}

const notificationRepository = new MySQLNotificationRepository(pool);

module.exports = {
  InMemoryNotificationRepository,
  MySQLNotificationRepository,
  notificationRepository,
};
