import { Router } from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  clearMyNotifications,
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/index.js';

const router = Router();

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.delete('/clear-all', clearMyNotifications);
router.patch('/:id/read', markAsRead);

export default router;