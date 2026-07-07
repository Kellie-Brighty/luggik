import { db, messaging } from '../config/firebase.js';

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: { [key: string]: string }
): Promise<void> => {
  try {
    const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
    if (!tokenDoc.exists) {
      console.log(`No FCM token found for user ${userId}`);
      return;
    }

    const { token } = tokenDoc.data()!;
    if (!token) return;

    await messaging.send({
      token,
      notification: {
        title,
        body
      },
      data,
      // Optional: Add Android and APNS specific configs for sound if needed later
    });

    console.log(`Push notification sent to ${userId}`);
  } catch (error) {
    console.error(`Failed to send push notification to ${userId}:`, error);
  }
};
