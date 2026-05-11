const { pool } = require('./backend/src/db');

async function check() {
  const res = await pool.query('SELECT id, label, is_active FROM api_keys');
  console.log('API KEYS:');
  console.table(res.rows);
  process.exit(0);
}

check();
