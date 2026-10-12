const crypto = require('crypto');
const { pool } = require('../config/database');
const { auditRepository } = require('./auditRepository');

class InMemoryReviewRepository {
  constructor() {
    this.cases = new Map();
    this.anomalies = new Map(); // case_id -> []
    this.corrections = new Map(); // case_id -> []
    this.notes = new Map(); // case_id -> []
  }

  async createCase(caseData) {
    const caseId = caseData.case_id || `CASE-${String(this.cases.size + 1).padStart(6, '0')}`;
    const newCase = {
      case_id: caseId,
      document_id: caseData.document_id,
      land_record_id: caseData.land_record_id || null,
      status: caseData.status || 'PENDING_REVIEW',
      priority: caseData.priority || 'MEDIUM',
      validation_score: caseData.validation_score != null ? Number(caseData.validation_score) : 100,
      review_required: Boolean(caseData.review_required),
      is_duplicate: caseData.is_duplicate ? 1 : 0,
      duplicate_reason: caseData.duplicate_reason || null,
      ai_status: caseData.ai_status || 'NOT_STARTED',
      case_data: caseData.case_data || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.cases.set(caseId, newCase);

    const anomalyList = [];
    if (Array.isArray(caseData.anomalies)) {
      for (const a of caseData.anomalies) {
        anomalyList.push({
          anomaly_id: a.anomaly_id || `ANOM-${crypto.randomUUID()}`,
          case_id: caseId,
          type: a.type || a.anomaly_type || 'VALIDATION_ISSUE',
          field: a.field || null,
          severity: a.severity || 'WARNING',
          status: a.status || 'OPEN',
          source: a.source || 'SYSTEM',
          title: a.title || null,
          message: a.message || 'Review required',
          review_required: a.review_required !== false,
          metadata: a.metadata || {},
          created_at: new Date().toISOString(),
          resolved_at: null,
        });
      }
    }
    this.anomalies.set(caseId, anomalyList);
    this.corrections.set(caseId, []);
    this.notes.set(caseId, []);

    return this.findById(caseId);
  }

  async create(caseData) {
    const docId = caseData.document_id || caseData.documentId || `DOC-${crypto.randomUUID()}`;
    return this.createCase({
      ...caseData,
      document_id: docId,
      land_record_id: caseData.land_record_id || caseData.landRecordId || null,
      status: caseData.status || 'PENDING_OFFICER_REVIEW',
      priority: caseData.priority || 'MEDIUM',
      case_data: {
        ...(caseData.case_data || {}),
        citizen_submitted_data: caseData.citizenSubmittedData || caseData.citizen_submitted_data || {},
        ...(caseData.citizenSubmittedData || {}),
      },
    });
  }

  async findById(caseId) {
    const c = this.cases.get(caseId);
    if (!c) return null;
    return {
      ...c,
      anomalies: this.anomalies.get(caseId) || [],
      corrections: this.corrections.get(caseId) || [],
      notes: this.notes.get(caseId) || [],
    };
  }

  async findByDocumentId(documentId) {
    for (const c of this.cases.values()) {
      if (c.document_id === documentId) {
        return this.findById(c.case_id);
      }
    }
    return null;
  }

  async findAll({ status = null, priority = null, state = null, district = null } = {}) {
    const list = [];
    for (const c of this.cases.values()) {
      if (status && c.status !== status) continue;
      if (priority && c.priority !== priority) continue;
      const cState = c.state || c.citizen_submitted_data?.state || 'Tamil Nadu';
      const cDistrict = c.district || c.citizen_submitted_data?.district || null;
      if (state && String(cState).trim().toLowerCase() !== String(state).trim().toLowerCase()) continue;
      if (district && String(cDistrict).trim().toLowerCase() !== String(district).trim().toLowerCase()) continue;
      list.push(await this.findById(c.case_id));
    }
    return list;
  }

  async updateStatus(caseId, status, { rejectionReason = null, officerId = null, reason = null } = {}) {
    const c = this.cases.get(caseId);
    if (!c) return null;
    c.status = status;
    if (rejectionReason) c.rejection_reason = rejectionReason;
    if (reason) c.status_reason = reason;
    c.updated_at = new Date().toISOString();
    return this.findById(caseId);
  }

  async updateAiResults(caseId, { aiConfidence, validationScore, validationResult, aiStatus = 'COMPLETED', caseData = null, anomalies = [] } = {}) {
    const c = this.cases.get(caseId);
    if (!c) return null;
    if (aiConfidence != null) c.ai_confidence = Number(aiConfidence);
    if (validationScore != null) c.validation_score = Number(validationScore);
    if (validationResult) c.validation_result = validationResult;
    c.ai_status = aiStatus;
    if (caseData) c.case_data = { ...(c.case_data || {}), ...caseData };
    c.updated_at = new Date().toISOString();

    if (Array.isArray(anomalies) && anomalies.length > 0) {
      const existing = this.anomalies.get(caseId) || [];
      existing.push(...anomalies);
      this.anomalies.set(caseId, existing);
    }
    return this.findById(caseId);
  }

  async updateAiStatus(caseId, aiStatus) {
    const c = this.cases.get(caseId);
    if (!c) return null;
    c.ai_status = aiStatus;
    c.updated_at = new Date().toISOString();
    return this.findById(caseId);
  }

  async addCorrection({ caseId, anomalyId = null, field, originalValue, correctedValue, reason, officerId }) {
    const correction = {
      id: `CORR-${Date.now()}`,
      case_id: caseId,
      anomaly_id: anomalyId,
      field,
      original_value: originalValue,
      corrected_value: correctedValue,
      reason: reason || 'Officer manual correction',
      officer_id: officerId,
      created_at: new Date().toISOString(),
    };
    const list = this.corrections.get(caseId) || [];
    list.push(correction);
    this.corrections.set(caseId, list);

    const c = this.cases.get(caseId);
    if (c) {
      c.status = 'CORRECTION_REQUIRED';
      c.updated_at = new Date().toISOString();
    }
    return correction;
  }

  async addNote({ caseId, officerId, note }) {
    const noteRecord = {
      id: `NOTE-${Date.now()}`,
      case_id: caseId,
      officer_id: officerId,
      note,
      created_at: new Date().toISOString(),
    };
    const list = this.notes.get(caseId) || [];
    list.push(noteRecord);
    this.notes.set(caseId, list);
    return noteRecord;
  }

  async resolveAnomaly(caseId, anomalyId) {
    const list = this.anomalies.get(caseId) || [];
    const anom = list.find((a) => a.anomaly_id === anomalyId);
    if (!anom) return null;
    anom.status = 'RESOLVED';
    anom.resolved_at = new Date().toISOString();
    return anom;
  }

  async getStats() {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let onHold = 0;
    let inReview = 0;

    for (const c of this.cases.values()) {
      if (c.status === 'APPROVED') approved += 1;
      else if (c.status === 'REJECTED') rejected += 1;
      else if (c.status === 'ON_HOLD') onHold += 1;
      else if (c.status === 'IN_REVIEW') inReview += 1;
      else pending += 1;
    }

    return {
      pending_reviews: pending,
      in_review: inReview,
      approved_reviews: approved,
      rejected_reviews: rejected,
      on_hold_reviews: onHold,
      total_reviews: this.cases.size,
    };
  }
}

class MySQLReviewRepository {
  constructor(databasePool) {
    if (!databasePool) {
      throw new Error('A MySQL pool is required.');
    }
    this.pool = databasePool;
  }

