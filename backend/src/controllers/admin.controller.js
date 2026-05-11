/**
 * NodeWatch - Admin Controller
 *
 * Administrative endpoints for managing projects, API keys,
 * alert configurations, users, and data retention.
 * All endpoints require JWT authentication + Admin role.
 *
 * Projects:
 *   POST   /admin/projects           — create project
 *   DELETE /admin/projects/:id       — delete project
 *
 * API Keys:
 *   GET    /admin/projects/:id/keys  — list keys for a project
 *   POST   /admin/projects/:id/keys  — generate new API key
 *   DELETE /admin/keys/:id           — deactivate key
 *
 * Alerts:
 *   GET    /admin/projects/:id/alerts — list alert configs
 *   POST   /admin/projects/:id/alerts — create alert config
 *   DELETE /admin/alerts/:id          — delete alert config
 *
 * Users:
 *   GET    /admin/users              — list all users
 *   PATCH  /admin/users/:id          — update user role
 *   DELETE /admin/users/:id          — delete user
 *
 * Logs:
 *   DELETE /admin/logs/cleanup       — purge old logs
 */
const crypto = require('crypto');
const db = require('../db');

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /admin/projects
 * Body: { name }
 */
const createProject = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Field "name" is required.',
      });
    }

    const result = await db.query(
      `INSERT INTO projects (name, owner_id)
       VALUES ($1, $2)
       RETURNING id, name, owner_id, created_at`,
      [name.trim(), req.user.userId]
    );

    res.status(201).json({
      success: true,
      project: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /admin/projects/:id
 */
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM projects WHERE id = $1 RETURNING id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found.',
      });
    }

    res.json({
      success: true,
      message: `Project "${result.rows[0].name}" deleted.`,
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API KEYS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/projects/:id/keys
 */
const getProjectKeys = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, label, is_active, created_at
       FROM api_keys
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({ success: true, keys: result.rows });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/projects/:id/keys
 * Body: { label? }
 *
 * Generates a random API key, hashes it with SHA-256,
 * stores the hash, and returns the raw key ONCE.
 */
const generateApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label } = req.body;

    // Verify project exists
    const projectCheck = await db.query(
      `SELECT id FROM projects WHERE id = $1`,
      [id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found.',
      });
    }

    // Generate a cryptographically secure random key
    const rawKey = `nw_${crypto.randomBytes(32).toString('hex')}`;

    // Hash it with SHA-256 for storage
    const keyHash = crypto
      .createHash('sha256')
      .update(rawKey)
      .digest('hex');

    const result = await db.query(
      `INSERT INTO api_keys (project_id, key_hash, label)
       VALUES ($1, $2, $3)
       RETURNING id, label, is_active, created_at`,
      [id, keyHash, (label || 'default').trim()]
    );

    res.status(201).json({
      success: true,
      key: {
        ...result.rows[0],
        raw_key: rawKey, // ⚠️ Shown only once! User must copy it now.
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /admin/keys/:id
 * Deactivates an API key (soft delete).
 */
const deactivateKey = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE api_keys SET is_active = false WHERE id = $1 RETURNING id, label`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'API key not found.',
      });
    }

    res.json({
      success: true,
      message: `API key "${result.rows[0].label}" deactivated.`,
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT CONFIGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/projects/:id/alerts
 */
const getProjectAlerts = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, channel, recipient_id, min_level, is_enabled, created_at
       FROM alert_configs
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({ success: true, alerts: result.rows });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/projects/:id/alerts
 * Body: { channel?, recipient_id, min_level? }
 */
const createAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { channel, recipient_id, min_level } = req.body;

    if (!recipient_id || typeof recipient_id !== 'string' || recipient_id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Field "recipient_id" is required (e.g., Telegram Chat ID).',
      });
    }

    const validChannels = ['telegram', 'email', 'discord'];
    const validLevels = ['info', 'warn', 'error', 'critical'];

    const alertChannel = validChannels.includes(channel) ? channel : 'telegram';
    const alertLevel = validLevels.includes(min_level) ? min_level : 'error';

    const result = await db.query(
      `INSERT INTO alert_configs (project_id, channel, recipient_id, min_level)
       VALUES ($1, $2, $3, $4)
       RETURNING id, channel, recipient_id, min_level, is_enabled, created_at`,
      [id, alertChannel, recipient_id.trim(), alertLevel]
    );

    res.status(201).json({
      success: true,
      alert: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /admin/alerts/:id
 */
const deleteAlert = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM alert_configs WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert config not found.',
      });
    }

    res.json({
      success: true,
      message: 'Alert config deleted.',
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, role, created_at FROM users ORDER BY created_at DESC`
    );

    res.json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /admin/users/:id
 * Body: { role?, email?, password? }
 * Admin can change role, email, and/or password of any user (except self-role).
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, email, password } = req.body;

    const validRoles = ['admin', 'developer', 'guest'];

    // Prevent admin from demoting themselves
    if (role && id === req.user.userId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot change your own role.',
      });
    }

    // Build dynamic update
    const updates = [];
    const values = [];
    let idx = 1;

    if (role) {
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Field "role" must be one of: ${validRoles.join(', ')}`,
        });
      }
      updates.push(`role = $${idx++}`);
      values.push(role);
    }

    if (email && email.trim()) {
      // Check uniqueness
      const existing = await db.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [email.toLowerCase().trim(), id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'This email is already taken.',
        });
      }
      updates.push(`email = $${idx++}`);
      values.push(email.toLowerCase().trim());
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters.',
        });
      }
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No changes provided (role, email, or password required).',
      });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, role`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /admin/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.userId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account.',
      });
    }

    const result = await db.query(
      `DELETE FROM users WHERE id = $1 RETURNING id, email`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    res.json({
      success: true,
      message: `User "${result.rows[0].email}" deleted.`,
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA RETENTION (Log Cleanup)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /admin/logs/cleanup
 * Body: { days }
 * Deletes all error_logs older than `days` days.
 */
const cleanupLogs = async (req, res, next) => {
  try {
    const { days } = req.body;

    if (!days || typeof days !== 'number' || days < 1) {
      return res.status(400).json({
        success: false,
        error: 'Field "days" is required and must be a positive number.',
      });
    }

    const result = await db.query(
      `DELETE FROM error_logs
       WHERE created_at < NOW() - INTERVAL '1 day' * $1
       RETURNING id`,
      [days]
    );

    res.json({
      success: true,
      deleted_count: result.rows.length,
      message: `Deleted ${result.rows.length} log(s) older than ${days} day(s).`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
