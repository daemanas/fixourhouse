import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import compression from 'compression';
import env from './config/env.js';
import { apiLimiter } from './config/rateLimiter.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/index.js';
import { UPLOADS_ROOT } from './utils/upload.js';

const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", 'https://accounts.google.com/gsi/client'],
        'frame-src': ["'self'", 'https://accounts.google.com/gsi/'],
        'connect-src': ["'self'", 'https://accounts.google.com/gsi/'],
      },
    },
  })
);
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (avatars, etc.) — directory is created lazily by the upload helper.
//
// Uploaded files are public images that the frontend embeds from a different origin in
// development (http://localhost:5173 → http://localhost:5000). Helmet's default
// Cross-Origin-Resource-Policy (same-origin) would make the browser block those
// cross-origin <img> requests, which surfaces as avatars silently falling back to
// initials. The CORP header is therefore explicitly relaxed to "cross-origin" for the
// uploads route only; every other helmet protection stays intact.
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(UPLOADS_ROOT)
);

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Global rate limiter
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LocalFix API is running',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;