const crypto = require('crypto');
const { pool } = require('../config/database');
const logger = require('../config/logger');

class InMemoryAuditRepository {
  constructor() {
    this.events = [];
  }

  async logAuditEvent({ eventType, actorType, actorReference, caseId = null, metadata = {} }) {
    const id = `AUDIT-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    
    // Never log sensitive credentials, passwords, tokens, or raw Aadhaar numbers
    const safeMetadata = { ...metadata };
    delete safeMetadata.password;
    delete safeMetadata.newPassword;
    delete safeMetadata.otp;
    delete safeMetadata.token;
    delete safeMetadata.jwt;
    delete safeMetadata.aadhaarNumber;

    const eventRecord = {
      id,
      case_id: caseId,
      event_type: eventType,
      actor_type: actorType,
      actor_reference: actorReference,
      metadata: safeMetadata,
      created_at: timestamp,
    };

    this.events.push(eventRecord);
    logger.info(`[AUDIT EVENT] ${eventType} by ${actorType}:${actorReference}`, { eventRecord });

    return eventRecord;
  }

  async getEvents() {
    return [...this.events];
  }

  async getAuditLogs({ limit = 50, offset = 0, eventType = '', actorType = '', actorReference = '', startDate = null, endDate = null } = {}) {
    let filtered = [...this.events];
    if (eventType) filtered = filtered.filter(e => e.event_type === eventType);
    if (actorType) filtered = filtered.filter(e => e.actor_type === actorType);
    if (actorReference) filtered = filtered.filter(e => String(e.actor_reference || '').toLowerCase().includes(actorReference.toLowerCase()));
    if (startDate) filtered = filtered.filter(e => new Date(e.created_at) >= new Date(startDate));
    if (endDate) filtered = filtered.filter(e => new Date(e.created_at) <= new Date(endDate));

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = filtered.length;
    const events = filtered.slice(offset, offset + limit);
    return { total, events };
  }

  clear() {
    this.events = [];
  }
}

class MySQLAuditRepository {
  constructor(databasePool) {
    if (!databasePool) {
      throw new Error('A MySQL pool is required.');
    }
    this.pool = databasePool;
  }

  async logAuditEvent({ eventType, actorType, actorReference, caseId = null, metadata = {} }) {
    const id = `AUDIT-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    const safeMetadata = { ...metadata };
    delete safeMetadata.password;
    delete safeMetadata.newPassword;
    delete safeMetadata.otp;
    delete safeMetadata.token;
    delete safeMetadata.jwt;
    delete safeMetadata.aadhaarNumber;

    const query = `
      INSERT INTO audit_events (id, case_id, event_type, actor_type, actor_reference, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.pool.query(query, [
      id,
      caseId,
      eventType,
      actorType,
      actorReference,
      JSON.stringify(safeMetadata),
      new Date(timestamp),
    ]);

    const eventRecord = {
      id,
      case_id: caseId,
      event_type: eventType,
      actor_type: actorType,
      actor_reference: actorReference,
      metadata: safeMetadata,
      created_at: timestamp,
    };
    logger.info(`[AUDIT EVENT] ${eventType} by ${actorType}:${actorReference}`, { eventRecord });
    return eventRecord;
  }

  async getAuditLogs({ limit = 50, offset = 0, eventType = '', actorType = '', actorReference = '', startDate = null, endDate = null } = {}) {
    const conditions = ['1=1'];
    const params = [];

    if (eventType) {
      conditions.push('event_type = ?');
      params.push(eventType);
    }
    if (actorType) {
      conditions.push('actor_type = ?');
      params.push(actorType);
    }
    if (actorReference) {
      conditions.push('actor_reference LIKE ?');
      params.push(`%${actorReference}%`);
    }
    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(new Date(startDate));
    }
    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(new Date(endDate));
    }

    const whereClause = conditions.join(' AND ');

    const countQuery = `SELECT COUNT(*) as total FROM audit_events WHERE ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = Number(countResult.rows[0]?.total || 0);

    const dataQuery = `
      SELECT id, case_id, event_type, actor_type, actor_reference, metadata, created_at
      FROM audit_events
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const dataResult = await this.pool.query(dataQuery, [...params, Number(limit), Number(offset)]);
    const events = dataResult.rows.map((row) => {
      let metadata = row.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (_) {}
      }
      return {
        ...row,
        metadata: metadata || {},
      };
    });

    return { total, events };
  }

  async getEvents() {
    const { events } = await this.getAuditLogs({ limit: 100, offset: 0 });
    return events;
  }
}

const auditRepository = new MySQLAuditRepository(pool);

module.exports = {
  InMemoryAuditRepository,
  MySQLAuditRepository,
  auditRepository,
};
