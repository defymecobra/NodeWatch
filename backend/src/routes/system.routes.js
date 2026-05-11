const express = require('express');
const router = express.Router();
const { getMetrics, startSimulation, stopSimulation, seedHistory } = require('../controllers/system.controller');
const { validateJwt, requireDeveloper, requireAdmin } = require('../middleware/auth');

router.use(validateJwt);

router.get('/metrics', requireDeveloper, getMetrics);
router.post('/simulators/start', requireAdmin, startSimulation);
router.post('/simulators/stop', requireAdmin, stopSimulation);
router.post('/seed-history', requireAdmin, seedHistory);

module.exports = router;
