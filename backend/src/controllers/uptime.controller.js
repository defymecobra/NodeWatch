const db = require('../db');

/**
 * Uptime Controller
 * Handles requests for project availability data.
 */

/**
 * GET /api/v1/system/uptime/:projectId?range=24h
 * Get uptime history for a specific project.
 */
const getProjectUptime = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { range = '24h' } = req.query;

    let timeFilter = 'NOW() - INTERVAL \'24 hours\'';
    if (range === '7d') timeFilter = 'NOW() - INTERVAL \'7 days\'';
    if (range === '30d') timeFilter = 'NOW() - INTERVAL \'30 days\'';

    const checksRes = await db.query(
      `SELECT status, response_time, checked_at 
       FROM uptime_checks 
       WHERE project_id = $1 AND checked_at >= ${timeFilter}
       ORDER BY checked_at ASC`,
      [projectId]
    );

    res.json({
      success: true,
      checks: checksRes.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/system/uptime/overview
 * Get current status of all projects with uptime monitoring.
 */
const getUptimeOverview = async (req, res, next) => {
  try {
    // Get last check for each project
    const overviewRes = await db.query(`
      SELECT DISTINCT ON (p.id)
        p.id, p.name, p.uptime_url,
        uc.status, uc.response_time, uc.checked_at, uc.error_message
      FROM projects p
      LEFT JOIN uptime_checks uc ON p.id = uc.project_id
      WHERE p.uptime_url IS NOT NULL AND p.uptime_url != ''
      ORDER BY p.id, uc.checked_at DESC
    `);

    res.json({
      success: true,
      projects: overviewRes.rows
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProjectUptime, getUptimeOverview };
