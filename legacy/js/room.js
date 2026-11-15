// 3D-модель кімнати: розміри, меблі, стіни. Лише геометрія, без даних.
var RW = 375, RL = 750, RH = 260;
var OVERVIEW = { target: [187, 70, 400], ry: 0, rx: -32, zoom: -420 };

function toCss(p) { return [p[0] - RW / 2, -p[1], p[2] - RL / 2]; }
function shade(hex, f) {
  var n = parseInt(hex.slice(1), 16);
  var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  var b = Math.min(255, Math.round((n & 255) * f));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function face(list, w, h, t, bg, img) { list.push({ w: w, h: h, t: t, bg: bg, img: img || 'none', bs: 'auto', bp: '0 0', op: 1 }); }
function box(list, o) {
  var X0 = o.x0 - RW / 2, X1 = o.x1 - RW / 2, Y1 = -o.h1, Z0 = o.z0 - RL / 2, Z1 = o.z1 - RL / 2;
  var w = o.x1 - o.x0, d = o.z1 - o.z0, h = o.h1 - o.h0;
  var pre = '';
  if (o.rot) {
    var cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
    pre = 'translate3d(' + cx + 'px,0px,' + cz + 'px) rotateY(' + o.rot + 'deg) translate3d(' + (-cx) + 'px,0px,' + (-cz) + 'px) ';
  }
  var face = function (l, a, b, t, bg, img) { list.push({ w: a, h: b, t: pre + t, bg: bg, img: img || 'none', bs: 'auto', bp: '0 0', op: 1 }); };
  face(list, w, d, 'translate3d(' + X0 + 'px,' + Y1 + 'px,' + Z0 + 'px) rotateX(90deg)', o.topBg || shade(o.c, 1.1), o.topImg);
  face(list, w, h, 'translate3d(' + X0 + 'px,' + Y1 + 'px,' + Z1 + 'px)', o.frontBg || shade(o.c, 0.88), o.frontImg);
  face(list, w, h, 'translate3d(' + X1 + 'px,' + Y1 + 'px,' + Z0 + 'px) rotateY(180deg)', o.backBg || shade(o.c, 0.62), o.backImg);
  face(list, d, h, 'translate3d(' + X1 + 'px,' + Y1 + 'px,' + Z1 + 'px) rotateY(90deg)', o.rightBg || shade(o.c, 0.76), o.rightImg);
  face(list, d, h, 'translate3d(' + X0 + 'px,' + Y1 + 'px,' + Z0 + 'px) rotateY(-90deg)', o.leftBg || shade(o.c, 0.7), o.leftImg);
}

function buildRoom() {
  var f = [];
  var PW = 23.3, PL = 144, tones = ['#8E7055', '#977860', '#88694F', '#93745A'];
  for (var row = 0; row * PW < RL; row++) {
    var ze = RL - row * PW, zs = Math.max(0, ze - PW);
    f.push({ w: RW, h: ze - zs, t: 'translate3d(' + (-RW / 2) + 'px,0px,' + (zs - RL / 2) + 'px) rotateX(90deg)', bg: tones[row % 4],
      img: 'linear-gradient(90deg, rgba(0,0,0,0.16) 0 1px, rgba(0,0,0,0) 1px)', bs: PL + 'px 100%', bp: ((row % 6) * PL / 6).toFixed(1) + 'px 0', op: 1 });
  }
  var T = 15;
  function cap(x0, x1, z0, z1) { face(f, x1 - x0, z1 - z0, 'translate3d(' + (x0 - RW / 2) + 'px,' + (-RH) + 'px,' + (z0 - RL / 2) + 'px) rotateX(90deg)', '#DFD9CE'); }
  function endCut(x0, x1, h0, h1) { face(f, x1 - x0, h1 - h0, 'translate3d(' + (x0 - RW / 2) + 'px,' + (-h1) + 'px,' + (RL / 2) + 'px)', '#BFB7A6'); }
  function tag(g) { f[f.length - 1].g = g; }
  cap(-T, 0, -T, RL); tag('L'); cap(RW, RW + T, -T, RL); tag('R'); cap(0, RW, -T, 0);
  endCut(-T, 0, 0, RH); tag('L'); endCut(RW, RW + T, 0, RH); tag('R'); endCut(-T, RW + T, -T, 0);
  var WX0 = 75, WX1 = 300, WH0 = 77, WH1 = 250, WD = 15, ZW = -RL / 2;
  function farWall(x0, x1, h0, h1, bg, img) { face(f, x1 - x0, h1 - h0, 'translate3d(' + (x0 - RW / 2) + 'px,' + (-h1) + 'px,' + ZW + 'px)', bg, img); }
  farWall(0, WX0, 0, RH, '#D7CFBE');
  farWall(WX1, RW, 0, RH, '#D7CFBE');
  farWall(WX0, WX1, WH1, RH, '#D7CFBE');
  farWall(WX0, WX1, 0, WH0, '#D7CFBE');
  face(f, WD, WH1 - WH0, 'translate3d(' + (WX0 - RW / 2) + 'px,' + (-WH1) + 'px,' + ZW + 'px) rotateY(90deg)', '#CEC6B5');
  face(f, WD, WH1 - WH0, 'translate3d(' + (WX1 - RW / 2) + 'px,' + (-WH1) + 'px,' + (ZW - WD) + 'px) rotateY(-90deg)', '#C5BDAC');
  face(f, WX1 - WX0, WD, 'translate3d(' + (WX0 - RW / 2) + 'px,' + (-WH1) + 'px,' + ZW + 'px) rotateX(-90deg)', '#B7AF9E');
  face(f, WX1 - WX0, WD, 'translate3d(' + (WX0 - RW / 2) + 'px,' + (-WH0) + 'px,' + (ZW - WD) + 'px) rotateX(90deg)', '#E8EBF0');
  face(f, WX1 - WX0, WH1 - WH0, 'translate3d(' + (WX0 - RW / 2) + 'px,' + (-WH1) + 'px,' + (ZW - WD) + 'px)', '#14223A',
    'linear-gradient(90deg, #C9D1DE 0 4px, rgba(0,0,0,0) 4px calc(50% - 2px), #C9D1DE calc(50% - 2px) calc(50% + 2px), rgba(0,0,0,0) calc(50% + 2px) calc(100% - 4px), #C9D1DE calc(100% - 4px)), linear-gradient(180deg, #C9D1DE 0 4px, rgba(0,0,0,0) 4px calc(100% - 4px), #C9D1DE calc(100% - 4px)), linear-gradient(170deg, rgba(124,196,228,0.22), rgba(0,0,0,0) 65%)');
  face(f, RL, RH, 'translate3d(' + (-RW / 2) + 'px,' + (-RH) + 'px,' + (RL / 2) + 'px) rotateY(90deg)', '#CFC7B5');
  face(f, RL, RH, 'translate3d(' + (RW / 2) + 'px,' + (-RH) + 'px,' + (-RL / 2) + 'px) rotateY(-90deg)', '#C8C0AE');
  var drawers = 'linear-gradient(180deg, rgba(0,0,0,0) 32%, rgba(0,0,0,0.35) 32% 33.5%, rgba(0,0,0,0) 33.5% 65%, rgba(0,0,0,0.35) 65% 66.5%, rgba(0,0,0,0) 66.5%)';
  var DZ = 16; function fb(o) { o.z0 += DZ; o.z1 += DZ; var n = f.length; box(f, o); if (o.g) for (var q = n; q < f.length; q++) f[q].g = o.g; }
  fb({ x0: 0, x1: 78, h0: 8, h1: 84, z0: 0, z1: 78, c: '#3A3129', frontImg: drawers });
  fb({ x0: 297, x1: 375, h0: 8, h1: 84, z0: 0, z1: 78, c: '#3A3129', frontImg: drawers });
  fb({ x0: 3, x1: 7, h0: 0, h1: 8, z0: 3, z1: 7, c: '#C3C8D0' });
  fb({ x0: 3, x1: 7, h0: 0, h1: 8, z0: 71, z1: 75, c: '#C3C8D0' });
  fb({ x0: 71, x1: 75, h0: 0, h1: 8, z0: 3, z1: 7, c: '#C3C8D0' });
  fb({ x0: 71, x1: 75, h0: 0, h1: 8, z0: 71, z1: 75, c: '#C3C8D0' });
  fb({ x0: 300, x1: 304, h0: 0, h1: 8, z0: 3, z1: 7, c: '#C3C8D0' });
  fb({ x0: 300, x1: 304, h0: 0, h1: 8, z0: 71, z1: 75, c: '#C3C8D0' });
  fb({ x0: 368, x1: 372, h0: 0, h1: 8, z0: 3, z1: 7, c: '#C3C8D0' });
  fb({ x0: 368, x1: 372, h0: 0, h1: 8, z0: 71, z1: 75, c: '#C3C8D0' });
  fb({ g: 'D', x0: 81, x1: 86, h0: 0, h1: 71, z0: 4, z1: 84, c: '#ECE8E0' });
  fb({ g: 'D', x0: 289, x1: 294, h0: 0, h1: 71, z0: 4, z1: 84, c: '#ECE8E0' });
  fb({ g: 'D', x0: 78, x1: 297, h0: 71, h1: 75, z0: 0, z1: 90, c: '#F7F4EE' });
  var screen = 'linear-gradient(160deg, rgba(124,196,228,0.35), rgba(30,51,84,0) 70%)';
  fb({ g: 'D', x0: 146, x1: 154, h0: 75, h1: 90, z0: 14, z1: 22, c: '#20242C', rot: 12 });
  fb({ g: 'D', x0: 115, x1: 185, h0: 88, h1: 130, z0: 16, z1: 20, c: '#14171D', frontBg: '#1E3354', frontImg: screen, rot: 12 });
  fb({ g: 'D', x0: 221, x1: 229, h0: 75, h1: 90, z0: 14, z1: 22, c: '#20242C', rot: -12 });
  fb({ g: 'D', x0: 190, x1: 260, h0: 88, h1: 130, z0: 16, z1: 20, c: '#14171D', frontBg: '#1E3354', frontImg: screen, rot: -12 });
  fb({ g: 'D', x0: 151, x1: 297, h0: 75, h1: 75.6, z0: 18, z1: 90, c: '#262B34' });
  fb({ g: 'D', x0: 180, x1: 245, h0: 75.6, h1: 77.6, z0: 56, z1: 72, c: '#3A404B' });
  fb({ g: 'D', x0: 262, x1: 270, h0: 75.6, h1: 78.4, z0: 58, z1: 70, c: '#4A515E' });
  fb({ x0: 326, x1: 348, h0: 84, h1: 130, z0: 16, z1: 62, c: '#E4E7EC', rot: 28, frontImg: 'linear-gradient(90deg, rgba(0,0,0,0) 70%, rgba(80,150,200,0.6) 70% 74%, rgba(0,0,0,0) 74%)' });
  fb({ x0: 4.8, x1: 73.2, h0: 84, h1: 152.4, z0: 4.8, z1: 73.2, c: '#33363D', topBg: '#3C4048' });
  fb({ x0: 8.2, x1: 69.8, h0: 87.4, h1: 149, z0: 73.2, z1: 74.7, c: '#3A3E46', frontBg: '#2B2E34' });
  fb({ x0: 62, x1: 64, h0: 106, h1: 130, z0: 74.7, z1: 76.2, c: '#8B93A1' });
  box(f, { x0: 75, x1: 187, h0: 26, h1: 74, z0: 2, z1: 10, c: '#D3D8E0', frontImg: 'repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 6px, rgba(0,0,0,0.18) 6px 8px)' });
  var folds = 'repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 4px, rgba(0,0,0,0.18) 4px 8px, rgba(0,0,0,0) 8px 11px)';
  box(f, { x0: 0, x1: 75, h0: 0, h1: 252, z0: 3, z1: 13, c: '#8C98AC', frontImg: folds });
  box(f, { x0: 300, x1: 375, h0: 0, h1: 252, z0: 3, z1: 13, c: '#8C98AC', frontImg: folds });
  box(f, { x0: 0, x1: 375, h0: 253, h1: 256, z0: 6, z1: 9, c: '#B8BFCA' });
  box(f, { x0: 0, x1: 90, h0: 0, h1: 22, z0: 225, z1: 525, c: '#3A3129' });
  box(f, { x0: 0, x1: 22, h0: 22, h1: 82, z0: 255, z1: 495, c: '#4B4037', rightImg: 'linear-gradient(90deg, rgba(0,0,0,0) 49.7%, rgba(0,0,0,0.22) 49.7% 50.3%, rgba(0,0,0,0) 50.3%)' });
  box(f, { x0: 22, x1: 88, h0: 22, h1: 42, z0: 255, z1: 495, c: '#54483D', topImg: 'linear-gradient(180deg, rgba(0,0,0,0) 49.7%, rgba(0,0,0,0.2) 49.7% 50.3%, rgba(0,0,0,0) 50.3%)' });
  box(f, { x0: 0, x1: 90, h0: 0, h1: 60, z0: 225, z1: 255, c: '#3A3129' });
  box(f, { x0: 0, x1: 90, h0: 0, h1: 60, z0: 495, z1: 525, c: '#3A3129' });
  var wn = f.length;
  box(f, { x0: 0, x1: 50, h0: 0, h1: 200, z0: 700, z1: 750, c: '#3A3129', rightImg: 'linear-gradient(90deg, rgba(0,0,0,0) 49.2%, rgba(0,0,0,0.4) 49.2% 50.8%, rgba(0,0,0,0) 50.8%)' });
  for (var wq = wn; wq < f.length; wq++) f[wq].g = 'W';
  box(f, { x0: 325, x1: 375, h0: 8, h1: 50, z0: 225, z1: 525, c: '#3A3129', leftImg: 'linear-gradient(90deg, rgba(0,0,0,0) 32.9%, rgba(0,0,0,0.35) 32.9% 33.3%, rgba(0,0,0,0) 33.3% 66.4%, rgba(0,0,0,0.35) 66.4% 66.8%, rgba(0,0,0,0) 66.8%)' });
  box(f, { x0: 328, x1: 332, h0: 0, h1: 8, z0: 228, z1: 232, c: '#C3C8D0' });
  box(f, { x0: 328, x1: 332, h0: 0, h1: 8, z0: 320, z1: 324, c: '#C3C8D0' });
  box(f, { x0: 328, x1: 332, h0: 0, h1: 8, z0: 426, z1: 430, c: '#C3C8D0' });
  box(f, { x0: 328, x1: 332, h0: 0, h1: 8, z0: 518, z1: 522, c: '#C3C8D0' });
  box(f, { x0: 368, x1: 372, h0: 0, h1: 8, z0: 228, z1: 232, c: '#C3C8D0' });
  box(f, { x0: 368, x1: 372, h0: 0, h1: 8, z0: 320, z1: 324, c: '#C3C8D0' });
  box(f, { x0: 368, x1: 372, h0: 0, h1: 8, z0: 426, z1: 430, c: '#C3C8D0' });
  box(f, { x0: 368, x1: 372, h0: 0, h1: 8, z0: 518, z1: 522, c: '#C3C8D0' });
  var wire = 'rgba(200,210,224,0.10)', bars = 'repeating-linear-gradient(90deg, rgba(220,228,238,0.75) 0 1.5px, rgba(0,0,0,0) 1.5px 7px)';
  var wireBox = { c: '#C8D2E0', topBg: wire, frontBg: wire, backBg: wire, rightBg: wire, leftBg: wire, topImg: bars, frontImg: bars, rightImg: bars, leftImg: bars };
  box(f, { x0: 330, x1: 372, h0: 50, h1: 60, z0: 435, z1: 515, c: '#3E86C9' });
  box(f, Object.assign({ x0: 331, x1: 371, h0: 60, h1: 92, z0: 436, z1: 514 }, wireBox));
  box(f, { x0: 330, x1: 372, h0: 92, h1: 98, z0: 435, z1: 515, c: '#8CC4EA' });
  box(f, { x0: 337.7, x1: 364.3, h0: 98, h1: 98.3, z0: 449.7, z1: 500.3, c: '#4A5E70', topImg: bars });
  box(f, { x0: 368, x1: 373, h0: 95, h1: 172, z0: 257, z1: 393, c: '#0E1015', leftBg: '#16233A', leftImg: 'linear-gradient(200deg, rgba(124,196,228,0.30), rgba(22,35,58,0) 65%)' });
  return f;
}

