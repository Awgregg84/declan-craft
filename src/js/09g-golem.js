/* ===================== Iron golems ===================== */
// Every village has an iron golem (a big one has two). It walks about near home, goes after monsters that come
// close and flings them up in the air, and now and then holds out a poppy to a villager. It only fights a player who
// hits it (and a golem someone built never does). Build one with four iron blocks in a T and a pumpkin on top.
const GOLEM_REACH = 1.9;
/* the monster a golem goes after: the nearest one near it and near home (not creepers: they'd blow up the village) */
function golemPrey(game, e) {
  let best = null, bd = 14;
  for (const m of game.entities) {
    if (!m.mob || m.dead || m.removed || m === e) continue;
    const d = MOB_DEFS[m.type];
    const bad = (d.hostile && !d.flyer && m.type !== 'creeper') || (d.neutral && !d.guard && m.angryT > 0);
    if (!bad) continue;
    const dist = Math.hypot(m.x - e.x, m.z - e.z);
    if (dist >= bd || Math.abs(m.y - e.y) > 6) continue;
    if (e.home && Math.hypot(m.x - e.home[0], m.z - e.home[1]) > 30) continue;
    bd = dist; best = m;
  }
  return best;
}
/* Walking about, chasing and fighting. Returns [mx, mz, speed multiplier] like villagerSteer. */
function golemSteer(game, e, dt) {
  if (e.rose > 0) e.rose -= dt;
  let tgt = null, who = null;
  if (e.angryT > 0 && !e.built) { const t = angryTarget(game, e); if (t) { tgt = t.p; who = t.remote ? 'remote' : 'me'; } }
  if (!tgt) {
    e.scanT = (e.scanT || 0) - dt;
    if (e.scanT <= 0 || (e.prey && (e.prey.removed || e.prey.dead))) { e.scanT = 0.5; e.prey = golemPrey(game, e); }
    tgt = e.prey;
  }
  if (tgt) {
    e.rose = 0;
    const dx = tgt.x - e.x, dz = tgt.z - e.z, dist = Math.hypot(dx, dz) || 0.01;
    e.yaw = Math.atan2(-dx, -dz);
    const reach = GOLEM_REACH + (tgt.w || 0.3);
    if (dist < reach && Math.abs(tgt.y - e.y) < 2.6 && e.attackCd <= 0) {
      e.attackCd = 1.4; e.armSwing = 0.5;   // both arms swing up
      sfx('golemAttack', e.x, e.y + 1.5, e.z);
      const kx = dx / dist, kz = dz / dist;
      if (who === 'me') { tgt.damage(randInt(5, 9), 'golem', e, e.x, e.z); tgt.vx += kx * 4; tgt.vz += kz * 4; tgt.vy = Math.max(tgt.vy, 9); }
      else if (who === 'remote') MP.hurtRemote(tgt, randInt(5, 9), 'golem', kx * 4, 9, kz * 4, e);
      else { hurtMob(game, tgt, randInt(7, 14), e.x, e.z, 'golem'); if (!tgt.dead) tgt.vy = 9; }   // flung up in the air
    }
    if (dist > reach * 0.75) return [dx / dist, dz / dist, 1.15];
    return [0, 0, 0];
  }
  // nothing to fight: stay near home, and sometimes hold out a poppy to a villager standing close by
  if (e.home) {
    const hx = e.home[0] - e.x, hz = e.home[1] - e.z, hd = Math.hypot(hx, hz);
    if (hd > 14) { e.moving = true; e.yaw = Math.atan2(-hx, -hz); e.aiT = 1; return [hx / hd, hz / hd, 0.5]; }
  }
  if (e.rose > 0) return [0, 0, 0];
  e.aiT -= dt;
  if (e.aiT <= 0) {
    e.aiT = randRange(2.5, 6);
    e.moving = Math.random() < 0.45;
    if (e.moving) e.yaw = Math.random() * TAU;
    if (!e.moving && Math.random() < 0.3) {
      const v = game.entities.find(o => o.type === 'villager' && !o.removed && Math.hypot(o.x - e.x, o.z - e.z) < 3.5);
      if (v) { e.rose = 5; e.yaw = Math.atan2(-(v.x - e.x), -(v.z - e.z)); }
    }
    if (Math.random() < 0.1) sfx('golemSay', e.x, e.y + 2, e.z);
  }
  if (e.moving) return [-Math.sin(e.yaw), -Math.cos(e.yaw), 0.45];
  return [0, 0, 0];
}
/* the golems of a village appear with its people (see spawnVillagers) */
function spawnGolems(game, x, y, z, people, vid) {
  const w = game.world, n = people >= 6 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const a = randRange(0, TAU), sx = x + Math.cos(a) * 4, sz = z + Math.sin(a) * 4;
    const top = w.topSolid(Math.floor(sx), Math.floor(sz));
    const sy = top > 0 && Math.abs(top + 1 - y) < 4 ? top + 1 : y;
    if (boxFree(w, sx, sy, sz, 0.7, 2.6)) spawnMob(game, 'golem', sx, sy, sz, { home: [x, z], village: vid });
  }
}
/* A pumpkin (or a jack o'lantern) just put on top of a T of four iron blocks: they come to life. (The host or a
   one-player game checks; a guest's blocks are checked when they reach the host.) */
