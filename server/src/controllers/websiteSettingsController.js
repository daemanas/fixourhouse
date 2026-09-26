import WebsiteSettings from '../models/WebsiteSettings.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { saveBase64Image } from '../utils/upload.js';

const stringFields = {
  root: ['siteName', 'logoUrl', 'darkLogoUrl', 'faviconUrl'],
  hero: [
    'desktopImageUrl', 'mobileImageUrl', 'heading', 'subtitle', 'primaryButtonText',
    'primaryButtonAction', 'secondaryButtonText', 'secondaryButtonAction',
  ],
  contact: [
    'officialEmail', 'supportEmail', 'phone', 'whatsapp', 'officeAddress', 'city',
    'state', 'country', 'postalCode', 'businessHours', 'mapUrl',
  ],
  social: ['facebook', 'instagram', 'youtube', 'linkedin', 'twitter'],
};

const allowedAssets = {
  logo: 'logoUrl',
  darkLogo: 'darkLogoUrl',
  favicon: 'faviconUrl',
  desktopBanner: 'hero.desktopImageUrl',
  mobileBanner: 'hero.mobileImageUrl',
};

const isWebUrl = (value) => {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const buildSettingsUpdate = (body) => {
  const update = {};
  for (const field of stringFields.root) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'string' || body[field].length > 500) {
      throw new ApiError(400, `Invalid ${field}`);
    }
    update[field] = body[field].trim();
  }

  for (const group of ['hero', 'contact', 'social']) {
    const source = body[group];
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    const groupUpdate = {};
    for (const field of stringFields[group]) {
      if (source[field] === undefined) continue;
      if (typeof source[field] !== 'string' || source[field].length > 2000) {
        throw new ApiError(400, `Invalid ${group}.${field}`);
      }
      const value = source[field].trim();
      if (field.endsWith('Action') || ['mapUrl', ...stringFields.social].includes(field)) {
        if (!isWebUrl(value)) throw new ApiError(400, `Invalid URL for ${group}.${field}`);
      }
      if (field.toLowerCase().includes('email') && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new ApiError(400, `Invalid email for ${group}.${field}`);
      }
      groupUpdate[field] = value;
    }
    if (group === 'hero' && source.enabled !== undefined) {
      if (typeof source.enabled !== 'boolean') throw new ApiError(400, 'Invalid hero.enabled');
      groupUpdate.enabled = source.enabled;
    }
    if (group === 'hero' && source.displayOrder !== undefined) {
      const displayOrder = Number(source.displayOrder);
      if (!Number.isInteger(displayOrder) || displayOrder < 0) throw new ApiError(400, 'Invalid hero.displayOrder');
      groupUpdate.displayOrder = displayOrder;
    }
    for (const [field, value] of Object.entries(groupUpdate)) update[`${group}.${field}`] = value;
  }
  if (!Object.keys(update).length) throw new ApiError(400, 'No website settings were provided');
  if (update.logoUrl && !isWebUrl(update.logoUrl)) throw new ApiError(400, 'Invalid logo URL');
  if (update.darkLogoUrl && !isWebUrl(update.darkLogoUrl)) throw new ApiError(400, 'Invalid dark logo URL');
  if (update.faviconUrl && !isWebUrl(update.faviconUrl)) throw new ApiError(400, 'Invalid favicon URL');
  for (const field of ['desktopImageUrl', 'mobileImageUrl']) {
    if (update.hero?.[field] && !isWebUrl(update.hero[field])) throw new ApiError(400, `Invalid hero.${field}`);
  }
  return update;
};

const publicSettings = (settings) => {
  const data = settings.toObject();
  delete data.updatedBy;
  delete data.__v;
  return data;
};

const getOrCreateSettings = () =>
  WebsiteSettings.findOneAndUpdate(
    { key: 'website' },
    { $setOnInsert: { key: 'website' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

export const getPublicWebsiteSettings = asyncHandler(async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.status(200).json(new ApiResponse(200, { settings: publicSettings(settings) }, 'Website settings fetched'));
});

export const getAdminWebsiteSettings = asyncHandler(async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.status(200).json(new ApiResponse(200, { settings: publicSettings(settings) }, 'Website settings fetched'));
});

export const updateWebsiteSettings = asyncHandler(async (req, res) => {
  const update = buildSettingsUpdate(req.body || {});
  const settings = await WebsiteSettings.findOneAndUpdate(
    { key: 'website' },
    { $set: { ...update, updatedBy: req.user._id }, $setOnInsert: { key: 'website' } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );
  res.status(200).json(new ApiResponse(200, { settings: publicSettings(settings) }, 'Website settings saved'));
});

export const uploadWebsiteAsset = asyncHandler(async (req, res) => {
  const { kind, dataUrl } = req.body || {};
  if (!allowedAssets[kind]) throw new ApiError(400, 'Unsupported website image type');
  const assetUrl = saveBase64Image(dataUrl, { subDir: 'website', maxBytes: 5 * 1024 * 1024 });
  res.status(201).json(new ApiResponse(201, { kind, assetUrl }, 'Website image uploaded'));
});