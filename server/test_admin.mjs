const BASE = 'http://localhost:5000/api/v1';

async function login(phone) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password: 'Admin@123' }),
  });
  const data = await res.json();
  console.log(`login ${phone}:`, res.status, JSON.stringify(data).slice(0, 300));
  return data?.data?.token || data?.token;
}

const token = await login('9000000001');
console.log('TOKEN (first 30):', (token || 'NONE').slice(0, 30));

if (token) {
  const headers = { Authorization: `Bearer ${token}` };
  const r1 = await fetch(`${BASE}/admin/complaints`, { headers });
  const d1 = await r1.json();
  console.log('GET /admin/complaints:', r1.status);
  console.log(JSON.stringify(d1).slice(0, 1200));

  const r2 = await fetch(`${BASE}/admin/complaints/stats`, { headers });
  const d2 = await r2.json();
  console.log('GET /admin/complaints/stats:', r2.status);
  console.log(JSON.stringify(d2).slice(0, 1200));
}
