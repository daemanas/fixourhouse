import { Router } from 'express';
import {
  createReview,
  getProviderReviews,
  getMyProviderReviews,
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middlewares/index.js';
import { validate } from '../middlewares/validate.js';
import { createReviewValidator } from '../validators/reviewValidator.js';

const router = Router();

// Public
router.get('/provider/:providerId', getProviderReviews);

// Private
router.get('/me', protect, authorize('provider'), getMyProviderReviews);
router.post('/', protect, authorize('customer'), validate(createReviewValidator), createReview);

export default router;