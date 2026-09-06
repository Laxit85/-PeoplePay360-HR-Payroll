/**
 * PeoplePay360 : Automated End-to-End API & Database Test Suite
 * Run with: npm run test:api (while server is running on http://localhost:4000)
 */

require('dotenv').config();
const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log('====================================================');
  console.log(' PeoplePay360 : End-to-End API & Database Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;
  let token = null;

  async function test(name, fn) {
    process.stdout.write(`⏳ Testing: ${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      failed++;
    }
  }

  // 1. Health Check
  await test('GET /api/health', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    if (res.status !== 200 || data.status !== 'OK') {
      throw new Error(`Expected status 200 OK, got ${res.status}`);
    }
  });

  // 2. Authentication (Login as Admin)
  await test('POST /api/auth/login (Admin)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@peoplepay360.internal',
        password: 'admin123'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(data.message || `Login failed with status ${res.status}`);
    }
    token = data.token;
  });

  const authHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // 3. Current User Profile
  await test('GET /api/auth/me', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch user profile');
    }
  });

  // 4. Employees API
  await test('GET /api/employees', async () => {
    const res = await fetch(`${BASE_URL}/employees`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success || !Array.isArray(data.data)) {
      throw new Error('Failed to retrieve employees list');
    }
  });

  // 5. Create Employee Test
  await test('POST /api/employees (Create Employee)', async () => {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        first_name: 'AuditTest',
        last_name: 'User',
        email: `audit.${Date.now()}@peoplepay360.internal`,
        employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        department_id: 1,
        job_position_id: 1,
        working_schedule_id: 1,
        employee_type: 'FULL_TIME',
        joining_date: '2026-01-01'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to insert employee into MySQL');
    }
  });

  // 6. Contracts API
  await test('GET /api/contracts', async () => {
    const res = await fetch(`${BASE_URL}/contracts`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success || !Array.isArray(data.data)) {
      throw new Error('Failed to retrieve contracts list');
    }
  });

  // 7. Working Schedules API
  await test('GET /api/working-schedules', async () => {
    const res = await fetch(`${BASE_URL}/working-schedules`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error('Failed to retrieve working schedules');
    }
  });

  // 8. Attendance Check-in Test
  await test('POST /api/attendance/check-in', async () => {
    const res = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        employee_id: 2,
        attendance_date: new Date().toISOString().split('T')[0],
        status: 'ON_TIME'
      })
    });
    const data = await res.json();
    if (!res.ok && !data.message.includes('already checked in')) {
      throw new Error(data.message || 'Failed to record attendance check-in');
    }
  });

  // 9. Time Off Types & Requests
  await test('GET /api/time-off/types', async () => {
    const res = await fetch(`${BASE_URL}/time-off/types`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error('Failed to retrieve time off types');
    }
  });

  // 10. Salary Structures API
  await test('GET /api/salary-structures', async () => {
    const res = await fetch(`${BASE_URL}/salary-structures`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error('Failed to retrieve salary structures');
    }
  });

  // 11. Departments API
  await test('GET /api/org/departments', async () => {
    const res = await fetch(`${BASE_URL}/org/departments`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error('Failed to retrieve departments');
    }
  });

  // 12. Create Department Test
  await test('POST /api/org/departments (Create Department)', async () => {
    const res = await fetch(`${BASE_URL}/org/departments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name: `Audit Dept ${Date.now()}`,
        code: `AD${Math.floor(10 + Math.random() * 90)}`
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to create department');
    }
  });

  // 13. Dashboard Metrics
  await test('GET /api/dashboard', async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error('Failed to retrieve dashboard metrics');
    }
  });

  // 14. Email System: Test Email Delivery Endpoint
  await test('POST /api/payruns/test-email (Live Diagnostic)', async () => {
    const res = await fetch(`${BASE_URL}/payruns/test-email`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email: 'audit.test@peoplepay360.internal' })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to dispatch test email');
    }
  });

  // 15. Email System: On-demand Monthly Distribution Endpoint
  await test('POST /api/payruns/distribute-monthly', async () => {
    const res = await fetch(`${BASE_URL}/payruns/distribute-monthly`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ force: false })
    });
    const data = await res.json();
    // Accept either true or a graceful no-payruns-found notice
    if (res.status !== 200 && res.status !== 404) {
      throw new Error(data.message || 'Failed monthly distribution endpoint');
    }
  });

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
