<!-- Панель вибраного датчика: плитки, графік, перемикачі (спільні з кільцем) -->
<script>
  let { v } = $props();
</script>


<!-- панель датчика: величина й режим спільні з кільцем (кнопки праворуч у заголовку) -->
<section class="glass det" style="border-radius: var(--r-lg)">
  <div class="det-head">
    <div class="det-title">
      <h2>{v.det.name}</h2>
      <span class="det-period">{v.det.period}</span>
    </div>
    <div class="seg" role="group" aria-label="Режим показу">
      <button class="seg-btn" type="button" onclick={v.det.toggleMetric} aria-pressed={v.det.pressedH} aria-label={v.det.metricLabel} title={v.det.metricLabel}>
        {#if v.det.showDrop}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3.5 4.4 6 7.7 6 11a6 6 0 0 1-12 0c0-3.3 2.5-6.6 6-11z"></path></svg>{/if}
        {#if v.det.showTherm}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"></path></svg>{/if}
      </button>
      <button class="seg-btn" type="button" onclick={v.det.toggleHour} aria-pressed={v.det.pressedHour} aria-label={v.det.hourLabel} title={v.det.hourLabel}>
        {#if v.det.showChart}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"></path><path d="M7 15l4-5 3 3 5-6"></path></svg>{/if}
        {#if v.det.showClock}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>{/if}
      </button>
    </div>
  </div>
  <div class="det-grid">
    <div class="tile det-tile"><span class="det-lbl">{v.det.nowLabel}</span><span class="det-val" style="color: {v.det.color}">{v.det.now}</span></div>
    <div class="tile det-tile"><span class="det-lbl">Середня</span><span class="det-val" style="">{v.det.avg}</span></div>
    <div class="tile det-tile"><span class="det-lbl">Мінімум · {v.det.minAt}</span><span class="det-val" style="color: var(--cold)">{v.det.min}</span></div>
    <div class="tile det-tile"><span class="det-lbl">Максимум · {v.det.maxAt}</span><span class="det-val" style="color: var(--warm)">{v.det.max}</span></div>
  </div>
  <svg class="det-chart" viewBox="0 0 320 124" width="100%" role="img" aria-label={v.det.chartAria}>
    {#each v.det.gridY as gy}
      <line x1="34" x2="314" y1={gy.y} y2={gy.y} style="stroke: var(--stroke)"></line>
      <text x="28" y={gy.ty} text-anchor="end" class="det-axis">{gy.label}</text>
    {/each}
    <line x1={v.det.nowX} x2={v.det.nowX} y1="8" y2="104" stroke-dasharray="2 3" style="stroke: var(--stroke-strong)"></line>
    <path d={v.det.area} fill={v.det.color} opacity="0.12"></path>
    <path d={v.det.line} fill="none" stroke={v.det.color} stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"></path>
    <circle cx={v.det.dot.x} cy={v.det.dot.y} r="3.5" fill={v.det.color} opacity={v.det.dot.op} stroke-width="2" style="stroke: var(--surface)"></circle>
    {#each v.det.xTicks as tk}
      <line x1={tk.x} x2={tk.x} y1="104" y2="108" style="stroke: var(--stroke-strong)"></line>
      <text x={tk.x} y="120" text-anchor={tk.anchor} class="det-axis">{tk.label}</text>
    {/each}
  </svg>
  <p class="det-delta">{v.det.deltaLabel}: <b>{v.det.delta}</b></p>
</section>

