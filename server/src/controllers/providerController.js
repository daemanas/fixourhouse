import Provider from '../models/Provider.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import Review from '../models/Review.js';
import Payment from '../models/Payment.js';
import Withdrawal from '../models/Withdrawal.js';
import Report from '../models/Report.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { saveBase64Image } from '../utils/upload.js';
import {
  computeProviderEarnings,
  safePercentageChange,
} from '../utils/earnings.js';
import {
  DAY_KEYS,
  DAY_LABELS,
  normalizeAvailability,
  normalizeSlots,
} from '../utils/availability.js';

// Display-name source of truth: the provider's businessName is mirrored into
// User.name so every identity surface (navbar, sidebar, dashboards) stays in
// sync. User.name is capped at 50 characters, so longer business names are
// trimmed for the mirror — the Provider record keeps the full businessName.
const USER_NAME_MAX_LENGTH = 50;
const toUserName = (businessName) =>
  businessName ? String(businessName).trim().slice(0, USER_NAME_MAX_LENGTH) : undefined;

// @desc    Get all active providers with filters and pagination
// @route   GET /api/v1/providers
// @access  Public
export const getProviders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { verificationStatus: 'approved' };

  if (req.query.category) filter.category = req.query.category;
  if (req.query.city) filter['location.city'] = req.query.city;
  if (req.query.minRating) filter.rating = { $gte: parseFloat(req.query.minRating) };
  if (req.query.q) {
    filter.$or = [
      { businessName: { $regex: req.query.q, $options: 'i' } },
      { description: { $regex: req.query.q, $options: 'i' } },
    ];
  }

  const sort = {};
  if (req.query.sort === 'rating') sort.rating = -1;
  else if (req.query.sort === 'jobs') sort.jobsCompleted = -1;
  else if (req.query.sort === 'price') sort['pricing.basePrice'] = 1;
  else sort.createdAt = -1;

  const [providers, total] = await Promise.all([
    Provider.find(filter)
      .select('-documents -earnings -settings')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name avatar'),
    Provider.countDocuments(filter),
  ]);

  // Availability is always served in the canonical per-day structure.
  providers.forEach((provider) => {
    provider.availability = normalizeAvailability(provider.availability);
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        providers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Providers fetched successfully'
    )
  );
});

// @desc    Get single provider by ID
// @route   GET /api/v1/providers/:id
// @access  Public
export const getProviderById = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(req.params.id)
    .select('-documents -earnings -isVerified -settings')
    .populate('userId', 'name avatar');

  if (!provider) {
    throw new ApiError(404, 'Provider not found');
  }

  // Unapproved/suspended/blocked providers must not appear publicly
  if (provider.verificationStatus !== 'approved') {
    throw new ApiError(404, 'Provider not found');
  }

  // Availability is always served in the canonical per-day structure.
  provider.availability = normalizeAvailability(provider.availability);

  res.status(200).json(
    new ApiResponse(200, { provider }, 'Provider fetched successfully')
  );
});

// @desc    Create provider profile (apply to become a provider)
// @route   POST /api/v1/providers
// @access  Private
export const createProvider = asyncHandler(async (req, res) => {
  const existing = await Provider.findOne({ userId: req.user._id });
  if (existing) {
    throw new ApiError(409, 'Provider profile already exists');
  }

  const provider = await Provider.create({
    userId: req.user._id,
    ...req.body,
  });

  res.status(201).json(
    new ApiResponse(201, { provider }, 'Provider profile created. Pending verification.')
  );
});

// @desc    Get own provider profile
// @route   GET /api/v1/providers/me/profile
// @access  Private
export const getMyProviderProfile = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id }).populate(
    'userId',
    'name phone email avatar'
  );

  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  // Availability is always served in the canonical per-day structure.
  provider.availability = normalizeAvailability(provider.availability);

  res.status(200).json(
    new ApiResponse(200, { provider }, 'Provider profile fetched successfully')
  );
});

// @desc    Get own provider settings
// @route   GET /api/v1/providers/me/settings
// @access  Private (Provider)
export const getProviderSettings = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id }).select('settings');
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  // Return the stored settings (Mongoose applies schema defaults when empty).
  res.status(200).json(
    new ApiResponse(200, { settings: provider.settings }, 'Settings fetched successfully')
  );
});

