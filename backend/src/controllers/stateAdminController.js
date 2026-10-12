const { successResponse } = require('../utils/response');
const { userRepository } = require('../repositories/userRepository');
const { auditRepository } = require('../repositories/auditRepository');
const { stateRepository } = require('../repositories/stateRepository');
const { landRecordRepository } = require('../repositories/landRecordRepository');
const { reviewRepository } = require('../repositories/reviewRepository');
const { hashPassword } = require('../services/passwordService');
const {
  getUserJurisdiction,
  authorizeStateScope,
  authorizeResourceJurisdiction,
} = require('../middleware/jurisdiction');
const { pool } = require('../config/database');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

// ==========================================
// 1. STATE ADMIN DASHBOARD (State-Scoped)
// ==========================================
async function getDashboard(req, res, next) {
  try {
    const jurisdiction = getUserJurisdiction(req.user);
    const assignedState = jurisdiction.state || 'Tamil Nadu';
    const assignedStateId = jurisdiction.state_id;

    let userStats = {
      officers: 0,
      active_officers: 0,
      ministers: 0,
      active_ministers: 0,
      citizens: 0,
    };
    let landRecordsCount = 0;
    let pendingApplicationsCount = 0;
    let approvedRecordsCount = 0;
    let rejectedApplicationsCount = 0;
    let aiProcessedCount = 0;
    let pendingVerificationCount = 0;

    let applicationsByDistrict = [];
    let landRecordsByDistrict = [];
    let officerWorkload = [];
    let verificationStatusBreakdown = [];

    if (pool) {
      // 1. User stats in state
      const usersRes = await pool.query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN r.role_name IN ('OFFICER', 'GOVERNMENT_OFFICER') THEN u.id END) AS officers,
          COUNT(DISTINCT CASE WHEN r.role_name IN ('OFFICER', 'GOVERNMENT_OFFICER') AND u.status = 'ACTIVE' THEN u.id END) AS active_officers,
          COUNT(DISTINCT CASE WHEN r.role_name = 'MINISTER' THEN u.id END) AS ministers,
          COUNT(DISTINCT CASE WHEN r.role_name = 'MINISTER' AND u.status = 'ACTIVE' THEN u.id END) AS active_ministers,
          COUNT(DISTINCT CASE WHEN r.role_name = 'CITIZEN' THEN u.id END) AS citizens
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE LOWER(u.state) = LOWER(?) OR u.state_id = ?
      `, [assignedState, assignedStateId]);

      const uRow = usersRes.rows[0] || {};
      userStats = {
        officers: Number(uRow.officers || 0),
        active_officers: Number(uRow.active_officers || 0),
        ministers: Number(uRow.ministers || 0),
        active_ministers: Number(uRow.active_ministers || 0),
        citizens: Number(uRow.citizens || 0),
      };

      // 2. Land records count in state
      const landRes = await pool.query(`
        SELECT 
          COUNT(*) as total_records,
          SUM(ai_status = 'COMPLETED') as ai_processed
        FROM land_records
        WHERE LOWER(state) = LOWER(?) OR state_id = ?
      `, [assignedState, assignedStateId]);
      landRecordsCount = Number(landRes.rows[0]?.total_records || 0);
      aiProcessedCount = Number(landRes.rows[0]?.ai_processed || 0);

      // 3. Applications in state
      const casesRes = await pool.query(`
        SELECT 
          COUNT(*) as total_cases,
          SUM(rc.status IN ('PENDING_REVIEW', 'PENDING_OFFICER_REVIEW', 'IN_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD', 'UNDER_OFFICER_REVIEW')) as pending_cases,
          SUM(rc.status IN ('APPROVED', 'GOVERNMENT_APPROVED', 'OFFICER VERIFIED')) as approved_cases,
          SUM(rc.status = 'REJECTED') as rejected_cases,
          SUM(rc.status IN ('READY_FOR_CITIZEN_VERIFICATION', 'APPOINTMENT_SCHEDULED', 'CITIZEN_VERIFICATION')) as pending_verification
        FROM review_cases rc
        LEFT JOIN land_records lr ON rc.land_record_id = lr.id
        LEFT JOIN documents d ON rc.document_id = d.document_id
        LEFT JOIN users u ON d.created_by_user_id = u.id
        LEFT JOIN states s_lr ON lr.state_id = s_lr.id
        LEFT JOIN states s_u ON u.state_id = s_u.id
        WHERE (LOWER(COALESCE(lr.state, s_lr.state_name, u.state, s_u.state_name)) = LOWER(?) OR lr.state_id = ? OR u.state_id = ?)
      `, [assignedState, assignedStateId, assignedStateId]);
      const cRow = casesRes.rows[0] || {};
      pendingApplicationsCount = Number(cRow.pending_cases || 0);
      approvedRecordsCount = Number(cRow.approved_cases || 0);
      rejectedApplicationsCount = Number(cRow.rejected_cases || 0);
      pendingVerificationCount = Number(cRow.pending_verification || 0);

      // 4. Applications by district
      const distAppRes = await pool.query(`
        SELECT 
          COALESCE(lr.district, u.district, 'Unassigned') as district,
          COUNT(rc.case_id) as count
        FROM review_cases rc
        LEFT JOIN land_records lr ON rc.land_record_id = lr.id
        LEFT JOIN documents d ON rc.document_id = d.document_id
        LEFT JOIN users u ON d.created_by_user_id = u.id
        LEFT JOIN states s_lr ON lr.state_id = s_lr.id
        LEFT JOIN states s_u ON u.state_id = s_u.id
        WHERE (LOWER(COALESCE(lr.state, s_lr.state_name, u.state, s_u.state_name)) = LOWER(?) OR lr.state_id = ? OR u.state_id = ?)
        GROUP BY COALESCE(lr.district, u.district, 'Unassigned')
        ORDER BY count DESC
      `, [assignedState, assignedStateId, assignedStateId]);
      applicationsByDistrict = distAppRes.rows || [];

      // 5. Land records by district
      const distLandRes = await pool.query(`
        SELECT 
          COALESCE(district, 'Unassigned') as district,
          COUNT(id) as count
        FROM land_records
        WHERE LOWER(state) = LOWER(?) OR state_id = ?
        GROUP BY COALESCE(district, 'Unassigned')
        ORDER BY count DESC
      `, [assignedState, assignedStateId]);
      landRecordsByDistrict = distLandRes.rows || [];

      // 6. Officer workload
      const officerWorkloadRes = await pool.query(`
        SELECT 
          u.name as officer_name,
          COALESCE(u.district, 'N/A') as district,
          COUNT(rc.case_id) as assigned_cases
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN review_cases rc ON u.id = rc.assigned_officer_id
        WHERE (LOWER(u.state) = LOWER(?) OR u.state_id = ?)
          AND r.role_name IN ('OFFICER', 'GOVERNMENT_OFFICER')
        GROUP BY u.id, u.name, u.district
        ORDER BY assigned_cases DESC
        LIMIT 10
      `, [assignedState, assignedStateId]);
      officerWorkload = officerWorkloadRes.rows || [];

      // 7. Verification Status Breakdown
      const statusRes = await pool.query(`
        SELECT 
          rc.status,
          COUNT(rc.case_id) as count
        FROM review_cases rc
        LEFT JOIN land_records lr ON rc.land_record_id = lr.id
        LEFT JOIN documents d ON rc.document_id = d.document_id
        LEFT JOIN users u ON d.created_by_user_id = u.id
        LEFT JOIN states s_lr ON lr.state_id = s_lr.id
        LEFT JOIN states s_u ON u.state_id = s_u.id
        WHERE (LOWER(COALESCE(lr.state, s_lr.state_name, u.state, s_u.state_name)) = LOWER(?) OR lr.state_id = ? OR u.state_id = ?)
        GROUP BY rc.status
      `, [assignedState, assignedStateId, assignedStateId]);
      verificationStatusBreakdown = statusRes.rows || [];
    }

    // Estimated Tax Statistics for State (based on land records count)
    const taxStats = {
      totalEstimatedRevenue: landRecordsCount * 2500,
      totalCollected: approvedRecordsCount * 2500,
      pendingCollection: pendingApplicationsCount * 2500,
      currency: 'INR',
    };

    const kpis = {
      total_officers: userStats.officers,
      active_officers: userStats.active_officers,
      total_ministers: userStats.ministers,
      active_ministers: userStats.active_ministers,
      total_citizens: userStats.citizens,
      total_land_records: landRecordsCount,
      pending_applications: pendingApplicationsCount,
      ai_processed: aiProcessedCount,
      pending_verification: pendingVerificationCount,
      approved_records: approvedRecordsCount,
      rejected_records: rejectedApplicationsCount,
      tax_statistics: {
        total_estimated_revenue: taxStats.totalEstimatedRevenue,
        total_collected: taxStats.totalCollected,
        pending_collection: taxStats.pendingCollection,
        currency: 'INR',
      },
    };

    const data = {
      state: assignedState,
      state_id: assignedStateId,
      kpis,
      totalOfficers: userStats.officers,
      activeOfficers: userStats.active_officers,
      totalMinisters: userStats.ministers,
      activeMinisters: userStats.active_ministers,
      totalCitizens: userStats.citizens,
      totalLandRecords: landRecordsCount,
      pendingApplications: pendingApplicationsCount,
      aiProcessed: aiProcessedCount,
      pendingVerification: pendingVerificationCount,
      approvedRecords: approvedRecordsCount,
      rejectedRecords: rejectedApplicationsCount,
      taxStatistics: taxStats,
      charts: {
        applicationsByDistrict,
        applications_by_district: applicationsByDistrict,
        landRecordsByDistrict,
        land_records_by_district: landRecordsByDistrict,
        officerWorkload,
        officer_workload: officerWorkload,
        verificationStatusBreakdown,
        verification_status_breakdown: verificationStatusBreakdown,
      },
    };

    return res.status(200).json(successResponse(`State Admin dashboard retrieved for ${assignedState}.`, data));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 2. OFFICER MANAGEMENT (Strictly Own State)
// ==========================================
async function listOfficers(req, res, next) {
  try {
    const jurisdiction = getUserJurisdiction(req.user);
    const { search = '', status = '', district = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const { total, users } = await userRepository.listUsersByRole(
      ['OFFICER', 'GOVERNMENT_OFFICER'],
      {
        search,
        status,
        state: jurisdiction.state,
        state_id: jurisdiction.state_id,
        district,
        limit: Number(limit),
        offset,
      }
    );

    return res.status(200).json(successResponse('Officers retrieved successfully.', {
      officers: users,
      state: jurisdiction.state,
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
    const jurisdiction = getUserJurisdiction(req.user);
    const { name, username, password, email, district, department = 'Land Records & Revenue', state, state_id } = req.body || {};

    // Reject attempt to specify a different state by name or state_id
    const attemptedState = state || state_id;
    if (attemptedState) {
      const resolved = (await stateRepository.getStateById(attemptedState)) || (await stateRepository.getStateByName(attemptedState));
      const targetStateName = resolved ? resolved.state_name : attemptedState;
      if (String(targetStateName).trim().toLowerCase() !== String(jurisdiction.state).trim().toLowerCase()) {
        await auditRepository.logAuditEvent({
          eventType: 'UNAUTHORIZED_STATE_ACCESS_ATTEMPT',
          actorType: 'STATE_ADMIN',
          actorReference: req.user.id,
          metadata: {
            action: 'ATTEMPTED_CROSS_STATE_OFFICER_CREATION',
            attemptedState: targetStateName,
            assignedState: jurisdiction.state,
          },
        });
        throw createAppError(403, 'UNAUTHORIZED_STATE_ACCESS', `State Admin of ${jurisdiction.state} cannot create an officer in '${targetStateName}'.`);
      }
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Officer full name is required.');
    }
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Officer username is required.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Password must be at least 6 characters.');
    }
    if (!district || typeof district !== 'string' || district.trim().length === 0) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Officer district assignment is required.');
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

    const passwordHash = await hashPassword(password);

    // Derived strictly from authenticated State Admin
    const officer = await userRepository.create({
      name: name.trim(),
      username: cleanUsername,
      password_hash: passwordHash,
      email: email ? email.trim() : null,
      department: department ? department.trim() : 'Land Records & Revenue',
      state: jurisdiction.state,
      state_id: jurisdiction.state_id,
      district: district.trim(),
      status: 'ACTIVE',
      roles: ['OFFICER'],
    });

    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_CREATED',
      actorType: 'STATE_ADMIN',
      actorReference: req.user.id,
      metadata: {
        officerId: officer.id,
        officerUsername: cleanUsername,
        officerName: officer.name,
        state: jurisdiction.state,
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
    const officer = await userRepository.findById(id);
    if (!officer) {
      throw createAppError(404, 'NOT_FOUND', 'Officer account not found.');
    }
    const roles = Array.isArray(officer.roles) ? officer.roles : [officer.roles];
    if (!roles.some(r => ['OFFICER', 'GOVERNMENT_OFFICER'].includes(String(r).toUpperCase()))) {
      throw createAppError(404, 'NOT_FOUND', 'User is not an officer.');
    }

    // Enforce jurisdiction: State Admin can only view officers in own state
    await authorizeResourceJurisdiction(req.user, officer, { req });

    return res.status(200).json(successResponse('Officer retrieved successfully.', officer.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function updateOfficer(req, res, next) {
  try {
    const jurisdiction = getUserJurisdiction(req.user);
    const { id } = req.params;
    const { name, email, district, department, state } = req.body || {};

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw createAppError(404, 'NOT_FOUND', 'Officer account not found.');
    }

    // Must belong to this state
    await authorizeResourceJurisdiction(req.user, existing, { req });

    // State Admin CANNOT move an officer to another state
    if (state && String(state).trim().toLowerCase() !== String(jurisdiction.state).trim().toLowerCase()) {
      await auditRepository.logAuditEvent({
        eventType: 'UNAUTHORIZED_STATE_ACCESS_ATTEMPT',
        actorType: 'STATE_ADMIN',
        actorReference: req.user.id,
        metadata: {
          action: 'ATTEMPTED_CROSS_STATE_REASSIGNMENT',
          targetOfficerId: id,
          attemptedState: state,
        },
      });
      throw createAppError(403, 'FORBIDDEN', `State Admin cannot reassign an officer to another state ('${state}'). Cross-state reassignments require Super Admin authority.`);
    }

    if (email && email.trim() !== (existing.email || '').trim()) {
      const emailCollision = await userRepository.findByEmail(email.trim());
      if (emailCollision && emailCollision.id !== id) {
        throw createAppError(409, 'CONFLICT', 'Email is already in use by another account.');
      }
    }

    const districtChanged = district && district.trim() !== (existing.district || '').trim();

    const updated = await userRepository.updateUser(id, {
      name,
      email,
      district: district !== undefined ? district.trim() : existing.district,
      department,
    });

    if (districtChanged) {
      await auditRepository.logAuditEvent({
        eventType: 'OFFICER_JURISDICTION_CHANGED',
        actorType: 'STATE_ADMIN',
        actorReference: req.user.id,
        metadata: {
          officerId: id,
          state: jurisdiction.state,
          oldDistrict: existing.district,
          newDistrict: district.trim(),
        },
      });
    }

    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_UPDATED',
      actorType: 'STATE_ADMIN',
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

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw createAppError(404, 'NOT_FOUND', 'Officer account not found.');
    }
    await authorizeResourceJurisdiction(req.user, existing, { req });

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(String(status).toUpperCase())) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Status must be ACTIVE, INACTIVE, or SUSPENDED.');
    }

    const normalizedStatus = String(status).toUpperCase();
    const updated = await userRepository.updateStatus(id, normalizedStatus);

    const eventType = normalizedStatus === 'ACTIVE' ? 'OFFICER_ACTIVATED' : 'OFFICER_DEACTIVATED';
    await auditRepository.logAuditEvent({
      eventType,
      actorType: 'STATE_ADMIN',
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
    await authorizeResourceJurisdiction(req.user, existing, { req });

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(id, passwordHash);

    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_PASSWORD_RESET',
      actorType: 'STATE_ADMIN',
      actorReference: req.user.id,
      metadata: { officerId: id, officerUsername: existing.username },
    });

    return res.status(200).json(successResponse('Password reset successfully.', { userId: id }));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 3. MINISTER MANAGEMENT (Strictly Own State)
// ==========================================
async function listMinisters(req, res, next) {
  try {
    const jurisdiction = getUserJurisdiction(req.user);
    const { search = '', status = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const { total, users } = await userRepository.listUsersByRole(
      ['MINISTER'],
      {
        search,
        status,
        state: jurisdiction.state,
        state_id: jurisdiction.state_id,
        limit: Number(limit),
        offset,
      }
    );

    return res.status(200).json(successResponse('Ministers retrieved successfully.', {
      ministers: users,
      state: jurisdiction.state,
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
    const jurisdiction = getUserJurisdiction(req.user);
    const { name, username, password, email, department = 'Revenue & Land Records', state, state_id } = req.body || {};

    // Reject attempt to create in a different state by name or state_id
    const attemptedState = state || state_id;
    if (attemptedState) {
      const resolved = (await stateRepository.getStateById(attemptedState)) || (await stateRepository.getStateByName(attemptedState));
      const targetStateName = resolved ? resolved.state_name : attemptedState;
      if (String(targetStateName).trim().toLowerCase() !== String(jurisdiction.state).trim().toLowerCase()) {
        await auditRepository.logAuditEvent({
          eventType: 'UNAUTHORIZED_STATE_ACCESS_ATTEMPT',
          actorType: 'STATE_ADMIN',
          actorReference: req.user.id,
          metadata: {
            action: 'ATTEMPTED_CROSS_STATE_MINISTER_CREATION',
            attemptedState: targetStateName,
            assignedState: jurisdiction.state,
          },
        });
        throw createAppError(403, 'UNAUTHORIZED_STATE_ACCESS', `State Admin of ${jurisdiction.state} cannot create a minister in '${targetStateName}'.`);
      }
    }

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

    const passwordHash = await hashPassword(password);

    // Derived strictly from authenticated State Admin
    const minister = await userRepository.create({
      name: name.trim(),
      username: cleanUsername,
      password_hash: passwordHash,
      email: email ? email.trim() : null,
      department: department ? department.trim() : 'Revenue & Land Records',
      state: jurisdiction.state,
      state_id: jurisdiction.state_id,
      status: 'ACTIVE',
      roles: ['MINISTER'],
    });

    await auditRepository.logAuditEvent({
      eventType: 'MINISTER_CREATED',
      actorType: 'STATE_ADMIN',
      actorReference: req.user.id,
      metadata: {
        ministerId: minister.id,
        ministerUsername: cleanUsername,
        ministerName: minister.name,
        state: jurisdiction.state,
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
    const minister = await userRepository.findById(id);
    if (!minister) {
      throw createAppError(404, 'NOT_FOUND', 'Minister account not found.');
    }
    const roles = Array.isArray(minister.roles) ? minister.roles : [minister.roles];
    if (!roles.some(r => ['MINISTER'].includes(String(r).toUpperCase()))) {
      throw createAppError(404, 'NOT_FOUND', 'User is not a minister.');
    }

    await authorizeResourceJurisdiction(req.user, minister, { req });

    return res.status(200).json(successResponse('Minister retrieved successfully.', minister.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

async function updateMinister(req, res, next) {
  try {
    const jurisdiction = getUserJurisdiction(req.user);
    const { id } = req.params;
    const { name, email, department, state } = req.body || {};

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw createAppError(404, 'NOT_FOUND', 'Minister account not found.');
    }
    await authorizeResourceJurisdiction(req.user, existing, { req });

    if (state && String(state).trim().toLowerCase() !== String(jurisdiction.state).trim().toLowerCase()) {
      await auditRepository.logAuditEvent({
        eventType: 'UNAUTHORIZED_STATE_ACCESS_ATTEMPT',
        actorType: 'STATE_ADMIN',
        actorReference: req.user.id,
        metadata: {
          action: 'ATTEMPTED_CROSS_STATE_MINISTER_REASSIGNMENT',
          targetMinisterId: id,
          attemptedState: state,
        },
      });
      throw createAppError(403, 'FORBIDDEN', `State Admin cannot reassign a minister to another state ('${state}'). Cross-state reassignments require Super Admin authority.`);
    }

    if (email && email.trim() !== (existing.email || '').trim()) {
      const emailCollision = await userRepository.findByEmail(email.trim());
      if (emailCollision && emailCollision.id !== id) {
        throw createAppError(409, 'CONFLICT', 'Email is already in use by another account.');
      }
    }

    const updated = await userRepository.updateUser(id, {
      name,
      email,
      department,
    });

    await auditRepository.logAuditEvent({
      eventType: 'MINISTER_UPDATED',
      actorType: 'STATE_ADMIN',
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

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw createAppError(404, 'NOT_FOUND', 'Minister account not found.');
    }
    await authorizeResourceJurisdiction(req.user, existing, { req });

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(String(status).toUpperCase())) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Status must be ACTIVE, INACTIVE, or SUSPENDED.');
    }

    const normalizedStatus = String(status).toUpperCase();
    const updated = await userRepository.updateStatus(id, normalizedStatus);

    const eventType = normalizedStatus === 'ACTIVE' ? 'MINISTER_ACTIVATED' : 'MINISTER_DEACTIVATED';
    await auditRepository.logAuditEvent({
      eventType,
      actorType: 'STATE_ADMIN',
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
    await authorizeResourceJurisdiction(req.user, existing, { req });

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(id, passwordHash);

    await auditRepository.logAuditEvent({
      eventType: 'MINISTER_PASSWORD_RESET',
      actorType: 'STATE_ADMIN',
      actorReference: req.user.id,
      metadata: { ministerId: id, ministerUsername: existing.username },
    });

    return res.status(200).json(successResponse('Password reset successfully.', { userId: id }));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 4. CITIZENS IN STATE
// ==========================================
async function listCitizens(req, res, next) {
  try {
    const jurisdiction = getUserJurisdiction(req.user);
    const { search = '', status = '', district = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const { total, users } = await userRepository.listUsersByRole(
      ['CITIZEN'],
      {
        search,
        status,
        state: jurisdiction.state,
        state_id: jurisdiction.state_id,
        district,
        limit: Number(limit),
        offset,
      }
    );

    return res.status(200).json(successResponse('Citizens retrieved successfully.', {
      citizens: users,
      state: jurisdiction.state,
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
    const citizen = await userRepository.findById(id);
    if (!citizen) {
      throw createAppError(404, 'NOT_FOUND', 'Citizen account not found.');
    }
    await authorizeResourceJurisdiction(req.user, citizen, { req });

    return res.status(200).json(successResponse('Citizen retrieved successfully.', citizen.toPublicJSON()));
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 5. LAND RECORDS & APPLICATIONS IN STATE
// ==========================================
async function listLandRecords(req, res, next) {
  try {
    const jurisdiction = getUserJurisdiction(req.user);
    const { search = '', district = '', status = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const conditions = ['(LOWER(lr.state) = LOWER(?) OR lr.state_id = ?)'];
    const params = [jurisdiction.state, jurisdiction.state_id];

    if (search) {
      conditions.push('(LOWER(lr.owner_name) LIKE ? OR LOWER(lr.survey_number) LIKE ? OR LOWER(lr.village) LIKE ? OR LOWER(lr.district) LIKE ?)');
      const pattern = `%${search.toLowerCase()}%`;
      params.push(pattern, pattern, pattern, pattern);
    }
    if (district) {
      conditions.push('LOWER(lr.district) = LOWER(?)');
      params.push(district);
    }
    if (status) {
      conditions.push('lr.status = ?');
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    let total = 0;
    let records = [];

    if (pool) {
      const countRes = await pool.query(`SELECT COUNT(*) as total FROM land_records lr WHERE ${whereClause}`, params);
      total = Number(countRes.rows[0]?.total || 0);

      const dataRes = await pool.query(`
        SELECT lr.id, lr.record_reference, lr.owner_name, lr.survey_number, lr.area_value, lr.area_unit,
               lr.village, lr.taluk, lr.district, lr.state, lr.classification, lr.record_date,
               lr.is_duplicate, lr.duplicate_reason, lr.ai_status, lr.status, lr.verification_status,
               lr.created_at, lr.updated_at
        FROM land_records lr
        WHERE ${whereClause}
        ORDER BY lr.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, Number(limit), Number(offset)]);
      records = dataRes.rows || [];
    }

    return res.status(200).json(successResponse('Land records retrieved successfully.', {
      records,
      state: jurisdiction.state,
      total,
      page: Number(page),
      limit: Number(limit),
    }));
  } catch (error) {
    return next(error);
  }
}

