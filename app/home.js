/* Spieleabend – Startseite: Einstellungen, Updates anzeigen, Erscheinungsbild, Installationshinweis.
   Die Update-Technik steckt in shared/shell.js (window.Shell). */
(function () {
  "use strict";
  var Shell = window.Shell, Kit = window.Kit;
  var THEMES = ["auto", "light", "dark"];
  var INSTALL_KEY = "spieleabend-install-hinweis";
  function $(id) { return document.getElementById(id); }

  /* ---------- Einstellungen ---------- */
  var themeSeg = Kit.Segmented($("theme-seg"), function (i) { Shell.setTheme(THEMES[i]); themeSeg.select(i); });
  $("settings-btn").addEventListener("click", function () {
    Kit.sheet("settings-dlg").open();
    themeSeg.select(Math.max(0, THEMES.indexOf(Shell.getTheme())));
  });

  /* ---------- Updates ---------- */
  var els = {
    version: $("upd-version"), row: $("upd-status-row"), status: $("upd-status"), text: $("upd-status-text"),
    check: $("upd-check"), apply: $("upd-apply"), auto: $("upd-auto"),
    banner: $("update-banner"), bannerText: $("update-banner-text"), bannerBtn: $("update-banner-btn"), dot: $("settings-dot")
  };
  function time(t) { return new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); }
  function render(st) {
    var label = st.remote && st.remote !== st.current ? " " + st.remote : "";
    var text = "", tone = "", spin = false;
    switch (st.state) {
      case "checking": text = "Suche nach Updates …"; spin = true; break;
      case "downloading": text = "Neue Version" + label + " wird geladen und geprüft …"; spin = true; break;
      case "ready": text = "Version" + label + " ist bereit."; tone = "ok"; break;
      case "latest": text = "Du hast die neueste Version."; tone = "ok"; break;
      case "pending": text = "Version" + label + " ist veröffentlicht, aber noch nicht überall angekommen. Versuch es in ein paar Minuten noch einmal."; break;
      case "offline": text = "Keine Verbindung. Versuch es später noch einmal."; tone = "bad"; break;
      case "failed": text = "Die Suche hat nicht geklappt. Versuch es später noch einmal."; tone = "bad"; break;
      case "error": text = "Das Update war unvollständig und wurde verworfen. Die bisherige Version läuft weiter."; tone = "bad"; break;
      case "unsupported": text = location.protocol === "file:"
        ? "Updates gehen nur, wenn die App über ihre Web-Adresse geöffnet wird."
        : "Dieser Browser unterstützt keine Offline-Updates."; break;
      default: text = st.lastCheck ? "Zuletzt gesucht um " + time(st.lastCheck) + "." : "";
    }
    els.version.textContent = "Version " + (st.current || "–");
    els.auto.checked = st.auto;
    els.text.textContent = text;
    els.status.dataset.tone = tone;
    els.status.querySelector(".spinner").hidden = !spin;
    els.row.hidden = !text && st.state !== "ready";
    els.check.disabled = st.state === "checking" || st.state === "downloading" || st.state === "unsupported";
    els.apply.hidden = st.state !== "ready";
    els.dot.hidden = st.state !== "ready";
    els.banner.hidden = st.state !== "ready";
    els.bannerText.textContent = "Version" + label + " ist bereit.";
  }
  Shell.onChange(render);
  els.check.addEventListener("click", function () { Shell.check(); });
  els.apply.addEventListener("click", Shell.apply);
  els.bannerBtn.addEventListener("click", Shell.apply);
  els.auto.addEventListener("change", function () { Shell.setAuto(els.auto.checked); });

  /* ---------- Installationshinweis (nur im Browser, nicht in der installierten App) ---------- */
  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  var dismissed = false;
  try { dismissed = localStorage.getItem(INSTALL_KEY) === "aus"; } catch (e) {}
  if (!standalone && !dismissed) {
    if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      $("install-text").textContent = "Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm“ wählen. Danach laufen alle Spiele offline.";
    }
    $("install").hidden = false;
  }
  $("install-close").addEventListener("click", function () {
    $("install").hidden = true;
    try { localStorage.setItem(INSTALL_KEY, "aus"); } catch (e) {}
  });
})();

/* ---------- Vorschau beim langen Drücken ----------
   Statt der Link-Vorschau von iOS: Nach 450 ms wächst die Kachel zu einer Karte mit dem Spiel als Live-Vorschau
   (gleiches Gerät, gleicher Spielstand, nicht bedienbar). Tippen auf die Karte oder „Öffnen“ startet das Spiel,
   Tippen daneben schließt. Die Karte wächst aus der Kachel und kehrt dorthin zurück (räumlich konsistent). */
