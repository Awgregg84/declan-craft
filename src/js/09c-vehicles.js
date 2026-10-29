/* ===================== Rails, minecarts and the car ===================== */
// Rail shapes (the block's data), as in Minecraft: 0 north-south, 1 east-west, 2-5 sloping up to the east,
// west, north and south, 6-9 curves joining south+east, south+west, north+west and north+east
// (north is -z, east is +x). Each shape lists its two ends; [dx, 1, dz] is the uphill end of a slope.
const RAIL_EXITS = [
  [[0, 0, -1], [0, 0, 1]], [[1, 0, 0], [-1, 0, 0]],
  [[1, 1, 0], [-1, 0, 0]], [[-1, 1, 0], [1, 0, 0]], [[0, 1, -1], [0, 0, 1]], [[0, 1, 1], [0, 0, -1]],
  [[0, 0, 1], [1, 0, 0]], [[0, 0, 1], [-1, 0, 0]], [[0, 0, -1], [-1, 0, 0]], [[0, 0, -1], [1, 0, 0]],
];
const HDIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const railExits = data => RAIL_EXITS[data] || RAIL_EXITS[0];
/* a rail at x, y, z, or one lower (the bottom of a slope going down) */
function railNear(w, x, y, z) {
  if (w.getBlock(x, y, z) === B.RAIL) return y;
  if (w.getBlock(x, y - 1, z) === B.RAIL) return y - 1;
  return null;
}
/* the ends of the rail at x, y, z that really join another rail: [dx, dz, up] each */
function railLinks(w, x, y, z) {
  const out = [];
  for (const [dx, dy, dz] of railExits(w.getData(x, y, z))) {
    const ny = railNear(w, x + dx, y + dy, z + dz);
    if (ny === null) continue;
    if (railExits(w.getData(x + dx, ny, z + dz)).some(e => e[0] === -dx && e[2] === -dz)) out.push([dx, dz, dy > 0]);
  }
  return out;
}
/* the shape joining two ends (or one end and straight on); an end is [dx, dz, up] */
function railShapeFor(a, b) {
  if (!b) return a[0] ? (a[2] ? (a[0] > 0 ? 2 : 3) : 1) : (a[2] ? (a[1] < 0 ? 4 : 5) : 0);
  if (a[0] && b[0]) { const up = a[2] ? a : b[2] ? b : null; return up ? (up[0] > 0 ? 2 : 3) : 1; }
  if (a[1] && b[1]) { const up = a[2] ? a : b[2] ? b : null; return up ? (up[1] < 0 ? 4 : 5) : 0; }
  const sx = a[0] || b[0], sz = a[1] || b[1];
  return sz > 0 ? (sx > 0 ? 6 : 7) : (sx < 0 ? 8 : 9);
}
/* a rail was just put down: shape it to join the rails around it, and bend them to meet it */
function shapeRail(w, x, y, z, yaw) {
  const cands = [];
  for (const [dx, dz] of HDIRS) {
    for (const dy of [0, 1, -1]) {
      const ny = y + dy;
      if (w.getBlock(x + dx, ny, z + dz) !== B.RAIL) continue;
      const here = railExits(w.getData(x + dx, ny, z + dz)).some(e => e[0] === -dx && e[2] === -dz);
      if (here || railLinks(w, x + dx, ny, z + dz).length < 2) cands.push({ dx, dz, dy, ny, here });
      break;
    }
  }
  cands.sort((p, q) => q.here - p.here);
  const A = cands[0], B2 = A ? (cands.find(c => c !== A && c.dx === -A.dx && c.dz === -A.dz) || cands.find(c => c !== A)) : null;
  const end = c => [c.dx, c.dz, c.dy === 1];
  const shape = A ? railShapeFor(end(A), B2 ? end(B2) : null) : (facingFromYaw(yaw) % 2 === 0 ? 0 : 1);
  w.setBlock(x, y, z, B.RAIL, shape, true);
  for (const c of [A, B2]) {
    if (!c || (c.here && c.dy !== -1)) continue;   // a lower rail always turns into a slope up to this one
    const nx = x + c.dx, nz = z + c.dz, toMe = [-c.dx, -c.dz, c.dy === -1];
    const other = railLinks(w, nx, c.ny, nz).filter(l => !(l[0] === -c.dx && l[1] === -c.dz))[0];
    w.setBlock(nx, c.ny, nz, B.RAIL, railShapeFor(toMe, other || null), true);
  }
}

