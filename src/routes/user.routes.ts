import { Router, Request, Response } from 'express';
import { db } from '../config/firebase.js';

const router = Router();

router.post('/fcm-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, token } = req.body;
    if (!uid || !token) {
      res.status(400).json({ error: 'uid and token are required' });
      return;
    }

    // Determine which collection the user is in. For Luggik, users can be in 'buyers', 'companies', or 'riders'.
    // We will save it in a global 'fcm_tokens' collection or directly on the user doc.
    // Saving it on the user doc requires knowing their role. We'll just save it in a central 'fcm_tokens' collection keyed by uid.
    
    await db.collection('fcm_tokens').doc(uid).set({
      token,
      updatedAt: new Date()
    }, { merge: true });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
});

export default router;
