<!-- Список датчиків праворуч -->
<script>
  let { v } = $props();
</script>

<div style="display: flex; flex-direction: column; gap: 8px">
  {#each v.list as s}
    <button class="list-btn" onclick={s.pick} aria-pressed={s.pressed} style="display: flex; align-items: center; gap: 14px; width: 100%; min-height: 64px; padding: 10px 14px; text-align: left; cursor: pointer; border-radius: var(--r-md); color: var(--text); font-family: var(--font-text); background: {s.bg}; border: 1px solid {s.border}; box-shadow: inset 0 1px 0 var(--highlight)">
      <span style="flex: none; width: 12px; height: 12px; border-radius: 50%; background: {s.color}; box-shadow: 0 0 12px {s.color}"></span>
      <span style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px">
        <span style="font-size: 14px; font-weight: 600">{s.name}</span>
      </span>
      <svg width="72" height="26" viewBox="0 0 72 26" aria-hidden="true" style="flex: none"><polyline points={s.spark} fill="none" stroke={s.color} stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"></polyline></svg>
      <span style="flex: none; width: 62px; text-align: right; display: flex; flex-direction: column; gap: 1px">
        <span style="font-family: var(--font-num); font-size: 19px; font-weight: 600">{s.temp}</span>
        <span style="font-family: var(--font-data); font-size: 11px; color: var(--cold)">{s.hum}</span>
      </span>
    </button>
  {/each}
</div>

