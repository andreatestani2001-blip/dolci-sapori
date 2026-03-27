const CACHE_NAME = 'dolci-sapori-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request)
    )
  );
});

// Notifiche push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Dolci Sapori';
  const options = {
    body: data.body || '',
    icon: '/logo192.png',
    badge: '/logo192.png',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
