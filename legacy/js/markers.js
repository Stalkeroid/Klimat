// Мітки датчиків: плаский шар поверх 3D-кімнати.
// У 3D-сцені стоять невидимі «якорі» (.anchor) у точках датчиків; тут ми щокадру беремо їхнє положення
// на екрані й ставимо туди мітки (.mk). Так мітки завжди одного розміру, чіткі й зручні для пальця.
// Якщо таблички налазять одна на одну — задня плавно стає напівпрозорою (мітки не стрибають).

var MK_LEAD = 26;        // довжина виносної лінії, px (як --lead у css/style.css)
var MK_BRACKET = 11;     // половина розміру рамки-прицілу, px

function placeMarkers() {
  var stage = document.querySelector('.stage');
  if (!stage) return;
  var anchors = stage.querySelectorAll('.anchor'), mks = stage.querySelectorAll('.mk');
  if (!anchors.length || anchors.length !== mks.length) return;
  var sr = stage.getBoundingClientRect();
  var items = [];
  for (var i = 0; i < mks.length; i++) {
    var r = anchors[i].getBoundingClientRect();
    var x = r.left + r.width / 2 - sr.left, y = r.top + r.height / 2 - sr.top;
    var tag = mks[i].querySelector('.mk-tag');
    items.push({ el: mks[i], x: x, y: y, w: tag ? tag.offsetWidth : 70, h: tag ? tag.offsetHeight : 40,
                 visible: parseFloat(mks[i].style.opacity || '1') > 0.01 });
  }
  // перекриття: таблички не рухаємо. Та, що далі (вище на екрані — глибше в кімнаті), плавно стає напівпрозорою,
  // ближча малюється поверх. Коли перекриття зникає — прозорість плавно повертається.
  var boxes = items.map(function (it) {
    return { x0: it.x - it.w / 2, x1: it.x + it.w / 2, y1: it.y - MK_BRACKET - MK_LEAD, y0: it.y - MK_BRACKET - MK_LEAD - it.h };
  });
  items.forEach(function (it, k) {
    var behind = false;
    if (it.visible) {
      for (var q = 0; q < items.length; q++) {
        if (q === k || !items[q].visible || items[q].y <= it.y) continue;   // перекрити може лише ближча (нижча) мітка
        var a = boxes[k], b = boxes[q];
        if (a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0) { behind = true; break; }
      }
    }
    it.el.style.transform = 'translate(' + it.x.toFixed(1) + 'px,' + it.y.toFixed(1) + 'px)';
    it.el.style.zIndex = String(Math.round(it.y) + 1000);
    it.el.classList.toggle('mk--behind', behind);
  });
}

// Під час руху камери (плавний перехід 1.2 с) позиції оновлюються щокадру, потім цикл зупиняється.
var mkTrackUntil = 0, mkLooping = false;
function trackMarkers(ms) {
  mkTrackUntil = Math.max(mkTrackUntil, performance.now() + (ms || 1400));
  placeMarkers();
  if (mkLooping) return;
  mkLooping = true;
  (function loop() {
    placeMarkers();
    if (performance.now() < mkTrackUntil) requestAnimationFrame(loop);
    else mkLooping = false;
  })();
}
