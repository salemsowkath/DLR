const app = require('./app');
const { port } = require('./config/env');
const logger = require('./config/logger');

app.listen(port, () => {
  logger.info('DLR backend started successfully.', {
    port,
    environment: process.env.NODE_ENV || 'development',
  });
});
