const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { validateJwt, requireDeveloper } = require('../middleware/auth');

// POST /api/v1/ai/analyze
// Protected route: only developers and admins can request AI analysis
router.post('/analyze', validateJwt, requireDeveloper, aiController.analyzeError);

module.exports = router;
