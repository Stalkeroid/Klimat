<!-- Огляд, коли датчик не вибрано: подія опалення + зв'язок датчиків -->
<script>
  import { SENSORS } from '../lib/config.js';
  import { hm, dayLabel } from '../lib/utils.js';
  import { dayStartOf, sensorName } from '../lib/data.js';
  import { HEAT_WINDOW, HEAT_SLOPE, heatingState, agoText } from '../lib/events.js';

  let { store } = $props();

  const heatIdx = SENSORS.findIndex((s) => s.role === 'heater');

  const heat = $derived.by(() => {
    if (heatIdx < 0) return null;
    const h = heatingState(store.raw[heatIdx]);
    const ref = store.archive ? store.day : store.now;
    const since = h.since ? (dayStartOf(h.since) === dayStartOf(ref) ? hm(h.since) : dayLabel(h.since) + ' ' + hm(h.since)) : '';
    return {
      state: h.on == null ? 'НЕВІДОМО' : (h.on ? 'УВІМК' : 'ВИМК') + (since ? ' · ' + since : ''),
      color: h.on ? 'var(--warm)' : 'var(--text-3)',
      icon: h.on ? 'var(--warm)' : 'var(--text-4)',
      title: 'Визначається за датчиком «' + sensorName(heatIdx) + '»: нахил тренду за ' + (HEAT_WINDOW / 60000) + ' хв ≥ ±' + HEAT_SLOPE + ' °C/год' + (h.byLevel ? '. Останній стан виправлено за рівнем температури (запобіжник)' : '')
    };
  });

  const links = $derived(SENSORS.map((s, i) => {
    const arr = store.raw[i], last = arr.length ? arr[arr.length - 1].ts : null;
    const age = last ? store.now - last : Infinity, archive = store.archive;
    const color = archive ? 'var(--text-4)' : age < 15 * 60000 ? 'var(--st-live)' : age < 60 * 60000 ? 'var(--st-stale)' : 'var(--st-error)';
    return { name: sensorName(i), color, online: !archive && age < 15 * 60000,
             ago: last ? (archive ? hm(last) : agoText(last)) : '—', agoColor: !archive && age >= 15 * 60000 ? color : 'var(--text-3)' };
  }));
  const linkMeta = $derived(store.archive ? '' : links.filter((l) => l.online).length + '/' + SENSORS.length + ' НА ЗВ’ЯЗКУ');
</script>

<!-- два незалежні блоки — подія опалення і зв'язок датчиків — розділені тонкою лінією з підписами -->
<section class="glass ov">
  <h2 class="ov-h">Огляд</h2>
  {#if heat}
  <div class="ov-sec">
    <div class="ov-eyebrow"><span>ПОДІЇ</span></div>
    <div class="ov-heat tile" title={heat.title}>
      <span class="ov-heat-name" style:color={heat.icon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.8 2.5-5 .3 1.6 1 2.6 2 3 0-3 .2-5.5.5-8z"></path></svg><span class="txt">Опалення</span></span>
      <span class="ov-heat-st" style:color={heat.color}>{heat.state}</span>
    </div>
  </div>
  {/if}
  <div class="ov-sec">
    <div class="ov-eyebrow"><span>{store.archive ? 'ОСТАННІ ЗАПИСИ ДОБИ' : 'ЗВ’ЯЗОК ДАТЧИКІВ'}</span><span>{linkMeta}</span></div>
    <div class="ov-links">
      {#each links as l}
        <div class="ov-link"><span class="ov-dot" style:background={l.color}></span><span class="ov-name">{l.name}</span><span class="ov-ago" style:color={l.agoColor}>{l.ago}</span></div>
      {/each}
    </div>
  </div>
  <p class="ov-hint">Оберіть датчик у кімнаті або в списку, щоб побачити кільце й графік.</p>
</section>

<style>
  .ov { display: flex; flex-direction: column; gap: 16px; padding: 18px; border-radius: var(--r-lg); }
  .ov-h { margin: 0; font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); }
  .ov-sec { display: flex; flex-direction: column; gap: 10px; }
  .ov-sec + .ov-sec { border-top: 1px solid var(--stroke); padding-top: 14px; }
  .ov-eyebrow { display: flex; justify-content: space-between; gap: 8px; font-family: var(--font-data); font-size: 10px; font-weight: 500; letter-spacing: .1em; color: var(--text-4); }
  .ov-heat { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; min-height: 44px; box-sizing: border-box; }
  .ov-heat-name { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
  .txt { color: var(--text); }
  .ov-heat-st { font-family: var(--font-data); font-size: 12px; font-weight: 500; letter-spacing: .08em; white-space: nowrap; }
  .ov-links { display: flex; flex-direction: column; gap: 9px; }
  .ov-link { display: flex; align-items: center; gap: 10px; font-size: 14px; }
  .ov-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
  .ov-name { color: var(--text-2); }
  .ov-ago { margin-left: auto; font-family: var(--font-data); font-size: 12px; }
  .ov-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--text-4); }
</style>
