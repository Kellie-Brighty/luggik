import { Resend } from 'resend';
import { Errand } from '../models/errand.js';

class EmailService {
  private resend: Resend | null = null;
  private fromEmail = 'Luggik Escrow & Trust <noreply@luggik.delivery>'; 

  private getResendClient(): Resend | null {
    if (this.resend) return this.resend;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ RESEND_API_KEY is not set in your .env file. Emails will NOT be sent.');
      return null;
    }
    
    this.resend = new Resend(apiKey);
    console.log('✉️  Resend Email Service Initialized.');
    return this.resend;
  }

  private async sendMail(to: string, subject: string, text: string, html?: string) {
    const client = this.getResendClient();
    if (!client) {
      console.warn('Resend service not initialized. Cannot send email to:', to);
      return;
    }

    try {
      const data = await client.emails.send({
        from: this.fromEmail,
        to, // Note: If using a free Resend account without a verified domain, you can ONLY send emails to the email address registered with your Resend account.
        subject,
        text,
        ...(html && { html }),
      });

      console.log(`[Resend Email Sent] To: ${to} | Subject: ${subject} | ID: ${data.data?.id}`);
    } catch (error) {
      console.error('Error sending email via Resend:', error);
    }
  }

  async sendEscrowLockedMails(errand: Errand) {
    const buyerSubject = `Your Escrow for '${errand.itemName}' is Locked!`;
    const buyerText = `Hi Buyer,\n\nGood news! We have successfully locked ${errand.priceAmount} ${errand.currency} in escrow for your order of '${errand.itemName}'.\n\nA runner will be assigned shortly. Your money is completely safe and won't be released until the item is delivered to you.`;
    
    const vendorSubject = `Order Created! Escrow Locked for '${errand.itemName}'`;
    const vendorText = `Hi Vendor,\n\nGreat news! A buyer has initiated an order for '${errand.itemName}'.\n\nWe have successfully locked their payment of ${errand.priceAmount} ${errand.currency} in Luggik Escrow. A runner will arrive soon to verify and pick up the item.\n\nYou are guaranteed to get paid once delivery is completed.`;

    if (errand.buyerEmail) await this.sendMail(errand.buyerEmail, buyerSubject, buyerText);
    if (errand.sellerEmail) await this.sendMail(errand.sellerEmail, vendorSubject, vendorText);
  }

  async sendRunnerAcceptedMails(errand: Errand) {
    const subject = `A Runner is on the way for '${errand.itemName}'!`;
    const buyerText = `Hi Buyer,\n\nA runner has just accepted your errand and is heading to the vendor's shop to verify and pick up the item.`;
    const vendorText = `Hi Vendor,\n\nA runner is currently en route to your shop to verify and pick up '${errand.itemName}'. Please have it ready!`;

    if (errand.buyerEmail) await this.sendMail(errand.buyerEmail, subject, buyerText);
    if (errand.sellerEmail) await this.sendMail(errand.sellerEmail, subject, vendorText);
  }

  async sendRiderDispatchedMail(errand: Errand, plateNumber: string, imageUrl: string) {
    const subject = `Rider Dispatched! Details for '${errand.itemName}'`;
    
    // Fallback Text Version
    let text = `Hi Vendor,\n\n`;
    text += `The rider has started the errand and is currently en route to your shop to verify and pick up '${errand.itemName}'.\n\n`;
    text += `Please verify the rider before handing over the item.\n\n`;
    text += `--- Rider Details ---\n`;
    text += `Logistics Company: ${errand.runnerCompanyName || 'Unknown'}\n`;
    text += `Rider Name: ${errand.actualRiderName || 'Unknown'}\n`;
    if (plateNumber) text += `Vehicle Plate Number: ${plateNumber}\n`;
    if (imageUrl) text += `Rider Photo: ${imageUrl}\n`;
    text += `---------------------\n\n`;
    text += `Thanks,\nThe Luggik Team`;

    // Rich HTML Version
    let html = `
      <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Rider Dispatched!</h2>
        <p>Hi Vendor,</p>
        <p>The rider has started the errand and is currently en route to your shop to verify and pick up <strong>'${errand.itemName}'</strong>.</p>
        <p style="color: #b91c1c; font-weight: bold;">Please verify the rider before handing over the item.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px;">Rider Details</h3>
          <p><strong>Logistics Company:</strong> ${errand.runnerCompanyName || 'Unknown'}</p>
          <p><strong>Rider Name:</strong> ${errand.actualRiderName || 'Unknown'}</p>
          ${plateNumber ? `<p><strong>Vehicle Plate Number:</strong> ${plateNumber}</p>` : ''}
          
          ${imageUrl ? `
          <div style="margin-top: 16px;">
            <p style="margin-bottom: 8px;"><strong>Rider Photo:</strong></p>
            <img src="${imageUrl}" alt="Rider Photo" style="max-width: 150px; max-height: 150px; border-radius: 8px; border: 1px solid #cbd5e1; object-fit: cover;" />
          </div>
          ` : ''}
        </div>
        
        <p>Thanks,<br/><strong>The Luggik Team</strong></p>
      </div>
    `;

    if (errand.sellerEmail) {
      await this.sendMail(errand.sellerEmail, subject, text, html);
    }
  }

  async sendDeliverySuccessMails(errand: Errand) {
    const buyerSubject = `Delivery Complete! Funds Released.`;
    const buyerText = `Hi Buyer,\n\nYour errand for '${errand.itemName}' has been marked as DELIVERED. We hope you love your item! The escrow funds have now been released.`;

    const vendorSubject = `Delivery Complete! Payout Initiated.`;
    const vendorText = `Hi Vendor,\n\nYour item '${errand.itemName}' has been successfully delivered to the buyer. Your payout of ${errand.priceAmount} ${errand.currency} has been initiated to your Nomba wallet!`;

    const runnerSubject = `Delivery Complete! Commission Payout Initiated.`;
    const runnerText = `Hi Runner,\n\nGreat job! You successfully verified and delivered '${errand.itemName}'. Your commission of ${errand.deliveryFee} ${errand.currency} has been credited to your wallet.`;

    if (errand.buyerEmail) await this.sendMail(errand.buyerEmail, buyerSubject, buyerText);
    if (errand.sellerEmail) await this.sendMail(errand.sellerEmail, vendorSubject, vendorText);
    if (errand.runnerEmail) await this.sendMail(errand.runnerEmail, runnerSubject, runnerText);
  }

  async sendKycApprovalMail(email: string, companyName: string) {
    const subject = `Welcome to Luggik, ${companyName}! Your KYC is Approved 🎉`;
    const text = `Hi ${companyName},\n\nCongratulations! Your KYC verification was successful and your logistics company is now fully approved on the Luggik platform.\n\nYou can now start accepting errands and earning money safely with Luggik Escrow & Trust.\n\nWelcome aboard!\n\nBest,\nThe Luggik Team`;
    
    await this.sendMail(email, subject, text);
  }
}

export const emailService = new EmailService();
