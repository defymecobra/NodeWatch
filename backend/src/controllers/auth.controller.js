/**
 * NodeWatch - Auth Controller
 *
 * Handles user authentication for the dashboard.
 * POST /api/v1/auth/login    — login with email + password, get JWT
 * POST /api/v1/auth/register — create new user (admin only)
 * GET  /api/v1/auth/me       — get current user info from JWT
 */
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const db     = require('../db');

const JWT_SECRET     = process.env.JWT_SECRET || 'nodewatch-dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 * Returns: { token, user }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Fields "email" and "password" are required.',
      });
    }

    // Find user by email
    const result = await db.query(
      `SELECT id, email, password_hash, role, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const user = result.rows[0];

    // Compare password with stored hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email:  user.email,
        role:   user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/register
 * Body: { email, password, role? }
 * Requires: JWT with role = 'admin'
 */
const register = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Fields "email" and "password" are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
      });
    }

    const validRoles = ['admin', 'developer', 'guest'];
    const userRole = role && validRoles.includes(role) ? role : 'developer';

    // Check if user with this email already exists
    const existing = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists.',
      });
    }

    // Hash password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email.toLowerCase().trim(), passwordHash, userRole]
    );

    res.status(201).json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 * Returns current user info from JWT token
 */
const getMe = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, role, created_at FROM users WHERE id = $1`,
      [req.user.userId]
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
 * PATCH /api/v1/auth/profile
 * Update own email and/or password.
 * Body: { currentPassword, newEmail?, newPassword? }
 */
const updateProfile = async (req, res, next) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is required to make changes.',
      });
    }

    // Verify current password
    const userResult = await db.query(
      `SELECT id, email, password_hash FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const user = userResult.rows[0];
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect.',
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let idx = 1;

    if (newEmail && newEmail.trim() !== user.email) {
      // Check if email is already taken
      const existing = await db.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [newEmail.toLowerCase().trim(), user.id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'This email is already taken.',
        });
      }
      updates.push(`email = $${idx++}`);
      values.push(newEmail.toLowerCase().trim());
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters.',
        });
      }
      const hash = await bcrypt.hash(newPassword, 10);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No changes provided (newEmail or newPassword required).',
      });
    }

    values.push(user.id);
    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, role, created_at`,
      values
    );

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, getMe, updateProfile };
