import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export interface TrackingPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface Tracking {
  errandId: string;
  points: TrackingPoint[];
  updatedAt: FieldValue;
}

class TrackingModel {
  private collection = db.collection('tracking');

  async updateLocation(errandId: string, latitude: number, longitude: number): Promise<void> {
    const trackingRef = this.collection.doc(errandId);
    
    const newPoint = {
      latitude,
      longitude,
      timestamp: new Date()
    };

    // Use set with merge: true so we don't overwrite the whole document if it exists,
    // and we can append to the points array. For Firestore arrays, we use arrayUnion.
    await trackingRef.set({
      errandId,
      points: FieldValue.arrayUnion(newPoint),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async getLocationHistory(errandId: string): Promise<Tracking | null> {
    const doc = await this.collection.doc(errandId).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data() as Tracking;
  }
}

export const trackingModel = new TrackingModel();
