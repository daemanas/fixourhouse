import mongoose from 'mongoose';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import Review from '../models/Review.js';
import Report from '../models/Report.js';
import Complaint from '../models/Complaint.js';
import Payment from '../models/Payment.js';
import Withdrawal from '../models/Withdrawal.js';
import { buildRevenueReport, buildRevenueCsv } from '../utils/revenueReport.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// Platform fee rate — MUST match bookingController.updateBookingStatus and
// utils/earnings.js. The recorded Payment.commission is the source of truth;
// fall back to booking.commission, then to the configured rate for legacy docs
// that predate Payment records.
const PLATFORM_FEE_RATE = 0.15;

const safeNum = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

// Compute the real platform commission for a booking using the SAME logic as the
// Earnings/Revenue system so the Admin view stays consistent with provider payouts.
const computeCommission = (booking, payment) => {
  const jobAmount = Math.max(0, safeNum(booking.amount));
  const fromPayment = payment && Number.isFinite(Number(payment.commission));
  return Math.max(
    0,
    fromPayment
      ? safeNum(payment.commission)
      : safeNum(booking.commission, Math.round(jobAmount * PLATFORM_FEE_RATE))
  );
};

// Build a normalized payment/refund view from the Payment of record (preferred)
// merged with the embedded booking.payment sub-document.
const buildPaymentInfo = (booking, payment) => {
  if (payment) {
    return {
      method: payment.method || booking.payment?.method || null,
      status: payment.status || booking.payment?.status || 'pending',
      transactionId: payment.transactionId || booking.payment?.transactionId || null,
      amount: payment.amount,
      commission: payment.commission,
      providerAmount: payment.providerAmount,
      paidAt: payment.paidAt || booking.payment?.paidAt || null,
      refundedAt: payment.refundedAt || null,
    };
  }
  return {
    method: booking.payment?.method || null,
    status: booking.payment?.status || 'pending',
    transactionId: booking.payment?.transactionId || null,
    paidAt: booking.payment?.paidAt || null,
  };
};

// @desc    Get dashboard statistics
// @route   GET /api/v1/admin/stats
// @access  Private (Admin)
export const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalProviders,
    totalBookings,
    totalRevenue,
    pendingProviders,
    activeBookings,
    blockedUsers,
    totalReports,
    openComplaints,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Provider.countDocuments(),
    Booking.countDocuments(),
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Provider.countDocuments({ verificationStatus: 'pending' }),
    Booking.countDocuments({ status: { $in: ['pending', 'accepted', 'working'] } }),
    User.countDocuments({ status: { $in: ['blocked', 'suspended'] } }),
    Report.countDocuments({ status: 'pending' }),
    Complaint.countDocuments({ status: { $in: ['open', 'under_review', 'waiting_for_provider'] } }),
  ]);

  // Recent bookings
  const recentBookings = await Booking.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('customerId', 'name')
    .populate('providerId', 'businessName');

  // Revenue by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const revenueByMonth = await Payment.aggregate([
    {
      $match: {
        status: 'paid',
        paidAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
        revenue: { $sum: '$amount' },
        commission: { $sum: '$commission' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Booking status distribution
  const bookingStatusDistribution = await Booking.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Top providers
  const topProviders = await Provider.find()
    .sort({ jobsCompleted: -1 })
    .limit(5)
    .populate('userId', 'name avatar');

  res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          totalUsers,
          totalProviders,
          totalBookings,
          totalRevenue: totalRevenue[0]?.total || 0,
          pendingProviders,
          activeBookings,
          blockedUsers,
          totalReports,
          openComplaints,
        },
        recentBookings,
        revenueByMonth,
        bookingStatusDistribution,
        topProviders,
      },
      'Dashboard statistics fetched successfully'
    )
  );
});

