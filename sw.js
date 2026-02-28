/**
 * TRACKLY — Service Worker
 * Phase 4: Full offline cache strategy.
 * Cache-first for all static assets; network-first for external resources.
 */

const CACHE_NAME = 'trackly-v1.1.0';

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
  './css/pages/maintenance-report.css',
  './css/pages/reports.css',
  './css/pages/assets.css',
  './css/pages/sprint.css',
  './css/print.css',
  './js/app.js',
  './js/core/db.js',
  './js/core/router.js',
  './js/core/auth.js',
  './js/core/store.js',
  './js/core/utils.js',
  './js/components/sidebar.js',
  './js/components/topbar.js',
  './js/components/modal.js',
  './js/components/toast.js',
  './js/components/avatar.js',
  './js/components/badge.js',
  './js/components/confirm.js',
  './js/modules/dashboard.js',
  './js/modules/projects.js',
  './js/modules/board.js',
  './js/modules/backlog.js',
  './js/modules/sprint.js',
  './js/modules/gantt.js',
  './js/modules/maintenance.js',
  './js/modules/maintenance-report.js',
  './js/modules/assets.js',
  './js/modules/clients.js',
  './js/modules/members.js',
  './js/modules/reports.js',
  './js/modules/settings.js',
  './js/modules/guide.js',
  './js/modules/log.js',
  './css/pages/log.css',
  './assets/logo.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
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
