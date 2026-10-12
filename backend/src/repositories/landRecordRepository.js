const crypto = require('crypto');
const { pool } = require('../config/database');
const { parseDateForMySQL } = require('../utils/date');

class InMemoryLandRecordRepository {
  constructor() {
    this.records = new Map();
    this.fields = new Map(); // land_record_id -> array of fields
    this.validationResults = new Map();
  }

  async create(recordData) {
    const id = recordData.id || crypto.randomUUID();
    const record = {
      id,
      record_reference: recordData.record_reference || `REC-${Date.now()}`,
      owner_name: recordData.owner_name || null,
      survey_number: recordData.survey_number || null,
      subdivision_number: recordData.subdivision_number || null,
      khasra_number: recordData.khasra_number || null,
      khata_number: recordData.khata_number || null,
      patta_number: recordData.patta_number || null,
      document_number: recordData.document_number || null,
      co_owners: recordData.co_owners || [],
      area_value: recordData.area_value != null ? Number(recordData.area_value) : null,
      area_unit: recordData.area_unit || null,
      village: recordData.village || null,
      taluk: recordData.taluk || null,
      district: recordData.district || null,
      state: recordData.state || null,
      pincode: recordData.pincode || null,
      classification: recordData.classification || null,
      record_date: parseDateForMySQL(recordData.record_date),
      is_duplicate: recordData.is_duplicate ? 1 : 0,
      duplicate_reason: recordData.duplicate_reason || null,
      ai_status: recordData.ai_status || 'NOT_STARTED',
      status: recordData.status || 'AI_GENERATED',
      verification_status: recordData.verification_status || 'AI_GENERATED',
      verified_by: recordData.verified_by || null,
      verified_at: recordData.verified_at || null,
      officer_notes: recordData.officer_notes || null,
      source_document_id: recordData.source_document_id || null,
      ocr_language: recordData.ocr_language || null,
      ocr_confidence: recordData.ocr_confidence != null ? Number(recordData.ocr_confidence) : null,
      validation_status: recordData.validation_status || null,
      validation_result: recordData.validation_result || null,
      citizen_submitted_data: recordData.citizen_submitted_data || null,
      ai_extracted_data: recordData.ai_extracted_data || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.records.set(id, record);

    if (recordData.fields && typeof recordData.fields === 'object') {
      const fieldList = [];
      for (const [name, val] of Object.entries(recordData.fields)) {
        const item = typeof val === 'object' && val !== null ? val : { value: val };
        fieldList.push({
          id: crypto.randomUUID(),
          land_record_id: id,
          field_name: name,
          field_value: item,
          confidence: item.confidence != null ? Number(item.confidence) : null,
          source: item.source || item.method || 'AI_OCR_EXTRACTION',
          source_page: item.source_page || item.page || 1,
          source_bbox: item.source_bbox || null,
          created_at: new Date().toISOString(),
        });
      }
      this.fields.set(id, fieldList);
    }

    return this.findById(id);
  }

  async findById(id) {
    const record = this.records.get(id);
    if (!record) return null;
    const fields = this.fields.get(id) || [];
    return {
      ...record,
      fields: fields.reduce((acc, f) => {
        acc[f.field_name] = f.field_value;
        return acc;
      }, {}),
      field_records: [...fields],
    };
  }

  async findByReference(recordReference) {
    for (const record of this.records.values()) {
      if (record.record_reference === recordReference) {
        return this.findById(record.id);
      }
    }
    return null;
  }

  async findExistingRecordByLocation({ surveyNumber, village, taluk, district, excludeRecordId = null }) {
    if (!surveyNumber || !village || !taluk || !district) return null;
    const sNorm = String(surveyNumber).trim().toLowerCase();
    const vNorm = String(village).trim().toLowerCase();
    const tNorm = String(taluk).trim().toLowerCase();
    const dNorm = String(district).trim().toLowerCase();

    for (const record of this.records.values()) {
      if (excludeRecordId && record.id === excludeRecordId) continue;
      if (
        String(record.survey_number || '').trim().toLowerCase() === sNorm &&
        String(record.village || '').trim().toLowerCase() === vNorm &&
        String(record.taluk || '').trim().toLowerCase() === tNorm &&
        String(record.district || '').trim().toLowerCase() === dNorm
      ) {
        return this.findById(record.id);
      }
    }
    return null;
  }

  async updateAiExtraction(id, { aiExtractedData, ocrLanguage, ocrConfidence, validationStatus, validationResult, recordDate, aiStatus = 'COMPLETED' }) {
    const record = this.records.get(id);
    if (!record) return null;
    if (aiExtractedData) record.ai_extracted_data = aiExtractedData;
    if (ocrLanguage) record.ocr_language = ocrLanguage;
    if (ocrConfidence != null) record.ocr_confidence = Number(ocrConfidence);
    if (validationStatus) record.validation_status = validationStatus;
    if (validationResult) record.validation_result = validationResult;
    const parsedDate = parseDateForMySQL(recordDate);
    if (parsedDate) record.record_date = parsedDate;
    record.ai_status = aiStatus;
    record.updated_at = new Date().toISOString();
    return this.findById(id);
  }

  async updateAiStatus(id, aiStatus) {
    const record = this.records.get(id);
    if (!record) return null;
    record.ai_status = aiStatus;
    record.updated_at = new Date().toISOString();
    return this.findById(id);
  }

  async createValidationResult(landRecordId, validationResult) {
    const results = this.validationResults.get(landRecordId) || [];
    results.push(validationResult);
    this.validationResults.set(landRecordId, results);
  }

  async updateVerification(id, { status = 'VERIFIED', verifiedBy, verifiedAt = new Date().toISOString(), officerNotes = '' }) {
    const record = this.records.get(id);
    if (!record) return null;
    record.status = status;
    record.verification_status = status;
    record.verified_by = verifiedBy;
    record.verified_at = verifiedAt;
    if (officerNotes) record.officer_notes = officerNotes;
    record.updated_at = new Date().toISOString();
    return this.findById(id);
  }

  async updateStatus(id, status, { verifiedBy = null, officerNotes = '' } = {}) {
    return this.updateVerification(id, { status, verifiedBy, officerNotes });
  }

  async updateField(id, fieldName, value) {
    const record = this.records.get(id);
    if (!record) return null;

    if (fieldName in record) {
      record[fieldName] = value;
    }

    const fields = this.fields.get(id) || [];
    const existingIndex = fields.findIndex((f) => f.field_name === fieldName);
    const updatedFieldValue = {
      value,
      confidence: 1.0,
      source: 'OFFICER_VERIFIED_CORRECTION',
      source_page: 1,
    };

    if (existingIndex >= 0) {
      fields[existingIndex].field_value = updatedFieldValue;
      fields[existingIndex].confidence = 1.0;
      fields[existingIndex].source = 'OFFICER_VERIFIED_CORRECTION';
    } else {
      fields.push({
        id: crypto.randomUUID(),
        land_record_id: id,
        field_name: fieldName,
        field_value: updatedFieldValue,
        confidence: 1.0,
        source: 'OFFICER_VERIFIED_CORRECTION',
        created_at: new Date().toISOString(),
      });
    }

    record.updated_at = new Date().toISOString();
    return this.findById(id);
  }
}

class MySQLLandRecordRepository {
  constructor(databasePool) {
    if (!databasePool) {
      throw new Error('A MySQL pool is required.');
    }
    this.pool = databasePool;
  }

