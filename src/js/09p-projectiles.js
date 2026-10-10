/* ===================== Arrows, fireballs, fire charges and ender pearls ===================== */
// Shot by players (bows, crossbows, pearls, fire charges), dispensers and ghasts. A single player or the
// host moves them and decides what they hit; guests see them fly along (and their own shots at once, as a
// "ghost" that the host's real one replaces).
const PROJ = {
  arrow: { grav: 20, drag: 0.99, r: 0.06 },
  fireball: { grav: 0, drag: 1, r: 0.4 },    // a ghast's: blows up what it hits (and can be hit back)
  charge: { grav: 0, drag: 1, r: 0.2 },      // a fire charge: burns what it hits
  pearl: { grav: 20, drag: 0.99, r: 0.12 },  // an ender pearl: takes its thrower where it lands
};
const PROJ_KINDS = Object.keys(PROJ);
const isPlayerOwner = o => o === 'me' || (typeof o === 'string' && o !== 'disp' && o !== 'mob');

function shootProjectile(game, kind, x, y, z, vx, vy, vz, o) {
  const e = new Entity('proj', x, y, z);
  e.kind = kind; e.vx = vx; e.vy = vy; e.vz = vz; e.w = PROJ[kind].r; e.h = 0;
  e.owner = (o && o.owner) || null; e.ownerNid = (o && o.ownerNid) || 0;
  e.dmg = (o && o.dmg) || 0; e.crit = !!(o && o.crit); e.pickup = !!(o && o.pickup); e.tok = (o && o.tok) || '';
  e.ghost = !!(o && o.ghost);
  game.entities.push(e);
  return e;
}
/* a player's shot: here at once; on a guest, the host is asked to make the real one */
function playerShoot(game, kind, vel, o) {
  const pl = game.player, [dx, dy, dz] = pl.lookDir(), [ex, ey, ez] = pl.eyePos();
  const x = ex + dx * 0.5, y = ey - 0.12 + dy * 0.5, z = ez + dz * 0.5;
  let vx = dx * vel, vy = dy * vel, vz = dz * vel;
  if (kind === 'pearl') vy += 2;
  if (MP.role === 'guest') {
    const tok = randomId(6);
    MP.send({ t: 'shoot', k: kind, p: [r2(x), r2(y), r2(z)], v: [r2(vx), r2(vy), r2(vz)], d: o.dmg || 0, c: o.crit ? 1 : 0, tok, s: o.snd });
    shootProjectile(game, kind, x, y, z, vx, vy, vz, { owner: 'me', ghost: true, tok, crit: o.crit });
    return;
  }
  shootProjectile(game, kind, x, y, z, vx, vy, vz, Object.assign({ owner: 'me' }, o));
}
/* the nearest creature or player a projectile meets on its way (t: distance along the unit direction) */
function projTarget(game, e, x, y, z, nx, ny, nz, maxT) {
  let best = null, bt = maxT;
  const pad = PROJ[e.kind].r, young = e.age < 0.3;
  for (const o of game.entities) {
    if (!o.mob || o.dead || o.removed) continue;
    if ((e.ownerNid && o.nid === e.ownerNid && young) || o.nid === e.passed) continue;
    const t = rayBox(x, y, z, nx, ny, nz, o.x - o.w - pad, o.y - pad, o.z - o.w - pad, o.x + o.w + pad, o.y + o.h + pad, o.z + o.w + pad);
    if (t >= 0 && t < bt) { bt = t; best = { o, player: null }; }
  }
  // what players shoot never hurts players; pearls never hurt anyone
  if (e.kind !== 'pearl' && !isPlayerOwner(e.owner)) {
    for (const p of allPlayers(game)) {
      const remote = p !== game.player;
      if (!p.alive || (remote && !p.lastState)) continue;
      const px = remote ? p.tx : p.x, py = remote ? p.ty : p.y, pz = remote ? p.tz : p.z;
      const t = rayBox(x, y, z, nx, ny, nz, px - 0.3 - pad, py - pad, pz - 0.3 - pad, px + 0.3 + pad, py + 1.8 + pad, pz + 0.3 + pad);
      if (t >= 0 && t < bt) { bt = t; best = { o: p, player: remote ? 'remote' : 'me' }; }
    }
  }
  return best ? Object.assign(best, { t: bt }) : null;
}
function hurtPlayerBy(game, p, who, dmg, cause, kx, ky, kz) {
  if (who === 'remote') { if (p.mode === 'survival') MP.hurtRemote(p, dmg, cause, kx, ky, kz); return; }
  p.damage(dmg, cause);
  p.vx += kx; p.vz += kz; p.vy = Math.max(p.vy, ky);
}
function updateProjectile(game, e, dt) {
  const P = PROJ[e.kind], world = game.world;
  if (e.stuck) {
    if (!SOLID[world.getBlock(e.sx, e.sy, e.sz)]) { e.stuck = false; e.vx = e.vy = e.vz = 0; return; }   // the block went: it falls
    if (e.age > 60 || (e.ghost && e.age > 4)) e.removed = true;
    else if (e.pickup && !e.ghost) pickUpArrow(game, e);
    return;
  }
  if (e.ghost && e.age > 4) { e.removed = true; return; }
  e.vy -= P.grav * dt;
  if (P.drag < 1) { const k = Math.pow(P.drag, dt * 20); e.vx *= k; e.vy *= k; e.vz *= k; }
  const b = world.getBlock(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z));
  if (b === B.WATER) {
    if (e.kind === 'fireball' || e.kind === 'charge') { e.removed = true; sfx('fizz', e.x, e.y, e.z); smokeParticles(e.x, e.y, e.z, 6, 0.2, false); return; }
    const k = Math.pow(0.2, dt); e.vx *= k; e.vy *= k; e.vz *= k;
  }
  const len = Math.hypot(e.vx, e.vy, e.vz) * dt;
  if (len < 1e-6) return;
  const nx = e.vx * dt / len, ny = e.vy * dt / len, nz = e.vz * dt / len;
  const hit = raycast(world, e.x, e.y, e.z, nx, ny, nz, len, true);
  const ent = projTarget(game, e, e.x, e.y, e.z, nx, ny, nz, hit ? hit.t : len);
  if (ent) { projHit(game, e, e.x + nx * ent.t, e.y + ny * ent.t, e.z + nz * ent.t, nx, ny, nz, ent, null); return; }
  if (hit) { projHit(game, e, e.x + nx * hit.t, e.y + ny * hit.t, e.z + nz * hit.t, nx, ny, nz, null, hit); return; }
  e.x += nx * len; e.y += ny * len; e.z += nz * len;
  if (e.y < -40 || e.age > 30) e.removed = true;
  projTrail(e, dt);
}
function projTrail(e, dt) {
  if (PARTICLES.length > 1400) return;
  if (e.kind === 'fireball' || e.kind === 'charge') {
    if (Math.random() < dt * 30) PARTICLES.push({ x: e.x + randRange(-0.2, 0.2), y: e.y + randRange(-0.2, 0.2), z: e.z + randRange(-0.2, 0.2), vx: 0, vy: 0.4, vz: 0, life: randRange(0.2, 0.45), tile: TILE.flame, u: 0, v: 0, us: 16, size: e.kind === 'fireball' ? 0.18 : 0.1, grav: -0.5, bright: 1 });
    if (Math.random() < dt * 12) smokeParticles(e.x, e.y, e.z, 1, 0.15, false);
  } else if (e.kind === 'pearl') {
    if (Math.random() < dt * 25) PARTICLES.push({ x: e.x, y: e.y, z: e.z, vx: randRange(-0.3, 0.3), vy: randRange(-0.3, 0.3), vz: randRange(-0.3, 0.3), life: 0.5, tile: TILE.ender_dot, u: 0, v: 0, us: 16, size: 0.05, grav: 0, bright: 1 });
  } else if (e.crit && Math.random() < dt * 40) {
    PARTICLES.push({ x: e.x, y: e.y, z: e.z, vx: randRange(-0.4, 0.4), vy: randRange(-0.4, 0.4), vz: randRange(-0.4, 0.4), life: 0.35, tile: TILE.spark, u: 0, v: 0, us: 16, size: 0.05, grav: 0, bright: 1 });
  }
}
function projHit(game, e, x, y, z, nx, ny, nz, ent, blk) {
  const k = e.kind, by = isPlayerOwner(e.owner) && e.owner !== 'me' ? e.owner : undefined, cause = isPlayerOwner(e.owner) ? 'player' : k === 'arrow' ? 'arrow' : 'fireball';
  if (e.ghost) {   // only for show: the host's real one does the rest
    if (k === 'arrow' && blk) { e.stuck = true; e.x = x - nx * 0.1; e.y = y - ny * 0.1; e.z = z - nz * 0.1; e.sx = blk.x; e.sy = blk.y; e.sz = blk.z; }
    else e.removed = true;
    return;
  }
  if (k === 'pearl') { e.removed = true; pearlLand(game, e, x - nx * 0.4, y - ny * 0.4, z - nz * 0.4, blk); return; }
  if (k === 'fireball') {
    e.removed = true;
    if (ent && !ent.player) hurtMob(game, ent.o, ent.o.type === 'ghast' && e.deflected ? 1000 : 4, x - nx, z - nz, cause, by);
    else if (ent) hurtPlayerBy(game, ent.o, ent.player, 4, 'fireball', nx * 5, 3, nz * 5);
    explode(game, x - nx * 0.6, y - ny * 0.6, z - nz * 0.6, 1.6);
    return;
  }
  if (k === 'charge') {
    e.removed = true;
    if (ent && !ent.player) hurtMob(game, ent.o, 5, x - nx, z - nz, cause, by);
    else if (ent) hurtPlayerBy(game, ent.o, ent.player, 5, 'fireball', nx * 3, 2, nz * 3);
    sfx('fizz', x, y, z);
    for (let i = 0; i < 10 && PARTICLES.length < 1500; i++) PARTICLES.push({ x, y, z, vx: randRange(-2, 2), vy: randRange(0, 2.5), vz: randRange(-2, 2), life: randRange(0.3, 0.6), tile: TILE.flame, u: 0, v: 0, us: 16, size: 0.1, grav: -1, bright: 1 });
    MP.fx('smoke', x, y, z);
    return;
  }
  // an arrow
  if (ent) {
    if (!ent.player && ent.o.type === 'enderman') { e.passed = ent.o.nid; enderTeleport(game, ent.o, 'dodge'); return; }   // endermen dodge arrows; it flies on
    e.removed = true;
    const sp = Math.hypot(e.vx, e.vy, e.vz), dmg = Math.max(1, Math.round(e.dmg * Math.min(1, sp / 30 + 0.2)));
    if (!ent.player) hurtMob(game, ent.o, dmg, ent.o.x - nx, ent.o.z - nz, cause, by);
    else hurtPlayerBy(game, ent.o, ent.player, dmg, 'arrow', nx * 4, 2.5, nz * 4);
    sfx('arrowHit', x, y, z);
    return;
  }
  e.stuck = true; e.age = 0;
  e.x = x - nx * 0.1; e.y = y - ny * 0.1; e.z = z - nz * 0.1;
  e.sx = blk.x; e.sy = blk.y; e.sz = blk.z;
  sfx('arrowHit', x, y, z, 0.7);
  if (BLOCKS[blk.id] && BLOCKS[blk.id].tnt && e.crit && isPlayerOwner(e.owner)) { }   // (fire arrows would light TNT; these don't)
}
/* walk over an arrow you shot (in Survival) to pick it back up */
function pickUpArrow(game, e) {
  for (const p of allPlayers(game)) {
    const remote = p !== game.player;
    if (!p.alive || (remote && !p.lastState)) continue;
    const px = remote ? p.tx : p.x, py = remote ? p.ty : p.y, pz = remote ? p.tz : p.z;
    if (Math.abs(px - e.x) > 1.2 || Math.abs(pz - e.z) > 1.2 || e.y < py - 0.6 || e.y > py + 2.2) continue;
    if (remote) { MP.sendDrops(p, [[I.ARROW, 1, 0]], px, py + 0.5, pz); e.removed = true; return; }
    if (game.giveItem(I.ARROW, 1) === 0) { e.removed = true; sfx('pop', e.x, e.y, e.z); return; }
  }
}
/* an ender pearl takes whoever threw it to where it landed */
function pearlLand(game, e, x, y, z, blk) {
  enderParticles(x, y, z, 24);
  sfx('endermanPortal', x, y, z);
  MP.fx('tele', x, y, z);
  const world = game.world, under = blk && blk.face === 3, base = blk && blk.face === 2 ? blk.y + 1 : under ? blk.y - 1.85 : y - 0.9;
  let fy = null;
  for (const d of under ? [0, -1, -2, 1] : [0, 1, 2, -1, -2]) if (boxFree(world, x, base + d, z, 0.3, 1.8)) { fy = base + d; break; }
  if (fy === null) return;   // nowhere to stand there: the pearl is used up, and you stay put
  if (e.owner === 'me') {
    const pl = game.player;
    if (!pl.alive || game.state !== 'playing') return;
    pl.x = x; pl.y = fy; pl.z = z; pl.vx = pl.vy = pl.vz = 0; pl.fallDist = 0;
    pl.damage(3, 'fall');
    return;
  }
  const r = MP.remotes.get(e.owner);
  if (r && r.link && r.alive) { r.tx = r.x = x; r.ty = r.y = fy; r.tz = r.z = z; r.link.send({ t: 'tele', at: [r2(x), r2(fy), r2(z)] }); }
}
function enderParticles(x, y, z, n) {
  for (let i = 0; i < n && PARTICLES.length < 1600; i++) PARTICLES.push({ x: x + randRange(-0.5, 0.5), y: y + randRange(0, 2), z: z + randRange(-0.5, 0.5), vx: randRange(-1, 1), vy: randRange(-0.5, 1), vz: randRange(-1, 1), life: randRange(0.4, 0.9), tile: TILE.ender_dot, u: 0, v: 0, us: 16, size: randRange(0.04, 0.08), grav: 0, bright: 1 });
}
/* hitting a ghast's fireball sends it back where you are looking */
function deflectFireball(game, e, dir, owner) {
  if (e.kind !== 'fireball' || e.removed) return;
  const sp = Math.max(12, Math.hypot(e.vx, e.vy, e.vz));
  e.vx = dir[0] * sp; e.vy = dir[1] * sp; e.vz = dir[2] * sp;
  e.owner = owner; e.ownerNid = 0; e.deflected = true; e.age = 0;
  sfx('arrowHit', e.x, e.y, e.z);
}

