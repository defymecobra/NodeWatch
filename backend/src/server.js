require('dotenv').config();
const express = require('express');
const cors    = require('cors');

// DB connection (establishes pool on startup)
require('./db');

const { errorHandler, notFound } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Parse JSON bodies

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'NodeWatch Collector API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/logs', require('./routes/logs.routes'));
// Stage 4: app.use('/api/v1/auth',      require('./routes/auth.routes'));
// Stage 4: app.use('/api/v1/dashboard', require('./routes/dashboard.routes'));

// ── 404 & Error Handlers (must be LAST) ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 NodeWatch API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
