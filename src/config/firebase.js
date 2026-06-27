const admin = require('firebase-admin');

// Ensure you have FIREBASE_SERVICE_ACCOUNT_PATH set in your .env file
// Alternatively, if you are running this in a GCP environment, you can use application default credentials.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase initialization error', error.stack);
  }
}

const db = admin.firestore();

module.exports = { admin, db };
