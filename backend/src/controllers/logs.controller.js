/**
 * NodeWatch - Logs Controller
 *
 * Handles incoming error/log events from external applications.
 * POST /api/v1/logs — receive a single log entry
 */
const { processLog } = require('../services/deduplication');
const { processAlerts } = require('../services/alerts');

// Valid log levels
const VALID_LEVELS = ['info', 'warn', 'error', 'critical'];

/**
 * POST /api/v1/logs
 *
 * Expected body:
 * {
 *   "level":   "error",          // required: info | warn | error | critical
 *   "message": "Something broke", // required: text description
 *   "payload": {                  // optional: additional context
 *     "stack": "Error: ...",
 *     "file":  "app.js",
 *     "line":  42,
 *     "env":   "production",
 *     "context": { ... }
 *   }
 * }
 */
const ingestLog = async (req, res, next) => {
  try {
    const { level, message, payload } = req.body;

    // ── Validation ────────────────────────────────────────────────────────
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Field "message" is required and must be a non-empty string.',
      });
    }

    if (!level || !VALID_LEVELS.includes(level)) {
      return res.status(400).json({
        success: false,
        error: `Field "level" is required. Valid values: ${VALID_LEVELS.join(', ')}`,
      });
    }

    if (payload && typeof payload !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Field "payload" must be an object if provided.',
      });
    }

    // ── Process with deduplication ────────────────────────────────────────
    const result = await processLog({
      project_id: req.projectId, // set by auth middleware
      level,
      message: message.trim(),
      payload: payload || {},
    });

    // 201 = new record, 200 = duplicate incremented
    const statusCode = result.isDuplicate ? 200 : 201;

    // Asynchronously process alerts (don't block the API response)
    processAlerts(
      { id: req.projectId, name: req.projectName },
      result.log,
      result.isDuplicate
    ).catch((err) => console.error('Alert processing error:', err));

    res.status(statusCode).json({
      success: true,
      isDuplicate: result.isDuplicate,
      log: {
        id:               result.log.id,
        level:            result.log.level,
        message:          result.log.message,
        error_hash:       result.log.error_hash,
        occurrence_count: result.log.occurrence_count,
        created_at:       result.log.created_at,
        last_seen_at:     result.log.last_seen_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { ingestLog };
