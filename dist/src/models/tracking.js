import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
class TrackingModel {
    collection = db.collection('tracking');
    async updateLocation(errandId, latitude, longitude) {
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
    async getLocationHistory(errandId) {
        const doc = await this.collection.doc(errandId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data();
    }
}
export const trackingModel = new TrackingModel();
