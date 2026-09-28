import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
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
    providerAmount: {
      type: Number,
      default: 0,
    },
    method: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'online', 'cash'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    transactionId: String,
    paidAt: Date,
    refundedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ providerId: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;