/* Spieleabend – Shell für jede Seite der App (Startseite und alle Spiele).
   - Erscheinungsbild (Automatisch / Hell / Dunkel) gilt überall.
   - Ein Service Worker (app/sw.js) speichert alle Spiele offline und liefert Updates.
   - Updates: Die neue Version wird im Hintergrund geladen und jede Datei per SHA-256 geprüft.
     „Automatisch aktualisieren“ an: Wechsel, sobald die App im Hintergrund ist oder gerade gestartet wurde.
     Aus: Nur auf Knopfdruck in den Einstellungen der Startseite.
   - Spiele mit laufender Online-Verbindung rufen Shell.hold(true), damit kein Update sie unterbricht.
   Einbinden im <head>:  <script src="../shared/shell.js"></script>  (Startseite: shared/shell.js) */
(function () {
  "use strict";

  var script = document.currentScript;
  var ROOT = new URL("../", script.src);            // …/app/
  var THEME_KEY = "spieleabend-theme";
  var AUTO_KEY = "spieleabend-auto-update";
  var CHECK_EVERY = 60 * 60 * 1000;
  var RECHECK_ON_RETURN = 30 * 60 * 1000;
  var START_GRACE = 15 * 1000;

  /* ---------- Erscheinungsbild ---------- */
  function getTheme() { try { return localStorage.getItem(THEME_KEY) || "auto"; } catch (e) { return "auto"; } }
  function applyTheme(t) {
    var root = document.documentElement;
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t); else root.removeAttribute("data-theme");
  }
  function setTheme(t) {
    try { if (t === "light" || t === "dark") localStorage.setItem(THEME_KEY, t); else localStorage.removeItem(THEME_KEY); } catch (e) {}
    applyTheme(t);
  }
  applyTheme(getTheme());
  // Andere Seiten der App (z. B. ein zweiter Tab) übernehmen die Wahl sofort
  window.addEventListener("storage", function (e) { if (e.key === THEME_KEY) applyTheme(getTheme()); });

  /* ---------- Updates ---------- */
  var started = Date.now();
  var reg = null, waiting = null, remote = null, lastCheck = 0, reloading = false, timer = null;
  var holds = 0;
  var state = "idle"; // idle | checking | latest | downloading | ready | offline | failed | error | unsupported
  var listeners = [];
  var meta = null;

  function current() {
    meta = meta || document.querySelector('meta[name="app-version"]');
    return meta ? meta.getAttribute("content") : null;
  }
  function auto() { try { return localStorage.getItem(AUTO_KEY) !== "0"; } catch (e) { return true; } }
  function validVersion(v) { return typeof v === "string" && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(v); }
  function newer(a, b) {
    var x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
    for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
    return false;
  }
  function emit() { listeners.forEach(function (fn) { try { fn(api.status()); } catch (e) {} }); }
  function set(s) { state = s; emit(); }

  function fetchRemote() {
    return fetch(new URL("version.json", ROOT), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("http");
      return r.json();
    }).then(function (j) { if (j && validVersion(j.version)) remote = j.version; return remote; });
  }

  function track(worker) {
    if (!worker) return;
    set("downloading");
    worker.addEventListener("statechange", function () {
      if (worker.state === "installed") {
        if (navigator.serviceWorker.controller) ready(worker); else set("latest");
      } else if (worker.state === "redundant" && state === "downloading") {
        set("error");
      }
    });
  }
  function ready(worker) {
    waiting = worker;
    set("ready");
    fetchRemote().catch(function () {}).then(emit);
    if (auto()) applyWhenSafe();
  }
  function busy() {
    return holds > 0 || !!document.querySelector("dialog[open]") || !!(window.Wuerfel && window.Wuerfel.isBusy && window.Wuerfel.isBusy());
  }
  // Nie mitten im Spiel neu laden: nur im Hintergrund oder direkt nach dem Start, und nie bei laufender Online-Verbindung.
  function applyWhenSafe() {
    if (!waiting || holds > 0) return;
    if (document.visibilityState === "hidden" || (Date.now() - started < START_GRACE && !busy())) apply();
  }
  function apply() {
    if (!waiting || reloading) return;
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  function check(manual) {
    if (!reg) { set("unsupported"); return Promise.resolve(); }
    if (state === "checking" || state === "downloading") return Promise.resolve();
    if (waiting) { set("ready"); return Promise.resolve(); }
    lastCheck = Date.now();
    set("checking");
    var before = reg.installing;
    return Promise.all([fetchRemote(), reg.update()]).then(function () {
      if (reg.waiting && navigator.serviceWorker.controller) { ready(reg.waiting); return; }
      if (reg.installing) { if (reg.installing !== before) track(reg.installing); else set("downloading"); return; }
      var cur = current();
      if (remote && cur && newer(remote, cur)) {
        // version.json ist schon neu, sw.js noch nicht (Zwischenspeicher bei GitHub Pages): später erneut
        set(manual ? "pending" : "idle");
        return;
      }
      set("latest");
    }).catch(function () { set(navigator.onLine === false ? "offline" : "failed"); });
  }

  function schedule() {
    clearInterval(timer);
    timer = auto() ? setInterval(function () { check(false); }, CHECK_EVERY) : null;
  }

  var api = {
    status: function () {
      return { state: state, current: current(), remote: remote, auto: auto(), lastCheck: lastCheck };
    },
    onChange: function (fn) { listeners.push(fn); fn(api.status()); },
    check: function () { return check(true); },
    apply: apply,
    auto: auto,
    setAuto: function (on) {
      try { localStorage.setItem(AUTO_KEY, on ? "1" : "0"); } catch (e) {}
      schedule();
      if (on && waiting) applyWhenSafe();
      emit();
    },
    hold: function (on) {
      holds = Math.max(0, holds + (on ? 1 : -1));
      if (!holds && waiting && auto()) applyWhenSafe();
    },
    getTheme: getTheme,
    setTheme: setTheme,
    home: ROOT.href
  };
  window.Shell = api;

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { if (waiting && auto() && holds === 0) apply(); return; }
    if (auto() && reg && Date.now() - lastCheck > RECHECK_ON_RETURN) check(false);
  });

  var swOk = "serviceWorker" in navigator &&
    (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");
  if (!swOk) { state = "unsupported"; return; }

  // Erster Besuch: Der Service Worker übernimmt ohne Neuladen. Danach bedeutet ein Wechsel „neue Version“.
  var hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController) { hadController = true; return; }
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  navigator.serviceWorker.register(new URL("sw.js", ROOT).href, { scope: ROOT.href, updateViaCache: "none" }).then(function (r) {
    reg = r;
    r.addEventListener("updatefound", function () { if (r.installing) track(r.installing); });
    if (r.waiting && navigator.serviceWorker.controller) ready(r.waiting);
    else if (r.installing) track(r.installing);
    schedule();
    if (auto()) check(false); else emit();
  }).catch(function () { set("unsupported"); });
})();
