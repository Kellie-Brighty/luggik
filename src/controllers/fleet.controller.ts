import { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../config/firebase.js';

export const createRider = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, companyId, name, plateNumber, imageUrl } = req.body;

    if (!email || !password || !companyId || !name) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Create user in Firebase Auth
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });

    // Create a document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role: 'rider',
      companyId,
      plateNumber: plateNumber || '',
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      message: 'Rider created successfully',
      uid: userRecord.uid,
    });
  } catch (error: any) {
    console.error('Error creating rider:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getRiders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      res.status(400).json({ error: 'Missing companyId' });
      return;
    }

    const snapshot = await db.collection('users')
      .where('companyId', '==', companyId)
      .where('role', '==', 'rider')
      .get();
      
    const riders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ riders });
  } catch (error: any) {
    console.error('Error fetching riders:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateRider = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, password, companyId, plateNumber, imageUrl } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Missing rider ID' });
      return;
    }

    // Verify the rider belongs to the company
    const riderDoc = await db.collection('users').doc(id).get();
    if (!riderDoc.exists || riderDoc.data()?.companyId !== companyId) {
      res.status(403).json({ error: 'Unauthorized to update this rider' });
      return;
    }

    // Prepare updates
    const authUpdates: any = {};
    const dbUpdates: any = {};

    if (name) {
      authUpdates.displayName = name;
      dbUpdates.name = name;
    }

    if (plateNumber !== undefined) {
      dbUpdates.plateNumber = plateNumber;
    }

    if (imageUrl !== undefined) {
      dbUpdates.imageUrl = imageUrl;
    }

    if (password) {
      authUpdates.password = password;
    }

    // Update Firebase Auth if needed
    if (Object.keys(authUpdates).length > 0) {
      await getAuth().updateUser(id, authUpdates);
    }

    // Update Firestore if needed
    if (Object.keys(dbUpdates).length > 0) {
      await db.collection('users').doc(id).update(dbUpdates);
    }

    res.status(200).json({ message: 'Rider updated successfully' });
  } catch (error: any) {
    console.error('Error updating rider:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, baseAddress, baseLatitude, baseLongitude, baseFare, baseDistance, perKmRate, maxRadius } = req.body;

    if (!companyId) {
      res.status(400).json({ error: 'Missing companyId' });
      return;
    }

    // Prepare updates
    const updates: any = {
      pricingSettings: {
        baseAddress,
        baseLatitude,
        baseLongitude,
        baseFare,
        baseDistance,
        perKmRate,
        maxRadius
      }
    };

    await db.collection('users').doc(companyId).set(updates, { merge: true });

    res.status(200).json({ message: 'Pricing settings updated successfully' });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      res.status(400).json({ error: 'Missing companyId' });
      return;
    }

    const doc = await db.collection('users').doc(companyId as string).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const data = doc.data();
    res.status(200).json({ pricingSettings: data?.pricingSettings || null });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
};
