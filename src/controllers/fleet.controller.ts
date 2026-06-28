import { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../config/firebase.js';

export const createRider = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, companyId, name } = req.body;

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
    const { name, password, companyId } = req.body;

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
