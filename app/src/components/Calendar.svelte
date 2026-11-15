<!-- Календар «машини часу»: спливне вікно в стилі теми (замість системного вибору дати).
     Усі дати — мілісекунди локальної півночі. -->
<script>
  import { onMount, tick, untrack } from 'svelte';
  import { dayStartOf } from '../lib/data.js';

  let { anchor, value, min, max, onpick, onclose } = $props();

  const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
  const WD = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'];

  // вікно живе лише поки відкрите: день, з якого почали, далі не змінюється
  const sel = untrack(() => dayStartOf(value));
  let y = $state(new Date(sel).getFullYear());
  let m = $state(new Date(sel).getMonth());
  let el = $state();
  let left = $state(0), top = $state(0);

  const today = dayStartOf(Date.now());

  const lead = $derived((new Date(y, m, 1).getDay() + 6) % 7);           // тиждень з понеділка
  const days = $derived.by(() => {
    const n = new Date(y, m + 1, 0).getDate(), out = [];
    for (let d = 1; d <= n; d++) { const t = new Date(y, m, d).getTime(); out.push({ d, t, off: t < min || t > max }); }
    return out;
  });
  const prevOk = $derived(new Date(y, m, 0).getTime() >= min);
  const nextOk = $derived(new Date(y, m + 1, 1).getTime() <= max);

  function shift(k) {
    m += k;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
  }

  // під кнопкою дати, по її центру; не виходить за межі екрана
  function place() {
    if (!el) return;
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
    top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
  }

  function outside(e) { if (el && !el.contains(e.target) && !anchor.contains(e.target)) onclose(); }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); onclose(); } }

  onMount(() => {
    place();
    let off = () => {};
    const t = setTimeout(() => {
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, true);
      off = () => {
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', place);
        window.removeEventListener('scroll', place, true);
      };
      const f = el.querySelector('.cal-day[aria-pressed="true"]') || el.querySelector('.cal-day:not([disabled])');
      if (f) f.focus({ preventScroll: true });
    }, 0);
    return () => { clearTimeout(t); off(); anchor.focus?.({ preventScroll: true }); };
  });

  // після перегортання місяця висота могла змінитися
  $effect(() => { days; tick().then(place); });
</script>

<div class="cal" role="dialog" aria-label="Вибір дня" bind:this={el} style:left="{left}px" style:top="{top}px">
  <div class="cal-head">
    <button type="button" class="cal-nav" aria-label="Попередній місяць" disabled={!prevOk} onclick={() => shift(-1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>
    <span class="cal-title">{MONTHS[m]} {y}</span>
    <button type="button" class="cal-nav" aria-label="Наступний місяць" disabled={!nextOk} onclick={() => shift(1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>
  </div>
  <div class="cal-grid">
    {#each WD as w, k}<span class="cal-wd" class:cal-we={k > 4}>{w}</span>{/each}
    {#each { length: lead } as _}<span></span>{/each}
    {#each days as c (c.t)}
      <button type="button" class="cal-day" class:cal-today={c.t === today} aria-pressed={c.t === sel ? 'true' : undefined} disabled={c.off}
              aria-label="{c.d} {MONTHS[m].toLowerCase()}" onclick={() => onpick(c.t)}>{c.d}</button>
    {/each}
  </div>
  <div class="cal-foot"><button type="button" class="cal-today-btn" disabled={sel === today} onclick={() => onpick(null)}>Сьогодні · наживо</button></div>
</div>

<style>
  .cal { position: fixed; z-index: 60; width: 300px; box-sizing: border-box; padding: 12px; background: var(--surface-solid); border: 1px solid var(--stroke); border-radius: var(--r-lg); box-shadow: inset 0 1px 0 var(--highlight), 0 18px 40px rgba(0,0,0,.55); color: var(--text); font-family: var(--font-text); animation: calIn .14s ease-out; }
  @keyframes calIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }
  .cal-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
  .cal-title { font-family: var(--font-display); font-size: 15px; font-weight: 600; }
  .cal-nav { width: 40px; height: 36px; display: flex; align-items: center; justify-content: center; padding: 0; border: 1px solid var(--stroke); background: transparent; color: var(--text-2); border-radius: var(--r-sm); cursor: pointer; }
  .cal-nav:hover { background: var(--button); }
  .cal-nav:disabled { opacity: .3; cursor: default; }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
  .cal-wd { text-align: center; font-family: var(--font-data); font-size: 10px; letter-spacing: .08em; color: var(--text-4); padding: 4px 0; }
  .cal-we { color: var(--text-3); }
  .cal-day { height: 38px; padding: 0; border: 1px solid transparent; background: transparent; color: var(--text); border-radius: var(--r-sm); font-family: var(--font-num); font-size: 14px; font-weight: 500; cursor: pointer; transition: background .1s; }
  .cal-day:hover { background: var(--button-hover); }
  .cal-day:disabled { color: var(--text-4); opacity: .45; cursor: default; background: transparent; }
  .cal-today { border-color: var(--stroke-strong); }
  .cal-day[aria-pressed="true"] { background: var(--accent); color: var(--bg); font-weight: 700; }
  .cal-day:focus-visible, .cal-nav:focus-visible, .cal-today-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .cal-foot { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--stroke); }
  .cal-today-btn { width: 100%; height: 40px; border: 1px solid var(--stroke); background: transparent; color: var(--text-2); border-radius: var(--r-sm); font-family: var(--font-data); font-size: 12px; letter-spacing: .06em; cursor: pointer; }
  .cal-today-btn:hover { background: var(--button); }
  .cal-today-btn:disabled { opacity: .35; cursor: default; }
</style>
