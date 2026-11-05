const CACHE_PREFIX = "countr-migraine-";
const CACHE = `${CACHE_PREFIX}2.2.0`;
const FILES = [
  "./", "./index.html", "./COUNTr-skin.css", "./notemistress.css?v=3", "./skin-toggle.js?v=1",
  "./counter-core.js", "./engine.js?v=2.1.0", "./storage.js",
  "./manifest.webmanifest", "./icon.svg", "../assets/boards.js", "../assets/counter-v2.js?v=2.1.0",
  "../assets/counter-v2.css?v=2.0.1", "../assets/shared-header.css?v=2.0.1", "../assets/site-config.js", "../assets/site-header.js?v=2.0.1",
  "../assets/language.css", "../assets/language.js", "../assets/locales.js"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put("./index.html", response.clone()));
      return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === location.origin) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match("./index.html"))));
});
