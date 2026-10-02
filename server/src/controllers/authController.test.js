import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import AuthOtp from '../models/AuthOtp.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import env from '../config/env.js';
import { emailService } from '../services/emailService.js';
import { createOtpChallenge, verifyOtpChallenge, OTP_MAX_ATTEMPTS } from '../services/otpService.js';
import {
  forgotPassword,
  googleAuth,
  register,
  requestLoginOtp,
  resetPassword,
  resendOtp,
  verifyOtp,
} from './authController.js';
import { generateOtp, hashOtp, isOtpExpired, verifyOtpCode } from '../utils/otp.js';
import { sendOtpSms } from '../utils/sendOtpSms.js';

const envKeys = [
  'twilioAccountSid',
  'twilioAuthToken',
  'twilioPhoneNumber',
  'googleClientId',
  'nodeEnv',
  'smtpHost',
  'smtpPort',
  'smtpSecure',
  'smtpSecureConfigured',
  'smtpUser',
  'smtpPass',
  'smtpFrom',
];

function preserveEnv(t) {
  const previous = Object.fromEntries(envKeys.map((key) => [key, env[key]]));
  const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const previousProcessEnv = Object.fromEntries(smtpKeys.map((key) => [key, process.env[key]]));
  const previousSmtp = { ...env.smtp };
  t.after(() => {
    Object.assign(env, previous, { smtp: previousSmtp });
    for (const key of smtpKeys) {
      if (previousProcessEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousProcessEnv[key];
    }
  });
}

function configureSmtp(host = 'smtp.local.test') {
  const values = {
    SMTP_HOST: host,
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'mailer-user',
    SMTP_PASS: 'mailer-password',
    SMTP_FROM: 'LocalFix <verify@example.test>',
  };
  Object.assign(process.env, values);
  env.smtp = {
    host: values.SMTP_HOST,
    port: Number(values.SMTP_PORT),
    secure: false,
    user: values.SMTP_USER,
    pass: values.SMTP_PASS,
    from: values.SMTP_FROM,
    configured: true,
    portConfigured: true,
    secureConfigured: true,
  };
  env.smtpSecureConfigured = true;
}

function installMemoryChallenges(t) {
  const challenges = new Map();
  const key = ({ identifier, channel, purpose }) => `${identifier}:${channel}:${purpose}`;
  const findChallenge = (query) => query._id
    ? [...challenges.values()].find((item) => String(item._id) === String(query._id))
    : challenges.get(key(query));

  t.mock.method(AuthOtp, 'findOne', (query) => ({
    select: async () => findChallenge(query) || null,
  }));
  t.mock.method(AuthOtp.prototype, 'save', async function saveChallenge() {
    challenges.set(key(this), this);
    return this;
  });
  t.mock.method(AuthOtp, 'findOneAndUpdate', async (query, update) => {
    const challenge = findChallenge(query);
    if (!challenge || challenge.attempts >= OTP_MAX_ATTEMPTS) return null;
    challenge.attempts += update.$inc.attempts;
    return challenge;
  });
  t.mock.method(AuthOtp, 'deleteOne', async (query) => {
    const challenge = findChallenge(query);
    if (challenge) challenges.delete(key(challenge));
    return { deletedCount: challenge ? 1 : 0 };
  });
  t.mock.method(AuthOtp, 'findOneAndDelete', async (query) => {
    const challenge = findChallenge(query);
    if (challenge) challenges.delete(key(challenge));
    return challenge || null;
  });
  return challenges;
}

function dispatch(handler, body) {
  return new Promise((resolve) => {
    const response = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, payload });
      },
    };
    handler({ body }, response, (error) => resolve({ error }));
  });
}

function makeUser(properties = {}) {
  return {
    _id: 'user-id',
    name: 'Test User',
    phone: '9876543210',
    email: 'test@example.com',
    role: 'customer',
    status: 'active',
    save: async () => {},
    ...properties,
  };
}

function configureTwilio() {
  env.twilioAccountSid = 'ACtest';
  env.twilioAuthToken = 'test-token';
  env.twilioPhoneNumber = '+15555550100';
  env.nodeEnv = 'test';
}

