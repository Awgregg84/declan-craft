/* ===================== Books of building plans ===================== */
// Open a Book of Building Plans and pick something to build: a see-through outline of it appears in front of you,
// lowest layer brightest. Put blocks where the outline shows (each one you get right disappears from the outline)
// and the count at the top goes up; a wrong block in the way shows red, to break. Finish it for a celebration. In
// Creative, "Build it all now" builds it at once. The plan you are building is kept with the world.

/* each plan is made of [x, y, z, block] from where it starts: x to the right, z away from you, y up */
function planShape(make) {
  const m = new Map();
  const S = {
    put(x, y, z, id) { m.set(x + ',' + y + ',' + z, [x, y, z, id]); },
    box(x1, y1, z1, x2, y2, z2, id) { for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) S.put(x, y, z, id); },
    walls(x1, y1, z1, x2, y2, z2, id) { S.box(x1, y1, z1, x2, y2, z1, id); S.box(x1, y1, z2, x2, y2, z2, id); S.box(x1, y1, z1, x1, y2, z2, id); S.box(x2, y1, z1, x2, y2, z2, id); },
    clear(x1, y1, z1, x2, y2, z2) { for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) m.delete(x + ',' + y + ',' + z); },
  };
  make(S);
  return Array.from(m.values()).sort((a, b) => a[1] - b[1]);
}
const PLANS = [
  { key: 'snowman', name: 'Snowman', make: S => { S.put(0, 0, 1, B.SNOW); S.put(0, 1, 1, B.SNOW); S.put(0, 2, 1, B.PUMPKIN); } },
  { key: 'heart', name: 'Pixel Heart', make: S => {
    ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'].forEach((row, i) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') S.put(x - 4, 7 - i, 1, B.WOOL + 14);
    });
  } },
  { key: 'pad', name: 'Rocket Launch Pad', make: S => {
    S.box(-3, 0, 0, 3, 0, 6, B.STONE_BRICKS);
    S.box(-3, 0, 3, 3, 0, 3, B.WOOL + 4); S.box(0, 0, 0, 0, 0, 6, B.WOOL + 4);
    for (const [x, z] of [[-3, 0], [3, 0], [-3, 6], [3, 6]]) S.put(x, 1, z, B.GLOWSTONE);
  } },
  { key: 'bridge', name: 'Bridge', make: S => {
    S.box(-1, 0, 0, 1, 0, 12, B.OAK_PLANKS);
    for (const x of [-2, 2]) { S.box(x, 0, 0, x, 1, 12, B.OAK_LOG); for (let z = 1; z < 12; z += 2) S.put(x, 1, z, B.OAK_PLANKS); }
    for (const z of [0, 6, 12]) for (const x of [-2, 2]) S.put(x, 2, z, B.TORCH);
  } },
  { key: 'pyramid', name: 'Pyramid', make: S => {   // (hollow, with a secret room inside)
    for (let k = 0; k < 5; k++) S.walls(-4 + k, k, k, 4 - k, k, 8 - k, B.SANDSTONE);
    S.put(0, 5, 4, B.GOLD_BLOCK);
    S.clear(0, 0, 0, 0, 0, 0); S.clear(0, 1, 1, 0, 1, 1);   // (the way in)
    S.put(0, 0, 6, B.TORCH);
  } },
  { key: 'house', name: 'Cozy House', make: S => {
    S.box(-3, 0, 0, 3, 0, 6, B.COBBLE);
    S.walls(-3, 1, 0, 3, 3, 6, B.OAK_PLANKS);
    for (const x of [-3, 3]) for (const z of [0, 6]) S.box(x, 1, z, x, 3, z, B.OAK_LOG);
    for (const x of [-3, 3]) S.box(x, 2, 2, x, 2, 4, B.GLASS);
    S.box(-1, 2, 6, 1, 2, 6, B.GLASS); S.put(-2, 2, 0, B.GLASS); S.put(2, 2, 0, B.GLASS);
    S.clear(0, 1, 0, 0, 2, 0);   // (the doorway: put a door in it!)
    for (let k = 0; k < 4; k++) {   // the roof: steps of bricks up both sides, and planks filling the ends
      S.box(-4 + k, 4 + k, -1, -4 + k, 4 + k, 7, B.BRICKS); S.box(4 - k, 4 + k, -1, 4 - k, 4 + k, 7, B.BRICKS);
      if (k === 3) S.box(-1, 7, -1, 1, 7, 7, B.BRICKS); else for (const z of [0, 6]) S.box(-3 + k, 4 + k, z, 3 - k, 4 + k, z, B.OAK_PLANKS);
    }
    S.put(0, 1, 3, B.CRAFTING_TABLE); S.put(-2, 1, 5, B.TORCH);
  } },
  { key: 'treehouse', name: 'Treehouse', make: S => {
    S.box(0, 0, 3, 0, 5, 3, B.OAK_LOG);
    S.box(-2, 6, 1, 2, 6, 5, B.OAK_PLANKS);
    S.walls(-2, 7, 1, 2, 8, 5, B.OAK_PLANKS);
    S.box(-2, 8, 2, -2, 8, 4, B.GLASS); S.box(2, 8, 2, 2, 8, 4, B.GLASS);
    S.clear(0, 7, 1, 0, 8, 1);
    S.box(-3, 9, 0, 3, 9, 6, B.OAK_LEAVES); S.box(-2, 10, 1, 2, 10, 5, B.OAK_LEAVES);
    const ring = [[0, 2], [1, 2], [1, 3], [1, 4], [0, 4], [-1, 4]];   // steps winding up round the trunk, and a way in through the floor
    ring.forEach(([x, z], k) => S.put(x, k, z, B.OAK_PLANKS));
    S.clear(-1, 6, 4, -1, 6, 4);
  } },
  { key: 'tower', name: 'Watchtower', make: S => {
    S.walls(-2, 0, 0, 2, 9, 4, B.STONE_BRICKS);
    S.box(-1, 0, 1, 1, 0, 3, B.STONE_BRICKS);
    S.clear(0, 1, 0, 0, 2, 0);
    for (const y of [3, 6]) { S.put(-2, y, 2, B.GLASS); S.put(2, y, 2, B.GLASS); S.put(0, y, 4, B.GLASS); }
    S.box(-3, 10, -1, 3, 10, 5, B.STONE_BRICKS);
    for (let x = -3; x <= 3; x++) for (let z = -1; z <= 5; z++) if ((x === -3 || x === 3 || z === -1 || z === 5) && (x + z) % 2 === 0) S.put(x, 11, z, B.STONE_BRICKS);
    for (const [x, z] of [[-2, 0], [2, 0], [-2, 4], [2, 4]]) S.put(x, 11, z, B.TORCH);
  } },
  { key: 'lighthouse', name: 'Lighthouse', make: S => {
    for (let y = 0; y < 12; y++) for (let x = -2; x <= 2; x++) for (let z = 0; z <= 4; z++) {
      const d = Math.hypot(x, z - 2);
      if (d <= 2.3 && d > 1.2) S.put(x, y, z, B.WOOL + ((y >> 1) % 2 ? 14 : 0));
    }
    S.clear(0, 1, 0, 0, 2, 0);
    S.box(-1, 12, 1, 1, 12, 3, B.STONE_BRICKS);
    for (const [x, z] of [[-1, 1], [1, 1], [-1, 3], [1, 3]]) S.put(x, 13, z, B.GLASS);
    S.put(0, 13, 2, B.GLOWSTONE);
    S.box(-1, 14, 1, 1, 14, 3, B.WOOL + 14); S.put(0, 15, 2, B.WOOL + 14);
  } },
  { key: 'castle', name: 'Mini Castle', make: S => {
    S.walls(-5, 0, 0, 5, 4, 10, B.STONE_BRICKS);
    for (let x = -5; x <= 5; x++) for (let z = 0; z <= 10; z++) if ((x === -5 || x === 5 || z === 0 || z === 10) && (x + z) % 2 === 0) S.put(x, 5, z, B.STONE_BRICKS);
    for (const [x, z] of [[-5, 0], [5, 0], [-5, 10], [5, 10]]) { S.box(x - 1, 0, z - 1, x + 1, 7, z + 1, B.STONE_BRICKS); S.box(x - 1, 8, z - 1, x + 1, 8, z + 1, B.WOOL + 14); S.put(x, 9, z, B.TORCH); }
    S.clear(-1, 1, 0, 1, 3, 0);
  } },
];
for (const p of PLANS) p.blocks = planShape(p.make);

