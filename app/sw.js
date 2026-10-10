// Spieleabend: Offline-Speicher und Updates für alle Spiele der App.
// Jede Version liegt in einem eigenen Speicher. Beim Installieren wird jede Datei frisch vom Server geladen
// und gegen ihre SHA-256-Prüfsumme geprüft. Stimmt eine nicht (halber Upload, alter Zwischenspeicher),
// schlägt die Installation fehl und die bisherige Version läuft unverändert weiter.
// Die neue Version wartet, bis die App „SKIP_WAITING“ schickt (siehe js/update.js).
// Den Block zwischen den Markierungen schreibt tools/release.py im Repo – nicht von Hand ändern.
// @generated-start
const VERSION = "1.1.0";
const FILES = {
  "./": "ad37fb6f1be62247c086d4ac3612d0ec675ed25ac66aa85c624366cfb5bbfaf0",
  "chooser/": "c5903198010b657eeda4d94bf209c99117a836e6d58b22e46be249b435040813",
  "chooser/index.html": "c5903198010b657eeda4d94bf209c99117a836e6d58b22e46be249b435040813",
  "farbreihen/": "d44afb17589621ab8d8f2852756497c345a82f31ebe605d5702f4c0f4946eb5f",
  "farbreihen/index.html": "d44afb17589621ab8d8f2852756497c345a82f31ebe605d5702f4c0f4946eb5f",
  "heisskalt/": "8c134ccd2f0f49e59a83359b5dced0f8ae0c8dfe832097a460c392829e9241be",
  "heisskalt/index.html": "8c134ccd2f0f49e59a83359b5dced0f8ae0c8dfe832097a460c392829e9241be",
  "heisskalt/peerjs-LICENSE.txt": "593ab558812adebebf361d767b0b2ca5b71085939dabf8881faa320310f3fb3b",
  "heisskalt/peerjs.min.js": "ad5d8870d1e389914f9cba8d35be313c4327c69ee0a221e482e9bf7621136fe5",
  "home.js": "c001aeee7bc6c3ef706d1c040cadfaf3620a9e6ac6e15a208700866fc747c9ce",
  "icon-180.png": "25f35bd1b4038b6741dd4452e532bf40625f58770e9a416f21a3c14192160e72",
  "icon-192.png": "afd6dbc87ad9b6badabc2adf97a61b6ffad290acc050e23d8d4148edcfc4b6ed",
  "icon-512.png": "60377a13fc54d65f4293368da4a78d6752838867025f8c462c87167d43f5a2a7",
  "index.html": "ad37fb6f1be62247c086d4ac3612d0ec675ed25ac66aa85c624366cfb5bbfaf0",
  "manifest.webmanifest": "d3f6234e59ad14b17419d25069efd420447c6f41a45765bb9b46356b74392c35",
  "pasch/": "94a53199dc694d93882092808ae12d932291b825c4760d4706d7fbc237ceb0e4",
  "pasch/index.html": "94a53199dc694d93882092808ae12d932291b825c4760d4706d7fbc237ceb0e4",
  "shared/base.css": "d5fa0d4742000d655a6a96c92ec277ae70b2834eed8f82e66270c32aa5fb5148",
  "shared/kit.css": "644058cfb7776f79232a5f8443cb3c6937c924035849379f27cd6700219e2c38",
  "shared/kit.js": "3889e8cb3fdcbd81aefd845c210aaedde3c7e8aa5542d708600ccc2bd51c01bb",
  "shared/shell.js": "4173f94f90cc51fa2fe98938b8fbdbb85c4920e4cbc36f430b24e11220e26140",
  "silbertablett/": "ac5de83bffab6369fe9663bde9b0fd8c7d9d253e8ba50971e60510e72af636ed",
  "silbertablett/app.css": "4c596bb0ed62ddc2f1e6355d5244bcf1a6d284e8f4bc9141330643f0651fbd34",
  "silbertablett/index.html": "ac5de83bffab6369fe9663bde9b0fd8c7d9d253e8ba50971e60510e72af636ed",
  "silbertablett/js/blaetter.js": "9706ad9de8bb76717ac79fd4ea0f95fbd48bc48b65721752fb529ea427488f82",
  "silbertablett/js/ui.js": "808a34ff0194456de42ce7260b82a4c47a26afed80a3c6c556c8dd4f159c50b1",
  "silbertablett/js/wuerfel.js": "54ea51a55d82eecab654dae1a78a7a2f02abf0e2d12c474df03a572962ff1518",
  "wortagenten/": "89e0a647ad5647b01cfd657989d6b484432ca18b5725250bbc4ace0d10cc8efd",
  "wortagenten/index.html": "89e0a647ad5647b01cfd657989d6b484432ca18b5725250bbc4ace0d10cc8efd",
  "wortbombe/": "ad1bda5af84aacc50ab230f65c0703f4e5ffe14b0dae513dd5e55e0d05f6213d",
  "wortbombe/index.html": "ad1bda5af84aacc50ab230f65c0703f4e5ffe14b0dae513dd5e55e0d05f6213d",
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
