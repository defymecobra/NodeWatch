const { spawn } = require('child_process');
const path = require('path');

const clients = [
  'ecommerce-api.js',
  'student-portal.js',
  'iot-sensor-hub.js'
];

console.log('🚀 Starting all NodeWatch dummy clients...');

clients.forEach(client => {
  const scriptPath = path.join(__dirname, client);
  const child = spawn('node', [scriptPath]);

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('close', (code) => {
    console.log(`❌ ${client} exited with code ${code}`);
  });
});

console.log('✅ All clients started. Press Ctrl+C to stop.');