(function () {
  "use strict";
  var Kit = window.Kit;
  var HOLD = 450, SLOP = 10;
  var peek = document.getElementById("peek"), scrim = document.getElementById("peek-scrim");
  var card = document.getElementById("peek-card"), frame = document.getElementById("peek-frame");
  var iframe = document.getElementById("peek-iframe"), title = document.getElementById("peek-title");
  var openBtn = document.getElementById("peek-open");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var current = null, origin = null, suppressClick = false, lastFocus = null, overlayDown = false;

  // p: 0 = an der Kachel, 1 = offen
  var spring = new Kit.Spring(function (p) {
    scrim.style.opacity = String(Math.max(0, Math.min(1, p)));
    if (reduce || !origin) { card.style.opacity = String(Math.max(0, Math.min(1, p))); card.style.transform = "none"; return; }
    var q = Math.max(0, p);
    card.style.opacity = String(Math.min(1, q * 1.6));
    card.style.transform = "translate(" + (origin.dx * (1 - q)) + "px," + (origin.dy * (1 - q)) + "px) scale(" + (origin.s + (1 - origin.s) * q) + ")";
  }, 0);

  function fitFrame() {
    var s = frame.clientWidth / 390;
    iframe.style.transform = "scale(" + s + ")";
  }

  function open(tile) {
    current = tile;
    lastFocus = document.activeElement;
    title.textContent = tile.querySelector("strong").textContent;
    openBtn.setAttribute("aria-label", title.textContent + " öffnen");
    if (iframe.getAttribute("src") !== tile.getAttribute("href")) iframe.setAttribute("src", tile.getAttribute("href"));
    peek.hidden = false;
    fitFrame();
    // Startpunkt: Mitte und Größe der Kachel relativ zur Karte
    var t = tile.getBoundingClientRect(), c = card.getBoundingClientRect();
    origin = {
      dx: (t.left + t.width / 2) - (c.left + c.width / 2),
      dy: (t.top + t.height / 2) - (c.top + c.height / 2),
      s: Math.min(1, t.width / c.width)
    };
    overlayDown = false;
    spring.set(0);
    spring.to(1, { damping: 0.86, response: 0.4 });
    try { card.focus({ preventScroll: true }); } catch (e) {} // Karte selbst, damit kein Fokusring auf „Öffnen“ aufblitzt
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
  }

  function close(go) {
    if (peek.hidden) return;
    var target = current;
    spring.to(0, { damping: 1, response: 0.3, done: function () {
      peek.hidden = true;
      if (!go && lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    } });
    if (go && target) location.href = target.href;
  }

  // Das Loslassen des Fingers, der die Vorschau geöffnet hat, zählt nicht als Tipp:
  // Nur ein neuer Druck auf die Vorschau (oder die Tastatur, detail 0) löst etwas aus.
  peek.addEventListener("pointerdown", function () { overlayDown = true; });
  function tapped(e) { if (!overlayDown && e.detail !== 0) return false; overlayDown = false; return true; }
  scrim.addEventListener("click", function (e) { if (tapped(e)) close(false); });
  frame.addEventListener("click", function (e) { if (tapped(e)) close(true); });
  openBtn.addEventListener("click", function (e) { if (tapped(e)) close(true); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !peek.hidden) close(false); });
  window.addEventListener("resize", function () { if (!peek.hidden) fitFrame(); });

  Array.prototype.forEach.call(document.querySelectorAll("a.game"), function (tile) {
    var timer = null, start = null;
    function cancel() { clearTimeout(timer); timer = null; tile.classList.remove("pressing"); }
    tile.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY };
      suppressClick = false;
      tile.classList.add("pressing");
      timer = setTimeout(function () {
        timer = null;
        tile.classList.remove("pressing");
        suppressClick = true;
        open(tile);
      }, HOLD);
    });
    tile.addEventListener("pointermove", function (e) {
      if (timer && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP) cancel();
    });
    tile.addEventListener("pointerup", cancel);
    tile.addEventListener("pointercancel", cancel);
    tile.addEventListener("pointerleave", cancel);
    // Kein Kontextmenü (Android, Rechtsklick)
    tile.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    // Der Klick nach einem langen Druck öffnet das Spiel nicht direkt
    tile.addEventListener("click", function (e) {
      if (suppressClick) { e.preventDefault(); suppressClick = false; }
    });
  });
})();
