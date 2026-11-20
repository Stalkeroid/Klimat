// Світло (електрика) — за датчиком батареї (role: 'heater'): опалення працює лише тоді, коли є світло.
//
// Правило (затверджене):
//  • за 3 заміри (3 проміжки між 4 точками, ≈15 хв) батарея впала на ≥ POWER_STEP° — світло зникло; виросла — з'явилось;
//  • час події — точка зламу: останній замір «плато» перед різкою зміною;
//  • запобіжник за рівнем: стабільно ≥ ON_LEVEL — світло є, стабільно ≤ OFF_LEVEL — немає
//    (так само визначається й початковий стан, поки подій ще не було);
//  • наживо: якщо від шлюзу немає даних понад SILENCE, вважаємо, що світла немає (з останнього заміру до «зараз»);
//    коли буфер шлюзу довантажиться, вирішує батарея;
//  • в історії прогалина без даних понад SILENCE — «невідомо»; стан після неї — за зміною температури через прогалину.
//
// Повертає відрізки доби { a, b, s }, де s: 'on' — є світло, 'off' — немає, 'unk' — невідомо.

export const POWER_STEP = 5;        // °C за 3 заміри
export const ON_LEVEL = 35;         // запобіжник: батарея гаряча й стабільна — світло є
export const OFF_LEVEL = 28;        // запобіжник: батарея холодна й стабільна — світла немає
export const SILENCE = 30 * 60000;  // тиша шлюзу / прогалина в даних
const MAX_SPAN = 25 * 60000;        // 3 проміжки мають вкладатися в 25 хв (без пропусків)
const STABLE = 0.6;                 // «стабільно» для запобіжника: за 3 заміри змінилась менше ніж на 0,6° (плато, а не хвіст остигання)

// Події з ряду замірів { ts, t } (відсортованих). Повертає [{ ts, s, gap? }]: s — стан, що почався в момент ts.
export function powerEvents(arr) {
  const ev = [];
  let state = null;
  const set = (ts, s, extra) => { if (s !== state) { ev.push(Object.assign({ ts, s }, extra)); state = s; } };
  for (let i = 1; i < arr.length; i++) {
    // прогалина: невідомо до наступного заміру; стан після неї — за зміною температури через прогалину
    if (arr[i].ts - arr[i - 1].ts > SILENCE) {
      ev.push({ ts: arr[i - 1].ts, s: 'unk', gap: true });
      const d = arr[i].t - arr[i - 1].t;
      const after = d <= -POWER_STEP ? 'off' : d >= POWER_STEP ? 'on' : state;
      state = 'unk';
      if (after) set(arr[i].ts, after);
      continue;
    }
    if (i < 3 || arr[i].ts - arr[i - 3].ts > MAX_SPAN) continue;
    const d = arr[i].t - arr[i - 3].t;
    if (d <= -POWER_STEP || d >= POWER_STEP) {
      const s = d < 0 ? 'off' : 'on', sign = Math.sign(d);
      if (s === state) continue;
      // точка зламу: від останнього заміру йдемо назад, поки температура помітно змінювалась у той самий бік
      const floor = ev.length ? ev[ev.length - 1].ts : -Infinity;
      let j = i;
      while (j > 0 && arr[j - 1].ts > floor && arr[j].ts - arr[j - 1].ts <= SILENCE && (arr[j].t - arr[j - 1].t) * sign >= 0.3) j--;
      set(arr[j].ts, s);
    } else if (Math.abs(d) < STABLE) {
      // запобіжник (і початковий стан)
      const w = [arr[i].t, arr[i - 1].t, arr[i - 2].t, arr[i - 3].t], lo = Math.min(...w), hi = Math.max(...w);
      if (lo >= ON_LEVEL && state !== 'on') set(arr[i - 3].ts, 'on', { byLevel: true });
      else if (hi <= OFF_LEVEL && state !== 'off') set(arr[i - 3].ts, 'off', { byLevel: true });
    }
  }
  return ev;
}

// Відрізки за проміжок [from, to). now — «зараз» для живого режиму (null в архіві).
export function powerTimeline(arr, from, to, now) {
  const ev = powerEvents(arr);
  const end = now != null ? Math.min(to, now) : to;
  const last = arr.length ? arr[arr.length - 1].ts : null;
  // наживо: шлюз мовчить понад SILENCE — світла немає (попередньо)
  if (now != null && last != null && now - last > SILENCE) ev.push({ ts: last, s: 'off', silent: true });
  // після останнього заміру в архіві — невідомо
  if (now == null && last != null && last < end - SILENCE) ev.push({ ts: last, s: 'unk', gap: true });
  const segs = [];
  let s = 'unk', a = from;
  const push = (b) => { if (b > a) { const p = segs[segs.length - 1]; if (p && p.s === s && p.b === a) p.b = b; else segs.push({ a, b, s }); } };
  for (const e of ev) {
    if (e.ts <= from) { s = e.s; continue; }
    if (e.ts >= end) break;
    push(e.ts); a = e.ts; s = e.s;
  }
  push(end);
  // поточний стан і з якого часу
  const cur = ev.length ? ev[ev.length - 1] : null;
  return { segs, state: cur ? cur.s : 'unk', since: cur ? cur.ts : null, silent: !!(cur && cur.silent) };
}
