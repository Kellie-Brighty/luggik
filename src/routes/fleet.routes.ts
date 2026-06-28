import { Router } from 'express';
import { createRider, getRiders, updateRider, updateSettings, getSettings } from '../controllers/fleet.controller.js';

const router = Router();

router.post('/riders', createRider);
router.get('/riders', getRiders);
router.patch('/riders/:id', updateRider);
router.patch('/settings', updateSettings);
router.get('/settings', getSettings);

export default router;