  parseJsonValue(value) {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return value;
    }
  }

  async create(recordData) {
    const id = recordData.id || crypto.randomUUID();
    const recordRef = recordData.record_reference || `REC-${Date.now()}`;
    const recordDate = parseDateForMySQL(recordData.record_date);
    const isDuplicate = recordData.is_duplicate ? 1 : 0;
    const duplicateReason = recordData.duplicate_reason || null;
    const aiStatus = recordData.ai_status || 'NOT_STARTED';

    const query = `
      INSERT INTO land_records (
        id, record_reference, owner_name, survey_number, subdivision_number,
        khasra_number, khata_number, patta_number, document_number, co_owners,
        area_value, area_unit, village, taluk, district, state, pincode,
        classification, record_date, is_duplicate, duplicate_reason, ai_status,
        source_document_id, ocr_language, ocr_confidence, validation_status,
        validation_result, citizen_submitted_data, ai_extracted_data,
        status, verification_status, verified_by, verified_at, officer_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))
    `;

    await this.pool.query(query, [
      id,
      recordRef,
      recordData.owner_name || null,
      recordData.survey_number || null,
      recordData.subdivision_number || null,
      recordData.khasra_number || null,
      recordData.khata_number || null,
      recordData.patta_number || null,
      recordData.document_number || null,
      recordData.co_owners ? JSON.stringify(recordData.co_owners) : null,
      recordData.area_value != null ? Number(recordData.area_value) : null,
      recordData.area_unit || null,
      recordData.village || null,
      recordData.taluk || null,
      recordData.district || null,
      recordData.state || null,
      recordData.pincode || null,
      recordData.classification || null,
      recordDate,
      isDuplicate,
      duplicateReason,
      aiStatus,
      recordData.source_document_id || null,
      recordData.ocr_language || null,
      recordData.ocr_confidence != null ? Number(recordData.ocr_confidence) : null,
      recordData.validation_status || null,
      recordData.validation_result ? JSON.stringify(recordData.validation_result) : null,
      recordData.citizen_submitted_data ? JSON.stringify(recordData.citizen_submitted_data) : null,
      recordData.ai_extracted_data ? JSON.stringify(recordData.ai_extracted_data) : null,
      recordData.status || 'AI_GENERATED',
      recordData.verification_status || 'AI_GENERATED',
      recordData.verified_by || null,
      recordData.verified_at ? new Date(recordData.verified_at) : null,
      recordData.officer_notes || null,
    ]);

    if (recordData.fields && typeof recordData.fields === 'object') {
      for (const [name, val] of Object.entries(recordData.fields)) {
        const item = typeof val === 'object' && val !== null ? val : { value: val };
        const fieldQuery = `
          INSERT INTO land_record_fields (
            id, land_record_id, field_name, field_value, confidence,
            source, source_page, source_bbox, created_at
          ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW(6))
        `;
        await this.pool.query(fieldQuery, [
          id,
          name,
          JSON.stringify(item),
          item.confidence != null ? Number(item.confidence) : null,
          item.source || item.method || 'AI_OCR_EXTRACTION',
          item.source_page || item.page || 1,
          item.source_bbox ? JSON.stringify(item.source_bbox) : null,
        ]);
      }
    }

    return this.findById(id);
  }

