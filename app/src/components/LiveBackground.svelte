<!-- Живий фон: ізотерми повільно пливуть зліва направо, кожна зі своїм темпом.
     Стани (наживо):
       • світла немає — лінії зупиняються й стають пунктирними;
       • батарея гріє — уздовж тих самих ліній біжать теплі хвилі з хвостом, сильніші біля лівого краю;
       • прийшов новий замір — по лініях один раз пробігає світла хвиля.
     Усі рухи — лише transform і маски (рахує відеокарта, без перемальовування кадрів). -->
<script>
  import { BG_ANIMATE } from '../lib/config.js';

  let { store } = $props();

  // геометрія: 2·AMP < STEP — сусідні лінії ніколи не торкаються, хоч як розійдуться їхні фази
  const STEP = 48, AMP = 19, PER = 360, SHIFT = 1440;          // SHIFT — 4 періоди хвилі
  const DUR = 170;                                              // середній час, за який лінія зсувається на SHIFT, с

  // відтворювані «випадкові» фази й темпи (однакові після перезавантаження)
  let seed = 11;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const PHASE = Array.from({ length: 80 }, rnd);
  const HEAT = Array.from({ length: 80 }, () => [7.5 + rnd() * 5, rnd() * 12]);

  let vh = $state(window.innerHeight);
  const width = $derived(Math.ceil((store.vw + SHIFT) / PER) * PER);
  const lines = $derived.by(() => {
    const n = Math.ceil((vh + 2 * AMP) / STEP) + 1, out = [];
    for (let k = 0; k < n; k++) {
      const y = -20 + k * STEP;
      let d = `M0 ${y}`;
      for (let x = 0; x < width; x += PER) d += ` C${x + PER / 3} ${y - AMP} ${x + 2 * PER / 3} ${y + AMP} ${x + PER} ${y}`;
      out.push({ y, d, odd: k % 2 === 1, phase: PHASE[k % 80], hd: HEAT[k % 80][0], hph: HEAT[k % 80][1] });
    }
    return out;
  });

  // стани
  const off = $derived(!store.archive && store.power.state === 'off');
  const heat = $derived(store.heating);

  // хвиля нового заміру: лише коли наживо прийшли свіжіші дані (не на першому завантаженні)
  // лінії хвилі з'являються пізніше за основні — зсуваємо їхню анімацію на прожитий час, щоб вони збігались
  let pulse = $state(0), pulseEl = $state(0), prevTs = null, t0 = performance.now();
  $effect(() => { lines; t0 = performance.now(); });
  $effect(() => {
    const ts = store.lastTs;
    if (!store.archive && prevTs != null && ts != null && ts > prevTs) { pulseEl = (performance.now() - t0) / 1000; pulse++; }
    prevTs = store.archive ? null : ts;
  });
</script>

<svelte:window bind:innerHeight={vh} />

