import mongoose from 'mongoose';
import env from './env.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;