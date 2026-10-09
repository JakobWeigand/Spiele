// Wortbombe: Offline-Speicher.
// Alles wird beim ersten Öffnen gespeichert und danach immer aus dem Speicher geladen.
// Antworten mit Fehlerstatus überschreiben den Speicher nie.
// Alle Spiele liegen auf derselben Domain und teilen sich den Cache-Speicher:
// Deshalb räumt diese App nur Caches mit ihrem eigenen Präfix auf.
const PREFIX = "wortbombe-";
const CACHE = PREFIX + "v7";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.open(CACHE).then((cache) => cache.match(event.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(event.request).then((res) => {
        if (res.ok && new URL(event.request.url).origin === location.origin) cache.put(event.request, res.clone());
        return res;
      }).catch(() => event.request.mode === "navigate" ? cache.match("index.html") : Response.error());
    }))
  );
});
