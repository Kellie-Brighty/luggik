import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export type ErrandState = 
  | 'CREATED'          // Errand is created, funds are locked in Nomba
  | 'ACCEPTED'         // Runner accepts the errand
  | 'PENDING_VERIFICATION' // Runner is at vendor, waiting for buyer approval via chat
  | 'REJECTED_BY_BUYER'    // Buyer rejects the item, errand cancelled, partial refund
  | 'ITEM_VERIFIED'    // Runner physically verifies the item at seller's shop
  | 'IN_PROGRESS'      // Runner is moving to the buyer
  | 'DELIVERED'        // Buyer receives the item, Nomba funds released
  | 'DISPUTED'         // Quality issue or delivery failure
  | 'CANCELLED';       // Errand cancelled before execution

export interface ErrandMetadata {
  color?: string;
  size?: string;
  weight?: string;
  description?: string;
  referenceImageUrl?: string;
  [key: string]: any;
}

export interface Location {
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface Errand {
  id?: string;
  buyerId: string;
  sellerId: string;
  runnerId?: string | null;
  itemName: string;
  priceAmount: number;
  deliveryFee: number;
  currency: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  buyerPhone: string;
  sellerPhone: string;
  buyerEmail?: string;
  sellerEmail?: string;
  runnerEmail?: string;
  runnerCompanyName?: string;
  actualRiderName?: string;
  actualRiderPlateNumber?: string;
  actualRiderImageUrl?: string;
  metadata?: ErrandMetadata;
  state: ErrandState;
  nombaTransactionRef?: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export class ErrandModel {
  private collection = db.collection('errands');

  async createErrand(errandData: Omit<Errand, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = this.collection.doc();
    const newErrand: Errand = {
      ...errandData,
      id: docRef.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    await docRef.set(newErrand);
    return docRef.id;
  }

  async getErrand(id: string): Promise<Errand | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data() as Errand;
  }

  async getAvailableErrands(): Promise<Errand[]> {
    const snapshot = await this.collection.where('state', '==', 'CREATED').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => doc.data() as Errand);
  }

  async updateErrandState(id: string, newState: ErrandState): Promise<void> {
    await this.collection.doc(id).update({
      state: newState,
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  async assignRunner(id: string, runnerId: string, companyName?: string): Promise<void> {
    await this.collection.doc(id).update({
      runnerId: runnerId,
      ...(companyName && { runnerCompanyName: companyName }),
      state: 'ACCEPTED',
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  async assignActualRider(id: string, riderName: string, plateNumber?: string, imageUrl?: string): Promise<void> {
    const updates: any = {
      actualRiderName: riderName,
      updatedAt: FieldValue.serverTimestamp()
    };
    if (plateNumber) updates.actualRiderPlateNumber = plateNumber;
    if (imageUrl) updates.actualRiderImageUrl = imageUrl;
    
    await this.collection.doc(id).update(updates);
  }
}

export const errandModel = new ErrandModel();
