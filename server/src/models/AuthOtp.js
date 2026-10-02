import mongoose from 'mongoose';

const authOtpSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true },
    channel: { type: String, enum: ['phone', 'email'], required: true },
    purpose: { type: String, enum: ['registration', 'login', 'reset-password'], required: true },
    code: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    deleteAt: { type: Date, required: true },
    resendAvailableAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    pendingRegistration: { type: mongoose.Schema.Types.Mixed, select: false },
  },
  { timestamps: true, autoIndex: false },
);

authOtpSchema.index({ identifier: 1, channel: 1, purpose: 1 }, { unique: true });
authOtpSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

const AuthOtp = mongoose.model('AuthOtp', authOtpSchema);

export default AuthOtp;
