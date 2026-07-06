import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export type ErrandState = 
  | 'CREATED'          // Errand is created, virtual account generated, awaiting funds
  | 'ESCROW_LOCKED'    // Funds have been successfully deposited via Nomba
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
  buyerName?: string;
  sellerName?: string;
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
  virtualAccount?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
  };
  trackingPin?: string;
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
    await this.syncPublicTracking(docRef.id);
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
    const snapshot = await this.collection.where('state', '==', 'ESCROW_LOCKED').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => doc.data() as Errand);
  }

  async updateErrandState(id: string, newState: ErrandState): Promise<void> {
    await this.collection.doc(id).update({
      state: newState,
      updatedAt: FieldValue.serverTimestamp()
    });
    await this.syncPublicTracking(id);
  }

  async assignRunner(id: string, runnerId: string, companyName?: string): Promise<void> {
    await this.collection.doc(id).update({
      runnerId: runnerId,
      ...(companyName && { runnerCompanyName: companyName }),
      state: 'ACCEPTED',
      updatedAt: FieldValue.serverTimestamp()
    });
    await this.syncPublicTracking(id);
  }

  async assignActualRider(id: string, riderName: string, plateNumber?: string, imageUrl?: string, actualRiderId?: string): Promise<void> {
    const updates: any = {
      actualRiderName: riderName,
      updatedAt: FieldValue.serverTimestamp()
    };
    if (actualRiderId) updates.actualRiderId = actualRiderId;
    if (plateNumber) updates.actualRiderPlateNumber = plateNumber;
    if (imageUrl) updates.actualRiderImageUrl = imageUrl;
    
    await this.collection.doc(id).update(updates);
    await this.syncPublicTracking(id);
  }

  async syncPublicTracking(id: string): Promise<void> {
    const errand = await this.getErrand(id);
    if (!errand) return;
    
    await db.collection('public_tracking').doc(id).set({
      id,
      state: errand.state,
      itemName: errand.itemName,
      pickupLocation: errand.pickupLocation,
      priceAmount: errand.priceAmount,
      actualRiderName: errand.actualRiderName || null,
      actualRiderPlateNumber: errand.actualRiderPlateNumber || null,
      actualRiderImageUrl: errand.actualRiderImageUrl || null,
      runnerCompanyName: errand.runnerCompanyName || null,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }
}

export const errandModel = new ErrandModel();
