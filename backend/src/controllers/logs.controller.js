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

/**
 * POST /api/v1/logs/test
 *
 * Generates a random test error event for a given project.
 * Requires JWT authentication (used from the dashboard UI).
 *
 * Body: { project_id }
 */
const db = require('../db');

const TEST_EVENTS = [
  { level: 'critical', message: 'Database connection pool exhausted: max connections reached', payload: { stack: 'Error: Connection pool exhausted\n    at Pool.connect (pg-pool/index.js:45:11)', env: 'production' } },
  { level: 'error', message: 'TypeError: Cannot read properties of null (reading "id")', payload: { stack: 'TypeError: Cannot read properties of null\n    at UserService.getProfile (services/user.js:28:15)', file: 'services/user.js', line: 28 } },
  { level: 'error', message: 'ECONNREFUSED: Redis connection refused at 127.0.0.1:6379', payload: { stack: 'Error: connect ECONNREFUSED 127.0.0.1:6379\n    at TCPConnectWrap.afterConnect', service: 'cache' } },
  { level: 'warn', message: 'Request rate limit exceeded for IP 192.168.1.100', payload: { ip: '192.168.1.100', endpoint: '/api/v1/auth/login', limit: '100/min' } },
  { level: 'error', message: 'JWT token verification failed: invalid signature', payload: { stack: 'JsonWebTokenError: invalid signature\n    at verify (jsonwebtoken/verify.js:75:17)', header: 'Bearer eyJhbGci...' } },
  { level: 'critical', message: 'Out of memory: heap allocation failed', payload: { heapUsed: '1.9GB', heapTotal: '2.0GB', rss: '2.1GB' } },
  { level: 'warn', message: 'Deprecated API endpoint /v1/users/legacy called', payload: { caller: 'mobile-app-v2.3', replacement: '/v2/users' } },
  { level: 'info', message: 'Scheduled backup completed successfully', payload: { duration: '12.5s', size: '256MB', destination: 's3://backups/' } },
  { level: 'error', message: 'File upload failed: payload too large (max 10MB)', payload: { fileSize: '25MB', fileName: 'report.pdf', mimeType: 'application/pdf' } },
  { level: 'critical', message: 'SSL certificate expires in 2 days', payload: { domain: 'api.example.com', expiresAt: '2026-05-10T00:00:00Z' } },
];

const generateTestEvent = async (req, res, next) => {
  try {
    const { project_id } = req.body;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'Field "project_id" is required.',
      });
    }

    let projects = [];

    if (project_id === 'all') {
      // Fetch all projects
      const allProjects = await db.query(`SELECT id, name FROM projects`);
      projects = allProjects.rows;
      if (projects.length === 0) {
        return res.status(404).json({ success: false, error: 'No projects found.' });
      }
    } else {
      // Verify specific project exists
      const projectCheck = await db.query(
        `SELECT id, name FROM projects WHERE id = $1`,
        [project_id]
      );
      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found.' });
      }
      projects = [projectCheck.rows[0]];
    }

    const generatedLogs = [];

    // Generate event for each project
    for (const project of projects) {
      const baseEvent = TEST_EVENTS[Math.floor(Math.random() * TEST_EVENTS.length)];
      
      // Append a unique timestamp to the message so it's NEVER deduplicated,
      // guaranteeing that processAlerts treats it as a new error and sends the Telegram alert instantly.
      const uniqueMessage = `[TEST ${new Date().toISOString()}] ${baseEvent.message}`;

      const result = await processLog({
        project_id: project.id,
        level: baseEvent.level,
        message: uniqueMessage,
        payload: baseEvent.payload,
      });

      // Trigger alerts asynchronously (always pass false for isDuplicate since it's unique)
      processAlerts(
        { id: project.id, name: project.name },
        result.log,
        false
      ).catch((err) => console.error('Alert processing error:', err));

      generatedLogs.push({
        project_name: project.name,
        level: result.log.level,
        message: result.log.message
      });
    }

    res.status(201).json({
      success: true,
      isDuplicate: false,
      message: `Generated ${generatedLogs.length} test events.`,
      log: generatedLogs[0], // Keep for backward compatibility with frontend toast
      logs: generatedLogs
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { ingestLog, generateTestEvent };
