/**
 * NodeWatch - Auth Routes
 *
 * POST /api/v1/auth/login    — public, returns JWT
 * POST /api/v1/auth/register — requires JWT + admin role
 * GET  /api/v1/auth/me       — requires JWT
 */
const { Router } = require('express');
const { validateJwt, requireAdmin } = require('../middleware/auth');
const { login, register, getMe, updateProfile } = require('../controllers/auth.controller');

const router = Router();

// Public route
router.post('/login', login);

// Protected routes (require JWT)
router.get('/me', validateJwt, getMe);
router.patch('/profile', validateJwt, updateProfile);
router.post('/register', validateJwt, requireAdmin, register);

module.exports = router;