// @desc    Update own provider settings (preferences, notifications, appearance,
//         privacy and payout configuration). Only known top-level groups are
//         merged so unrelated provider fields are never touched.
// @route   PATCH /api/v1/providers/me/settings
// @access  Private (Provider)
export const updateProviderSettings = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const SETTING_GROUPS = ['language', 'currency', 'notifications', 'appearance', 'privacy', 'payment'];
  const providerUpdate = {};
  SETTING_GROUPS.forEach((group) => {
    if (req.body[group] !== undefined) {
      // Merge nested groups so a partial update (e.g. one notification toggle)
      // preserves the other keys instead of overwriting the whole sub-document.
      providerUpdate[`settings.${group}`] =
        group === 'language' || group === 'currency'
          ? req.body[group]
          : { ...(provider.settings?.[group]?.toObject?.() || provider.settings?.[group] || {}), ...req.body[group] };
    }
  });

  if (Object.keys(providerUpdate).length === 0) {
    throw new ApiError(400, 'No settings provided to update');
  }

  const updated = await Provider.findOneAndUpdate({ userId: req.user._id }, providerUpdate, {
    new: true,
    runValidators: true,
  }).select('settings');

  res.status(200).json(
    new ApiResponse(200, { settings: updated.settings }, 'Settings updated successfully')
  );
});

// @desc    Deactivate own account (soft action — marks the linked user inactive so
//         they can no longer operate as a provider; not a hard delete).
// @route   PATCH /api/v1/providers/me/deactivate
// @access  Private (Provider)
export const deactivateMyAccount = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  // A separate User.status enum of ['active','blocked','suspended'] exists; we
  // mark the account suspended to disable sign-in without destroying data.
  await User.findByIdAndUpdate(req.user._id, { status: 'suspended' });

  res.status(200).json(new ApiResponse(200, {}, 'Account deactivated successfully'));
});

// @desc    Permanently delete own provider account and linked user record.
// @route   DELETE /api/v1/providers/me
// @access  Private (Provider)
export const deleteMyAccount = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  // Cascade: remove the provider profile and the linked auth/user record.
  await Provider.deleteOne({ userId: req.user._id });
  await User.deleteOne({ _id: req.user._id });

  res.status(200).json(new ApiResponse(200, {}, 'Account deleted successfully'));
});

// Provider fields that can be edited from the provider profile form.
const PROVIDER_PROFILE_FIELDS = [
  'businessName',
  'description',
  'category',
  'experience',
  'location',
  'availability',
  'pricing',
];

// @desc    Update own provider profile
// @route   PATCH /api/v1/providers/me/profile
// @access  Private
export const updateMyProviderProfile = asyncHandler(async (req, res) => {
  const providerUpdate = {};
  PROVIDER_PROFILE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) providerUpdate[field] = req.body[field];
  });

  // Availability always arrives as the canonical per-day structure (legacy
  // single-range payloads are normalized too) so the stored record never
  // mixes shapes.
  if (providerUpdate.availability !== undefined) {
    providerUpdate.availability = normalizeAvailability(providerUpdate.availability);
  }

  const provider = await Provider.findOneAndUpdate(
    { userId: req.user._id },
    providerUpdate,
    { new: true, runValidators: true }
  );

  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  // Synchronize the authenticated User record:
  // - The provider's business name is the single source of truth for the
  //   provider's display name, so keep User.name in sync (used by the sidebar,
  //   header and other identity displays).
  // - Email and avatar live on the User model.
  const userUpdate = {};
  if (req.body.businessName !== undefined) {
    // Mirror the display name into the User record but stay within the 50-char
    // User.name limit so the sync can never fail validation. The provider
    // record itself keeps the full businessName (up to 100 chars).
    userUpdate.name = toUserName(req.body.businessName);
  }
  if (req.body.email !== undefined) {
    userUpdate.email = req.body.email;
  }
  if (req.body.avatar !== undefined) {
    userUpdate.avatar = saveBase64Image(req.body.avatar);
  }

  let user;
  if (Object.keys(userUpdate).length > 0) {
    user = await User.findByIdAndUpdate(req.user._id, userUpdate, {
      new: true,
      runValidators: true,
    }).select('-password -otp');
  } else {
    user = await User.findById(req.user._id).select('-password -otp');
  }

  provider.availability = normalizeAvailability(provider.availability);

  res.status(200).json(
    new ApiResponse(
      200,
      { provider, user },
      'Provider profile updated successfully'
    )
  );
});

// @desc    Add services to own provider profile
// @route   POST /api/v1/providers/me/services
// @access  Private
export const addServices = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  provider.services.push(req.body);
  await provider.save();

  provider.availability = normalizeAvailability(provider.availability);

  res.status(201).json(
    new ApiResponse(201, { provider }, 'Service added successfully')
  );
});

