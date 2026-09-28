import Category from '../models/Category.js';
import ServiceType from '../models/ServiceType.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const makeSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// @desc    Get categories (active only for public, filterable by serviceTypeId or admin=true)
// @route   GET /api/v1/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  const filter = req.query.admin === 'true' ? {} : { isActive: true };

  if (req.query.serviceTypeId) {
    filter.serviceTypeId = req.query.serviceTypeId;
  }

  const categories = await Category.find(filter)
    .populate('serviceTypeId', 'name slug')
    .sort({ sortOrder: 1, name: 1 })
    .select('-__v');

  res.status(200).json(
    new ApiResponse(200, { categories }, 'Categories fetched successfully')
  );
});

// @desc    Get single category
// @route   GET /api/v1/categories/:id
// @access  Public
export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate('serviceTypeId', 'name slug');
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  res.status(200).json(
    new ApiResponse(200, { category }, 'Category fetched successfully')
  );
});

// @desc    Create category under a Service Type
// @route   POST /api/v1/admin/categories
// @access  Private (Admin)
export const createCategory = asyncHandler(async (req, res) => {
  const { serviceTypeId, name, description, icon, image, isActive, sortOrder } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Category name is required');
  }
  if (!serviceTypeId) {
    throw new ApiError(400, 'Service Type ID is required');
  }

  const type = await ServiceType.findById(serviceTypeId);
  if (!type) {
    throw new ApiError(404, 'Service Type not found');
  }

  const slug = makeSlug(name);
  const existing = await Category.findOne({ $or: [{ name: name.trim() }, { slug }] });
  if (existing) {
    throw new ApiError(400, 'Category with this name already exists');
  }

  const category = await Category.create({
    serviceTypeId,
    name: name.trim(),
    slug,
    description: description ? description.trim() : '',
    icon: icon || '',
    image: image || '',
    isActive: typeof isActive === 'boolean' ? isActive : true,
    sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
  });

  const populated = await Category.findById(category._id).populate('serviceTypeId', 'name slug');

  res.status(201).json(
    new ApiResponse(201, { category: populated }, 'Category created successfully')
  );
});

// @desc    Update category
// @route   PATCH /api/v1/admin/categories/:id
// @access  Private (Admin)
export const updateCategory = asyncHandler(async (req, res) => {
  const { serviceTypeId, name, description, icon, image, isActive, sortOrder } = req.body;

  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  if (serviceTypeId && String(serviceTypeId) !== String(category.serviceTypeId)) {
    const type = await ServiceType.findById(serviceTypeId);
    if (!type) {
      throw new ApiError(404, 'Service Type not found');
    }
    category.serviceTypeId = serviceTypeId;
  }

  if (name && name.trim() !== category.name) {
    const slug = makeSlug(name);
    const existing = await Category.findOne({
      _id: { $ne: category._id },
      $or: [{ name: name.trim() }, { slug }],
    });
    if (existing) {
      throw new ApiError(400, 'Another category with this name already exists');
    }
    category.name = name.trim();
    category.slug = slug;
  }

  if (typeof description === 'string') category.description = description.trim();
  if (typeof icon === 'string') category.icon = icon;
  if (typeof image === 'string') category.image = image;
  if (typeof isActive === 'boolean') category.isActive = isActive;
  if (typeof sortOrder === 'number') category.sortOrder = sortOrder;

  await category.save();
  const populated = await Category.findById(category._id).populate('serviceTypeId', 'name slug');

  res.status(200).json(
    new ApiResponse(200, { category: populated }, 'Category updated successfully')
  );
});
