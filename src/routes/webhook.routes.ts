import express, { Request, Response } from 'express';
import crypto from 'crypto';

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

export default router;
