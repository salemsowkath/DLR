const crypto = require('crypto');
const { pool } = require('../config/database');

function parseDateOnly(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

class InMemoryAppointmentRepository {
  constructor() {
    this.appointments = new Map();
  }

  async createAppointment({ caseId, citizenId, officerId, appointmentDate, appointmentTime, officeLocation, purpose = 'Physical Verification of Land Documents', notes = null }) {
    const dStr = parseDateOnly(appointmentDate);
    if (!dStr) {
      throw new Error('Valid appointment date is required.');
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dStr < todayStr) {
      const err = new Error('Appointment date cannot be in the past.');
      err.statusCode = 400;
      err.code = 'PAST_APPOINTMENT_DATE';
      throw err;
    }

    // Check duplicate active appointment for the same case
    for (const a of this.appointments.values()) {
      if (a.case_id === caseId && ['SCHEDULED', 'CONFIRMED'].includes(a.status)) {
        const err = new Error('An active appointment is already scheduled for this application.');
        err.statusCode = 409;
        err.code = 'DUPLICATE_ACTIVE_APPOINTMENT';
        throw err;
      }
    }

    const id = crypto.randomUUID();
    const item = {
      id,
      case_id: caseId,
      citizen_id: citizenId,
      officer_id: officerId,
      appointment_date: dStr,
      appointment_time: appointmentTime,
      office_location: officeLocation,
      purpose,
      status: 'SCHEDULED',
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.appointments.set(id, item);
    return item;
  }

  async findById(id) {
    return this.appointments.get(id) || null;
  }

  async findByCaseId(caseId) {
    const list = [];
    for (const a of this.appointments.values()) {
      if (a.case_id === caseId) list.push({ ...a });
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async findActiveByCaseId(caseId) {
    for (const a of this.appointments.values()) {
      if (a.case_id === caseId && ['SCHEDULED', 'CONFIRMED'].includes(a.status)) {
        return { ...a };
      }
    }
    return null;
  }

  async findCitizenAppointments(citizenId) {
    const list = [];
    for (const a of this.appointments.values()) {
      if (a.citizen_id === citizenId) list.push({ ...a });
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async findOfficerAppointments(officerId, { date = null, status = null } = {}) {
    const list = [];
    for (const a of this.appointments.values()) {
      if (officerId && a.officer_id !== officerId) continue;
      if (date && a.appointment_date !== date) continue;
      if (status && a.status !== status) continue;
      list.push({ ...a });
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async updateStatus(id, status, notes = null) {
    const a = this.appointments.get(id);
    if (!a) return null;
    a.status = status;
    if (notes) a.notes = notes;
    a.updated_at = new Date().toISOString();
    return a;
  }
}

class MySQLAppointmentRepository {
  constructor(databasePool) {
    this.pool = databasePool;
  }

  async createAppointment({ caseId, citizenId, officerId, appointmentDate, appointmentTime, officeLocation, purpose = 'Physical Verification of Land Documents', notes = null }) {
    const dStr = parseDateOnly(appointmentDate);
    if (!dStr) {
      const err = new Error('Valid appointment date is required.');
      err.statusCode = 400;
      err.code = 'INVALID_APPOINTMENT_DATE';
      throw err;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dStr < todayStr) {
      const err = new Error('Appointment date cannot be in the past.');
      err.statusCode = 400;
      err.code = 'PAST_APPOINTMENT_DATE';
      throw err;
    }

    if (!appointmentTime || !String(appointmentTime).trim()) {
      const err = new Error('Appointment time is required.');
      err.statusCode = 400;
      err.code = 'INVALID_APPOINTMENT_TIME';
      throw err;
    }

    if (!officeLocation || !String(officeLocation).trim()) {
      const err = new Error('Government office location is required.');
      err.statusCode = 400;
      err.code = 'INVALID_OFFICE_LOCATION';
      throw err;
    }

    // Check duplicate active appointment for the same application
    const checkQuery = `
      SELECT id FROM appointments 
      WHERE case_id = ? AND status IN ('SCHEDULED', 'CONFIRMED') 
      LIMIT 1
    `;
    const checkRes = await this.pool.query(checkQuery, [caseId]);
    if (checkRes.rows.length > 0) {
      const err = new Error('An active appointment is already scheduled for this application.');
      err.statusCode = 409;
      err.code = 'DUPLICATE_ACTIVE_APPOINTMENT';
      throw err;
    }

    const id = crypto.randomUUID();
    const query = `
      INSERT INTO appointments (
        id, case_id, citizen_id, officer_id,
        appointment_date, appointment_time, office_location,
        purpose, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, NOW(6), NOW(6))
    `;
    await this.pool.query(query, [
      id, caseId, citizenId, officerId,
      dStr, String(appointmentTime).trim(), String(officeLocation).trim(),
      purpose, notes,
    ]);

    return this.findById(id);
  }

  async findById(id) {
    const query = `
      SELECT a.*, 
             u_cit.name AS citizen_name, u_cit.external_reference AS citizen_reference,
             u_off.name AS officer_name, u_off.username AS officer_username
      FROM appointments a
      LEFT JOIN users u_cit ON a.citizen_id = u_cit.id
      LEFT JOIN users u_off ON a.officer_id = u_off.id
      WHERE a.id = ?
    `;
    const res = await this.pool.query(query, [id]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      appointment_date: row.appointment_date ? new Date(row.appointment_date).toISOString().slice(0, 10) : null,
    };
  }

  async findByCaseId(caseId) {
    const query = `
      SELECT a.*,
             u_cit.name AS citizen_name,
             u_off.name AS officer_name
      FROM appointments a
      LEFT JOIN users u_cit ON a.citizen_id = u_cit.id
      LEFT JOIN users u_off ON a.officer_id = u_off.id
      WHERE a.case_id = ?
      ORDER BY a.created_at DESC
    `;
    const res = await this.pool.query(query, [caseId]);
    return res.rows.map(row => ({
      ...row,
      appointment_date: row.appointment_date ? new Date(row.appointment_date).toISOString().slice(0, 10) : null,
    }));
  }

  async findActiveByCaseId(caseId) {
    const query = `
      SELECT a.*,
             u_cit.name AS citizen_name,
             u_off.name AS officer_name
      FROM appointments a
      LEFT JOIN users u_cit ON a.citizen_id = u_cit.id
      LEFT JOIN users u_off ON a.officer_id = u_off.id
      WHERE a.case_id = ? AND a.status IN ('SCHEDULED', 'CONFIRMED')
      ORDER BY a.created_at DESC
      LIMIT 1
    `;
    const res = await this.pool.query(query, [caseId]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      appointment_date: row.appointment_date ? new Date(row.appointment_date).toISOString().slice(0, 10) : null,
    };
  }

  async findCitizenAppointments(citizenId) {
    const query = `
      SELECT a.*,
             u_off.name AS officer_name,
             rc.status AS case_status,
             lr.survey_number, lr.village, lr.taluk, lr.district
      FROM appointments a
      LEFT JOIN users u_off ON a.officer_id = u_off.id
      LEFT JOIN review_cases rc ON a.case_id = rc.case_id
      LEFT JOIN land_records lr ON rc.land_record_id = lr.id
      WHERE a.citizen_id = ?
      ORDER BY a.created_at DESC
    `;
    const res = await this.pool.query(query, [citizenId]);
    return res.rows.map(row => ({
      ...row,
      appointment_date: row.appointment_date ? new Date(row.appointment_date).toISOString().slice(0, 10) : null,
    }));
  }

  async findOfficerAppointments(officerId, { date = null, status = null } = {}) {
    const conditions = [];
    const params = [];

    if (officerId) {
      conditions.push('a.officer_id = ?');
      params.push(officerId);
    }
    if (date) {
      conditions.push('a.appointment_date = ?');
      params.push(date);
    }
    if (status && status !== 'ALL') {
      conditions.push('a.status = ?');
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT a.*,
             u_cit.name AS citizen_name, u_cit.external_reference AS citizen_reference,
             rc.status AS case_status,
             lr.survey_number, lr.village, lr.district
      FROM appointments a
      LEFT JOIN users u_cit ON a.citizen_id = u_cit.id
      LEFT JOIN review_cases rc ON a.case_id = rc.case_id
      LEFT JOIN land_records lr ON rc.land_record_id = lr.id
      ${where}
      ORDER BY a.appointment_date ASC, a.created_at DESC
    `;
    const res = await this.pool.query(query, params);
    return res.rows.map(row => ({
      ...row,
      appointment_date: row.appointment_date ? new Date(row.appointment_date).toISOString().slice(0, 10) : null,
    }));
  }

  async findTodayAppointments(officerId = null) {
    const today = new Date().toISOString().slice(0, 10);
    return this.findOfficerAppointments(officerId, { date: today });
  }

  async updateStatus(id, status, notes = null) {
    let query = 'UPDATE appointments SET status = ?, updated_at = NOW(6)';
    const params = [status];
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

const appointmentRepository = new MySQLAppointmentRepository(pool);

module.exports = {
  InMemoryAppointmentRepository,
  MySQLAppointmentRepository,
  appointmentRepository,
};
