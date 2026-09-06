// Fyndr Service Worker (sw.js)
// Native PWA offline caching engine

const CACHE_STATIC = 'fyndr-static-v1';
const CACHE_IMAGES = 'fyndr-images-v1';
const MAX_IMAGE_CACHE_ENTRIES = 60;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  '/logo-mark-dark.svg',
  '/logo-mark-light.svg',
  '/logo192.png',
  '/logo512.png',
  '/logo-maskable-512.png',
];

// Helper: Trim LRU cache entries
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      await trimCache(cacheName, maxItems);
    }
  } catch (err) {
    // Non-critical cache maintenance
  }
}

// 1. Install: Pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Failed to pre-cache ${url}:`, err);
            })
          )
        );
      })
  );
});

// 2. Activate: Clean stale caches and claim clients immediately
self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([CACHE_STATIC, CACHE_IMAGES]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!allowedCaches.has(key)) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. Fetch: Route-aware caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept GET requests from http / https
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. Sensitive API calls & mutations: Network-only, NEVER cached
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/events/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.includes('/search')
  ) {
    return;
  }

  // B. Navigation requests (HTML pages): Network-first with 3.5s timeout & offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        try {
          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_STATIC);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          clearTimeout(timeoutId);
          // Try cached navigation route or fallback to offline.html
          const cachedRoute = await caches.match(request);
          if (cachedRoute) return cachedRoute;

          const cachedShell = await caches.match('/index.html');
          if (cachedShell) return cachedShell;

          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          return new Response('Network unavailable and no offline cache available.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })()
    );
    return;
  }

  // C. Photos, uploads & media: Cache-first with LRU quota management
  const isImageRequest =
    request.destination === 'image' ||
    url.pathname.startsWith('/uploads/') ||
    /\.(?:png|jpg|jpeg|svg|webp|avif|gif|ico)$/i.test(url.pathname);

  if (isImageRequest) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const cache = await caches.open(CACHE_IMAGES);
            cache.put(request, networkResponse.clone());
            // Trim cache asynchronously without blocking response
            trimCache(CACHE_IMAGES, MAX_IMAGE_CACHE_ENTRIES);
          }
          return networkResponse;
        } catch (err) {
          // If network failed and nothing cached, propagate or return empty placeholder
          return cachedResponse || Response.error();
        }
      })()
    );
    return;
  }

  // D. Static assets (JS bundles, CSS, Google fonts, Web fonts): Stale-While-Revalidate
  const isStaticAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.startsWith('/static/');

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(CACHE_STATIC);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        const networkResponse = await fetchPromise;
        return cachedResponse || networkResponse || Response.error();
      })()
    );
  }
});

// 4. Message: Support immediate manual update activation via SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
