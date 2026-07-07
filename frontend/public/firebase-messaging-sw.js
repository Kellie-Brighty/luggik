importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDHN6k8B3Vx1rJRzgkqyMSgWEGOXHSwnTA",
  authDomain: "luggik.firebaseapp.com",
  projectId: "luggik",
  storageBucket: "luggik.firebasestorage.app",
  messagingSenderId: "221839697582",
  appId: "1:221839697582:web:50abc3d8c9ad54f429ef3f"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
