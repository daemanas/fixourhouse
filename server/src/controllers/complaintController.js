import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import Complaint from '../models/Complaint.js';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import { processRefund } from '../utils/refund.js';
import { generateComplaintId } from '../utils/complaintId.js';

// A complaint may only be filed against a booking that has progressed past the
// "pending / cancelled / rejected" stage. We do not allow disputes on bookings
// that were never accepted or were cancelled.
const COMPLAINT_ELIGIBLE_STATUSES = ['accepted', 'working', 'completed'];

// Status values used across the complaint lifecycle (lowercase, matching the model).
const STATUSES = ['open', 'under_review', 'waiting_for_provider', 'resolved', 'rejected'];

// Valid priority enum values (lowercase, matching the model). Used to validate
// incoming filter params so that the UI's default "all" sentinel never produces
// an impossible query (e.g. priority: 'all' matching zero documents).
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * Attach the Payment record (if any) to a complaint object so the admin UI can
 * show refund / payment context. Works whether `booking` is an ObjectId or a
 * populated document.
 */
async function withPayment(complaintObj) {
  const bookingRef = complaintObj.booking;
  const bookingId = bookingRef && bookingRef._id ? bookingRef._id : bookingRef;
  if (bookingId) {
    const payment = await Payment.findOne({ bookingId });
    complaintObj.payment = payment ? payment.toObject() : null;
  } else {
    complaintObj.payment = null;
  }
  return complaintObj;
}

const COMPLAINT_POPULATE = [
  { path: 'customer', select: 'name phone email avatar' },
  {
    path: 'provider',
    select: 'businessName category location userId',
    populate: { path: 'userId', select: 'name phone email avatar' },
  },
  { path: 'service', select: 'name price description' },
  {
    path: 'booking',
    populate: [
      { path: 'customerId', select: 'name phone email avatar' },
      {
        path: 'providerId',
        select: 'businessName category location userId',
        populate: { path: 'userId', select: 'name phone email avatar' },
      },
      { path: 'serviceId', select: 'name price description' },
    ],
  },
  // NOTE: the Complaint schema has no `assignedTo` / `resolvedBy` top-level
  // fields (assignment/decision live under adminDecision.decidedBy, and the
  // resolve timestamp under resolvedAt). Populating non-existent paths throws
  // a StrictPopulateError and 500s the detail endpoint, so they are omitted.
  { path: 'adminDecision.decidedBy', select: 'name' },
];

// ---------------------------------------------------------------------------
// CUSTOMER
// ---------------------------------------------------------------------------

// @desc    Customer files a new complaint
// @route   POST /api/v1/complaints
// @access  Private (Customer)
export const createComplaint = asyncHandler(async (req, res) => {
  const {
    bookingId,
    category,
    description,
    priority,
    requestedResolution,
    requestedResolutionText,
    evidence,
  } = req.body;

  // Customer is taken from the authenticated session — never from the request body.
  const customer = req.user._id;

  // --- Resolve & validate the booking -------------------------------------
  const bookingDoc = await Booking.findById(bookingId);
  if (!bookingDoc) {
    throw new ApiError(404, 'Booking not found.');
  }

  // Never trust the bookingId from the frontend — verify ownership.
  if (String(bookingDoc.customerId) !== String(customer)) {
    throw new ApiError(
      403,
      'You are not authorized to create a complaint for this booking.'
    );
  }

  if (!COMPLAINT_ELIGIBLE_STATUSES.includes(bookingDoc.status)) {
    throw new ApiError(
      400,
      'This booking is not eligible for a complaint. Complaints can only be raised on accepted, in-progress, or completed bookings.'
    );
  }

  // --- Duplicate complaint protection ---------------------------------------
  // A compound unique index on { booking, customer } allows only ONE complaint
  // per booking. Surface a clean 409 (with the existing id) instead of a raw
  // Mongo 11000 duplicate-key error if the index is ever hit.
  const existing = await Complaint.findOne({
    booking: bookingDoc._id,
    customer: customer,
  });
  if (existing) {
    return res.status(409).json(
      new ApiResponse(
        409,
        { complaintId: existing.complaintId },
        'A complaint already exists for this booking.'
      )
    );
  }

  // --- Resolve provider & service from the booking -------------------------
  // Provider / service come from the booking, never from client-supplied ids.
  const providerDoc = await Provider.findById(bookingDoc.providerId);
  if (!providerDoc) {
    throw new ApiError(
      400,
      'No provider is associated with this booking.'
    );
  }

  // Service is taken from the booking. Some bookings may not carry a populated
  // serviceId (e.g. legacy or manually created bookings), so we resolve it
  // best-effort instead of hard-failing the complaint submission.
  const serviceDoc = bookingDoc.serviceId
    ? await Service.findById(bookingDoc.serviceId)
    : null;

  // --- Generate a unique public complaint ID -------------------------------
  const complaintId = await generateComplaintId();

  // --- Normalize requested resolution --------------------------------------
  let resolution = requestedResolution || 'other';
  if (resolution === 'other' && requestedResolutionText) {
    resolution = 'other';
  }

  const complaint = await Complaint.create({
    complaintId,
    customer,
    provider: providerDoc._id,
    booking: bookingDoc._id,
    ...(serviceDoc ? { service: serviceDoc._id } : {}),
    category,
    description,
    priority: priority || 'medium',
    requestedResolution: resolution,
    requestedResolutionText:
      resolution === 'other' ? requestedResolutionText || '' : '',
    evidence: Array.isArray(evidence) ? evidence.slice(0, 5) : [],
    status: 'open',
  });

  // Notify the provider that a complaint was filed against them.
  await Notification.create({
    userId: providerDoc.userId,
    type: 'system',
    title: 'New complaint filed',
    message: `A customer has filed a ${category} complaint${
      bookingDoc ? ` for booking ${bookingDoc.bookingId}` : ''
    }.`,
    data: { complaintId: complaint._id },
  });

  res.status(201).json(
    new ApiResponse(
      201,
      {
        complaintId: complaint.complaintId,
        status: complaint.status,
      },
      'Complaint submitted successfully.'
    )
  );
});


