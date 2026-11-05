/* ===================== Pictures, skins and models for the fifth wish list ===================== */
// Tanks (one skin painted pale grey and tinted each tank's colour, and one for the tracks), paint shells, and
// (further down) the Hogwarts students, the Quidditch players and the Declan Falls world.
const tankRGB = c => hexRGB(TANK_COLORS[c] || TANK_COLORS[0]).map(v => v / 255);
function tankPal(hex) { const c = C(hex); return [c, c.map(v => Math.min(255, v * 1.3 + 20)), mulc(c, 0.62), mulc(c, 0.25)]; }
function buildItemTiles5() {
  buildFallsItemTiles();
  // a tank from the side, its gun pointing right; and a blob and a fleck of paint, in each colour
  TANK_COLORS.forEach((hex, i) => {
    addTile('tank_' + i, p => {
      const pal = tankPal(hex);
      shadeMask(p, mask(poly([[2, 7.5], [13, 7.5], [14.5, 10], [1, 10]])), pal, true);   // the body
      shadeMask(p, mask(poly([[5, 4], [10, 4], [11, 7.5], [4.5, 7.5]])), pal, true);   // the turret
      p.rect(11, 5, 5, 1, pal[2]); p.px(15, 4, pal[3]); p.px(15, 6, pal[3]);   // the gun
      shadeMask(p, mask(capsule([[2.5, 12], [13.5, 12]], 3.4)), [C('#3a3a3a'), C('#5a5a5a'), C('#1e1e1e'), C('#0a0a0a')], true);   // the tracks
      for (let x = 3; x < 14; x += 2) p.px(x, 12, C('#7a7a7a'));
    });
    addTile('paintball_' + i, p => shadeMask(p, mask(circle(8, 8, 5)), tankPal(hex), false));
    addTile('paint_' + i, p => p.fill(() => p.jit(C(hex), 10)));
  });
}
function buildSkins5() {
  buildFallsSkins();
  for (let i = 0; i < STUDENT_LOOKS; i++) addSkin('student_' + i, S => studentSkin(S, i));
  addSkin('quaffle', S => paintBox(S, 0, 0, 7, 7, 7, (f, x, y) => (x === 3 || y === 3) ? C('#5a1a10') : S.jit(C('#a8321e'), 8)));   // red leather, with seams
  addSkin('tank', S => {   // pale grey, tinted when drawn: plates with rivets and panel lines
    const g = C('#d8d8d8'), gL = C('#f2f2f2'), gD = C('#a8a8a8');
    const plate = (f, x, y, fw, fh) => (x === 0 || y === 0) ? gL : (x === fw - 1 || y === fh - 1) ? gD : (x % 6 === 3 && y % 4 === 2) ? gD : S.jit(g, 5);
    paintBox(S, 0, 0, 10, 5, 18, plate);   // the hull
    paintBox(S, 0, 23, 16, 2, 16, (f, x, y, fw, fh) => f === 'top' && (x === 0 || x === fw - 1 || y === 0 || y === fh - 1) ? gD : f === 'top' && x % 5 === 2 && y % 5 === 2 ? gL : S.jit(g, 5));   // the deck over the tracks
    paintBox(S, 0, 41, 9, 4, 9, (f, x, y, fw, fh) => f === 'top' ? ((x + y) % 7 === 0 ? gD : S.jit(gL, 4)) : y === fh - 1 ? gD : S.jit(g, 5));   // the turret
    paintBox(S, 36, 41, 2, 2, 10, (f, x, y) => f === 'front' ? C('#222222') : S.jit(gD, 4));   // the gun (dark inside its end)
    paintBox(S, 0, 54, 4, 1, 4, (f, x, y) => f === 'top' ? (x === 0 || y === 0 ? gL : gD) : gD);   // the hatch
    paintBox(S, 16, 54, 10, 4, 1, (f, x, y) => f === 'front' && (x === 1 || x === 8) && y === 1 ? C('#fff6b0') : S.jit(gD, 4));   // the front, with two lamps
  });
  addSkin('tank2', S => {   // the tracks: dark rubber and steel
    paintBox(S, 0, 0, 3, 5, 19, (f, x, y, fw, fh) => f === 'right' || f === 'left' ? (Math.hypot(((x % 5) - 2), y - 2.5) < 1.6 ? C('#6a6a6a') : C('#2a2a2a')) : (y + x) % 2 ? C('#3a3a3a') : C('#262626'));
    paintBox(S, 44, 0, 1, 5, 1, () => C('#4e4e4e'));   // a tread
  });
}
/* Hogwarts students: a look painted as a made character's is, in black robes with the house colour at the collar, the
   tie and the cuffs (house = number & 3) */
