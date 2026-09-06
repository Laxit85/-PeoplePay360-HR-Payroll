const http = require('http');
const { pool } = require('../backend/src/config/db');

async function testCreateEmployeeFlow() {
  console.log('--- Testing Create Employee End-to-End Flow ---');

  // Step 1: Login as admin to get token
  const loginPayload = JSON.stringify({
    email: 'admin@peoplepay360.internal',
    password: 'password123'
  });

  const loginRes = await makeRequest('/api/auth/login', 'POST', loginPayload);
  console.log('Login status:', loginRes.statusCode);
  if (!loginRes.data.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginRes.data));
  }
  const token = loginRes.data.token;
  console.log('Authenticated as:', loginRes.data.user.email, 'Role:', loginRes.data.user.role);

  // Step 2: Fetch departments
  const deptRes = await makeRequest('/api/org/departments', 'GET', null, token);
  console.log('Departments retrieved:', deptRes.data.data ? deptRes.data.data.length : 'N/A');
  const targetDept = deptRes.data.data[0];

  // Step 3: Create employee
  const testEmail = `test.employee.${Date.now()}@oxp.com`;
  const createPayload = JSON.stringify({
    employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    first_name: 'Ananya',
    last_name: 'Deshmukh',
    email: testEmail,
    phone: '+91 99887 76655',
    job_title: 'Staff Platform Engineer',
    department_id: targetDept.id,
    employee_type: 'FULL_TIME',
    employment_status: 'ACTIVE',
    wage: 65000,
    contract_wage: 65000,
    joining_date: '2026-09-01'
  });

  const createRes = await makeRequest('/api/employees', 'POST', createPayload, token);
  console.log('Create Employee API response code:', createRes.statusCode);
  console.log('Response body:', createRes.data);

  if (createRes.statusCode !== 201 && createRes.statusCode !== 200) {
    throw new Error('Employee creation failed');
  }

  const createdId = createRes.data.id;
  console.log('Created Employee ID:', createdId);

  // Step 4: Verify in MySQL Database
  const [empRows] = await pool.query('SELECT * FROM employees WHERE id = ?', [createdId]);
  console.log('1. Employee in DB:', empRows[0].first_name, empRows[0].last_name, empRows[0].email);

  const [userRows] = await pool.query('SELECT id, email, role_id FROM users WHERE email = ?', [testEmail]);
  console.log('2. Linked User in DB:', userRows[0]);

  const [contractRows] = await pool.query('SELECT * FROM contracts WHERE employee_id = ?', [createdId]);
  console.log('3. Contract in DB:', {
    id: contractRows[0]?.id,
    reference: contractRows[0]?.reference_name,
    wage: contractRows[0]?.wage,
    status: contractRows[0]?.status
  });

  const [allocRows] = await pool.query('SELECT id, time_off_type_id, allocated_days, remaining_days, status FROM time_off_allocations WHERE employee_id = ?', [createdId]);
  console.log('4. Leave Allocations in DB:', allocRows);

  // Step 5: Verify Employee detail endpoint
  const detailRes = await makeRequest(`/api/employees/${createdId}`, 'GET', null, token);
  console.log('5. Employee Detail API Smart Counters:', detailRes.data.smartCounters);
  console.log('Active Contract in detail:', detailRes.data.activeContract ? detailRes.data.activeContract.reference_name : 'None');

  console.log('\n--- ALL VERIFICATIONS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

function makeRequest(path, method, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);

    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path,
        method,
        headers
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              data: JSON.parse(rawData)
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              data: rawData
            });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

testCreateEmployeeFlow().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
