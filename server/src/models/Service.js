import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    duration: String,
    images: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    popular: {
      type: Boolean,
      default: false,
    },
    bookingsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
serviceSchema.index({ providerId: 1 });
serviceSchema.index({ categoryId: 1 });
serviceSchema.index({ isActive: 1 });
serviceSchema.index({ price: 1 });

const Service = mongoose.model('Service', serviceSchema);

export default Service;