// @desc    Update a service on own provider profile
// @route   PATCH /api/v1/providers/me/services/:serviceId
// @access  Private (Provider)
export const updateService = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const service = provider.services.id(req.params.serviceId);
  if (!service) {
    throw new ApiError(404, 'Service not found');
  }

  Object.assign(service, req.body);
  await provider.save();

  provider.availability = normalizeAvailability(provider.availability);

  res.status(200).json(
    new ApiResponse(200, { provider }, 'Service updated successfully')
  );
});

// @desc    Delete a service from own provider profile
// @route   DELETE /api/v1/providers/me/services/:serviceId
// @access  Private (Provider)
export const deleteService = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const service = provider.services.id(req.params.serviceId);
  if (!service) {
    throw new ApiError(404, 'Service not found');
  }

  service.deleteOne();
  await provider.save();

  provider.availability = normalizeAvailability(provider.availability);

  res.status(200).json(
    new ApiResponse(200, { provider }, 'Service deleted successfully')
  );
});

// @desc    Get own availability
// @route   GET /api/v1/providers/me/availability
// @access  Private
export const getMyAvailability = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { availability: normalizeAvailability(provider.availability) },
      'Availability fetched successfully'
    )
  );
});

// @desc    Update own availability (per-day structure)
// @route   PATCH /api/v1/providers/me/availability
// @access  Private
export const updateAvailability = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  // Merge only the day keys actually present in the payload so PATCH calls are
  // partial-safe (other days keep their existing settings). Each incoming day
  // is normalized (legacy single-range payloads become the canonical slots
  // shape) before it is merged.
  const next = normalizeAvailability(provider.availability);
  DAY_KEYS.forEach((key) => {
    if (req.body[key] !== undefined) {
      next[key] = normalizeAvailability({ [key]: req.body[key] })[key];
    }
  });

  provider.availability = next;
  await provider.save();

  res.status(200).json(
    new ApiResponse(
      200,
      { provider, availability: normalizeAvailability(provider.availability) },
      'Availability updated successfully'
    )
  );
});

// @desc    Add an availability day (multi-slot)
// @route   POST /api/v1/providers/me/availability
// @access  Private
export const addAvailabilityDay = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const { day, enabled = false, slots = [] } = req.body;
  const next = normalizeAvailability(provider.availability);

  // Prevent duplicate day entries: a day that is enabled or already has stored
  // slots is considered configured and cannot be added a second time.
  const existing = next[day];
  if (existing && (existing.enabled || existing.slots.length > 0)) {
    throw new ApiError(409, `${DAY_LABELS[day]} is already configured`);
  }

  next[day] = {
    enabled: Boolean(enabled),
    slots: normalizeSlots(slots),
  };

  provider.availability = next;
  await provider.save();

  res.status(201).json(
    new ApiResponse(
      201,
      { availability: normalizeAvailability(provider.availability) },
      `${DAY_LABELS[day]} added to your availability`
    )
  );
});

// @desc    Update a single availability day (upsert; used for toggling, slot
//          edits and day changes)
// @route   PUT /api/v1/providers/me/availability/:day
// @access  Private
export const updateAvailabilityDay = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const { day } = req.params;
  const next = normalizeAvailability(provider.availability);

  next[day] = {
    enabled:
      req.body.enabled !== undefined
        ? Boolean(req.body.enabled)
        : next[day].enabled,
    slots:
      req.body.slots !== undefined ? normalizeSlots(req.body.slots) : next[day].slots,
  };

  provider.availability = next;
  await provider.save();

  res.status(200).json(
    new ApiResponse(
      200,
      { availability: normalizeAvailability(provider.availability) },
      `${DAY_LABELS[day]} availability updated successfully`
    )
  );
});

// @desc    Delete an availability day (resets it to the unconfigured state)
// @route   DELETE /api/v1/providers/me/availability/:day
// @access  Private
export const deleteAvailabilityDay = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const { day } = req.params;
  const next = normalizeAvailability(provider.availability);

  if (!next[day].enabled && next[day].slots.length === 0) {
    throw new ApiError(404, `${DAY_LABELS[day]} is not configured`);
  }

  next[day] = { enabled: false, slots: [] };
  provider.availability = next;
  await provider.save();

  res.status(200).json(
    new ApiResponse(
      200,
      { availability: normalizeAvailability(provider.availability) },
      `${DAY_LABELS[day]} removed from your availability`
    )
  );
});

