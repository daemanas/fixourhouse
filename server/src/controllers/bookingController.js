import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import { resolveProviderCommission } from '../utils/commission.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const generateBookingId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LF-${timestamp}${random}`;
};

const addTimeline = (booking, status, note = '') => {
  booking.timeline.push({ status, timestamp: new Date(), note });
};

// @desc    Create a new booking
// @route   POST /api/v1/bookings
// @access  Private (Customer)
export const createBooking = asyncHandler(async (req, res) => {
  const { providerId, serviceId, scheduledDate, scheduledTime, address, notes, paymentMethod } =
    req.body;

  const provider = await Provider.findById(providerId);
  if (!provider) {
    throw new ApiError(404, 'Provider not found');
  }

  if (!['approved', 'verified'].includes(provider.verificationStatus) && !provider.isVerified) {
    throw new ApiError(400, 'Provider is not verified yet');
  }

  // Services are created by providers as embedded subdocuments on the Provider
  // profile, so resolve the booked service from the provider's services array
  // first. Also fall back to the standalone Service collection for legacy data.
  const providerService = (provider.services || []).find(
    (s) => String(s._id) === String(serviceId)
  );

  let service = providerService || null;
  let serviceName = providerService?.name || '';
  let servicePrice = providerService?.price || 0;

  if (!service && mongoose.isValidObjectId(serviceId)) {
    const serviceDoc = await Service.findById(serviceId);
    if (serviceDoc && serviceDoc.isActive) {
      service = serviceDoc;
      serviceName = serviceDoc.name;
      servicePrice = serviceDoc.price;
    }
  }

  if (!service) {
    throw new ApiError(404, 'Service not found or inactive');
  }

  // Check for booking conflicts - prevent double booking the same time slot
  const conflict = await Booking.findOne({
    providerId,
    scheduledDate: new Date(scheduledDate).toISOString().split('T')[0],
    scheduledTime,
    status: { '': ['pending', 'accepted', 'working'] }
  });
  
  if (conflict) {
    throw new ApiError(409, 'Time slot already booked for this provider');
  }

  const booking = await Booking.create({
    bookingId: generateBookingId(),
    customerId: req.user._id,
    providerId,
    serviceId,
    serviceSnapshot: {
      serviceId,
      serviceName,
      description: service.description,
      price: servicePrice,
    },
    customerSnapshot: {
      name: req.user.name,
      phone: req.user.phone,
    },
    bookingAddress: {
      ...address,
      country: address.country || 'India',
    },
    serviceName,
    amount: servicePrice,
    status: 'pending',
    scheduledDate,
    scheduledTime,
    address,
    notes,
  });

  addTimeline(booking, 'pending', 'Booking request created');
  await booking.save();

  // Create payment record
  await Payment.create({
    bookingId: booking._id,
    customerId: req.user._id,
    providerId,
    amount: servicePrice,
    method: paymentMethod || 'cash',
    status: 'pending',
  });

  // Notify provider
  await Notification.create({
    userId: provider.userId,
    type: 'booking',
    title: 'New booking request',
    message: `You have a new booking request for ${service.name}`,
    data: { bookingId: booking._id },
  });

  res.status(201).json(
    new ApiResponse(201, { booking }, 'Booking created successfully')
  );
});

// @desc    Get bookings for current user (customer or provider)
// @route   GET /api/v1/bookings/me
// @access  Private
export const getMyBookings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.user.role === 'customer') {
    filter.customerId = req.user._id;
  } else if (req.user.role === 'provider') {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      throw new ApiError(404, 'Provider profile not found');
    }
    filter.providerId = provider._id;
  }

  if (req.query.status) filter.status = req.query.status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name phone avatar')
      .populate({
        path: 'providerId',
        select: 'businessName location',
        populate: { path: 'userId', select: 'name phone avatar' },
      })
      .populate('serviceId', 'name price'),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        bookings,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      'Bookings fetched successfully'
    )
  );
});

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('customerId', 'name phone avatar')
    .populate({
      path: 'providerId',
      select: 'businessName location',
      populate: { path: 'userId', select: 'name phone avatar' },
    })
    .populate('serviceId', 'name price');

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  const isCustomer = booking.customerId._id.toString() === req.user._id.toString();
  const provider = await Provider.findOne({ userId: req.user._id });
  const isProvider = provider && booking.providerId._id.toString() === provider._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isCustomer && !isProvider && !isAdmin) {
    throw new ApiError(403, 'You do not have permission to view this booking');
  }

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking fetched successfully')
  );
});

