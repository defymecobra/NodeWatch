/**
 * NodeWatch - Analytics Controller
 *
 * Provides analytics data for the Analytics dashboard.
 * All endpoints accept optional ?project_id= filter.
 * If project_id is omitted or "all", returns data across ALL projects.
 *
 * GET /api/v1/analytics/overview       — aggregated stats
 * GET /api/v1/analytics/heatmap        — hour×day error matrix
 * GET /api/v1/analytics/top-errors     — most frequent errors
 * GET /api/v1/analytics/health         — health scores for projects
 */
const db = require('../db');

// Time range helpers
const RANGE_MAP = {
  '24h': "NOW() - INTERVAL '24 hours'",
  '7d':  "NOW() - INTERVAL '7 days'",
  '30d': "NOW() - INTERVAL '30 days'",
  'all': "'1970-01-01'::timestamptz",
};

function getRangeCondition(range) {
  return RANGE_MAP[range] || RANGE_MAP['7d'];
}

/** Build a project filter clause + params array */
function buildProjectFilter(project_id, existingParams = []) {
  if (!project_id || project_id === 'all') return { clause: '', params: [...existingParams] };
  const idx = existingParams.length + 1;
  return { clause: ` AND project_id = $${idx}`, params: [...existingParams, project_id] };
}

/**
 * GET /api/v1/analytics/overview?range=7d&project_id=uuid|all
 */
const getOverview = async (req, res, next) => {
  try {
    const rangeSql = getRangeCondition(req.query.range);
    const pf = buildProjectFilter(req.query.project_id);

    // Total errors by level
    const byLevel = await db.query(
      `SELECT level, COUNT(*) AS count
       FROM error_logs
       WHERE created_at > ${rangeSql}${pf.clause}
       GROUP BY level
       ORDER BY count DESC`,
      pf.params
    );

    // Errors per project (always show all projects for the bar chart)
    const byProject = await db.query(
      `SELECT p.id, p.name, COUNT(el.id) AS error_count
       FROM projects p
       LEFT JOIN error_logs el ON el.project_id = p.id AND el.created_at > ${rangeSql}
       GROUP BY p.id, p.name
       ORDER BY error_count DESC`
    );

    // Total numbers
    const totals = await db.query(
      `SELECT
         COUNT(*) AS total_errors,
         COUNT(DISTINCT project_id) AS active_projects,
         COALESCE(SUM(occurrence_count) - COUNT(*), 0) AS duplicates_caught
       FROM error_logs
       WHERE created_at > ${rangeSql}${pf.clause}`,
      pf.params
    );

    res.json({
      success: true,
      overview: {
        by_level: byLevel.rows,
        by_project: byProject.rows,
        totals: {
          total_errors: parseInt(totals.rows[0]?.total_errors || 0),
          active_projects: parseInt(totals.rows[0]?.active_projects || 0),
          duplicates_caught: parseInt(totals.rows[0]?.duplicates_caught || 0),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/heatmap?range=7d&project_id=uuid|all
 */
const getHeatmap = async (req, res, next) => {
  try {
    const rangeSql = getRangeCondition(req.query.range);
    const pf = buildProjectFilter(req.query.project_id);

    const result = await db.query(
      `SELECT
         EXTRACT(DOW FROM created_at)  AS day_of_week,
         EXTRACT(HOUR FROM created_at) AS hour_of_day,
         COUNT(*) AS count
       FROM error_logs
       WHERE created_at > ${rangeSql}${pf.clause}
       GROUP BY day_of_week, hour_of_day
       ORDER BY day_of_week, hour_of_day`,
      pf.params
    );

    // Build 7×24 matrix
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxCount = 0;

    for (const row of result.rows) {
      const day = parseInt(row.day_of_week);
      const hour = parseInt(row.hour_of_day);
      const count = parseInt(row.count);
      matrix[day][hour] = count;
      if (count > maxCount) maxCount = count;
    }

    res.json({
      success: true,
      heatmap: { matrix, maxCount },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/top-errors?range=7d&limit=10&project_id=uuid|all
 */
const getTopErrors = async (req, res, next) => {
  try {
    const rangeSql = getRangeCondition(req.query.range);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const pf = buildProjectFilter(req.query.project_id);

    const result = await db.query(
      `SELECT
         el.message,
         el.level,
         p.name AS project_name,
         SUM(el.occurrence_count) AS total_occurrences,
         MAX(el.last_seen_at) AS last_seen
       FROM error_logs el
       JOIN projects p ON p.id = el.project_id
       WHERE el.created_at > ${rangeSql}${pf.clause}
       GROUP BY el.error_hash, el.message, el.level, p.name
       ORDER BY total_occurrences DESC
       LIMIT $${pf.params.length + 1}`,
      [...pf.params, limit]
    );

    res.json({
      success: true,
      top_errors: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/health?project_id=uuid|all
 * Health scores. If project_id is specified, returns only that project.
 */
const getHealth = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    let projectFilter = '';
    const params = [];

    if (project_id && project_id !== 'all') {
      projectFilter = 'WHERE p.id = $1';
      params.push(project_id);
    }

    const result = await db.query(
      `SELECT
         p.id,
         p.name,
         COALESCE(SUM(CASE WHEN el.level = 'critical' THEN el.occurrence_count ELSE 0 END), 0) AS critical_count,
         COALESCE(SUM(CASE WHEN el.level = 'error'    THEN el.occurrence_count ELSE 0 END), 0) AS error_count,
         COALESCE(SUM(CASE WHEN el.level = 'warn'     THEN el.occurrence_count ELSE 0 END), 0) AS warn_count,
         COALESCE(SUM(CASE WHEN el.level = 'info'     THEN el.occurrence_count ELSE 0 END), 0) AS info_count,
         COUNT(el.id) AS total_unique_errors,
         MAX(el.last_seen_at) AS last_error_at
       FROM projects p
       LEFT JOIN error_logs el ON el.project_id = p.id
         AND el.created_at > NOW() - INTERVAL '7 days'
       ${projectFilter}
       GROUP BY p.id, p.name
       ORDER BY p.name`,
      params
    );

    const health = result.rows.map(row => {
      const penalty =
        parseInt(row.critical_count) * 15 +
        parseInt(row.error_count) * 5 +
        parseInt(row.warn_count) * 2;

      const score = Math.max(0, Math.min(100, 100 - penalty));

      return {
        id: row.id,
        name: row.name,
        score,
        critical_count: parseInt(row.critical_count),
        error_count: parseInt(row.error_count),
        warn_count: parseInt(row.warn_count),
        info_count: parseInt(row.info_count),
        total_unique_errors: parseInt(row.total_unique_errors),
        last_error_at: row.last_error_at,
      };
    });

    res.json({ success: true, health });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getHeatmap, getTopErrors, getHealth };
