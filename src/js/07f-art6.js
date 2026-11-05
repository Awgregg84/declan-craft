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
}
function buildSkins6() {
}
function buildModels6() {
}