/* ---- drawing ---- */
const _pj = M4.create(), _pj2 = M4.create();
let FIREBALL_MESH = null;
function fireballMesh() {
  if (FIREBALL_MESH) return FIREBALL_MESH;
  const mb = new MeshBuilder(), t = TILE.fireball, a = -8, b = 8;
  const F = [[[b, a, b], [b, a, a], [b, b, a], [b, b, b]], [[a, a, a], [a, a, b], [a, b, b], [a, b, a]], [[a, b, b], [b, b, b], [b, b, a], [a, b, a]],
    [[a, a, a], [b, a, a], [b, a, b], [a, a, b]], [[a, a, b], [b, a, b], [b, b, b], [a, b, b]], [[b, a, a], [a, a, a], [a, b, a], [b, b, a]]];
  for (const f of F) mb.quad(f, [[0, 16], [16, 16], [16, 0], [0, 0]], t, 1, 16, 0);
  return (FIREBALL_MESH = mb.build());
}
function tileMesh(name) { const k = 't:' + name; return ITEM_MESH[k] || (ITEM_MESH[k] = spriteMesh(TILE[name])); }
function drawProjectile(e, dx, dy, dz) {
  const P = PROG.entity;
  M4.identity(_pj);
  M4.translate(_pj, _pj, dx, dy, dz);
  if (e.kind === 'fireball' || e.kind === 'charge') {
    const s = (e.kind === 'fireball' ? 0.9 : 0.4) / 16;
    gl.uniform1f(P.u.uBright, 1);
    M4.rotY(_pj, _pj, e.age * 5); M4.rotX(_pj, _pj, e.age * 3);
    M4.scale(_pj, _pj, s, s, s);
    drawMesh(fireballMesh(), _pj);
    return;
  }
  if (e.kind === 'pearl') {
    M4.rotY(_pj, _pj, R.cam.yaw);
    M4.scale(_pj, _pj, 0.3 / 16, 0.3 / 16, 0.3 / 16);
    M4.translate(_pj, _pj, 0, -8, 0);
    drawMesh(tileMesh('ender_pearl'), _pj);
    return;
  }
  // arrows point along their flight (the picture has the tip up and to the right)
  const vx = e.vx, vy = e.vy, vz = e.vz;   // (a stuck arrow keeps the speed it hit with, for this)
  M4.rotY(_pj, _pj, Math.atan2(-(vz || 0), vx || 1e-6));
  M4.rotZ(_pj, _pj, Math.atan2(vy || 0, Math.hypot(vx || 0, vz || 0)));
  M4.scale(_pj, _pj, 0.7 / 16, 0.7 / 16, 0.7 / 16);
  _pj2.set(_pj);
  M4.rotX(_pj2, _pj2, Math.PI / 2);   // two crossed pictures, so it never looks flat
  const m = tileMesh('arrow');
  for (const mm of [_pj, _pj2]) { M4.rotZ(mm, mm, -Math.PI / 4); M4.translate(mm, mm, -3.5, -11.5, 0); drawMesh(m, mm); }   // the tip at the arrow's position
}
