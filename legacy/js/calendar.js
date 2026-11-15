// Календар «машини часу»: власне спливне вікно в стилі теми (замість системного вибору дати).
// openCalendar(кнопка, { value, min, max, onPick }) — усі дати як мілісекунди локальної півночі.

var CAL_MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
var CAL_WD = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'];
var cal = null;

function openCalendar(anchor, opts) {
  closeCalendar();
  var v = new Date(opts.value);
  cal = { anchor: anchor, opts: opts, y: v.getFullYear(), m: v.getMonth() };
  anchor.setAttribute('aria-expanded', 'true');
  var el = document.createElement('div');
  el.className = 'cal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Вибір дня');
  cal.el = el;
  document.body.appendChild(el);
  drawCalendar();
  placeCalendar();
  setTimeout(function () {
    document.addEventListener('pointerdown', calOutside, true);
    document.addEventListener('keydown', calKey, true);
    window.addEventListener('resize', placeCalendar);
    window.addEventListener('scroll', placeCalendar, true);
    var f = el.querySelector('.cal-day[aria-pressed="true"]') || el.querySelector('.cal-day:not([disabled])');
    if (f) f.focus({ preventScroll: true });
  }, 0);
}

function closeCalendar() {
  if (!cal) return;
  cal.el.remove();
  document.removeEventListener('pointerdown', calOutside, true);
  document.removeEventListener('keydown', calKey, true);
  window.removeEventListener('resize', placeCalendar);
  window.removeEventListener('scroll', placeCalendar, true);
  var a = cal.anchor; cal = null;
  a.setAttribute('aria-expanded', 'false');
  if (a && a.focus) a.focus({ preventScroll: true });
}

function calOutside(e) { if (cal && !cal.el.contains(e.target) && !cal.anchor.contains(e.target)) closeCalendar(); }
function calKey(e) { if (e.key === 'Escape') { e.preventDefault(); closeCalendar(); } }

// під кнопкою дати, вирівняно по її правому краю; не виходить за межі екрана
function placeCalendar() {
  if (!cal) return;
  var r = cal.anchor.getBoundingClientRect(), w = cal.el.offsetWidth, h = cal.el.offsetHeight;
  var left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
  var top = r.bottom + 8;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
  cal.el.style.left = left + 'px';
  cal.el.style.top = top + 'px';
}

function drawCalendar() {
  var o = cal.opts, y = cal.y, m = cal.m;
  var first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  var lead = (first.getDay() + 6) % 7;                       // тиждень з понеділка
  var today = dayStartOf(Date.now()), sel = dayStartOf(o.value);
  var prevOk = new Date(y, m, 0).getTime() >= o.min, nextOk = new Date(y, m + 1, 1).getTime() <= o.max;
  var html = '<div class="cal-head">' +
    '<button type="button" class="cal-nav" data-nav="-1" aria-label="Попередній місяць"' + (prevOk ? '' : ' disabled') + '><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>' +
    '<span class="cal-title">' + CAL_MONTHS[m] + ' ' + y + '</span>' +
    '<button type="button" class="cal-nav" data-nav="1" aria-label="Наступний місяць"' + (nextOk ? '' : ' disabled') + '><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>' +
    '</div><div class="cal-grid">';
  CAL_WD.forEach(function (w, k) { html += '<span class="cal-wd' + (k > 4 ? ' cal-we' : '') + '">' + w + '</span>'; });
  for (var i = 0; i < lead; i++) html += '<span></span>';
  for (var d = 1; d <= days; d++) {
    var t = new Date(y, m, d).getTime(), off = t < o.min || t > o.max;
    html += '<button type="button" class="cal-day' + (t === today ? ' cal-today' : '') + '" data-t="' + t + '"' +
      (t === sel ? ' aria-pressed="true"' : '') + (off ? ' disabled' : '') + ' aria-label="' + d + ' ' + CAL_MONTHS[m].toLowerCase() + '">' + d + '</button>';
  }
  html += '</div><div class="cal-foot"><button type="button" class="cal-today-btn"' + (sel === today ? ' disabled' : '') + '>Сьогодні · наживо</button></div>';
  cal.el.innerHTML = html;
  cal.el.querySelectorAll('.cal-nav').forEach(function (b) {
    b.addEventListener('click', function () {
      cal.m += +b.dataset.nav;
      if (cal.m < 0) { cal.m = 11; cal.y--; } else if (cal.m > 11) { cal.m = 0; cal.y++; }
      drawCalendar();
    });
  });
  cal.el.querySelectorAll('.cal-day').forEach(function (b) {
    b.addEventListener('click', function () { var f = cal.opts.onPick, t = +b.dataset.t; closeCalendar(); f(t); });
  });
  cal.el.querySelector('.cal-today-btn').addEventListener('click', function () { var f = cal.opts.onPick; closeCalendar(); f(null); });
}
