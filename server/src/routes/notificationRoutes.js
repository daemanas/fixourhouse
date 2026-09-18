import { Router } from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/index.js';

const router = Router();

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;