async function getLandRecord(req, res, next) {
  try {
    const { id } = req.params;
    const record = await landRecordRepository.findById(id);
    if (!record) {
      throw createAppError(404, 'NOT_FOUND', 'Land record not found.');
    }
    await authorizeResourceJurisdiction(req.user, record, { req });

    return res.status(200).json(successResponse('Land record retrieved successfully.', record));
  } catch (error) {
    return next(error);
  }
}

async function listApplications(req, res, next) {
  try {
    const jurisdiction = getUserJurisdiction(req.user);
    const { status, priority, district, limit = 50, offset = 0 } = req.query;

    const cases = await reviewRepository.findAll({
      status,
      priority,
      state: jurisdiction.state,
      district,
      limit: Number(limit),
      offset: Number(offset),
    });

    return res.status(200).json(successResponse('Applications retrieved successfully.', {
      applications: cases,
      state: jurisdiction.state,
      total: cases.length,
    }));
  } catch (error) {
    return next(error);
  }
}

async function getApplication(req, res, next) {
  try {
    const { id } = req.params;
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'NOT_FOUND', 'Application not found.');
    }
    await authorizeResourceJurisdiction(req.user, reviewCase, { req });

    return res.status(200).json(successResponse('Application details retrieved successfully.', reviewCase));
  } catch (error) {
    return next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const jurisdiction = getUserJurisdiction(req.user);
    const assignedState = jurisdiction.state;

    let reports = {
      state: assignedState,
      generatedAt: new Date().toISOString(),
      officerPerformance: [],
      districtSummary: [],
    };

    if (pool) {
      const perfRes = await pool.query(`
        SELECT 
          u.name as officer_name,
          u.district,
          COUNT(rc.case_id) as total_assigned,
          SUM(rc.status IN ('APPROVED', 'GOVERNMENT_APPROVED', 'OFFICER VERIFIED')) as approved_count,
          SUM(rc.status = 'REJECTED') as rejected_count,
          SUM(rc.status NOT IN ('APPROVED', 'GOVERNMENT_APPROVED', 'OFFICER VERIFIED', 'REJECTED')) as pending_count
        FROM users u
        LEFT JOIN review_cases rc ON u.id = rc.assigned_officer_id
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE (LOWER(u.state) = LOWER(?) OR u.state_id = ?)
          AND r.role_name IN ('OFFICER', 'GOVERNMENT_OFFICER')
        GROUP BY u.id, u.name, u.district
        ORDER BY total_assigned DESC
      `, [assignedState, jurisdiction.state_id]);
      reports.officerPerformance = perfRes.rows || [];

      const distRes = await pool.query(`
        SELECT 
          COALESCE(lr.district, 'Unassigned') as district,
          COUNT(DISTINCT lr.id) as total_records,
          COUNT(DISTINCT rc.case_id) as total_applications,
          SUM(rc.status IN ('APPROVED', 'GOVERNMENT_APPROVED', 'OFFICER VERIFIED')) as approved_applications
        FROM land_records lr
        LEFT JOIN review_cases rc ON lr.id = rc.land_record_id
        WHERE (LOWER(lr.state) = LOWER(?) OR lr.state_id = ?)
        GROUP BY COALESCE(lr.district, 'Unassigned')
        ORDER BY total_records DESC
      `, [assignedState, jurisdiction.state_id]);
      reports.districtSummary = distRes.rows || [];
    }

    return res.status(200).json(successResponse(`State reports retrieved for ${assignedState}.`, reports));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard,
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
  listLandRecords,
  getLandRecord,
  listApplications,
  getApplication,
  getReports,
};
