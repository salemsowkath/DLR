const { Pool } = require('pg');
const config = require('./env');

function createDatabasePool({
  persistenceBackend = config.persistenceBackend,
  databaseUrl = config.databaseUrl,
  postgres = config.postgres,
  PoolClass = Pool,
} = {}) {
  const backend = String(persistenceBackend).toLowerCase();
  if (backend === 'memory') {
    return null;
  }
  if (backend !== 'postgres') {
    throw new Error('PERSISTENCE_BACKEND must be either memory or postgres.');
  }

  if (databaseUrl) {
    return new PoolClass({ connectionString: databaseUrl });
  }

  if (!postgres?.host || !postgres?.database || !postgres?.user || !postgres?.password) {
    throw new Error('PostgreSQL persistence is selected but connection settings are incomplete.');
  }

  return new PoolClass({
    host: postgres.host,
    port: postgres.port,
    database: postgres.database,
    user: postgres.user,
    password: postgres.password,
  });
}

const pool = createDatabasePool();

module.exports = { createDatabasePool, pool };
