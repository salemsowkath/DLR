const { pool } = require('../config/database');

async function run() {
  await pool.query("UPDATE users SET status = 'ACTIVE' WHERE username IN ('DEMO-OFFICER-001', 'DEMO-MINISTER-001', 'DEMO-CITIZEN-001', 'Dora027', 'AADHAAR-XXXX-XXXX-1234') OR id IN ('usr-aadhaar-1234', 'usr-citizen-001', 'usr-officer-001', 'usr-minister-001', 'usr-superadmin-001')");
  console.log('Demo users restored to ACTIVE.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
