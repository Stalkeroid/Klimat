<!-- Вікно введення Read API Key (і вхід у демо-режим) -->
<script>
  import { CHANNEL_ID } from '../lib/config.js';
  import { DEMO_KEY } from '../lib/data.js';
  let { store } = $props();
  let input = $state();
  let value = $state('');

  // при кожному відкритті — поточний ключ у полі, курсор у полі з виділенням
  $effect(() => {
    if (store.setup.open) {
      value = store.setup.key;
      setTimeout(() => { if (input) { input.focus(); input.select(); } }, 0);
    }
  });

  function submit(e) { e.preventDefault(); store.submitKey(value); }
  function demo() { value = DEMO_KEY; store.submitKey(DEMO_KEY); }
  function onKey(e) { if (e.key === 'Escape' && store.setup.open && store.setup.cancel) store.hideSetup(); }
</script>

<svelte:window onkeydown={onKey} />

{#if store.setup.open}
<div id="setup" class="setup">
  <form id="setupForm" role="dialog" aria-modal="true" aria-labelledby="setupTitle" onsubmit={submit}>
    <span class="eyebrow">THINGSPEAK · КАНАЛ {CHANNEL_ID}</span>
    <h2 id="setupTitle">Підключення до каналу</h2>
    <p>Вставте <b>Read API Key</b> (ThingSpeak → канал → вкладка API Keys). Ключ зберігається лише в цьому браузері — на кожному пристрої його треба ввести один раз.</p>
    <label for="keyInput">READ API KEY</label>
    <input id="keyInput" bind:this={input} bind:value autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXXXXXXXXXXXXX">
    {#if store.setup.err}<span class="err" id="setupErr" role="alert">{store.setup.err}</span>{/if}
    <button type="button" class="demo-link" id="setupDemo" onclick={demo}>Немає ключа? Відкрити демо з випадковими даними</button>
    <div class="actions">
      {#if store.setup.cancel}<button type="button" class="secondary" id="setupCancel" onclick={() => store.hideSetup()}>Скасувати</button>{/if}
      <button type="submit" class="primary">Зберегти</button>
    </div>
  </form>
</div>
{/if}

<style>
  .setup{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(5,6,8,0.85);font-family:var(--font-text);color:var(--text);padding:20px;box-sizing:border-box}
  .setup form{max-width:420px;width:100%;background:var(--surface-solid);border:1px solid var(--stroke);box-shadow:inset 0 1px 0 var(--highlight);border-radius:var(--r-lg);padding:22px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box}
  .setup .eyebrow{font-family:var(--font-data);font-size:11px;font-weight:500;letter-spacing:.08em;color:var(--text-4)}
  .setup h2{margin:0;font-family:var(--font-display);font-size:20px;font-weight:700}
  .setup p{margin:0;font-size:14px;line-height:1.5;color:var(--text-2)}
  .setup label{font-family:var(--font-data);font-size:11px;letter-spacing:.08em;color:var(--text-3);margin-top:4px}
  .setup input{font-family:var(--font-data);font-size:15px;letter-spacing:.04em;padding:12px;min-height:48px;box-sizing:border-box;border-radius:var(--r-sm);border:1px solid var(--stroke-strong);background:var(--surface-2);color:var(--text);outline:none;transition:border-color .15s}
  .setup input:focus{border-color:var(--accent-line)}
  .setup .err{color:var(--danger);font-size:13px;min-height:1em}
  .setup .err:empty{display:none}
  .setup .demo-link{align-self:flex-start;font-family:var(--font-text);font-size:13px;color:var(--accent);background:none;border:0;padding:6px 0;min-height:32px;cursor:pointer;text-align:left;text-decoration:underline;text-decoration-color:var(--accent-line);text-underline-offset:3px}
  .setup .demo-link:hover{color:var(--accent-hover)}
  .setup .actions{display:flex;gap:10px}
  .setup .actions button{flex:1;font-family:var(--font-text);font-size:15px;font-weight:600;min-height:48px;border-radius:var(--r-sm);cursor:pointer;transition:background .12s,transform .08s}
  .setup .actions button:active{transform:scale(.98)}
  .setup .primary{border:0;background:var(--accent);color:var(--bg)}
  .setup .primary:hover{background:var(--accent-hover)}
  .setup .secondary{border:1px solid var(--stroke-strong);background:var(--button);color:var(--text-2)}
  .setup .secondary:hover{background:var(--button-hover)}
  .setup button:focus-visible,.setup input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
