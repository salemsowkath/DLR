const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const { pool } = require('../config/database');

const PHOTO_STORAGE_DIR = path.resolve(__dirname, '../../uploads/verification_photos');

class InMemoryVerificationPhotoRepository {
  constructor() {
    this.photos = new Map();
  }

  async savePhoto({ sessionId, caseId, citizenId, officerId, storageReference, mimeType = 'image/jpeg', fileSize = 0 }) {
    const id = crypto.randomUUID();
    const item = {
      id,
      session_id: sessionId,
      case_id: caseId,
      citizen_id: citizenId,
      officer_id: officerId,
      storage_reference: storageReference,
      mime_type: mimeType,
      file_size: fileSize,
      captured_at: new Date().toISOString(),
    };
    this.photos.set(id, item);
    return item;
  }

  async findById(id) {
    return this.photos.get(id) || null;
  }

  async findByCaseId(caseId) {
    const list = [];
    for (const p of this.photos.values()) {
      if (p.case_id === caseId) list.push({ ...p });
    }
    return list;
  }

  async findBySessionId(sessionId) {
    for (const p of this.photos.values()) {
      if (p.session_id === sessionId) return { ...p };
    }
    return null;
  }
}

class MySQLVerificationPhotoRepository {
  constructor(databasePool) {
    this.pool = databasePool;
  }

  async savePhoto({ sessionId, caseId, citizenId, officerId, storageReference, mimeType = 'image/jpeg', fileSize = 0 }) {
    const id = crypto.randomUUID();
    const query = `
      INSERT INTO citizen_verification_photos (
        id, session_id, case_id, citizen_id, officer_id,
        storage_reference, mime_type, file_size, captured_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))
    `;
    await this.pool.query(query, [
      id, sessionId, caseId, citizenId, officerId,
      storageReference, mimeType, fileSize,
    ]);
    return this.findById(id);
  }

  async findById(id) {
    const query = `
      SELECT p.*,
             u_cit.name AS citizen_name, u_cit.external_reference AS citizen_reference,
             u_off.name AS officer_name
      FROM citizen_verification_photos p
      LEFT JOIN users u_cit ON p.citizen_id = u_cit.id
      LEFT JOIN users u_off ON p.officer_id = u_off.id
      WHERE p.id = ?
    `;
    const res = await this.pool.query(query, [id]);
    return res.rows[0] || null;
  }

  async findByCaseId(caseId) {
    const query = `
      SELECT p.*,
             u_cit.name AS citizen_name,
             u_off.name AS officer_name
      FROM citizen_verification_photos p
      LEFT JOIN users u_cit ON p.citizen_id = u_cit.id
      LEFT JOIN users u_off ON p.officer_id = u_off.id
      WHERE p.case_id = ?
      ORDER BY p.captured_at DESC
    `;
    const res = await this.pool.query(query, [caseId]);
    return res.rows;
  }

  async findBySessionId(sessionId) {
    const query = `
      SELECT p.*,
             u_cit.name AS citizen_name,
             u_off.name AS officer_name
      FROM citizen_verification_photos p
      LEFT JOIN users u_cit ON p.citizen_id = u_cit.id
      LEFT JOIN users u_off ON p.officer_id = u_off.id
      WHERE p.session_id = ?
      ORDER BY p.captured_at DESC
      LIMIT 1
    `;
    const res = await this.pool.query(query, [sessionId]);
    return res.rows[0] || null;
  }
}

const verificationPhotoRepository = new MySQLVerificationPhotoRepository(pool);

module.exports = {
  InMemoryVerificationPhotoRepository,
  MySQLVerificationPhotoRepository,
  verificationPhotoRepository,
  PHOTO_STORAGE_DIR,
};
