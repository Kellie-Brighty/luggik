import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../firebase";

export const requestPushPermission = async (vapidKey: string): Promise<string | null> => {
  if (!messaging) {
    console.warn("Messaging not supported.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, { vapidKey });
      console.log("FCM Token:", token);
      return token;
    } else {
      console.warn("Notification permission denied");
      return null;
    }
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
};

export const setupForegroundMessageListener = () => {
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    // You could also trigger a custom toast here if you want
    // using the successSound or notificationSound.
  });
};
