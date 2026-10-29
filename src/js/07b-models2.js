/* ===================== Models for the second wish list ===================== */
function buildNewModels() {
  // made characters: the usual body, plus big ears and pigtails (see-through unless that look paints them)
  for (const k of LOOK_LAYERS) humanoid('player_' + k, k, 0.9375 / 16, [
    { name: 'earL', box: [4, 24.5, -1, 3, 5, 1], uv: [0, 32], pivot: [0, 24, 0], follow: 'head' },
    { name: 'earR', box: [-7, 24.5, -1, 3, 5, 1], uv: [8, 32], pivot: [0, 24, 0], follow: 'head' },
    { name: 'pigL', box: [4, 21, -4, 3, 6, 2], uv: [16, 32], pivot: [0, 24, 0], follow: 'head' },
    { name: 'pigR', box: [-7, 21, -4, 3, 6, 2], uv: [26, 32], pivot: [0, 24, 0], follow: 'head' },
  ]);
  // fish (heads toward +z); the tail swings
  defModel('cod', 'cod', 1 / 16, [
    { name: 'body', box: [-1, 0, -3, 2, 3, 7], uv: [0, 0] },
    { name: 'tail', box: [-0.5, 0, -6, 1, 3, 3], uv: [0, 16], pivot: [0, 1.5, -3] },
    { name: 'fin', box: [-0.5, 3, -1, 1, 2, 3], uv: [32, 0] },
  ]);
  defModel('salmon', 'salmon', 1 / 16, [
    { name: 'body', box: [-1.5, 0, -4, 3, 4, 9], uv: [0, 0] },
    { name: 'tail', box: [-0.5, 0, -7, 1, 4, 3], uv: [0, 16], pivot: [0, 2, -4] },
    { name: 'fin', box: [-0.5, 4, -1, 1, 2, 3], uv: [32, 0] },
  ]);
  defModel('tropical', 'tropical', 1 / 16, [
    { name: 'body', box: [-1, 0, -2, 2, 4, 5], uv: [0, 0], tint: true },
    { name: 'tail', box: [-0.5, 0.5, -5, 1, 3, 3], uv: [0, 16], pivot: [0, 2, -2], tint: true },
    { name: 'fin', box: [-0.5, 4, -1, 1, 2, 3], uv: [32, 0], tint: true },
  ]);
  defModel('pufferfish', 'pufferfish', 1 / 16, [
    { name: 'body', box: [-2, 0, -2, 4, 4, 4], uv: [0, 0] },
    { name: 'tail', box: [-3, 1, 0, 1, 2, 1], uv: [0, 16], pivot: [-2, 2, 0] },
    { name: 'fin2', box: [2, 1, 0, 1, 2, 1], uv: [0, 16], pivot: [2, 2, 0] },
  ]);
  // a wooden boat with a paddle on each side, and a yellow submarine (its glass dome is drawn see-through, after)
  defModel('boat', 'boat', 1 / 16, [
    { name: 'hull', boxes: [
      [-6, 0, -10, 12, 1, 20, 0, 0],
      [-7, 0, -10, 1, 6, 20, 0, 0], [6, 0, -10, 1, 6, 20, 0, 0],
      [-7, 0, 10, 14, 6, 1, 0, 0], [-7, 0, -11, 14, 6, 1, 0, 0],
      [-6, 3, -1, 12, 1, 3, 0, 0],
    ] },
    { name: 'pl', boxes: [[-14, 5, -0.5, 7, 1, 1, 0, 48], [-17, 3.5, -1, 3, 3, 2, 24, 48]], pivot: [-7, 5.5, 0] },
    { name: 'pr', boxes: [[7, 5, -0.5, 7, 1, 1, 0, 48], [14, 3.5, -1, 3, 3, 2, 24, 48]], pivot: [7, 5.5, 0] },
  ]);
  defModel('submarine', 'submarine', 1 / 16, [
    { name: 'hull', boxes: [
      [-7, 0, -9, 14, 9, 18, 0, 0],
      [-5, 1, 9, 10, 7, 3, 0, 28],
      [-4, 2, -12, 8, 5, 3, 28, 28],
      [-3, 9, -9, 6, 3, 5, 0, 40],
      [-0.5, 12, -7.5, 1, 5, 1, 24, 40], [-0.5, 16, -7.5, 1, 1, 3, 30, 40],
      [-10, 3, -11, 3, 1, 4, 40, 40], [7, 3, -11, 3, 1, 4, 40, 40],
      [-0.5, 6.5, -14, 1, 5, 2, 54, 40],
      [-1, 3.5, -15, 2, 2, 3, 0, 50],
    ] },
    { name: 'prop', boxes: [[-3.5, 4, -15.6, 7, 1, 1, 8, 50], [-0.5, 1, -15.6, 1, 7, 1, 24, 50]], pivot: [0, 4.5, -15] },
  ]);
  defModel('sub_glass', 'sub_glass', 1 / 16, [{ name: 'dome', box: [-6, 9, -4, 12, 12, 11], uv: [0, 0] }]);
  // a coloring board on an easel (its back leg leans out), and one hung on a wall
  defModel('easel', 'board_wood', 1 / 16, [
    { name: 'board', box: [-9, 3, -1, 18, 18, 1], uv: [0, 0] },
    { name: 'legs', boxes: [[-8, 0, -2, 1, 23, 1, 40, 0], [7, 0, -2, 1, 23, 1, 40, 0], [-9, 2, -1, 18, 1, 2, 0, 24]] },
    { name: 'leg3', box: [-0.5, 0, -2.5, 1, 22, 1], uv: [40, 0], pivot: [0, 22, -2] },
  ]);
  defModel('wall_board', 'board_wood', 1 / 16, [{ name: 'board', box: [-9, -1, -8, 18, 18, 1], uv: [0, 0] }]);
  defModel('sign', 'sign', 1 / 16, [{ name: 'board', box: [-8, 8, -1, 16, 8, 2], uv: [0, 0] }, { name: 'post', box: [-1, 0, -1, 2, 8, 2], uv: [0, 16] }]);
  defModel('wall_sign', 'sign', 1 / 16, [{ name: 'board', box: [-8, 4, -8, 16, 8, 2], uv: [0, 0] }]);
  // the open book over an enchanting table (its spine along z; each half turns about the spine)
  defModel('ench_book', 'ench_book', 1 / 16, [
    { name: 'lc', box: [-6, -0.5, -4.5, 6, 1, 9], uv: [0, 0] },
    { name: 'rc', box: [0, -0.5, -4.5, 6, 1, 9], uv: [0, 12] },
    { name: 'lp', box: [-5.5, 0.5, -4, 5, 1, 8], uv: [32, 0], follow: 'lc' },
    { name: 'rp', box: [0.5, 0.5, -4, 5, 1, 8], uv: [32, 12], follow: 'rc' },
  ]);
}

