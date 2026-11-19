<!-- Живий фон. Лінії-пустишки (lib/isolines.js) рухаються за своїми сидами; усе видиме — ефекти (lib/effects.js).
     Ефект вигляду — «вікно», що їде вздовж лінії в координатах екрана зі своїми швидкістю, тілом, хвостом і частотою;
     усередині вікна — копія лінії, яка рухається точно як лінія (та сама анімація й темп), тож ефект лежить рівно на ній.
     Усі рухи — transform і прозорість (рахує відеокарта); скрипт лише кілька разів на секунду коригує темп ліній. -->
<script>
  import { fade } from 'svelte/transition';
  import { BG_ANIMATE } from '../lib/config.js';
  import { STEP, PER, AMP_MAX, linePath, registerTrack, followTrack, setMotion } from '../lib/isolines.js';
  import { EFFECTS, fxParams } from '../lib/effects.js';

  let { store } = $props();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let vh = $state(window.innerHeight);
  const vw = $derived(store.vw);
  const width = $derived(Math.ceil((vw + 2 * PER) / PER) * PER);
  const lines = $derived(Array.from({ length: Math.ceil((vh + 2 * AMP_MAX) / STEP) + 1 }, (_, k) => linePath(k, width)));

  // стан для умов ефектів
  const s = $derived({ off: !store.archive && store.power.state === 'off', heating: !!store.heating });
  const heatOn = $derived(EFFECTS.heat.when(s));

  // ефекти руху: «немає світла» (і вимкнений рух) плавно зупиняють лінії
  $effect(() => {
    const o = EFFECTS.outage;
    setMotion('outage', o.when(s) ? { factor: o.factor, ease: o.ease, priority: o.priority } : null);
  });
  $effect(() => { setMotion('still', !BG_ANIMATE || reduced ? { factor: 0, ease: 0.25, priority: 100 } : null); });

  // новий замір: лише коли наживо прийшли свіжіші дані (не на першому завантаженні)
  let run = $state(0), pulseOn = $state(false), prevTs = null, pulseTimer = null;
  $effect(() => {
    const ts = store.lastTs;
    if (!store.archive && !reduced && prevTs != null && ts != null && ts > prevTs) {
      run++; pulseOn = true;
      clearTimeout(pulseTimer);
      const p = EFFECTS.pulse, sp = p.spread, longest = (vw + 60 + (p.body + p.tail) * (1 + Math.max(sp.body, sp.tail))) / (p.speed * (1 - sp.speed)) * 1000;
      pulseTimer = setTimeout(() => (pulseOn = false), longest + 200);
    }
    prevTs = store.archive ? null : ts;
  });

  // лінія: реєструється в системі руху; копія лінії в ефекті рухається точно як вона
  function track(node, k) { return { destroy: registerTrack(k, node) }; }
  function follow(node, k) { return { destroy: followTrack(k, node) }; }

  // вікно ефекту вигляду: їде в координатах екрана зі своєю швидкістю; вміст вікна (копія лінії) лежить точно на лінії
  function fx(node, { name, k, run }) {
    const e = EFFECTS[name], p = fxParams(name, k, run), inner = node.firstElementChild;
    const w = p.body + p.tail;
    node.style.width = w + 'px';
    node.style.setProperty('--tail', p.tail + 'px');
    const x0 = -w, x1 = name === 'heat' ? e.fadeTo * vw : vw + 60;
    const travel = (x1 - x0) / p.speed * 1000, cycle = travel + p.pause * 1000, q = travel / cycle;
    let a, b;
    if (name === 'heat') {
      const mid = x0 + (x1 - x0) * 0.35;
      a = node.animate([
        { offset: 0, transform: `translateX(${x0}px)`, opacity: 1 },
        { offset: q * 0.35, transform: `translateX(${mid}px)`, opacity: 0.9 },
        { offset: q, transform: `translateX(${x1}px)`, opacity: 0 },
        { offset: 1, transform: `translateX(${x1}px)`, opacity: 0 }
      ], { duration: cycle, iterations: Infinity, delay: -p.offset * cycle });
      b = inner.animate([
        { offset: 0, transform: `translateX(${-x0}px)` },
        { offset: q * 0.35, transform: `translateX(${-mid}px)` },
        { offset: q, transform: `translateX(${-x1}px)` },
        { offset: 1, transform: `translateX(${-x1}px)` }
      ], { duration: cycle, iterations: Infinity, delay: -p.offset * cycle });
    } else {
      const ease = 'cubic-bezier(.4,0,.2,1)';
      a = node.animate([{ transform: `translateX(${x0}px)` }, { transform: `translateX(${x1}px)` }], { duration: travel, easing: ease, fill: 'both' });
      b = inner.animate([{ transform: `translateX(${-x0}px)` }, { transform: `translateX(${-x1}px)` }], { duration: travel, easing: ease, fill: 'both' });
    }
    return { destroy() { a.cancel(); b.cancel(); } };
  }
