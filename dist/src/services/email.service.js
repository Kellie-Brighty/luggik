import { Resend } from 'resend';
class EmailService {
    resend = null;
    fromEmail = 'Luggik Escrow & Trust <noreply@luggik.delivery>';
    getResendClient() {
        if (this.resend)
            return this.resend;
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ RESEND_API_KEY is not set in your .env file. Emails will NOT be sent.');
            return null;
        }
        this.resend = new Resend(apiKey);
        console.log('✉️  Resend Email Service Initialized.');
        return this.resend;
    }
    async sendMail(to, subject, text) {
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
            });
            console.log(`[Resend Email Sent] To: ${to} | Subject: ${subject} | ID: ${data.data?.id}`);
        }
        catch (error) {
            console.error('Error sending email via Resend:', error);
        }
    }
    async sendEscrowLockedMails(errand) {
        const buyerSubject = `Your Escrow for '${errand.itemName}' is Locked!`;
        const buyerText = `Hi Buyer,\n\nGood news! We have successfully locked ${errand.priceAmount} ${errand.currency} in escrow for your order of '${errand.itemName}'.\n\nA runner will be assigned shortly. Your money is completely safe and won't be released until the item is delivered to you.`;
        const vendorSubject = `Order Created! Escrow Locked for '${errand.itemName}'`;
        const vendorText = `Hi Vendor,\n\nGreat news! A buyer has initiated an order for '${errand.itemName}'.\n\nWe have successfully locked their payment of ${errand.priceAmount} ${errand.currency} in Luggik Escrow. A runner will arrive soon to verify and pick up the item.\n\nYou are guaranteed to get paid once delivery is completed.`;
        if (errand.buyerEmail)
            await this.sendMail(errand.buyerEmail, buyerSubject, buyerText);
        if (errand.sellerEmail)
            await this.sendMail(errand.sellerEmail, vendorSubject, vendorText);
    }
    async sendRunnerAcceptedMails(errand) {
        const subject = `A Runner is on the way for '${errand.itemName}'!`;
        const buyerText = `Hi Buyer,\n\nA runner has just accepted your errand and is heading to the vendor's shop to verify and pick up the item.`;
        const vendorText = `Hi Vendor,\n\nA runner is currently en route to your shop to verify and pick up '${errand.itemName}'. Please have it ready!`;
        if (errand.buyerEmail)
            await this.sendMail(errand.buyerEmail, subject, buyerText);
        if (errand.sellerEmail)
            await this.sendMail(errand.sellerEmail, subject, vendorText);
    }
    async sendDeliverySuccessMails(errand) {
        const buyerSubject = `Delivery Complete! Funds Released.`;
        const buyerText = `Hi Buyer,\n\nYour errand for '${errand.itemName}' has been marked as DELIVERED. We hope you love your item! The escrow funds have now been released.`;
        const vendorSubject = `Delivery Complete! Payout Initiated.`;
        const vendorText = `Hi Vendor,\n\nYour item '${errand.itemName}' has been successfully delivered to the buyer. Your payout of ${errand.priceAmount} ${errand.currency} has been initiated to your Nomba wallet!`;
        const runnerSubject = `Delivery Complete! Commission Payout Initiated.`;
        const runnerText = `Hi Runner,\n\nGreat job! You successfully verified and delivered '${errand.itemName}'. Your commission of ${errand.deliveryFee} ${errand.currency} has been credited to your wallet.`;
        if (errand.buyerEmail)
            await this.sendMail(errand.buyerEmail, buyerSubject, buyerText);
        if (errand.sellerEmail)
            await this.sendMail(errand.sellerEmail, vendorSubject, vendorText);
        if (errand.runnerEmail)
            await this.sendMail(errand.runnerEmail, runnerSubject, runnerText);
    }
}
export const emailService = new EmailService();
