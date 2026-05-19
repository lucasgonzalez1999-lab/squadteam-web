const CACHE = 'squadteam-v4';
const STATIC = [
  '/',
  '/css/main.css?v=3',
  '/css/nutrition-export.css',
  '/js/utils.js?v=3',
  '/js/data.js?v=3',
  '/js/storage.js?v=3',
  '/js/auth.js?v=3',
  '/js/app.js?v=3',
  '/js/coach.js?v=3',
  '/js/clases.js?v=3',
  '/js/athlete.js?v=3',
  '/js/miRutina.js?v=3',
  '/js/checkin.js?v=3',
  '/js/pagos.js?v=3',
  '/js/sheetSync.js?v=3',
  '/js/sheetStats.js?v=3',
  '/js/routineBuilder.js?v=3',
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