// @desc    Update booking status (accept/reject/working/completed/cancel)
// @route   PATCH /api/v1/bookings/:id/status
// @access  Private
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, reason, bookingId, paymentMethod } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.status === status) {
    return res.status(200).json(
      new ApiResponse(200, { booking }, `Booking is already ${status}`)
    );
  }

  if (req.user.role === 'provider') {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider || booking.providerId.toString() !== provider._id.toString()) {
      throw new ApiError(403, 'You do not have permission to update this booking');
    }

    const providerAllowed = ['accepted', 'rejected', 'working', 'completed'];
    if (!providerAllowed.includes(status)) {
      throw new ApiError(400, `Provider cannot set status to ${status}`);
    }
  } else if (req.user.role === 'customer') {
    if (status !== 'cancelled') {
      throw new ApiError(400, 'Customer can only cancel bookings');
    }
    if (booking.customerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You do not have permission to cancel this booking');
    }
  }

  // Terminal states cannot be changed
  const terminalStates = ['completed', 'cancelled', 'rejected'];
  if (terminalStates.includes(booking.status)) {
    throw new ApiError(400, `Cannot change status of a ${booking.status} booking`);
  }

  const validTransitions = {
    pending: ['accepted', 'rejected', 'cancelled'],
    accepted: ['working', 'cancelled'],
    working: ['completed', 'cancelled'],
  };

  if (!validTransitions[booking.status] || !validTransitions[booking.status].includes(status)) {
    throw new ApiError(400, `Cannot transition from ${booking.status} to ${status}`);
  }

  // SECURITY: Before a job can move to 'working', the requester must enter the
  // exact Booking ID that was given to the customer when the booking was created.
  // This is verified server-side only (never trust frontend validation), and the
  // entered value must exactly match the booking's actual bookingId. On failure
  // the status is left unchanged.
  if (status === 'working') {
    const enteredBookingId = String(bookingId || '').trim();
    const actualBookingId = String(booking.bookingId || '').trim();
    if (!enteredBookingId || enteredBookingId !== actualBookingId) {
      throw new ApiError(
        400,
        'Invalid Booking ID. Please enter the Booking ID provided by the customer.'
      );
    }
  }

  booking.status = status;
  addTimeline(booking, status, reason);

  if (status === 'cancelled') {
    booking.cancelledBy = req.user.role;
    booking.cancelReason = reason;
  }

  if (status === 'completed') {
    // Defense in depth: the validator requires paymentMethod for 'completed',
    // but never trust validation alone — fail closed if it is missing/invalid.
    if (!paymentMethod || !['online', 'cash'].includes(paymentMethod)) {
      throw new ApiError(
        400,
        'Payment method is required to complete this job (online or cash)'
      );
    }

    const provider = await Provider.findById(booking.providerId);
    if (!provider) {
      throw new ApiError(404, 'Provider not found');
    }

    const commissionRule = await resolveProviderCommission(provider);
    let commissionRateApplied = commissionRule.rate;
    let commissionRuleApplied = commissionRule.source;
    let commissionOfferId = commissionRule.offerId;
    let commissionOfferName = commissionRule.offerName;
    let commission = Math.round((booking.amount * commissionRateApplied / 100) * 100) / 100;
    let providerShare = Math.round((booking.amount - commission) * 100) / 100;
    let paidAt = new Date();

    // Multi-document transactions require a MongoDB replica set (or mongos),
    // which the local standalone MongoDB does not provide — so completion is
    // performed as plain sequential writes instead of a session/transaction.
    //
    // To keep completion idempotent (no duplicate updates if the request is
    // retried/double-submitted), the Payment record acts as the atomic gate:
    // the filtered update below can flip only one document from 'pending' to
    // 'paid' exactly once, and only the request that wins that gate applies
    // the (non-idempotent) provider job/earning increments.
    const paymentResult = await Payment.updateOne(
      { bookingId: booking._id, status: 'pending' },
      {
        $set: {
          status: 'paid',
          paidAt,
          providerAmount: providerShare,
          commission,
          commissionRateApplied,
          commissionAmount: commission,
          providerEarning: providerShare,
          platformCommission: commission,
          commissionRule: commissionRuleApplied,
          commissionOfferId,
          commissionOfferName,
        },
      }
    );

    let firstCompletion = paymentResult.matchedCount > 0;

    if (paymentResult.matchedCount === 0) {
      // Legacy bookings may not have a Payment document; create one (as paid)
      // and treat this as the first completion so stats are still recorded.
      const existingPayment = await Payment.findOne({ bookingId: booking._id });
      if (!existingPayment) {
        await Payment.create({
          bookingId: booking._id,
          customerId: booking.customerId,
          providerId: booking.providerId,
          amount: booking.amount,
          method: booking.payment?.method || 'cash',
          status: 'paid',
          paidAt,
          providerAmount: providerShare,
          commission,
          commissionRateApplied,
          commissionAmount: commission,
          providerEarning: providerShare,
          platformCommission: commission,
          commissionRule: commissionRuleApplied,
          commissionOfferId,
          commissionOfferName,
        });
        firstCompletion = true;
      } else {
        paidAt = existingPayment.paidAt || paidAt;
        commission = Number.isFinite(Number(existingPayment.commission)) ? existingPayment.commission : commission;
        providerShare = Number.isFinite(Number(existingPayment.providerAmount))
          ? existingPayment.providerAmount
          : Math.round((booking.amount - commission) * 100) / 100;
        commissionRateApplied = existingPayment.commissionRateApplied ?? commissionRateApplied;
        commissionRuleApplied = existingPayment.commissionRule || commissionRuleApplied;
        commissionOfferId = existingPayment.commissionOfferId || commissionOfferId;
        commissionOfferName = existingPayment.commissionOfferName || commissionOfferName;
      }
    }

    if (firstCompletion) {
      // Total jobs for this provider — used for an accurate completion rate
      const totalJobs = await Booking.countDocuments({ providerId: booking.providerId });

      provider.jobsCompleted += 1;
      // Accurate completion rate: completed / total jobs
      provider.stats.completionRate =
        totalJobs > 0 ? Math.min(100, Math.round((provider.jobsCompleted / totalJobs) * 100)) : 0;
      provider.earnings.total += providerShare;
      provider.earnings.available += providerShare;
      await provider.save();
    }

    // Record how the customer paid and when the job was completed. These are
    // saved atomically with the status update below (single booking.save()).
    booking.paymentMethod = paymentMethod;
    booking.completedAt = paidAt;
    booking.commission = commission;
    booking.commissionRateApplied = commissionRateApplied;
    booking.commissionAmount = commission;
    booking.providerEarning = providerShare;
    booking.platformCommission = commission;
    booking.commissionRule = commissionRuleApplied;
    booking.commissionOfferId = commissionOfferId;
    booking.commissionOfferName = commissionOfferName;
    booking.payment = booking.payment || {};
    booking.payment.method = paymentMethod;
    booking.payment.status = 'paid';
    booking.payment.paidAt = paidAt;
    await booking.save();
  } else {
    await booking.save();
  }

  // Notify recipient(s) of the status update
  const recipientUserIds = [];
  if (req.user.role === 'provider') {
    if (booking.customerId) recipientUserIds.push(booking.customerId);
  } else if (req.user.role === 'customer') {
    const provDoc = await Provider.findById(booking.providerId);
    if (provDoc?.userId) recipientUserIds.push(provDoc.userId);
  } else if (req.user.role === 'admin') {
    if (booking.customerId) recipientUserIds.push(booking.customerId);
    const provDoc = await Provider.findById(booking.providerId);
    if (provDoc?.userId) recipientUserIds.push(provDoc.userId);
  }

  const statusTitleMap = {
    accepted: 'Booking Accepted',
    rejected: 'Booking Rejected',
    working: 'Booking In Progress',
    completed: 'Booking Completed',
    cancelled: 'Booking Cancelled',
  };
  const notificationTitle = statusTitleMap[status] || `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`;

  for (const userId of recipientUserIds) {
    await Notification.create({
      userId,
      type: 'booking',
      title: notificationTitle,
      message: `Your booking ${booking.bookingId} has been ${status}`,
      data: { bookingId: booking._id },
    });
  }

  res.status(200).json(
    new ApiResponse(200, { booking }, `Booking ${status} successfully`)
  );
});