importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCkj3CcZrVR9vxmRV8RQsdOVXhve_KMHZY",
  authDomain: "dolci-sapori.firebaseapp.com",
  projectId: "dolci-sapori",
  storageBucket: "dolci-sapori.firebasestorage.app",
  messagingSenderId: "578720526922",
  appId: "1:578720526922:web:e1543d37d938d4c86facb3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || 'Dolci Sapori';
  const body = payload.notification?.body || payload.data?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
  });
});
