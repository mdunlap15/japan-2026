// Japan 2026 — offline support
// Strategy: network-first for the page itself (so edits you push go live),
// cache-first for everything else (fonts, icons) so it all works offline.
// ██ Bump CACHE whenever trip.ics or the icons change. ██
const CACHE = 'japan-2026-v5';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png', './trip.ics'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Live data & APIs: always network, never cache
  const host = new URL(req.url).hostname;
  if (['open-meteo.com','supabase.co','railway.app','frankfurter.app','openstreetmap.org'].some((d) => host === d || host.endsWith('.' + d))) return;

  // Page navigations: try network (fresh content), fall back to cache (offline)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else (fonts, icons): cache-first, populate on first use
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});
