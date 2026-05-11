/**
 * NodeWatch - Analytics Routes
 *
 * All analytics endpoints require JWT auth but are available to all roles.
 */
const { Router } = require('express');
const { validateJwt } = require('../middleware/auth');
const {
  getOverview,
  getHeatmap,
  getTopErrors,
  getHealth,
} = require('../controllers/analytics.controller');

const router = Router();

router.get('/overview',   validateJwt, getOverview);
router.get('/heatmap',    validateJwt, getHeatmap);
router.get('/top-errors', validateJwt, getTopErrors);
router.get('/health',     validateJwt, getHealth);

module.exports = router;
