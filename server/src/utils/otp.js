import crypto from 'crypto';
import env from '../config/env.js';

export const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

export const hashOtp = (otp) =>
  crypto.createHmac('sha256', env.jwtSecret).update(String(otp)).digest('hex');

export const verifyOtpCode = (candidate, stored) => {
  if (typeof candidate !== 'string' || typeof stored !== 'string') return false;
  const expected = /^[a-f\d]{64}$/i.test(stored) ? stored : hashOtp(stored);
  const actual = hashOtp(candidate);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  return expectedBuffer.length === actualBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

export const isOtpExpired = (expiresAt, now = Date.now()) => {
  const expiry = new Date(expiresAt).getTime();
  return !Number.isFinite(expiry) || expiry <= now;
};
