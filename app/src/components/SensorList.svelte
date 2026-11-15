<!-- Список датчиків праворуч: колір і значення, спарклайн за 24 год, вологість -->
<script>
  import { SENSORS } from '../lib/config.js';
  import { fmt, tempColor, finite } from '../lib/utils.js';
  import { sensorName } from '../lib/data.js';

  let { store } = $props();

  // від даних — спарклайни й значення; від вибору — лише підсвітка (окремо, щоб клік не перебудовував графіки)
  const rows = $derived(SENSORS.map((s, i) => {
    const d = store.data[i], fin = finite(d.map((p) => p.t));
    const mn = fin.length ? Math.min(...fin) : 0, mx = fin.length ? Math.max(...fin) : 1;
    const span = Math.max(0.5, mx - mn);
    const spark = fin.length ? d.map((p, k) => (2 + k * 68 / 23).toFixed(1) + ',' + (23 - (p.t - mn) / span * 20).toFixed(1)).join(' ') : '';
    const t = store.cur[i], h = store.hum[i];
    return { name: sensorName(i), temp: fmt(t), color: tempColor(t), spark, hum: isFinite(h) ? 'Н: ' + Math.round(h) + '%' : '' };
  }));

  function pick(i) { store.moved = false; store.select(i); }
</script>

<div class="list">
  {#each rows as s, i}
    {@const on = store.sel === i}
    <button class="list-btn" class:on onclick={() => pick(i)} aria-pressed={on ? 'true' : 'false'}>
      <span class="dot" style:background={s.color} style:box-shadow="0 0 12px {s.color}"></span>
      <span class="name-col"><span class="name">{s.name}</span></span>
      <svg width="72" height="26" viewBox="0 0 72 26" aria-hidden="true"><polyline points={s.spark} fill="none" stroke={s.color} stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"></polyline></svg>
      <span class="vals">
        <span class="temp">{s.temp}</span>
        <span class="hum">{s.hum}</span>
      </span>
    </button>
  {/each}
</div>

<style>
  .list { display: flex; flex-direction: column; gap: 8px; }
  .list-btn { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 64px; padding: 10px 14px; text-align: left; cursor: pointer; border-radius: var(--r-md); color: var(--text); font-family: var(--font-text);
    background: var(--surface); border: 1px solid var(--stroke); box-shadow: inset 0 1px 0 var(--highlight); transition: background .15s, border-color .15s; }
  .list-btn.on { background: var(--accent-soft); border-color: var(--accent-line); }
  .list-btn:hover { border-color: var(--stroke-strong); }
  .list-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  .dot { flex: none; width: 12px; height: 12px; border-radius: 50%; }
  .name-col { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .name { font-size: 14px; font-weight: 600; }
  svg { flex: none; }
  .vals { flex: none; width: 62px; text-align: right; display: flex; flex-direction: column; gap: 1px; }
  .temp { font-family: var(--font-num); font-size: 19px; font-weight: 600; }
  .hum { font-family: var(--font-data); font-size: 11px; color: var(--cold); }
</style>
