// Стан і обчислення дашборда (перенесено зі старого js/app.js майже без змін).
// Svelte стежить за this.state ($state): будь-яка зміна → перерахунок renderVals() → оновлення розмітки.
import { REFRESH_MS, SENSORS } from './config.js';
import { RW, toCss, buildRoom, OVERVIEW } from './room.js';
import { tempColor, fmt, hh, hm, rad, pol, wedge, finite, humColor, fmtH, radH, dayLabel, weekday } from './utils.js';
import { buildReal, buildDay, meanOf, dayStartOf, getKey, saveKey, fetchFeeds, fetchDay, channelStart, latestOf, isDemo, sensorName } from './data.js';
import { cal, openCalendar, closeCalendar } from './calendar.js';
import { HEAT_WINDOW, HEAT_SLOPE, heatingState, agoText } from './events.js';

// Телефон: підбирає масштаб кільця і висоту кнопок під фактичний розмір області з кімнатою.
// Кнопка (56 px) має бути однаково віддалена від кола і від шкал унизу; якщо місця замало — кільце зменшується.
function mobileRingLayout() {
  var stg = document.querySelector('.stage'), lg = document.querySelector('.legend');
  var W = (stg && stg.clientWidth) || 340, H = (stg && stg.clientHeight) || 464;
  var yL = lg ? lg.offsetTop : H - 28;              // верх шкал відносно області
  var B = 56, cx = W / 2, cy = H / 2;
  var best = null;
  for (var z = Math.min(1.05, (W - 8) / 332); z >= 0.55; z -= 0.01) {
    var xIn = cx - 166 * z + B;                      // внутрішній край лівої кнопки
    var top = null, score = -1e9;
    for (var t = cy; t + B <= yL; t += 1) {
      var gapL = yL - (t + B);
      var gapC = Math.hypot(cx - xIn, cy - t) - 164 * z;
      var m = Math.min(gapL, gapC);
      if (m > score) { score = m; top = t; }
    }
    if (top != null) best = { z: z, top: top, score: score };
    if (top != null && score >= 10) break;           // щонайменше 10 px до кола і до шкал
  }
  if (!best) return { z: 0.8, bottom: 4 };
  // нижній край кнопки відносно нижнього краю квадрата кільця, в одиницях кільця
  var sqBottom = cy + 166 * best.z;
  return { z: best.z, bottom: Math.round(-((best.top + B) - sqBottom) / best.z) };
}

// значення CSS-змінної теми в пікселях (css/theme.css)
function cssPx(name, fallback) {
  var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return isFinite(v) ? v : fallback;
}

export function emptyDetail() {
  return { name: '', period: '', color: '#fff', nowLabel: 'Зараз', now: '', avg: '', min: '', max: '', minAt: '', maxAt: '', gridY: [], xTicks: [], line: '', area: '',
    dot: { x: 0, y: 0, op: 0 }, nowX: -1000, deltaLabel: '', delta: '', chartAria: '', showDrop: true, showTherm: false, showChart: true, showClock: false,
    metricLabel: '', hourLabel: '', pressedH: 'false', pressedHour: 'false', toggleMetric: function () {}, toggleHour: function () {} };
}

export class Dashboard {
  constructor() {
    this.state = $state({ rev: 0, vw: window.innerWidth, sel: null, dYaw: 0, dPitch: 0, dragging: false, hover: null, pinned: null, hourView: null, status: 'loading', zoom: 1, metric: 't', day: null });
    // вікно ключа ThingSpeak
    this.setup = $state({ open: false, err: '', cancel: false, key: '' });
    this.loadToken = 0;
    this.ptrs = {};
    this.pinch = null;
    this.innerClick = false;
    this.now = Date.now();
    this.room = buildRoom();
    this.raw = SENSORS.map(function () { return []; });
    this.rawH = SENSORS.map(function () { return []; });
    this.hum = SENSORS.map(function () { return NaN; });
    this.lastTs = null;
    this.data = buildReal(this.raw, this.now);
    this.dataH = buildReal(this.rawH, this.now);
    this.drag = null;
    this.moved = false;
  }

