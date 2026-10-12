const crypto = require('crypto');
const { pool } = require('../config/database');

class InMemoryDigitalLandRecordRepository {
  constructor() {
    this.records = new Map();
  }

  async createApprovedRecord({ caseId, landRecordId, citizenId, officerId, finalData, verificationSessionId = null }) {
    const id = crypto.randomUUID();
    const count = this.records.size + 1;
    const recordId = `DLR-GOV-2026-${String(count).padStart(6, '0')}`;

    const item = {
      id,
      record_id: recordId,
      case_id: caseId,
      land_record_id: landRecordId,
      citizen_id: citizenId,
      approved_by_officer_id: officerId,
      owner_name: finalData.owner_name || 'Owner',
      survey_number: finalData.survey_number || '—',
      khasra_number: finalData.khasra_number || null,
      khata_number: finalData.khata_number || null,
      area_value: finalData.area_value != null ? Number(finalData.area_value) : null,
      area_unit: finalData.area_unit || 'acre',
      village: finalData.village || '',
      taluk: finalData.taluk || '',
      district: finalData.district || '',
      state: finalData.state || 'Tamil Nadu',
      classification: finalData.classification || null,
      final_approved_data: finalData,
      verification_session_id: verificationSessionId,
      status: 'GOVERNMENT_APPROVED',
      approval_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    this.records.set(id, item);
    return item;
  }

  async findById(id) {
    return this.records.get(id) || null;
  }

  async findByRecordId(recordId) {
    for (const r of this.records.values()) {
      if (r.record_id === recordId) return { ...r };
    }
    return null;
  }

  async findByCaseId(caseId) {
    for (const r of this.records.values()) {
      if (r.case_id === caseId) return { ...r };
    }
    return null;
  }

  async findByCitizenId(citizenId) {
    const list = [];
    for (const r of this.records.values()) {
      if (r.citizen_id === citizenId) list.push({ ...r });
    }
    return list.sort((a, b) => new Date(b.approval_date) - new Date(a.approval_date));
  }

  async findAll({ search = '', limit = 50, offset = 0 } = {}) {
    let list = Array.from(this.records.values());
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        r.record_id.toLowerCase().includes(s) ||
        r.survey_number.toLowerCase().includes(s) ||
        r.owner_name.toLowerCase().includes(s) ||
        r.village.toLowerCase().includes(s) ||
        r.district.toLowerCase().includes(s)
      );
    }
    return {
      total: list.length,
      records: list.slice(offset, offset + limit),
    };
  }
}

class MySQLDigitalLandRecordRepository {
  constructor(databasePool) {
    this.pool = databasePool;
  }

  async nextRecordId() {
    const res = await this.pool.query('SELECT COUNT(*) AS total FROM digital_land_records');
    const count = Number(res.rows[0]?.total || 0) + 1;
    return `DLR-GOV-2026-${String(count).padStart(6, '0')}`;
  }

  async createApprovedRecord({ caseId, landRecordId, citizenId, officerId, finalData, verificationSessionId = null }) {
    const id = crypto.randomUUID();
    const recordId = await this.nextRecordId();

    const query = `
      INSERT INTO digital_land_records (
        id, record_id, case_id, land_record_id, citizen_id,
        approved_by_officer_id, owner_name, survey_number,
        khasra_number, khata_number, area_value, area_unit,
        village, taluk, district, state, classification,
        final_approved_data, verification_session_id, status,
        approval_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GOVERNMENT_APPROVED', NOW(6), NOW(6))
    `;

    await this.pool.query(query, [
      id,
      recordId,
      caseId,
      landRecordId,
      citizenId,
      officerId,
      finalData.owner_name || 'Land Owner',
      finalData.survey_number || '—',
      finalData.khasra_number || null,
      finalData.khata_number || null,
      finalData.area_value != null ? Number(finalData.area_value) : null,
      finalData.area_unit || 'acre',
      finalData.village || '',
      finalData.taluk || '',
      finalData.district || '',
      finalData.state || 'Tamil Nadu',
      finalData.classification || null,
      JSON.stringify(finalData),
      verificationSessionId,
    ]);

    return this.findById(id);
  }

