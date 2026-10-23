// The app files (HTML, CSS, JavaScript, icons) are kept on the phone: the app opens at once from them,
// and the newest version is fetched in the background (it is used on the next opening).
// Data is never cached here: it comes from Supabase (another address), or from /api on this computer, and both are left alone.
// Change CACHE after uploading new files, so phones throw the old copy away.
const CACHE = 'shahi-v8';
const HOME = new URL('./', location.href).href;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const saved = await cache.match(e.request);
      const fresh = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => saved || cache.match(HOME));
      if (saved) {
        e.waitUntil(fresh.catch(() => {}));
        return saved;
      }
      return fresh;
    })
  );
});
