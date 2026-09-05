/**
 * Dedicated JWT Authentication Audit Script
 */
require('dotenv').config();
const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}/api/auth`;

async function auditJWTAuth() {
  console.log('====================================================');
  console.log(' PeoplePay360 : JWT Authentication Audit & Test');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

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

  const testEmail = `jwt_user_${Date.now()}@peoplepay360.internal`;
  const testPassword = 'Password123!';
  let jwtToken = null;

  // 1. User Registration & JWT Issuance
  await test('1. User Registration (POST /api/auth/register)', async () => {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        role_id: 5 // Employee role
      })
    });
    const data = await res.json();
    if (res.status !== 201 || !data.success || !data.token) {
      throw new Error(`Registration failed: ${data.message || res.status}`);
    }
    console.log(`\n   [Info] Registration token issued (${data.token.substring(0, 20)}...)`);
  });

  // 2. User Login & JWT Issuance
  await test('2. User Login (POST /api/auth/login)', async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success || !data.token) {
      throw new Error(`Login failed: ${data.message || res.status}`);
    }
    jwtToken = data.token;
    console.log(`\n   [Info] Login token verified (${jwtToken.substring(0, 20)}...)`);
  });

  // 3. Protected Route Access with Valid JWT
  await test('3. Access Protected Route GET /api/auth/me (Valid Bearer Token)', async () => {
    const res = await fetch(`${BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success || !data.user || data.user.email !== testEmail) {
      throw new Error(`Protected route rejected valid token: ${data.message || res.status}`);
    }
  });

  // 4. Protection Check: Missing Authorization Header
  await test('4. Access Protected Route GET /api/auth/me (Missing Header)', async () => {
    const res = await fetch(`${BASE_URL}/me`, { method: 'GET' });
    const data = await res.json();
    if (res.status !== 401 || data.success === true) {
      throw new Error(`Security gap! Missing token returned status ${res.status}`);
    }
  });

  // 5. Protection Check: Tampered/Invalid JWT Token
  await test('5. Access Protected Route GET /api/auth/me (Tampered Token)', async () => {
    const res = await fetch(`${BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid_tampered_jwt_token_123',
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    if (res.status !== 401 || data.success === true) {
      throw new Error(`Security gap! Tampered token returned status ${res.status}`);
    }
  });

  console.log('\n====================================================');
  console.log(` AUDIT RESULT: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

auditJWTAuth();
