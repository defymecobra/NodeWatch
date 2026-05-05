const { Pool } = require('pg');

// PostgreSQL connection pool
// Uses environment variables from .env
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  user:     process.env.DB_USER     || 'nodewatch',
  password: process.env.DB_PASSWORD || 'nodewatch_secret',
  database: process.env.DB_NAME     || 'nodewatch_db',
  max: 10,              // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
  release();
  console.log('✅ Connected to PostgreSQL');
});

/**
 * Execute a raw SQL query.
 * @param {string} text - SQL query string with $1, $2... placeholders
 * @param {Array}  params - Array of parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };
