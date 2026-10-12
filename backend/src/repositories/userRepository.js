const crypto = require('crypto');
const { pool } = require('../config/database');
const User = require('../models/user');
const { hashPassword } = require('../services/passwordService');
const bcrypt = require('bcryptjs');

class InMemoryUserRepository {
  constructor() {
    this.users = new Map();
    this.seedDemoUsers();
  }

  seedDemoUsers() {
    const officerHash = bcrypt.hashSync('OfficerPass123!', 10);
    const ministerHash = bcrypt.hashSync('MinisterPass123!', 10);
    const adminHash = bcrypt.hashSync('AdminPass123!', 10);
    const superAdminHash = '$2b$10$ZXl406Bz0y//82/RXZmFC.tS4yelR1sl3.Od9Qvke5YRP6EsG/KPC';

    const superAdmin = new User({
      id: 'usr-superadmin-001',
      external_reference: 'SUPER-ADMIN-001',
      username: 'Dora027',
      name: 'Super Administrator',
      email: 'superadmin@dlr.gov.in',
      department: 'System Administration',
      password_hash: superAdminHash,
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
    });

    const officer = new User({
      id: 'usr-officer-001',
      external_reference: 'DEMO-OFFICER-001',
      username: 'DEMO-OFFICER-001',
      name: 'Demo Officer',
      email: 'officer@dlr.gov.in',
      department: 'Land Records',
      state: 'Tamil Nadu',
      district: 'Salem',
      password_hash: officerHash,
      status: 'ACTIVE',
      roles: ['OFFICER', 'GOVERNMENT_OFFICER'],
    });

    const minister = new User({
      id: 'usr-minister-001',
      external_reference: 'DEMO-MINISTER-001',
      username: 'DEMO-MINISTER-001',
      name: 'Demo Minister',
      email: 'minister@dlr.gov.in',
      department: 'Revenue',
      state: 'Tamil Nadu',
      password_hash: ministerHash,
      status: 'ACTIVE',
      roles: ['MINISTER'],
    });

    const admin = new User({
      id: 'usr-admin-001',
      external_reference: 'DEMO-ADMIN-001',
      username: 'DEMO-ADMIN-001',
      name: 'Demo Admin',
      password_hash: adminHash,
      status: 'ACTIVE',
      roles: ['ADMIN'],
    });

    const citizen = new User({
      id: 'usr-citizen-001',
      external_reference: 'DEMO-CITIZEN-001',
      username: 'DEMO-CITIZEN-001',
      name: 'Demo Citizen',
      status: 'ACTIVE',
      roles: ['CITIZEN'],
    });

    const demoAadhaarCitizen = new User({
      id: 'usr-aadhaar-1234',
      external_reference: 'AADHAAR-XXXX-XXXX-1234',
      username: 'AADHAAR-XXXX-XXXX-1234',
      name: 'Registered Citizen 1234',
      date_of_birth: '1992-08-20',
      gender: 'Male',
      state: 'Tamil Nadu',
      district: 'Salem',
      taluk: 'Salem',
      village: 'Salem Central',
      pincode: '636001',
      status: 'ACTIVE',
      roles: ['CITIZEN'],
      identity_verified: true,
    });

    const stateAdminHash = bcrypt.hashSync('Tamil_Nadu_Admin@123', 10);
    const keralaAdminHash = bcrypt.hashSync('Kerala_Admin@123', 10);

    const stateAdmin = new User({
      id: 'usr-stateadmin-tn-001',
      external_reference: 'STATE-ADMIN-TN-001',
      username: 'Tamil_Nadu_admin',
      name: 'Tamil Nadu State Administrator',
      email: 'admin@tn.gov.in',
      department: 'Land Records & Revenue',
      state: 'Tamil Nadu',
      state_id: 'e0000001-0000-0000-0000-000000000023',
      password_hash: stateAdminHash,
      status: 'ACTIVE',
      roles: ['STATE_ADMIN'],
    });

    const keralaAdmin = new User({
      id: 'usr-stateadmin-kl-001',
      external_reference: 'STATE-ADMIN-KL-001',
      username: 'Kerala_admin',
      name: 'Kerala State Administrator',
      email: 'admin@kerala.gov.in',
      department: 'Revenue & Land Records',
      state: 'Kerala',
      state_id: 'e0000001-0000-0000-0000-000000000012',
      password_hash: keralaAdminHash,
      status: 'ACTIVE',
      roles: ['STATE_ADMIN'],
    });

    this.users.set(superAdmin.id, superAdmin);
    this.users.set(stateAdmin.id, stateAdmin);
    this.users.set(keralaAdmin.id, keralaAdmin);
    this.users.set(officer.id, officer);
    this.users.set(minister.id, minister);
    this.users.set(admin.id, admin);
    this.users.set(citizen.id, citizen);
    this.users.set(demoAadhaarCitizen.id, demoAadhaarCitizen);
  }

