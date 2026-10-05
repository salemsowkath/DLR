const { successResponse } = require('../utils/response');
const { auditRepository } = require('../repositories/auditRepository');
const { userRepository } = require('../repositories/userRepository');
const { documentRepository } = require('../repositories/documentRepository');
const { getReviewStats } = require('./reviewController');

async function getDashboard(req, res, next) {
  try {
    const userStats = await userRepository.getStats();
    const docStats = await documentRepository.getStats();
    const reviewStats = getReviewStats();

    const stats = {
      system_status: 'HEALTHY',
      roles_active: ['CITIZEN', 'OFFICER', 'MINISTER', 'ADMIN'],
      total_users: userStats.total_users,
      citizens: userStats.citizens,
      officers: userStats.officers,
      ministers: userStats.ministers,
      admins: userStats.admins,
      total_documents_processed: docStats.processed_documents,
      total_documents: docStats.total_documents,
      pending_review_cases: reviewStats.pending_reviews,
      approved_cases: reviewStats.approved_reviews,
      rejected_cases: reviewStats.rejected_reviews,
      ai_pipeline_health: 'OPERATIONAL',
      gis_service_health: 'OPERATIONAL',
      uptime_seconds: Math.floor(process.uptime()),
    };

    await auditRepository.logAuditEvent({
      eventType: 'ADMIN_DASHBOARD_VIEWED',
      actorType: req.user?.primary_role || 'ADMIN',
      actorReference: req.user?.id || 'UNKNOWN',
      metadata: { role: req.user?.primary_role || 'ADMIN' },
    });

    return res.status(200).json(successResponse('Admin dashboard stats retrieved successfully.', stats));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard,
};
