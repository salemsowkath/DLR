const { pool } = require('../config/database');
const DocumentMetadata = require('../models/documentMetadata');

class InMemoryDocumentRepository {
  constructor() {
    this.processingResults = new Map();
  }
  async create(data) {
    return DocumentMetadata.create(data);
  }

  async findById(documentId) {
    return DocumentMetadata.findById(documentId);
  }

  async findByUserId(userId) {
    const records = [];
    for (const record of DocumentMetadata.store.values()) {
      if (record.created_by_user_id === userId) {
        records.push({ ...record });
      }
    }
    return records;
  }

  async updateStatus(documentId, processingStatus) {
    return DocumentMetadata.updateById(documentId, {
      processing_status: processingStatus,
      updated_at: new Date().toISOString(),
    });
  }

  async updateLandRecordId(documentId, landRecordId) {
    return DocumentMetadata.updateById(documentId, {
      land_record_id: landRecordId,
      updated_at: new Date().toISOString(),
    });
  }

  async saveProcessingResult(documentId, result) {
    this.processingResults.set(documentId, { ...result, updated_at: new Date().toISOString() });
    return this.getProcessingResult(documentId);
  }

  async getProcessingResult(documentId) {
    const result = this.processingResults.get(documentId);
    return result ? { ...result } : null;
  }

  async getStats() {
    let totalDocuments = 0;
    let processedDocuments = 0;
    let failedDocuments = 0;
    let uploadedDocuments = 0;

    for (const doc of DocumentMetadata.store.values()) {
      totalDocuments += 1;
      if (doc.processing_status === 'PROCESSED') processedDocuments += 1;
      else if (doc.processing_status === 'FAILED') failedDocuments += 1;
      else uploadedDocuments += 1;
    }

    return {
      total_documents: totalDocuments,
      processed_documents: processedDocuments,
      failed_documents: failedDocuments,
      uploaded_documents: uploadedDocuments,
    };
  }
}

class MySQLDocumentRepository {
  constructor(databasePool) {
    if (!databasePool) {
      throw new Error('A MySQL pool is required.');
    }
    this.pool = databasePool;
  }

