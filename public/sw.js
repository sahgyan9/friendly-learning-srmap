// Friendly Learning SRMAP Service Worker
// Handles background push notifications, app shell caching, and offline persistence.

const STATIC_CACHE = 'fl-srmap-static-v2';
const RUNTIME_CACHE = 'fl-srmap-runtime-v2';
const IMAGE_CACHE = 'fl-srmap-images-v1';

// Uploaded images are kept in their own cache so the housekeeping below can
// evict them without touching the app shell. ~300 entries is a few weeks of
// avatars and post photos at the sizes downscaleImage() produces.
const IMAGE_CACHE_MAX_ENTRIES = 300;

// Core essential assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo-mark-light.svg',
  '/logo-mark-dark.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/badge-96x96.png',
  '/apple-touch-icon.png',
];

// Install Event - Precache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Pre-caching partial error (non-fatal):', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up outdated caches and claim clients
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Uploaded images (avatars, post photos, marketplace and event pictures) are
// served from Supabase Storage. Every upload path in the app names its file
// with a UUID or a timestamp and never overwrites it — changing your picture
// writes a new object and rewrites the row's URL — so a given URL always points
// at the same bytes and is safe to serve from cache without revalidating.
//
// This is why avatars visibly re-loaded on every tab switch: the rule below
// skipped anything on supabase.co, so the browser was left to re-request each
// one on the default max-age of an hour, and an installed PWA evicts its HTTP
// cache far more eagerly than a browser tab does.
function isStorageImageRequest(request, url) {
  if (!url.pathname.startsWith('/storage/v1/object/public/')) {
    return false;
  }
  if (!url.hostname.endsWith('.supabase.co') && url.origin !== self.location.origin) {
    return false;
  }
  return request.destination === 'image' || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url.pathname);
}

// The Cache API has no size limit of its own and no eviction policy, so an
// active user would otherwise accumulate every image they ever scrolled past
// until the origin hit its quota and *all* of it was thrown away. cache.keys()
// returns entries in insertion order, so dropping from the front is oldest-first.
async function trimImageCache() {
  const cache = await caches.open(IMAGE_CACHE);
  const keys = await cache.keys();
  const excess = keys.length - IMAGE_CACHE_MAX_ENTRIES;
  if (excess <= 0) {
    return;
  }
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  // An <img> fetches no-cors, which would hand back an opaque response: status
  // 0, unreadable, and indistinguishable from a 404 we would then cache
  // forever. Public storage objects allow any origin, so ask for it again as a
  // CORS request and get a status we can actually check.
  let response;
  try {
    response = await fetch(new Request(request.url, { mode: 'cors', credentials: 'omit' }));
  } catch {
    response = await fetch(request);
  }

  if (response && (response.status === 200 || response.type === 'opaque')) {
    await cache.put(request, response.clone());
    // Deliberately not awaited: trimming is housekeeping and must not delay
    // the image the page is waiting on.
    trimImageCache().catch(() => {});
  }

  return response;
}

// Fetch Event - Dynamic Stale-While-Revalidate and Offline Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (mutations, uploads, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // Uploaded images first: these live on supabase.co too, and the API skip
  // below would otherwise send every avatar and post photo straight to the
  // network on every single render.
  if (isStorageImageRequest(request, url)) {
    event.respondWith(
      cacheFirstImage(request).catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response('', { status: 504, statusText: 'Image unavailable offline' });
      })
    );
    return;
  }

  // Skip Supabase API mutations, Realtime WebSocket URLs, and Auth endpoints from cache
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/auth/v1/') ||
    url.pathname.startsWith('/functions/v1/')
  ) {
    // For API calls, let network handle it natively (client-side offlineStorage handles structured data)
    return;
  }

  // Skip browser extensions and internal schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation Requests (HTML pages: e.g. /attendance, /opportunities, /)
  // Network-First with fallback to cached route or cached /index.html (SPA Fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, try matching the specific route from cache
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          // Fall back to the SPA app shell (/index.html or /)
          const fallbackShell = await caches.match('/index.html');
          if (fallbackShell) {
            return fallbackShell;
          }
          const rootFallback = await caches.match('/');
          if (rootFallback) {
            return rootFallback;
          }
          return new Response('Offline: Page not cached', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 2. Static Assets (JS chunks, CSS stylesheets, images, SVGs, web fonts)
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    // Stale-While-Revalidate: Return cached version immediately, fetch & update cache in background
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failure is fine if we have cachedResponse
            return null;
          });

        return cachedResponse || fetchPromise.then((res) => res || new Response('', { status: 408 }));
      })
    );
    return;
  }

  // 3. All other same-origin requests: Network-First with runtime cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// ----------------------------------------------------
// Web Push Notifications & Client Window Management
// ----------------------------------------------------

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

  const targetUrl = data.url || data.data?.url || '/';

  const showPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    // Check if the user currently has an open window focused on this exact URL or active chat
    const isActivelyViewing = windowClients.some((client) => {
      const isVisible = client.visibilityState === 'visible';
      if (!isVisible) return false;

      // If target URL points to a specific chat, check if the client is currently at that path
      if (targetUrl && targetUrl !== '/') {
        const clientUrl = new URL(client.url);
        const targetPath = targetUrl.startsWith('/') ? targetUrl : new URL(targetUrl, self.location.origin).pathname;
        if (clientUrl.pathname === targetPath || clientUrl.pathname.startsWith(targetPath)) {
          return true;
        }
      }
      return false;
    });

    if (isActivelyViewing) {
      // User is actively in this conversation in the foreground.
      // Suppress the OS banner / vibration so it doesn't disturb them.
      return;
    }

    const title = data.title || 'Friendly Learning SRMAP';
    const options = {
      body: data.body || 'You have a new notification on Friendly Learning SRMAP.',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/badge-96x96.png',
      tag: data.tag || 'general-notification',
      renotify: true,
      data: {
        url: targetUrl,
        timestamp: Date.now(),
        ...data.data,
      },
      vibrate: [200, 100, 200],
      actions: data.actions || [],
    };

    return self.registration.showNotification(title, options);
  });

  event.waitUntil(showPromise);
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
