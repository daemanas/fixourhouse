import CommissionOffer from '../models/CommissionOffer.js';
import CommissionSettings from '../models/CommissionSettings.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const getOrCreateSettings = () =>
  CommissionSettings.findOneAndUpdate(
    { key: 'commission' },
    { $setOnInsert: { key: 'commission' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

const parseRate = (value) => {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100 || Math.abs(Math.round(rate * 100) - rate * 100) > 1e-8) {
    throw new ApiError(400, 'Commission rate must be between 0 and 100 with at most two decimal places');
  }
  return rate;
};

export const getCommissionSettings = asyncHandler(async (_req, res) => {
  const [settings, offers] = await Promise.all([
    getOrCreateSettings(),
    CommissionOffer.find().sort({ createdAt: -1 }),
  ]);
  res.status(200).json(new ApiResponse(200, { settings, offers }, 'Commission configuration fetched'));
});

export const updateDefaultCommission = asyncHandler(async (req, res) => {
  const defaultRate = parseRate(req.body?.defaultRate);
  const settings = await CommissionSettings.findOneAndUpdate(
    { key: 'commission' },
    { $set: { defaultRate, updatedBy: req.user._id }, $setOnInsert: { key: 'commission' } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );
  res.status(200).json(new ApiResponse(200, { settings }, 'Default commission updated'));
});

const buildOfferData = (body, partial = false) => {
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
  if (!partial || has('name')) {
    data.name = String(body.name || '').trim();
    if (!data.name || data.name.length > 100) throw new ApiError(400, 'Offer name is required and must be at most 100 characters');
  }
  if (!partial || has('commissionRate')) data.commissionRate = parseRate(body.commissionRate);
  if (!partial || has('durationDays')) {
    data.durationDays = Number(body.durationDays);
    if (!Number.isInteger(data.durationDays) || data.durationDays < 1 || data.durationDays > 3650) {
      throw new ApiError(400, 'Offer duration must be between 1 and 3650 days');
    }
  }
  if (!partial || has('appliesTo')) {
    data.appliesTo = body.appliesTo || 'newProviders';
    if (!['newProviders', 'allProviders'].includes(data.appliesTo)) throw new ApiError(400, 'Invalid offer eligibility');
  }
  for (const field of ['startDate', 'endDate']) {
    if (!partial || has(field)) {
      const dateValue = String(body[field] || '');
      data[field] = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
        ? new Date(`${dateValue}T${field === 'endDate' ? '23:59:59.999' : '00:00:00.000'}Z`)
        : new Date(dateValue);
      if (!Number.isFinite(data[field].getTime())) throw new ApiError(400, `Invalid ${field}`);
    }
  }
  if (has('isActive')) {
    if (typeof body.isActive !== 'boolean') throw new ApiError(400, 'Invalid offer status');
    data.isActive = body.isActive;
  } else if (!partial) {
    data.isActive = true;
  }
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    throw new ApiError(400, 'Offer end date must be on or after its start date');
  }
  return data;
};

export const createCommissionOffer = asyncHandler(async (req, res) => {
  const offer = await CommissionOffer.create({ ...buildOfferData(req.body || {}), createdBy: req.user._id });
  res.status(201).json(new ApiResponse(201, { offer }, 'Commission offer created'));
});

export const updateCommissionOffer = asyncHandler(async (req, res) => {
  const offer = await CommissionOffer.findById(req.params.id);
  if (!offer) throw new ApiError(404, 'Commission offer not found');
  const update = buildOfferData(req.body || {}, true);
  const candidateStart = update.startDate || offer.startDate;
  const candidateEnd = update.endDate || offer.endDate;
  if (candidateEnd < candidateStart) throw new ApiError(400, 'Offer end date must be on or after its start date');
  Object.assign(offer, update, { updatedBy: req.user._id });
  await offer.save();
  res.status(200).json(new ApiResponse(200, { offer }, 'Commission offer updated'));
});

export const deleteCommissionOffer = asyncHandler(async (req, res) => {
  const offer = await CommissionOffer.findByIdAndDelete(req.params.id);
  if (!offer) throw new ApiError(404, 'Commission offer not found');
  res.status(200).json(new ApiResponse(200, {}, 'Commission offer deleted'));
});