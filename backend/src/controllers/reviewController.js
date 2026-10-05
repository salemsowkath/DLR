const { successResponse } = require('../utils/response');
const { auditRepository } = require('../repositories/auditRepository');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

// In-memory case repository for review API operations
const mockCases = new Map([
  [
    'CASE-TEST-001',
    {
      case_id: 'CASE-TEST-001',
      document_id: 'DOC-20261005-DEMO001',
      status: 'PENDING_REVIEW',
      priority: 'HIGH',
      validation_score: 72,
      review_required: true,
      case_data: { owner_name: 'TEST_OWNER_NAME', survey_number: '125/3A' },
      anomalies: [
        {
          anomaly_id: 'ANOM-001',
          type: 'FIELD_CONFIDENCE',
          field: 'area',
          severity: 'WARNING',
          status: 'OPEN',
          message: 'Area field confidence is low.',
        },
      ],
      notes: [],
      corrections: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
]);

async function getReviewCases(req, res, next) {
  try {
    const casesList = Array.from(mockCases.values());
    return res.status(200).json(successResponse('Review cases retrieved.', { cases: casesList }));
  } catch (error) {
    return next(error);
  }
}

async function getReviewCaseById(req, res, next) {
  try {
    const { id } = req.params;
    const reviewCase = mockCases.get(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }
    return res.status(200).json(successResponse('Review case details retrieved.', reviewCase));
  } catch (error) {
    return next(error);
  }
}

async function approveCase(req, res, next) {
  try {
    const { id } = req.params;
    const reviewCase = mockCases.get(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }

    reviewCase.status = 'APPROVED';
    reviewCase.updated_at = new Date().toISOString();

    await auditRepository.logAuditEvent({
      eventType: 'CASE_APPROVED',
      actorType: req.user.primary_role || 'OFFICER',
      actorReference: req.user.id,
      caseId: id,
      metadata: { action: 'approve', officer_id: req.user.id },
    });

    return res.status(200).json(successResponse('Review case approved successfully.', reviewCase));
  } catch (error) {
    return next(error);
  }
}

async function rejectCase(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const reviewCase = mockCases.get(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }

    reviewCase.status = 'REJECTED';
    reviewCase.rejection_reason = reason || 'Rejected by reviewing officer.';
    reviewCase.updated_at = new Date().toISOString();

    await auditRepository.logAuditEvent({
      eventType: 'CASE_REJECTED',
      actorType: req.user.primary_role || 'OFFICER',
      actorReference: req.user.id,
      caseId: id,
      metadata: { action: 'reject', reason, officer_id: req.user.id },
    });

    return res.status(200).json(successResponse('Review case rejected.', reviewCase));
  } catch (error) {
    return next(error);
  }
}

async function createCorrection(req, res, next) {
  try {
    const { id } = req.params;
    const { field, originalValue, correctedValue, reason } = req.body || {};
    const reviewCase = mockCases.get(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }

    if (!field || correctedValue === undefined) {
      throw createAppError(400, 'INVALID_CORRECTION', 'Field name and corrected value are required.');
    }

    const correction = {
      id: `CORR-${Date.now()}`,
      case_id: id,
      field,
      original_value: originalValue,
      corrected_value: correctedValue,
      reason: reason || 'Officer manual correction',
      officer_id: req.user.id,
      created_at: new Date().toISOString(),
    };

    reviewCase.corrections.push(correction);
    reviewCase.status = 'CORRECTION_REQUIRED';
    reviewCase.updated_at = new Date().toISOString();

    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_CORRECTION_SUBMITTED',
      actorType: req.user.primary_role || 'OFFICER',
      actorReference: req.user.id,
      caseId: id,
      metadata: { field, correctedValue },
    });

    return res.status(200).json(successResponse('Officer correction submitted.', { case: reviewCase, correction }));
  } catch (error) {
    return next(error);
  }
}

async function holdCase(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const reviewCase = mockCases.get(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }

    reviewCase.status = 'ON_HOLD';
    reviewCase.updated_at = new Date().toISOString();

    await auditRepository.logAuditEvent({
      eventType: 'CASE_PLACED_ON_HOLD',
      actorType: req.user.primary_role || 'OFFICER',
      actorReference: req.user.id,
      caseId: id,
      metadata: { reason },
    });

    return res.status(200).json(successResponse('Review case placed on hold.', reviewCase));
  } catch (error) {
    return next(error);
  }
}

async function addNote(req, res, next) {
  try {
    const { id } = req.params;
    const { note } = req.body || {};
    const reviewCase = mockCases.get(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }

    if (!note || typeof note !== 'string') {
      throw createAppError(400, 'INVALID_NOTE', 'Note text is required.');
    }

    const noteRecord = {
      id: `NOTE-${Date.now()}`,
      case_id: id,
      officer_id: req.user.id,
      note,
      created_at: new Date().toISOString(),
    };

    reviewCase.notes.push(noteRecord);

    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_NOTE_ADDED',
      actorType: req.user.primary_role || 'OFFICER',
      actorReference: req.user.id,
      caseId: id,
      metadata: { noteId: noteRecord.id },
    });

    return res.status(200).json(successResponse('Officer note added.', { case: reviewCase, note: noteRecord }));
  } catch (error) {
    return next(error);
  }
}

async function resolveAnomaly(req, res, next) {
  try {
    const { id, anomalyId } = req.params;
    const reviewCase = mockCases.get(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }

    const anomaly = reviewCase.anomalies.find((a) => a.anomaly_id === anomalyId);
    if (!anomaly) {
      throw createAppError(404, 'ANOMALY_NOT_FOUND', `Anomaly '${anomalyId}' was not found.`);
    }

    anomaly.status = 'RESOLVED';
    anomaly.resolved_at = new Date().toISOString();

    await auditRepository.logAuditEvent({
      eventType: 'ANOMALY_RESOLVED',
      actorType: req.user.primary_role || 'OFFICER',
      actorReference: req.user.id,
      caseId: id,
      metadata: { anomaly_id: anomalyId },
    });

    return res.status(200).json(successResponse('Anomaly marked as resolved.', { case: reviewCase, anomaly }));
  } catch (error) {
    return next(error);
  }
}

function getReviewStats() {
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let onHold = 0;

  for (const caseItem of mockCases.values()) {
    if (caseItem.status === 'APPROVED') approved += 1;
    else if (caseItem.status === 'REJECTED') rejected += 1;
    else if (caseItem.status === 'ON_HOLD') onHold += 1;
    else pending += 1;
  }

  return {
    pending_reviews: pending,
    approved_reviews: approved,
    rejected_reviews: rejected,
    on_hold_reviews: onHold,
    total_reviews: mockCases.size,
  };
}

module.exports = {
  getReviewCases,
  getReviewCaseById,
  approveCase,
  rejectCase,
  createCorrection,
  holdCase,
  addNote,
  resolveAnomaly,
  getReviewStats,
};
