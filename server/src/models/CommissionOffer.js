import mongoose from 'mongoose';

const commissionOfferSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    durationDays: { type: Number, required: true, min: 1, max: 3650 },
    appliesTo: { type: String, enum: ['newProviders', 'allProviders'], default: 'newProviders' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

commissionOfferSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const CommissionOffer = mongoose.model('CommissionOffer', commissionOfferSchema);

export default CommissionOffer;