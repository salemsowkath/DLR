const { pool } = require('../config/database');

const STATIC_STATES = [
  { id: 'e0000001-0000-0000-0000-000000000001', state_code: 'AP', state_name: 'Andhra Pradesh', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000002', state_code: 'AR', state_name: 'Arunachal Pradesh', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000003', state_code: 'AS', state_name: 'Assam', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000004', state_code: 'BR', state_name: 'Bihar', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000005', state_code: 'CG', state_name: 'Chhattisgarh', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000006', state_code: 'GA', state_name: 'Goa', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000007', state_code: 'GJ', state_name: 'Gujarat', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000008', state_code: 'HR', state_name: 'Haryana', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000009', state_code: 'HP', state_name: 'Himachal Pradesh', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000010', state_code: 'JH', state_name: 'Jharkhand', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000011', state_code: 'KA', state_name: 'Karnataka', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000012', state_code: 'KL', state_name: 'Kerala', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000013', state_code: 'MP', state_name: 'Madhya Pradesh', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000014', state_code: 'MH', state_name: 'Maharashtra', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000015', state_code: 'MN', state_name: 'Manipur', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000016', state_code: 'ML', state_name: 'Meghalaya', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000017', state_code: 'MZ', state_name: 'Mizoram', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000018', state_code: 'NL', state_name: 'Nagaland', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000019', state_code: 'OD', state_name: 'Odisha', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000020', state_code: 'PB', state_name: 'Punjab', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000021', state_code: 'RJ', state_name: 'Rajasthan', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000022', state_code: 'SK', state_name: 'Sikkim', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000023', state_code: 'TN', state_name: 'Tamil Nadu', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000024', state_code: 'TS', state_name: 'Telangana', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000025', state_code: 'TR', state_name: 'Tripura', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000026', state_code: 'UP', state_name: 'Uttar Pradesh', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000027', state_code: 'UK', state_name: 'Uttarakhand', is_active: 1 },
  { id: 'e0000001-0000-0000-0000-000000000028', state_code: 'WB', state_name: 'West Bengal', is_active: 1 },
];

class StateRepository {
  constructor(databasePool = pool) {
    this.pool = databasePool;
  }

  async getAllStates() {
    if (this.pool) {
      try {
        const query = 'SELECT id, state_code, state_name, is_active FROM states WHERE is_active = 1 ORDER BY state_name ASC';
        const res = await this.pool.query(query);
        if (res.rows && res.rows.length > 0) {
          return res.rows;
        }
      } catch (_) {}
    }
    return STATIC_STATES;
  }

  async getStateById(id) {
    if (!id) return null;
    if (this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM states WHERE id = ?', [id]);
        if (res.rows && res.rows.length > 0) return res.rows[0];
      } catch (_) {}
    }
    return STATIC_STATES.find(s => s.id === id) || null;
  }

  async getStateByName(name) {
    if (!name) return null;
    const clean = String(name).trim().toLowerCase();
    if (this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM states WHERE LOWER(state_name) = ?', [clean]);
        if (res.rows && res.rows.length > 0) return res.rows[0];
      } catch (_) {}
    }
    return STATIC_STATES.find(s => s.state_name.toLowerCase() === clean) || null;
  }

  async getStateByCode(code) {
    if (!code) return null;
    const clean = String(code).trim().toUpperCase();
    if (this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM states WHERE UPPER(state_code) = ?', [clean]);
        if (res.rows && res.rows.length > 0) return res.rows[0];
      } catch (_) {}
    }
    return STATIC_STATES.find(s => s.state_code.toUpperCase() === clean) || null;
  }

  getStateByIdSync(id) {
    if (!id) return null;
    return STATIC_STATES.find(s => s.id === id) || null;
  }

  getStateByNameSync(name) {
    if (!name) return null;
    const clean = String(name).trim().toLowerCase();
    return STATIC_STATES.find(s => s.state_name.toLowerCase() === clean) || null;
  }

  async getStateAdminProfile(userId) {
    if (!userId) return null;
    if (this.pool) {
      try {
        const query = `
          SELECT sap.id, sap.user_id, sap.state_id, s.state_code, s.state_name
          FROM state_admin_profiles sap
          JOIN states s ON sap.state_id = s.id
          WHERE sap.user_id = ?
        `;
        const res = await this.pool.query(query, [userId]);
        if (res.rows && res.rows.length > 0) return res.rows[0];
      } catch (_) {}
    }
    return null;
  }

  async getStateAdminByStateId(stateId) {
    if (!stateId) return null;
    if (this.pool) {
      try {
        const query = `
          SELECT u.id, u.username, u.name, u.email, u.status, sap.state_id, s.state_name
          FROM state_admin_profiles sap
          JOIN users u ON sap.user_id = u.id
          JOIN states s ON sap.state_id = s.id
          WHERE sap.state_id = ?
        `;
        const res = await this.pool.query(query, [stateId]);
        if (res.rows && res.rows.length > 0) return res.rows[0];
      } catch (_) {}
    }
    return null;
  }

  async linkStateAdminProfile(userId, stateId) {
    if (!userId || !stateId) throw new Error('userId and stateId required.');
    if (this.pool) {
      const query = `
        INSERT INTO state_admin_profiles (id, user_id, state_id)
        VALUES (UUID(), ?, ?)
        ON DUPLICATE KEY UPDATE state_id = VALUES(state_id), updated_at = NOW(6)
      `;
      await this.pool.query(query, [userId, stateId]);
    }
  }
}

const stateRepository = new StateRepository(pool);

module.exports = {
  StateRepository,
  stateRepository,
  STATIC_STATES,
};