  async findById(id) {
    const query = 'SELECT * FROM land_records WHERE id = ?';
    const res = await this.pool.query(query, [id]);
    const record = res.rows[0];
    if (!record) return null;

    const fieldsRes = await this.pool.query(
      'SELECT id, field_name, field_value, confidence, source, source_page, source_bbox, created_at FROM land_record_fields WHERE land_record_id = ? ORDER BY created_at ASC',
      [id]
    );

    const fieldMap = {};
    for (const f of fieldsRes.rows) {
      fieldMap[f.field_name] = f.field_value;
    }

    return {
      ...record,
      fields: fieldMap,
      field_records: fieldsRes.rows,
      citizen_submitted_data: this.parseJsonValue(record.citizen_submitted_data),
      ai_extracted_data: this.parseJsonValue(record.ai_extracted_data),
    };
  }

  async findByReference(recordReference) {
    const query = 'SELECT id FROM land_records WHERE record_reference = ?';
    const res = await this.pool.query(query, [recordReference]);
    if (!res.rows[0]) return null;
    return this.findById(res.rows[0].id);
  }

  async findExistingRecordByLocation({ surveyNumber, village, taluk, district, excludeRecordId = null }) {
    if (!surveyNumber || !village || !taluk || !district) return null;
    let query = `
      SELECT id, record_reference, owner_name, survey_number, area_value, area_unit,
             village, taluk, district, status, verification_status, is_duplicate, duplicate_reason, created_at
      FROM land_records
      WHERE LOWER(TRIM(survey_number)) = LOWER(TRIM(?))
        AND LOWER(TRIM(village)) = LOWER(TRIM(?))
        AND LOWER(TRIM(taluk)) = LOWER(TRIM(?))
        AND LOWER(TRIM(district)) = LOWER(TRIM(?))
    `;
    const params = [surveyNumber, village, taluk, district];
    if (excludeRecordId) {
      query += ' AND id != ?';
      params.push(excludeRecordId);
    }
    query += ' ORDER BY created_at ASC LIMIT 1';
    const res = await this.pool.query(query, params);
    return res.rows[0] || null;
  }

  async updateAiExtraction(id, { aiExtractedData, ocrLanguage, ocrConfidence, validationStatus, validationResult, recordDate, aiStatus = 'COMPLETED' }) {
    const cleanDate = parseDateForMySQL(recordDate);
    const query = `
      UPDATE land_records
      SET ai_extracted_data = ?,
          ocr_language = ?,
          ocr_confidence = ?,
          validation_status = ?,
          validation_result = ?,
          record_date = COALESCE(?, record_date),
          ai_status = ?,
          updated_at = NOW(6)
      WHERE id = ?
    `;
    await this.pool.query(query, [
      aiExtractedData ? JSON.stringify(aiExtractedData) : null,
      ocrLanguage || null,
      ocrConfidence != null ? Number(ocrConfidence) : null,
      validationStatus || null,
      validationResult ? JSON.stringify(validationResult) : null,
      cleanDate,
      aiStatus,
      id,
    ]);

    if (aiExtractedData && typeof aiExtractedData === 'object') {
      for (const [name, val] of Object.entries(aiExtractedData)) {
        const item = typeof val === 'object' && val !== null ? val : { value: val };
        const fieldQuery = `
          INSERT INTO land_record_fields (
            id, land_record_id, field_name, field_value, confidence,
            source, source_page, source_bbox, created_at
          ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW(6))
          ON DUPLICATE KEY UPDATE
            field_value = VALUES(field_value),
            confidence = VALUES(confidence),
            source = VALUES(source),
            source_page = VALUES(source_page),
            source_bbox = VALUES(source_bbox)
        `;
        await this.pool.query(fieldQuery, [
          id,
          name,
          JSON.stringify(item),
          item.confidence != null ? Number(item.confidence) : null,
          item.source || item.method || 'AI_OCR_EXTRACTION',
          item.source_page || item.page || 1,
          item.source_bbox ? JSON.stringify(item.source_bbox) : null,
        ]);
      }
    }

    return this.findById(id);
  }

