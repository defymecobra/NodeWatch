const express = require('express');
const router = express.Router();
const { getMetrics, startSimulation, stopSimulation, seedHistory } = require('../controllers/system.controller');
const { getProjectUptime, getUptimeOverview } = require('../controllers/uptime.controller');
const { validateJwt, requireDeveloper, requireAdmin } = require('../middleware/auth');

router.use(validateJwt);

router.get('/metrics', requireDeveloper, getMetrics);
router.get('/uptime/overview', requireDeveloper, getUptimeOverview);
router.get('/uptime/:projectId', requireDeveloper, getProjectUptime);
router.post('/simulators/start', requireAdmin, startSimulation);
router.post('/simulators/stop', requireAdmin, stopSimulation);
router.post('/seed-history', requireAdmin, seedHistory);

module.exports = router;
