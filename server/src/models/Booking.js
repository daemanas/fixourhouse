import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    providerServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
    },
    serviceName: String,
    discountPercentage: { type: Number, min: 0, max: 100, default: 0 },
    // Snapshots for historical integrity
    serviceSnapshot: {
      serviceId: mongoose.Schema.Types.ObjectId,
      serviceName: String,
      description: String,
      price: Number,
      discountPercentage: { type: Number, min: 0, max: 100, default: 0 },
      providerServiceId: mongoose.Schema.Types.ObjectId,
      primaryImage: String,
      image: String,
      images: [String],
    },
    customerSnapshot: {
      name: String,
      phone: String,
    },
    bookingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    commission: {
      type: Number,
      default: 0,
    },
    commissionRateApplied: { type: Number, min: 0, max: 100, default: null },
    commissionAmount: { type: Number, min: 0, default: null },
    providerEarning: { type: Number, min: 0, default: null },
    platformCommission: { type: Number, min: 0, default: null },
    commissionRule: { type: String, enum: ['default', 'offer'], default: null },
    commissionOfferId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommissionOffer', default: null },
    commissionOfferName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'working', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
    },
    scheduledDate: Date,
    scheduledTime: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
    },
    notes: String,
    // Payment method selected by the provider when completing the job
    paymentMethod: {
      type: String,
      enum: ['online', 'cash'],
    },
    // Timestamp set when the provider completes the job
    completedAt: Date,
    timeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    payment: {
      method: String,
      status: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
      transactionId: String,
      paidAt: Date,
      refundAmount: { type: Number, min: 0, default: null },
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: String,
    reviewedAt: Date,
    cancelledBy: {
      type: String,
      enum: ['customer', 'provider', 'admin'],
    },
    cancelReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
bookingSchema.index({ customerId: 1 });
bookingSchema.index({ providerId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'payment.status': 1 });
bookingSchema.index({ createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;