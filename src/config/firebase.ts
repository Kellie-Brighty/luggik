import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Ensure you have FIREBASE_SERVICE_ACCOUNT_PATH set in your .env file
// Alternatively, if you are running this in a GCP environment, you can use application default credentials.
if (!getApps().length) {
  try {
    initializeApp({
      credential: applicationDefault()
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase initialization error', error.stack);
  }
}

const db = getFirestore();
const messaging = getMessaging();

export { db, messaging };
