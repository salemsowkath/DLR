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

    const officer = new User({
      id: 'usr-officer-001',
      external_reference: 'DEMO-OFFICER-001',
      name: 'Demo Officer',
      password_hash: officerHash,
      status: 'ACTIVE',
      roles: ['OFFICER', 'GOVERNMENT_OFFICER'],
    });

    const minister = new User({
      id: 'usr-minister-001',
      external_reference: 'DEMO-MINISTER-001',
      name: 'Demo Minister',
      password_hash: ministerHash,
      status: 'ACTIVE',
      roles: ['MINISTER', 'ADMIN'],
    });

    const admin = new User({
      id: 'usr-admin-001',
      external_reference: 'DEMO-ADMIN-001',
      name: 'Demo Admin',
      password_hash: adminHash,
      status: 'ACTIVE',
      roles: ['ADMIN'],
    });

    const citizen = new User({
      id: 'usr-citizen-001',
      external_reference: 'DEMO-CITIZEN-001',
      name: 'Demo Citizen',
      status: 'ACTIVE',
      roles: ['CITIZEN'],
    });

    const demoAadhaarCitizen = new User({
      id: 'usr-aadhaar-1234',
      external_reference: 'AADHAAR-XXXX-XXXX-1234',
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
    const cleanUser = String(username).trim();
    for (const user of this.users.values()) {
      if (
        user.external_reference.toLowerCase() === cleanUser.toLowerCase() ||
        user.name.toLowerCase() === cleanUser.toLowerCase()
      ) {
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
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    });
    this.users.set(user.id, user);
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

  async getStats() {
    let totalUsers = 0;
    let citizens = 0;
    let officers = 0;
    let ministers = 0;
    let admins = 0;

    for (const user of this.users.values()) {
      totalUsers += 1;
      const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
      if (roles.includes('CITIZEN')) citizens += 1;
      if (roles.some((r) => r === 'OFFICER' || r === 'GOVERNMENT_OFFICER')) officers += 1;
      if (roles.includes('MINISTER')) ministers += 1;
      if (roles.includes('ADMIN')) admins += 1;
    }

    return {
      total_users: totalUsers,
      citizens,
      officers,
      ministers,
      admins,
    };
  }
}

class PostgresUserRepository {
  constructor(databasePool) {
    if (!databasePool) {
      throw new Error('A PostgreSQL pool is required.');
    }
    this.pool = databasePool;
  }

  async findById(id) {
    const query = `
      SELECT u.id, u.external_reference, u.name, u.email_hash, u.phone_token,
             u.password_hash, u.status, u.created_at, u.updated_at,
             COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id
    `;
    const result = await this.pool.query(query, [id]);
    if (!result.rows[0]) return null;
    return new User(result.rows[0]);
  }

  async findByExternalReference(ref) {
    const query = `
      SELECT u.id, u.external_reference, u.name, u.email_hash, u.phone_token,
             u.password_hash, u.status, u.created_at, u.updated_at,
             COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.external_reference = $1
      GROUP BY u.id
    `;
    const result = await this.pool.query(query, [ref]);
    if (!result.rows[0]) return null;
    return new User(result.rows[0]);
  }

  async findByUsername(username) {
    return this.findByExternalReference(username);
  }

  async create(data) {
    const query = `
      INSERT INTO users (external_reference, name, password_hash, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, external_reference, name, status, created_at, updated_at
    `;
    const result = await this.pool.query(query, [
      data.external_reference,
      data.name,
      data.password_hash || null,
      data.status || 'ACTIVE',
    ]);
    const user = result.rows[0];

    // Assign role if provided
    if (data.roles && data.roles.length > 0) {
      for (const roleName of data.roles) {
        await this.assignRole(user.id, roleName);
      }
    }

    return this.findById(user.id);
  }

  async updatePassword(userId, newPasswordHash) {
    const query = `
      UPDATE users SET password_hash = $1, updated_at = now()
      WHERE id = $2
      RETURNING id
    `;
    const result = await this.pool.query(query, [newPasswordHash, userId]);
    if (!result.rows[0]) return null;
    return this.findById(userId);
  }

  async assignRole(userId, roleName) {
    const roleQuery = `INSERT INTO roles (role_name) VALUES ($1) ON CONFLICT (role_name) DO UPDATE SET role_name = EXCLUDED.role_name RETURNING id`;
    const roleRes = await this.pool.query(roleQuery, [roleName]);
    const roleId = roleRes.rows[0].id;

    const linkQuery = `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`;
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
        'SELECT id FROM users WHERE external_reference = $1 FOR UPDATE',
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
          external_reference, name, date_of_birth, gender,
          state, district, taluk, village, pincode, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
        RETURNING id
      `;
      const userRes = await client.query(insertUserQuery, [
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
      const userId = userRes.rows[0].id;

      const roleQuery = `
        INSERT INTO roles (role_name) VALUES ('CITIZEN')
        ON CONFLICT (role_name) DO UPDATE SET role_name = EXCLUDED.role_name
        RETURNING id
      `;
      const roleRes = await client.query(roleQuery);
      const roleId = roleRes.rows[0].id;

      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, roleId]
      );

      const idVerifyQuery = `
        INSERT INTO identity_verifications (user_id, identity_type, masked_reference, verification_status, verified_at)
        VALUES ($1, 'AADHAAR', $2, 'VERIFIED', now())
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

  async getStats() {
    const query = `
      SELECT 
        COUNT(DISTINCT u.id)::int AS total_users,
        COUNT(DISTINCT CASE WHEN r.role_name = 'CITIZEN' THEN u.id END)::int AS citizens,
        COUNT(DISTINCT CASE WHEN r.role_name IN ('OFFICER', 'GOVERNMENT_OFFICER') THEN u.id END)::int AS officers,
        COUNT(DISTINCT CASE WHEN r.role_name = 'MINISTER' THEN u.id END)::int AS ministers,
        COUNT(DISTINCT CASE WHEN r.role_name = 'ADMIN' THEN u.id END)::int AS admins
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
      admins: Number(row.admins || 0),
    };
  }
}

const userRepository = pool ? new PostgresUserRepository(pool) : new InMemoryUserRepository();

module.exports = {
  InMemoryUserRepository,
  PostgresUserRepository,
  userRepository,
};
