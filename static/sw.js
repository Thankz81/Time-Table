const CACHE = 'tyme-tyble-v1';
const PRECACHE = [
  '/',
  '/static/css/base.css',
  '/static/css/auth.css',
  '/static/css/layout.css',
  '/static/css/components.css',
  '/static/css/today.css',
  '/static/css/tasks.css',
  '/static/css/notes.css',
  '/static/css/deadlines.css',
  '/static/css/calendar.css',
  '/static/css/widget.css',
  '/static/js/api.js',
  '/static/js/auth.js',
  '/static/js/store.js',
  '/static/js/router.js',
  '/static/js/main.js',
  '/static/js/components/clock.js',
  '/static/js/components/editor.js',
  '/static/js/components/miniCalendar.js',
  '/static/js/components/panel.js',
  '/static/js/views/today.js',
  '/static/js/views/calendar.js',
  '/static/js/views/tasks.js',
  '/static/js/views/notes.js',
  '/static/js/views/deadlines.js',
  '/static/js/views/work.js',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
];

// Install: precache all static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static assets, network-first for API calls
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network for API calls
  if (url.pathname.startsWith('/api/')) return;

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
