const CACHE = "zenith-shell-v5";
const SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./secure-vault.js", "./drive-sync.js", "./config.js", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const view = event.notification.data?.view || "habits";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      const existing = windows[0];
      if (existing) {
        await existing.focus();
        existing.postMessage({ type: "zenith-open-view", view });
        return;
      }
      return clients.openWindow(`./?view=${encodeURIComponent(view)}`);
    }),
  );
});
