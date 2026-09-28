import { Router } from 'express';
import {
  getStats,
  getAnalytics,
  getLocationAnalytics,
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
import {
  getAdminWebsiteSettings,
  updateWebsiteSettings,
  uploadWebsiteAsset,
} from '../controllers/websiteSettingsController.js';
import {
  getCommissionSettings,
  updateDefaultCommission,
  createCommissionOffer,
  updateCommissionOffer,
  deleteCommissionOffer,
} from '../controllers/commissionController.js';
import {
  createServiceType,
  updateServiceType,
} from '../controllers/serviceTypeController.js';
import {
  createCategory,
  updateCategory,
} from '../controllers/categoryController.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/analytics', getAnalytics);
router.get('/analytics/locations', getLocationAnalytics);
router.get('/revenue', getRevenue);

router.get('/settings/website', getAdminWebsiteSettings);
router.put('/settings/website', updateWebsiteSettings);
router.post('/settings/website/assets', uploadWebsiteAsset);
router.get('/settings/commission', getCommissionSettings);
router.put('/settings/commission', updateDefaultCommission);
router.post('/settings/commission/offers', createCommissionOffer);
router.patch('/settings/commission/offers/:id', updateCommissionOffer);
router.delete('/settings/commission/offers/:id', deleteCommissionOffer);

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
router.patch('/providers/:id/verification', updateProviderStatus);

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

// Service Type & Category Management
router.post('/service-types', createServiceType);
router.patch('/service-types/:id', updateServiceType);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);

export default router;