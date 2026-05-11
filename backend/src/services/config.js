const { pool } = require('../db');

/**
 * ConfigService handles dynamic server configuration stored in the database.
 * It uses an in-memory cache for fast access.
 */
class ConfigService {
  constructor() {
    this.cache = new Map();
    this.isLoaded = false;
  }

  /**
   * Load all configurations from the database into memory.
   */
  async loadFromDb() {
    try {
      const res = await pool.query('SELECT config_key, config_value FROM server_config');
      this.cache.clear();
      res.rows.forEach(row => {
        this.cache.set(row.config_key, row.config_value);
      });
      this.isLoaded = true;
      console.log(`⚙️ Loaded ${this.cache.size} config parameters from DB`);
    } catch (err) {
      console.error('❌ Failed to load server config:', err.message);
    }
  }

  /**
   * Get a config value by key.
   * @param {string} key - The config key
   * @param {any} defaultValue - Fallback value if key is missing
   * @returns {string|any}
   */
  get(key, defaultValue = null) {
    if (!this.isLoaded) {
      // If not loaded yet, we might want to return from env or default
      return process.env[key.toUpperCase()] || defaultValue;
    }
    return this.cache.has(key) ? this.cache.get(key) : (process.env[key.toUpperCase()] || defaultValue);
  }

  /**
   * Set a config value in both DB and cache.
   * @param {string} key 
   * @param {any} value 
   */
  async set(key, value) {
    try {
      await pool.query(
        `INSERT INTO server_config (config_key, config_value, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (config_key) 
         DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW()`,
        [key, String(value)]
      );
      this.cache.set(key, String(value));
      return true;
    } catch (err) {
      console.error(`❌ Failed to set config ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Get all config entries as an object.
   */
  async getAll() {
    const configs = {};
    this.cache.forEach((val, key) => {
      configs[key] = val;
    });
    return configs;
  }
}

// Export singleton
module.exports = new ConfigService();
