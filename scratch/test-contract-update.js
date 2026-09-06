const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('1. Logging in as admin...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@peoplepay360.internal', password: 'admin123' });

  if (loginRes.status !== 200 || !loginRes.data?.token) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }

  const token = loginRes.data.token;
  console.log('Login successful! Testing contract 6 update without replace_active (status ACTIVE)...');

  const updateRes1 = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/contracts/6',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    employee_id: 3,
    reference_name: 'Marcus Vance - Special Project Contract 2026',
    salary_structure_id: 1,
    working_schedule_id: 1,
    wage: 8900,
    wage_type: 'MONTHLY',
    start_date: '2026-05-31',
    end_date: null,
    status: 'ACTIVE'
  });

  console.log('Update result (expecting 400 active contract conflict):', updateRes1.status, updateRes1.data);

  console.log('Testing contract 6 update WITH replace_active: true...');
  const updateRes2 = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/contracts/6',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    employee_id: 3,
    reference_name: 'Marcus Vance - Special Project Contract 2026',
    salary_structure_id: 1,
    working_schedule_id: 1,
    wage: 8900,
    wage_type: 'MONTHLY',
    start_date: '2026-05-31',
    end_date: null,
    status: 'ACTIVE',
    replace_active: true
  });

  console.log('Update result with replace_active:', updateRes2.status, updateRes2.data);
}

run().catch(console.error);
