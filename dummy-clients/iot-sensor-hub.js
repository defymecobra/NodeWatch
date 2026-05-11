const http = require('http');

const API_URL = 'http://localhost:3000';
const API_KEY = 'iot-sensor-hub-key';

const ERRORS = [
  {
    level: 'warn',
    message: 'Sensor payload schema validation failed',
    payload: {
      sensor_id: 'temp_node_b4',
      expected: 'float32',
      received: 'null',
      firmware_version: 'v1.4.2'
    }
  },
  {
    level: 'info',
    message: 'Device firmware update started',
    payload: {
      device_group: 'lab_sensors_2',
      target_version: 'v1.5.0'
    }
  },
  {
    level: 'critical',
    message: 'Gateway disconnected: No heartbeat for 60s',
    payload: {
      gateway_id: 'gw_main_hall',
      last_heartbeat: new Date(Date.now() - 60000).toISOString(),
      active_connections: 45
    }
  },
  {
    level: 'error',
    message: 'MQTT Broker message drop threshold exceeded',
    payload: {
      stack: 'QueueFullError: MQTT publish buffer is full\n  at MqttClient._handlePuback (mqtt/client.js:1001)',
      topic: 'telemetry/raw',
      dropped_messages: 1540
    }
  }
];

function sendError() {
  const err = ERRORS[Math.floor(Math.random() * ERRORS.length)];
  const postData = JSON.stringify(err);

  const req = http.request(`${API_URL}/api/v1/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-api-key': API_KEY
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(`[IoT Hub] Sent ${err.level}: ${err.message} -> HTTP ${res.statusCode}`));
  });

  req.on('error', e => console.error('[IoT Hub] Request failed:', e.message));
  req.write(postData);
  req.end();
}

console.log('📡 IoT Sensor Hub simulator started...');
sendError();
setInterval(sendError, 5000); // Send every 5 seconds
