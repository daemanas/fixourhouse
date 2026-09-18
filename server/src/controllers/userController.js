import User from '../models/User.js';
import Provider from '../models/Provider.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { saveBase64Image } from '../utils/upload.js';

// @desc    Update own profile
// @route   PATCH /api/v1/users/me
// @access  Private
export const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, email, avatar } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (email !== undefined) updateFields.email = email;
  if (avatar !== undefined) {
    // Base64 data URLs are written to disk and stored as a URL (same behaviour
    // as the provider avatar upload); already-resolved URLs pass through.
    updateFields.avatar =
      typeof avatar === 'string' && avatar.startsWith('data:image/')
        ? saveBase64Image(avatar)
        : avatar;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateFields,
    { new: true, runValidators: true }
  ).select('-password -otp');

  res.status(200).json(
    new ApiResponse(200, { user }, 'Profile updated successfully')
  );
});

// @desc    Change password
// @route   PATCH /api/v1/users/me/password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, {}, 'Password changed successfully')
  );
});

// @desc    Get wishlist
// @route   GET /api/v1/users/me/wishlist
// @access  Private
export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'wishlist',
    select: 'businessName category rating reviewCount jobsCompleted location pricing.currency',
  });

  res.status(200).json(
    new ApiResponse(200, { wishlist: user.wishlist || [] }, 'Wishlist fetched successfully')
  );
});

// @desc    Toggle provider in wishlist
// @route   POST /api/v1/users/me/wishlist/:providerId
// @access  Private
export const toggleWishlist = asyncHandler(async (req, res) => {
  const { providerId } = req.params;

  const provider = await Provider.findById(providerId);
  if (!provider) {
    throw new ApiError(404, 'Provider not found');
  }

  const user = await User.findById(req.user._id);
  const index = user.wishlist.indexOf(providerId);

  if (index > -1) {
    user.wishlist.splice(index, 1);
    await user.save();
    return res.status(200).json(
      new ApiResponse(200, { wishlisted: false }, 'Removed from wishlist')
    );
  }

  user.wishlist.push(providerId);
  await user.save();

  res.status(200).json(
    new ApiResponse(200, { wishlisted: true }, 'Added to wishlist')
  );
});