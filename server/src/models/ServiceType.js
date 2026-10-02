import mongoose from 'mongoose';

const serviceTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service type name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

serviceTypeSchema.index({ isActive: 1 });

const ServiceType = mongoose.model('ServiceType', serviceTypeSchema);

export default ServiceType;
