// Fyndr Service Worker (sw.js)
// Native PWA offline caching engine

const CACHE_STATIC = 'fyndr-static-v1';
const CACHE_IMAGES = 'fyndr-images-v1';
const CACHE_AUDIO = 'fyndr-audio-v1';
const MAX_IMAGE_CACHE_ENTRIES = 60;
const MAX_AUDIO_CACHE_ENTRIES = 20;
const REEL_MANIFEST_URL = '/reel-music/manifest.json';

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

// Helper: Trim LRU cache entries (oldest first). keepUrls are absolute URLs
// that are never evicted (e.g. the reel manifest inside the audio cache).
async function trimCache(cacheName, maxItems, keepUrls = []) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const droppable = keys.filter((k) => !keepUrls.includes(k.url));
    if (keys.length > maxItems && droppable.length > 0) {
      await cache.delete(droppable[0]);
      await trimCache(cacheName, maxItems, keepUrls);
    }
  } catch (err) {
    // Non-critical cache maintenance
  }
}

// Manifest-exempt trim for the audio cache: newest 20 mp3s + manifest survive.
function trimAudioCache() {
  const manifestAbs = self.location.origin + REEL_MANIFEST_URL;
  trimCache(CACHE_AUDIO, MAX_AUDIO_CACHE_ENTRIES + 1, [manifestAbs]);
}

// 1. Install: Pre-cache core application shell + reel manifest (audio cache)
self.addEventListener('install', (event) => {
  const shell = caches.open(CACHE_STATIC).then((cache) => {
    return Promise.allSettled(
      PRECACHE_ASSETS.map((url) =>
        cache.add(url).catch((err) => {
          console.warn(`[SW] Failed to pre-cache ${url}:`, err);
        })
      )
    );
  });
  const audio = caches
    .open(CACHE_AUDIO)
    .then((cache) => cache.add(REEL_MANIFEST_URL))
    .catch((err) => {
      console.warn(`[SW] Failed to pre-cache ${REEL_MANIFEST_URL}:`, err);
    });
  event.waitUntil(Promise.all([shell, audio]));
});

// 2. Activate: Clean stale caches and claim clients immediately
self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([CACHE_STATIC, CACHE_IMAGES, CACHE_AUDIO]);
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

// Parses "bytes=N-M" / "bytes=N-". Suffix ("bytes=-N") and garbage fall back
// to network passthrough (never stored).
function parseRange(header) {
  const m = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const start = Number(m[1]);
  const end = m[2] === '' ? -1 : Number(m[2]);
  if (!Number.isSafeInteger(start) || start < 0) return null;
  if (end !== -1 && (!Number.isSafeInteger(end) || end < start)) return null;
  return { start, end };
}

// Serves a 206 slice of a cached/fresh full response.
async function rangeResponse(fullRes, start, end) {
  const buf = await fullRes.blob();
  const size = buf.size;
  const from = Math.min(start, size);
  const to = end === -1 || end >= size ? size - 1 : end;
  if (from > to) return new Response(null, { status: 416 });
  return new Response(buf.slice(from, to + 1), {
    status: 206,
    headers: {
      'Content-Type': fullRes.headers.get('content-type') || 'audio/mpeg',
      'Content-Length': String(to - from + 1),
      'Content-Range': `bytes ${from}-${to}/${size}`,
      'Accept-Ranges': 'bytes',
    },
  });
}

async function handleReelAudio(request, isManifest) {
  const cache = await caches.open(CACHE_AUDIO);
  if (isManifest) {
    const cached = await cache.match(request);
    const revalidate = fetch(request)
      .then((res) => {
        if (res && res.status === 200) cache.put(request, res.clone());
        return res;
      })
      .catch(() => null);
    if (cached) return cached;
    return (await revalidate) || Response.error();
  }
  const rangeHeader = request.headers.get('range');
  const range = rangeHeader ? parseRange(rangeHeader) : null;
  if (rangeHeader && !range) {
    try {
      return await fetch(request);
    } catch {
      return Response.error();
    }
  }
  const cachedFull = await cache.match(request.url);
  if (range) {
    if (cachedFull) return rangeResponse(cachedFull, range.start, range.end);
    try {
      // Refetch without Range so the stored entry stays a full 200.
      const fresh = await fetch(request.url);
      if (fresh && fresh.status === 200) {
        await cache.put(request.url, fresh.clone());
        trimAudioCache();
        return rangeResponse(fresh, range.start, range.end);
      }
      return fresh;
    } catch {
      return Response.error();
    }
  }
  if (cachedFull) return cachedFull;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      await cache.put(request, fresh.clone());
      trimAudioCache();
    }
    return fresh;
  } catch {
    return Response.error();
  }
}

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

  // E. Reel music: manifest SWR + audio cache-first with Range slicing.
  // Media elements send Range: bytes=0- on initial load, so Range requests
  // are intercepted (never bypassed) — only cache.put is guarded to 200s.
  const isReelManifest = url.pathname === REEL_MANIFEST_URL;
  const isReelAudio =
    request.destination === 'audio' ||
    (/^\/reel-music\//.test(url.pathname) && /\.(mp3|m4a|ogg|wav)$/i.test(url.pathname));

  if (isReelManifest || isReelAudio) {
    event.respondWith(handleReelAudio(request, isReelManifest));
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
