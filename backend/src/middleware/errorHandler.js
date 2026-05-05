/**
 * Global error handler middleware for Express.
 * Must be registered LAST, after all routes.
 */
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.path} →`, err);
  }

  res.status(status).json({
    success: false,
    error: message,
  });
};

/**
 * 404 handler - catches any request that didn't match a route.
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
};

module.exports = { errorHandler, notFound };
