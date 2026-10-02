import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(serverRoot, '.env') });

const smtp = {
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || '',
  portConfigured: Boolean(process.env.SMTP_PORT),
  secureConfigured: Boolean(process.env.SMTP_SECURE),
  configured: Boolean(
    process.env.SMTP_HOST
    && process.env.SMTP_PORT
    && process.env.SMTP_SECURE !== undefined
    && process.env.SMTP_USER
    && process.env.SMTP_PASS
    && process.env.SMTP_FROM
  ),
};

const isProd = process.env.NODE_ENV === 'production';
const requiredInProd = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];

if (isProd) {
  const missing = requiredInProd.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/localfix',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  otpExpiresIn: 600,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number.parseInt(process.env.SMTP_PORT || '0', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpSecureConfigured: Boolean(process.env.SMTP_SECURE),
  smtpPortConfigured: Boolean(process.env.SMTP_PORT),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
  smtp,
};

export default env;