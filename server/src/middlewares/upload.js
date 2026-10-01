// import path from 'path';
// import crypto from 'crypto';
// import multer from 'multer';
// import ApiError from '../utils/ApiError.js';

// // ---------------------------------------------------------------------------
// // Dedicated gallery upload configuration.
// //
// // This is intentionally SEPARATE from the provider avatar upload (which uses
// // the base64 data-URL `saveBase64Image` helper). Gallery photos are uploaded
// // as real multipart/form-data files via Multer and stored under
// // <uploads>/gallery, served publicly through the existing `/uploads` static
// // route. The avatar flow is untouched so profile images keep working.
// // ---------------------------------------------------------------------------

// export const GALLERY_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per image
// export const GALLERY_MAX_FILES = 10; // max images per request

// // MIME type -> extension whitelist. We validate BOTH the multipart MIME type
// // (Multer's fileFilter) and the actual extension on disk write, so a renamed
// // file cannot bypass the check.
// export const GALLERY_ALLOWED_MIME = new Map([
//   ['image/jpeg', 'jpg'],
//   ['image/jpg', 'jpg'],
//   ['image/png', 'png'],
//   ['image/webp', 'webp'],
// ]);

// const storage = multer.memoryStorage();

// const fileFilter = (req, file, cb) => {
//   if (!GALLERY_ALLOWED_MIME.has(file.mimetype)) {
//     return cb(
//       new ApiError(400, 'Only JPG, JPEG, PNG and WebP images are allowed.')
//     );
//   }
//   cb(null, true);
// };

// export const uploadSingleImage = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: GALLERY_MAX_FILE_BYTES,
//   },
// }).single('image');

// export const uploadMultipleImages = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: GALLERY_MAX_FILE_BYTES,
//     files: GALLERY_MAX_FILES,
//   },
// }).array('photos', GALLERY_MAX_FILES);

// export const handleSingleUpload = (req, res, next) => {
//   uploadSingleImage(req, res, (err) => {
//     if (err) {
//       if (err instanceof ApiError) return next(err);
//       if (err.code === 'LIMIT_FILE_SIZE') {
//         return next(new ApiError(400, 'Image file must be 5 MB or smaller.'));
//       }
//       return next(new ApiError(400, err.message || 'Image upload failed.'));
//     }
//     next();
//   });
// };

// export const handleMultipleUpload = (req, res, next) => {
//   uploadMultipleImages(req, res, (err) => {
//     if (err) {
//       if (err instanceof ApiError) return next(err);
//       if (err.code === 'LIMIT_FILE_SIZE') {
//         return next(new ApiError(400, 'Each image must be 5 MB or smaller.'));
//       }
//       if (err.code === 'LIMIT_FILE_COUNT') {
//         return next(new ApiError(400, 'You can upload at most 10 photos at once.'));
//       }
//       return next(new ApiError(400, err.message || 'Photos upload failed.'));
//     }
//     next();
//   });
// };


// // Convert a Multer file's reported extension into a safe, lower-case value.
// // Falls back to the whitelist-derived extension when the original filename
// // has no usable extension.
// export const resolveGalleryExtension = (file) => {
//   const fromMime = GALLERY_ALLOWED_MIME.get(file.mimetype) || 'jpg';
//   const ext = path
//     .extname(file.originalname || '')
//     .replace(/^\./, '')
//     .toLowerCase();
//   if (ext && GALLERY_ALLOWED_MIME.has(file.mimetype) && ext !== fromMime) {
//     // Accept a JPEG reported with a .jpeg extension, etc.
//     if (file.mimetype === 'image/jpeg' && ext === 'jpeg') return 'jpg';
//   }
//   return GALLERY_ALLOWED_MIME.get(file.mimetype) || 'jpg';
// };

// // Generate a collision-resistant filename for a stored gallery image.
// export const generateGalleryFilename = (file) =>
//   `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${resolveGalleryExtension(
//     file
//   )}`;

import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import ApiError from '../utils/ApiError.js';

// ---------------------------------------------------------------------------
// Gallery upload configuration
// ---------------------------------------------------------------------------

export const GALLERY_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const GALLERY_MAX_FILES = 10; // max 10 images per request

// Allowed image MIME types
export const GALLERY_ALLOWED_MIME = new Map([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
]);

// Use memory storage.
// The controller/helper can later save the buffer wherever required.
const storage = multer.memoryStorage();

// ---------------------------------------------------------------------------
// File filter
// ---------------------------------------------------------------------------

const fileFilter = (req, file, cb) => {
  if (!GALLERY_ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new ApiError(
        400,
        'Only JPG, PNG, WebP, MP4 and WebM files are allowed.'
      )
    );
  }

  cb(null, true);
};

// ---------------------------------------------------------------------------
// Single image upload
// Field name: image
// ---------------------------------------------------------------------------

export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: GALLERY_MAX_FILE_BYTES,
  },
}).single('image');

// ---------------------------------------------------------------------------
// Multiple image upload
// Field name: photos
// Maximum: 10 images
// Maximum size: 5 MB per image
// ---------------------------------------------------------------------------

export const uploadMultipleImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: GALLERY_MAX_FILE_BYTES,
    files: GALLERY_MAX_FILES,
  },
}).array('photos', GALLERY_MAX_FILES);

// ---------------------------------------------------------------------------
// Gallery upload
//
// This alias fixes the import used by galleryRoutes.js:
//
// import { uploadGallery } from '../middlewares/upload.js';
//
// It uses the exact same configuration as uploadMultipleImages.
// ---------------------------------------------------------------------------

export const uploadGallery = uploadMultipleImages;

// ---------------------------------------------------------------------------
// Single upload error handler
// ---------------------------------------------------------------------------

export const handleSingleUpload = (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err) {
      if (err instanceof ApiError) {
        return next(err);
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new ApiError(
            400,
            'Image file must be 5 MB or smaller.'
          )
        );
      }

      return next(
        new ApiError(
          400,
          err.message || 'Image upload failed.'
        )
      );
    }

    next();
  });
};

// ---------------------------------------------------------------------------
// Multiple upload error handler
// ---------------------------------------------------------------------------

export const handleMultipleUpload = (req, res, next) => {
  uploadMultipleImages(req, res, (err) => {
    if (err) {
      if (err instanceof ApiError) {
        return next(err);
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new ApiError(
            400,
            'Each image must be 5 MB or smaller.'
          )
        );
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(
          new ApiError(
            400,
            'You can upload at most 10 photos at once.'
          )
        );
      }

      return next(
        new ApiError(
          400,
          err.message || 'Photos upload failed.'
        )
      );
    }

    next();
  });
};

// ---------------------------------------------------------------------------
// Resolve safe gallery image extension
// ---------------------------------------------------------------------------

export const resolveGalleryExtension = (file) => {
  const fromMime =
    GALLERY_ALLOWED_MIME.get(file.mimetype) || 'jpg';

  const ext = path
    .extname(file.originalname || '')
    .replace(/^\./, '')
    .toLowerCase();

  // JPEG may come as .jpeg while MIME is image/jpeg
  if (
    ext &&
    GALLERY_ALLOWED_MIME.has(file.mimetype) &&
    ext !== fromMime
  ) {
    if (
      file.mimetype === 'image/jpeg' &&
      ext === 'jpeg'
    ) {
      return 'jpg';
    }
  }

  return fromMime;
};

// ---------------------------------------------------------------------------
// Generate unique gallery filename
// ---------------------------------------------------------------------------

export const generateGalleryFilename = (file) =>
  `${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')}.${resolveGalleryExtension(file)}`;