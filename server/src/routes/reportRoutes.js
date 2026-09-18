import { Router } from 'express';
import { createReport, getMyReports } from '../controllers/reportController.js';
import { protect } from '../middlewares/index.js';
import { validate } from '../middlewares/validate.js';
import { createReportValidator } from '../validators/reportValidator.js';

const router = Router();

router.use(protect);

router.post('/', validate(createReportValidator), createReport);
router.get('/me', getMyReports);

export default router;