// use:wheel — обробник колеса миші, якому дозволено preventDefault (не пасивний), щоб зум не прокручував сторінку
export function wheel(node, handler) {
  let h = handler;
  const fn = (e) => h && h(e);
  node.addEventListener('wheel', fn, { passive: false });
  return {
    update(nh) { h = nh; },
    destroy() { node.removeEventListener('wheel', fn); }
  };
}
