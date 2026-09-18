import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema(
  {
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
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    method: {
      type: String,
      enum: ['bank', 'upi', 'wallet'],
      required: true,
    },
    accountDetails: {
      bankName: String,
      accountNumber: String,
      ifsc: String,
      upiId: String,
    },
    transactionId: String,
    processedAt: Date,
    adminNote: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
withdrawalSchema.index({ providerId: 1 });
withdrawalSchema.index({ status: 1 });
withdrawalSchema.index({ createdAt: -1 });

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

export default Withdrawal;