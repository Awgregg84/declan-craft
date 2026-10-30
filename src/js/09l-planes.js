/* ===================== Planes: a propeller plane, a jet and a passenger plane ===================== */
// A plane drives along the ground on its wheels: push the joystick forward for the engine, back to brake, left and
// right to steer. Once it is going fast enough, look up (or press Jump) and it takes off. In the air it flies where
// you look, and left and right bank it round into a turn; Jump pulls up and Sneak dives. Planes can't hover: let go
// of the joystick and the engine slows down, and when a plane is too slow its nose drops and it glides down. To land,
// come in low and slow, touch down, and pull back to stop; then Sneak gets out.
// The propeller plane has a seat for a friend behind the pilot, and the passenger plane has five. A friend in the air
// who presses Sneak jumps out with a parachute.
const PLANES = {
  // speed: top speed in the air; takeoff: fast enough to lift off; stall: slower than this it can't stay up;
  // seats: [right, up, back] from the middle, in blocks (the pilot's first)
  plane: { speed: 20, takeoff: 8, stall: 6, turn: 1.4, follow: 2.4, sound: 'planeProp', sndT: 0.2, seats: [[0, 0.35, -0.35], [0, 0.35, 0.65]] },
  jet: { speed: 32, takeoff: 13, stall: 10, turn: 1.15, follow: 2.2, sound: 'planeJet', sndT: 0.3, seats: [[0, 0.3, -0.9]] },
  airliner: { speed: 25, takeoff: 11, stall: 8, turn: 0.7, follow: 1.3, sound: 'planeHum', sndT: 0.3,
    seats: [[0, 0.75, -4.6], [-0.6, 0.75, -2], [0.6, 0.75, -2], [-0.6, 0.75, 0], [0.6, 0.75, 0], [0, 0.75, 2]] },
};
const isPlane = v => !!(v && PLANES[v.type]);
/* where a seat is, in the world (feet) */
function planeSeat(v, k) {
  const s = PLANES[v.type].seats[k] || PLANES[v.type].seats[0], c = Math.cos(v.yaw), sn = Math.sin(v.yaw), up = Math.sin(v.slope || 0) * -s[2];
  return [v.x + c * s[0] + sn * s[2], v.y + s[1] + up, v.z - sn * s[0] + c * s[2]];
}
/* the first free passenger seat (1, 2 ...), or 0 */
function freeSeat(v) {
  if (!isPlane(v)) return 0;
  const n = PLANES[v.type].seats.length;
  if (!v.pass) v.pass = [];
  for (let k = 1; k < n; k++) if (!v.pass[k]) return k;
  return 0;
}

