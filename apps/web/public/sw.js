// ShasthoSetu AI — Zero-PHI Progressive Web App Service Worker
// Strictly caches static application assets; NEVER caches /v1/* clinical APIs, audio recordings, or patient health data.

const CACHE_NAME = "shasthosetu-shell-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/shasthosetu-logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ZERO-PHI RULE: All API calls, audio blobs, and dynamic routes are strictly NetworkOnly
  if (url.pathname.startsWith("/v1/") || url.pathname.startsWith("/api/") || event.request.method !== "GET") {
    return; // Pass through directly to network, zero cache storage
  }

  // Network-first for HTML pages, cache-first for static fonts/images
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful static asset responses
        if (
          response &&
          response.status === 200 &&
          (url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css") ||
            url.pathname.endsWith(".png") ||
            url.pathname.endsWith(".svg") ||
            url.pathname.endsWith(".woff2"))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
