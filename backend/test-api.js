/**
 * PeoplePay360 : Automated End-to-End API Test Suite
 * Run with: npm test (while server is running on http://localhost:5000)
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log(' PeoplePay360 : Automated API Test Suite');
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
    if (!res.ok || data.user.role !== 'ADMIN') {
      throw new Error(data.message || 'Failed to fetch me');
    }
  });

  // 4. Employee Master List
  let sampleEmployeeId = null;
  await test('GET /api/employees', async () => {
    const res = await fetch(`${BASE_URL}/employees`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to fetch employees');
    }
    if (data.data.length > 0) {
      sampleEmployeeId = data.data[0].id;
    }
  });

  // 5. Single Employee with Smart Counters
  if (sampleEmployeeId) {
    await test(`GET /api/employees/${sampleEmployeeId} (Smart Counters)`, async () => {
      const res = await fetch(`${BASE_URL}/employees/${sampleEmployeeId}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.smartCounters) {
        throw new Error(data.message || 'Smart counters missing');
      }
    });
  }

  // 6. Working Schedules
  await test('GET /api/working-schedules', async () => {
    const res = await fetch(`${BASE_URL}/working-schedules`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to fetch schedules');
    }
  });

  // 7. Attendance Logs
  await test('GET /api/attendance', async () => {
    const res = await fetch(`${BASE_URL}/attendance`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to fetch attendance');
    }
  });

  // 8. Time Off Types & Requests
  await test('GET /api/time-off/types', async () => {
    const res = await fetch(`${BASE_URL}/time-off/types`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to fetch leave types');
    }
  });

  // 9. Salary Structures
  let sampleStructureId = null;
  await test('GET /api/salary-structures', async () => {
    const res = await fetch(`${BASE_URL}/salary-structures`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to fetch salary structures');
    }
    if (data.data.length > 0) {
      sampleStructureId = data.data[0].id;
    }
  });

  // 10. Payrun Wizard Step 2: Eligible Staff
  if (sampleStructureId) {
    await test('GET /api/payruns/eligible-employees (Wizard Step 2)', async () => {
      const res = await fetch(
        `${BASE_URL}/payruns/eligible-employees?salary_structure_id=${sampleStructureId}&period_start=2026-01-01&period_end=2026-01-31`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch eligible employees');
      }
    });
  }

  // 11. Real-time Dashboard Aggregations
  await test('GET /api/dashboard (KPIs & Charts)', async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.data || !data.data.kpis) {
      throw new Error(data.message || 'Failed to fetch dashboard metrics');
    }
  });

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('====================================================');

  if (failed === 0) {
    console.log('🎉 All tested core endpoints are working seamlessly!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Ensure `npm run seed` was executed.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('\n❌ Error running test suite:', err.message);
  process.exit(1);
});
