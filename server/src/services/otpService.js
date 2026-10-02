import AuthOtp from '../models/AuthOtp.js';
import ApiError from '../utils/ApiError.js';
import { generateOtp, hashOtp, isOtpExpired, verifyOtpCode } from '../utils/otp.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export async function createOtpChallenge({
  identifier,
  channel,
  purpose,
  pendingRegistration,
  deliver,
}) {
  const now = new Date();
  const existing = await AuthOtp.findOne({ identifier, channel, purpose }).select('+code +pendingRegistration');
  if (existing && existing.resendAvailableAt > now && !isOtpExpired(existing.expiresAt)) {
    throw new ApiError(429, 'Please wait before requesting another verification code.', [], 'OTP_RESEND_COOLDOWN');
  }

  const otp = generateOtp();
  const previous = existing
    ? {
      code: existing.code,
      expiresAt: existing.expiresAt,
      resendAvailableAt: existing.resendAvailableAt,
      attempts: existing.attempts,
      pendingRegistration: existing.pendingRegistration,
    }
    : null;
  const challenge = existing || new AuthOtp({ identifier, channel, purpose });
  challenge.code = hashOtp(otp);
  challenge.expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  challenge.deleteAt = new Date(now.getTime() + 60 * 60 * 1000);
  challenge.resendAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);
  challenge.attempts = 0;
  if (pendingRegistration !== undefined) challenge.pendingRegistration = pendingRegistration;
  try {
    await challenge.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(429, 'Please wait before requesting another verification code.', [], 'OTP_RESEND_COOLDOWN');
    }
    throw error;
  }

  try {
    await deliver(otp);
  } catch (error) {
    if (previous) {
      Object.assign(challenge, previous);
      await challenge.save();
    } else {
      await AuthOtp.deleteOne({ _id: challenge._id });
    }
    throw error;
  }

  return { identifier, channel, purpose, expiresAt: challenge.expiresAt };
}

export async function verifyOtpChallenge({ identifier, channel, purpose, otp }) {
  const challenge = await AuthOtp.findOne({ identifier, channel, purpose })
    .select('+code +pendingRegistration');
  if (!challenge) {
    throw new ApiError(400, 'Invalid OTP. Please request a new OTP.', [], 'OTP_INVALID');
  }
  if (isOtpExpired(challenge.expiresAt)) {
    await AuthOtp.deleteOne({ _id: challenge._id });
    throw new ApiError(400, 'OTP expired. Please request a new OTP.', [], 'OTP_EXPIRED');
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await AuthOtp.deleteOne({ _id: challenge._id });
    throw new ApiError(429, 'Too many incorrect OTP attempts. Request a new code.', [], 'OTP_TOO_MANY_ATTEMPTS');
  }
  if (!verifyOtpCode(otp, challenge.code)) {
    const updated = await AuthOtp.findOneAndUpdate(
      { _id: challenge._id, attempts: { $lt: OTP_MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (!updated || updated.attempts >= OTP_MAX_ATTEMPTS) {
      await AuthOtp.deleteOne({ _id: challenge._id });
      throw new ApiError(429, 'Too many incorrect OTP attempts. Request a new code.', [], 'OTP_TOO_MANY_ATTEMPTS');
    }
    throw new ApiError(400, 'Invalid OTP. Please request a new OTP.', [], 'OTP_INVALID');
  }

  const consumed = await AuthOtp.findOneAndDelete({ _id: challenge._id });
  if (!consumed) {
    throw new ApiError(400, 'Invalid OTP. Please request a new OTP.', [], 'OTP_INVALID');
  }
  return {
    identifier: consumed.identifier,
    channel: consumed.channel,
    purpose: consumed.purpose,
    pendingRegistration: challenge.pendingRegistration,
  };
}
