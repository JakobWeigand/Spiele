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
