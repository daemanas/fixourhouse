import mongoose from 'mongoose';

const commissionSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'commission', unique: true, immutable: true },
    defaultRate: { type: Number, default: 15, min: 0, max: 100 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const CommissionSettings = mongoose.model('CommissionSettings', commissionSettingsSchema);

export default CommissionSettings;