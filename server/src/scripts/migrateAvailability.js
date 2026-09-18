import mongoose from 'mongoose';
import env from '../config/env.js';
import Provider from '../models/Provider.js';
import { normalizeAvailability } from '../utils/availability.js';

/**
 * One-off migration: convert legacy single-range availability records
 * ({ days: ['Mon',..], startTime, endTime }) — and documents with no
 * availability at all — into the canonical per-day structure.
 *
 *   npm run migrate:availability
 *
 * The migration is idempotent and safe to run more than once.
 */
const migrateAvailability = async () => {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`[availability-migration] Connected to ${mongoose.connection.host}`);

  const providers = await Provider.find({});
  let migrated = 0;
  let skipped = 0;

  for (const provider of providers) {
    const raw = provider.availability;
    const isLegacy = raw != null && typeof raw === 'object' && Array.isArray(raw.days);
    const hasPerDay = raw != null && raw.monday !== undefined;

    if (isLegacy || !hasPerDay) {
      provider.availability = normalizeAvailability(raw);
      await provider.save();
      migrated += 1;
    } else {
      skipped += 1;
    }
  }

  console.log(
    `[availability-migration] Migrated ${migrated} providers, skipped ${skipped} (already per-day).`
  );
  await mongoose.disconnect();
};

migrateAvailability()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[availability-migration] Failed:', err);
    process.exit(1);
  });