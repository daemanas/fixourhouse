import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import Provider from '../models/Provider.js';
import Category from '../models/Category.js';
import ServiceType from '../models/ServiceType.js';
import Review from '../models/Review.js';
import CompletedServicePhoto from '../models/CompletedServicePhoto.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { syncProviderServices } from '../utils/serviceSync.js';

// @desc    Get all active services for service catalog
// @route   GET /api/v1/services
// @access  Public

// export const getServices = asyncHandler(async (req, res) => {
//   await syncProviderServices();

//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 9;
//   const skip = (page - 1) * limit;

//   const providerFilter = { verificationStatus: { $in: ['approved', 'verified'] } };

//   if (req.query.countryId) providerFilter['location.countryId'] = req.query.countryId;
//   if (req.query.stateId) providerFilter['location.stateId'] = req.query.stateId;
//   if (req.query.districtId) providerFilter['location.districtId'] = req.query.districtId;
//   if (req.query.cityId) providerFilter['location.cityId'] = req.query.cityId;

//   const cityParam = (req.query.city || req.query.location || '').trim();
//   if (cityParam) {
//     const escaped = cityParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//     const exactRegex = new RegExp(`^\\s*${escaped}\\s*$`, 'i');
//     const segmentRegex = new RegExp(`(?:^|[,\\s])${escaped}(?:[,\\s]|$)`, 'i');

//     providerFilter.$or = [
//       { 'location.city': exactRegex },
//       { 'location.city': segmentRegex },
//       { 'location.district': exactRegex },
//       { 'location.district': segmentRegex },
//       { 'location.address': exactRegex },
//       { 'location.address': segmentRegex },
//       { serviceArea: exactRegex },
//       { serviceArea: segmentRegex },
//     ];
//   }

//   const verifiedProviders = await Provider.find(providerFilter).select('_id businessName location rating reviewCount');
//   const validProviderIds = verifiedProviders.map((p) => p._id);

//   const serviceFilter = {
//     isActive: true,
//     providerId: { $in: validProviderIds },
//   };

//   if (req.query.serviceTypeId) {
//     serviceFilter.serviceTypeId = req.query.serviceTypeId;
//   }

//   if (req.query.serviceCategoryId) {
//     serviceFilter.$or = [
//       { serviceCategoryId: req.query.serviceCategoryId },
//       { categoryId: req.query.serviceCategoryId },
//     ];
//   } else if (req.query.category && req.query.category !== 'All Categories') {
//     const categoryQuery = req.query.category.trim();
//     const matchedCategory = await Category.findOne({
//       $or: [
//         { _id: categoryQuery.match(/^[0-9a-fA-F]{24}$/) ? categoryQuery : null },
//         { slug: categoryQuery.toLowerCase() },
//         { name: new RegExp(`^${categoryQuery.replace(/-/g, ' ')}$`, 'i') },
//       ],
//     });

//     if (matchedCategory) {
//       serviceFilter.$or = [
//         { serviceCategoryId: matchedCategory._id },
//         { categoryId: matchedCategory._id },
//       ];
//     }
//   }

//   if (req.query.minPrice) {
//     serviceFilter.price = { ...serviceFilter.price, $gte: parseFloat(req.query.minPrice) };
//   }
//   if (req.query.maxPrice) {
//     serviceFilter.price = { ...serviceFilter.price, $lte: parseFloat(req.query.maxPrice) };
//   }

//   if (req.query.q && req.query.q.trim()) {
//     const qRegex = new RegExp(req.query.q.trim(), 'i');
//     serviceFilter.$and = serviceFilter.$and || [];
//     serviceFilter.$and.push({ $or: [{ name: qRegex }, { description: qRegex }] });
//   }

//   let sortOption = { popular: -1, bookingsCount: -1, createdAt: -1 };
//   if (req.query.sort === 'price_asc') sortOption = { price: 1 };
//   if (req.query.sort === 'price_desc') sortOption = { price: -1 };
//   if (req.query.sort === 'rating') sortOption = { rating: -1, bookingsCount: -1 };
//   if (req.query.sort === 'newest') sortOption = { createdAt: -1 };

