/* ===================== Snorks ===================== */
// Friendly sea creatures with a snorkel on top of their heads. A few swim about together in the sea, now and then
// tooting their snorkels. They follow you when you hold a fish, give you a present for one, and when your air runs
// out under water, one swims over and shares its air with you. Nothing can hurt them: a hit just sends one off.
const SNORK_COLORS = [   // body and snorkel (new ones go on the end: playing together sends their numbers)
  ['#f2c81e', '#e8402a'], ['#f28cc0', '#9a3ad8'], ['#5ab8f0', '#f2d21e'], ['#58c84a', '#f08a1a'], ['#f08a3a', '#2a7ae8'], ['#a86ae8', '#f25aa8'],
];
const isSnorkFood = id => id === I.COD || id === I.SALMON || id === I.TROPICAL_FISH || id === I.COOKED_COD || id === I.COOKED_SALMON;
const SNORK_GIFTS = [[I.EMERALD, 1, 3, 30], [I.GOLD_INGOT, 1, 2, 18], [I.IRON_INGOT, 2, 4, 18], [I.DIAMOND, 1, 1, 7], ['coral', 2, 5, 27]];   // [item, fewest, most, how often]

function snorkBubbles(x, y, z, n) {
  for (let i = 0; i < n && PARTICLES.length < 1500; i++) {
    PARTICLES.push({ x: x + randRange(-0.35, 0.35), y: y + randRange(-0.25, 0.25), z: z + randRange(-0.35, 0.35), vx: randRange(-0.4, 0.4), vy: randRange(0.8, 2), vz: randRange(-0.4, 0.4),
      life: randRange(0.6, 1.2), tile: TILE.bubble_p, u: 0, v: 0, us: 16, size: randRange(0.04, 0.08), grav: -1, bright: 1 });
  }
}
/* the top of a snork's snorkel, where its toots come out */
function snorkTop(e) { const s = 0.85 / 16; return [e.x - Math.sin(e.bodyYaw) * 2 * s, e.y + 23 * s, e.z - Math.cos(e.bodyYaw) * 2 * s]; }

