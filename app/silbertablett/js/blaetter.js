/* Silbertablett – digitaler Block mit automatischer Punktzählung.
   Stammt aus dem Würfelbecher (Blöcke für drei Spiele); hier wird nur der Block „clever“ genutzt.
   Der Block bleibt auf diesem Gerät (localStorage) und geht nicht in den Raum:
   Namen und Punkte verlassen das Handy nicht. Blattdaten nach der eigenen Druckvorlage. */
(function () {
  "use strict";
  var UI = window.UI;
  var STORE = "silbertablett-block-v1";
  var MAX = { kniffel: 6, quixx: 5, clever: 4 };
  var TITLE = { kniffel: "Pasch", quixx: "Farbreihen", clever: "Silbertablett" };
  var BLOCK = { kniffel: "Pasch-Block", quixx: "Farbreihen-Block", clever: "Silbertablett-Block" };

  /* ---------- Hilfen ---------- */
  // Baut DOM ohne innerHTML für Nutzereingaben. "html" nur für feste Symbole aus diesem Skript.
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  }
  function range(a, b, step) { var r = []; for (var i = a; step > 0 ? i <= b : i >= b; i += step) r.push(i); return r; }
  function fill(n, v) { var r = []; for (var i = 0; i < n; i++) r.push(typeof v === "function" ? v(i) : v); return r; }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function int(x, lo, hi) { return typeof x === "number" && x % 1 === 0 && x >= lo && x <= hi ? x : null; }
  function cleanName(x, n) { return typeof x === "string" && x.trim() ? x.trim().slice(0, 16) : "Spieler " + (n + 1); }
  function listText(arr) { return arr.length < 2 ? arr.join("") : arr.slice(0, -1).join(", ") + " und " + arr[arr.length - 1]; }

  /* ---------- Pasch ---------- */
  var K_UP = [["ones", "Einser", 1], ["twos", "Zweier", 2], ["threes", "Dreier", 3], ["fours", "Vierer", 4], ["fives", "Fünfer", 5], ["sixes", "Sechser", 6]];
  var K_LOW = [
    ["three", "Dreierpasch", "Augensumme"], ["four", "Viererpasch", "Augensumme"], ["full", "Full House", "25"],
    ["small", "Kleine Straße", "30"], ["large", "Große Straße", "40"], ["kniffel", "Fünferpasch", "50"], ["chance", "Chance", "Augensumme"]
  ];
  var K_CATS = K_UP.map(function (c) { return c[0]; }).concat(K_LOW.map(function (c) { return c[0]; }));

  function kOptions(cat) {
    var up = K_UP.filter(function (c) { return c[0] === cat; })[0];
    if (up) return range(0, 5, 1).map(function (n) { return n * up[2]; });
    if (cat === "three" || cat === "four") return [0].concat(range(5, 30, 1));
    if (cat === "chance") return range(5, 30, 1);
    return [0, { full: 25, small: 30, large: 40, kniffel: 50 }[cat]];
  }
  // Punkte für eine Kategorie aus fünf Würfeln
  function kScore(cat, v) {
    var counts = [0, 0, 0, 0, 0, 0, 0];
    v.forEach(function (x) { counts[x]++; });
    var total = sum(v), max = Math.max.apply(null, counts);
    var has = function (arr) { return arr.every(function (x) { return counts[x] > 0; }); };
    var up = K_UP.filter(function (c) { return c[0] === cat; })[0];
    if (up) return counts[up[2]] * up[2];
    if (cat === "three") return max >= 3 ? total : 0;
    if (cat === "four") return max >= 4 ? total : 0;
    if (cat === "full") return counts.filter(function (c) { return c > 0; }).sort().join("") === "23" ? 25 : 0;
    if (cat === "small") return has([1, 2, 3, 4]) || has([2, 3, 4, 5]) || has([3, 4, 5, 6]) ? 30 : 0;
    if (cat === "large") return has([1, 2, 3, 4, 5]) || has([2, 3, 4, 5, 6]) ? 40 : 0;
    if (cat === "kniffel") return max === 5 ? 50 : 0;
    return total;
  }
  function kTotals(cells) {
    var v = function (k) { return typeof cells[k] === "number" ? cells[k] : 0; };
    var upper = sum(K_UP.map(function (c) { return v(c[0]); }));
    var bonus = upper >= 63 ? 35 : 0;
    var lower = sum(K_LOW.map(function (c) { return v(c[0]); }));
    return { upper: upper, bonus: bonus, upperTotal: upper + bonus, lower: lower, total: upper + bonus + lower };
  }

  /* ---------- Farbreihen ---------- */
  var Q_ROWS = [
    { k: "red", name: "Rot", nums: range(2, 12, 1) },
    { k: "yellow", name: "Gelb", nums: range(2, 12, 1) },
    { k: "green", name: "Grün", nums: range(12, 2, -1) },
    { k: "blue", name: "Blau", nums: range(12, 2, -1) }
  ];
  var Q_PTS = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78];
  function qCount(s, k) { return s.x[k].filter(Boolean).length + (s.lock[k] === 1 ? 1 : 0); }
  function qLast(s, k) { return s.x[k].lastIndexOf(true); }
  function qTotals(s) {
    var rows = {};
    Q_ROWS.forEach(function (r) { rows[r.k] = Q_PTS[qCount(s, r.k)]; });
    var miss = s.miss * 5;
    return { rows: rows, miss: miss, total: rows.red + rows.yellow + rows.green + rows.blue - miss };
  }

  /* ---------- Silbertablett ---------- */
  var SILVER_COL_BONUS = ["plus", "q-yellow", "fox", "q-blue", "q-green", "q-pink"];
  var SILVER_PTS = [2, 4, 7, 11, 16, 22];
  var SILVER_ROWS = [["yellow", "Gelb"], ["blue", "Blau"], ["green", "Grün"], ["pink", "Rosa"]];
  var YELLOW_NUMS = [[0, 3, 0, 6], [1, 0, 2, 0], [0, 4, 0, 3], [2, 0, 5, 0], [0, 5, 0, 4]];
  var YELLOW_ROW_BONUS = ["q-blue", "ret", "q-yellow", "q-green", "q-pink"];
  var YELLOW_COL_BONUS = ["rr", "plus", "q-silver", "fox"];
  var YELLOW_PTS = [3, 10, 21, 36, 55, 75, 96, 118, 141, 165];
  var BLUE_PTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78];
  var BLUE_BONUS = { 1: "ret", 2: "q-yellow", 4: "plus", 5: "rr", 6: "q-pink", 8: "fox", 9: "ret", 11: "q-green" };
  var GREEN_MULT = [2, 2, 2, 1, 3, 3, 3, 2, 3, 1, 4, 1];
  var GREEN_BONUS = { 1: "rr", 3: "q-blue", 4: "ret", 6: "fox", 7: "q-silver", 8: "plus", 10: "q-pink", 11: "q-yellow" };
  var PINK_REQ = [0, 0, 2, 3, 4, 5, 6, 2, 3, 4, 5, 6];
  var PINK_BONUS = { 2: "rr", 3: "ret", 4: "plus", 5: "q-green", 6: "q-yellow", 7: "fox", 8: "q-silver", 9: "rr", 10: "q-blue", 11: "q-yellow" };
  var ACTIONS = [["rr", "Nachwürfeln"], ["ret", "Rückholen"], ["plus", "Zusatzwürfel"]];
  var ACTION_END = { rr: "fox", ret: "q-pink", plus: "q-silver" };

  var ICON = {
    rr: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M8.1 6.2A3.3 3.3 0 1 1 7.4 2.7" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8.9 0.9V4.4H5.4Z" fill="currentColor"/></svg>',
    ret: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3.4 3.2H6.3A2.6 2.6 0 0 1 6.3 8.4H2.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M0.9 3.2L3.9 0.7V5.7Z" fill="currentColor"/></svg>',
    fox: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0.6 0.8L3.6 3.1H6.4L9.4 0.8L9.1 5.1L5 9.4L0.9 5.1Z" style="fill:var(--fox)"/><path d="M2.6 4.7L4.2 5.2L3.4 6Z M7.4 4.7L5.8 5.2L6.6 6Z" fill="#fff"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="4.5" y="10" width="15" height="11" rx="3" fill="currentColor"/></svg>'
  };
  var BZ_NAME = {
    rr: "Nachwürfel-Aktion", ret: "Rückhol-Aktion", plus: "Zusatzwürfel-Aktion", fox: "Fuchs",
    "q-yellow": "?-Bonus Gelb", "q-blue": "?-Bonus Blau", "q-green": "?-Bonus Grün", "q-pink": "?-Bonus Rosa",
    "q-silver": "?-Bonus Silber", "q-any": "?-Bonus in beliebiger Farbe"
  };
  function badge(k, got) {
    var inner = k === "plus" ? "+1" : ICON[k] || "?";
    return h("span", { class: "bz k-" + k + (got ? " got" : ""), html: inner, role: "img", "aria-label": BZ_NAME[k] + (got ? ", erreicht" : "") });
  }

  function cYellowCells() {
    var r = [];
    YELLOW_NUMS.forEach(function (row, ri) { row.forEach(function (v, ci) { if (v) r.push([ri, ci]); }); });
    return r;
  }
  // Alle erreichten Boni eines Blatts: Liste von Kürzeln
  function cBonuses(s) {
    var got = { silverCol: [], yRow: [], yCol: [], blue: [], green: [], pink: [], act: [] };
    for (var c = 0; c < 6; c++) if (s.silver.every(function (row) { return row[c]; })) got.silverCol.push(c);
    YELLOW_NUMS.forEach(function (row, ri) {
      if (row.every(function (v, ci) { return !v || s.yellow[ri * 4 + ci] === 2; })) got.yRow.push(ri);
    });
    for (var ci = 0; ci < 4; ci++) {
      if (YELLOW_NUMS.every(function (row, ri) { return !row[ci] || s.yellow[ri * 4 + ci] === 2; })) got.yCol.push(ci);
    }
    s.blue.forEach(function (v, i) { if (v && BLUE_BONUS[i]) got.blue.push(i); });
    s.green.forEach(function (v, i) { if (v && GREEN_BONUS[i]) got.green.push(i); });
    s.pink.forEach(function (v, i) { if (v && PINK_BONUS[i] && v >= PINK_REQ[i]) got.pink.push(i); });
    ACTIONS.forEach(function (a) { if (s.act[a[0]].every(function (x) { return x > 0; })) got.act.push(a[0]); });
    var keys = [];
    got.silverCol.forEach(function (c) { keys.push(SILVER_COL_BONUS[c]); });
    got.yRow.forEach(function (r) { keys.push(YELLOW_ROW_BONUS[r]); });
    got.yCol.forEach(function (c) { keys.push(YELLOW_COL_BONUS[c]); });
    got.blue.forEach(function (i) { keys.push(BLUE_BONUS[i]); });
    got.green.forEach(function (i) { keys.push(GREEN_BONUS[i]); });
    got.pink.forEach(function (i) { keys.push(PINK_BONUS[i]); });
    got.act.forEach(function (a) { keys.push(ACTION_END[a]); });
    got.keys = keys;
    return got;
  }
  function cGreenPair(s, p) {
    var a = s.green[2 * p], b = s.green[2 * p + 1];
    if (!a || !b) return null;
    return a * GREEN_MULT[2 * p] - b * GREEN_MULT[2 * p + 1];
  }
  function cTotals(s) {
    var silverRows = s.silver.map(function (row) { var n = row.filter(Boolean).length; return n ? SILVER_PTS[n - 1] : 0; });
    var silver = sum(silverRows);
    var yN = s.yellow.filter(function (x) { return x === 2; }).length;
    var yellow = yN ? YELLOW_PTS[yN - 1] : 0;
    var bN = s.blue.filter(Boolean).length;
    var blue = bN ? BLUE_PTS[bN - 1] : 0;
    var green = 0;
    for (var p = 0; p < 6; p++) { var r = cGreenPair(s, p); if (r !== null) green += r; }
    var pink = sum(s.pink);
    var foxes = cBonuses(s).keys.filter(function (k) { return k === "fox"; }).length;
    var weakest = Math.min(silver, yellow, blue, green, pink);
    var foxPts = foxes * Math.max(0, weakest);
    return {
      silverRows: silverRows, silver: silver, yellow: yellow, blue: blue, green: green, pink: pink,
      foxes: foxes, weakest: weakest, foxPts: foxPts, total: silver + yellow + blue + green + pink + foxPts
    };
  }

  /* ---------- Zustand ---------- */
  function newPaschCells() { var c = {}; K_CATS.forEach(function (k) { c[k] = null; }); return c; }
  function newQuixxSheet() {
    return { x: { red: fill(11, false), yellow: fill(11, false), green: fill(11, false), blue: fill(11, false) }, lock: { red: 0, yellow: 0, green: 0, blue: 0 }, miss: 0 };
  }
  function newCleverSheet() {
    return {
      act: { rr: fill(6, 0), ret: fill(6, 0), plus: fill(6, 0) },
      silver: fill(4, function () { return fill(6, false); }),
      yellow: fill(20, 0), blue: fill(12, 0), green: fill(12, 0), pink: fill(12, 0)
    };
  }
  var NEW = { kniffel: newPaschCells, quixx: newQuixxSheet, clever: newCleverSheet };
  function defaultNames(n) { return fill(n, function (i) { return "Spieler " + (i + 1); }); }
  function newGame(g, names) { return { names: names, active: 0, sheets: names.map(function () { return NEW[g](); }) }; }

  var B = {
    kniffel: newGame("kniffel", defaultNames(2)),
    quixx: newGame("quixx", defaultNames(2)),
    clever: newGame("clever", (window.Wuerfel && window.Wuerfel.cleverNames()) || defaultNames(2))
  };

  /* Gespeicherter Stand kann veraltet oder beschädigt sein: hart prüfen, sonst Standard. */
  function sanitizeGame(g, x) {
    if (!x || typeof x !== "object" || !Array.isArray(x.names) || !Array.isArray(x.sheets)) return null;
    var n = x.names.length;
    if (n < 1 || n > MAX[g] || x.sheets.length !== n) return null;
    var names = x.names.map(cleanName);
    var sheets = [];
    for (var i = 0; i < n; i++) {
      var s = (g === "kniffel" ? sanitizeK : g === "quixx" ? sanitizeQ : sanitizeC)(x.sheets[i]);
      if (!s) return null;
      sheets.push(s);
    }
    var active = int(x.active, 0, n - 1);
    return { names: names, active: active === null ? 0 : active, sheets: sheets };
  }
  function sanitizeK(c) {
    if (!c || typeof c !== "object") return null;
    var out = {};
    for (var i = 0; i < K_CATS.length; i++) {
      var k = K_CATS[i], v = c[k];
      if (v === null || v === undefined) { out[k] = null; continue; }
      if (kOptions(k).indexOf(v) === -1) return null;
      out[k] = v;
    }
    return out;
  }
  function bools(a, n) { return Array.isArray(a) && a.length === n ? a.map(function (x) { return x === true; }) : null; }
  function ints(a, n, lo, hi) {
    if (!Array.isArray(a) || a.length !== n) return null;
    var out = [];
    for (var i = 0; i < n; i++) { var v = int(a[i], lo, hi); if (v === null) return null; out.push(v); }
    return out;
  }
  function sanitizeQ(s) {
    if (!s || typeof s !== "object" || !s.x || !s.lock) return null;
    var out = { x: {}, lock: {}, miss: int(s.miss, 0, 4) };
    if (out.miss === null) return null;
    for (var i = 0; i < Q_ROWS.length; i++) {
      var k = Q_ROWS[i].k, x = bools(s.x[k], 11), l = int(s.lock[k], 0, 2);
      if (!x || l === null) return null;
      out.x[k] = x; out.lock[k] = l;
    }
    return out;
  }
  function sanitizeC(s) {
    if (!s || typeof s !== "object" || !s.act || !Array.isArray(s.silver) || s.silver.length !== 4) return null;
    var out = { act: {}, silver: [], yellow: ints(s.yellow, 20, 0, 2), blue: ints(s.blue, 12, 0, 12), green: ints(s.green, 12, 0, 6), pink: ints(s.pink, 12, 0, 6) };
    if (!out.yellow || !out.blue || !out.green || !out.pink) return null;
    for (var a = 0; a < ACTIONS.length; a++) {
      var v = ints(s.act[ACTIONS[a][0]], 6, 0, 2);
      if (!v) return null;
      out.act[ACTIONS[a][0]] = v;
    }
    for (var r = 0; r < 4; r++) { var row = bools(s.silver[r], 6); if (!row) return null; out.silver.push(row); }
    return out;
  }
  (function load() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!saved || typeof saved !== "object") return;
    UI.GAMES.forEach(function (g) { var x = sanitizeGame(g, saved[g]); if (x) B[g] = x; });
  })();
  function save() { try { localStorage.setItem(STORE, JSON.stringify(B)); } catch (e) {} }

  /* ---------- Darstellung ---------- */
  var roots = { clever: document.getElementById("blk-clever") };

  // Nach dem Neuzeichnen den Fokus auf dasselbe Bedienelement zurücksetzen (Tastatur, VoiceOver)
  function render(g) {
    var root = roots[g];
    var focusKey = document.activeElement && root.contains(document.activeElement) ? document.activeElement.getAttribute("data-k") : null;
    var y = window.scrollY;
    root.textContent = "";
    (g === "kniffel" ? renderPasch : g === "quixx" ? renderQuixx : renderClever)(root);
    if (focusKey) { var el = root.querySelector('[data-k="' + focusKey + '"]'); if (el) el.focus({ preventScroll: true }); }
    window.scrollTo(0, y);
  }
  function change(g) { save(); render(g); }

  function chips(g, totals) {
    var game = B[g];
    if (game.names.length < 2) return null;
    var best = Math.max.apply(null, totals);
    var wrap = h("div", { class: "chips", role: "tablist", "aria-label": "Blatt von" });
    game.names.forEach(function (n, i) {
      var lead = totals[i] === best && best > 0;
      wrap.appendChild(h("button", {
        type: "button", class: "chip" + (lead ? " lead" : ""), role: "tab", "data-k": "chip" + i,
        "aria-selected": i === game.active ? "true" : "false",
        "aria-label": n + ", " + totals[i] + " Punkte" + (lead ? ", in Führung" : ""),
        onclick: function () { game.active = i; change(g); }
      }, [h("span", { class: "n", text: n }), h("span", { class: "p", text: totals[i] + " Punkte" })]));
    });
    return wrap;
  }

  /* Pasch: Tabelle, Spalten = Spieler */
  function renderPasch(root) {
    var game = B.kniffel;
    var totals = game.sheets.map(kTotals);
    var table = h("table", { class: "ktable", "aria-label": "Paschblock" });
    var headRow = h("tr", null, [h("th", { scope: "col", text: "Spieler" })]);
    game.names.forEach(function (n) { headRow.appendChild(h("th", { scope: "col", text: n, title: n })); });
    table.appendChild(h("thead", null, [headRow]));
    var body = h("tbody");
    function sep(text) { body.appendChild(h("tr", { class: "sep" }, [h("th", { scope: "rowgroup", colspan: String(game.names.length + 1), text: text })])); }
    function catRow(cat, label, small) {
      var tr = h("tr", null, [h("th", { scope: "row" }, [label, small ? h("small", { text: small }) : null])]);
      game.sheets.forEach(function (cells, p) {
        var v = cells[cat];
        var btn = h("button", {
          type: "button", class: "kcell" + (v === null ? " empty" : v === 0 ? " zero" : ""), "data-k": cat + p,
          text: v === null ? "" : v === 0 ? "–" : String(v),
          "aria-label": game.names[p] + ", " + label + ": " + (v === null ? "leer" : v === 0 ? "gestrichen" : v + " Punkte"),
          onclick: function () { kEdit(p, cat, label); }
        });
        tr.appendChild(h("td", null, [btn]));
      });
      body.appendChild(tr);
    }
    function calcRow(label, key, cls, small) {
      var tr = h("tr", { class: cls || "calc" }, [h("th", { scope: "row" }, [label, small ? h("small", { text: small }) : null])]);
      totals.forEach(function (t) { tr.appendChild(h("td", { text: String(t[key]) })); });
      body.appendChild(tr);
    }
    sep("Oberer Teil");
    K_UP.forEach(function (c) { catRow(c[0], c[1], null); });
    calcRow("Summe oben", "upper");
    calcRow("Bonus", "bonus", null, "ab 63 → +35");
    calcRow("Gesamt oben", "upperTotal");
    sep("Unterer Teil");
    K_LOW.forEach(function (c) { catRow(c[0], c[1], c[2]); });
    calcRow("Gesamt unten", "lower");
    calcRow("Endsumme", "total", "grand");
    table.appendChild(body);

    var filled = game.sheets.every(function (c) { return K_CATS.every(function (k) { return c[k] !== null; }); });
    if (filled) {
      var best = Math.max.apply(null, totals.map(function (t) { return t.total; }));
      var winners = game.names.filter(function (n, i) { return totals[i].total === best; });
      root.appendChild(h("p", { class: "banner", text: game.names.length > 1 ? "Block voll! " + listText(winners) + (winners.length > 1 ? " gewinnen" : " gewinnt") + " mit " + best + " Punkten." : "Block voll: " + best + " Punkte." }));
    }
    root.appendChild(h("div", { class: "list" }, [table]));
    root.appendChild(h("p", { class: "hint", text: "Feld antippen, um Punkte einzutragen. Nach einem Wurf im Würfel-Tab schlägt die App den passenden Wert vor." }));
  }

  function kEdit(p, cat, label) {
    var game = B.kniffel, cur = game.sheets[p][cat];
    var dice = window.Wuerfel ? window.Wuerfel.kniffel() : null;
    var suggestion = null;
    if (dice && dice.vals.every(function (x) { return x > 0; })) {
      suggestion = { value: kScore(cat, dice.vals), label: "Aus dem Wurf " + dice.vals.slice().sort().join(" · ") };
    }
    UI.pick({
      title: label,
      sub: game.names.length > 1 ? game.names[p] : "",
      options: kOptions(cat).map(function (v) { return { value: v, label: v === 0 ? "0" : String(v), aria: v === 0 ? "Streichen, 0 Punkte" : v + " Punkte" }; }),
      current: cur,
      suggestion: suggestion,
      clear: cur !== null
    }).then(function (v) {
      if (v === undefined) return;
      game.sheets[p][cat] = v;
      change("kniffel");
      UI.say(label + ": " + (v === null ? "gelöscht" : v + " Punkte") + ".");
    });
  }

  /* Farbreihen: Blatt pro Person, zwei Zeilen à sechs Feldern je Farbe */
  function renderQuixx(root) {
    var game = B.quixx, s = game.sheets[game.active];
    var allTotals = game.sheets.map(qTotals);
    var t = allTotals[game.active];
    var ch = chips("quixx", allTotals.map(function (x) { return x.total; }));
    if (ch) root.appendChild(ch);

    var locks = Q_ROWS.filter(function (r) { return s.lock[r.k] !== 0; }).length;
    if (locks >= 2 || s.miss >= 4) {
      root.appendChild(h("p", { class: "banner", text: (s.miss >= 4 ? "Vier Fehlwürfe" : "Zwei Reihen sind geschlossen") + ": Spielende. " + game.names[game.active] + " hat " + t.total + " Punkte." }));
    }

    Q_ROWS.forEach(function (r) {
      var last = qLast(s, r.k), count = s.x[r.k].filter(Boolean).length, other = s.lock[r.k] === 2;
      var cells = h("div", { class: "qcells" });
      r.nums.forEach(function (num, i) {
        var on = s.x[r.k][i];
        var allowed = !other && i > last && (i < 10 || count >= 5);
        var skipped = !on && i < last;
        cells.appendChild(h("button", {
          type: "button", class: "qbox" + (on ? " on" : "") + (skipped ? " skip" : ""), "data-k": r.k + i,
          text: String(num), disabled: !(on || allowed),
          "aria-pressed": on ? "true" : "false",
          "aria-label": r.name + " " + num + (on ? ", angekreuzt" : skipped ? ", übersprungen" : i === 10 && count < 5 ? ", erst ab fünf Kreuzen" : ""),
          onclick: function () { qTap(r.k, i); }
        }));
      });
      var lockState = s.lock[r.k];
      cells.appendChild(h("button", {
        type: "button", class: "qbox lock" + (lockState === 1 ? " on" : "") + (lockState === 2 ? " other" : ""), "data-k": r.k + "lock",
        html: ICON.lock, disabled: lockState === 1,
        "aria-pressed": lockState ? "true" : "false",
        "aria-label": r.name + ", Schloss: " + (lockState === 1 ? "von dir geschlossen, zählt als Kreuz" : lockState === 2 ? "von jemand anderem geschlossen. Antippen zum Öffnen." : "offen. Antippen, wenn jemand anderes die Reihe schließt."),
        onclick: function () { qLock(r.k); }
      }));
      root.appendChild(h("section", { class: "qrow", "data-c": r.k, "aria-label": r.name }, [
        h("div", { class: "sec-head" }, [
          h("h3", { text: r.name + (other ? " · geschlossen" : "") }),
          h("span", { class: "pts" }, [h("b", { text: String(t.rows[r.k]) }), " Pkt · " + qCount(s, r.k) + " ✕"])
        ]),
        cells
      ]));
    });

    var mb = h("div", { class: "boxes" });
    for (var i = 0; i < 4; i++) (function (i) {
      mb.appendChild(h("button", {
        type: "button", class: "mbox" + (i < s.miss ? " on" : ""), "data-k": "miss" + i, text: i < s.miss ? "✕" : "",
        "aria-label": "Fehlwurf " + (i + 1) + (i < s.miss ? ", markiert" : ""), "aria-pressed": i < s.miss ? "true" : "false",
        onclick: function () { s.miss = i < s.miss ? i : i + 1; change("quixx"); }
      }));
    })(i);
    root.appendChild(h("section", { class: "card" }, [
      h("div", { class: "qmiss" }, [h("div", null, [h("h3", { class: "label", text: "Fehlwürfe" }), h("span", { class: "hint", text: "je −5" })]), mb])
    ]));

    var lines = h("div", { class: "scoreline" });
    Q_ROWS.forEach(function (r) { lines.appendChild(h("div", { class: "row" }, [h("span", { text: r.name }), h("span", { class: "v", text: String(t.rows[r.k]) })])); });
    lines.appendChild(h("div", { class: "row" }, [h("span", { text: "Fehlwürfe" }), h("span", { class: "v", text: t.miss ? "−" + t.miss : "0" })]));
    lines.appendChild(h("div", { class: "row total" }, [h("span", { text: "Gesamt" }), h("span", { text: String(t.total) })]));
    var ptab = h("div", { class: "ptab", "aria-label": "Punkte je Anzahl Kreuze" });
    for (var n = 1; n <= 12; n++) ptab.appendChild(h("span", { class: "k", text: String(n) }));
    for (var m = 1; m <= 12; m++) ptab.appendChild(h("span", { text: String(Q_PTS[m]) }));
    root.appendChild(h("section", { class: "card" }, [lines, h("p", { class: "label", text: "Kreuze → Punkte", style: "margin:12px 0 6px" }), ptab]));
    root.appendChild(h("p", { class: "hint", text: "Kreuze immer rechts vom letzten Kreuz. Die letzte Zahl geht erst ab fünf Kreuzen und schließt die Reihe, das Schloss zählt als Kreuz." }));
  }

  function qTap(k, i) {
    var s = B.quixx.sheets[B.quixx.active];
    if (s.x[k][i]) {
      s.x[k][i] = false;
      if (i === 10 && s.lock[k] === 1) s.lock[k] = 0;
    } else {
      var count = s.x[k].filter(Boolean).length;
      if (s.lock[k] === 2 || i <= qLast(s, k) || (i === 10 && count < 5)) return;
      s.x[k][i] = true;
      if (i === 10) s.lock[k] = 1;
    }
    change("quixx");
  }
  function qLock(k) {
    var s = B.quixx.sheets[B.quixx.active];
    if (s.lock[k] === 1) return;
    s.lock[k] = s.lock[k] === 2 ? 0 : 2;
    change("quixx");
  }

  /* Silbertablett: Blatt pro Person */
  function area(cls, title, pts, kids, note) {
    return h("section", { class: "area " + cls, "aria-label": title }, [
      h("div", { class: "sec-head" }, [h("h3", { text: title }), pts != null ? h("span", { class: "pts" }, [h("b", { text: String(pts) }), " Pkt"]) : null])
    ].concat(kids, note ? [h("p", { class: "note", text: note })] : []));
  }

  function renderClever(root) {
    var game = B.clever, s = game.sheets[game.active];
    var allTotals = game.sheets.map(cTotals);
    var t = allTotals[game.active];
    var got = cBonuses(s);
    var ch = chips("clever", allTotals.map(function (x) { return x.total; }));
    if (ch) root.appendChild(ch);

    // Aktionen: leer → eingekreist (verdient) → durchgestrichen (benutzt)
    var acts = h("div", { class: "acts" });
    ACTIONS.forEach(function (a) {
      var row = h("div", { class: "act" }, [badge(a[0], false)]);
      row.firstChild.style.opacity = "1";
      s.act[a[0]].forEach(function (st, i) {
        row.appendChild(h("button", {
          type: "button", class: "ring" + (st === 1 ? " earned" : st === 2 ? " used" : ""), "data-k": a[0] + i,
          "aria-label": a[1] + " " + (i + 1) + ": " + ["frei", "verdient", "benutzt"][st],
          onclick: function () { s.act[a[0]][i] = (st + 1) % 3; change("clever"); }
        }));
      });
      row.appendChild(h("span", { class: "arrow", text: "→", "aria-hidden": "true" }));
      row.appendChild(badge(ACTION_END[a[0]], got.act.indexOf(a[0]) !== -1));
      acts.appendChild(row);
    });
    root.appendChild(area("a-act", "Aktionen", null, [acts], "Antippen: einmal = verdient (○), zweimal = benutzt (✕), dreimal = frei."));

    // Silber: Farbe frei wählen, volle Spalte = Bonus
    var sg = h("div", { class: "sgrid" });
    SILVER_COL_BONUS.forEach(function (k, c) { sg.appendChild(h("div", { class: "bzwrap" }, [badge(k, got.silverCol.indexOf(c) !== -1)])); });
    sg.appendChild(h("span", { class: "ph", text: "Pkt" }));
    SILVER_ROWS.forEach(function (sr, r) {
      for (var n = 0; n < 6; n++) (function (n) {
        var on = s.silver[r][n];
        sg.appendChild(h("button", {
          type: "button", class: "cbox s-" + sr[0] + (on ? " x" : ""), "data-k": "s" + r + n, text: String(n + 1),
          "aria-pressed": on ? "true" : "false", "aria-label": "Silber, " + sr[1] + " " + (n + 1) + (on ? ", angekreuzt" : ""),
          onclick: function () { s.silver[r][n] = !s.silver[r][n]; change("clever"); }
        }));
      })(n);
      sg.appendChild(h("span", { class: "rp", text: String(t.silverRows[r]) }));
    });
    root.appendChild(area("a-silver", "Silber", t.silver, [sg], "Punkte je Zeile: 1 ✕ = 2, 2 = 4, 3 = 7, 4 = 11, 5 = 16, 6 = 22."));

    // Gelb: erst einkreisen, dann ankreuzen; volle Zeile/Spalte = Bonus
    var yg = h("div", { class: "ygrid" });
    YELLOW_NUMS.forEach(function (row, ri) {
      row.forEach(function (v, ci) {
        if (!v) { yg.appendChild(h("span", { class: "void" })); return; }
        var idx = ri * 4 + ci, st = s.yellow[idx];
        yg.appendChild(h("button", {
          type: "button", class: "cbox" + (st === 1 ? " o" : st === 2 ? " x" : ""), "data-k": "y" + idx, text: String(v),
          "aria-label": "Gelb " + v + ": " + ["frei", "eingekreist", "angekreuzt"][st],
          onclick: function () { s.yellow[idx] = (st + 1) % 3; change("clever"); }
        }));
      });
      yg.appendChild(badge(YELLOW_ROW_BONUS[ri], got.yRow.indexOf(ri) !== -1));
    });
    YELLOW_COL_BONUS.forEach(function (k, ci) { yg.appendChild(badge(k, got.yCol.indexOf(ci) !== -1)); });
    root.appendChild(area("a-yellow", "Gelb", t.yellow, [yg], "Antippen: einmal einkreisen (○), dann ankreuzen (✕). Es zählen die Kreuze: " + YELLOW_PTS.join(", ") + "."));

    // Blau + Weiß, Grün, Rosa: von links nach rechts füllen
    root.appendChild(area("a-blue", "Blau + Weiß", t.blue, [lineArea("blue", s, got)], "Jede Summe mindestens so hoch wie die vorige. Punkte nach Anzahl der Felder."));
    root.appendChild(area("a-green", "Grün", t.green, [greenArea(s, got)], "Würfelwert × Faktor, links minus rechts. Die Ergebnisse werden addiert."));
    root.appendChild(area("a-pink", "Rosa", t.pink, [lineArea("pink", s, got)], "Jede Zahl zählt. Den Bonus gibt es nur, wenn die Mindestzahl erreicht ist."));

    // Ergebnis
    var lines = h("div", { class: "scoreline" });
    [["Silber", t.silver], ["Gelb", t.yellow], ["Blau", t.blue], ["Grün", t.green], ["Rosa", t.pink]].forEach(function (x) {
      lines.appendChild(h("div", { class: "row" }, [h("span", { text: x[0] }), h("span", { class: "v", text: String(x[1]) })]));
    });
    lines.appendChild(h("div", { class: "row" }, [
      h("span", { text: "Füchse: " + t.foxes + " × " + Math.max(0, t.weakest) }),
      h("span", { class: "v", text: String(t.foxPts) })
    ]));
    lines.appendChild(h("div", { class: "row total" }, [h("span", { text: "Gesamt" }), h("span", { text: String(t.total) })]));
    root.appendChild(h("section", { class: "card" }, [
      h("div", { class: "sec-head" }, [h("h3", { text: "Ergebnis · " + game.names[game.active] })]),
      lines,
      h("p", { class: "hint", style: "margin-top:8px;font-size:13px", text: "Jeder Fuchs zählt so viel wie dein schwächster Farbbereich. Erreichte Boni sind grün markiert." })
    ]));
  }

  function lineArea(color, s, got) {
    var vals = s[color], filled = vals.filter(Boolean).length;
    var wrap = h("div", { class: "lines" });
    for (var line = 0; line < 2; line++) {
      var l = h("div", { class: "line6" });
      for (var j = 0; j < 6; j++) (function (i) {
        var v = vals[i], bonus = color === "blue" ? BLUE_BONUS[i] : PINK_BONUS[i];
        var gotIt = color === "blue" ? got.blue.indexOf(i) !== -1 : got.pink.indexOf(i) !== -1;
        var req = color === "pink" ? PINK_REQ[i] : 0;
        var tappable = i === filled || i === filled - 1;
        var label = (color === "blue" ? "Blau Feld " : "Rosa Feld ") + (i + 1) + (req ? ", mindestens " + req : "") + ": " + (v ? v : "leer");
        l.appendChild(h("div", { class: "slot" }, [
          h("span", { class: "top", text: color === "blue" ? String(BLUE_PTS[i]) : "" }),
          h("button", {
            type: "button", class: "cbox" + (v ? " filled" : "") + (i === filled ? " next" : ""), "data-k": color + i,
            disabled: !tappable, "aria-label": label,
            onclick: function () { cEnterValue(color, i); }
          }, [req ? h("span", { class: "req", text: "≥" + req }) : null, h("span", { class: "v", text: v ? String(v) : "" })]),
          h("span", { class: "bot" }, [bonus ? badge(bonus, gotIt) : null])
        ]));
      })(line * 6 + j);
      wrap.appendChild(l);
    }
    return wrap;
  }

  function greenArea(s, got) {
    var filled = s.green.filter(Boolean).length;
    var wrap = h("div", { class: "gpairs" });
    for (var p = 0; p < 6; p++) {
      var r = cGreenPair(s, p);
      var pair = h("div", { class: "gpair", role: "group", "aria-label": "Grünes Paar " + (p + 1) + (r !== null ? ", Ergebnis " + r : "") }, [
        h("span", { class: "res", text: r === null ? "" : String(r) })
      ]);
      [2 * p, 2 * p + 1].forEach(function (i, side) {
        var v = s.green[i], tappable = i === filled || i === filled - 1;
        pair.appendChild(h("div", { class: "slot" }, [
          h("button", {
            type: "button", class: "cbox" + (v ? " filled" : "") + (i === filled ? " next" : ""), "data-k": "green" + i,
            disabled: !tappable, "aria-label": "Grün Feld " + (i + 1) + ", mal " + GREEN_MULT[i] + ": " + (v || "leer"),
            onclick: function () { cEnterValue("green", i); }
          }, [h("span", { class: "req", text: "×" + GREEN_MULT[i] }), h("span", { class: "v", text: v ? String(v) : "" })]),
          h("span", { class: "bot" }, [GREEN_BONUS[i] ? badge(GREEN_BONUS[i], got.green.indexOf(i) !== -1) : null])
        ]));
        if (side === 0) pair.appendChild(h("span", { class: "minus", text: "−", "aria-hidden": "true" }));
      });
      wrap.appendChild(pair);
    }
    return wrap;
  }

  function cEnterValue(color, i) {
    var game = B.clever, s = game.sheets[game.active], vals = s[color];
    var filled = vals.filter(Boolean).length;
    if (i !== filled && i !== filled - 1) return;
    var opts;
    if (color === "blue") {
      var min = i > 0 ? vals[i - 1] : 2;
      opts = range(2, 12, 1).map(function (v) { return { value: v, disabled: v < min }; });
    } else {
      opts = range(1, 6, 1).map(function (v) { return { value: v }; });
    }
    var names = { blue: "Blau + Weiß", green: "Grün", pink: "Rosa" };
    var sub = color === "blue" ? (i > 0 ? "Mindestens " + vals[i - 1] : "Summe aus blauem und weißem Würfel")
      : color === "green" ? "Würfelwert, wird mit " + GREEN_MULT[i] + " multipliziert"
      : PINK_REQ[i] ? "Bonus ab " + PINK_REQ[i] : "Würfelwert";
    UI.pick({
      title: names[color] + " · Feld " + (i + 1), sub: sub, options: opts, current: vals[i] || null,
      clear: !!vals[i] && i === filled - 1
    }).then(function (v) {
      if (v === undefined) return;
      if (v === null) { vals[i] = 0; }
      else {
        // Blau: Folgefelder müssen weiter passen
        if (color === "blue" && i < 11 && vals[i + 1] && vals[i + 1] < v) return;
        vals[i] = v;
      }
      change("clever");
    });
  }

  /* ---------- Spieler und neues Spiel ---------- */
  var plDlg = null, plCount = 2, plGame = "kniffel";
  function openPlayers() {
    plGame = UI.Shell.mode;
    var game = B[plGame];
    plCount = game.names.length;
    document.getElementById("pl-title").textContent = "Spieler · " + TITLE[plGame];
    // Frisches Element, damit sich keine alten Tasten-Listener stapeln
    var old = document.getElementById("pl-count");
    var segWrap = old.cloneNode(false);
    old.parentNode.replaceChild(segWrap, old);
    for (var n = 1; n <= MAX[plGame]; n++) segWrap.appendChild(h("button", { type: "button", role: "radio", text: String(n), "aria-label": n + " Spieler" }));
    var seg = UI.Segmented(segWrap, function (i) { plCount = i + 1; seg.select(i); plRender(); });
    var inputs = document.getElementById("pl-names");
    inputs.textContent = "";
    for (var k = 0; k < MAX[plGame]; k++) {
      inputs.appendChild(h("input", {
        class: "text", id: "pl-n" + k, maxlength: "16", autocomplete: "off", "aria-label": "Name Spieler " + (k + 1),
        placeholder: "Spieler " + (k + 1), value: /^Spieler \d$/.test(game.names[k] || "") ? "" : game.names[k] || ""
      }));
    }
    plDlg = UI.sheet("players-dlg");
    plDlg.open();
    seg.select(plCount - 1);
    plRender();
  }
  function plRender() {
    for (var k = 0; k < MAX[plGame]; k++) document.getElementById("pl-n" + k).hidden = k >= plCount;
  }
  function plSave() {
    var game = B[plGame];
    var names = [];
    for (var k = 0; k < plCount; k++) names.push(cleanName(document.getElementById("pl-n" + k).value, k));
    var dropped = game.names.slice(plCount).filter(function (n, i) { return hasEntries(plGame, game.sheets[plCount + i]); });
    var apply = function () {
      var sheets = game.sheets.slice(0, plCount);
      while (sheets.length < plCount) sheets.push(NEW[plGame]());
      B[plGame] = { names: names, active: Math.min(game.active, plCount - 1), sheets: sheets };
      plDlg.close();
      change(plGame);
    };
    if (!dropped.length) { apply(); return; }
    plDlg.close();
    UI.confirm({
      title: "Weniger Spieler?",
      text: "Die Blätter von " + listText(dropped) + " haben schon Einträge. Sie werden gelöscht.",
      action: "Blätter löschen"
    }).then(function (ok) { if (ok) apply(); else openPlayers(); });
  }
  function hasEntries(g, s) {
    if (g === "kniffel") return K_CATS.some(function (k) { return s[k] !== null; });
    if (g === "quixx") return s.miss > 0 || Q_ROWS.some(function (r) { return s.lock[r.k] || s.x[r.k].some(Boolean); });
    return cTotals(s).total !== 0 || s.yellow.some(Boolean) || s.blue.some(Boolean) || s.green.some(Boolean) ||
      ACTIONS.some(function (a) { return s.act[a[0]].some(Boolean); }) || s.silver.some(function (r) { return r.some(Boolean); });
  }
  function newBlock() {
    var g = UI.Shell.mode, game = B[g];
    var used = game.names.filter(function (n, i) { return hasEntries(g, game.sheets[i]); });
    var reset = function () { B[g] = newGame(g, game.names.slice()); change(g); UI.say("Neuer " + BLOCK[g] + "."); };
    if (!used.length) { reset(); return; }
    UI.confirm({
      title: "Neuen " + BLOCK[g] + " anfangen?",
      text: "Alle Einträge im " + BLOCK[g] + " werden gelöscht (" + listText(used) + "). Die Namen bleiben. Die Würfel sind davon nicht betroffen.",
      action: "Block leeren"
    }).then(function (ok) { if (ok) reset(); });
  }
  document.getElementById("pl-save").addEventListener("click", plSave);
  document.getElementById("blk-players").addEventListener("click", openPlayers);
  document.getElementById("blk-new").addEventListener("click", newBlock);

  /* ---------- Start ---------- */
  UI.GAMES.forEach(render);
  UI.Shell.onChange(function (m, v) {
    // Pasch-Vorschlag hängt vom aktuellen Wurf ab: beim Öffnen des Blocks frisch zeichnen
    if (v === "block") render(m);
  });
  UI.Shell.apply();

  window.Bloecke = { render: render };
})();
