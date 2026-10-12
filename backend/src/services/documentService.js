const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { documentRepository } = require('../repositories/documentRepository');
const {
  normalizeExtension,
  sanitizeFilename,
  generateDocumentId,
  validateFileSignature,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
} = require('./fileStorageService');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function buildDocumentRecord(file, storedFilePath, userId = null) {
  const fileType = normalizeExtension(file.originalname).toLowerCase();
  const safeOriginalName = sanitizeFilename(file.originalname);
  const documentId = generateDocumentId();
  const storedFilename = path.basename(storedFilePath);
  const relativeStoragePath = path.relative(path.resolve(__dirname, '../../'), storedFilePath).replace(/\\/g, '/');

  return {
    document_id: documentId,
    created_by_user_id: userId,
    original_filename: safeOriginalName,
    stored_filename: storedFilename,
    file_type: fileType,
    mime_type: file.mimetype,
    file_size: file.size,
    checksum: crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex'),
    storage_path: relativeStoragePath,
    processing_status: 'UPLOADED',
    language: null,
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function uploadDocument(req) {
  if (!req.file) {
    throw createAppError(400, 'INVALID_FILE', 'No document file was uploaded.');
  }

  const fileType = normalizeExtension(req.file.originalname).toLowerCase();
  const allowedMime = ALLOWED_FILE_TYPES[fileType];

  if (!allowedMime || req.file.mimetype !== allowedMime) {
    throw createAppError(415, 'INVALID_FILE_TYPE', 'Unsupported file type. Only PDF, JPG, JPEG, and PNG are allowed.');
  }

  if (req.file.size > MAX_FILE_SIZE) {
    throw createAppError(413, 'FILE_TOO_LARGE', 'File exceeds the 10 MB limit.');
  }

  try {
    validateFileSignature(req.file.path, fileType);
  } catch (error) {
    fs.unlinkSync(req.file.path);
    throw error;
  }

  const userId = req.user?.id || null;
  const documentRecord = buildDocumentRecord(req.file, req.file.path, userId);
  let savedRecord;
  try {
    if (userId && await documentRepository.findByChecksumForUser(userId, documentRecord.checksum)) {
      throw createAppError(409, 'DUPLICATE_DOCUMENT', 'This document has already been uploaded to your account.');
    }
    savedRecord = await documentRepository.create(documentRecord);
  } catch (error) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (error.code === 'ER_DUP_ENTRY') {
      throw createAppError(409, 'DUPLICATE_DOCUMENT', 'This document has already been uploaded to your account.');
    }
    throw error;
  }

  return savedRecord;
}

async function getDocumentById(documentId) {
  const record = await documentRepository.findById(documentId);

  if (!record) {
    throw createAppError(404, 'DOCUMENT_NOT_FOUND', 'Document record was not found.');
  }

  return record;
}

async function updateDocumentStatus(documentId, processingStatus) {
  const record = await documentRepository.updateStatus(documentId, processingStatus);
  if (!record) {
    throw createAppError(404, 'DOCUMENT_NOT_FOUND', 'Document record was not found.');
  }
  return record;
}

async function updateDocumentLandRecord(documentId, landRecordId) {
  const record = await documentRepository.updateLandRecordId(documentId, landRecordId);
  return record;
}

async function getDocumentsByUserId(userId) {
  return documentRepository.findByUserId(userId);
}

async function saveProcessingResult(documentId, result) {
  return documentRepository.saveProcessingResult(documentId, result);
}

async function getProcessingResult(documentId) {
  return documentRepository.getProcessingResult(documentId);
}

function getAbsoluteStoragePath(relativePath) {
  return path.resolve(__dirname, '../../', relativePath);
}

module.exports = {
  uploadDocument,
  getDocumentById,
  getDocumentsByUserId,
  saveProcessingResult,
  getProcessingResult,
  updateDocumentStatus,
  updateDocumentLandRecord,
  getAbsoluteStoragePath,
};
