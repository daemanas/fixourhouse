// Recalculate a provider's aggregated rating from its published reviews.
// This keeps the provider's public rating accurate whenever a review is
// hidden, restored or deleted by an admin.
const recalculateProviderRating = async (providerId) => {
  if (!providerId) return;
  const agg = await Review.aggregate([
    { $match: { provider: providerId, status: 'published' } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = agg[0]?.avgRating || 0;
  const count = agg[0]?.count || 0;

  await Provider.findByIdAndUpdate(providerId, {
    rating: Number(avg.toFixed(2)),
    reviewCount: count,
  });
};

// GET /api/v1/admin/reviews/stats
const getReviewStats = asyncHandler(async (req, res) => {
  const stats = await Review.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  const byStatus = await Review.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const byRating = await Review.aggregate([
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);

  const reported = await Review.countDocuments({ status: 'reported' });

  const getCount = (arr, key) => arr.find((s) => s._id === key)?.count || 0;

  res.status(200).json({
    success: true,
    data: {
      total: stats[0]?.total || 0,
      avgRating: Number((stats[0]?.avgRating || 0).toFixed(2)),
      published: getCount(byStatus, 'published'),
      hidden: getCount(byStatus, 'hidden'),
      reported,
      distribution: {
        '1': getCount(byRating, 1),
        '2': getCount(byRating, 2),
        '3': getCount(byRating, 3),
        '4': getCount(byRating, 4),
        '5': getCount(byRating, 5),
      },
    },
  });
});

// GET /api/v1/admin/reviews
const getReviews = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    rating,
    status,
    sort = 'newest',
  } = req.query;

  const filter = {};
  if (rating) filter.rating = Number(rating);
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { comment: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
      { 'provider.serviceName': { $regex: search, $options: 'i' } },
      { 'provider.businessName': { $regex: search, $options: 'i' } },
    ];
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    ratingHigh: { rating: -1 },
    ratingLow: { rating: 1 },
  };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const reviews = await Review.find(filter)
    .populate('customer', 'name email phone avatar')
    .populate('provider', 'businessName serviceName avatar')
    .populate('booking', 'serviceDate status')
    .sort(sortOptions[sort] || sortOptions.newest)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await Review.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
});

// GET /api/v1/admin/reviews/:id
const getReviewById = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('customer', 'name email phone avatar')
    .populate('provider', 'businessName serviceName avatar rating reviewCount')
    .populate('booking', 'serviceDate status');

  if (!review) {
    throw new ApiError('Review not found', 404);
  }

  res.status(200).json({ success: true, data: review });
});

// PATCH /api/v1/admin/reviews/:id/hide
const hideReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new ApiError('Review not found', 404);
  }
  review.status = 'hidden';
  await review.save();
  await recalculateProviderRating(review.provider);
  res.status(200).json({ success: true, data: review });
});

// PATCH /api/v1/admin/reviews/:id/restore
const restoreReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new ApiError('Review not found', 404);
  }
  review.status = 'published';
  await review.save();
  await recalculateProviderRating(review.provider);
  res.status(200).json({ success: true, data: review });
});

// DELETE /api/v1/admin/reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new ApiError('Review not found', 404);
  }
  const providerId = review.provider;
  await review.deleteOne();
  // Clean up any reports that targeted this review.
  await Report.deleteMany({ targetType: 'review', targetId: req.params.id });
  await recalculateProviderRating(providerId);
  res.status(200).json({ success: true, data: { id: req.params.id } });
});