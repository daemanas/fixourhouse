import { Router } from 'express';
import {
  uploadCompletedServicePhotos,
  getCompletedServicePhotos,
} from '../controllers/completedPhotoController.js';
import { protect, authorize } from '../middlewares/index.js';
import { handleMultipleUpload } from '../middlewares/upload.js';

const router = Router();

router.get('/', getCompletedServicePhotos);
router.post('/', protect, authorize('provider'), handleMultipleUpload, uploadCompletedServicePhotos);

export default router;

