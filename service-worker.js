// app/service-worker.js
const VERSION = "v1.22.55"; // ⬅️ subimos versión para forzar update


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
  "buscar_aplicacion.html", // ⬅️ IMPORTANTE
  "cliente.html",
  "clientes_turno.html",
  "computador.html",
  "dpf_anadir.html",
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

  /* ================= NAVEGACIÓN HTML =================
     🔑 CAMBIO CLAVE:
     - NO usamos cache-first para navegación
     - Evita que el navegador "recicle" la pestaña actual
     - Permite múltiples ventanas PWA independientes
  */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          // fallback offline: intenta servir desde cache
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
