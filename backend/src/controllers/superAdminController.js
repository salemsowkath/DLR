const { successResponse, errorResponse } = require('../utils/response');
const { userRepository } = require('../repositories/userRepository');
const { auditRepository } = require('../repositories/auditRepository');
const { landRecordRepository } = require('../repositories/landRecordRepository');
const { reviewRepository } = require('../repositories/reviewRepository');
const { reportingRepository } = require('../repositories/reportingRepository');
const { hashPassword } = require('../services/passwordService');
const { stateRepository } = require('../repositories/stateRepository');
const { pool } = require('../config/database');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

// ==========================================
// 1. DASHBOARD STATISTICS
// ==========================================
async function getDashboard(req, res, next) {
  try {
    const userStats = await userRepository.getStats();

    // Query real land records & review cases counts from MySQL
    let landRecordsCount = 0;
    let pendingApplicationsCount = 0;
    let approvedRecordsCount = 0;
    let rejectedApplicationsCount = 0;

    if (pool) {
      const landRes = await pool.query('SELECT COUNT(*) as count FROM land_records');
      landRecordsCount = Number(landRes.rows[0]?.count || 0);

      const casesRes = await pool.query(`
        SELECT 
          COUNT(*) as total_cases,
          SUM(status IN ('PENDING_REVIEW', 'PENDING_OFFICER_VERIFICATION', 'IN_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD')) as pending_cases,
          SUM(status IN ('APPROVED', 'OFFICER VERIFIED')) as approved_cases,
          SUM(status = 'REJECTED') as rejected_cases
        FROM review_cases
      `);
      const row = casesRes.rows[0] || {};
      pendingApplicationsCount = Number(row.pending_cases || 0);
      approvedRecordsCount = Number(row.approved_cases || 0);
      rejectedApplicationsCount = Number(row.rejected_cases || 0);
    }

    const { events: recentActivities } = await auditRepository.getAuditLogs({ limit: 10, offset: 0 });
    const analytics = await reportingRepository.getDashboardAnalytics();

    const data = {
      citizens: userStats.citizens,
      officers: userStats.officers,
      ministers: userStats.ministers,
      stateAdmins: userStats.state_admins || 0,
      superAdmins: userStats.super_admins,
      activeUsers: userStats.active_users,
      totalUsers: userStats.total_users,
      landRecords: landRecordsCount,
      pendingApplications: pendingApplicationsCount,
      approvedRecords: approvedRecordsCount,
      rejectedApplications: rejectedApplicationsCount,
      // Extended requirements (Section 4)
      metrics: analytics.metrics,
      totalOfficers: analytics.metrics.totalOfficers,
      activeOfficers: analytics.metrics.activeOfficers,
      inactiveOfficers: analytics.metrics.inactiveOfficers,
      totalMinisters: analytics.metrics.totalMinisters,
      activeMinisters: analytics.metrics.activeMinisters,
      inactiveMinisters: analytics.metrics.inactiveMinisters,
      totalCitizens: analytics.metrics.totalCitizens,
      totalLandRecords: analytics.metrics.totalLandRecords,
      aiProcessedRecords: analytics.metrics.aiProcessedRecords,
      visualAnalytics: analytics.visualAnalytics,
      recentActivities: recentActivities || [],
      systemOverview: {
        database: 'MySQL 8.4',
        databaseStatus: 'CONNECTED',
        aiService: 'FastAPI Python (port 8000)',
        aiServiceStatus: 'OPERATIONAL',
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
      },
      userStatusOverview: {
        active: userStats.active_users,
        inactive: Math.max(0, userStats.total_users - userStats.active_users),
      },
    };

    return res.status(200).json(successResponse('Super Admin dashboard statistics retrieved.', data));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 2. OFFICER MANAGEMENT
// ==========================================
async function listOfficers(req, res, next) {
  try {
    const { search = '', status = '', district = '', department = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const { total, users } = await userRepository.listUsersByRole(
      ['OFFICER', 'GOVERNMENT_OFFICER'],
      { search, status, district, limit: Number(limit), offset }
    );

    return res.status(200).json(successResponse('Officers retrieved successfully.', {
      officers: users,
      total,
      page: Number(page),
      limit: Number(limit),
    }));
  } catch (error) {
    return next(error);
  }
}

async function createOfficer(req, res, next) {
  try {
    const { name, username, password, email, state = 'Tamil Nadu', district, department = 'Land Records' } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Officer full name is required.');
    }
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Officer username is required.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Password must be at least 6 characters.');
    }

    const cleanUsername = username.trim();

    // Check duplicate username
    const existingByUsername = await userRepository.findByUsername(cleanUsername);
    if (existingByUsername) {
      throw createAppError(409, 'CONFLICT', 'Username is already registered. Please choose another username.');
    }

    // Check duplicate email if provided
    if (email && typeof email === 'string' && email.trim().length > 0) {
      const existingByEmail = await userRepository.findByEmail(email.trim());
      if (existingByEmail) {
        throw createAppError(409, 'CONFLICT', 'Email is already registered to another account.');
      }
    }

    // Validate state against controlled 28 Indian states
    const targetState = state ? state.trim() : 'Tamil Nadu';
    const stateObj = (await stateRepository.getStateByName(targetState)) || (await stateRepository.getStateById(targetState));
    if (!stateObj) {
      throw createAppError(400, 'VALIDATION_FAILED', `Invalid state '${targetState}'. Must be one of the 28 authorized Indian states.`);
    }

    const passwordHash = await hashPassword(password);

    const officer = await userRepository.create({
      name: name.trim(),
      username: cleanUsername,
      password_hash: passwordHash,
      email: email ? email.trim() : null,
      department: department ? department.trim() : 'Land Records',
      state: stateObj.state_name,
      state_id: stateObj.id,
      district: district ? district.trim() : null,
      status: 'ACTIVE',
      roles: ['OFFICER'],
    });

    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_CREATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: {
        officerId: officer.id,
        officerUsername: cleanUsername,
        officerName: officer.name,
        department: officer.department,
        state: stateObj.state_name,
        district: officer.district,
      },
    });

    return res.status(201).json(successResponse('Officer created successfully.', officer.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function getOfficer(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userRepository.findById(id);
    if (!user) {
      throw createAppError(404, 'NOT_FOUND', 'Officer account not found.');
    }
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    if (!roles.some(r => ['OFFICER', 'GOVERNMENT_OFFICER'].includes(String(r).toUpperCase()))) {
      throw createAppError(404, 'NOT_FOUND', 'User is not an officer.');
    }
    return res.status(200).json(successResponse('Officer retrieved successfully.', user.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function updateOfficer(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, state, district, department } = req.body || {};

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw createAppError(404, 'NOT_FOUND', 'Officer account not found.');
    }

    if (email && email.trim() !== (existing.email || '').trim()) {
      const emailCollision = await userRepository.findByEmail(email.trim());
      if (emailCollision && emailCollision.id !== id) {
        throw createAppError(409, 'CONFLICT', 'Email is already in use by another account.');
      }
    }

    let newStateName = existing.state;
    let newStateId = existing.state_id;
    if (state && state.trim()) {
      const stateObj = stateRepository.getStateByName(state.trim()) || stateRepository.getStateById(state.trim());
      if (!stateObj) {
        throw createAppError(400, 'VALIDATION_FAILED', `Invalid state '${state}'. Must be one of the 28 authorized Indian states.`);
      }
      newStateName = stateObj.state_name;
      newStateId = stateObj.id;
    }

    const jurisdictionChanged = (state && newStateName !== existing.state) ||
                                (district && district.trim() !== (existing.district || '').trim());

    const updated = await userRepository.updateUser(id, {
      name,
      email,
      state: newStateName,
      state_id: newStateId,
      district: district !== undefined ? district : existing.district,
      department,
    });

    if (jurisdictionChanged) {
      await auditRepository.logAuditEvent({
        eventType: 'OFFICER_JURISDICTION_CHANGED',
        actorType: 'SUPER_ADMIN',
        actorReference: req.user.id,
        metadata: {
          officerId: id,
          oldJurisdiction: { state: existing.state, district: existing.district },
          newJurisdiction: { state: newStateName, district: district !== undefined ? district : existing.district },
        },
      });
    }

    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_UPDATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { officerId: id, updatedFields: { name, email, district, department } },
    });

    return res.status(200).json(successResponse('Officer updated successfully.', updated.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function setOfficerStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(String(status).toUpperCase())) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Status must be ACTIVE, INACTIVE, or SUSPENDED.');
    }

    const normalizedStatus = String(status).toUpperCase();
    const updated = await userRepository.updateStatus(id, normalizedStatus);
    if (!updated) {
      throw createAppError(404, 'NOT_FOUND', 'Officer account not found.');
    }

    const eventType = normalizedStatus === 'ACTIVE' ? 'OFFICER_ACTIVATED' : 'OFFICER_DEACTIVATED';
    await auditRepository.logAuditEvent({
      eventType,
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { officerId: id, newStatus: normalizedStatus },
    });

    return res.status(200).json(successResponse(`Officer status updated to ${normalizedStatus}.`, updated.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function resetOfficerPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw createAppError(400, 'VALIDATION_FAILED', 'New password must be at least 6 characters.');
    }

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw createAppError(404, 'NOT_FOUND', 'Officer account not found.');
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(id, passwordHash);

    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_PASSWORD_RESET',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { officerId: id, officerUsername: existing.username },
    });

    return res.status(200).json(successResponse('Password reset successfully.', { userId: id }));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 3. MINISTER MANAGEMENT
// ==========================================
async function listMinisters(req, res, next) {
  try {
    const { search = '', status = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const { total, users } = await userRepository.listUsersByRole(
      ['MINISTER'],
      { search, status, limit: Number(limit), offset }
    );

    return res.status(200).json(successResponse('Ministers retrieved successfully.', {
      ministers: users,
      total,
      page: Number(page),
      limit: Number(limit),
    }));
  } catch (error) {
    return next(error);
  }
}

async function createMinister(req, res, next) {
  try {
    const { name, username, password, email, state = 'Tamil Nadu', department = 'Revenue' } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Minister full name is required.');
    }
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Minister username is required.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Password must be at least 6 characters.');
    }

    const cleanUsername = username.trim();

    // Check duplicate username
    const existingByUsername = await userRepository.findByUsername(cleanUsername);
    if (existingByUsername) {
      throw createAppError(409, 'CONFLICT', 'Username is already registered. Please choose another username.');
    }

    // Check duplicate email if provided
    if (email && typeof email === 'string' && email.trim().length > 0) {
      const existingByEmail = await userRepository.findByEmail(email.trim());
      if (existingByEmail) {
        throw createAppError(409, 'CONFLICT', 'Email is already registered to another account.');
      }
    }

    // Validate state against controlled 28 Indian states
    const targetState = state ? state.trim() : 'Tamil Nadu';
    const stateObj = (await stateRepository.getStateByName(targetState)) || (await stateRepository.getStateById(targetState));
    if (!stateObj) {
      throw createAppError(400, 'VALIDATION_FAILED', `Invalid state '${targetState}'. Must be one of the 28 authorized Indian states.`);
    }

    const passwordHash = await hashPassword(password);

    const minister = await userRepository.create({
      name: name.trim(),
      username: cleanUsername,
      password_hash: passwordHash,
      email: email ? email.trim() : null,
      department: department ? department.trim() : 'Revenue',
      state: stateObj.state_name,
      state_id: stateObj.id,
      status: 'ACTIVE',
      roles: ['MINISTER'],
    });

    await auditRepository.logAuditEvent({
      eventType: 'MINISTER_CREATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: {
        ministerId: minister.id,
        ministerUsername: cleanUsername,
        ministerName: minister.name,
        department: minister.department,
        state: stateObj.state_name,
      },
    });

    return res.status(201).json(successResponse('Minister created successfully.', minister.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function getMinister(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userRepository.findById(id);
    if (!user) {
      throw createAppError(404, 'NOT_FOUND', 'Minister account not found.');
    }
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    if (!roles.some(r => ['MINISTER'].includes(String(r).toUpperCase()))) {
      throw createAppError(404, 'NOT_FOUND', 'User is not a minister.');
    }
    return res.status(200).json(successResponse('Minister retrieved successfully.', user.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function updateMinister(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, state, department } = req.body || {};

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw createAppError(404, 'NOT_FOUND', 'Minister account not found.');
    }

    if (email && email.trim() !== (existing.email || '').trim()) {
      const emailCollision = await userRepository.findByEmail(email.trim());
      if (emailCollision && emailCollision.id !== id) {
        throw createAppError(409, 'CONFLICT', 'Email is already in use by another account.');
      }
    }

    let newStateName = existing.state;
    let newStateId = existing.state_id;
    if (state && state.trim()) {
      const stateObj = stateRepository.getStateByName(state.trim()) || stateRepository.getStateById(state.trim());
      if (!stateObj) {
        throw createAppError(400, 'VALIDATION_FAILED', `Invalid state '${state}'. Must be one of the 28 authorized Indian states.`);
      }
      newStateName = stateObj.state_name;
      newStateId = stateObj.id;
    }

    const stateChanged = state && newStateName !== existing.state;

    const updated = await userRepository.updateUser(id, {
      name,
      email,
      state: newStateName,
      state_id: newStateId,
      department,
    });

    if (stateChanged) {
      await auditRepository.logAuditEvent({
        eventType: 'MINISTER_STATE_CHANGED',
        actorType: 'SUPER_ADMIN',
        actorReference: req.user.id,
        metadata: {
          ministerId: id,
          oldState: existing.state,
          newState: newStateName,
        },
      });
    }

    await auditRepository.logAuditEvent({
      eventType: 'MINISTER_UPDATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { ministerId: id, updatedFields: { name, email, department } },
    });

    return res.status(200).json(successResponse('Minister updated successfully.', updated.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function setMinisterStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(String(status).toUpperCase())) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Status must be ACTIVE, INACTIVE, or SUSPENDED.');
    }

    const normalizedStatus = String(status).toUpperCase();
    const updated = await userRepository.updateStatus(id, normalizedStatus);
    if (!updated) {
      throw createAppError(404, 'NOT_FOUND', 'Minister account not found.');
    }

    const eventType = normalizedStatus === 'ACTIVE' ? 'MINISTER_ACTIVATED' : 'MINISTER_DEACTIVATED';
    await auditRepository.logAuditEvent({
      eventType,
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { ministerId: id, newStatus: normalizedStatus },
    });

    return res.status(200).json(successResponse(`Minister status updated to ${normalizedStatus}.`, updated.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function resetMinisterPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw createAppError(400, 'VALIDATION_FAILED', 'New password must be at least 6 characters.');
    }

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw createAppError(404, 'NOT_FOUND', 'Minister account not found.');
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(id, passwordHash);

    await auditRepository.logAuditEvent({
      eventType: 'MINISTER_PASSWORD_RESET',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { ministerId: id, ministerUsername: existing.username },
    });

    return res.status(200).json(successResponse('Password reset successfully.', { userId: id }));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 4. CITIZEN MANAGEMENT
// ==========================================
async function listCitizens(req, res, next) {
  try {
    const { search = '', status = '', district = '', village = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const { total, users } = await userRepository.listUsersByRole(
      ['CITIZEN'],
      { search, status, district, village, limit: Number(limit), offset }
    );

    return res.status(200).json(successResponse('Citizens retrieved successfully.', {
      citizens: users,
      total,
      page: Number(page),
      limit: Number(limit),
    }));
  } catch (error) {
    return next(error);
  }
}

async function getCitizen(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userRepository.findById(id);
    if (!user) {
      throw createAppError(404, 'NOT_FOUND', 'Citizen account not found.');
    }
    return res.status(200).json(successResponse('Citizen retrieved successfully.', user.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function setCitizenStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(String(status).toUpperCase())) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Status must be ACTIVE, INACTIVE, or SUSPENDED.');
    }

    const normalizedStatus = String(status).toUpperCase();
    const updated = await userRepository.updateStatus(id, normalizedStatus);
    if (!updated) {
      throw createAppError(404, 'NOT_FOUND', 'Citizen account not found.');
    }

    const eventType = normalizedStatus === 'ACTIVE' ? 'CITIZEN_ACTIVATED' : 'CITIZEN_DEACTIVATED';
    await auditRepository.logAuditEvent({
      eventType,
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { citizenId: id, newStatus: normalizedStatus },
    });

    return res.status(200).json(successResponse(`Citizen status updated to ${normalizedStatus}.`, updated.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 5. GENERIC USER PASSWORD RESET
// ==========================================
async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw createAppError(400, 'VALIDATION_FAILED', 'New password must be at least 6 characters.');
    }

    const user = await userRepository.findById(id);
    if (!user) {
      throw createAppError(404, 'NOT_FOUND', 'User account not found.');
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(id, passwordHash);

    await auditRepository.logAuditEvent({
      eventType: 'USER_PASSWORD_RESET',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { targetUserId: id, targetUsername: user.username },
    });

    return res.status(200).json(successResponse('Password reset successfully.', { userId: id }));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 6. AUDIT LOGS
// ==========================================
async function getAuditLogs(req, res, next) {
  try {
    const { action = '', actor = '', actorType = '', date = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    let startDate = null;
    let endDate = null;
    if (date) {
      startDate = `${date}T00:00:00.000Z`;
      endDate = `${date}T23:59:59.999Z`;
    }

    const { total, events } = await auditRepository.getAuditLogs({
      limit: Number(limit),
      offset,
      eventType: action,
      actorType,
      actorReference: actor,
      startDate,
      endDate,
    });

    return res.status(200).json(successResponse('Audit logs retrieved successfully.', {
      total,
      logs: events,
      events,
      page: Number(page),
      limit: Number(limit),
    }));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 7. LAND RECORD OVERVIEW
// ==========================================
async function getLandRecordsOverview(req, res, next) {
  try {
    const { search = '', district = '', village = '', status = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const conditions = ['1=1'];
    const params = [];

    if (search) {
      conditions.push('(LOWER(owner_name) LIKE ? OR LOWER(survey_number) LIKE ? OR LOWER(village) LIKE ? OR LOWER(district) LIKE ?)');
      const pattern = `%${search.toLowerCase()}%`;
      params.push(pattern, pattern, pattern, pattern);
    }
    if (district) {
      conditions.push('LOWER(district) = LOWER(?)');
      params.push(district);
    }
    if (village) {
      conditions.push('LOWER(village) = LOWER(?)');
      params.push(village);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    let total = 0;
    let records = [];

    if (pool) {
      const countRes = await pool.query(`SELECT COUNT(*) as total FROM land_records WHERE ${whereClause}`, params);
      total = Number(countRes.rows[0]?.total || 0);

      const dataRes = await pool.query(`
        SELECT id, record_reference, owner_name, survey_number, area_value, area_unit,
               village, taluk, district, state, classification, record_date,
               is_duplicate, duplicate_reason, ai_status, status, verification_status,
               created_at, updated_at
        FROM land_records
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, Number(limit), Number(offset)]);
      records = dataRes.rows || [];
    }

    return res.status(200).json(successResponse('Land records retrieved successfully.', {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
    }));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 8. STATE MASTER & STATE ADMIN MANAGEMENT
// ==========================================
async function listStates(req, res, next) {
  try {
    const states = await stateRepository.getAllStates();
    return res.status(200).json(successResponse('States retrieved successfully.', {
      states,
      total: states.length,
    }));
  } catch (error) {
    return next(error);
  }
}

async function listStateAdmins(req, res, next) {
  try {
    const { search = '', status = '', state = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const { total, users } = await userRepository.listUsersByRole(
      ['STATE_ADMIN'],
      { search, status, state, limit: Number(limit), offset }
    );

    // Decorate with state info
    const decorated = await Promise.all(users.map(async u => {
      const sObj = (await stateRepository.getStateByName(u.state)) || (await stateRepository.getStateById(u.state_id));
      return {
        ...u,
        state_code: sObj?.state_code || null,
        state_name: sObj?.state_name || u.state,
      };
    }));

    return res.status(200).json(successResponse('State Admins retrieved successfully.', {
      stateAdmins: decorated,
      total,
      page: Number(page),
      limit: Number(limit),
    }));
  } catch (error) {
    return next(error);
  }
}

async function createStateAdmin(req, res, next) {
  try {
    const { name, username, password, email, state, department = 'Land Records & Revenue' } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw createAppError(400, 'VALIDATION_FAILED', 'State Admin full name is required.');
    }
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      throw createAppError(400, 'VALIDATION_FAILED', 'State Admin username is required.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Password must be at least 6 characters.');
    }
    if (!state || typeof state !== 'string' || state.trim().length === 0) {
      throw createAppError(400, 'VALIDATION_FAILED', 'State selection is required.');
    }

    const stateObj = (await stateRepository.getStateByName(state.trim())) || (await stateRepository.getStateById(state.trim()));
    if (!stateObj) {
      throw createAppError(400, 'VALIDATION_FAILED', `Invalid state '${state}'. Must be one of the 28 authorized Indian states.`);
    }

    const cleanUsername = username.trim();

    // Check duplicate username
    const existingByUsername = await userRepository.findByUsername(cleanUsername);
    if (existingByUsername) {
      throw createAppError(409, 'CONFLICT', 'Username is already registered. Please choose another username.');
    }

    // Check duplicate email if provided
    if (email && typeof email === 'string' && email.trim().length > 0) {
      const existingByEmail = await userRepository.findByEmail(email.trim());
      if (existingByEmail) {
        throw createAppError(409, 'CONFLICT', 'Email is already registered to another account.');
      }
    }

    // Enforce ONE ACTIVE STATE ADMIN PER STATE (Section 6)
    if (pool) {
      const existingAdminRes = await pool.query(`
        SELECT u.id, u.username, u.name, sap.state_id
        FROM state_admin_profiles sap
        JOIN users u ON sap.user_id = u.id
        WHERE sap.state_id = ? AND u.status = 'ACTIVE'
        LIMIT 1
      `, [stateObj.id]);

      if (existingAdminRes.rows.length > 0) {
        throw createAppError(409, 'STATE_ADMIN_ALREADY_EXISTS', `An active State Admin already exists for ${stateObj.state_name} (${existingAdminRes.rows[0].username}). Exactly one State Admin per state is allowed.`);
      }
    }

    const passwordHash = await hashPassword(password);

    const stateAdmin = await userRepository.create({
      name: name.trim(),
      username: cleanUsername,
      password_hash: passwordHash,
      email: email ? email.trim() : null,
      department: department ? department.trim() : 'Land Records & Revenue',
      state: stateObj.state_name,
      state_id: stateObj.id,
      status: 'ACTIVE',
      roles: ['STATE_ADMIN'],
    });

    await auditRepository.logAuditEvent({
      eventType: 'STATE_ADMIN_CREATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: {
        stateAdminId: stateAdmin.id,
        stateAdminUsername: cleanUsername,
        stateAdminName: stateAdmin.name,
        state: stateObj.state_name,
        stateId: stateObj.id,
        department: stateAdmin.department,
      },
    });

    return res.status(201).json(successResponse('State Admin created successfully.', stateAdmin.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function getStateAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userRepository.findById(id);
    if (!user) {
      throw createAppError(404, 'NOT_FOUND', 'State Admin account not found.');
    }
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    if (!roles.some(r => ['STATE_ADMIN'].includes(String(r).toUpperCase()))) {
      throw createAppError(404, 'NOT_FOUND', 'User is not a State Admin.');
    }
    const sObj = stateRepository.getStateByName(user.state) || stateRepository.getStateById(user.state_id);
    const pub = user.toPublicJSON();
    pub.state_code = sObj?.state_code || null;
    pub.state_name = sObj?.state_name || user.state;
    return res.status(200).json(successResponse('State Admin retrieved successfully.', pub));
  } catch (error) {
    return next(error);
  }
}

async function updateStateAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, department, state } = req.body || {};

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw createAppError(404, 'NOT_FOUND', 'State Admin account not found.');
    }

    if (email && email.trim() !== (existing.email || '').trim()) {
      const emailCollision = await userRepository.findByEmail(email.trim());
      if (emailCollision && emailCollision.id !== id) {
        throw createAppError(409, 'CONFLICT', 'Email is already in use by another account.');
      }
    }

    // State assignment cannot be changed directly (Section 5)
    if (state && String(state).trim().toLowerCase() !== String(existing.state).trim().toLowerCase()) {
      throw createAppError(400, 'STATE_CHANGE_FORBIDDEN', 'State Admin jurisdiction cannot be changed directly.');
    }

    const updated = await userRepository.updateUser(id, {
      name,
      email,
      department,
    });

    await auditRepository.logAuditEvent({
      eventType: 'STATE_ADMIN_UPDATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { stateAdminId: id, updatedFields: { name, email, department } },
    });

    return res.status(200).json(successResponse('State Admin updated successfully.', updated.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function setStateAdminStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(String(status).toUpperCase())) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Status must be ACTIVE, INACTIVE, or SUSPENDED.');
    }

    const normalizedStatus = String(status).toUpperCase();
    const updated = await userRepository.updateStatus(id, normalizedStatus);
    if (!updated) {
      throw createAppError(404, 'NOT_FOUND', 'State Admin account not found.');
    }

    const eventType = normalizedStatus === 'ACTIVE' ? 'STATE_ADMIN_ACTIVATED' : 'STATE_ADMIN_DEACTIVATED';
    await auditRepository.logAuditEvent({
      eventType,
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { stateAdminId: id, newStatus: normalizedStatus },
    });

    return res.status(200).json(successResponse(`State Admin status updated to ${normalizedStatus}.`, updated.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function resetStateAdminPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw createAppError(400, 'VALIDATION_FAILED', 'New password must be at least 6 characters.');
    }

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw createAppError(404, 'NOT_FOUND', 'State Admin account not found.');
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(id, passwordHash);

    await auditRepository.logAuditEvent({
      eventType: 'STATE_ADMIN_PASSWORD_RESET',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { stateAdminId: id, stateAdminUsername: existing.username },
    });

    return res.status(200).json(successResponse('Password reset successfully.', { userId: id }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard,
  listStates,
  listStateAdmins,
  createStateAdmin,
  getStateAdmin,
  updateStateAdmin,
  setStateAdminStatus,
  resetStateAdminPassword,
  listOfficers,
  createOfficer,
  getOfficer,
  updateOfficer,
  setOfficerStatus,
  resetOfficerPassword,
  listMinisters,
  createMinister,
  getMinister,
  updateMinister,
  setMinisterStatus,
  resetMinisterPassword,
  listCitizens,
  getCitizen,
  setCitizenStatus,
  resetUserPassword,
  getAuditLogs,
  getLandRecordsOverview,
};