  async load() {
    var key = getKey();
    if (!key) { this.setState({ status: 'nokey' }); this.showSetup(); return; }
    var day = this.state.day, token = ++this.loadToken;
    try {
      var res = day == null ? await fetchFeeds(key) : await fetchDay(key, day);
      if (token !== this.loadToken) return;            // поки вантажилось, вибрали інший день
      if (!res) {
        this.setState({ status: 'badkey' });
        this.showSetup('Не вдалося прочитати канал — перевірте ключ.');
        return;
      }
      this.raw = res.raw; this.rawH = res.rawH; this.lastTs = res.lastTs;
      this.now = Date.now();
      if (day == null) {                                // наживо: ковзні 24 год, «зараз» — останній запис
        this.hum = res.hum;
        this.data = buildReal(res.raw, this.now);
        this.dataH = buildReal(res.rawH, this.now);
      } else {                                          // архів: доба 00…23, значення — середні за добу
        this.hum = res.rawH.map(meanOf);
        this.data = buildDay(res.raw, day);
        this.dataH = buildDay(res.rawH, day);
      }
      this.state.rev++;
      this.setState({ status: 'ok' });
    } catch (e) {
      if (token !== this.loadToken) return;
      this.now = Date.now();
      this.setState({ status: 'error' });
    }
  }

  // «Машина часу»: null — сьогодні наживо, інакше локальна північ вибраного дня
  setDay(d) {
    var today = dayStartOf(Date.now());
    if (d != null && d >= today) d = null;
    if (d != null && d < this.minDay()) d = this.minDay();
    if (d === this.state.day) return;
    this.setState({ day: d, hourView: null, pinned: null, hover: null, status: 'loading' });
    this.load();
  }
  minDay() {
    var floor = dayStartOf(Date.now() - 365 * 86400000);
    if (isDemo()) return dayStartOf(Date.now() - 60 * 86400000);
    return channelStart ? Math.max(floor, dayStartOf(channelStart)) : floor;
  }

  setState(p) { Object.assign(this.state, p); }

  showSetup(msg) {
    this.setup.err = msg || '';
    this.setup.key = getKey();
    this.setup.cancel = !!getKey() && !msg;     // «Скасувати» — лише коли ключ уже робочий
    this.setup.open = true;
  }
  hideSetup() { this.setup.open = false; }
  submitKey(v) {
    v = (v || '').trim();
    if (!v) { this.setup.err = 'Вставте ключ.'; return; }
    saveKey(v);
    this.hideSetup();
    this.setState({ status: 'loading' });
    this.load();
  }

  select(i) {
    this.innerClick = true;
    if (this.moved) { this.moved = false; return; }
    this.setState({ sel: this.state.sel === i ? null : i, dYaw: 0, dPitch: 0, hover: null, pinned: null, hourView: null });
  }