// @desc    Customer lists their own complaints
// @route   GET /api/v1/complaints/my
// @access  Private (Customer)
export const getMyComplaints = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const [complaints, total] = await Promise.all([
    Complaint.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name phone email avatar')
      .populate({
        path: 'provider',
        select: 'businessName category location userId',
        populate: { path: 'userId', select: 'name phone email avatar' },
      })
      .populate('service', 'name price description')
      .populate('booking', 'bookingId status amount'),
    Complaint.countDocuments({ customer: req.user._id }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        complaints,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      'Your complaints fetched successfully'
    )
  );
});

// ---------------------------------------------------------------------------
// PROVIDER
// ---------------------------------------------------------------------------

// @desc    Provider lists complaints filed against them
// @route   GET /api/v1/providers/me/complaints
// @access  Private (Provider)
export const getMyProviderComplaints = asyncHandler(async (req, res) => {
  const providerDoc = await Provider.findOne({ userId: req.user._id });
  if (!providerDoc) throw new ApiError(404, 'Provider profile not found.');

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const [complaints, total] = await Promise.all([
    Complaint.find({ provider: providerDoc._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name phone email avatar')
      .populate('service', 'name price description')
      .populate('booking', 'bookingId status amount'),
    Complaint.countDocuments({ provider: providerDoc._id }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        complaints,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      'Provider complaints fetched successfully'
    )
  );
});

// @desc    Provider responds to a complaint filed against them
// @route   POST /api/v1/providers/me/complaints/:id/respond
// @access  Private (Provider)
export const respondToComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found.');

  const providerDoc = await Provider.findOne({ userId: req.user._id });
  if (!providerDoc || String(complaint.provider) !== String(providerDoc._id)) {
    throw new ApiError(
      403,
      'You can only respond to complaints filed against you.'
    );
  }

  const { message } = req.body;
  if (!message || !message.trim()) {
    throw new ApiError(400, 'A response message is required.');
  }

  complaint.providerResponse = {
    message: message.trim(),
    respondedAt: new Date(),
    attachments: Array.isArray(req.body.attachments)
      ? req.body.attachments.slice(0, 5)
      : [],
  };
  if (complaint.status === 'open') complaint.status = 'under_review';

  await complaint.save();

  // Notify the customer that the provider responded.
  await Notification.create({
    userId: complaint.customer,
    type: 'system',
    title: 'Provider responded to your complaint',
    message:
      'The provider has responded to your complaint. An admin will review it shortly.',
    data: { complaintId: complaint._id },
  });

  const populated = await Complaint.findById(complaint._id)
    .populate('customer', 'name phone email avatar')
    .populate({
      path: 'provider',
      select: 'businessName category location userId',
      populate: { path: 'userId', select: 'name phone email avatar' },
    })
    .populate('service', 'name price description');

  res
    .status(200)
    .json(
      new ApiResponse(200, { complaint: populated }, 'Response recorded successfully')
    );
});

// ---------------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------------

// @desc    Admin lists all complaints (filtered / paginated)
// @route   GET /api/v1/admin/complaints
// @access  Private (Admin)
export const getComplaints = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const status = req.query.status || '';
  const priority = req.query.priority || '';
  const category = req.query.category || '';
  const search = (req.query.search || req.query.q || '').toString().trim();
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const filter = {};
  // Only apply a status filter for a real enum value. The UI sends "all" as a
  // sentinel for "no filter"; applying it would match zero documents.
  if (status && STATUSES.includes(status)) filter.status = status;
  // Same guard for priority — never pass the "all" sentinel through to the query.
  if (priority && PRIORITIES.includes(priority)) filter.priority = priority;
  if (category) filter.category = category;

  if (search) {
    const customerMatches = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    }).distinct('_id');
    const providerUserIds = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    }).distinct('_id');
    const providerIds = await Provider.find({
      $or: [
        { businessName: { $regex: search, $options: 'i' } },
        { userId: { $in: providerUserIds } },
      ],
    }).distinct('_id');
    const bookingIds = await Booking.find({
      bookingId: { $regex: search, $options: 'i' },
    }).distinct('_id');

    filter.$or = [
      { complaintId: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      ...(customerMatches.length ? [{ customer: { $in: customerMatches } }] : []),
      ...(providerIds.length ? [{ provider: { $in: providerIds } }] : []),
      ...(bookingIds.length ? [{ booking: { $in: bookingIds } }] : []),
    ];
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder;

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name phone email avatar')
      .populate({
        path: 'provider',
        select: 'businessName category location userId',
        populate: { path: 'userId', select: 'name phone email avatar' },
      })
      .populate('service', 'name price description')
      .populate({
        path: 'booking',
        select: 'bookingId status amount customerId providerId',
        populate: [
          { path: 'customerId', select: 'name phone email avatar' },
          {
            path: 'providerId',
            select: 'businessName category location userId',
            populate: { path: 'userId', select: 'name phone email avatar' },
          },
        ],
      }),
    Complaint.countDocuments(filter),
  ]);

  const statusAgg = await Complaint.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const counts = {
    all: await Complaint.countDocuments(),
    open: 0,
    under_review: 0,
    waiting_for_provider: 0,
    resolved: 0,
    rejected: 0,
  };
  statusAgg.forEach((s) => {
    if (STATUSES.includes(s._id)) counts[s._id] = s.count;
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        complaints,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        counts,
      },
      'Complaints fetched successfully'
    )
  );
});

