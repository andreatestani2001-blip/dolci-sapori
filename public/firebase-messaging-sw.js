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

// Firebase gestisce automaticamente le notifiche in background
// Non serve showNotification manuale - evita notifiche doppie
messaging.onBackgroundMessage(function(payload) {
  console.log('Background message received:', payload);
  // Firebase mostra automaticamente la notifica dal campo notification{}
  // Non chiamare showNotification qui per evitare duplicati
});
