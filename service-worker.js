
const CACHE_NAME = "highfield-verification-v9-wordmark";
const CORE = [
  "./",
  "index.html",
  "css/styles.css",
  "css/mobile.css",
  "css/print.css",
  "js/config.js",
  "js/utils.js",
  "js/certificate.js",
  "js/qr.js",
  "js/pdf.js",
  "js/app.js",
  "assets/certificate-template.png",
  "assets/favicon.svg"
];

self.addEventListener("install",event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate",event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch",event => {
  if(event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