  async nextCaseId() {
    const res = await this.pool.query('SELECT COUNT(*) AS total FROM review_cases');
    const count = Number(res.rows[0]?.total || 0) + 1;
    return `DLR-2026-${String(count).padStart(6, '0')}`;
  }

  async create(caseData) {
    let documentId = caseData.document_id || caseData.documentId;
    if (!documentId) {
      documentId = `DOC-${crypto.randomUUID()}`;
      try {
        let userId = caseData.created_by_user_id;
        if (!userId) {
          const userRes = await this.pool.query('SELECT id FROM users LIMIT 1');
          userId = userRes.rows[0]?.id || 'usr-citizen-001';
        }
        const { documentRepository } = require('./documentRepository');
        await documentRepository.create({
          document_id: documentId,
          original_filename: 'sample_deed.pdf',
          stored_filename: 'sample_deed.pdf',
          file_type: 'pdf',
          mime_type: 'application/pdf',
          file_size: 2048,
          storage_path: 'uploads/sample_deed.pdf',
          processing_status: 'UPLOADED',
          created_by_user_id: userId,
          land_record_id: caseData.land_record_id || caseData.landRecordId || null,
        });
      } catch (err) {
        // Document creation fallback if table has unique constraint or in memory
      }
    }

    return this.createCase({
      ...caseData,
      document_id: documentId,
      land_record_id: caseData.land_record_id || caseData.landRecordId || null,
      status: caseData.status || 'PENDING_OFFICER_REVIEW',
      priority: caseData.priority || 'MEDIUM',
      case_data: {
        ...(caseData.case_data || {}),
        citizen_submitted_data: caseData.citizenSubmittedData || caseData.citizen_submitted_data || {},
        ...(caseData.citizenSubmittedData || {}),
      },
    });
  }

