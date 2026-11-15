// Події, які можна вивести з даних. Поки що одна: опалення (за датчиком з role: 'heater').
// Правило: якщо за останні 20 хв температура зросла на ≥ 1° — опалення увімкнули, впала на ≥ 1° — вимкнули.
// Час події — середина цього 20-хвилинного вікна, тобто момент виявлення мінус 10 хв.

var HEAT_WINDOW = 20 * 60000;   // вікно порівняння
var HEAT_DELTA = 1;             // поріг зміни, °C
var HEAT_LEVEL = 35;            // якщо змін не було: вище цієї температури вважаємо, що опалення працює

// arr — відсортовані записи { ts, t } датчика батареї. Повертає { on, since, changes: [{ ts, on }] }
function heatingState(arr) {
  var changes = [], state = null, j = 0;
  for (var i = 0; i < arr.length; i++) {
    var target = arr[i].ts - HEAT_WINDOW;
    while (j + 1 < i && arr[j + 1].ts <= target) j++;
    if (arr[j].ts > target || arr[i].ts - arr[j].ts > HEAT_WINDOW + 10 * 60000) continue;   // немає запису ~20 хв тому
    var d = arr[i].t - arr[j].t;
    if (d >= HEAT_DELTA && state !== true) { state = true; changes.push({ ts: arr[i].ts - HEAT_WINDOW / 2, on: true }); }
    else if (d <= -HEAT_DELTA && state !== false) { state = false; changes.push({ ts: arr[i].ts - HEAT_WINDOW / 2, on: false }); }
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
