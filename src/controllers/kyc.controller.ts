import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const registerCompanyProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const { uid, email, companyName } = req.body;
    
    if (!uid || !companyName) {
      return res.status(400).json({ error: 'uid and companyName are required' });
    }

    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      uid,
      email,
      companyName,
      kycStatus: 'pending',
      role: 'dispatcher',
      createdAt: new Date().toISOString()
    }, { merge: true });

    return res.status(200).json({ message: 'Profile created successfully' });
  } catch (error) {
    console.error('Error in registerCompanyProfile:', error);
    return res.status(500).json({ error: 'Failed to create profile' });
  }
};

export const getKycStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const userRef = db.collection('users').doc(uid as string);
    let doc = await userRef.get();

    if (!doc.exists) {
      // Fallback: search by uid field in case doc ID doesn't match the Firebase Auth UID
      const snapshot = await db.collection('users').where('uid', '==', uid).limit(1).get();
      if (!snapshot.empty) {
        doc = snapshot.docs[0] as any;
      } else {
        return res.status(404).json({ error: 'User profile not found', kycStatus: 'missing' });
      }
    }

    const data = doc.data();
    return res.status(200).json({
      kycStatus: data?.kycStatus || 'pending',
      companyName: data?.companyName || '',
      role: data?.role || 'dispatcher',
      companyId: data?.companyId || null,
      name: data?.name || ''
    });
  } catch (error) {
    console.error('Error in getKycStatus:', error);
    return res.status(500).json({ error: 'Failed to get KYC status' });
  }
};

export const verifyKycManual = async (req: Request, res: Response): Promise<any> => {
  // This is a manual trigger endpoint used by the frontend to optimistically update.
  // The webhook is the true source of truth.
  try {
    const { uid, dojahResponse } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      kycStatus: 'approved',
      kycVerifiedAt: new Date().toISOString(),
      dojahMetadata: dojahResponse
    }, { merge: true });

    return res.status(200).json({ message: 'KYC verified manually' });
  } catch (error) {
    console.error('Error in verifyKycManual:', error);
    return res.status(500).json({ error: 'Failed to verify KYC' });
  }
};
