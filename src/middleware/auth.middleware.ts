import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../config/firebase.js';

// Extend Express Request to include our user payload
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Attach decoded token to request
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireKycApproval = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    const uid = req.user.uid;
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('uid', '==', uid).get();

    if (snapshot.empty) {
      return res.status(403).json({ error: 'Forbidden: User profile not found' });
    }

    const userData = snapshot.docs[0].data();

    // Check if Dojah verification is approved
    if (userData.kycStatus !== 'approved') {
      return res.status(403).json({ 
        error: 'Forbidden: KYC Verification Required',
        kycStatus: userData.kycStatus || 'pending'
      });
    }

    next();
  } catch (error) {
    console.error("KYC Middleware Error:", error);
    return res.status(500).json({ error: 'Internal Server Error during KYC check' });
  }
};
