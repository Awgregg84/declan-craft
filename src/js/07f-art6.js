/* ===================== Pictures, skins and models for the sixth wish list ===================== */
// Story books of old tales; and (further down) the laser blaster, money and the store, the train, the planets,
// the Ghostbusters world and the Life Cycle world.
function buildBlockTiles6() {
  buildPlanetTiles();
  // a train station's platform: stone slabs with a yellow safety line along the edge
  addTile('station_top', p => { p.fill((x, y) => { const v = 150 + ((x * 7 + y * 13) % 5) * 4; return (x === 0 || x === 15) ? [92, 92, 92] : y < 3 ? (y === 2 ? C('#3a3a3a') : C('#f2cf3a')) : [v, v, v]; }); });
  addTile('station_side', p => { p.fill((x, y) => y < 3 ? C('#f2cf3a') : y === 3 ? C('#3a3a3a') : ((y - 4) % 6 === 5 || (x + ((y - 4) / 6 | 0) * 8) % 16 === 0) ? [84, 84, 84] : [128 + (x * 5 % 9), 128 + (x * 5 % 9), 128 + (x * 5 % 9)]); });
}
/* the planets' ground: red Mars dust and rock, Jupiter's cloud, and Uranus's blue-green ice */
function buildPlanetTiles() {
  addTile('mars_dust', p => { const f = vfield(p.r, 4); p.fill((x, y) => { const v = f(x, y) * 18 + (p.r() * 16 - 8); return p.r() < 0.05 ? [130 + v, 52 + v * 0.5, 30] : [196 + v, 96 + v * 0.6, 58 + v * 0.4]; }); });
  addTile('mars_rock', p => { paintStone(p); const d = p.d; for (let i = 0; i < 256; i++) { const g = d[i * 4]; d[i * 4] = Math.min(255, g * 1.05 + 30); d[i * 4 + 1] = g * 0.5; d[i * 4 + 2] = g * 0.36; } });
  addTile('cloud', p => { const f = vfield(p.r, 3); p.fill((x, y) => { const v = 236 + f(x, y) * 14 + (p.r() * 6 - 3); return [v, v * 0.96, v * 0.86]; }); });
  addTile('uranus_ice', p => { const f = vfield(p.r, 4); p.fill((x, y) => { const v = f(x, y) * 20 + (p.r() * 10 - 5); return (x + y * 3) % 11 === 0 ? [200, 250, 250] : [110 + v, 200 + v, 205 + v]; }); });
}
function buildItemTiles6() {
  // an old tale: a book in its own colour, with a little gold picture on the cover
  const EMB = [
    ['.#.#.', '#####', '#.#.#', '#####', '.###.'],   // a pig's face
    ['#####', '#####', '.###.', '..#..', '.###.'],   // a bowl of porridge
    ['.###.', '#.#.#', '#####', '#.#.#', '#...#'],   // a tortoise's shell
    ['..#..', '.###.', '.###.', '#####', '#####'],   // a red hood
    ['..#..', '.##..', '..##.', '.##..', '..#..'],   // a beanstalk
    ['#...#', '##.##', '#####', '.###.', '..#..'],   // a wolf's face
    ['.###.', '.#.#.', '#####', '.###.', '##.##'],   // a gingerbread man
    ['..##.', '...#.', '.###.', '####.', '.##..'],   // a swan
  ];
  TALES.forEach((t, k) => addTile('tale_' + k, p => {
    const c = C(t.cover);
    shadeMask(p, mask(poly([[2, 4], [11, 2], [14, 11.5], [5, 14]])), [c, c.map(v => Math.min(255, v * 1.3 + 20)), mulc(c, 0.6), mulc(c, 0.25)], true);
    for (let i = 0; i < 9; i++) { p.px(5 + i, 13 - i * 0.25, C('#f4ecd8')); p.px(5 + i, 12.4 - i * 0.25, C('#d8ccb0')); }
    const e = EMB[k];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (e[y][x] === '#') p.px(6 + x, 4 + y + Math.round(x * 0.2), C('#f2d24a'));
  }));
  // the laser blaster: a silver body, a glass tip and a glowing heart; and a bright dot of beam in each colour
  addTile('laser', p => {
    shadeMask(p, mask(poly([[1.5, 5], [12, 5], [12, 8.5], [7, 8.5], [6, 14], [2.5, 14], [3.5, 8.5], [1.5, 8.5]])), PAL.iron, true);
    shadeMask(p, mask(poly([[12, 5.5], [15, 6], [15, 8], [12, 8]])), [C('#8ae8ff'), C('#e0faff'), C('#4ab0d8'), C('#14485a')], true);
    p.rect(5, 6, 3, 2, C('#ff4a3a')); p.px(6, 6, C('#ffd0c8'));
    p.rect(2, 9, 1, 3, C('#5a5a5a'));
  });
  LASER_COLORS.forEach(([n, hex], k) => addTile('laser_' + k, p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 3 ? C('#ffffff') : d < 7 ? mixc(C(hex), C('#ffffff'), Math.max(0, 0.6 - d * 0.08)) : null; })));
  // the proton pack (a backpack with a wand on a cable), the ghost trap, the ghost detector; slime and proton sparks
  addTile('proton_pack', p => {
    shadeMask(p, mask(poly([[2, 2], [9, 2], [9, 14], [2, 14]])), [C('#5a5a5a'), C('#8a8a8a'), C('#3a3a3a'), C('#141414')], true);
    p.rect(3, 4, 5, 2, C('#2a2a2a')); p.px(4, 9, C('#ff3a2a')); p.px(6, 9, C('#3aff6a')); p.rect(3, 11, 5, 1, C('#f2c83a'));
    for (let i = 0; i < 4; i++) p.px(10 + i, 12 - i, C('#2a2a2a'));
    shadeMask(p, mask(capsule([[12, 9], [15, 3]], 1.6)), [C('#7a7a7a'), C('#aaaaaa'), C('#4a4a4a'), C('#141414')], true);
    p.px(15, 2, C('#ffb23a'));
  });
  addTile('ghost_trap', p => {
    shadeMask(p, mask(poly([[2, 8], [14, 8], [14, 13], [2, 13]])), [C('#3a3a3a'), C('#6a6a6a'), C('#202020'), C('#080808')], true);
    p.rect(2, 8, 12, 1, C('#f2c83a')); p.px(12, 10, C('#ff3a2a'));
    for (let i = 0; i < 6; i++) p.px(7 + (i % 2), 7 - i, C('#2a2a2a'));
    p.rect(6, 1, 4, 1, C('#2a2a2a')); p.px(9, 2, C('#f2c83a'));
  });
  addTile('ghost_detector', p => {
    shadeMask(p, mask(poly([[4, 4], [12, 4], [12, 15], [4, 15]])), [C('#2a2a2a'), C('#5a5a5a'), C('#141414'), C('#050505')], true);
    for (const [x, c] of [[5, '#ffd23a'], [7, '#ffd23a'], [9, '#ff8a3a'], [11, '#ff3a2a']]) p.px(x - 0.5 | 0, 6, C(c));
    p.rect(5, 8, 6, 3, C('#3aff6a')); p.px(6, 9, C('#1a6a2a')); p.px(9, 10, C('#1a6a2a'));
    shadeMask(p, mask(capsule([[3, 4], [1, 1]], 1.4)), [C('#7a7a7a'), C('#aaaaaa'), C('#4a4a4a'), C('#141414')], true);
    shadeMask(p, mask(capsule([[13, 4], [15, 1]], 1.4)), [C('#7a7a7a'), C('#aaaaaa'), C('#4a4a4a'), C('#141414')], true);
  });
  addTile('slime', p => shadeMask(p, mask(circle(8, 8, 6)), [C('#6ae04a'), C('#b8ff8a'), C('#3a9a2a'), C('#1a4a10')], false));
  addTile('proton', p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 3 ? C('#fffbe0') : d < 7 ? mixc(C('#ff8a2a'), C('#fff0c0'), Math.max(0, 0.7 - d * 0.1)) : null; }));
  // a train engine from the side, and a station platform with its sign
  addTile('train', p => {
    shadeMask(p, mask(poly([[1, 4], [6, 4], [6, 12], [1, 12]])), [C('#c82a2a'), C('#f05a4a'), C('#8a1a1a'), C('#3a0a0a')], true);   // the cab
    p.rect(2, 5, 3, 2, C('#9ad8f0'));
    shadeMask(p, mask(poly([[6, 7], [14, 7], [14, 12], [6, 12]])), [C('#2a2a2e'), C('#5a5a62'), C('#141418'), C('#050505')], true);   // the boiler
    p.rect(11, 4, 2, 3, C('#2a2a2e')); p.rect(10, 3, 4, 1, C('#e8b830'));   // the chimney
    p.rect(8, 7, 1, 5, C('#e8b830')); p.rect(12, 7, 1, 5, C('#e8b830'));
    for (const cx of [3, 7.5, 12]) shadeMask(p, mask(circle(cx, 13, 1.9)), [C('#c82a2a'), C('#f05a4a'), C('#5a0a0a'), C('#1a0505')], true);
    p.px(15, 10, C('#fff6b0'));
  });
  // money: a gold coin with a $ on it, and a green ten dollar bill
  const DOLLAR = ['.#.', '###', '#..', '###', '..#', '###', '.#.'];
  addTile('coin', p => {
    shadeMask(p, mask(circle(8, 8, 6)), PAL.gold, true);
    for (let y = 0; y < 7; y++) for (let x = 0; x < 3; x++) if (DOLLAR[y][x] === '#') p.px(7 + x, 5 + y, C('#a87a10'));
  });
  addTile('bill', p => {
    shadeMask(p, mask(poly([[1, 4], [15, 4], [15, 12], [1, 12]])), [C('#6ab86a'), C('#9ad89a'), C('#3a8a3a'), C('#1a3a1a')], true);
    p.rect(2, 5, 12, 6, C('#8ac88a'));
    shadeMask(p, mask(circle(8, 8, 2.6)), [C('#4a9a4a'), C('#6ab86a'), C('#2a6a2a'), C('#1a3a1a')], false);
    p.px(3, 6, C('#2a6a2a')); p.px(12, 9, C('#2a6a2a')); p.px(4, 9, C('#2a6a2a')); p.px(12, 6, C('#2a6a2a'));
    p.px(8, 7, C('#e8f8e8')); p.px(8, 8, C('#e8f8e8'));
  });
}
function buildSkins6() {
  // the ghosts: a slimy green blob with a big grin, a floating sheet with dark eyes, and the marshmallow giant in a sailor hat
  addSkin('slimer', S => {
    const g = C('#6ae04a'), gL = C('#a8ff7a'), gD = C('#3a9a2a');
    paintBox(S, 0, 0, 10, 9, 8, (f, x, y, fw, fh) => {
      if (f === 'front') { if (y === 2 && (x === 2 || x === 7)) return C('#ffffff'); if (y === 3 && (x === 2 || x === 7)) return C('#1a1a1a'); if (y >= 5 && y <= 7 && x >= 2 && x <= 7) return y === 5 || y === 7 ? C('#8a1a1a') : (x % 2 ? C('#f4f4e0') : C('#c82a2a')); }
      return (x * 3 + y * 5) % 7 === 0 ? gL : y > fh - 3 ? gD : S.jit(g, 8);
    });
    paintBox(S, 36, 0, 4, 3, 4, () => S.jit(gD, 6));
    paintBox(S, 0, 17, 3, 5, 2, () => S.jit(g, 8));
  });
  addSkin('sheetghost', S => {
    const w = C('#f4f4fa'), wD = C('#c8c8d8');
    paintBox(S, 0, 0, 8, 14, 8, (f, x, y) => f === 'front' && y >= 3 && y <= 5 && (x === 2 || x === 5) ? C('#1a1a2a') : f === 'front' && y >= 8 && y <= 9 && x >= 3 && x <= 4 ? C('#2a2a3a') : (y > 11 ? wD : S.jit(w, 4)));
    paintBox(S, 0, 22, 9, 2, 9, (f, x) => (x % 3 === 0) ? wD : S.jit(w, 4));
    paintBox(S, 36, 0, 2, 3, 2, () => S.jit(w, 4));
  });
  addSkin('marshmallow', S => {
    const w = C('#f6f2ea'), wD = C('#dcd6c8');
    paintBox(S, 0, 0, 3, 6, 4, (f, x, y) => y > 4 ? wD : S.jit(w, 3));   // legs
    paintBox(S, 0, 10, 12, 10, 8, (f, x, y) => (y % 4 === 3 ? wD : S.jit(w, 3)));   // a puffy body
    paintBox(S, 40, 0, 3, 8, 4, (f, x, y) => (y % 3 === 2 ? wD : S.jit(w, 3)));   // arms
    paintBox(S, 0, 28, 8, 6, 8, (f, x, y) => f === 'front' ? (y === 2 && (x === 2 || x === 5) ? C('#1a1a1a') : y === 4 && x >= 2 && x <= 5 ? C('#c86a6a') : (y === 3 && (x === 1 || x === 6) ? C('#f2b8b8') : w)) : S.jit(w, 3));   // a smiley face
    paintBox(S, 0, 42, 9, 2, 9, (f, x, y) => f === 'top' ? C('#f4f4f4') : y === 1 ? C('#1a4ab8') : C('#f4f4f4'));   // the sailor hat
    paintBox(S, 0, 53, 13, 2, 9, (f, x, y) => f === 'front' && x >= 5 && x <= 7 ? C('#d8282a') : C('#2a5ad0'));   // the collar and bow
  });
  addSkin('ghost_trap', S => {
    const g = C('#3a3a3a'), y = C('#f2c83a');
    paintBox(S, 0, 0, 10, 3, 6, (f, x, yy) => yy === 0 ? y : (f === 'front' && x === 8 && yy === 1) ? C('#ff3a2a') : S.jit(g, 6));
    paintBox(S, 0, 9, 5, 1, 6, (f) => f === 'bottom' ? C('#fff6c0') : S.jit(C('#2a2a2a'), 5));
    paintBox(S, 22, 9, 5, 1, 6, (f) => f === 'bottom' ? C('#fff6c0') : S.jit(C('#2a2a2a'), 5));
  });
  // the train: a red engine with a black boiler and gold trim; open carriages in green with a cream roof
  addSkin('train', S => {
    const red = C('#c82a2a'), redD = C('#8a1a1a'), blk = C('#2a2a2e'), blkL = C('#4a4a52'), gold = C('#e8b830');
    paintBox(S, 0, 0, 8, 2, 18, (f, x, y, fw, fh) => f === 'top' ? S.jit(C('#3a3a3a'), 4) : y === 0 ? gold : S.jit(redD, 4));   // the frame
    paintBox(S, 0, 20, 6, 6, 10, (f, x, y, fw, fh) => f === 'front' ? ((x === 2 || x === 3) && (y === 2 || y === 3) ? C('#d8d8d8') : blk) : (f === 'right' || f === 'left') && x % 4 === 1 ? gold : y === 0 || f === 'top' ? S.jit(blkL, 4) : S.jit(blk, 4));   // the boiler, with gold bands
    paintBox(S, 32, 20, 2, 3, 2, (f, x, y) => y === 0 ? gold : S.jit(blk, 4));   // the chimney
    paintBox(S, 40, 20, 8, 2, 1, (f, x, y) => (x % 2) ? C('#5a5a5a') : C('#8a8a8a'));   // the cowcatcher
    paintBox(S, 40, 23, 2, 2, 1, (f) => f === 'front' ? C('#fff6b0') : gold);   // the lamp
    paintBox(S, 0, 36, 8, 8, 7, (f, x, y, fw, fh) => {   // the cab, with windows and a gold number 6
      if ((f === 'right' || f === 'left') && y >= 1 && y <= 3 && x >= 1 && x <= 5) return C('#9ad8f0');
      if (f === 'front' && y >= 1 && y <= 2 && (x <= 2 || x >= 5)) return C('#9ad8f0');
      if ((f === 'right' || f === 'left') && y >= 5 && y <= 6 && x >= 2 && x <= 4) return gold;
      return y === fh - 1 ? redD : S.jit(red, 4);
    });
    paintBox(S, 0, 51, 9, 1, 8, () => S.jit(blk, 5));   // the cab roof
    paintBox(S, 52, 0, 1, 3, 3, (f, x, y) => (f === 'right' || f === 'left') ? (x === 1 && y === 1 ? gold : C('#c82a2a')) : C('#1a1a1a'));   // a wheel
  });
  addSkin('carriage', S => {
    const g = C('#2a8a4a'), gD = C('#1a5a2a'), cream = C('#f2e8c8'), gold = C('#e8b830');
    paintBox(S, 0, 0, 8, 2, 16, (f, x, y) => f === 'top' ? ((x + y) % 4 < 2 ? C('#8a5a32') : C('#7a4a28')) : y === 0 ? gold : S.jit(C('#3a3a3a'), 4));   // the floor and frame
    paintBox(S, 0, 18, 1, 3, 16, (f, x, y) => y === 0 ? gold : S.jit(g, 4));   // the sides
    paintBox(S, 34, 18, 6, 3, 1, (f, x, y) => y === 0 ? gold : S.jit(g, 4));   // the ends
    paintBox(S, 48, 0, 1, 4, 1, () => S.jit(gD, 4));   // the posts
    paintBox(S, 0, 37, 9, 1, 17, (f, x, y) => f === 'top' ? ((x % 3) ? S.jit(cream, 3) : C('#d8c8a0')) : S.jit(cream, 3));   // the roof
    paintBox(S, 34, 22, 6, 2, 2, () => S.jit(C('#8a3a2a'), 5));   // the benches
    paintBox(S, 52, 0, 1, 3, 3, (f, x, y) => (f === 'right' || f === 'left') ? (x === 1 && y === 1 ? gold : C('#2a5a2a')) : C('#1a1a1a'));
  });
}
function buildModels6() {
  defModel('slimer', 'slimer', 1 / 16, [
    { name: 'body', box: [-5, 3, -4, 10, 9, 8], uv: [0, 0] },
    { name: 'tail', box: [-2, 0, -2, 4, 3, 4], uv: [36, 0] },
    { name: 'rarm', box: [-8, 6, -1, 3, 5, 2], uv: [0, 17], pivot: [-5, 10, 0] },
    { name: 'larm', box: [5, 6, -1, 3, 5, 2], uv: [0, 17], pivot: [5, 10, 0] },
  ]);
  defModel('sheetghost', 'sheetghost', 1 / 16, [
    { name: 'body', boxes: [[-4, 2, -4, 8, 14, 8, 0, 0], [-4.5, 0, -4.5, 9, 2, 9, 0, 22]] },
    { name: 'rarm', box: [-6, 9, -1, 2, 3, 2], uv: [36, 0], pivot: [-4, 11, 0] },
    { name: 'larm', box: [4, 9, -1, 2, 3, 2], uv: [36, 0], pivot: [4, 11, 0] },
  ]);
  defModel('marshmallow', 'marshmallow', 4 / 16, [
    { name: 'rleg', box: [-4, 0, -2, 3, 6, 4], uv: [0, 0], pivot: [-2.5, 6, 0] },
    { name: 'lleg', box: [1, 0, -2, 3, 6, 4], uv: [0, 0], pivot: [2.5, 6, 0] },
    { name: 'body', boxes: [[-6, 6, -4, 12, 10, 8, 0, 10], [-6.5, 14, -4.5, 13, 2, 9, 0, 53]] },
    { name: 'rarm', box: [-9, 8, -2, 3, 8, 4], uv: [40, 0], pivot: [-7.5, 15, 0] },
    { name: 'larm', box: [6, 8, -2, 3, 8, 4], uv: [40, 0], pivot: [7.5, 15, 0] },
    { name: 'head', boxes: [[-4, 16, -4, 8, 6, 8, 0, 28], [-4.5, 22, -4.5, 9, 2, 9, 0, 42]], pivot: [0, 16, 0] },
  ]);
  defModel('ghost_trap', 'ghost_trap', 1 / 16, [
    { name: 'base', box: [-5, 0, -3, 10, 3, 6], uv: [0, 0] },
    { name: 'lidL', box: [-5, 3, -3, 5, 1, 6], uv: [0, 9], pivot: [-5, 3, 0] },
    { name: 'lidR', box: [0, 3, -3, 5, 1, 6], uv: [22, 9], pivot: [5, 3, 0] },
  ]);
  // the train, four pixels to a skin pixel (a quarter of a block each): the engine and a carriage, front to +z
  const wheel = (name, x, z) => ({ name, box: [x, 0, z - 1.5, 1, 3, 3], uv: [52, 0], pivot: [x + 0.5, 1.5, z] });
  defModel('train', 'train', 4 / 16, [
    { name: 'body', boxes: [[-4, 1, -9, 8, 2, 18, 0, 0], [-3, 3, -1, 6, 6, 10, 0, 20], [-1, 9, 5, 2, 3, 2, 32, 20], [-4, 0, 9, 8, 2, 1, 40, 20], [-1, 6, 9, 2, 2, 1, 40, 23], [-4, 3, -9, 8, 8, 7, 0, 36], [-4.5, 11, -9.5, 9, 1, 8, 0, 51]] },
    wheel('wl0', -4.5, -6), wheel('wl1', -4.5, -1), wheel('wl2', -4.5, 5), wheel('wr0', 3.5, -6), wheel('wr1', 3.5, -1), wheel('wr2', 3.5, 5),
  ]);
  defModel('carriage', 'carriage', 4 / 16, [
    { name: 'body', boxes: [[-4, 1, -8, 8, 2, 16, 0, 0], [-4, 3, -8, 1, 3, 16, 0, 18], [3, 3, -8, 1, 3, 16, 0, 18], [-3, 3, 7, 6, 3, 1, 34, 18], [-3, 3, -8, 6, 3, 1, 34, 18],
      [-4, 6, -8, 1, 4, 1, 48, 0], [3, 6, -8, 1, 4, 1, 48, 0], [-4, 6, 7, 1, 4, 1, 48, 0], [3, 6, 7, 1, 4, 1, 48, 0], [-4.5, 10, -8.5, 9, 1, 17, 0, 37],
      [-3, 3, -5, 6, 2, 2, 34, 22], [-3, 3, 3, 6, 2, 2, 34, 22]] },
    wheel('wl0', -4.5, -5), wheel('wl1', -4.5, 5), wheel('wr0', 3.5, -5), wheel('wr1', 3.5, 5),
  ]);
}
