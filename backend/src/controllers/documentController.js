const { successResponse } = require('../utils/response');
const documentService = require('../services/documentService');
const { landRecordPipelineService } = require('../services/landRecordPipelineService');

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

async function getDocumentById(req, res, next) {
  try {
    const document = await documentService.getDocumentById(req.params.id);

    if (req.user) {
      const userRoles = Array.isArray(req.user.roles)
        ? req.user.roles
        : [req.user.roles || req.user.primary_role || 'CITIZEN'];

      const isCitizen = userRoles.includes('CITIZEN') && !userRoles.some((r) => ['OFFICER', 'GOVERNMENT_OFFICER', 'MINISTER', 'ADMIN'].includes(r));

      if (isCitizen && document.created_by_user_id && document.created_by_user_id !== req.user.id) {
        const error = new Error('Access denied. You can only view your own documents.');
        error.statusCode = 403;
        error.code = 'FORBIDDEN';
        throw error;
      }
    }

    const processingResult = await documentService.getProcessingResult(document.document_id);
    return res.status(200).json(successResponse('Document metadata retrieved successfully.', {
      ...document,
      processing_result: processingResult,
    }));
  } catch (error) {
    return next(error);
  }
}

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
    return res.status(200).json(successResponse('User documents retrieved successfully.', { documents }));
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
      if (!processingResult?.review?.required) continue;
      applications.push({
        application_id: processingResult.review.case_id || document.document_id,
        document_id: document.document_id,
        filename: document.original_filename,
        status: processingResult.review.status || 'PENDING_REVIEW',
        submitted_at: document.uploaded_at,
        updated_at: processingResult.updated_at || document.updated_at,
        survey_number: processingResult.extraction?.survey_number?.value || null,
      });
    }
    return res.status(200).json(successResponse('Citizen applications retrieved successfully.', { applications }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadDocument,
  getDocumentById,
  getMyDocuments,
  getMyApplications,
  processDocument,
};
