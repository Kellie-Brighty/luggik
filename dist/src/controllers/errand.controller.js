import { errandModel } from '../models/errand.js';
import { emailService } from '../services/email.service.js';
export const createErrand = async (req, res) => {
    try {
        const { buyerId, sellerId, itemName, priceAmount, currency, deliveryFee, pickupLocation, dropoffLocation, buyerPhone, sellerPhone, buyerEmail, sellerEmail, metadata } = req.body;
        if (!buyerId || !sellerId || !itemName || !priceAmount || !deliveryFee || !pickupLocation || !dropoffLocation || !buyerPhone || !sellerPhone) {
            return res.status(400).json({ error: 'Missing required fields (buyer, seller, item, locations, contacts, fees)' });
        }
        // AI Directive: We are mocking the financial logic here.
        // In a live scenario, we would trigger a Nomba payment hold (escrow) here.
        const mockTransactionRef = `LUG-${Date.now()}`;
        console.log(`[Nomba Escrow] Locked ${priceAmount} ${currency || 'NGN'} for Item + ${deliveryFee} for Delivery`);
        // Triggering Escrow Notification to Seller
        console.log(`[Notification] 📲 SMS to Seller (${sellerPhone}): "Good news! Luggik has securely locked ${priceAmount} ${currency || 'NGN'} in escrow for your item '${itemName}'. A runner is on the way for pickup."`);
        const errandData = {
            buyerId,
            sellerId,
            itemName,
            priceAmount,
            deliveryFee,
            pickupLocation,
            dropoffLocation,
            buyerPhone,
            sellerPhone,
            buyerEmail,
            sellerEmail,
            metadata,
            currency: currency || 'NGN',
            state: 'CREATED',
            nombaTransactionRef: mockTransactionRef
        };
        const errandId = await errandModel.createErrand(errandData);
        // Trigger Email Notification
        await emailService.sendEscrowLockedMails(errandData);
        return res.status(201).json({
            message: 'Errand successfully created, funds locked, and seller notified',
            errandId,
            state: 'CREATED'
        });
    }
    catch (error) {
        console.error('Error creating errand:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
export const getErrand = async (req, res) => {
    try {
        const id = req.params.id;
        const errand = await errandModel.getErrand(id);
        if (!errand) {
            return res.status(404).json({ error: 'Errand not found' });
        }
        return res.status(200).json(errand);
    }
    catch (error) {
        console.error('Error fetching errand:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
export const acceptErrand = async (req, res) => {
    try {
        const id = req.params.id;
        const { runnerId, runnerEmail } = req.body;
        if (!runnerId) {
            return res.status(400).json({ error: 'runnerId is required' });
        }
        const errand = await errandModel.getErrand(id);
        if (!errand) {
            return res.status(404).json({ error: 'Errand not found' });
        }
        if (errand.state !== 'CREATED') {
            return res.status(400).json({ error: 'Errand is not in a state to be accepted' });
        }
        // Save runnerEmail temporarily if passed (in real app, fetched from DB)
        if (runnerEmail) {
            await errandModel.updateErrandState(id, 'ACCEPTED'); // Temporary step if we needed to save email directly, but assignRunner handles state. Let's just use assignRunner and we can patch the email manually for now.
            // For mock purposes, just mutate the local object to send the mail
            errand.runnerEmail = runnerEmail;
        }
        await errandModel.assignRunner(id, runnerId);
        // Trigger Email Notification
        await emailService.sendRunnerAcceptedMails(errand);
        return res.status(200).json({
            message: 'Errand accepted successfully',
            state: 'ACCEPTED'
        });
    }
    catch (error) {
        console.error('Error accepting errand:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
export const updateErrandState = async (req, res) => {
    try {
        const id = req.params.id;
        const { state } = req.body;
        if (!state) {
            return res.status(400).json({ error: 'State is required' });
        }
        const errand = await errandModel.getErrand(id);
        if (!errand) {
            return res.status(404).json({ error: 'Errand not found' });
        }
        await errandModel.updateErrandState(id, state);
        // If delivered, trigger Nomba payout & Delivery Emails
        if (state === 'DELIVERED') {
            console.log(`[Nomba] Releasing Escrow: Transferring funds to Seller (${errand.sellerId}) and Commission to Runner (${errand.runnerId}) for Errand ${id}`);
            await emailService.sendDeliverySuccessMails(errand);
        }
        return res.status(200).json({
            message: `Errand state updated to ${state}`,
            state
        });
    }
    catch (error) {
        console.error('Error updating errand state:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
