import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export interface Buyer {
  phoneNumber: string;
  masterPin: string;
  createdAt: FieldValue;
}

export class BuyerModel {
  private collection = db.collection('buyers');

  async getOrCreateBuyer(phoneNumber: string): Promise<{ masterPin: string; isNew: boolean }> {
    const docRef = this.collection.doc(phoneNumber);
    const doc = await docRef.get();
    
    if (doc.exists) {
      return { masterPin: doc.data()?.masterPin, isNew: false };
    }

    const newMasterPin = Math.floor(1000 + Math.random() * 9000).toString();
    const newBuyer: Buyer = {
      phoneNumber,
      masterPin: newMasterPin,
      createdAt: FieldValue.serverTimestamp()
    };
    
    await docRef.set(newBuyer);
    return { masterPin: newMasterPin, isNew: true };
  }

  async verifyMasterPin(phoneNumber: string, masterPin: string): Promise<boolean> {
    const docRef = this.collection.doc(phoneNumber);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    return doc.data()?.masterPin === masterPin;
  }
}

export const buyerModel = new BuyerModel();
