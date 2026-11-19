<!-- Огляд, коли датчик не вибрано: зв'язок датчиків (світло — на смузі доби вгорі сторінки) -->
<script>
  import { SENSORS } from '../lib/config.js';
  import { hm } from '../lib/utils.js';
  import { sensorName } from '../lib/data.js';
  import { agoText } from '../lib/events.js';

  let { store } = $props();

  const links = $derived(SENSORS.map((s, i) => {
    const arr = store.raw[i], last = arr.length ? arr[arr.length - 1].ts : null;
    const age = last ? store.now - last : Infinity, archive = store.archive;
    const color = archive ? 'var(--text-4)' : age < 15 * 60000 ? 'var(--st-live)' : age < 60 * 60000 ? 'var(--st-stale)' : 'var(--st-error)';
    return { name: sensorName(i), color, online: !archive && age < 15 * 60000,
             ago: last ? (archive ? hm(last) : agoText(last)) : '—', agoColor: !archive && age >= 15 * 60000 ? color : 'var(--text-3)' };
  }));
  const linkMeta = $derived(store.archive ? '' : links.filter((l) => l.online).length + '/' + SENSORS.length + ' НА ЗВ’ЯЗКУ');
</script>

<section class="glass ov">
  <h2 class="ov-h">Огляд</h2>
  <div class="ov-sec">
    <div class="ov-eyebrow"><span>{store.archive ? 'ОСТАННІ ЗАПИСИ ДОБИ' : 'ЗВ’ЯЗОК ДАТЧИКІВ'}</span><span>{linkMeta}</span></div>
    <div class="ov-links">
      {#each links as l}
        <div class="ov-link"><span class="ov-dot" style:background={l.color}></span><span class="ov-name">{l.name}</span><span class="ov-ago" style:color={l.agoColor}>{l.ago}</span></div>
      {/each}
    </div>
  </div>
</section>

<style>
  .ov { display: flex; flex-direction: column; gap: 16px; padding: 18px; border-radius: var(--r-lg); }
  .ov-h { margin: 0; font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); }
  .ov-sec { display: flex; flex-direction: column; gap: 10px; }
  .ov-eyebrow { display: flex; justify-content: space-between; gap: 8px; font-family: var(--font-data); font-size: 10px; font-weight: 500; letter-spacing: .1em; color: var(--text-4); }
  .ov-links { display: flex; flex-direction: column; gap: 9px; }
  .ov-link { display: flex; align-items: center; gap: 10px; font-size: 14px; }
  .ov-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
  .ov-name { color: var(--text-2); }
  .ov-ago { margin-left: auto; font-family: var(--font-data); font-size: 12px; }
</style>
