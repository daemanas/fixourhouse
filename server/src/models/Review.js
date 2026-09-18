import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    flagged: {
      type: Boolean,
      default: false,
    },
    flagReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
reviewSchema.index({ providerId: 1 });
reviewSchema.index({ customerId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isVisible: 1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;