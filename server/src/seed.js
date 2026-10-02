import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db.js';
import Category from './models/Category.js';

const seed = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Seed sample category
    const generalCat = await Category.findOne({ name: 'General' });
    if (!generalCat) {
      await Category.create([
        { name: 'General', slug: 'general', description: 'General services', icon: '🛠️' },
        { name: 'Plumbing', slug: 'plumbing', description: 'Plumbing services', icon: '🔧' },
        { name: 'Electrical', slug: 'electrical', description: 'Electrical services', icon: '⚡' },
        { name: 'Cleaning', slug: 'cleaning', description: 'Cleaning services', icon: '🧹' },
        { name: 'Repair', slug: 'repair', description: 'Repair services', icon: '🔨' },
        { name: 'Beauty & Salon', slug: 'beauty-salon', description: 'Beauty and salon services', icon: '💇' },
      ]);
      console.log('✅ Categories seeded');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();