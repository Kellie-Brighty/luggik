# Luggik 🚚

**Luggik** is a secure, local delivery dispatch and escrow platform designed specifically to bridge the trust gap in the Nigerian e-commerce and logistics market. 

Luggik acts as the ultimate intermediary between **Buyers**, **Vendors (Sellers)**, and **Logistics Partners (Runners)**, ensuring that money is protected, items are verified before transit, and deliveries are tracked in real time.

---

## 🎯 The Problem We Solved
In local commerce, buyers are often afraid to pay before delivery (fear of scams), and vendors are afraid to send items without payment (fear of non-commitment). Furthermore, utilizing third-party dispatch riders often leads to a lack of visibility and accountability. 

Luggik solves this by combining **Escrow Payments**, **Pre-Transit Photo Verification**, and **Live GPS Tracking** into a single cohesive flow.

## ✨ Core Product Features & Achievements

### 1. 🔒 Secure Escrow & Payments (Nomba Integration)
When a buyer initiates an order, Luggik calculates the total cost (Item Price + Dynamic Delivery Fee) and locks the funds securely in escrow via **Nomba API**. 
- Funds are only disbursed to the vendor when the buyer explicitly verifies the item.
- Funds are only disbursed to the runner when the delivery is confirmed complete.

### 2. 📍 Smart Distance-Based Pricing
Luggik utilizes **Google Maps Places API Autocomplete** to accurately pinpoint exact geographical coordinates for pickup and drop-off locations.
- We implemented the **Haversine Formula** on the backend to calculate the direct surface distance between coordinates.
- Our dynamic pricing engine calculates a Base Fare for the first few kilometers, and a configurable Per-Kilometer Rate for the remaining distance.

### 3. 📸 The "Three-Way" Verification Flow
To ensure the buyer gets exactly what they ordered, we built a strict verification phase:
1. **Arrival**: The Runner arrives at the vendor and taps "Request Buyer Verification".
2. **Chat & Photo**: The Runner uses our live **Firebase-powered ChatBox** to send pictures of the physical item to the Buyer.
3. **Approval/Rejection**: The Buyer reviews the item live. If they approve, the runner is cleared to start transit. If rejected, the escrow process halts, and a refund is initiated.

### 4. 🗺️ Live Real-Time GPS Tracking
We completely overhauled the tracking experience for both parties:
- **Runner View**: Uses `navigator.geolocation.watchPosition` to track the runner's device in real-time, overlaying their position over a Google Maps `DirectionsRenderer` showing the route to the drop-off.
- **Buyer View**: The Buyer dashboard polls the backend and visualizes the Runner's exact moving location via a live map marker. 
- **Optimized Polling**: We implemented smart polling loops that automatically kill themselves when an errand reaches a terminal state (`DELIVERED` or `REJECTED_BY_BUYER`), drastically saving battery and network bandwidth.

### 5. 🏢 Comprehensive Logistics Profiles
Logistics companies and independent runners can onboard with full KYC:
- Captured Rider Names, Phone Numbers, and Company Names.
- Captured **Plate Numbers** and **Vehicle/Rider Images**.
- This data is pushed dynamically via **Resend (Email)** and **Termii (SMS)** to the Vendor and Buyer for maximum security and accountability upon dispatch.

## 🛠 Tech Stack

- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Google Maps React API, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: Firebase Firestore (Real-time NoSQL).
- **Integrations**: 
  - **Nomba API** (Payments & Escrow)
  - **Google Maps API** (Places Autocomplete, Directions, Geocoding)
  - **Resend** (Transactional Emails)
  - **Termii** (Transactional SMS)

---

### *Building trust in every local delivery.*
