<!-- Кільце статистики вибраного датчика: доба (24 сегменти) або година (12 × 5 хв).
     Окремий 2D-шар поверх сцени, від камери й зуму кімнати не залежить. -->
<script>
  import { SENSORS } from '../lib/config.js';
  import { tempColor, fmt, hh, rad, pol, wedge, humColor, fmtH, radH } from '../lib/utils.js';
  import { sensorName } from '../lib/data.js';

  let { store, legendEl, stageW, stageH } = $props();

  // радіус кнопок з теми (css/theme.css), у пікселях
  const rBtn = (() => { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--r-btn')); return isFinite(v) ? v : 8; })();

  // Телефон: масштаб кільця і висота кнопок під фактичний розмір області з кімнатою.
  // Кнопка (56 px) має бути однаково віддалена від кола і від шкал унизу; якщо місця замало — кільце зменшується.
  function mobileRingLayout(W, H, yL) {
    const B = 56, cx = W / 2, cy = H / 2;
    let best = null;
    for (let z = Math.min(1.05, (W - 8) / 332); z >= 0.55; z -= 0.01) {
      const xIn = cx - 166 * z + B;                    // внутрішній край лівої кнопки
      let top = null, score = -1e9;
      for (let t = cy; t + B <= yL; t += 1) {
        const m = Math.min(yL - (t + B), Math.hypot(cx - xIn, cy - t) - 164 * z);
        if (m > score) { score = m; top = t; }
      }
      if (top != null) best = { z, top, score };
      if (top != null && score >= 10) break;           // щонайменше 10 px до кола і до шкал
    }
    if (!best) return { z: 0.8, bottom: 4 };
    // нижній край кнопки відносно нижнього краю квадрата кільця, в одиницях кільця
    const sqBottom = cy + 166 * best.z;
    return { z: best.z, bottom: Math.round(-((best.top + B) - sqBottom) / best.z) };
  }

  // ---------- розміри (CSS zoom: малюється чітко; на ПК — 1.4, на телефоні — під екран) ----------
  const mob = $derived.by(() => {
    if (!store.narrow) return null;
    const W = stageW || 340, H = stageH || 464;
    return mobileRingLayout(W, H, legendEl ? legendEl.offsetTop : H - 28);
  });
  const scale = $derived(mob ? mob.z : 1.4);
  // кутові кнопки: не менше ~56 px на екрані; на телефоні — наполовину під кільцем, на ПК — у нижніх кутах
  const btn = $derived.by(() => {
    const size = Math.ceil(56 / scale);
    return { size, inset: mob ? 0 : 4, bottom: mob ? mob.bottom : 4, radius: Math.round(rBtn / scale), icon: Math.round(size * 0.46) };
  });

  // ---------- дані ----------
  const sel = $derived(store.sel);
  const isH = $derived(store.metric === 'h');
  const hourMode = $derived(store.hourView != null);
  const vfmt = $derived(isH ? fmtH : fmt);
  const vcol = $derived(isH ? humColor : tempColor);
  const vrad = $derived(isH ? radH : rad);
  const name = $derived(sensorName(sel));

  const ring = $derived.by(() => {
    const archive = store.archive;
    const rdat = (isH ? store.dataH : store.data)[sel];
    if (!hourMode) {
      const segs = [];
      for (let h = 0; h < 24; h++) segs.push({ future: true, t: null, label: hh(h) + '–' + hh((h + 1) % 24) });
      rdat.forEach((p, k) => {
        if ((archive || p.hd <= rdat[23].hd) && !p.filled && isFinite(p.t))
          segs[p.hd] = { future: false, t: p.t, label: hh(p.hd) + '–' + hh((p.hd + 1) % 24), isNow: !archive && k === 23 };
      });
      return { N: 24, segs, havg: NaN };
    }
    // реальні 5-хвилинні показники за обрану годину
    const hk = store.hourView, hp = rdat[hk], h0 = hp.start;
    const avail = !archive && hk === 23 ? Math.floor(new Date(store.now).getMinutes() / 5) + 1 : 12;
    const sums = Array(12).fill(0), cnts = Array(12).fill(0);
    for (const p of (isH ? store.rawH : store.raw)[sel]) {
      if (p.ts >= h0 && p.ts < h0 + 3600000) { const mi = Math.floor((p.ts - h0) / 300000); sums[mi] += p.t; cnts[mi]++; }
    }
    let lastReal = -1;
    for (let m = 0; m < 12; m++) if (m < avail && cnts[m]) lastReal = m;
    const p2 = (n) => String(n).padStart(2, '0');
    const segs = [];
    for (let m = 0; m < 12; m++) {
      const m0 = m * 5, m1 = m0 + 5;
      const label = p2(hp.hd) + ':' + p2(m0) + '–' + (m1 === 60 ? hh((hp.hd + 1) % 24) : p2(hp.hd) + ':' + p2(m1));
      if (m < avail && cnts[m]) segs.push({ future: false, t: Math.round(sums[m] / cnts[m] * 10) / 10, label, isNow: !archive && hk === 23 && m === lastReal });
      else segs.push({ future: true, t: null, label });
    }
    const real = segs.filter((x) => !x.future).map((x) => x.t);
    return { N: 12, segs, havg: real.length ? real.reduce((a, b) => a + b, 0) / real.length : hp.t };
  });

  const segStep = $derived(360 / ring.N);
  const gap = $derived(hourMode ? 2.2 : 1.6);
  const eff = $derived(store.hover != null ? store.hover : store.pinned);

  // форма сегментів залежить лише від даних; наведення міняє тільки прозорість і обводку
  const shapes = $derived(ring.segs.map((g, k) => {
    const a0 = k * segStep - 90 + gap, a1 = (k + 1) * segStep - 90 - gap;
    return g.future ? { d: wedge(72, 104, a0, a1), fill: 'var(--seg-empty)' } : { d: wedge(72, vrad(g.t), a0, a1), fill: vcol(g.t) };
  }));

  const grid = $derived(isH ? [20, 40, 60, 80] : [10, 20, 30, 40, 50]);
  const rl = $derived(hourMode ? [':00', ':15', ':30', ':45'] : ['00', '06', '12', '18']);
  const nowDot = $derived.by(() => {
    const k = ring.segs.findLastIndex((g) => g.isNow);
    if (k < 0) return { x: 0, y: 0, op: 0 };
    const [x, y] = pol(vrad(ring.segs[k].t) + 6, k * segStep - 90 + segStep / 2);
    return { x, y, op: 1 };
  });

  const center = $derived.by(() => {
    const shown = eff != null ? ring.segs[eff] : null;
    const curR = (isH ? store.hum : store.cur)[sel];
    const ct = shown ? shown.t : (hourMode ? ring.havg : curR);
    const hd = hourMode ? store.data[sel][store.hourView].hd : 0;
    return {
      code: name.toUpperCase(), mk: isH ? 'Н' : 'Т', temp: vfmt(ct), color: vcol(ct),
      sub: shown ? shown.label : (hourMode ? hh(hd) + '–' + hh((hd + 1) % 24) : (store.archive ? '' : 'зараз')),
      sub2: shown ? '' : (hourMode ? 'середня' : (store.archive ? 'середня за добу' : ''))
    };
  });

  const aria = $derived(hourMode
    ? (isH ? 'Вологість ' : 'Температура ') + name + ' за годину ' + ring.segs[0].label.slice(0, 5) + ', кожні 5 хвилин'
    : 'Кільцевий графік ' + (isH ? 'вологості ' : 'температури ') + name + ' за сьогодні');
  const metricLabel = $derived(isH ? 'Показати температуру' : 'Показати вологість');

  // ---------- взаємодія ----------
  function kAt(e) {
    const rc = e.currentTarget.getBoundingClientRect(), sc = rc.width / 332;
    const dx = e.clientX - (rc.left + rc.width / 2), dy = e.clientY - (rc.top + rc.height / 2);
    const r = Math.sqrt(dx * dx + dy * dy) / (sc || 1);
    let k = null;
    if (r > 68 && r < 160) {
      const ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      const idx = ((Math.floor(ang / segStep) % ring.N) + ring.N) % ring.N;
      if (!ring.segs[idx].future) k = idx;
    }
    return { k, r };
  }
  // наведення — лише мишею; на сенсорному екрані значення закріплюється тапом
  function onMove(e) { if (e.pointerType === 'mouse') store.setHover(kAt(e).k); }
  function onBar(e, k) { if (e.pointerType === 'mouse' && !ring.segs[k].future) store.setHover(k); }
  function onClick(e) {
    const h = kAt(e);
    if (h.r > 164) return;            // поза колом — нехай клік закриє статистику
    e.stopPropagation();
    if (h.k != null) store.pin(h.k);
  }
  // кнопки не пускають клік далі (інакше область з кімнатою закрила б кільце)
  const act = (fn) => (e) => { e.stopPropagation(); fn(); };
</script>

<div class="ring-wrap">
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="ring" onclick={onClick} onpointermove={onMove} onpointerleave={() => store.setHover(null)} style:zoom={scale}>
    <svg width="332" height="332" viewBox="-166 -166 332 332" role="img" aria-label={aria}>
      <circle r="164" stroke-width="1" class="disc"></circle>
      {#each grid as t}
        <circle r={vrad(t)} fill="none" stroke-dasharray="2 4" class="grid"></circle>
      {/each}
      <line x1="0.0" y1="-68.0" x2="0.0" y2="-160.0" stroke-width="1" stroke-dasharray="3 3" class="axis"></line>
      <line x1="68.0" y1="0.0" x2="160.0" y2="0.0" stroke-width="1" stroke-dasharray="3 3" class="axis"></line>
      <line x1="0.0" y1="68.0" x2="0.0" y2="160.0" stroke-width="1" stroke-dasharray="3 3" class="axis"></line>
      <line x1="-68.0" y1="0.0" x2="-160.0" y2="0.0" stroke-width="1" stroke-dasharray="3 3" class="axis"></line>
      {#each shapes as b, k}
        {@const g = ring.segs[k]}
        {@const on = !g.future && eff === k}
        <path class="bar" d={b.d} opacity={g.future || eff == null || on ? 1 : 0.4} stroke-width="1.5" onpointerenter={(e) => onBar(e, k)}
              style:fill={b.fill} style:stroke={!g.future && (g.isNow || on) ? 'var(--text)' : 'none'}></path>
      {/each}
      <circle cx={nowDot.x} cy={nowDot.y} r="3.5" fill="var(--text)" opacity={nowDot.op}></circle>
      <circle r="66" class="core"></circle>
    </svg>
    <!-- центр кільця: головне значення завжди рівно по центру; підписи над і під ним його не зсувають -->
    <div class="center">
      <span class="c-code">{center.code} · <b>{center.mk}</b></span>
      <span class="c-val" style:color={center.color}>{center.temp}</span>
      <span class="c-sub">
        <span class="c-sub1">{center.sub}</span>
        <span class="c-sub2">{center.sub2}</span>
      </span>
    </div>
    <span class="rl" style="left: 171px; top: 11px">{rl[0]}</span>
    <span class="rl" style="left: 306px; top: 143px; transform: translateX(-50%)">{rl[1]}</span>
    <span class="rl" style="left: 171px; top: 308px">{rl[2]}</span>
    <span class="rl" style="left: 26px; top: 143px; transform: translateX(-50%)">{rl[3]}</span>
    <!-- кутові кнопки кільця: ліворуч — температура/вологість, праворуч — доба/година -->
    <button class="pin-btn" onclick={act(() => store.toggleMetric())} aria-label={metricLabel} title={metricLabel} aria-pressed={isH ? 'true' : 'false'}
            style:bottom="{btn.bottom}px" style:width="{btn.size}px" style:height="{btn.size}px" style:border-radius="{btn.radius}px" style:left="{btn.inset}px">
      {#if !isH}
        <svg width={btn.icon} height={btn.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3.5 4.4 6 7.7 6 11a6 6 0 0 1-12 0c0-3.3 2.5-6.6 6-11z"></path></svg>
      {:else}
        <svg width={btn.icon} height={btn.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"></path></svg>
      {/if}
    </button>
    {#if !hourMode}
      <button class="pin-btn" onclick={act(() => store.openHour())} aria-label="Детальний графік за цю годину" title="Детальний графік за цю годину"
              style:bottom="{btn.bottom}px" style:width="{btn.size}px" style:height="{btn.size}px" style:border-radius="{btn.radius}px" style:right="{btn.inset}px">
        <svg width={btn.icon} height={btn.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"></path><path d="M7 15l4-5 3 3 5-6"></path></svg>
      </button>
    {:else}
      <button class="pin-btn" onclick={act(() => store.closeHour())} aria-label="Назад до графіка за добу" title="Назад до графіка за добу"
              style:bottom="{btn.bottom}px" style:width="{btn.size}px" style:height="{btn.size}px" style:border-radius="{btn.radius}px" style:right="{btn.inset}px">
        <svg width={btn.icon} height={btn.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
      </button>
    {/if}
  </div>
</div>

<style>
  .ring-wrap { z-index: 3; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .ring { flex: none; position: relative; width: 332px; height: 332px; pointer-events: auto; animation: ringIn .45s cubic-bezier(.2,.8,.2,1) .7s backwards; }
  @keyframes ringIn { from { opacity: 0; scale: .8 } to { opacity: 1; scale: 1 } }
  svg { display: block; overflow: visible; }
  .disc { fill: var(--ring-disc); stroke: var(--ring-grid); }
  .grid { stroke: var(--ring-grid); }
  .axis { pointer-events: none; stroke: var(--ring-axis); }
  .core { pointer-events: none; fill: var(--ring-core); stroke: var(--stroke); }
  .bar { cursor: pointer; transition: opacity .2s; }

  .center { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; text-align: center; }
  .c-code { position: absolute; left: -62px; width: 124px; bottom: 22px; font-family: var(--font-text); font-size: 10px; letter-spacing: 0.08em; color: var(--text-3); white-space: nowrap; }
  .c-code b { font-weight: 700; color: var(--text); }
  .c-val { position: absolute; left: -90px; width: 180px; top: -19px; height: 38px; line-height: 38px; font-family: var(--font-num); font-size: 34px; font-weight: 600; }
  .c-sub { position: absolute; left: -62px; width: 124px; top: 22px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .c-sub1 { font-family: var(--font-data); font-size: 10px; color: var(--text-2); white-space: nowrap; }
  .c-sub2 { font-family: var(--font-text); font-size: 10px; color: var(--text-3); white-space: nowrap; }
  .rl { font-family: var(--font-data); font-size: 11px; font-weight: 600; color: var(--text); pointer-events: none; position: absolute; white-space: nowrap; }

  .pin-btn { position: absolute; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--stroke-strong); background: var(--button); color: var(--text-2); cursor: pointer;
    transition: background .12s, transform .08s; -webkit-tap-highlight-color: transparent; box-shadow: inset 0 1px 0 var(--highlight); }
  .pin-btn:hover { background: var(--button-hover); }
  .pin-btn:active { background: var(--button-active); transform: scale(.94); }
  .pin-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
</style>
