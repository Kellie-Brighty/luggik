import { Request, Response } from 'express';
import { buyerModel } from '../models/buyerModel.js';
import { db } from '../config/firebase.js';

export const recoverHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const { phoneNumber, masterPin } = req.body;

    if (!phoneNumber || !masterPin) {
      return res.status(400).json({ error: 'Phone number and Master PIN are required' });
    }

    const isValid = await buyerModel.verifyMasterPin(phoneNumber, masterPin);
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid Phone Number or Master PIN' });
    }

    // Query all errands for this buyer
    const snapshot = await db.collection('errands').where('buyerPhone', '==', phoneNumber).orderBy('createdAt', 'desc').get();
    const errandIds = snapshot.docs.map(doc => doc.id);

    return res.status(200).json({ message: 'History recovered successfully', errandIds });
  } catch (error) {
    console.error('Error recovering history:', error);
    return res.status(500).json({ error: 'Failed to recover history' });
  }
};