/* the plan being built: { key, x, y, z, rot, dim } (rot: which way it faces, 0-3) */
const PLAN = { cur: null, done: 0, total: 0, checkT: 0, list: null, mesh: null, dirty: false, ox: 0, oy: 0, oz: 0 };
function planAt(p) {   // its blocks in the world: [x, y, z, id]
  const plan = PLANS.find(q => q.key === p.key);
  if (!plan) return [];
  const f = [[0, -1], [-1, 0], [0, 1], [1, 0]][p.rot & 3], r = [-f[1], f[0]];   // forward, and to the right
  return plan.blocks.map(([x, y, z, id]) => [p.x + r[0] * x + f[0] * z, p.y + y, p.z + r[1] * x + f[1] * z, id]);
}
/* has this spot got the right block? (any planks for planks, any wool for wool...) */
function planOK(w, b) {
  const have = w.getBlock(b[0], b[1], b[2]), want = b[3];
  if (want === B.AIR) return true;
  if (have === want) return true;
  for (const k of ['planks', 'log']) if (TAGS[k].includes(want) && TAGS[k].includes(have)) return true;
  return want === B.GLOWSTONE && have === B.JACK_O_LANTERN;
}
function setPlan(p) {
  PLAN.cur = p; PLAN.list = p ? planAt(p).filter(b => b[3] !== B.AIR) : null; PLAN.checkT = 0; PLAN.done = 0; PLAN.seen = false; PLAN.total = PLAN.list ? PLAN.list.length : 0;
  PLAN.dirty = true; PLAN.shown = false;
  el('plan-hud').hidden = !p;
}
/* every half second: what's been built so far (and a little sparkle for each new block in the right place) */
function planTick(game, dt) {
  const p = PLAN.cur;
  if (!p || game.dim !== p.dim) { if (!el('plan-hud').hidden && p) el('plan-hud').hidden = true; return; }
  el('plan-hud').hidden = false;
  if ((PLAN.checkT -= dt) > 0) return;
  PLAN.checkT = 0.5;
  const w = game.world;
  let n = 0, bad = 0;
  for (const b of PLAN.list) {
    const ok = planOK(w, b), wrong = !ok && !REPLACEABLE[w.getBlock(b[0], b[1], b[2])];   // (wrong: something else is in the way)
    if (ok) n++;
    if (ok && !b.ok && PLAN.seen) { blockParticles(b[0], b[1], b[2], w.getBlock(b[0], b[1], b[2]), 4, true); sfx('pop', b[0] + 0.5, b[1] + 0.5, b[2] + 0.5, 0.5); }
    if (ok !== !!b.ok || wrong !== !!b.bad) PLAN.dirty = true;
    b.ok = ok; b.bad = wrong;
    if (b.bad) bad++;
  }
  if (PLAN.dirty) { PLAN.dirty = false; planMesh(); }
  PLAN.seen = true;
  PLAN.done = n;
  const plan = PLANS.find(q => q.key === p.key);
  el('plan-hud').textContent = plan.name + ': ' + n + ' of ' + PLAN.total + ' blocks' + (bad ? ' (' + bad + ' in red to break)' : '');
  if (n >= PLAN.total) {   // finished!
    const c = PLAN.list.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]).map(v => v / PLAN.total);
    partyEffect(c[0], c[1] + 1, c[2]);
    sfx('levelUpBig');
    bigText('You built it!', 2);
    chat(playerName() + ' built the ' + plan.name + '!', '#ffd24a');
    if (game.net) MP.system(playerName() + ' built the ' + plan.name + '!');
    game.stats.plans = (game.stats.plans || 0) + 1;
    setPlan(null);
  }
}
/* The outline is three meshes, made again only when a block in the plan changes: the lowest layer still to build
   (drawn brightest), the rest of it (faint), and wrong blocks in the way (a red box round each). */
