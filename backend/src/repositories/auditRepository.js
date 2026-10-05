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

  clear() {
    this.events = [];
  }
}

class PostgresAuditRepository {
  constructor(databasePool) {
    if (!databasePool) {
      throw new Error('A PostgreSQL pool is required.');
    }
    this.pool = databasePool;
  }

  async logAuditEvent({ eventType, actorType, actorReference, caseId = null, metadata = {} }) {
    const id = `AUDIT-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    const safeMetadata = { ...metadata };
    delete safeMetadata.password;
    delete safeMetadata.otp;
    delete safeMetadata.token;
    delete safeMetadata.jwt;
    delete safeMetadata.aadhaarNumber;

    const query = `
      INSERT INTO audit_events (id, case_id, event_type, actor_type, actor_reference, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, case_id, event_type, actor_type, actor_reference, metadata, created_at
    `;

    const result = await this.pool.query(query, [
      id,
      caseId,
      eventType,
      actorType,
      actorReference,
      JSON.stringify(safeMetadata),
      timestamp,
    ]);

    logger.info(`[AUDIT EVENT] ${eventType} by ${actorType}:${actorReference}`, { eventRecord: result.rows[0] });
    return result.rows[0];
  }
}

const auditRepository = pool ? new PostgresAuditRepository(pool) : new InMemoryAuditRepository();

module.exports = {
  InMemoryAuditRepository,
  PostgresAuditRepository,
  auditRepository,
};
