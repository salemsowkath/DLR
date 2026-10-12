const fs = require('fs');
const path = require('path');
const multer = require('multer');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function sanitizeFilename(filename = 'document') {
  const baseName = path.basename(filename || 'document');
  const safeName = baseName
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .trim();

  if (!safeName || safeName.length < 2) {
    return 'document';
  }

  return safeName;
}

function normalizeExtension(filename) {
  const ext = path.extname(filename || '').toLowerCase().replace('.', '');
  return ext || '';
}

function generateDocumentId() {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `DOC-${stamp}-${randomSuffix}`;
}

function validateFileSignature(filePath, fileType) {
  if (!filePath) {
    throw createAppError(400, 'INVALID_FILE', 'No document file was provided.');
  }

  let buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch (error) {
    throw createAppError(500, 'UPLOAD_FAILED', 'Unable to read uploaded file for validation.');
  }

  const header = buffer.subarray(0, 16);

  if (fileType === 'pdf' && header.toString('latin1', 0, 4) !== '%PDF') {
    throw createAppError(400, 'INVALID_FILE', 'The uploaded PDF appears to be corrupted or invalid.');
  }

  if (fileType === 'jpg' || fileType === 'jpeg') {
    const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    if (!isJpeg) {
      throw createAppError(400, 'INVALID_FILE', 'The uploaded JPEG appears to be corrupted or invalid.');
    }
  }

  if (fileType === 'png') {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const match = Buffer.compare(header.subarray(0, 8), pngSignature) === 0;
    if (!match) {
      throw createAppError(400, 'INVALID_FILE', 'The uploaded PNG appears to be corrupted or invalid.');
    }
  }
}

function ensureUploadDirectory() {
  const directory = path.resolve(__dirname, '../../uploads/documents');
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureUploadDirectory());
  },
  filename: (req, file, cb) => {
    const extension = normalizeExtension(file.originalname) || 'bin';
    const base = sanitizeFilename(file.originalname);
    const safeBase = base.replace(new RegExp(`\\.${extension}$`, 'i'), '');
    const uniqueName = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeBase}.${extension}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const extension = normalizeExtension(file.originalname).toLowerCase();
    const mimeType = file.mimetype || '';
    const allowedMime = ALLOWED_FILE_TYPES[extension];

    if (!ALLOWED_FILE_TYPES[extension] || mimeType !== allowedMime) {
      return cb(createAppError(415, 'INVALID_FILE_TYPE', 'Unsupported file type. Only PDF, JPG, JPEG, and PNG are allowed.'), false);
    }

    cb(null, true);
  },
});

module.exports = {
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  upload,
  sanitizeFilename,
  normalizeExtension,
  generateDocumentId,
  validateFileSignature,
  ensureUploadDirectory,
};