<div class="bg" class:off class:still={!BG_ANIMATE} aria-hidden="true" style:--dur="{DUR}s">
  {#each lines as l}
    <div class="line" style:top="{l.y - AMP - 2}px" style:--ph={l.phase}>
      <svg width={width} height={2 * AMP + 4} viewBox="0 {l.y - AMP - 2} {width} {2 * AMP + 4}"><path class="base" class:odd={l.odd} d={l.d}></path></svg>
    </div>
  {/each}

  <!-- тепло: на кожній лінії «вікно» з теплою копією лінії їде зліва направо, вміст вікна стоїть на місці.
       Усе — лише transform (без перемальовування); хвіст, що згасає, — маска вікна -->
  <div class="heat" class:on={heat}>
    {#each lines as l}
      <div class="hwin" style:top="{l.y - AMP - 2}px" style:--hd="{l.hd}s" style:--hph="{-l.hph}s">
        <div class="hinv">
          <div class="line" style:--ph={l.phase}>
            <svg width={width} height={2 * AMP + 4} viewBox="0 {l.y - AMP - 2} {width} {2 * AMP + 4}"><path class="hl" class:odd={l.odd} d={l.d}></path></svg>
          </div>
        </div>
      </div>
    {/each}
  </div>

  {#key pulse}
    {#if pulse}
      <div class="pulse">
        <div class="pulse-in">
          {#each lines as l}
            <div class="line" style:top="{l.y - AMP - 2}px" style:--ph={l.phase} style:animation-delay="calc({DUR}s * {-l.phase} - {pulseEl}s)">
              <svg width={width} height={2 * AMP + 4} viewBox="0 {l.y - AMP - 2} {width} {2 * AMP + 4}"><path class="pl" d={l.d}></path></svg>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/key}
</div>

<style>
  .bg { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
  svg { display: block; overflow: visible; }
  path { fill: none; }

  /* кожна лінія — свій зсув фази; однакова крива швидкості з рівним нахилом на кінцях: без ривка на межі циклу */
  .line { position: absolute; left: 0; will-change: transform;
    animation: iso-x var(--dur) cubic-bezier(.3,.15,.7,.85) calc(var(--dur) * var(--ph) * -1) infinite; }
  @keyframes iso-x { from { transform: translateX(-1440px) } to { transform: translateX(0) } }
  .base { stroke: var(--iso-line); stroke-width: 1; }
  .base.odd { stroke: var(--iso-line-2); }

  /* світла немає: стоп і пунктир */
  .off .line { animation-play-state: paused; }
  .off .base { stroke-dasharray: 3 7; }

  /* теплі хвилі: сильніші біля лівого краю, гаснуть до середини; плавна поява/зникнення */
  .heat { position: absolute; inset: 0; opacity: 0; transition: opacity 3s;
    -webkit-mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,.7) 30%, transparent 70%); mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,.7) 30%, transparent 70%); }
  .heat.on { opacity: 1; }
  .heat:not(.on) .hwin, .heat:not(.on) .hinv { animation-play-state: paused; }
  /* вікно = тіло (315 px) + хвіст (158 px), що згасає назад */
  .hwin { position: absolute; left: 0; width: 473px; height: 42px; overflow: hidden; will-change: transform;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 158px, #000 465px, transparent 473px);
    mask-image: linear-gradient(90deg, transparent 0, #000 158px, #000 465px, transparent 473px);
    animation: hwin var(--hd) linear var(--hph) infinite; }
  .hinv { position: absolute; left: 0; top: 0; will-change: transform; animation: hinv var(--hd) linear var(--hph) infinite; }
  .hinv .line { top: 0; }
  @keyframes hwin { from { transform: translateX(-473px) } to { transform: translateX(1200px) } }
  @keyframes hinv { from { transform: translateX(473px) } to { transform: translateX(-1200px) } }
  .hl { stroke: rgba(var(--iso-heat), .6); stroke-width: 1.6; }
  .hl.odd { stroke: rgba(var(--iso-heat), .42); }

  /* хвиля нового заміру: вузьке «вікно» їде зліва направо, вміст усередині стоїть на місці */
  .pulse { position: absolute; left: 0; top: 0; width: 240px; height: 100%; overflow: hidden; animation: pw 3.4s cubic-bezier(.4,0,.2,1) both; }
  .pulse-in { position: absolute; left: 0; top: 0; width: 100vw; height: 100%; animation: pwi 3.4s cubic-bezier(.4,0,.2,1) both; }
  @keyframes pw { from { transform: translateX(-300px) } to { transform: translateX(calc(100vw + 60px)) } }
  @keyframes pwi { from { transform: translateX(300px) } to { transform: translateX(calc(-100vw - 60px)) } }
  .pl { stroke: rgba(255,255,255,.28); stroke-width: 1.2; }
  .off .pl { stroke-dasharray: 3 7; }

  .still .line, .still path { animation: none !important; }
  @media (prefers-reduced-motion: reduce) { .line, path, .pulse, .pulse-in { animation: none !important; } .pulse { display: none; } }
</style>
