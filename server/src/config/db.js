import mongoose from 'mongoose';
import env from './env.js';
import User from '../models/User.js';
import AuthOtp from '../models/AuthOtp.js';

async function ensureAuthIndexes() {
  const userCollection = await mongoose.connection.db
    .listCollections({ name: User.collection.name }, { nameOnly: true }).toArray();
  if (!userCollection.length) await User.createCollection();

  const otpCollection = await mongoose.connection.db
    .listCollections({ name: AuthOtp.collection.name }, { nameOnly: true }).toArray();
  if (!otpCollection.length) await AuthOtp.createCollection();

  const indexes = await User.collection.indexes();
  const phoneIndex = indexes.find((index) => index.key?.phone === 1);
  if (phoneIndex && !(phoneIndex.unique && phoneIndex.sparse)) {
    await User.collection.dropIndex(phoneIndex.name);
  }
  await User.collection.createIndex({ phone: 1 }, { unique: true, sparse: true });

  const emailIndex = indexes.find((index) => index.key?.email === 1);
  const duplicateEmails = await User.collection.aggregate([
    { $match: { email: { $type: 'string', $ne: '' } } },
    { $group: { _id: '$email', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]).toArray();
  if (duplicateEmails.length) {
    throw new Error('Cannot enforce unique LocalFix email addresses: duplicate email accounts exist.');
  }
  if (emailIndex && !(emailIndex.unique && emailIndex.sparse)) {
    await User.collection.dropIndex(emailIndex.name);
  }
  await User.collection.createIndex({ email: 1 }, { unique: true, sparse: true });

  await User.createIndexes();
  await AuthOtp.createIndexes();
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    await ensureAuthIndexes();
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;