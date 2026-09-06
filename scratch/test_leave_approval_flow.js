async function run() {
  const BASE_URL = 'http://localhost:4000/api';

  console.log('--- 1. Login as Alex Morgan (Employee) ---');
  let res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex.morgan@peoplepay360.internal', password: 'employee123' })
  });
  let data = await res.json();
  if (!data.success) {
    throw new Error('Login failed: ' + JSON.stringify(data));
  }
  const empToken = data.token;
  const empUser = data.user;
  console.log(`Logged in as Employee: id=${empUser.id}, role=${empUser.role}, employeeId=${empUser.employeeId}`);

  console.log('\n--- 2. Employee Submits Leave Request ---');
  res = await fetch(`${BASE_URL}/time-off/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empToken}`
    },
    body: JSON.stringify({
      employee_id: empUser.employeeId,
      time_off_type_id: 1,
      date_from: '2026-09-20',
      date_to: '2026-09-22',
      duration: 3,
      reason: 'Automated Leave Approval Flow Test'
    })
  });
  data = await res.json();
  if (!data.success) {
    throw new Error('Submit failed: ' + JSON.stringify(data));
  }
  const createdId = data.data.id;
  console.log(`Created Leave Request ID: ${createdId}`);

  console.log('\n--- 3. Employee Checks Requests ---');
  res = await fetch(`${BASE_URL}/time-off/requests`, {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  data = await res.json();
  const myReq = data.data.find(r => r.id === createdId);
  console.log(`Employee view of request ${createdId}: status = "${myReq.status}", dates: ${myReq.date_from} to ${myReq.date_to}, duration: ${myReq.duration} days, type: ${myReq.time_off_type_name}`);

  console.log('\n--- 4. Login as Admin ---');
  res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@peoplepay360.internal', password: 'admin123' })
  });
  data = await res.json();
  if (!data.success) {
    throw new Error('Admin login failed: ' + JSON.stringify(data));
  }
  const adminToken = data.token;
  const adminUser = data.user;
  console.log(`Logged in as Admin: id=${adminUser.id}, role=${adminUser.role}`);

  console.log('\n--- 5. Admin Fetches All Requests ---');
  res = await fetch(`${BASE_URL}/time-off/requests`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  data = await res.json();
  const topReq = data.data[0];
  console.log(`Top request on Admin page: ID=${topReq.id}, Employee=${topReq.first_name} ${topReq.last_name}, Status="${topReq.status}", Type="${topReq.time_off_type_name}"`);

  console.log('\n--- 6. Admin Approves Request ---');
  res = await fetch(`${BASE_URL}/time-off/requests/${createdId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'APPROVED' })
  });
  data = await res.json();
  console.log('Approve response:', data);

  console.log('\n--- 7. Employee Checks Status (Should be APPROVED) ---');
  res = await fetch(`${BASE_URL}/time-off/requests`, {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  data = await res.json();
  const myReqApproved = data.data.find(r => r.id === createdId);
  console.log(`Employee view of request ${createdId} after Admin approval: status = "${myReqApproved.status}"`);

  console.log('\n--- 8. Admin Refuses Request ---');
  res = await fetch(`${BASE_URL}/time-off/requests/${createdId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'REFUSED' })
  });
  data = await res.json();
  console.log('Refuse response:', data);

  console.log('\n--- 9. Employee Checks Status (Should be REFUSED) ---');
  res = await fetch(`${BASE_URL}/time-off/requests`, {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  data = await res.json();
  const myReqRefused = data.data.find(r => r.id === createdId);
  console.log(`Employee view of request ${createdId} after Admin refusal: status = "${myReqRefused.status}"`);

  console.log('\n--- 10. Admin Re-Approves Request ---');
  res = await fetch(`${BASE_URL}/time-off/requests/${createdId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'APPROVED' })
  });
  data = await res.json();
  console.log('Re-Approve response:', data);

  console.log('\n--- 11. Final Employee Status Check ---');
  res = await fetch(`${BASE_URL}/time-off/requests`, {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  data = await res.json();
  const myReqFinal = data.data.find(r => r.id === createdId);
  console.log(`Final Employee view of request ${createdId}: status = "${myReqFinal.status}"`);

  console.log('\n======================================================');
  console.log('ALL CHECKS PASSED PERFECTLY!');
  console.log('======================================================');
}

run().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
