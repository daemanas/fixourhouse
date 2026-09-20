import crypto from 'crypto';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateToken, generateRefreshToken } from '../utils/token.js';
import env from '../config/env.js';

const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const register = asyncHandler(async (req, res) => {
  const { name, phone, password, role, location, locationData } = req.body;

  const existingUser = await User.findOne({ phone });
  if (existingUser) {
    throw new ApiError(409, 'An account with this phone number already exists');
  }

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const user = await User.create({
    name,
    phone,
    password,
    role,
    location: location || '',
    locationData: locationData || {},
    otp: { code: otp, expiresAt: otpExpiresAt },
  });

  // Create provider profile record for provider registrations. The provider's
  // business name is the single source of truth for the display name, so it is
  // mirrored into User.name (used by the sidebar, header and other identity
  // surfaces) right away — the provider profile page keeps it in sync on edit.
  if (role === 'provider') {
    const businessName = `${name}'s Services`.slice(0, 50);
    user.name = businessName;
    await user.save();
    await Provider.create({
      userId: user._id,
      businessName,
      category: 'General',
    });
  }

  // TODO: Send OTP via SMS gateway (to be integrated later)
  if (env.nodeEnv !== 'production') {
    console.log(`📱 OTP for ${phone}: ${otp}`);
  }

  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
          location: user.location || '',
          locationData: user.locationData || {},
        },
        token,
        refreshToken,
        otpSent: true,
      },
      'Registration successful. Please verify your OTP.'
    )
  );
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp, purpose } = req.body;

  const user = await User.findOne({ phone });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
    throw new ApiError(400, 'No OTP found. Please request a new OTP.');
  }

  if (user.otp.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP has expired. Please request a new OTP.');
  }

  if (user.otp.code !== otp) {
    throw new ApiError(400, 'Invalid OTP. Please try again.');
  }

  user.otp = undefined;

  // Reset-password purpose: issue a short-lived reset token instead of a login JWT
  if (purpose === 'reset-password') {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        { resetToken },
        'OTP verified. Please set a new password.'
      )
    );
  }

  user.lastLogin = new Date();
  user.lastActiveAt = new Date();
  await user.save();

  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
          location: user.location || '',
          locationData: user.locationData || {},
        },
        token,
        refreshToken,
      },
      'OTP verified successfully'
    )
  );
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  user.otp = { code: otp, expiresAt: otpExpiresAt };
  await user.save();

  // TODO: Send OTP via SMS gateway (to be integrated later)
  if (env.nodeEnv !== 'production') {
    console.log(`📱 New OTP for ${phone}: ${otp}`);
  }

  res.status(200).json(
    new ApiResponse(200, { otpSent: true }, 'OTP resent successfully')
  );
});

export const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  const user = await User.findOne({ phone }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid phone number or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid phone number or password');
  }

  if (user.status === 'blocked') {
    throw new ApiError(403, 'Your account has been blocked. Contact support.');
  }

  if (user.status === 'suspended') {
    throw new ApiError(403, 'Your account has been suspended. Contact support.');
  }

  user.lastLogin = new Date();
  user.lastActiveAt = new Date();
  await user.save();

  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
          location: user.location || '',
        },
        token,
        refreshToken,
      },
      'Login successful'
    )
  );
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  // TODO: Send reset token via SMS/email (to be integrated later)
  if (env.nodeEnv !== 'production') {
    console.log(`🔑 Reset token for ${phone}: ${resetToken}`);
  }

  res.status(200).json(
    new ApiResponse(200, {}, 'Password reset link sent successfully')
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, {}, 'Password reset successful. Please login.')
  );
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -otp');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
          location: user.location || '',
          locationData: user.locationData || {},
          createdAt: user.createdAt,
        },
      },
      'User fetched successfully'
    )
  );
});
