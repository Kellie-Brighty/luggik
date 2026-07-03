import { Router } from 'express';
import { recoverHistory } from '../controllers/buyer.controller.js';

const router = Router();

router.post('/recover', recoverHistory);

export default router;
