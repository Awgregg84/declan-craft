/* Declan-craft offline support: keeps a copy of the game on the device so it starts without internet.
   Online, the newest version is used; the saved copy covers no connection, a very slow one,
   or the website being unavailable. */
const CACHE = 'declan-craft-f4099a24e94b';
const CORE = ['./', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('declan-craft-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function networkFirst(req, key) {
  return new Promise(resolve => {
    let settled = false;
    const done = r => { if (!settled) { settled = true; resolve(r); } };
    const saved = () => caches.match(key);
    const timer = setTimeout(() => saved().then(r => { if (r) done(r); }), 4000);
    fetch(req).then(res => {
      if (res.ok || res.type === 'opaqueredirect') {
        clearTimeout(timer);
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
        done(res);
      } else saved().then(r => { clearTimeout(timer); done(r || res); });
    }, () => saved().then(r => { clearTimeout(timer); done(r || Response.error()); }));
  });
}

function cacheFirst(req) {
  return caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(networkFirst(req, req.mode === 'navigate' ? './' : req));
  else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(cacheFirst(req));
});
