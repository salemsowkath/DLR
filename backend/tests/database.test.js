const test = require('node:test');
const assert = require('node:assert/strict');

const { createDatabasePool } = require('../src/config/database');
const { PostgresDocumentRepository } = require('../src/repositories/documentRepository');

class FakePool {
  constructor(options) {
    this.options = options;
    this.queries = [];
    this.row = null;
  }

  async query(text, values) {
    this.queries.push({ text, values });
    if (text.includes('INSERT INTO documents')) {
      this.row = { document_id: values[0], file_type: values[1], original_filename: values[2], stored_filename: values[3], mime_type: values[4], file_size: values[5], storage_path: values[6], processing_status: values[7], language: values[8], uploaded_at: values[9], updated_at: values[10] };
    }
    if (text.includes('UPDATE documents') && this.row) {
      this.row = { ...this.row, processing_status: values[0], updated_at: values[1] };
      return { rows: [this.row], rowCount: 1 };
    }
    if (text.includes('SELECT') && this.row) {
      return { rows: [this.row] };
    }
    return { rows: [] };
  }
}

test('database pool stays disabled unless PostgreSQL persistence is explicitly selected', () => {
  assert.equal(createDatabasePool({ persistenceBackend: 'memory', Pool: FakePool }), null);
  assert.throws(
    () => createDatabasePool({ persistenceBackend: 'postgres', postgres: {}, PoolClass: FakePool }),
    /connection settings are incomplete/,
  );
});

test('database pool uses a configured connection URL without logging it', () => {
  const pool = createDatabasePool({
    persistenceBackend: 'postgres',
    databaseUrl: 'postgresql://demo:secret@localhost:5432/dlr_database',
    PoolClass: FakePool,
  });
  assert.ok(pool instanceof FakePool);
  assert.equal(pool.options.connectionString, 'postgresql://demo:secret@localhost:5432/dlr_database');
});

test('Postgres document repository writes and reads metadata using parameterized SQL', async () => {
  const pool = new FakePool();
  const repository = new PostgresDocumentRepository(pool);
  const document = {
    document_id: 'DOC-TEST-001',
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
  assert.equal(found.processing_status, document.processing_status);
  const updated = await repository.updateStatus(document.document_id, 'PROCESSED');
  assert.equal(updated.processing_status, 'PROCESSED');
  assert.equal(pool.queries.length, 3);
  assert.ok(pool.queries.every((query) => query.values.length > 0));
  assert.ok(pool.queries.every((query) => !query.text.includes(document.document_id)));
});
