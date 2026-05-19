const CACHE = 'squadteam-v1';
const STATIC = [
  '/',
  '/css/main.css',
  '/css/nutrition-export.css',
  '/js/utils.js',
  '/js/data.js',
  '/js/storage.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/coach.js',
  '/js/clases.js',
  '/js/athlete.js',
  '/js/miRutina.js',
  '/js/checkin.js',
  '/js/pagos.js',
  '/js/sheetSync.js',
  '/js/sheetStats.js',
  '/js/routineBuilder.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Solo cachear GET, ignorar Firebase y externas
  if(e.request.method !== 'GET') return;
  const url = e.request.url;
  if(url.includes('firestore.googleapis.com') || url.includes('googleapis.com') ||
     url.includes('gstatic.com') || url.includes('fonts.')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if(res.ok && res.type === 'basic'){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});