function golemBuildCheck(game, x, y, z) {
  if (MP.role === 'guest') return false;
  const w = game.world, IB = B.IRON_BLOCK, top = w.getBlock(x, y, z);
  if (top !== B.PUMPKIN && top !== B.JACK_O_LANTERN) return false;
  if (w.getBlock(x, y - 1, z) !== IB || w.getBlock(x, y - 2, z) !== IB) return false;
  for (const [ax, az] of [[1, 0], [0, 1]]) {
    if (w.getBlock(x + ax, y - 1, z + az) !== IB || w.getBlock(x - ax, y - 1, z - az) !== IB) continue;
    for (const [bx, by, bz] of [[x, y, z], [x, y - 1, z], [x, y - 2, z], [x + ax, y - 1, z + az], [x - ax, y - 1, z - az]]) {
      blockParticles(bx, by, bz, w.getBlock(bx, by, bz), 8, true);
      w.setBlock(bx, by, bz, B.AIR, 0, true);
    }
    const g = spawnMob(game, 'golem', x + 0.5, y - 2, z + 0.5, { home: [x + 0.5, z + 0.5], built: true });
    g.yaw = g.bodyYaw = g.headYaw = Math.atan2(-(game.player.x - g.x), -(game.player.z - g.z));
    sfx('golemBuilt', x + 0.5, y - 1, z + 0.5);
    if (MP.role === 'host') MP.sfx('golemBuilt', x + 0.5, y - 1, z + 0.5);
    return true;
  }
  return false;
}
/* the poppy, in the golem's right hand held out in front (drawn with the other held things, after the creatures) */
function drawGolemRose(e, world, s, cam) {
  const P = PROG.entity;
  gl.uniform1f(P.u.uBright, brightAt(world, e.x, e.y + 1.4, e.z, s));
  gl.uniform4f(P.u.uTint, 0, 0, 0, 0);
  M4.identity(_eb);
  M4.translate(_eb, _eb, e.x - cam.x, e.y - cam.y, e.z - cam.z);
  M4.rotY(_eb, _eb, e.bodyYaw + Math.PI);
  const sc = MODELS.golem.scale;
  M4.scale(_eb, _eb, sc, sc, sc);
  M4.translate(_eb, _eb, -5.5, 8.8, 13.3);   // where the arm, held out forward, ends (the stem goes through the hand)
  M4.scale(_eb, _eb, 0.42, 0.42, 0.42);
  drawMesh(itemMesh(B.POPPY), _eb);
}
