const { auditRepository } = require('../repositories/auditRepository');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

const ROLE_ALIASES = {
  OFFICER: ['OFFICER', 'GOVERNMENT_OFFICER'],
  GOVERNMENT_OFFICER: ['OFFICER', 'GOVERNMENT_OFFICER'],
  MINISTER: ['MINISTER', 'ADMIN'],
  ADMIN: ['MINISTER', 'ADMIN'],
  CITIZEN: ['CITIZEN'],
};

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw createAppError(401, 'MISSING_TOKEN', 'Authentication token is required.');
      }

      const userRoles = Array.isArray(req.user.roles)
        ? req.user.roles
        : [req.user.roles || req.user.primary_role || 'CITIZEN'];

      const expandedAllowed = new Set();
      for (const role of allowedRoles) {
        expandedAllowed.add(role.toUpperCase());
        const aliases = ROLE_ALIASES[role.toUpperCase()] || [];
        for (const alias of aliases) {
          expandedAllowed.add(alias);
        }
      }

      const hasAccess = userRoles.some((uRole) => expandedAllowed.has(uRole.toUpperCase()));

      if (!hasAccess) {
        await auditRepository.logAuditEvent({
          eventType: 'ACCESS_DENIED',
          actorType: userRoles[0] || 'USER',
          actorReference: req.user.id || req.user.external_reference || 'UNKNOWN',
          metadata: {
            path: req.originalUrl,
            method: req.method,
            userRoles,
            requiredRoles: allowedRoles,
          },
        });

        throw createAppError(403, 'FORBIDDEN', 'Access denied. Insufficient permissions for this operation.');
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  requireRole,
};
