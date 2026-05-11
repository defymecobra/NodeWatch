/**
 * NodeWatch - Dashboard Controller
 *
 * Provides data for the web dashboard.
 * All endpoints require JWT authentication.
 * project_id can be a UUID or "all" for cross-project data.
 *
 * GET /api/v1/dashboard/stats      — summary stats for a project (or all)
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
 * GET /api/v1/dashboard/stats?project_id=UUID|all
 * Returns aggregated statistics for a project or all projects.
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

    const isAll = project_id === 'all';
    const projectWhere = isAll ? '' : 'WHERE project_id = $1';
    const projectAnd = isAll ? '' : 'AND project_id = $1';
    const params = isAll ? [] : [project_id];

    // Total errors
    const totalResult = await db.query(
      `SELECT COUNT(*) AS total FROM error_logs ${projectWhere}`,
      params
    );

    // Errors by level
    const byLevelResult = await db.query(
      `SELECT level, COUNT(*) AS count
       FROM error_logs
       ${projectWhere}
       GROUP BY level
       ORDER BY count DESC`,
      params
    );

    // Errors in last 24h
    const last24hResult = await db.query(
      `SELECT COUNT(*) AS count
       FROM error_logs
       WHERE created_at > NOW() - INTERVAL '24 hours' ${projectAnd}`,
      params
    );

    // Errors per day (all time) — for the chart
    const timelineResult = await db.query(
      `SELECT
         date_trunc('day', created_at) AS hour,
         COUNT(*) AS count
       FROM error_logs
       ${projectWhere}
       GROUP BY hour
       ORDER BY hour ASC`,
      params
    );

    // Total duplicates caught
    const dupsResult = await db.query(
      `SELECT COALESCE(SUM(occurrence_count) - COUNT(*), 0) AS duplicates_caught
       FROM error_logs
       ${projectWhere}`,
      params
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
 * GET /api/v1/dashboard/logs?project_id=UUID|all&page=1&limit=20&level=error&sort_by=last_seen_at&sort_order=desc&search=keyword
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
    const isAll = project_id === 'all';
    const conditions = [];
    const params = [];

    if (!isAll) {
      conditions.push(`project_id = $${params.length + 1}`);
      params.push(project_id);
    }

    if (level) {
      conditions.push(`level = $${params.length + 1}`);
      params.push(level);
    }

    if (search && search.trim()) {
      conditions.push(`message ILIKE $${params.length + 1}`);
      params.push(`%${search.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Validate sort parameters
    const allowedSortColumns = ['level', 'message', 'occurrence_count', 'created_at', 'last_seen_at'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'last_seen_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

    // Get total count for pagination
    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM error_logs el WHERE ${whereClause.replace(/project_id/g, 'el.project_id').replace(/level/g, 'el.level').replace(/message/g, 'el.message')}`,
      params
    );

    // Get paginated logs with sorting
    const logsResult = await db.query(
      `SELECT el.id, el.level, el.message, el.error_hash, el.occurrence_count, el.created_at, el.last_seen_at, p.name AS project_name
       FROM error_logs el
       JOIN projects p ON p.id = el.project_id
       WHERE ${whereClause.replace(/project_id/g, 'el.project_id').replace(/level/g, 'el.level').replace(/message/g, 'el.message')}
       ORDER BY el.${sortColumn} ${sortDirection}
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
