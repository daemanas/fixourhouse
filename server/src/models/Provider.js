import mongoose from 'mongoose';
import { emptyAvailability } from '../utils/availability.js';

// Per-day availability definition (canonical single source of truth; see also
// server/src/utils/availability.js for normalization helpers).
//
// Each day supports MULTIPLE start/end time ranges stored under `slots`:
//   { enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, ...] }
// The legacy single-range fields (startTime/endTime) are retained on the schema
// only so old documents keep validating on load; they are migrated into `slots`
// by normalizeAvailability and never written on new saves.
const timeSlotSchema = new mongoose.Schema(
  {
    startTime: { type: String, trim: true, default: '' },
    endTime: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const dayAvailabilitySchema = {
  enabled: { type: Boolean, default: false },
  slots: { type: [timeSlotSchema], default: [] },
  startTime: { type: String, trim: true, default: '' },
  endTime: { type: String, trim: true, default: '' },
};

// Per-provider app settings (preferences, notifications, appearance, privacy and
// payout configuration). Kept as a single nested document so it can be read and
// written as a unit via the dedicated /providers/me/settings endpoints.
// NOTE: the `payment` sub-document holds sensitive financial data (bank account
// number, IFSC, UPI id). It is stored on the provider's own private record and is
// explicitly excluded from every public provider query (see providerController).
const settingsSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      enum: ['English', 'Bengali', 'Hindi'],
      default: 'English',
    },
    currency: {
      type: String,
      enum: ['INR (₹)', 'USD ($)', 'EUR (€)'],
      default: 'INR (₹)',
    },
    notifications: {
      newBookings: { type: Boolean, default: true },
      bookingUpdates: { type: Boolean, default: true },
      paymentAlerts: { type: Boolean, default: true },
      newReviews: { type: Boolean, default: true },
      jobCompletion: { type: Boolean, default: true },
      withdrawalStatus: { type: Boolean, default: true },
      availabilityReminders: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
    },
    appearance: {
      // 'system' resolves to the OS preference at render time on the client.
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'public',
      },
      showPhone: { type: Boolean, default: true },
      showEmail: { type: Boolean, default: false },
      showServiceArea: { type: Boolean, default: true },
      allowCustomerContact: { type: Boolean, default: true },
      publicReviews: { type: Boolean, default: true },
    },
    payment: {
      payoutMethod: {
        type: String,
        enum: ['bank', 'upi'],
        default: 'bank',
      },
      accountHolderName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      upiId: { type: String, default: '' },
      payoutSchedule: {
        type: String,
        enum: ['manual', 'weekly', 'monthly'],
        default: 'manual',
      },
    },
  },
  { _id: false }
);

const serviceAreaSchema = new mongoose.Schema(
  {
    country: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, required: true },
    city: { type: String, trim: true, default: '' },
    area: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    coversDistrict: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const providerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    location: {
      address: String,
      country: String,
      state: String,
      district: String,
      city: String,
      pincode: String,
      countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
      stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
      districtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
      cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    serviceArea: {
      type: [String],
      default: [],
    },
    serviceAreas: {
      type: [serviceAreaSchema],
      default: [],
    },
    serviceRadius: {
      type: Number,
      default: 15,
    },
    experience: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    jobsCompleted: {
      type: Number,
      default: 0,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'verified', 'rejected', 'suspended', 'blocked'],
      default: 'pending',
    },
    documents: [
      {
        type: { type: String, enum: ['id', 'certificate', 'address', 'other'] },
        url: String,
        verified: { type: Boolean, default: false },
        // Admin reviewer note (e.g. rejection reason). Not exposed publicly.
        note: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    gallery: [String],
    services: [
      {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        startingPrice: { type: Number, required: true, min: 0, default: 0 },
        price: { type: Number, required: true, min: 0, default: 0 },
        durationMinutes: { type: Number, default: 0, min: 0 },
        duration: { type: String, default: '' },
        discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        reviewCount: { type: Number, default: 0 },
        serviceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType', default: null },
        serviceCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
        primaryImage: { type: String, default: '' },
        image: { type: String, default: '' },
        images: { type: [String], default: [] },
        popular: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        // Creation/modification timestamps so every service (including those
        // added via the provider's "My Services" CRUD) carries a real
        // creation date. Embedded subdocs created BEFORE this field existed
        // have no value (null), which the admin UI correctly shows as
        // "Not available" rather than fabricating a date.
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },
      },
    ],
    availability: {
      type: new mongoose.Schema(
        {
          monday: dayAvailabilitySchema,
          tuesday: dayAvailabilitySchema,
          wednesday: dayAvailabilitySchema,
          thursday: dayAvailabilitySchema,
          friday: dayAvailabilitySchema,
          saturday: dayAvailabilitySchema,
          sunday: dayAvailabilitySchema,
        },
        { _id: false }
      ),
      default: emptyAvailability,
    },
    pricing: {
      hourlyRate: Number,
      basePrice: Number,
      currency: { type: String, default: 'INR' },
    },
    stats: {
      responseTime: String,
      completionRate: { type: Number, default: 0 },
      onTime: { type: Number, default: 0 },
    },
    earnings: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // App-level settings (preferences, notifications, appearance, privacy, payout).
    settings: {
      type: settingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
providerSchema.index({ userId: 1 });
providerSchema.index({ category: 1 });
providerSchema.index({ 'location.city': 1 });
providerSchema.index({ serviceArea: 1 });
providerSchema.index({ 'serviceAreas.district': 1 });
providerSchema.index({ 'location.coordinates': '2dsphere' });
providerSchema.index({ verificationStatus: 1 });
providerSchema.index({ rating: -1 });

const Provider = mongoose.model('Provider', providerSchema);

export default Provider;