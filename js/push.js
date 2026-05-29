// js/push.js — Suscripción a notificaciones push (FCM)
// Pide permiso, obtiene token FCM y lo guarda en Firestore fcmTokens/{athId}.
(function(){
'use strict';

// VAPID public key — obtenida en Firebase Console → Project Settings → Cloud Messaging → Web Push certificates.
const VAPID_PUBLIC_KEY = 'BCl09mTtNgL7tBjxe4M6lQiNGmgL4MJ6cMlAxsTBupQDpY-zVrNUaYwjeIbE1bw7Ow1jKkjijBLfHzbB9R-AhsM';

let _messaging = null;

function _initMessaging(){
  if(_messaging) return _messaging;
  if(typeof firebase === 'undefined' || !firebase.messaging) return null;
  try {
    _messaging = firebase.messaging();
    return _messaging;
  } catch(_){ return null; }
}

// Verifica si el navegador soporta push y si el usuario ya dio permiso.
function pushSupported(){
  return 'serviceWorker' in navigator
      && 'PushManager'    in window
      && 'Notification'   in window;
}

function pushPermission(){
  if(!pushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// Pide permiso, obtiene token, lo guarda en Firestore.
async function enablePushFor(athId){
  if(!pushSupported()) throw new Error('Tu navegador no soporta notificaciones');
  if(!_initMessaging()) throw new Error('Messaging no inicializado');

  const perm = await Notification.requestPermission();
  if(perm !== 'granted') throw new Error('Permiso denegado');

  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await _messaging.getToken({ vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: reg });
  if(!token) throw new Error('No se pudo obtener token');

  await window.db.collection('fcmTokens').doc(athId).set({
    token, updatedAt: new Date().toISOString(),
    ua: navigator.userAgent.slice(0,120)
  });

  return token;
}

// Foreground listener — muestra toast cuando llega un push con la app abierta.
function attachForegroundHandler(){
  const m = _initMessaging();
  if(!m) return;
  m.onMessage(payload => {
    const { title, body } = payload.notification || {};
    if(typeof toast === 'function') toast((title || 'Squad Team') + (body ? ' · ' + body : ''));
  });
}

// API pública.
window.SQ_PUSH = {
  supported: pushSupported,
  permission: pushPermission,
  enableFor: enablePushFor,
  attachForeground: attachForegroundHandler,
  vapidKey: VAPID_PUBLIC_KEY,
};

})();
