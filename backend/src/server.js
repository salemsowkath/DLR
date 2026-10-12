const app = require('./app');
const { port, persistenceBackend, mysql } = require('./config/env');
const logger = require('./config/logger');

const HOST = process.env.HOST || '0.0.0.0';

app.listen(port, HOST, () => {
  logger.info('DLR backend started successfully.', {
    port,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
  });
  if (persistenceBackend === 'mysql') {
    logger.info('DLR MySQL database configured.', {
      host: mysql.host,
      port: mysql.port,
      database: mysql.database,
    });
  }
});
