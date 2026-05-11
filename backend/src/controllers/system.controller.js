const os = require('os');
const path = require('path');
const { spawn, execSync } = require('child_process');
const db = require('../db');

let lastCpus = os.unused_cpus || os.cpus();
let simulatorProcesses = [];
let isSeedingActive = false;

// Helper to kill any stray dummy-client processes on start to prevent ghosts
try {
  if (process.platform === 'win32') {
    // Windows: kill by command line pattern
    // execSync('wmic process where "commandline like \'%dummy-clients%\'" delete', { stdio: 'ignore' });
  } else {
    // Unix: pkill -f
    // execSync('pkill -f dummy-clients', { stdio: 'ignore' });
  }
} catch (e) { /* ignore */ }

const getMetrics = async (req, res, next) => {
  try {
    const currentCpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    
    for (let i = 0, len = currentCpus.length; i < len; i++) {
      const cpu = currentCpus[i];
      const prevCpu = lastCpus[i];
      if (!prevCpu) continue;
      
      for (const type in cpu.times) {
        totalTick += cpu.times[type] - prevCpu.times[type];
      }
      totalIdle += cpu.times.idle - prevCpu.times.idle;
    }
    
    const idlePercent = totalTick === 0 ? 1 : (totalIdle / totalTick);
    let cpuUsage = Math.round((1 - idlePercent) * 100);
    
    if (totalTick > 0) {
      lastCpus = currentCpus;
    }
    
    const finalCpu = cpuUsage <= 0 ? Math.min(100, Math.round((os.loadavg()[0] / os.cpus().length) * 100)) : cpuUsage;
    const memUsage = process.memoryUsage();
    
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
          cpu_usage_percent: isNaN(finalCpu) ? 0 : finalCpu,
          load_avg: os.loadavg()
        },
        process: {
          uptime: process.uptime(),
          rss: memUsage.rss,
          heap_total: memUsage.heapTotal,
          heap_used: memUsage.heapUsed,
          external: memUsage.external
        },
        simulation: {
          is_running: simulatorProcesses.length > 0,
          is_seeding: isSeedingActive
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

const startSimulation = async (req, res, next) => {
  try {
    if (simulatorProcesses.length > 0) {
      return res.status(400).json({ success: false, error: 'Simulation is already running' });
    }

    const clients = ['ecommerce-api.js', 'student-portal.js', 'iot-sensor-hub.js'];
    // PATH FIX: dummy-clients is in project root, backend is in /backend
    const dummyDir = path.join(__dirname, '../../../dummy-clients');

    clients.forEach(clientFile => {
      const scriptPath = path.join(dummyDir, clientFile);
      console.log(`[System] Spawning simulator: ${scriptPath}`);
      
      const child = spawn('node', [scriptPath], {
        cwd: dummyDir,
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      child.stdout.on('data', (data) => console.log(`[Sim:${clientFile}] ${data}`));
      child.stderr.on('data', (data) => console.error(`[Sim:${clientFile}] ERR: ${data}`));
      
      child.on('close', (code) => {
        console.log(`[System] Simulator ${clientFile} exited with code ${code}`);
        simulatorProcesses = simulatorProcesses.filter(p => p !== child);
      });

      simulatorProcesses.push(child);
    });

    res.json({ success: true, message: 'Simulators started' });
  } catch (err) {
    next(err);
  }
};

const stopSimulation = async (req, res, next) => {
  try {
    if (simulatorProcesses.length === 0) {
      // If no processes tracked, we might have ghosts. Let's try a generic response.
      return res.json({ success: true, message: 'No active simulations tracked. Cleared UI state.' });
    }

    simulatorProcesses.forEach(child => {
      child.kill('SIGTERM');
    });
    
    simulatorProcesses = [];
    res.json({ success: true, message: 'All simulators stopped' });
  } catch (err) {
    next(err);
  }
};

const seedHistory = async (req, res, next) => {
  try {
    if (isSeedingActive) {
      return res.status(400).json({ success: false, error: 'Seeding is already in progress' });
    }

    const seedPath = path.join(__dirname, '../../../dummy-clients/seed-history.js');
    console.log(`[System] Spawning seed: ${seedPath}`);
    
    isSeedingActive = true;
    const child = spawn('node', [seedPath], {
      cwd: path.join(__dirname, '../../../dummy-clients')
    });
    
    child.stdout.on('data', (data) => console.log(`[Seed] ${data}`));
    child.stderr.on('data', (data) => console.error(`[Seed] ERR: ${data}`));
    
    child.on('close', (code) => {
      console.log(`[System] Seed process finished with code ${code}`);
      isSeedingActive = false;
    });

    res.json({ success: true, message: 'History seeding started' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMetrics, startSimulation, stopSimulation, seedHistory };