const STUDENT_LOOK = [   // [skin, hair, hair colour, eyes, glasses, freckles] for each of the eight
  [1, 0, 3, 0, 0, 0], [2, 2, 5, 1, 0, 1], [3, 1, 4, 2, 1, 0], [0, 3, 0, 0, 0, 1], [4, 4, 4, 2, 0, 0], [1, 8, 2, 5, 0, 0], [5, 6, 4, 2, 0, 0], [0, 5, 1, 3, 1, 1],
];
function studentSkin(S, i) {
  const [sk, hair, hc, eyes, gl, fr] = STUDENT_LOOK[i], look = DEFAULT_LOOK.slice();
  Object.assign(look, { [LK.skin]: sk, [LK.hair]: hair, [LK.hairColor]: hc, [LK.eyes]: eyes, [LK.glasses]: gl, [LK.freckles]: fr, [LK.top]: 1, [LK.topColor]: 11, [LK.emblem]: 0, [LK.bottom]: 3, [LK.bottomColor]: 11, [LK.shoes]: 1, [LK.shoeColor]: 11, [LK.hat]: 0 });
  paintLook(S, look);
  const hc2 = C(HOUSES[i & 3].color), hcD = mulc(hc2, 0.7), robe = C('#1c1c22');
  // the body's front is at (20, 20), 8 x 12: a house-coloured collar and a striped tie on a white shirt, the robe either side
  for (let y = 20; y < 32; y++) for (let x = 20; x < 28; x++) {
    const tie = (x === 23 || x === 24) && y >= 21 && y < 28, shirt = x >= 22 && x <= 25 && y < 23;
    S.px(x, y, tie ? ((y % 2) ? hc2 : hcD) : y === 20 && x >= 21 && x <= 26 ? hc2 : shirt ? C('#f0f0f0') : S.jit(robe, 4));
  }
  for (const [u, v] of [[40, 16], [32, 48]]) for (let x = u; x < u + 16; x++) { S.px(x, v + 4 + 10, hc2); S.px(x, v + 4 + 11, S.jit(robe, 4)); }   // the cuffs of the sleeves
  for (const x0 of [16, 28]) for (let x = x0; x < x0 + 4; x++) for (let y = 20; y < 32; y++) S.px(x, y, S.jit(robe, 4));   // the sides
  for (let x = 32; x < 40; x++) for (let y = 20; y < 32; y++) S.px(x, y, y === 20 ? hc2 : S.jit(robe, 4));   // the back
}
function buildModels5() {
  buildFallsModels();
  for (let i = 0; i < STUDENT_LOOKS; i++) humanoid('student_' + i, 'student_' + i, 0.86 / 16);
  defModel('quaffle', 'quaffle', 1 / 16, [{ name: 'ball', boxes: [[-3.5, 0, -3.5, 7, 7, 7, 0, 0]], pivot: [0, 3.5, 0] }]);
  // the tank, two pixels to a skin pixel as the car: the parts are drawn by drawTank (the turret and gun turn, the treads run)
  defModel('tank', 'tank', 2 / 16, [
    { name: 'hull', boxes: [[-5, 1, -9, 10, 5, 18, 0, 0], [-8, 5, -8, 16, 2, 16, 0, 23], [-5, 1, 9, 10, 4, 1, 16, 54]] },
    { name: 'turret', boxes: [[-4.5, 7, -5, 9, 4, 9, 0, 41], [-2, 11, -3, 4, 1, 4, 0, 54]], pivot: [0, 7, -0.5] },
    { name: 'gun', boxes: [[-1, 8, 4, 2, 2, 10, 36, 41]], pivot: [0, 9, 0] },
    { name: 'tracks', skin: 'tank2', boxes: [[-8, 0, -9.5, 3, 5, 19, 0, 0], [5, 0, -9.5, 3, 5, 19, 0, 0]] },
    { name: 'treadL', skin: 'tank2', boxes: [0, 1, 2, 3, 4, 5].map(k => [-8.5, 0, -8.5 + k * 3, 1, 5, 1, 44, 0]) },
    { name: 'treadR', skin: 'tank2', boxes: [0, 1, 2, 3, 4, 5].map(k => [7.5, 0, -8.5 + k * 3, 1, 5, 1, 44, 0]) },
  ]);
}