test('OTP generation is six digits, hashed at rest, and expires', () => {
  const otp = generateOtp();
  assert.match(otp, /^\d{6}$/);
  assert.notEqual(hashOtp(otp), otp);
  assert.equal(verifyOtpCode(otp, hashOtp(otp)), true);
  assert.equal(verifyOtpCode('000000', hashOtp(otp)), false);
  assert.equal(isOtpExpired(new Date(Date.now() - 1)), true);
  assert.equal(isOtpExpired(new Date(Date.now() + 60_000)), false);
});

test('OTP challenge enforces resend cooldown, attempt limit, expiry and single use', async (t) => {
  installMemoryChallenges(t);
  let deliveredCode;
  const challengeArgs = {
    identifier: 'person@example.com',
    channel: 'email',
    purpose: 'login',
    deliver: async (code) => { deliveredCode = code; },
  };
  const result = await createOtpChallenge(challengeArgs);
  assert.equal(result.expiresAt.getTime() - Date.now() <= 300_000, true);
  assert.match(deliveredCode, /^\d{6}$/);
  await assert.rejects(createOtpChallenge(challengeArgs), { statusCode: 429 });

  for (let attempt = 1; attempt < OTP_MAX_ATTEMPTS; attempt += 1) {
    await assert.rejects(
      verifyOtpChallenge({ ...challengeArgs, otp: '000000' }),
      { statusCode: 400 },
    );
  }
  await assert.rejects(
    verifyOtpChallenge({ ...challengeArgs, otp: '000000' }),
    { statusCode: 429 },
  );

  await createOtpChallenge({
    ...challengeArgs,
    identifier: 'second@example.com',
  });
  const verified = await verifyOtpChallenge({
    ...challengeArgs,
    identifier: 'second@example.com',
    otp: deliveredCode,
  });
  assert.equal(verified.identifier, 'second@example.com');
  await assert.rejects(
    verifyOtpChallenge({
      ...challengeArgs,
      identifier: 'second@example.com',
      otp: deliveredCode,
    }),
    { statusCode: 400 },
  );
});

test('Twilio rejects invalid sender configuration before making a provider request', async (t) => {
  preserveEnv(t);
  configureTwilio();
  env.twilioPhoneNumber = '1234567890';
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Fetch must not be called when sender configuration is invalid');
  });
  const log = t.mock.method(console, 'error', () => {});
  await assert.rejects(sendOtpSms('9876543210', '123456'), { statusCode: 503 });
  assert.match(log.mock.calls[0].arguments[0], /TWILIO_PHONE_NUMBER/);
});

test('Twilio provider errors are logged without credentials or phone numbers', async (t) => {
  preserveEnv(t);
  configureTwilio();
  const log = t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      code: 21212,
      message: `Sender +15555550100 rejected; ${env.twilioAuthToken}`,
    }),
  }));
  await assert.rejects(sendOtpSms('9876543210', '123456'), { statusCode: 503 });
  const logged = JSON.stringify(log.mock.calls[0].arguments);
  assert.match(logged, /21212/);
  assert.equal(logged.includes(env.twilioAuthToken), false);
  assert.equal(logged.includes(env.twilioPhoneNumber), false);
});

test('email OTP reports missing SMTP configuration without returning a code', async (t) => {
  preserveEnv(t);
  for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']) {
    delete process.env[key];
  }
  env.smtp = {
    host: '',
    port: 0,
    secure: false,
    user: '',
    pass: '',
    from: '',
    portConfigured: false,
    secureConfigured: false,
  };
  env.smtpSecureConfigured = false;
  env.smtpHost = '';
  env.smtpPort = 587;
  env.smtpUser = '';
  env.smtpPass = '';
  env.smtpFrom = '';
  const log = t.mock.method(console, 'error', () => {});
  const error = await emailService.sendOtpEmail('person@example.com', '123456')
    .catch((caught) => caught);
  assert.equal(error.statusCode, 503);
  assert.match(error.message, /Email verification is not configured/);
  assert.equal(JSON.stringify(log.mock.calls).includes('123456'), false);
});

