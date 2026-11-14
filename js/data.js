// Дані: завантаження з ThingSpeak, погодинна агрегація, ключ доступу (localStorage).
function buildReal(raw, now) {
  var hs = new Date(now); hs.setMinutes(0, 0, 0);
  var h0 = hs.getTime();
  return raw.map(function (arr) {
    var pts = [];
    for (var k = 0; k < 24; k++) {
      var st = h0 - (23 - k) * 3600000, en = st + 3600000, sum = 0, c = 0;
      for (var q = 0; q < arr.length; q++) { var p = arr[q]; if (p.ts >= st && p.ts < en) { sum += p.t; c++; } }
      pts.push({ hd: new Date(st).getHours(), start: st, t: c ? Math.round(sum / c * 10) / 10 : NaN, filled: !c });
    }
    var v = NaN;
    for (var a = 0; a < 24; a++) { if (isFinite(pts[a].t)) v = pts[a].t; else pts[a].t = v; }
    v = NaN;
    for (var b = 23; b >= 0; b--) { if (isFinite(pts[b].t)) v = pts[b].t; else pts[b].t = v; }
    return pts;
  });
}

function getKey() {
  if (READ_KEY) return READ_KEY;
  try { return localStorage.getItem('ts_read_key') || ''; } catch (e) { return ''; }
}
function showSetup(msg) {
  document.getElementById('setupErr').textContent = msg || '';
  document.getElementById('setupChannel').textContent = CHANNEL_ID;
  document.getElementById('keyInput').value = getKey();
  document.getElementById('setupCancel').hidden = !getKey() || !!msg;   // «Скасувати» — лише коли ключ уже робочий
  document.getElementById('setup').hidden = false;
  setTimeout(function () { var i = document.getElementById('keyInput'); i.focus(); i.select(); }, 0);
}
function hideSetup() { document.getElementById('setup').hidden = true; }


// Читає канал за останні ~25 годин. Повертає { raw, hum, lastTs } або null, якщо ключ невірний.
// raw[i] / rawH[i] — відсортовані масиви { ts, t } температури / вологості датчика i, hum[i] — остання вологість.
async function fetchFeeds(key) {
  if (/^0+$/.test(key)) return demoFeeds();
  var url = 'https://api.thingspeak.com/channels/' + CHANNEL_ID + '/feeds.json?api_key=' + encodeURIComponent(key) + '&minutes=1500&results=8000';
  var r = await fetch(url, { cache: 'no-store' });
  var j = r.ok ? await r.json() : null;
  if (!j || !j.feeds) return null;
  var raw = SENSORS.map(function () { return []; }), rawH = SENSORS.map(function () { return []; }), hum = SENSORS.map(function () { return NaN; }), lastTs = null;
  j.feeds.forEach(function (fd) {
    var ts = Date.parse(fd.created_at);
    if (!isFinite(ts)) return;
    SENSORS.forEach(function (s, i) {
      var t = parseFloat(fd[s.fT]), h = parseFloat(fd[s.fH]);
      if (isFinite(t)) raw[i].push({ ts: ts, t: t });
      if (isFinite(h)) { hum[i] = h; rawH[i].push({ ts: ts, t: h }); }
    });
    if (lastTs == null || ts > lastTs) lastTs = ts;
  });
  raw.concat(rawH).forEach(function (a) { a.sort(function (x, y) { return x.ts - y.ts; }); });
  hum = rawH.map(latestOf);
  return { raw: raw, rawH: rawH, hum: hum, lastTs: lastTs };
}

// Останній (поточний) показник датчика, округлений до 0,1; NaN, якщо даних немає
function latestOf(arr) { return arr.length ? Math.round(arr[arr.length - 1].t * 10) / 10 : NaN; }

// ---------------- Демо-режим ----------------
// Ключ з одних нулів = випадкові дані без ThingSpeak; датчики без справжніх назв.
var DEMO_KEY = '0000000000000000';
function isDemo() { var k = getKey(); return !!k && /^0+$/.test(k); }
function sensorName(i) { return isDemo() ? 'Датчик ' + (i + 1) : SENSORS[i].name; }

var demoCache = null;
function demoFeeds() {
  var STEP = 5 * 60000, now = Date.now(), end = now - now % STEP;
  if (!demoCache) {
    // кожен датчик — своя «погода»: базова температура, добова амплітуда, шум; вологість — навпаки до температури
    demoCache = { params: SENSORS.map(function () {
      return { base: 17 + Math.random() * 12, amp: 0.6 + Math.random() * 2.2, peak: Math.random() * 24,
               hBase: 32 + Math.random() * 28, noise: 0.15 + Math.random() * 0.25 };
    }), raw: SENSORS.map(function () { return []; }), rawH: SENSORS.map(function () { return []; }), last: end - 25 * 3600000 };
  }
  for (var ts = demoCache.last + STEP; ts <= end; ts += STEP) {
    var hr = new Date(ts).getHours() + new Date(ts).getMinutes() / 60;
    demoCache.params.forEach(function (p, i) {
      var wave = Math.cos((hr - p.peak) / 24 * Math.PI * 2);
      var t = p.base + p.amp * wave + (Math.random() - 0.5) * p.noise * 2;
      var h = Math.max(5, Math.min(95, p.hBase - wave * p.amp * 2.5 + (Math.random() - 0.5) * 1.5));
      demoCache.raw[i].push({ ts: ts, t: Math.round(t * 100) / 100 });
      demoCache.rawH[i].push({ ts: ts, t: Math.round(h * 10) / 10 });
    });
  }
  demoCache.last = end;
  var cut = end - 25 * 3600000;
  function trim(arr) { return arr.map(function (a) { return a.filter(function (p) { return p.ts > cut; }); }); }
  var raw = trim(demoCache.raw), rawH = trim(demoCache.rawH);
  return { raw: raw, rawH: rawH, hum: rawH.map(latestOf), lastTs: end };
}
