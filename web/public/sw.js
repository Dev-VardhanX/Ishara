// Ishara Service Worker — Offline Support for Core App, Emergency Mode, Audio Clips, MediaPipe & 3D Sign Avatar
const CACHE_NAME = 'ishara-offline-v5';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo.svg',
  '/manifest.json',
  '/audio/manifest.json',
  '/signs/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/models/hand_landmarker.task',
  '/models/labels_isl.json',
  '/mediapipe/wasm/vision_wasm_internal.js',
  '/mediapipe/wasm/vision_wasm_internal.wasm',
  '/mediapipe/wasm/vision_wasm_nosimd_internal.js',
  '/mediapipe/wasm/vision_wasm_nosimd_internal.wasm',
  '/hero-character.jpg',
  '/login-character.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache assets individually so a single missing optional asset doesn't fail install
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Could not precache:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin or GET requests
  if (event.request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // 1. Navigation requests (SPA page reloads while offline)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 2. Models, WASM, and static build assets: Cache First with Network Fallback
  if (
    url.pathname.includes('/models/') ||
    url.pathname.includes('/mediapipe/') ||
    url.pathname.includes('/assets/') ||
    url.pathname.includes('/audio/') ||
    url.pathname.includes('/signs/')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. General static requests: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
