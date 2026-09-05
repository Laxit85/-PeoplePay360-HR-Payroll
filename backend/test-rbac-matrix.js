const http = require('http');

async function req(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL('http://localhost:4000' + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const request = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    request.on('error', reject);
    if (body) {
      request.write(JSON.stringify(body));
    }
    request.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' PeoplePay360 : 5-Role RBAC Matrix Automated Verification');
  console.log('====================================================\n');

  const credentials = {
    ADMIN: { email: 'admin@peoplepay360.internal', pass: 'admin123' },
    HR_MANAGER: { email: 'hr.manager@peoplepay360.internal', pass: 'manager123' },
    HR_PAYROLL_USER: { email: 'payroll.user@peoplepay360.internal', pass: 'payroll123' },
    HR_PAYROLL_MANAGER: { email: 'payroll.manager@peoplepay360.internal', pass: 'payroll123' },
    EMPLOYEE: { email: 'alex.morgan@peoplepay360.internal', pass: 'employee123' },
  };

  const tokens = {};

  // 1. Authentication & Token retrieval for all 5 roles
  console.log('--- 1. Authenticating all 5 Roles ---');
  for (const [role, cred] of Object.entries(credentials)) {
    const res = await req('POST', '/api/auth/login', { email: cred.email, password: cred.pass });
    if (res.status === 200 && res.body?.token) {
      tokens[role] = res.body.token;
      console.log(`[PASS] ${role.padEnd(20)}: Successfully logged in as ${res.body.user.role}`);
    } else {
      console.error(`[FAIL] ${role.padEnd(20)}: Login failed:`, res.status, res.body);
    }
  }

  console.log('\n--- 2. Testing Employee Role Restrictions ---');
  // Employee should be able to view attendance & clock
  const empAtt = await req('GET', '/api/attendance', null, tokens.EMPLOYEE);
  console.log(`[${empAtt.status === 200 ? 'PASS' : 'FAIL'}] Employee GET /api/attendance: Status ${empAtt.status}`);

  // Employee should be blocked from Payruns
  const empPayruns = await req('GET', '/api/payruns', null, tokens.EMPLOYEE);
  console.log(`[${empPayruns.status === 403 ? 'PASS' : 'FAIL'}] Employee GET /api/payruns (Restricted): Status ${empPayruns.status} (${empPayruns.body?.message})`);

  // Employee should be blocked from creating contracts
  const empContract = await req('POST', '/api/contracts', { wage: 5000 }, tokens.EMPLOYEE);
  console.log(`[${empContract.status === 403 ? 'PASS' : 'FAIL'}] Employee POST /api/contracts (Restricted): Status ${empContract.status}`);

  console.log('\n--- 3. Testing HR Manager Role Restrictions ---');
  // HR Manager should access employees, contracts, schedules, timeoff
  const hrEmps = await req('GET', '/api/employees', null, tokens.HR_MANAGER);
  console.log(`[${hrEmps.status === 200 ? 'PASS' : 'FAIL'}] HR Manager GET /api/employees: Status ${hrEmps.status}`);

  const hrContracts = await req('GET', '/api/contracts', null, tokens.HR_MANAGER);
  console.log(`[${hrContracts.status === 200 ? 'PASS' : 'FAIL'}] HR Manager GET /api/contracts: Status ${hrContracts.status}`);

  // HR Manager should strictly have NO access to payroll features (Payruns, Dashboard)
  const hrPayruns = await req('GET', '/api/payruns', null, tokens.HR_MANAGER);
  console.log(`[${hrPayruns.status === 403 ? 'PASS' : 'FAIL'}] HR Manager GET /api/payruns (No Payroll Access): Status ${hrPayruns.status} (${hrPayruns.body?.message})`);

  const hrDashboard = await req('GET', '/api/dashboard', null, tokens.HR_MANAGER);
  console.log(`[${hrDashboard.status === 403 ? 'PASS' : 'FAIL'}] HR Manager GET /api/dashboard (No Payroll Access): Status ${hrDashboard.status} (${hrDashboard.body?.message})`);

  console.log('\n--- 4. Testing HR Payroll User Permissions ---');
  // HR Payroll User can read and manage Payruns
  const puPayruns = await req('GET', '/api/payruns', null, tokens.HR_PAYROLL_USER);
  console.log(`[${puPayruns.status === 200 ? 'PASS' : 'FAIL'}] HR Payroll User GET /api/payruns: Status ${puPayruns.status}`);

  const puEligible = await req('GET', '/api/payruns/eligible-employees?salary_structure_id=1&period_start=2026-09-01&period_end=2026-09-30', null, tokens.HR_PAYROLL_USER);
  console.log(`[${puEligible.status === 200 ? 'PASS' : 'FAIL'}] HR Payroll User GET /api/payruns/eligible-employees: Status ${puEligible.status} (${puEligible.body?.data?.length || 0} employees found)`);

  // HR Payroll User has READ-ONLY access to Salary Structures (cannot create)
  const puStructs = await req('GET', '/api/salary-structures', null, tokens.HR_PAYROLL_USER);
  console.log(`[${puStructs.status === 200 ? 'PASS' : 'FAIL'}] HR Payroll User GET /api/salary-structures (Read-only): Status ${puStructs.status}`);

  const puCreateStruct = await req('POST', '/api/salary-structures', { name: 'Unauthorized Structure' }, tokens.HR_PAYROLL_USER);
  console.log(`[${puCreateStruct.status === 403 ? 'PASS' : 'FAIL'}] HR Payroll User POST /api/salary-structures (Blocked from modifying structure): Status ${puCreateStruct.status} (${puCreateStruct.body?.message})`);

  // HR Payroll User cannot validate batches
  const puValidate = await req('POST', '/api/payruns/1/validate', {}, tokens.HR_PAYROLL_USER);
  console.log(`[${puValidate.status === 403 ? 'PASS' : 'FAIL'}] HR Payroll User POST /api/payruns/1/validate (Blocked from finalizing batch): Status ${puValidate.status} (${puValidate.body?.message})`);

  console.log('\n--- 5. Testing HR Payroll Manager Permissions ---');
  // HR Payroll Manager has full CRUD on structures and rules
  const pmCreateStruct = await req('POST', '/api/salary-structures', { name: 'Executive Structure', code: 'EXEC_2026' }, tokens.HR_PAYROLL_MANAGER);
  console.log(`[${pmCreateStruct.status === 201 || pmCreateStruct.status === 200 ? 'PASS' : 'FAIL'}] HR Payroll Manager POST /api/salary-structures (Full CRUD): Status ${pmCreateStruct.status}`);

  const pmDashboard = await req('GET', '/api/dashboard', null, tokens.HR_PAYROLL_MANAGER);
  console.log(`[${pmDashboard.status === 200 ? 'PASS' : 'FAIL'}] HR Payroll Manager GET /api/dashboard: Status ${pmDashboard.status}`);

  console.log('\n--- 6. Testing Admin Permissions ---');
  // Admin has access to all models and User Management
  const adminEmps = await req('GET', '/api/employees', null, tokens.ADMIN);
  const adminPayruns = await req('GET', '/api/payruns', null, tokens.ADMIN);
  const adminDashboard = await req('GET', '/api/dashboard', null, tokens.ADMIN);
  console.log(`[${adminEmps.status === 200 && adminPayruns.status === 200 && adminDashboard.status === 200 ? 'PASS' : 'FAIL'}] Admin access to Employees, Payruns, and Dashboard: Status ${adminEmps.status}, ${adminPayruns.status}, ${adminDashboard.status}`);

  console.log('\n====================================================');
  console.log(' All RBAC and Module Visibility Tests Completed!');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
