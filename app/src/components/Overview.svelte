<!-- Огляд, коли датчик не вибрано: опалення + зв'язок датчиків -->
<script>
  let { v } = $props();
</script>


<!-- огляд: два незалежні блоки — подія опалення і зв'язок датчиків — розділені тонкою лінією з підписами -->
<section class="glass ov" style="border-radius: var(--r-lg)">
  <h2 class="ov-h">Огляд</h2>
  {#if v.ov.heatShow}
  <div class="ov-sec">
    <div class="ov-eyebrow"><span>ПОДІЇ</span></div>
    <div class="ov-heat tile" title={v.ov.heatTitle}>
      <span class="ov-heat-name" style="color: {v.ov.heatIcon}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.8 2.5-5 .3 1.6 1 2.6 2 3 0-3 .2-5.5.5-8z"></path></svg><span style="color: var(--text)">Опалення</span></span>
      <span class="ov-heat-st" style="color: {v.ov.heatColor}">{v.ov.heatState}</span>
    </div>
  </div>
  {/if}
  <div class="ov-sec">
    <div class="ov-eyebrow"><span>{v.ov.linkTitle}</span><span>{v.ov.linkMeta}</span></div>
    <div class="ov-links">
      {#each v.ov.links as l}
        <div class="ov-link"><span class="ov-dot" style="background: {l.color}"></span><span class="ov-name">{l.name}</span><span class="ov-ago" style="color: {l.agoColor}">{l.ago}</span></div>
      {/each}
    </div>
  </div>
  <p class="ov-hint">Оберіть датчик у кімнаті або в списку, щоб побачити кільце й графік.</p>
</section>

