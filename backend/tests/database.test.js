const test = require('node:test');
const assert = require('node:assert/strict');

const { createDatabasePool } = require('../src/config/database');
const { MySQLDocumentRepository } = require('../src/repositories/documentRepository');

class FakeMySQLPool {
  constructor(options) {
    this.options = options;
    this.queries = [];
    this.row = null;
  }

  async execute(sql, values) {
    this.queries.push({ sql, values });
    if (sql.includes('INSERT INTO documents')) {
      this.row = {
        document_id: values[0],
        created_by_user_id: values[12],
        land_record_id: values[13],
        original_filename: values[2],
        file_type: values[1],
        stored_filename: values[3],
        mime_type: values[4],
        file_size: values[5],
        storage_path: values[7],
        processing_status: values[8],
        language: values[9],
        uploaded_at: values[10],
        updated_at: values[11],
      };
      return [{ affectedRows: 1 }, []];
    }
    if (sql.includes('UPDATE documents') && this.row) {
      this.row.processing_status = values[0];
      return [{ affectedRows: 1 }, []];
    }
    if (sql.includes('SELECT') && this.row) {
      return [[this.row], []];
    }
    return [{ affectedRows: 0 }, []];
  }
}

const mysqlConfig = {
  host: '127.0.0.1',
  port: 3306,
  database: 'dlr_test',
  user: 'test_user',
  password: 'test_password',
};

test('database pool rejects non-MySQL persistence and missing MySQL configuration', () => {
  assert.throws(
    () => createDatabasePool({ persistenceBackend: 'postgres', mysqlConfig, createPool: (options) => new FakeMySQLPool(options) }),
    /PERSISTENCE_BACKEND must be mysql/,
  );
  assert.throws(
    () => createDatabasePool({ persistenceBackend: 'mysql', mysqlConfig: {}, createPool: (options) => new FakeMySQLPool(options) }),
    /DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD are required/,
  );
});

test('database pool uses configured MySQL settings', () => {
  const pool = createDatabasePool({ persistenceBackend: 'mysql', mysqlConfig, createPool: (options) => new FakeMySQLPool(options) });
  assert.deepEqual(pool.rawPool.options, {
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
});

test('MySQL document repository persists metadata with parameterized statements', async () => {
  const pool = createDatabasePool({ persistenceBackend: 'mysql', mysqlConfig, createPool: (options) => new FakeMySQLPool(options) });
  const repository = new MySQLDocumentRepository(pool);
  const document = {
    document_id: 'DOC-TEST-001',
    created_by_user_id: '12345678-1234-1234-1234-123456789abc',
    original_filename: 'record.pdf',
    stored_filename: 'stored-record.pdf',
    file_type: 'pdf',
    mime_type: 'application/pdf',
    file_size: 120,
    storage_path: 'uploads/documents/stored-record.pdf',
    processing_status: 'UPLOADED',
    language: null,
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await repository.create(document);
  const found = await repository.findById(document.document_id);

  assert.equal(found.document_id, document.document_id);
  assert.equal(found.file_type, document.file_type);
  assert.equal(found.storage_path, document.storage_path);
  assert.equal(found.created_by_user_id, document.created_by_user_id);
  const updated = await repository.updateStatus(document.document_id, 'PROCESSED');
  assert.equal(updated.processing_status, 'PROCESSED');
  assert.equal(pool.rawPool.queries.length, 5);
  assert.ok(pool.rawPool.queries.every((query) => query.values.length > 0));
  assert.ok(pool.rawPool.queries.every((query) => !query.sql.includes(document.document_id)));
});
