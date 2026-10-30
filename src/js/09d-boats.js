/* ===================== Boats and submarines ===================== */
// A boat floats on the water: push the joystick (or W) to row along, left and right turn it, and the view turns
// with it. On land a boat only shuffles along. A submarine goes where you look when you push forward (up, down,
// anywhere), and left and right turn it. Inside a submarine you never run out of air, its lamps light up the
// water, and a tap sends out a sonar ping. Sneak gets out of either.
const RIDE_KIND = { car: 'car', minecart: 'cart', boat: 'boat', submarine: 'sub', flycar: 'car', broom: 'broom', rocket: 'rocket', plane: 'car', jet: 'car', airliner: 'car' };
const rideKind = v => v ? (typeof v === 'string' ? v : RIDE_KIND[v.type] || 'cart') : null;
const inSubmarine = pl => !!(pl.riding && pl.riding.type === 'submarine');

/* the surface of the water in this column, if the water comes up to about height y (else null) */
function waterTopAt(w, x, y, z) {
  const bx = Math.floor(x), bz = Math.floor(z);
  let by = Math.floor(y);
  if (w.getBlock(bx, by, bz) !== B.WATER) { by--; if (w.getBlock(bx, by, bz) !== B.WATER) return null; }
  for (let k = 0; k < 64 && by < WH - 1 && w.getBlock(bx, by + 1, bz) === B.WATER; k++) by++;
  return by + 0.875;
}
/* where a boat or submarine goes on the water a player is pointing at (within reach): [x, y, z]. Deep under the
   surface (a player swimming down there), a submarine goes right where they point, but a boat can't go at all */
function waterSpot(pl, type) {
  const [ox, oy, oz] = pl.eyePos(), [dx, dy, dz] = pl.lookDir(), w = game.world;
  for (let t = 0.5; t < 5.5; t += 0.1) {
    const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t, bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z), b = w.getBlock(bx, by, bz);
    if (b === B.WATER) {
      const top = waterTopAt(w, x, y, z);
      if (top === null) return null;
      if (top - y < 2.5) return [bx + 0.5, floatY(type, top), bz + 0.5];
      if (type !== 'submarine') return null;
      if (t >= 1.8 && w.getBlock(bx, by + 1, bz) === B.WATER) return [bx + 0.5, by + 0.05, bz + 0.5];   // (a little way off, clear of the player)
      continue;
    }
    if (SOLID[b] || b === B.UNLOADED) return null;
  }
  return null;
}
/* where a boat floats (on top of the water, so none gets in), or a submarine sits (its hull just under the surface) */
const floatY = (type, top) => type === 'boat' ? top + 0.03 : top - 0.45;

