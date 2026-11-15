// Спільний стан дашборда (Svelte 5 runes).
// Тут лише «джерела правди» і дії над ними. Що й як показувати, кожен компонент вираховує сам ($derived),
// тож при обертанні кімнати оновлюється тільки камера, а не список, панель чи кільце.
import { SENSORS } from './config.js';
import { buildReal, buildDay, meanOf, latestOf, dayStartOf, getKey, saveKey, fetchFeeds, fetchDay, channelStart, isDemo } from './data.js';

const empty = () => SENSORS.map(() => []);

export class Store {
  // ---------- інтерфейс ----------
  sel = $state(null);          // індекс вибраного датчика або null
  metric = $state('t');        // що показує кільце/панель: 't' — температура, 'h' — вологість
  hourView = $state(null);     // індекс години (у масиві data) для 5-хвилинного режиму або null
  pinned = $state(null);       // закріплений сегмент кільця
  hover = $state(null);        // сегмент під мишею
  day = $state(null);          // «машина часу»: null — сьогодні наживо, інакше локальна північ дня
  status = $state('loading');  // loading | ok | error | badkey | nokey

  // ---------- камера ----------
  dYaw = $state(0);
  dPitch = $state(0);
  zoom = $state(1);            // 1…2 (колесо / два пальці)
  dragging = $state(false);
  vw = $state(window.innerWidth);

  // ---------- дані ----------
  raw = $state.raw(empty());   // температура: масиви { ts, t } по датчиках
  rawH = $state.raw(empty());  // вологість
  lastTs = $state(null);       // час останнього запису в каналі
  now = $state(Date.now());    // момент останнього завантаження (від нього рахуються «зараз», «як давно»)

  // ---------- вікно ключа ----------
  setup = $state({ open: false, err: '', cancel: false, key: '' });

  // ---------- похідне ----------
  archive = $derived(this.day != null);
  // погодинні точки: наживо — ковзні 24 год, в архіві — доба 00…23
  data = $derived(this.archive ? buildDay(this.raw, this.day) : buildReal(this.raw, this.now));
  dataH = $derived(this.archive ? buildDay(this.rawH, this.day) : buildReal(this.rawH, this.now));
  // «зараз» — останній запис; в архіві — середні за добу
  cur = $derived(this.raw.map(this.archive ? meanOf : latestOf));
  hum = $derived(this.rawH.map(this.archive ? meanOf : latestOf));
  narrow = $derived(this.vw <= 700);

  // службове (не впливає на відображення)
  loadToken = 0;
  dayPinned = null;   // закріплений сегмент доби, щоб повернути його після режиму години
  moved = false;      // останній жест був перетягуванням — клік після нього ігноруємо

  // ---------- завантаження ----------
  async load() {
    const key = getKey();
    if (!key) { this.status = 'nokey'; this.showSetup(); return; }
    const day = this.day, token = ++this.loadToken;
    try {
      const res = day == null ? await fetchFeeds(key) : await fetchDay(key, day);
      if (token !== this.loadToken) return;                  // поки вантажилось, вибрали інший день
      if (!res) { this.status = 'badkey'; this.showSetup('Не вдалося прочитати канал — перевірте ключ.'); return; }
      this.now = Date.now();
      this.raw = res.raw; this.rawH = res.rawH; this.lastTs = res.lastTs;
      this.status = 'ok';
    } catch (e) {
      if (token !== this.loadToken) return;
      this.now = Date.now();
      this.status = 'error';
    }
  }

  // ---------- «машина часу» ----------
  setDay(d) {
    const today = dayStartOf(Date.now());
    if (d != null && d >= today) d = null;
    if (d != null && d < this.minDay()) d = this.minDay();
    if (d === this.day) return;
    this.day = d; this.hourView = null; this.pinned = null; this.hover = null; this.status = 'loading';
    this.load();
  }
  minDay() {
    const floor = dayStartOf(Date.now() - 365 * 86400000);
    if (isDemo()) return dayStartOf(Date.now() - 60 * 86400000);
    return channelStart ? Math.max(floor, dayStartOf(channelStart)) : floor;
  }
  prevDay() { const base = this.day != null ? this.day : dayStartOf(Date.now()); this.setDay(dayStartOf(base - 12 * 3600000)); }
  nextDay() { if (this.day != null) this.setDay(dayStartOf(this.day + 36 * 3600000)); }

  // ---------- вибір датчика, кільце ----------
  select(i) {
    if (this.moved) { this.moved = false; return; }
    this.sel = this.sel === i ? null : i;
    this.dYaw = 0; this.dPitch = 0; this.hover = null; this.pinned = null; this.hourView = null;
  }
  deselect() {
    this.sel = null; this.dYaw = 0; this.dPitch = 0; this.hover = null; this.pinned = null; this.hourView = null;
  }
  openHour() {
    let k = 23;
    const d0 = this.data[this.sel];
    if (this.pinned != null) for (let q = 0; q < 24; q++) if (d0[q].hd === this.pinned) k = q;
    this.dayPinned = this.pinned;
    this.hourView = k; this.pinned = null; this.hover = null;
  }
  closeHour() {
    this.hourView = null; this.pinned = this.dayPinned != null ? this.dayPinned : null; this.hover = null;
  }
  toggleHour() { this.hourView != null ? this.closeHour() : this.openHour(); }
  toggleMetric() { this.metric = this.metric === 'h' ? 't' : 'h'; this.hover = null; this.pinned = null; }
  pin(k) { this.pinned = this.pinned === k ? null : k; }
  setHover(k) { if (this.hover !== k) this.hover = k; }

  // ---------- вікно ключа ----------
  showSetup(msg) {
    this.setup.err = msg || '';
    this.setup.key = getKey();
    this.setup.cancel = !!getKey() && !msg;   // «Скасувати» — лише коли ключ уже робочий
    this.setup.open = true;
  }
  hideSetup() { this.setup.open = false; }
  submitKey(v) {
    v = (v || '').trim();
    if (!v) { this.setup.err = 'Вставте ключ.'; return; }
    saveKey(v);
    this.hideSetup();
    this.status = 'loading';
    this.load();
  }
}
