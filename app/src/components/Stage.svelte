<!-- Область з кімнатою: 3D-сцена (камера, обертання, зум), мітки датчиків, кільце статистики, підказка, легенда.
     Під час обертання змінюється лише трансформація камери; стіни, мітки й кільце не перераховуються. -->
<script>
  import { SENSORS } from '../lib/config.js';
  import { RW, toCss, buildRoom, OVERVIEW } from '../lib/room.js';
  import { wheel } from '../lib/actions.js';
  import Markers from './Markers.svelte';
  import Ring from './Ring.svelte';

  let { store } = $props();

  // геометрія кімнати не змінюється — будуємо один раз
  const faces = buildRoom();

  let stageEl = $state();
  let legendEl = $state();
  let stageW = $state(0);
  let stageH = $state(0);
  let anchors = $state([]);
  let settled = $state(0);   // камера доїхала — мітки ставимо ще раз точно в кінцеву точку
  function onSettle(e) { if (e.target === e.currentTarget && e.propertyName === 'transform') settled++; }

  // ---------- камера ----------
  const cam = $derived(store.sel == null ? OVERVIEW : { target: SENSORS[store.sel].pos, ...SENSORS[store.sel].cam });
  const ry = $derived(Math.max(-85, Math.min(85, cam.ry + store.dYaw)));
  const rx = $derived(Math.max(-78, Math.min(-3, cam.rx + store.dPitch)));
  const tc = $derived(toCss(cam.target));
  const camT = $derived(`translateZ(${cam.zoom}px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${-tc[0]}px,${-tc[1]}px,${-tc[2]}px)`);
  const camTr = $derived(store.dragging ? 'none' : 'transform 1.2s cubic-bezier(.65,0,.25,1)');
  const sceneScale = $derived(((store.narrow ? 0.62 : 1) * store.zoom).toFixed(3));

  // стіни, що опиняються між камерою і кімнатою, ховаємо; меблі перед вибраним датчиком — напівпрозорі
  const eyeX = $derived.by(() => {
    const dd = 1100 - cam.zoom, rxr = rx * Math.PI / 180, ryr = ry * Math.PI / 180;
    return tc[0] - dd * Math.cos(rxr) * Math.sin(ryr) + RW / 2;
  });
  const opL = $derived(eyeX > 0 ? 1 : 0);
  const opR = $derived(eyeX < RW ? 1 : 0);
  const opW = $derived(store.sel === 3 ? 0.16 : 1);
  const opD = $derived(store.sel === 1 || store.sel === 2 ? 0.16 : 1);

  // ---------- жести: обертання, зум, тап ----------
  const ptrs = {};
  let drag = null, pinch = null;

  function onDown(e) {
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    const ids = Object.keys(ptrs);
    if (ids.length >= 2) {
      const a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: store.zoom };
      drag = null; store.moved = true;
      return;
    }
    drag = { x: e.clientX, y: e.clientY, dy: store.dYaw, dp: store.dPitch };
    store.moved = false;
  }
  function onMove(e) {
    if (ptrs[e.pointerId]) ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pinch) {
      const ids = Object.keys(ptrs);
      if (ids.length >= 2) {
        const a = ptrs[ids[0]], b = ptrs[ids[1]];
        store.zoom = Math.max(1, Math.min(2, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
      }
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    // поріг, після якого це вже обертання, а не тап (палець тремтить сильніше за мишу)
    if (!store.moved && Math.abs(dx) + Math.abs(dy) < (e.pointerType === 'mouse' ? 5 : 12)) return;
    store.moved = true;
    store.dragging = true;
    store.dYaw = drag.dy + dx * 0.25;
    store.dPitch = drag.dp - dy * 0.2;
  }
  function onUp(e) {
    if (e && e.pointerId != null) delete ptrs[e.pointerId];
    if (Object.keys(ptrs).length < 2) pinch = null;
    drag = null;
    if (store.dragging) store.dragging = false;
  }
  function onWheel(e) {
    e.preventDefault();
    const z = Math.max(1, Math.min(2, store.zoom * Math.exp(-e.deltaY * 0.0015)));
    if (z !== store.zoom) store.zoom = z;
  }
  // тап по порожньому місцю закриває статистику (мітки й кільце зупиняють спливання самі)
  function onClick() {
    if (store.moved) { store.moved = false; return; }
    if (store.sel != null) store.deselect();
  }

  // легенда: граничні значення активного режиму — білі; поки датчик не вибрано — обидві сірі
  const lgT = $derived(store.sel != null && store.metric === 't' ? 'var(--text)' : 'var(--text-3)');
  const lgH = $derived(store.sel != null && store.metric === 'h' ? 'var(--text)' : 'var(--text-3)');
  const hint = $derived(store.sel == null ? 'Перетягніть — обертати · колесо або два пальці — масштаб · натисніть на датчик' : 'Натисніть на поділку, щоб закріпити · поза кільцем — назад до кімнати');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="stage" bind:this={stageEl} bind:clientWidth={stageW} bind:clientHeight={stageH}
     onclick={onClick} onpointerdown={onDown} onpointermove={onMove} onpointerup={onUp} onpointerleave={onUp} onpointercancel={onUp}
     use:wheel={onWheel} style:cursor={store.dragging ? 'grabbing' : 'grab'}>
  <div class="stage-bg" aria-hidden="true"></div>

  <div class="scene" style:scale={sceneScale} style:transform={camT} style:transition={camTr}
       style:--op-L={opL} style:--op-R={opR} style:--op-W={opW} style:--op-D={opD}>
    {#each faces as f}
      <div class="face" style:width="{f.w}px" style:height="{f.h}px" style:transform={f.t} style:background={f.bg}
           style:background-image={f.img} style:background-size={f.bs} style:background-position={f.bp}
           style:opacity={f.g ? `var(--op-${f.g})` : null}></div>
    {/each}
  </div>

  <!-- невидимі «якорі» датчиків у 3D: за ними стежить шар міток -->
  <div class="scene anchors" style:scale={sceneScale} style:transform={camT} style:transition={camTr} ontransitionend={onSettle}>
    {#each SENSORS as s, i}
      {@const c = toCss(s.pos)}
      <div class="anchor" bind:this={anchors[i]} style:transform="translate3d({c[0]}px,{c[1]}px,{c[2]}px)"></div>
    {/each}
  </div>

  <Markers {store} {stageEl} {anchors} camKey={camT + sceneScale + store.vw} {settled} />

  {#if store.sel != null}
    <Ring {store} {stageEl} {legendEl} {stageW} {stageH} />
  {/if}

  <div class="hint">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"></path><path d="M21 4v5h-5"></path></svg>
    {hint}
  </div>
  <div class="legend" bind:this={legendEl}>
    <span class="legend-item"><span class="lg-lab" style:color={lgH}>0%</span><span class="legend-bar hum"></span><span class="lg-lab" style:color={lgH}>100%</span></span>
    <span class="legend-item"><span class="lg-lab" style:color={lgT}>0°</span><span class="legend-bar temp"></span><span class="lg-lab" style:color={lgT}>60°</span></span>
  </div>
</div>

<style>
  .stage { flex: 999 1 640px; min-width: 0; height: 720px; position: relative; overflow: hidden; border-radius: var(--r-lg); background: transparent; border: 1px solid var(--stroke); perspective: 1100px; touch-action: none; user-select: none; }
  .stage-bg { position: absolute; inset: 0; background: var(--surface); box-shadow: inset 0 1px 0 var(--highlight); pointer-events: none; }

  .scene { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d; }
  .scene > :global(*) { transform-style: preserve-3d; }
  .anchors { z-index: 2; }
  .face { position: absolute; left: 0; top: 0; transform-origin: 0 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; pointer-events: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.045); transition: opacity .25s; }
  .anchor { position: absolute; left: -1px; top: -1px; width: 2px; height: 2px; pointer-events: none; }

  .hint { position: absolute; left: 20px; bottom: 18px; z-index: 5; display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-3); pointer-events: none; }
  .legend { position: absolute; right: 20px; bottom: 16px; z-index: 5; display: flex; align-items: center; gap: 18px; font-family: var(--font-data); font-size: 11px; color: var(--text-3); pointer-events: none; }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .lg-lab { transition: color .2s; }
  .legend-bar { display: block; width: 120px; height: 8px; border-radius: var(--r-xs); }
  /* кольори шкал — ті самі, що STOPS/HSTOPS у lib/utils.js */
  .legend-bar.hum { background: linear-gradient(90deg, rgb(245,150,60) 0.0%, rgb(245,205,140) 30.0%, rgb(232,222,208) 40.0%, rgb(120,175,245) 50.0%, rgb(60,120,240) 70.0%, rgb(100,80,230) 100.0%); }
  .legend-bar.temp { background: linear-gradient(90deg, rgb(45,95,235) 0.0%, rgb(60,150,245) 20.0%, rgb(172,198,242) 31.0%, rgb(240,224,204) 35.0%, rgb(252,175,85) 42.0%, rgb(248,118,48) 53.3%, rgb(228,45,55) 100.0%); }

  @media (max-width: 700px) {
    .stage { height: 464px; }
    .legend { left: 14px; right: 14px; bottom: 12px; gap: 14px; }
    .legend-item { flex: 1 1 0; min-width: 0; }
    .legend-bar { flex: 1 1 auto; width: auto; }
    .hint { display: none; }
  }
</style>
