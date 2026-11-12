/* ===================== Pictures, skins and models for the seventh wish list (the Mars world) ===================== */
function buildBlockTiles7() {
  // the race track: dark, a little speckled; and a boost pad: glowing arrows on the track
  addTile('track', p => p.fill(() => { const v = 52 + p.r() * 14; return p.r() < 0.06 ? [v + 30, v + 26, v + 24] : [v, v * 0.96, v]; }));
  addTile('boost', p => p.fill((x, y) => {
    const d = Math.abs(x - 7.5) + ((y + 2) % 8), v = 46 + p.r() * 10;
    return d > 6.2 && d < 8.4 ? [255, 214, 60] : d >= 8.4 && d < 9.6 ? [255, 130, 30] : [v, v * 0.9, v * 1.25];
  }));
}
function buildItemTiles7() {
  // a Mars crystal: a spiky pink-orange gem
  addTile('mars_crystal', p => {
    shadeMask(p, mask(poly([[5, 14], [3.5, 8], [6, 3], [8, 7], [10.5, 1.5], [13, 8], [11.5, 14]])), [C('#ff7a5a'), C('#ffd0b8'), C('#c8402a'), C('#5a1408')], true);
    p.px(6, 6, C('#fff0e8')); p.px(10, 5, C('#fff0e8')); p.px(10, 6, C('#ffe0d0'));
  });
  // the rover buggy: orange and white, with big wheels and a dish; and the flying saucer, silver with a glass dome
  addTile('buggy', p => {
    shadeMask(p, mask(poly([[1.5, 7], [14.5, 7], [14.5, 10.5], [1.5, 10.5]])), [C('#f08a2a'), C('#ffc070'), C('#b85a10'), C('#4a2204')], true);
    p.rect(5, 4, 1, 3, C('#d8d8d8')); p.rect(5, 3, 5, 1, C('#d8d8d8')); p.rect(9, 4, 1, 3, C('#d8d8d8'));
    p.rect(2, 4, 1, 3, C('#9a9a9a')); p.rect(1, 3, 3, 1, C('#f4f4f4'));
    p.px(14, 8, C('#fff3a0'));
    for (const cx of [4, 12]) shadeMask(p, mask(circle(cx, 12, 2.6)), [C('#2a2a2a'), C('#5a5a5a'), C('#141414'), C('#050505')], true);
    p.px(4, 12, C('#f08a2a')); p.px(12, 12, C('#f08a2a'));
  });
  addTile('saucer', p => {
    shadeMask(p, mask((x, y) => Math.hypot((x - 8) / 4, (y - 7) / 3.4) < 1 && y < 8.5), [C('#8adcf4'), C('#e0faff'), C('#4aa8c8'), C('#14485a')], true);
    shadeMask(p, mask((x, y) => Math.hypot((x - 8) / 7.4, (y - 9.5) / 2.6) < 1), [C('#b8b8c4'), C('#eeeef6'), C('#74747e'), C('#26262c')], true);
    for (const x of [3, 6, 9, 12]) p.px(x, 10, C('#ffe04a'));
    p.px(7, 5, C('#ffffff'));
  });
}
const MARTIAN_SKINS = [['#58c84a', '#2e8a2a', '#a8f08a'], ['#4a9ae0', '#2a5aa8', '#a0d0ff'], ['#e86ab8', '#a83a80', '#ffb0e0'], ['#f2cf3a', '#b8902a', '#fff0a0']];   // (the last is the race marshal)
function buildSkins7() {
  // the Martians: little people with a big head, two big dark eyes, a smile and two wobbly antennae
  MARTIAN_SKINS.forEach(([hex, dk, lt], k) => addSkin('martian_' + k, S => {
    const c = C(hex), cD = C(dk), cL = C(lt), suit = k === 3 ? C('#f4f4f4') : mixc(C(dk), C('#404060'), 0.5);
    paintBox(S, 0, 0, 8, 7, 8, (f, x, y, fw, fh) => {   // the head
      if (f === 'front') {
        if (y >= 2 && y <= 4 && (x === 1 || x === 2 || x === 5 || x === 6)) return (y === 2 && (x === 2 || x === 6)) ? C('#ffffff') : C('#10101c');
        if (y === 5 && x >= 3 && x <= 4) return cD;
        if (y === 5 && (x === 2 || x === 5)) return mixc(c, cD, 0.5);
      }
      return f === 'top' ? S.jit(cL, 6) : y === fh - 1 && f !== 'bottom' ? cD : (x * 5 + y * 3) % 11 === 0 ? cL : S.jit(c, 6);
    });
    paintBox(S, 0, 16, 6, 6, 4, (f, x, y, fw) => {   // the body, in a little suit with a badge (the marshal's is checked)
      if (k === 3) return ((x + y) & 1) ? C('#f4f4f4') : C('#1a1a1a');
      if (f === 'front' && y === 1 && x === 4) return C('#ffe04a');
      return y === 4 ? C('#d8d8e0') : S.jit(suit, 6);
    });
    paintBox(S, 24, 16, 2, 4, 2, (f, x, y) => y === 3 ? C('#3a3a48') : S.jit(suit, 6));   // a leg, with a boot
    paintBox(S, 34, 16, 2, 6, 2, (f, x, y) => y >= 5 ? S.jit(c, 6) : S.jit(suit, 6));   // an arm, with a hand
    paintBox(S, 44, 16, 1, 3, 1, () => cD);   // an antenna, and the ball on its end
    paintBox(S, 50, 16, 2, 2, 2, () => S.jit(C('#ffe04a'), 10));
    paintBox(S, 0, 28, 1, 8, 1, () => C('#8a6a3a'));   // the marshal's flag: a pole and black-and-white checks
    paintBox(S, 8, 28, 5, 4, 1, (f, x, y) => ((x + y) & 1) ? C('#f4f4f4') : C('#1a1a1a'));
  }));
  // the rover buggy
  addSkin('buggy', S => {
    const o = C('#f08a2a'), oD = C('#b85a10'), w = C('#eeeef2'), g = C('#3a3a40');
    paintBox(S, 0, 0, 10, 2, 16, (f, x, y, fw, fh) => f === 'top' ? ((x + y) % 5 === 0 ? C('#55555c') : S.jit(g, 5)) : f === 'bottom' ? C('#1a1a1a') : y === 0 ? w : S.jit(o, 5));   // the chassis
    paintBox(S, 52, 0, 2, 4, 4, (f, x, y) => (f === 'left' || f === 'right') ? ((x === 1 || x === 2) && (y === 1 || y === 2) ? o : C('#1c1c1c')) : ((x + y) & 1 ? C('#2a2a2a') : C('#161616')));   // a big knobbly wheel
    paintBox(S, 0, 20, 8, 2, 4, (f, x, y, fw) => f === 'front' && y === 0 && (x <= 1 || x >= fw - 2) ? C('#fff3a0') : f === 'top' ? S.jit(w, 4) : S.jit(o, 5));   // the nose, with headlights
    paintBox(S, 24, 20, 6, 1, 4, () => S.jit(C('#4a4a58'), 6));   // the seat
    paintBox(S, 44, 20, 6, 5, 1, (f, x, y) => y === 0 ? w : S.jit(C('#4a4a58'), 6));
    paintBox(S, 58, 10, 1, 6, 1, () => C('#d8d8de'));   // a roll bar's post, and its top
    paintBox(S, 0, 28, 8, 1, 1, () => C('#d8d8de'));
    paintBox(S, 0, 32, 8, 3, 4, (f, x, y) => f === 'top' ? ((x & 1) ? C('#2a4a8a') : C('#3a6ac0')) : y === 0 ? w : S.jit(oD, 5));   // the box on the back, with a solar panel
    paintBox(S, 24, 32, 4, 1, 4, (f) => f === 'top' ? C('#f4f4f8') : C('#b0b0b8'));   // the dish
  });
  // the flying saucer: a silver disc with lights round the rim; its glass dome is a skin of its own (see-through)
  addSkin('saucer', S => {
    const s = C('#b4b4c0'), sL = C('#e6e6f0'), sD = C('#6e6e7a');
    paintBox(S, 0, 0, 10, 1, 10, (f, x, y, fw, fh) => f === 'top' ? (Math.hypot(x - 4.5, y - 4.5) > 4.2 ? sD : S.jit(sL, 4)) : f === 'bottom' ? S.jit(sD, 4) : (x % 3 === 1 ? C('#ffe04a') : s));   // the rim
    paintBox(S, 0, 12, 8, 1, 8, (f, x, y) => f === 'top' ? S.jit(s, 5) : sL);   // the top of the hull
    paintBox(S, 0, 22, 6, 1, 6, (f, x, y) => f === 'bottom' ? (Math.hypot(x - 2.5, y - 2.5) < 1.6 ? C('#8affc8') : S.jit(sD, 4)) : S.jit(sD, 4));   // underneath, where the beam comes out
    paintBox(S, 0, 30, 4, 1, 4, () => S.jit(C('#4a4a58'), 6));   // the seat inside
  });
  addSkin('saucer_glass', S => {
    paintBox(S, 0, 0, 6, 5, 6, (f, x, y, fw, fh) => {
      if (f === 'bottom') return null;
      if (f !== 'top' && y === fh - 1) return C('#d8d8e4');
      if ((f === 'front' || f === 'left') && Math.abs(x - y - 1) < 1) return [255, 255, 255, 150];
      return [150, 235, 255, 70];
    });
  });
  addSkin('saucer_beam', S => {   // the tractor beam: pale green light, wider further down
    for (const [v, w] of [[0, 2], [8, 3], [16, 4]]) paintBox(S, 0, v, w, 4, w, (f, x, y) => f === 'top' || f === 'bottom' ? null : [140, 255, 200, (x + y) % 3 === 0 ? 110 : 60]);
  });
  // a pickup box: bright stripes with a star on each side
  addSkin('itembox', S => {
    paintBox(S, 0, 0, 10, 10, 10, (f, x, y) => {
      if (Math.abs(x - 4.5) + Math.abs(y - 4.5) < 2.6) return C('#ffffff');
      return [C('#ff5a5a'), C('#ffc83a'), C('#5ad06a'), C('#4a9af0')][((x + y) >> 1) & 3];
    });
  });
}
function buildModels7() {
  MARTIAN_SKINS.forEach((q, k) => defModel('martian_' + k, 'martian_' + k, 1 / 16, [
    { name: 'rleg', box: [-3, 0, -1, 2, 4, 2], uv: [24, 16], pivot: [-2, 4, 0] },
    { name: 'lleg', box: [1, 0, -1, 2, 4, 2], uv: [24, 16], pivot: [2, 4, 0] },
    { name: 'body', box: [-3, 4, -2, 6, 6, 4], uv: [0, 16] },
    { name: 'rarm', boxes: k === 3 ? [[-5, 4, -1, 2, 6, 2, 34, 16], [-4.5, -3, -0.5, 1, 8, 1, 0, 28], [-4.5, -3, 0.5, 5, 4, 1, 8, 28]] : [[-5, 4, -1, 2, 6, 2, 34, 16]], pivot: [-4, 9.5, 0] },
    { name: 'larm', box: [3, 4, -1, 2, 6, 2], uv: [34, 16], pivot: [4, 9.5, 0] },
    { name: 'head', boxes: [[-4, 10, -4, 8, 7, 8, 0, 0], [-2.5, 17, -0.5, 1, 3, 1, 44, 16], [1.5, 17, -0.5, 1, 3, 1, 44, 16], [-3, 20, -1, 2, 2, 2, 50, 16], [1, 20, -1, 2, 2, 2, 50, 16]], pivot: [0, 10, 0] },
  ]));
  const wheel = (name, x, z) => ({ name, box: [x, 0, z - 2, 2, 4, 4], uv: [52, 0], pivot: [x + 1, 2, z] });
  defModel('buggy', 'buggy', 2 / 16, [
    { name: 'body', boxes: [
      [-5, 2, -8, 10, 2, 16, 0, 0], [-4, 4, 5, 8, 2, 4, 0, 20],
      [-3, 4, -3, 6, 1, 4, 24, 20], [-3, 5, -4, 6, 5, 1, 44, 20],
      [-4.5, 4, -5, 1, 6, 1, 58, 10], [3.5, 4, -5, 1, 6, 1, 58, 10], [-4, 10, -5, 8, 1, 1, 0, 28],
      [-4, 4, -9, 8, 3, 4, 0, 32], [1.5, 7, -8, 1, 6, 1, 58, 10], [0, 13, -9.5, 4, 1, 4, 24, 32],
    ] },
    wheel('wfl', -7, 5), wheel('wfr', 5, 5), wheel('wbl', -7, -5), wheel('wbr', 5, -5),
  ]);
  defModel('saucer', 'saucer', 4 / 16, [
    { name: 'body', boxes: [[-5, 1, -5, 10, 1, 10, 0, 0], [-4, 2, -4, 8, 1, 8, 0, 12], [-3, 0, -3, 6, 1, 6, 0, 22], [-2, 3, -2, 4, 1, 4, 0, 30]] },
  ]);
  defModel('saucer_glass', 'saucer_glass', 4 / 16, [{ name: 'dome', box: [-3, 3, -3, 6, 5, 6], uv: [0, 0] }]);
  defModel('saucer_beam', 'saucer_beam', 4 / 16, [{ name: 'beam', boxes: [[-1, -4, -1, 2, 4, 2, 0, 0], [-1.5, -8, -1.5, 3, 4, 3, 0, 8], [-2, -12, -2, 4, 4, 4, 0, 16]] }]);
  defModel('itembox', 'itembox', 1 / 16, [{ name: 'box', box: [-5, -5, -5, 10, 10, 10], uv: [0, 0] }]);
}
