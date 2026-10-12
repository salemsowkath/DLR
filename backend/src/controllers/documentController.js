const fs = require('fs');
const { successResponse } = require('../utils/response');
const documentService = require('../services/documentService');
const { landRecordPipelineService } = require('../services/landRecordPipelineService');
const { landRecordRepository } = require('../repositories/landRecordRepository');
const { reviewRepository } = require('../repositories/reviewRepository');

function isCitizenUser(user) {
  if (!user) return false;
  const userRoles = Array.isArray(user.roles)
    ? user.roles
    : [user.roles || user.primary_role || 'CITIZEN'];
  return userRoles.includes('CITIZEN') && !userRoles.some((r) => ['OFFICER', 'GOVERNMENT_OFFICER', 'MINISTER', 'ADMIN'].includes(r));
}

async function verifyDocumentAccess(req, document) {
  if (req.user && isCitizenUser(req.user)) {
    if (document.created_by_user_id !== req.user.id) {
      const error = new Error('Access denied. You can only view your own documents.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
    return;
  }

  const roles = Array.isArray(req.user?.roles)
    ? req.user.roles
    : [req.user?.roles || req.user?.primary_role];
  if (roles.some((role) => ['OFFICER', 'GOVERNMENT_OFFICER'].includes(String(role || '').toUpperCase()))
    && !roles.some((role) => ['MINISTER', 'ADMIN'].includes(String(role || '').toUpperCase()))) {
    const reviewCase = await reviewRepository.findByDocumentId(document.document_id);
    if (reviewCase?.assigned_officer_id && reviewCase.assigned_officer_id !== req.user.id) {
      const error = new Error('This review case is assigned to another officer.');
      error.statusCode = 403;
      error.code = 'CASE_ASSIGNED_TO_ANOTHER_OFFICER';
      throw error;
    }
    if (!reviewCase) {
      const error = new Error('This document is not available for officer review.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }
}

function citizenReviewSummary(reviewCase) {
  if (!reviewCase) return null;
  return {
    case_id: reviewCase.case_id,
    status: reviewCase.status,
    priority: reviewCase.priority,
    validation_score: reviewCase.validation_score,
    ai_confidence: reviewCase.ai_confidence,
    is_duplicate: Boolean(reviewCase.is_duplicate),
    duplicate_reason: reviewCase.duplicate_reason || null,
    ai_status: reviewCase.ai_status || 'NOT_STARTED',
    validation_result: reviewCase.validation_result,
    anomalies: reviewCase.anomalies,
    officer_notes: reviewCase.officer_notes,
    rejection_reason: reviewCase.rejection_reason,
    reviewed_at: reviewCase.reviewed_at,
    created_at: reviewCase.created_at,
    updated_at: reviewCase.updated_at,
  };
}

/**
 * Upload document file only
 */
async function uploadDocument(req, res, next) {
  try {
    const document = await documentService.uploadDocument(req);
    return res.status(200).json(
      successResponse('Document uploaded successfully.', document)
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Citizen submission endpoint:
 * Uploads land document + persists manual land details in MySQL
 * Performs duplicate Survey Number check by location
 * Status = PENDING_OFFICER_VERIFICATION, AI Status = NOT_STARTED
 * AI is NOT run during Citizen submission!
 */
async function submitCitizenApplication(req, res, next) {
  try {
    const application = await landRecordPipelineService.submitCitizenApplication(req);
    return res.status(201).json(
      successResponse('Land application submitted successfully for officer verification.', application)
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Pre-submission check for duplicate Survey Number in given location
 */
async function checkDuplicateRecord(req, res, next) {
  try {
    const { surveyNumber, survey_number, village, taluk, district } = req.body || {};
    const result = await landRecordPipelineService.checkDuplicateLandRecord({
      surveyNumber: surveyNumber || survey_number,
      village,
      taluk,
      district,
    });
    return res.status(200).json(
      successResponse('Survey number duplicate check completed.', result)
    );
  } catch (error) {
    return next(error);
  }
}

async function getDocumentById(req, res, next) {
  try {
    const document = await documentService.getDocumentById(req.params.id);
    await verifyDocumentAccess(req, document);

    const processingResult = await documentService.getProcessingResult(document.document_id);

    let landRecord = null;
    if (document.land_record_id) {
      landRecord = await landRecordRepository.findById(document.land_record_id);
    }

    const reviewCase = await reviewRepository.findByDocumentId(document.document_id);

    return res.status(200).json(successResponse('Document metadata retrieved successfully.', {
      ...document,
      processing_result: processingResult,
      land_record: landRecord,
      review_case: citizenReviewSummary(reviewCase),
    }));
  } catch (error) {
    return next(error);
  }
}

async function getDocumentFile(req, res, next) {
  try {
    const document = await documentService.getDocumentById(req.params.id);
    await verifyDocumentAccess(req, document);

    const absPath = documentService.getAbsoluteStoragePath(document.storage_path);
    if (!fs.existsSync(absPath)) {
      const error = new Error('Document file not found on storage.');
      error.statusCode = 404;
      error.code = 'FILE_NOT_FOUND';
      throw error;
    }

    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.original_filename)}"`);
    return res.sendFile(absPath);
  } catch (error) {
    return next(error);
  }
}

/**
 * Legacy direct pipeline processing endpoint
 */
async function processDocument(req, res, next) {
  try {
    const result = await landRecordPipelineService.processUploadedDocument(req);
    return res.status(200).json(successResponse('Document processed successfully.', result));
  } catch (error) {
    return next(error);
  }
}

async function getMyDocuments(req, res, next) {
  try {
    const documents = await documentService.getDocumentsByUserId(req.user.id);
    const enrichedDocuments = [];

    for (const doc of documents) {
      let landRecord = null;
      if (doc.land_record_id) {
        landRecord = await landRecordRepository.findById(doc.land_record_id);
      }
      const reviewCase = await reviewRepository.findByDocumentId(doc.document_id);

      enrichedDocuments.push({
        ...doc,
        land_record: landRecord,
        review_case: citizenReviewSummary(reviewCase),
      });
    }

    return res.status(200).json(successResponse('User documents retrieved successfully.', { documents: enrichedDocuments }));
  } catch (error) {
    return next(error);
  }
}

async function getMyApplications(req, res, next) {
  try {
    const documents = await documentService.getDocumentsByUserId(req.user.id);
    const applications = [];
    for (const document of documents) {
      const processingResult = await documentService.getProcessingResult(document.document_id);
      const reviewCase = await reviewRepository.findByDocumentId(document.document_id);
      let landRecord = null;
      if (document.land_record_id) {
        landRecord = await landRecordRepository.findById(document.land_record_id);
      }

      const citizenData = landRecord?.citizen_submitted_data || {};
      const isDuplicate = Boolean(landRecord?.is_duplicate || reviewCase?.is_duplicate);
      const duplicateReason = landRecord?.duplicate_reason || reviewCase?.duplicate_reason || null;
      const aiStatus = reviewCase?.ai_status || landRecord?.ai_status || 'NOT_STARTED';

      // Application status mapping: Reflect exact verification status
      let appStatus = landRecord?.verification_status || reviewCase?.status || 'PENDING_OFFICER_REVIEW';
      if (landRecord?.status === 'GOVERNMENT_APPROVED' || reviewCase?.status === 'GOVERNMENT_APPROVED' || reviewCase?.status === 'APPROVED' || landRecord?.status === 'VERIFIED') {
        appStatus = 'GOVERNMENT_APPROVED';
      } else if (landRecord?.status === 'REJECTED' || reviewCase?.status === 'REJECTED') {
        appStatus = 'REJECTED';
      }

      applications.push({
        application_id: reviewCase?.case_id || `APP-${document.document_id.slice(-6)}`,
        document_id: document.document_id,
        filename: document.original_filename,
        owner_name: citizenData.owner_name || landRecord?.owner_name || processingResult?.extraction?.owner_name?.value || null,
        masked_aadhaar: citizenData.aadhaar_number || null,
        survey_number: citizenData.survey_number || landRecord?.survey_number || processingResult?.extraction?.survey_number?.value || null,
        area: citizenData.area || (landRecord?.area_value ? `${landRecord.area_value} ${landRecord.area_unit || ''}`.trim() : null),
        village: citizenData.village || landRecord?.village || null,
        taluk: citizenData.taluk || landRecord?.taluk || null,
        district: citizenData.district || landRecord?.district || null,
        is_duplicate: isDuplicate,
        duplicate_reason: duplicateReason,
        ai_status: aiStatus,
        status: appStatus,
        application_status: appStatus,
        verification_status: landRecord?.verification_status || 'PENDING_OFFICER_VERIFICATION',
        submitted_at: document.uploaded_at,
        updated_at: reviewCase?.updated_at || processingResult?.updated_at || document.updated_at,
        validation_score: reviewCase?.validation_score ?? processingResult?.validation?.score ?? null,
        warnings: reviewCase?.anomalies || processingResult?.validation?.issues || [],
        officer_notes: reviewCase?.officer_notes || null,
        rejection_reason: reviewCase?.rejection_reason || null,
        citizen_submitted_data: citizenData,
      });
    }
    return res.status(200).json(successResponse('Citizen applications retrieved successfully.', { applications }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadDocument,
  submitCitizenApplication,
  checkDuplicateRecord,
  getDocumentById,
  getDocumentFile,
  getMyDocuments,
  getMyApplications,
  processDocument,
};
