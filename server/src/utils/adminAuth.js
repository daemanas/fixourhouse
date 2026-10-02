import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const ADMIN_TOKEN_ISSUER = 'localfix-admin';
export const ADMIN_TOKEN_AUDIENCE = 'localfix-admin';
export const ADMIN_TOKEN_USE = 'admin';
export const ADMIN_TOKEN_TTL = '1h';

export const normalizeAdminEmail = (email) => String(email || '').trim().toLowerCase();

const passwordDigest = (password) =>
  crypto.createHash('sha256').update(String(password)).digest();

export const credentialsMatch = ({ email, password }, config) => {
  const configuredEmail = normalizeAdminEmail(config.email);
  if (!configuredEmail || !config.password || typeof password !== 'string') return false;

  const submittedPasswordDigest = passwordDigest(password);
  const configuredPasswordDigest = passwordDigest(config.password);
  return normalizeAdminEmail(email) === configuredEmail
    && crypto.timingSafeEqual(submittedPasswordDigest, configuredPasswordDigest);
};

export const createAdminToken = (email, secret) => jwt.sign({
  role: 'admin',
  email: normalizeAdminEmail(email),
  tokenUse: ADMIN_TOKEN_USE,
  jti: crypto.randomUUID(),
}, secret, {
  expiresIn: ADMIN_TOKEN_TTL,
  issuer: ADMIN_TOKEN_ISSUER,
  audience: ADMIN_TOKEN_AUDIENCE,
});

export const verifyAdminToken = (token, secret) => jwt.verify(token, secret, {
  issuer: ADMIN_TOKEN_ISSUER,
  audience: ADMIN_TOKEN_AUDIENCE,
});
