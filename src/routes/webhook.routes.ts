import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/firebase.js'; // Assuming firebase admin db is exported from here
import { emailService } from '../services/email.service.js';


const router = express.Router();

const NOMBA_WEBHOOK_SECRET = 'NombaHackathon2026';

function generateSignature(payload: any, secret: string, timeStamp: string): string {
  const requestPayload = payload;
  const data = requestPayload.data || {};
  const merchant = data.merchant || {};
  const transaction = data.transaction || {};

  const eventType = requestPayload.event_type || "";
  const requestId = requestPayload.requestId || "";
  const userId = merchant.userId || "";
  const walletId = merchant.walletId || "";
  const transactionId = transaction.transactionId || "";
  const transactionType = transaction.type || "";
  const transactionTime = transaction.time || "";
  let transactionResponseCode = transaction.responseCode || "";

  if (transactionResponseCode === "null") {
      transactionResponseCode = "";
  }

  const hashingPayload = `${eventType}:${requestId}:${userId}:${walletId}:${transactionId}:${transactionType}:${transactionTime}:${transactionResponseCode}:${timeStamp}`;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(hashingPayload);
  return hmac.digest("base64");
}

router.post('/nomba', express.json(), (req: Request, res: Response): any => {
  console.log("--- INCOMING WEBHOOK ---");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  const nombaSignature = req.headers['nomba-signature'] as string;
  const nombaTimestamp = req.headers['nomba-timestamp'] as string;

  const payload = req.body;
  
  if (!nombaSignature) {
    console.warn("Missing Nomba signature in headers!");
    return res.status(200).send('Webhook Received (No Signature)');
  }

  const computedSignature = generateSignature(payload, NOMBA_WEBHOOK_SECRET, nombaTimestamp || "");

  if (computedSignature !== nombaSignature) {
    console.warn("Webhook Signature Verification Failed!");
    console.warn("Expected:", computedSignature);
    console.warn("Received:", nombaSignature);
  } else {
    console.log("Webhook Signature Verified Successfully!");
  }

  console.log("Nomba Webhook Received:", payload.event_type);

  // Process event here (e.g., payment_success)
  
  res.status(200).send('Webhook Received');
});

// Dojah Webhook Route
router.post('/dojah', express.json(), async (req: Request, res: Response): Promise<any> => {
  console.log("--- INCOMING DOJAH WEBHOOK ---");
  const signature = req.headers['x-dojah-signature'];
  const payload = req.body;

  console.log("Signature:", signature);
  console.log("Body:", payload);

  // In production, you would verify the HMAC signature here using your Dojah Secret Key
  // const hmac = crypto.createHmac('sha512', process.env.DOJAH_PRIVATE_KEY);
  // const expectedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  // if (signature !== expectedSignature) return res.status(401).send('Invalid signature');

  try {
    // Dojah webhook payload is flat (no entity wrapper)
    // Extract the status and the custom metadata we pass from the frontend widget
    const { status, metadata } = payload;
    
    // Only proceed if verification was successful
    if (status === true || payload.verification_status === 'Completed' || status === 'successful') {
      const uid = metadata?.uid;
      if (uid) {
        // Find the user's profile and update kycStatus
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('uid', '==', uid).get();
        
        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
          const userData = snapshot.docs[0].data();
          await usersRef.doc(docId).update({
            kycStatus: 'approved',
            kycVerifiedAt: new Date().toISOString(),
            dojahWebhookPayload: payload // Store full payload including address for errand assignment
          });
          console.log(`Successfully verified Dojah KYC for user ${uid}`);

          // Send Onboarding Success / KYC Approval Email
          if (userData.email) {
            const companyName = userData.companyName || userData.name || 'Logistics Partner';
            emailService.sendKycApprovalMail(userData.email, companyName).catch(err => {
              console.error("Failed to send KYC approval email:", err);
            });
          }
        } else {
          console.warn(`Dojah webhook matched no user for uid ${uid}`);
        }
      }
    }
  } catch (error) {
    console.error("Error processing Dojah webhook:", error);
  }

  // Always return 200 OK to Dojah so they stop retrying
  res.status(200).send('Webhook Received');
});

export default router;
