const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const crypto = require('crypto');

// DB connection (using same env as backend)
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  user:     process.env.DB_USER     || 'nodewatch',
  password: process.env.DB_PASSWORD || 'nodewatch_secret',
  database: process.env.DB_NAME     || 'nodewatch_db',
});

function generateHash(message, stack = '') {
  return crypto.createHash('md5').update(`${message}::${stack}`).digest('hex');
}

async function seed() {
  console.log('🌱 Seeding historical data for NodeWatch analytics...');
  
  try {
    // 1. Get existing projects
    const projectsRes = await pool.query('SELECT id, name FROM projects');
    const projects = projectsRes.rows;
    
    if (projects.length === 0) {
      console.error('❌ No projects found. Please create at least one project in the Settings first.');
      process.exit(1);
    }

    const levels = ['info', 'warn', 'error', 'critical'];
    const messages = [
      'Database connection timeout',
      'Unhandled rejection: JWT expired',
      'Failed to process payment for user',
      'Rate limit exceeded for API key',
      'Unexpected token in JSON at position 0',
      'Invalid credentials for SMTP server',
      'Out of memory: Heap limit reached',
      'File not found: /tmp/uploads/img_99.png',
      'Permission denied: chmod 777',
      'Redis connection closed unexpectedly',
      'Upstream service 503 Service Unavailable',
      'Broken pipe on socket write'
    ];

    console.log(`Found ${projects.length} projects. Generating logs for the last 7 days...`);

    let totalInserted = 0;

    // 2. Generate logs for last 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      
      // Each day, generate 8-20 "incidents"
      const incidentCount = Math.floor(Math.random() * 12) + 8;
      
      for (let i = 0; i < incidentCount; i++) {
        const project = projects[Math.floor(Math.random() * projects.length)];
        const level = levels[Math.floor(Math.random() * levels.length)];
        const message = messages[Math.floor(Math.random() * messages.length)];
        const hour = Math.floor(Math.random() * 24);
        
        const logDate = new Date(date);
        logDate.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
        
        const hash = generateHash(message, '');
        // Random number of occurrences for this incident
        const occurrences = Math.floor(Math.random() * 45) + 1;

        await pool.query(
          `INSERT INTO error_logs (project_id, level, message, payload, error_hash, occurrence_count, created_at, last_seen_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
          [project.id, level, message, JSON.stringify({ seeded: true, env: 'production' }), hash, occurrences, logDate]
        );
        totalInserted++;
      }
    }

    console.log(`✅ History seeding completed! Inserted ${totalInserted} incident patterns.`);
    console.log('🚀 Now check the Analytics tab in your dashboard.');

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
