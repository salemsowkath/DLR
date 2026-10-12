const { auditRepository } = require('../repositories/auditRepository');
const { stateRepository } = require('../repositories/stateRepository');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * Normalizes user role to primary recognized hierarchy role:
 * SUPER_ADMIN > STATE_ADMIN > MINISTER > OFFICER > CITIZEN
 */
function getPrimaryRole(user) {
  if (!user) return 'ANONYMOUS';
  const roles = Array.isArray(user.roles) ? user.roles.map(r => String(r).toUpperCase()) : [String(user.roles || user.primary_role || 'CITIZEN').toUpperCase()];
  if (roles.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
  if (roles.includes('STATE_ADMIN')) return 'STATE_ADMIN';
  if (roles.includes('MINISTER') || roles.includes('ADMIN')) return 'MINISTER';
  if (roles.includes('OFFICER') || roles.includes('GOVERNMENT_OFFICER')) return 'OFFICER';
  if (roles.includes('CITIZEN')) return 'CITIZEN';
  return roles[0] || 'CITIZEN';
}

/**
 * Resolves full user jurisdiction details from the server-side user entity.
 * NEVER trusts client-provided jurisdiction values.
 */
function getUserJurisdiction(user) {
  if (!user) {
    return {
      role: 'ANONYMOUS',
      state: null,
      state_id: null,
      district: null,
      isNationwide: false,
    };
  }

  const role = getPrimaryRole(user);
  const isNationwide = role === 'SUPER_ADMIN';

  // Resolve state and state_id
  let state = user.state || null;
  let stateId = user.state_id || null;

  if (stateId && !state) {
    const sObj = stateRepository.getStateByIdSync(stateId);
    if (sObj) state = sObj.state_name;
  } else if (state && !stateId) {
    const sObj = stateRepository.getStateByNameSync(state);
    if (sObj) stateId = sObj.id;
  }

  return {
    role,
    state,
    state_id: stateId,
    district: user.district || null,
    isNationwide,
  };
}

/**
 * Authorizes access to a specific state.
 * SUPER_ADMIN: Allowed nationwide.
 * STATE_ADMIN, MINISTER, OFFICER: Must match assigned state (by name or ID).
 * Throws 403 and writes UNAUTHORIZED_STATE_ACCESS_ATTEMPT audit event if unauthorized.
 */
async function authorizeStateScope(user, targetStateOrStateId, { actorReference = null, req = null } = {}) {
  const jurisdiction = getUserJurisdiction(user);
  if (jurisdiction.isNationwide) return true;

  if (!targetStateOrStateId) return true;

  const targetNorm = String(targetStateOrStateId).trim().toLowerCase();
  const userStateNorm = jurisdiction.state ? String(jurisdiction.state).trim().toLowerCase() : null;
  const userStateIdNorm = jurisdiction.state_id ? String(jurisdiction.state_id).trim().toLowerCase() : null;

  // Resolve target to name and ID for comprehensive matching
  let targetNameNorm = targetNorm;
  let targetIdNorm = targetNorm;

  const resolvedTarget = (await stateRepository.getStateById(targetStateOrStateId)) || (await stateRepository.getStateByName(targetStateOrStateId));
  if (resolvedTarget) {
    targetNameNorm = resolvedTarget.state_name.toLowerCase();
    targetIdNorm = resolvedTarget.id.toLowerCase();
  }

  const matchesState = (userStateNorm && targetNameNorm === userStateNorm) ||
                       (userStateIdNorm && targetIdNorm === userStateIdNorm);

  if (!matchesState) {
    const auditMeta = {
      userRole: jurisdiction.role,
      userState: jurisdiction.state,
      userStateId: jurisdiction.state_id,
      attemptedState: targetStateOrStateId,
      path: req?.originalUrl || req?.url || 'N/A',
      method: req?.method || 'N/A',
    };

    await auditRepository.logAuditEvent({
      eventType: 'UNAUTHORIZED_STATE_ACCESS_ATTEMPT',
      actorType: jurisdiction.role,
      actorReference: actorReference || user?.id || 'UNKNOWN',
      metadata: auditMeta,
    });

    throw createAppError(
      403,
      'UNAUTHORIZED_STATE_ACCESS',
      `Access denied. You do not have jurisdiction in '${targetStateOrStateId}'. Assigned state: '${jurisdiction.state || 'None'}'.`
    );
  }

  return true;
}

/**
 * Authorizes access to a specific district.
 * SUPER_ADMIN, STATE_ADMIN, MINISTER: Allowed across all districts in authorized state.
 * OFFICER: Must match assigned district.
 * Throws 403 and writes UNAUTHORIZED_DISTRICT_ACCESS_ATTEMPT audit event if unauthorized.
 */
async function authorizeDistrictScope(user, targetDistrict, { actorReference = null, req = null } = {}) {
  const jurisdiction = getUserJurisdiction(user);
  if (['SUPER_ADMIN', 'STATE_ADMIN', 'MINISTER'].includes(jurisdiction.role)) {
    return true;
  }

  if (!targetDistrict) return true;

  const targetDistNorm = String(targetDistrict).trim().toLowerCase();
  const officerDistNorm = jurisdiction.district ? String(jurisdiction.district).trim().toLowerCase() : null;

  if (officerDistNorm !== targetDistNorm) {
    const auditMeta = {
      userRole: jurisdiction.role,
      officerDistrict: jurisdiction.district,
      attemptedDistrict: targetDistrict,
      path: req?.originalUrl || req?.url || 'N/A',
      method: req?.method || 'N/A',
    };

    await auditRepository.logAuditEvent({
      eventType: 'UNAUTHORIZED_DISTRICT_ACCESS_ATTEMPT',
      actorType: jurisdiction.role,
      actorReference: actorReference || user?.id || 'UNKNOWN',
      metadata: auditMeta,
    });

    throw createAppError(
      403,
      'UNAUTHORIZED_DISTRICT_ACCESS',
      `Access denied. You do not have jurisdiction in district '${targetDistrict}'. Assigned district: '${jurisdiction.district || 'None'}'.`
    );
  }

  return true;
}

/**
 * Validates a resource (application, review_case, land_record, user) against the authenticated user's jurisdiction.
 * Prevents IDOR on individual resource endpoints.
 */
async function authorizeResourceJurisdiction(user, resource, { req = null } = {}) {
  if (!resource) return true;
  const jurisdiction = getUserJurisdiction(user);
  if (jurisdiction.isNationwide) return true;

  // Extract resource geographic location
  const resourceState = resource.state ||
                        resource.state_name ||
                        resource.state_id ||
                        resource.land_record?.state ||
                        resource.land_record?.state_id ||
                        resource.citizen_submitted_data?.state ||
                        resource.citizen?.state ||
                        'Tamil Nadu';

  const resourceDistrict = resource.district ||
                           resource.district_name ||
                           resource.land_record?.district ||
                           resource.citizen_submitted_data?.district ||
                           resource.citizen?.district ||
                           null;

  // 1. Authorize state scope
  await authorizeStateScope(user, resourceState, { actorReference: user.id, req });

  // 2. Authorize district scope for Officers
  if (jurisdiction.role === 'OFFICER' && resourceDistrict) {
    await authorizeDistrictScope(user, resourceDistrict, { actorReference: user.id, req });
  }

  return true;
}

/**
 * Express middleware to automatically intercept and enforce jurisdiction on query parameters.
 * Blocks any attempt by clients to bypass scope with query params like `?state=Kerala` or `?district=Chennai`.
 */
async function enforceJurisdictionQueryScope(req, res, next) {
  try {
    if (!req.user) return next();

    const jurisdiction = getUserJurisdiction(req.user);
    req.jurisdiction = jurisdiction;

    if (jurisdiction.isNationwide) {
      // Super Admin can filter by any state/district if requested
      return next();
    }

    // STATE_ADMIN, MINISTER, OFFICER: check attempted state in query
    const requestedState = req.query?.state || req.query?.state_id;
    if (requestedState) {
      const targetNorm = String(requestedState).trim().toLowerCase();
      const userStateNorm = jurisdiction.state ? String(jurisdiction.state).trim().toLowerCase() : '';
      const userStateIdNorm = jurisdiction.state_id ? String(jurisdiction.state_id).trim().toLowerCase() : '';

      const resolved = (await stateRepository.getStateById(requestedState)) || (await stateRepository.getStateByName(requestedState));
      const targetName = resolved ? resolved.state_name.toLowerCase() : targetNorm;
      const targetId = resolved ? resolved.id.toLowerCase() : targetNorm;

      if (targetName !== userStateNorm && targetId !== userStateIdNorm) {
        await auditRepository.logAuditEvent({
          eventType: 'UNAUTHORIZED_STATE_ACCESS_ATTEMPT',
          actorType: jurisdiction.role,
          actorReference: req.user.id,
          metadata: {
            reason: 'Query parameter attempted state override',
            attemptedState: requestedState,
            assignedState: jurisdiction.state,
            path: req.originalUrl,
          },
        });
        throw createAppError(
          403,
          'UNAUTHORIZED_STATE_ACCESS',
          `Access denied. You cannot query data for state '${requestedState}'. Your jurisdiction is '${jurisdiction.state}'.`
        );
      }
    }

    // Bind state strictly to user's assigned jurisdiction
    req.query.state = jurisdiction.state;
    if (jurisdiction.state_id) {
      req.query.state_id = jurisdiction.state_id;
    }

    // OFFICER: check attempted district in query
    if (jurisdiction.role === 'OFFICER') {
      const requestedDistrict = req.query?.district;
      if (requestedDistrict) {
        if (String(requestedDistrict).trim().toLowerCase() !== String(jurisdiction.district || '').trim().toLowerCase()) {
          await auditRepository.logAuditEvent({
            eventType: 'UNAUTHORIZED_DISTRICT_ACCESS_ATTEMPT',
            actorType: 'OFFICER',
            actorReference: req.user.id,
            metadata: {
              reason: 'Query parameter attempted district override',
              attemptedDistrict: requestedDistrict,
              assignedDistrict: jurisdiction.district,
              path: req.originalUrl,
            },
          });
          throw createAppError(
            403,
            'UNAUTHORIZED_DISTRICT_ACCESS',
            `Access denied. You cannot query data for district '${requestedDistrict}'. Your jurisdiction is '${jurisdiction.district}'.`
          );
        }
      }
      req.query.district = jurisdiction.district;
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Validates cross-state reassignment permission.
 * Only SUPER_ADMIN can reassign an officer or minister to a different state.
 */
function assertReassignmentPermission(actor, targetRole, existingState, newState) {
  if (!existingState || !newState) return;
  if (String(existingState).trim().toLowerCase() === String(newState).trim().toLowerCase()) return;

  const actorJurisdiction = getUserJurisdiction(actor);
  if (!actorJurisdiction.isNationwide) {
    throw createAppError(
      403,
      'FORBIDDEN_REASSIGNMENT',
      `Only Super Admin can reassign a ${targetRole} to another state ('${existingState}' -> '${newState}').`
    );
  }
}

module.exports = {
  getPrimaryRole,
  getUserJurisdiction,
  authorizeStateScope,
  authorizeDistrictScope,
  authorizeResourceJurisdiction,
  enforceJurisdictionQueryScope,
  assertReassignmentPermission,
};
