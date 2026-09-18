import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middlewares/index.js';
import { validate } from '../middlewares/validate.js';
import {
  createBookingValidator,
  updateBookingStatusValidator,
} from '../validators/bookingValidator.js';

const router = Router();

router.use(protect);

router.post('/', authorize('customer'), validate(createBookingValidator), createBooking);
router.get('/me', getMyBookings);
router.get('/:id', getBookingById);
router.patch('/:id/status', validate(updateBookingStatusValidator), updateBookingStatus);

export default router;