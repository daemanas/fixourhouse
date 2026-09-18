import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['provider', 'customer', 'review', 'booking'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: ['fraud', 'abuse', 'copyright', 'other'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending',
    },
    adminNote: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
reportSchema.index({ reporterId: 1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ type: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;