import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import providerRoutes from './providerRoutes.js';
import serviceRoutes from './serviceRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import reportRoutes from './reportRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import adminRoutes from './adminRoutes.js';
import complaintRoutes from './complaintRoutes.js';
import withdrawalRoutes from './withdrawalRoutes.js';
import galleryRoutes from './galleryRoutes.js';
import locationRoutes from './locationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/providers', providerRoutes);
router.use('/services', serviceRoutes);
router.use('/categories', categoryRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/provider/gallery', galleryRoutes);
router.use('/admin', adminRoutes);
router.use('/complaints', complaintRoutes);
router.use('/locations', locationRoutes);

export default router;