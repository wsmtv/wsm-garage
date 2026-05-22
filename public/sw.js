// WSM Service Worker — caches app shell for offline use
const CACHE = "wsm-v1";
const SHELL  = [
  "/mobile",
  "/wsm-logo.png",
  "/models/caprice.glb",
  "/models/engine-block.glb",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // Cache-first for GLB models and static assets, network-first for pages
  const url = new URL(e.request.url);
  const isStatic = url.pathname.match(/\.(glb|ply|png|jpg|webp|woff2|ico)$/);

  if(isStatic){
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if(res.ok){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
  } else {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});
