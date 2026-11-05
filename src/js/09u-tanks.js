/* ===================== Tanks ===================== */
// A tank drives like a slow, steady car: it turns on the spot, climbs one-block steps, sinks in water, and its
// tracks run as it goes. Its turret and gun turn to wherever the driver looks, and a tap fires a paint shell in the
// tank's colour: a puff, a splat and a fun sound. Paint never hurts anyone and breaks nothing; it gives creatures a
// gentle shove, and paints a sheep's wool. Each tank's colour (TANK_COLORS, in 01-blocks.js) is its item, kept with
// the world when saved and sent to everyone playing together.
const isTankItem = id => id >= I.TANK && id < I.TANK + TANK_COLORS.length;
/* the treads run along: dist is how far the tank went, turn how far each side went the other way as it turned */
function tankTracks(e, dist, turn) {
  e.trL = ((e.trL || 0) + (dist - turn) * 8) % 3;
  e.trR = ((e.trR || 0) + (dist + turn) * 8) % 3;
}
function tankStep(game, e, dt) {
  const w = game.world, driven = !!e.rider;
  const throttle = driven ? e.ctrlZ || 0 : 0, steer = driven ? e.ctrlX || 0 : 0;
  let fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), v = e.vx * fx + e.vz * fz;
  if (throttle > 0.1) v += throttle * (v < 0 ? 10 : 4) * dt;
  else if (throttle < -0.1) v += throttle * (v > 0 ? 10 : 3) * dt;
  else v *= Math.pow(e.onGround ? 0.04 : 0.9, dt);   // (its tracks stop it quickly)
  v = clamp(v, -2.5, 5.5);
  if (e.inWater) v = clamp(v, -1, 1.5);
  const turn = steer * 1.3 * (v < -0.3 ? -1 : 1) * dt;   // (it can turn on the spot)
  e.yaw -= turn;
  fx = -Math.sin(e.yaw); fz = -Math.cos(e.yaw);
  e.vx = fx * v; e.vz = fz * v;
  const before = e.onGround, want = Math.abs(v) > 0.4 ? Math.sign(v) : Math.abs(throttle) > 0.1 ? Math.sign(throttle) : 0;
  physicsStep(w, e, dt, 24);
  if (e.collidedH && before && want && boxFree(w, e.x + fx * 0.4 * want, e.y + 1.05, e.z + fz * 0.4 * want, e.w, e.h)) {   // a one-block step: climb it
    const sp = Math.max(Math.abs(v), 2) * want;
    e.vy = 7.2; e.vx = fx * sp; e.vz = fz * sp;
  }
  e.fallDist = 0;
  e.wheel += v * dt / 0.2;
  tankTracks(e, v * dt, turn * 0.8);
  if (e.recoil > 0) e.recoil = Math.max(0, e.recoil - dt * 4);
  // creatures in the way are nudged aside (a tank never hurts anything)
  if (Math.abs(v) > 0.8) for (const m of game.entities) {
    if (!m.mob || m.dead || m.removed || m.proxy) continue;
    if (Math.abs(m.x - e.x) < e.w + m.w && Math.abs(m.z - e.z) < e.w + m.w && m.y < e.y + e.h && m.y + m.h > e.y) {
      const dx = m.x - e.x, dz = m.z - e.z, d = Math.hypot(dx, dz) || 1;
      m.vx += dx / d * 3 * dt * 10; m.vz += dz / d * 3 * dt * 10;
    }
  }
}
/* tap in a tank: a paint shell flies from the end of the gun */
function tankFire(game, pl, v) {
  const yaw = v.turret === undefined ? pl.yaw : v.turret, g = v.gun || 0, cp = Math.cos(g);
  const dir = [-Math.sin(yaw) * cp, Math.sin(g), -Math.cos(yaw) * cp];
  const from = [v.x + dir[0] * 1.9, v.y + 1.15 + dir[1] * 1.9, v.z + dir[2] * 1.9];
  playerShoot(game, 'paint', 22, { from, dir, pk: v.tc | 0, snd: 'tankFire' });
  sfx('tankFire', from[0], from[1], from[2]);
  if (MP.role === 'host') { MP.sfx('tankFire', from[0], from[1], from[2]); MP.fx('smoke', from[0], from[1], from[2]); }
  smokeParticles(from[0], from[1], from[2], 6, 0.2, false);
  v.recoil = 1;
}
/* a paint shell lands: a splat of paint (and a gentle shove, or a sheep turns the paint's colour) */
function paintSplat(game, e, x, y, z, nx, ny, nz, ent) {
  const c = clamp(e.pk | 0, 0, TANK_COLORS.length - 1);
  paintFx(x, y, z, c);
  MP.fxId('paint', x, y, z, c);
  if (!ent || ent.player) return;
  const m = ent.o;
  if (!m.proxy) { m.vx += nx * 4; m.vz += nz * 4; m.vy = Math.max(m.vy, 3.5); }
  if (m.type === 'sheep' && !m.dead) { m.wool = TANK_WOOL[c]; m.color = hexRGB(WOOL_COLORS[m.wool]).map(q => q / 255); }
}
function paintFx(x, y, z, c) {
  sfx('paintSplat', x, y, z);
  const t = TILE['paint_' + c];
  for (let i = 0; i < 26 && PARTICLES.length < 1600; i++) PARTICLES.push({ x, y, z, vx: randRange(-3, 3), vy: randRange(0, 4), vz: randRange(-3, 3), life: randRange(0.5, 1), tile: t, u: 0, v: 0, us: 16, size: randRange(0.05, 0.11), grav: 12, bright: 1 });
  for (let i = 0; i < 10 && PARTICLES.length < 1600; i++) PARTICLES.push({ x: x + randRange(-0.4, 0.4), y: y + randRange(-0.3, 0.3), z: z + randRange(-0.4, 0.4), vx: 0, vy: 0, vz: 0, life: randRange(2, 3), tile: t, u: 0, v: 0, us: 16, size: randRange(0.08, 0.14), grav: 0, bright: 1 });   // (blobs that hang about a moment)
}
/* drawing (base: the tank's place, turned and scaled to its model) */
const _tk = M4.create(), _tk2 = M4.create();
function drawTank(e, base) {
  const M = MODELS.tank, u = PROG.entity.u, P = M.parts;
  gl.uniform3fv(u.uColor, tankRGB(e.tc | 0));
  drawPart(P.hull, base);
  const tv = P.turret.pivot, rel = (e.turret === undefined ? e.yaw : e.turret) - e.yaw;
  _tk.set(base);
  M4.translate(_tk, _tk, tv[0], tv[1], tv[2]); M4.rotY(_tk, _tk, rel); M4.translate(_tk, _tk, -tv[0], -tv[1], -tv[2]);
  drawPart(P.turret, _tk);
  const gv = P.gun.pivot;
  _tk2.set(_tk);
  M4.translate(_tk2, _tk2, gv[0], gv[1], gv[2] - (e.recoil || 0) * 1.5); M4.rotX(_tk2, _tk2, -(e.gun || 0)); M4.translate(_tk2, _tk2, -gv[0], -gv[1], -gv[2]);
  drawPart(P.gun, _tk2);
  gl.uniform3f(u.uColor, 1, 1, 1);
  drawPart(P.tracks, base);
  for (const [part, ph] of [[P.treadL, e.trL || 0], [P.treadR, e.trR || 0]]) {
    _tk2.set(base);
    M4.translate(_tk2, _tk2, 0, 0, -(((ph % 3) + 3) % 3));
    drawPart(part, _tk2);
  }
}