//   const [rawServices, total] = await Promise.all([
//     Service.find(serviceFilter)
//       .sort(sortOption)
//       .skip(skip)
//       .limit(limit)
//       .populate({
//         path: 'providerId',
//         select: 'businessName rating reviewCount location avatar isVerified verificationStatus experience pricing',
//         populate: { path: 'userId', select: 'name avatar' },
//       })
//       .populate('serviceTypeId', 'name slug')
//       .populate('serviceCategoryId', 'name slug')
//       .populate('categoryId', 'name slug'),
//     Service.countDocuments(serviceFilter),
//   ]);

//   const services = await Promise.all(
//     rawServices.map(async (svc) => {
//       const plainSvc = svc.toObject();

//       const providerCountFilter = {
//         isActive: true,
//         providerId: { $in: validProviderIds },
//         $or: [
//           { name: new RegExp(`^${plainSvc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
//           ...(plainSvc.serviceCategoryId ? [{ serviceCategoryId: plainSvc.serviceCategoryId }] : []),
//           ...(plainSvc.categoryId ? [{ categoryId: plainSvc.categoryId }] : []),
//         ],
//       };

//       const matchingProviderServices = await Service.find(providerCountFilter).distinct('providerId');
//       const availableProvidersCount = Math.max(1, matchingProviderServices.length);

//       const reviews = await Review.find({ providerId: plainSvc.providerId?._id, isVisible: true });
//       const reviewCount = reviews.length;
//       const averageRating =
//         reviewCount > 0
//           ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount).toFixed(1))
//           : plainSvc.providerId?.rating || 0;

//       return {
//         ...plainSvc,
//         availableProvidersCount,
//         rating: averageRating,
//         reviewCount,
//       };
//     })
//   );

//   res.status(200).json(
//     new ApiResponse(200, { services, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, 'Services catalog fetched')
//   );
// });


// @desc    Get all active services for service catalog
// @route   GET /api/v1/services
// @access  Public

