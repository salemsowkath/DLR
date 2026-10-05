const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const logger = require('./config/logger');
const healthRoutes = require('./routes/health');
const documentRoutes = require('./routes/documents');
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/review');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');
const { successResponse, errorResponse } = require('./utils/response');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

app.get('/', (req, res) => {
  res.status(200).json(successResponse('DLR backend is running.', {
    service: 'dlr-backend',
    version: '0.1.0',
  }));
});

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', healthRoutes);

app.use((req, res) => {
  res.status(404).json(errorResponse('NOT_FOUND', 'The requested resource was not found.'));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const normalizedError = err;

    if (err.code === 'LIMIT_FILE_SIZE') {
      normalizedError.statusCode = 413;
      normalizedError.code = 'FILE_TOO_LARGE';
      normalizedError.message = 'Uploaded document exceeds the 5MB size limit.';
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      normalizedError.statusCode = 400;
      normalizedError.code = 'INVALID_FILE';
      normalizedError.message = 'Expected a document file upload.';
    }

    return next(normalizedError);
  }

  return next(err);
});

app.use(errorHandler);

module.exports = app;
