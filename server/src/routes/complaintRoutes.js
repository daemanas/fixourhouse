import { Router } from 'express';
import {
  createComplaint,
  getMyComplaints,
} from '../controllers/complaintController.js';
import { protect, authorize } from '../middlewares/index.js';
import { validate } from '../middlewares/validate.js';
import { createComplaintValidator } from '../validators/complaintValidator.js';

const router = Router();

// Every route here is customer-only.
router.use(protect, authorize('customer'));

// POST /api/v1/complaints        — file a new complaint
// GET  /api/v1/complaints/my     — list the customer's own complaints
router.post('/', validate(createComplaintValidator), createComplaint);
router.get('/my', getMyComplaints);

export default router;