</script>

<svelte:window bind:innerHeight={vh} />

{#snippet path(l, cls)}
  <svg width={width} height={l.h} viewBox="0 {l.top} {width} {l.h}"><path class={cls} class:odd={l.k % 2 === 1} d={l.d}></path></svg>
{/snippet}

<div class="bg" class:off={s.off} aria-hidden="true"
     style:--look={EFFECTS.look.color} style:--look-odd={EFFECTS.look.colorOdd} style:--look-dash={EFFECTS.look.dashedWhenOff}
     style:--heat="rgba({EFFECTS.heat.color},{EFFECTS.heat.alpha})" style:--heat-odd="rgba({EFFECTS.heat.color},{EFFECTS.heat.alphaOdd})"
     style:--pulse="rgba({EFFECTS.pulse.color},{EFFECTS.pulse.alpha})">
  {#key width + ':' + vh}
    {#each lines as l (l.k)}
      <div class="lane" style:top="{l.top}px" style:height="{l.h}px">
        <div class="track" use:track={l.k}>{@render path(l, 'look')}</div>
        {#if heatOn}
          <div class="fxwrap" transition:fade={{ duration: EFFECTS.heat.fadeMs }}>
            <div class="fx" use:fx={{ name: 'heat', k: l.k, run: 0 }}><div class="fx-in"><div class="track" use:follow={l.k}>{@render path(l, 'heat')}</div></div></div>
          </div>
        {/if}
        {#if pulseOn}
          {#key run}
            <div class="fx" use:fx={{ name: 'pulse', k: l.k, run }}><div class="fx-in"><div class="track" use:follow={l.k}>{@render path(l, 'pulse')}</div></div></div>
          {/key}
        {/if}
      </div>
    {/each}
  {/key}
</div>

<style>
  .bg { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
  svg { display: block; overflow: visible; }
  path { fill: none; }
  .lane { position: absolute; left: 0; right: 0; }
  .track { position: absolute; left: 0; top: 0; will-change: transform; }
  .fxwrap { position: absolute; inset: 0; }
  /* вікно ефекту: тіло + хвіст, що згасає назад (маска) */
  .fx { position: absolute; left: 0; top: 0; height: 100%; overflow: hidden; will-change: transform, opacity;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 var(--tail), #000 calc(100% - 8px), transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 var(--tail), #000 calc(100% - 8px), transparent 100%); }
  .fx-in { position: absolute; left: 0; top: 0; will-change: transform; }

  .look { stroke: var(--look); stroke-width: 1; }
  .look.odd { stroke: var(--look-odd); }
  .heat { stroke: var(--heat); stroke-width: 1.6; }
  .heat.odd { stroke: var(--heat-odd); }
  .pulse { stroke: var(--pulse); stroke-width: 1.2; }
  /* без світла — пунктир (лінії при цьому плавно зупиняє ефект руху outage) */
  .off .look, .off .pulse { stroke-dasharray: var(--look-dash); }
</style>