test('configured SMTP sends email and verifies its connection using Nodemailer', async (t) => {
  preserveEnv(t);
  configureSmtp();
  let sentMail;
  let verified = false;
  const createTransport = t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async (mail) => {
      sentMail = mail;
      return {
        messageId: 'test-id',
        accepted: ['person@example.test'],
        rejected: [],
        response: '250 Message accepted',
      };
    },
    verify: async () => { verified = true; return true; },
  }));
  const { sendOtpEmail, verifySmtpConnection } = await import('../services/emailService.js');

  await sendOtpEmail('person@example.test', '123456');
  assert.equal(sentMail.to, 'person@example.test');
  assert.equal(sentMail.subject, 'LocalFix Email Verification Code');
  assert.match(sentMail.text, /123456/);
  assert.match(sentMail.text, /expire in 5 minutes/);
  assert.equal(JSON.stringify(sentMail).includes(env.smtpPass), false);
  assert.equal(await verifySmtpConnection(), true);
  assert.equal(verified, true);
  assert.equal(createTransport.mock.calls.length, 1);
});

test('SMTP recipient rejection cannot produce a successful email OTP send', async (t) => {
  preserveEnv(t);
  configureSmtp('smtp.recipient-rejected.test');
  const log = t.mock.method(console, 'error', () => {});
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async () => ({
      messageId: 'rejected-id',
      accepted: [],
      rejected: ['person@example.test'],
      response: '550 recipient rejected',
    }),
  }));
  const { sendOtpEmail } = await import('../services/emailService.js');

  const error = await sendOtpEmail('person@example.test', '123456').catch((caught) => caught);
  assert.equal(error.code, 'SMTP_SEND_FAILED');
  assert.equal(log.mock.calls.length, 1);
  assert.equal(JSON.stringify(log.mock.calls).includes('123456'), false);
});

test('email OTP resend normalizes and delivers to the pending registration email', async (t) => {
  preserveEnv(t);
  const challenges = installMemoryChallenges(t);
  await createOtpChallenge({
    identifier: 'person@example.test',
    channel: 'email',
    purpose: 'registration',
    pendingRegistration: { email: 'person@example.test' },
    deliver: async () => {},
  });
  const challenge = challenges.values().next().value;
  challenge.resendAvailableAt = new Date(Date.now() - 1);

  let deliveredTo;
  t.mock.method(emailService, 'sendOtpEmail', async (email) => {
    deliveredTo = email;
  });
  const result = await dispatch(resendOtp, {
    email: ' PERSON@Example.Test ',
    purpose: 'registration',
  });

  assert.equal(deliveredTo, 'person@example.test');
  assert.equal(result.status, 200);
  assert.equal(result.payload.data.channel, 'email');
  assert.match(result.payload.message, /resent to your email/i);
});

test('forgot-password email OTP verifies and issues a single-use reset token', async (t) => {
  const challenges = installMemoryChallenges(t);
  const user = makeUser({ email: 'reset@example.test' });
  t.mock.method(User, 'findOne', async () => user);
  let deliveredCode;
  t.mock.method(emailService, 'sendOtpEmail', async (email, otp) => {
    assert.equal(email, 'reset@example.test');
    deliveredCode = otp;
  });

  const requested = await dispatch(forgotPassword, { email: ' RESET@Example.Test ' });
  assert.equal(requested.status, 200);
  assert.equal(requested.payload.data.channel, 'email');
  assert.equal(JSON.stringify(requested.payload).includes(deliveredCode), false);
  assert.equal(challenges.has('reset@example.test:email:reset-password'), true);

  const verified = await dispatch(verifyOtp, {
    email: 'RESET@example.test',
    otp: deliveredCode,
    purpose: 'reset-password',
  });
  assert.equal(verified.status, 200);
  assert.match(verified.payload.data.resetToken, /^[\da-f]{64}$/);
  assert.equal(user.resetPasswordExpires > Date.now(), true);
  assert.equal(challenges.has('reset@example.test:email:reset-password'), false);

  const reset = await dispatch(resetPassword, {
    token: verified.payload.data.resetToken,
    password: 'StrongPass123',
  });
  assert.equal(reset.status, 200);
  assert.equal(user.password, 'StrongPass123');
  assert.equal(user.resetPasswordToken, undefined);
  assert.equal(user.resetPasswordExpires, undefined);
});

