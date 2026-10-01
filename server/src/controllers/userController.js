import mongoose from 'mongoose';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { saveBase64Image } from '../utils/upload.js';

// @desc    Update own profile
// @route   PATCH /api/v1/users/me
// @access  Private
export const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, email, avatar, location, locationData } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (email !== undefined) updateFields.email = email;
  if (location !== undefined) updateFields.location = location;
  if (locationData !== undefined) updateFields.locationData = locationData;
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
    select: 'businessName category rating reviewCount jobsCompleted experience location pricing.currency userId',
    populate: { path: 'userId', select: 'name avatar' },
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

// @desc    Get the authenticated user's exact favorited services
// @route   GET /api/v1/users/me/service-wishlist
// @access  Private
export const getServiceWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'serviceWishlist',
    select: 'name description startingPrice price discountPercentage primaryImage image images rating reviewCount providerId serviceTypeId serviceCategoryId categoryId isActive',
    populate: [
      {
        path: 'providerId',
        select: 'businessName category avatar location rating reviewCount experience userId',
        populate: { path: 'userId', select: 'name avatar' },
      },
      { path: 'serviceTypeId', select: 'name slug' },
      { path: 'serviceCategoryId', select: 'name slug' },
      { path: 'categoryId', select: 'name slug' },
    ],
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const services = (user.serviceWishlist || []).filter(Boolean).map((service) => {
    const serviceData = service.toObject();
    const provider = serviceData.providerId;
    if (provider && typeof provider === 'object') {
      serviceData.providerId = {
        ...provider,
        name: provider.userId?.name || provider.businessName || 'Provider',
        profileImage: provider.userId?.avatar || provider.avatar || '',
      };
    }
    return serviceData;
  });

  res.status(200).json(
    new ApiResponse(200, { wishlist: services }, 'Service wishlist fetched successfully')
  );
});

// @desc    Toggle one exact service in the authenticated user's wishlist
// @route   POST /api/v1/users/me/service-wishlist/:serviceId
// @access  Private
export const toggleServiceWishlist = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  if (!mongoose.isValidObjectId(serviceId)) {
    throw new ApiError(400, 'Invalid service ID');
  }

  const service = await Service.findById(serviceId).select('_id');
  if (!service) {
    throw new ApiError(404, 'Service not found');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const favoriteId = String(service._id);
  const isWishlisted = (user.serviceWishlist || []).some((id) => String(id) === favoriteId);
  if (isWishlisted) {
    await User.updateOne({ _id: user._id }, { $pull: { serviceWishlist: service._id } });
    return res.status(200).json(
      new ApiResponse(200, { wishlisted: false }, 'Service removed from wishlist')
    );
  }

  await User.updateOne({ _id: user._id }, { $addToSet: { serviceWishlist: service._id } });
  res.status(200).json(
    new ApiResponse(200, { wishlisted: true }, 'Service added to wishlist')
  );
});