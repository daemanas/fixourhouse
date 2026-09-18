import { Router } from 'express';
import {
  getProviders,
  getProviderById,
  createProvider,
  getMyProviderProfile,
  updateMyProviderProfile,
  getProviderSettings,
  updateProviderSettings,
  deactivateMyAccount,
  deleteMyAccount,
  addServices,
  updateService,
  deleteService,
  updateAvailability,
  getMyAvailability,
  addAvailabilityDay,
  updateAvailabilityDay,
  deleteAvailabilityDay,
  getProviderStats,
  getProviderEarnings,
} from '../controllers/providerController.js';
import {
  getMyProviderComplaints,
  respondToComplaint,
} from '../controllers/complaintController.js';
import { protect, authorize } from '../middlewares/index.js';
import { validate } from '../middlewares/validate.js';
import {
  createProviderValidator,
  updateProviderValidator,
  providerSettingsValidator,
  addServiceValidator,
  updateServiceValidator,
  availabilityValidator,
  addAvailabilityDayValidator,
  updateAvailabilityDayValidator,
  deleteAvailabilityDayValidator,
} from '../validators/providerValidator.js';

const router = Router();

// Public routes
router.get('/', getProviders);
router.get('/:id', getProviderById);

// Private routes
router.use(protect);

router.get('/me/profile', authorize('provider'), getMyProviderProfile);
router.get('/me/settings', authorize('provider'), getProviderSettings);
router.patch('/me/settings', authorize('provider'), validate(providerSettingsValidator), updateProviderSettings);
router.patch('/me/deactivate', authorize('provider'), deactivateMyAccount);
router.delete('/me', authorize('provider'), deleteMyAccount);
router.get('/me/stats', authorize('provider'), getProviderStats);
router.get('/me/earnings', authorize('provider'), getProviderEarnings);
router.patch('/me/profile', authorize('provider'), validate(updateProviderValidator), updateMyProviderProfile);
router.post('/me/services', authorize('provider'), validate(addServiceValidator), addServices);
router.patch('/me/services/:serviceId', authorize('provider'), validate(updateServiceValidator), updateService);
router.delete('/me/services/:serviceId', authorize('provider'), deleteService);
router.patch('/me/availability', authorize('provider'), validate(availabilityValidator), updateAvailability);
router.get('/me/availability', authorize('provider'), getMyAvailability);
router.post('/me/availability', authorize('provider'), validate(addAvailabilityDayValidator), addAvailabilityDay);
router.put('/me/availability/:day', authorize('provider'), validate(updateAvailabilityDayValidator), updateAvailabilityDay);
router.delete('/me/availability/:day', authorize('provider'), validate(deleteAvailabilityDayValidator), deleteAvailabilityDay);
router.post('/', authorize('customer', 'provider'), validate(createProviderValidator), createProvider);

// Complaints filed against this provider
router.get('/me/complaints', authorize('provider'), getMyProviderComplaints);
router.post('/me/complaints/:id/respond', authorize('provider'), respondToComplaint);

export default router;