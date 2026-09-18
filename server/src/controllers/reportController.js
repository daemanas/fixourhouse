import Report from '../models/Report.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Submit a report (fraud/abuse/copyright/other)
// @route   POST /api/v1/reports
// @access  Private
export const createReport = asyncHandler(async (req, res) => {
  const report = await Report.create({
    reporterId: req.user._id,
    ...req.body,
  });

  res.status(201).json(
    new ApiResponse(201, { report }, 'Report submitted successfully')
  );
});

// @desc    Get own reports
// @route   GET /api/v1/reports/me
// @access  Private
export const getMyReports = asyncHandler(async (req, res) => {
  const reports = await Report.find({ reporterId: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, { reports }, 'Reports fetched successfully')
  );
});