const PLAN_SHADE = [0.62, 0.62, 1, 0.5, 0.8, 0.8];
function planCube(mb, x, y, z, id, h, y0, y1) {   // a cube h (sixteenths) each side of x, z, from y + y0 to y + y1
  const a = x - h, b = x + h, c = z - h, d = z + h, lo = y + y0, hi = y + y1;
  const F = [[[b, lo, d], [b, lo, c], [b, hi, c], [b, hi, d]], [[a, lo, c], [a, lo, d], [a, hi, d], [a, hi, c]], [[a, hi, d], [b, hi, d], [b, hi, c], [a, hi, c]],
    [[a, lo, c], [b, lo, c], [b, lo, d], [a, lo, d]], [[a, lo, d], [b, lo, d], [b, hi, d], [a, hi, d]], [[b, lo, c], [a, lo, c], [a, hi, c], [b, hi, c]]];
  for (let f = 0; f < 6; f++) mb.quad(F[f], [[0, 16], [16, 16], [16, 0], [0, 0]], tileFor(id, f, 0), PLAN_SHADE[f], 16, 0);
}
function planCross(mb, x, y, z, id) {   // a torch or a flower: two crossed pictures (seen from both sides)
  const t = BT[id * 6], uv = [[0, 16], [16, 16], [16, 0], [0, 0]];
  for (const [ax, az] of [[5.6, 5.6], [5.6, -5.6]]) {
    mb.quad([[x - ax, y, z - az], [x + ax, y, z + az], [x + ax, y + 16, z + az], [x - ax, y + 16, z - az]], uv, t, 0.9, 16, 0);
    mb.quad([[x + ax, y, z + az], [x - ax, y, z - az], [x - ax, y + 16, z - az], [x + ax, y + 16, z + az]], uv, t, 0.9, 16, 0);
  }
}
function planMesh() {
  const list = PLAN.list;
  let low = Infinity;
  for (const b of list) if (!b.ok && b[1] < low) low = b[1];
  const mbs = { low: new MeshBuilder(), rest: new MeshBuilder(), bad: new MeshBuilder() }, [ox, oy, oz] = list[0];
  for (const b of list) {
    if (b.ok) continue;
    const x = (b[0] - ox) * 16 + 8, y = (b[1] - oy) * 16, z = (b[2] - oz) * 16 + 8;
    if (b.bad) planCube(mbs.bad, x, y, z, B.GLASS, 8.32, -0.32, 16.32);
    else if (isCubeItem(b[3])) planCube(b[1] === low ? mbs.low : mbs.rest, x, y, z, b[3], 7.84, 0, 15.68);
    else planCross(b[1] === low ? mbs.low : mbs.rest, x, y, z, b[3]);
  }
  const m = PLAN.mesh || (PLAN.mesh = {});
  for (const k in mbs) m[k] = mbs[k].build(m[k]);
  PLAN.ox = ox; PLAN.oy = oy; PLAN.oz = oz; PLAN.shown = true;
}
/* the outline: each block still to go, see-through, the lowest layer still to build brightest (and a red box round
   a wrong block in the way) */
