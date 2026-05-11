const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { pool } = require('./db');

async function migrate() {
  console.log('🚀 Starting Server Config migration...');
  
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS server_config (
          config_key   VARCHAR(100) PRIMARY KEY,
          config_value TEXT NOT NULL,
          updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Seed default values
    const defaults = [
      ['dedup_window_seconds', '60'],
      ['data_retention_days', '90'],
      ['max_payload_size_kb', '1024'],
      ['alert_cooldown_seconds', '300'],
      ['gemini_api_key', process.env.GEMINI_API_KEY || ''],
      ['telegram_bot_token', process.env.TELEGRAM_BOT_TOKEN || '']
    ];

    for (const [key, val] of defaults) {
      await client.query(`
        INSERT INTO server_config (config_key, config_value)
        VALUES ($1, $2)
        ON CONFLICT (config_key) DO NOTHING
      `, [key, val]);
    }

    await client.query('COMMIT');
    console.log('✅ Server Config migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
