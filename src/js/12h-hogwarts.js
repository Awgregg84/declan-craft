/* ===================== Hogwarts: Quidditch, the Golden Snitch and the Sorting Hat ===================== */
// In the Hogwarts world everyone gets a magic wand and a broomstick. Fly through one of the golden hoops at either end
// of the Quidditch pitch to score a goal (10 points for your house), and catch the Golden Snitch as it zips about over
// the pitch (150 points!). Tap the Sorting Hat in the Great Hall to find out which house you are in.
// (Where everything is comes from the world generator: game.gen.hogwarts, see 02b-gen3.js.)
const HOUSES = [
  { name: 'Gryffindor', color: '#ff5a3a' }, { name: 'Slytherin', color: '#3ac86a' }, { name: 'Ravenclaw', color: '#5a8aff' }, { name: 'Hufflepuff', color: '#ffd23a' },
];
const atHogwarts = () => game.mapId === 'hogwarts' && game.dim === 'over';
const houseOf = () => (game.stats.house >= 0 && game.stats.house < HOUSES.length ? HOUSES[game.stats.house] : null);

/* arriving in a Hogwarts world (the first time on this iPad): a wand and a broomstick */
function hogwartsWelcome(game) {
  const pl = game.player;
  if (game.stats.hogKit) return;
  game.stats.hogKit = 1;
  chat("Welcome to Hogwarts! The Great Hall is in front of you. The Quidditch pitch is to the east, the Black Lake to the south, Hagrid's hut and the Forbidden Forest to the west, and Hogsmeade to the north.", '#ffd24a');
  for (const id of [I.WAND, I.BROOM]) if (!pl.inv.some(s => s && s.id === id) && pl.give(id, 1) > 0) dropItem(game, pl.x, pl.y + 1, pl.z, id, 1);
  ui.dirty = true;
  toast('Here are your wand and your broomstick! Tap the Sorting Hat in the Great Hall.', 5);
}
/* points for your house (or just a cheer, if the Sorting Hat hasn't sorted you yet) */
function housePoints(n, what) {
  const h = houseOf(), line = playerName() + ' ' + what + (h ? ' ' + n + ' points to ' + h.name + '!' : '!');
  chat(line, h ? h.color : '#ffd24a');
  if (game.net) MP.system(line);
}

/* ---- goals: fly through a hoop (each iPad watches its own player) ---- */
function quidditchTick(game, dt) {
  const pl = game.player, prev = pl.qPrev;
  pl.qPrev = atHogwarts() && pl.alive ? [pl.x, pl.y, pl.z] : null;
  if (!prev || !pl.qPrev || !(pl.riding || pl.flying) || pl.goalT > game.t) return;
  for (const [hx, hy, hz] of game.gen.hogwarts.hoops) {
    const px = hx + 0.5;   // (the hoop is one block thick: its middle)
    if ((prev[0] - px) * (pl.x - px) > 0 || prev[0] === pl.x) continue;
    const t = (px - prev[0]) / (pl.x - prev[0]), y = prev[1] + (pl.y - prev[1]) * t + 0.9, z = prev[2] + (pl.z - prev[2]) * t;
    if (Math.hypot(y - (hy + 0.5), z - (hz + 0.5)) > 2.3) continue;
    pl.goalT = game.t + 1.5;
    game.stats.goals = (game.stats.goals || 0) + 1;
    bigText('GOAL!', 1.2);
    sfx('goalCheer', pl.x, pl.y + 1, pl.z);
    partyEffect(px, hy + 0.5, hz + 0.5);
    housePoints(10, 'scored a goal!');
    return;
  }
}

