import { Router } from 'express';
import { createRider, getRiders, updateRider } from '../controllers/fleet.controller.js';

const router = Router();

router.post('/riders', createRider);
router.get('/riders', getRiders);
router.patch('/riders/:id', updateRider);

export default router;
