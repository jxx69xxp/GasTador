// Stale-while-revalidate for same-origin GETs: works offline after first visit.
// ponytail: no precache, pages never opened online aren't available offline; add a precache list if that matters.
const CACHE = 'paws-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached || cache.match('/'));
      return cached || fresh;
    })
  );
});
