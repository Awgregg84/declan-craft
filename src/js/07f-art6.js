/* ===================== Pictures, skins and models for the sixth wish list ===================== */
// Story books of old tales; and (further down) the laser blaster, money and the store, the train, the planets,
// the Ghostbusters world and the Life Cycle world.
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
}
function buildModels6() {
}
