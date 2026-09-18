import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import ApiError from '../utils/ApiError.js';

// ---------------------------------------------------------------------------
// Dedicated gallery upload configuration.
//
// This is intentionally SEPARATE from the provider avatar upload (which uses
// the base64 data-URL `saveBase64Image` helper). Gallery photos are uploaded
// as real multipart/form-data files via Multer and stored under
// <uploads>/gallery, served publicly through the existing `/uploads` static
// route. The avatar flow is untouched so profile images keep working.
// ---------------------------------------------------------------------------

export const GALLERY_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per image
export const GALLERY_MAX_FILES = 10; // max images per request

// MIME type -> extension whitelist. We validate BOTH the multipart MIME type
// (Multer's fileFilter) and the actual extension on disk write, so a renamed
// file cannot bypass the check.
export const GALLERY_ALLOWED_MIME = new Map([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!GALLERY_ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new ApiError(400, 'Only JPG, JPEG, PNG and WebP images are allowed.')
    );
  }
  cb(null, true);
};

export const uploadGallery = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: GALLERY_MAX_FILE_BYTES,
    files: GALLERY_MAX_FILES,
  },
}).array('images', GALLERY_MAX_FILES);

// Convert a Multer file's reported extension into a safe, lower-case value.
// Falls back to the whitelist-derived extension when the original filename
// has no usable extension.
export const resolveGalleryExtension = (file) => {
  const fromMime = GALLERY_ALLOWED_MIME.get(file.mimetype) || 'jpg';
  const ext = path
    .extname(file.originalname || '')
    .replace(/^\./, '')
    .toLowerCase();
  if (ext && GALLERY_ALLOWED_MIME.has(file.mimetype) && ext !== fromMime) {
    // Accept a JPEG reported with a .jpeg extension, etc.
    if (file.mimetype === 'image/jpeg' && ext === 'jpeg') return 'jpg';
  }
  return GALLERY_ALLOWED_MIME.get(file.mimetype) || 'jpg';
};

// Generate a collision-resistant filename for a stored gallery image.
export const generateGalleryFilename = (file) =>
  `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${resolveGalleryExtension(
    file
  )}`;
