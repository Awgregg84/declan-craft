/* ===================== Endermen and ghasts ===================== */
// Endermen wander at night and leave you alone, unless you look one in the eyes or hit it. They
// teleport (and always dodge arrows), hate water, and sometimes carry a block about.
// Ghasts float in the Nether's big caves and shoot fireballs, which you can hit straight back.
const ENDER_TAKES = new Set([B.GRASS, B.DIRT, B.SAND, B.GRAVEL, B.DANDELION, B.POPPY, B.PUMPKIN, B.NETHERRACK, B.SOUL_SAND].filter(v => v !== undefined));

function isNatural(world, x, y, z) {
  const em = world.edits.get(chunkKey(x >> 4, z >> 4));
  return !em || !em.has((x & 15) | ((z & 15) << 4) | (y << 8));
}
/* who (if anyone) is looking an enderman right in the eyes, with nothing in between */
function enderStaredBy(game, e) {
  if (game.settings.difficulty === 0) return null;
  for (const p of allPlayers(game)) {
    const remote = p !== game.player;
    if (!p.alive || (remote && !p.lastState) || (remote ? p.mode : game.mode) !== 'survival') continue;
    const ex = remote ? p.tx : p.x, ey = (remote ? p.ty : p.y) + 1.62, ez = remote ? p.tz : p.z;
    const hx = e.x - ex, hy = e.y + e.h - 0.3 - ey, hz = e.z - ez, d = Math.hypot(hx, hy, hz);
    if (d > 32 || d < 0.6) continue;
    const L = p.lookDir();
    if ((hx * L[0] + hy * L[1] + hz * L[2]) / d < 1 - 0.025 / d) continue;
    if (raycast(game.world, ex, ey, ez, hx / d, hy / d, hz / d, d - 0.4, true)) continue;
    return remote ? p.id : 'me';
  }
  return null;
}
/* jump somewhere close by (mode 'toward': near the one it is after) */
function enderTeleport(game, e, mode) {
  const w = game.world;
  let ox = e.x, oy = e.y, oz = e.z, R = mode === 'dodge' ? 8 : 16;
  if (mode === 'toward') { const tg = angryTarget(game, e); if (!tg) return false; ox = e.x + tg.dx; oz = e.z + tg.dz; oy = tg.p === game.player ? tg.p.y : tg.p.ty; R = 4; }
  for (let k = 0; k < 16; k++) {
    const x = Math.floor(ox + randRange(-R, R)) + 0.5, z = Math.floor(oz + randRange(-R, R)) + 0.5;
    if (mode === 'toward' && Math.hypot(x - ox, z - oz) < 1.5) continue;
    for (let y = Math.floor(oy) + 6; y > Math.floor(oy) - 8; y--) {
      const under = w.getBlock(Math.floor(x), y - 1, Math.floor(z));
      if (under === B.UNLOADED) break;
      if (!SOLID[under] || !OPAQUE[under] || !boxFree(w, x, y, z, e.w, e.h)) continue;
      const feet = w.getBlock(Math.floor(x), y, Math.floor(z));
      if (LIQUID[feet]) continue;
      enderParticles(e.x, e.y, e.z, 20); sfx('endermanPortal', e.x, e.y + 1.4, e.z);
      MP.fx('tele', e.x, e.y, e.z);
      e.x = x; e.y = y; e.z = z; e.vx = e.vy = e.vz = 0; e.fallDist = 0;
      enderParticles(e.x, e.y, e.z, 20); sfx('endermanPortal', e.x, e.y + 1.4, e.z);
      MP.fx('tele', e.x, e.y, e.z);
      return true;
    }
  }
  return false;
}
/* the enderman's own business, before it walks: staring, teleporting, water, carrying blocks */
function enderTick(game, e, dt) {
  const w = game.world;
  e.tpT = (e.tpT || 0) - dt;
  if (!(e.angryT > 0)) {
    const by = enderStaredBy(game, e);
    if (by) {
      e.stareT = (e.stareT || 0) + dt;
      if (e.stareT > 0.25) { e.angryAt = by; e.angryT = 40; e.stareT = 0; e.screamT = 1.2; sfx('endermanStare', e.x, e.y + 2.5, e.z); }
    } else e.stareT = 0;
  }
  if (e.screamT > 0) e.screamT -= dt;
  const wet = w.getBlock(Math.floor(e.x), Math.floor(e.y + 0.2), Math.floor(e.z)) === B.WATER || w.getBlock(Math.floor(e.x), Math.floor(e.y + 1.5), Math.floor(e.z)) === B.WATER;
  if (wet && e.tpT <= 0) { e.tpT = 0.5; hurtMob(game, e, 1, e.x, e.z, 'water'); if (!e.dead) enderTeleport(game, e, 'random'); return; }
  if (e.angryT > 0) {
    const tg = angryTarget(game, e);
    if (tg && tg.dist > 10 && e.tpT <= 0 && Math.random() < dt * 0.8) { e.tpT = 2; enderTeleport(game, e, 'toward'); }
    return;
  }
  if (e.tpT <= 0 && Math.random() < dt * 0.01) { e.tpT = 5; enderTeleport(game, e, 'random'); return; }
  // calm: now and then pick up a natural block, and later put it down somewhere else
  if (!e.carry && Math.random() < dt * 0.04) {
    const x = Math.floor(e.x + randRange(-2, 2)), y = Math.floor(e.y + randRange(-1, 2.5)), z = Math.floor(e.z + randRange(-2, 2)), b = w.getBlock(x, y, z);
    if (ENDER_TAKES.has(b) && isNatural(w, x, y, z) && !LIQUID[w.getBlock(x, y + 1, z)] && w.getBlock(x, y + 1, z) !== B.UNLOADED) {
      w.setBlock(x, y, z, B.AIR, 0, true);
      e.carry = b;
    }
  } else if (e.carry && Math.random() < dt * 0.025) {
    const x = Math.floor(e.x + randRange(-1.5, 1.5)), y = Math.floor(e.y + randRange(-0.5, 1.5)), z = Math.floor(e.z + randRange(-1.5, 1.5));
    const b = w.getBlock(x, y, z), under = w.getBlock(x, y - 1, z), flower = e.carry === B.DANDELION || e.carry === B.POPPY;
    const fits = b === B.AIR && (flower ? under === B.GRASS || under === B.DIRT : SOLID[under] && OPAQUE[under]);
    if (fits && !spotTaken(game, x, y, z)) { w.setBlock(x, y, z, e.carry, 0, true); e.carry = 0; }
  }
}
/* is a creature or player in the way of a block at x, y, z? */
function spotTaken(game, x, y, z) {
  const hits = (ox, oy, oz, ow, oh) => ox + ow > x && ox - ow < x + 1 && oz + ow > z && oz - ow < z + 1 && oy < y + 1 && oy + oh > y;
  for (const o of game.entities) if (o.mob && !o.dead && !o.removed && hits(o.x, o.y, o.z, o.w, o.h)) return true;
  for (const p of allPlayers(game)) { const r = p !== game.player; if (hits(r ? p.tx : p.x, r ? p.ty : p.y, r ? p.tz : p.z, 0.3, 1.8)) return true; }
  return false;
}

