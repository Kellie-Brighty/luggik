# Luggik: Architecture & Security Note

**Nomba x DevCareer Hackathon 2026 Submission**

## 1. Overview
Luggik is a secure, escrow-backed logistics marketplace that connects buyers with merchants and delivery riders. To ensure absolute trust, Luggik utilizes the Nomba API infrastructure to create dynamic virtual accounts, process escrow payments, and handle automated payouts upon delivery completion.

## 2. Authentication Flow
Luggik uses Nomba's `client_credentials` grant type for secure server-to-server communication. 
- **Token Lifecycle:** The backend maintains an active handshake with Nomba's `/v1/auth/token/issue` endpoint.
- **Automated Refresh:** Access tokens are automatically refreshed every 2 hours and 55 minutes via a dedicated `scheduleTokenRefresh()` background job, ensuring zero downtime for payment processing without exposing raw credentials.

## 3. Data Handling & Security
- **Dynamic Virtual Accounts:** For every new delivery errand, Luggik calls Nomba's `/v1/accounts/virtual` endpoint to provision a unique, isolated virtual account. Funds deposited by the buyer are held securely until the rider confirms delivery.
- **PII Protection:** Luggik strictly maps virtual accounts to generic `accountRef` identifiers and does not store sensitive banking passwords or raw card data.
- **Firebase Database:** Transaction states are securely stored in a Firebase Firestore instance with strict role-based access rules.

## 4. Webhook Architecture
Real-time transaction updates are handled via robust, webhook-native endpoints.
- **Verification:** All incoming webhooks to the `/webhook/nomba` endpoint are strictly verified using an HMAC-SHA256 signature. 
- **Integrity Check:** The backend mathematically reconstructs the `hashingPayload` using `eventType:requestId:userId:walletId:transactionId:transactionType:transactionTime:transactionResponseCode:timeStamp` and compares the `base64` digest against the `nomba-signature` header to prevent spoofing or replay attacks.
- **Event Handling:** Once verified, the webhook triggers Firebase database updates, updates the escrow status, and optionally dispatches email/push notifications to the buyer and merchant.

## 5. Reliability & Unhappy Paths
- **Failed Transactions:** The system gracefully handles missing or `null` response codes from webhook payloads and safely logs unexpected API errors without crashing the backend thread.
- **Reconciliation:** Luggik verifies transactions via the `/v1/transactions/virtual` endpoint, allowing the system to reconcile funds dynamically even if a webhook payload is delayed.
- **Dispute Resolution:** In the event of a canceled or disputed delivery, the system is architected to pause automated payouts, retaining the funds in the virtual account until manual admin resolution.
