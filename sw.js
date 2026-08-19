// Dra. Lucia Kratz — Service Worker PWA
const CACHE_NAME = 'clinica-v1';

const ASSETS = [
  '/clinica-dra.LuciaKratz/',
  '/clinica-dra.LuciaKratz/index.html',
  '/clinica-dra.LuciaKratz/manifest.json',
  '/clinica-dra.LuciaKratz/offline.html',
  '/clinica-dra.LuciaKratz/logo.png',
  '/clinica-dra.LuciaKratz/logo-transparente.png',
];

// ── INSTALL ──────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH — Cache first para assets estáticos, network first para o resto ──
self.addEventListener('fetch', (e) => {
  // Ignora requisições de terceiros (Firebase, googleapis, etc.)
  if (
    e.request.url.includes('firestore') ||
    e.request.url.includes('firebase') ||
    e.request.url.includes('googleapis') ||
    e.request.url.includes('gstatic') ||
    e.request.url.includes('run.app')
  ) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && e.request.method === 'GET') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          if (e.request.mode === 'navigate') return caches.match('/clinica-dra.LuciaKratz/offline.html');
          return cached;
        });
      return cached || network;
    })
  );
});
