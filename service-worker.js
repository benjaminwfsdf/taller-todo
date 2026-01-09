// service-worker.js - CON FIREBASE - VERSIÓN CORREGIDA
const VERSION = "v1.51.99";

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

// ========== RECIBIR MENSAJES DEL CLIENTE ==========
self.addEventListener('message', event => {
  console.log('📬 Service Worker recibió mensaje:', event.data);
  
  if (event.data && event.data.type === 'SEND_PUSH_NOTIFICATION') {
    const { notification } = event.data;
    
    console.log('📤 Mostrando notificación desde cliente:', notification.title);
    
    // CORRECCIÓN: No usar window.location.href en Service Worker
    const notificationData = notification.data || { url: '/recepcion.html' };
    
    // Mostrar notificación inmediatamente
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon || '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: notification.vibrate || [200, 100, 200, 100, 200],
      data: notificationData,
      actions: [
        {
          action: 'ver',
          title: '👁️ Ver cola'
        }
      ]
    }).catch(error => {
      console.error('Error mostrando notificación desde cliente:', error);
    });
  }
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
  
  console.log('👆 Notificación clickeada, abriendo:', urlToOpen);
  
  if (event.action === 'ver' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          // Buscar ventana existente
          for (const client of windowClients) {
            if (client.url.includes('recepcion') && 'focus' in client) {
              console.log('✅ Enfocando ventana existente');
              return client.focus();
            }
          }
          // Abrir nueva ventana
          console.log('🆕 Abriendo nueva ventana');
          return clients.openWindow(urlToOpen);
        })
        .catch(error => {
          console.error('Error al manejar clic en notificación:', error);
          // Fallback: intentar abrir directamente
          return clients.openWindow(urlToOpen);
        })
    );
  }
});

// ========== CACHE BÁSICO MEJORADO ==========
const CACHE_NAME = 'taller-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/recepcion.html',
  '/clientes_turno.html',
  '/icons/icon-72.png',
  '/icons/icon-192.png',
  '/manifest.json',
  '/service-worker.js'
];

self.addEventListener('install', event => {
  console.log('🔧 Service Worker instalándose...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cacheando archivos esenciales');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Skip waiting activado');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('⚡ Service Worker activado');
  event.waitUntil(
    Promise.all([
      // Limpiar caches viejos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Eliminando cache viejo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control de todas las pestañas
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  // Solo cachear solicitudes GET
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en cache, devolverlo
        if (response) {
          console.log('📦 Sirviendo desde cache:', event.request.url);
          return response;
        }
        
        // Si no está en cache, hacer fetch y cachear
        console.log('🌐 Haciendo fetch:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Verificar si la respuesta es válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la respuesta para cachearla
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('Error en fetch:', error);
            // Si es una página y falla, mostrar offline
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Error de conexión', { status: 503 });
          });
      })
  );
});

// ========== MANEJAR SINCRONIZACIÓN EN BACKGROUND ==========
self.addEventListener('sync', event => {
  console.log('🔄 Sincronización en background:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Aquí podrías sincronizar datos pendientes
      Promise.resolve().then(() => {
        console.log('✅ Sincronización completada');
      })
    );
  }
});
