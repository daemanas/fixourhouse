import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import AuthOtp from '../models/AuthOtp.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateToken, generateRefreshToken } from '../utils/token.js';
import env from '../config/env.js';
import { OAuth2Client } from 'google-auth-library';
import { sendOtpSms } from '../utils/sendOtpSms.js';
import { generateOtp, hashOtp, isOtpExpired, verifyOtpCode } from '../utils/otp.js';
import { createOtpChallenge, verifyOtpChallenge } from '../services/otpService.js';
import { emailService } from '../services/emailService.js';
const googleClient = new OAuth2Client();

const duplicatePhoneError = () =>
  new ApiError(409, 'An account already exists with this phone number. Please login instead.', [], 'PHONE_ALREADY_EXISTS');
const duplicateEmailError = () =>
  new ApiError(409, 'An account already exists with this email address. Please login instead.', [], 'EMAIL_ALREADY_EXISTS');

const deliverOtp = (channel, identifier, otp) =>
  channel === 'email' ? emailService.sendOtpEmail(identifier, otp) : sendOtpSms(identifier, otp);

const issueSession = async (user, res, statusCode = 200, message = 'OTP verified successfully') => {
  user.lastLogin = new Date();
  user.lastActiveAt = new Date();
  await user.save();
  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  return res.status(statusCode).json(
    new ApiResponse(statusCode, { user: publicUser(user), token, refreshToken }, message),
  );
};

const createProviderProfile = async (user) => {
  if (user.role !== 'provider') return;
  const businessName = `${user.name}'s Services`.slice(0, 50);
  user.name = businessName;
  await user.save();
  await Provider.create({ userId: user._id, businessName, category: 'General' });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  phone: user.phone,
  email: user.email,
  role: user.role,
  status: user.status,
  avatar: user.avatar,
  location: user.location || '',
  locationData: user.locationData || {},
});

export const requestLoginOtp = asyncHandler(async (req, res) => {
  const channel = req.body.email ? 'email' : 'phone';
  const identifier = channel === 'email'
    ? req.body.email.trim().toLowerCase()
    : req.body.phone;
  const user = await User.findOne(channel === 'email' ? { email: identifier } : { phone: identifier });

  if (!user) {
    throw new ApiError(404, `No LocalFix account exists with this ${channel === 'email' ? 'email address' : 'phone number'}. Please sign up.`, [], 'USER_NOT_FOUND');
  }
  if (user.status === 'blocked' || user.status === 'suspended') {
    throw new ApiError(403, 'This account cannot sign in. Please contact support.');
  }
  await createOtpChallenge({
    identifier,
    channel,
    purpose: 'login',
    deliver: (otp) => deliverOtp(channel, identifier, otp),
  });

  res.status(200).json(
    new ApiResponse(200, { otpSent: true, channel }, 'Login code sent successfully.')
  );
});

export const resendLoginOtp = requestLoginOtp;

export const googleAuth = asyncHandler(async (req, res) => {
  if (!env.googleClientId) {
    throw new ApiError(503, 'Google sign-in is not configured. Please use phone sign-in.');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.idToken,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Google sign-in could not verify your account. Please try again.');
  }

  if (!payload?.email || payload.email_verified !== true) {
    throw new ApiError(401, 'A verified Google email address is required.');
  }

  const verifiedEmail = payload.email.toLowerCase();
  let user = await User.findOne({ email: verifiedEmail });
  if (!user && (!req.body.phone || !req.body.role)) {
    return res.status(200).json(new ApiResponse(200, {
      requiresRegistration: true,
      email: verifiedEmail,
      name: payload.name || '',
      avatar: payload.picture || '',
    }, 'Google verified. Complete your LocalFix profile to continue.'));
  }
  if (!user) {
    const { name, phone, role, location, locationData } = req.body;
    if (await User.exists({ phone })) throw duplicatePhoneError();
    try {
      user = await User.create({
        name: (name || payload.name || verifiedEmail.split('@')[0]).slice(0, 50),
        email: verifiedEmail,
        emailVerified: true,
        phone,
        phoneVerified: false,
        password: crypto.randomBytes(32).toString('hex'),
        role,
        location: location || '',
        locationData: locationData || {},
        avatar: payload.picture || '',
      });
    } catch (error) {
      if (error.code === 11000) {
        if (error.keyPattern?.phone || error.keyValue?.phone) throw duplicatePhoneError();
        if (error.keyPattern?.email || error.keyValue?.email) throw duplicateEmailError();
      }
      throw error;
    }
    await createProviderProfile(user);
    return issueSession(user, res, 201, 'Google sign-in successful');
  }
  if (user.status === 'blocked' || user.status === 'suspended') {
    throw new ApiError(403, 'This account cannot sign in. Please contact support.');
  }

  user.emailVerified = true;
  return issueSession(user, res, 200, 'Google sign-in successful');
});