// @desc    Admin complaint dashboard statistics
// @route   GET /api/v1/admin/complaints/stats
// @access  Private (Admin)
export const getComplaintStats = asyncHandler(async (req, res) => {
  const agg = await Complaint.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = {
    open: 0,
    under_review: 0,
    waiting_for_provider: 0,
    resolved: 0,
    rejected: 0,
  };
  agg.forEach((s) => {
    if (s._id && s._id in byStatus) byStatus[s._id] = s.count;
  });

  const total = await Complaint.countDocuments();

  const refundAgg = await Complaint.aggregate([
    { $match: { refundStatus: 'completed' } },
    { $group: { _id: null, total: { $sum: '$refundAmount' } } },
  ]);
  const totalRefunded = refundAgg[0]?.total || 0;

  const catAgg = await Complaint.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const byCategory = {};
  catAgg.forEach((c) => {
    byCategory[c._id] = c.count;
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          total,
          open: byStatus.open + byStatus.under_review + byStatus.waiting_for_provider,
          inProgress: byStatus.under_review,
          resolved: byStatus.resolved,
          rejected: byStatus.rejected,
          pendingReview: byStatus.open,
          totalRefunded,
          byStatus,
          byCategory,
        },
      },
      'Complaint stats fetched successfully'
    )
  );
});

// @desc    Admin gets a single complaint with full detail
// @route   GET /api/v1/admin/complaints/:id
// @access  Private (Admin)
export const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id).populate(
    COMPLAINT_POPULATE
  );
  if (!complaint) throw new ApiError(404, 'Complaint not found.');

  const result = await withPayment(complaint.toObject());

  res
    .status(200)
    .json(
      new ApiResponse(200, { complaint: result }, 'Complaint fetched successfully')
    );
});


