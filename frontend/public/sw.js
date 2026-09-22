/**
 * KIFA FoodCo PWA Service Worker
 * 
 * ONLINE-FIRST ERP Strategy:
 * - App Shell & Static assets (JS, CSS, fonts, icons) are cached for fast launch and offline shell loading.
 * - ALL API endpoints (/api/*) and external backend requests are STRICTLY BYPASSED (Network-Only).
 * - Sensitive business transactions (Sales, Payments, Trips, Stock, Returns, Auth) are NEVER cached.
 * - Outdated caches are automatically purged on activation.
 */

const CACHE_VERSION = 'kifa-shell-v1';
const STATIC_CACHE_NAME = `kifa-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `kifa-runtime-${CACHE_VERSION}`;

// Pre-cached core app shell assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.jpg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
];

// Install Event: Pre-cache app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Prepare worker to take control upon client instruction
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] Pre-cache failed:', err);
      })
  );
});

// Activate Event: Cleanup stale caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== RUNTIME_CACHE_NAME &&
              cacheName.startsWith('kifa-')
            ) {
              console.log('[SW] Deleting obsolete cache:', cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Helper: Determine if request is an API or dynamic backend request
function isApiRequest(url, request) {
  // Check path
  if (url.pathname.startsWith('/api/')) return true;
  // Check if request is going to external backend (Render, localhost:5001, etc.)
  if (url.origin !== self.location.origin) {
    // Allow Google fonts stylesheets and webfont files to be cached
    const isFont =
      url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com';
    if (!isFont) return true;
  }
  // Check auth header if inspection is permitted
  if (request.headers.has('authorization')) return true;
  return false;
}

// Fetch Event: Strict Online-First & Cache Management
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Strictly bypass non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // 2. Strictly bypass API, auth, and dynamic backend data
  if (isApiRequest(url, request)) {
    // Network-only: do not intercept, do not cache
    return;
  }

  // 3. Navigation requests (HTML pages / SPA route navigation)
  // Online-First: Try network first; fallback to cached /index.html if offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid network response, optionally refresh index.html cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback to app shell
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return caches.match('/');
        })
    );
    return;
  }

  // 4. Vite hashed production assets (/assets/*.js, /assets/*.css, /assets/*.jpg)
  // Since Vite attaches content hashes to production builds, cache-first is optimal and safe
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. Google Fonts (stylesheets & webfonts)
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 6. Other local static assets (icons, images, manifest)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Stale-while-revalidate for local static assets
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// Client communication: Listen for manual update trigger
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
