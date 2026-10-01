import Provider from '../models/Provider.js';
import Gallery from '../models/Gallery.js';
import CompletedServicePhoto from '../models/CompletedServicePhoto.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { saveGalleryFile, deleteGalleryFile } from '../utils/galleryUpload.js';

// Resolve the authenticated user's Provider record from the session only.
// providerId is NEVER taken from the request body/params — it is always
// derived from req.user (set by the `protect` middleware).
//
// NOTE: This is a plain async helper (NOT wrapped in asyncHandler). It RETURNs
// the provider document so callers can use `await getOwnProvider(req)`. Wrapping
// it in asyncHandler would turn it into an Express middleware signature
// (req, res, next) and `await getOwnProvider(req)` would resolve to `undefined`
// instead of the provider — which crashes the controller with
// "Cannot read properties of undefined (reading '_id')".
const getOwnProvider = async (req) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }
  return provider;
};

const GALLERY_CATEGORIES = ['work_photos', 'before_after', 'tools_equipment', 'others'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

const validateGalleryFiles = (files) => {
  for (const file of files) {
    const isVideo = file.mimetype.startsWith('video/');
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      throw new ApiError(400, 'Videos must be 25 MB or smaller.');
    }
    if (!isVideo && file.size > MAX_IMAGE_BYTES) {
      throw new ApiError(400, 'Images must be 5 MB or smaller.');
    }
  }
};

// @desc    Get all gallery images for the logged-in provider
// @route   GET /api/v1/provider/gallery
// @access  Private (Provider)
export const getMyGallery = asyncHandler(async (req, res) => {
  const provider = await getOwnProvider(req);

  const [images, completedJobs] = await Promise.all([
    Gallery.find({ providerId: provider._id }).sort({ createdAt: -1 }).lean(),
    CompletedServicePhoto.find({ providerId: provider._id })
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(200, {
        images: images.map((image) => ({ ...image, sourceType: 'provider_gallery' })),
        completedJobs: completedJobs.map((photo) => ({ ...photo, sourceType: 'completed_job' })),
      }, 'Gallery fetched successfully')
    );
});

// @desc    Upload one or multiple gallery images for the logged-in provider
// @route   POST /api/v1/provider/gallery
// @access  Private (Provider)
// @body    multipart/form-data, field name "images" (one or many files)
export const uploadGalleryImages = asyncHandler(async (req, res) => {
  const provider = await getOwnProvider(req);

  const files = req.files;
  if (!Array.isArray(files) || files.length === 0) {
    throw new ApiError(400, 'Please select at least one media file to upload.');
  }
  const category = req.body.category || 'work_photos';
  if (!GALLERY_CATEGORIES.includes(category)) {
    throw new ApiError(400, 'Invalid gallery category.');
  }
  validateGalleryFiles(files);
  if (category === 'before_after' && (
    files.length !== 2 || files.some((file) => !file.mimetype.startsWith('image/'))
  )) {
    throw new ApiError(400, 'Before & After requires exactly two images.');
  }

  const created = [];
  if (category === 'before_after') {
    const [beforeImageUrl, afterImageUrl] = files.map(saveGalleryFile);
    const record = await Gallery.create({
      providerId: provider._id,
      imageUrl: beforeImageUrl,
      beforeImageUrl,
      afterImageUrl,
      originalName: `${files[0].originalname || 'Before'} / ${files[1].originalname || 'After'}`,
      mediaType: 'image',
      category,
    });
    created.push(record);
  } else {
    for (const file of files) {
      const imageUrl = saveGalleryFile(file);
      const record = await Gallery.create({
        providerId: provider._id,
        imageUrl,
        originalName: file.originalname || '',
        mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
        category,
      });
      created.push(record);
    }
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { images: created.map((image) => ({ ...image.toObject(), sourceType: 'provider_gallery' })) },
        'Media uploaded successfully.'
      )
    );
});

// @desc    Update category or featured status for the logged-in provider's media
// @route   PATCH /api/v1/provider/gallery/:id
// @access  Private (Provider)
export const updateGalleryImage = asyncHandler(async (req, res) => {
  const provider = await getOwnProvider(req);
  const image = await Gallery.findOne({ _id: req.params.id, providerId: provider._id });
  if (!image) throw new ApiError(404, 'Gallery media not found.');

  if (req.body.category !== undefined) {
    if (!GALLERY_CATEGORIES.includes(req.body.category)) {
      throw new ApiError(400, 'Invalid gallery category.');
    }
    if (image.beforeImageUrl && req.body.category !== 'before_after') {
      throw new ApiError(400, 'Before & After items must keep their category.');
    }
    image.category = req.body.category;
  }
  if (req.body.isFeatured !== undefined) {
    if (typeof req.body.isFeatured !== 'boolean') {
      throw new ApiError(400, 'Featured status must be true or false.');
    }
    if (req.body.isFeatured) {
      await Gallery.updateMany(
        { providerId: provider._id, _id: { $ne: image._id } },
        { $set: { isFeatured: false } }
      );
    }
    image.isFeatured = req.body.isFeatured;
  }

  await image.save();
  res.status(200).json(
    new ApiResponse(200, { image: { ...image.toObject(), sourceType: 'provider_gallery' } }, 'Gallery media updated.')
  );
});

// @desc    Delete a specific gallery image belonging to the logged-in provider
// @route   DELETE /api/v1/provider/gallery/:id
// @access  Private (Provider)
export const deleteGalleryImage = asyncHandler(async (req, res) => {
  const provider = await getOwnProvider(req);

  const image = await Gallery.findOne({
    _id: req.params.id,
    providerId: provider._id, // enforce ownership
  });

  if (!image) {
    throw new ApiError(404, 'Photo not found.');
  }

  // Remove the actual file from storage before dropping the DB record.
  [...new Set([image.imageUrl, image.beforeImageUrl, image.afterImageUrl].filter(Boolean))]
    .forEach(deleteGalleryFile);
  await image.deleteOne();

  res
    .status(200)
    .json(new ApiResponse(200, {}, 'Photo deleted successfully.'));
});