  async findById(id) {
    const query = `
      SELECT dlr.*,
             u_cit.name AS citizen_name, u_cit.external_reference AS citizen_reference,
             u_off.name AS officer_name, u_off.username AS officer_username
      FROM digital_land_records dlr
      LEFT JOIN users u_cit ON dlr.citizen_id = u_cit.id
      LEFT JOIN users u_off ON dlr.approved_by_officer_id = u_off.id
      WHERE dlr.id = ? OR dlr.record_id = ?
    `;
    const res = await this.pool.query(query, [id, id]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      final_approved_data: typeof row.final_approved_data === 'string'
        ? JSON.parse(row.final_approved_data)
        : (row.final_approved_data || {}),
    };
  }

  async findByCaseId(caseId) {
    const query = `
      SELECT dlr.*,
             u_cit.name AS citizen_name, u_cit.external_reference AS citizen_reference,
             u_off.name AS officer_name
      FROM digital_land_records dlr
      LEFT JOIN users u_cit ON dlr.citizen_id = u_cit.id
      LEFT JOIN users u_off ON dlr.approved_by_officer_id = u_off.id
      WHERE dlr.case_id = ?
      ORDER BY dlr.approval_date DESC
      LIMIT 1
    `;
    const res = await this.pool.query(query, [caseId]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      final_approved_data: typeof row.final_approved_data === 'string'
        ? JSON.parse(row.final_approved_data)
        : (row.final_approved_data || {}),
    };
  }

  async findByCitizenId(citizenId) {
    const query = `
      SELECT dlr.*,
             u_off.name AS officer_name
      FROM digital_land_records dlr
      LEFT JOIN users u_off ON dlr.approved_by_officer_id = u_off.id
      WHERE dlr.citizen_id = ?
      ORDER BY dlr.approval_date DESC
    `;
    const res = await this.pool.query(query, [citizenId]);
    return res.rows.map(row => ({
      ...row,
      final_approved_data: typeof row.final_approved_data === 'string'
        ? JSON.parse(row.final_approved_data)
        : (row.final_approved_data || {}),
    }));
  }

  async findAll({ search = '', state = null, district = null, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(
        dlr.record_id LIKE ? OR
        dlr.survey_number LIKE ? OR
        dlr.owner_name LIKE ? OR
        dlr.village LIKE ? OR
        dlr.district LIKE ?
      )`);
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (state) {
      conditions.push('LOWER(dlr.state) = LOWER(?)');
      params.push(state);
    }

    if (district) {
      conditions.push('LOWER(dlr.district) = LOWER(?)');
      params.push(district);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) AS total FROM digital_land_records dlr ${where}`;
    const countRes = await this.pool.query(countQuery, params);
    const total = Number(countRes.rows[0]?.total || 0);

    const query = `
      SELECT dlr.*,
             u_cit.name AS citizen_name,
             u_off.name AS officer_name
      FROM digital_land_records dlr
      LEFT JOIN users u_cit ON dlr.citizen_id = u_cit.id
      LEFT JOIN users u_off ON dlr.approved_by_officer_id = u_off.id
      ${where}
      ORDER BY dlr.approval_date DESC
      LIMIT ? OFFSET ?
    `;
    const res = await this.pool.query(query, [...params, Number(limit), Number(offset)]);
    const records = res.rows.map(row => ({
      ...row,
      final_approved_data: typeof row.final_approved_data === 'string'
        ? JSON.parse(row.final_approved_data)
        : (row.final_approved_data || {}),
    }));

    return { total, records };
  }
}

const digitalLandRecordRepository = new MySQLDigitalLandRecordRepository(pool);

module.exports = {
  InMemoryDigitalLandRecordRepository,
  MySQLDigitalLandRecordRepository,
  digitalLandRecordRepository,
};
