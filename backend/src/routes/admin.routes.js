/**
 * NodeWatch - Admin Routes
 *
 * Routes split by access level:
 * - Developer+ (admin & developer): Projects, API Keys, Alerts
 * - Admin only: Users, Data Retention
 *
 * Mounted at: /api/v1/admin
 */
const { Router } = require('express');
const { validateJwt, requireAdmin, requireDeveloper } = require('../middleware/auth');
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

// All admin routes require JWT
router.use(validateJwt);

// ── Developer+ Routes (admin & developer) ────────────────────────────────────

// Projects
router.post('/projects', requireDeveloper, createProject);
router.delete('/projects/:id', requireDeveloper, deleteProject);

// API Keys
router.get('/projects/:id/keys', requireDeveloper, getProjectKeys);
router.post('/projects/:id/keys', requireDeveloper, generateApiKey);
router.delete('/keys/:id', requireDeveloper, deactivateKey);

// Alert Configs
router.get('/projects/:id/alerts', requireDeveloper, getProjectAlerts);
router.post('/projects/:id/alerts', requireDeveloper, createAlert);
router.delete('/alerts/:id', requireDeveloper, deleteAlert);

// ── Admin-only Routes ─────────────────────────────────────────────────────────

// Users
router.get('/users', requireAdmin, getUsers);
router.patch('/users/:id', requireAdmin, updateUserRole);
router.delete('/users/:id', requireAdmin, deleteUser);

// Data Retention
router.delete('/logs/cleanup', requireAdmin, cleanupLogs);

module.exports = router;
