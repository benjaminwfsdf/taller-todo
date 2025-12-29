// app/service-worker.js - CON NOTIFICACIONES PUSH
const VERSION = "v1.24.55"; // ⬅️ Aumenta versión

const PRECACHE = `precache-${VERSION}`;
const RUNTIME  = `runtime-${VERSION}`;

const PRECACHE_URLS = [
  // HTML
  "index.html",
  "agregar.html",
  "buscador_averias.html",
  "buscar_computadores.html",
  "buscar_dpf.html",
  "buscar.html",
  "buscar_aplicacion.html",
  "cliente.html",
  "clientes_turno.html",
  "computador.html",
  "dpf_anadir.html",
  "dpf_off.html",
  "estado.html",
  "gestion_autos.html",
  "informes.html",
  "panel_clientes.html",
  "recepcion.html",

  // Iconos
  "icons/icon-72.png",
  "icons/icon-192.png",
  "icons/icon-512.png",

  // Otros
  "img/scanner.png",
  "manifest.json"
];

/* ================= NOTIFICACIONES PUSH ================= */
self.addEventListener('push', event => {
  console.log('📬 Notificación push recibida');
  
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    // Si no hay datos JSON, crear notificación básica
    data = {
      title: '🚗 Taller App',
      body: event.data.text() || 'Nueva alerta del taller',
      icon: '/icons/icon-192.png',
      data: { url: '/recepcion.html' }
    };
  }

  const options = {
    body: data.body || 'Aviso del sistema',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    data: {
      url: data.url || '/recepcion.html',
      timestamp: Date.now(),
      enEspera: data.enEspera || 0
    },
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

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/recepcion.html';
  
  if (event.action === 'ver' || !event.action) {
    event.waitUntil(
      clients.matchAll({ 
        type: 'window', 
        includeUncontrolled: true 
      })
      .then(windowClients => {
        // Buscar ventana ya abierta
        for (const client of windowClients) {
          if (client.url.includes('recepcion') && 'focus' in client) {
            return client.focus();
          }
        }
        // Abrir nueva ventana
        return clients.openWindow(urlToOpen);
      })
    );
  }
});

/* ================= INSTALL ================= */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ================= ACTIVATE ================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Limpiar caches viejos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![PRECACHE, RUNTIME].includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control inmediato
      self.clients.claim()
    ])
  );
});

/* ================= FETCH ================= */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo controlamos mismo origen
  if (url.origin !== location.origin) return;

  /* ================= NAVEGACIÓN HTML ================= */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }) ||
          caches.match("index.html")
        )
    );
    return;
  }

  /* ================= ARCHIVOS ESTÁTICOS ================= */
  const isStaticFile = /\.(css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|otf|json)$/i.test(url.pathname);
  
  if (isStaticFile) {
    event.respondWith(
      caches.match(req)
        .then((cached) => {
          if (cached) return cached;
          
          return fetch(req)
            .then((res) => {
              const copy = res.clone();
              caches.open(RUNTIME).then((cache) => cache.put(req, copy));
              return res;
            })
            .catch(() => {
              // Fallback para íconos
              if (url.pathname.includes('icon')) {
                return caches.match('/icons/icon-192.png');
              }
              return new Response('Offline', { status: 503 });
            });
        })
    );
    return;
  }

  /* ================= API REQUESTS ================= */
  if (url.pathname.includes('macros')) {
    event.respondWith(
      fetch(req)
        .catch(() => {
          // No cache para APIs
          return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  /* ================= OTROS ================= */
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
