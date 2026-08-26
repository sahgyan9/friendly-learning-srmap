// Friendly Learning SRMAP Service Worker
// Handles background push notifications, deep links, and client window activation.

const CACHE_NAME = 'fl-srmap-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push message
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Friendly Learning SRMAP',
        body: event.data.text(),
      };
    }
  }

  const title = data.title || 'Friendly Learning SRMAP';
  const options = {
    body: data.body || 'You have a new notification on Friendly Learning SRMAP.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'general-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      ...data.data,
    },
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click and navigation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open on our site, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url === fullUrl || client.url.startsWith(self.location.origin)) {
            client.focus();
            if ('navigate' in client && client.url !== fullUrl) {
              return client.navigate(fullUrl);
            }
            return client;
          }
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});

// Handle push subscription change / renewal from browser
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription?.options || { userVisibleOnly: true })
      .then((newSubscription) => {
        // Will be re-synced by frontend pushService on next load
        console.log('[SW] Push subscription refreshed:', newSubscription.endpoint);
      })
      .catch((err) => {
        console.warn('[SW] Push subscription renewal failed:', err);
      })
  );
});
