import { Router } from 'express';
import {
  getStats,
  getAnalytics,
  getUsers,
  getCustomers,
  getCustomerDetail,
  updateCustomerStatus,
  getProviders,
  updateProviderStatus,
  updateUserStatus,
  deleteUser,
  getBookings,
  getBookingDetail,
  getReports,
  updateReportStatus,
  getReviews,
  updateReview,
  getRevenue,
} from '../controllers/adminController.js';
import {
  getComplaints,
  getComplaintStats,
  getComplaintById,
  updateComplaint,
} from '../controllers/complaintController.js';
import {
  getAdminProviderDetail,
  updateProviderDocumentStatus,
} from '../controllers/providerController.js';
import { protect, authorize } from '../middlewares/index.js';
import { validate } from '../middlewares/validate.js';
import { updateComplaintValidator } from '../validators/complaintValidator.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/analytics', getAnalytics);
router.get('/revenue', getRevenue);

router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerDetail);
router.patch('/customers/:id/status', updateCustomerStatus);

router.get('/providers', getProviders);
router.get('/providers/:id', getAdminProviderDetail);
router.patch('/providers/:id/documents/:docId', updateProviderDocumentStatus);
router.patch('/providers/:id/status', updateProviderStatus);

router.get('/bookings', getBookings);
router.get('/bookings/:bookingId', getBookingDetail);

router.get('/reports', getReports);
router.patch('/reports/:id/status', updateReportStatus);

router.get('/complaints', getComplaints);
router.get('/complaints/stats', getComplaintStats);
router.get('/complaints/:id', getComplaintById);
router.patch('/complaints/:id', validate(updateComplaintValidator), updateComplaint);

router.get('/reviews', getReviews);
router.patch('/reviews/:id', updateReview);

export default router;