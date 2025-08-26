// app/service-worker.js
const VERSION = "v1.0.40";


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
  "cliente.html",
  "clientes_turno.html",
  "computador.html",
  "dpf_cosas.html",
  "dpf_off.html",
  "estado.html",
  "gestion_autos.html",
  "informes.html",
  "panel_clientes.html",

  // Iconos
  "icons/icon-192.png",
  "icons/icon-512.png",

  // Otros
  "img/scanner.png",
  "manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((key) => ![PRECACHE, RUNTIME].includes(key))
        .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== location.origin) return;

  // Navegación (HTML): cache-first
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Estáticos (css/js/img)
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

  // Otros
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