/* the nearest player holding a fish, close by: snorks swim over to them */
function snorkFan(game, e) {
  let best = null, bd = 12;
  for (const p of allPlayers(game)) {
    const remote = p !== game.player;
    if (!p.alive || (remote && !p.lastState) || !isSnorkFood(p.heldId())) continue;
    const px = remote ? p.tx : p.x, py = remote ? p.ty : p.y, pz = remote ? p.tz : p.z, d = Math.hypot(px - e.x, py - e.y, pz - e.z);
    if (d < bd) { bd = d; best = { x: px, y: py, z: pz, d }; }
  }
  return best;
}
function updateSnork(game, e, d, dt) {
  const w = game.world;
  liquidAt(w, e);
  for (const k of ['happy', 'tootT']) if (e[k] > 0) e[k] -= dt;
  const inW = w.getBlock(Math.floor(e.x), Math.floor(e.y + 0.5), Math.floor(e.z)) === B.WATER;
  if (inW) {
    e.dryT = 0;
    if (e.panic > 0) e.panic -= dt;
    const fan = e.panic > 0 ? null : snorkFan(game, e);
    let mx = 0, mz = 0, vyT = 0, sp = d.speed;
    if (fan) {   // swim up to whoever has the fish, then wait there looking at them
      const dx = fan.x - e.x, dz = fan.z - e.z, hd = Math.hypot(dx, dz) || 0.01, go = fan.d > 2.2 ? 1 : 0;
      e.yaw = Math.atan2(-dx, -dz);
      mx = (dx / hd) * go; mz = (dz / hd) * go; vyT = clamp((fan.y + 0.5 - e.y) * 1.2, -1.5, 1.5);
      if (fan.d > 6) sp *= 1.5;
    } else {   // swim about near home, and now and then up to the top for a breath through the snorkel
      e.aiT -= dt;
      if (e.aiT <= 0 || e.collidedH) {
        e.aiT = e.panic > 0 ? randRange(0.4, 1) : randRange(1.5, 4.5);
        e.yaw = Math.random() * TAU; e.swimUp = randRange(-0.6, 0.6);
        if (e.home && Math.hypot(e.home[0] - e.x, e.home[1] - e.z) > 14) e.yaw = Math.atan2(-(e.home[0] - e.x), -(e.home[1] - e.z));
        if (Math.random() < 0.15) e.swimUp = 1.2;
        if (Math.random() < 0.12) { e.tootT = 0.6; sfx('snorkSay', e.x, e.y + 1.2, e.z); }
      }
      mx = -Math.sin(e.yaw); mz = -Math.cos(e.yaw); vyT = e.swimUp || 0;
      if (e.panic > 0) sp *= 2.2;
      if (w.getBlock(Math.floor(e.x + mx * 0.8), Math.floor(e.y + 0.5), Math.floor(e.z + mz * 0.8)) !== B.WATER) {   // the edge of the water: turn round
        e.yaw += Math.PI * randRange(0.6, 1.4); mx = -Math.sin(e.yaw); mz = -Math.cos(e.yaw); e.aiT = randRange(1, 2.5);
      }
    }
    if (w.getBlock(Math.floor(e.x), Math.floor(e.y + 0.95), Math.floor(e.z)) !== B.WATER) vyT = Math.min(vyT, -0.2);   // at the top only the snorkel sticks out
    if (w.getBlock(Math.floor(e.x), Math.floor(e.y - 0.15), Math.floor(e.z)) !== B.WATER) vyT = Math.max(vyT, 0.2);
    sp *= (e.frozen > 0 ? 0 : 1) * mobSpeedFx(e);
    const k = Math.min(1, 3 * dt);
    e.vx += (mx * sp - e.vx) * k; e.vz += (mz * sp - e.vz) * k; e.vy += (vyT - e.vy) * k;
    moveEntity(w, e, e.vx * dt, e.vy * dt, e.vz * dt);
    e.fallDist = 0; e.onGround = false;
  } else {   // out of the water: hop about, and after a while go home (with a puff of bubbles)
    physicsStep(w, e, dt, 24);
    if (e.onGround) { const f = Math.pow(0.05, dt); e.vx *= f; e.vz *= f; if (Math.random() < dt * 1.5) { e.vy = 5; e.vx = randRange(-1.5, 1.5); e.vz = randRange(-1.5, 1.5); } }
    e.dryT = (e.dryT || 0) + dt;
    if (e.dryT > 12) { e.removed = true; snorkBubbles(e.x, e.y + 0.6, e.z, 16); sfx('snorkSay', e.x, e.y + 1, e.z); }
    e.fallDist = 0;
  }
  if (e.tootT > 0 && Math.random() < dt * 20) { const t = snorkTop(e); snorkBubbles(t[0], t[1], t[2], 1); }
  const hs = Math.hypot(e.vx, e.vz);
  if (e.happy > 0) e.bodyYaw += dt * 8;   // a happy spin
  else if (hs > 0.05) e.bodyYaw = approachAngle(e.bodyYaw, Math.atan2(-e.vx, -e.vz), dt * 5);
  else e.bodyYaw = approachAngle(e.bodyYaw, e.yaw, dt * 3);
  e.headYaw = e.bodyYaw;
  e.walk += dt * (3 + hs * 3); e.walkAmt = Math.min(1, 0.35 + hs);
  const pd = nearestPlayerDist(game, e);
  if (pd > 80 || (pd > 48 && Math.random() < dt * 0.01) || e.y < -30) e.removed = true;
}
/* tapped by a player: with a fish, it takes it and gives a present back */
function snorkGift(game, pl, e, hid, creative) {
  e.yaw = Math.atan2(-(pl.x - e.x), -(pl.z - e.z));
  e.tootT = 0.6;
  if (!isSnorkFood(hid)) { sfx('snorkSay', e.x, e.y + 1.2, e.z); toast('Snorks love fish! Give one a fish and it gives you a present.', 3); return; }
  if (e.fedAt > game.t) { sfx('snorkSay', e.x, e.y + 1.2, e.z); toast('This Snork is still eating the last fish. Yum!', 2.5); return; }
  if (!creative) pl.consumeHeld(1);
  e.fedAt = game.t + 12; e.happy = 1.5;   // (a time, not a count-down: on another iPad, nothing counts down a Snork from the host)
  let r = Math.random() * SNORK_GIFTS.reduce((a, g) => a + g[3], 0), g = SNORK_GIFTS[0];
  for (const q of SNORK_GIFTS) { if (r < q[3]) { g = q; break; } r -= q[3]; }
  const id = g[0] === 'coral' ? B.CORAL_RED + randInt(0, 2) : g[0], n = randInt(g[1], g[2]);
  const left = pl.give(id, n);
  if (left > 0) dropItem(game, pl.x, pl.y + 1, pl.z, id, left);
  ui.dirty = true;
  toast('The Snork gave you ' + (n > 1 ? n + ' x ' : 'a ') + itemName(id) + '!', 3);
  snorkBubbles(e.x, e.y + 1, e.z, 12);
  sfx('snorkHappy', e.x, e.y + 1.2, e.z);
  if (game.net) MP.localFx('sfx', e.x, e.y + 1.2, e.z, SFX_NET.indexOf('snorkHappy'));
  game.stats.snorks = (game.stats.snorks || 0) + 1;
}
/* under water and nearly out of air: a snork close by shares its air (each iPad does this for its own player) */
function snorkShareAir(game, pl) {
  if (pl.snorkAirT > game.t) return;
  for (const e of game.entities) {
    if (e.type !== 'snork' || e.removed || e.dead || Math.hypot(e.x - pl.x, e.y - pl.y, e.z - pl.z) > 4.5) continue;
    pl.air = 10; pl.airT = 0; pl.snorkAirT = game.t + 4; ui.air = -2;
    e.tootT = 1;
    sfx('snorkToot', e.x, e.y + 1.2, e.z);
    if (game.net) MP.localFx('sfx', e.x, e.y + 1.2, e.z, SFX_NET.indexOf('snorkToot'));
    snorkBubbles(pl.x, pl.y + 1.4, pl.z, 14);
    if (!game.stats.snorkAir) { game.stats.snorkAir = 1; chat('A Snork shared its air with you!', '#7fd7ff'); }
    return;
  }
}
/* now and then a family of snorks turns up in deep water near a player (only one family close by at a time) */
function snorkSpawnTick(game) {
  if (Math.random() > 0.25) return;
  const w = game.world, players = allPlayers(game).filter(p => p.alive && (p === game.player || p.lastState));
  if (!players.length) return;
  let n = 0;
  for (const e of game.entities) if (e.type === 'snork' && !e.removed) n++;
  if (n >= 6 * Math.min(2, players.length)) return;
  const pl = players[randInt(0, players.length - 1)], local = pl === game.player, px = local ? pl.x : pl.tx, py = local ? pl.y : pl.ty, pz = local ? pl.z : pl.tz;
  for (let a = 0; a < 8; a++) {
    const ang = Math.random() * TAU, dist = randRange(12, 30), x = Math.floor(px + Math.cos(ang) * dist), z = Math.floor(pz + Math.sin(ang) * dist);
    let top = -1;
    for (let y = Math.min(WH - 2, Math.floor(py + 10)); y > 1 && y > py - 30; y--) {
      const b = w.getBlock(x, y, z);
      if (b === B.UNLOADED || (SOLID[b] && b !== B.ICE)) break;
      if (b === B.WATER) { top = y; break; }
    }
    if (top < 0) continue;
    let depth = 1;
    while (depth < 10 && w.getBlock(x, top - depth, z) === B.WATER) depth++;
    if (depth < 5) continue;
    if (game.entities.some(e => e.type === 'snork' && !e.removed && Math.hypot(e.x - x, e.z - z) < 32)) return;
    const count = randInt(2, 4), used = [];
    for (let i = 0; i < count; i++) {
      let v = randInt(0, SNORK_COLORS.length - 1);
      for (let t = 0; t < 8 && used.includes(v); t++) v = randInt(0, SNORK_COLORS.length - 1);
      used.push(v);
      const sx = x + 0.5 + randRange(-0.8, 0.8), sy = top - depth + 1.5 + i * 0.6, sz = z + 0.5 + randRange(-0.8, 0.8);
      if (w.getBlock(Math.floor(sx), Math.floor(sy + 0.5), Math.floor(sz)) === B.WATER && boxFree(w, sx, sy, sz, 0.25, 1.15)) spawnMob(game, 'snork', sx, sy, sz, { variant: v, home: [x + 0.5, z + 0.5] });
    }
    return;
  }
}
