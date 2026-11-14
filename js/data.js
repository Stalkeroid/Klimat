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
  document.getElementById('keyInput').value = getKey();
  document.getElementById('setup').hidden = false;
}


// Читає канал за останні ~25 годин. Повертає { raw, hum, lastTs } або null, якщо ключ невірний.
// raw[i] — відсортований масив { ts, t } для датчика i, hum[i] — остання вологість.
async function fetchFeeds(key) {
  var url = 'https://api.thingspeak.com/channels/' + CHANNEL_ID + '/feeds.json?api_key=' + encodeURIComponent(key) + '&minutes=1500&results=8000';
  var r = await fetch(url, { cache: 'no-store' });
  var j = r.ok ? await r.json() : null;
  if (!j || !j.feeds) return null;
  var raw = SENSORS.map(function () { return []; }), hum = SENSORS.map(function () { return NaN; }), lastTs = null;
  j.feeds.forEach(function (fd) {
    var ts = Date.parse(fd.created_at);
    if (!isFinite(ts)) return;
    SENSORS.forEach(function (s, i) {
      var t = parseFloat(fd[s.fT]), h = parseFloat(fd[s.fH]);
      if (isFinite(t)) raw[i].push({ ts: ts, t: t });
      if (isFinite(h)) hum[i] = h;
    });
    if (lastTs == null || ts > lastTs) lastTs = ts;
  });
  raw.forEach(function (a) { a.sort(function (x, y) { return x.ts - y.ts; }); });
  return { raw: raw, hum: hum, lastTs: lastTs };
}

// Останній (поточний) показник датчика, округлений до 0,1; NaN, якщо даних немає
function latestOf(arr) { return arr.length ? Math.round(arr[arr.length - 1].t * 10) / 10 : NaN; }
