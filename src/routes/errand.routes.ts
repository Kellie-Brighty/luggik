import express from 'express';
import { createErrand, getErrand, acceptErrand, updateErrandState } from '../controllers/errand.controller.js';

const router = express.Router();

router.post('/', createErrand);
router.get('/:id', getErrand);
router.post('/:id/accept', acceptErrand);
router.post('/:id/state', updateErrandState);

export default router;