function planeStep(game, e, dt) {
  if (!game.tipped) game.tipped = {};
  const w = game.world, pl = game.player, F = PLANES[e.type], me = e.rider === 'me';
  const stick = me ? e.ctrlZ || 0 : 0, steer = me ? e.ctrlX || 0 : 0, up = me && !!e.up, down = me && !!e.down;
  e.thr = lerp(e.thr || 0, Math.max(0, stick), Math.min(1, dt * 2));   // the engine winds up and down
  let spd = e.spd || 0;
  const y0 = e.yaw;
  if (me) {   // it heads where its pilot looks; left and right turn the view, and so the plane (slowly on the ground)
    pl.yaw -= steer * F.turn * dt * (e.flying ? 1 : clamp(spd / 3, 0.4, 1));
    e.yaw = approachAngle(e.yaw, pl.yaw, dt * F.follow);
  }
  const turned = ((e.yaw - y0 + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
  if (!e.flying) {   // on its wheels
    if (stick > 0.1) spd += stick * F.speed * 0.28 * dt;
    else spd -= (stick < -0.3 ? 9 : 1.5) * dt;   // (pull back to brake)
    spd = clamp(spd, 0, F.speed * 0.75);
    e.vx = fx * spd; e.vz = fz * spd;
    const wet = w.getBlock(Math.floor(e.x), Math.floor(e.y + 0.2), Math.floor(e.z)) === B.WATER;
    physicsStep(w, e, dt, 24);
    if (wet) { e.vy = Math.max(e.vy, 2.5); spd *= Math.pow(0.6, dt); }   // (it floats)
    if (e.collidedH) {
      if (e.onGround && spd > 0.5 && boxFree(w, e.x + fx * 0.4, e.y + 1.05, e.z + fz * 0.4, e.w, e.h)) e.vy = 7.2;   // a one-block step: hop up it
      else { if (spd > 5) sfx('planeBump', e.x, e.y + 0.5, e.z); spd = Math.min(spd, 1); }
    }
    e.fallDist = 0;
    e.slope = lerp(e.slope || 0, 0, Math.min(1, dt * 4));
    e.bank = lerp(e.bank || 0, 0, Math.min(1, dt * 4));
    const pitch = me ? pl.pitch : 0;
    if (me && spd >= F.takeoff && (up || pitch > 0.12)) {   // take off!
      e.flying = true; e.vy = 2; e.pa = 0.15;
      sfx('planeTakeoff', e.x, e.y, e.z);
      if (game.net) MP.localFx('sfx', e.x, e.y, e.z, SFX_NET.indexOf('planeTakeoff'));
    } else if (me && spd >= F.takeoff * 0.9 && !game.tipped.planeUp) { game.tipped.planeUp = 1; toast('Fast enough! Look up (or press Jump) to take off!', 4); }
  } else {   // flying
    let want = me ? clamp(pl.pitch, -0.7, 0.7) + (up ? 0.45 : 0) - (down ? 0.45 : 0) : -0.12;
    if (spd < F.stall) want = Math.min(want, -0.35);   // too slow: the nose drops
    e.pa = (e.pa || 0) + clamp(clamp(want, -0.9, 0.8) - (e.pa || 0), -dt * 1.4, dt * 1.4);
    spd += (e.thr * F.speed - spd) * dt * 0.5 - Math.sin(e.pa) * 5 * dt;   // the engine pulls; climbing slows it, diving speeds it up
    if (stick < -0.3) spd -= 4 * dt;
    spd = clamp(spd, 0, F.speed * 1.3);
    let vy = Math.sin(e.pa) * spd - (spd < F.stall ? (F.stall - spd) * 0.7 : 0);
    if (e.y > WH + 60) vy = Math.min(vy, 0);   // (high enough)
    const hs = Math.cos(e.pa) * spd;
    e.vx = fx * hs; e.vz = fz * hs; e.vy = vy;
    moveEntity(w, e, e.vx * dt, e.vy * dt, e.vz * dt);
    if (e.collidedH) { if (spd > 5 && !(e.bumpT > e.age)) { e.bumpT = e.age + 0.5; sfx('planeBump', e.x, e.y + 0.5, e.z); } spd *= Math.pow(0.02, dt); }
    const splash = w.getBlock(Math.floor(e.x), Math.floor(e.y + 0.2), Math.floor(e.z)) === B.WATER;
    if (splash) { sfx('splash', e.x, e.y, e.z); splashBits(e.x, e.y + 0.3, e.z, 16); e.vy = 0; spd *= 0.5; }   // down on the water: it floats
    if (e.onGround || splash) {   // touched down
      e.flying = false; e.pa = 0;
      if (splash) { /* (a splash, not a bump) */ }
      else if (vy < -7) { sfx('planeBump', e.x, e.y, e.z); e.vy = 3; spd *= 0.6; }
      else sfx('planeLand', e.x, e.y, e.z);
      if (me && !game.tipped.planeLand) { game.tipped.planeLand = 1; toast('You landed! Pull back to stop, then Sneak to get out.', 4); }
    }
    e.onGround = false; e.fallDist = 0;
    e.slope = e.pa;
    e.bank = lerp(e.bank || 0, clamp(-turned / Math.max(dt, 1e-3) * 0.45, -0.75, 0.75), Math.min(1, dt * 3));
    if (e.type === 'jet' && e.thr > 0.4 && Math.random() < dt * 30 && PARTICLES.length < 1500) {   // flames from the engine
      const bx = e.x - fx * 2.9, bz = e.z - fz * 2.9;
      PARTICLES.push({ x: bx, y: e.y + 0.85 + Math.sin(e.pa) * -2.9, z: bz, vx: -fx * 3, vy: randRange(-0.2, 0.2), vz: -fz * 3, life: randRange(0.12, 0.25), tile: TILE.flame, u: 0, v: 0, us: 16, size: randRange(0.14, 0.22), grav: 0, bright: 1 });
    }
  }
  e.spd = spd;
  e.prop = (e.prop || 0) + dt * (4 + e.thr * 40 + spd * 0.6);   // (the propeller turns)
  e.wheel += (e.flying ? 0 : spd) * dt / VEHICLES[e.type].wheel;
}
/* the engine's sound, over and over while someone is flying it (or it is rolling along) */
function planeSounds(e) {
  const F = PLANES[e.type], sp = e.spd !== undefined ? e.spd : Math.abs(e.speed || 0);
  if (!e.rider || (!e.flying && sp < 0.3 && !(e.thr > 0.05))) return;
  e.sndT = F.sndT;
  sfx(F.sound, e.x, e.y + 1, e.z, clamp(0.4 + (e.thr !== undefined ? e.thr * 0.4 : 0.3) + sp / F.speed * 0.3, 0.35, 1));
}
/* the pilot's controls: Sneak dives in the air, and gets out once the plane has stopped */
function planeControls(game, pl, v, fx, fz, inp) {
  v.up = !!inp.jump; v.down = !!inp.sneak && !!v.flying;
  if (inp.sneak && !pl.sneakHeld && !v.flying) {
    pl.sneakHeld = true;
    if ((v.spd || 0) > 2) { toast('Slow down first: pull the joystick back to brake.', 2.5); return; }
    dismountVehicle(game); return;
  }
  pl.sneakHeld = !!inp.sneak;
  v.ctrlX = fx; v.ctrlZ = fz;
}

/* ---- passengers ---- */
/* a passenger sits in their seat (each frame, wherever the plane has got to) */
function sitPassenger(pl, v) {
  const [x, y, z] = planeSeat(v, pl.seat);
  pl.x = x; pl.y = y; pl.z = z; pl.vx = v.vx || 0; pl.vz = v.vz || 0; pl.vy = 0; pl.fallDist = 0; pl.onGround = true;
  pl.bodyYaw = v.yaw;
}
/* a passenger can only look around; Sneak gets out (in the air: out of the door with a parachute) */
function passengerControls(game, pl, v, inp) {
  if (!v || v.removed) { leaveSeat(game, pl, v); return; }
  if (inp.sneak && !pl.sneakHeld) { pl.sneakHeld = true; leaveSeat(game, pl, v); return; }
  pl.sneakHeld = !!inp.sneak;
}
function leaveSeat(game, pl, v) {
  const k = pl.seat;
  pl.riding = null; pl.seat = 0;
  if (!v) return;
  if (v.pass && v.pass[k] === 'me') v.pass[k] = null;
  if (MP.role === 'guest') MP.send({ t: 'dismount', e: v.nid });
  const w = game.world, high = v.removed || aloft(w, v) || (v.flying && w.getBlock(Math.floor(v.x), Math.floor(v.y) - 2, Math.floor(v.z)) === B.AIR);
  if (high && !v.removed) {   // jump out, and the parachute opens
    const c = Math.cos(v.yaw), s = Math.sin(v.yaw), side = PLANES[v.type].seats[k] && PLANES[v.type].seats[k][0] < 0 ? -1 : 1, d = v.w + 0.8;
    pl.x = v.x + c * side * d; pl.z = v.z - s * side * d; pl.y = v.y;
    pl.vx = (v.vx || 0) * 0.3; pl.vz = (v.vz || 0) * 0.3; pl.vy = 0; pl.fallDist = 0; pl.onGround = false;
    openChute(pl);
    return;
  }
  [pl.x, pl.y, pl.z] = dismountSpot(w, v);
  pl.vx = pl.vz = pl.vy = 0; pl.fallDist = 0;
}
/* get into a plane someone else is flying (or that is full up front) */
function boardSeat(game, v, k) {
  const pl = game.player;
  if (!v.pass) v.pass = [];
  v.pass[k] = 'me';
  pl.riding = v; pl.seat = k; pl.sneakHeld = true; pl.flying = false; pl.drawT = pl.loadT = 0;
  pl.yaw = v.yaw;
  sitPassenger(pl, v);
  sfx('click', v.x, v.y, v.z);
  if (!game.tipped) game.tipped = {};
  if (!game.tipped.passenger) { game.tipped.passenger = 1; toast("You're a passenger! Look around and enjoy the flight. Press Sneak to get out (up in the air you jump out with a parachute!).", 6); }
}

/* ---- parachutes ---- */
function openChute(pl) {
  pl.chute = true; pl.flying = false;
  sfx('chuteOpen', pl.x, pl.y + 2, pl.z);
  if (game.net) MP.localFx('sfx', pl.x, pl.y + 2, pl.z, SFX_NET.indexOf('chuteOpen'));
}
/* floating down: slow, and no bump at the bottom; it folds away on the ground or in water */
function chuteStep(pl) {
  if (!pl.chute) return;
  if (pl.onGround || pl.inWater || pl.inLava || pl.riding || pl.flying || !pl.alive) { pl.chute = false; return; }
  pl.vy = Math.max(pl.vy, -3); pl.fallDist = 0;
}
function drawChute(x, y, z, yaw, s, cam) {
  const P = PROG.entity, model = MODELS.parachute;
  gl.uniform1f(P.u.uBright, brightAt(game.world, x, y + 3, z, s));
  gl.uniform4fv(P.u.uTint, [0, 0, 0, 0]);
  M4.identity(_eb);
  M4.translate(_eb, _eb, x - cam.x, y - cam.y, z - cam.z);
  M4.rotY(_eb, _eb, yaw + Math.PI);
  M4.scale(_eb, _eb, model.scale, model.scale, model.scale);
  drawModel(model, _eb, null);
}
