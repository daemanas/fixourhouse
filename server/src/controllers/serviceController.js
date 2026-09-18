import Service from '../models/Service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get all active services with filters and pagination
// @route   GET /api/v1/services
// @access  Public
export const getServices = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { isActive: true };

  if (req.query.category) filter.categoryId = req.query.category;
  if (req.query.provider) filter.providerId = req.query.provider;
  if (req.query.q) {
    filter.name = { $regex: req.query.q, $options: 'i' };
  }

  const [services, total] = await Promise.all([
    Service.find(filter)
      .sort({ popular: -1, bookingsCount: -1 })
      .skip(skip)
      .limit(limit)
      .populate('providerId', 'businessName rating location')
      .populate('categoryId', 'name slug'),
    Service.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        services,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      'Services fetched successfully'
    )
  );
});

// @desc    Get single service
// @route   GET /api/v1/services/:id
// @access  Public
export const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id)
    .populate('providerId', 'businessName rating location')
    .populate('categoryId', 'name slug');

  if (!service) {
    throw new ApiError(404, 'Service not found');
  }

  res.status(200).json(
    new ApiResponse(200, { service }, 'Service fetched successfully')
  );
});