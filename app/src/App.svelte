<!-- Корінь сторінки: створює спільний стан (lib/store.svelte.js) і збирає частини дашборда.
     Кожен компонент сам вираховує, що йому показувати, і оновлюється лише тоді, коли змінилося саме це. -->
<script>
  import { onMount } from 'svelte';
  import { Store } from './lib/store.svelte.js';
  import { REFRESH_MS, BG_ANIMATE } from './lib/config.js';
  import Header from './components/Header.svelte';
  import Stage from './components/Stage.svelte';
  import SensorList from './components/SensorList.svelte';
  import DetailPanel from './components/DetailPanel.svelte';
  import Overview from './components/Overview.svelte';
  import SetupDialog from './components/SetupDialog.svelte';

  const store = new Store();

  onMount(() => {
    if (BG_ANIMATE) document.body.classList.add('bg-anim');
    store.load();
    const t = setInterval(() => { if (store.day == null) store.load(); }, REFRESH_MS);   // архів не оновлюємо
    return () => clearInterval(t);
  });
</script>

<svelte:window onresize={() => (store.vw = window.innerWidth)} />

<div class="page">
  <Header {store} />

  <main>
    <Stage {store} />

    <aside>
      <SensorList {store} />
      {#if store.sel != null}<DetailPanel {store} />{:else}<Overview {store} />{/if}
      <button class="keyBtn" type="button" onclick={() => store.showSetup()}>Змінити ключ ThingSpeak</button>
    </aside>
  </main>
</div>

<SetupDialog {store} />

<style>
  .page { min-height: 900px; box-sizing: border-box; padding: 28px 32px 32px; display: flex; flex-direction: column; gap: 20px; background: transparent; color: var(--text); font-family: var(--font-text); }
  main { display: flex; flex-wrap: wrap; gap: 20px; align-items: stretch; }
  aside { flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
  .keyBtn { font: inherit; font-size: 12px; background: none; border: 0; color: var(--accent); cursor: pointer; padding: 4px 0; min-height: 24px; }
  .keyBtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  @media (max-width: 700px) { .page { padding: 22px 16px 28px; } }
</style>
