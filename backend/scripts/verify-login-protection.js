#!/usr/bin/env node
/*
  Quick verifier for login brute-force protections.
  Usage:
    BASE_URL=http://localhost:5000 node scripts/verify-login-protection.js

  Optional env vars (for reset-after-success checks):
    BUSINESS_EMAIL, BUSINESS_PASSWORD
    CUSTOMER_EMAIL, CUSTOMER_PASSWORD
    ADMIN_EMAIL, ADMIN_PASSWORD
*/

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

const ENDPOINTS = [
  { scope: 'business', path: '/api/auth/login', emailEnv: 'BUSINESS_EMAIL', passwordEnv: 'BUSINESS_PASSWORD' },
  { scope: 'customer', path: '/api/customers/auth/login', emailEnv: 'CUSTOMER_EMAIL', passwordEnv: 'CUSTOMER_PASSWORD' },
  { scope: 'admin', path: '/api/admin/auth/login', emailEnv: 'ADMIN_EMAIL', passwordEnv: 'ADMIN_PASSWORD' },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const login = async (path, email, password) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  let body = {};
  try {
    body = await response.json();
  } catch (_) {
    // ignore non-json body
  }

  return { status: response.status, body };
};

const getMessage = (body) => body.message || body.error || '';

const verifyEndpoint = async ({ scope, path, emailEnv, passwordEnv }) => {
  const email = process.env[emailEnv] || `${scope}.lockout@example.com`;
  const wrongPassword = 'WrongPassword!123';
  const correctPassword = process.env[passwordEnv];

  console.log(`\n[${scope}] ${path}`);

  for (let i = 1; i <= 3; i += 1) {
    const result = await login(path, email, wrongPassword);
    console.log(`  fail ${i}: status=${result.status} message="${getMessage(result.body)}"`);
  }

  const warning = await login(path, email, wrongPassword);
  console.log(`  fail 4 (warning expected): status=${warning.status} message="${getMessage(warning.body)}"`);

  const lockout = await login(path, email, wrongPassword);
  console.log(`  fail 5 (lockout expected): status=${lockout.status} message="${getMessage(lockout.body)}"`);

  if (correctPassword) {
    await delay(300);
    const success = await login(path, email, correctPassword);
    console.log(`  success attempt (counter reset expected): status=${success.status}`);
  } else {
    console.log(`  skip reset-after-success check (missing ${passwordEnv})`);
  }

  console.log('  Rate-limit check: sending rapid requests from same IP...');
  let saw429 = false;
  for (let i = 0; i < 30; i += 1) {
    const result = await login(path, `${scope}.ip-${i}@example.com`, wrongPassword);
    if (result.status === 429 && getMessage(result.body).toLowerCase().includes('ip')) {
      saw429 = true;
      break;
    }
  }
  console.log(`  per-IP 429 observed: ${saw429 ? 'yes' : 'no'}`);
};

const run = async () => {
  console.log(`Verifying login protections against ${BASE_URL}`);
  for (const endpoint of ENDPOINTS) {
    await verifyEndpoint(endpoint);
  }
};

run().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
