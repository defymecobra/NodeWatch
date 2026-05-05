/**
 * NodeWatch - Authentication Middleware
 *
 * Validates incoming requests using an API key (X-API-Key header).
 * The key is hashed with SHA-256 and compared against stored hashes in the DB.
 */
const crypto = require('crypto');
const db     = require('../db');

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

module.exports = { validateApiKey };
