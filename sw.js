/* ARIS Field service worker — makes the app work fully offline.
   Strategy: stale-while-revalidate for the shell (instant offline load, silent updates
   when online), cache-first for the immutable icons. Bump CACHE on breaking changes. */
const CACHE = 'aris-field-v8';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png', './logo-white.png'];

self.addEventListener('install', (e) => {
  // No skipWaiting here: the page shows an "Update now" banner and tells us when to switch,
  // so a mid-session deploy never yanks the app out from under the user.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
