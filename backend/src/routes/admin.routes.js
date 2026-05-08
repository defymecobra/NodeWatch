/**
 * NodeWatch - Admin Routes
 *
 * All routes require JWT authentication + Admin role.
 * Mounted at: /api/v1/admin
 */
const { Router } = require('express');
const { validateJwt, requireAdmin } = require('../middleware/auth');
const {
  createProject,
  deleteProject,
  getProjectKeys,
  generateApiKey,
  deactivateKey,
  getProjectAlerts,
  createAlert,
  deleteAlert,
  getUsers,
  updateUserRole,
  deleteUser,
  cleanupLogs,
} = require('../controllers/admin.controller');

const router = Router();

// All admin routes require JWT + Admin role
router.use(validateJwt);
router.use(requireAdmin);

// ── Projects ──────────────────────────────────────────────────────────────────
router.post('/projects', createProject);
router.delete('/projects/:id', deleteProject);

// ── API Keys ──────────────────────────────────────────────────────────────────
router.get('/projects/:id/keys', getProjectKeys);
router.post('/projects/:id/keys', generateApiKey);
router.delete('/keys/:id', deactivateKey);

// ── Alert Configs ─────────────────────────────────────────────────────────────
router.get('/projects/:id/alerts', getProjectAlerts);
router.post('/projects/:id/alerts', createAlert);
router.delete('/alerts/:id', deleteAlert);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', getUsers);
router.patch('/users/:id', updateUserRole);
router.delete('/users/:id', deleteUser);

// ── Data Retention ────────────────────────────────────────────────────────────
router.delete('/logs/cleanup', cleanupLogs);

module.exports = router;
