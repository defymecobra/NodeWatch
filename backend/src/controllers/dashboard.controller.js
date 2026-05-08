/**
 * NodeWatch - Dashboard Controller
 *
 * Provides data for the web dashboard.
 * All endpoints require JWT authentication.
 *
 * GET /api/v1/dashboard/stats      — summary stats for a project
 * GET /api/v1/dashboard/logs       — paginated list of error logs
 * GET /api/v1/dashboard/logs/:id   — single log details
 * GET /api/v1/dashboard/projects   — list user's projects
 */
const db = require('../db');

/**
 * GET /api/v1/dashboard/projects
 * Returns all projects owned by the current user.
 * Admins see all projects.
 */
const getProjects = async (req, res, next) => {
  try {
    // All users can see all projects (read-only access)
    const result = await db.query(
      `SELECT p.*, u.email AS owner_email,
              (SELECT COUNT(*) FROM error_logs WHERE project_id = p.id) AS total_errors
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       ORDER BY p.created_at DESC`
    );

    res.json({ success: true, projects: result.rows });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/stats?project_id=UUID
 * Returns aggregated statistics for a project.
 */
const getStats = async (req, res, next) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "project_id" is required.',
      });
    }

    // Total errors
    const totalResult = await db.query(
      `SELECT COUNT(*) AS total FROM error_logs WHERE project_id = $1`,
      [project_id]
    );

    // Errors by level
    const byLevelResult = await db.query(
      `SELECT level, COUNT(*) AS count
       FROM error_logs
       WHERE project_id = $1
       GROUP BY level
       ORDER BY count DESC`,
      [project_id]
    );

    // Errors in last 24h
    const last24hResult = await db.query(
      `SELECT COUNT(*) AS count
       FROM error_logs
       WHERE project_id = $1
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [project_id]
    );

    // Errors per day (all time) — for the chart
    const timelineResult = await db.query(
      `SELECT
         date_trunc('day', created_at) AS hour,
         COUNT(*) AS count
       FROM error_logs
       WHERE project_id = $1
       GROUP BY hour
       ORDER BY hour ASC`,
      [project_id]
    );

    // Total duplicates caught
    const dupsResult = await db.query(
      `SELECT COALESCE(SUM(occurrence_count) - COUNT(*), 0) AS duplicates_caught
       FROM error_logs
       WHERE project_id = $1`,
      [project_id]
    );

    res.json({
      success: true,
      stats: {
        total_errors:      parseInt(totalResult.rows[0].total),
        errors_last_24h:   parseInt(last24hResult.rows[0].count),
        duplicates_caught: parseInt(dupsResult.rows[0].duplicates_caught),
        by_level:          byLevelResult.rows,
        timeline_24h:      timelineResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/logs?project_id=UUID&page=1&limit=20&level=error&sort_by=last_seen_at&sort_order=desc&search=keyword
 * Returns a paginated list of error logs with sorting and search.
 */
const getLogs = async (req, res, next) => {
  try {
    const { project_id, level, search, sort_by, sort_order } = req.query;
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "project_id" is required.',
      });
    }

    // Build dynamic WHERE clause
    const conditions = ['project_id = $1'];
    const params = [project_id];

    if (level) {
      conditions.push(`level = $${params.length + 1}`);
      params.push(level);
    }

    if (search && search.trim()) {
      conditions.push(`message ILIKE $${params.length + 1}`);
      params.push(`%${search.trim()}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Validate sort parameters
    const allowedSortColumns = ['level', 'message', 'occurrence_count', 'created_at', 'last_seen_at'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'last_seen_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

    // Get total count for pagination
    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM error_logs WHERE ${whereClause}`,
      params
    );

    // Get paginated logs with sorting
    const logsResult = await db.query(
      `SELECT id, level, message, error_hash, occurrence_count, created_at, last_seen_at
       FROM error_logs
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      logs: logsResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/logs/:id
 * Returns full details of a single error log, including payload.
 */
const getLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT el.*, p.name AS project_name
       FROM error_logs el
       JOIN projects p ON p.id = el.project_id
       WHERE el.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Log entry not found.',
      });
    }

    res.json({
      success: true,
      log: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProjects, getStats, getLogs, getLogById };
