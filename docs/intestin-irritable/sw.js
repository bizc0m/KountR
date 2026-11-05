const CACHE = "countr-intestin-irritable-2.1.0";
const FILES = [
  "./", "./index.html", "./COUNTr-skin.css", "./counter-core.js", "./engine.js?v=2.1.0", "./storage.js",
  "./manifest.webmanifest", "./icon.svg", "../assets/boards.js", "../assets/counter-v2.js?v=2.1.0",
  "../assets/counter-v2.css?v=2.0.1", "../assets/shared-header.css?v=2.0.1", "../assets/site-config.js", "../assets/site-header.js?v=2.0.1",
  "../assets/language.css", "../assets/language.js", "../assets/locales.js"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === location.origin) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match("./index.html"))));
});
