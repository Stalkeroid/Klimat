<!-- Мітки датчиків: плаский шар поверх кімнати, завжди одного розміру й чіткі.
     Положення беремо з невидимих 3D-якорів (Stage) і оновлюємо лише поки камера рухається. -->
<script>
  import { untrack } from 'svelte';
  import { SENSORS } from '../lib/config.js';
  import { fmt, tempColor } from '../lib/utils.js';
  import { sensorName } from '../lib/data.js';
  import { layoutMarkers } from '../lib/markers.js';

  // camKey — рядок, що змінюється разом із камерою: сигнал «пора перерахувати положення»
  let { store, stageEl, anchors, camKey, settled } = $props();

  const STALE_MS = 15 * 60000;
  let tags = $state([]);
  let pos = $state(SENSORS.map(() => null));   // [{ x, y, z, behind }] — екранні координати

  const items = $derived(SENSORS.map((s, i) => {
    const arr = store.raw[i], t = store.cur[i];
    const stale = !store.archive && (!arr.length || store.now - arr[arr.length - 1].ts > STALE_MS);
    const name = sensorName(i), isSel = store.sel === i;
    return {
      name, temp: fmt(t), color: tempColor(t), stale,
      op: isSel ? 0 : (store.sel == null ? 1 : 0.55), pe: isSel ? 'none' : 'auto',
      aria: name + ', ' + fmt(t) + (stale ? ', дані застарілі' : '') + '. Показати графік'
    };
  }));

  function place() {
    if (!stageEl || anchors.some((a) => !a)) return;
    pos = layoutMarkers(stageEl, anchors, tags, SENSORS.map((s, i) => store.sel !== i));
  }

  // під час плавного переходу камери (1.2 с) — щокадру, потім цикл зупиняється
  let until = 0, looping = false;
  function track(ms) {
    until = Math.max(until, performance.now() + ms);
    place();
    if (looping) return;
    looping = true;
    const loop = () => {
      place();
      if (performance.now() < until) requestAnimationFrame(loop);
      else looping = false;
    };
    loop();
  }

  // камера, вибір, підписи (ширина табличок) або розмір вікна змінились → стежимо за якорями
  $effect(() => {
    camKey; items; store.vw;
    const ms = store.dragging ? 200 : 1400;
    queueMicrotask(() => track(ms));
  });

  // перехід камери завершився — фінальне положення (останній кадр циклу міг трохи не дотягнути)
  $effect(() => { if (settled) untrack(place); });

  function pick(e, i) { e.stopPropagation(); store.select(i); }
</script>

<div class="mk-layer" aria-label="Датчики в кімнаті">
  {#each items as m, i}
    {@const p = pos[i]}
    <div class="mk" class:mk--stale={m.stale} class:mk--behind={p?.behind} style:--c={m.color} style:opacity={m.op}
         style:transform={p ? `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)` : null} style:z-index={p ? p.z : null}>
      <span class="mk-lead"></span>
      <button class="mk-tag" type="button" bind:this={tags[i]} onclick={(e) => pick(e, i)} aria-label={m.aria} style:pointer-events={m.pe}><span class="mk-name">{m.name}</span><span class="mk-val">{m.temp}</span></button>
      <button class="mk-pt" type="button" tabindex="-1" onclick={(e) => pick(e, i)} aria-label={m.aria} style:pointer-events={m.pe}><i></i></button>
    </div>
  {/each}
</div>

<style>
  .mk-layer { position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: hidden; }
  .mk { position: absolute; left: 0; top: 0; width: 0; height: 0; transition: opacity .4s; will-change: transform; }
  /* рамка-приціл навколо точки датчика: 4 кути + точка; зона дотику 44×44 */
  .mk-pt { position: absolute; left: -22px; top: -22px; width: 44px; height: 44px; padding: 0; border: 0; background: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .mk-pt i { position: absolute; left: 50%; top: 50%; width: 22px; height: 22px; margin: -11px 0 0 -11px;
    background:
      linear-gradient(var(--c),var(--c)) left top/7px 2px, linear-gradient(var(--c),var(--c)) left top/2px 7px,
      linear-gradient(var(--c),var(--c)) right top/7px 2px, linear-gradient(var(--c),var(--c)) right top/2px 7px,
      linear-gradient(var(--c),var(--c)) left bottom/7px 2px, linear-gradient(var(--c),var(--c)) left bottom/2px 7px,
      linear-gradient(var(--c),var(--c)) right bottom/7px 2px, linear-gradient(var(--c),var(--c)) right bottom/2px 7px;
    background-repeat: no-repeat; }
  .mk-pt i::after { content: ""; position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
  /* виносна лінія від рамки до таблички (довжина — MK_LEAD у lib/markers.js) */
  .mk-lead { position: absolute; left: -.5px; bottom: 11px; width: 1px; height: var(--lead, 26px); transition: opacity .2s ease; background: linear-gradient(to top, var(--c), rgba(255,255,255,.18)); }
  /* табличка: назва + значення; кольорова смужка ліворуч; зона дотику ≥ 48 px */
  .mk-tag { position: absolute; left: 0; bottom: calc(11px + var(--lead, 26px)); transform: translateX(-50%); display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
    padding: 5px 10px 5px 12px; min-height: 40px; box-sizing: border-box; background: var(--surface-solid); border: 1px solid var(--stroke-strong); border-radius: var(--r-sm);
    box-shadow: inset 3px 0 0 var(--c); cursor: pointer; white-space: nowrap; color: var(--text); text-align: left; -webkit-tap-highlight-color: transparent; transition: border-color .15s, opacity .2s ease; }
  .mk-tag::after { content: ""; position: absolute; inset: -5px; }
  .mk-tag:hover { border-color: var(--c); }
  .mk-tag:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .mk-name { font-family: var(--font-data); font-size: 9px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: var(--text-3); line-height: 1.2; }
  .mk-val { font-family: var(--font-num); font-size: 16px; font-weight: 600; line-height: 1.15; }
  /* датчик мовчить понад 15 хв — мітка тьмяніє */
  .mk--stale .mk-val { color: var(--text-3); }
  .mk--stale .mk-pt i, .mk--stale .mk-lead { opacity: .45; }
  .mk--stale .mk-tag { box-shadow: inset 3px 0 0 var(--text-4); }
  /* задня табличка, яку перекриває ближча */
  .mk--behind .mk-tag, .mk--behind .mk-lead { opacity: .32; }
  .mk--behind .mk-tag:hover { opacity: 1; }
</style>
