<!-- Корінь сторінки: збирає частини дашборда. Уся логіка й стан — у lib/dashboard.svelte.js -->
<script>
  import { onMount, tick } from 'svelte';
  import { Dashboard } from './lib/dashboard.svelte.js';
  import { REFRESH_MS, BG_ANIMATE } from './lib/config.js';
  import { trackMarkers } from './lib/markers.js';
  import Header from './components/Header.svelte';
  import Stage from './components/Stage.svelte';
  import SensorList from './components/SensorList.svelte';
  import DetailPanel from './components/DetailPanel.svelte';
  import Overview from './components/Overview.svelte';
  import SetupDialog from './components/SetupDialog.svelte';

  const dash = new Dashboard();
  // усе, що показує сторінка, — одним об'єктом (як раніше renderVals); перераховується при зміні стану
  const v = $derived(dash.renderVals());

  // після кожного оновлення розмітки — поставити мітки датчиків над їхніми 3D-якорями (js/markers.js)
  $effect(() => {
    v;
    tick().then(() => trackMarkers(dash.state.dragging ? 200 : 1400));
  });

  onMount(() => {
    if (BG_ANIMATE) document.body.classList.add('bg-anim');
    dash.load();
    const t = setInterval(() => { if (dash.state.day == null) dash.load(); }, REFRESH_MS);   // архів не оновлюємо
    const onResize = () => { dash.state.vw = window.innerWidth; };
    window.addEventListener('resize', onResize);
    return () => { clearInterval(t); window.removeEventListener('resize', onResize); };
  });
</script>

<div class="page" style="min-height: 900px; box-sizing: border-box; padding: 28px 32px 32px; display: flex; flex-direction: column; gap: 20px; background: transparent; color: var(--text); font-family: var(--font-text)">
  <Header {v} />

  <main style="display: flex; flex-wrap: wrap; gap: 20px; align-items: stretch">
    <Stage {v} />

    <aside style="flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 14px">
      <SensorList {v} />
      {#if v.hasSel}<DetailPanel {v} />{/if}
      {#if v.noSel}<Overview {v} />{/if}
      <button class="keyBtn" type="button" onclick={v.changeKey}>Змінити ключ ThingSpeak</button>
    </aside>
  </main>
</div>

<SetupDialog {dash} />
