import { Router } from 'express';
import {
  getMyGallery,
  uploadGalleryImages,
  deleteGalleryImage,
} from '../controllers/galleryController.js';
import { protect, authorize } from '../middlewares/index.js';
import { uploadGallery } from '../middlewares/upload.js';
import ApiError from '../utils/ApiError.js';

const router = Router();

// Multer parses multipart/form-data. On a Multer error (wrong type, too large,
// too many files) it throws before our controller runs — wrap it so the client
// gets a friendly message instead of a raw 500.
const handleUpload = (req, res, next) => {
  uploadGallery(req, res, (err) => {
    if (err) {
      if (err instanceof ApiError) return next(err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, 'Each image must be 5 MB or smaller.'));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(new ApiError(400, 'You can upload at most 10 images at once.'));
      }
      return next(new ApiError(400, err.message || 'Image upload failed.'));
    }
    next();
  });
};

// All gallery routes require an authenticated provider.
router.use(protect);
router.use(authorize('provider'));

router.get('/', getMyGallery);
router.post('/', handleUpload, uploadGalleryImages);
router.delete('/:id', deleteGalleryImage);

export default router;