/* ---- vehicles ---- */
// (code: its number when playing together; wheel: how far it goes for a turn of the wheels, the paddles or the propeller)
const VEHICLES = {
  minecart: { w: 0.45, h: 0.7, item: I.MINECART, hits: 3, code: -5, wheel: 0.1 },
  car: { w: 0.8, h: 1.0, item: I.CAR, hits: 4, code: -6, wheel: 0.19 },
  boat: { w: 0.6, h: 0.45, item: I.BOAT, hits: 2, code: -8, wheel: 0.6, wood: true },
  submarine: { w: 0.65, h: 1.3, item: I.SUBMARINE, hits: 4, code: -9, wheel: 0.3 },
  flycar: { w: 0.8, h: 1.0, item: I.FLYING_CAR, hits: 4, code: -10, wheel: 0.19 },   // (see 09j-flying.js)
  broom: { w: 0.35, h: 0.9, item: I.BROOM, hits: 2, code: -11, wheel: 1, wood: true },
  rocket: { w: 0.55, h: 4, item: I.ROCKET, hits: 5, code: -12, wheel: 1 },   // (see 09m-moon.js)
};
const VEHICLE_TYPES = Object.keys(VEHICLES);
const isVehicleType = t => typeof t === 'string' && Object.prototype.hasOwnProperty.call(VEHICLES, t);   // (not "constructor" and the like)
function spawnVehicle(game, type, x, y, z, yaw) {
  if (!isVehicleType(type)) return null;
  const e = new Entity(type, x, y, z), d = VEHICLES[type];
  e.vehicle = true; e.w = d.w; e.h = d.h; e.yaw = e.bodyYaw = yaw || 0; e.rider = null; e.hits = 0; e.wheel = 0; e.slope = 0;
  game.entities.push(e);
  return e;
}
/* where the rider sits, and how high their feet are */
function seatOf(v) {
  if (v.type === 'car' || v.type === 'flycar') { const b = 0.25; return [v.x + Math.sin(v.yaw) * b, v.y - 0.15, v.z + Math.cos(v.yaw) * b]; }
  if (v.type === 'broom') return [v.x, v.y + 0.05, v.z];
  if (v.type === 'rocket') return [v.x, v.y + 0.6, v.z];   // (inside, looking out of the window)
  if (v.type === 'boat') return [v.x, v.y - 0.64, v.z];
  if (v.type === 'submarine') return [v.x, v.y - 0.58, v.z];
  return [v.x, v.y - 0.37, v.z];
}
function updateVehicle(game, e, dt) {
  const w = game.world;
  if (e.hurt > 0) e.hurt -= dt;
  if (w.getBlock(Math.floor(e.x), Math.floor(e.y + 0.3), Math.floor(e.z)) === B.UNLOADED) return;   // wait for the ground to load
  if (e.rider && e.rider !== 'me' && !e.local) { e.age += dt; return; }   // a guest is driving it on their iPad
  if (e.rider === 'me' && game.player.riding !== e) e.rider = null;
  if (e.rider === 'me' && (game.paused || game.uiOpen || game.state !== 'playing')) { e.ctrlX = e.ctrlZ = 0; e.push = null; }   // the menu is open: let go of the wheel
  const steps = Math.max(1, Math.ceil(Math.hypot(e.vx, e.vy, e.vz) * dt / 0.3));
  const step = e.type === 'car' ? carStep : e.type === 'boat' ? boatStep : e.type === 'submarine' ? subStep : isFlyer(e) ? flyStep : e.type === 'rocket' ? rocketStep : cartStep;
  for (let i = 0; i < steps; i++) step(game, e, dt / steps);
  if (e.y < -40) { e.removed = true; return; }
  if (e.rider === 'me') sitRider(game.player, e);
  e.sndT = (e.sndT || 0) - dt;
  const sp = Math.hypot(e.vx, e.vz);
  if (e.sndT <= 0 && (e.type === 'boat' || e.type === 'submarine')) boatSounds(e, sp);
  else if (e.sndT <= 0 && isFlyer(e)) flySounds(e, sp);
  else if (e.sndT <= 0 && sp > 0.5) {
    if (e.type === 'car' && e.rider) { e.sndT = 0.16; sfx('carEngine', e.x, e.y, e.z, clamp(0.4 + sp / 12, 0.4, 1)); }
    else if (e.type === 'minecart' && e.onRail) { e.sndT = 0.32 - Math.min(0.2, sp * 0.02); sfx('minecartRoll', e.x, e.y, e.z, clamp(sp / 8, 0.25, 1)); }
  }
}
function sitRider(pl, v) {
  const [x, y, z] = seatOf(v);
  pl.x = x; pl.y = y; pl.z = z; pl.vx = v.vx; pl.vz = v.vz; pl.vy = 0; pl.fallDist = 0; pl.onGround = true;
  if (v.type === 'car' || v.type === 'boat') {   // the view turns with the car or boat
    const d = ((v.yaw - (v.lastYaw === undefined ? v.yaw : v.lastYaw) + Math.PI) % TAU + TAU) % TAU - Math.PI;
    pl.yaw += d;
    pl.bodyYaw = v.yaw;
  } else if (v.type === 'submarine' || isFlyer(v)) pl.bodyYaw = v.yaw;   // (a submarine, a flying car or a broom turns to where you look)
  else pl.bodyYaw = pl.yaw;
  v.lastYaw = v.yaw;
}
/* minecarts follow the rails: along straight bits, round corners, up and down slopes; they stop at a dead end */
function cartStep(game, e, dt) {
  const w = game.world, x = Math.floor(e.x), z = Math.floor(e.z), ry = railNear(w, x, Math.floor(e.y + 0.2), z);
  if (ry === null) {   // off the rails: an ordinary heavy box
    e.onRail = false;
    physicsStep(w, e, dt, 24);
    if (e.onGround) { const f = Math.pow(0.05, dt); e.vx *= f; e.vz *= f; }
    return;
  }
  const ex = railExits(w.getData(x, ry, z));
  const ax = x + 0.5 + ex[0][0] * 0.5, az = z + 0.5 + ex[0][2] * 0.5, ay = ry + (ex[0][1] > 0 ? 1 : 0);
  const bx = x + 0.5 + ex[1][0] * 0.5, bz = z + 0.5 + ex[1][2] * 0.5, by = ry + (ex[1][1] > 0 ? 1 : 0);
  const hl = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / hl, uz = (bz - az) / hl;
  // speed along the rail (toward end b); going round a corner keeps the speed
  const hs = Math.hypot(e.vx, e.vz), dot = e.vx * ux + e.vz * uz;
  let v = Math.abs(dot) > hs * 0.2 ? Math.sign(dot) * hs : dot;
  const slope = (by - ay) / hl;
  if (slope) v -= slope * 10 * dt;   // rolls downhill
  if (e.rider && e.push) { v += (e.push[0] * ux + e.push[1] * uz) * 6 * dt; }   // the rider pushes along
  v *= Math.pow(e.rider ? 0.85 : 0.45, dt);
  v = clamp(v, -8, 8);
  let t = (e.x - ax) * ux + (e.z - az) * uz + v * dt;
  if (t < 0 || t > hl) {   // reaching an end: on to the next rail, or stop here
    const end = t > hl ? ex[1] : ex[0], ny = railNear(w, x + end[0], ry + end[1], z + end[2]);
    if (ny === null) {
      t = t > hl ? hl - 0.01 : 0.01;
      if (Math.abs(v) > 3) sfx('break_metal', e.x, e.y, e.z, 0.5);
      v = 0;
    }
  }
  e.x = ax + ux * t; e.z = az + uz * t;
  e.y = lerp(ay, by, clamp(t / hl, 0, 1)) + 0.0625;
  e.vx = ux * v; e.vz = uz * v; e.vy = 0; e.onGround = true; e.onRail = true;
  e.slope = Math.atan(slope);
  if (Math.abs(v) > 0.05 || e.yaw === undefined) e.yaw = Math.atan2(-ux, -uz);
  e.wheel += v * dt / 0.1;
}
/* the car: the joystick drives (forward and back) and steers (left and right); it hops up one-block steps */
function carStep(game, e, dt) {
  const w = game.world, driven = !!e.rider;
  const throttle = driven ? e.ctrlZ || 0 : 0, steer = driven ? e.ctrlX || 0 : 0;
  let fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), v = e.vx * fx + e.vz * fz;
  if (throttle > 0.1) v += throttle * (v < 0 ? 16 : 8) * dt;
  else if (throttle < -0.1) v += throttle * (v > 0 ? 16 : 6) * dt;
  else v *= Math.pow(e.onGround ? 0.3 : 0.9, dt);
  v = clamp(v, -4, 11);
  if (e.inWater) v = clamp(v, -1.2, 2);
  e.yaw -= steer * clamp(Math.abs(v) / 3, 0, 1) * 2 * Math.sign(v || 1) * dt;
  fx = -Math.sin(e.yaw); fz = -Math.cos(e.yaw);
  e.vx = fx * v; e.vz = fz * v;
  const before = e.onGround, want = Math.abs(v) > 0.5 ? Math.sign(v) : Math.abs(throttle) > 0.1 ? Math.sign(throttle) : 0;
  physicsStep(w, e, dt, 24);
  if (e.collidedH && before && want && boxFree(w, e.x + fx * 0.35 * want, e.y + 1.05, e.z + fz * 0.35 * want, e.w, e.h)) {   // a one-block step: hop up it
    const sp = Math.max(Math.abs(v), 2.5) * want;
    e.vy = 7.2; e.vx = fx * sp; e.vz = fz * sp;
  }
  e.fallDist = 0;
  e.wheel += v * dt / 0.19;
  e.steer = lerp(e.steer || 0, steer * 0.45, Math.min(1, dt * 8));
  // driving into creatures knocks them flying
  if (Math.abs(v) > 3.5) {
    for (const m of game.entities) {
      if (!m.mob || m.dead || m.removed || (m.carHitT || 0) > e.age) continue;
      if (Math.abs(m.x - e.x) < e.w + m.w + 0.2 && Math.abs(m.z - e.z) < e.w + m.w + 0.2 && m.y < e.y + e.h && m.y + m.h > e.y) {
        m.carHitT = e.age + 0.6;
        hurtMob(game, m, Math.round(Math.abs(v) / 2), e.x, e.z, e.rider ? 'player' : 'car', e.rider && e.rider !== 'me' ? e.rider : undefined);
        if (!m.proxy) { m.vx += fx * v * 0.8; m.vz += fz * v * 0.8; m.vy = 6; }
      }
    }
  }
}
/* punching a vehicle: a few hits break it (one in Creative), and it drops back as an item in Survival */
function hitVehicle(game, e, mode, by) {
  if (e.removed || e.launchT > 0 || e.landing) return;   // (not a rocket on its way up or down)
  e.hits++; e.hurt = 0.3;
  const wood = VEHICLES[e.type].wood;
  sfx(wood ? 'dig_wood' : 'dig_metal', e.x, e.y + 0.4, e.z);
  if (mode === 'creative' || e.hits >= VEHICLES[e.type].hits) {
    e.removed = true;
    sfx(wood ? 'break_wood' : 'break_metal', e.x, e.y + 0.4, e.z);
    blockParticles(e.x - 0.5, e.y, e.z - 0.5, wood ? B.OAK_PLANKS : B.IRON_BLOCK, 10, true);
    if (mode === 'survival') {
      if (by && by !== 'me') MP.sendDrops(MP.remotes.get(by), [[VEHICLES[e.type].item, 1, 0]], e.x, e.y + 0.5, e.z);
      else dropItem(game, e.x, e.y + 0.5, e.z, VEHICLES[e.type].item, 1);
    }
  }
}
/* get in (tap) and out (sneak) */
function mountVehicle(game, v) {
  const pl = game.player;
  if (v.removed || pl.riding) return;
  if (v.rider) { toast('Someone is already in it.', 2); return; }
  if (MP.role === 'guest') { if (!v.askT || performance.now() - v.askT > 1500) { v.askT = performance.now(); MP.send({ t: 'mount', e: v.nid }); } return; }   // the host says yes or no
  boardVehicle(game, v);
}
function boardVehicle(game, v) {
  const pl = game.player;
  v.rider = 'me'; v.lastYaw = v.yaw;
  pl.riding = v; pl.sneakHeld = true; pl.flying = false; pl.drawT = pl.loadT = 0;
  if (v.type !== 'minecart') pl.yaw = v.yaw;
  sitRider(pl, v);
  sfx(v.type === 'car' ? 'carStart' : 'click', v.x, v.y, v.z);
  if (!game.tipped) game.tipped = {};
  if (!game.tipped[v.type]) { game.tipped[v.type] = 1; toast(RIDE_TIPS[v.type], 5); }
}
const RIDE_TIPS = {
  car: 'Drive with the joystick (or W A S D). Tap to honk! Press Sneak to get out.',
  minecart: 'Push forward to roll along the rails. Press Sneak to get out.',
  boat: 'Row with the joystick (or W A S D): forward to go, left and right to turn. Press Sneak to get out.',
  submarine: 'Push forward to go where you look: up, down, anywhere! You can breathe in here. Tap for a sonar ping. Press Sneak to get out.',
  flycar: 'Drive with the joystick. Press Jump to fly! In the air it goes where you look: Jump goes up, Sneak goes down. Land, then Sneak to get out.',
  broom: 'Push forward to fly where you look! Jump goes up, Sneak goes down. Land, then Sneak to get off.',
  rocket: 'Tap to blast off! Everyone comes along. Press Sneak to get out.',
};
/* host: where a guest's vehicle has got to */
function applyVehState(v, s) {
  const sp = clamp(s[5], -12, 12);
  v.x = s[0]; v.y = s[1]; v.z = s[2]; v.yaw = s[3] % TAU; v.slope = clamp(s[4], -1, 1);
  if (isFlyer(v)) v.flying = s[6] === 1;
  v.vx = -Math.sin(v.yaw) * sp; v.vz = -Math.cos(v.yaw) * sp;
  v.wheel += sp * 0.1 / VEHICLES[v.type].wheel;
}
function dismountVehicle(game) {
  const pl = game.player, v = pl.riding;
  if (!v) return;
  pl.riding = null;
  if (MP.role === 'guest') { if (v.local) { MP.send({ t: 'dismount', e: v.nid, s: vehicleState(v) }); v.local = false; v.tx = v.x; v.ty = v.y; v.tz = v.z; } }
  else if (v.rider === 'me') v.rider = null;
  v.ctrlX = v.ctrlZ = 0; v.push = null;
  [pl.x, pl.y, pl.z] = dismountSpot(game.world, v);
  pl.vx = pl.vz = pl.vy = 0; pl.fallDist = 0;
}
/* where you step out: beside it to the left, the right, behind or in front, or else on top */
function dismountSpot(w, v) {
  const spots = [[Math.cos(v.yaw), -Math.sin(v.yaw)], [-Math.cos(v.yaw), Math.sin(v.yaw)], [Math.sin(v.yaw), Math.cos(v.yaw)], [-Math.sin(v.yaw), -Math.cos(v.yaw)]];
  const d = v.w + 0.6, wet = v.type === 'boat' || v.type === 'submarine';
  for (const water of wet ? [false, true] : [false]) for (const [ox, oz] of spots) for (const oy of [0, 1, -1]) {   // (out of a boat: dry land if it's there, else into the water)
    const x = v.x + ox * d, z = v.z + oz * d, y = Math.floor(v.y + 0.2) + oy, below = w.getBlock(Math.floor(x), y - 1, Math.floor(z));
    if (boxFree(w, x, y, z, 0.3, 1.8) && (SOLID[below] || (water && below === B.WATER))) return [x, y, z];
  }
  return [v.x, v.y + v.h + 0.05, v.z];
}
/* where a player is kept in a save: someone sitting in a car or minecart is saved standing beside it */
const restPos = pl => {
  const v = pl.riding, w = game.world;
  if (!v || v.removed) return [pl.x, pl.y, pl.z];
  if (!aloft(w, v)) return dismountSpot(w, v);
  const gy = groundUnder(w, v.x, v.y, v.z);   // (flying: down on the ground below, or over nothing at all, back at the spawn point)
  return gy < 0 ? game.spawnPos() : dismountSpot(w, { x: v.x, y: gy, z: v.z, yaw: v.yaw, w: v.w, h: v.h, type: v.type });
};
const vehicleState = v => [r2(v.x), r2(v.y), r2(v.z), r2(v.yaw), r2(v.slope || 0), r2(Math.hypot(v.vx, v.vz) * (v.vx * -Math.sin(v.yaw) + v.vz * -Math.cos(v.yaw) < 0 ? -1 : 1)), v.flying ? 1 : 0];
/* what the rider does each frame (before the vehicle moves) */
function rideControls(game, pl, fx, fz, inp, dt) {
  const v = pl.riding;
  if (!v || v.removed || (MP.role === 'guest' && !v.local)) {
    if (v && v.removed && v.local && MP.role === 'guest') MP.send({ t: 'dismount', e: v.nid });   // it fell out of the world here: free it on the host
    if (v) {   // (it's gone from under you: step out beside where it was, not into the ground)
      pl.riding = null;
      if (v.y > -20) { [pl.x, pl.y, pl.z] = dismountSpot(game.world, v); pl.vx = pl.vy = pl.vz = 0; pl.fallDist = 0; }
    }
    return;
  }
  if (isFlyer(v)) { flyControls(game, pl, v, fx, fz, inp); return; }
  if (v.type === 'rocket') {   // nothing to steer; you can get out unless it is taking off or landing
    if (inp.sneak && !pl.sneakHeld && !(v.launchT > 0) && !v.landing) { pl.sneakHeld = true; dismountVehicle(game); return; }
    pl.sneakHeld = !!inp.sneak;
    return;
  }
  if (inp.sneak && !pl.sneakHeld) { pl.sneakHeld = true; dismountVehicle(game); return; }
  pl.sneakHeld = !!inp.sneak;
  if (v.type !== 'minecart') { v.ctrlX = fx; v.ctrlZ = fz; }
  else { const s = Math.sin(pl.yaw), c = Math.cos(pl.yaw); v.push = [(-s * fz + c * fx), (-c * fz - s * fx)]; }
}
/* save and load the vehicles left in a world */
function saveVehicles(game) {
  const w = game.world, at = e => { const gy = aloft(w, e) ? groundUnder(w, e.x, e.y, e.z) : -1; return gy >= 0 ? gy : e.y; };   // (one up in the air is kept on the ground below it)
  return game.entities.filter(e => e.vehicle && !e.removed && !e.proxy).map(e => ({ k: e.type, x: r2(e.x), y: r2(at(e)), z: r2(e.z), yaw: r2(e.yaw) }));
}
function loadVehicles(game, list) {
  if (!Array.isArray(list)) return;
  for (const v of list.slice(0, 200)) if (v && isVehicleType(v.k) && [v.x, v.y, v.z].every(n => typeof n === 'number' && isFinite(n))) spawnVehicle(game, v.k, v.x, v.y, v.z, +v.yaw || 0);
}

