import Location from '../models/Location.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc   Get all active countries
// @route  GET /api/v1/locations/countries
// @access Public
export const getCountries = asyncHandler(async (req, res) => {
  let countries = await Location.find({ type: 'country', isActive: true })
    .select('name code _id')
    .sort({ name: 1 });

  // If no country doc exists yet in DB, return India as default fallback object
  if (countries.length === 0) {
    const india = await Location.findOne({ name: 'India', type: 'country' });
    if (india) countries = [india];
  }

  res.status(200).json(
    new ApiResponse(200, { countries }, 'Countries fetched successfully')
  );
});

// @desc   Get all active states
// @route  GET /api/v1/locations/states?countryId=<id>
// @access Public
export const getStates = asyncHandler(async (req, res) => {
  const countryId = req.params.countryId || req.query.countryId;
  const query = { type: 'state', isActive: true };
  if (countryId) {
    query.parentId = countryId;
  }

  const states = await Location.find(query)
    .select('name code parentId _id')
    .sort({ name: 1 });

  res.status(200).json(
    new ApiResponse(200, { states }, 'States fetched successfully')
  );
});

// @desc   Get districts for a state
// @route  GET /api/v1/locations/districts?stateId=<id>
// @access Public
export const getDistricts = asyncHandler(async (req, res) => {
  const stateId = req.params.stateId || req.query.stateId;
  if (!stateId) {
    throw new ApiError(400, 'stateId query parameter is required');
  }

  // Verify parent state exists
  const state = await Location.findOne({ _id: stateId, type: 'state', isActive: true });
  if (!state) {
    throw new ApiError(404, 'State not found');
  }

  const districts = await Location.find({
    type: 'district',
    parentId: stateId,
    isActive: true,
  })
    .select('name code parentId _id')
    .sort({ name: 1 });

  res.status(200).json(
    new ApiResponse(200, { districts }, 'Districts fetched successfully')
  );
});

// @desc   Get cities for a district
// @route  GET /api/v1/locations/cities?districtId=<id>
//         GET /api/v1/locations/cities?stateId=<id>
// @access Public
export const getCities = asyncHandler(async (req, res) => {
  const districtId = req.params.districtId || req.query.districtId;
  const stateId = req.params.stateId || req.query.stateId;

  if (!districtId && !stateId) {
    throw new ApiError(400, 'Either districtId or stateId query parameter is required');
  }

  let cities = [];
  if (districtId) {
    // Verify parent district exists
    const district = await Location.findOne({ _id: districtId, type: 'district', isActive: true });
    if (!district) {
      throw new ApiError(404, 'District not found');
    }

    // Fetch ONLY cities whose parentId is directly this districtId
    cities = await Location.find({
      type: 'city',
      parentId: districtId,
      isActive: true,
    })
      .select('name code parentId _id')
      .sort({ name: 1 });
  } else if (stateId) {
    // All cities under a state (via district parentId chain)
    const districts = await Location.find({
      type: 'district',
      parentId: stateId,
      isActive: true,
    }).select('_id');

    const districtIds = districts.map((d) => d._id);
    cities = await Location.find({
      type: 'city',
      parentId: { $in: districtIds },
      isActive: true,
    })
      .select('name code parentId _id')
      .sort({ name: 1 });
  }

  res.status(200).json(
    new ApiResponse(200, { cities }, 'Cities fetched successfully')
  );
});