export const register = asyncHandler(async (req, res) => {
  const { name, phone, password, role, location, locationData, channel } = req.body;
  const email = req.body.email?.trim().toLowerCase();
  if (phone && await User.exists({ phone })) throw duplicatePhoneError();
  if (email && await User.exists({ email })) throw duplicateEmailError();

  const identifier = channel === 'email' ? email : phone;
  const pendingRegistration = {
    name,
    phone,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role,
    location: location || '',
    locationData: locationData || {},
  };
  await createOtpChallenge({
    identifier,
    channel,
    purpose: 'registration',
    pendingRegistration,
    deliver: (otp) => deliverOtp(channel, identifier, otp),
  });

  res.status(200).json(new ApiResponse(200, {
    otpSent: true,
    channel,
    identifier,
  }, `Verification code sent to your ${channel === 'email' ? 'email address' : 'phone number'}.`));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, email, otp, purpose = 'registration' } = req.body;

  if (purpose === 'registration' || purpose === 'login') {
    const channel = email ? 'email' : 'phone';
    const identifier = channel === 'email' ? email.trim().toLowerCase() : phone;
    const challenge = await verifyOtpChallenge({ identifier, channel, purpose, otp });
    let user;
    if (purpose === 'registration') {
      const pending = challenge.pendingRegistration;
      if (!pending) throw new ApiError(400, 'Registration session expired. Please register again.', [], 'OTP_EXPIRED');
      try {
        user = new User({
          name: pending.name,
          phone: pending.phone,
          email: pending.email,
          password: pending.passwordHash,
          role: pending.role,
          location: pending.location,
          locationData: pending.locationData,
          phoneVerified: channel === 'phone',
          emailVerified: channel === 'email',
        });
        user.$locals.passwordIsHashed = true;
        await user.save();
      } catch (error) {
        if (error.code === 11000) {
          if (error.keyPattern?.phone || error.keyValue?.phone) throw duplicatePhoneError();
          if (error.keyPattern?.email || error.keyValue?.email) throw duplicateEmailError();
        }
        throw error;
      }
      await createProviderProfile(user);
    } else {
      user = await User.findOne(channel === 'email' ? { email: identifier } : { phone: identifier });
      if (!user) throw new ApiError(400, 'Invalid or expired OTP. Please request a new OTP.');
      if (user.status === 'blocked' || user.status === 'suspended') {
        throw new ApiError(403, 'This account cannot sign in. Please contact support.');
      }
      if (channel === 'email') {
        user.emailVerified = true;
        await user.save();
      }
    }
    return issueSession(user, res, purpose === 'registration' ? 201 : 200,
      purpose === 'registration' ? 'Account created and verified successfully.' : 'OTP verified successfully');
  }

  const user = await User.findOne({ phone });
  if (!user) {
    throw new ApiError(404, 'User not found', [], 'USER_NOT_FOUND');
  }

  if (
    !user.otp?.code
    || !user.otp.expiresAt
    || isOtpExpired(user.otp.expiresAt)
    || (user.otp.purpose && user.otp.purpose !== purpose)
  ) {
    throw new ApiError(400, 'Invalid or expired OTP. Please request a new OTP.');
  }
  if (!verifyOtpCode(otp, user.otp.code)) {
    user.otp.attempts = (user.otp.attempts || 0) + 1;
    if (user.otp.attempts >= 5) {
      user.otp = undefined;
      await user.save();
      throw new ApiError(429, 'Too many incorrect OTP attempts. Request a new code.');
    }
    await user.save();
    throw new ApiError(400, 'Invalid or expired OTP. Please request a new OTP.');
  }

  if (
    purpose !== 'reset-password'
    && (user.status === 'blocked' || user.status === 'suspended')
  ) {
    throw new ApiError(403, 'This account cannot sign in. Please contact support.');
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
  const { phone, email, purpose = 'registration' } = req.body;
  if (purpose === 'reset-password') {
    const user = await User.findOne({ phone });
    if (!user) throw new ApiError(404, 'User not found');
    if (user.otp?.purpose === 'reset-password' && user.otp.resendAvailableAt > new Date()) {
      throw new ApiError(429, 'Please wait before requesting another verification code.');
    }
    const otp = generateOtp();
    const previousOtp = user.otp;
    user.otp = {
      code: hashOtp(otp),
      purpose,
      expiresAt: new Date(Date.now() + env.otpExpiresIn * 1000),
      attempts: 0,
      resendAvailableAt: new Date(Date.now() + 30_000),
    };
    await user.save();
    try {
      await sendOtpSms(user.phone, otp);
    } catch (error) {
      user.otp = previousOtp;
      await user.save();
      throw error;
    }
    return res.status(200).json(new ApiResponse(200, { otpSent: true }, 'OTP resent successfully'));
  }

  const channel = email ? 'email' : 'phone';
  const identifier = channel === 'email' ? email.trim().toLowerCase() : phone;
  const existing = await AuthOtp.findOne({ identifier, channel, purpose }).select('+pendingRegistration');
  if (!existing) {
    throw new ApiError(400, 'Verification session expired. Please start again.', [], 'OTP_EXPIRED');
  }
  if (purpose === 'login') {
    const user = await User.findOne(channel === 'email' ? { email: identifier } : { phone: identifier });
    if (!user) throw new ApiError(404, 'User not found', [], 'USER_NOT_FOUND');
  } else if (channel === 'email' && existing.pendingRegistration?.email?.trim().toLowerCase() !== identifier) {
    throw new ApiError(400, 'Verification session expired. Please start again.', [], 'OTP_EXPIRED');
  }

  await createOtpChallenge({
    identifier,
    channel,
    purpose,
    deliver: (otp) => deliverOtp(channel, identifier, otp),
  });
  const message = channel === 'email'
    ? 'OTP resent to your email.'
    : 'OTP resent to your phone.';
  return res.status(200).json(new ApiResponse(200, { otpSent: true, channel }, message));
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
    throw new ApiError(404, 'User not found', [], 'USER_NOT_FOUND');
  }

  if (user.status === 'blocked' || user.status === 'suspended') {
    throw new ApiError(403, 'This account cannot reset its password. Please contact support.');
  }

  if (user.otp?.purpose === 'reset-password' && user.otp.resendAvailableAt > new Date()) {
    throw new ApiError(429, 'Please wait before requesting another verification code.');
  }
  const otp = generateOtp();
  const previousOtp = user.otp;
  user.otp = {
    code: hashOtp(otp),
    purpose: 'reset-password',
    expiresAt: new Date(Date.now() + env.otpExpiresIn * 1000),
    attempts: 0,
    resendAvailableAt: new Date(Date.now() + 30_000),
  };
  await user.save();
  try {
    await sendOtpSms(user.phone, otp);
  } catch (error) {
    user.otp = previousOtp;
    await user.save();
    throw error;
  }

  res.status(200).json(
    new ApiResponse(200, { otpSent: true }, 'OTP sent to your phone for password reset')
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