test('forgot-password OTP resend normalizes email and delivers a new email code', async (t) => {
  const challenges = installMemoryChallenges(t);
  await createOtpChallenge({
    identifier: 'reset@example.test',
    channel: 'email',
    purpose: 'reset-password',
    deliver: async () => {},
  });
  const challenge = challenges.values().next().value;
  challenge.resendAvailableAt = new Date(Date.now() - 1);
  t.mock.method(User, 'findOne', async () => makeUser({ email: 'reset@example.test' }));
  let deliveredTo;
  t.mock.method(emailService, 'sendOtpEmail', async (email) => { deliveredTo = email; });

  const result = await dispatch(resendOtp, {
    email: ' RESET@Example.Test ',
    purpose: 'reset-password',
  });

  assert.equal(result.status, 200);
  assert.equal(deliveredTo, 'reset@example.test');
  assert.equal(result.payload.data.channel, 'email');
  assert.match(result.payload.message, /resent to your email/i);
});

test('SMTP authentication and connectivity failures have distinct error codes', async (t) => {
  preserveEnv(t);
  const log = t.mock.method(console, 'error', () => {});
  const { sendOtpEmail } = await import('../services/emailService.js');
  let currentFailure = 'EAUTH';
  const transportFactory = t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async () => {
      const message = currentFailure === 'EAUTH'
        ? 'authentication failed'
        : currentFailure === 'ETIMEDOUT' ? 'Connection timed out' : 'Mailbox rejected';
      const error = new Error(message);
      error.code = currentFailure;
      error.responseCode = currentFailure === 'EAUTH' ? 535 : undefined;
      throw error;
    },
    verify: async () => true,
  }));

  configureSmtp('smtp.auth-failed.test');
  const authError = await sendOtpEmail('person@example.test', '123456').catch((error) => error);
  assert.equal(authError.code, 'SMTP_AUTH_FAILED');

  currentFailure = 'ETIMEDOUT';
  configureSmtp('smtp.timeout.test');
  const connectionError = await sendOtpEmail('person@example.test', '123456')
    .catch((error) => error);
  assert.equal(connectionError.code, 'SMTP_CONNECTION_FAILED');
  currentFailure = 'ENOTFOUND';
  configureSmtp('smtp.dns-failed.test');
  const dnsError = await sendOtpEmail('person@example.test', '123456')
    .catch((error) => error);
  assert.equal(dnsError.code, 'SMTP_CONNECTION_FAILED');
  currentFailure = 'EENVELOPE';
  configureSmtp('smtp.delivery-failed.test');
  const sendError = await sendOtpEmail('person@example.test', '123456').catch((error) => error);
  assert.equal(sendError.code, 'SMTP_SEND_FAILED');
  assert.equal(log.mock.calls.length, 4);
  assert.equal(transportFactory.mock.calls.length, 4);
});

test('expired email challenge is rejected and removed', async (t) => {
  const challenges = installMemoryChallenges(t);
  await createOtpChallenge({
    identifier: 'expired@example.com',
    channel: 'email',
    purpose: 'login',
    deliver: async () => {},
  });
  const challenge = challenges.values().next().value;
  challenge.expiresAt = new Date(Date.now() - 1000);
  await assert.rejects(
    verifyOtpChallenge({
      identifier: 'expired@example.com',
      channel: 'email',
      purpose: 'login',
      otp: '123456',
    }),
    { statusCode: 400 },
  );
  assert.equal(challenges.size, 0);
});

test('phone registration sends SMS but does not create an account before OTP verification', async (t) => {
  preserveEnv(t);
  configureTwilio();
  const challenges = installMemoryChallenges(t);
  let sentCode;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    sentCode = new URLSearchParams(options.body).get('Body').match(/\d{6}/)[0];
    return { ok: true, status: 201 };
  });
  t.mock.method(User, 'exists', async () => false);
  t.mock.method(User.prototype, 'save', async function saveUser() { return this; });
  t.mock.method(Provider, 'create', async () => ({}));

  const result = await dispatch(register, {
    name: 'Phone User',
    phone: '9876543210',
    channel: 'phone',
    password: 'password123',
    role: 'customer',
  });
  assert.equal(result.status, 200);
  assert.equal(result.payload.data.otpSent, true);
  assert.equal(JSON.stringify(result.payload).includes(sentCode), false);
  assert.equal(challenges.size, 1);
  assert.equal(challenges.values().next().value.pendingRegistration.passwordHash
    !== 'password123', true);

  const verified = await dispatch(verifyOtp, {
    phone: '9876543210',
    otp: sentCode,
    purpose: 'registration',
  });
  assert.equal(verified.status, 201);
  assert.equal(verified.payload.data.user.phone, '9876543210');
  assert.equal(verified.payload.data.user.role, 'customer');
  assert.equal(challenges.size, 0);
});