  // Панель датчика: та сама величина (Т/Н) і той самий режим (доба/година), що й у кільці — стан спільний.
  // Доба = поточна календарна доба (00:00…зараз) або вибраний архівний день; година — 5-хвилинна історія.
  detailVals(sel, isH, archive, rdat, vals) {
    var self = this, st = this.state, s = SENSORS[sel];
    var arr = isH ? this.rawH[sel] : this.raw[sel];
    var vf = isH ? fmtH : fmt, vc = isH ? humColor : tempColor, unit = isH ? '%' : '°';
    var hourMode = st.hourView != null && rdat[st.hourView];
    var dayStart = archive ? st.day : dayStartOf(Date.now());
    var r0, r1, ticks = [];
    if (hourMode) {
      r0 = rdat[st.hourView].start; r1 = r0 + 3600000;
      [0, 15, 30, 45, 60].forEach(function (mm) { ticks.push({ t: r0 + mm * 60000, label: hm(r0 + mm * 60000) }); });
    } else {
      r0 = dayStart; r1 = dayStart + 86400000;
      [0, 6, 12, 18, 24].forEach(function (h) { ticks.push({ t: r0 + h * 3600000, label: (h < 10 ? '0' : '') + h + ':00' }); });
    }
    var pts = arr.filter(function (p) { return p.ts >= r0 && p.ts < r1; });
    var vals2 = pts.map(function (p) { return p.t; });
    var last = pts.length ? pts[pts.length - 1] : null, first = pts.length ? pts[0] : null;
    var mnP = null, mxP = null, sum = 0;
    pts.forEach(function (p) { sum += p.t; if (!mnP || p.t < mnP.t) mnP = p; if (!mxP || p.t > mxP.t) mxP = p; });
    var avg = pts.length ? sum / pts.length : NaN;
    var live = !archive && (!hourMode || r1 > Date.now());

    // вісь Y: «круглі» поділки, 3–5 штук
    var lo, hi, step;
    if (pts.length) {
      var span = Math.max(mxP.t - mnP.t, isH ? 2 : 0.6);
      step = [0.2, 0.5, 1, 2, 5, 10, 20].find(function (st0) { return span / st0 <= 4; }) || 20;
      lo = Math.floor((mnP.t - span * 0.1) / step) * step; hi = Math.ceil((mxP.t + span * 0.1) / step) * step;
      if (hi - lo < step * 2) hi = lo + step * 2;
    } else { lo = 0; hi = 1; step = 1; }
    var PX0 = 34, PX1 = 314, PY0 = 8, PY1 = 104;
    function X(t) { return PX0 + (t - r0) / (r1 - r0) * (PX1 - PX0); }
    function Y(v) { return PY0 + (hi - v) / (hi - lo) * (PY1 - PY0); }
    var yTicks = [];
    for (var g = lo; g <= hi + 1e-9; g += step) {
      var gl = Math.round(g * 10) / 10;
      yTicks.push({ y: Y(g).toFixed(1), ty: (Y(g) + 3).toFixed(1), label: String(gl).replace('.', ',') + unit });
    }
    // лінія з розривами там, де даних не було понад 20 хв
    var line = '', area = '', seg = [];
    function flush() {
      if (!seg.length) return;
      var d0 = seg.map(function (p, k) { return (k ? 'L' : 'M') + X(p.ts).toFixed(1) + ',' + Y(p.t).toFixed(1); }).join(' ');
      line += d0 + ' ';
      area += d0 + ' L' + X(seg[seg.length - 1].ts).toFixed(1) + ',' + PY1 + ' L' + X(seg[0].ts).toFixed(1) + ',' + PY1 + ' Z ';
      seg = [];
    }
    pts.forEach(function (p, k) { if (k && p.ts - pts[k - 1].ts > 20 * 60000) flush(); seg.push(p); });
    flush();
    var color = vc(last ? last.t : NaN);
    var delta = last && first ? last.t - first.t : NaN;
    var name = sensorName(sel);
    var period = hourMode ? (archive ? dayLabel(st.day) + ' · ' : '') + hm(r0) + '–' + hm(r1)
                          : (archive ? dayLabel(st.day) + ' · ' + weekday(st.day) : 'Сьогодні · 00:00–' + hm(Date.now()));
    return {
      name: name, period: period, color: color,
      nowLabel: live ? 'Зараз' : 'Остання', now: vf(last ? last.t : NaN),
      avg: vf(avg), min: vf(mnP ? mnP.t : NaN), max: vf(mxP ? mxP.t : NaN),
      minAt: mnP ? hm(mnP.ts) : '—', maxAt: mxP ? hm(mxP.ts) : '—',
      gridY: yTicks, xTicks: ticks.map(function (tk, k) { return { x: X(tk.t).toFixed(1), label: tk.label, anchor: k === 0 ? 'start' : (k === ticks.length - 1 ? 'end' : 'middle') }; }),
      line: line.trim(), area: area.trim(),
      dot: last ? { x: X(last.ts).toFixed(1), y: Y(last.t).toFixed(1), op: 1 } : { x: 0, y: 0, op: 0 },
      nowX: live && !hourMode ? X(Date.now()).toFixed(1) : -1000,   // пунктир «зараз» лише для живої доби
      deltaLabel: hourMode ? 'Зміна за годину' : 'Зміна за добу',
      delta: isFinite(delta) ? (delta >= 0 ? '+' : '−') + Math.abs(delta).toFixed(1).replace('.', ',') + unit : '—',
      chartAria: (isH ? 'Вологість ' : 'Температура ') + name + ', ' + period + ', від ' + vf(mnP ? mnP.t : NaN) + ' до ' + vf(mxP ? mxP.t : NaN),
      // ті самі перемикачі, що й у кільці (спільний стан)
      isH: isH, isHour: !!hourMode, showDrop: !isH, showTherm: isH, showChart: !hourMode, showClock: !!hourMode,
      metricLabel: isH ? 'Показати температуру' : 'Показати вологість', hourLabel: hourMode ? 'Назад до доби' : 'Детально за годину',
      pressedH: isH ? 'true' : 'false', pressedHour: hourMode ? 'true' : 'false',
      toggleMetric: function () { vals.toggleMetric(); self.innerClick = false; },
      toggleHour: function () { (hourMode ? vals.closeHour : vals.openHour)(); self.innerClick = false; }
    };
  }

