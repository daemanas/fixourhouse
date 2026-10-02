import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (decoded.role === 'admin' || decoded.tokenUse === 'admin') {
      throw new ApiError(403, 'Admin sessions cannot access customer or provider APIs');
    }
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    if (user.status === 'blocked') {
      throw new ApiError(403, 'Your account has been blocked. Contact support.');
    }

    if (user.status === 'suspended') {
      throw new ApiError(403, 'Your account has been suspended. Contact support.');
    }

    req.user = user;

    // Asynchronously update lastActiveAt if not updated in the last 5 minutes
    const now = new Date();
    if (!user.lastActiveAt || now.getTime() - new Date(user.lastActiveAt).getTime() > 5 * 60 * 1000) {
      User.findByIdAndUpdate(user._id, { lastActiveAt: now }).exec().catch(() => {});
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired');
    }
    throw error;
  }
});