  async findById(id) {
    const user = this.users.get(id);
    return user ? new User(user) : null;
  }

  async findByExternalReference(ref) {
    for (const user of this.users.values()) {
      if (user.external_reference === ref) {
        return new User(user);
      }
    }
    return null;
  }

  async findByUsername(username) {
    if (!username) return null;
    const cleanUser = String(username).trim().toLowerCase();
    for (const user of this.users.values()) {
      if (
        (user.username && user.username.toLowerCase() === cleanUser) ||
        (user.external_reference && user.external_reference.toLowerCase() === cleanUser) ||
        (user.name && user.name.toLowerCase() === cleanUser)
      ) {
        return new User(user);
      }
    }
    return null;
  }

  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = String(email).trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email && user.email.toLowerCase() === cleanEmail) {
        return new User(user);
      }
    }
    return null;
  }

  async create(data) {
    const id = data.id || `usr-${crypto.randomUUID()}`;
    const user = new User({
      ...data,
      id,
      username: data.username || data.external_reference,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    });
    this.users.set(user.id, user);
    return new User(user);
  }

  async updateUser(userId, data) {
    const user = this.users.get(userId);
    if (!user) return null;
    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.department !== undefined) user.department = data.department;
    if (data.state !== undefined) user.state = data.state;
    if (data.state_id !== undefined) user.state_id = data.state_id;
    if (data.district !== undefined) user.district = data.district;
    if (data.district_id !== undefined) user.district_id = data.district_id;
    if (data.taluk !== undefined) user.taluk = data.taluk;
    if (data.village !== undefined) user.village = data.village;
    user.updated_at = new Date().toISOString();
    return new User(user);
  }

  async updateStatus(userId, status) {
    const user = this.users.get(userId);
    if (!user) return null;
    user.status = status;
    user.updated_at = new Date().toISOString();
    return new User(user);
  }

  async updatePassword(userId, newPasswordHash) {
    const user = this.users.get(userId);
    if (!user) return null;
    user.password_hash = newPasswordHash;
    user.updated_at = new Date().toISOString();
    return new User(user);
  }

  async assignRole(userId, roleName) {
    const user = this.users.get(userId);
    if (!user) return null;
    if (!user.roles.includes(roleName)) {
      user.roles.push(roleName);
    }
    return new User(user);
  }

  async createCitizenWithIdentity({
    externalReference,
    fullName,
    dateOfBirth,
    gender,
    state,
    district,
    taluk,
    village,
    pincode,
    maskedAadhaar,
  }) {
    const existing = await this.findByExternalReference(externalReference);
    if (existing) {
      const error = new Error('This identity is already registered. Please use Citizen Login.');
      error.statusCode = 409;
      error.code = 'CITIZEN_ALREADY_REGISTERED';
      throw error;
    }

    const id = `usr-${crypto.randomUUID()}`;
    const user = new User({
      id,
      external_reference: externalReference,
      username: externalReference,
      name: fullName,
      date_of_birth: dateOfBirth,
      gender,
      state,
      district,
      taluk,
      village,
      pincode,
      status: 'ACTIVE',
      roles: ['CITIZEN'],
      identity_verified: true,
    });

    this.users.set(user.id, user);
    return new User(user);
  }

  async listUsersByRole(roleName, { search = '', status = '', state = '', state_id = '', district = '', village = '', limit = 50, offset = 0 } = {}) {
    const allowedRoles = Array.isArray(roleName) ? roleName : (roleName ? [roleName] : []);
    let filtered = Array.from(this.users.values()).filter(user => {
      const uRoles = Array.isArray(user.roles) ? user.roles : [user.roles];
      if (allowedRoles.length > 0 && !uRoles.some(r => allowedRoles.includes(r))) return false;
      if (status && user.status !== status) return false;
      if (state && String(user.state || '').toLowerCase() !== String(state).toLowerCase()) return false;
      if (state_id && user.state_id !== state_id) return false;
      if (district && String(user.district || '').toLowerCase() !== String(district).toLowerCase()) return false;
      if (village && String(user.village || '').toLowerCase() !== String(village).toLowerCase()) return false;
      if (search) {
        const s = search.toLowerCase();
        const matchesName = String(user.name || '').toLowerCase().includes(s);
        const matchesUsername = String(user.username || '').toLowerCase().includes(s);
        const matchesDistrict = String(user.district || '').toLowerCase().includes(s);
        const matchesDept = String(user.department || '').toLowerCase().includes(s);
        const matchesExt = String(user.external_reference || '').toLowerCase().includes(s);
        if (!matchesName && !matchesUsername && !matchesDistrict && !matchesDept && !matchesExt) return false;
      }
      return true;
    });

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit).map(u => {
      const json = u.toPublicJSON();
      if (u.external_reference && u.external_reference.startsWith('AADHAAR-')) {
        json.maskedAadhaar = u.external_reference.replace('AADHAAR-', '');
        json.masked_aadhaar = json.maskedAadhaar;
      }
      return json;
    });

    return { total, users: paged };
  }

  async getStats() {
    let totalUsers = 0;
    let citizens = 0;
    let officers = 0;
    let ministers = 0;
    let stateAdmins = 0;
    let superAdmins = 0;
    let admins = 0;
    let activeUsers = 0;

    for (const user of this.users.values()) {
      totalUsers += 1;
      if (user.status === 'ACTIVE') activeUsers += 1;
      const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
      if (roles.includes('CITIZEN')) citizens += 1;
      if (roles.some((r) => r === 'OFFICER' || r === 'GOVERNMENT_OFFICER')) officers += 1;
      if (roles.includes('MINISTER')) ministers += 1;
      if (roles.includes('STATE_ADMIN')) stateAdmins += 1;
      if (roles.includes('SUPER_ADMIN')) superAdmins += 1;
      if (roles.includes('ADMIN')) admins += 1;
    }

    return {
      total_users: totalUsers,
      citizens,
      officers,
      ministers,
      state_admins: stateAdmins,
      super_admins: superAdmins,
      admins,
      active_users: activeUsers,
    };
  }
}

