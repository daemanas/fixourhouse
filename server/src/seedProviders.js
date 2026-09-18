import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db.js';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Category from './models/Category.js';
import Service from './models/Service.js';
import Booking from './models/Booking.js';
import Payment from './models/Payment.js';
import Review from './models/Review.js';
import Withdrawal from './models/Withdrawal.js';
import Report from './models/Report.js';

const DEMO_PHONE = '9123456789';
const CUSTOMER_PHONE = '9123456790';

const seedProviders = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Idempotent: skip if the demo provider already exists.
    const existing = await User.findOne({ phone: DEMO_PHONE });
    if (existing) {
      console.log(`ℹ️  Demo provider already exists (${DEMO_PHONE}). Skipping.`);
      process.exit(0);
    }

    const category = await Category.findOne({ slug: 'general' });
    if (!category) {
      throw new Error('General category missing — run `npm run seed` first.');
    }

    // --- Users -------------------------------------------------------------
    const customer = await User.create({
      name: 'Riya Sharma',
      phone: CUSTOMER_PHONE,
      password: 'Customer@123',
      role: 'customer',
      status: 'active',
    });

    const providerUser = await User.create({
      name: "Kumar's Plumbing Works",
      phone: DEMO_PHONE,
      password: 'Provider@123',
      role: 'provider',
      status: 'active',
      email: 'kumar.plumbing@example.com',
    });

    // --- Provider profile (KYC + banking) ---------------------------------
    const provider = await Provider.create({
      userId: providerUser._id,
      businessName: "Kumar's Plumbing Works",
      category: 'General',
      description:
        'Licensed plumbing and pipe-fitting services with 8+ years of experience across residential and commercial properties.',
      location: { city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
      serviceArea: ['Bengaluru', 'Electronic City', 'Whitefield'],
      pricing: { basePrice: 299, currency: 'INR' },
      experience: 8,
      rating: 4.2,
      reviewCount: 6,
      jobsCompleted: 6,
      completedJobs: 6,
      cancelledJobs: 2,
      verificationStatus: 'pending',
      accountStatus: 'active',
      isVerified: false,
      isAvailable: true,
      responseTime: '~15 min',
      bankDetails: {
        accountHolder: 'Kumar Plumbing',
        accountNumber: '1234567890',
        ifsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        upiId: 'kumar.plumbing@oksbi',
      },
      documents: [
        {
          type: 'id',
          url: 'https://picsum.photos/seed/id/400/300',
          verified: true,
          note: 'Aadhaar verified',
          uploadedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
        },
        {
          type: 'certificate',
          url: 'https://picsum.photos/seed/cert/400/300',
          verified: false,
          note: '',
          uploadedAt: new Date(Date.now() - 18 * 24 * 3600 * 1000),
        },
        {
          type: 'address',
          url: 'https://picsum.photos/seed/addr/400/300',
          verified: false,
          note: 'Awaiting proof of address',
          uploadedAt: new Date(Date.now() - 18 * 24 * 3600 * 1000),
        },
      ],
      earnings: { total: 0, available: 0 },
    });

    // --- Services ----------------------------------------------------------
    const services = await Service.insertMany([
      {
        providerId: provider._id,
        categoryId: category._id,
        name: 'Pipe Leakage Repair',
        description: 'Fix leaking pipes and joints with warranty.',
        price: 499,
        duration: '1-2 hours',
        popular: true,
        bookingsCount: 24,
      },
      {
        providerId: provider._id,
        categoryId: category._id,
        name: 'Tap & Fixture Installation',
        description: 'Install new taps, mixers and fixtures.',
        price: 299,
        duration: '1 hour',
        popular: false,
        bookingsCount: 12,
      },
      {
        providerId: provider._id,
        categoryId: category._id,
        name: 'Drainage Cleaning',
        description: 'High-pressure drain and sewer cleaning.',
        price: 699,
        duration: '2-3 hours',
        popular: false,
        bookingsCount: 8,
      },
    ]);

    console.log('✅ Demo provider + services seeded');
  } catch (error) {
    console.error('❌ Provider seeding failed:', error);
    process.exit(1);
  }
};

seedProviders();
