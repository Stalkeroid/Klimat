// Події, які можна вивести з даних. Поки що одна: опалення (за датчиком з role: 'heater').
//
// Правило (лінійна регресія — нахил прямої методом найменших квадратів, °C/год):
//  • вікно — останні 30 хв (зазвичай 6 замірів, потрібно щонайменше 4);
//  • нахил ≥ +HEAT_SLOPE — опалення увімкнули, ≤ −HEAT_SLOPE — вимкнули; між ними стан не змінюється (гістерезис);
//  • запобіжник за рівнем (лише коли температура стабільна, |нахил| < половини порогу): якщо всі заміри вікна ≥ HEAT_ON_LEVEL, а стан «вимк» (хибна подія раніше) — виправляємо
//    на «увімк»; якщо всі ≤ HEAT_OFF_LEVEL, а стан «увімк» — на «вимк». Такі події позначені byLevel.
//    Сподіваємося, що він майже ніколи не спрацьовуватиме — це страховка від помилок тренду;
//  • додатково той самий знак тренду має бути вже на початку вікна (перша половина, ≥ 3 заміри, нахил ≥ половини порогу).
//    Тобто подія фіксується, коли зміна тягнеться через усе вікно — тоді її початок лежить у перших 10 хв вікна,
//    і час події = початок вікна + 5 хв (середина цих перших 10 хв).
// Шум датчика ±0,1° дає похибку нахилу ≈ 0,3 °C/год, тож поріг 3 °C/год — з великим запасом,
// а звичайні коливання кімнати (≈0,5 °C/год) його не досягають.

var HEAT_WINDOW = 30 * 60000;   // вікно регресії
var HEAT_SLOPE = 3;             // поріг нахилу, °C/год
var HEAT_ON_LEVEL = 35;         // запобіжник: усі заміри вікна ≥ цього — опалення точно працює
var HEAT_OFF_LEVEL = 28;        // запобіжник: усі заміри вікна ≤ цього — опалення точно вимкнене

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
    var allHot = win.every(function (p) { return p.t >= HEAT_ON_LEVEL; });
    var allCold = win.every(function (p) { return p.t <= HEAT_OFF_LEVEL; });
    if (k >= HEAT_SLOPE && head >= HEAT_SLOPE / 2 && state !== true) { changes.push({ ts: t0, on: true, initial: state === null }); state = true; }
    else if (k <= -HEAT_SLOPE && head <= -HEAT_SLOPE / 2 && state !== false) { changes.push({ ts: t0, on: false, initial: state === null }); state = false; }
    // запобіжник за рівнем (і початковий стан, якщо трендових подій ще не було) — лише коли температура стабільна,
    // тобто сама не росте й не падає: остигаюча батарея ще довго гаряча, але це вже «вимк»
    else if (Math.abs(k) >= HEAT_SLOPE / 2) { /* триває зміна — рівню не віримо */ }
    else if (allHot && state !== true) { changes.push({ ts: win[0].ts, on: true, byLevel: true, initial: state === null }); state = true; }
    else if (allCold && state !== false) { changes.push({ ts: win[0].ts, on: false, byLevel: true, initial: state === null }); state = false; }
  }
  if (!changes.length) return { on: null, since: null, changes: [] };
  var last = changes[changes.length - 1];
  // початковий стан (з самого початку даних) показуємо без часу — коли саме увімкнули, невідомо
  return { on: last.on, since: last.initial ? null : last.ts, byLevel: !!last.byLevel, changes: changes };
}

// «як давно»: щойно / 5 хв / 3 год / 14 ЛИС
function agoText(ts) {
  var m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'щойно';
  if (m < 60) return m + ' хв';
  if (m < 24 * 60) return Math.round(m / 60) + ' год';
  return dayLabel(ts);
}
