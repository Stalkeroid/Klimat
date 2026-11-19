// Допоміжне: кольори за температурою, форматування, геометрія кільця.
export let STOPS = [[0, [45, 95, 235]], [12, [60, 150, 245]], [18.6, [172, 198, 242]], [21, [240, 224, 204]], [25.2, [252, 175, 85]], [32, [248, 118, 48]], [60, [228, 45, 55]]];  // «Лід і вогонь»: синій → крижаний → теплий білий → бурштин → помаранч → червоний (без зеленого)
export function tempColor(t, a) {
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
export function fmt(t) { return isFinite(t) ? t.toFixed(1).replace('.', ',') + '°' : '—'; }
export function hh(h) { return (h < 10 ? '0' : '') + h + ':00'; }
export function hm(ts) { var d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
export function rad(t) { var n = Math.max(0, Math.min(1, (t - 0) / 60)); return 80 + n * 62; }
export function pol(r, deg) { var a = deg * Math.PI / 180; return [Math.round(r * Math.cos(a) * 100) / 100, Math.round(r * Math.sin(a) * 100) / 100]; }
export function wedge(r0, r1, a0, a1) {
  var p1 = pol(r0, a0), p2 = pol(r1, a0), p3 = pol(r1, a1), p4 = pol(r0, a1);
  return 'M' + p1 + 'L' + p2 + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + p3 + 'L' + p4 + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + p1 + 'Z';
}
export function finite(arr) { return arr.filter(function (x) { return isFinite(x); }); }

// Вологість: 0–100 %, від сухого (бурштин) через теплий білий до вологого (синій → індиго)
export let HSTOPS = [[0, [245, 150, 60]], [30, [245, 205, 140]], [40, [232, 222, 208]], [50, [120, 175, 245]], [70, [60, 120, 240]], [100, [100, 80, 230]]];
export function humColor(h, a) {
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
export function fmtH(h) { return isFinite(h) ? h.toFixed(1).replace('.', ',') + '%' : '—'; }
export function radH(h) { var n = Math.max(0, Math.min(1, h / 100)); return 80 + n * 62; }

// підписи дат для «машини часу»
export const MONTHS = ['СІЧ', 'ЛЮТ', 'БЕР', 'КВІ', 'ТРА', 'ЧЕР', 'ЛИП', 'СЕР', 'ВЕР', 'ЖОВ', 'ЛИС', 'ГРУ'];
export const WEEKDAYS = ['НД', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
export function dayLabel(ms) { var d = new Date(ms); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
export function weekday(ms) { return WEEKDAYS[new Date(ms).getDay()]; }