  async createCase(caseData) {
    const caseId = caseData.case_id || (await this.nextCaseId());
    const isDuplicate = caseData.is_duplicate ? 1 : 0;
    const duplicateReason = caseData.duplicate_reason || null;
    const aiStatus = caseData.ai_status || 'NOT_STARTED';
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const priority = validPriorities.includes(String(caseData.priority || '').toUpperCase())
      ? String(caseData.priority).toUpperCase()
      : 'MEDIUM';

    const insertQuery = `
      INSERT INTO review_cases (
        case_id, document_id, land_record_id, status, priority,
        validation_score, review_required, is_duplicate, duplicate_reason, ai_status,
        case_data, ai_confidence, validation_result,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))
      ON DUPLICATE KEY UPDATE
        land_record_id = VALUES(land_record_id),
        priority = VALUES(priority),
        validation_score = VALUES(validation_score),
        review_required = VALUES(review_required),
        is_duplicate = VALUES(is_duplicate),
        duplicate_reason = VALUES(duplicate_reason),
        ai_status = VALUES(ai_status),
        case_data = VALUES(case_data),
        ai_confidence = VALUES(ai_confidence),
        validation_result = VALUES(validation_result),
        updated_at = NOW(6)
    `;

    await this.pool.query(insertQuery, [
      caseId,
      caseData.document_id,
      caseData.land_record_id || null,
      caseData.status || 'PENDING_REVIEW',
      priority,
      caseData.validation_score != null ? Number(caseData.validation_score) : 100,
      caseData.review_required ? 1 : 0,
      isDuplicate,
      duplicateReason,
      aiStatus,
      JSON.stringify(caseData.case_data || {}),
      caseData.ai_confidence != null ? Number(caseData.ai_confidence) : null,
      JSON.stringify(caseData.validation_result || {}),
    ]);

    if (Array.isArray(caseData.anomalies) && caseData.anomalies.length > 0) {
      for (const a of caseData.anomalies) {
        const anomalyId = a.anomaly_id || `ANOM-${crypto.randomUUID()}`;
        const anomQuery = `
          INSERT INTO review_anomalies (
            anomaly_id, case_id, type, field, severity, status, source,
            title, message, review_required, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6))
          ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            message = VALUES(message)
        `;
        await this.pool.query(anomQuery, [
          anomalyId,
          caseId,
          a.type || a.anomaly_type || 'VALIDATION_ISSUE',
          a.field || null,
          a.severity || 'WARNING',
          a.status || 'OPEN',
          a.source || 'SYSTEM',
          a.title || null,
          a.message || 'Review required',
          a.review_required !== false ? 1 : 0,
          JSON.stringify(a.metadata || {}),
        ]);
      }
    }

    return this.findById(caseId);
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

  async findById(caseId) {
    const query = `
      SELECT rc.case_id, rc.document_id, rc.land_record_id, rc.status, rc.priority,
             rc.validation_score, rc.review_required, rc.is_duplicate, rc.duplicate_reason, rc.ai_status,
             rc.case_data, rc.ai_confidence,
             rc.validation_result, rc.assigned_officer_id, rc.reviewed_by, rc.reviewed_at,
             rc.officer_notes, rc.rejection_reason, rc.created_at, rc.updated_at,
             d.original_filename, d.mime_type, d.file_size, d.processing_status,
             d.created_by_user_id,
             u.name AS citizen_name, u.external_reference AS citizen_reference,
             lr.owner_name, lr.survey_number, lr.area_value, lr.area_unit,
             lr.village, lr.taluk, lr.district, lr.state, lr.state_id, lr.classification,
             lr.status AS land_record_status, lr.verification_status,
             lr.verified_by, lr.verified_at, lr.officer_notes AS lr_officer_notes,
             lr.source_document_id, lr.ocr_language, lr.ocr_confidence,
             lr.validation_status, lr.validation_result AS land_record_validation_result,
             lr.citizen_submitted_data, lr.ai_extracted_data,
             lr.is_duplicate AS lr_is_duplicate, lr.duplicate_reason AS lr_duplicate_reason,
             lr.ai_status AS lr_ai_status
      FROM review_cases rc
      LEFT JOIN documents d ON rc.document_id = d.document_id
      LEFT JOIN users u ON d.created_by_user_id = u.id
      LEFT JOIN land_records lr ON rc.land_record_id = lr.id
      WHERE rc.case_id = ?
    `;

    const res = await this.pool.query(query, [caseId]);
    const row = res.rows[0];
    if (!row) return null;

    // Fetch anomalies
    const anomRes = await this.pool.query(
      'SELECT anomaly_id, case_id, type, field, severity, status, source, title, message, review_required, metadata, created_at, resolved_at FROM review_anomalies WHERE case_id = ? ORDER BY created_at ASC',
      [caseId]
    );

    // Fetch corrections
    const corrRes = await this.pool.query(
      'SELECT id, case_id, anomaly_id, field, original_value, corrected_value, reason, officer_id, created_at FROM officer_corrections WHERE case_id = ? ORDER BY created_at DESC',
      [caseId]
    );

    // Fetch notes
    const notesRes = await this.pool.query(
      'SELECT id, case_id, officer_id, note, created_at FROM officer_notes WHERE case_id = ? ORDER BY created_at DESC',
      [caseId]
    );

    // Fetch audit events
    const auditRes = await this.pool.query(
      'SELECT id, case_id, event_type, actor_type, actor_reference, metadata, created_at FROM audit_events WHERE case_id = ? ORDER BY created_at DESC',
      [caseId]
    );

    // Fetch land record fields
    let landRecordFields = {};
    if (row.land_record_id) {
      const lrFieldsRes = await this.pool.query(
        'SELECT field_name, field_value, confidence, source, source_page, source_bbox FROM land_record_fields WHERE land_record_id = ?',
        [row.land_record_id]
      );
      for (const f of lrFieldsRes.rows) {
        landRecordFields[f.field_name] = f.field_value;
      }
    }

    const citizenSubmittedData = this.parseJsonValue(row.citizen_submitted_data);
    const aiExtractedData = this.parseJsonValue(row.ai_extracted_data);

    return {
      case_id: row.case_id,
      document_id: row.document_id,
      land_record_id: row.land_record_id,
      status: row.status,
      priority: row.priority,
      validation_score: Number(row.validation_score),
      review_required: Boolean(row.review_required),
      is_duplicate: Boolean(row.is_duplicate || row.lr_is_duplicate),
      duplicate_reason: row.duplicate_reason || row.lr_duplicate_reason || null,
      ai_status: row.ai_status || row.lr_ai_status || 'NOT_STARTED',
      ai_confidence: row.ai_confidence == null ? null : Number(row.ai_confidence),
      validation_result: row.validation_result || row.case_data?.validation_result || {},
      assigned_officer_id: row.assigned_officer_id || null,
      reviewed_by: row.reviewed_by || null,
      reviewed_at: row.reviewed_at || null,
      officer_notes: row.officer_notes || null,
      rejection_reason: row.rejection_reason || null,
      case_data: row.case_data || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
      document: {
        document_id: row.document_id,
        original_filename: row.original_filename,
        mime_type: row.mime_type,
        file_size: row.file_size,
        processing_status: row.processing_status,
        created_by_user_id: row.created_by_user_id,
      },
      citizen: {
        id: row.created_by_user_id,
        name: row.citizen_name || 'Citizen',
        external_reference: row.citizen_reference || null,
      },
      citizen_submitted_data: citizenSubmittedData,
      ai_extracted_data: aiExtractedData,
      state: row.state || row.citizen_state || citizenSubmittedData?.state || 'Tamil Nadu',
      district: row.district || row.citizen_district || citizenSubmittedData?.district || null,
      land_record: row.land_record_id
        ? {
            id: row.land_record_id,
            owner_name: row.owner_name,
            survey_number: row.survey_number,
            area_value: row.area_value,
            area_unit: row.area_unit,
            village: row.village,
            taluk: row.taluk,
            district: row.district,
            state: row.state || 'Tamil Nadu',
            state_id: row.state_id || null,
            classification: row.classification,
            status: row.land_record_status,
            verification_status: row.verification_status,
            verified_by: row.verified_by,
            verified_at: row.verified_at,
            officer_notes: row.lr_officer_notes,
            source_document_id: row.source_document_id,
            ocr_language: row.ocr_language,
            ocr_confidence: row.ocr_confidence == null ? null : Number(row.ocr_confidence),
            validation_status: row.validation_status,
            validation_result: row.land_record_validation_result || {},
            citizen_submitted_data: citizenSubmittedData,
            ai_extracted_data: aiExtractedData,
            is_duplicate: Boolean(row.is_duplicate || row.lr_is_duplicate),
            duplicate_reason: row.duplicate_reason || row.lr_duplicate_reason || null,
            ai_status: row.ai_status || row.lr_ai_status || 'NOT_STARTED',
            fields: landRecordFields,
          }
        : null,
      anomalies: anomRes.rows || [],
      corrections: corrRes.rows || [],
      notes: notesRes.rows || [],
      audit_events: auditRes.rows || [],
    };
  }

  async findByDocumentId(documentId) {
    const res = await this.pool.query('SELECT case_id FROM review_cases WHERE document_id = ? ORDER BY created_at DESC LIMIT 1', [documentId]);
    if (!res.rows[0]) return null;
    return this.findById(res.rows[0].case_id);
  }

  async findAll({ status = null, priority = null, assignedOfficerId = null, includeUnassigned = false, state = null, district = null, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const params = [];

    if (status && status !== 'ALL') {
      conditions.push('rc.status = ?');
      params.push(status);
    }
    if (priority && priority !== 'ALL') {
      conditions.push('rc.priority = ?');
      params.push(priority);
    }
    if (assignedOfficerId) {
      conditions.push(includeUnassigned
        ? '(rc.assigned_officer_id = ? OR rc.assigned_officer_id IS NULL)'
        : 'rc.assigned_officer_id = ?');
      params.push(assignedOfficerId);
    }
    if (state) {
      conditions.push('(LOWER(COALESCE(lr.state, s_lr.state_name, u.state, s_u.state_name, "Tamil Nadu")) = LOWER(?) OR lr.state_id = ? OR u.state_id = ?)');
      params.push(state, state, state);
    }
    if (district) {
      conditions.push('(LOWER(COALESCE(lr.district, u.district)) = LOWER(?))');
      params.push(district);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT rc.case_id, rc.document_id, rc.land_record_id, rc.status, rc.priority,
             rc.validation_score, rc.review_required, rc.is_duplicate, rc.duplicate_reason, rc.ai_status,
             rc.ai_confidence,
             rc.assigned_officer_id, rc.reviewed_by, rc.reviewed_at,
             rc.officer_notes, rc.rejection_reason, rc.created_at, rc.updated_at,
             d.original_filename, d.mime_type, d.file_size,
             u.name AS citizen_name, u.external_reference AS citizen_reference,
             u.state AS citizen_state, u.district AS citizen_district,
             lr.owner_name, lr.survey_number, lr.area_value, lr.area_unit,
             lr.village, lr.taluk, lr.district, lr.state, lr.citizen_submitted_data
      FROM review_cases rc
      LEFT JOIN documents d ON rc.document_id = d.document_id
      LEFT JOIN users u ON d.created_by_user_id = u.id
      LEFT JOIN land_records lr ON rc.land_record_id = lr.id
      LEFT JOIN states s_lr ON lr.state_id = s_lr.id
      LEFT JOIN states s_u ON u.state_id = s_u.id
      ${whereClause}
      ORDER BY rc.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));
    const res = await this.pool.query(query, params);
    return res.rows.map((row) => ({
      case_id: row.case_id,
      document_id: row.document_id,
      land_record_id: row.land_record_id,
      status: row.status,
      priority: row.priority,
      validation_score: Number(row.validation_score),
      review_required: Boolean(row.review_required),
      is_duplicate: Boolean(row.is_duplicate),
      duplicate_reason: row.duplicate_reason || null,
      ai_status: row.ai_status || 'NOT_STARTED',
      ai_confidence: row.ai_confidence == null ? null : Number(row.ai_confidence),
      assigned_officer_id: row.assigned_officer_id || null,
      reviewed_by: row.reviewed_by || null,
      reviewed_at: row.reviewed_at || null,
      officer_notes: row.officer_notes || null,
      rejection_reason: row.rejection_reason || null,
      filename: row.original_filename || `${row.document_id}.pdf`,
      citizen_name: row.citizen_name || 'Citizen',
      citizen_reference: row.citizen_reference || 'N/A',
      owner_name: row.owner_name || null,
      survey_number: row.survey_number || null,
      area_value: row.area_value != null ? Number(row.area_value) : null,
      area_unit: row.area_unit || null,
      village: row.village || null,
      taluk: row.taluk || null,
      district: row.district || row.citizen_district || null,
      state: row.state || row.citizen_state || 'Tamil Nadu',
      citizen_submitted_data: this.parseJsonValue(row.citizen_submitted_data),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async updateAiResults(caseId, { aiConfidence, validationScore, validationResult, aiStatus = 'COMPLETED', caseData = null, anomalies = [] } = {}) {
    let updateSql = `
      UPDATE review_cases
      SET ai_confidence = ?,
          validation_score = COALESCE(?, validation_score),
          validation_result = ?,
          ai_status = ?,
          updated_at = NOW(6)
    `;
    const params = [
      aiConfidence != null ? Number(aiConfidence) : null,
      validationScore != null ? Number(validationScore) : null,
      validationResult ? JSON.stringify(validationResult) : null,
      aiStatus,
    ];

    if (caseData) {
      updateSql += ', case_data = ?';
      params.push(JSON.stringify(caseData));
    }
    updateSql += ' WHERE case_id = ?';
    params.push(caseId);

    await this.pool.query(updateSql, params);

    if (Array.isArray(anomalies) && anomalies.length > 0) {
      for (const a of anomalies) {
        const anomalyId = a.anomaly_id || `ANOM-${crypto.randomUUID()}`;
        const anomQuery = `
          INSERT INTO review_anomalies (
            anomaly_id, case_id, type, field, severity, status, source,
            title, message, review_required, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6))
          ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            message = VALUES(message)
        `;
        await this.pool.query(anomQuery, [
          anomalyId,
          caseId,
          a.type || a.anomaly_type || 'VALIDATION_ISSUE',
          a.field || null,
          a.severity || 'WARNING',
          a.status || 'OPEN',
          a.source || 'SYSTEM',
          a.title || null,
          a.message || 'Review required',
          a.review_required !== false ? 1 : 0,
          JSON.stringify(a.metadata || {}),
        ]);
      }
    }

    return this.findById(caseId);
  }

  async updateAiStatus(caseId, aiStatus) {
    await this.pool.query('UPDATE review_cases SET ai_status = ?, updated_at = NOW(6) WHERE case_id = ?', [aiStatus, caseId]);
    return this.findById(caseId);
  }

  async updateStatus(caseId, status, { rejectionReason = null, officerId = null, reason = null, officerNotes = null } = {}) {
    const updateQuery = `
      UPDATE review_cases
      SET status = ?,
          assigned_officer_id = COALESCE(assigned_officer_id, ?),
          reviewed_by = IF(? IN ('APPROVED', 'GOVERNMENT_APPROVED', 'REJECTED'), ?, reviewed_by),
          reviewed_at = IF(? IN ('APPROVED', 'GOVERNMENT_APPROVED', 'REJECTED'), NOW(6), reviewed_at),
          officer_notes = COALESCE(?, officer_notes),
          rejection_reason = IF(? = 'REJECTED', ?, rejection_reason),
          case_data = JSON_SET(COALESCE(case_data, JSON_OBJECT()), '$.officer_notes', ?, '$.status_reason', ?),
          updated_at = NOW(6)
      WHERE case_id = ?
    `;
    await this.pool.query(updateQuery, [
      status,
      officerId,
      status,
      officerId,
      status,
      officerNotes,
      status,
      rejectionReason,
      officerNotes,
      reason,
      caseId,
    ]);
    return this.findById(caseId);
  }

  async claimCase(caseId, officerId) {
    const result = await this.pool.query(
      `UPDATE review_cases
       SET status = 'UNDER_OFFICER_REVIEW', assigned_officer_id = ?, updated_at = NOW(6)
       WHERE case_id = ? AND status IN ('PENDING_REVIEW', 'PENDING_OFFICER_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD')
         AND (assigned_officer_id IS NULL OR assigned_officer_id = ?)`,
      [officerId, caseId, officerId],
    );
    if (result.rows.affectedRows !== 1) {
      const error = new Error('Review case is no longer available or is assigned to another officer.');
      error.statusCode = 409;
      error.code = 'CASE_NOT_AVAILABLE';
      throw error;
    }
    return this.findById(caseId);
  }

  async decideCase({ caseId, landRecordId, status, officerId, officerNotes, rejectionReason }) {
    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');
      const caseResult = await connection.query(
        `UPDATE review_cases
         SET status = ?, assigned_officer_id = COALESCE(assigned_officer_id, ?),
             reviewed_by = ?, reviewed_at = NOW(6), officer_notes = ?,
             rejection_reason = ?, updated_at = NOW(6)
         WHERE case_id = ? AND status NOT IN ('APPROVED', 'REJECTED', 'CLOSED')`,
        [status, officerId, officerId, officerNotes, rejectionReason, caseId],
      );
      if (caseResult.rows.affectedRows !== 1) {
        const error = new Error('Review case is missing or already has a final decision.');
        error.statusCode = 409;
        error.code = 'CASE_ALREADY_DECIDED';
        throw error;
      }

      const recordStatus = status === 'APPROVED' ? 'VERIFIED' : 'REJECTED';
      const recordResult = await connection.query(
        `UPDATE land_records
         SET status = ?, verification_status = ?,
             verified_by = IF(? = 'VERIFIED', ?, NULL),
             verified_at = IF(? = 'VERIFIED', NOW(6), NULL),
             officer_notes = ?, updated_at = NOW(6)
         WHERE id = ?`,
        [recordStatus, recordStatus, recordStatus, officerId, recordStatus, officerNotes, landRecordId],
      );
      if (recordResult.rows.affectedRows !== 1) {
        const error = new Error('The land record associated with this case could not be updated.');
        error.statusCode = 409;
        error.code = 'LAND_RECORD_DECISION_FAILED';
        throw error;
      }

      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
    return this.findById(caseId);
  }

  async addCorrection({ caseId, anomalyId = null, field, originalValue, correctedValue, reason, officerId }) {
    const corrId = crypto.randomUUID();
    const query = `
      INSERT INTO officer_corrections (
        id, case_id, anomaly_id, field, original_value, corrected_value, reason, officer_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))
    `;
    await this.pool.query(query, [
      corrId,
      caseId,
      anomalyId || null,
      field,
      JSON.stringify(originalValue != null ? originalValue : null),
      JSON.stringify(correctedValue != null ? correctedValue : null),
      reason || 'Officer manual correction',
      officerId,
    ]);

    await this.pool.query('UPDATE review_cases SET status = "CORRECTION_REQUIRED", updated_at = NOW(6) WHERE case_id = ?', [caseId]);

    return {
      id: corrId,
      case_id: caseId,
      anomaly_id: anomalyId,
      field,
      original_value: originalValue,
      corrected_value: correctedValue,
      reason,
      officer_id: officerId,
      created_at: new Date().toISOString(),
    };
  }

  async addNote({ caseId, officerId, note }) {
    const noteId = `NOTE-${crypto.randomUUID()}`;
    const query = `
      INSERT INTO officer_notes (id, case_id, officer_id, note, created_at)
      VALUES (?, ?, ?, ?, NOW(6))
    `;
    await this.pool.query(query, [noteId, caseId, officerId, note]);
    return {
      id: noteId,
      case_id: caseId,
      officer_id: officerId,
      note,
      created_at: new Date().toISOString(),
    };
  }

  async resolveAnomaly(caseId, anomalyId) {
    const query = `
      UPDATE review_anomalies
      SET status = 'RESOLVED', resolved_at = NOW(6)
      WHERE case_id = ? AND anomaly_id = ?
    `;
    await this.pool.query(query, [caseId, anomalyId]);
    const res = await this.pool.query('SELECT * FROM review_anomalies WHERE case_id = ? AND anomaly_id = ?', [caseId, anomalyId]);
    return res.rows[0];
  }

  async getStats() {
    const query = `
      SELECT
        COUNT(*) AS total_reviews,
        SUM(status = 'PENDING_REVIEW') AS pending_reviews,
        SUM(status = 'IN_REVIEW') AS in_review,
        SUM(status = 'APPROVED') AS approved_reviews,
        SUM(status = 'REJECTED') AS rejected_reviews,
        SUM(status = 'ON_HOLD') AS on_hold_reviews
      FROM review_cases
    `;
    const res = await this.pool.query(query);
    const row = res.rows[0] || {};
    return {
      total_reviews: Number(row.total_reviews || 0),
      pending_reviews: Number(row.pending_reviews || 0),
      in_review: Number(row.in_review || 0),
      approved_reviews: Number(row.approved_reviews || 0),
      rejected_reviews: Number(row.rejected_reviews || 0),
      on_hold_reviews: Number(row.on_hold_reviews || 0),
    };
  }
}

const reviewRepository = new MySQLReviewRepository(pool);

module.exports = {
  InMemoryReviewRepository,
  MySQLReviewRepository,
  reviewRepository,
};
