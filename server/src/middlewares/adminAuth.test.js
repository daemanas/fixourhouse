import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import AdminSession from '../models/AdminSession.js';
import { createAdminToken } from '../utils/adminAuth.js';
import { adminProtect } from './adminAuth.js';

const testAdminEmail = `admin-${crypto.randomUUID()}@example.test`;

const callAdminProtect = (authorization) => new Promise((resolve) => {
  const req = { headers: authorization ? { authorization } : {} };
  const next = (error) => resolve({ error, req });
  adminProtect(req, {}, next);
});

test('admin API authentication rejects absent and regular-user tokens', async (t) => {
  const originalEmail = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = testAdminEmail;
  const originalExists = AdminSession.exists;
  AdminSession.exists = async () => ({ _id: 'active-session' });
  t.after(() => {
    if (originalEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalEmail;
    AdminSession.exists = originalExists;
  });

  const missingToken = await callAdminProtect();
  assert.equal(missingToken.error.statusCode, 401);

  for (const role of ['customer', 'provider']) {
    const token = jwt.sign({ id: 'user-id', role }, env.jwtSecret, { expiresIn: '1h' });
    const result = await callAdminProtect(`Bearer ${token}`);
    assert.equal(result.error.statusCode, 403);
  }
});

test('admin API accepts only a currently configured admin token', async (t) => {
  const originalEmail = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = testAdminEmail;
  const originalExists = AdminSession.exists;
  let active = true;
  AdminSession.exists = async () => (active ? { _id: 'active-session' } : null);
  t.after(() => {
    if (originalEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalEmail;
    AdminSession.exists = originalExists;
  });

  const token = createAdminToken(testAdminEmail, env.jwtSecret);
  const accepted = await callAdminProtect(`Bearer ${token}`);
  assert.equal(accepted.error, undefined);
  assert.deepEqual(accepted.req.admin, { email: testAdminEmail, role: 'admin' });
  assert.equal(accepted.req.user._id, null);

  active = false;
  const revoked = await callAdminProtect(`Bearer ${token}`);
  assert.equal(revoked.error.statusCode, 401);

  active = true;
  process.env.ADMIN_EMAIL = `different-${crypto.randomUUID()}@example.test`;
  const rejected = await callAdminProtect(`Bearer ${token}`);
  assert.equal(rejected.error.statusCode, 403);
});
