<!-- Область з кімнатою: 3D-сцена, мітки датчиків, кільце статистики, підказка, легенда -->
<script>
  import { wheel } from '../lib/actions.js';
  let { v } = $props();
</script>

<div class="stage" onclick={v.stageClick} onpointerdown={v.onDown} onpointermove={v.onMove} onpointerup={v.onUp} onpointerleave={v.onUp} onpointercancel={v.onUp} use:wheel={v.onWheel} style="flex: 999 1 640px; min-width: 0; height: 720px; position: relative; overflow: hidden; border-radius: var(--r-lg); background: transparent; border: 1px solid var(--stroke); perspective: 1100px; touch-action: none; user-select: none; cursor: {v.cursor}">
  <div class="glass stage-glass" aria-hidden="true" style="position: absolute; inset: 0; border: 0; pointer-events: none"></div>
  <div class="scene" style="scale: {v.sceneScale}; position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d; transform: {v.camT}; transition: {v.camTr}">
    {#each v.faces as f}
      <div style="position: absolute; left: 0; top: 0; transform-origin: 0 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; pointer-events: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.045); width: {f.w}px; height: {f.h}px; transform: {f.t}; background: {f.bg}; background-image: {f.img}; background-size: {f.bs}; background-position: {f.bp}; opacity: {f.op}; transition: opacity .25s"></div>
    {/each}
  </div>
  <div class="scene" style="scale: {v.sceneScale}; z-index: 2; position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d; transform: {v.camT}; transition: {v.camTr}">
    <!-- невидимі «якорі» датчиків у 3D: за ними стежить шар міток (js/markers.js) -->
    {#each v.markers as m}
      <div class="anchor" style="position: absolute; left: -1px; top: -1px; width: 2px; height: 2px; pointer-events: none; transform: {m.t}"></div>
    {/each}
  </div>
  <!-- мітки датчиків: плаский шар поверх кімнати, завжди одного розміру й чіткі -->
  <div class="mk-layer" aria-label="Датчики в кімнаті">
    {#each v.markers as m}
      <div class="mk {m.cls}" style:--c={m.color} style:opacity={m.op}>
        <span class="mk-lead"></span>
        <button class="mk-tag" type="button" onclick={m.pick} aria-label={m.aria} style="pointer-events: {m.pe}"><span class="mk-name">{m.name}</span><span class="mk-val">{m.temp}</span></button>
        <button class="mk-pt" type="button" tabindex="-1" onclick={m.pick} aria-label={m.aria} style="pointer-events: {m.pe}"><i></i></button>
      </div>
    {/each}
  </div>
    {#if v.ringOn}
    <div style="z-index: 3; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none">
    <div class="ring" onclick={v.ringClick} onpointermove={v.ringMove} onpointerleave={v.clearHover} style="flex: none; position: relative; width: 332px; height: 332px; pointer-events: auto; zoom: {v.ringScale}">
      <svg width="332" height="332" viewBox="-166 -166 332 332" role="img" aria-label={v.ringAria} style="display: block; overflow: visible">
        <circle r="164" stroke-width="1" style="fill: var(--ring-disc); stroke: var(--ring-grid)"></circle>
        {#each v.grid as g}
          <circle r={g.r} fill="none" stroke-dasharray="2 4" style="stroke: var(--ring-grid)"></circle>
        {/each}
        <line x1="0.0" y1="-68.0" x2="0.0" y2="-160.0" stroke-width="1" stroke-dasharray="3 3" style="pointer-events: none; stroke: var(--ring-axis)"></line>
        <line x1="68.0" y1="0.0" x2="160.0" y2="0.0" stroke-width="1" stroke-dasharray="3 3" style="pointer-events: none; stroke: var(--ring-axis)"></line>
        <line x1="0.0" y1="68.0" x2="0.0" y2="160.0" stroke-width="1" stroke-dasharray="3 3" style="pointer-events: none; stroke: var(--ring-axis)"></line>
        <line x1="-68.0" y1="0.0" x2="-160.0" y2="0.0" stroke-width="1" stroke-dasharray="3 3" style="pointer-events: none; stroke: var(--ring-axis)"></line>
        {#each v.bars as b}
          <path class="bar" d={b.d} opacity={b.op} stroke-width="1.5" onpointerenter={b.hover} style="cursor: pointer; fill: {b.fill}; stroke: {b.stroke}"></path>
        {/each}
        <circle cx={v.nowDot.x} cy={v.nowDot.y} r="3.5" fill="var(--text)" opacity={v.nowDot.op}></circle>
        <circle r="66" style="pointer-events: none; fill: var(--ring-core); stroke: var(--stroke)"></circle>
      </svg>
      <!-- центр кільця: головне значення завжди рівно по центру; підписи над і під ним його не зсувають -->
      <div style="position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; text-align: center">
        <span style="position: absolute; left: -62px; width: 124px; bottom: 22px; font-family: var(--font-text); font-size: 10px; letter-spacing: 0.08em; color: var(--text-3); white-space: nowrap">{v.center.code} · <b style="font-weight: 700; color: var(--text)">{v.center.mk}</b></span>
        <span style="position: absolute; left: -90px; width: 180px; top: -19px; height: 38px; line-height: 38px; font-family: var(--font-num); font-size: 34px; font-weight: 600; color: {v.center.color}">{v.center.temp}</span>
        <span style="position: absolute; left: -62px; width: 124px; top: 22px; display: flex; flex-direction: column; align-items: center; gap: 2px">
          <span style="font-family: var(--font-data); font-size: 10px; color: var(--text-2); white-space: nowrap">{v.center.sub}</span>
          <span style="font-family: var(--font-text); font-size: 10px; color: var(--text-3); white-space: nowrap">{v.center.sub2}</span>
        </span>
      </div>
      <span style="font-family: var(--font-data); font-size: 11px; font-weight: 600; color: var(--text); pointer-events: none; position: absolute; white-space: nowrap; left: 171px; top: 11px">{v.rl.a}</span>
      <span style="font-family: var(--font-data); font-size: 11px; font-weight: 600; color: var(--text); pointer-events: none; position: absolute; white-space: nowrap; left: 306px; top: 143px; transform: translateX(-50%)">{v.rl.b}</span>
      <span style="font-family: var(--font-data); font-size: 11px; font-weight: 600; color: var(--text); pointer-events: none; position: absolute; white-space: nowrap; left: 171px; top: 308px">{v.rl.c}</span>
      <span style="font-family: var(--font-data); font-size: 11px; font-weight: 600; color: var(--text); pointer-events: none; position: absolute; white-space: nowrap; left: 26px; top: 143px; transform: translateX(-50%)">{v.rl.d}</span>
      <!-- кутові кнопки кільця: ліворуч — температура/вологість, праворуч — доба/година -->
      <button class="pin-btn" onclick={v.toggleMetric} aria-label={v.metricBtn.label} title={v.metricBtn.label} aria-pressed={v.metricBtn.pressed} style="position: absolute; bottom: {v.btn.bottom}px; width: {v.btn.size}px; height: {v.btn.size}px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: {v.btn.radius}px; border: 1px solid var(--stroke-strong); background: var(--button); color: var(--text-2); cursor: pointer; left: {v.btn.inset}px">
        {#if v.metricBtn.showDrop}
        <svg width={v.btn.icon} height={v.btn.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3.5 4.4 6 7.7 6 11a6 6 0 0 1-12 0c0-3.3 2.5-6.6 6-11z"></path></svg>
        {/if}
        {#if v.metricBtn.showTherm}
        <svg width={v.btn.icon} height={v.btn.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"></path></svg>
        {/if}
      </button>
      {#if v.dayMode}
      <button class="pin-btn" onclick={v.openHour} aria-label="Детальний графік за цю годину" title="Детальний графік за цю годину" style="position: absolute; bottom: {v.btn.bottom}px; width: {v.btn.size}px; height: {v.btn.size}px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: {v.btn.radius}px; border: 1px solid var(--stroke-strong); background: var(--button); color: var(--text-2); cursor: pointer; right: {v.btn.inset}px">
        <svg width={v.btn.icon} height={v.btn.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"></path><path d="M7 15l4-5 3 3 5-6"></path></svg>
      </button>
      {/if}
      {#if v.hourMode}
      <button class="pin-btn" onclick={v.closeHour} aria-label="Назад до графіка за добу" title="Назад до графіка за добу" style="position: absolute; bottom: {v.btn.bottom}px; width: {v.btn.size}px; height: {v.btn.size}px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: {v.btn.radius}px; border: 1px solid var(--stroke-strong); background: var(--button); color: var(--text-2); cursor: pointer; right: {v.btn.inset}px">
        <svg width={v.btn.icon} height={v.btn.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
      </button>
      {/if}
    </div>
    </div>
  {/if}

  <div class="hint" style="position: absolute; left: 20px; bottom: 18px; z-index: 5; display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-3); pointer-events: none">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"></path><path d="M21 4v5h-5"></path></svg>
    {v.hint}
  </div>
  <div class="legend" style="position: absolute; right: 20px; bottom: 16px; z-index: 5; display: flex; align-items: center; gap: 18px; font-family: var(--font-data); font-size: 11px; color: var(--text-3); pointer-events: none">
    <span class="legend-item" style="display: flex; align-items: center; gap: 6px"><span style="color: {v.lg.h}; transition: color .2s">0%</span><span class="legend-bar" style="display: block; width: 120px; height: 8px; border-radius: var(--r-xs); background: linear-gradient(90deg, rgb(233,180,90), rgb(233,213,138) 30%, rgb(124,196,228) 45%, rgb(88,140,230) 70%, rgb(70,90,210))"></span><span style="color: {v.lg.h}; transition: color .2s">100%</span></span>
    <span class="legend-item" style="display: flex; align-items: center; gap: 6px"><span style="color: {v.lg.t}; transition: color .2s">0°</span><span class="legend-bar" style="display: block; width: 120px; height: 8px; border-radius: var(--r-xs); background: linear-gradient(90deg, #2F6FE0, #58B4D9 25%, #E9D58A 36.7%, #F59E4B 53.3%, #E8553F)"></span><span style="color: {v.lg.t}; transition: color .2s">60°</span></span>
  </div>
</div>
