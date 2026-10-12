const { successResponse } = require('../utils/response');
const { reviewRepository } = require('../repositories/reviewRepository');
const { landRecordRepository } = require('../repositories/landRecordRepository');
const { auditRepository } = require('../repositories/auditRepository');
const { landRecordPipelineService } = require('../services/landRecordPipelineService');
const { digitalLandRecordRepository } = require('../repositories/digitalLandRecordRepository');
const { notificationRepository } = require('../repositories/notificationRepository');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function isElevatedReviewer(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [user?.primary_role || user?.roles];
  return roles.some((role) => ['MINISTER', 'ADMIN'].includes(String(role || '').toUpperCase()));
}

function assertCaseAssignment(user, reviewCase) {
  if (!isElevatedReviewer(user)
    && reviewCase.assigned_officer_id
    && reviewCase.assigned_officer_id !== user.id) {
    throw createAppError(403, 'CASE_ASSIGNED_TO_ANOTHER_OFFICER', 'This review case is assigned to another officer.');
  }
}

async function getReviewCases(req, res, next) {
  try {
    const { status, priority, limit = 50, offset = 0 } = req.query || {};
    const elevated = isElevatedReviewer(req.user);
    const casesList = await reviewRepository.findAll({
      status,
      priority,
      assignedOfficerId: elevated ? null : req.user.id,
      includeUnassigned: !elevated,
      limit,
      offset,
    });
    const stats = await reviewRepository.getStats();

    return res.status(200).json(
      successResponse('Review cases retrieved.', {
        cases: casesList,
        stats,
      })
    );
  } catch (error) {
    return next(error);
  }
}

async function getReviewCaseById(req, res, next) {
  try {
    const { id } = req.params;
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }
    assertCaseAssignment(req.user, reviewCase);

    // Include structured land record if available
    let landRecord = reviewCase.land_record;
    if (!landRecord && reviewCase.land_record_id) {
      landRecord = await landRecordRepository.findById(reviewCase.land_record_id);
    }

    return res.status(200).json(
      successResponse('Review case details retrieved.', {
        ...reviewCase,
        land_record: landRecord,
      })
    );
  } catch (error) {
    return next(error);
  }
}

async function startCase(req, res, next) {
  try {
    const { id } = req.params;
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }
    assertCaseAssignment(req.user, reviewCase);
    if (!['PENDING_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD'].includes(reviewCase.status)) {
      throw createAppError(409, 'INVALID_CASE_STATUS', 'This case cannot be started in its current status.');
    }

    const officerId = req.user.id;
    const claimedCase = await reviewRepository.claimCase(id, officerId);
    await auditRepository.logAuditEvent({
      eventType: 'CASE_REVIEW_STARTED',
      actorType: req.user.primary_role || 'OFFICER',
      actorReference: officerId,
      caseId: id,
      metadata: { officer_id: officerId },
    });

    return res.status(200).json(successResponse('Review case assigned to this officer.', claimedCase));
  } catch (error) {
    return next(error);
  }
}

async function approveCase(req, res, next) {
  try {
    const { id } = req.params;
    const { reason, officerNotes, notes } = req.body || {};
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }
    assertCaseAssignment(req.user, reviewCase);
    if (!reviewCase.land_record_id) {
      throw createAppError(409, 'LAND_RECORD_MISSING', 'This case has no AI-generated land record to verify.');
    }
    if (['APPROVED', 'REJECTED', 'CLOSED'].includes(reviewCase.status)) {
      throw createAppError(409, 'CASE_ALREADY_DECIDED', 'This review case already has a final decision.');
    }

    const officerId = req.user?.id || 'OFFICER';
    const officerRole = req.user?.primary_role || 'OFFICER';
    const now = new Date().toISOString();
    const notesText = officerNotes || notes || reason || '';

    const updatedCase = await reviewRepository.decideCase({
      caseId: id,
      landRecordId: reviewCase.land_record_id,
      status: 'APPROVED',
      officerId,
      officerNotes: notesText,
      rejectionReason: null,
    });

    await auditRepository.logAuditEvent({
      eventType: 'CASE_APPROVED',
      actorType: officerRole,
      actorReference: officerId,
      caseId: id,
      metadata: {
        action: 'approve',
        officer_id: officerId,
        officer_name: req.user?.name || 'Officer',
        reason: reason || 'Verified and approved',
        verified_land_record_id: reviewCase.land_record_id,
        timestamp: now,
      },
    });

    try {
      const lr = await landRecordRepository.findById(reviewCase.land_record_id);
      const citData = reviewCase.citizen_submitted_data || lr?.citizen_submitted_data || {};
      const citizenId = reviewCase.document?.created_by_user_id || reviewCase.citizen?.id || 'usr-citizen-001';
      let approvedRec = await digitalLandRecordRepository.findByCaseId(id);
      if (!approvedRec && lr) {
        approvedRec = await digitalLandRecordRepository.createApprovedRecord({
          caseId: id,
          landRecordId: lr.id,
          citizenId,
          officerId,
          finalData: {
            owner_name: lr.owner_name || citData.owner_name || 'Land Owner',
            survey_number: lr.survey_number || citData.survey_number || '—',
            khasra_number: lr.khasra_number || null,
            khata_number: lr.khata_number || null,
            area_value: lr.area_value,
            area_unit: lr.area_unit || 'acre',
            village: lr.village || citData.village || '',
            taluk: lr.taluk || citData.taluk || '',
            district: lr.district || citData.district || '',
            state: lr.state || 'Tamil Nadu',
            classification: lr.classification || 'Agricultural',
          },
        });
      }

      await notificationRepository.createNotification({
        userId: citizenId,
        title: 'LAND RECORD GOVERNMENT APPROVED',
        message: `Your land record application ${id} has been verified and Government Approved! Record ID: ${approvedRec?.record_id || id}`,
        type: 'RECORD_APPROVED',
        referenceId: id,
      });
    } catch (_) {}

    return res.status(200).json(successResponse('Review case approved successfully. Land record is now VERIFIED.', updatedCase));
  } catch (error) {
    return next(error);
  }
}

