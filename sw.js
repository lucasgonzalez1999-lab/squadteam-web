const CACHE = 'squadteam-v3';
const STATIC = [
  '/',
  '/css/main.css?v=2',
  '/css/nutrition-export.css',
  '/js/utils.js?v=2',
  '/js/data.js?v=2',
  '/js/storage.js?v=2',
  '/js/auth.js?v=2',
  '/js/app.js?v=2',
  '/js/coach.js?v=2',
  '/js/clases.js?v=2',
  '/js/athlete.js?v=2',
  '/js/miRutina.js?v=2',
  '/js/checkin.js?v=2',
  '/js/pagos.js?v=2',
  '/js/sheetSync.js?v=2',
  '/js/sheetStats.js?v=2',
  '/js/routineBuilder.js?v=2',
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
  if(e.request.method !== 'GET') return;
  const url = e.request.url;
  if(url.includes('firestore.googleapis.com') || url.includes('googleapis.com') ||
     url.includes('gstatic.com') || url.includes('fonts.')) return;

  e.respondWith(
    fetch(e.request).then(res => {
      if(res.ok && res.type === 'basic'){
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
