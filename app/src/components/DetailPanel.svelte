<!-- Панель вибраного датчика: плитки, графік, перемикачі.
     Величина (Т/Н) і режим (доба/година) — спільні з кільцем. Доба — календарна (00:00…зараз) або архівний день. -->
<script>
  import { fmt, hm, tempColor, humColor, fmtH, dayLabel, weekday } from '../lib/utils.js';
  import { dayStartOf, sensorName } from '../lib/data.js';

  let { store } = $props();

  const PX0 = 34, PX1 = 314, PY0 = 8, PY1 = 104;
  const isH = $derived(store.metric === 'h');

  const v = $derived.by(() => {
    const sel = store.sel, archive = store.archive, now = store.now;
    const arr = (isH ? store.rawH : store.raw)[sel];
    const rdat = (isH ? store.dataH : store.data)[sel];
    const vf = isH ? fmtH : fmt, vc = isH ? humColor : tempColor, unit = isH ? '%' : '°';
    const hourMode = store.hourView != null && !!rdat[store.hourView];
    const dayStart = archive ? store.day : dayStartOf(now);

    let r0, r1;
    const ticks = [];
    if (hourMode) {
      r0 = rdat[store.hourView].start; r1 = r0 + 3600000;
      for (const mm of [0, 15, 30, 45, 60]) ticks.push({ t: r0 + mm * 60000, label: hm(r0 + mm * 60000) });
    } else {
      r0 = dayStart; r1 = dayStart + 86400000;
      for (const h of [0, 6, 12, 18, 24]) ticks.push({ t: r0 + h * 3600000, label: (h < 10 ? '0' : '') + h + ':00' });
    }
    const pts = arr.filter((p) => p.ts >= r0 && p.ts < r1);
    const last = pts.length ? pts[pts.length - 1] : null, first = pts.length ? pts[0] : null;
    let mnP = null, mxP = null, sum = 0;
    for (const p of pts) { sum += p.t; if (!mnP || p.t < mnP.t) mnP = p; if (!mxP || p.t > mxP.t) mxP = p; }
    const avg = pts.length ? sum / pts.length : NaN;
    const live = !archive && (!hourMode || r1 > now);

    // вісь Y: «круглі» поділки, 3–5 штук
    let lo = 0, hi = 1, step = 1;
    if (pts.length) {
      const span = Math.max(mxP.t - mnP.t, isH ? 2 : 0.6);
      step = [0.2, 0.5, 1, 2, 5, 10, 20].find((s) => span / s <= 4) || 20;
      lo = Math.floor((mnP.t - span * 0.1) / step) * step; hi = Math.ceil((mxP.t + span * 0.1) / step) * step;
      if (hi - lo < step * 2) hi = lo + step * 2;
    }
    const X = (t) => PX0 + (t - r0) / (r1 - r0) * (PX1 - PX0);
    const Y = (val) => PY0 + (hi - val) / (hi - lo) * (PY1 - PY0);
    const gridY = [];
    for (let g = lo; g <= hi + 1e-9; g += step) {
      gridY.push({ y: Y(g).toFixed(1), ty: (Y(g) + 3).toFixed(1), label: String(Math.round(g * 10) / 10).replace('.', ',') + unit });
    }
    // лінія з розривами там, де даних не було понад 20 хв
    let line = '', area = '', seg = [];
    const flush = () => {
      if (!seg.length) return;
      const d0 = seg.map((p, k) => (k ? 'L' : 'M') + X(p.ts).toFixed(1) + ',' + Y(p.t).toFixed(1)).join(' ');
      line += d0 + ' ';
      area += d0 + ' L' + X(seg[seg.length - 1].ts).toFixed(1) + ',' + PY1 + ' L' + X(seg[0].ts).toFixed(1) + ',' + PY1 + ' Z ';
      seg = [];
    };
    pts.forEach((p, k) => { if (k && p.ts - pts[k - 1].ts > 20 * 60000) flush(); seg.push(p); });
    flush();

    const delta = last && first ? last.t - first.t : NaN;
    const name = sensorName(sel);
    const period = hourMode ? (archive ? dayLabel(store.day) + ' · ' : '') + hm(r0) + '–' + hm(r1)
                            : (archive ? dayLabel(store.day) + ' · ' + weekday(store.day) : 'Сьогодні · 00:00–' + hm(now));
    return {
      name, period, hourMode, color: vc(last ? last.t : NaN),
      nowLabel: live ? 'Зараз' : 'Остання', now: vf(last ? last.t : NaN),
      avg: vf(avg), min: vf(mnP ? mnP.t : NaN), max: vf(mxP ? mxP.t : NaN),
      minAt: mnP ? hm(mnP.ts) : '—', maxAt: mxP ? hm(mxP.ts) : '—',
      gridY,
      xTicks: ticks.map((tk, k) => ({ x: X(tk.t).toFixed(1), label: tk.label, anchor: k === 0 ? 'start' : (k === ticks.length - 1 ? 'end' : 'middle') })),
      line: line.trim(), area: area.trim(),
      dot: last ? { x: X(last.ts).toFixed(1), y: Y(last.t).toFixed(1), op: 1 } : { x: 0, y: 0, op: 0 },
      nowX: live && !hourMode ? X(now).toFixed(1) : -1000,   // пунктир «зараз» лише для живої доби
      deltaLabel: hourMode ? 'Зміна за годину' : 'Зміна за добу',
      delta: isFinite(delta) ? (delta >= 0 ? '+' : '−') + Math.abs(delta).toFixed(1).replace('.', ',') + unit : '—',
      chartAria: (isH ? 'Вологість ' : 'Температура ') + name + ', ' + period + ', від ' + vf(mnP ? mnP.t : NaN) + ' до ' + vf(mxP ? mxP.t : NaN)
    };
  });

  const metricLabel = $derived(isH ? 'Показати температуру' : 'Показати вологість');
  const hourLabel = $derived(v.hourMode ? 'Назад до доби' : 'Детально за годину');
