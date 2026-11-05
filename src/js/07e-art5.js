/* ===================== Pictures, skins and models for the fifth wish list ===================== */
// Tanks (one skin painted pale grey and tinted each tank's colour, and one for the tracks), paint shells, and
// (further down) the Hogwarts students, the Quidditch players and the Declan Falls world.
const tankRGB = c => hexRGB(TANK_COLORS[c] || TANK_COLORS[0]).map(v => v / 255);
function tankPal(hex) { const c = C(hex); return [c, c.map(v => Math.min(255, v * 1.3 + 20)), mulc(c, 0.62), mulc(c, 0.25)]; }
function buildItemTiles5() {
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
