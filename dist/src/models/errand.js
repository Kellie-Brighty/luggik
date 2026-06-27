import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
export class ErrandModel {
    collection = db.collection('errands');
    async createErrand(errandData) {
        const docRef = this.collection.doc();
        const newErrand = {
            ...errandData,
            id: docRef.id,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };
        await docRef.set(newErrand);
        return docRef.id;
    }
    async getErrand(id) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data();
    }
    async updateErrandState(id, newState) {
        await this.collection.doc(id).update({
            state: newState,
            updatedAt: FieldValue.serverTimestamp()
        });
    }
    async assignRunner(id, runnerId) {
        await this.collection.doc(id).update({
            runnerId: runnerId,
            state: 'ACCEPTED',
            updatedAt: FieldValue.serverTimestamp()
        });
    }
}
export const errandModel = new ErrandModel();
