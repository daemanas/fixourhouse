import { Router } from 'express';
import { getServiceTypes, getServiceTypeById } from '../controllers/serviceTypeController.js';

const router = Router();

router.get('/', getServiceTypes);
router.get('/:id', getServiceTypeById);

export default router;