function drawPlan(s, cam) {
  const p = PLAN.cur, M = PLAN.mesh;
  if (!p || game.dim !== p.dim || !PLAN.shown || !M) return;
  entityBegin(texTiles);
  const P = PROG.entity, m = R.m, pulse = 0.08 * Math.sin(game.t * 4);
  gl.uniform1f(P.u.uBright, 1);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -1);
  M4.identity(m);
  M4.translate(m, m, PLAN.ox - cam.x, PLAN.oy - cam.y, PLAN.oz - cam.z);
  M4.scale(m, m, 1 / 16, 1 / 16, 1 / 16);
  if (M.rest.quads) { gl.uniform1f(P.u.uAlpha, 0.18); drawMesh(M.rest, m); }
  if (M.low.quads) { gl.uniform1f(P.u.uAlpha, 0.5 + pulse); drawMesh(M.low, m); }
  if (M.bad.quads) { gl.uniform1f(P.u.uAlpha, 0.45 + pulse); gl.uniform4f(P.u.uTint, 1, 0.12, 0.08, 0.7); drawMesh(M.bad, m); gl.uniform4f(P.u.uTint, 0, 0, 0, 0); }
  gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.disable(gl.CULL_FACE);
  gl.uniform1f(P.u.uAlpha, 1);
}