  async create(data) {
    const query = `
      INSERT INTO documents (
        document_id, document_type, original_filename, stored_filename, mime_type, file_size,
        checksum, storage_reference, processing_status, language, created_at, updated_at, created_by_user_id, land_record_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const userId = data.created_by_user_id;
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      const error = new Error('An authenticated citizen UUID is required to create a document.');
      error.statusCode = 401;
      error.code = 'INVALID_DOCUMENT_OWNER';
      throw error;
    }
    await this.pool.query(query, [
      data.document_id,
      data.file_type || 'pdf',
      data.original_filename || 'document.pdf',
      data.stored_filename || data.original_filename || 'document.pdf',
      data.mime_type || 'application/pdf',
      data.file_size || 1024,
      data.checksum || null,
      data.storage_path || 'uploads/document.pdf',
      data.processing_status || 'UPLOADED',
      data.language || null,
      data.uploaded_at ? new Date(data.uploaded_at) : new Date(),
      data.updated_at ? new Date(data.updated_at) : new Date(),
      userId,
      data.land_record_id || null,
    ]);
    const persisted = await this.findById(data.document_id);
    return {
      ...data,
      ...persisted,
      stored_filename: data.stored_filename,
      processing_status: data.processing_status || 'UPLOADED',
      language: data.language,
      updated_at: data.updated_at,
    };
  }

  async findById(documentId) {
    const query = `
      SELECT document_id, created_by_user_id, land_record_id, checksum, original_filename, document_type AS file_type,
        stored_filename, mime_type, file_size, storage_reference AS storage_path,
        processing_status, language, created_at AS uploaded_at, updated_at
      FROM documents WHERE document_id = ?
    `;
    const result = await this.pool.query(query, [documentId]);
    if (!result.rows[0]) {
      return null;
    }
    return result.rows[0];
  }

  async findByUserId(userId) {
    const query = `
      SELECT document_id, created_by_user_id, land_record_id, checksum, original_filename, document_type AS file_type,
        stored_filename, mime_type, file_size, storage_reference AS storage_path,
        processing_status, language, created_at AS uploaded_at, updated_at
      FROM documents WHERE created_by_user_id = ?
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async findByChecksumForUser(userId, checksum) {
    const result = await this.pool.query(
      'SELECT document_id FROM documents WHERE created_by_user_id = ? AND checksum = ? LIMIT 1',
      [userId, checksum],
    );
    return result.rows[0] || null;
  }

  async updateStatus(documentId, processingStatus) {
    const query = `
      UPDATE documents
      SET processing_status = ?, updated_at = NOW(6)
      WHERE document_id = ?
    `;
    const result = await this.pool.query(query, [processingStatus, documentId]);
    return result.rows.affectedRows ? this.findById(documentId) : null;
  }

  async updateLandRecordId(documentId, landRecordId) {
    const query = `
      UPDATE documents
      SET land_record_id = ?, updated_at = NOW(6)
      WHERE document_id = ?
    `;
    await this.pool.query(query, [landRecordId, documentId]);
    return this.findById(documentId);
  }

  async saveProcessingResult(documentId, result) {
    const query = `
      INSERT INTO document_processing_results (
        document_id, ocr_result, extraction_result, validation_result, gis_result, review_result, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(6))
      ON DUPLICATE KEY UPDATE
        ocr_result = VALUES(ocr_result),
        extraction_result = VALUES(extraction_result),
        validation_result = VALUES(validation_result),
        gis_result = VALUES(gis_result),
        review_result = VALUES(review_result),
        updated_at = NOW(6)
    `;
    await this.pool.query(query, [
      documentId,
      JSON.stringify(result.ocr || {}),
      JSON.stringify(result.extraction || {}),
      JSON.stringify(result.validation || {}),
      JSON.stringify(result.gis || {}),
      JSON.stringify(result.review || {}),
    ]);

    const extractionQuery = `
      INSERT INTO document_extractions (
        id, document_id, language, ocr_status, extraction_status, raw_text_reference, structured_result, created_at
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(6))
    `;
    await this.pool.query(extractionQuery, [
      documentId,
      result.ocr?.language || null,
      result.ocr?.status || 'COMPLETED',
      'COMPLETED',
      null,
      JSON.stringify(result.extraction || {}),
    ]);

    return this.getProcessingResult(documentId);
  }

  async getProcessingResult(documentId) {
    const query = `
      SELECT ocr_result, extraction_result, validation_result, gis_result, review_result, updated_at
      FROM document_processing_results WHERE document_id = ?
    `;
    const result = await this.pool.query(query, [documentId]);
    return result.rows[0] ? this._mapProcessingResult(result.rows[0]) : null;
  }

  _mapProcessingResult(row) {
    return {
      ocr: row.ocr_result || {},
      extraction: row.extraction_result || {},
      validation: row.validation_result || {},
      gis: row.gis_result || {},
      review: row.review_result || {},
      updated_at: row.updated_at,
    };
  }

  async getStats() {
    const query = `
      SELECT 
        COUNT(*) AS total_documents,
        SUM(processing_status = 'PROCESSED') AS processed_documents,
        SUM(processing_status = 'FAILED') AS failed_documents,
        SUM(processing_status = 'UPLOADED') AS uploaded_documents
      FROM documents
    `;
    const result = await this.pool.query(query);
    const row = result.rows[0] || {};
    return {
      total_documents: Number(row.total_documents || 0),
      processed_documents: Number(row.processed_documents || 0),
      failed_documents: Number(row.failed_documents || 0),
      uploaded_documents: Number(row.uploaded_documents || 0),
    };
  }
}

const documentRepository = new MySQLDocumentRepository(pool);

module.exports = {
  InMemoryDocumentRepository,
  MySQLDocumentRepository,
  documentRepository,
};
