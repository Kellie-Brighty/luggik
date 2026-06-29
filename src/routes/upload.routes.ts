import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const response = await axios.post('https://api.hicity.me/upload', req.body, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Max body length infinity for large base64 images
      maxBodyLength: Infinity,
    });
    
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Upload proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Upload failed' });
  }
});

export default router;