/* ---- the Golden Snitch ---- */
function snitchTick(game) {   // (the host, every second) one Snitch over the pitch while anyone is near it
  const L = game.gen.hogwarts.pitch;
  if (game.snitchT > 0) { game.snitchT--; return; }
  if (game.entities.some(e => e.type === 'snitch' && !e.removed)) return;
  const near = allPlayers(game).some(p => p.alive && Math.hypot((p === game.player ? p.x : p.tx) - L.x, (p === game.player ? p.z : p.tz) - L.z) < 90);
  if (near) spawnMob(game, 'snitch', L.x + 0.5, L.y + 12, L.z + 0.5, {});
}
function updateSnitch(game, e, dt) {
  const L = game.gen.hogwarts.pitch, w = game.world;
  let near = null, nearP = null, nd = 5;
  for (const p of allPlayers(game)) {
    const remote = p !== game.player;
    if (!p.alive || (remote && !p.lastState)) continue;
    const px = remote ? p.tx : p.x, py = (remote ? p.ty : p.y) + 0.9, pz = remote ? p.tz : p.z, d = Math.hypot(px - e.x, py - e.y, pz - e.z);
    if (d < nd) { nd = d; near = [px, py, pz]; nearP = p; }
  }
  e.aiT = (e.aiT || 0) - dt;
  const out = Math.hypot((e.x - L.x) / (L.hx + 6), (e.z - L.z) / (L.hz + 6)) > 1 || e.y > L.y + 30 || e.y < L.y + 2;
  if (e.aiT <= 0 || (near && !e.dodging) || out) {   // somewhere new to dart to: away from whoever is closest, and never far from the pitch
    e.aiT = randRange(0.5, 1.4); e.dodging = !!near;
    if (near && !out) { const dx = e.x - near[0], dz = e.z - near[2], l = Math.hypot(dx, dz) || 1, a = Math.atan2(dz, dx) + randRange(-0.9, 0.9); e.goal = [e.x + Math.cos(a) * 9, e.y + randRange(-2, 4), e.z + Math.sin(a) * 9]; }
    else { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.8; e.goal = [L.x + Math.cos(a) * L.hx * r, L.y + randRange(4, 20), L.z + Math.sin(a) * L.hz * r]; }
  }
  const [gx, gy, gz] = e.goal, dx = gx - e.x, dy = gy - e.y, dz = gz - e.z, d = Math.hypot(dx, dy, dz) || 1, sp = near ? 12 : 7, k = Math.min(1, dt * 4);
  e.vx += (dx / d * sp - e.vx) * k; e.vy += (dy / d * sp - e.vy) * k; e.vz += (dz / d * sp - e.vz) * k;
  moveEntity(w, e, e.vx * dt, e.vy * dt, e.vz * dt);
  if (e.collidedH) e.aiT = 0;
  e.yaw = Math.atan2(-e.vx, -e.vz); e.bodyYaw = e.headYaw = e.yaw;
  e.walk += dt * 40; e.walkAmt = 1;
  if (Math.random() < dt * 20 && PARTICLES.length < 1500) PARTICLES.push({ x: e.x, y: e.y + 0.2, z: e.z, vx: 0, vy: 0, vz: 0, life: 0.35, tile: TILE.spark_yellow, u: 0, v: 0, us: 16, size: 0.04, grav: 0, bright: 1 });
  if (nearestPlayerDist(game, e) > 140) e.removed = true;
  if (nearP && nd < 1.4) catchSnitch(game, e, nearP);
}
/* someone caught it! (the host decides; a guest asks, see 'snitch') */
function catchSnitch(game, e, p) {
  if (!p || e.removed) return;
  e.removed = true;
  game.snitchT = 20;   // (another one in a little while)
  partyEffect(e.x, e.y, e.z);
  if (game.net) MP.fx('party', e.x, e.y, e.z);
  if (p === game.player) snitchCaught(game);
  else if (p.link) p.link.send({ t: 'snitch' });
}
/* (on the iPad of whoever caught it) */
function snitchCaught(game) {
  const pl = game.player;
  game.stats.snitch = (game.stats.snitch || 0) + 1;
  bigText('You caught the Snitch!', 1.8);
  sfx('snitchCaught', pl.x, pl.y + 1, pl.z);
  housePoints(150, 'caught the Golden Snitch!');
}
/* a guest's own player close to the Snitch they can see: ask the host */
function snitchReach(game) {
  if (MP.role !== 'guest' || !atHogwarts() || !game.player.alive || game.snitchAsk > game.t) return;
  const pl = game.player;
  for (const e of game.entities) if (e.type === 'snitch' && !e.removed && Math.hypot(e.x - pl.x, e.y - (pl.y + 0.9), e.z - pl.z) < 1.6) { game.snitchAsk = game.t + 0.5; MP.send({ t: 'snitch', e: e.nid }); return; }
}

