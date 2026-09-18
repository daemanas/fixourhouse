import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['booking', 'payment', 'review', 'system', 'warning', 'verification', 'complaint'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: String,
    data: {
      type: mongoose.Schema.Types.Mixed,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;