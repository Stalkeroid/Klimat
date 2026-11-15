// Події, які можна вивести з даних. Поки що одна: опалення (за датчиком з role: 'heater').
//
// Правило (лінійна регресія — нахил прямої методом найменших квадратів, °C/год):
//  • вікно — останні 30 хв (зазвичай 6 замірів, потрібно щонайменше 4);
//  • нахил ≥ +HEAT_SLOPE — опалення увімкнули, ≤ −HEAT_SLOPE — вимкнули; між ними стан не змінюється (гістерезис);
//  • додатково той самий знак тренду має бути вже на початку вікна (перша половина, ≥ 3 заміри, нахил ≥ половини порогу).
//    Тобто подія фіксується, коли зміна тягнеться через усе вікно — тоді її початок лежить у перших 10 хв вікна,
//    і час події = початок вікна + 5 хв (середина цих перших 10 хв).
// Шум датчика ±0,1° дає похибку нахилу ≈ 0,3 °C/год, тож поріг 3 °C/год — з великим запасом,
// а звичайні коливання кімнати (≈0,5 °C/год) його не досягають.

var HEAT_WINDOW = 30 * 60000;   // вікно регресії
var HEAT_SLOPE = 3;             // поріг нахилу, °C/год
var HEAT_LEVEL = 35;            // якщо змін не було: вище цієї температури вважаємо, що опалення працює

// нахил прямої за точками { ts, t }, °C/год; null, якщо точок замало
function slopePerHour(pts) {
  if (pts.length < 3) return null;
  var n = pts.length, mx = 0, my = 0;
  pts.forEach(function (p) { mx += p.ts; my += p.t; });
  mx /= n; my /= n;
  var sxy = 0, sxx = 0;
  pts.forEach(function (p) { var dx = p.ts - mx; sxy += dx * (p.t - my); sxx += dx * dx; });
  return sxx ? sxy / sxx * 3600000 : null;
}

// arr — відсортовані записи { ts, t } датчика батареї. Повертає { on, since, changes: [{ ts, on }] }
function heatingState(arr) {
  var changes = [], state = null, j = 0;
  for (var i = 0; i < arr.length; i++) {
    var end = arr[i].ts, start = end - HEAT_WINDOW;
    while (j < i && arr[j].ts < start) j++;
    var win = arr.slice(j, i + 1);
    if (win.length < 4 || win[0].ts - start > 10 * 60000) continue;      // замало замірів або дірка на початку вікна
    var k = slopePerHour(win);
    var head = slopePerHour(win.filter(function (p) { return p.ts < start + HEAT_WINDOW / 2; }));
    if (k == null || head == null) continue;
    var t0 = start + 5 * 60000;                                          // середина перших 10 хв вікна
    if (k >= HEAT_SLOPE && head >= HEAT_SLOPE / 2 && state !== true) { state = true; changes.push({ ts: t0, on: true }); }
    else if (k <= -HEAT_SLOPE && head <= -HEAT_SLOPE / 2 && state !== false) { state = false; changes.push({ ts: t0, on: false }); }
  }
  if (changes.length) { var last = changes[changes.length - 1]; return { on: last.on, since: last.ts, changes: changes }; }
  if (!arr.length) return { on: null, since: null, changes: [] };
  return { on: arr[arr.length - 1].t >= HEAT_LEVEL, since: null, changes: [] };
}

// «як давно»: щойно / 5 хв / 3 год / 14 ЛИС
function agoText(ts) {
  var m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'щойно';
  if (m < 60) return m + ' хв';
  if (m < 24 * 60) return Math.round(m / 60) + ' год';
  return dayLabel(ts);
}
