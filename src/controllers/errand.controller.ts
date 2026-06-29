import { Request, Response } from 'express';
import { errandModel, ErrandState, Errand } from '../models/errand.js';
import nombaService from '../services/nomba.service.js';
import { emailService } from '../services/email.service.js';
import { db } from '../config/firebase.js';
import { PricingService, PricingSettings } from '../services/pricing.service.js';

export const createErrand = async (req: Request, res: Response): Promise<any> => {
  try {
    const { 
      buyerId, sellerId, itemName, priceAmount, currency, 
      deliveryFee, pickupLocation, dropoffLocation, 
      buyerName, sellerName,
      buyerPhone, sellerPhone, buyerEmail, sellerEmail, metadata,
      runnerId, runnerCompanyName
    } = req.body;

    if (!buyerId || !sellerId || !itemName || !priceAmount || !deliveryFee || !pickupLocation || !dropoffLocation || !buyerPhone || !sellerPhone) {
      return res.status(400).json({ error: 'Missing required fields (buyer, seller, item, locations, contacts, fees)' });
    }

    // AI Directive: We are mocking the financial logic here.
    // In a live scenario, we would trigger a Nomba payment hold (escrow) here.
    const mockTransactionRef = `LUG-${Date.now()}`;
    console.log(`[Nomba Escrow] Locked ${priceAmount} ${currency || 'NGN'} for Item + ${deliveryFee} for Delivery`);
    
    // Triggering Escrow Notification to Seller
    console.log(`[Notification] 📲 SMS to ${sellerName || 'Vendor'} (${sellerPhone}): "Hi ${sellerName || 'Vendor'}, good news! Luggik has securely locked ${priceAmount} ${currency || 'NGN'} in escrow for your item '${itemName}'. A runner is on the way for pickup."`);

    const errandData: any = {
      buyerId,
      sellerId,
      itemName,
      priceAmount,
      deliveryFee,
      pickupLocation,
      dropoffLocation,
      buyerName,
      sellerName,
      buyerPhone,
      sellerPhone,
      buyerEmail,
      sellerEmail,
      metadata: metadata || {},
      runnerId: runnerId || null,
      runnerCompanyName: runnerCompanyName || null,
      currency: currency || 'NGN',
      state: 'CREATED',
      nombaTransactionRef: mockTransactionRef
    };

    const errandId = await errandModel.createErrand(errandData);

    // Trigger Email Notification
    await emailService.sendEscrowLockedMails(errandData as Errand);

    return res.status(201).json({
      message: 'Errand successfully created, funds locked, and seller notified',
      errandId,
      state: 'CREATED'
    });
  } catch (error: any) {
    console.error('Error creating errand:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getErrand = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const errand = await errandModel.getErrand(id);

    if (!errand) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    return res.status(200).json(errand);
  } catch (error: any) {
    console.error('Error fetching errand:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getAvailableErrands = async (req: Request, res: Response): Promise<any> => {
  try {
    const errands = await errandModel.getAvailableErrands();
    return res.status(200).json({ errands });
  } catch (error: any) {
    console.error('Error fetching available errands:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const acceptErrand = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { runnerId, runnerEmail, runnerCompanyName } = req.body;

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

    await errandModel.assignRunner(id, runnerId, runnerCompanyName);

    // Trigger Email Notification
    await emailService.sendRunnerAcceptedMails(errand);

    return res.status(200).json({
      message: 'Errand accepted successfully',
      state: 'ACCEPTED'
    });
  } catch (error: any) {
    console.error('Error accepting errand:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const startErrand = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { actualRiderId } = req.body;

    if (!actualRiderId) {
      return res.status(400).json({ error: 'actualRiderId is required' });
    }

    const errand = await errandModel.getErrand(id);
    if (!errand) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    // Fetch Rider Info
    const riderDoc = await db.collection('users').doc(actualRiderId).get();
    if (!riderDoc.exists) {
      return res.status(404).json({ error: 'Rider not found' });
    }
    const riderData = riderDoc.data();
    const actualRiderName = riderData?.name || 'Unknown Rider';
    const plateNumber = riderData?.plateNumber || '';
    const imageUrl = riderData?.imageUrl || '';

    await errandModel.assignActualRider(id, actualRiderName, plateNumber, imageUrl);

    const updatedErrand = await errandModel.getErrand(id);
    if (updatedErrand) {
      await emailService.sendRiderDispatchedMail(updatedErrand, plateNumber, imageUrl);
    }

    return res.status(200).json({
      message: 'Rider assigned to errand successfully'
    });
  } catch (error: any) {
    console.error('Error starting errand:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateErrandState = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { state } = req.body;

    if (!state) {
      return res.status(400).json({ error: 'State is required' });
    }

    const errand = await errandModel.getErrand(id);
    if (!errand) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    await errandModel.updateErrandState(id, state as ErrandState);

    // If delivered, trigger Nomba payout & Delivery Emails
    if (state === 'DELIVERED') {
      console.log(`[Nomba] Releasing Escrow: Transferring funds to Seller (${errand.sellerId}) and Commission to Runner (${errand.runnerId}) for Errand ${id}`);
      await emailService.sendDeliverySuccessMails(errand);
    } else if (state === 'REJECTED_BY_BUYER') {
      console.log(`[Nomba] Escrow Refund: Refunding Buyer (${errand.buyerId}) minus Runner base fee for Errand ${id}. Seller (${errand.sellerId}) gets nothing.`);
    }

    return res.status(200).json({
      message: `Errand state updated to ${state}`,
      state
    });
  } catch (error: any) {
    console.error('Error updating errand state:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getQuotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pickupLocation, dropoffLocation } = req.body;

    if (!pickupLocation || !pickupLocation.latitude || !pickupLocation.longitude || !dropoffLocation || !dropoffLocation.latitude || !dropoffLocation.longitude) {
      res.status(400).json({ error: 'Valid pickup and dropoff locations with coordinates are required.' });
      return;
    }

    // Fetch all companies (filtering in memory to catch those with missing roles)
    const snapshot = await db.collection('users').get();
    
    const quotes: any[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.pricingSettings) {
        const quote = PricingService.generateQuote(
          { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
          { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude },
          data.pricingSettings as PricingSettings
        );

        if (quote) {
          quotes.push({
            companyId: doc.id,
            companyName: data.companyName || data.name || 'Logistics Company',
            baseAddress: data.pricingSettings.baseAddress,
            priceAmount: quote.price,
            distanceKm: quote.distanceKm
          });
        }
      }
    });

    // Sort by price ascending
    quotes.sort((a, b) => a.priceAmount - b.priceAmount);

    res.status(200).json({ quotes });
  } catch (error: any) {
    console.error('Error generating quotes:', error);
    res.status(500).json({ error: error.message });
  }
};
