// Ізотерми живого фону — «сутності» (лінії) і система руху.
//
// Лінія — пустишка: лише номер і сид. З сиду детермінований генератор щоразу видає той самий набір:
//   амплітуда, базова швидкість, фаза і плавна зміна швидкості в часі.
// Сама лінія невидима: як вона виглядає і як змінюється її рух — справа ефектів (lib/effects.js).
//
// Рух: біжуча хвиля — лінія малюється один раз і зсувається вправо (рахує відеокарта).
// Система руху кілька разів на секунду лише плавно коригує темп кожної лінії (playbackRate):
//   темп = власна швидкість лінії в цей момент × множник від ефектів руху (напр., «немає світла» → 0).

export const STEP = 48;          // відстань між лініями, px
export const PER = 360;          // довжина хвилі, px
export const AMP_MIN = 12, AMP_MAX = 22;   // 2·AMP_MAX < STEP — сусідні лінії ніколи не торкаються, хоч яка швидкість
export const SPEED_MIN = 6.5, SPEED_MAX = 10.5;   // базова швидкість, px/с (повільно, як і було)
export const BG_SEED = 2026;     // загальний сид фону; сид лінії k = BG_SEED + k

// ---------- детермінований генератор (mulberry32) ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// число в межах [a, b] з генератора
export const between = (r, a, b) => a + (b - a) * r();
// окремий генератор для «підпотоку» (ефекту) тієї самої лінії: той самий сид лінії + назва
export function rngFor(k, name = '') {
  let h = BG_SEED + k;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  return rng(h);
}

// ---------- атрибути лінії ----------
const cache = new Map();
export function lineAttrs(k) {
  if (cache.has(k)) return cache.get(k);
  const r = rngFor(k);
  const a = {
    amp: between(r, AMP_MIN, AMP_MAX),
    speed: between(r, SPEED_MIN, SPEED_MAX),
    phase: between(r, 0, PER),
    // повільна зміна швидкості: дві довгі хвилі з власними періодами (3–7 хв і 1,5–3,5 хв)
    m1: { amp: between(r, 0.2, 0.35), T: between(r, 180, 420), p: between(r, 0, Math.PI * 2) },
    m2: { amp: between(r, 0.08, 0.15), T: between(r, 90, 210), p: between(r, 0, Math.PI * 2) }
  };
  cache.set(k, a);
  return a;
}
// власна швидкість лінії в момент t (с), px/с — плавна, без ривків
export function lineSpeed(k, t) {
  const a = lineAttrs(k);
  return a.speed * (1 + a.m1.amp * Math.sin(2 * Math.PI * t / a.m1.T + a.m1.p) + a.m2.amp * Math.sin(2 * Math.PI * t / a.m2.T + a.m2.p));
}
// контур лінії k на ширину width
export function linePath(k, width) {
  const { amp } = lineAttrs(k), y = -20 + k * STEP;
  let d = `M0 ${y}`;
  for (let x = 0; x < width; x += PER) d += ` C${x + PER / 3} ${(y - amp).toFixed(1)} ${x + 2 * PER / 3} ${(y + amp).toFixed(1)} ${x + PER} ${y}`;
  return { k, y, d, top: Math.floor(y - AMP_MAX - 2), h: 2 * AMP_MAX + 4 };
}

// ---------- система руху ----------
// Анімація лінії: зсув на одну довжину хвилі за PER·1000 мс при playbackRate = 1, тобто playbackRate = px/с.
const tracks = new Map();            // k → Animation
const offsets = new Map();           // k → останній зсув (px) — щоб після зміни розміру лінія продовжила з того ж місця
const rates = new Map();             // k → поточний темп
const modifiers = new Map();         // назва → { factor, ease, priority }
let timer = null;

export function registerTrack(k, el) {
  const anim = el.animate([{ transform: `translateX(${-PER}px)` }, { transform: 'translateX(0)' }], { duration: PER * 1000, iterations: Infinity });
  const off = offsets.has(k) ? offsets.get(k) : lineAttrs(k).phase;
  anim.currentTime = off * 1000;
  const r = rates.has(k) ? rates.get(k) : lineSpeed(k, performance.now() / 1000) * factor();
  anim.playbackRate = r; rates.set(k, r);
  tracks.set(k, anim);
  if (!timer) timer = setInterval(tick, 250);
  return () => { offsets.set(k, (anim.currentTime / 1000) % PER); anim.cancel(); tracks.delete(k); };
}

// множник від ефектів руху: діє ефект з найвищим старшинством
function active() {
  let best = null;
  for (const m of modifiers.values()) if (!best || m.priority > best.priority) best = m;
  return best;
}
const factor = () => { const m = active(); return m ? m.factor : 1; };

// ефект руху: name — назва, m — { factor, ease (с, наскільки плавно), priority } або null, щоб зняти
export function setMotion(name, m) {
  if (m) modifiers.set(name, m); else modifiers.delete(name);
}

function tick() {
  const t = performance.now() / 1000, m = active(), f = m ? m.factor : 1, ease = m ? m.ease : 4;
  // рівномірне гальмування/розгін: з максимальної швидкості до нуля (і назад) рівно за ease секунд
  const maxStep = SPEED_MAX * 1.5 / ease * 0.25;
  for (const [k, anim] of tracks) {
    const target = lineSpeed(k, t) * f, cur = rates.get(k);
    const next = cur + Math.max(-maxStep, Math.min(maxStep, target - cur));
    // дрібні зміни не застосовуємо — повільна зміна темпу оновлюється приблизно раз на секунду, а гальмування — плавно щокроку
    if (Math.abs(next - cur) >= 0.05 || (next === 0 && cur !== 0)) { anim.updatePlaybackRate(next); rates.set(k, next); }
  }
}
