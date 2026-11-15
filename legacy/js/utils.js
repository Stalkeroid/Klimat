// Допоміжне: кольори за температурою, форматування, геометрія кільця.
var STOPS = [[0, [47, 111, 224]], [15, [88, 180, 217]], [22, [233, 213, 138]], [32, [245, 158, 75]], [60, [232, 85, 63]]];
function tempColor(t, a) {
  if (!isFinite(t)) return a == null ? '#5A6475' : 'rgba(90,100,117,' + a + ')';
  var c = STOPS[0][1];
  if (t >= STOPS[STOPS.length - 1][0]) c = STOPS[STOPS.length - 1][1];
  else for (var i = 0; i < STOPS.length - 1; i++) {
    if (t >= STOPS[i][0] && t < STOPS[i + 1][0]) {
      var u = (t - STOPS[i][0]) / (STOPS[i + 1][0] - STOPS[i][0]);
      c = [0, 1, 2].map(function (j) { return Math.round(STOPS[i][1][j] + (STOPS[i + 1][1][j] - STOPS[i][1][j]) * u); });
      break;
    }
  }
  return a == null ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + a + ')';
}
function fmt(t) { return isFinite(t) ? t.toFixed(1).replace('.', ',') + '°' : '—'; }
function hh(h) { return (h < 10 ? '0' : '') + h + ':00'; }
function hm(ts) { var d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function rad(t) { var n = Math.max(0, Math.min(1, (t - 0) / 60)); return 80 + n * 62; }
function pol(r, deg) { var a = deg * Math.PI / 180; return [Math.round(r * Math.cos(a) * 100) / 100, Math.round(r * Math.sin(a) * 100) / 100]; }
function wedge(r0, r1, a0, a1) {
  var p1 = pol(r0, a0), p2 = pol(r1, a0), p3 = pol(r1, a1), p4 = pol(r0, a1);
  return 'M' + p1 + 'L' + p2 + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + p3 + 'L' + p4 + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + p1 + 'Z';
}
function finite(arr) { return arr.filter(function (x) { return isFinite(x); }); }

// Вологість: шкала 0–100 %, від сухого (бурштиновий) до вологого (синій)
var HSTOPS = [[0, [233, 180, 90]], [30, [233, 213, 138]], [45, [124, 196, 228]], [70, [88, 140, 230]], [100, [70, 90, 210]]];
function humColor(h, a) {
  if (!isFinite(h)) return a == null ? '#5A6475' : 'rgba(90,100,117,' + a + ')';
  var c = HSTOPS[HSTOPS.length - 1][1];
  for (var i = 0; i < HSTOPS.length - 1; i++) {
    if (h >= HSTOPS[i][0] && h < HSTOPS[i + 1][0]) {
      var u2 = (h - HSTOPS[i][0]) / (HSTOPS[i + 1][0] - HSTOPS[i][0]);
      c = [0, 1, 2].map(function (j) { return Math.round(HSTOPS[i][1][j] + (HSTOPS[i + 1][1][j] - HSTOPS[i][1][j]) * u2); });
      break;
    }
  }
  if (h < 0) c = HSTOPS[0][1];
  return a == null ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + a + ')';
}
function fmtH(h) { return isFinite(h) ? h.toFixed(1).replace('.', ',') + '%' : '—'; }
function radH(h) { var n = Math.max(0, Math.min(1, h / 100)); return 80 + n * 62; }