class MySQLUserRepository {
  constructor(databasePool) {
    if (!databasePool) {
      throw new Error('A MySQL pool is required.');
    }
    this.pool = databasePool;
  }

  _mapUser(row) {
    if (!row) return null;
    return new User({
      ...row,
      state_id: row.state_id || row.profile_state_id || null,
      roles: row.roles ? String(row.roles).split(',').filter(Boolean) : [],
    });
  }

  async findById(id) {
    const query = `
      SELECT u.id, u.external_reference, u.username, u.name, u.email, u.department,
             u.email_hash, u.phone_token, u.password_hash, u.date_of_birth, u.gender,
             u.state, u.state_id, u.district, u.district_id, u.taluk, u.village, u.pincode, u.status, u.created_at, u.updated_at,
             sap.state_id AS profile_state_id,
             COALESCE(GROUP_CONCAT(DISTINCT r.role_name), '') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN state_admin_profiles sap ON u.id = sap.user_id
      WHERE u.id = ?
      GROUP BY u.id, sap.state_id
    `;
    const result = await this.pool.query(query, [id]);
    return this._mapUser(result.rows[0]);
  }

  async findByExternalReference(ref) {
    const query = `
      SELECT u.id, u.external_reference, u.username, u.name, u.email, u.department,
             u.email_hash, u.phone_token, u.password_hash, u.date_of_birth, u.gender,
             u.state, u.state_id, u.district, u.district_id, u.taluk, u.village, u.pincode, u.status, u.created_at, u.updated_at,
             sap.state_id AS profile_state_id,
             COALESCE(GROUP_CONCAT(DISTINCT r.role_name), '') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN state_admin_profiles sap ON u.id = sap.user_id
      WHERE u.external_reference = ?
      GROUP BY u.id, sap.state_id
    `;
    const result = await this.pool.query(query, [ref]);
    return this._mapUser(result.rows[0]);
  }