// @desc    Get provider dashboard stats
// @route   GET /api/v1/providers/me/stats
// @access  Private (Provider)
export const getProviderStats = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const [totalBookings, pendingBookings, workingBookings, completedBookings, totalReviews, avgRating] =
    await Promise.all([
      Booking.countDocuments({ providerId: provider._id }),
      Booking.countDocuments({ providerId: provider._id, status: 'pending' }),
      Booking.countDocuments({ providerId: provider._id, status: 'working' }),
      Booking.countDocuments({ providerId: provider._id, status: 'completed' }),
      Review.countDocuments({ providerId: provider._id }),
      Review.aggregate([
        { $match: { providerId: provider._id } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
    ]);

  const completionRate = totalBookings > 0
    ? Math.round((completedBookings / totalBookings) * 100)
    : 0;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          totalBookings,
          pendingBookings,
          workingBookings,
          completedBookings,
          totalReviews,
          avgRating: avgRating.length > 0 ? Math.round(avgRating[0].avg * 10) / 10 : 0,
          completionRate,
        },
      },
      'Provider stats fetched successfully'
    )
  );
});

// @desc    Get provider earnings summary and transaction history
// @route   GET /api/v1/providers/me/earnings
// @access  Private (Provider)
export const getProviderEarnings = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const data = await computeProviderEarnings(provider._id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        earnings: {
          ...data,
          // Null when there is no previous-month data (never NaN/Infinity).
          monthChangePercent: safePercentageChange(data.thisMonth, data.lastMonthEarnings),
        },
      },
      'Earnings fetched successfully'
    )
  );
});