// @desc    Get all users with pagination and filters
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { role: 'customer' };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    filter.$or = [
      { name: { $regex: req.query.q, $options: 'i' } },
      { phone: { $regex: req.query.q, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -otp -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  // Get booking counts for each user
  const userIds = users.map((u) => u._id);
  const bookingCounts = await Booking.aggregate([
    { $match: { customerId: { $in: userIds } } },
    { $group: { _id: '$customerId', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(bookingCounts.map((b) => [b._id.toString(), b.count]));

  const enrichedUsers = users.map((user) => ({
    ...user.toObject(),
    bookingsCount: countMap[user._id.toString()] || 0,
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        users: enrichedUsers,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      'Users fetched successfully'
    )
  );
});

// @desc    Get all providers with pagination and filters
// @route   GET /api/v1/admin/providers
// @access  Private (Admin)
export const getProviders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.verificationStatus) filter.verificationStatus = req.query.verificationStatus;
  if (req.query.category) filter.category = req.query.category;

  // Account status filter — maps to the User.status field
  // We handle this separately after finding matching userIds.
  let userStatusFilter = null;
  if (req.query.accountStatus) {
    userStatusFilter = req.query.accountStatus;
  }

  // Rating filter support: ?rating=1..5 (matches providers whose average rating >= selected star level)
  if (req.query.rating) {
    const rating = parseFloat(req.query.rating);
    if (Number.isFinite(rating)) {
      filter.rating = { $gte: rating, $lt: rating + 1 };
    }
  }

  // Date range filter
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) {
      const end = new Date(req.query.dateTo);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // Search: support searching by name, phone, or email (via User model lookup)
  if (req.query.q) {
    const q = req.query.q.trim();
    // Check if the query looks like a phone number (digits only or starts with +)
    const isPhoneOrEmail = /^[0-9+]/.test(q) || q.includes('@');
    if (isPhoneOrEmail) {
      // Search in User model for matching phone / email, then filter by userId
      const matchingUsers = await User.find({
        role: 'provider',
        $or: [
          { phone: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ],
      }).select('_id');
      const matchingUserIds = matchingUsers.map((u) => u._id);
      filter.userId = { $in: matchingUserIds };
    } else {
      filter.$or = [
        { businessName: { $regex: q, $options: 'i' } },
        { 'location.city': { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
      // Also search by name in User model
      const matchingUsers = await User.find({
        role: 'provider',
        name: { $regex: q, $options: 'i' },
      }).select('_id');
      if (matchingUsers.length > 0) {
        filter.$or.push({ userId: { $in: matchingUsers.map((u) => u._id) } });
      }
    }
  }

  // If accountStatus filter, pre-filter userIds
  if (userStatusFilter) {
    const statusUsers = await User.find({
      role: 'provider',
      status: userStatusFilter,
    }).select('_id');
    const statusUserIds = statusUsers.map((u) => u._id);
    if (filter.userId) {
      // Intersect with existing userId filter
      const existingIds = new Set(filter.userId.$in.map(String));
      filter.userId = { $in: statusUserIds.filter((id) => existingIds.has(String(id))) };
    } else {
      filter.userId = { $in: statusUserIds };
    }
  }

  const [providers, total] = await Promise.all([
    Provider.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name phone email avatar status warnings'),
    Provider.countDocuments(filter),
  ]);

  // Get booking counts and earnings for each provider
  const providerIds = providers.map((p) => p._id);
  const [bookingCounts, earningsAgg] = await Promise.all([
    Booking.aggregate([
      { $match: { providerId: { $in: providerIds } } },
      {
        $group: {
          _id: '$providerId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { providerId: { $in: providerIds }, status: 'paid' } },
      {
        $group: {
          _id: '$providerId',
          totalEarnings: { $sum: '$amount' },
          totalCommission: { $sum: '$commission' },
        },
      },
    ]),
  ]);
  const bookingMap = Object.fromEntries(
    bookingCounts.map((b) => [
      b._id.toString(),
      {
        total: b.total || 0,
        completed: b.completed || 0,
        cancelled: b.cancelled || 0,
        cancellationRate: b.total > 0 ? Number(((b.cancelled / b.total) * 100).toFixed(1)) : 0,
      },
    ])
  );
  const earningsMap = Object.fromEntries(
    earningsAgg.map((e) => [e._id.toString(), { total: e.totalEarnings, commission: e.totalCommission }])
  );

  const enrichedProviders = providers.map((provider) => {
    const bStats = bookingMap[provider._id.toString()] || { total: 0, completed: 0, cancelled: 0, cancellationRate: 0 };
    return {
      ...provider.toObject(),
      bookingsCount: bStats.total,
      completedBookingsCount: bStats.completed,
      cancelledBookingsCount: bStats.cancelled,
      cancellationRate: bStats.cancellationRate,
      totalEarnings: earningsMap[provider._id.toString()]?.total || 0,
    };
  });

  // Rating distribution summary — use the base filter (without the applied rating filter)
  // so filter buttons show counts for the full matching set, not just the current rating slice.
  const distributionFilter = { ...filter };
  delete distributionFilter.rating;
  const distribution = await Provider.aggregate([
    { $match: distributionFilter },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((d) => {
    const star = Math.min(5, Math.max(1, Math.floor(d._id || 0)));
    ratingCounts[star] = d.count;
  });
  const ratingDistribution = {
    1: ratingCounts[1],
    2: ratingCounts[2],
    3: ratingCounts[3],
    4: ratingCounts[4],
    5: ratingCounts[5],
  };

  // Fetch unique categories for the filter dropdown
  const categories = await Provider.distinct('category');

  res.status(200).json(
    new ApiResponse(
      200,
      {
        providers: enrichedProviders,
        ratingDistribution,
        categories,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      'Providers fetched successfully'
    )
  );
});

// @desc    Update provider verification/status
// @route   PATCH /api/v1/admin/providers/:id/status
// @access  Private (Admin)
export const updateProviderStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;

  const provider = await Provider.findById(req.params.id).populate('userId');
  if (!provider) {
    throw new ApiError(404, 'Provider not found');
  }

  const validStatuses = ['approved', 'rejected', 'suspended', 'blocked', 'pending'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }

  provider.verificationStatus = status;
  provider.isVerified = status === 'approved';
  await provider.save();

  // Sync user status for block/suspend
  if (status === 'blocked' || status === 'suspended') {
    provider.userId.status = status;
    await provider.userId.save();
  } else if (status === 'approved' || status === 'pending') {
    provider.userId.status = 'active';
    await provider.userId.save();
  }

  // Send notification
  await Notification.create({
    userId: provider.userId._id,
    type: 'verification',
    title: `Account ${status}`,
    message:
      reason ||
      (status === 'approved'
        ? 'Congratulations! Your provider account has been approved.'
        : `Your provider account status has been updated to ${status}.`),
  });

  res.status(200).json(
    new ApiResponse(200, { provider }, `Provider ${status} successfully`)
  );
});

// @desc    Manage user status (block/unblock/delete/warn)
// @route   PATCH /api/v1/admin/users/:id/status
// @access  Private (Admin)
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { status, warning } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role === 'admin') {
    throw new ApiError(400, 'Cannot modify admin accounts');
  }

  if (warning) {
    user.warnings += 1;
    await Notification.create({
      userId: user._id,
      type: 'warning',
      title: 'Warning issued',
      message: warning,
    });
  }

  if (status && ['active', 'blocked', 'suspended'].includes(status)) {
    user.status = status;

    // Sync provider verification status
    if (user.role === 'provider') {
      await Provider.updateOne(
        { userId: user._id },
        {
          verificationStatus:
            status === 'active' ? 'approved' : status,
          isVerified: status === 'active',
        }
      );
    }

    await Notification.create({
      userId: user._id,
      type: 'system',
      title: `Account ${status}`,
      message: `Your account has been ${status}${warning ? `: ${warning}` : ''}`,
    });
  }

  await user.save();

  res.status(200).json(
    new ApiResponse(200, { user }, 'User status updated successfully')
  );
});

// @desc    Delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role === 'admin') {
    throw new ApiError(400, 'Cannot delete admin accounts');
  }

  await User.findByIdAndDelete(user._id);
  if (user.role === 'provider') {
    await Provider.deleteOne({ userId: user._id });
  }

  res.status(200).json(
    new ApiResponse(200, {}, 'User deleted successfully')
  );
});

// @desc    Get all bookings with filters (status, search, pagination, sorting)
// @route   GET /api/v1/admin/bookings
// @access  Private (Admin)
//
// Booking status enum: pending | accepted | working | completed | cancelled | rejected
// The "Refunded" UI filter maps to the *payment* status 'refunded' (there is no
// 'refunded' booking status in this project), so it is matched against the linked
// Payment document, not the booking status.
export const getBookings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const status = req.query.status || '';
  const search = (req.query.search || req.query.q || '').toString().trim();
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  // Build the booking query.
  const filter = {};
  let bookingIdsByPayment = null; // when filtering by payment (refunded) status

  if (status === 'refunded') {
    // Refunded is a payment state, not a booking state.
    const refundedPayments = await Payment.find({ status: 'refunded' }).select('bookingId');
    bookingIdsByPayment = refundedPayments.map((p) => p.bookingId);
    filter._id = { $in: bookingIdsByPayment };
  } else if (status) {
    filter.status = status;
  }

  // Search across booking ID / customer / provider / service using real data.
  // Implemented on the backend (not client-side) so it stays correct regardless
  // of the currently loaded page.
  if (search) {
    const customerIds = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).distinct('_id');

    const providerUserIds = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).distinct('_id');
    const providerIds = await Provider.find({
      $or: [
        { businessName: { $regex: search, $options: 'i' } },
        { userId: { $in: providerUserIds } },
      ],
    }).distinct('_id');

    const serviceIds = await Service.find({
      name: { $regex: search, $options: 'i' },
    }).distinct('_id');

    const searchClauses = [
      { bookingId: { $regex: search, $options: 'i' } },
      { serviceName: { $regex: search, $options: 'i' } },
      ...(customerIds.length ? [{ customerId: { $in: customerIds } }] : []),
      ...(providerIds.length ? [{ providerId: { $in: providerIds } }] : []),
      ...(serviceIds.length ? [{ serviceId: { $in: serviceIds } }] : []),
    ];

    if (bookingIdsByPayment) {
      // Refunded filter + search text: intersect matched bookings with refund set.
      const refundedSet = new Set(
        bookingIdsByPayment.map((id) => String(id))
      );
      const matchedByText = await Booking.find({ $or: searchClauses }).distinct('_id');
      filter._id = {
        $in: matchedByText.filter((id) => refundedSet.has(String(id))),
      };
    } else {
      filter.$or = searchClauses;
    }
  } else if (bookingIdsByPayment) {
    // Only a refunded filter, no search text — already set filter._id above.
    filter._id = { $in: bookingIdsByPayment };
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name phone email avatar')
      .populate({
        path: 'providerId',
        select: 'businessName category location userId',
        populate: { path: 'userId', select: 'name phone email avatar' },
      })
      .populate('serviceId', 'name price duration description'),
    Booking.countDocuments(filter),
  ]);

  // Collect the Payment records for the loaded page in a single query (no N+1).
  const bookingObjectIds = bookings.map((b) => b._id);
  const payments = bookingObjectIds.length
    ? await Payment.find({ bookingId: { $in: bookingObjectIds } })
    : [];
  const paymentByBooking = new Map(
    payments.map((p) => [String(p.bookingId), p])
  );

  const enriched = bookings.map((b) => {
    const booking = b.toObject();
    const payment = paymentByBooking.get(String(booking._id));
    const paymentInfo = buildPaymentInfo(booking, payment);
    const commission = computeCommission(booking, payment);
    const jobAmount = Math.max(0, safeNum(booking.amount));
    return {
      ...booking,
      customer: booking.customerId || null,
      provider: booking.providerId || null,
      service: booking.serviceId || { name: booking.serviceName } || null,
      payment: paymentInfo,
      commission,
      providerEarnings: Math.max(0, jobAmount - commission),
    };
  });

  // Real status counts across the whole dataset (for the filter chips).
  const bookingStatusAgg = await Booking.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const refundedCount = await Payment.countDocuments({ status: 'refunded' });
  const counts = {
    all: await Booking.countDocuments(),
    pending: 0,
    accepted: 0,
    working: 0,
    completed: 0,
    cancelled: 0,
    refunded: refundedCount,
  };
  bookingStatusAgg.forEach((s) => {
    if (s._id in counts) counts[s._id] = s.count;
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        bookings: enriched,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        counts,
      },
      'Bookings fetched successfully'
    )
  );
});