function boatStep(game, e, dt) {
  const w = game.world, driven = !!e.rider, thr = driven ? e.ctrlZ || 0 : 0, steer = driven ? e.ctrlX || 0 : 0;
  const top = waterTopAt(w, e.x, e.y + 0.25, e.z);
  e.afloat = top !== null;
  let fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), v = e.vx * fx + e.vz * fz;
  if (thr > 0.1) v += thr * 5 * dt;
  else if (thr < -0.1) v += thr * 4 * dt;
  else v *= Math.pow(e.afloat ? 0.2 : 0.01, dt);
  v = e.afloat ? clamp(v, -2, 6) : clamp(v, -0.6, 1);   // (on land it only shuffles)
  e.yaw -= steer * (e.afloat ? 1.8 : 0.9) * dt;   // a boat can turn on the spot
  fx = -Math.sin(e.yaw); fz = -Math.cos(e.yaw);
  e.vx = fx * v; e.vz = fz * v;
  if (e.afloat) {   // floating, bobbing a little
    const want = floatY('boat', top) + Math.sin(e.age * 2.1) * 0.02;
    e.vy = clamp((want - e.y) * 6, -3, 3);
    moveEntity(w, e, e.vx * dt, e.vy * dt, e.vz * dt);
    e.onGround = false;
  } else physicsStep(w, e, dt, 24);
  e.fallDist = 0; e.slope = 0;
  if (driven) e.wheel += (Math.abs(v) * 1.6 + Math.abs(steer) * 3) * dt;   // the paddles go round
}
function subStep(game, e, dt) {
  const w = game.world, pl = game.player, me = e.rider === 'me', thr = me ? e.ctrlZ || 0 : 0, steer = me ? e.ctrlX || 0 : 0;
  const top = waterTopAt(w, e.x, e.y + 0.45, e.z);   // (the surface above it, or just below it)
  e.afloat = top !== null;
  if (me) {   // it heads where its driver looks; left and right turn the view, and so the submarine
    pl.yaw -= steer * 1.6 * dt;
    e.yaw = approachAngle(e.yaw, pl.yaw, dt * 2.5);
  }
  if (!e.afloat) {   // stranded on land
    const f = Math.pow(0.01, dt); e.vx *= f; e.vz *= f;
    physicsStep(w, e, dt, 24);
    e.slope = lerp(e.slope || 0, 0, Math.min(1, dt * 3)); e.fallDist = 0;
    return;
  }
  const pitch = me ? clamp(pl.pitch, -1.3, 1.3) : 0, cp = Math.cos(pitch);
  const sp = thr > 0.1 ? thr * 5 : thr < -0.1 ? thr * 2 : 0, k = Math.min(1, dt * 1.5);
  e.vx += (-Math.sin(e.yaw) * cp * sp - e.vx) * k; e.vz += (-Math.cos(e.yaw) * cp * sp - e.vz) * k;
  e.vy += (Math.sin(pitch) * sp - e.vy) * k;
  e.vy = Math.min(e.vy, (floatY('submarine', top) - e.y) * 4);   // it slows as it reaches the top, and can't climb out of the water
  moveEntity(w, e, e.vx * dt, e.vy * dt, e.vz * dt);
  e.onGround = false; e.fallDist = 0;
  e.slope = lerp(e.slope || 0, sp ? clamp(pitch * Math.sign(sp), -0.6, 0.6) : 0, Math.min(1, dt * 3));   // nose up or down
  e.wheel += (Math.hypot(e.vx, e.vy, e.vz) * 3 + (me ? 1.5 : 0)) * dt;   // the propeller
}
/* the sounds: paddles splashing, the motor humming */
function boatSounds(e, sp) {
  if (e.type === 'boat' && e.rider && e.afloat && (sp > 0.4 || Math.abs(e.ctrlX || 0) > 0.3)) { e.sndT = 0.65; sfx('paddle', e.x, e.y, e.z, clamp(0.4 + sp / 8, 0.4, 1)); }
  else if (e.type === 'submarine' && e.rider && e.afloat) { e.sndT = 0.45; sfx('subHum', e.x, e.y, e.z, clamp(0.35 + sp / 6, 0.35, 1)); }
}
/* tap in a submarine: a sonar ping, and a ring of bubbles */
function sonarPing(game, pl) {
  sfx('sonar', pl.x, pl.y + 1, pl.z);
  if (game.net) MP.localFx('sfx', pl.x, pl.y + 1, pl.z, SFX_NET.indexOf('sonar'));
  for (let i = 0; i < 16 && PARTICLES.length < 1550; i++) {
    const a = i / 16 * TAU;
    PARTICLES.push({ x: pl.x, y: pl.y + 0.8, z: pl.z, vx: Math.cos(a) * 3, vy: randRange(-0.3, 0.6), vz: Math.sin(a) * 3, life: 0.8, tile: TILE.bubble_p, u: 0, v: 0, us: 16, size: 0.07, grav: -1, bright: 1 });
  }
}
/* put a boat or a submarine down: on the water you are pointing at (first), or on top of a block */
function placeBoat(game, pl, type, at, creative) {
  const d = VEHICLES[type];
  if (!boxFree(game.world, at[0], at[1], at[2], d.w, Math.min(d.h, 1))) return false;
  if (MP.role === 'guest') MP.send({ t: 'veh+', k: type, at: at.map(r2), yaw: r2(pl.yaw) });
  else spawnVehicle(game, type, at[0], at[1], at[2], pl.yaw);
  sfx(type === 'boat' ? 'place_wood' : 'place_metal', at[0], at[1], at[2]); sfx('splash', at[0], at[1], at[2], 0.4);
  pl.swing();
  if (!creative) pl.consumeHeld(1);
  return true;
}

/* ---- drawing ---- */
/* the paddles of a boat (rowing as it goes), and a submarine's propeller */
function boatPose(e) {
  const p = e.wheel || 0, sw = Math.sin(p) * 0.55, dip = 0.4 + Math.cos(p) * 0.18;
  return e.type === 'boat' ? { pl: [0, sw, dip], pr: [0, -sw, -dip] } : { prop: [0, 0, p * 2] };
}
/* a submarine's glass dome is see-through, so it is drawn last of all, after the water (drawQueuedGlass), with
   whatever is behind it showing through */
const SUB_GLASS = [];
function drawSubGlass(m, bright) { SUB_GLASS.push({ m: Float32Array.from(m), bright }); }
function drawQueuedGlass() {
  if (!SUB_GLASS.length) return;
  const P = PROG.entity;
  entityBegin(texSkins);
  gl.enable(gl.CULL_FACE);
  for (const g of SUB_GLASS) { gl.uniform1f(P.u.uBright, g.bright); drawModel(MODELS.sub_glass, g.m, null); }
  gl.disable(gl.CULL_FACE);
  SUB_GLASS.length = 0;
}
