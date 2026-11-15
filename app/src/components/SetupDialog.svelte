<!-- Вікно введення Read API Key (і вхід у демо-режим) -->
<script>
  import { CHANNEL_ID } from '../lib/config.js';
  import { DEMO_KEY } from '../lib/data.js';
  let { dash } = $props();
  let input = $state();
  let value = $state('');

  // при кожному відкритті — поточний ключ у полі, курсор у полі з виділенням
  $effect(() => {
    if (dash.setup.open) {
      value = dash.setup.key;
      setTimeout(() => { if (input) { input.focus(); input.select(); } }, 0);
    }
  });

  function submit(e) { e.preventDefault(); dash.submitKey(value); }
  function demo() { value = DEMO_KEY; dash.submitKey(DEMO_KEY); }
  function onKey(e) { if (e.key === 'Escape' && dash.setup.open && dash.setup.cancel) dash.hideSetup(); }
</script>

<svelte:window onkeydown={onKey} />

{#if dash.setup.open}
<div id="setup">
  <form id="setupForm" role="dialog" aria-modal="true" aria-labelledby="setupTitle" onsubmit={submit}>
    <span class="eyebrow">THINGSPEAK · КАНАЛ {CHANNEL_ID}</span>
    <h2 id="setupTitle">Підключення до каналу</h2>
    <p>Вставте <b>Read API Key</b> (ThingSpeak → канал → вкладка API Keys). Ключ зберігається лише в цьому браузері — на кожному пристрої його треба ввести один раз.</p>
    <label for="keyInput">READ API KEY</label>
    <input id="keyInput" bind:this={input} bind:value autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXXXXXXXXXXXXX">
    {#if dash.setup.err}<span class="err" id="setupErr" role="alert">{dash.setup.err}</span>{/if}
    <button type="button" class="demo-link" id="setupDemo" onclick={demo}>Немає ключа? Відкрити демо з випадковими даними</button>
    <div class="actions">
      {#if dash.setup.cancel}<button type="button" class="secondary" id="setupCancel" onclick={() => dash.hideSetup()}>Скасувати</button>{/if}
      <button type="submit" class="primary">Зберегти</button>
    </div>
  </form>
</div>
{/if}
