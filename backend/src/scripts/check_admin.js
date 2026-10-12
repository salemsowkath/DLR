const { pool } = require('../config/database');

async function run() {
  const res = await pool.query(`
    SELECT u.id, u.username, u.name, u.email, u.status, u.password_hash, GROUP_CONCAT(r.role_name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    GROUP BY u.id
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
