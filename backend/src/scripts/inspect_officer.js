const { pool } = require('../config/database');

async function run() {
  const cases = await pool.query('SELECT case_id, status, assigned_officer_id, reviewed_by, created_at FROM review_cases');
  console.log('Cases:', JSON.stringify(cases.rows, null, 2));

  const corrections = await pool.query('SELECT * FROM officer_corrections');
  console.log('Corrections count:', corrections.rows.length);

  const notes = await pool.query('SELECT * FROM officer_notes');
  console.log('Notes count:', notes.rows.length);

  const audits = await pool.query('SELECT event_type, actor_type, actor_reference, created_at FROM audit_events ORDER BY created_at DESC LIMIT 10');
  console.log('Audits:', JSON.stringify(audits.rows, null, 2));

  process.exit(0);
}

run().catch(console.error);
