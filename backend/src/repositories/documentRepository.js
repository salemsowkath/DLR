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

class PostgresDocumentRepository {
  constructor(databasePool) {
    if (!databasePool) {
      throw new Error('A PostgreSQL pool is required.');
    }
    this.pool = databasePool;
  }

  async create(data) {
    const query = `
      INSERT INTO documents (
        document_id, document_type, original_filename, stored_filename, mime_type, file_size,
        storage_reference, processing_status, language, created_at, updated_at, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING document_id, created_by_user_id, original_filename, document_type AS file_type,
        stored_filename, mime_type, file_size, storage_reference AS storage_path,
        processing_status, language, created_at AS uploaded_at, updated_at
    `;
    const result = await this.pool.query(query, [
      data.document_id,
      data.file_type,
      data.original_filename,
      data.stored_filename,
      data.mime_type,
      data.file_size,
      data.storage_path,
      data.processing_status,
      data.language,
      data.uploaded_at,
      data.updated_at,
      data.created_by_user_id || null,
    ]);
    return {
      ...data,
      ...result.rows[0],
      stored_filename: data.stored_filename,
      processing_status: data.processing_status,
      language: data.language,
      updated_at: data.updated_at,
    };
  }

  async findById(documentId) {
    const query = `
      SELECT document_id, created_by_user_id, original_filename, document_type AS file_type,
        stored_filename, mime_type, file_size, storage_reference AS storage_path,
        processing_status, language, created_at AS uploaded_at, updated_at
      FROM documents WHERE document_id = $1
    `;
    const result = await this.pool.query(query, [documentId]);
    if (!result.rows[0]) {
      return null;
    }
    return result.rows[0];
  }

  async findByUserId(userId) {
    const query = `
      SELECT document_id, created_by_user_id, original_filename, document_type AS file_type,
        stored_filename, mime_type, file_size, storage_reference AS storage_path,
        processing_status, language, created_at AS uploaded_at, updated_at
      FROM documents WHERE created_by_user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async updateStatus(documentId, processingStatus) {
    const query = `
      UPDATE documents
      SET processing_status = $1, updated_at = $2
      WHERE document_id = $3
      RETURNING document_id, original_filename, document_type AS file_type,
        stored_filename, mime_type, file_size, storage_reference AS storage_path,
        processing_status, language, created_at AS uploaded_at, updated_at
    `;
    const result = await this.pool.query(query, [processingStatus, new Date().toISOString(), documentId]);
    return result.rows[0] || null;
  }

  async saveProcessingResult(documentId, result) {
    const query = `
      INSERT INTO document_processing_results (
        document_id, ocr_result, extraction_result, validation_result, gis_result, review_result, updated_at
      ) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, now())
      ON CONFLICT (document_id) DO UPDATE SET
        ocr_result = EXCLUDED.ocr_result,
        extraction_result = EXCLUDED.extraction_result,
        validation_result = EXCLUDED.validation_result,
        gis_result = EXCLUDED.gis_result,
        review_result = EXCLUDED.review_result,
        updated_at = now()
      RETURNING ocr_result, extraction_result, validation_result, gis_result, review_result, updated_at
    `;
    const stored = await this.pool.query(query, [
      documentId,
      JSON.stringify(result.ocr || {}),
      JSON.stringify(result.extraction || {}),
      JSON.stringify(result.validation || {}),
      JSON.stringify(result.gis || {}),
      JSON.stringify(result.review || {}),
    ]);
    return this._mapProcessingResult(stored.rows[0]);
  }

  async getProcessingResult(documentId) {
    const query = `
      SELECT ocr_result, extraction_result, validation_result, gis_result, review_result, updated_at
      FROM document_processing_results WHERE document_id = $1
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
        COUNT(*)::int AS total_documents,
        COUNT(CASE WHEN processing_status = 'PROCESSED' THEN 1 END)::int AS processed_documents,
        COUNT(CASE WHEN processing_status = 'FAILED' THEN 1 END)::int AS failed_documents,
        COUNT(CASE WHEN processing_status = 'UPLOADED' THEN 1 END)::int AS uploaded_documents
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

const documentRepository = pool ? new PostgresDocumentRepository(pool) : new InMemoryDocumentRepository();

module.exports = { InMemoryDocumentRepository, PostgresDocumentRepository, documentRepository };
