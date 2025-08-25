// pwa-standalone.js
(() => {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true; // iOS

  if (!isStandalone) return; // Solo aplica cuando está instalada

  // Intercepta clics en <a> para controlar navegación
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;

    // Ignora downloads / mailto / tel
    if (a.hasAttribute('download') ||
        a.href.startsWith('mailto:') ||
        a.href.startsWith('tel:')) return;

    const href = a.getAttribute('href');
    const url = new URL(href, location.href);

    // Si el enlace marca "external", deja que abra Safari
    if (a.dataset.pwa === 'external') return;

    // Enlaces del mismo origen → mantener dentro de la PWA
    if (url.origin === location.origin) {
      e.preventDefault();
      if (a.dataset.pwa === 'replace') {
        location.replace(url.pathname + url.search + url.hash);
      } else {
        location.assign(url.pathname + url.search + url.hash);
      }
    }
  });

  // Parchea window.open: internos dentro de la PWA
  const _open = window.open;
  window.open = function (url, target, features) {
    try {
      const u = new URL(url, location.href);
      if (u.origin === location.origin) {
        location.assign(u.pathname + u.search + u.hash);
        return null;
      }
    } catch (_) {}
    return _open.call(window, url, target, features);
  };

  // Helpers opcionales
  window.pwaNavigate = (path, replace = false) =>
    replace ? location.replace(path) : location.assign(path);

  window.pwaOpenExternal = (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.dataset.pwa = 'external';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
})();
