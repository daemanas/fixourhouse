// import mongoose from 'mongoose';

// const serviceSchema = new mongoose.Schema(
//   {
//     providerId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Provider',
//       required: true,
//     },
//     serviceTypeId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'ServiceType',
//     },
//     serviceCategoryId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Category',
//     },
//     categoryId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Category',
//     },
//     name: {
//       type: String,
//       required: [true, 'Service name is required'],
//       trim: true,
//       maxlength: [100, 'Service name cannot exceed 100 characters'],
//     },
//     description: {
//       type: String,
//       trim: true,
//       maxlength: [1000, 'Description cannot exceed 1000 characters'],
//     },
//     price: {
//       type: Number,
//       required: [true, 'Price is required'],
//       min: [0, 'Price cannot be negative'],
//     },
//     startingPrice: {
//       type: Number,
//       required: [true, 'Starting price is required'],
//       min: [0, 'Starting price cannot be negative'],
//     },
//     durationMinutes: {
//       type: Number,
//       min: [0, 'Duration cannot be negative'],
//     },
//     discountPercentage: {
//       type: Number,
//       min: [0, 'Discount cannot be negative'],
//       max: [100, 'Discount cannot exceed 100%'],
//       default: 0,
//     },
//     primaryImage: {
//       type: String,
//       default: '',
//     },
//     duration: String,
//     image: String,
//     images: [String],
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//     popular: {
//       type: Boolean,
//       default: false,
//     },
//     bookingsCount: {
//       type: Number,
//       default: 0,
//     },
//     rating: {
//       type: Number,
//       default: 0,
//       min: 0,
//       max: 5,
//     },
//     reviewCount: {
//       type: Number,
//       default: 0,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Indexes
// serviceSchema.index({ providerId: 1 });
// serviceSchema.index({ serviceTypeId: 1 });
// serviceSchema.index({ serviceCategoryId: 1 });
// serviceSchema.index({ categoryId: 1 });
// serviceSchema.index({ isActive: 1 });
// serviceSchema.index({ price: 1 });

// const Service = mongoose.model('Service', serviceSchema);

// export default Service;

import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },

    serviceTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceType',
      default: null,
    },

    serviceCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },

    // Backward compatibility
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
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
      default: '',
    },

    // Main/current price
    startingPrice: {
      type: Number,
      required: [true, 'Starting price is required'],
      min: [0, 'Starting price cannot be negative'],
    },

    // Backward compatibility
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },

    durationMinutes: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
      default: 0,
    },

    // Backward compatibility
    duration: {
      type: String,
      default: '',
    },

    discountPercentage: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
      default: 0,
    },

    primaryImage: {
      type: String,
      default: '',
    },

    // Backward compatibility
    image: {
      type: String,
      default: '',
    },

    images: {
      type: [String],
      default: [],
    },

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
  },
  {
    timestamps: true,
  }
);

// Indexes
serviceSchema.index({ providerId: 1 });
serviceSchema.index({ serviceTypeId: 1 });
serviceSchema.index({ serviceCategoryId: 1 });
serviceSchema.index({ categoryId: 1 });
serviceSchema.index({ isActive: 1 });
serviceSchema.index({ startingPrice: 1 });
serviceSchema.index({ price: 1 });

const Service = mongoose.model('Service', serviceSchema);

export default Service;