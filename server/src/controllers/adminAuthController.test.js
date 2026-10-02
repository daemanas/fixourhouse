import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import env from '../config/env.js';
import { loginAdmin, logoutAdmin } from './adminAuthController.js';
import AdminSession from '../models/AdminSession.js';
import { verifyAdminToken } from '../utils/adminAuth.js';

const testAdminEmail = `admin-${crypto.randomUUID()}@example.test`;
const testAdminPassword = crypto.randomBytes(24).toString('base64url');

const runLogin = async (body) => {
  let response;
  let error;
  const req = { body };
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      response = payload;
      return this;
    },
  };
  await loginAdmin(req, res, (nextError) => { error = nextError; });
  return { response, error, statusCode: res.statusCode };
};

test('admin login returns a scoped token and no credentials', async (t) => {
  const previousEmail = process.env.ADMIN_EMAIL;
  const previousPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_EMAIL = ` ${testAdminEmail.toUpperCase()} `;
  process.env.ADMIN_PASSWORD = testAdminPassword;
  const originalCreate = AdminSession.create;
  AdminSession.create = async (session) => session;
  t.after(() => {
    if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousEmail;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
    AdminSession.create = originalCreate;
  });

  const result = await runLogin({ email: ` ${testAdminEmail} `, password: testAdminPassword });
  assert.equal(result.statusCode, 200);
  assert.equal(result.response.data.admin.email, testAdminEmail);
  assert.equal(result.response.data.admin.role, 'admin');
  assert.equal(verifyAdminToken(result.response.data.token, env.jwtSecret).tokenUse, 'admin');
  assert.equal(JSON.stringify(result.response).includes(testAdminPassword), false);
  assert.equal(JSON.stringify(result.response).includes(testAdminEmail.toUpperCase()), false);
});

test('admin login rejects wrong email and password with one generic error', async (t) => {
  const previousEmail = process.env.ADMIN_EMAIL;
  const previousPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_EMAIL = testAdminEmail;
  process.env.ADMIN_PASSWORD = testAdminPassword;
  t.after(() => {
    if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousEmail;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
  });

  const wrongEmail = await runLogin({ email: `wrong-${crypto.randomUUID()}@example.test`, password: testAdminPassword });
  const wrongPassword = await runLogin({ email: testAdminEmail, password: crypto.randomBytes(24).toString('base64url') });
  assert.equal(wrongEmail.error.statusCode, 401);
  assert.equal(wrongPassword.error.statusCode, 401);
  assert.equal(wrongEmail.error.message, 'Invalid email or password');
  assert.equal(wrongPassword.error.message, wrongEmail.error.message);
  assert.equal(wrongEmail.error.message.includes(testAdminEmail), false);
  assert.equal(wrongPassword.error.message.includes(testAdminPassword), false);
});

test('admin logout revokes the session record', async (t) => {
  const originalDeleteOne = AdminSession.deleteOne;
  let revokedTokenId;
  AdminSession.deleteOne = async ({ tokenId }) => {
    revokedTokenId = tokenId;
    return { deletedCount: 1 };
  };
  t.after(() => { AdminSession.deleteOne = originalDeleteOne; });

  let payload;
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(response) {
      payload = response;
      return this;
    },
  };
  await logoutAdmin({ adminSessionId: 'session-to-revoke' }, res, assert.fail);
  assert.equal(revokedTokenId, 'session-to-revoke');
  assert.equal(res.statusCode, 200);
  assert.equal(payload.data.admin, undefined);
});