export const getServices = asyncHandler(async (req, res) => {
  await syncProviderServices();

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const skip = (page - 1) * limit;

  // --------------------------------------------------
  // PROVIDER FILTER
  // --------------------------------------------------

  const providerFilter = {
    verificationStatus: {
      $in: ['approved', 'verified'],
    },
  };

  if (req.query.countryId) {
    providerFilter['location.countryId'] = req.query.countryId;
  }

  if (req.query.stateId) {
    providerFilter['location.stateId'] = req.query.stateId;
  }

  if (req.query.districtId) {
    providerFilter['location.districtId'] = req.query.districtId;
  }

  if (req.query.cityId) {
    providerFilter['location.cityId'] = req.query.cityId;
  }

  // --------------------------------------------------
  // LOCATION SEARCH
  // --------------------------------------------------

  const cityParam = (
    req.query.city ||
    req.query.location ||
    ''
  ).trim();

  if (cityParam) {
    const escaped = cityParam.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const exactRegex = new RegExp(
      `^\\s*${escaped}\\s*$`,
      'i'
    );

    const segmentRegex = new RegExp(
      `(?:^|[,\\s])${escaped}(?:[,\\s]|$)`,
      'i'
    );

    providerFilter.$or = [
      { 'location.city': exactRegex },
      { 'location.city': segmentRegex },

      { 'location.district': exactRegex },
      { 'location.district': segmentRegex },

      { 'location.address': exactRegex },
      { 'location.address': segmentRegex },

      { serviceArea: exactRegex },
      { serviceArea: segmentRegex },
    ];
  }

  // --------------------------------------------------
  // VERIFIED PROVIDERS
  // --------------------------------------------------

  const verifiedProviders = await Provider.find(
    providerFilter
  ).select(
    '_id businessName location rating reviewCount'
  );

  const validProviderIds = verifiedProviders.map(
    (provider) => provider._id
  );

  // --------------------------------------------------
  // SERVICE FILTER
  // --------------------------------------------------

  const serviceFilter = {
    isActive: true,
    providerId: {
      $in: validProviderIds,
    },
  };

  // Service Type
  if (req.query.serviceTypeId) {
    serviceFilter.serviceTypeId = req.query.serviceTypeId;
  }

  // Service Category
  if (req.query.serviceCategoryId) {
    serviceFilter.$or = [
      {
        serviceCategoryId:
          req.query.serviceCategoryId,
      },
      {
        categoryId:
          req.query.serviceCategoryId,
      },
    ];
  } else if (
    req.query.category &&
    req.query.category !== 'All Categories'
  ) {
    const categoryQuery = req.query.category.trim();

    const categoryConditions = [
      {
        slug: categoryQuery.toLowerCase(),
      },
      {
        name: new RegExp(
          `^${categoryQuery.replace(/-/g, ' ')}$`,
          'i'
        ),
      },
    ];

    if (/^[0-9a-fA-F]{24}$/.test(categoryQuery)) {
      categoryConditions.unshift({
        _id: categoryQuery,
      });
    }

    const matchedCategory = await Category.findOne({
      $or: categoryConditions,
    });

    if (matchedCategory) {
      serviceFilter.$or = [
        {
          serviceCategoryId: matchedCategory._id,
        },
        {
          categoryId: matchedCategory._id,
        },
      ];
    }
  }

  // --------------------------------------------------
  // PRICE FILTER
  // --------------------------------------------------

  const minPrice = parseFloat(req.query.minPrice);
  const maxPrice = parseFloat(req.query.maxPrice);

  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    serviceFilter.$or = [
      {
        startingPrice: {
          ...(Number.isNaN(minPrice)
            ? {}
            : { $gte: minPrice }),

          ...(Number.isNaN(maxPrice)
            ? {}
            : { $lte: maxPrice }),
        },
      },

      // Backward compatibility with old records
      {
        price: {
          ...(Number.isNaN(minPrice)
            ? {}
            : { $gte: minPrice }),

          ...(Number.isNaN(maxPrice)
            ? {}
            : { $lte: maxPrice }),
        },
      },
    ];
  }

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  if (req.query.q && req.query.q.trim()) {
    const qRegex = new RegExp(
      req.query.q.trim(),
      'i'
    );

    serviceFilter.$and =
      serviceFilter.$and || [];

    serviceFilter.$and.push({
      $or: [
        { name: qRegex },
        { description: qRegex },
      ],
    });
  }

  // --------------------------------------------------
  // SORT
  // --------------------------------------------------

  let sortOption = {
    popular: -1,
    bookingsCount: -1,
    createdAt: -1,
  };

  if (req.query.sort === 'price_asc') {
    sortOption = {
      startingPrice: 1,
      price: 1,
    };
  }

  if (req.query.sort === 'price_desc') {
    sortOption = {
      startingPrice: -1,
      price: -1,
    };
  }

  if (req.query.sort === 'rating') {
    sortOption = {
      rating: -1,
      bookingsCount: -1,
    };
  }

  if (req.query.sort === 'newest') {
    sortOption = {
      createdAt: -1,
    };
  }

  // --------------------------------------------------
  // FETCH SERVICES
  // --------------------------------------------------

  const [rawServices, total] =
    await Promise.all([
      Service.find(serviceFilter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)

        .populate({
          path: 'providerId',
          select:
            'businessName rating reviewCount location avatar isVerified verificationStatus experience pricing',
          populate: {
            path: 'userId',
            select: 'name avatar',
          },
        })

        .populate(
          'serviceTypeId',
          'name slug'
        )

        .populate(
          'serviceCategoryId',
          'name slug'
        )

        .populate(
          'categoryId',
          'name slug'
        ),

      Service.countDocuments(serviceFilter),
    ]);

  // --------------------------------------------------
  // BUILD CATALOG RESPONSE
  // --------------------------------------------------

  const services = await Promise.all(
    rawServices.map(async (svc) => {
      const plainSvc = svc.toObject();

      // ----------------------------------------------
      // PRICE
      // ----------------------------------------------

      const startingPrice = Number(
        plainSvc.startingPrice ??
          plainSvc.price ??
          0
      );

      const discountPercentage = Number(
        plainSvc.discountPercentage ?? 0
      );

      const finalPrice =
        discountPercentage > 0
          ? Number(
              (
                startingPrice *
                (1 - discountPercentage / 100)
              ).toFixed(2)
            )
          : startingPrice;

      // ----------------------------------------------
      // PROVIDER COUNT
      // ----------------------------------------------

      const escapedServiceName =
        String(plainSvc.name || '').replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );

      const providerCountFilter = {
        isActive: true,

        providerId: {
          $in: validProviderIds,
        },

        $or: [
          {
            name: new RegExp(
              `^${escapedServiceName}$`,
              'i'
            ),
          },

          ...(plainSvc.serviceCategoryId
            ? [
                {
                  serviceCategoryId:
                    plainSvc.serviceCategoryId._id ||
                    plainSvc.serviceCategoryId,
                },
              ]
            : []),

          ...(plainSvc.categoryId
            ? [
                {
                  categoryId:
                    plainSvc.categoryId._id ||
                    plainSvc.categoryId,
                },
              ]
            : []),
        ],
      };

      const matchingProviderServices =
        await Service.find(
          providerCountFilter
        ).distinct('providerId');

      const providerCount =
        matchingProviderServices.length;

      // ----------------------------------------------
      // REVIEWS / RATING
      // ----------------------------------------------

      const completedBookingIds = await Booking.distinct('_id', {
        serviceId: plainSvc._id,
        status: 'completed',
      });
      const reviews = await Review.find({
        bookingId: { $in: completedBookingIds },
        isVisible: true,
      }).select('rating');

      const reviewCount = reviews.length;

      const averageRating =
        reviewCount > 0
          ? Number(
              (
                reviews.reduce(
                  (sum, review) =>
                    sum + Number(review.rating || 0),
                  0
                ) / reviewCount
              ).toFixed(1)
            )
          : 0;

      // ----------------------------------------------
      // RETURN NORMALIZED SERVICE
      // ----------------------------------------------

      return {
        ...plainSvc,

        // Price
        startingPrice,
        price: startingPrice,
        finalPrice,

        // Discount
        discountPercentage,

        // Duration
        durationMinutes: Number(
          plainSvc.durationMinutes ??
            plainSvc.duration ??
            0
        ),

        duration: Number(
          plainSvc.duration ??
            plainSvc.durationMinutes ??
            0
        ),

        // Image
        primaryImage:
          plainSvc.primaryImage ||
          plainSvc.images?.[0] ||
          '',

        // Provider count
        providerCount,
        availableProvidersCount:
          providerCount,

        // Rating
        averageRating,
        rating: averageRating,

        // Reviews
        reviewCount,
      };
    })
  );

  // --------------------------------------------------
  // RESPONSE
  // --------------------------------------------------

  res.status(200).json(
    new ApiResponse(
      200,
      {
        services,

        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(
            total / limit
          ),
        },
      },
      'Services catalog fetched'
    )
  );
});

