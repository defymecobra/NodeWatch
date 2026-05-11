const http = require('http');

const API_URL = 'http://localhost:3000';
const API_KEY = 'student-portal-key';

const ERRORS = [
  {
    level: 'info',
    message: 'User successfully authenticated via SSO',
    payload: {
      user: 'stu_1092',
      ip: '10.20.5.150'
    }
  },
  {
    level: 'info',
    message: 'Course registration completed successfully',
    payload: {
      student_id: 'stu_1092',
      course_id: 'CS401',
      credits: 3
    }
  },
  {
    level: 'warn',
    message: 'Profile photo upload took longer than expected',
    payload: {
      duration_ms: 3500,
      file_size_kb: 4500
    }
  },
  {
    level: 'info',
    message: 'Moodle API sync completed',
    payload: {
      records_synced: 1450,
      endpoint: '/api/moodle/sync'
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
    res.on('end', () => console.log(`[Student Portal] Sent ${err.level}: ${err.message} -> HTTP ${res.statusCode}`));
  });

  req.on('error', e => console.error('[Student Portal] Request failed:', e.message));
  req.write(postData);
  req.end();
}

console.log('🎓 Student Portal simulator started...');
sendError();
setInterval(sendError, 12000); // Send every 12 seconds
