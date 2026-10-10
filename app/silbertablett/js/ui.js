/* Silbertablett – Oberfläche: Springs, Sheets, Segmente, Ansichten.
   Nach Design/apple-design: Animationen starten immer vom aktuellen Wert, sind jederzeit
   unterbrechbar, übernehmen beim Loslassen die Fingergeschwindigkeit und projizieren das Momentum. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.matchMedia) {
    var mq = matchMedia("(prefers-reduced-motion: reduce)");
    var onMq = function () { reduceMotion = mq.matches; };
    if (mq.addEventListener) mq.addEventListener("change", onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  /* ---------- Spring ----------
     Apple-Parameter: damping (1 = kein Nachschwingen) und response (Sekunden, keine Dauer).
     Masse 1, Steifigkeit (2π/response)², Dämpfung 4π·damping/response. */
  function Spring(apply, value) {
    this.apply = apply;
    this.value = value || 0;
    this.velocity = 0;
    this.target = this.value;
    this.raf = 0;
    this.done = null;
  }
  Spring.prototype.set = function (v) {
    this.stop();
    this.value = this.target = v;
    this.velocity = 0;
    this.apply(v);
  };
  Spring.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  };
  Spring.prototype.to = function (target, opts) {
    opts = opts || {};
    var self = this;
    var damping = opts.damping != null ? opts.damping : 1;
    var response = opts.response || 0.35;
    if (opts.velocity != null) this.velocity = opts.velocity;
    this.target = target;
    this.done = opts.done || null;
    if (reduceMotion && !opts.force) { this.set(target); if (this.done) this.done(); return this; }
    var k = Math.pow(2 * Math.PI / response, 2);
    var c = 4 * Math.PI * damping / response;
    var last = performance.now();
    this.stop();
    function step(now) {
      var dt = Math.min(0.064, (now - last) / 1000);
      last = now;
      // Halbimplizites Euler in kleinen Schritten: stabil auch bei 120 Hz und Ruckeln
      var n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
      for (var i = 0; i < n; i++) {
        var a = -k * (self.value - self.target) - c * self.velocity;
        self.velocity += a * h;
        self.value += self.velocity * h;
      }
      var scale = Math.max(1, Math.abs(opts.scale || 1));
      if (Math.abs(self.velocity) < 0.02 * scale && Math.abs(self.value - self.target) < 0.002 * scale) {
        self.value = self.target; self.velocity = 0; self.raf = 0;
        self.apply(self.value);
        if (self.done) { var d = self.done; self.done = null; d(); }
        return;
      }
      self.apply(self.value);
      self.raf = requestAnimationFrame(step);
    }
    this.raf = requestAnimationFrame(step);
    return this;
  };

  // Apples Projektionsfunktion (Designing Fluid Interfaces): wo landet ein Wurf?
  function project(v, rate) { rate = rate || 0.998; return (v / 1000) * rate / (1 - rate); }
  function rubberband(over, dim, c) { c = c || 0.55; return (over * dim * c) / (dim + c * Math.abs(over)); }

  /* ---------- Segmentierte Auswahl ---------- */
  function Segmented(el, onPick) {
    var thumb = document.createElement("span");
    thumb.className = "thumb";
    thumb.setAttribute("aria-hidden", "true");
    el.insertBefore(thumb, el.firstChild);
    var buttons = Array.prototype.slice.call(el.querySelectorAll("button"));
    var idx = 0, ready = false;
    var spring = new Spring(function (v) { thumb.style.transform = "translateX(" + (v * 100) + "%)"; });
    function size() { thumb.style.width = "calc((100% - 4px) / " + buttons.length + ")"; }
    size();
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { if (onPick) onPick(i, b); });
    });
    // Pfeiltasten wie bei nativen Tabs
    el.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var n = (idx + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[n].focus();
      buttons[n].click();
      e.preventDefault();
    });
    return {
      select: function (i) {
        idx = i;
        buttons.forEach(function (b, n) {
          var on = n === i;
          if (b.getAttribute("role") === "radio") b.setAttribute("aria-checked", on ? "true" : "false");
          else b.setAttribute("aria-selected", on ? "true" : "false");
          b.tabIndex = on ? 0 : -1;
        });
        if (!ready || el.offsetParent === null) { spring.set(i); ready = true; }
        else spring.to(i, { damping: 1, response: 0.32 });
      },
      buttons: buttons
    };
  }

  /* ---------- Sheets ----------
     Ein <dialog class="sheet"> enthält .scrim und .panel. showModal() sorgt für Fokusfalle und Esc.
     Am Handy kommt das Panel von unten und lässt sich am Griff nach unten wegwischen;
     auf großen Bildschirmen erscheint es mittig und „materialisiert“ (Skalierung + Deckkraft). */
  var sheets = [];
  function isCentered() { return matchMedia("(min-width: 640px) and (min-height: 560px)").matches; }

  function Sheet(dlg) {
    var panel = dlg.querySelector(".panel");
    var scrim = dlg.querySelector(".scrim");
    var grab = dlg.querySelector(".grab");
    var y = new Spring(function (v) { paint(v); }, 1);
    var closing = false, onClosed = null, lastFocus = null;

    // v: 0 = offen, 1 = ganz weg
    function paint(v) {
      var p = Math.max(0, Math.min(1, v));
      scrim.style.opacity = String(1 - p);
      if (reduceMotion) {
        panel.style.opacity = String(1 - p);
        panel.style.transform = isCentered() ? "translate(-50%, -50%)" : "none";
        return;
      }
      if (isCentered()) {
        panel.style.opacity = String(1 - p);
        panel.style.transform = "translate(-50%, -50%) scale(" + (1 - 0.06 * v) + ")";
      } else {
        panel.style.opacity = "1";
        panel.style.transform = "translateY(" + (v * panel.offsetHeight) + "px)";
      }
    }

    function open(after) {
      closing = false;
      onClosed = after || null;
      lastFocus = document.activeElement;
      if (!dlg.open) {
        // Erst unten parken, dann öffnen: Sonst scrollt iOS das noch verschobene Panel beim Fokussieren
        // kurz ins Bild, und das Sheet scheint von oben zu kommen.
        y.set(1);
        if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
        dlg.scrollTop = 0;
        try { panel.focus({ preventScroll: true }); } catch (e) {}
        y.set(1);
      }
      y.to(0, { damping: 1, response: 0.38 });
    }

    function close(velocity) {
      if (!dlg.open || closing) return;
      closing = true;
      var v = velocity ? velocity / Math.max(1, panel.offsetHeight) : 0;
      y.to(1, {
        damping: 1, response: 0.32, velocity: v, done: function () {
          closing = false;
          if (dlg.open) dlg.close();
          if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
          var cb = onClosed; onClosed = null;
          if (cb) cb();
        }
      });
    }

    dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
    dlg.addEventListener("click", function (e) {
      if (e.target === scrim || e.target.closest("[data-close]")) close();
    });

    // Wischen zum Schließen: 1:1 mitziehen, nach oben Gummiband, beim Loslassen Momentum projizieren
    if (grab) {
      var drag = null;
      grab.addEventListener("pointerdown", function (e) {
        if (isCentered() || e.button > 0 || e.target.closest("button, a, input")) return;
        grab.setPointerCapture(e.pointerId);
        y.stop();
        var h = panel.offsetHeight;
        drag = { id: e.pointerId, startY: e.clientY, startV: y.value * h, h: h, hist: [{ t: e.timeStamp, y: e.clientY }], moved: false };
      });
      grab.addEventListener("pointermove", function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dy = drag.startV + e.clientY - drag.startY;
        if (!drag.moved && Math.abs(e.clientY - drag.startY) < 4) return;
        drag.moved = true;
        var px = dy < 0 ? rubberband(dy, drag.h) : dy;
        y.value = px / drag.h; y.velocity = 0;
        paint(y.value);
        drag.hist.push({ t: e.timeStamp, y: e.clientY });
        if (drag.hist.length > 6) drag.hist.shift();
      });
      var end = function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var d = drag; drag = null;
        if (!d.moved) { y.to(0); return; }
        var a = d.hist[0], b = d.hist[d.hist.length - 1];
        var vel = b.t > a.t ? (b.y - a.y) / ((b.t - a.t) / 1000) : 0; // px/s
        var current = y.value * d.h;
        var landing = current + project(vel);
        if (landing > d.h * 0.45 && vel > -200) close(vel);
        else y.to(0, { damping: Math.abs(vel) > 300 ? 0.82 : 1, response: 0.3, velocity: vel / Math.max(1, d.h) });
      };
      grab.addEventListener("pointerup", end);
      grab.addEventListener("pointercancel", end);
    }

    var api = { open: open, close: close, dlg: dlg, isOpen: function () { return dlg.open; } };
    sheets.push(api);
    return api;
  }

  var registry = {};
  function sheet(id) {
    if (!registry[id]) registry[id] = Sheet(document.getElementById(id));
    return registry[id];
  }

  /* ---------- Bestätigen ----------
     Für Löschen und Zurücksetzen: Der Text nennt genau, was passiert. Die gefährliche Taste steht oben,
     „Abbrechen“ unten am Daumen. */
  function confirmSheet(opts) {
    return new Promise(function (resolve) {
      var s = sheet("confirm-dlg");
      document.getElementById("confirm-title").textContent = opts.title;
      document.getElementById("confirm-text").textContent = opts.text;
      var ok = document.getElementById("confirm-ok");
      ok.textContent = opts.action;
      var result = false;
      function onOk() { result = true; s.close(); }
      ok.addEventListener("click", onOk, { once: true });
      s.open(function () { ok.removeEventListener("click", onOk); resolve(result); });
      setTimeout(function () { document.getElementById("confirm-cancel").focus(); }, 30);
    });
  }

  /* ---------- Wert wählen ----------
     options: [{ value, label, disabled }], suggestion: { value, label } | null, clear: bool.
     Ergebnis: Zahl, null (gelöscht) oder undefined (abgebrochen). */
  function pick(opts) {
    return new Promise(function (resolve) {
      var s = sheet("pick-dlg");
      document.getElementById("pick-title").textContent = opts.title;
      var sub = document.getElementById("pick-sub");
      sub.textContent = opts.sub || "";
      sub.hidden = !opts.sub;
      var grid = document.getElementById("pick-grid");
      var sug = document.getElementById("pick-suggest");
      var clr = document.getElementById("pick-clear");
      var result;
      grid.textContent = "";
      opts.options.forEach(function (o) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pick";
        b.textContent = o.label != null ? o.label : String(o.value);
        if (o.aria) b.setAttribute("aria-label", o.aria);
        b.disabled = !!o.disabled;
        if (opts.current === o.value) b.setAttribute("aria-current", "true");
        b.addEventListener("click", function () { result = o.value; s.close(); });
        grid.appendChild(b);
      });
      if (opts.suggestion) {
        sug.hidden = false;
        sug.querySelector("span").textContent = opts.suggestion.label;
        sug.querySelector("b").textContent = String(opts.suggestion.value);
        sug.onclick = function () { result = opts.suggestion.value; s.close(); };
      } else {
        sug.hidden = true;
        sug.onclick = null;
      }
      clr.hidden = !opts.clear;
      clr.textContent = opts.clearLabel || "Eintrag löschen";
      clr.onclick = function () { result = null; s.close(); };
      s.open(function () { resolve(result); });
    });
  }

  /* ---------- Ansichten: Spiel × (Würfeln | Block) ---------- */
  var GAMES = ["clever"]; // Diese Seite zeigt nur das Silbertablett
  var VIEW_KEY = "silbertablett-ansicht";
  var Shell = {
    mode: "clever",
    view: "dice",
    listeners: [],
    gameSeg: null,
    viewSeg: null,
    onPickGame: null,
    show: function () { this.mode = "clever"; this.apply(); },
    setView: function (v) {
      this.view = v === "block" ? "block" : "dice";
      try { localStorage.setItem(VIEW_KEY, this.view); } catch (e) {}
      this.apply();
    },
    apply: function () {
      var self = this;
      GAMES.forEach(function (g) {
        var on = g === self.mode;
        document.getElementById(g).hidden = !(on && self.view === "dice");
        document.getElementById("bar-" + g).hidden = !(on && self.view === "dice");
        document.getElementById("blk-" + g).hidden = !(on && self.view === "block");
      });
      document.getElementById("bar-block").hidden = this.view !== "block";
      if (this.viewSeg) this.viewSeg.select(this.view === "block" ? 1 : 0);
      this.listeners.forEach(function (fn) { fn(self.mode, self.view); });
    },
    onChange: function (fn) { this.listeners.push(fn); }
  };
  try { if (localStorage.getItem(VIEW_KEY) === "block") Shell.view = "block"; } catch (e) {}

  /* Erscheinungsbild und Updates regelt ../shared/shell.js für die ganze App. */

  var announceEl = null;
  function say(text) {
    announceEl = announceEl || document.getElementById("announce");
    if (!announceEl) return;
    announceEl.textContent = "";
    setTimeout(function () { announceEl.textContent = text; }, 30);
  }

  window.UI = {
    Spring: Spring,
    Segmented: Segmented,
    sheet: sheet,
    confirm: confirmSheet,
    pick: pick,
    Shell: Shell,
    GAMES: GAMES,
    say: say,
    reduceMotion: function () { return reduceMotion; }
  };
})();
