const { successResponse, errorResponse } = require('../utils/response');
const { workMonitoringRepository } = require('../repositories/workMonitoringRepository');
const { auditRepository } = require('../repositories/auditRepository');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * GET /api/admin/work/officers
 */
async function listOfficersWork(req, res, next) {
  try {
    const {
      search = '',
      state = '',
      district = '',
      department = '',
      status = '',
      sortBy = 'workload',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
    } = req.query || {};

    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const result = await workMonitoringRepository.listOfficersWork({
      search,
      state,
      district,
      department,
      status,
      sortBy,
      sortOrder,
      limit: Number(limit),
      offset,
    });

    if (search || state || district || status) {
      await auditRepository.logAuditEvent({
        eventType: 'OPERATIONAL_DATA_FILTERED',
        actorType: 'SUPER_ADMIN',
        actorReference: req.user.id,
        metadata: {
          target: 'OFFICER_WORK_LIST',
          filters: { search, state, district, status },
        },
      });
    }

    return res.status(200).json(
      successResponse('Officer work list retrieved successfully.', {
        total: result.total,
        officers: result.officers,
        page: Number(page),
        limit: Number(limit),
      })
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/work/officers/:officerId
 */
async function getOfficerWorkProfile(req, res, next) {
  try {
    const { officerId } = req.params;
    if (!officerId) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Officer ID is required.');
    }

    const profile = await workMonitoringRepository.getOfficerWorkProfile(officerId);
    if (!profile) {
      throw createAppError(404, 'NOT_FOUND', `Officer '${officerId}' not found.`);
    }

    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_WORK_VIEWED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: {
        officerId: profile.profile.id,
        officerUsername: profile.profile.username,
        officerName: profile.profile.name,
      },
    });

    return res.status(200).json(
      successResponse('Officer work profile retrieved successfully.', profile)
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/work/ministers
 */
async function listMinistersWork(req, res, next) {
  try {
    const {
      search = '',
      state = '',
      department = '',
      status = '',
      sortBy = 'activity',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
    } = req.query || {};

    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const result = await workMonitoringRepository.listMinistersWork({
      search,
      state,
      department,
      status,
      sortBy,
      sortOrder,
      limit: Number(limit),
      offset,
    });

    if (search || state || department || status) {
      await auditRepository.logAuditEvent({
        eventType: 'OPERATIONAL_DATA_FILTERED',
        actorType: 'SUPER_ADMIN',
        actorReference: req.user.id,
        metadata: {
          target: 'MINISTER_WORK_LIST',
          filters: { search, state, department, status },
        },
      });
    }

    return res.status(200).json(
      successResponse('Minister work list retrieved successfully.', {
        total: result.total,
        ministers: result.ministers,
        page: Number(page),
        limit: Number(limit),
      })
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/work/ministers/:ministerId
 */
async function getMinisterWorkProfile(req, res, next) {
  try {
    const { ministerId } = req.params;
    if (!ministerId) {
      throw createAppError(400, 'VALIDATION_FAILED', 'Minister ID is required.');
    }

    const profile = await workMonitoringRepository.getMinisterWorkProfile(ministerId);
    if (!profile) {
      throw createAppError(404, 'NOT_FOUND', `Minister '${ministerId}' not found.`);
    }

    await auditRepository.logAuditEvent({
      eventType: 'MINISTER_WORK_VIEWED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: {
        ministerId: profile.profile.id,
        ministerUsername: profile.profile.username,
        ministerName: profile.profile.name,
      },
    });

    return res.status(200).json(
      successResponse('Minister work profile retrieved successfully.', profile)
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listOfficersWork,
  getOfficerWorkProfile,
  listMinistersWork,
  getMinisterWorkProfile,
};
