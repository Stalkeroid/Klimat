// Мінімальний рушій шаблону: {{шлях}}, <sc-for>, <sc-if>, onX="{{функція}}".
// Будує віртуальне дерево з <template id="tpl"> і точково оновлює DOM. Логіки дашборда тут немає.
var SVGNS = 'http://www.w3.org/2000/svg';
var HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
function look(scope, path) {
  path = (path || '').trim();
  if (path === 'true') return true;
  if (path === 'false') return false;
  var parts = path.split('.'), v = scope;
  for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
  return v;
}
function interp(str, scope) { return str.replace(HOLE, function (m, p) { var v = look(scope, p); return v == null ? '' : String(v); }); }
function single(str) { var m = /^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/.exec(str || ''); return m ? m[1] : null; }

function build(node, scope, out, ns) {
  if (node.nodeType === 3) {
    var txt = node.nodeValue;
    if (txt.indexOf('{{') >= 0) txt = interp(txt, scope);
    out.push({ text: txt });
    return;
  }
  if (node.nodeType !== 1) return;
  var tag = node.localName;
  if (tag === 'sc-for') {
    var list = look(scope, single(node.getAttribute('list'))) || [];
    var as = node.getAttribute('as');
    for (var i = 0; i < list.length; i++) { var sc = Object.create(scope); sc[as] = list[i]; kids(node, sc, out, ns); }
    return;
  }
  if (tag === 'sc-if') { if (look(scope, single(node.getAttribute('value')))) kids(node, scope, out, ns); return; }
  var cns = tag === 'svg' ? SVGNS : ns;
  var v = { tag: tag, ns: cns, attrs: {}, on: {}, children: [] };
  for (var a = 0; a < node.attributes.length; a++) {
    var n = node.attributes[a].name, val = node.attributes[a].value;
    if (n.indexOf('on') === 0 && n.length > 2) {
      var p = single(val);
      if (p) { var fn = look(scope, p); if (typeof fn === 'function') v.on[n.slice(2).toLowerCase()] = fn; }
      continue;
    }
    if (n === 'id') continue;
    v.attrs[n] = val.indexOf('{{') >= 0 ? interp(val, scope) : val;
  }
  kids(node, scope, v.children, cns);
  out.push(v);
}
function kids(node, scope, out, ns) { for (var c = node.firstChild; c; c = c.nextSibling) build(c, scope, out, ns); }

function setOn(el, ev, fn) {
  if (!el.__h) el.__h = {};
  if (!(ev in el.__h)) el.addEventListener(ev, function (e) { var f = el.__h[ev]; if (f) f(e); });
  el.__h[ev] = fn;
}
function create(v) {
  if (v.text !== undefined) { v.el = document.createTextNode(v.text); return v.el; }
  var el = v.ns ? document.createElementNS(v.ns, v.tag) : document.createElement(v.tag);
  for (var k in v.attrs) el.setAttribute(k, v.attrs[k]);
  for (var e in v.on) setOn(el, e, v.on[e]);
  for (var i = 0; i < v.children.length; i++) el.appendChild(create(v.children[i]));
  v.el = el;
  return el;
}
function patchChildren(parent, olds, news) {
  var n = Math.max(olds.length, news.length);
  for (var i = 0; i < n; i++) {
    var o = olds[i], nw = news[i];
    if (!o) { parent.appendChild(create(nw)); continue; }
    if (!nw) { if (o.el.parentNode === parent) parent.removeChild(o.el); continue; }
    if (o.text !== undefined || nw.text !== undefined) {
      if (o.text !== undefined && nw.text !== undefined) { if (o.text !== nw.text) o.el.nodeValue = nw.text; nw.el = o.el; }
      else parent.replaceChild(create(nw), o.el);
      continue;
    }
    if (o.tag !== nw.tag || o.ns !== nw.ns) { parent.replaceChild(create(nw), o.el); continue; }
    var el = o.el; nw.el = el;
    for (var k in nw.attrs) if (o.attrs[k] !== nw.attrs[k]) el.setAttribute(k, nw.attrs[k]);
    for (var k2 in o.attrs) if (!(k2 in nw.attrs)) el.removeAttribute(k2);
    for (var e in nw.on) setOn(el, e, nw.on[e]);
    for (var e2 in o.on) if (!(e2 in nw.on)) setOn(el, e2, null);
    patchChildren(el, o.children, nw.children);
  }
}

class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(p) { Object.assign(this.state, p); scheduleRender(); }
}
var comp, tplRoot, appEl, oldTree = [], pending = false;
function scheduleRender() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(function () { pending = false; renderNow(); });
}
function renderNow() {
  var tree = [];
  kids(tplRoot, comp.renderVals(), tree, null);
  patchChildren(appEl, oldTree, tree);
  oldTree = tree;
  if (comp.afterRender) comp.afterRender();   // хук для логіки, якій потрібен готовий DOM
}
