/**
 * NodeWatch - Deduplication Service
 *
 * Uses MD5 hashing of (message + stack trace) to identify duplicate errors.
 * If a matching hash exists for the same project within the dedup window (1 min),
 * we increment the occurrence_count instead of creating a new record.
 */
const crypto = require('crypto');
const db     = require('../db');

// Time window for deduplication (in seconds)
const DEDUP_WINDOW_SECONDS = 60;

/**
 * Generate an MD5 hash from the error message and stack trace.
 * This hash is used as a "fingerprint" for deduplication.
 *
 * @param {string} message  - Error message
 * @param {string} [stack]  - Stack trace (optional)
 * @returns {string} 32-char hex MD5 hash
 */
function generateHash(message, stack = '') {
  return crypto
    .createHash('md5')
    .update(`${message}::${stack}`)
    .digest('hex');
}

/**
 * Process an incoming error log with deduplication.
 *
 * Algorithm:
 * 1. Compute MD5(message + stack)
 * 2. Look for an existing record with same hash + project_id within the last DEDUP_WINDOW
 * 3. If found → UPDATE: increment occurrence_count, refresh last_seen_at
 * 4. If not found → INSERT new record
 *
 * @param {Object} logData
 * @param {string} logData.project_id  - UUID of the project
 * @param {string} logData.level       - 'info' | 'warn' | 'error' | 'critical'
 * @param {string} logData.message     - Error message text
 * @param {Object} [logData.payload]   - Additional data (stack, file, line, env, context)
 * @returns {Promise<{log: Object, isDuplicate: boolean}>}
 */
async function processLog(logData) {
  const { project_id, level, message, payload } = logData;
  const stack = payload?.stack || '';
  const errorHash = generateHash(message, stack);

  // Step 1: Try to find an existing duplicate within the time window
  const duplicateResult = await db.query(
    `SELECT id, occurrence_count
     FROM error_logs
     WHERE error_hash  = $1
       AND project_id  = $2
       AND last_seen_at > NOW() - INTERVAL '${DEDUP_WINDOW_SECONDS} seconds'
     LIMIT 1`,
    [errorHash, project_id]
  );

  // Step 2a: Duplicate found → update
  if (duplicateResult.rows.length > 0) {
    const existing = duplicateResult.rows[0];
    const updateResult = await db.query(
      `UPDATE error_logs
       SET occurrence_count = occurrence_count + 1,
           last_seen_at     = NOW()
       WHERE id = $1
       RETURNING *`,
      [existing.id]
    );

    return {
      log: updateResult.rows[0],
      isDuplicate: true,
    };
  }

  // Step 2b: No duplicate → insert new record
  const insertResult = await db.query(
    `INSERT INTO error_logs (project_id, level, message, payload, error_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [project_id, level, message, JSON.stringify(payload || {}), errorHash]
  );

  return {
    log: insertResult.rows[0],
    isDuplicate: false,
  };
}

module.exports = {
  processLog,
  generateHash,
  DEDUP_WINDOW_SECONDS,
};
