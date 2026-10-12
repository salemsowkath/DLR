const mysql = require('mysql2/promise');
const config = require('./env');

class MySQLClient {
  constructor(connection) {
    this.connection = connection;
  }

  async query(sql, params = []) {
    const normalized = sql.trim().toUpperCase();
    if (normalized === 'BEGIN') {
      await this.connection.beginTransaction();
      return { rows: [] };
    }
    if (normalized === 'COMMIT') {
      await this.connection.commit();
      return { rows: [] };
    }
    if (normalized === 'ROLLBACK') {
      await this.connection.rollback();
      return { rows: [] };
    }
    const [rows] = await this.connection.execute(sql, params);
    return { rows };
  }

  release() {
    this.connection.release();
  }
}

class MySQLPool {
  constructor(rawPool) {
    this.rawPool = rawPool;
  }

  async query(sql, params = []) {
    const [rows] = await this.rawPool.execute(sql, params);
    return { rows };
  }

  async connect() {
    return new MySQLClient(await this.rawPool.getConnection());
  }
}

function createDatabasePool({
  persistenceBackend = config.persistenceBackend,
  mysqlConfig = config.mysql,
  createPool = mysql.createPool,
} = {}) {
  const backend = String(persistenceBackend).toLowerCase();
  if (backend !== 'mysql') {
    throw new Error('PERSISTENCE_BACKEND must be mysql. Memory persistence is not supported.');
  }

  if (!mysqlConfig?.host || !mysqlConfig?.database || !mysqlConfig?.user || !mysqlConfig.password) {
    throw new Error('MySQL persistence is selected but DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD are required.');
  }

  const rawPool = createPool({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    database: mysqlConfig.database,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    dateStrings: true,
    namedPlaceholders: false,
  });
  return new MySQLPool(rawPool);
}

const pool = createDatabasePool();

module.exports = { createDatabasePool, pool };