/* ---- the book: a page for each plan, with a picture of it ---- */
const PLANUI = { page: 0 };
function openPlans() {
  if (ui.inv) closeInv();
  game.releasePointer();
  game.uiOpen = true;
  showScreen('scr-plans');
  showPlanPage();
  sfx('pageTurn');
}
function closePlans() { showScreen(null); game.uiOpen = false; game.releaseKeys(); if (!game.touchOn && !game.dragLook) game.requestPointer(); }
function showPlanPage() {
  const plan = PLANS[PLANUI.page], cur = PLAN.cur && PLAN.cur.key === plan.key;
  el('plan-name').textContent = plan.name;
  const need = {};
  for (const b of plan.blocks) if (b[3]) need[b[3]] = (need[b[3]] || 0) + 1;
  el('plan-needs').textContent = 'You need: ' + Object.entries(need).sort((a, b) => b[1] - a[1]).map(([id, n]) => n + ' ' + itemName(+id)).join(', ');
  el('plan-num').textContent = 'Plan ' + (PLANUI.page + 1) + ' of ' + PLANS.length;
  el('btn-plan-prev').disabled = PLANUI.page === 0; el('btn-plan-next').disabled = PLANUI.page === PLANS.length - 1;
  el('btn-plan-build').textContent = cur ? 'Move it here' : 'Build it here';
  el('btn-plan-all').hidden = game.mode !== 'creative';
  el('btn-plan-stop').hidden = !PLAN.cur;
  drawPlanPicture(el('plan-pic'), plan);
}
function planTurn(d) { PLANUI.page = clamp(PLANUI.page + d, 0, PLANS.length - 1); sfx('pageTurn'); showPlanPage(); }
/* put the outline down in front of you, facing the way you face */
function planHere(all) {
  const pl = game.player, plan = PLANS[PLANUI.page], rot = ((Math.round(pl.yaw / (Math.PI / 2)) % 4) + 4) % 4, f = [[0, -1], [-1, 0], [0, 1], [1, 0]][rot];
  const p = { key: plan.key, x: Math.floor(pl.x) + f[0] * 2, y: Math.floor(pl.y + 0.01), z: Math.floor(pl.z) + f[1] * 2, rot, dim: game.dim };
  setPlan(p);
  closePlans();
  if (all) {   // (Creative) build the lot at once
    const w = game.world;
    for (const b of PLAN.list) if (!planOK(w, b)) w.setBlock(b[0], b[1], b[2], b[3], 0, true);
    sfx('place_stone');
  } else toast('Put blocks where the outline is: the bright layer first!', 4);
}
/* a little picture of a plan: its blocks drawn as cubes, seen from the front and above */
function drawPlanPicture(cv, plan) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, bl = plan.blocks.filter(b => b[3]);
  ctx.clearRect(0, 0, W, H);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [x, y, z] of bl) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const A = x1 - x0 + 1, D = z1 - z0 + 1, N = y1 - y0 + 1, s = Math.min(W / ((A + D) * 0.87 + 0.5), H / (N + (A + D) * 0.5 + 0.5), 24);
  const ox = W / 2 - (A - D) * 0.87 * s / 2, oy = H - (H - (N + (A + D) * 0.5) * s) / 2 - (A + D) * 0.5 * s;
  const pos = (x, y, z) => { const a = x - x0 + 1, b = z1 - z + 1; return [ox + (a - b) * 0.87 * s, oy - (y - y0) * s + (a + b) * 0.5 * s]; };   // (the front of the plan nearest)
  const order = bl.slice().sort((p, q) => ((p[0] - x0) + (z1 - p[2])) - ((q[0] - x0) + (z1 - q[2])) || p[1] - q[1]);   // (back to front, bottom to top)
  for (const [x, y, z, id] of order) {
    const c = blockColor(id), [px, py] = pos(x, y, z);
    const shade = (c, k) => 'rgb(' + c.map(v => Math.round(v * k)).join(',') + ')';
    ctx.fillStyle = shade(c.top, 1); ctx.beginPath(); ctx.moveTo(px, py - s); ctx.lineTo(px + 0.87 * s, py - 1.5 * s); ctx.lineTo(px, py - 2 * s); ctx.lineTo(px - 0.87 * s, py - 1.5 * s); ctx.fill();   // top
    ctx.fillStyle = shade(c.side, 0.8); ctx.beginPath(); ctx.moveTo(px, py - s); ctx.lineTo(px - 0.87 * s, py - 1.5 * s); ctx.lineTo(px - 0.87 * s, py - 0.5 * s); ctx.lineTo(px, py); ctx.fill();   // left
    ctx.fillStyle = shade(c.side, 0.62); ctx.beginPath(); ctx.moveTo(px, py - s); ctx.lineTo(px + 0.87 * s, py - 1.5 * s); ctx.lineTo(px + 0.87 * s, py - 0.5 * s); ctx.lineTo(px, py); ctx.fill();   // right
  }
}
/* the average colours of a block's pictures (its top, and its sides) */
const BLOCK_COLORS = {};
function tileColor(t) {
  const d = TILE_DATA[t];
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  return n ? [r / n, g / n, b / n] : [200, 200, 200];
}
function blockColor(id) {
  if (BLOCK_COLORS[id]) return BLOCK_COLORS[id];
  const top = tileColor(id < 256 ? BT[id * 6 + 2] : TILE[ITEMS[id].tex]), side = id < 256 ? tileColor(BT[id * 6]) : top;
  return (BLOCK_COLORS[id] = { top, side });
}
