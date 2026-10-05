class DocumentMetadata {
  constructor({
    document_id,
    created_by_user_id = null,
    original_filename,
    stored_filename,
    file_type,
    mime_type,
    file_size,
    storage_path,
    processing_status,
    language,
    uploaded_at,
    updated_at,
  }) {
    this.document_id = document_id;
    this.created_by_user_id = created_by_user_id;
    this.original_filename = original_filename;
    this.stored_filename = stored_filename;
    this.file_type = file_type;
    this.mime_type = mime_type;
    this.file_size = file_size;
    this.storage_path = storage_path;
    this.processing_status = processing_status;
    this.language = language;
    this.uploaded_at = uploaded_at;
    this.updated_at = updated_at;
  }

  static store = new Map();

  static create(data) {
    const record = new DocumentMetadata(data);
    DocumentMetadata.store.set(record.document_id, record);
    return record;
  }

  static findById(documentId) {
    const record = DocumentMetadata.store.get(documentId);
    return record ? { ...record } : null;
  }

  static updateById(documentId, updates) {
    const record = DocumentMetadata.store.get(documentId);
    if (!record) return null;
    Object.assign(record, updates);
    return { ...record };
  }
}

module.exports = DocumentMetadata;
