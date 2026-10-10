// Spieleabend: Offline-Speicher und Updates für alle Spiele der App.
// Jede Version liegt in einem eigenen Speicher. Beim Installieren wird jede Datei frisch vom Server geladen
// und gegen ihre SHA-256-Prüfsumme geprüft. Stimmt eine nicht (halber Upload, alter Zwischenspeicher),
// schlägt die Installation fehl und die bisherige Version läuft unverändert weiter.
// Die neue Version wartet, bis die App „SKIP_WAITING“ schickt (siehe js/update.js).
// Den Block zwischen den Markierungen schreibt tools/release.py im Repo – nicht von Hand ändern.
// @generated-start
const VERSION = "1.2.0";
const FILES = {
  "./": "a41673ad9ca43836cee0826bbcdc51de74b996a85fb8542c4fe9f2554db217e7",
  "chooser/": "c367e9f47ef94f6d92e72462b41d6ed1b3eee75749141e79969d88957bd54a42",
  "chooser/index.html": "c367e9f47ef94f6d92e72462b41d6ed1b3eee75749141e79969d88957bd54a42",
  "farbreihen/": "0afde748d4ecc180e0334ba927948949b1bbb0f7fac65586fc1e09c3be5d7aee",
  "farbreihen/index.html": "0afde748d4ecc180e0334ba927948949b1bbb0f7fac65586fc1e09c3be5d7aee",
  "heisskalt/": "a6ca21c516eba5c62dbfba1f1fb7af5ddcb6c536a0294f59b3e8abe1e816b26d",
  "heisskalt/index.html": "a6ca21c516eba5c62dbfba1f1fb7af5ddcb6c536a0294f59b3e8abe1e816b26d",
  "heisskalt/peerjs-LICENSE.txt": "593ab558812adebebf361d767b0b2ca5b71085939dabf8881faa320310f3fb3b",
  "heisskalt/peerjs.min.js": "ad5d8870d1e389914f9cba8d35be313c4327c69ee0a221e482e9bf7621136fe5",
  "home.js": "c001aeee7bc6c3ef706d1c040cadfaf3620a9e6ac6e15a208700866fc747c9ce",
  "icon-180.png": "25f35bd1b4038b6741dd4452e532bf40625f58770e9a416f21a3c14192160e72",
  "icon-192.png": "afd6dbc87ad9b6badabc2adf97a61b6ffad290acc050e23d8d4148edcfc4b6ed",
  "icon-512.png": "60377a13fc54d65f4293368da4a78d6752838867025f8c462c87167d43f5a2a7",
  "index.html": "a41673ad9ca43836cee0826bbcdc51de74b996a85fb8542c4fe9f2554db217e7",
  "manifest.webmanifest": "d3f6234e59ad14b17419d25069efd420447c6f41a45765bb9b46356b74392c35",
  "pasch/": "a2e226a24aec186104262d0167096f3ffec764bff105b1d6ecc0ddb86d9371f9",
  "pasch/index.html": "a2e226a24aec186104262d0167096f3ffec764bff105b1d6ecc0ddb86d9371f9",
  "shared/base.css": "e4cde083b1b0ba63876a5be83f13841e81e58e1c78fedc4caa838588724b79e3",
  "shared/kit.css": "5f2b8618528a432032b0e7c4d32968128712dcdada1a543ea2face6b2ab2230f",
  "shared/kit.js": "bfac6a6f4937b443b189dbccefa2833dda4d2f023dfead27d8a4df5124efe7fb",
  "shared/shell.js": "d22ae59be144aa7998a9471fadcaa64dfc4a0a9bc130eb52427088a6947f15d0",
  "silbertablett/": "d69610942e8af96e7b2c16a6e8091215f391b50858f2fd902c3e479c1a9ecb88",
  "silbertablett/app.css": "14d7f80736873082f2af7e6ac32370e1e0ef8e640de0a9646f7ea58435708928",
  "silbertablett/index.html": "d69610942e8af96e7b2c16a6e8091215f391b50858f2fd902c3e479c1a9ecb88",
  "silbertablett/js/blaetter.js": "9706ad9de8bb76717ac79fd4ea0f95fbd48bc48b65721752fb529ea427488f82",
  "silbertablett/js/ui.js": "8133409c194a6ee9ac9feee3fa9ae39b3b0ca8e49f8e295a07b21bccedfa5863",
  "silbertablett/js/wuerfel.js": "54ea51a55d82eecab654dae1a78a7a2f02abf0e2d12c474df03a572962ff1518",
  "wortagenten/": "67c3a8c6263fefc1b66449ae94809b6da70cddaa3355dc24a8f278395a1cf09c",
  "wortagenten/index.html": "67c3a8c6263fefc1b66449ae94809b6da70cddaa3355dc24a8f278395a1cf09c",
  "wortbombe/": "e0a260466af94b9d6cf0eef23bd6de7c0ffe21801d6fc1209733a0215e48e93a",
  "wortbombe/index.html": "e0a260466af94b9d6cf0eef23bd6de7c0ffe21801d6fc1209733a0215e48e93a",
  "wortbombe/peerjs-LICENSE.txt": "593ab558812adebebf361d767b0b2ca5b71085939dabf8881faa320310f3fb3b",
  "wortbombe/peerjs.min.js": "ad5d8870d1e389914f9cba8d35be313c4327c69ee0a221e482e9bf7621136fe5"
};
// @generated-end

const PREFIX = "spieleabend-";
const CACHE = PREFIX + VERSION;

function hex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchVerified(cache, path, expected) {
  const res = await fetch(new Request(path, { cache: "reload" }));
  if (!res.ok) throw new Error("HTTP " + res.status + " für " + path);
  const body = await res.arrayBuffer();
  const actual = hex(await crypto.subtle.digest("SHA-256", body));
  if (actual !== expected) throw new Error("Prüfsumme falsch: " + path);
  const type = res.headers.get("Content-Type") || "application/octet-stream";
  await cache.put(path, new Response(body, { status: 200, headers: { "Content-Type": type } }));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await Promise.all(Object.entries(FILES).map(([path, hash]) => fetchVerified(cache, path, hash)));
    } catch (err) {
      await caches.delete(CACHE);
      throw err;
    }
    // Allererste Installation: sofort aktiv werden, es gibt nichts zu ersetzen
    if (!self.registration.active) self.skipWaiting();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      // Nur eigene alte Stände löschen: Andere Apps auf derselben Domain teilen sich den Speicher.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Versionsdatei immer frisch vom Server, nie aus dem Speicher
  if (url.pathname.endsWith("/version.json")) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (err) {
      if (req.mode === "navigate") {
        const shell = await cache.match("./");
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
