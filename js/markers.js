// Мітки датчиків: плаский шар поверх 3D-кімнати.
// У 3D-сцені стоять невидимі «якорі» (.anchor) у точках датчиків; тут ми щокадру беремо їхнє положення
// на екрані й ставимо туди мітки (.mk). Так мітки завжди одного розміру, чіткі й зручні для пальця.
// Якщо таблички налазять одна на одну — виносна лінія (leader) подовжується, щоб їх розвести.

var MK_LEAD = 26;        // базова довжина виносної лінії, px
var MK_GAP = 6;          // мінімальний проміжок між табличками, px
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
  // розводимо таблички: зліва направо, кожну піднімаємо, поки не перестане перетинатися з уже поставленими
  var order = items.map(function (_, k) { return k; }).sort(function (a, b) { return items[a].x - items[b].x; });
  var placed = [];
  order.forEach(function (k) {
    var it = items[k], lead = MK_LEAD;
    if (it.visible) {
      for (var step = 0; step < 6; step++) {
        var box = { x0: it.x - it.w / 2, x1: it.x + it.w / 2, y1: it.y - MK_BRACKET - lead, y0: it.y - MK_BRACKET - lead - it.h };
        var hit = placed.filter(function (p) {
          return box.x0 < p.x1 + MK_GAP && box.x1 > p.x0 - MK_GAP && box.y0 < p.y1 + MK_GAP && box.y1 > p.y0 - MK_GAP;
        });
        if (!hit.length) { placed.push(box); break; }
        // підняти над найвищою з тих, що заважають
        var top = Math.min.apply(null, hit.map(function (p) { return p.y0; }));
        lead = it.y - MK_BRACKET - top + MK_GAP;
      }
    }
    it.el.style.transform = 'translate(' + it.x.toFixed(1) + 'px,' + it.y.toFixed(1) + 'px)';
    it.el.style.setProperty('--lead', Math.round(lead) + 'px');
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
