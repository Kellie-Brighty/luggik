import express from 'express';
import { registerCompanyProfile, getKycStatus, verifyKycManual } from '../controllers/kyc.controller.js';

const router = express.Router();

router.post('/register', registerCompanyProfile);
router.get('/status/:uid', getKycStatus);
router.post('/verify', verifyKycManual);

export default router;