  renderVals() {
    var self = this, st = this.state, data = this.data;
    st.rev; st.vw;   // перерахунок після нових даних і зміни розміру вікна
    var sel = st.sel;
    var cam = sel == null ? OVERVIEW : { target: SENSORS[sel].pos, ry: SENSORS[sel].cam.ry, rx: SENSORS[sel].cam.rx, zoom: SENSORS[sel].cam.zoom };
    var ry = Math.max(-85, Math.min(85, cam.ry + st.dYaw));
    var rx = Math.max(-78, Math.min(-3, cam.rx + st.dPitch));
    var tc = toCss(cam.target);
    var camT = 'translateZ(' + cam.zoom + 'px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translate3d(' + (-tc[0]) + 'px,' + (-tc[1]) + 'px,' + (-tc[2]) + 'px)';
    var tr = st.dragging ? 'none' : 'transform 1.2s cubic-bezier(.65,0,.25,1)';
    var dd = 1100 - cam.zoom, rxr = rx * Math.PI / 180, ryr = ry * Math.PI / 180;
    var eyeX = tc[0] - dd * Math.cos(rxr) * Math.sin(ryr) + RW / 2;
    var visL = eyeX > 0, visR = eyeX < RW;
    var faces = this.room.map(function (fc) {
      if (!fc.g) return fc;
      var op = fc.g === 'W' ? (sel === 3 ? 0.16 : 1) : fc.g === 'D' ? (sel === 1 || sel === 2 ? 0.16 : 1) : ((fc.g === 'L' ? visL : visR) ? 1 : 0);
      return { w: fc.w, h: fc.h, t: fc.t, bg: fc.bg, img: fc.img, bs: fc.bs, bp: fc.bp, op: op };
    });
    function bb(pos, push) {
      var c = toCss(pos);
      return 'translate3d(' + c[0] + 'px,' + c[1] + 'px,' + c[2] + 'px) rotateY(' + (-ry) + 'deg) rotateX(' + (-rx) + 'deg) translateZ(' + push + 'px)';
    }
    // «зараз» — останній запис (реальний час); кільце за добу — погодинні середні
    var archive = st.day != null;
    var cur = self.raw.map(archive ? meanOf : latestOf);   // в архіві — середні за добу

    // мітки: 3D-якір (лише позиція) + плаский шар з табличкою; див. js/markers.js
    var STALE_MS = 15 * 60000;
    var markers = SENSORS.map(function (s, i) {
      var isSel = sel === i, c = toCss(s.pos), arr = self.raw[i];
      var stale = !archive && (!arr.length || Date.now() - arr[arr.length - 1].ts > STALE_MS);
      return {
        name: sensorName(SENSORS.indexOf(s)), temp: fmt(cur[i]), color: tempColor(cur[i]),
        t: 'translate3d(' + c[0] + 'px,' + c[1] + 'px,' + c[2] + 'px)',
        cls: stale ? 'mk--stale' : '',
        op: isSel ? 0 : (sel == null ? 1 : 0.55), pe: isSel ? 'none' : 'auto',
        aria: sensorName(SENSORS.indexOf(s)) + ', ' + fmt(cur[i]) + (stale ? ', дані застарілі' : '') + '. Показати графік',
        pick: function () { self.select(i); }
      };
    });

    var list = SENSORS.map(function (s, i) {
      var d = data[i], fin = finite(d.map(function (p) { return p.t; }));
      var mn = fin.length ? Math.min.apply(null, fin) : 0, mx = fin.length ? Math.max.apply(null, fin) : 1;
      var span = Math.max(0.5, mx - mn);
      var spark = fin.length ? d.map(function (p, k) { return (2 + k * 68 / 23).toFixed(1) + ',' + (23 - (p.t - mn) / span * 20).toFixed(1); }).join(' ') : '';
      var on = sel === i;
      return {
        code: s.code, name: sensorName(SENSORS.indexOf(s)), temp: fmt(cur[i]), color: tempColor(cur[i]), spark: spark,
        hum: isFinite(self.hum[i]) ? 'Н: ' + Math.round(self.hum[i]) + '%' : '',
        bg: on ? 'var(--accent-soft)' : 'var(--surface)', border: on ? 'var(--accent-line)' : 'var(--stroke)',
        pressed: on ? 'true' : 'false',
        pick: function () { self.moved = false; self.select(i); self.innerClick = false; }
      };
    });

    var curF = cur.map(function (t, i) { return { t: t, i: i }; }).filter(function (x) { return isFinite(x.t); });
    var avg = curF.length ? curF.reduce(function (a, b) { return a + b.t; }, 0) / curF.length : NaN;
    var all = finite([].concat.apply([], data.map(function (d) { return d.map(function (p) { return p.t; }); })));
    var room = { warm: '—', cool: '—', spread: '—', range: '—', spreadLabel: archive ? 'Розкид (середні)' : 'Розкид зараз' };
    if (curF.length) {
      var hi0 = curF.reduce(function (a, b) { return b.t > a.t ? b : a; }), lo0 = curF.reduce(function (a, b) { return b.t < a.t ? b : a; });
      room.warm = sensorName(hi0.i) + ' · ' + fmt(hi0.t);
      room.cool = sensorName(lo0.i) + ' · ' + fmt(lo0.t);
      room.spread = (hi0.t - lo0.t).toFixed(1).replace('.', ',') + '°';
    }
    if (all.length) room.range = fmt(Math.min.apply(null, all)) + ' – ' + fmt(Math.max.apply(null, all));

    // огляд (коли датчик не вибрано): подія опалення + зв'язок датчиків
    var heatIdx = SENSORS.findIndex(function (s0) { return s0.role === 'heater'; });
    var heat = heatIdx >= 0 ? heatingState(self.raw[heatIdx]) : { on: null };
    var sinceTxt = heat.since ? (dayStartOf(heat.since) === dayStartOf(archive ? st.day : Date.now()) ? hm(heat.since) : dayLabel(heat.since) + ' ' + hm(heat.since)) : '';
    var online = 0;
    var links = SENSORS.map(function (s0, i) {
      var arr = self.raw[i], last = arr.length ? arr[arr.length - 1].ts : null;
      var age = last ? Date.now() - last : Infinity;
      var color = archive ? 'var(--text-4)' : age < 15 * 60000 ? 'var(--st-live)' : age < 60 * 60000 ? 'var(--st-stale)' : 'var(--st-error)';
      if (!archive && age < 15 * 60000) online++;
      return { name: sensorName(i), color: color, ago: last ? (archive ? hm(last) : agoText(last)) : '—', agoColor: !archive && age >= 15 * 60000 ? color : 'var(--text-3)' };
    });
    var ov = {
      heatShow: heatIdx >= 0,
      heatState: heat.on == null ? 'НЕВІДОМО' : (heat.on ? 'УВІМК' : 'ВИМК') + (sinceTxt ? ' · ' + sinceTxt : ''),
      heatColor: heat.on ? 'var(--warm)' : 'var(--text-3)',
      heatIcon: heat.on ? 'var(--warm)' : 'var(--text-4)',
      heatTitle: 'Визначається за датчиком «' + (heatIdx >= 0 ? sensorName(heatIdx) : '') + '»: нахил тренду за ' + (HEAT_WINDOW / 60000) + ' хв ≥ ±' + HEAT_SLOPE + ' °C/год' + (heat.byLevel ? '. Останній стан виправлено за рівнем температури (запобіжник)' : ''),
      linkTitle: archive ? 'ОСТАННІ ЗАПИСИ ДОБИ' : 'ЗВ’ЯЗОК ДАТЧИКІВ',
      linkMeta: archive ? '' : online + '/' + SENSORS.length + ' НА ЗВ’ЯЗКУ',
      links: links
    };

    var badge, badgeColor;
    // індикатор статусу: стан + час останніх даних (замість підзаголовка)
    var tLast = self.lastTs ? ' · ' + hm(self.lastTs) : '';
    if (st.status === 'ok' && archive) { badge = (isDemo() ? 'ДЕМО · ' : '') + 'АРХІВ'; badgeColor = 'var(--st-archive)'; }   // дата — у перемикачі поруч
    else if (st.status === 'ok' && isDemo()) { badge = 'ДЕМО · ВИПАДКОВІ ДАНІ'; badgeColor = 'var(--st-demo)'; }
    else if (st.status === 'loading') { badge = 'ЗАВАНТАЖЕННЯ'; badgeColor = 'var(--st-loading)'; }
    else if (st.status === 'ok' && self.lastTs && Date.now() - self.lastTs < 15 * 60000) { badge = 'НАЖИВО' + tLast; badgeColor = 'var(--st-live)'; }
    else if (st.status === 'ok' && self.lastTs) { badge = 'НЕМАЄ ДАНИХ' + tLast; badgeColor = 'var(--st-stale)'; }
    else if (st.status === 'ok') { badge = 'КАНАЛ ПОРОЖНІЙ'; badgeColor = 'var(--st-stale)'; }
    else if (st.status === 'error') { badge = 'НЕМАЄ ЗВ’ЯЗКУ' + tLast; badgeColor = 'var(--st-error)'; }
    else { badge = 'ПОТРІБЕН КЛЮЧ'; badgeColor = 'var(--st-error)'; }
    var badgeTitle = isDemo() ? 'Демо-режим: дані згенеровані випадково. Щоб підключити свій канал — «Змінити ключ ThingSpeak»' : self.lastTs ? 'Останні дані з ThingSpeak: ' + new Date(self.lastTs).toLocaleString('uk-UA') : 'ThingSpeak';

    var vals = {
      faces: faces, markers: markers, list: list, room: room, ov: ov,
      camT: camT, camTr: tr, sceneScale: ((window.innerWidth <= 700 ? 0.62 : 1) * st.zoom).toFixed(3), cursor: st.dragging ? 'grabbing' : 'grab',
      hasSel: sel != null, noSel: sel == null, ringOn: sel != null,
      updated: self.lastTs ? hm(self.lastTs) : '—',
      badge: badge, badgeColor: badgeColor, badgeTitle: badgeTitle,
      // перемикач дня
      dayBtn: archive ? dayLabel(st.day) + ' · ' + weekday(st.day) : 'СЬОГОДНІ',
      prevOff: (archive ? st.day : dayStartOf(Date.now())) > self.minDay() ? 'false' : 'true', nextOff: archive ? 'false' : 'true',
      prevDay: function () { var base = self.state.day != null ? self.state.day : dayStartOf(Date.now()); self.setDay(dayStartOf(base - 12 * 3600000)); },
      nextDay: function () { if (self.state.day != null) self.setDay(dayStartOf(self.state.day + 36 * 3600000)); },
      openPicker: function (e) {
        if (cal) { closeCalendar(); return; }
        openCalendar(e.currentTarget, { value: self.state.day != null ? self.state.day : Date.now(), min: self.minDay(), max: dayStartOf(Date.now()), onPick: function (d) { self.setDay(d); } });
      },
      // легенда: граничні значення активного режиму — білі; поки датчик не вибрано — обидві сірі
      lg: sel == null ? { t: 'var(--text-3)', h: 'var(--text-3)' } : (st.metric === 'h' ? { t: 'var(--text-3)', h: 'var(--text)' } : { t: 'var(--text)', h: 'var(--text-3)' }),
      changeKey: function () { self.showSetup(); },
      roomAvg: fmt(avg), roomAvgColor: tempColor(avg),
      stageClick: function () {
        if (self.innerClick) { self.innerClick = false; return; }
        if (self.moved) { self.moved = false; return; }
        if (self.state.sel != null) self.setState({ sel: null, dYaw: 0, dPitch: 0, hover: null, pinned: null, hourView: null });
      },
      openHour: function () {
        self.innerClick = true;
        var st0 = self.state, d0 = self.data[st0.sel], k = 23;
        if (st0.pinned != null) for (var q = 0; q < 24; q++) if (d0[q].hd === st0.pinned) k = q;
        self.setState({ hourView: k, dayPinned: st0.pinned, pinned: null, hover: null });
      },
      closeHour: function () { self.innerClick = true; self.setState({ hourView: null, pinned: self.state.dayPinned != null ? self.state.dayPinned : null, hover: null }); },
      hint: sel == null ? 'Перетягніть — обертати · колесо або два пальці — масштаб · натисніть на датчик' : 'Натисніть на поділку, щоб закріпити · поза кільцем — назад до кімнати',
      hourMode: false, dayMode: true, rl: { a: '', b: '', c: '', d: '' }, ringClick: function () { self.innerClick = true; },
      clearHover: function () { self.setState({ hover: null }); },
      onDown: function (e) {
        self.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(self.ptrs);
        if (ids.length >= 2) {
          var a = self.ptrs[ids[0]], b = self.ptrs[ids[1]];
          self.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: self.state.zoom };
          self.drag = null; self.moved = true;
          return;
        }
        self.drag = { x: e.clientX, y: e.clientY, dy: self.state.dYaw, dp: self.state.dPitch }; self.moved = false;
      },
      onWheel: function (e) {
        e.preventDefault();
        var z = Math.max(1, Math.min(2, self.state.zoom * Math.exp(-e.deltaY * 0.0015)));
        if (z !== self.state.zoom) self.setState({ zoom: z });
      },
      onMove: function (e) {
        if (self.ptrs[e.pointerId]) self.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (self.pinch) {
          var ids = Object.keys(self.ptrs);
          if (ids.length >= 2) {
            var a = self.ptrs[ids[0]], b = self.ptrs[ids[1]];
            var z = Math.max(1, Math.min(2, self.pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / self.pinch.d));
            self.setState({ zoom: z });
          }
          return;
        }
        var d = self.drag; if (!d) return;
        var dx = e.clientX - d.x, dy = e.clientY - d.y;
        // поріг, після якого це вже обертання, а не тап (палець тремтить сильніше за мишу)
        if (!self.moved && Math.abs(dx) + Math.abs(dy) < (e.pointerType === 'mouse' ? 5 : 12)) return;
        self.moved = true;
        self.setState({ dragging: true, dYaw: d.dy + dx * 0.25, dPitch: d.dp - dy * 0.2 });
      },
      onUp: function (e) {
        if (e && e.pointerId != null) delete self.ptrs[e.pointerId];
        if (Object.keys(self.ptrs).length < 2) self.pinch = null;
        self.drag = null; if (self.state.dragging) self.setState({ dragging: false });
      },
      ringScale: 1, btn: { size: 56, inset: 4, bottom: 4, radius: 12, icon: 26 }, metricBtn: { label: '', pressed: 'false', showDrop: true, showTherm: false }, toggleMetric: function () {}, ringMove: function () {}, ringAria: '', bars: [], grid: [], nowDot: { x: 0, y: 0, op: 0 }, center: { code: '', mk: '', sub2: '', temp: '', sub: '', color: '#fff' },
      det: emptyDetail()
    };

