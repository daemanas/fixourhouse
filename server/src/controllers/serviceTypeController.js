import ServiceType from '../models/ServiceType.js';
import Category from '../models/Category.js';
import Service from '../models/Service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// Helper to make slug
const makeSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// @desc    Get service types (active only for public, all for admin if query admin=true)
// @route   GET /api/v1/service-types
// @access  Public
export const getServiceTypes = asyncHandler(async (req, res) => {
  const filter = req.query.admin === 'true' ? {} : { isActive: true };

  const serviceTypes = await ServiceType.find(filter).sort({ sortOrder: 1, name: 1 });

  res.status(200).json(
    new ApiResponse(200, { serviceTypes }, 'Service types fetched successfully')
  );
});

// @desc    Get single service type
// @route   GET /api/v1/service-types/:id
// @access  Public
export const getServiceTypeById = asyncHandler(async (req, res) => {
  const serviceType = await ServiceType.findById(req.params.id);
  if (!serviceType) {
    throw new ApiError(404, 'Service type not found');
  }

  res.status(200).json(
    new ApiResponse(200, { serviceType }, 'Service type fetched successfully')
  );
});

// @desc    Create service type
// @route   POST /api/v1/admin/service-types
// @access  Private (Admin)
export const createServiceType = asyncHandler(async (req, res) => {
  const { name, description, icon, image, isActive, sortOrder } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Service type name is required');
  }

  const slug = makeSlug(name);
  const existing = await ServiceType.findOne({ $or: [{ name: name.trim() }, { slug }] });
  if (existing) {
    throw new ApiError(400, 'Service type with this name already exists');
  }

  const serviceType = await ServiceType.create({
    name: name.trim(),
    slug,
    description: description ? description.trim() : '',
    icon: icon || '',
    image: image || '',
    isActive: typeof isActive === 'boolean' ? isActive : true,
    sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
  });

  res.status(201).json(
    new ApiResponse(201, { serviceType }, 'Service type created successfully')
  );
});

// @desc    Update service type
// @route   PATCH /api/v1/admin/service-types/:id
// @access  Private (Admin)
export const updateServiceType = asyncHandler(async (req, res) => {
  const { name, description, icon, image, isActive, sortOrder } = req.body;

  const serviceType = await ServiceType.findById(req.params.id);
  if (!serviceType) {
    throw new ApiError(404, 'Service type not found');
  }

  if (name && name.trim() !== serviceType.name) {
    const slug = makeSlug(name);
    const existing = await ServiceType.findOne({
      _id: { $ne: serviceType._id },
      $or: [{ name: name.trim() }, { slug }],
    });
    if (existing) {
      throw new ApiError(400, 'Another service type with this name already exists');
    }
    serviceType.name = name.trim();
    serviceType.slug = slug;
  }

  if (typeof description === 'string') serviceType.description = description.trim();
  if (typeof icon === 'string') serviceType.icon = icon;
  if (typeof image === 'string') serviceType.image = image;
  if (typeof isActive === 'boolean') serviceType.isActive = isActive;
  if (typeof sortOrder === 'number') serviceType.sortOrder = sortOrder;

  await serviceType.save();

  res.status(200).json(
    new ApiResponse(200, { serviceType }, 'Service type updated successfully')
  );
});
