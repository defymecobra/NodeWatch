const crypto = require('crypto');
const { pool } = require('./backend/src/db');

async function check() {
  const rawKey = 'iot-sensor-hub-key';
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  
  const res = await pool.query('SELECT label, is_active FROM api_keys WHERE key_hash = $1', [keyHash]);
  console.log(`Searching for key: ${rawKey} (Hash: ${keyHash})`);
  console.table(res.rows);
  process.exit(0);
}

check();
