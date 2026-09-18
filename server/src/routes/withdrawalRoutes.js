import { Router } from 'express';
import {
  createWithdrawal,
  getMyWithdrawals,
} from '../controllers/withdrawalController.js';
import { protect, authorize } from '../middlewares/index.js';
import { validate } from '../middlewares/validate.js';
import { createWithdrawalValidator } from '../validators/withdrawalValidator.js';

const router = Router();

router.use(protect);

router.get('/me', authorize('provider'), getMyWithdrawals);
router.post('/me', authorize('provider'), validate(createWithdrawalValidator), createWithdrawal);

export default router;
