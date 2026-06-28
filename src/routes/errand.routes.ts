import express from 'express';
import { createErrand, getErrand, acceptErrand, updateErrandState, getAvailableErrands, startErrand, getQuotes } from '../controllers/errand.controller.js';

const router = express.Router();

router.post('/', createErrand);
router.post('/quotes', getQuotes);
router.get('/available', getAvailableErrands);
router.get('/:id', getErrand);
router.post('/:id/accept', acceptErrand);
router.post('/:id/start', startErrand);
router.post('/:id/state', updateErrandState);

export default router;
