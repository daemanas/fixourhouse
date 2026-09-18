import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const requiredInProd = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];

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
  otpExpiresIn: parseInt(process.env.OTP_EXPIRES_IN || '300', 10),
};

export default env;