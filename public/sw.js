// Lumina Service Worker
const CACHE_NAME = 'lumina-v1';

self.addEventListener('install', (event) => {
  // We don't skipWaiting() automatically anymore so we can show a prompt
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now
  event.respondWith(fetch(event.request));
});

// Push Notification Listener
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'New Mission Available!';
  const options = {
    body: data.message || 'Check out the new research opportunities in Lumina.',
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
