// Ефекти поверх ліній — «рецепти». Механізм спільний (lib/isolines.js + LiveBackground.svelte),
// а кожен ефект описує лише свої особливості.
//
//   ефект вигляду — малює поверх лінії: колір, тіло, хвіст, швидкість уздовж лінії, частота, розкид;
//   ефект руху    — змінює швидкість самих ліній: множник, плавність, старшинство.
//
// Розкид:
//   'random' — у кожної лінії свої значення з діапазонів (з генератора лінії: той самий сид → те саме);
//   'front'  — спільний старт і спільні базові значення, на кожній лінії лише невеликий розкид
//              (spread: частка, однакова для всіх атрибутів, або { атрибут: частка }).
// Щоб додати новий ефект, досить дописати рецепт і умову, коли він увімкнений.

import { rngFor, between } from './isolines.js';

export const EFFECTS = {
  // звичайний вигляд ліній; без світла — пунктир (див. outage)
  look: { kind: 'look', color: 'var(--iso-line)', colorOdd: 'var(--iso-line-2)', width: 1, dashedWhenOff: '3 7' },

  // батарея гріє: теплі хвилі з хвостом біжать уздовж ліній зліва й гаснуть до середини екрана
  heat: {
    kind: 'look', when: (s) => s.heating && !s.off, fadeMs: 3000,
    color: 'var(--iso-heat)', alpha: 0.6, alphaOdd: 0.42, width: 1.6,
    body: [260, 340], tail: [130, 180],      // px
    speed: [110, 180],                       // швидкість уздовж лінії, px/с
    pause: [1.5, 7],                         // пауза між проходами на лінії, с (частота появи)
    fadeTo: 0.7,                             // згасає до цієї частки ширини екрана
    spread: 'random'
  },

  // прийшов новий замір: світла хвиля фронтом через увесь екран, з невеликим розкидом по лініях
  pulse: {
    kind: 'look', trigger: 'newReading',
    color: '255,255,255', alpha: 0.28, alphaOdd: 0.28, width: 1.2,
    body: 200, tail: 110, speed: 620,        // базові значення
    spread: { speed: 0.015, body: 0.08, tail: 0.08 }   // фронт «стіною»: швидкість ±1,5 %, довжина тіла й хвоста ±8 %
  },

  // немає світла: лінії плавно гальмують до повної зупинки; вигляд — пунктир (look.dashedWhenOff)
  outage: { kind: 'motion', when: (s) => s.off, factor: 0, ease: 6, priority: 10 }
};

// значення атрибута для лінії k: діапазон [a, b] або число з розкидом
function pick(r, v, spread) {
  if (Array.isArray(v)) return between(r, v[0], v[1]);
  return typeof spread === 'number' ? v * (1 + between(r, -spread, spread)) : v;
}

// параметри ефекту вигляду для лінії k (детерміновано: сид лінії + назва ефекту; для 'front' — ще й номер запуску)
export function fxParams(name, k, run = 0) {
  const e = EFFECTS[name], r = rngFor(k, name + ':' + run);
  const sp = (a) => (e.spread && typeof e.spread === 'object' ? e.spread[a] : e.spread);
  const body = pick(r, e.body, sp('body')), tail = pick(r, e.tail, sp('tail')), speed = pick(r, e.speed, sp('speed'));
  const pause = e.pause ? pick(r, e.pause) : 0;
  return { body, tail, speed, pause, offset: r() };   // offset — зсув першої появи (частка циклу) для 'random'
}
