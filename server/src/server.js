import app from './app.js';
import env from './config/env.js';
import connectDB from './config/db.js';
import { verifySmtpConnection } from './services/emailService.js';

const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected successfully');
    await verifySmtpConnection();

    const server = app.listen(env.port, '0.0.0.0', () => {
      console.log(`🚀 LocalFix API running in ${env.nodeEnv} mode on port ${env.port}`);
      console.log(`📡 Health check: http://localhost:${env.port}/health`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force exit after 10s if connections don't close
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();