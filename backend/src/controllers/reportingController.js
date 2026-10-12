const { successResponse, errorResponse } = require('../utils/response');
const { reportingRepository } = require('../repositories/reportingRepository');
const { auditRepository } = require('../repositories/auditRepository');

/**
 * GET /api/admin/reports/overview
 */
async function getReportsOverview(req, res, next) {
  try {
    const analytics = await reportingRepository.getDashboardAnalytics();

    await auditRepository.logAuditEvent({
      eventType: 'REPORT_VIEWED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { reportName: 'Reports Overview & Analytics' },
    });

    return res.status(200).json(
      successResponse('Reports overview retrieved successfully.', {
        ...analytics,
        availableReports: [
          { id: 'officer-performance', name: 'Officer Performance Report', description: 'Workload, approvals, rejections, and accuracy metrics by officer' },
          { id: 'minister-activity', name: 'Minister Activity Report', description: 'Governance actions, logins, and monitored reports by minister' },
          { id: 'land-records', name: 'Land Record Processing Report', description: 'Volumes, classifications, duplicates, and verification statuses' },
          { id: 'verification', name: 'Verification & Adjudication Report', description: 'Officer reviews, decisions, and approval ratios' },
          { id: 'ai-processing', name: 'AI Processing & Telemetry Report', description: 'OCR accuracy, extraction confidence, and document validation' },
          { id: 'application-status', name: 'Application Status Distribution Report', description: 'Complete state breakdown across all application workflow statuses' },
          { id: 'state-wise', name: 'State-wise Operational Report', description: 'State-level aggregation of records, applications, and decisions' },
          { id: 'district-wise', name: 'District-wise Operational Report', description: 'District breakdown of records and officer allocations' },
          { id: 'audit-activity', name: 'System Audit & Governance Report', description: 'Immutable audit trail of all administrative and citizen actions' },
        ],
      })
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/reports/officers
 */
async function getOfficerReports(req, res, next) {
  try {
    const filters = req.query || {};
    const report = await reportingRepository.getOfficerPerformanceReport(filters);

    await auditRepository.logAuditEvent({
      eventType: 'REPORT_GENERATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { reportType: 'OFFICER_PERFORMANCE', filters },
    });

    return res.status(200).json(successResponse('Officer performance report generated.', report));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/reports/ministers
 */
async function getMinisterReports(req, res, next) {
  try {
    const filters = req.query || {};
    const report = await reportingRepository.getMinisterActivityReport(filters);

    await auditRepository.logAuditEvent({
      eventType: 'REPORT_GENERATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { reportType: 'MINISTER_ACTIVITY', filters },
    });

    return res.status(200).json(successResponse('Minister activity report generated.', report));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/reports/land-records
 */
async function getLandRecordReports(req, res, next) {
  try {
    const filters = req.query || {};
    const report = await reportingRepository.getLandRecordProcessingReport(filters);

    await auditRepository.logAuditEvent({
      eventType: 'REPORT_GENERATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { reportType: 'LAND_RECORDS', filters },
    });

    return res.status(200).json(successResponse('Land record processing report generated.', report));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/reports/verification
 */
async function getVerificationReports(req, res, next) {
  try {
    const filters = req.query || {};
    const report = await reportingRepository.getVerificationReport(filters);

    await auditRepository.logAuditEvent({
      eventType: 'REPORT_GENERATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { reportType: 'VERIFICATION', filters },
    });

    return res.status(200).json(successResponse('Verification report generated.', report));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/reports/ai-processing
 */
async function getAiProcessingReports(req, res, next) {
  try {
    const filters = req.query || {};
    const report = await reportingRepository.getAiProcessingReport(filters);

    await auditRepository.logAuditEvent({
      eventType: 'REPORT_GENERATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { reportType: 'AI_PROCESSING', filters },
    });

    return res.status(200).json(successResponse('AI processing report generated.', report));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/reports/activity
 */
async function getActivityReports(req, res, next) {
  try {
    const filters = req.query || {};
    const report = await reportingRepository.getAuditActivityReport(filters);

    await auditRepository.logAuditEvent({
      eventType: 'REPORT_GENERATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { reportType: 'AUDIT_ACTIVITY', filters },
    });

    return res.status(200).json(successResponse('Audit activity report generated.', report));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/reports/query?category=...
 */
async function getCustomReport(req, res, next) {
  try {
    const { category = 'officer-performance', ...filters } = req.query || {};

    let report;
    switch (category) {
      case 'officer-performance':
      case 'officers':
        report = await reportingRepository.getOfficerPerformanceReport(filters);
        break;
      case 'minister-activity':
      case 'ministers':
        report = await reportingRepository.getMinisterActivityReport(filters);
        break;
      case 'land-records':
        report = await reportingRepository.getLandRecordProcessingReport(filters);
        break;
      case 'verification':
        report = await reportingRepository.getVerificationReport(filters);
        break;
      case 'ai-processing':
        report = await reportingRepository.getAiProcessingReport(filters);
        break;
      case 'application-status':
        report = await reportingRepository.getApplicationStatusReport(filters);
        break;
      case 'state-wise':
        report = await reportingRepository.getStateWiseReport(filters);
        break;
      case 'district-wise':
        report = await reportingRepository.getDistrictWiseReport(filters);
        break;
      case 'audit-activity':
      case 'activity':
        report = await reportingRepository.getAuditActivityReport(filters);
        break;
      default:
        report = await reportingRepository.getOfficerPerformanceReport(filters);
        break;
    }

    await auditRepository.logAuditEvent({
      eventType: 'REPORT_GENERATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { category, filters },
    });

    return res.status(200).json(successResponse(`Report '${category}' generated successfully.`, report));
  } catch (error) {
    return next(error);
  }
}

async function getApplicationStatusReports(req, res, next) {
  try {
    const filters = req.query || {};
    const report = await reportingRepository.getApplicationStatusReport(filters);
    await auditRepository.logAuditEvent({
      eventType: 'REPORT_GENERATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { reportType: 'APPLICATION_STATUS', filters },
    });
    return res.status(200).json(successResponse('Application status report generated.', report));
  } catch (error) {
    return next(error);
  }
}

async function getStateWiseReports(req, res, next) {
  try {
    const filters = req.query || {};
    const report = await reportingRepository.getStateWiseReport(filters);
    await auditRepository.logAuditEvent({
      eventType: 'REPORT_GENERATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { reportType: 'STATE_WISE', filters },
    });
    return res.status(200).json(successResponse('State-wise report generated.', report));
  } catch (error) {
    return next(error);
  }
}

async function getDistrictWiseReports(req, res, next) {
  try {
    const filters = req.query || {};
    const report = await reportingRepository.getDistrictWiseReport(filters);
    await auditRepository.logAuditEvent({
      eventType: 'REPORT_GENERATED',
      actorType: 'SUPER_ADMIN',
      actorReference: req.user.id,
      metadata: { reportType: 'DISTRICT_WISE', filters },
    });
    return res.status(200).json(successResponse('District-wise report generated.', report));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getReportsOverview,
  getOfficerReports,
  getMinisterReports,
  getLandRecordReports,
  getVerificationReports,
  getAiProcessingReports,
  getApplicationStatusReports,
  getStateWiseReports,
  getDistrictWiseReports,
  getActivityReports,
  getCustomReport,
};
