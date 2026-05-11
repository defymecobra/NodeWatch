const configService = require('../services/config');

/**
 * GET /api/v1/admin/config
 * Returns all server configuration parameters (masked).
 */
exports.getConfig = async (req, res) => {
  try {
    const configs = await configService.getAll();
    
    // Mask sensitive keys for security
    const maskedConfigs = { ...configs };
    const sensitiveKeys = ['gemini_api_key', 'telegram_bot_token'];
    
    sensitiveKeys.forEach(key => {
      if (maskedConfigs[key] && maskedConfigs[key].length > 8) {
        maskedConfigs[key] = maskedConfigs[key].slice(0, 4) + '••••' + maskedConfigs[key].slice(-4);
      } else if (maskedConfigs[key]) {
        maskedConfigs[key] = '••••••••';
      }
    });

    res.json({ success: true, config: maskedConfigs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/v1/admin/config
 * Updates multiple config parameters.
 */
exports.updateConfig = async (req, res) => {
  try {
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid updates format' });
    }

    for (const [key, value] of Object.entries(updates)) {
      // Skip if value is masked (means it wasn't changed by the user)
      if (typeof value === 'string' && value.includes('••••')) continue;
      
      await configService.set(key, value);
    }

    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