/* ---- drawing ---- */
function drawVehicle(game, e, dx, dy, dz, s) {
  const P = PROG.entity, model = MODELS[e.type], b = brightAt(game.world, e.x, e.y + 0.5, e.z, s);
  const bright = e.type === 'submarine' && e.rider ? Math.max(b, 0.9) : b;   // (a submarine with someone in it has its lamps on)
  gl.uniform1f(P.u.uBright, bright);
  gl.uniform4fv(P.u.uTint, e.hurt > 0 ? [0.8, 0.1, 0.1, 0.35] : [0, 0, 0, 0]);
  M4.identity(_eb);
  M4.translate(_eb, _eb, dx, dy, dz);
  M4.rotY(_eb, _eb, e.yaw + Math.PI);
  if (e.slope) M4.rotX(_eb, _eb, -e.slope);
  if (e.bank) M4.rotZ(_eb, _eb, e.bank);
  if (e.hurt > 0) M4.rotZ(_eb, _eb, Math.sin(e.hurt * 40) * 0.08);
  M4.scale(_eb, _eb, model.scale, model.scale, model.scale);
  const wr = e.wheel || 0, st = e.steer || 0;
  if (isFlyer(e)) e.wing = clamp((e.wing || 0) + ((e.flying ? 1 : 0) - (e.wing || 0)) * 0.12, 0, 1);   // (the flying car's wings fold out in the air)
  const fold = (1 - (e.wing || 0)) * 1.35;   // (folded down along its sides)
  drawModel(model, _eb, e.type === 'car' ? { wfl: [wr, st, 0], wfr: [wr, st, 0], wbl: [wr, 0, 0], wbr: [wr, 0, 0] }
    : e.type === 'flycar' ? { wfl: [wr, 0, 0], wfr: [wr, 0, 0], wbl: [wr, 0, 0], wbr: [wr, 0, 0], lwing: [0, 0, -fold], rwing: [0, 0, fold] }
    : e.type === 'minecart' || e.type === 'broom' || e.type === 'rocket' ? null : boatPose(e));
  if (e.type === 'submarine') drawSubGlass(_eb, bright);
}
