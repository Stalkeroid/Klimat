<!-- Смуга доби над шапкою: коли було світло за день, вибраний у шапці.
     24 шматочки по годині: бурштин — світло є, сіро-синій — немає, тонкий пунктир — невідомо (немає даних).
     Дані — store.power (lib/power.js, визначення за батареєю). -->
<script>
  import { hm } from '../lib/utils.js';
  import { dayStartOf } from '../lib/data.js';

  let { store } = $props();

  const DAY = 86400000;
  const pct = (ms) => (ms / DAY * 100).toFixed(3) + '%';

  const v = $derived.by(() => {
    const from = store.archive ? store.day : dayStartOf(store.now);
    const end = store.archive ? from + DAY : store.now;
    const segs = store.power.segs.filter((s) => s.s !== 'on')
      .map((s) => ({ l: pct(s.a - from), w: pct(s.b - s.a), s: s.s }));
    const offMs = store.power.segs.reduce((n, s) => n + (s.s === 'off' ? s.b - s.a : 0), 0);
    const h = Math.floor(offMs / 3600000), m = Math.round(offMs % 3600000 / 60000);
    return {
      segs,
      fut: store.archive ? null : pct(from + DAY - end),
      now: store.archive ? null : pct(end - from),
      label: 'Світло за добу: без світла ' + (offMs ? (h ? h + ' год ' : '') + m + ' хв' : 'не було') + (store.archive ? '' : ', зараз ' + hm(end))
    };
  });
  const hours = Array.from({ length: 23 }, (_, k) => pct((k + 1) * 3600000));
  const labels = Array.from({ length: 9 }, (_, k) => ({ l: pct(k * 3 * 3600000), t: String(k * 3).padStart(2, '0'), x: k === 0 ? 'none' : k === 8 ? 'translateX(-100%)' : 'translateX(-50%)' }));
</script>

<div class="strip" role="img" aria-label={v.label} title={v.label}>
  <div class="bar">
    {#each v.segs as s}
      <span class="seg {s.s}" style:left={s.l} style:width={s.w}></span>
    {/each}
    {#if v.fut}<span class="fut" style:width={v.fut}></span>{/if}
    {#each hours as l}<span class="cut" style:left={l}></span>{/each}
  </div>
  {#if v.now}<span class="now" style:left={v.now}></span>{/if}
  {#each labels as lb}<span class="lab" style:left={lb.l} style:transform={lb.x}>{lb.t}</span>{/each}
</div>

<style>
  .strip { position: absolute; left: 32px; right: 32px; top: 2px; height: 24px; pointer-events: auto; }
  .bar { position: absolute; left: 0; right: 0; top: 4px; height: 5px; border-radius: 1px; background: var(--pw-on); overflow: hidden; }
  .seg { position: absolute; top: 0; bottom: 0; }
  .seg.off { background: var(--pw-off); }
  /* невідомо: тонкий білий пунктир по центру */
  .seg.unk { background: var(--bg) linear-gradient(90deg, var(--pw-unk) 50%, transparent 50%) 0 50% / 8px 2px repeat-x; }
  .fut { position: absolute; top: 0; bottom: 0; right: 0; background: var(--pw-future); }
  /* прорізи між годинами */
  .cut { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--bg); }
  .now { position: absolute; top: 0; width: 2px; height: 12px; margin-left: -1px; background: rgba(255,255,255,0.8); border-radius: 1px; }
  .lab { position: absolute; top: 12px; font-family: var(--font-data); font-size: 9px; line-height: 10px; color: var(--text-4); opacity: .75; }
  @media (max-width: 700px) { .strip { left: 16px; right: 16px; } }
</style>