// @desc    Get a single booking with full detail (customer, provider, service,
//          payment, refund, timeline) for the Admin Booking Management view.
// @route   GET /api/v1/admin/bookings/:bookingId
// @access  Private (Admin)
export const getBookingDetail = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  // Accept either the MongoDB _id or the human-friendly bookingId string.
  const query = mongoose.isValidObjectId(bookingId)
    ? { _id: bookingId }
    : { bookingId };

  const booking = await Booking.findOne(query)
    .populate('customerId', 'name phone email avatar address')
    .populate({
      path: 'providerId',
      select: 'businessName category location description userId',
      populate: { path: 'userId', select: 'name phone email avatar' },
    })
    .populate('serviceId', 'name price duration description categoryId');

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  const bookingObj = booking.toObject();
  const payment = await Payment.findOne({ bookingId: booking._id });
  const paymentInfo = buildPaymentInfo(bookingObj, payment);
  const commission = computeCommission(bookingObj, payment);
  const jobAmount = Math.max(0, safeNum(bookingObj.amount));

  // Service category: prefer the Service's own categoryId link, else provider's
  // main category — the same single source of truth used across admin pages.
  let serviceCategory = booking.providerId?.category || null;
  if (booking.serviceId?.categoryId) {
    await booking.populate('serviceId.categoryId', 'name');
    serviceCategory = booking.serviceId?.categoryId?.name || serviceCategory;
  }

  const detail = {
    ...bookingObj,
    customer: bookingObj.customerId || null,
    provider: bookingObj.providerId || null,
    service: bookingObj.serviceId
      ? { ...bookingObj.serviceId, category: serviceCategory }
      : { name: bookingObj.serviceName, category: serviceCategory },
    payment: paymentInfo,
    commission,
    providerEarnings: Math.max(0, jobAmount - commission),
    timeline: bookingObj.timeline || [],
  };

  res.status(200).json(
    new ApiResponse(200, { booking: detail }, 'Booking fetched successfully')
  );
});