const loadServiceReviewPage = async (serviceId, page = 1, limit = 3) => {
  const bookingIds = await Booking.distinct('_id', {
    serviceId,
    status: 'completed',
  });
  const filter = { bookingId: { $in: bookingIds }, isVisible: true };
  const skip = (page - 1) * limit;

  const [reviews, total, distribution] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name avatar'),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: filter },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingTotal = 0;
  distribution.forEach(({ _id, count }) => {
    if (Object.prototype.hasOwnProperty.call(ratingBreakdown, _id)) {
      ratingBreakdown[_id] = count;
    }
    ratingTotal += Number(_id) * count;
  });

  return {
    reviews,
    averageRating: total > 0 ? Number((ratingTotal / total).toFixed(1)) : 0,
    ratingBreakdown,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

// @desc    Get single service details with matching providers and exact-service photos/reviews
// @route   GET /api/v1/services/:id
// @access  Public
export const getServiceById = asyncHandler(async (req, res) => {
  await syncProviderServices();

  const service = await Service.findById(req.params.id)
    .populate({
      path: 'providerId',
      select: 'businessName rating reviewCount location avatar isVerified verificationStatus experience pricing description',
      populate: { path: 'userId', select: 'name avatar email phone' },
    })
    .populate('serviceTypeId', 'name slug description')
    .populate('serviceCategoryId', 'name slug description')
    .populate('categoryId', 'name slug description');

  if (!service) {
    throw new ApiError(404, 'Service not found');
  }

  const matchingNameRegex = new RegExp(`^${service.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const matchingServiceDocs = await Service.find({
    isActive: true,
    name: matchingNameRegex,
  }).populate({
    path: 'providerId',
    select: 'businessName rating reviewCount location avatar isVerified verificationStatus experience pricing description',
    populate: { path: 'userId', select: 'name avatar' },
  });

  const providerMap = new Map();
  const refId = (value) => String(value?._id || value || '');
  const selectedTypeId = refId(service.serviceTypeId);
  const selectedCategoryId = refId(service.serviceCategoryId || service.categoryId);
  matchingServiceDocs.forEach((doc) => {
    const offerTypeId = refId(doc.serviceTypeId);
    const offerCategoryId = refId(doc.serviceCategoryId || doc.categoryId);
    if (selectedTypeId && offerTypeId && selectedTypeId !== offerTypeId) return;
    if (selectedCategoryId && offerCategoryId && selectedCategoryId !== offerCategoryId) return;
    if (
      doc.providerId &&
      ['approved', 'verified'].includes(doc.providerId.verificationStatus || 'approved')
    ) {
      const providerId = String(doc.providerId._id);
      const existingOffer = providerMap.get(providerId);
      if (!existingOffer || String(doc._id) === String(service._id)) providerMap.set(providerId, {
        provider: doc.providerId,
        serviceId: service._id,
        providerServiceId: doc._id,
        providerService: {
          _id: doc._id,
          name: doc.name,
          description: doc.description,
          startingPrice: doc.startingPrice,
          price: doc.price,
          durationMinutes: doc.durationMinutes,
          duration: doc.duration,
          discountPercentage: doc.discountPercentage,
          primaryImage: doc.primaryImage,
          image: doc.image,
          images: doc.images,
        },
        price: doc.price ?? doc.startingPrice,
        duration: doc.duration || doc.durationMinutes,
        description: doc.description,
      });
    }
  });

  const providersOfferingService = Array.from(providerMap.values());
  const providerIds = Array.from(providerMap.keys());

  const completedPhotos = await CompletedServicePhoto.find({ serviceId: service._id })
    .populate({
      path: 'providerId',
      select: 'businessName avatar rating location',
      populate: { path: 'userId', select: 'name avatar' },
    })
    .sort({ createdAt: -1 });

  const reviewPage = Math.max(parseInt(req.query.reviewPage, 10) || 1, 1);
  const reviewLimit = Math.min(Math.max(parseInt(req.query.reviewLimit, 10) || 3, 1), 20);
  const reviewData = await loadServiceReviewPage(service._id, reviewPage, reviewLimit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        service: {
          ...service.toObject(),
          rating: reviewData.averageRating,
          reviewCount: reviewData.pagination.total,
          availableProvidersCount: providersOfferingService.length,
        },
        providers: providersOfferingService,
        completedPhotos,
        reviews: reviewData.reviews,
        averageRating: reviewData.averageRating,
        ratingBreakdown: reviewData.ratingBreakdown,
        reviewPagination: reviewData.pagination,
      },
      'Service details fetched successfully'
    )
  );
});

// @desc    Get a paginated page of reviews for one exact service
// @route   GET /api/v1/services/:id/reviews
// @access  Public
export const getServiceReviews = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id).select('_id');
  const embeddedServiceProvider = service
    ? null
    : await Provider.findOne({ 'services._id': req.params.id }).select('_id');
  if (!service && !embeddedServiceProvider) {
    throw new ApiError(404, 'Service not found');
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 3, 1), 20);
  const reviewData = await loadServiceReviewPage(service._id, page, limit);

  res.status(200).json(
    new ApiResponse(200, reviewData, 'Service reviews fetched successfully')
  );
});