// @desc    Get a full provider profile for admin review (services, bookings,
//          reviews, earnings, withdrawals, complaints, KYC documents, stats)
// @route   GET /api/v1/admin/providers/:id
// @access  Private (Admin)
// NOTE: mounted under /admin in adminRoutes so it never collides with the
// public GET /providers/:id above. Every value is computed from real documents.
export const getAdminProviderDetail = asyncHandler(async (req, res) => {
  const providerId = req.params.id;

  const provider = await Provider.findById(providerId)
    // Include sensitive financial documents + earnings so the admin can review
    // payout details and KYC — these are deliberately excluded from public reads.
    .populate('userId', 'name phone email avatar status warnings');

  if (!provider) {
    throw new ApiError(404, 'Provider not found');
  }

  const pid = provider._id;

  const [
    standaloneServices,
    embeddedProvider,
    bookings,
    reviews,
    withdrawals,
    complaints,
    earningsData,
  ] = await Promise.all([
    Service.find({ providerId: pid })
      .sort({ popular: -1, bookingsCount: -1, createdAt: -1 })
      .populate('categoryId', 'name'),
    // Embedded services live on the Provider document (this is the source of
    // truth the provider edits via "My Services"); the standalone Service
    // collection is used elsewhere. Reconcile both so the admin view mirrors
    // exactly what the provider sees.
    Provider.findById(pid).select('services'),
    Booking.find({ providerId: pid })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('customerId', 'name phone')
      .populate('serviceId', 'name price'),
    Review.find({ providerId: pid })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name avatar'),
    Withdrawal.find({ providerId: pid }).sort({ createdAt: -1 }),
    // Complaints == reports whose target is this provider.
    Report.find({ targetType: 'provider', targetId: pid })
      .sort({ createdAt: -1 })
      .populate('reporterId', 'name'),
    computeProviderEarnings(pid),
  ]);

  // Reconcile the two service sources so the admin Services tab shows exactly
  // what the provider sees under "My Services". Prefer the embedded services
  // (the source of truth for CRUD), and merge any standalone Service docs that
  // are not already represented by an embedded one.
  // Map embedded services (source of truth for "My Services" CRUD) and any
  // extra standalone Service docs that are not already represented by an
  // embedded one. Both shapes expose the SAME fields consumed by the admin
  // Services tab:
  //   - category: the service's OWN category (not the provider's main category)
  //   - totalOrders: real number of bookings referencing this exact service
  //   - createdAt: the service's own creation timestamp (if one exists)
  const embeddedServices = (embeddedProvider?.services || []).map((s) => ({
    _id: s._id,
    name: s.name,
    description: s.description || '',
    price: s.price,
    duration: s.duration || '',
    isActive: true,
    popular: !!s.popular,
    // CATEGORY must follow the provider's main/professional category (the
    // profile category), NOT a per-service category. This is the single source
    // of truth for the Services tab "Category" column — it updates automatically
    // if the provider changes their main category.
    category: provider.category || null,
    // Filled from the real Booking aggregation below.
    totalOrders: 0,
    // Embedded subdocs may not carry a timestamp; null lets the UI show
    // "Not available" rather than inventing a date.
    createdAt: s.createdAt || null,
  }));

  const embeddedIds = new Set(
    embeddedServices.map((s) => String(s._id)).filter((id) => id !== 'undefined' && id !== 'null')
  );
  const extraStandalone = standaloneServices
    .filter((s) => !embeddedIds.has(String(s._id)))
    .map((s) => ({
      _id: s._id,
      name: s.name,
      description: s.description || '',
      price: s.price,
      duration: s.duration || '',
      isActive: s.isActive !== false,
      popular: !!s.popular,
      // CATEGORY = the provider's main category (single source of truth).
      category: provider.category || null,
      totalOrders: 0,
      // createdAt comes from the SERVICE document's own creation timestamp
      // (standalone Service docs use Mongoose timestamps). Embedded subdocs
      // without a recoverable creation date stay null → UI shows "Not available".
      createdAt: s.createdAt || null,
    }));

  const services = [...embeddedServices, ...extraStandalone];

  // Real per-service booking counts. A booking references a service via
  // `serviceId` (verified against the live schema), so we aggregate ALL
  // bookings for this provider grouped by serviceId — regardless of status
  // (pending/accepted/working/completed/cancelled/rejected) — and map the
  // counts back onto the service objects. One aggregation, not one query per
  // service.
  const bookingCounts = await Booking.aggregate([
    { $match: { providerId: pid } },
    { $group: { _id: '$serviceId', totalOrders: { $sum: 1 } } },
  ]);
  const bookingCountMap = {};
  bookingCounts.forEach((b) => {
    if (b._id) bookingCountMap[String(b._id)] = b.totalOrders;
  });
  services.forEach((svc) => {
    svc.totalOrders = bookingCountMap[String(svc._id)] || 0;
  });

  // Historical month-over-month earnings (real completed-booking data).
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);
  const monthlyEarnings = await Payment.aggregate([
    {
      $match: {
        providerId: pid,
        status: 'paid',
        paidAt: { $gte: twelveMonthsAgo },
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

  // Booking status distribution (real, for the overview donut/summary).
  const bookingStatusAgg = await Booking.aggregate([
    { $match: { providerId: pid } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const bookingStatusCounts = {
    pending: 0, accepted: 0, working: 0, completed: 0, cancelled: 0, rejected: 0,
  };
  bookingStatusAgg.forEach((b) => {
    if (b._id in bookingStatusCounts) bookingStatusCounts[b._id] = b.count;
  });

  const totalBookings = Object.values(bookingStatusCounts).reduce((a, c) => a + c, 0);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        provider,
        services,
        bookings,
        reviews,
        withdrawals,
        complaints,
        earnings: {
          ...earningsData,
          monthChangePercent: safePercentageChange(
            earningsData.thisMonth,
            earningsData.lastMonthEarnings
          ),
        },
        monthlyEarnings,
        bookingStatusCounts,
        totalBookings,
      },
      'Provider detail fetched successfully'
    )
  );
});

// @desc    Admin verification of an individual KYC document on a provider
// @route   PATCH /api/v1/admin/providers/:id/documents/:docId
// @access  Private (Admin)
export const updateProviderDocumentStatus = asyncHandler(async (req, res) => {
  const { verified, note } = req.body;

  const provider = await Provider.findById(req.params.id);
  if (!provider) {
    throw new ApiError(404, 'Provider not found');
  }

  const doc = provider.documents.id(req.params.docId);
  if (!doc) {
    throw new ApiError(404, 'Document not found');
  }

  if (typeof verified === 'boolean') doc.verified = verified;
  if (typeof note === 'string') doc.note = note;

  // Reflect overall verification status: approved only when every uploaded
  // document is verified; pending when at least one remains unverified.
  const hasDocs = provider.documents.length > 0;
  const allVerified = hasDocs && provider.documents.every((d) => d.verified);
  if (hasDocs && !allVerified && provider.verificationStatus === 'approved') {
    provider.verificationStatus = 'pending';
    provider.isVerified = false;
  } else if (allVerified && provider.verificationStatus === 'pending') {
    provider.verificationStatus = 'approved';
    provider.isVerified = true;
  }

  await provider.save();

  // Notify the provider of the document decision.
  await Notification.create({
    userId: provider.userId,
    type: 'verification',
    title: verified ? 'Document verified' : 'Document needs review',
    message:
      note ||
      (verified
        ? `Your ${doc.type} document has been verified.`
        : `Your ${doc.type} document was returned for review.`),
  });

  res.status(200).json(
    new ApiResponse(200, { provider }, 'Document status updated successfully')
  );
});
