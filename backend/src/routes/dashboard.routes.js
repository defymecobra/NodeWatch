/**
 * NodeWatch - Dashboard Routes
 *
 * All routes require JWT authentication.
 *
 * GET /api/v1/dashboard/projects     — list projects
 * GET /api/v1/dashboard/stats        — project statistics
 * GET /api/v1/dashboard/logs         — paginated log list
 * GET /api/v1/dashboard/logs/:id     — single log details
 */
const { Router } = require('express');
const { validateJwt } = require('../middleware/auth');
const {
  getProjects,
  getStats,
  getLogs,
  getLogById,
} = require('../controllers/dashboard.controller');

const router = Router();

// All dashboard routes require a valid JWT
router.use(validateJwt);

router.get('/projects', getProjects);
router.get('/stats',    getStats);
router.get('/logs',     getLogs);
router.get('/logs/:id', getLogById);

module.exports = router;