test('email registration sends email OTP and creates the user only after successful verification', async (t) => {
  const challenges = installMemoryChallenges(t);
  let sentCode;
  let createdUser;
  t.mock.method(emailService, 'sendOtpEmail', async (_email, otp) => { sentCode = otp; });
  t.mock.method(User, 'exists', async () => false);
  t.mock.method(User.prototype, 'save', async function saveUser() {
    createdUser = this;
    return this;
  });

  const result = await dispatch(register, {
    name: 'Email User',
    email: 'email@example.com',
    channel: 'email',
    password: 'password123',
    role: 'customer',
  });
  assert.equal(result.status, 200);
  assert.equal(result.payload.data.channel, 'email');
  assert.equal(JSON.stringify(result.payload).includes(sentCode), false);
  assert.equal(challenges.size, 1);

  const verified = await dispatch(verifyOtp, {
    email: 'email@example.com',
    otp: sentCode,
    purpose: 'registration',
  });
  assert.equal(verified.status, 201);
  assert.equal(verified.payload.data.user.email, 'email@example.com');
  assert.equal(createdUser.emailVerified, true);
  assert.equal(createdUser.phone, undefined);
  assert.equal(challenges.size, 0);
});

test('SMTP failure removes pending registration challenge so retry is not blocked', async (t) => {
  const challenges = installMemoryChallenges(t);
  let sendAttempts = 0;
  t.mock.method(emailService, 'sendOtpEmail', async () => {
    sendAttempts += 1;
    if (sendAttempts === 1) {
      const error = new Error('Could not send email');
      error.statusCode = 502;
      error.code = 'SMTP_SEND_FAILED';
      error.isOperational = true;
      throw error;
    }
  });
  t.mock.method(User, 'exists', async () => false);

  const request = {
    name: 'Retry User',
    email: 'retry@example.com',
    channel: 'email',
    password: 'password123',
    role: 'customer',
  };
  const failed = await dispatch(register, request);
  assert.equal(failed.error.code, 'SMTP_SEND_FAILED');
  assert.equal(challenges.size, 0);

  const retried = await dispatch(register, request);
  assert.equal(retried.status, 200);
  assert.equal(challenges.size, 1);
  assert.equal(sendAttempts, 2);
});

test('provider registration creates a provider profile only after phone OTP verification', async (t) => {
  preserveEnv(t);
  configureTwilio();
  const challenges = installMemoryChallenges(t);
  let sentCode;
  let providerCreated = false;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    sentCode = new URLSearchParams(options.body).get('Body').match(/\d{6}/)[0];
    return { ok: true, status: 201 };
  });
  t.mock.method(User, 'exists', async () => false);
  t.mock.method(User.prototype, 'save', async function saveUser() { return this; });
  t.mock.method(Provider, 'create', async () => { providerCreated = true; });

  await dispatch(register, {
    name: 'Provider User',
    phone: '9876543212',
    channel: 'phone',
    password: 'password123',
    role: 'provider',
  });
  assert.equal(providerCreated, false);

  const verified = await dispatch(verifyOtp, {
    phone: '9876543212',
    otp: sentCode,
    purpose: 'registration',
  });
  assert.equal(verified.status, 201);
  assert.equal(verified.payload.data.user.role, 'provider');
  assert.equal(providerCreated, true);
  assert.equal(challenges.size, 0);
});

