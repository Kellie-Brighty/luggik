import express from 'express';
import { getBanks, lookupAccount } from '../controllers/bank.controller.js';

const router = express.Router();

router.get('/', getBanks);
router.post('/lookup', lookupAccount);

export default router;
