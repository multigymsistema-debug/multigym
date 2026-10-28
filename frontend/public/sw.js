const CACHE = 'multigym-static-v6';
const ROOT = new URL('./', self.registration.scope);
const STATIC_ASSETS = [
  new URL('logo-symbol.png', ROOT).href,
  new URL('logo-full.png', ROOT).href,
  new URL('icon-192.png', ROOT).href,
  new URL('icon-512.png', ROOT).href,
  new URL('manifest.json', ROOT).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Always fetch the app shell and fingerprinted bundles from the network.
  // Never return index.html as a failed JavaScript/CSS response.
  if (request.mode === 'navigate' || url.pathname.includes('/assets/')) return;

  if (!/\.(png|svg|webp|ico|json)$/.test(url.pathname)) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});
