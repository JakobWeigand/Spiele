/* Silbertablett – Würfel mit Becher, Würfelfeldern und Silbertablett, zu zweit über einen Raum.
   Stammt aus dem Würfelbecher (drei Spiele); hier wird nur der Modus „clever“ gezeigt.
   Ansichten, Sheets und Animationen kommen aus js/ui.js. */
(function () {
  "use strict";
  var UI = window.UI;

  /* ---------- Zufall ----------
     crypto.getRandomValues liefert Zufall aus dem Betriebssystem.
     Bytes ab 252 werden verworfen, damit 0–251 sich glatt auf 6 Seiten
     verteilt (252 = 6 × 42) und keine Augenzahl bevorzugt wird. */
  var buf = new Uint8Array(1);
  function rollD6() {
    if (window.crypto && crypto.getRandomValues) {
      do { crypto.getRandomValues(buf); } while (buf[0] >= 252);
      return (buf[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }
  function flickerD6() { return Math.floor(Math.random() * 6) + 1; } // nur für die Animation

  var NAMES = ["", "Eins", "Zwei", "Drei", "Vier", "Fünf", "Sechs"];
  var FACES = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  function makeDie(extraClass) {
    var d = document.createElement("div");
    d.className = "die blank" + (extraClass ? " " + extraClass : "");
    d.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 9; i++) {
      var p = document.createElement("span");
      p.className = "pip";
      d.appendChild(p);
    }
    return d;
  }
  function showFace(die, v) {
    var on = FACES[v] || [];
    die.classList.toggle("blank", !v);
    for (var i = 0; i < 9; i++) die.children[i].classList.toggle("on", on.indexOf(i) !== -1);
  }

  // Kurze Würfelanimation: Augen flackern, dann landet der echte Wert.
  function tumble(dice, finals, done) {
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    if (UI.reduceMotion()) {
      dice.forEach(function (d, k) { showFace(d, finals[k]); });
      done();
      return;
    }
    dice.forEach(function (d) { d.classList.remove("rolling"); void d.offsetWidth; d.classList.add("rolling"); });
    var iv = setInterval(function () { dice.forEach(function (d) { showFace(d, flickerD6()); }); }, 65);
    setTimeout(function () {
      clearInterval(iv);
      dice.forEach(function (d, k) { showFace(d, finals[k]); d.classList.remove("rolling"); });
      done();
    }, 480);
  }

  var say = UI.say;

  /* ---------- Raum: MQTT 3.1.1 über WebSocket ----------
     Zwei öffentliche Broker parallel, damit ein Ausfall nicht stört. Der Spielstand liegt
     als „retained“ Nachricht im Raum: Wer dazukommt, bekommt sofort den aktuellen Stand.
     Anwesenheit: jedes Gerät meldet sich alle 20 s, der Last Will räumt beim Abbruch auf. */
  // Revisionen aus dem Raum: nur ganze Zahlen in vernünftiger Größe. Ein Wert ab 2^53 ließe sich nicht mehr
  // hochzählen, und ein Fremder könnte damit den Abgleich eines Raums dauerhaft einfrieren.
  function okRev(r) { return Number.isSafeInteger(r) && r >= 0 && r <= 1e9; }

  var Room = (function () {
    var BROKERS =["wss://broker.hivemq.com:8884/mqtt", "wss://broker.emqx.io:8084/mqtt"];
    var NS = "spieleabend-silbertablett/v1/";
    var PEER_TTL = 60000;
    var enc = new TextEncoder(), dec = new TextDecoder();
    var room = null, me = "", conns = [], latest = null, pingTimer = null;
    var api = { onEnvelope: function () {}, onStatus: function () {} };

    function str(s) {
      var b = enc.encode(s), out = [b.length >> 8, b.length & 255];
      for (var i = 0; i < b.length; i++) out.push(b[i]);
      return out;
    }
    function packet(type, body) {
      var len = [], n = body.length;
      do { var d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; len.push(d); } while (n > 0);
      var out = new Uint8Array(1 + len.length + body.length);
      out[0] = type; out.set(len, 1); out.set(body, 1 + len.length);
      return out;
    }
    function publishPacket(topic, payload, retain) {
      var t = str(topic), p = enc.encode(payload);
      var body = new Uint8Array(t.length + p.length);
      body.set(t, 0); body.set(p, t.length);
      return packet(0x30 | (retain ? 1 : 0), body);
    }
    function base() { return NS + room; }

    function make(url, n) {
      var c = { ws: null, up: false, peers: {}, retry: 0, timer: null, grace: null, buf: new Uint8Array(0), seen: -1, rx: 0 };
      function send(bytes) { try { c.ws.send(bytes); } catch (e) {} }
      c.pub = function (topic, payload, retain) { if (c.up) send(publishPacket(topic, payload, retain)); };
      c.open = function () {
        clearTimeout(c.timer); c.timer = null;
        if (!room || c.ws) return;
        var ws;
        try { ws = new WebSocket(url, "mqtt"); } catch (e) { c.later(); return; }
        c.ws = ws; c.buf = new Uint8Array(0); c.seen = -1; c.peers = {};
        ws.binaryType = "arraybuffer";
        ws.onopen = function () {
          c.rx = Date.now();
          // CONNECT: clean session (0x02) + Last Will (0x04, retained 0x20) = leere Anwesenheit
          var body = str("MQTT").concat([4, 0x26, 0, 30], str("wb-" + me + "-" + n), str(base() + "/p/" + me), [0, 0]);
          send(packet(0x10, body));
        };
        ws.onmessage = function (ev) { c.rx = Date.now(); if (ev.data instanceof ArrayBuffer) feed(new Uint8Array(ev.data)); };
        ws.onclose = function () {
          if (c.ws !== ws) return;
          c.ws = null; c.up = false; c.peers = {};
          clearTimeout(c.grace);
          status();
          c.later();
        };
        ws.onerror = function () { try { ws.close(); } catch (e) {} };
      };
      c.later = function () {
        if (!room || c.timer) return;
        c.retry = Math.min(c.retry + 1, 5);
        c.timer = setTimeout(c.open, [1, 2, 4, 8, 15][c.retry - 1] * 1000);
      };
      c.close = function (graceful) {
        clearTimeout(c.timer); clearTimeout(c.grace); c.timer = null;
        var ws = c.ws;
        c.ws = null; c.up = false; c.peers = {};
        if (!ws) return;
        if (graceful && ws.readyState === 1) {
          try { ws.send(publishPacket(base() + "/p/" + me, "", true)); ws.send(new Uint8Array([0xe0, 0])); } catch (e) {}
        }
        try { ws.close(); } catch (e) {}
      };
      // Ein WebSocket-Frame kann mehrere oder halbe MQTT-Pakete enthalten: puffern und zerlegen
      function feed(chunk) {
        var nb = new Uint8Array(c.buf.length + chunk.length);
        nb.set(c.buf); nb.set(chunk, c.buf.length); c.buf = nb;
        for (;;) {
          if (c.buf.length < 2) return;
          var mul = 1, len = 0, i = 1, d;
          do {
            if (i >= c.buf.length) return;
            d = c.buf[i++]; len += (d & 127) * mul; mul *= 128;
          } while (d & 128);
          if (c.buf.length < i + len) return;
          var type = c.buf[0], body = c.buf.slice(i, i + len);
          c.buf = c.buf.slice(i + len);
          handle(type, body);
        }
      }
      function handle(type, body) {
        var kind = type >> 4;
        if (kind === 2) { // CONNACK
          if (body[1] !== 0) { try { c.ws.close(); } catch (e) {} return; }
          c.up = true; c.retry = 0;
          send(packet(0x82, [0, 1].concat(str(base() + "/#"), [0])));
          c.pub(base() + "/p/" + me, "1", true);
          status();
        } else if (kind === 9) { // SUBACK: retained Nachrichten folgen sofort, kurz abwarten
          clearTimeout(c.grace);
          c.grace = setTimeout(function () {
            // Raum leer oder älter als unser Stand: unseren Stand hinterlegen
            if (latest && c.up && c.seen < latest.rev) c.pub(base() + "/s", JSON.stringify(latest), true);
          }, 1200);
        } else if (kind === 3) { // PUBLISH
          var tl = (body[0] << 8) | body[1];
          var topic = dec.decode(body.subarray(2, 2 + tl));
          if (topic.indexOf(base() + "/") !== 0) return;
          var off = 2 + tl + (((type >> 1) & 3) ? 2 : 0);
          if (body.length - off > 65536) return;
          var payload = dec.decode(body.subarray(off));
          var rest = topic.slice(base().length);
          if (rest === "/s") {
            if (!payload) return;
            var env;
            try { env = JSON.parse(payload); } catch (e) { return; }
            if (env && okRev(env.rev)) c.seen = Math.max(c.seen, env.rev);
            api.onEnvelope(env);
          } else if (rest.indexOf("/p/") === 0) {
            var who = rest.slice(3);
            if (who === me || who.length > 40) return;
            if (payload) c.peers[who] = Date.now(); else delete c.peers[who];
            status();
          }
        }
      }
      return c;
    }

    function ping() {
      conns.forEach(function (c) {
        if (!c.ws || c.ws.readyState !== 1) return;
        if (Date.now() - c.rx > 50000) { try { c.ws.close(); } catch (e) {} return; }
        try { c.ws.send(new Uint8Array([0xc0, 0])); } catch (e) {}
        c.pub(base() + "/p/" + me, "1", true);
      });
      status();
    }
    function status() { api.onStatus(api.status()); }
    function wake() {
      if (!room) return;
      conns.forEach(function (c) { if (!c.ws) { c.retry = 0; c.open(); } });
    }

    api.status = function () {
      if (!room) return { state: "off", room: null, peers: 0 };
      var now = Date.now(), peers = {};
      conns.forEach(function (c) {
        if (!c.up) return;
        Object.keys(c.peers).forEach(function (k) { if (now - c.peers[k] < PEER_TTL) peers[k] = true; });
      });
      var state = conns.some(function (c) { return c.up; }) ? "up"
        : conns.every(function (c) { return c.retry > 1; }) ? "down" : "connecting";
      return { state: state, room: room, peers: Object.keys(peers).length };
    };
    api.join = function (code, cid) {
      if (room === code && me === cid) return;
      api.leave();
      room = code; me = cid;
      conns = BROKERS.map(make);
      conns.forEach(function (c) { c.open(); });
      pingTimer = setInterval(ping, 20000);
      status();
    };
    api.leave = function () {
      conns.forEach(function (c) { c.close(true); });
      conns = []; room = null; latest = null;
      clearInterval(pingTimer); pingTimer = null;
      status();
    };
    // Senden: sofort an alle verbundenen Broker, sonst beim nächsten Verbinden
    api.send = function (env) {
      if (!room) return;
      latest = env;
      var json = JSON.stringify(env);
      conns.forEach(function (c) { c.pub(base() + "/s", json, true); });
    };
    // Merken ohne Senden: nach dem Verbinden nur hinterlegen, wenn der Raum nichts Neueres hat
    api.remember = function (env) { if (room) latest = env; };

    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") wake(); });
    window.addEventListener("online", wake);
    window.addEventListener("pageshow", wake);
    return api;
  })();

  /* ---------- Gemeinsamer Zustand ----------
     Alles, was beide Handys gleich sehen sollen, steckt in mode, K, Q, C und lastRoll.
     Jede Änderung läuft über commit(): Revisionsnummer hoch, lokal speichern, in den Raum senden.
     busy gilt nur lokal, solange eine Würfelanimation läuft. */
  var MODES = ["kniffel", "quixx", "clever"];
  var mode = "clever";
  var busy = false;
  var pending = null;          // Stand aus dem Raum, der während einer Animation ankam
  var SYNC = { rev: 0, cid: randomId(10) };
  var lastRoll = { id: "", mode: "kniffel", idx: [] };
  var rollCount = 0;

  function randomId(n) {
    var abc = "abcdefghijkmnpqrstuvwxyz23456789", out = "", b = new Uint8Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (var i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
    for (var j = 0; j < n; j++) out += abc[b[j] % abc.length];
    return out;
  }

  /* ---------- Pasch ---------- */
  var K = { vals: [0, 0, 0, 0, 0], held: [false, false, false, false, false], left: 3, turn: 1 };
  var kWrap = document.getElementById("k-dice");
  var kBtns = [], kDice = [], kTags = [];
  for (var i = 0; i < 5; i++) {
    var b = document.createElement("button");
    b.className = "die-btn";
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    var d = makeDie();
    var t = document.createElement("span");
    t.className = "tag";
    b.appendChild(d);
    b.appendChild(t);
    b.addEventListener("click", toggleHold.bind(null, i));
    kWrap.appendChild(b);
    kBtns.push(b); kDice.push(d); kTags.push(t);
  }
  var kRoll = document.getElementById("k-roll");
  var kNext = document.getElementById("k-next");
  var kLeft = document.getElementById("k-left");
  var kBoxes = document.querySelectorAll("#k-throws .box");
  var kTurn = document.getElementById("k-turn");
  var kHint = document.getElementById("k-hint");
  var kSum = document.getElementById("k-sum");
  var kBest = document.getElementById("k-best");

  function toggleHold(i) {
    if (busy || !K.vals[i]) return;
    K.held[i] = !K.held[i];
    commit();
    renderK();
  }

  // Beste Pasch-Kategorie des aktuellen Wurfs, mit Punkten
  function bestCategory(v) {
    var counts = [0, 0, 0, 0, 0, 0, 0];
    v.forEach(function (x) { counts[x]++; });
    var sum = v.reduce(function (a, x) { return a + x; }, 0);
    var max = Math.max.apply(null, counts);
    var has = function (arr) { return arr.every(function (x) { return counts[x] > 0; }); };
    var shape = counts.filter(function (c) { return c > 0; }).sort().join("");
    if (max === 5) return ["Fünferpasch", 50];
    if (has([1, 2, 3, 4, 5]) || has([2, 3, 4, 5, 6])) return ["Große Straße", 40];
    if (has([1, 2, 3, 4]) || has([2, 3, 4, 5]) || has([3, 4, 5, 6])) return ["Kleine Straße", 30];
    if (shape === "23") return ["Full House", 25];
    if (max >= 4) return ["Viererpasch", sum];
    if (max >= 3) return ["Dreierpasch", sum];
    return ["Chance", sum];
  }

  function renderK() {
    var rolled = K.vals[0] > 0;
    var allHeld = K.held.every(Boolean);
    kLeft.textContent = K.left;
    kBoxes.forEach(function (bx, n) { bx.classList.toggle("on", n < K.left); });
    kTurn.textContent = K.turn;
    if (busy) {
      kRoll.disabled = true; kNext.disabled = true;
      kBtns.forEach(function (bt) { bt.disabled = true; });
      return;
    }
    for (var i = 0; i < 5; i++) {
      showFace(kDice[i], K.vals[i]);
      kBtns[i].setAttribute("aria-pressed", K.held[i] ? "true" : "false");
      kBtns[i].disabled = !rolled;
      kTags[i].textContent = K.held[i] ? "Gehalten" : "";
      kBtns[i].setAttribute("aria-label",
        "Würfel " + (i + 1) + ": " + (K.vals[i] ? NAMES[K.vals[i]] : "noch nicht gewürfelt") +
        (K.held[i] ? ", gehalten" : ""));
    }

    if (K.left === 0) kRoll.textContent = "Keine Würfe mehr";
    else if (rolled && allHeld) kRoll.textContent = "Alle gehalten";
    else if (K.left === 3) kRoll.textContent = "Würfeln";
    else kRoll.textContent = "Nochmal würfeln";
    kRoll.disabled = K.left === 0 || (rolled && allHeld);
    kNext.textContent = K.turn >= 13 ? "Neues Spiel" : "Nächster Zug";
    kNext.disabled = false;

    if (!rolled) kHint.textContent = "Würfle zuerst. Danach tippst du einen Würfel an, um ihn zu halten.";
    else if (K.left === 0) kHint.textContent = "Alle drei Würfe sind verbraucht. Trag dein Ergebnis ein und starte den nächsten Zug.";
    else kHint.textContent = "Tippe einen Würfel an, um ihn zu halten oder wieder freizugeben.";

    if (rolled) {
      var sum = K.vals.reduce(function (a, x) { return a + x; }, 0);
      var best = bestCategory(K.vals);
      kSum.textContent = sum;
      kBest.innerHTML = best[0] + " <small>" + best[1] + " Punkte</small>";
    } else {
      kSum.textContent = "–";
      kBest.textContent = "–";
    }
  }

  kRoll.addEventListener("click", function () {
    if (busy || K.left === 0) return;
    var idx = [];
    for (var i = 0; i < 5; i++) if (!K.held[i]) idx.push(i);
    if (!idx.length) return;
    idx.forEach(function (i) { K.vals[i] = rollD6(); });
    K.left--;
    commit({ mode: "kniffel", idx: idx });
    playRoll("kniffel", idx);
  });

  kNext.addEventListener("click", function () {
    if (busy) return;
    K.turn = K.turn >= 13 ? 1 : K.turn + 1;
    K.vals = [0, 0, 0, 0, 0];
    K.held = [false, false, false, false, false];
    K.left = 3;
    commit();
    renderK();
    say("Zug " + K.turn + ". Drei Würfe übrig.");
  });

  /* ---------- Quixx ---------- */
  var COLORS = [
    { key: "red", name: "Rot" },
    { key: "yellow", name: "Gelb" },
    { key: "green", name: "Grün" },
    { key: "blue", name: "Blau" }
  ];
  var Q = { w: [0, 0], c: { red: 0, yellow: 0, green: 0, blue: 0 }, locked: {} };

  var qWhite = document.getElementById("q-white");
  var qSumTile = qWhite.firstElementChild;
  var qWhiteDice = [];
  [0, 1].forEach(function (n) {
    var box = document.createElement("div");
    box.className = "die-btn";
    var d = makeDie("white");
    var name = document.createElement("span");
    name.className = "die-name";
    name.textContent = "Weiß " + (n + 1);
    box.appendChild(d);
    box.appendChild(name);
    qWhite.insertBefore(box, qSumTile);
    qWhiteDice.push(d);
  });

  var qColor = document.getElementById("q-color");
  var qColorDice = {}, qColorBtns = {};
  COLORS.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "die-btn";
    b.setAttribute("aria-pressed", "false");
    var d = makeDie(c.key);
    var name = document.createElement("span");
    name.className = "die-name";
    name.textContent = c.name;
    b.appendChild(d);
    b.appendChild(name);
    b.addEventListener("click", function () {
      if (busy) return;
      Q.locked[c.key] = !Q.locked[c.key];
      if (Q.locked[c.key]) Q.c[c.key] = 0;
      commit();
      renderQ();
      say(c.name + (Q.locked[c.key] ? " weggelegt." : " wieder im Spiel."));
    });
    qColor.appendChild(b);
    qColorDice[c.key] = d;
    qColorBtns[c.key] = b;
  });

  var qTable = document.getElementById("q-table");
  var qCells = {};
  COLORS.forEach(function (c) {
    var tr = document.createElement("tr");
    var name = document.createElement("td");
    name.innerHTML = '<span class="swatch ' + c.key + '"></span>' + c.name;
    var a = document.createElement("td"); a.className = "num";
    var b = document.createElement("td"); b.className = "num";
    tr.appendChild(name); tr.appendChild(a); tr.appendChild(b);
    qTable.appendChild(tr);
    qCells[c.key] = [a, b];
  });

  var qSum = document.getElementById("q-sum");
  var qRoll = document.getElementById("q-roll");

  // Reihenfolge für Animation und Sync: Weiß 1, Weiß 2, Rot, Gelb, Grün, Blau
  function qDiceList() { return [qWhiteDice[0], qWhiteDice[1]].concat(COLORS.map(function (c) { return qColorDice[c.key]; })); }
  function qValues() { return [Q.w[0], Q.w[1]].concat(COLORS.map(function (c) { return Q.c[c.key]; })); }

  function renderQ() {
    var active = COLORS.filter(function (c) { return !Q.locked[c.key]; }).length + 2;
    qRoll.textContent = active === 6 ? "Alle 6 würfeln" : active + " Würfel würfeln";
    if (busy) {
      qRoll.disabled = true;
      COLORS.forEach(function (c) { qColorBtns[c.key].disabled = true; });
      return;
    }
    qRoll.disabled = false;
    var rolled = Q.w[0] > 0;
    showFace(qWhiteDice[0], Q.w[0]);
    showFace(qWhiteDice[1], Q.w[1]);
    qSum.textContent = rolled ? Q.w[0] + Q.w[1] : "–";
    COLORS.forEach(function (c) {
      var locked = !!Q.locked[c.key];
      var btn = qColorBtns[c.key];
      btn.disabled = false;
      showFace(qColorDice[c.key], locked ? 0 : Q.c[c.key]);
      btn.classList.toggle("locked", locked);
      btn.setAttribute("aria-pressed", locked ? "true" : "false");
      btn.setAttribute("aria-label", c.name + ": " +
        (locked ? "weggelegt" : (Q.c[c.key] ? NAMES[Q.c[c.key]] : "noch nicht gewürfelt")) +
        ". Antippen zum " + (locked ? "Zurückholen" : "Weglegen") + ".");
      var v = Q.c[c.key];
      var show = rolled && v && !locked;
      qCells[c.key][0].textContent = show ? Q.w[0] + v : "–";
      qCells[c.key][1].textContent = show ? Q.w[1] + v : "–";
      qCells[c.key][0].classList.toggle("off", !show);
      qCells[c.key][1].classList.toggle("off", !show);
    });
  }

  qRoll.addEventListener("click", function () {
    if (busy) return;
    var idx = [0, 1];
    Q.w = [rollD6(), rollD6()];
    COLORS.forEach(function (c, n) {
      if (Q.locked[c.key]) { Q.c[c.key] = 0; return; }
      Q.c[c.key] = rollD6();
      idx.push(n + 2);
    });
    commit({ mode: "quixx", idx: idx });
    playRoll("quixx", idx);
  });

  /* ---------- Silbertablett ----------
     Aktiver Zug: bis zu 3 Würfe. Nach jedem Wurf einen Würfel wählen, er kommt auf das
     nächste Würfelfeld, alle niedrigeren wandern aufs Silbertablett.
     Danach wählen die passiven Spieler je einen Würfel vom Tablett. */
  var CC = [
    { key: "white", name: "Weiß" },
    { key: "silver", name: "Silber" },
    { key: "yellow", name: "Gelb" },
    { key: "blue", name: "Blau" },
    { key: "green", name: "Grün" },
    { key: "pink", name: "Rosa" }
  ];
  var WHITE = 0, SILVER = 1, BLUE = 3;
  var ROUND_GIFT = {
    1: "eine Nachwürfel-Aktion",
    2: "eine Zusatzwürfel-Aktion (+1)",
    3: "eine Rückhol-Aktion",
    4: "einen ?-Bonus in einer Farbe ihrer Wahl"
  };
  function roundsFor(n) { return n >= 4 ? 4 : n === 3 ? 5 : 6; }
  function defaultNames() { return ["Spieler 1", "Spieler 2", "Spieler 3", "Spieler 4"]; }
  function newClever(players, names) {
    return {
      players: players, names: names, round: 1, active: 0, soloPassive: false,
      val: [0, 0, 0, 0, 0, 0], loc: ["cup", "cup", "cup", "cup", "cup", "cup"],
      slot: [-1, -1, -1],       // Würfel je Wurf; -1 frei, -2 verfallen
      throws: 0, phase: "roll", // roll | pick | passive | over
      moved: [],                // beim letzten Wählen aufs Tablett gewandert
      taken: [false, false, false, false, false, false],
      ret: [],                  // per Rückhol-Aktion zurückgeholt, vor dem nächsten Wurf
      silver: false,            // zuletzt gewählter Würfel war Silber
      undo: null
    };
  }
  var C = newClever(2, defaultNames());

  var cCup = document.getElementById("c-cup");
  var cBtns = [], cDice = [], cNames = [];
  CC.forEach(function (c, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "die-btn";
    var d = makeDie("c-" + c.key);
    var nm = document.createElement("span");
    nm.className = "die-name";
    b.appendChild(d);
    b.appendChild(nm);
    b.addEventListener("click", function () { cCupTap(i); });
    cCup.appendChild(b);
    cBtns.push(b); cDice.push(d); cNames.push(nm);
  });

  var cSlotsWrap = document.getElementById("c-slots");
  var cSlots = [], cSlotDice = [];
  [0, 1, 2].forEach(function (k) {
    var s = document.createElement("button");
    s.type = "button";
    s.className = "cslot empty";
    var d = makeDie("mini");
    s.appendChild(d);
    s.addEventListener("click", function () { cSlotTap(k); });
    cSlotsWrap.appendChild(s);
    cSlots.push(s); cSlotDice.push(d);
  });

  var cTray = document.getElementById("c-tray");
  var cTrayEmpty = document.getElementById("c-tray-empty");
  var cTItems = [], cTDice = [], cTTags = [];
  CC.forEach(function (c, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "titem";
    b.hidden = true;
    var d = makeDie("mini c-" + c.key);
    var tg = document.createElement("span");
    tg.className = "tag";
    b.appendChild(d);
    b.appendChild(tg);
    b.addEventListener("click", function () { cTrayTap(i); });
    cTray.appendChild(b);
    cTItems.push(b); cTDice.push(d); cTTags.push(tg);
  });

  var cWho = document.getElementById("c-who");
  var cWhoLabel = document.getElementById("c-who-label");
  var cName = document.getElementById("c-name");
  var cLeft = document.getElementById("c-left");
  var cBoxes = document.querySelectorAll("#c-throws .box");
  var cBanner = document.getElementById("c-banner");
  var cBW = document.getElementById("c-bw");
  var cHint = document.getElementById("c-hint");
  var cSkip = document.getElementById("c-skip");
  var cAlt = document.getElementById("c-alt");
  var cMain = document.getElementById("c-main");

  function cupIdx() { var r = []; for (var i = 0; i < 6; i++) if (C.loc[i] === "cup") r.push(i); return r; }
  function trayIdx() { var r = []; for (var i = 0; i < 6; i++) if (C.loc[i] === "tray") r.push(i); return r; }
  function dieText(i) { return CC[i].name + " " + C.val[i]; }
  function listText(arr) {
    if (arr.length < 2) return arr.join("");
    return arr.slice(0, -1).join(", ") + " und " + arr[arr.length - 1];
  }
  function snapC() { var copy = JSON.parse(JSON.stringify(C)); copy.undo = null; return copy; }
  function playerName(n) { return C.names[n] || "Spieler " + (n + 1); }

  function resetTurn() {
    C.val = [0, 0, 0, 0, 0, 0];
    C.loc = ["cup", "cup", "cup", "cup", "cup", "cup"];
    C.slot = [-1, -1, -1];
    C.throws = 0;
    C.phase = "roll";
    C.moved = [];
    C.taken = [false, false, false, false, false, false];
    C.ret = [];
    C.silver = false;
  }

  function cRoll() {
    if (busy || C.phase !== "roll") return;
    var idx = cupIdx();
    if (!idx.length) return;
    C.undo = null; C.ret = []; C.moved = []; C.silver = false;
    idx.forEach(function (i) { C.val[i] = rollD6(); });
    C.throws++;
    C.phase = "pick";
    commit({ mode: "clever", idx: idx });
    playRoll("clever", idx);
  }

  // Nachwürfel-Aktion: alle gerade gewürfelten Würfel nochmal, zählt nicht als eigener Wurf
  function cReroll() {
    if (busy || C.phase !== "pick" || C.soloPassive) return;
    var idx = cupIdx();
    C.undo = null;
    idx.forEach(function (i) { C.val[i] = rollD6(); });
    commit({ mode: "clever", idx: idx });
    playRoll("clever", idx);
  }

  function cPick(i) {
    if (busy || C.phase !== "pick" || C.loc[i] !== "cup") return;
    C.undo = snapC();
    var v = C.val[i];
    C.loc[i] = "slot";
    C.slot[C.throws - 1] = i;
    C.moved = [];
    C.silver = i === SILVER;
    cupIdx().forEach(function (j) { if (C.val[j] < v) { C.loc[j] = "tray"; C.moved.push(j); } });
    afterChoice();
    say(CC[i].name + " " + v + " genommen" + (C.moved.length ? ", aufs Tablett: " + listText(C.moved.map(dieText)) : "") + ".");
  }

  // Sonderfall: Der aktive Spieler nimmt keinen Würfel, sein Wurf verfällt
  function cForfeit() {
    if (busy || C.phase !== "pick") return;
    C.undo = snapC();
    C.slot[C.throws - 1] = -2;
    C.moved = [];
    C.silver = false;
    afterChoice();
    say("Wurf verfällt.");
  }

  function afterChoice() {
    if (C.throws >= 3) {
      cupIdx().forEach(function (j) { C.loc[j] = "tray"; C.moved.push(j); });
      C.phase = "passive";
    } else {
      cupIdx().forEach(function (j) { C.val[j] = 0; });
      C.phase = "roll";
    }
    commit();
    renderC();
  }

  function cEndTurn() {
    if (busy || C.phase !== "roll") return;
    C.undo = snapC();
    cupIdx().forEach(function (j) { C.loc[j] = "tray"; });
    C.phase = "passive";
    commit();
    renderC();
  }

  function cCupTap(i) {
    if (busy) return;
    if (C.phase === "pick") { cPick(i); return; }
    // Zurückgeholten Würfel wieder aufs Tablett legen (Rückhol-Aktion zurücknehmen)
    if (C.phase === "roll" && C.loc[i] === "cup" && C.ret.indexOf(i) !== -1) {
      C.loc[i] = "tray";
      C.ret.splice(C.ret.indexOf(i), 1);
      commit();
      renderC();
    }
  }

  function cTrayTap(i) {
    if (busy || C.loc[i] !== "tray") return;
    if (C.phase === "passive") {
      C.taken[i] = !C.taken[i];
      commit();
      renderC();
      say(CC[i].name + (C.taken[i] ? " genommen." : " wieder frei."));
      return;
    }
    // Rückhol-Aktion: nur der aktive Spieler, nur vor dem nächsten Wurf
    if (C.phase === "roll" && !C.soloPassive && C.throws > 0) {
      C.loc[i] = "cup";
      C.val[i] = 0;
      C.ret.push(i);
      var m = C.moved.indexOf(i);
      if (m !== -1) C.moved.splice(m, 1);
      commit();
      renderC();
      say(CC[i].name + " zurückgeholt.");
    }
  }

  function cSlotTap(k) {
    var i = C.slot[k];
    if (busy || C.phase !== "passive" || i < 0) return;
    C.taken[i] = !C.taken[i];
    commit();
    renderC();
  }

  function cUndo() {
    if (busy || !C.undo) return;
    var u = C.undo;
    u.undo = null;
    C = u;
    commit();
    renderC();
    say("Rückgängig gemacht.");
  }

  function cNext() {
    if (busy || C.phase !== "passive") return;
    var rounds = roundsFor(C.players);
    if (C.players === 1 && !C.soloPassive) { cSoloPassive(); return; }
    var a = C.active + 1, r = C.round;
    if (C.players === 1 || a >= C.players) { a = 0; r++; }
    C.undo = null;
    if (r > rounds) {
      C.phase = "over";
      commit();
      renderC();
      say("Spielende.");
      return;
    }
    C.round = r;
    C.active = a;
    C.soloPassive = false;
    resetTurn();
    commit();
    renderC();
    say("Runde " + r + ". " + playerName(a) + " würfelt.");
  }

  // Solo: Als passiver Spieler alle 6 würfeln, die 3 niedrigsten kommen aufs Tablett
  function cSoloPassive() {
    resetTurn();
    C.soloPassive = true;
    C.undo = null;
    var idx = [0, 1, 2, 3, 4, 5];
    idx.forEach(function (i) { C.val[i] = rollD6(); });
    var order = idx.map(function (i) { return { i: i, v: C.val[i], r: Math.random() }; })
      .sort(function (a, b) { return a.v - b.v || a.r - b.r; });
    order.forEach(function (o, n) { C.loc[o.i] = n < 3 ? "tray" : "out"; });
    C.moved = order.slice(0, 3).map(function (o) { return o.i; });
    C.phase = "passive";
    commit({ mode: "clever", idx: idx });
    playRoll("clever", idx);
  }

  function nextLabel() {
    var rounds = roundsFor(C.players);
    if (C.players === 1) {
      if (!C.soloPassive) return "Passiver Zug";
      return C.round >= rounds ? "Spiel beenden" : "Runde " + (C.round + 1);
    }
    if (C.active + 1 < C.players) return "Weiter: " + playerName(C.active + 1);
    return C.round >= rounds ? "Spiel beenden" : "Runde " + (C.round + 1);
  }

  var cMainAction = cRoll, cAltAction = cUndo;
  cMain.addEventListener("click", function () { cMainAction(); });
  cAlt.addEventListener("click", function () { cAltAction(); });
  cSkip.addEventListener("click", cForfeit);

  function renderC() {
    var rounds = roundsFor(C.players);
    var activeTurn = !C.soloPassive && (C.phase === "roll" || C.phase === "pick");
    var left = activeTurn ? 3 - C.throws : 0;
    cLeft.textContent = left;
    cBoxes.forEach(function (bx, n) { bx.classList.toggle("on", n < left); });
    cWhoLabel.textContent = C.phase === "over" ? "Spiel beendet"
      : "Runde " + Math.min(C.round, rounds) + " / " + rounds + (C.soloPassive ? " · passiv" : " · am Zug");
    cName.textContent = playerName(C.active);
    cWho.setAttribute("aria-label", cWhoLabel.textContent + ": " + playerName(C.active) + ". Spieler ändern.");

    if (busy) {
      cMain.disabled = true; cAlt.disabled = true; cSkip.disabled = true;
      cBtns.forEach(function (bt) { bt.disabled = true; });
      cTItems.forEach(function (bt) { bt.disabled = true; });
      cSlots.forEach(function (bt) { bt.disabled = true; });
      return;
    }
    cSkip.disabled = false;

    var cup = cupIdx(), tray = trayIdx();

    // Becher: feste Plätze, damit die Farben nicht springen
    for (var i = 0; i < 6; i++) {
      var loc = C.loc[i], bt = cBtns[i];
      var present = loc === "cup" || loc === "out";
      bt.classList.toggle("gone", !present);
      bt.classList.toggle("out", loc === "out");
      showFace(cDice[i], present ? C.val[i] : 0);
      var where = loc === "slot" ? "Feld " + (C.slot.indexOf(i) + 1)
        : loc === "tray" ? "Tablett"
        : loc === "out" ? "gesperrt"
        : C.ret.indexOf(i) !== -1 ? "zurück" : "";
      cNames[i].textContent = CC[i].name + (where ? " · " + where : "");
      var canPick = C.phase === "pick" && loc === "cup";
      var canUnreturn = C.phase === "roll" && loc === "cup" && C.ret.indexOf(i) !== -1;
      bt.disabled = !(canPick || canUnreturn);
      bt.setAttribute("aria-label", CC[i].name + ": " +
        (loc === "cup" ? (C.val[i] ? NAMES[C.val[i]] + (canPick ? ". Antippen zum Nehmen" : "") : "im Becher") : where) + ".");
    }

    // Würfelfelder
    for (var k = 0; k < 3; k++) {
      var di = C.slot[k], s = cSlots[k], sd = cSlotDice[k];
      s.classList.toggle("empty", di === -1);
      s.classList.toggle("void", di === -2);
      s.classList.toggle("taken", di >= 0 && C.taken[di]);
      sd.hidden = di < 0;
      if (di >= 0) {
        sd.className = "die mini c-" + CC[di].key;
        showFace(sd, C.val[di]);
      }
      s.disabled = !(C.phase === "passive" && di >= 0);
      s.setAttribute("aria-label", "Würfelfeld " + (k + 1) + ": " +
        (di >= 0 ? dieText(di) + (C.taken[di] ? ", genommen" : "") : di === -2 ? "verfallen" : "leer"));
    }

    // Silbertablett
    var canReturn = C.phase === "roll" && !C.soloPassive && C.throws > 0;
    for (var j = 0; j < 6; j++) {
      var on = C.loc[j] === "tray", it = cTItems[j];
      it.hidden = !on;
      if (!on) continue;
      showFace(cTDice[j], C.val[j]);
      cTTags[j].textContent = C.moved.indexOf(j) !== -1 && C.phase !== "over" ? "neu" : "";
      it.classList.toggle("taken", C.taken[j]);
      it.disabled = !(C.phase === "passive" || canReturn);
      it.setAttribute("aria-label", dieText(j) + " auf dem Silbertablett" + (C.taken[j] ? ", genommen" : "") +
        (C.phase === "passive" ? ". Antippen zum Markieren." : canReturn ? ". Antippen zum Zurückholen." : "."));
    }
    cTrayEmpty.hidden = tray.length > 0;

    // Blau + Weiß zählt immer zusammen, egal wo die beiden gerade liegen
    cBW.textContent = C.val[BLUE] && C.val[WHITE] ? C.val[BLUE] + C.val[WHITE] : "–";

    // Hinweisbalken
    var msg = "";
    if (C.phase === "over") {
      msg = "Spielende! Zählt jetzt eure Blätter zusammen. Jeder Fuchs zählt so viel wie euer schwächster Farbbereich.";
    } else if (C.phase === "roll" && C.throws === 0 && C.active === 0 && !C.ret.length) {
      msg = "Runde " + C.round + ": Alle streichen die " + C.round + " ab" +
        (ROUND_GIFT[C.round] ? " und bekommen " + ROUND_GIFT[C.round] + "." : ".");
    } else if (C.phase === "passive") {
      msg = C.soloPassive ? "Passiver Zug: Die drei niedrigsten Würfel liegen auf dem Silbertablett. Nimm dir einen davon."
        : tray.length ? "Alle anderen nehmen sich jetzt je einen Würfel vom Silbertablett."
        : "Das Silbertablett ist leer: Alle anderen dürfen sich einen Würfel aus den Würfelfeldern nehmen.";
    }
    cBanner.textContent = msg;
    cBanner.hidden = !msg;

    // Hinweistext
    var hint = "";
    if (C.silver && C.moved.length && C.phase !== "pick") {
      hint = "Silber genommen: " + listText(C.moved.map(dieText)) + " darfst du zusätzlich im silbernen Bereich ankreuzen. ";
    }
    if (C.phase === "roll") {
      if (cup.length) {
        hint += (C.throws === 0 ? "Würfle alle sechs Würfel." : "Würfle die übrigen " + cup.length + " Würfel.") +
          (canReturn && tray.length ? " Rückhol-Aktion: Würfel auf dem Tablett antippen." : "");
      } else {
        hint += "Keine Würfel mehr im Becher. Mit einer Rückhol-Aktion holst du einen vom Tablett zurück, sonst beende deinen Zug.";
      }
    } else if (C.phase === "pick") {
      hint = "Tippe den Würfel an, den du nimmst. Alle niedrigeren wandern aufs Silbertablett.";
    } else if (C.phase === "passive") {
      hint += "Tippe einen Würfel an, um ihn als genommen zu markieren. Zusatzwürfel-Aktionen dürfen jeden der sechs Würfel nehmen.";
    }
    cHint.textContent = hint;
    cSkip.hidden = C.phase !== "pick";

    // Daumenleiste
    if (C.phase === "pick" && !C.soloPassive) {
      cAlt.textContent = "Nachwürfeln";
      cAlt.disabled = false;
      cAltAction = cReroll;
    } else {
      cAlt.textContent = "Rückgängig";
      cAlt.disabled = !C.undo;
      cAltAction = cUndo;
    }
    cMain.disabled = false;
    if (C.phase === "roll") {
      if (cup.length) {
        cMain.textContent = C.throws === 0 ? "Würfeln" : (C.throws + 1) + ". Wurf";
        cMainAction = cRoll;
      } else {
        cMain.textContent = "Zug beenden";
        cMainAction = cEndTurn;
      }
    } else if (C.phase === "pick") {
      cMain.textContent = "Würfel wählen";
      cMain.disabled = true;
      cMainAction = function () {};
    } else if (C.phase === "passive") {
      cMain.textContent = nextLabel();
      cMainAction = cNext;
    } else {
      cMain.textContent = "Neues Spiel";
      cMainAction = function () { openSetup(); };
    }
  }

  /* ---------- Clever: Spieler-Dialog ---------- */
  var csCount = document.getElementById("cs-count");
  var csRounds = document.getElementById("cs-rounds");
  var csNames = [0, 1, 2, 3].map(function (n) { return document.getElementById("cs-n" + n); });
  var csN = 2;
  function csRender() {
    Array.prototype.forEach.call(csCount.children, function (bt) {
      bt.setAttribute("aria-checked", Number(bt.dataset.n) === csN ? "true" : "false");
    });
    csNames.forEach(function (inp, n) { inp.hidden = n >= csN; });
    csRounds.textContent = roundsFor(csN) + " Runden" + (csN === 1 ? " · Solo mit passivem Zug" : "");
  }
  csCount.addEventListener("click", function (e) {
    var bt = e.target.closest("button[data-n]");
    if (!bt) return;
    csN = Number(bt.dataset.n);
    csRender();
  });
  function csReadNames() {
    return csNames.map(function (inp, n) { return inp.value.trim().slice(0, 16) || "Spieler " + (n + 1); });
  }
  function openSetup() {
    csN = C.players;
    csNames.forEach(function (inp, n) {
      inp.value = /^Spieler \d$/.test(C.names[n]) ? "" : C.names[n];
      inp.placeholder = "Spieler " + (n + 1);
    });
    csRender();
    UI.sheet("c-setup").open();
  }
  document.getElementById("cs-new").addEventListener("click", function () {
    if (busy) return;
    C = newClever(csN, csReadNames());
    commit();
    renderC();
    UI.sheet("c-setup").close();
    say("Neues Spiel. " + playerName(0) + " beginnt.");
  });
  document.getElementById("cs-save").addEventListener("click", function () {
    if (busy) return;
    C.names = csReadNames();
    // Spielerzahl nur ganz am Anfang änderbar, sonst passen Runden und Reihenfolge nicht mehr
    if (C.round === 1 && C.active === 0 && C.throws === 0 && C.phase === "roll") C.players = csN;
    commit();
    renderC();
    UI.sheet("c-setup").close();
  });
  cWho.addEventListener("click", openSetup);

  /* ---------- Würfeln abspielen (eigene Würfe und Würfe vom anderen Handy) ---------- */
  function diceFor(m) { return m === "kniffel" ? kDice : m === "quixx" ? qDiceList() : cDice; }
  function valuesFor(m) { return m === "kniffel" ? K.vals : m === "quixx" ? qValues() : C.val; }

  function playRoll(m, idx) {
    var els = diceFor(m), vals = valuesFor(m);
    var dice = idx.map(function (i) { return els[i]; });
    var finals = idx.map(function (i) { return vals[i]; });
    // Clever: Platzhalter der Würfel, die jetzt rollen, wieder als Würfel zeigen
    if (m === "clever") idx.forEach(function (i) { cBtns[i].classList.remove("gone", "out"); });
    busy = true;
    renderAll();
    tumble(dice, finals, function () {
      busy = false;
      announceRoll(m);
      if (pending) { var p = pending; pending = null; applyState(p, true); }
      else renderAll();
    });
  }

  function announceRoll(m) {
    if (m === "kniffel") say("Gewürfelt: " + K.vals.join(", ") + ". Noch " + K.left + " Würfe.");
    else if (m === "quixx") say("Weiß " + Q.w[0] + " und " + Q.w[1] + ", Summe " + (Q.w[0] + Q.w[1]) + ".");
    else say("Gewürfelt: " + cupIdx().concat(trayIdx()).map(dieText).join(", ") + ".");
  }

  function renderAll() { renderK(); renderQ(); renderC(); }

  /* ---------- Moduswechsel ---------- */
  // Das gewählte Spiel gehört zum gemeinsamen Stand, die Ansicht (Würfeln oder Block) bleibt pro Gerät.
  // Diese Seite kennt nur das Silbertablett: Jeder Stand wird auf „clever“ gestellt
  function showMode() {
    mode = "clever";
    UI.Shell.show();
  }
  UI.Shell.viewSeg = UI.Segmented(document.getElementById("view-seg"), function (i) {
    UI.Shell.setView(i === 1 ? "block" : "dice");
  });

  /* ---------- Speichern, Senden, Empfangen ---------- */
  var STORE = "silbertablett-v1";

  function state() { return { mode: mode, K: K, Q: Q, C: C, roll: lastRoll }; }
  function envelope() { return { v: 2, rev: SYNC.rev, cid: SYNC.cid, s: state() }; }

  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify({ rev: SYNC.rev, s: state() })); } catch (e) {}
  }

  function commit(roll) {
    if (roll) lastRoll = { id: SYNC.cid + "-" + (++rollCount), mode: roll.mode, idx: roll.idx.slice() };
    SYNC.rev++;
    persist();
    Room.send(envelope());
  }

  // Übernimmt einen geprüften Stand. Mit animate wird ein neuer Wurf vom anderen Handy abgespielt.
  function applyState(s, animate) {
    var rolled = animate && s.roll.id && s.roll.id !== lastRoll.id && s.roll.idx.length;
    K = s.K; Q = s.Q; C = s.C; lastRoll = s.roll;
    showMode(s.mode);
    persist();
    if (rolled) playRoll(s.roll.mode, s.roll.idx);
    else renderAll();
  }

  Room.onEnvelope = function (env) {
    if (!env || env.v !== 2 || typeof env.cid !== "string" || env.cid === SYNC.cid || !okRev(env.rev)) return;
    // Neuere Revision gewinnt; bei Gleichstand entscheidet die Geräte-ID, damit alle gleich enden
    if (!(env.rev > SYNC.rev || (env.rev === SYNC.rev && env.cid > SYNC.cid))) return;
    var s = sanitize(env.s);
    if (!s) return;
    SYNC.rev = env.rev;
    Room.remember(env);
    if (busy) { pending = s; return; }
    applyState(s, true);
  };

  /* Alles, was aus dem Raum kommt, ist fremde Eingabe: Typen und Bereiche hart prüfen. */
  function int(x, lo, hi) { return typeof x === "number" && x % 1 === 0 && x >= lo && x <= hi ? x : null; }
  function ints(a, n, lo, hi) {
    if (!Array.isArray(a) || (n !== null && a.length !== n) || a.length > 6) return null;
    var out = [];
    for (var i = 0; i < a.length; i++) { var v = int(a[i], lo, hi); if (v === null) return null; out.push(v); }
    return out;
  }
  function bools(a, n) {
    if (!Array.isArray(a) || a.length !== n) return null;
    return a.map(function (x) { return x === true; });
  }
  function sanitizeK(k) {
    if (!k || typeof k !== "object") return null;
    var vals = ints(k.vals, 5, 0, 6), held = bools(k.held, 5), left = int(k.left, 0, 3), turn = int(k.turn, 1, 13);
    if (!vals || !held || left === null || turn === null) return null;
    return { vals: vals, held: held, left: left, turn: turn };
  }
  function sanitizeQ(q) {
    if (!q || typeof q !== "object" || !q.c || typeof q.c !== "object") return null;
    var w = ints(q.w, 2, 0, 6), c = {}, locked = {};
    if (!w) return null;
    for (var n = 0; n < COLORS.length; n++) {
      var key = COLORS[n].key, v = int(q.c[key], 0, 6);
      if (v === null) return null;
      c[key] = v;
      locked[key] = !!(q.locked && q.locked[key] === true);
    }
    return { w: w, c: c, locked: locked };
  }
  var LOCS = ["cup", "slot", "tray", "out"], PHASES = ["roll", "pick", "passive", "over"];
  function sanitizeC(c, nested) {
    if (!c || typeof c !== "object") return null;
    var players = int(c.players, 1, 4), round = int(c.round, 1, 7), active = int(c.active, 0, 3);
    var val = ints(c.val, 6, 0, 6), slot = ints(c.slot, 3, -2, 5), throws = int(c.throws, 0, 3);
    var moved = ints(c.moved, null, 0, 5), ret = ints(c.ret, null, 0, 5), taken = bools(c.taken, 6);
    if (players === null || round === null || active === null || active >= players || !val || !slot ||
        throws === null || !moved || !ret || !taken) return null;
    if (!Array.isArray(c.loc) || c.loc.length !== 6 || !c.loc.every(function (l) { return LOCS.indexOf(l) !== -1; })) return null;
    if (PHASES.indexOf(c.phase) === -1 || !Array.isArray(c.names) || c.names.length !== 4) return null;
    var names = c.names.map(function (x, n) { return typeof x === "string" && x.trim() ? x.trim().slice(0, 16) : "Spieler " + (n + 1); });
    var undo = null;
    if (!nested && c.undo) { undo = sanitizeC(c.undo, true); if (!undo) return null; }
    return {
      players: players, names: names, round: round, active: active, soloPassive: c.soloPassive === true,
      val: val, loc: c.loc.slice(), slot: slot, throws: throws, phase: c.phase,
      moved: moved, taken: taken, ret: ret, silver: c.silver === true, undo: undo
    };
  }
  function sanitize(s) {
    if (!s || typeof s !== "object" || MODES.indexOf(s.mode) === -1) return null;
    var k = sanitizeK(s.K), q = sanitizeQ(s.Q), c = sanitizeC(s.C, false);
    var r = s.roll;
    if (!k || !q || !c || !r || typeof r !== "object") return null;
    var idx = ints(r.idx, null, 0, 5);
    if (!idx || typeof r.id !== "string" || r.id.length > 40 || MODES.indexOf(r.mode) === -1) return null;
    return { mode: s.mode, K: k, Q: q, C: c, roll: { id: r.id, mode: r.mode, idx: idx } };
  }

  /* ---------- Raum-Dialog ---------- */
  var roomBtn = document.getElementById("room-btn");
  var roomLabel = document.getElementById("room-label");
  var roomOff = document.getElementById("room-off");
  var roomOn = document.getElementById("room-on");
  var roomCodeIn = document.getElementById("room-code");
  var roomCodeBig = document.getElementById("room-code-big");
  var roomConn = document.getElementById("room-conn");
  var roomConnText = document.getElementById("room-conn-text");
  var roomShare = document.getElementById("room-share");
  var roomShareHint = document.getElementById("room-share-hint");
  var ROOM_KEY = "silbertablett-raum";
  var CODE_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne I, O, 0, 1: nichts zum Verwechseln

  function newCode() {
    var b = new Uint8Array(5), out = "";
    crypto.getRandomValues(b);
    for (var i = 0; i < 5; i++) out += CODE_ABC[b[i] % CODE_ABC.length];
    return out;
  }
  function normCode(s) {
    var c = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return c.length >= 4 && c.length <= 8 ? c : null;
  }
  function roomLink(code) {
    if (!/^https?:$/.test(location.protocol)) return null;
    return location.origin + location.pathname + "?raum=" + code;
  }
  function saveRoom(code) {
    try { if (code) localStorage.setItem(ROOM_KEY, code); else localStorage.removeItem(ROOM_KEY); } catch (e) {}
  }

  // adopt: Wer einem bestehenden Raum beitritt, übernimmt dessen Spielstand statt ihn zu überschreiben.
  function joinRoom(code, adopt) {
    code = normCode(code);
    if (!code) return false;
    if (adopt) SYNC.rev = 0;
    Room.join(code, SYNC.cid);
    Room.remember(envelope());
    saveRoom(code);
    return true;
  }


  function renderRoom(st) {
    st = st || Room.status();
    roomBtn.dataset.state = st.state;
    roomConn.dataset.state = st.state;
    roomLabel.textContent = st.state === "off" ? "Zusammen"
      : st.room + (st.state === "up" ? " · " + (st.peers + 1) : st.state === "down" ? " · offline" : " · …");
    roomBtn.setAttribute("aria-label", st.state === "off" ? "Zusammen spielen"
      : "Raum " + st.room + ", " + (st.state === "up" ? (st.peers + 1) + " Geräte" : "nicht verbunden"));
    roomOff.hidden = st.state !== "off";
    roomOn.hidden = st.state === "off";
    roomCodeBig.textContent = st.room || "–";
    roomConnText.textContent = st.state === "up"
      ? (st.peers ? "Verbunden mit " + st.peers + (st.peers === 1 ? " weiteren Gerät" : " weiteren Geräten") : "Verbunden, warte auf Mitspieler …")
      : st.state === "down" ? "Keine Verbindung, versuche es erneut …" : "Verbinde …";
    var link = st.room ? roomLink(st.room) : null;
    roomShare.textContent = link ? "Link teilen" : "Code kopieren";
    roomShareHint.textContent = link
      ? "Schick den Link an deine Mitspieler. Wer ihn öffnet, ist sofort im Raum."
      : "Deine Mitspieler öffnen das Silbertablett, tippen auf „Zusammen“ und geben den Code ein.";
  }
  Room.onStatus = renderRoom;

  roomBtn.addEventListener("click", function () { renderRoom(); UI.sheet("room-dlg").open(); });
  document.getElementById("room-create").addEventListener("click", function () {
    joinRoom(newCode(), false);
    renderRoom();
  });
  function joinFromInput() {
    if (!joinRoom(roomCodeIn.value, true)) { roomCodeIn.focus(); return; }
    roomCodeIn.value = "";
    renderRoom();
  }
  document.getElementById("room-join").addEventListener("click", joinFromInput);
  roomCodeIn.addEventListener("keydown", function (e) { if (e.key === "Enter") joinFromInput(); });
  document.getElementById("room-leave").addEventListener("click", function () {
    Room.leave();
    saveRoom(null);
    renderRoom();
  });
  roomShare.addEventListener("click", function () {
    var st = Room.status();
    if (!st.room) return;
    var link = roomLink(st.room);
    function copied(ok) {
      roomShare.textContent = ok ? "Kopiert" : st.room;
      setTimeout(function () { renderRoom(); }, 1600);
    }
    if (link && navigator.share) {
      navigator.share({ title: "Silbertablett", text: "Würfel mit mir! Raumcode " + st.room, url: link }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(link || st.room).then(function () { copied(true); }, function () { copied(false); });
    } else {
      copied(false);
    }
  });

  /* ---------- Start ---------- */
  (function restore() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    var s = saved && sanitize(saved.s);
    if (s) {
      K = s.K; Q = s.Q; C = s.C; lastRoll = s.roll;
      SYNC.rev = typeof saved.rev === "number" && saved.rev >= 0 ? Math.floor(saved.rev) : 0;
      showMode(s.mode);
      return;
    }
    showMode();
  })();
  renderAll();
  renderRoom();

  (function autoJoin() {
    var fromLink = null;
    try { fromLink = new URLSearchParams(location.search).get("raum"); } catch (e) {}
    if (fromLink) {
      try { history.replaceState(null, "", location.pathname); } catch (e) {}
      if (joinRoom(fromLink, true)) { renderRoom(); UI.sheet("room-dlg").open(); }
      return;
    }
    var last = null;
    try { last = localStorage.getItem(ROOM_KEY); } catch (e) {}
    if (last) joinRoom(last, false);
  })();

  // Für Blöcke und Updates: lesender Zugriff auf den Würfelstand
  window.Wuerfel = {
    isBusy: function () { return busy; },
    kniffel: function () { return { vals: K.vals.slice(), left: K.left }; },
    cleverNames: function () { return C.names.slice(0, C.players); }
  };
})();
