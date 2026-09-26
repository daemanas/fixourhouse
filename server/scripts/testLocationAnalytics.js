
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNormalizedLocationAnalyticsData } from '../src/controllers/adminController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/localfix';

async function testBackendLocationAnalytics() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('\n--- Level: State ---');
    const stateData = await getNormalizedLocationAnalyticsData({ level: 'state', period: 'all' });
    console.log(JSON.stringify(stateData, null, 2));

    if (stateData.locations.length > 0) {
      const topState = stateData.locations[0].name;
      console.log(`\n--- Level: District for State: ${topState} ---`);
      const districtData = await getNormalizedLocationAnalyticsData({ level: 'district', state: topState, period: 'all' });
      console.log(JSON.stringify(districtData, null, 2));

      if (districtData.locations.length > 0) {
        const topDistrict = districtData.locations[0].name;
        console.log(`\n--- Level: City for State: ${topState}, District: ${topDistrict} ---`);
        const cityData = await getNormalizedLocationAnalyticsData({ level: 'city', state: topState, district: topDistrict, period: 'all' });
        console.log(JSON.stringify(cityData, null, 2));
      }
    }

    await mongoose.disconnect();
    console.log('\nTest completed successfully');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testBackendLocationAnalytics();
