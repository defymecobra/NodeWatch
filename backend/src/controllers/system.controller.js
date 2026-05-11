const os = require('os');
const db = require('../db');

let lastCpus = os.cpus();

const getMetrics = async (req, res, next) => {
  try {
    const currentCpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    
    for (let i = 0, len = currentCpus.length; i < len; i++) {
      const cpu = currentCpus[i];
      const prevCpu = lastCpus[i];
      
      for (const type in cpu.times) {
        totalTick += cpu.times[type] - prevCpu.times[type];
      }
      totalIdle += cpu.times.idle - prevCpu.times.idle;
    }
    
    const idlePercent = totalTick === 0 ? 0 : (totalIdle / totalTick);
    const cpuUsage = Math.round((1 - idlePercent) * 100);
    
    const finalCpu = cpuUsage === 0 ? Math.min(100, Math.round((os.loadavg()[0] / os.cpus().length) * 100)) : cpuUsage;

    lastCpus = currentCpus;
    const memUsage = process.memoryUsage();
    
    // Fetch DB size and total logs
    const dbSizeRes = await db.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`);
    const logsCountRes = await db.query(`SELECT SUM(occurrence_count) as total FROM error_logs`);

    res.json({
      success: true,
      metrics: {
        server: {
          uptime: os.uptime(),
          total_mem: os.totalmem(),
          free_mem: os.freemem(),
          used_mem: os.totalmem() - os.freemem(),
          cpu_usage_percent: finalCpu,
          load_avg: os.loadavg()
        },
        process: {
          uptime: process.uptime(),
          rss: memUsage.rss,
          heap_total: memUsage.heapTotal,
          heap_used: memUsage.heapUsed,
          external: memUsage.external
        },
        system_info: {
          node_version: process.version,
          os_platform: `${os.type()} ${os.release()}`,
          db_size: dbSizeRes.rows[0].size,
          total_logs: parseInt(logsCountRes.rows[0].total || 0)
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMetrics };
