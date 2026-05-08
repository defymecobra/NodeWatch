/**
 * NodeWatch - Log Routes
 *
 * POST /api/v1/logs       — ingest a new log entry (requires X-API-Key)
 * POST /api/v1/logs/test  — generate a test event (requires JWT, from dashboard)
 */
const { Router }        = require('express');
const { validateApiKey, validateJwt } = require('../middleware/auth');
const { ingestLog, generateTestEvent } = require('../controllers/logs.controller');

const router = Router();

// Test event generation — uses JWT auth (from dashboard UI)
router.post('/test', validateJwt, generateTestEvent);

// All other log routes require a valid API key
router.post('/', validateApiKey, ingestLog);

module.exports = router;