  async findByUsername(username) {
    if (!username) return null;
    const cleanUser = String(username).trim();
    const query = `
      SELECT u.id, u.external_reference, u.username, u.name, u.email, u.department,
             u.email_hash, u.phone_token, u.password_hash, u.date_of_birth, u.gender,
             u.state, u.state_id, u.district, u.district_id, u.taluk, u.village, u.pincode, u.status, u.created_at, u.updated_at,
             sap.state_id AS profile_state_id,
             COALESCE(GROUP_CONCAT(DISTINCT r.role_name), '') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN state_admin_profiles sap ON u.id = sap.user_id
      WHERE LOWER(u.username) = LOWER(?) OR LOWER(u.external_reference) = LOWER(?) OR LOWER(u.name) = LOWER(?)
      GROUP BY u.id, sap.state_id
    `;
    const result = await this.pool.query(query, [cleanUser, cleanUser, cleanUser]);
    return this._mapUser(result.rows[0]);
  }

  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = String(email).trim().toLowerCase();
    const query = `
      SELECT u.id, u.external_reference, u.username, u.name, u.email, u.department,
             u.email_hash, u.phone_token, u.password_hash, u.date_of_birth, u.gender,
             u.state, u.state_id, u.district, u.district_id, u.taluk, u.village, u.pincode, u.status, u.created_at, u.updated_at,
             sap.state_id AS profile_state_id,
             COALESCE(GROUP_CONCAT(DISTINCT r.role_name), '') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN state_admin_profiles sap ON u.id = sap.user_id
      WHERE LOWER(u.email) = ?
      GROUP BY u.id, sap.state_id
    `;
    const result = await this.pool.query(query, [cleanEmail]);
    return this._mapUser(result.rows[0]);
  }

  async create(data) {
    const id = data.id || crypto.randomUUID();
    const username = data.username ? String(data.username).trim() : null;
    const externalRef = data.external_reference || (username ? `USER-${username}` : `USER-${id}`);

    const query = `
      INSERT INTO users (id, external_reference, username, name, email, department, state, state_id, district, district_id, taluk, village, password_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        username = VALUES(username),
        email = VALUES(email),
        department = VALUES(department),
        state = VALUES(state),
        state_id = VALUES(state_id),
        district = VALUES(district),
        district_id = VALUES(district_id),
        taluk = VALUES(taluk),
        village = VALUES(village),
        password_hash = VALUES(password_hash),
        status = VALUES(status),
        updated_at = NOW(6)
    `;

    await this.pool.query(query, [
      id,
      externalRef,
      username,
      data.name,
      data.email || null,
      data.department || null,
      data.state || null,
      data.state_id || null,
      data.district || null,
      data.district_id || null,
      data.taluk || null,
      data.village || null,
      data.password_hash || null,
      data.status || 'ACTIVE',
    ]);

    // Assign roles if provided
    if (data.roles && data.roles.length > 0) {
      for (const roleName of data.roles) {
        await this.assignRole(id, roleName);
      }
    }

    // If STATE_ADMIN, ensure state_admin_profiles is populated
    if (data.roles && data.roles.includes('STATE_ADMIN') && data.state_id) {
      const profileQuery = `
        INSERT INTO state_admin_profiles (id, user_id, state_id, created_at, updated_at)
        VALUES (UUID(), ?, ?, NOW(6), NOW(6))
        ON DUPLICATE KEY UPDATE
          state_id = VALUES(state_id),
          updated_at = NOW(6)
      `;
      await this.pool.query(profileQuery, [
        id,
        data.state_id,
      ]);
    }

    return this.findById(id);
  }

  async updateUser(userId, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
    if (data.department !== undefined) { fields.push('department = ?'); values.push(data.department); }
    if (data.state !== undefined) { fields.push('state = ?'); values.push(data.state); }
    if (data.state_id !== undefined) { fields.push('state_id = ?'); values.push(data.state_id); }
    if (data.district !== undefined) { fields.push('district = ?'); values.push(data.district); }
    if (data.district_id !== undefined) { fields.push('district_id = ?'); values.push(data.district_id); }
    if (data.taluk !== undefined) { fields.push('taluk = ?'); values.push(data.taluk); }
    if (data.village !== undefined) { fields.push('village = ?'); values.push(data.village); }

    if (fields.length === 0) return this.findById(userId);

    fields.push('updated_at = NOW(6)');
    values.push(userId);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await this.pool.query(query, values);
    return this.findById(userId);
  }

  async updateStatus(userId, status) {
    const query = 'UPDATE users SET status = ?, updated_at = NOW(6) WHERE id = ?';
    await this.pool.query(query, [status, userId]);
    return this.findById(userId);
  }

  async updatePassword(userId, newPasswordHash) {
    const query = `
      UPDATE users SET password_hash = ?, updated_at = NOW(6)
      WHERE id = ?
    `;
    const result = await this.pool.query(query, [newPasswordHash, userId]);
    if (!result.rows[0] && result.rows.affectedRows === 0) return null;
    return this.findById(userId);
  }

  async assignRole(userId, roleName) {
    const roleQuery = 'INSERT INTO roles (role_name) VALUES (?) ON DUPLICATE KEY UPDATE role_name = VALUES(role_name)';
    await this.pool.query(roleQuery, [roleName]);
    const roleRes = await this.pool.query('SELECT id FROM roles WHERE role_name = ?', [roleName]);
    const roleId = roleRes.rows[0]?.id;
    if (!roleId) throw new Error(`Role ${roleName} could not be resolved.`);

    const linkQuery = 'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)';
    await this.pool.query(linkQuery, [userId, roleId]);
    return this.findById(userId);
  }

  async createCitizenWithIdentity({
    externalReference,
    fullName,
    dateOfBirth,
    gender,
    state,
    district,
    taluk,
    village,
    pincode,
    maskedAadhaar,
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const dupCheck = await client.query(
        'SELECT id FROM users WHERE external_reference = ? FOR UPDATE',
        [externalReference]
      );
      if (dupCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        const error = new Error('This identity is already registered. Please use Citizen Login.');
        error.statusCode = 409;
        error.code = 'CITIZEN_ALREADY_REGISTERED';
        throw error;
      }

      const insertUserQuery = `
        INSERT INTO users (
          external_reference, username, name, date_of_birth, gender,
          state, district, taluk, village, pincode, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      `;
      await client.query(insertUserQuery, [
        externalReference,
        externalReference,
        fullName,
        dateOfBirth || null,
        gender || null,
        state || null,
        district || null,
        taluk || null,
        village || null,
        pincode || null,
      ]);
      const userIdResult = await client.query('SELECT id FROM users WHERE external_reference = ?', [externalReference]);
      const userId = userIdResult.rows[0].id;

      const roleQuery = `
        INSERT INTO roles (role_name) VALUES ('CITIZEN')
        ON DUPLICATE KEY UPDATE role_name = VALUES(role_name)
      `;
      await client.query(roleQuery);
      const roleRes = await client.query('SELECT id FROM roles WHERE role_name = ?', ['CITIZEN']);
      const roleId = roleRes.rows[0]?.id;
      if (!roleId) throw new Error('CITIZEN role could not be resolved.');

      await client.query(
        `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [userId, roleId]
      );

      const idVerifyQuery = `
        INSERT INTO identity_verifications (user_id, identity_type, masked_reference, verification_status, verified_at)
        VALUES (?, 'AADHAAR', ?, 'VERIFIED', NOW(6))
      `;
      await client.query(idVerifyQuery, [userId, maskedAadhaar || 'XXXX-XXXX-0000']);

      await client.query('COMMIT');

      return this.findById(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listUsersByRole(roleName, { search = '', status = '', state = '', state_id = '', district = '', village = '', limit = 50, offset = 0 } = {}) {
    const conditions = ['1=1'];
    const params = [];

    if (roleName) {
      if (Array.isArray(roleName)) {
        conditions.push(`r.role_name IN (${roleName.map(() => '?').join(', ')})`);
        params.push(...roleName);
      } else {
        conditions.push('r.role_name = ?');
        params.push(roleName);
      }
    }

    if (status) {
      conditions.push('u.status = ?');
      params.push(status);
    }

    if (state) {
      conditions.push('LOWER(u.state) = LOWER(?)');
      params.push(state);
    }

    if (state_id) {
      conditions.push('(u.state_id = ? OR sap.state_id = ?)');
      params.push(state_id, state_id);
    }

    if (district) {
      conditions.push('LOWER(u.district) = LOWER(?)');
      params.push(district);
    }

    if (village) {
      conditions.push('LOWER(u.village) = LOWER(?)');
      params.push(village);
    }

    if (search) {
      conditions.push('(LOWER(u.name) LIKE ? OR LOWER(COALESCE(u.username, "")) LIKE ? OR LOWER(COALESCE(u.district, "")) LIKE ? OR LOWER(COALESCE(u.department, "")) LIKE ? OR LOWER(u.external_reference) LIKE ?)');
      const pattern = `%${search.toLowerCase()}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereClause = conditions.join(' AND ');

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN state_admin_profiles sap ON u.id = sap.user_id
      WHERE ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, params);
    const total = Number(countResult.rows[0]?.total || 0);

    const dataQuery = `
      SELECT u.id, u.external_reference, u.username, u.name, u.email, u.department,
             u.date_of_birth, u.gender, u.state, u.state_id, u.district, u.district_id, u.taluk, u.village, u.pincode,
             u.status, u.created_at, u.updated_at,
             sap.state_id AS profile_state_id,
             iv.masked_reference as masked_aadhaar,
             COALESCE(GROUP_CONCAT(DISTINCT r.role_name), '') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN state_admin_profiles sap ON u.id = sap.user_id
      LEFT JOIN identity_verifications iv ON u.id = iv.user_id
      WHERE ${whereClause}
      GROUP BY u.id, sap.state_id, iv.masked_reference
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const dataResult = await this.pool.query(dataQuery, [...params, Number(limit), Number(offset)]);
    const users = dataResult.rows.map(row => {
      const u = this._mapUser(row);
      const json = u.toPublicJSON();
      if (row.masked_aadhaar) {
        json.maskedAadhaar = row.masked_aadhaar;
        json.masked_aadhaar = row.masked_aadhaar;
      } else if (u.external_reference && u.external_reference.startsWith('AADHAAR-')) {
        json.maskedAadhaar = u.external_reference.replace('AADHAAR-', '');
        json.masked_aadhaar = json.maskedAadhaar;
      }
      return json;
    });

    return { total, users };
  }

  async getStats() {
    const query = `
      SELECT 
        COUNT(DISTINCT u.id) AS total_users,
        COUNT(DISTINCT CASE WHEN r.role_name = 'CITIZEN' THEN u.id END) AS citizens,
        COUNT(DISTINCT CASE WHEN r.role_name IN ('OFFICER', 'GOVERNMENT_OFFICER') THEN u.id END) AS officers,
        COUNT(DISTINCT CASE WHEN r.role_name = 'MINISTER' THEN u.id END) AS ministers,
        COUNT(DISTINCT CASE WHEN r.role_name = 'STATE_ADMIN' THEN u.id END) AS state_admins,
        COUNT(DISTINCT CASE WHEN r.role_name = 'SUPER_ADMIN' THEN u.id END) AS super_admins,
        COUNT(DISTINCT CASE WHEN r.role_name = 'ADMIN' THEN u.id END) AS admins,
        COUNT(DISTINCT CASE WHEN u.status = 'ACTIVE' THEN u.id END) AS active_users
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
    `;
    const result = await this.pool.query(query);
    const row = result.rows[0] || {};
    return {
      total_users: Number(row.total_users || 0),
      citizens: Number(row.citizens || 0),
      officers: Number(row.officers || 0),
      ministers: Number(row.ministers || 0),
      state_admins: Number(row.state_admins || 0),
      super_admins: Number(row.super_admins || 0),
      admins: Number(row.admins || 0),
      active_users: Number(row.active_users || 0),
    };
  }
}

const userRepository = new MySQLUserRepository(pool);

module.exports = {
  InMemoryUserRepository,
  MySQLUserRepository,
  userRepository,
};
