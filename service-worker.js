/* ═══════════════════════════════════════════════════════════════
   iLoveConvert — service-worker.js  v1.0
   Strategy: Cache-first for static assets, Network-first for HTML
   ═══════════════════════════════════════════════════════════════ */

var CACHE_VERSION = 'ilc-v1';
var STATIC_CACHE  = 'ilc-static-v1';
var RUNTIME_CACHE = 'ilc-runtime-v1';

/* Core shell — always cache these */
var PRECACHE_URLS = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/history.html',
  '/account.html',
  '/supabase.js',
  '/auth.js',
  '/manifest.json',
  /* Google Fonts (cached after first load) */
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
];

/* ── INSTALL ─────────────────────────────────────── */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return Promise.allSettled(
        PRECACHE_URLS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] Pre-cache failed for:', url, err);
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ── ACTIVATE ────────────────────────────────────── */
self.addEventListener('activate', function (e) {
  var allowed = [STATIC_CACHE, RUNTIME_CACHE];
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return !allowed.includes(k); })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ── FETCH ───────────────────────────────────────── */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);

  /* Skip non-GET and cross-origin requests (Supabase API) */
  if (req.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('googleapis.com') && url.pathname.includes('fonts')) {
    e.respondWith(cacheFirst(req));
    return;
  }
  if (url.hostname === self.location.hostname || url.hostname === 'localhost') {
    /* HTML pages: Network-first (always get latest) */
    if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
      e.respondWith(networkFirst(req));
      return;
    }
    /* Static assets: Cache-first */
    e.respondWith(cacheFirst(req));
    return;
  }
  /* CDN assets (gif.js, pdf.js, etc.) — cache-first */
  if (url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('unpkg.com')) {
    e.respondWith(cacheFirst(req));
    return;
  }
});

/* Cache-first strategy */
function cacheFirst(req) {
  return caches.match(req).then(function (cached) {
    if (cached) return cached;
    return fetch(req).then(function (res) {
      if (!res || res.status !== 200 || res.type === 'opaque') return res;
      var resClone = res.clone();
      caches.open(RUNTIME_CACHE).then(function (cache) { cache.put(req, resClone); });
      return res;
    }).catch(function () {
      /* Offline fallback for HTML */
      if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
        return caches.match('/index.html');
      }
    });
  });
}

/* Network-first strategy */
function networkFirst(req) {
  return fetch(req).then(function (res) {
    if (res && res.status === 200) {
      var resClone = res.clone();
      caches.open(STATIC_CACHE).then(function (cache) { cache.put(req, resClone); });
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (cached) {
      return cached || caches.match('/index.html');
    });
  });
}

/* ── BACKGROUND SYNC (future) ────────────────────── */
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
