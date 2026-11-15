// Мітки датчиків: розрахунок положення табличок на екрані.
// У 3D-сцені стоять невидимі «якорі» в точках датчиків; беремо їхні екранні координати і ставимо туди мітки.
// Якщо таблички налазять одна на одну — задня (вище на екрані = глибше в кімнаті) стає напівпрозорою, ближча — поверх.

export const MK_LEAD = 26;      // довжина виносної лінії, px (як --lead у Markers.svelte)
export const MK_BRACKET = 11;   // половина розміру рамки-прицілу, px

// anchors — DOM-елементи якорів, tags — DOM-елементи табличок, visible[i] — чи мітка показана,
// stage — область з кімнатою. Повертає [{ x, y, z, behind }].
export function layoutMarkers(stage, anchors, tags, visible) {
  const sr = stage.getBoundingClientRect();
  const items = anchors.map((a, i) => {
    const r = a ? a.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    const tag = tags[i];
    return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top, w: tag ? tag.offsetWidth : 70, h: tag ? tag.offsetHeight : 40, visible: visible[i] };
  });
  const boxes = items.map((it) => ({ x0: it.x - it.w / 2, x1: it.x + it.w / 2, y1: it.y - MK_BRACKET - MK_LEAD, y0: it.y - MK_BRACKET - MK_LEAD - it.h }));
  return items.map((it, k) => {
    let behind = false;
    if (it.visible) {
      for (let q = 0; q < items.length; q++) {
        if (q === k || !items[q].visible || items[q].y <= it.y) continue;   // перекрити може лише ближча (нижча) мітка
        const a = boxes[k], b = boxes[q];
        if (a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0) { behind = true; break; }
      }
    }
    return { x: it.x, y: it.y, z: Math.round(it.y) + 1000, behind };
  });
}