/* ---- the Sorting Hat ---- */
function sortingHat(game, x, y, z) {
  if (game.sortAt) return;
  const again = houseOf();
  game.sortAt = game.t + 2.6; game.sortHat = [x, y, z, game.t];
  chat(again ? 'The Sorting Hat: "You again? Let me think about it once more..."' : 'The Sorting Hat: "Hmm... difficult. Very difficult. Plenty of courage, I see. Not a bad mind, either..."', '#e0c890');
  sfx('hatHmm', x + 0.5, y + 1.2, z + 0.5);
}
function hogwartsTick(game, dt) {
  quidditchTick(game, dt);
  snitchReach(game);
  if (game.sortAt && game.t >= game.sortAt) {
    game.sortAt = 0;
    const h = randInt(0, HOUSES.length - 1), H = HOUSES[h];
    game.stats.house = h;
    bigText(H.name.toUpperCase() + '!', 2.2);
    el('big-text').style.color = H.color; setTimeout(() => { el('big-text').style.color = ''; }, 2300);
    sfx('hatHouse');
    const line = 'The Sorting Hat put ' + playerName() + ' in ' + H.name + '!';
    chat(line, H.color);
    if (game.net) MP.system(line);
  }
}
const _hg = M4.create();
SPECIAL_DRAW[B.SORTING_HAT] = (w, x, y, z, data, s, t, cam) => {
  const P = PROG.entity, a = game.sortHat && game.sortHat[0] === x && game.sortHat[1] === y && game.sortHat[2] === z ? t - game.sortHat[3] : 99;
  entityBegin(texSkins);
  gl.uniform1f(P.u.uBright, brightAt(w, x + 0.5, y + 1, z + 0.5, s));
  M4.identity(_hg);
  M4.translate(_hg, _hg, x + 0.5 - cam.x, y - cam.y, z + 0.5 - cam.z);
  M4.rotY(_hg, _hg, (data & 15) * Math.PI / 8);
  M4.scale(_hg, _hg, 1 / 16, 1 / 16, 1 / 16);
  gl.enable(gl.CULL_FACE);
  const wob = a < 2.8 ? Math.sin(a * 9) * 0.12 : 0;   // (it wobbles while it thinks)
  drawModel(MODELS.sorting_hat, _hg, { hat: [wob, 0, wob * 0.6], tip: [wob * 1.6, 0, wob] });
};
const _cd = M4.create();
SPECIAL_DRAW[B.CANDLE] = (w, x, y, z, data, s, t, cam) => {
  const P = PROG.entity, bob = Math.sin(t * 1.3 + (x * 7 + z * 13) % 10) * 0.08;
  entityBegin(texSkins);
  gl.uniform1f(P.u.uBright, 1);
  M4.identity(_cd);
  M4.translate(_cd, _cd, x + 0.5 - cam.x, y + bob - cam.y, z + 0.5 - cam.z);
  M4.scale(_cd, _cd, 1 / 16, 1 / 16, 1 / 16);
  gl.enable(gl.CULL_FACE);
  drawModel(MODELS.candle, _cd, null);
  if (Math.random() < 0.05 && PARTICLES.length < 1500) PARTICLES.push({ x: x + 0.5, y: y + bob + 0.55, z: z + 0.5, vx: 0, vy: 0.25, vz: 0, life: 0.4, tile: TILE.flame, u: 0, v: 0, us: 16, size: 0.06, grav: 0, bright: 1 });
};

/* the world's picture on its card: the castle at dusk above the lake */
function drawHogwartsThumb(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#24224e'); g.addColorStop(0.6, '#8a5a9a'); g.addColorStop(1, '#f0a070');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff'; for (const [x, y] of [[12, 6], [30, 14], [58, 4], [96, 9], [140, 6], [150, 18]]) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = '#3a3a5a';
  for (let x = 0; x < W; x++) { const m = 44 + Math.sin(x * 0.07) * 6 + Math.sin(x * 0.19) * 2; ctx.fillRect(x, m, 1, H); }   // mountains
  ctx.fillStyle = '#1a1830';   // the castle
  ctx.fillRect(48, 34, 64, 18);
  for (const [x, w, top] of [[50, 6, 18], [62, 8, 12], [78, 7, 8], [92, 6, 16], [104, 6, 22]]) {
    ctx.fillRect(x, top + 6, w, 52 - top - 6);
    ctx.beginPath(); ctx.moveTo(x - 1, top + 6); ctx.lineTo(x + w / 2, top - 4); ctx.lineTo(x + w + 1, top + 6); ctx.fill();
  }
  ctx.fillStyle = '#ffd86a'; for (const [x, y] of [[56, 40], [66, 38], [70, 44], [82, 30], [84, 40], [96, 36], [100, 44], [106, 32]]) ctx.fillRect(x, y, 2, 2);
  ctx.fillStyle = '#1c2a4a'; ctx.fillRect(0, 52, W, 18);   // the Black Lake, with the castle's lights in it
  ctx.fillStyle = 'rgba(255, 216, 106, 0.4)'; for (const x of [57, 67, 83, 97, 107]) ctx.fillRect(x, 55 + (x % 3), 1, 6);
}
