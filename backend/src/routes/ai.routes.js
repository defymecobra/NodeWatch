const express = require('express');
const router = express.Router();
const { analyzeError, getStrategicAdvice } = require('../controllers/ai.controller');
const { validateJwt, requireDeveloper } = require('../middleware/auth');

router.use(validateJwt);

// POST /api/v1/ai/analyze
// Protected route: only developers and admins can request AI analysis
router.post('/analyze', requireDeveloper, analyzeError);

// GET /api/v1/ai/advisor
// Protected route: only developers and admins can request strategic advice
router.get('/advisor', requireDeveloper, getStrategicAdvice);

module.exports = router;
