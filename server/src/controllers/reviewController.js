import Booking from '../models/Booking.js';
import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import Review from '../models/Review.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Create a review for a completed booking
// @route   POST /api/v1/reviews
// @access  Private (Customer)
export const createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;

  // Validate rating is 1-5
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new ApiError(400, 'Rating must be an integer between 1 and 5');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.customerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only review your own bookings');
  }

  if (booking.status !== 'completed') {
    throw new ApiError(400, 'You can only review completed bookings');
  }
  if (!booking.providerId || !booking.serviceId) {
    throw new ApiError(400, 'This booking does not have a selected provider and service');
  }

  const existingReview = await Review.findOne({ bookingId });
  if (existingReview) {
    throw new ApiError(409, 'You have already reviewed this booking');
  }

  const review = await Review.create({
    bookingId,
    customerId: req.user._id,
    providerId: booking.providerId,
    serviceId: booking.serviceId,
    rating: numericRating,
    comment,
  });

  // Update booking with review
  booking.rating = numericRating;
  booking.review = comment;
  booking.reviewedAt = new Date();
  await booking.save();

  const [providerBookingIds, serviceBookingIds] = await Promise.all([
    Booking.distinct('_id', { providerId: booking.providerId, status: 'completed' }),
    Booking.distinct('_id', { serviceId: booking.serviceId, status: 'completed' }),
  ]);
  const [providerStats, serviceStats] = await Promise.all([
    Review.aggregate([
      { $match: { bookingId: { $in: providerBookingIds }, isVisible: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    Review.aggregate([
      { $match: { bookingId: { $in: serviceBookingIds }, isVisible: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  const [provider, service] = await Promise.all([
    Provider.findById(booking.providerId),
    Service.findById(booking.serviceId),
  ]);
  if (provider) {
    provider.rating = providerStats.length ? Number(providerStats[0].avgRating.toFixed(1)) : 0;
    provider.reviewCount = providerStats[0]?.count || 0;
    if (!service) {
      const embeddedService = provider.services.id(booking.serviceId);
      if (embeddedService) {
        embeddedService.rating = serviceStats.length ? Number(serviceStats[0].avgRating.toFixed(1)) : 0;
        embeddedService.reviewCount = serviceStats[0]?.count || 0;
      }
    }
    await provider.save();
  }
  if (service) {
    service.rating = serviceStats.length ? Number(serviceStats[0].avgRating.toFixed(1)) : 0;
    service.reviewCount = serviceStats[0]?.count || 0;
    await service.save();
  }

  res.status(201).json(
    new ApiResponse(201, { review }, 'Review submitted successfully')
  );
});

// @desc    Get reviews for a provider
// @route   GET /api/v1/reviews/provider/:providerId
// @access  Public
export const getProviderReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const completedBookingIds = await Booking.distinct('_id', {
    providerId: req.params.providerId,
    status: 'completed',
  });
  const filter = {
    providerId: req.params.providerId,
    bookingId: { $in: completedBookingIds },
    isVisible: true,
  };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name avatar')
      .populate('serviceId', 'name'),
    Review.countDocuments(filter),
  ]);

  // Rating distribution
  const distribution = await Review.aggregate([
    { $match: filter },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);

  const ratingDistribution = {
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0,
  };
  distribution.forEach((d) => {
    ratingDistribution[d._id] = d.count;
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        reviews,
        ratingDistribution,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      'Reviews fetched successfully'
    )
  );
});

// @desc    Get reviews for the authenticated provider (own reviews only, with
//          rating summary). The provider is derived from the authenticated user
//          (JWT) — a providerId sent by the client is never trusted.
// @route   GET /api/v1/reviews/me
// @access  Private (Provider)
export const getMyProviderReviews = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 100, 100);
  const skip = (page - 1) * limit;

  // Only visible reviews that belong to THIS provider AND are linked to a
  // completed booking are shown to the provider.
  const baseMatch = { providerId: provider._id, isVisible: true };

  const bookingLookup = {
    $lookup: {
      from: 'bookings',
      localField: 'bookingId',
      foreignField: '_id',
      as: 'booking',
    },
  };
  const unwindBooking = { $unwind: { path: '$booking', preserveNullAndEmptyArrays: false } };
  const completedOnly = { $match: { 'booking.status': 'completed' } };

  const [reviews, totalAgg] = await Promise.all([
    Review.aggregate([
      { $match: baseMatch },
      bookingLookup,
      unwindBooking,
      completedOnly,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Customer profile (name + avatar) for the review author
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      // Service name — from the booking's stored serviceName, falling back to
      // the Service collection for legacy bookings.
      {
        $lookup: {
          from: 'services',
          localField: 'booking.serviceId',
          foreignField: '_id',
          as: 'serviceDoc',
        },
      },
      {
        $project: {
          _id: 1,
          rating: 1,
          comment: 1,
          createdAt: 1,
          isVisible: 1,
          flagged: 1,
          bookingId: 1,
          customer: {
            _id: '$customer._id',
            name: '$customer.name',
            avatar: '$customer.avatar',
          },
          service: {
            _id: '$booking.serviceId',
            name: {
              $cond: [
                { $ne: [{ $ifNull: ['$booking.serviceName', ''] }, ''] },
                '$booking.serviceName',
                { $ifNull: [{ $arrayElemAt: ['$serviceDoc.name', 0] }, ''] },
              ],
            },
          },
        },
      },
    ]),
    Review.aggregate([
      { $match: baseMatch },
      bookingLookup,
      unwindBooking,
      completedOnly,
      { $count: 'total' },
    ]),
  ]);

  const totalReviews = totalAgg[0]?.total || 0;

  // Rating distribution + average computed from the same visible/completed
  // subset so the summary always matches the reviews being shown.
  const ratingStats = await Review.aggregate([
    { $match: baseMatch },
    bookingLookup,
    unwindBooking,
    completedOnly,
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);

  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingSum = 0;
  ratingStats.forEach((d) => {
    if (Object.prototype.hasOwnProperty.call(ratingDistribution, d._id)) {
      ratingDistribution[d._id] = d.count;
    }
    ratingSum += d._id * d.count;
  });

  const averageRating =
    totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : 0;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        averageRating,
        totalReviews,
        ratingDistribution,
        reviews,
        pagination: { page, limit, total: totalReviews, pages: Math.ceil(totalReviews / limit) },
      },
      'Reviews fetched successfully'
    )
  );
});