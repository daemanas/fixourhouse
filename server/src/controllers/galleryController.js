import Provider from '../models/Provider.js';
import Gallery from '../models/Gallery.js';
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

// @desc    Get all gallery images for the logged-in provider
// @route   GET /api/v1/provider/gallery
// @access  Private (Provider)
export const getMyGallery = asyncHandler(async (req, res) => {
  const provider = await getOwnProvider(req);

  const images = await Gallery.find({ providerId: provider._id }).sort({
    createdAt: -1,
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, { images }, 'Gallery fetched successfully')
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
    throw new ApiError(400, 'Please select at least one image to upload.');
  }

  // Persist each file and build gallery records. If any write fails we still
  // return what succeeded, but errors are surfaced via the catch in asyncHandler.
  const created = [];
  for (const file of files) {
    const imageUrl = saveGalleryFile(file);
    const record = await Gallery.create({
      providerId: provider._id,
      imageUrl,
      originalName: file.originalname || '',
    });
    created.push(record);
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { images: created },
        'Photos uploaded successfully.'
      )
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
  deleteGalleryFile(image.imageUrl);
  await image.deleteOne();

  res
    .status(200)
    .json(new ApiResponse(200, {}, 'Photo deleted successfully.'));
});
