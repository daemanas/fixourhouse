import CompletedServicePhoto from '../models/CompletedServicePhoto.js';
import Booking from '../models/Booking.js';
import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { saveBase64Image, saveImageFile } from '../utils/upload.js';

// @desc    Upload completed service photos for a completed booking
// @route   POST /api/v1/completed-photos
// @access  Private (Provider)
export const uploadCompletedServicePhotos = asyncHandler(async (req, res) => {
  const { bookingId, caption } = req.body;

  if (!bookingId) {
    throw new ApiError(400, 'Booking ID is required');
  }

  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (String(booking.providerId) !== String(provider._id)) {
    throw new ApiError(403, 'You are not authorized to add photos for this booking');
  }

  if (booking.status !== 'completed') {
    throw new ApiError(400, 'Completed photos can only be uploaded for completed bookings');
  }

  // Build the array of image URLs from either Multer files or legacy JSON body
  let processedImages = [];

  if (req.files && req.files.length > 0) {
    // Real file uploads via multipart/form-data
    processedImages = req.files.map((file) => saveImageFile(file, 'completed-work'));
  } else {
    // Legacy: array of base64 strings or HTTP URLs in req.body.images.
    const { images } = req.body;
    if (!Array.isArray(images) || images.length < 2) {
      throw new ApiError(400, 'Minimum 2 completed service photos are required.');
    }
    processedImages = images.map((img) => {
      if (typeof img !== 'string' || !img.trim()) {
        throw new ApiError(400, 'Each completed service photo must be a valid image.');
      }
      if (img.startsWith('data:image/')) {
        return saveBase64Image(img, { subDir: 'completed-work' });
      }
      if (/^https?:\/\//i.test(img) || img.startsWith('/uploads/')) {
        return img;
      }
      throw new ApiError(400, 'Each completed service photo must be a valid image URL or data URL.');
    });
  }

  if (processedImages.length < 2) {
    throw new ApiError(400, 'Minimum 2 completed service photos are required.');
  }

  const record = await CompletedServicePhoto.create({
    bookingId: booking._id,
    serviceId: booking.serviceId,
    providerId: provider._id,
    images: processedImages,
    caption: caption ? caption.trim() : '',
  });

  const populated = await CompletedServicePhoto.findById(record._id)
    .populate({
      path: 'providerId',
      select: 'businessName rating location avatar user',
      populate: { path: 'userId', select: 'name avatar' },
    })
    .populate('serviceId', 'name');

  res.status(201).json(
    new ApiResponse(201, { photoRecord: populated }, 'Completed service photos uploaded successfully')
  );
});

// @desc    Get completed service photos for a provider or service
// @route   GET /api/v1/completed-photos
// @access  Public
export const getCompletedServicePhotos = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.serviceId) filter.serviceId = req.query.serviceId;
  if (req.query.providerId) filter.providerId = req.query.providerId;

  const photos = await CompletedServicePhoto.find(filter)
    .populate({
      path: 'providerId',
      select: 'businessName rating location avatar userId',
      populate: { path: 'userId', select: 'name avatar' },
    })
    .populate('serviceId', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, { photos }, 'Completed service photos fetched successfully')
  );
});
