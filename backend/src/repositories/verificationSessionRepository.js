const crypto = require('crypto');
const { pool } = require('../config/database');

class InMemoryVerificationSessionRepository {
  constructor() {
    this.sessions = new Map();
  }

  async createSession({ caseId, appointmentId = null, citizenId, officerId }) {
    const id = crypto.randomUUID();
    const item = {
      id,
      case_id: caseId,
      appointment_id: appointmentId,
      citizen_id: citizenId,
      officer_id: officerId,
      otp_verified: 0,
      otp_verified_at: null,
      photo_captured: 0,
      photo_captured_at: null,
      photo_id: null,
      documents_checked: 0,
      status: 'IN_PROGRESS',
      notes: null,
      started_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.sessions.set(id, item);
    return item;
  }

  async findById(id) {
    return this.sessions.get(id) || null;
  }

  async findByCaseId(caseId) {
    const list = [];
    for (const s of this.sessions.values()) {
      if (s.case_id === caseId) list.push({ ...s });
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async findActiveSession(caseId) {
    for (const s of this.sessions.values()) {
      if (s.case_id === caseId && s.status === 'IN_PROGRESS') {
        return { ...s };
      }
    }
    return null;
  }

  async updateOtpVerified(id) {
    const s = this.sessions.get(id);
    if (!s) return null;
    s.otp_verified = 1;
    s.otp_verified_at = new Date().toISOString();
    s.updated_at = new Date().toISOString();
    return s;
  }

  async updatePhotoCaptured(id, photoId) {
    const s = this.sessions.get(id);
    if (!s) return null;
    s.photo_captured = 1;
    s.photo_id = photoId;
    s.photo_captured_at = new Date().toISOString();
    s.updated_at = new Date().toISOString();
    return s;
  }

  async updateDocumentsChecked(id, checked = true) {
    const s = this.sessions.get(id);
    if (!s) return null;
    s.documents_checked = checked ? 1 : 0;
    s.updated_at = new Date().toISOString();
    return s;
  }

  async completeSession(id, notes = null) {
    const s = this.sessions.get(id);
    if (!s) return null;
    s.status = 'COMPLETED';
    s.completed_at = new Date().toISOString();
    if (notes) s.notes = notes;
    s.updated_at = new Date().toISOString();
    return s;
  }
}

class MySQLVerificationSessionRepository {
  constructor(databasePool) {
    this.pool = databasePool;
  }

  async createSession({ caseId, appointmentId = null, citizenId, officerId }) {
    // If an in-progress session already exists for this case, return it
    const active = await this.findActiveSession(caseId);
    if (active) return active;

    const id = crypto.randomUUID();
    const query = `
      INSERT INTO verification_sessions (
        id, case_id, appointment_id, citizen_id, officer_id,
        otp_verified, photo_captured, documents_checked,
        status, started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 'IN_PROGRESS', NOW(6), NOW(6), NOW(6))
    `;
    await this.pool.query(query, [id, caseId, appointmentId, citizenId, officerId]);
    return this.findById(id);
  }

  async findById(id) {
    const query = `
      SELECT vs.*,
             u_cit.name AS citizen_name, u_cit.external_reference AS citizen_reference,
             u_off.name AS officer_name
      FROM verification_sessions vs
      LEFT JOIN users u_cit ON vs.citizen_id = u_cit.id
      LEFT JOIN users u_off ON vs.officer_id = u_off.id
      WHERE vs.id = ?
    `;
    const res = await this.pool.query(query, [id]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      otp_verified: Boolean(row.otp_verified),
      photo_captured: Boolean(row.photo_captured),
      documents_checked: Boolean(row.documents_checked),
    };
  }

  async findByCaseId(caseId) {
    const query = `
      SELECT vs.*,
             u_cit.name AS citizen_name,
             u_off.name AS officer_name
      FROM verification_sessions vs
      LEFT JOIN users u_cit ON vs.citizen_id = u_cit.id
      LEFT JOIN users u_off ON vs.officer_id = u_off.id
      WHERE vs.case_id = ?
      ORDER BY vs.created_at DESC
    `;
    const res = await this.pool.query(query, [caseId]);
    return res.rows.map(row => ({
      ...row,
      otp_verified: Boolean(row.otp_verified),
      photo_captured: Boolean(row.photo_captured),
      documents_checked: Boolean(row.documents_checked),
    }));
  }

  async findActiveSession(caseId) {
    const query = `
      SELECT vs.*,
             u_cit.name AS citizen_name,
             u_off.name AS officer_name
      FROM verification_sessions vs
      LEFT JOIN users u_cit ON vs.citizen_id = u_cit.id
      LEFT JOIN users u_off ON vs.officer_id = u_off.id
      WHERE vs.case_id = ? AND vs.status = 'IN_PROGRESS'
      ORDER BY vs.created_at DESC
      LIMIT 1
    `;
    const res = await this.pool.query(query, [caseId]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      otp_verified: Boolean(row.otp_verified),
      photo_captured: Boolean(row.photo_captured),
      documents_checked: Boolean(row.documents_checked),
    };
  }

  async updateOtpVerified(id) {
    const query = `
      UPDATE verification_sessions
      SET otp_verified = 1, otp_verified_at = NOW(6), updated_at = NOW(6)
      WHERE id = ?
    `;
    await this.pool.query(query, [id]);
    return this.findById(id);
  }

  async updatePhotoCaptured(id, photoId) {
    const query = `
      UPDATE verification_sessions
      SET photo_captured = 1, photo_id = ?, photo_captured_at = NOW(6), updated_at = NOW(6)
      WHERE id = ?
    `;
    await this.pool.query(query, [photoId, id]);
    return this.findById(id);
  }

  async updateDocumentsChecked(id, checked = true) {
    const query = `
      UPDATE verification_sessions
      SET documents_checked = ?, updated_at = NOW(6)
      WHERE id = ?
    `;
    await this.pool.query(query, [checked ? 1 : 0, id]);
    return this.findById(id);
  }

  async completeSession(id, notes = null) {
    let query = `
      UPDATE verification_sessions
      SET status = 'COMPLETED', completed_at = NOW(6), updated_at = NOW(6)
    `;
    const params = [];
    if (notes != null) {
      query += ', notes = ?';
      params.push(notes);
    }
    query += ' WHERE id = ?';
    params.push(id);
    await this.pool.query(query, params);
    return this.findById(id);
  }
}

const verificationSessionRepository = new MySQLVerificationSessionRepository(pool);

module.exports = {
  InMemoryVerificationSessionRepository,
  MySQLVerificationSessionRepository,
  verificationSessionRepository,
};