async function rejectCase(req, res, next) {
  try {
    const { id } = req.params;
    const { reason, officerNotes, notes } = req.body || {};
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }
    assertCaseAssignment(req.user, reviewCase);
    if (!reviewCase.land_record_id) {
      throw createAppError(409, 'LAND_RECORD_MISSING', 'This case has no AI-generated land record to reject.');
    }
    if (['APPROVED', 'REJECTED', 'CLOSED'].includes(reviewCase.status)) {
      throw createAppError(409, 'CASE_ALREADY_DECIDED', 'This review case already has a final decision.');
    }

    if (typeof reason !== 'string' || !reason.trim()) {
      throw createAppError(400, 'REJECTION_REASON_REQUIRED', 'A rejection reason is required.');
    }
    const rejectionReason = reason.trim();
    const notesText = officerNotes || notes || rejectionReason;
    const officerId = req.user?.id || 'OFFICER';
    const officerRole = req.user?.primary_role || 'OFFICER';
    const now = new Date().toISOString();

    const updatedCase = await reviewRepository.decideCase({
      caseId: id,
      landRecordId: reviewCase.land_record_id,
      status: 'REJECTED',
      officerId,
      officerNotes: notesText,
      rejectionReason,
    });

    await auditRepository.logAuditEvent({
      eventType: 'CASE_REJECTED',
      actorType: officerRole,
      actorReference: officerId,
      caseId: id,
      metadata: {
        action: 'reject',
        reason: rejectionReason,
        officer_id: officerId,
        officer_name: req.user?.name || 'Officer',
        timestamp: now,
      },
    });

    return res.status(200).json(successResponse('Review case rejected.', updatedCase));
  } catch (error) {
    return next(error);
  }
}

async function createCorrection(req, res, next) {
  try {
    const { id } = req.params;
    const { field, originalValue, correctedValue, reason, anomalyId } = req.body || {};
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }

    assertCaseAssignment(req.user, reviewCase);
    if (!field || correctedValue === undefined) {
      throw createAppError(400, 'INVALID_CORRECTION', 'Field name and corrected value are required.');
    }
    const supportedFields = new Set([
      'owner_name', 'survey_number', 'subdivision_number', 'khasra_number',
      'khata_number', 'patta_number', 'document_number', 'area', 'area_value',
      'village', 'taluk', 'district', 'state', 'pincode', 'classification',
      'date', 'record_date',
    ]);
    if (!supportedFields.has(field)) {
      throw createAppError(400, 'INVALID_CORRECTION', 'The requested land-record field cannot be corrected.');
    }

    const officerId = req.user?.id || 'OFFICER';
    const officerRole = req.user?.primary_role || 'OFFICER';
    const oldValue = originalValue !== undefined
      ? originalValue
      : reviewCase.land_record?.fields?.[field]?.value ?? reviewCase.land_record?.fields?.[field] ?? null;

    // 1. Save correction to MySQL
    const correction = await reviewRepository.addCorrection({
      caseId: id,
      anomalyId: anomalyId || null,
      field,
      originalValue: oldValue,
      correctedValue,
      reason: reason || 'Officer manual correction',
      officerId,
    });

    // 2. Update normalized field in land_records and land_record_fields in MySQL
    if (reviewCase.land_record_id) {
      await landRecordRepository.updateField(reviewCase.land_record_id, field, correctedValue);
    }

    // 3. Log Audit Event in MySQL
    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_CORRECTION_SUBMITTED',
      actorType: officerRole,
      actorReference: officerId,
      caseId: id,
      metadata: {
        field,
        originalValue: oldValue,
        correctedValue,
        reason: reason || 'Manual verification correction',
        officer_id: officerId,
      },
    });

    const updatedCase = await reviewRepository.findById(id);
    return res.status(200).json(
      successResponse('Officer correction submitted and land record updated.', {
        case: updatedCase,
        correction,
      })
    );
  } catch (error) {
    return next(error);
  }
}

