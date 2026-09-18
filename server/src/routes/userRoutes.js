import { Router } from 'express';
import {
  updateMyProfile,
  changePassword,
  getWishlist,
  toggleWishlist,
} from '../controllers/userController.js';
import { protect } from '../middlewares/index.js';

const router = Router();

router.use(protect);

router.patch('/me', updateMyProfile);
router.patch('/me/password', changePassword);
router.get('/me/wishlist', getWishlist);
router.post('/me/wishlist/:providerId', toggleWishlist);

export default router;
