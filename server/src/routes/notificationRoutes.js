import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  createTestNotification,
  markAsRead,
  markAllAsRead,
  clearMyNotifications,
  deleteNotification,
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/index.js';

const router = Router();

router.use(protect);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/test', createTestNotification);
router.patch('/read-all', markAllAsRead);
router.delete('/clear-all', clearMyNotifications);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;