  async updateAiStatus(id, aiStatus) {
    await this.pool.query('UPDATE land_records SET ai_status = ?, updated_at = NOW(6) WHERE id = ?', [aiStatus, id]);
    return this.findById(id);
  }

  async updateVerification(id, { status = 'VERIFIED', verifiedBy, verifiedAt = new Date(), officerNotes = '' }) {
    const isApprovedOrVerified = ['VERIFIED', 'GOVERNMENT_APPROVED', 'APPROVED'].includes(status);
    const query = `
      UPDATE land_records
      SET status = ?, verification_status = ?,
          verified_by = IF(?, ?, NULL),
          verified_at = IF(?, ?, NULL),
          officer_notes = COALESCE(?, officer_notes), updated_at = NOW(6)
      WHERE id = ?
    `;
    await this.pool.query(query, [
      status, status,
      isApprovedOrVerified ? 1 : 0, verifiedBy || null,
      isApprovedOrVerified ? 1 : 0, verifiedAt || null,
      officerNotes || null, id
    ]);
    return this.findById(id);
  }

  async updateStatus(id, status, { verifiedBy = null, officerNotes = '' } = {}) {
    return this.updateVerification(id, { status, verifiedBy, officerNotes });
  }

  async createValidationResult(landRecordId, validationResult) {
    await this.pool.query(
      `INSERT INTO validation_results
        (id, land_record_id, status, score, review_required, result_json, created_at)
       VALUES (UUID(), ?, ?, ?, ?, ?, NOW(6))`,
      [
        landRecordId,
        validationResult.validation?.status || 'UNAVAILABLE',
        validationResult.validation?.overall_score ?? null,
        validationResult.validation?.review_required ? 1 : 0,
        JSON.stringify(validationResult),
      ],
    );
  }

  async updateField(id, fieldName, value) {
    // Check if column exists in land_records table
    const safeColumns = [
      'owner_name', 'survey_number', 'subdivision_number', 'khasra_number',
      'khata_number', 'patta_number', 'document_number', 'village',
      'taluk', 'district', 'state', 'pincode', 'classification', 'record_date',
    ];

    if (fieldName === 'record_date' || fieldName === 'date') {
      const cleanDate = parseDateForMySQL(value);
      await this.pool.query('UPDATE land_records SET record_date = ?, updated_at = NOW(6) WHERE id = ?', [cleanDate, id]);
    } else if (safeColumns.includes(fieldName)) {
      await this.pool.query(`UPDATE land_records SET ${fieldName} = ?, updated_at = NOW(6) WHERE id = ?`, [value, id]);
    } else if (fieldName === 'area' || fieldName === 'area_value') {
      const numVal = typeof value === 'number' ? value : parseFloat(value);
      if (!isNaN(numVal)) {
        await this.pool.query('UPDATE land_records SET area_value = ?, updated_at = NOW(6) WHERE id = ?', [numVal, id]);
      }
    }

    const updatedFieldValue = {
      value,
      confidence: 1.0,
      source: 'OFFICER_VERIFIED_CORRECTION',
      source_page: 1,
    };

    const updateFieldQuery = `
      INSERT INTO land_record_fields (id, land_record_id, field_name, field_value, confidence, source, source_page, created_at)
      VALUES (UUID(), ?, ?, ?, 1.0, 'OFFICER_VERIFIED_CORRECTION', 1, NOW(6))
      ON DUPLICATE KEY UPDATE
        field_value = VALUES(field_value),
        confidence = 1.0,
        source = 'OFFICER_VERIFIED_CORRECTION'
    `;
    await this.pool.query(updateFieldQuery, [id, fieldName, JSON.stringify(updatedFieldValue)]);

    return this.findById(id);
  }
}

const landRecordRepository = new MySQLLandRecordRepository(pool);

module.exports = {
  InMemoryLandRecordRepository,
  MySQLLandRecordRepository,
  landRecordRepository,
};