// @desc    Get all reports
// @route   GET /api/v1/admin/reports
// @access  Private (Admin)
export const getReports = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporterId', 'name phone')
      .populate('resolvedBy', 'name'),
    Report.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        reports,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      'Reports fetched successfully'
    )
  );
});

// @desc    Update report status
// @route   PATCH /api/v1/admin/reports/:id/status
// @access  Private (Admin)
export const updateReportStatus = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    {
      status,
      adminNote,
      resolvedBy: req.user._id,
      resolvedAt: status === 'resolved' || status === 'dismissed' ? new Date() : undefined,
    },
    { new: true }
  );

  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  res.status(200).json(
    new ApiResponse(200, { report }, 'Report status updated successfully')
  );
});

// @desc    Get all reviews with filter by rating
// @route   GET /api/v1/admin/reviews
// @access  Private (Admin)
export const getReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.rating) filter.rating = parseInt(req.query.rating);
  if (req.query.flagged === 'true') filter.flagged = true;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name')
      .populate('providerId', 'businessName'),
    Review.countDocuments(filter),
  ]);

  // Rating distribution
  const distribution = await Review.aggregate([
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
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

// @desc    Toggle review visibility / flag
// @route   PATCH /api/v1/admin/reviews/:id
// @access  Private (Admin)
export const updateReview = asyncHandler(async (req, res) => {
  const { isVisible, flagged, flagReason } = req.body;

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    {
      ...(isVisible !== undefined && { isVisible }),
      ...(flagged !== undefined && { flagged, flagReason }),
    },
    { new: true }
  );

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  res.status(200).json(
    new ApiResponse(200, { review }, 'Review updated successfully')
  );
});

// @desc    Get all customers with pagination, search, filters and real aggregates
// @route   GET /api/v1/admin/customers
// @access  Private (Admin)
export const getCustomers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { role: 'customer' };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const q = req.query.q.trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -otp -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  const userIds = users.map((u) => u._id);

  const [bookingAgg, paymentAgg, reviewAgg, complaintAgg] = await Promise.all([
    Booking.aggregate([
      { $match: { customerId: { $in: userIds } } },
      {
        $group: {
          _id: '$customerId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { customerId: { $in: userIds }, status: 'paid' } },
      { $group: { _id: '$customerId', totalSpent: { $sum: '$amount' }, paid: { $sum: 1 } } },
    ]),
    Review.aggregate([
      { $match: { customerId: { $in: userIds } } },
      { $group: { _id: '$customerId', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
    ]),
    Report.aggregate([
      { $match: { reporterId: { $in: userIds } } },
      { $group: { _id: '$reporterId', count: { $sum: 1 } } },
    ]),
  ]);

  const bookingMap = Object.fromEntries(bookingAgg.map((b) => [b._id.toString(), b]));
  const paymentMap = Object.fromEntries(paymentAgg.map((p) => [p._id.toString(), p]));
  const reviewMap = Object.fromEntries(reviewAgg.map((r) => [r._id.toString(), r]));
  const complaintMap = Object.fromEntries(complaintAgg.map((c) => [c._id.toString(), c.count]));

  const customers = users.map((u) => {
    const id = u._id.toString();
    const b = bookingMap[id] || { total: 0, completed: 0 };
    const p = paymentMap[id] || { totalSpent: 0, paid: 0 };
    const r = reviewMap[id] || { count: 0, avgRating: 0 };
    return {
      ...u.toObject(),
      bookingsCount: b.total,
      completedBookings: b.completed,
      totalSpent: p.totalSpent || 0,
      paidBookings: p.paid || 0,
      reviewsCount: r.count,
      avgRatingGiven: r.avgRating ? Number(r.avgRating.toFixed(2)) : 0,
      complaintsFiled: complaintMap[id] || 0,
    };
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        customers,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      'Customers fetched successfully'
    )
  );
});


// @desc    Get revenue analytics for admin (real Booking/Payment data)
// @route   GET /api/v1/admin/revenue
// @access  Private (Admin)
//
// The heavy-lifting aggregation lives in src/utils/revenueReport.js. Refunds are
// modelled as Payment documents with status === 'refunded' (no separate Refund
// model, no 'pending'/'failed' refund states). Money figures use the recorded
// Payment.commission (source of truth) + amount, mirroring utils/earnings.js.
export const getRevenue = asyncHandler(async (req, res) => {
  if (req.query.export === 'csv') {
    const { csv, fname } = await buildRevenueCsv(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    return res.status(200).send(csv);
  }

  const report = await buildRevenueReport(req.query);
  res.status(200).json(
    new ApiResponse(200, report, 'Revenue data fetched successfully')
  );
});

// @desc    Get a full customer profile for admin review (summary, bookings,
//          cancelled bookings, reviews, complaints, refunds, rating aggregation)
// @route   GET /api/v1/admin/customers/:id
// @access  Private (Admin)
export const getCustomerDetail = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.params.id).select(
    '-password -otp -resetPasswordToken -resetPasswordExpires'
  );
  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }
  if (customer.role !== 'customer') {
    throw new ApiError(400, 'User is not a customer');
  }

  const cid = customer._id;

  const [
    bookings,
    reviews,
    complaints,
    refunds,
    paymentAgg,
    bookingStatusAgg,
    ratingAgg,
  ] = await Promise.all([
    Booking.find({ customerId: cid })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('providerId', 'businessName avatar')
      .populate('serviceId', 'name'),
    Review.find({ customerId: cid })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('providerId', 'businessName avatar'),
    Report.find({
      $or: [{ reporterId: cid }, { targetType: 'customer', targetId: cid }],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('reporterId', 'name')
      .populate('resolvedBy', 'name'),
    Payment.find({ customerId: cid, status: 'refunded' })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('providerId', 'businessName')
      .populate('bookingId'),
    Payment.aggregate([
      { $match: { customerId: cid, status: 'paid' } },
      { $group: { _id: null, totalSpent: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { customerId: cid } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Review.aggregate([
      { $match: { customerId: cid } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  const bookingStatusCounts = {
    pending: 0, accepted: 0, working: 0, completed: 0, cancelled: 0, rejected: 0,
  };
  bookingStatusAgg.forEach((b) => {
    if (b._id in bookingStatusCounts) bookingStatusCounts[b._id] = b.count;
  });

  const ratingsGiven = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratingAgg.forEach((r) => {
    if (r._id >= 1 && r._id <= 5) ratingsGiven[r._id] = r.count;
  });

  const totalBookings = bookings.length;
  const completedBookings = bookingStatusCounts.completed;
  const cancelledBookings = bookings.filter(
    (b) => b.status === 'cancelled' || b.status === 'rejected'
  );
  const totalSpent = paymentAgg[0]?.totalSpent || 0;
  const paidBookings = paymentAgg[0]?.count || 0;
  const reviewsCount = reviews.length;
  const avgRatingGiven = reviewsCount
    ? Number((reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviewsCount).toFixed(2))
    : 0;
  const complaintsFiled = complaints.filter(
    (c) => String(c.reporterId?._id || c.reporterId) === String(cid)
  ).length;
  const complaintsAgainst = complaints.length - complaintsFiled;
  const refundsCount = refunds.length;
  const refundedAmount = refunds.reduce((s, p) => s + (p.amount || 0), 0);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        customer,
        stats: {
          totalBookings,
          completedBookings,
          totalSpent,
          paidBookings,
          avgRatingGiven,
          reviewsCount,
          complaintsFiled,
          complaintsAgainst,
          refundsCount,
          refundedAmount,
        },
        bookings,
        cancelledBookings,
        reviews,
        complaints,
        refunds,
        ratingsGiven,
        bookingStatusCounts,
      },
      'Customer detail fetched successfully'
    )
  );
});

// @desc    Manage customer status (block/unblock/warn)
// @route   PATCH /api/v1/admin/customers/:id/status
// @access  Private (Admin)
export const updateCustomerStatus = asyncHandler(async (req, res) => {
  const { status, warning } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'Customer not found');
  }
  if (user.role !== 'customer') {
    throw new ApiError(400, 'User is not a customer');
  }

  if (warning) {
    user.warnings += 1;
    await Notification.create({
      userId: user._id,
      type: 'warning',
      title: 'Warning issued',
      message: warning,
    });
  }

  if (status && ['active', 'blocked', 'suspended'].includes(status)) {
    user.status = status;
    await Notification.create({
      userId: user._id,
      type: 'system',
      title: `Account ${status}`,
      message: `Your account has been ${status}${warning ? `: ${warning}` : ''}`,
    });
  }

  await user.save();

  res.status(200).json(
    new ApiResponse(200, { user }, 'Customer status updated successfully')
  );
});