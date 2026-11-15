<!-- Шапка: назва + стан ліворуч, перемикач дня («машина часу») над правою колонкою -->
<script>
  let { v } = $props();
</script>

<header class="top" style="display: flex; flex-wrap: wrap; align-items: center; gap: 20px">
  <div class="top-left" style="flex: 999 1 640px; min-width: 0; display: flex; align-items: center; flex-wrap: nowrap; gap: 14px">
    <h1 class="title" style="margin: 0; font-family: var(--font-display); font-size: 30px; font-weight: 700; letter-spacing: -0.01em; color: var(--text)">Клімат кімнати</h1>
    <span class="status-chip" role="status" title={v.badgeTitle}><span style="width: 8px; height: 8px; border-radius: 50%; background: {v.badgeColor}; box-shadow: 0 0 8px {v.badgeColor}"></span><span class="chip-txt">{v.badge}</span></span>
  </div>
  <div class="top-right" style="flex: 1 1 340px; min-width: 0; display: flex; justify-content: center">
    <div class="daynav" role="group" aria-label="Вибір дня">
      <button class="dn-btn" type="button" onclick={v.prevDay} aria-label="Попередній день" aria-disabled={v.prevOff}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></button>
      <span class="dn-mid">
        <button class="dn-day" type="button" aria-haspopup="dialog" onclick={v.openPicker} aria-label="Вибрати день: {v.dayBtn}">{v.dayBtn}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"></rect><path d="M3.5 10h17M8 3v4M16 3v4"></path></svg></button>
      </span>
      <button class="dn-btn" type="button" onclick={v.nextDay} aria-label="Наступний день" aria-disabled={v.nextOff}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button>
    </div>
  </div>
</header>
