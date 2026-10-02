import { Router } from 'express';
import { getCountries, getStates, getDistricts, getCities } from '../controllers/locationController.js';

const router = Router();

// All location endpoints are public (no auth required) — the cascade
// selectors are used on registration, profile, and search pages.
router.get('/countries', getCountries);
router.get('/states', getStates);
router.get('/states/:countryId', getStates);
router.get('/districts', getDistricts);
router.get('/districts/:stateId', getDistricts);
router.get('/cities', getCities);
router.get('/cities/:districtId', getCities);

export default router;