/* ---- things drawn on top of special blocks each frame ---- */
const SPECIAL_DRAW = {};
const _sd = M4.create();
const SPECIAL_SEEN = new Set();
function drawSpecials(game, s, t, cam) {
  const w = game.world, seen = SPECIAL_SEEN;
  seen.clear();
  if (!CAMS.pass) dynFrame();
  const list = R.visO;
  for (let j = 0; j < list.length; j += 2) {
    const c = list[j];
    if (seen.has(c) || !c.specials || !c.specials.size) continue;
    seen.add(c);
    for (const i of c.specials) {
      const x = c.cx * 16 + (i & 15), y = i >> 8, z = c.cz * 16 + ((i >> 4) & 15), id = c.blocks[i], f = SPECIAL_DRAW[id];
      if (!f) continue;
      const dx = x + 0.5 - cam.x, dy = y + 0.5 - cam.y, dz = z + 0.5 - cam.z;
      if (dx * dx + dy * dy + dz * dz > 40 * 40 || !boxInFrustum(R.planes, dx - 1, dy - 1, dz - 1, dx + 1, dy + 1.5, dz + 1)) continue;   // (far off, or off screen)
      f(w, x, y, z, c.data[i], s, t, cam);
    }
  }
  entityBegin(texSkins);
}
