import { Router } from 'express';
import { updateLocation, getLocation } from '../controllers/tracking.controller.js';

const router = Router();

// Route for runners to push their GPS coordinates
router.post('/:errandId', updateLocation);

// Route for buyers to poll/fetch the runner's current GPS and history
router.get('/:errandId', getLocation);

export default router;
