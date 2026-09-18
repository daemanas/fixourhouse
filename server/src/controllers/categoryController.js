import Category from '../models/Category.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get all active categories
// @route   GET /api/v1/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ sortOrder: 1 })
    .select('-__v');

  res.status(200).json(
    new ApiResponse(200, { categories }, 'Categories fetched successfully')
  );
});