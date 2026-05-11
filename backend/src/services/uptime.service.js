const axios = require('axios');
const db = require('../db');

/**
 * Uptime Monitoring Service
 * Periodically pings project URLs and records their status.
 */
class UptimeService {
  constructor() {
    this.interval = null;
    this.checkIntervalMs = 60000; // Check every 1 minute
  }

  /**
   * Start the monitoring loop
   */
  start() {
    console.log('📡 Uptime Monitoring Service started');
    this.runChecks(); // Run immediately on start
    this.interval = setInterval(() => this.runChecks(), this.checkIntervalMs);
  }

  /**
   * Stop the monitoring loop
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Perform health checks for all projects with an uptime_url
   */
  async runChecks() {
    try {
      const projectsRes = await db.query(
        'SELECT id, name, uptime_url FROM projects WHERE uptime_url IS NOT NULL AND uptime_url != \'\''
      );

      const projects = projectsRes.rows;
      if (projects.length === 0) return;

      console.log(`[Uptime] Checking ${projects.length} projects...`);

      // Run checks in parallel
      await Promise.all(projects.map(project => this.checkProject(project)));
    } catch (err) {
      console.error('[Uptime] Failed to fetch projects for checks:', err.message);
    }
  }

  /**
   * Ping a specific project and record results
   */
  async checkProject(project) {
    const startTime = Date.now();
    let status = 'down';
    let responseTime = null;
    let errorMessage = null;

    try {
      // We use a short timeout to prevent hanging the service
      const response = await axios.get(project.uptime_url, { 
        timeout: 10000,
        validateStatus: (s) => s >= 200 && s < 400 // Consider 2xx and 3xx as UP
      });
      
      status = 'up';
      responseTime = Date.now() - startTime;
    } catch (err) {
      status = 'down';
      responseTime = Date.now() - startTime;
      errorMessage = err.message;
      if (err.response) {
        errorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
      }
    }

    try {
      await db.query(
        `INSERT INTO uptime_checks (project_id, status, response_time, error_message)
         VALUES ($1, $2, $3, $4)`,
        [project.id, status, responseTime, errorMessage]
      );
    } catch (dbErr) {
      console.error(`[Uptime] Failed to save check for ${project.name}:`, dbErr.message);
    }
  }
}

module.exports = new UptimeService();
