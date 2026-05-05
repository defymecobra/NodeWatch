/**
 * NodeWatch - Dummy Client / Error Simulator
 *
 * Simulates an external application sending error logs
 * to the NodeWatch Collector API for testing purposes.
 *
 * Usage:
 *   node dummy-client.js
 *
 * Requirements:
 *   - The backend must be running (npm run dev OR docker-compose up)
 *   - No npm install needed (uses built-in Node.js https module)
 */

const http = require('http');

// ── Config ────────────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:3000';
const API_KEY = 'demo-api-key-do-not-use-in-production';

// ── Sample errors to simulate ─────────────────────────────────────────────────
const SAMPLE_ERRORS = [
  {
    level: 'error',
    message: 'Cannot read properties of undefined (reading "userId")',
    payload: {
      stack: 'TypeError: Cannot read properties of undefined\n  at getUserProfile (routes/user.js:42:18)\n  at Layer.handle [as handle_request] (express/lib/router/layer.js:95:5)',
      file: 'routes/user.js',
      line: 42,
      env: 'production',
      context: { route: 'GET /api/user/profile', method: 'GET' },
    },
  },
  {
    level: 'critical',
    message: 'Database connection refused: connect ECONNREFUSED 127.0.0.1:5432',
    payload: {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:5432\n  at TCPConnectWrap.afterConnect (net.js:1148:16)',
      file: 'db/pool.js',
      line: 15,
      env: 'production',
      context: { host: '127.0.0.1', port: 5432 },
    },
  },
  {
    level: 'warn',
    message: 'JWT token is about to expire for user session',
    payload: {
      stack: null,
      file: 'middleware/auth.js',
      line: 88,
      env: 'production',
      context: { userId: 'user_abc123', expiresIn: '5m' },
    },
  },
  {
    level: 'error',
    message: 'Unhandled promise rejection: fetch failed',
    payload: {
      stack: 'UnhandledPromiseRejectionWarning: TypeError: fetch failed\n  at processTicksAndRejections (internal/process/task_queues.js:93:5)',
      file: 'services/payments.js',
      line: 67,
      env: 'production',
      context: { url: 'https://api.payment-gateway.com/charge', timeout: 5000 },
    },
  },
  {
    level: 'info',
    message: 'Scheduled cleanup job started: removing logs older than 30 days',
    payload: {
      stack: null,
      file: 'jobs/cleanup.js',
      line: 12,
      env: 'production',
      context: { jobId: 'cleanup-job-v1', triggeredAt: new Date().toISOString() },
    },
  },
];

// ── HTTP helper ───────────────────────────────────────────────────────────────
function sendLog(logData) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(logData);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/logs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': API_KEY,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 NodeWatch Dummy Client started');
  console.log(`📡 Sending logs to: ${API_URL}/api/v1/logs`);
  console.log('─────────────────────────────────────────────');

  // Send each unique error once
  for (const error of SAMPLE_ERRORS) {
    try {
      const result = await sendLog(error);
      console.log(`[${error.level.toUpperCase().padEnd(8)}] "${error.message.substring(0, 55)}..." → HTTP ${result.status}`);
    } catch (err) {
      console.error(`[FAILED] Could not connect to backend: ${err.message}`);
      console.error('  Make sure the backend is running on port 3000.');
      process.exit(1);
    }
    await sleep(300);
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('🔁 Sending 2 DUPLICATE errors to test deduplication...');
  await sleep(500);

  // Re-send first 2 errors → should increment occurrence_count, not create new rows
  for (const error of SAMPLE_ERRORS.slice(0, 2)) {
    try {
      const result = await sendLog(error);
      console.log(`[DUPLICATE ] "${error.message.substring(0, 55)}..." → HTTP ${result.status}`);
    } catch (err) {
      console.error(`[FAILED] ${err.message}`);
    }
    await sleep(300);
  }

  console.log('\n✅ Done! Check your NodeWatch dashboard to see the results.');
  console.log('   Expected: 5 unique log entries, first 2 with occurrence_count = 2');
}

main();
