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
const superAdminRoutes = require('./routes/superAdmin');
const workMonitoringRoutes = require('./routes/workMonitoring');
const reportsRoutes = require('./routes/reports');
const officerRoutes = require('./routes/officer');
const landRecordsRoutes = require('./routes/landRecords');
const appointmentsRoutes = require('./routes/appointments');
const notificationsRoutes = require('./routes/notifications');
const verificationPhotosRoutes = require('./routes/verificationPhotos');
const stateAdminRoutes = require('./routes/stateAdmin');
const errorHandler = require('./middleware/errorHandler');
const { successResponse, errorResponse } = require('./utils/response');
const { corsAllowedOrigins, nodeEnv } = require('./config/env');

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsAllowedOrigins.includes(origin) || corsAllowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Allow localhost, 127.0.0.1, and private LAN IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port in development
    if (
      nodeEnv !== 'production' &&
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: Origin ${origin} not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-context-id', 'x-session-context'],
};

app.use(cors(corsOptions));
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
app.use('/api/officer', officerRoutes);
app.use('/api/land-records', landRecordsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/verification', verificationPhotosRoutes);

// State Admin routes (strictly STATE_ADMIN / SUPER_ADMIN)
app.use('/api/state-admin', stateAdminRoutes);

// Super Admin Protected Work Monitoring & Reports (strictly SUPER_ADMIN)
app.use('/api/admin/work', workMonitoringRoutes);
app.use('/api/admin/reports', reportsRoutes);
app.use('/api/super-admin/work', workMonitoringRoutes);
app.use('/api/super-admin/reports', reportsRoutes);

// Minister / Legacy Admin routes
app.use('/api/admin', adminRoutes);

// Super Admin user & governance management routes
app.use('/api/super-admin', superAdminRoutes);
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
      normalizedError.message = 'File exceeds the 10 MB limit.';
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
