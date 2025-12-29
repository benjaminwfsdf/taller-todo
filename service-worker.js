// service-worker.js - CON FIREBASE
const VERSION = "v1.28.55";

// Importar Firebase
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuración de Firebase - TUS DATOS
firebase.initializeApp({
  apiKey: "AIzaSyDGZEc964LiBmPznahVJc0PCh7xUAzxxGc",
  authDomain: "taller-todo.firebaseapp.com",
  projectId: "taller-todo",
  storageBucket: "taller-todo.firebasestorage.app",
  messagingSenderId: "986114429526",
  appId: "1:986114429526:web:0179649bb1b60ceb8361f7"
});

const messaging = firebase.messaging();

// ========== MANEJAR NOTIFICACIONES EN BACKGROUND ==========
messaging.onBackgroundMessage((payload) => {
  console.log('📬 [Firebase] Notificación en background:', payload);
  
  const notificationTitle = payload.notification?.title || '🚗 Taller App';
  const notificationOptions = {
    body: payload.notification?.body || 'Nueva alerta del taller',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200, 100, 200],
    data: payload.data || { url: '/recepcion.html' },
    actions: [
      {
        action: 'ver',
        title: '👁️ Ver cola'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ========== MANEJAR NOTIFICACIONES ESTÁNDAR ==========
self.addEventListener('push', event => {
  console.log('📬 Notificación push recibida');
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: '🚗 Taller App',
      body: 'Nueva alerta del taller',
      icon: '/icons/icon-192.png',
      data: { url: '/recepcion.html' }
    };
  }

  const options = {
    body: data.body || 'Aviso del sistema',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || { url: '/recepcion.html' },
    actions: [
      {
        action: 'ver',
        title: '👁️ Ver cola'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🚗 Taller App', options)
  );
});

// ========== MANEJAR CLIC EN NOTIFICACIÓN ==========
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/recepcion.html';
  
  if (event.action === 'ver' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          for (const client of windowClients) {
            if (client.url.includes('recepcion') && 'focus' in client) {
              return client.focus();
            }
          }
          return clients.openWindow(urlToOpen);
        })
    );
  }
});

// ========== CACHE BÁSICO ==========
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
