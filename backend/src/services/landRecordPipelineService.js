const fs = require('fs/promises');
const documentService = require('./documentService');
const { aiServiceClient, AIServiceError } = require('./aiService');
const { landRecordRepository } = require('../repositories/landRecordRepository');
const { reviewRepository } = require('../repositories/reviewRepository');
const { auditRepository } = require('../repositories/auditRepository');
const { notificationRepository } = require('../repositories/notificationRepository');
const logger = require('../config/logger');
const { maskAadhaar } = require('./otpProvider');
const { parseDateForMySQL } = require('../utils/date');

function pipelineError(statusCode, code, message, cause) {
  return new AIServiceError(statusCode, code, message, { cause });
}

function parseGeometry(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  try {
    const geometry = JSON.parse(value);
    if (!geometry || typeof geometry !== 'object' || Array.isArray(geometry)) {
      throw new Error('Geometry must be an object.');
    }
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

function parseAreaValue(raw) {
  if (raw == null) return { value: null, unit: null };
  if (typeof raw === 'number') return { value: raw, unit: 'acre' };
  if (typeof raw === 'object') {
    const val = raw.value != null ? Number(raw.value) : null;
    return { value: isNaN(val) ? null : val, unit: raw.unit || 'acre' };
  }
  const str = String(raw).trim();
  const match = str.match(/^([\d.,]+)\s*([a-zA-Z\s.]*)$/);
  if (!match) return { value: null, unit: null };
  const num = parseFloat(match[1].replace(/,/g, ''));
  const unit = match[2] ? match[2].trim().toLowerCase() : 'acre';
  return { value: isNaN(num) ? null : num, unit };
}

function getFieldValue(field) {
  if (field == null) return null;
  if (typeof field === 'object') {
    return field.value !== undefined ? field.value : null;
  }
  return field;
}

function normalizeCitizenFieldName(key) {
  const map = {
    ownerName: 'owner_name',
    owner_name: 'owner_name',
    aadhaarNumber: 'aadhaar_number',
    aadhaar_number: 'aadhaar_number',
    identityReference: 'aadhaar_number',
    identity_reference: 'aadhaar_number',
    surveyNumber: 'survey_number',
    survey_number: 'survey_number',
    subdivisionNumber: 'subdivision_number',
    subdivision_number: 'subdivision_number',
    subDivisionNumber: 'subdivision_number',
    sub_division_number: 'subdivision_number',
    area: 'area',
    areaUnit: 'area_unit',
    area_unit: 'area_unit',
    village: 'village',
    taluk: 'taluk',
    district: 'district',
    state: 'state',
    classification: 'classification',
    landClassification: 'classification',
    land_classification: 'classification',
    pattaNumber: 'patta_number',
    patta_number: 'patta_number',
    documentType: 'document_type',
    document_type: 'document_type',
    documentDate: 'document_date',
    document_date: 'document_date',
    description: 'description',
  };
  return map[key] || key;
}

function parseCitizenSubmittedData(rawPayload = {}) {
  const payload = rawPayload?.citizen_data && typeof rawPayload.citizen_data === 'object'
    ? rawPayload.citizen_data
    : rawPayload;

  const allowedKeys = new Set([
    'owner_name',
    'aadhaar_number',
    'survey_number',
    'subdivision_number',
    'area',
    'area_unit',
    'village',
    'taluk',
    'district',
    'state',
    'classification',
    'patta_number',
    'document_type',
    'document_date',
    'description',
  ]);

  const normalized = {};
  const aliasEntries = Object.entries(payload || {});
  for (const [key, value] of aliasEntries) {
    const normalizedKey = normalizeCitizenFieldName(key);
    if (!allowedKeys.has(normalizedKey)) continue;
    if (value == null || value === '') continue;
    if (normalizedKey === 'aadhaar_number') {
      const aadhaarValue = String(value).trim();
      normalized[normalizedKey] = maskAadhaar(aadhaarValue);
      continue;
    }
    normalized[normalizedKey] = String(value).trim();
  }

  return normalized;
}

class LandRecordPipelineService {
  constructor({
    documents = documentService,
    ai = aiServiceClient,
    landRecords = landRecordRepository,
    reviews = reviewRepository,
    audit = auditRepository,
  } = {}) {
    this.documents = documents;
    this.ai = ai;
    this.landRecords = landRecords;
    this.reviews = reviews;
    this.audit = audit;
  }

  /**
   * Check whether a Survey Number already exists in the given location (survey_number + village + taluk + district).
   * Not globally unique.
   */
  async checkDuplicateLandRecord({ surveyNumber, village, taluk, district, excludeRecordId = null } = {}) {
    if (!surveyNumber || !village || !taluk || !district) {
      return { isDuplicate: false, message: null, matchedRecord: null };
    }

    if (typeof this.landRecords?.findExistingRecordByLocation !== 'function') {
      return { isDuplicate: false, message: null, matchedRecord: null };
    }

    const matched = await this.landRecords.findExistingRecordByLocation({
      surveyNumber: String(surveyNumber).trim(),
      village: String(village).trim(),
      taluk: String(taluk).trim(),
      district: String(district).trim(),
      excludeRecordId,
    });

    if (matched) {
      return {
        isDuplicate: true,
        message: `Survey Number ${surveyNumber} is already registered for this location.`,
        warning: '⚠️ POSSIBLE DUPLICATE LAND RECORD',
        matchedRecord: {
          id: matched.id,
          survey_number: matched.survey_number,
          village: matched.village,
          taluk: matched.taluk,
          district: matched.district,
          owner_name: matched.owner_name,
          status: matched.status,
          verification_status: matched.verification_status,
          created_at: matched.created_at,
        },
      };
    }

    return { isDuplicate: false, message: null, warning: null, matchedRecord: null };
  }

  /**
   * CITIZEN SUBMISSION WORKFLOW:
   * 1. Validate file (<= 10MB)
   * 2. Extract manual land details entered by citizen
   * 3. Check for duplicate survey number by location (Survey + Village + Taluk + District)
   * 4. Upload document to storage and record metadata
   * 5. Save application + document + citizen details in MySQL
   * 6. Application status = PENDING_OFFICER_VERIFICATION, AI status = NOT_STARTED
   * 7. IMPORTANT: AI must NOT run during Citizen submission.
   */
  async submitCitizenApplication(req) {
    if (!req.file) {
      throw pipelineError(400, 'INVALID_FILE', 'No document file was uploaded.');
    }

    if (req.file.size > 10 * 1024 * 1024) {
      await removeTemporaryUpload(req.file.path);
      throw pipelineError(413, 'FILE_TOO_LARGE', 'File exceeds the 10 MB limit.');
    }

    const citizenSubmittedData = parseCitizenSubmittedData(req.body || {});
    const surveyNumber = citizenSubmittedData.survey_number || req.body?.survey_number || null;
    const village = citizenSubmittedData.village || req.body?.village || null;
    const taluk = citizenSubmittedData.taluk || req.body?.taluk || null;
    const district = citizenSubmittedData.district || req.body?.district || null;

    // Duplicate check on location
    const dupCheck = await this.checkDuplicateLandRecord({ surveyNumber, village, taluk, district });
    const isDuplicate = dupCheck.isDuplicate;
    const duplicateReason = isDuplicate ? dupCheck.message : null;

    // Upload and persist document
    const document = await this.documents.uploadDocument(req);

    const parsedArea = parseAreaValue(citizenSubmittedData.area);
    const landRecordData = {
      record_reference: `REC-${document.document_id}`,
      owner_name: citizenSubmittedData.owner_name || null,
      survey_number: surveyNumber,
      area_value: parsedArea.value,
      area_unit: parsedArea.unit,
      village: village,
      taluk: taluk,
      district: district,
      record_date: null, // explicitly NULL for citizen submission, no zero dates
      source_document_id: document.document_id,
      status: 'PENDING_OFFICER_VERIFICATION',
      verification_status: 'PENDING_OFFICER_VERIFICATION',
      ai_status: 'NOT_STARTED',
      is_duplicate: isDuplicate,
      duplicate_reason: duplicateReason,
      citizen_submitted_data: citizenSubmittedData,
      ai_extracted_data: null,
      fields: null,
    };

    const savedLandRecord = await this.landRecords.create(landRecordData);
    await this.documents.updateDocumentLandRecord(document.document_id, savedLandRecord.id);
    await this.documents.updateDocumentStatus(document.document_id, 'UPLOADED');

    const anomalies = [];
    if (isDuplicate) {
      anomalies.push({
        anomaly_id: `ANOM-DUP-${Date.now()}`,
        type: 'POSSIBLE_DUPLICATE_LAND_RECORD',
        field: 'survey_number',
        severity: 'WARNING',
        status: 'OPEN',
        source: 'CITIZEN_SUBMISSION_CHECK',
        title: 'Possible Duplicate Land Record',
        message: duplicateReason,
        review_required: true,
        metadata: {
          survey_number: surveyNumber,
          village,
          taluk,
          district,
          matched_record: dupCheck.matchedRecord,
        },
      });
    }

    const reviewCase = await this.reviews.createCase({
      document_id: document.document_id,
      land_record_id: savedLandRecord.id,
      status: 'PENDING_REVIEW',
      priority: isDuplicate ? 'HIGH' : 'MEDIUM',
      validation_score: null,
      ai_confidence: null,
      is_duplicate: isDuplicate,
      duplicate_reason: duplicateReason,
      ai_status: 'NOT_STARTED',
      review_required: true,
      case_data: {
        document_id: document.document_id,
        citizen_submitted_data: citizenSubmittedData,
      },
      anomalies,
    });

    await this.audit.logAuditEvent({
      eventType: 'CITIZEN_APPLICATION_SUBMITTED',
      actorType: req.user?.primary_role || 'CITIZEN',
      actorReference: req.user?.id || 'CITIZEN',
      caseId: reviewCase.case_id,
      metadata: {
        application_id: reviewCase.case_id,
        document_id: document.document_id,
        land_record_id: savedLandRecord.id,
        is_duplicate: isDuplicate,
        duplicate_reason: duplicateReason,
        survey_number: surveyNumber,
        village,
        taluk,
        district,
      },
    });

    try {
      await notificationRepository.createNotification({
        targetRole: 'OFFICER',
        title: 'NEW LAND RECORD APPLICATION',
        message: `Application ${reviewCase.case_id} submitted for ${village || 'location'} (Survey: ${surveyNumber || 'N/A'}).`,
        type: 'NEW_APPLICATION',
        referenceId: reviewCase.case_id,
      });
    } catch (_) {}

    return {
      application_id: reviewCase.case_id,
      document_id: document.document_id,
      land_record_id: savedLandRecord.id,
      status: 'PENDING_OFFICER_VERIFICATION',
      verification_status: 'PENDING_OFFICER_VERIFICATION',
      ai_status: 'NOT_STARTED',
      is_duplicate: isDuplicate,
      duplicate_reason: duplicateReason,
      citizen_submitted_data: citizenSubmittedData,
      document: {
        document_id: document.document_id,
        original_filename: document.original_filename,
        file_type: document.file_type,
        file_size: document.file_size,
        storage_path: document.storage_path,
        status: 'UPLOADED',
      },
      submitted_at: document.uploaded_at,
    };
  }

  /**
   * OFFICER AI PROCESSING WORKFLOW:
   * Called on-demand when an Officer clicks "AI PROCESS DOCUMENT" or retries.
   * Runs the real Python AI Service (FastAPI) on the persisted document.
   * Compares Citizen vs AI vs MySQL records.
   * Persists AI extraction and validation results into MySQL.
   */
  async processApplicationWithAI(caseId, req = {}) {
    const reviewCase = await this.reviews.findById(caseId);
    if (!reviewCase) {
      throw pipelineError(404, 'CASE_NOT_FOUND', `Review case '${caseId}' was not found.`);
    }

    const document = await this.documents.getDocumentById(reviewCase.document_id);
    if (!document) {
      throw pipelineError(404, 'DOCUMENT_NOT_FOUND', `Document '${reviewCase.document_id}' was not found.`);
    }

    // Set status to PROCESSING
    await this.reviews.updateAiStatus(caseId, 'PROCESSING');
    if (reviewCase.land_record_id) {
      await this.landRecords.updateAiStatus(reviewCase.land_record_id, 'PROCESSING');
    }
    await this.documents.updateDocumentStatus(document.document_id, 'PROCESSING');

    const absPath = this.documents.getAbsoluteStoragePath(document.storage_path);

    try {
      // 1. Process Document with real Python AI Service
      const processed = await this.ai.processDocument({
        filePath: absPath,
        filename: document.original_filename,
        mimeType: document.mime_type,
        language: req.body?.language || undefined,
      });

      const fields = processed.fields;
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        throw pipelineError(502, 'AI_INVALID_EXTRACTION', 'AI document processing did not return structured extraction fields.');
      }

      // 2. Validate Land Record with AI validation service
      const validationResult = await this.ai.validateLandRecord(fields);
      if (!validationResult.validation || typeof validationResult.validation !== 'object') {
        throw pipelineError(502, 'AI_INVALID_VALIDATION', 'AI validation did not return a valid result.');
      }

      const ocrConfidence = typeof processed.ocr?.confidence === 'number'
        ? processed.ocr.confidence > 1 ? processed.ocr.confidence / 100 : processed.ocr.confidence
        : null;

      const validationScore = typeof validationResult.validation?.overall_score === 'number'
        ? validationResult.validation.overall_score
        : 100;

      let priority = reviewCase.is_duplicate ? 'HIGH' : 'LOW';
      if (validationScore < 50 || validationResult.validation?.status === 'FAIL') {
        priority = 'HIGH';
      } else if (validationScore < 80 || validationResult.validation?.status === 'WARNING') {
        priority = 'MEDIUM';
      }

      const anomalies = [];

      // Preserve existing duplicate anomalies
      if (Array.isArray(reviewCase.anomalies)) {
        for (const existingAnom of reviewCase.anomalies) {
          if (existingAnom.type === 'POSSIBLE_DUPLICATE_LAND_RECORD') {
            anomalies.push(existingAnom);
          }
        }
      }

      // Issues from AI validation service
      if (Array.isArray(validationResult.validation?.issues)) {
        for (const issue of validationResult.validation.issues) {
          anomalies.push({
            anomaly_id: `ANOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: issue.rule || issue.type || 'VALIDATION_ISSUE',
            field: issue.field || null,
            severity: issue.severity || 'WARNING',
            status: 'OPEN',
            source: 'AI_VALIDATION',
            title: issue.rule || 'Validation Finding',
            message: issue.message || 'Validation warning detected in extracted land record.',
            review_required: true,
            metadata: { issue },
          });
        }
      }

      // Low field confidence checks (< 60%)
      for (const [fieldName, fieldObj] of Object.entries(fields)) {
        if (typeof fieldObj === 'object' && fieldObj !== null && typeof fieldObj.confidence === 'number' && fieldObj.confidence < 0.6) {
          anomalies.push({
            anomaly_id: `ANOM-CONF-${fieldName}-${Date.now()}`,
            type: 'LOW_FIELD_CONFIDENCE',
            field: fieldName,
            severity: 'WARNING',
            status: 'OPEN',
            source: 'AI_CONFIDENCE_CHECK',
            title: `Low Confidence: ${fieldName}`,
            message: `Field '${fieldName}' was extracted with low confidence (${Math.round(fieldObj.confidence * 100)}%). Manual verification recommended.`,
            review_required: true,
            metadata: { field: fieldName, confidence: fieldObj.confidence },
          });
        }
      }

      // 3. Compare Citizen Submitted Data vs AI Extracted Data
      const citizenData = reviewCase.citizen_submitted_data || reviewCase.land_record?.citizen_submitted_data || {};
      const comparisons = [];

      // Survey Number
      const aiSurvey = getFieldValue(fields.survey_number);
      if (citizenData.survey_number && aiSurvey) {
        const match = String(citizenData.survey_number).trim().toLowerCase() === String(aiSurvey).trim().toLowerCase();
        comparisons.push({
          field: 'survey_number',
          label: 'Survey Number',
          citizen_value: citizenData.survey_number,
          ai_value: aiSurvey,
          status: match ? 'MATCH' : 'MISMATCH',
        });
        if (!match) {
          anomalies.push({
            anomaly_id: `ANOM-MISMATCH-SURVEY-${Date.now()}`,
            type: 'SURVEY_NUMBER_MISMATCH',
            field: 'survey_number',
            severity: 'WARNING',
            status: 'OPEN',
            source: 'DATA_COMPARISON',
            title: 'Survey Number Mismatch',
            message: `Citizen submitted '${citizenData.survey_number}', but AI extracted '${aiSurvey}'.`,
            review_required: true,
            metadata: { citizen_value: citizenData.survey_number, ai_value: aiSurvey },
          });
        }
      }

      // Owner Name
      const aiOwner = getFieldValue(fields.owner_name);
      if (citizenData.owner_name && aiOwner) {
        const match = String(citizenData.owner_name).trim().toLowerCase() === String(aiOwner).trim().toLowerCase();
        comparisons.push({
          field: 'owner_name',
          label: 'Owner Name',
          citizen_value: citizenData.owner_name,
          ai_value: aiOwner,
          status: match ? 'MATCH' : 'MISMATCH',
        });
        if (!match) {
          anomalies.push({
            anomaly_id: `ANOM-MISMATCH-OWNER-${Date.now()}`,
            type: 'OWNER_MISMATCH',
            field: 'owner_name',
            severity: 'WARNING',
            status: 'OPEN',
            source: 'DATA_COMPARISON',
            title: 'Owner Name Mismatch',
            message: `Citizen submitted '${citizenData.owner_name}', but AI extracted '${aiOwner}'.`,
            review_required: true,
            metadata: { citizen_value: citizenData.owner_name, ai_value: aiOwner },
          });
        }
      }

      // Area
      const parsedAiArea = parseAreaValue(fields.area);
      const parsedCitArea = parseAreaValue(citizenData.area);
      if (parsedCitArea.value != null && parsedAiArea.value != null) {
        const diff = Math.abs(parsedCitArea.value - parsedAiArea.value);
        const mismatch = diff > 0.05 * Math.max(parsedCitArea.value, parsedAiArea.value);
        comparisons.push({
          field: 'area',
          label: 'Area',
          citizen_value: `${parsedCitArea.value} ${parsedCitArea.unit || ''}`.trim(),
          ai_value: `${parsedAiArea.value} ${parsedAiArea.unit || ''}`.trim(),
          status: mismatch ? 'MISMATCH' : 'MATCH',
        });
        if (mismatch) {
          anomalies.push({
            anomaly_id: `ANOM-MISMATCH-AREA-${Date.now()}`,
            type: 'AREA_MISMATCH',
            field: 'area',
            severity: 'WARNING',
            status: 'OPEN',
            source: 'DATA_COMPARISON',
            title: 'Area Mismatch',
            message: `Citizen submitted '${parsedCitArea.value}', but AI extracted '${parsedAiArea.value}'.`,
            review_required: true,
            metadata: { citizen_value: parsedCitArea.value, ai_value: parsedAiArea.value },
          });
        }
      }

      // Location fields (Village, Taluk, District)
      for (const locField of ['village', 'taluk', 'district']) {
        const aiLoc = getFieldValue(fields[locField]);
        const citLoc = citizenData[locField];
        if (citLoc && aiLoc) {
          const match = String(citLoc).trim().toLowerCase() === String(aiLoc).trim().toLowerCase();
          comparisons.push({
            field: locField,
            label: locField.charAt(0).toUpperCase() + locField.slice(1),
            citizen_value: citLoc,
            ai_value: aiLoc,
            status: match ? 'MATCH' : 'MISMATCH',
          });
          if (!match) {
            anomalies.push({
              anomaly_id: `ANOM-MISMATCH-${locField.toUpperCase()}-${Date.now()}`,
              type: `${locField.toUpperCase()}_MISMATCH`,
              field: locField,
              severity: 'WARNING',
              status: 'OPEN',
              source: 'DATA_COMPARISON',
              title: `${locField.charAt(0).toUpperCase() + locField.slice(1)} Mismatch`,
              message: `Citizen submitted '${citLoc}', but AI extracted '${aiLoc}'.`,
              review_required: true,
            });
          }
        }
      }

      // 4. Survey Number Conflict with existing MySQL records
      const locVillage = getFieldValue(fields.village) || citizenData.village;
      const locTaluk = getFieldValue(fields.taluk) || citizenData.taluk;
      const locDistrict = getFieldValue(fields.district) || citizenData.district;

      if (aiSurvey && locVillage && locTaluk && locDistrict && typeof this.landRecords?.findExistingRecordByLocation === 'function') {
        const conflictRecord = await this.landRecords.findExistingRecordByLocation({
          surveyNumber: aiSurvey,
          village: locVillage,
          taluk: locTaluk,
          district: locDistrict,
          excludeRecordId: reviewCase.land_record_id,
        });

        if (conflictRecord) {
          anomalies.push({
            anomaly_id: `ANOM-CONFLICT-SURVEY-${Date.now()}`,
            type: 'POSSIBLE_SURVEY_NUMBER_CONFLICT',
            field: 'survey_number',
            severity: 'WARNING',
            status: 'OPEN',
            source: 'DATABASE_CONFLICT_CHECK',
            title: 'Possible Survey Number Conflict',
            message: `Survey Number '${aiSurvey}' is already registered for this location in an existing record. Officer review recommended.`,
            review_required: true,
            metadata: { matched_record_id: conflictRecord.id },
          });
        }
      }

      // 5. Clean date parsing for MySQL (never write zero dates or invalid dates)
      const rawDate = getFieldValue(fields.date) || getFieldValue(fields.document_date);
      const cleanRecordDate = parseDateForMySQL(rawDate);

      // 6. Update Land Record in MySQL
      if (reviewCase.land_record_id) {
        await this.landRecords.updateAiExtraction(reviewCase.land_record_id, {
          aiExtractedData: fields,
          ocrLanguage: processed.ocr?.language || req.body?.language || null,
          ocrConfidence,
          validationStatus: validationResult.validation.status || 'UNAVAILABLE',
          validationResult,
          recordDate: cleanRecordDate,
          aiStatus: 'COMPLETED',
        });
        await this.landRecords.createValidationResult(reviewCase.land_record_id, validationResult);
      }

      // 7. Update Review Case in MySQL
      const updatedCase = await this.reviews.updateAiResults(caseId, {
        aiConfidence: ocrConfidence,
        validationScore,
        validationResult,
        aiStatus: 'COMPLETED',
        caseData: {
          ...(reviewCase.case_data || {}),
          document_id: document.document_id,
          land_record: fields,
          validation_result: validationResult,
          citizen_submitted_data: citizenData,
          comparisons,
        },
        anomalies,
      });

      // 8. Update Document processing result
      const processingResult = {
        status: 'PENDING_OFFICER_VERIFICATION',
        document_id: document.document_id,
        ocr: {
          status: 'COMPLETED',
          language: processed.ocr?.language || req.body?.language || null,
          confidence: ocrConfidence,
        },
        extraction: fields,
        ai_extracted_data: fields,
        citizen_submitted_data: citizenData,
        comparisons,
        validation: validationResult,
      };

      await this.documents.saveProcessingResult(document.document_id, processingResult);
      await this.documents.updateDocumentStatus(document.document_id, 'PROCESSED');

      // 9. Audit event
      await this.audit.logAuditEvent({
        eventType: 'OFFICER_AI_DOCUMENT_PROCESSED',
        actorType: req.user?.primary_role || 'OFFICER',
        actorReference: req.user?.id || 'OFFICER',
        caseId,
        metadata: {
          case_id: caseId,
          document_id: document.document_id,
          land_record_id: reviewCase.land_record_id,
          ocr_confidence: ocrConfidence,
          validation_score: validationScore,
          anomalies_count: anomalies.length,
          comparisons_count: comparisons.length,
        },
      });

      return {
        case: updatedCase,
        land_record: await this.landRecords.findById(reviewCase.land_record_id),
        comparisons,
        anomalies,
        ai_status: 'COMPLETED',
      };
    } catch (error) {
      logger.error('Officer AI document processing failed', {
        case_id: caseId,
        document_id: document.document_id,
        error_type: error.name || 'Error',
        error_code: error.code || 'UNKNOWN_ERROR',
        error_message: error.message,
      });

      // AI failure handling: The application and document are NOT deleted!
      await this.reviews.updateAiStatus(caseId, 'FAILED');
      if (reviewCase.land_record_id) {
        await this.landRecords.updateAiStatus(reviewCase.land_record_id, 'FAILED');
      }
      await this.documents.updateDocumentStatus(document.document_id, 'FAILED');

      await this.audit.logAuditEvent({
        eventType: 'OFFICER_AI_PROCESSING_FAILED',
        actorType: req.user?.primary_role || 'OFFICER',
        actorReference: req.user?.id || 'OFFICER',
        caseId,
        metadata: {
          case_id: caseId,
          document_id: document.document_id,
          error_message: error.message,
        },
      });

      throw pipelineError(
        error.statusCode || 502,
        error.code || 'AI_PROCESSING_FAILED',
        `AI document processing failed: ${error.message}. You can retry AI processing.`,
        error
      );
    }
  }

  /**
   * Legacy pipeline execution for existing integration tests.
   */
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

    let stage = 'INITIALIZATION';
    try {
      stage = 'STATUS_UPDATE_PROCESSING';
      await this.documents.updateDocumentStatus(document.document_id, 'PROCESSING');

      stage = 'AI_DOCUMENT_PROCESSING';
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

      stage = 'AI_VALIDATION';
      const citizenSubmittedData = parseCitizenSubmittedData(req.body || {});
      const validationResult = await this.ai.validateLandRecord(fields);
      if (!validationResult.validation || typeof validationResult.validation !== 'object') {
        throw pipelineError(502, 'AI_INVALID_VALIDATION', 'AI validation did not return a validation result.');
      }

      let gisResult = null;
      if (geometry) {
        stage = 'AI_GIS_VALIDATION';
        gisResult = await this.ai.validateGIS({ landRecord: fields, geometry, crs });
      }

      const ocrConfidence = typeof processed.ocr?.confidence === 'number'
        ? processed.ocr.confidence > 1 ? processed.ocr.confidence / 100 : processed.ocr.confidence
        : null;
      const workflowStatus = 'PENDING_OFFICER_VERIFICATION';

      // Check duplicate on location
      const dupCheck = await this.checkDuplicateLandRecord({
        surveyNumber: citizenSubmittedData.survey_number || getFieldValue(fields.survey_number),
        village: citizenSubmittedData.village || getFieldValue(fields.village),
        taluk: citizenSubmittedData.taluk || getFieldValue(fields.taluk),
        district: citizenSubmittedData.district || getFieldValue(fields.district),
      });

      stage = 'AI_LAND_RECORD_PERSISTENCE';
      const parsedArea = parseAreaValue(fields.area);
      const rawDate = getFieldValue(fields.date) || getFieldValue(fields.document_date);
      const cleanRecordDate = parseDateForMySQL(rawDate);

      const landRecordData = {
        record_reference: `REC-${document.document_id}`,
        owner_name: getFieldValue(fields.owner_name),
        survey_number: getFieldValue(fields.survey_number),
        subdivision_number: getFieldValue(fields.subdivision_number),
        khasra_number: getFieldValue(fields.khasra_number),
        khata_number: getFieldValue(fields.khata_number),
        patta_number: getFieldValue(fields.patta_number),
        document_number: getFieldValue(fields.document_number),
        co_owners: Array.isArray(fields.co_owners) ? fields.co_owners : fields.co_owners?.value || [],
        area_value: parsedArea.value,
        area_unit: parsedArea.unit,
        village: getFieldValue(fields.village),
        taluk: getFieldValue(fields.taluk),
        district: getFieldValue(fields.district),
        state: getFieldValue(fields.state),
        pincode: getFieldValue(fields.pincode),
        classification: getFieldValue(fields.classification),
        record_date: cleanRecordDate,
        source_document_id: document.document_id,
        ocr_language: processed.ocr?.language || req.body?.language || null,
        ocr_confidence: ocrConfidence,
        validation_status: validationResult.validation.status || 'UNAVAILABLE',
        validation_result: validationResult,
        status: 'AI_GENERATED',
        verification_status: workflowStatus,
        fields,
        is_duplicate: dupCheck.isDuplicate,
        duplicate_reason: dupCheck.message,
        ai_status: 'COMPLETED',
        citizen_submitted_data: citizenSubmittedData,
        ai_extracted_data: fields,
      };

      const savedLandRecord = await this.landRecords.create(landRecordData);
      await this.documents.updateDocumentLandRecord(document.document_id, savedLandRecord.id);
      await this.landRecords.createValidationResult(savedLandRecord.id, validationResult);

      stage = 'AI_REVIEW_CASE_CREATION';
      const validationScore = typeof validationResult.validation?.overall_score === 'number'
        ? validationResult.validation.overall_score
        : 100;

      let priority = dupCheck.isDuplicate ? 'HIGH' : 'LOW';
      if (validationScore < 50 || validationResult.validation?.status === 'FAIL') {
        priority = 'HIGH';
      } else if (validationScore < 80 || validationResult.validation?.status === 'WARNING') {
        priority = 'MEDIUM';
      }

      const anomalies = [];
      if (dupCheck.isDuplicate) {
        anomalies.push({
          anomaly_id: `ANOM-DUP-${Date.now()}`,
          type: 'POSSIBLE_DUPLICATE_LAND_RECORD',
          field: 'survey_number',
          severity: 'WARNING',
          status: 'OPEN',
          source: 'SYSTEM',
          title: 'Possible Duplicate Land Record',
          message: dupCheck.message,
          review_required: true,
        });
      }
      if (Array.isArray(validationResult.validation?.issues)) {
        for (const issue of validationResult.validation.issues) {
          anomalies.push({
            anomaly_id: `ANOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: issue.rule || issue.type || 'VALIDATION_ISSUE',
            field: issue.field || null,
            severity: issue.severity || 'WARNING',
            status: 'OPEN',
            source: 'AI_VALIDATION',
            title: issue.rule || 'Validation Finding',
            message: issue.message || 'Validation warning detected in extracted land record.',
            review_required: true,
            metadata: { issue },
          });
        }
      }

      // Low field confidence checks (< 60%)
      for (const [fieldName, fieldObj] of Object.entries(fields)) {
        if (typeof fieldObj === 'object' && fieldObj !== null && typeof fieldObj.confidence === 'number' && fieldObj.confidence < 0.6) {
          anomalies.push({
            anomaly_id: `ANOM-CONF-${fieldName}-${Date.now()}`,
            type: 'LOW_FIELD_CONFIDENCE',
            field: fieldName,
            severity: 'WARNING',
            status: 'OPEN',
            source: 'AI_CONFIDENCE_CHECK',
            title: `Low Confidence: ${fieldName}`,
            message: `Field '${fieldName}' was extracted with low confidence (${Math.round(fieldObj.confidence * 100)}%). Manual verification recommended.`,
            review_required: true,
            metadata: { field: fieldName, confidence: fieldObj.confidence },
          });
        }
      }

      const reviewCase = await this.reviews.createCase({
        document_id: document.document_id,
        land_record_id: savedLandRecord.id,
        status: 'PENDING_REVIEW',
        priority,
        validation_score: validationScore,
        review_required: true,
        is_duplicate: dupCheck.isDuplicate,
        duplicate_reason: dupCheck.message,
        ai_status: 'COMPLETED',
        case_data: {
          document_id: document.document_id,
          land_record: fields,
          validation_result: validationResult,
          gis_result: gisResult,
          citizen_submitted_data: citizenSubmittedData,
        },
        ai_confidence: ocrConfidence,
        validation_result: validationResult,
        anomalies,
      });

      stage = 'RESULT_PERSISTENCE';
      const hasCitizenData = Object.keys(citizenSubmittedData || {}).length > 0;
      const statusValue = hasCitizenData ? 'PENDING_OFFICER_VERIFICATION' : 'PROCESSED';
      const result = {
        status: statusValue,
        document_status: statusValue,
        document: {
          document_id: document.document_id,
          filename: document.original_filename,
          file_type: document.file_type,
          mime_type: document.mime_type,
          file_size: document.file_size,
          status: 'PROCESSED',
          land_record_id: savedLandRecord.id,
        },
        ocr: {
          status: 'COMPLETED',
          language: processed.ocr?.language || req.body?.language || null,
          confidence: ocrConfidence,
        },
        extraction: fields,
        ai_extracted_data: {
          owner_name: getFieldValue(fields.owner_name),
          survey_number: getFieldValue(fields.survey_number),
          area: getFieldValue(fields.area),
          aadhaar_number: getFieldValue(fields.aadhaar_number),
          village: getFieldValue(fields.village),
          taluk: getFieldValue(fields.taluk),
          district: getFieldValue(fields.district),
        },
        citizen_submitted_data: citizenSubmittedData,
        land_record: {
          ...savedLandRecord,
          status: 'AI_GENERATED',
          owner_name: getFieldValue(fields.owner_name),
          survey_number: getFieldValue(fields.survey_number),
          area_value: parsedArea.value,
          village: getFieldValue(fields.village),
        },
        validation: {
          status: validationResult.validation.status || 'UNAVAILABLE',
          score: validationResult.validation.overall_score ?? null,
          issues: validationResult.validation.issues || [],
          review_required: validationResult.validation?.review_required ?? true,
        },
        gis: gisResult ? {
          status: 'VALID',
          area_match: gisResult.gis_validation?.classification || 'MINOR_VARIANCE',
          overlaps: [],
          result: gisResult,
        } : { status: 'UNAVAILABLE' },
        review: {
          required: true,
          case_id: reviewCase?.case_id || null,
          status: reviewCase?.status || 'PENDING_REVIEW',
        },
      };

      await this.documents.saveProcessingResult(document.document_id, result);
      await this.documents.updateDocumentStatus(document.document_id, 'PROCESSED');

      return result;
    } catch (error) {
      if (document?.document_id) {
        error.details = { ...(error.details || {}), document_id: document.document_id, processing_stage: stage };
      }
      logger.error('Document processing pipeline failure', {
        document_id: document?.document_id,
        processing_stage: stage,
        error_type: error.name || 'Error',
        error_code: error.code || 'UNKNOWN_ERROR',
        error_message: error.message,
      });
      try {
        await this.documents.updateDocumentStatus(document.document_id, 'FAILED');
      } catch (_) {}
      throw error;
    }
  }
}

module.exports = {
  LandRecordPipelineService,
  landRecordPipelineService: new LandRecordPipelineService(),
  parseGeometry,
};