// @desc    Admin updates a complaint (status, priority, assignment, provider
//          response, decision with optional refund, resolution)
// @route   PATCH /api/v1/admin/complaints/:id
// @access  Private (Admin)
export const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found.');

  const {
    status,
    priority,
    providerResponse,
    adminDecision,
    decision,
    resolution,
    resolutionSummary,
    refundStatus,
    refundAmount,
  } = req.body;

  if (priority) complaint.priority = priority;
  if (resolution !== undefined) complaint.resolution = resolution;

  // Admin can record the provider's response on their behalf.
  if (providerResponse && providerResponse.message != null) {
    complaint.providerResponse = {
      message: providerResponse.message,
      respondedAt: new Date(),
      attachments: Array.isArray(providerResponse.attachments)
        ? providerResponse.attachments.slice(0, 5)
        : [],
    };
    if (complaint.status === 'open') complaint.status = 'under_review';
  }

  // Admin decision + optional refund.
  // The admin UI sends `adminDecision` as free-text, `refundStatus`/`refundAmount`
  // as the refund outcome, and (optionally) an explicit `decision` enum. We map
  // those onto the model's `adminDecision` subdocument (decision must be one of
  // upheld / partial / dismissed) and the document-level refund fields.
  const hasDecisionInput =
    adminDecision !== undefined ||
    decision !== undefined ||
    refundStatus !== undefined ||
    refundAmount !== undefined;

  if (hasDecisionInput) {
    // Derive a valid enum decision when the admin did not send one explicitly.
    let resolvedDecision = decision;
    const normalizedRefundStatus = refundStatus || 'none';
    if (!['upheld', 'partial', 'dismissed'].includes(resolvedDecision)) {
      if (normalizedRefundStatus === 'completed') resolvedDecision = 'upheld';
      else if (normalizedRefundStatus === 'pending') resolvedDecision = 'partial';
      else resolvedDecision = 'dismissed';
    }

    const note =
      typeof adminDecision === 'string'
        ? adminDecision
        : complaint.adminDecision?.note || '';
    const summary =
      resolutionSummary !== undefined
        ? resolutionSummary
        : complaint.adminDecision?.resolutionSummary || '';

    complaint.adminDecision = {
      decision: resolvedDecision,
      resolutionSummary: summary,
      note,
      refundAmount: 0,
      refundProcessed: false,
      decidedAt: new Date(),
      decidedBy: req.user._id,
    };

    const allowedRefund = ['none', 'pending', 'completed', 'failed'];
    const finalRefundStatus = allowedRefund.includes(normalizedRefundStatus)
      ? normalizedRefundStatus
      : 'none';
    const amount = Number(refundAmount || 0);

    if (finalRefundStatus === 'completed') {
      if (!complaint.booking) {
        throw new ApiError(
          400,
          'Cannot issue a refund: this complaint has no linked booking.'
        );
      }
      const refund = await processRefund(complaint.booking, {
        amount: amount > 0 ? amount : undefined,
      });
      complaint.refundAmount = refund.refundAmount;
      complaint.refundStatus = 'completed';
      complaint.adminDecision.refundAmount = refund.refundAmount;
      complaint.adminDecision.refundProcessed = true;
    } else {
      complaint.refundStatus = finalRefundStatus;
      complaint.refundAmount = amount > 0 ? amount : 0;
      complaint.adminDecision.refundAmount = amount > 0 ? amount : 0;
    }
  }

  // Explicit status override (e.g. rejected, or re-open to under_review).
  // Drives the lifecycle; resolution/refund outcome is recorded above.
  if (status && STATUSES.includes(status)) {
    complaint.status = status;
    if (status === 'resolved' || status === 'rejected') {
      complaint.resolvedAt = new Date();
      if (
        status === 'rejected' &&
        (!complaint.adminDecision || !complaint.adminDecision.decision)
      ) {
        complaint.refundStatus = 'none';
        complaint.refundAmount = 0;
      }
    }
  }

  await complaint.save();

  // Notify the customer and the provider about the update.
  const refundNote =
    complaint.refundStatus === 'completed'
      ? ` A refund of ₹${complaint.refundAmount} has been processed.`
      : '';
  const resolutionNote = complaint.resolution
    ? ` Resolution: ${complaint.resolution}`
    : '';

  await Notification.create({
    userId: complaint.customer,
    type: 'system',
    title: `Complaint ${complaint.status}`,
    message: `Your complaint has been ${complaint.status.toLowerCase()}.${resolutionNote}${refundNote}`,
    data: { complaintId: complaint._id },
  });

  const providerDoc = await Provider.findById(complaint.provider);
  if (providerDoc) {
    await Notification.create({
      userId: providerDoc.userId,
      type: 'system',
      title: `Complaint ${complaint.status}`,
      message: `Complaint ${complaint._id} has been ${complaint.status.toLowerCase()}.${
        complaint.adminDecision?.decision
          ? ` Decision: ${complaint.adminDecision.decision}.`
          : ''
      }`,
      data: { complaintId: complaint._id },
    });
  }

  const updated = await Complaint.findById(complaint._id).populate(
    COMPLAINT_POPULATE
  );
  const result = await withPayment(updated.toObject());

  res
    .status(200)
    .json(
      new ApiResponse(200, { complaint: result }, 'Complaint updated successfully')
    );
});

