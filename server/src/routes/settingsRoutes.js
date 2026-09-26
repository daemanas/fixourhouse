import { Router } from 'express';
import { getPublicWebsiteSettings } from '../controllers/websiteSettingsController.js';

const router = Router();

router.get('/website', getPublicWebsiteSettings);

export default router;