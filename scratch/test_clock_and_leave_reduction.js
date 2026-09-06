const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const { pool } = require('../backend/src/config/db');

async function testFlow() {
  const BASE_URL = 'http://localhost:4000/api';

  console.log('==================================================');
  console.log('1. TEST ATTENDANCE CLOCK TOGGLE');
  console.log('==================================================');

  // Login as Alex Morgan
  const empLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex.morgan@peoplepay360.internal', password: 'employee123' })
  });
  const { token: empToken, user: empUser } = await empLogin.json();
  console.log(`Logged in as Employee: ${empUser.email}, employeeId: ${empUser.employeeId}`);

  // 1.1 Trigger clock (Since 4357 is open, this will clock OUT)
  const clockOutRes = await fetch(`${BASE_URL}/attendance/clock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ employee_id: empUser.employeeId })
  });
  const clockOutData = await clockOutRes.json();
  console.log('Clock Out Result:', clockOutData);

  // 1.2 Trigger clock again (This will clock IN)
  const clockInRes = await fetch(`${BASE_URL}/attendance/clock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ employee_id: empUser.employeeId })
  });
  const clockInData = await clockInRes.json();
  console.log('Clock In Result:', clockInData);

  // 1.3 Verify top attendance record has check_out IS NULL
  const attRes = await fetch(`${BASE_URL}/attendance`, {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  const attData = await attRes.json();
  const topAtt = attData.data[0];
  console.log(`Top attendance on list: ID=${topAtt.id}, check_in=${topAtt.check_in}, check_out=${topAtt.check_out}`);
  if (topAtt.check_out !== null) {
    throw new Error('Expected top attendance record to be an open session (check_out: null)');
  }
  console.log('SUCCESS: Active open session appears at the top of attendance list!');

  console.log('\n==================================================');
  console.log('2. TEST LEAVE ALLOCATION DEDUCTION (PAID ANNUAL LEAVE)');
  console.log('==================================================');

  // Check initial balance for Alex Morgan (empId = 1, typeId = 1)
  const [[initialAlloc]] = await pool.execute(
    'SELECT id, allocated_days, taken_days, remaining_days FROM time_off_allocations WHERE employee_id = ? AND time_off_type_id = 1',
    [empUser.employeeId]
  );
  console.log('Initial Allocation in DB:', initialAlloc);
  const initialRemaining = parseFloat(initialAlloc.remaining_days);

  // Employee requests 2 days
  const reqRes = await fetch(`${BASE_URL}/time-off/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({
      employee_id: empUser.employeeId,
      time_off_type_id: 1,
      date_from: '2026-10-05',
      date_to: '2026-10-06',
      duration: 2,
      reason: 'Vacation Trip'
    })
  });
  const reqData = await reqRes.json();
  if (!reqData.success) {
    throw new Error('Failed to create leave request: ' + JSON.stringify(reqData));
  }
  const requestId = reqData.data.id;
  console.log(`Submitted Leave Request ID: ${requestId} for 2 days.`);

  // Login as Admin
  const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@peoplepay360.internal', password: 'admin123' })
  });
  const { token: adminToken } = await adminLogin.json();

  // Admin approves request
  const approveRes = await fetch(`${BASE_URL}/time-off/requests/${requestId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'APPROVED' })
  });
  const approveData = await approveRes.json();
  console.log('Admin Approval Response:', approveData);

  // Verify reduced balance in MySQL DB
  const [[afterAlloc]] = await pool.execute(
    'SELECT id, allocated_days, taken_days, remaining_days FROM time_off_allocations WHERE id = ?',
    [initialAlloc.id]
  );
  console.log('Updated Allocation in DB after Approval:', afterAlloc);
  const afterRemaining = parseFloat(afterAlloc.remaining_days);

  if (afterRemaining !== initialRemaining - 2) {
    throw new Error(`Expected remaining to decrease by 2 (from ${initialRemaining} to ${initialRemaining - 2}), but got ${afterRemaining}`);
  }
  console.log(`SUCCESS: Remaining days reduced by 2 as per employee demand (${initialRemaining} -> ${afterRemaining})!`);

  // Admin view test: Query /api/time-off/allocations as Admin
  const adminAllocRes = await fetch(`${BASE_URL}/time-off/allocations?employee_id=${empUser.employeeId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminAllocData = await adminAllocRes.json();
  const adminViewAlloc = adminAllocData.data.find(a => a.time_off_type_id === 1);
  console.log(`Admin panel view: Employee=${adminViewAlloc.first_name} ${adminViewAlloc.last_name}, Type=${adminViewAlloc.time_off_type_name}, Remaining=${adminViewAlloc.remaining_days}`);

  // Employee view test: Query /api/time-off/allocations as Employee
  const empAllocRes = await fetch(`${BASE_URL}/time-off/allocations`, {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  const empAllocData = await empAllocRes.json();
  const empViewAlloc = empAllocData.data.find(a => a.time_off_type_id === 1);
  console.log(`Employee dashboard view: Type=${empViewAlloc.time_off_type_name}, Remaining=${empViewAlloc.remaining_days}`);

  console.log('\n==================================================');
  console.log('3. TEST INSUFFICIENT BALANCE REJECTION');
  console.log('==================================================');
  const excessReqRes = await fetch(`${BASE_URL}/time-off/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({
      employee_id: empUser.employeeId,
      time_off_type_id: 1,
      date_from: '2026-11-01',
      date_to: '2026-11-30',
      duration: 100, // Demanding 100 days
      reason: 'Impossible demand'
    })
  });
  const excessReqData = await excessReqRes.json();
  console.log('Excess Demand Response (should fail):', excessReqData);
  if (excessReqData.success === false) {
    console.log('SUCCESS: Over-demand correctly rejected with balance validation!');
  } else {
    throw new Error('Over-demand should have been rejected!');
  }

  console.log('\n==================================================');
  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('==================================================');
}

testFlow().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
}).finally(() => process.exit());
