const http = require('http');

const API_URL = 'http://localhost:3000';
const API_KEY = 'ecommerce-api-key';

const ERRORS = [
  {
    level: 'error',
    message: 'Payment gateway timeout',
    payload: {
      stack: 'Error: Connection timeout at stripe.createCharge (services/payment.js:45)',
      env: 'production',
      user_id: 'usr_89231',
      transaction_id: 'tx_55482'
    }
  },
  {
    level: 'critical',
    message: 'Inventory sync failed: Database connection refused',
    payload: {
      stack: 'MongoNetworkError: failed to connect to server [10.0.1.5:27017]',
      env: 'production',
      job: 'inventory_sync_hourly'
    }
  },
  {
    level: 'warn',
    message: 'High abandonment rate detected in checkout',
    payload: {
      step: 'shipping_address',
      dropoff_rate: '68%',
      cart_value: 120.50
    }
  },
  {
    level: 'error',
    message: 'Invalid discount code applied',
    payload: {
      code: 'SUMMER_2026',
      error: 'Code expired',
      user_ip: '192.168.1.1'
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
    res.on('end', () => console.log(`[E-Commerce] Sent ${err.level}: ${err.message} -> HTTP ${res.statusCode}`));
  });

  req.on('error', e => console.error('[E-Commerce] Request failed:', e.message));
  req.write(postData);
  req.end();
}

console.log('🛍️ E-Commerce API simulator started...');
sendError(); // Send one immediately
setInterval(sendError, 7000); // Send every 7 seconds
