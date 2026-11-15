<!-- Шапка: назва + стан ліворуч, перемикач дня («машина часу») над правою колонкою -->
<script>
  import { hm, dayLabel, weekday } from '../lib/utils.js';
  import { dayStartOf, isDemo } from '../lib/data.js';
  import Calendar from './Calendar.svelte';

  let { store } = $props();

  // індикатор стану: стан + час останніх даних
  // демо чи ні — визначає збережений ключ; після зміни ключа статус проходить через «завантаження», тож перераховується
  const demo = $derived((store.status, isDemo()));
  const badge = $derived.by(() => {
    const st = store.status, last = store.lastTs;
    const tLast = last ? ' · ' + hm(last) : '';
    if (st === 'ok' && store.archive) return { text: (demo ? 'ДЕМО · ' : '') + 'АРХІВ', color: 'var(--st-archive)' };   // дата — у перемикачі поруч
    if (st === 'ok' && demo) return { text: 'ДЕМО · ВИПАДКОВІ ДАНІ', color: 'var(--st-demo)' };
    if (st === 'loading') return { text: 'ЗАВАНТАЖЕННЯ', color: 'var(--st-loading)' };
    if (st === 'ok' && last && store.now - last < 15 * 60000) return { text: 'НАЖИВО' + tLast, color: 'var(--st-live)' };
    if (st === 'ok' && last) return { text: 'НЕМАЄ ДАНИХ' + tLast, color: 'var(--st-stale)' };
    if (st === 'ok') return { text: 'КАНАЛ ПОРОЖНІЙ', color: 'var(--st-stale)' };
    if (st === 'error') return { text: 'НЕМАЄ ЗВ’ЯЗКУ' + tLast, color: 'var(--st-error)' };
    return { text: 'ПОТРІБЕН КЛЮЧ', color: 'var(--st-error)' };
  });
  const badgeTitle = $derived(demo
    ?'Демо-режим: дані згенеровані випадково. Щоб підключити свій канал — «Змінити ключ ThingSpeak»'
    : store.lastTs ? 'Останні дані з ThingSpeak: ' + new Date(store.lastTs).toLocaleString('uk-UA') : 'ThingSpeak');

  // перемикач дня
  const dayBtn = $derived(store.archive ? dayLabel(store.day) + ' · ' + weekday(store.day) : 'СЬОГОДНІ');
  const prevOff = $derived((store.archive ? store.day : dayStartOf(store.now)) > store.minDay() ? 'false' : 'true');
  const nextOff = $derived(store.archive ? 'false' : 'true');

  let dayEl = $state();
  let calOpen = $state(false);
  function pick(d) { calOpen = false; store.setDay(d); }
</script>

<header class="top">
  <div class="top-left">
    <h1 class="title">Клімат кімнати</h1>
    <span class="status-chip" role="status" title={badgeTitle}><span class="dot" style:background={badge.color} style:box-shadow="0 0 8px {badge.color}"></span><span class="chip-txt">{badge.text}</span></span>
  </div>
  <div class="top-right">
    <div class="daynav" role="group" aria-label="Вибір дня">
      <button class="dn-btn" type="button" onclick={() => store.prevDay()} aria-label="Попередній день" aria-disabled={prevOff}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></button>
      <span class="dn-mid">
        <button class="dn-day" type="button" bind:this={dayEl} aria-haspopup="dialog" aria-expanded={calOpen ? 'true' : 'false'} onclick={() => (calOpen = !calOpen)} aria-label="Вибрати день: {dayBtn}">{dayBtn}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"></rect><path d="M3.5 10h17M8 3v4M16 3v4"></path></svg></button>
      </span>
      <button class="dn-btn" type="button" onclick={() => store.nextDay()} aria-label="Наступний день" aria-disabled={nextOff}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button>
    </div>
  </div>
</header>

{#if calOpen}
  <Calendar anchor={dayEl} value={store.day != null ? store.day : Date.now()} min={store.minDay()} max={dayStartOf(Date.now())} onpick={pick} onclose={() => (calOpen = false)} />
{/if}

<style>
  .top { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; }
  .top-left { flex: 999 1 640px; min-width: 0; display: flex; align-items: center; flex-wrap: nowrap; gap: 14px; }
  .top-right { flex: 1 1 340px; min-width: 0; display: flex; justify-content: center; }
  .title { flex: none; margin: 0; font-family: var(--font-display); font-size: 30px; font-weight: 700; letter-spacing: -0.01em; color: var(--text); }

  /* стан поруч із назвою: легка «пігулка», не конкурує із заголовком */
  .status-chip { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 0 1 auto; height: 30px; box-sizing: border-box; padding: 0 12px; font-family: var(--font-data); font-size: 11px; font-weight: 500; letter-spacing: .08em; color: var(--text-2); background: var(--surface); border: 1px solid var(--stroke); border-radius: var(--r-sm); box-shadow: inset 0 1px 0 var(--highlight); white-space: nowrap; }
  .dot { flex: none; width: 8px; height: 8px; border-radius: 50%; }
  .chip-txt { overflow: hidden; text-overflow: ellipsis; min-width: 0; }

  /* «машина часу»: один сегментований блок у стилі плашок; ширина сегмента дати стала — нічого не їздить */
  .daynav { display: flex; align-items: stretch; height: 40px; box-sizing: border-box; background: var(--surface); border: 1px solid var(--stroke); border-radius: var(--r-md); box-shadow: inset 0 1px 0 var(--highlight); overflow: hidden; }
  .dn-btn, .dn-day { display: flex; align-items: center; justify-content: center; gap: 8px; height: 100%; box-sizing: border-box; border: 0; background: transparent; color: var(--text-2); cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background .12s, color .12s; }
  .dn-btn { width: 44px; padding: 0; }
  .dn-mid { display: flex; border-left: 1px solid var(--stroke); border-right: 1px solid var(--stroke); }
  .dn-day { width: 150px; padding: 0 12px; font-family: var(--font-data); font-size: 12px; font-weight: 500; letter-spacing: .08em; color: var(--text); }
  .dn-day svg { color: var(--text-3); }
  .dn-btn:hover, .dn-day:hover { background: var(--button); }
  .dn-btn:active, .dn-day:active { background: var(--button-hover); }
  .dn-day[aria-expanded="true"] { background: var(--button); }
  .dn-btn[aria-disabled="true"] { color: var(--text-4); opacity: .45; pointer-events: none; }
  .dn-btn:focus-visible, .dn-day:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  @media (max-width: 700px) {
    .title { font-size: 23px; }
    .top-left { gap: 10px; }
    .status-chip { height: 28px; padding: 0 9px; font-size: 10px; letter-spacing: .06em; gap: 6px; }
  }
</style>