/* ---- Declan Falls ---- */
// the five characters: a look painted as a made character's is, with each one's own touches on top
const FALLS_LOOKS = [
  [0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 10, 0, 11, 0, 0, 0],    // Dipper: brown hair, an orange T-shirt (and a navy vest), grey shorts
  [0, 2, 3, 0, 0, 0, 1, 0, 0, 0, 6, 8, 0, 2, 7, 0, 8, 5, 8, 0],      // Mabel: long brown hair, a big grin, a pink sweater, a purple skirt, a headband
  [1, 6, 6, 3, 1, 0, 0, 0, 1, 0, 4, 11, 0, 3, 11, 1, 11, 0, 0, 0],   // Grunkle Stan: grey hair, glasses, big ears, a black suit
  [3, 0, 4, 2, 0, 0, 0, 0, 0, 0, 0, 13, 0, 1, 12, 0, 11, 1, 10, 0],  // Soos: a grey cap, a tan shirt with a question mark, brown shorts
  [0, 2, 5, 1, 0, 0, 0, 1, 0, 0, 1, 3, 0, 0, 5, 1, 12, 2, 3, 0],     // Wendy: long red hair, freckles, a green flannel shirt, jeans, a hat
];
function fallsSkin(S, i) {
  paintLook(S, FALLS_LOOKS[i]);
  const body = (fn, rows) => {   // the body's front (20,20), sides (16,20) and (28,20), back (32,20), each 12 high
    for (const [x0, w, f] of [[20, 8, 'front'], [16, 4, 'right'], [28, 4, 'left'], [32, 8, 'back']]) for (let y = 20; y < 20 + (rows || 12); y++) for (let x = x0; x < x0 + w; x++) { const c = fn(f, x - x0, y - 20, w); if (c) S.px(x, y, c); }
  };
  if (i === 0) body((f, x, y, w) => f !== 'front' || x < 2 || x >= 6 ? S.jit(C('#2a3a6a'), 4) : null, 10);   // Dipper's vest
  if (i === 2) body((f, x, y) => f === 'front' && x >= 3 && x <= 4 && y < 5 ? (y < 2 ? C('#c8282a') : C('#f2f2f2')) : f === 'front' && (x === 2 || x === 5) && y < 2 ? C('#c8282a') : null);   // a white shirt and a red bow tie
  if (i === 3) { const g = ['###', '..#', '.##', '...', '.#.']; for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (g[y][x] === '#') S.px(22 + x, 22 + y, C('#3a8ad8')); }   // Soos's question mark
  if (i === 4) {   // Wendy's flannel: green and dark green checks, on the body and the sleeves
    const plaid = (x, y) => { const a = (x % 4) < 2, b = (y % 4) < 2; return a && b ? C('#1e4a24') : a || b ? C('#2e7a34') : C('#5aa85a'); };
    body((f, x, y) => plaid(x, y));
    for (const [u, v] of [[40, 16], [32, 48]]) for (let y = v + 4; y < v + 14; y++) for (let x = u; x < u + 16; x++) S.px(x, y, plaid(x, y));
  }
}
function buildFallsSkins() {
  for (let i = 0; i < FALLS_LOOKS.length; i++) addSkin('falls_' + i, S => fallsSkin(S, i));
  addSkin('gnome', S => {
    const sk = C('#f2c8a8'), blue = C('#3a5ad0'), red = C('#d8282a'), white = C('#f4f4f4'), brown = C('#5a3a1e');
    paintBox(S, 0, 0, 2, 3, 2, () => S.jit(brown, 6));   // legs (boots)
    paintBox(S, 8, 0, 5, 5, 3, (f, x, y) => y === 3 ? C('#2a2a2a') : y === 4 ? S.jit(C('#6a8a3a'), 4) : S.jit(blue, 5));   // a blue shirt, a belt, green trousers
    paintBox(S, 24, 0, 2, 4, 2, (f, x, y) => y === 3 ? sk : S.jit(blue, 5));
    paintBox(S, 32, 0, 4, 4, 4, (f, x, y) => f === 'front' ? (y === 1 && (x === 0 || x === 3) ? C('#2a2a2a') : y === 2 && (x === 1 || x === 2) ? C('#e89a8a') : sk) : f === 'back' || f === 'top' ? white : sk);
    paintBox(S, 48, 0, 4, 3, 1, () => S.jit(white, 6));   // the beard
    paintBox(S, 0, 16, 5, 2, 5, () => S.jit(red, 6)); paintBox(S, 20, 16, 3, 2, 3, () => S.jit(red, 6)); paintBox(S, 32, 16, 1, 2, 1, () => S.jit(red, 6));
  });
  addSkin('lakemon', S => {
    const g = C('#3a7a6a'), gD = C('#245a4a'), belly = C('#8ab89a');
    const hide = (f, x, y) => f === 'bottom' ? belly : (x * 7 + y * 13) % 11 === 0 ? gD : S.jit(g, 7);
    paintBox(S, 0, 0, 12, 6, 20, hide);
    paintBox(S, 0, 26, 3, 14, 3, (f, x, y) => f === 'front' ? belly : S.jit(g, 7));
    paintBox(S, 12, 26, 5, 4, 8, (f, x, y) => f === 'front' ? (y === 3 ? C('#1a1a1a') : S.jit(g, 7)) : (f === 'left' || f === 'right') && y === 1 && x === 5 ? C('#f2e05a') : hide(f, x, y));   // its head, with yellow eyes
    paintBox(S, 38, 26, 3, 1, 5, () => S.jit(gD, 6));
    paintBox(S, 38, 32, 2, 2, 6, hide);
  });
  addSkin('wisp', S => paintBox(S, 0, 0, 4, 4, 4, (f, x, y) => (x === 1 || x === 2) && (y === 1 || y === 2) ? C('#ffffff') : C('#e8e8e8')));
  addSkin('golfcart', S => {
    const w = C('#f2f2f2'), wD = C('#c8c8c8'), green = C('#2a8a4a');
    paintBox(S, 0, 0, 10, 2, 14, (f, x, y) => f === 'top' ? C('#4a4a4a') : y === 0 ? wD : S.jit(w, 3));
    paintBox(S, 0, 16, 10, 3, 4, (f, x, y) => f === 'front' && y === 1 && (x === 1 || x === 8) ? C('#fff6b0') : S.jit(w, 3));
    paintBox(S, 28, 16, 10, 1, 4, () => S.jit(C('#2a2a2a'), 5));
    paintBox(S, 0, 23, 10, 4, 1, () => S.jit(C('#2a2a2a'), 5));
    paintBox(S, 22, 23, 1, 9, 1, () => C('#9a9a9a'));
    paintBox(S, 0, 33, 12, 1, 12, (f, x, y) => (x + y) % 4 < 2 ? green : mulc(green, 0.85));
    paintBox(S, 48, 0, 1, 3, 3, (f, x, y) => (f === 'left' || f === 'right') && x === 1 && y === 1 ? C('#c8c8c8') : C('#1a1a1a'));
  });
  addSkin('pine_cap', S => {
    const blue = C('#2a5ad0'), white = C('#f4f4f4'), pine = C('#2a7ae0');
    paintBox(S, 0, 0, 9, 3, 9, (f, x, y) => f === 'front' ? (x >= 3 && x <= 5 && y >= 0 && Math.abs(x - 4) <= y ? pine : white) : S.jit(blue, 5));
    paintBox(S, 0, 12, 9, 1, 4, () => S.jit(blue, 5));
  });
  addSkin('fez', S => { paintBox(S, 0, 0, 5, 4, 5, (f, x, y) => f === 'front' && y === 1 && x >= 1 && x <= 3 ? C('#f2d21e') : S.jit(C('#b8202a'), 6)); paintBox(S, 0, 9, 1, 3, 1, () => C('#1a1a1a')); });
  SWEATERS.forEach(([n, hex], i) => addSkin('sweater_' + i, S => {
    const c = C(hex), cD = mulc(c, 0.8), mot = ['heart', 'star', 'star2', 'stripes', 'rainbow'][i];
    const knit = (x, y) => (x + y) % 2 ? c : mulc(c, 0.92);
    paintBox(S, 16, 16, 8, 12, 4, (f, x, y) => {
      if (f !== 'front') return y === 11 ? cD : knit(x, y);
      if (mot === 'heart' && ['.##.##.', '#######', '.#####.', '..###..', '...#...'][y - 3] && ['.##.##.', '#######', '.#####.', '..###..', '...#...'][y - 3][x] === '#') return C('#f4f4f4');
      if ((mot === 'star' || mot === 'star2') && ['...#...', '..###..', '#######', '.##.##.', '#.....#'][y - 3] && ['...#...', '..###..', '#######', '.##.##.', '#.....#'][y - 3][x] === '#') return mot === 'star' ? C('#f2d21e') : C('#ffffff');
      if (mot === 'stripes' && y % 3 === 0) return C('#f4f4f4');
      if (mot === 'rainbow' && y >= 3 && y < 8) return C(['#e1453a', '#f08a2a', '#f2cf3a', '#4ab84a', '#3a7ae0'][y - 3]);
      return y === 11 ? cD : knit(x, y);
    });
    paintBox(S, 40, 16, 4, 12, 4, (f, x, y) => y >= 10 ? cD : knit(x, y));
  }));
}
function buildFallsModels() {
  FALLS_LOOKS.forEach((l, i) => humanoid('player_falls_' + i, 'falls_' + i, (i === 2 ? 1 : 0.9375) / 16));
  defModel('gnome', 'gnome', 0.8 / 16, [
    { name: 'rleg', box: [-2.5, 0, -1, 2, 3, 2], uv: [0, 0], pivot: [-1.5, 3, 0] },
    { name: 'lleg', box: [0.5, 0, -1, 2, 3, 2], uv: [0, 0], pivot: [1.5, 3, 0] },
    { name: 'body', box: [-2.5, 3, -1.5, 5, 5, 3], uv: [8, 0] },
    { name: 'rarm', box: [-4.5, 4, -1, 2, 4, 2], uv: [24, 0], pivot: [-3.5, 8, 0] },
    { name: 'larm', box: [2.5, 4, -1, 2, 4, 2], uv: [24, 0], pivot: [3.5, 8, 0] },
    { name: 'head', box: [-2, 8, -2, 4, 4, 4], uv: [32, 0], pivot: [0, 8, 0] },
    { name: 'beard', box: [-2, 6, 2, 4, 3, 1], uv: [48, 0], pivot: [0, 8, 0], follow: 'head' },
    { name: 'hat', boxes: [[-2.5, 11.5, -2.5, 5, 2, 5, 0, 16], [-1.5, 13.5, -1.5, 3, 2, 3, 20, 16], [-0.5, 15.5, -0.5, 1, 2, 1, 32, 16]], pivot: [0, 8, 0], follow: 'head' },
  ]);
  defModel('lakemon', 'lakemon', 2 / 16, [
    { name: 'body', box: [-6, 0, -10, 12, 6, 20], uv: [0, 0] },
    { name: 'neck', box: [-1.5, 4, 8, 3, 14, 3], uv: [0, 26], pivot: [0, 5, 9.5] },
    { name: 'head', box: [-2.5, 17, 7, 5, 4, 8], uv: [12, 26], pivot: [0, 5, 9.5], follow: 'neck' },
    { name: 'lfl', box: [6, 1, 2, 3, 1, 5], uv: [38, 26], pivot: [6, 1.5, 4] },
    { name: 'rfl', box: [-9, 1, 2, 3, 1, 5], uv: [38, 26], pivot: [-6, 1.5, 4] },
    { name: 'tail', box: [-1, 1, -16, 2, 2, 6], uv: [38, 32], pivot: [0, 2, -10] },
  ]);
  defModel('wisp', 'wisp', 1.2 / 16, [{ name: 'orb', box: [-2, 0, -2, 4, 4, 4], uv: [0, 0], tint: true }]);
  defModel('golfcart', 'golfcart', 2 / 16, [
    { name: 'body', boxes: [
      [-5, 1, -7, 10, 2, 14, 0, 0], [-5, 3, 3, 10, 3, 4, 0, 16], [-5, 3, -5, 10, 1, 4, 28, 16], [-5, 4, -6, 10, 4, 1, 0, 23],
      [-4.5, 3, 2.5, 1, 9, 1, 22, 23], [3.5, 3, 2.5, 1, 9, 1, 22, 23], [-4.5, 3, -6.5, 1, 9, 1, 22, 23], [3.5, 3, -6.5, 1, 9, 1, 22, 23],
      [-6, 12, -8, 12, 1, 12, 0, 33],
    ] },
    { name: 'wfl', box: [-6, 0, 3, 1, 3, 3], uv: [48, 0], pivot: [-5.5, 1.5, 4.5] },
    { name: 'wfr', box: [5, 0, 3, 1, 3, 3], uv: [48, 0], pivot: [5.5, 1.5, 4.5] },
    { name: 'wbl', box: [-6, 0, -6, 1, 3, 3], uv: [48, 0], pivot: [-5.5, 1.5, -4.5] },
    { name: 'wbr', box: [5, 0, -6, 1, 3, 3], uv: [48, 0], pivot: [5.5, 1.5, -4.5] },
  ]);
  defModel('pine_cap', 'pine_cap', 1, [{ name: 'head', boxes: [[-4.5, 30, -4.5, 9, 3, 9, 0, 0], [-4.5, 30, 4.5, 9, 1, 4, 0, 12]], pivot: [0, 24, 0] }]);
  defModel('fez', 'fez', 1, [{ name: 'head', boxes: [[-2.5, 32, -2.5, 5, 4, 5, 0, 0], [2.5, 33, -0.5, 1, 3, 1, 0, 9]], pivot: [0, 24, 0] }]);
  SWEATERS.forEach((s, i) => defModel('sweater_' + i, 'sweater_' + i, 1, [
    { name: 'body', box: [-4, 12, -2, 8, 12, 4], uv: [16, 16], pivot: [0, 24, 0], inflate: 0.6 },
    { name: 'rarm', box: [-8, 12, -2, 4, 12, 4], uv: [40, 16], pivot: [-6, 22, 0], inflate: 0.6 },
    { name: 'larm', box: [4, 12, -2, 4, 12, 4], uv: [40, 16], pivot: [6, 22, 0], inflate: 0.6 },
  ]));
}
function buildFallsItemTiles() {
  addTile('journal', p => {
    shadeMask(p, mask(poly([[3, 1.5], [13, 1.5], [13, 14.5], [3, 14.5]])), [C('#7a2a1e'), C('#a8402e'), C('#4a1a10'), C('#200805')], true);
    p.rect(3, 2, 1, 12, C('#3a1208'));
    const gold = C('#f2c83a');
    p.rect(7, 7, 4, 4, gold); for (const x of [6, 7, 8, 9, 10, 11]) p.px(x, 5 + (x === 6 || x === 11 ? 1 : 0), gold);   // a hand with six fingers
    p.px(9, 12, gold); p.px(10, 12, gold); p.px(10, 13, gold); p.px(9, 13, gold);   // "3"
  });
  addTile('pine_cap', p => {
    shadeMask(p, mask(poly([[3, 10], [4, 5], [8, 3], [12, 5], [13, 10]])), [C('#f4f4f4'), C('#ffffff'), C('#c8c8c8'), C('#2a3a6a')], true);
    shadeMask(p, mask(poly([[2, 10], [15, 10], [15, 12], [2, 12]])), [C('#2a5ad0'), C('#5a8af0'), C('#1a3a90'), C('#0a1a40')], true);
    p.rect(4, 5, 1, 5, C('#2a5ad0')); p.rect(12, 5, 1, 5, C('#2a5ad0'));
    for (let y = 5; y <= 8; y++) for (let x = 8 - (y - 5); x <= 8 + (y - 5); x++) p.px(x, y, C('#2a7ae0'));
    p.px(8, 9, C('#5a3a1e'));
  });
  SWEATERS.forEach(([n, hex], i) => addTile('sweater_' + i, p => {
    const c = C(hex);
    shadeMask(p, mask(poly([[2, 3], [6, 2], [10, 2], [14, 3], [15, 8], [12.5, 8.5], [12.5, 14], [3.5, 14], [3.5, 8.5], [1, 8]])), [c, c.map(v => Math.min(255, v * 1.25)), mulc(c, 0.7), mulc(c, 0.3)], true);
    p.rect(7, 2, 2, 1, mulc(c, 0.6));
    if (i === 0) for (const [x, y] of [[6, 6], [7, 6], [9, 6], [10, 6], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [7, 8], [8, 8], [9, 8], [8, 9]]) p.px(x, y, C('#ffffff'));
    else if (i === 3) for (const y of [6, 9, 12]) p.rect(4, y, 8, 1, C('#ffffff'));
    else if (i === 4) ['#e1453a', '#f08a2a', '#f2cf3a', '#4ab84a', '#3a7ae0'].forEach((col, k) => p.rect(5, 6 + k, 6, 1, C(col)));
    else for (const [x, y] of [[8, 5], [7, 6], [8, 6], [9, 6], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [7, 8], [9, 8], [6, 9], [10, 9]]) p.px(x, y, i === 1 ? C('#f2d21e') : C('#ffffff'));
  }));
  addTile('fez', p => {
    shadeMask(p, mask(poly([[4.5, 5], [11.5, 5], [12.5, 14], [3.5, 14]])), [C('#b8202a'), C('#e04a4a'), C('#801018'), C('#300508')], true);
    p.rect(11, 5, 1, 1, C('#1a1a1a')); p.rect(12, 6, 1, 4, C('#1a1a1a')); p.px(12, 10, C('#f2d21e'));
    for (const x of [7, 8, 9]) p.px(x, 9, C('#f2d21e'));
  });
  addTile('golf_cart', p => {
    shadeMask(p, mask(poly([[1, 3], [15, 3], [15, 5], [1, 5]])), [C('#2a8a4a'), C('#4ab86a'), C('#1a5a2a'), C('#0a2a10')], true);   // the roof
    p.rect(3, 5, 1, 5, C('#9a9a9a')); p.rect(12, 5, 1, 5, C('#9a9a9a'));
    shadeMask(p, mask(poly([[1, 9], [15, 9], [15, 12.5], [1, 12.5]])), [C('#f2f2f2'), C('#ffffff'), C('#c8c8c8'), C('#3a3a3a')], true);
    p.rect(4, 7, 4, 2, C('#2a2a2a'));
    for (const cx of [4, 12]) shadeMask(p, mask(circle(cx, 13.5, 1.8)), [C('#2a2a2a'), C('#4a4a4a'), C('#141414'), C('#050505')], true);
  });
  addTile('pizza', p => {
    shadeMask(p, mask(poly([[2, 3], [14, 3], [8, 15]])), [C('#f2c84a'), C('#ffe07a'), C('#c89a2a'), C('#5a3a10')], true);
    p.rect(2, 2, 12, 2, C('#c8823a'));
    for (const [x, y] of [[6, 6], [10, 6], [8, 9], [7, 12]]) { p.px(x, y, C('#c8282a')); p.px(x + 1, y, C('#c8282a')); p.px(x, y + 1, C('#a82020')); }
  });
}
