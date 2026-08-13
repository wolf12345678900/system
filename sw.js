/* ══════════════════════════════════════════════════════════════════
   sw.js — Service Worker: App-Shell zwischenspeichern, offline nutzbar
   ══════════════════════════════════════════════════════════════════ */

const CACHE = 'system-v2';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/state.js',
  'js/engine.js',
  'js/content.js',
  'js/views.js',
  'js/ui.js',
  'js/audio.js',
  'js/charts.js',
  'assets/icon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/apple-touch-icon.png',
  'assets/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('Shell nicht vollständig zwischengespeichert:', err))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Programmcode muss aktuell sein, Bilder dürfen aus dem Cache kommen. */
const CODE = /\.(?:js|css|html|webmanifest)$/i;

/** Erst Netz, bei Erfolg Cache auffrischen; offline aus dem Cache. */
async function networkFirst(req, cacheKey = null) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(cacheKey || req, copy));
    }
    return res;
  } catch (err) {
    const hit = await caches.match(cacheKey || req);
    if (hit) return hit;
    throw err;
  }
}

/** Erst Cache, sonst Netz — für Dateien, die sich praktisch nie ändern. */
async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  // Die Seite selbst
  if (req.mode === 'navigate') {
    e.respondWith(
      networkFirst(req, 'index.html')
        .catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  const path = new URL(req.url).pathname;
  e.respondWith(CODE.test(path) ? networkFirst(req) : cacheFirst(req));
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
