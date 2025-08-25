// app/service-worker.js
const VERSION = "v1.0.1";
const PRECACHE = `precache-${VERSION}`;
const RUNTIME  = `runtime-${VERSION}`;

const PRECACHE_URLS = [
  // HTML
  "/app/index.html",
  "/app/agregar.html",
  "/app/buscador_averias.html",
  "/app/buscar_computadores.html",
  "/app/buscar_dpf.html",
  "/app/buscar.html",
  "/app/cliente.html",
  "/app/clientes_turno.html",
  "/app/computador.html",
  "/app/dpf_cosas.html",
  "/app/dpf_off.html",
  "/app/estado.html",
  "/app/gestion_autos.html",
  "/app/informes.html",
  "/app/panel_clientes.html",

  // Iconos
  "/app/icons/icon-192.png",
  "/app/icons/icon-512.png",

  // Otros
  "/app/img/scanner.png",
  "/app/manifest.json"
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
