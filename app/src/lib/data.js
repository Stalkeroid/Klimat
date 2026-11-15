import { CHANNEL_ID, READ_KEY, SENSORS } from './config.js';

// Дані: завантаження з ThingSpeak, погодинна агрегація, ключ доступу (localStorage).
export function buildReal(raw, now) {
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

// Погодинні середні за конкретну добу (години 00…23); порожні години дотягуються сусідніми значеннями,
// але позначаються filled — кільце малює їх сірими.
export function buildDay(raw, dayStart) {
  return raw.map(function (arr) {
    var pts = [];
    for (var k = 0; k < 24; k++) {
      var st = dayStart + k * 3600000, en = st + 3600000, sum = 0, c = 0;
      for (var q = 0; q < arr.length; q++) { var p = arr[q]; if (p.ts >= st && p.ts < en) { sum += p.t; c++; } }
      pts.push({ hd: k, start: st, t: c ? Math.round(sum / c * 10) / 10 : NaN, filled: !c });
    }
    var v = NaN;
    for (var a = 0; a < 24; a++) { if (isFinite(pts[a].t)) v = pts[a].t; else pts[a].t = v; }
    v = NaN;
    for (var b = 23; b >= 0; b--) { if (isFinite(pts[b].t)) v = pts[b].t; else pts[b].t = v; }
    return pts;
  });
}
// Середнє значення за весь масив (за добу)
export function meanOf(arr) { return arr.length ? Math.round(arr.reduce(function (s, p) { return s + p.t; }, 0) / arr.length * 10) / 10 : NaN; }
// Локальна північ дня, що містить ms
export function dayStartOf(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }

let memKey = '';   // якщо localStorage недоступний
export function getKey() {
  if (READ_KEY) return READ_KEY;
  try { return localStorage.getItem('ts_read_key') || memKey; } catch (e) { return memKey; }
}
export function saveKey(v) {
  try { localStorage.setItem('ts_read_key', v); } catch (e) { memKey = v; }
}


// Читає канал за останні ~25 годин. Повертає { raw, hum, lastTs } або null, якщо ключ невірний.
// raw[i] / rawH[i] — відсортовані масиви { ts, t } температури / вологості датчика i, hum[i] — остання вологість.
export async function fetchFeeds(key) {
  if (/^0+$/.test(key)) return demoFeeds();
  return fetchUrl(key, '&minutes=1500&results=8000');
}

// Архів: дані за одну добу (локальна північ dayStart … +24 год). Минулі дні не змінюються — кешуємо.
export let dayCache = {};
export async function fetchDay(key, dayStart) {
  if (/^0+$/.test(key)) return demoDay(dayStart);
  var id = key + '|' + dayStart;
  if (dayCache[id]) return dayCache[id];
  var res = await fetchUrl(key, '&start=' + encodeURIComponent(utcStr(dayStart)) + '&end=' + encodeURIComponent(utcStr(dayStart + 86400000 - 1000)) + '&results=8000');
  if (res && dayStart + 86400000 < Date.now()) dayCache[id] = res;
  return res;
}
export function utcStr(ms) {
  var d = new Date(ms), p = function (n) { return String(n).padStart(2, '0'); };
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds());
}

export let channelStart = null;   // дата створення каналу — раніше в історію не пускаємо
export async function fetchUrl(key, query) {
  var url = 'https://api.thingspeak.com/channels/' + CHANNEL_ID + '/feeds.json?api_key=' + encodeURIComponent(key) + query;
  var r = await fetch(url, { cache: 'no-store' });
  var j = r.ok ? await r.json() : null;
  if (!j || !j.feeds) return null;
  if (j.channel && j.channel.created_at) channelStart = Date.parse(j.channel.created_at);
  return parseFeeds(j.feeds);
}
export function parseFeeds(feeds) {
  var raw = SENSORS.map(function () { return []; }), rawH = SENSORS.map(function () { return []; }), lastTs = null;
  feeds.forEach(function (fd) {
    var ts = Date.parse(fd.created_at);
    if (!isFinite(ts)) return;
    SENSORS.forEach(function (s, i) {
      var t = parseFloat(fd[s.fT]), h = parseFloat(fd[s.fH]);
      if (isFinite(t)) raw[i].push({ ts: ts, t: t });
      if (isFinite(h)) rawH[i].push({ ts: ts, t: h });
    });
    if (lastTs == null || ts > lastTs) lastTs = ts;
  });
  raw.concat(rawH).forEach(function (a) { a.sort(function (x, y) { return x.ts - y.ts; }); });
  return { raw: raw, rawH: rawH, hum: rawH.map(latestOf), lastTs: lastTs };
}

// Останній (поточний) показник датчика, округлений до 0,1; NaN, якщо даних немає
export function latestOf(arr) { return arr.length ? Math.round(arr[arr.length - 1].t * 10) / 10 : NaN; }

// ---------------- Демо-режим ----------------
// Ключ з одних нулів = випадкові дані без ThingSpeak; датчики без справжніх назв.
export let DEMO_KEY = '0000000000000000';
export function isDemo() { var k = getKey(); return !!k && /^0+$/.test(k); }
export function sensorName(i) { return isDemo() ? 'Датчик ' + (i + 1) : SENSORS[i].name; }

export let demoCache = null;
export function demoParams() {
  if (!demoCache) demoFeeds();
  return demoCache.params;
}
export function demoFeeds() {
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

// Демо-архів: відтворювані дані на будь-який день (той самий день — ті самі дані)
export function demoDay(dayStart) {
  var params = demoParams(), STEP = 5 * 60000, end = Math.min(dayStart + 86400000 - STEP, Date.now());
  var raw = SENSORS.map(function () { return []; }), rawH = SENSORS.map(function () { return []; });
  params.forEach(function (p, i) {
    var seed = (Math.floor(dayStart / 86400000) * 7919 + i * 104729) >>> 0;
    var rnd = function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    var dayShift = (rnd() - 0.5) * 3;            // «погода» дня: тепліше/холодніше
    for (var ts = dayStart; ts <= end; ts += STEP) {
      var hr = (ts - dayStart) / 3600000;
      var wave = Math.cos((hr - p.peak) / 24 * Math.PI * 2);
      var t = p.base + dayShift + p.amp * wave + (rnd() - 0.5) * p.noise * 2;
      var h = Math.max(5, Math.min(95, p.hBase - dayShift * 2 - wave * p.amp * 2.5 + (rnd() - 0.5) * 1.5));
      raw[i].push({ ts: ts, t: Math.round(t * 100) / 100 });
      rawH[i].push({ ts: ts, t: Math.round(h * 10) / 10 });
    }
  });
  return { raw: raw, rawH: rawH, hum: rawH.map(latestOf), lastTs: end };
}