for (const channel of ['phone', 'email']) {
  test(`existing ${channel} user logs in after OTP verification`, async (t) => {
    installMemoryChallenges(t);
    preserveEnv(t);
    if (channel === 'phone') configureTwilio();
    const user = makeUser();
    const identifier = channel === 'phone' ? user.phone : user.email;
    t.mock.method(User, 'findOne', async () => user);
    let sentCode;
    if (channel === 'phone') {
      t.mock.method(globalThis, 'fetch', async (_url, options) => {
        sentCode = new URLSearchParams(options.body).get('Body').match(/\d{6}/)[0];
        return { ok: true, status: 201 };
      });
    } else {
      t.mock.method(emailService, 'sendOtpEmail', async (_email, otp) => { sentCode = otp; });
    }

    const requested = await dispatch(requestLoginOtp, {
      [channel]: identifier,
    });
    assert.equal(requested.status, 200);
    const verified = await dispatch(verifyOtp, {
      [channel]: identifier,
      otp: sentCode,
      purpose: 'login',
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.payload.data.user.role, 'customer');
  });
}

test('registration rejects a duplicate phone before dispatching a verification code', async (t) => {
  t.mock.method(User, 'exists', async () => true);
  const result = await dispatch(register, {
    name: 'Duplicate User',
    phone: '9876543210',
    channel: 'phone',
    password: 'password123',
    role: 'customer',
  });
  assert.equal(result.error.statusCode, 409);
  assert.match(result.error.message, /already exists.*login/i);
});

test('email registration rejects an address already used by a LocalFix account', async (t) => {
  t.mock.method(User, 'exists', async (query) => Boolean(query.email));
  const result = await dispatch(register, {
    name: 'Duplicate Email',
    email: 'taken@example.com',
    channel: 'email',
    password: 'password123',
    role: 'customer',
  });
  assert.equal(result.error.statusCode, 409);
  assert.match(result.error.message, /already exists.*login/i);
});

test('Google login accepts an existing verified Google account', async (t) => {
  preserveEnv(t);
  env.googleClientId = 'test-client-id';
  t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => ({ email: 'google@example.com', email_verified: true }),
  }));
  const user = makeUser({ email: 'google@example.com' });
  t.mock.method(User, 'findOne', async () => user);

  const result = await dispatch(googleAuth, { idToken: 'verified-token' });
  assert.equal(result.status, 200);
  assert.equal(result.payload.data.user.email, 'google@example.com');
  assert.equal(result.payload.data.token.length > 0, true);
});

test('new Google account is not created until a phone and account type are provided', async (t) => {
  preserveEnv(t);
  env.googleClientId = 'test-client-id';
  t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => ({
      email: 'new-google@example.com',
      email_verified: true,
      name: 'Google User',
    }),
  }));
  t.mock.method(User, 'findOne', async () => null);
  const create = t.mock.method(User, 'create', async () => makeUser());

  const result = await dispatch(googleAuth, { idToken: 'verified-token' });
  assert.equal(result.status, 200);
  assert.equal(result.payload.data.requiresRegistration, true);
  assert.equal(result.payload.data.email, 'new-google@example.com');
  assert.equal(create.mock.calls.length, 0);
});

test('new Google account is created with verified email, required phone and selected role', async (t) => {
  preserveEnv(t);
  env.googleClientId = 'test-client-id';
  t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => ({
      email: 'provider@example.com',
      email_verified: true,
      name: 'Provider User',
    }),
  }));
  t.mock.method(User, 'findOne', async () => null);
  t.mock.method(User, 'exists', async () => false);
  t.mock.method(User, 'create', async (fields) => makeUser(fields));
  t.mock.method(User.prototype, 'save', async function saveUser() { return this; });
  t.mock.method(Provider, 'create', async () => ({}));

  const result = await dispatch(googleAuth, {
    idToken: 'verified-token',
    phone: '9876543210',
    role: 'provider',
  });
  assert.equal(result.status, 201);
  assert.equal(result.payload.data.user.email, 'provider@example.com');
  assert.equal(result.payload.data.user.role, 'provider');
});

test('email registration validator rejects invalid email and missing selected channel address', async () => {
  const { registerValidator } = await import('../validators/authValidator.js');
  const invalidEmail = registerValidator.validate({
    body: {
      name: 'Test User',
      phone: '9876543210',
      email: 'not-an-email',
      channel: 'email',
      password: 'password123',
    },
  });
  assert.ok(invalidEmail.error);
  const missingEmail = registerValidator.validate({
    body: {
      name: 'Test User',
      phone: '9876543210',
      channel: 'email',
      password: 'password123',
    },
  });
  assert.ok(missingEmail.error);
});

test('password recovery requires email and a strong new password', async () => {
  const { forgotPasswordValidator, resetPasswordValidator } = await import('../validators/authValidator.js');
  assert.equal(forgotPasswordValidator.validate({ body: { email: ' USER@example.com ' } }).error, undefined);
  assert.ok(forgotPasswordValidator.validate({ body: { phone: '9876543210' } }).error);
  assert.equal(
    resetPasswordValidator.validate({ body: { token: 'reset-token', password: 'Strong123' } }).error,
    undefined,
  );
  assert.ok(resetPasswordValidator.validate({ body: { token: 'reset-token', password: 'weakpass' } }).error);
});
