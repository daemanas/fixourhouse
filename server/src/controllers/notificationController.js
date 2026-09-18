import Notification from '../models/Notification.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get current user's notifications
// @route   GET /api/v1/notifications
// @access  Private
export const getMyNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { userId: req.user._id };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read: false }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        unreadCount,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      'Notifications fetched successfully'
    )
  );
});

// @desc    Mark notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { read: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  res.status(200).json(
    new ApiResponse(200, { notification }, 'Notification marked as read')
  );
});

// @desc    Mark all notifications as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, read: false },
    { read: true, readAt: new Date() }
  );

  res.status(200).json(
    new ApiResponse(200, {}, 'All notifications marked as read')
  );
});