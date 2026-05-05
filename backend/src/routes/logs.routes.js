/**
 * NodeWatch - Log Routes
 *
 * POST /api/v1/logs  — ingest a new log entry (requires X-API-Key)
 */
const { Router }        = require('express');
const { validateApiKey } = require('../middleware/auth');
const { ingestLog }      = require('../controllers/logs.controller');

const router = Router();

// All log routes require a valid API key
router.use(validateApiKey);

// POST /api/v1/logs
router.post('/', ingestLog);

module.exports = router;
