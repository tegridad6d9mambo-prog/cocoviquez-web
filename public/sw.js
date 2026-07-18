// Service Worker for admin push notifications (Coco Víquez).
// Registered only from within the authenticated admin dashboard - see
// src/App.tsx's push-subscription logic. Does not intercept/cache any
// site traffic; its only job is to receive and display push messages.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'Coco Víquez', body: event.data.text() };
  }

  const title = payload.title || 'Coco Víquez';
  const options = {
    body: payload.body || '',
    icon: '/logo/logo.png',
    badge: '/logo/logo.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || 'coco-viquez-notification',
    renotify: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
