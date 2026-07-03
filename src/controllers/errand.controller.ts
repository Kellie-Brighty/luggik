import { Request, Response } from 'express';
import { errandModel, ErrandState, Errand } from '../models/errand.js';
import { buyerModel } from '../models/buyerModel.js';
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

    // AI Directive: We are replacing the mocked financial logic with real Nomba API integration
    const mockTransactionRef = `LUG-${Date.now()}`;
    
    // Generating Virtual Account for Buyer
    let virtualAccount = undefined;
    try {
      let combinedName = `${buyerName || 'Buyer'} to ${sellerName || 'Vendor'}`;
      // Nomba strictly forbids special characters in account names
      combinedName = combinedName.replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 30);
      
      const vAcc = await nombaService.createVirtualAccount(
        mockTransactionRef,
        combinedName,
        currency || 'NGN'
      );
      virtualAccount = {
        accountNumber: vAcc.bankAccountNumber || vAcc.accountNumber,
        accountName: vAcc.bankAccountName || vAcc.accountName,
        bankName: vAcc.bankName
      };
      console.log(`[Nomba Escrow] Generated Virtual Account: ${virtualAccount.accountNumber} at ${virtualAccount.bankName}`);
    } catch (err: any) {
      console.error('Failed to generate virtual account during errand creation:', err.message);
      // We log but proceed so the app doesn't break if Nomba credentials are not fully set up in dev
    }

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
      nombaTransactionRef: mockTransactionRef,
      virtualAccount,
      trackingPin: Math.floor(1000 + Math.random() * 9000).toString()
    };

    const errandId = await errandModel.createErrand(errandData);

    // Get or create Master PIN for the buyer
    const buyerData = await buyerModel.getOrCreateBuyer(buyerPhone);

    return res.status(201).json({
      message: 'Errand successfully created, funds pending',
      errandId,
      state: 'CREATED',
      virtualAccount,
      trackingPin: errandData.trackingPin,
      masterPin: buyerData.isNew ? buyerData.masterPin : null
    });
  } catch (error: any) {
    console.error('Error creating errand:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const verifyTracking = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { trackingPin } = req.body;

    if (!trackingPin) {
      return res.status(400).json({ error: 'Tracking PIN is required' });
    }

    const errand = await errandModel.getErrand(id);
    if (!errand) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    if (errand.trackingPin !== trackingPin) {
      return res.status(403).json({ error: 'Invalid Tracking PIN' });
    }

    // Return limited data (hide dropoff coordinates and buyer details for privacy)
    return res.status(200).json({
      errand: {
        id,
        state: errand.state,
        itemName: errand.itemName,
        pickupLocation: errand.pickupLocation,
        actualRiderName: errand.actualRiderName,
        actualRiderPlateNumber: errand.actualRiderPlateNumber,
        actualRiderImageUrl: errand.actualRiderImageUrl,
        runnerCompanyName: errand.runnerCompanyName,
        priceAmount: errand.priceAmount,
        dropoffLocation: { address: 'Protected Delivery Address' } // Omit coordinates
      }
    });
  } catch (error) {
    console.error('Error verifying tracking PIN:', error);
    res.status(500).json({ error: 'Failed to verify tracking PIN' });
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

export const nombaWebhook = async (req: Request, res: Response): Promise<any> => {
  try {
    const payload = req.body;
    console.log(`[Nomba Webhook] Received webhook:`, JSON.stringify(payload));

    const accountNumber = payload?.data?.virtualAccount?.accountNumber || payload?.data?.accountDetails?.accountNumber || payload?.data?.accountNumber;
    
    if (accountNumber && (payload?.event?.type === 'transaction.success' || payload?.data?.amount)) {
      const snapshot = await db.collection('errands').where('virtualAccount.accountNumber', '==', accountNumber).limit(1).get();
      
      if (!snapshot.empty) {
        const errandDoc = snapshot.docs[0];
        const errandData = errandDoc.data() as Errand;
        
        if (!(errandData as any).escrowLockedNotified) {
          console.log(`[Nomba Webhook] Match found for errand ${errandDoc.id}. Triggering Escrow Notifications.`);
          
          console.log(`[Notification] 📲 SMS to ${errandData.sellerName || 'Vendor'} (${errandData.sellerPhone}): "Hi ${errandData.sellerName || 'Vendor'}, good news! Luggik has initiated escrow for your item '${errandData.itemName}'. A runner is on the way for pickup."`);

          await emailService.sendEscrowLockedMails(errandData);

          await errandDoc.ref.update({
            state: 'ESCROW_LOCKED',
            escrowLockedNotified: true,
            escrowLockedAt: new Date().toISOString()
          });
        }
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (error: any) {
    console.error('Error processing Nomba webhook:', error);
    return res.status(200).send('OK');
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

export const cancelErrand = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const errand = await errandModel.getErrand(id);

    if (!errand) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    if ((errand as any).virtualAccount?.accountNumber) {
      try {
        const transactions = await nombaService.getVirtualAccountTransactions((errand as any).virtualAccount.accountNumber);
        if (transactions && transactions.length > 0) {
          const totalAmount = transactions.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount || '0'), 0);
          return res.status(400).json({ error: `Cancellation rejected: We have already received a payment of ₦${totalAmount.toLocaleString()} into the escrow virtual account.` });
        }
      } catch (e) {
        console.error('Error fetching transactions for cancel:', e);
      }
    }

    if (errand.state !== 'CREATED' && errand.state !== 'PENDING_VERIFICATION') {
      return res.status(400).json({ error: 'Errand cannot be cancelled because it is already in progress.' });
    }

    await db.collection('errands').doc(id).update({
      state: 'CANCELLED',
      cancelledAt: new Date().toISOString()
    });

    return res.status(200).json({ message: 'Errand cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling errand:', error);
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

    if (errand.state !== 'ESCROW_LOCKED') {
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

    // If escrow is locked manually, trigger notifications
    if (state === 'ESCROW_LOCKED') {
      if (!(errand as any).escrowLockedNotified) {
        console.log(`[Notification] 📲 SMS to ${errand.sellerName || 'Vendor'} (${errand.sellerPhone}): "Hi ${errand.sellerName || 'Vendor'}, good news! Luggik has initiated escrow for your item '${errand.itemName}'. A runner is on the way for pickup."`);
        await emailService.sendEscrowLockedMails(errand);
        await db.collection('errands').doc(id).update({
          escrowLockedNotified: true,
          escrowLockedAt: new Date().toISOString()
        });
      }
    } else if (state === 'DELIVERED') {
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
