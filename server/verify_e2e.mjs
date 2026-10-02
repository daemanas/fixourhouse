import connectDB from './src/config/db.js';
import User from './src/models/User.js';

const BASE = 'http://localhost:5000/api/v1';
const CUST_PHONE = '9800495337';
const CUST_PW = 'Test@12345';

async function login(phone, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login failed ${res.status}: ${JSON.stringify(data)}`);
  return data.data.token;
}

async function loginAdmin() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the server environment.');
  }
  const res = await fetch(`${BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`admin login failed (${res.status})`);
  return data.data.token;
}

async function main() {
  await connectDB();
  // Ensure a known customer password so we can exercise the real auth + complaint flow.
  const cust = await User.findOne({ phone: CUST_PHONE });
  if (!cust) throw new Error('customer not found');
  cust.password = CUST_PW;
  await cust.save();
  console.log('set known customer password');

  const custToken = await login(CUST_PHONE, CUST_PW);
  const adminToken = await loginAdmin();
  console.log('customer login OK, admin login OK');

  // customer bookings (eligible)
  const bookingsRes = await fetch(`${BASE}/bookings/my?limit=50`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const bookings = await bookingsRes.json();
  console.log('GET /bookings/my raw:', JSON.stringify(bookings).slice(0, 600));
  const list = bookings?.data?.bookings || bookings?.data?.data?.bookings || [];
  const eligible = list.find((b) =>
    ['accepted', 'working', 'completed'].includes(b.status)
  );
  console.log('eligible booking found:', !!eligible, eligible?.status, eligible?._id);

  if (eligible) {
    const createRes = await fetch(`${BASE}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        bookingId: eligible._id,
        category: 'service_quality',
        priority: 'medium',
        requestedResolution: 'other',
        requestedResolutionText: 'Test resolution',
        description: 'E2E verification complaint',
        evidence: [],
      }),
    });
    const createData = await createRes.json();
    console.log('POST /complaints ->', createRes.status, createData.data?.complaintId || createData.message);

    const myRes = await fetch(`${BASE}/complaints/my`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const myData = await myRes.json();
    console.log('GET /complaints/my ->', myRes.status, 'count', myData.data?.complaints?.length);
  }

  // admin complaints + stats
  const adminList = await fetch(`${BASE}/admin/complaints?limit=50`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminListData = await adminList.json();
  console.log('GET /admin/complaints ->', adminList.status, 'count', adminListData.data?.complaints?.length);

  const adminStats = await fetch(`${BASE}/admin/complaints/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminStatsData = await adminStats.json();
  console.log('GET /admin/complaints/stats ->', adminStats.status, JSON.stringify(adminStatsData.data?.byStatus));
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode || 0), 500);
  });
