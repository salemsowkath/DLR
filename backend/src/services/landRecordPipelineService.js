const fs = require('fs/promises');
const documentService = require('./documentService');
const { aiServiceClient, AIServiceError } = require('./aiService');

function pipelineError(statusCode, code, message, cause) {
  return new AIServiceError(statusCode, code, message, { cause });
}

function parseGeometry(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  try {
    const geometry = JSON.parse(value);
    if (!geometry || typeof geometry !== 'object' || Array.isArray(geometry)) throw new Error('Geometry must be an object.');
    return geometry;
  } catch (error) {
    throw pipelineError(400, 'INVALID_GEOJSON', 'The geometry form field must contain a valid GeoJSON object.', error);
  }
}

function removeTemporaryUpload(filePath) {
  return fs.unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

class LandRecordPipelineService {
  constructor({ documents = documentService, ai = aiServiceClient } = {}) {
    this.documents = documents;
    this.ai = ai;
  }

  async processUploadedDocument(req) {
    if (!req.file) {
      throw pipelineError(400, 'INVALID_FILE', 'No document file was uploaded.');
    }

    let geometry;
    try {
      geometry = parseGeometry(req.body?.geometry);
    } catch (error) {
      await removeTemporaryUpload(req.file.path);
      throw error;
    }
    const crs = req.body?.crs || null;
    const document = await this.documents.uploadDocument(req);

    try {
      await this.documents.updateDocumentStatus(document.document_id, 'PROCESSING');
      const processed = await this.ai.processDocument({
        filePath: req.file.path,
        filename: document.original_filename,
        mimeType: document.mime_type,
        language: req.body?.language || undefined,
      });
      const fields = processed.fields;
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        throw pipelineError(502, 'AI_INVALID_EXTRACTION', 'AI document processing did not return structured extraction fields.');
      }

      const validationResult = await this.ai.validateLandRecord(fields);
      if (!validationResult.validation || typeof validationResult.validation !== 'object') {
        throw pipelineError(502, 'AI_INVALID_VALIDATION', 'AI validation did not return a validation result.');
      }

      let gisResult = null;
      if (geometry) {
        gisResult = await this.ai.validateGIS({ landRecord: fields, geometry, crs });
        if (!gisResult.gis_validation || typeof gisResult.gis_validation !== 'object') {
          throw pipelineError(502, 'AI_INVALID_GIS_RESULT', 'AI GIS validation did not return a GIS result.');
        }
      }

      const validationNeedsReview = Boolean(validationResult.validation.review_required);
      const gisNeedsReview = Boolean(gisResult?.review_required || gisResult?.gis_validation?.review_required);
      const reviewRequired = validationNeedsReview || gisNeedsReview;
      let reviewCase = null;
      if (reviewRequired) {
        const reviewResult = await this.ai.createReviewCase({
          documentId: document.document_id,
          landRecord: fields,
          validationResult,
          gisResult,
        });
        reviewCase = reviewResult.case || null;
        if (!reviewResult.success || !reviewCase?.case_id) {
          throw pipelineError(502, 'AI_REVIEW_PERSISTENCE_FAILED', 'AI service did not confirm review-case creation.');
        }
      }

      const result = {
        document: {
          document_id: document.document_id,
          filename: document.original_filename,
          file_type: document.file_type,
          mime_type: document.mime_type,
          file_size: document.file_size,
          status: 'PROCESSED',
        },
        ocr: {
          status: 'COMPLETED',
          language: processed.ocr?.language || req.body?.language || null,
          confidence: typeof processed.ocr?.confidence === 'number' ? processed.ocr.confidence : null,
        },
        extraction: fields,
        validation: {
          status: validationResult.validation.status || 'UNAVAILABLE',
          score: validationResult.validation.overall_score ?? null,
          issues: validationResult.validation.issues || [],
          review_required: validationNeedsReview,
        },
        gis: gisResult
          ? {
              status: gisNeedsReview ? 'REVIEW_REQUIRED' : gisResult.geometry_valid === false ? 'INVALID' : 'VALID',
              area_match: gisResult.classification || 'UNAVAILABLE',
              overlaps: gisResult.spatial_relationships || [],
              result: gisResult,
            }
          : { status: 'UNAVAILABLE', area_match: null, overlaps: [] },
        review: {
          required: reviewRequired,
          case_id: reviewCase?.case_id || null,
          status: reviewCase?.status || null,
        },
      };
      await this.documents.saveProcessingResult(document.document_id, result);
      await this.documents.updateDocumentStatus(document.document_id, 'PROCESSED');
      return result;
    } catch (error) {
      try {
        await this.documents.updateDocumentStatus(document.document_id, 'FAILED');
      } catch (statusError) {
        throw pipelineError(500, 'DOCUMENT_STATUS_UPDATE_FAILED', 'Processing failed and document status could not be saved.', statusError);
      }
      if (error instanceof AIServiceError) {
        error.details = { ...(error.details || {}), document_id: document.document_id };
      }
      throw error;
    }
  }
}

module.exports = { LandRecordPipelineService, landRecordPipelineService: new LandRecordPipelineService(), parseGeometry };