/* ---- ghasts ---- */
function ghastTarget(game, e) {
  let best = null, bd = 48;
  const cx = e.x, cy = e.y + 1.5, cz = e.z;
  for (const p of allPlayers(game)) {
    const remote = p !== game.player;
    if (!p.alive || (remote && !p.lastState) || (remote ? p.mode : game.mode) !== 'survival') continue;
    const px = remote ? p.tx : p.x, py = (remote ? p.ty : p.y) + 1, pz = remote ? p.tz : p.z;
    const d = Math.hypot(px - cx, py - cy, pz - cz);
    if (d >= bd) continue;
    if (raycast(game.world, cx, cy, cz, (px - cx) / d, (py - cy) / d, (pz - cz) / d, d, true)) continue;   // can't see them
    bd = d; best = { p, remote, dist: d, dx: px - cx, dy: py - cy, dz: pz - cz };
  }
  return best;
}
function updateGhast(game, e, d, dt) {
  const w = game.world;
  e.aiT -= dt;
  if (!e.goal || e.aiT <= 0 || e.collidedH || e.hitCeil || e.onGround) {
    e.goal = [e.x + randRange(-14, 14), clamp(e.y + randRange(-6, 6), 24, 104), e.z + randRange(-14, 14)];
    e.aiT = randRange(4, 9);
    if (Math.random() < 0.25) sfx('ghastSay', e.x, e.y + 1.5, e.z);
  }
  const gx = e.goal[0] - e.x, gy = e.goal[1] - e.y, gz = e.goal[2] - e.z, gd = Math.hypot(gx, gy, gz) || 1;
  const sp = gd > 1.5 ? d.speed : 0, k = Math.min(1, dt * 1.2);
  e.vx += (gx / gd * sp - e.vx) * k; e.vy += (gy / gd * sp - e.vy) * k; e.vz += (gz / gd * sp - e.vz) * k;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(e.vx), Math.abs(e.vy), Math.abs(e.vz)) * dt / 0.4));
  for (let i = 0; i < steps; i++) moveEntity(w, e, e.vx * dt / steps, e.vy * dt / steps, e.vz * dt / steps);
  const tg = ghastTarget(game, e);
  if (tg) {
    e.yaw = Math.atan2(-tg.dx, -tg.dz);
    e.attackT = (e.attackT || 0) + dt;
    if (e.attackT > 2.2 && !(e.firing > 0)) { e.firing = 1.3; sfx('ghastWarn', e.x, e.y + 1.5, e.z); }
    if (e.attackT >= 3) {
      e.attackT = 0;
      const l = tg.dist, fx = tg.dx / l, fy = tg.dy / l, fz = tg.dz / l, sx = e.x + fx * 1.8, sy = e.y + 1.5 + fy * 1.8, sz = e.z + fz * 1.8, v = 13;
      shootProjectile(game, 'fireball', sx, sy, sz, (fx + randRange(-0.04, 0.04)) * v, (fy + randRange(-0.04, 0.04)) * v, (fz + randRange(-0.04, 0.04)) * v, { owner: 'mob', ownerNid: e.nid });
      sfx('ghastShoot', sx, sy, sz); MP.sfx('ghastShoot', sx, sy, sz);
    }
  } else {
    e.attackT = Math.max(0, (e.attackT || 0) - dt);
    if (Math.hypot(e.vx, e.vz) > 0.3) e.yaw = Math.atan2(-e.vx, -e.vz);
  }
  if (e.firing > 0) e.firing -= dt;
  const pd = nearestPlayerDist(game, e);
  if (pd > 96 || (pd > 64 && Math.random() < dt * 0.02)) e.removed = true;
  e.bodyYaw = approachAngle(e.bodyYaw, e.yaw, dt * 2); e.headYaw = e.bodyYaw;
}
/* a ghast needs a lot of open air */
function ghastSpawnTick(game, players) {
  const w = game.world;
  let n = 0;
  for (const e of game.entities) if (e.type === 'ghast' && !e.dead) n++;
  if (n >= 2 * Math.min(2, players.length) || Math.random() > 0.12) return;
  const pl = players[randInt(0, players.length - 1)], px = pl === game.player ? pl.x : pl.tx, pz = pl === game.player ? pl.z : pl.tz;
  for (let a = 0; a < 4; a++) {
    const ang = Math.random() * TAU, dist = randRange(24, 44);
    const x = px + Math.cos(ang) * dist, z = pz + Math.sin(ang) * dist, y = randInt(36, 96);
    if (w.getBlock(Math.floor(x), y, Math.floor(z)) !== B.AIR) continue;
    if (!boxFree(w, x, y - 1, z, 2.5, 5.5)) continue;
    let air = true;
    for (let dy = -2; dy <= 5 && air; dy += 2) for (const [ox, oz] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, 0]]) if (w.getBlock(Math.floor(x + ox), y + dy, Math.floor(z + oz)) !== B.AIR) { air = false; break; }
    if (!air) continue;
    spawnMob(game, 'ghast', x, y, z);
    return;
  }
}
