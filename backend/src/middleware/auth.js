/**
 * NodeWatch - Authentication Middleware
 *
 * Two authentication strategies:
 * 1. API Key (X-API-Key header) — for external services sending logs
 * 2. JWT (Authorization: Bearer <token>) — for dashboard users
 */
const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const db     = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'nodewatch-dev-secret-change-me';

// ── Strategy 1: API Key ───────────────────────────────────────────────────────

/**
 * Middleware: Authenticate via API Key.
 *
 * External services (clients) must include the header:
 *   X-API-Key: <raw-api-key>
 *
 * The middleware:
 * 1. Extracts the key from the header
 * 2. Computes SHA-256(key) to get key_hash
 * 3. Looks up the hash in api_keys table
 * 4. Checks that the key is active
 * 5. Attaches project_id to req for use in controllers
 */
const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Missing API key. Provide it via the X-API-Key header.',
      });
    }

    // Hash the provided key with SHA-256 (same way it's stored in DB)
    const keyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    // Look up the key in the database
    const result = await db.query(
      `SELECT ak.id, ak.project_id, ak.is_active, p.name AS project_name
       FROM api_keys ak
       JOIN projects p ON p.id = ak.project_id
       WHERE ak.key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key.',
      });
    }

    const keyRecord = result.rows[0];

    if (!keyRecord.is_active) {
      return res.status(403).json({
        success: false,
        error: 'API key is deactivated. Contact your administrator.',
      });
    }

    // Attach project info to the request object for downstream use
    req.projectId   = keyRecord.project_id;
    req.projectName = keyRecord.project_name;
    req.apiKeyId    = keyRecord.id;

    next();
  } catch (err) {
    next(err);
  }
};

// ── Strategy 2: JWT Token ─────────────────────────────────────────────────────

/**
 * Middleware: Authenticate via JWT Bearer token.
 *
 * Dashboard users must include the header:
 *   Authorization: Bearer <jwt-token>
 *
 * On success, attaches req.user = { userId, email, role }
 */
const validateJwt = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header. Use: Bearer <token>',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email:  decoded.email,
      role:   decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please log in again.',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
      });
    }
    next(err);
  }
};

/**
 * Middleware: Require admin role.
 * Must be used AFTER validateJwt.
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin role required.',
    });
  }
  next();
};

module.exports = { validateApiKey, validateJwt, requireAdmin };
