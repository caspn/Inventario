const CACHE = 'cas-inventario-v4';

// All'installazione non pre-carichiamo nulla
self.addEventListener('install', e => {
  self.skipWaiting();
});

// All'attivazione puliamo le cache vecchie
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Richieste a Google (sheets, script) → sempre rete, mai cache
  if (url.hostname.includes('google') || url.hostname.includes('googleapis')) {
    return;
  }

  // File HTML → network-first: prova sempre la rete, cache solo se offline
  if (e.request.destination === 'document' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Font, immagini, JS, CSS → cache-first (cambiano raramente)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
