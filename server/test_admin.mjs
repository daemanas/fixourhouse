import dotenv from 'dotenv';
dotenv.config();

const BASE = 'http://localhost:5000/api/v1';

async function login() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the server environment.');
  }
  const res = await fetch(`${BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  });
  const data = await res.json();
  console.log('Dedicated admin login status:', res.status);
  return res.ok ? data?.data?.token : null;
}

const token = await login();

if (token) {
  const headers = { Authorization: `Bearer ${token}` };
  const r1 = await fetch(`${BASE}/admin/complaints`, { headers });
  console.log('GET /admin/complaints:', r1.status);

  const r2 = await fetch(`${BASE}/admin/complaints/stats`, { headers });
  console.log('GET /admin/complaints/stats:', r2.status);
  const logout = await fetch(`${BASE}/admin/auth/logout`, { method: 'POST', headers });
  console.log('POST /admin/auth/logout:', logout.status);
}