</script>

<section class="glass det">
  <div class="det-head">
    <div class="det-title">
      <h2>{v.name}</h2>
      <span class="det-period">{v.period}</span>
    </div>
    <div class="seg" role="group" aria-label="Режим показу">
      <button class="seg-btn" type="button" onclick={() => store.toggleMetric()} aria-pressed={isH ? 'true' : 'false'} aria-label={metricLabel} title={metricLabel}>
        {#if !isH}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3.5 4.4 6 7.7 6 11a6 6 0 0 1-12 0c0-3.3 2.5-6.6 6-11z"></path></svg>
        {:else}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"></path></svg>{/if}
      </button>
      <button class="seg-btn" type="button" onclick={() => (v.hourMode ? store.closeHour() : store.openHour())} aria-pressed={v.hourMode ? 'true' : 'false'} aria-label={hourLabel} title={hourLabel}>
        {#if !v.hourMode}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"></path><path d="M7 15l4-5 3 3 5-6"></path></svg>
        {:else}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>{/if}
      </button>
    </div>
  </div>
  <div class="det-grid">
    <div class="tile det-tile"><span class="det-lbl">{v.nowLabel}</span><span class="det-val" style:color={v.color}>{v.now}</span></div>
    <div class="tile det-tile"><span class="det-lbl">Середня</span><span class="det-val">{v.avg}</span></div>
    <div class="tile det-tile"><span class="det-lbl">Мінімум · {v.minAt}</span><span class="det-val" style:color="var(--cold)">{v.min}</span></div>
    <div class="tile det-tile"><span class="det-lbl">Максимум · {v.maxAt}</span><span class="det-val" style:color="var(--warm)">{v.max}</span></div>
  </div>
  <svg class="det-chart" viewBox="0 0 320 124" width="100%" role="img" aria-label={v.chartAria}>
    {#each v.gridY as gy}
      <line x1="34" x2="314" y1={gy.y} y2={gy.y} class="grid"></line>
      <text x="28" y={gy.ty} text-anchor="end" class="det-axis">{gy.label}</text>
    {/each}
    <line x1={v.nowX} x2={v.nowX} y1="8" y2="104" stroke-dasharray="2 3" class="strong"></line>
    <path d={v.area} fill={v.color} opacity="0.12"></path>
    <path d={v.line} fill="none" stroke={v.color} stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"></path>
    <circle cx={v.dot.x} cy={v.dot.y} r="3.5" fill={v.color} opacity={v.dot.op} stroke-width="2" class="dot"></circle>
    {#each v.xTicks as tk}
      <line x1={tk.x} x2={tk.x} y1="104" y2="108" class="strong"></line>
      <text x={tk.x} y="120" text-anchor={tk.anchor} class="det-axis">{tk.label}</text>
    {/each}
  </svg>
  <p class="det-delta">{v.deltaLabel}: <b>{v.delta}</b></p>
</section>

<style>
  .det { display: flex; flex-direction: column; gap: 14px; padding: 18px; border-radius: var(--r-lg); }
  .det-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .det-title { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .det-title h2 { margin: 0; font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); }
  .det-period { font-family: var(--font-data); font-size: 11px; letter-spacing: .06em; color: var(--text-3); white-space: nowrap; }
  .det-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .det-tile { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; }
  .det-lbl { font-size: 12px; color: var(--text-3); }
  .det-val { font-family: var(--font-num); font-size: 22px; font-weight: 600; color: var(--text); }
  .det-chart { display: block; overflow: visible; }
  .det-axis { fill: var(--text-4); font-family: var(--font-data); font-size: 9px; }
  .grid { stroke: var(--stroke); }
  .strong { stroke: var(--stroke-strong); }
  .dot { stroke: var(--surface); }
  .det-delta { margin: 0; font-size: 13px; color: var(--text-2); }
  .det-delta b { font-family: var(--font-num); font-weight: 600; color: var(--text); }

  /* сегментований перемикач (як перемикач дня), активна кнопка підсвічена */
  .seg { display: flex; flex: none; height: 40px; box-sizing: border-box; background: var(--surface-2); border: 1px solid var(--stroke); border-radius: var(--r-md); overflow: hidden; }
  .seg-btn { width: 44px; height: 100%; display: flex; align-items: center; justify-content: center; padding: 0; border: 0; background: transparent; color: var(--text-3); cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background .12s, color .12s; }
  .seg-btn + .seg-btn { border-left: 1px solid var(--stroke); }
  .seg-btn:hover { background: var(--button); color: var(--text-2); }
  .seg-btn[aria-pressed="true"] { background: var(--button-hover); color: var(--accent); }
  .seg-btn:active { background: var(--button-active); }
  .seg-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
</style>
