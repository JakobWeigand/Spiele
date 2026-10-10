// Spieleabend: Offline-Speicher und Updates für alle Spiele der App.
// Jede Version liegt in einem eigenen Speicher. Beim Installieren wird jede Datei frisch vom Server geladen
// und gegen ihre SHA-256-Prüfsumme geprüft. Stimmt eine nicht (halber Upload, alter Zwischenspeicher),
// schlägt die Installation fehl und die bisherige Version läuft unverändert weiter.
// Die neue Version wartet, bis die App „SKIP_WAITING“ schickt (siehe js/update.js).
// Den Block zwischen den Markierungen schreibt tools/release.py im Repo – nicht von Hand ändern.
// @generated-start
const VERSION = "1.0.0";
const FILES = {
  "./": "02323bacc0a252e267c6b3363b9886e0fed48dcb6b9f806d98941906cf8a8692",
  "chooser/": "6d08ae61bd644241887d1b53fe3063753d6c8a2f8784a04de8b28b6700454748",
  "chooser/index.html": "6d08ae61bd644241887d1b53fe3063753d6c8a2f8784a04de8b28b6700454748",
  "farbreihen/": "76cf64754a3d64b10b335a9c5f11f22dac819a422a448b9d9041c65a8ddeae8c",
  "farbreihen/index.html": "76cf64754a3d64b10b335a9c5f11f22dac819a422a448b9d9041c65a8ddeae8c",
  "heisskalt/": "008cf4848a6cefe98b8a288e0743fd8059935716ed5f0938547a15f08937b3f5",
  "heisskalt/index.html": "008cf4848a6cefe98b8a288e0743fd8059935716ed5f0938547a15f08937b3f5",
  "heisskalt/peerjs-LICENSE.txt": "593ab558812adebebf361d767b0b2ca5b71085939dabf8881faa320310f3fb3b",
  "heisskalt/peerjs.min.js": "ad5d8870d1e389914f9cba8d35be313c4327c69ee0a221e482e9bf7621136fe5",
  "home.js": "c001aeee7bc6c3ef706d1c040cadfaf3620a9e6ac6e15a208700866fc747c9ce",
  "icon-180.png": "a2b41da577bc5aa50dfcd94d165895cfe50207ef3372142ed8b955ce37bbd57e",
  "icon-192.png": "97ff19713591d61d710482e9f378936be302a046b17f1a705b11803dfbc4df27",
  "icon-512.png": "82c461d09205bebbf1664267b6b3423f42fa7afa64936083a4ec501580549dda",
  "index.html": "02323bacc0a252e267c6b3363b9886e0fed48dcb6b9f806d98941906cf8a8692",
  "manifest.webmanifest": "edb8e89a6456863c97b6273f3c0266994164d58fd5edabfb774f0ac8837b0b21",
  "pasch/": "946613ef64946168fe6352076f3f3a2d40b0a39bb00223a8a2d9607d86c06d37",
  "pasch/index.html": "946613ef64946168fe6352076f3f3a2d40b0a39bb00223a8a2d9607d86c06d37",
  "shared/base.css": "5aa6cbd966197da478e73c7b18aeedae13d833a0c04f79d768af332a88b63767",
  "shared/kit.css": "819af8e7d8709d5ef0308aec4c2bd326c76c7596fd261bd77d2f883af0777f86",
  "shared/kit.js": "3889e8cb3fdcbd81aefd845c210aaedde3c7e8aa5542d708600ccc2bd51c01bb",
  "shared/shell.js": "4173f94f90cc51fa2fe98938b8fbdbb85c4920e4cbc36f430b24e11220e26140",
  "silbertablett/": "93ca590194cc24e6f463bf122de80d2a204a88c58bd38aaca34e4a349daa7f34",
  "silbertablett/app.css": "598dd0ec9b903ece4614b61e644a4c4ea2edbf9206d29e2edb5b126099c14548",
  "silbertablett/index.html": "93ca590194cc24e6f463bf122de80d2a204a88c58bd38aaca34e4a349daa7f34",
  "silbertablett/js/blaetter.js": "9706ad9de8bb76717ac79fd4ea0f95fbd48bc48b65721752fb529ea427488f82",
  "silbertablett/js/ui.js": "808a34ff0194456de42ce7260b82a4c47a26afed80a3c6c556c8dd4f159c50b1",
  "silbertablett/js/wuerfel.js": "54ea51a55d82eecab654dae1a78a7a2f02abf0e2d12c474df03a572962ff1518",
  "wortagenten/": "3fc0de53be95eaaff7a0830caf1ba72f00009d3c467645df40ec61932f9b8a28",
  "wortagenten/index.html": "3fc0de53be95eaaff7a0830caf1ba72f00009d3c467645df40ec61932f9b8a28",
  "wortbombe/": "8cf707c44056c870f18fe8422442da2f82366ddce4df8264808956b9968df65a",
  "wortbombe/index.html": "8cf707c44056c870f18fe8422442da2f82366ddce4df8264808956b9968df65a",
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