async function holdCase(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }
    assertCaseAssignment(req.user, reviewCase);

    const officerId = req.user?.id || 'OFFICER';
    const officerRole = req.user?.primary_role || 'OFFICER';

    await reviewRepository.updateStatus(id, 'ON_HOLD', {
      officerId,
      reason: reason || 'Placed on hold pending additional verification records',
    });

    await auditRepository.logAuditEvent({
      eventType: 'CASE_PLACED_ON_HOLD',
      actorType: officerRole,
      actorReference: officerId,
      caseId: id,
      metadata: { reason, officer_id: officerId },
    });

    const updatedCase = await reviewRepository.findById(id);
    return res.status(200).json(successResponse('Review case placed on hold.', updatedCase));
  } catch (error) {
    return next(error);
  }
}

async function addNote(req, res, next) {
  try {
    const { id } = req.params;
    const { note } = req.body || {};
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }
    assertCaseAssignment(req.user, reviewCase);

    if (!note || typeof note !== 'string') {
      throw createAppError(400, 'INVALID_NOTE', 'Note text is required.');
    }

    const officerId = req.user?.id || 'OFFICER';
    const officerRole = req.user?.primary_role || 'OFFICER';

    const noteRecord = await reviewRepository.addNote({
      caseId: id,
      officerId,
      note,
    });

    await auditRepository.logAuditEvent({
      eventType: 'OFFICER_NOTE_ADDED',
      actorType: officerRole,
      actorReference: officerId,
      caseId: id,
      metadata: { noteId: noteRecord.id },
    });

    const updatedCase = await reviewRepository.findById(id);
    return res.status(200).json(successResponse('Officer note added.', { case: updatedCase, note: noteRecord }));
  } catch (error) {
    return next(error);
  }
}

async function resolveAnomaly(req, res, next) {
  try {
    const { id, anomalyId } = req.params;
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }
    assertCaseAssignment(req.user, reviewCase);

    const officerId = req.user?.id || 'OFFICER';
    const officerRole = req.user?.primary_role || 'OFFICER';

    const anomaly = await reviewRepository.resolveAnomaly(id, anomalyId);
    if (!anomaly) {
      throw createAppError(404, 'ANOMALY_NOT_FOUND', `Anomaly '${anomalyId}' was not found.`);
    }

    await auditRepository.logAuditEvent({
      eventType: 'ANOMALY_RESOLVED',
      actorType: officerRole,
      actorReference: officerId,
      caseId: id,
      metadata: { anomaly_id: anomalyId, officer_id: officerId },
    });

    const updatedCase = await reviewRepository.findById(id);
    return res.status(200).json(successResponse('Anomaly marked as resolved.', { case: updatedCase, anomaly }));
  } catch (error) {
    return next(error);
  }
}

async function getReviewStats(req, res, next) {
  try {
    const stats = await reviewRepository.getStats();
    return res.status(200).json(successResponse('Review statistics retrieved.', stats));
  } catch (error) {
    return next(error);
  }
}

async function processCaseAI(req, res, next) {
  try {
    const { id } = req.params;
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }
    assertCaseAssignment(req.user, reviewCase);

    const result = await landRecordPipelineService.processApplicationWithAI(id, req);
    return res.status(200).json(
      successResponse('Document processed by AI service successfully.', result)
    );
  } catch (error) {
    return next(error);
  }
}

async function requestCorrectionCase(req, res, next) {
  try {
    const { id } = req.params;
    const { reason, officerNotes, notes } = req.body || {};
    const reviewCase = await reviewRepository.findById(id);
    if (!reviewCase) {
      throw createAppError(404, 'CASE_NOT_FOUND', `Review case '${id}' was not found.`);
    }
    assertCaseAssignment(req.user, reviewCase);
    const officerId = req.user?.id || 'OFFICER';
    const officerRole = req.user?.primary_role || 'OFFICER';
    const noteText = officerNotes || notes || reason || 'Correction required by officer';

    const updatedCase = await reviewRepository.updateStatus(id, 'CORRECTION_REQUIRED', {
      officerId,
      reason: noteText,
      officerNotes: noteText,
    });

    await auditRepository.logAuditEvent({
      eventType: 'CASE_CORRECTION_REQUESTED',
      actorType: officerRole,
      actorReference: officerId,
      caseId: id,
      metadata: { reason: noteText, officer_id: officerId },
    });

    return res.status(200).json(successResponse('Correction requested for review case.', updatedCase));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getReviewCases,
  getReviewCaseById,
  startCase,
  processCaseAI,
  approveCase,
  rejectCase,
  requestCorrectionCase,
  createCorrection,
  holdCase,
  addNote,
  resolveAnomaly,
  getReviewStats,
};
