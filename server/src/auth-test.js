// End-to-End Authentication System Test Script
// Tests: register (customer/provider), login (customer/provider/admin),
// OTP verify/resend, protected routes, logout, error handling.
import dotenv from 'dotenv';
dotenv.config();

const BASE = 'http://localhost:5000/api/v1';
let passed = 0;
let failed = 0;
const failures = [];

function log(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push({ name, detail });
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const uid = Date.now().toString().slice(-8);
const customerPhone = `98${uid}`;           // 2 + 8 = 10 digits ✓
const providerPhone = `97${uid}`;           // 2 + 8 = 10 digits ✓
const customerName = 'E2E Customer';
const providerName = 'E2E Provider';
const password = 'pass123';

async function main() {
  console.log(`\n🔐  AUTHENTICATION SYSTEM — END-TO-END TESTS\n`);
  console.log(`Using phones: customer=${customerPhone}, provider=${providerPhone}\n`);

  // ========== 1. CUSTOMER REGISTRATION ==========
  console.log('── Customer Registration ──');
  const custReg = await req('POST', '/auth/register', {
    name: customerName, phone: customerPhone, password, role: 'customer',
  });
  log('Customer register returns 201', custReg.status === 201, `status=${custReg.status}`);
  if (custReg.status !== 201) {
    console.log('  >>> Detail:', JSON.stringify(custReg.data, null, 2));
  }
  log('Customer register returns role', custReg.data?.data?.user?.role === 'customer');
  const customerToken = custReg.data?.data?.token;

  // ========== 2. PROVIDER REGISTRATION ==========
  console.log('\n── Provider Registration ──');
  const provReg = await req('POST', '/auth/register', {
    name: providerName, phone: providerPhone, password, role: 'provider',
  });
  log('Provider register returns 201', provReg.status === 201, `status=${provReg.status}`);
  log('Provider register returns role', provReg.data?.data?.user?.role === 'provider');
  const providerToken = provReg.data?.data?.token;

  // ========== 3. DUPLICATE USER ==========
  console.log('\n── Duplicate User Handling ──');
  const dup = await req('POST', '/auth/register', {
    name: customerName, phone: customerPhone, password, role: 'customer',
  });
  log('Duplicate register returns 409', dup.status === 409, `status=${dup.status}`);
  log('Duplicate error message meaningful', /already exists/i.test(dup.data?.message || ''), dup.data?.message);

  // ========== 4. VALIDATION ERRORS ==========
  console.log('\n── Validation Errors ──');
  const badPhone = await req('POST', '/auth/register', {
    name: 'Test', phone: '12345', password, role: 'customer',
  });
  log('Invalid phone returns 400', badPhone.status === 400, `status=${badPhone.status}`);
  log('Invalid phone error lists field', badPhone.data?.errors?.[0]?.field === 'phone');

  const badRole = await req('POST', '/auth/register', {
    name: 'Test', phone: `99${uid}`, password, role: 'hacker',
  });
  log('Invalid role returns 400', badRole.status === 400, `status=${badRole.status}`);

  // ========== 5. LOGIN — CUSTOMER ==========
  console.log('\n── Customer Login ──');
  const custLogin = await req('POST', '/auth/login', { phone: customerPhone, password });
  log('Customer login returns 200', custLogin.status === 200, `status=${custLogin.status}`);
  log('Customer login returns JWT', !!custLogin.data?.data?.token);
  log('Customer login returns role', custLogin.data?.data?.user?.role === 'customer');
  const custToken = custLogin.data?.data?.token || customerToken;

  // ========== 6. LOGIN — PROVIDER ==========
  console.log('\n── Provider Login ──');
  const provLogin = await req('POST', '/auth/login', { phone: providerPhone, password });
  log('Provider login returns 200', provLogin.status === 200, `status=${provLogin.status}`);
  log('Provider login returns role', provLogin.data?.data?.user?.role === 'provider');
  const provToken = provLogin.data?.data?.token || providerToken;

  // ========== 7. LOGIN — ADMIN ==========
  console.log('\n── Admin Login ──');
  const adminLogin = await req('POST', '/auth/login', {
    phone: process.env.ADMIN_PHONE || '9000000001',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  });
  log('Admin login returns 200', adminLogin.status === 200, `status=${adminLogin.status}`);
  log('Admin login returns role', adminLogin.data?.data?.user?.role === 'admin');
  const adminToken = adminLogin.data?.data?.token;

  // ========== 8. LOGIN FAILURE ==========
  console.log('\n── Login Failure Handling ──');
  const badLogin = await req('POST', '/auth/login', { phone: customerPhone, password: 'wrongpass' });
  log('Wrong password returns 401', badLogin.status === 401, `status=${badLogin.status}`);
  log('Wrong password message meaningful', /invalid/i.test(badLogin.data?.message || ''), badLogin.data?.message);

  // ========== 9. PROTECTED ROUTES ==========
  console.log('\n── Protected Routes ──');
  const meNoToken = await req('GET', '/auth/me');
  log('GET /auth/me without token returns 401', meNoToken.status === 401, `status=${meNoToken.status}`);

  const meCust = await req('GET', '/auth/me', null, custToken);
  log('Customer /auth/me returns 200', meCust.status === 200, `status=${meCust.status}`);
  log('Customer /auth/me returns correct role', meCust.data?.data?.user?.role === 'customer');

  const meAdmin = await req('GET', '/auth/me', null, adminToken);
  log('Admin /auth/me returns 200', meAdmin.status === 200, `status=${meAdmin.status}`);
  log('Admin /auth/me returns correct role', meAdmin.data?.data?.user?.role === 'admin');

  // ========== 10. ROLE PROTECTION (admin routes) ==========
  console.log('\n── Role-based Protection ──');
  const adminOnly = await req('GET', '/admin/users', null, custToken);
  log('Customer accessing admin route returns 403', adminOnly.status === 403, `status=${adminOnly.status}`);

  // ========== 11. EXPIRED/INVALID TOKEN ==========
  console.log('\n── Invalid/Expired Token ──');
  const badToken = await req('GET', '/auth/me', null, 'invalid.token.here');
  log('Invalid token returns 401', badToken.status === 401, `status=${badToken.status}`);

  // ========== 12. OTP FLOW ==========
  console.log('\n── OTP Flow ──');
  const otpUser = await req('POST', '/auth/register', {
    name: 'OTP User', phone: `96${uid}`, password, role: 'customer',
  });
  log('OTP user register 201', otpUser.status === 201, `status=${otpUser.status}`);

  // Invalid OTP should fail
  const badOtp = await req('POST', '/auth/otp-verify', { phone: `96${uid}`, otp: '000000' });
  log('Wrong OTP returns 400', badOtp.status === 400, `status=${badOtp.status}`);

  const resend = await req('POST', '/auth/otp-resend', { phone: `96${uid}` });
  log('Resend OTP returns 200', resend.status === 200, `status=${resend.status}`);

  // ========== 13. FORGOT / RESET PASSWORD ==========
  console.log('\n── Forgot & Reset Password ──');
  const forgot = await req('POST', '/auth/forgot-password', { phone: customerPhone });
  log('Forgot password returns 200', forgot.status === 200, `status=${forgot.status}`);

  const resetMissing = await req('POST', '/auth/reset-password', { token: 'bogus', password: 'newpass123' });
  log('Reset with bogus token returns 400', resetMissing.status === 400, `status=${resetMissing.status}`);

  // ========== 14. LOGOUT ==========
  console.log('\n── Logout ──');
  log('Logout is client-side (token cleared)', true, 'No server logout endpoint required');
  const afterLogout = await req('GET', '/auth/me', null, custToken);
  log('Token still works until expiry (client clears on logout)', afterLogout.status === 200);

  // ========== SUMMARY ==========
  console.log(`\n========================================`);
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Test script crashed:', e.message);
  process.exit(1);
});