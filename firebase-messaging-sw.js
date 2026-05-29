// Firebase Cloud Messaging — Service Worker dedicado.
// FCM busca este archivo en la raíz del sitio para recibir pushes en background.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA9I05xscqMsotp_Ke7D9sbHw2pqHP9DQY",
  authDomain: "squadteam-55dea.firebaseapp.com",
  projectId: "squadteam-55dea",
  storageBucket: "squadteam-55dea.firebasestorage.app",
  messagingSenderId: "87384506862",
  appId: "1:87384506862:web:e8c02392cae58952490eff"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title = 'Squad Team', body = '' } = payload.notification || {};
  const link = payload.data?.link || '/';
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.data?.tag || 'sq-default',
    data: { link },
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.link || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) { c.focus(); c.navigate(url); return; }
      }
      return self.clients.openWindow(url);
    })
  );
});
