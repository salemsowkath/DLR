const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function migrationApplied(migrationId) {
  const result = await pool.query(
    'SELECT migration_id FROM schema_migrations WHERE migration_id = ?',
    [migrationId],
  );
  return result.rows.length > 0;
}

async function shouldApply(rawStatement) {
  const statement = rawStatement.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!statement) return false;

  const createTableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
  if (createTableMatch) {
    return true;
  }

  const columnMatch = statement.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/i);
  if (columnMatch) {
    const result = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [columnMatch[1], columnMatch[2]],
    );
    return result.rows.length === 0;
  }

  const indexMatch = statement.match(/ALTER TABLE (\w+) ADD (?:UNIQUE KEY|INDEX|KEY) (\w+)/i);
  if (indexMatch) {
    const result = await pool.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [indexMatch[1], indexMatch[2]],
    );
    return result.rows.length === 0;
  }

  const modifyColumnMatch = statement.match(/ALTER TABLE (\w+) MODIFY COLUMN (\w+)/i);
  if (modifyColumnMatch) {
    return true;
  }

  const constraintMatch = statement.match(/ALTER TABLE (\w+) ADD (?:CONSTRAINT|FOREIGN KEY)/i);
  if (constraintMatch) {
    return true;
  }

  const dataMatch = statement.match(/^(?:INSERT|REPLACE|UPDATE)\b/i);
  if (dataMatch) {
    return true;
  }

  throw new Error(`Unsupported migration statement: ${statement}`);
}

async function migrateSchema() {
  if (!pool) {
    throw new Error('MySQL is required to run database migrations.');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_id VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ) ENGINE=InnoDB
  `);

  const migrationsDirectory = path.resolve(__dirname, '../../../database/migrations');
  const migrationFiles = fs.readdirSync(migrationsDirectory)
    .filter((filename) => /^\d+_[\w-]+\.sql$/.test(filename))
    .sort();

  for (const filename of migrationFiles) {
    const migrationId = filename.replace(/\.sql$/, '');
    if (await migrationApplied(migrationId)) continue;

    const contents = fs.readFileSync(path.join(migrationsDirectory, filename), 'utf8');
    const statements = contents.split(';').map((statement) => statement.trim()).filter(Boolean);
    for (const rawStatement of statements) {
      const cleanStatement = rawStatement.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!cleanStatement) continue;
      if (await shouldApply(cleanStatement)) await pool.query(cleanStatement);
    }
    await pool.query('INSERT INTO schema_migrations (migration_id) VALUES (?)', [migrationId]);
    console.log(`Applied MySQL migration ${migrationId}.`);
  }
}

if (require.main === module) {
  migrateSchema()
    .then(() => pool.rawPool.end())
    .catch(async (error) => {
      console.error('MySQL migration failed:', error.message);
      if (pool) await pool.rawPool.end();
      process.exitCode = 1;
    });
}

module.exports = { migrateSchema };
