import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  ADMIN_TOKEN_AUDIENCE,
  ADMIN_TOKEN_ISSUER,
  ADMIN_TOKEN_TTL,
  createAdminToken,
  credentialsMatch,
  normalizeAdminEmail,
  verifyAdminToken,
} from './adminAuth.js';

const testEmail = `Admin-${crypto.randomUUID()}@Example.test `;
const normalizedTestEmail = testEmail.trim().toLowerCase();
const testPassword = crypto.randomBytes(24).toString('base64url');
const config = { email: testEmail, password: testPassword };

test('admin credentials are normalized and compared securely', () => {
  assert.equal(normalizeAdminEmail(` ${testEmail}`), normalizedTestEmail);
  assert.equal(credentialsMatch({ email: ` ${normalizedTestEmail.toUpperCase()} `, password: config.password }, config), true);
  assert.equal(credentialsMatch({ email: `wrong-${crypto.randomUUID()}@example.test`, password: config.password }, config), false);
  assert.equal(credentialsMatch({ email: config.email, password: crypto.randomBytes(24).toString('base64url') }, config), false);
  assert.equal(credentialsMatch({ email: config.email, password: config.password }, { email: '', password: '' }), false);
});

test('admin JWT is explicitly scoped and has a short expiration', () => {
  const token = createAdminToken(testEmail, 'test-jwt-secret');
  const claims = verifyAdminToken(token, 'test-jwt-secret');

  assert.equal(claims.role, 'admin');
  assert.equal(claims.tokenUse, 'admin');
  assert.equal(claims.email, normalizedTestEmail);
  assert.equal(claims.iss, ADMIN_TOKEN_ISSUER);
  assert.equal(claims.aud, ADMIN_TOKEN_AUDIENCE);
  assert.equal(claims.exp - claims.iat, 60 * 60);
  assert.ok(claims.jti);
  assert.equal('password' in claims, false);
});

test('customer and provider JWTs cannot verify as admin tokens', () => {
  const ordinaryToken = jwt.sign({ id: 'user-id', role: 'customer' }, 'test-jwt-secret', { expiresIn: ADMIN_TOKEN_TTL });
  assert.throws(() => verifyAdminToken(ordinaryToken, 'test-jwt-secret'));

  const providerToken = jwt.sign({ id: 'provider-id', role: 'provider' }, 'test-jwt-secret', { expiresIn: ADMIN_TOKEN_TTL });
  assert.throws(() => verifyAdminToken(providerToken, 'test-jwt-secret'));
});
