import express from 'express';
import { createErrand, getErrand, acceptErrand, updateErrandState, getAvailableErrands, startErrand, getQuotes, cancelErrand, nombaWebhook, verifyTracking } from '../controllers/errand.controller.js';

const router = express.Router();

router.post('/', createErrand);
router.post('/webhook/nomba', nombaWebhook);
router.post('/quotes', getQuotes);
router.get('/available', getAvailableErrands);
router.get('/:id', getErrand);
router.post('/:id/accept', acceptErrand);
router.post('/:id/start', startErrand);
router.post('/:id/state', updateErrandState);
router.post('/:id/cancel', cancelErrand);
router.post('/:id/verify-tracking', verifyTracking);

export default router;
