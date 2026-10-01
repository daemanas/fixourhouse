import { Router } from 'express';
import { getServices, getServiceById, getServiceReviews } from '../controllers/serviceController.js';

const router = Router();

router.get('/', getServices);
router.get('/:id/reviews', getServiceReviews);
router.get('/:id', getServiceById);

export default router;