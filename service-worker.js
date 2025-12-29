// app/service-worker.js
const VERSION = "v1.23.88"; // ⬅️ Aumenta versión

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
  "recepcion.html", // ⬅️ AÑADE ESTA LÍNEA

  // Iconos
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-72.png",

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
    data = {
      title: 'Taller - Alerta',
      body: 'Cola alta en el taller',
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
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          // Buscar si ya hay una ventana abierta
          for (const client of windowClients) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // Si no hay, abrir nueva
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

/* ================= INSTALL ================= */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

/* ================= ACTIVATE ================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![PRECACHE, RUNTIME].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
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
  if (/\.(css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|otf)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  /* ================= OTROS ================= */
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