    if (sel != null) {
      var s = SENSORS[sel], d = data[sel];
      var ts = d.map(function (p) { return p.t; });
      var tf = finite(ts);
      var mn = tf.length ? Math.min.apply(null, tf) : NaN, mx = tf.length ? Math.max.apply(null, tf) : NaN;
      var mean = tf.length ? tf.reduce(function (a, b) { return a + b; }, 0) / tf.length : NaN;
      // кільце — окремий 2D-елемент поверх сцени, від зуму кімнати не залежить
      // CSS zoom: малюється чітко, без розмиття. На ПК — фіксовано 1.4; на телефоні — розрахунок під реальний екран
      var narrow = window.innerWidth <= 700;
      var mob = narrow ? mobileRingLayout() : null;
      vals.ringScale = mob ? mob.z : 1.4;
      // що показує кільце: температуру ('t') чи вологість ('h')
      var isH = st.metric === 'h';
      var rdat = isH ? self.dataH[sel] : d, rawR = isH ? self.rawH[sel] : self.raw[sel];
      var vfmt = isH ? fmtH : fmt, vcol = isH ? humColor : tempColor, vrad = isH ? radH : rad;
      var curR = isH ? (archive ? meanOf : latestOf)(self.rawH[sel]) : cur[sel];
      var hourMode = st.hourView != null, segs, N, now = new Date(self.now), havg = NaN;
      if (!hourMode) {
        N = 24;
        segs = [];
        for (var hs = 0; hs < 24; hs++) segs.push({ future: true, t: null, label: hh(hs) + '–' + hh((hs + 1) % 24) });
        rdat.forEach(function (p, k) {
          if ((archive || p.hd <= rdat[23].hd) && !p.filled && isFinite(p.t))
            segs[p.hd] = { future: false, t: p.t, label: hh(p.hd) + '–' + hh((p.hd + 1) % 24), isNow: !archive && k === 23 };
        });
      } else {
        // реальні 5-хвилинні показники за обрану годину
        N = 12;
        var hk = st.hourView, hpnt = rdat[hk], hs0 = hpnt.start, rawS = rawR;
        var avail = !archive && hk === 23 ? Math.floor(now.getMinutes() / 5) + 1 : 12;
        var sums = [], cnts = [];
        for (var z = 0; z < 12; z++) { sums.push(0); cnts.push(0); }
        rawS.forEach(function (p) {
          if (p.ts >= hs0 && p.ts < hs0 + 3600000) { var mi = Math.floor((p.ts - hs0) / 300000); sums[mi] += p.t; cnts[mi]++; }
        });
        var lastReal = -1;
        for (var z2 = 0; z2 < 12; z2++) if (z2 < avail && cnts[z2]) lastReal = z2;
        segs = [];
        for (var m = 0; m < 12; m++) {
          var mm0 = m * 5, mm1 = m * 5 + 5;
          var lab = String(hpnt.hd).padStart(2, '0') + ':' + String(mm0).padStart(2, '0') + '–' + (mm1 === 60 ? hh((hpnt.hd + 1) % 24) : String(hpnt.hd).padStart(2, '0') + ':' + String(mm1).padStart(2, '0'));
          if (m < avail && cnts[m]) segs.push({ future: false, t: Math.round(sums[m] / cnts[m] * 10) / 10, label: lab, isNow: !archive && hk === 23 && m === lastReal });
          else segs.push({ future: true, t: null, label: lab });
        }
        var real = segs.filter(function (x) { return !x.future; }).map(function (x) { return x.t; });
        havg = real.length ? real.reduce(function (a, b) { return a + b; }, 0) / real.length : hpnt.t;
      }
      var segStep = 360 / N, gap = hourMode ? 2.2 : 1.6;
      function kAt(e) {
        var el = e.currentTarget; if (!el || !el.getBoundingClientRect) return undefined;
        var rc = el.getBoundingClientRect(), sc = rc.width / 332;
        var dx = e.clientX - (rc.left + rc.width / 2), dy = e.clientY - (rc.top + rc.height / 2);
        var r = Math.sqrt(dx * dx + dy * dy) / (sc || 1);
        var k = null;
        if (r > 68 && r < 160) {
          var ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
          var idx = ((Math.floor(ang / segStep) % N) + N) % N;
          if (!segs[idx].future) k = idx;
        }
        return { k: k, r: r };
      }
      // наведення — лише мишею; на сенсорному екрані значення закріплюється тапом
      vals.ringMove = function (e) {
        if (e.pointerType !== 'mouse') return;
        var h = kAt(e); if (!h) return;
        if (self.state.hover !== h.k) self.setState({ hover: h.k });
      };
      vals.ringClick = function (e) {
        var h = kAt(e); if (!h) return;
        if (h.r > 164) return;            // поза колом — нехай клік закриє статистику
        self.innerClick = true;
        if (h.k == null) return;
        self.setState({ pinned: self.state.pinned === h.k ? null : h.k });
      };
      vals.ringAria = hourMode ? (isH ? 'Вологість ' : 'Температура ') + sensorName(SENSORS.indexOf(s)) + ' за годину ' + segs[0].label.slice(0, 5) + ', кожні 5 хвилин' : 'Кільцевий графік ' + (isH ? 'вологості ' : 'температури ') + sensorName(SENSORS.indexOf(s)) + ' за сьогодні';
      var eff = st.hover != null ? st.hover : st.pinned;
      vals.bars = segs.map(function (g, k) {
        var a0 = k * segStep - 90 + gap, a1 = (k + 1) * segStep - 90 - gap;
        if (g.future) return { d: wedge(72, 104, a0, a1), fill: 'var(--seg-empty)', op: 1, stroke: 'none', hover: function () {} };
        var isHover = eff === k;
        return {
          d: wedge(72, vrad(g.t), a0, a1), fill: vcol(g.t),
          op: eff == null ? 1 : (isHover ? 1 : 0.4),
          stroke: g.isNow || isHover ? 'var(--text)' : 'none',
          hover: function (e) { if (e.pointerType !== 'mouse') return; if (self.state.hover !== k) self.setState({ hover: k }); }
        };
      });
      vals.grid = (isH ? [20, 40, 60, 80] : [10, 20, 30, 40, 50]).map(function (t) { return { r: vrad(t) }; });
      var rlab = hourMode ? [':00', ':15', ':30', ':45'] : ['00', '06', '12', '18'];
      vals.rl = { a: rlab[0], b: rlab[1], c: rlab[2], d: rlab[3] };
      var nowIdx = -1; segs.forEach(function (g, k) { if (g.isNow) nowIdx = k; });
      var nd = nowIdx >= 0 ? pol(vrad(segs[nowIdx].t) + 6, nowIdx * segStep - 90 + segStep / 2) : [0, 0];
      vals.nowDot = { x: nd[0], y: nd[1], op: nowIdx >= 0 ? 1 : 0 };
      var shown = eff != null ? segs[eff] : null;
      var ct = shown ? shown.t : (hourMode ? havg : curR);
      vals.center = {
        code: sensorName(SENSORS.indexOf(s)).toUpperCase(), mk: isH ? 'Н' : 'Т', temp: vfmt(ct), color: vcol(ct),
        sub: shown ? shown.label : (hourMode ? hh(d[st.hourView].hd) + '–' + hh((d[st.hourView].hd + 1) % 24) : (archive ? '' : 'зараз')),
        sub2: shown ? '' : (hourMode ? 'середня' : (archive ? 'середня за добу' : ''))
      };
      // кутові кнопки: не менше ~56 px на екрані незалежно від масштабу кільця
      var bsz = Math.ceil(56 / vals.ringScale);
      // на телефоні кнопки наполовину під кільцем, у кутах поза колом; на ПК — у нижніх кутах
      vals.btn = { size: bsz, inset: mob ? 0 : 4, bottom: mob ? mob.bottom : 4, radius: Math.round(cssPx('--r-btn', 8) / vals.ringScale), icon: Math.round(bsz * 0.46) };
      vals.metricBtn = { label: isH ? 'Показати температуру' : 'Показати вологість', pressed: isH ? 'true' : 'false', showDrop: !isH, showTherm: isH };
      vals.toggleMetric = function () { self.innerClick = true; self.setState({ metric: isH ? 't' : 'h', hover: null, pinned: null }); };
      vals.hourMode = hourMode; vals.dayMode = !hourMode;
      vals.det = self.detailVals(sel, isH, archive, rdat, vals);
    }
    return vals;
  }
}

