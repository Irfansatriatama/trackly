/**
 * TRACKLY — Service Worker
 * Phase 1 skeleton — full offline cache strategy implemented in Phase 4
 */

const CACHE_NAME = 'trackly-v0.1.0';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/layout.css',
  './css/components.css',
  './css/pages/dashboard.css',
  './css/pages/board.css',
  './css/pages/gantt.css',
  './css/pages/maintenance.css',
  './css/pages/reports.css',
  './css/print.css',
  './js/app.js',
  './js/core/db.js',
  './js/core/router.js',
  './js/core/auth.js',
  './js/core/store.js',
  './js/core/utils.js',
  './assets/logo.svg',
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      });
    })
  );
});
