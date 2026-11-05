/* ===================== Trains and stations (the sixth wish list) ===================== */
// A train is a big engine with two open carriages behind it. It goes on the same rails as minecarts: put it on a rail
// and tap it to get in the cab. Push forward to set off (it keeps going by itself), pull back to stop, and pull back
// again to back up; a tap sounds the horn. Friends tap the train to sit in the carriages. A Train Station goes beside
// the track: it builds a little platform with a sign showing the station's name, and a train stops there for a few
// seconds, rings its bell, and goes on. The carriages follow the engine round the track (each copy of the game works
// out where from the path the engine has taken), and the whole train is kept with the world.
const TRAIN_CARS = [4.65, 9.05];   // how far behind the engine's middle each carriage's middle is
const TRAIN_SEATS = [[0, 0.62, 1.3, 0], [0, 0.55, -0.9, 1], [0, 0.55, 0.9, 1], [0, 0.55, -0.9, 2], [0, 0.55, 0.9, 2]];   // [right, up, back, which car (0: the engine's cab)]
const TRAIN_SPEED = 6, STATION_WAIT = 4;
const STATION_NAMES = ['Declan Junction', 'Cora Central', 'Maple Stop', 'Pine Halt', 'Lakeside', 'Hilltop', 'Creeper Corner', 'Sunny Valley', 'Diamond Mine', 'Pumpkin Patch', 'Castle Gate', 'Rocket Park'];
defItem(I.TRAIN, 'Train', { tex: 'train', stack: 1 });
defBlock(B.STATION, 'Train Station', { tex: { top: 'station_top', bottom: 'stone_bricks', side: 'station_side' }, hardness: 1.5, tool: 'pickaxe', tier: 1 });

/* ---- the carriages follow the engine's path ---- */
function trainTrail(e) {
  if (!e.trail) e.trail = [];
  const t = e.trail;
  if (!t.length || Math.hypot(e.x - t[t.length - 1][0], e.z - t[t.length - 1][2]) > 6) { e.trail = [[e.x, e.y, e.z]]; return; }   // (new, or it jumped)
  while (t.length >= 2) {   // backing up over its own track: drop what it has backed past
    const a = t[t.length - 1], b = t[t.length - 2];
    if (Math.hypot(e.x - b[0], e.z - b[2]) < Math.hypot(a[0] - b[0], a[2] - b[2]) - 0.02) t.pop(); else break;
  }
  const l = t[t.length - 1];
  if (Math.hypot(e.x - l[0], e.z - l[2]) >= 0.3) { t.push([e.x, e.y, e.z]); if (t.length > 64) t.shift(); }
}
/* the point d blocks back along the path (straight on behind, past the end of what it remembers) */
function trainAlong(e, d) {
  const t = e.trail || [];
  let px = e.x, py = e.y, pz = e.z, acc = 0;
  for (let i = t.length - 1; i >= 0; i--) {
    const q = t[i], seg = Math.hypot(q[0] - px, q[2] - pz);
    if (seg < 1e-6) continue;
    if (acc + seg >= d) { const f = (d - acc) / seg; return [px + (q[0] - px) * f, py + (q[1] - py) * f, pz + (q[2] - pz) * f]; }
    acc += seg; px = q[0]; py = q[1]; pz = q[2];
  }
  let bx = Math.sin(e.yaw), bz = Math.cos(e.yaw);
  if (t.length >= 2) { const a = t[0], b = t[1], l = Math.hypot(a[0] - b[0], a[2] - b[2]); if (l > 1e-6) { bx = (a[0] - b[0]) / l; bz = (a[2] - b[2]) / l; } }
  return [px + bx * (d - acc), py, pz + bz * (d - acc)];
}
/* where carriage k (1, 2) is, and which way it faces */
function carPose(e, k) {
  const d = TRAIN_CARS[k - 1], c = trainAlong(e, d), f = trainAlong(e, d - 1.2), b = trainAlong(e, d + 1.2);
  return { x: c[0], y: c[1], z: c[2], yaw: Math.atan2(-(f[0] - b[0]), -(f[2] - b[2])) };
}
function trainSeat(v, k) {
  const s = TRAIN_SEATS[k] || TRAIN_SEATS[0], p = s[3] ? carPose(v, s[3]) : v, c = Math.cos(p.yaw), sn = Math.sin(p.yaw);
  return [p.x + c * s[0] + sn * s[2], p.y + s[1], p.z - sn * s[0] + c * s[2]];
}
/* seats for passengers: a plane's or a train's */
const hasSeats = v => isPlane(v) || (!!v && v.type === 'train');
const seatCount = v => isPlane(v) ? PLANES[v.type].seats.length : v && v.type === 'train' ? TRAIN_SEATS.length : 0;
const seatPos = (v, k) => v.type === 'train' ? trainSeat(v, k) : planeSeat(v, k);

/* ---- driving ---- */
/* forward: off it goes (and keeps going); back: stop, and back again to reverse slowly */
function trainControls(game, pl, v, fx, fz) {
  if (fz > 0.5 && !(v.lastFz > 0.5)) { if (v.running !== 1) { v.running = 1; sfx('trainHorn', v.x, v.y + 2, v.z, 0.6); } }
  else if (fz < -0.5 && !(v.lastFz < -0.5)) v.running = v.running ? 0 : -1;
  v.lastFz = fz;
}
/* is there a station platform beside this bit of track? (its block, or null) */
function stationBeside(w, x, y, z) {
  for (const dy of [0, -1]) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if ((dx || dz) && w.getBlock(x + dx, y + dy, z + dz) === B.STATION) return [x + dx, y + dy, z + dz];
  return null;
}
function stationName(w, s) {
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const l = signLines(w, s[0] + dx, s[1] + 1, s[2] + dz); if (l && l[0] === 'Train Station' && l[1]) return l[1]; }
  return 'the station';
}
/* the engine follows the rails like a minecart, at its own steady speed; it stops at stations and at the end of the line */
function trainStep(game, e, dt) {
  const w = game.world, x = Math.floor(e.x), z = Math.floor(e.z), ry = railNear(w, x, Math.floor(e.y + 0.2), z);
  if (ry === null) {   // off the rails: it just sits there
    e.running = 0;
    physicsStep(w, e, dt, 24);
    if (e.onGround) { e.vx *= Math.pow(0.02, dt); e.vz *= Math.pow(0.02, dt); }
    return;
  }
  const ex = railExits(w.getData(x, ry, z));
  const ax = x + 0.5 + ex[0][0] * 0.5, az = z + 0.5 + ex[0][2] * 0.5, ay = ry + (ex[0][1] > 0 ? 1 : 0);
  const bx = x + 0.5 + ex[1][0] * 0.5, bz = z + 0.5 + ex[1][2] * 0.5, by = ry + (ex[1][1] > 0 ? 1 : 0);
  const hl = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / hl, uz = (bz - az) / hl;
  const face = (-Math.sin(e.yaw) * ux - Math.cos(e.yaw) * uz) >= 0 ? 1 : -1;   // (the engine faces end b, or end a)
  if (e.waitT > 0) { e.waitT -= dt; if (e.waitT <= 0) { sfx('trainHorn', e.x, e.y + 2, e.z); if (MP.role === 'host') MP.sfx('trainHorn', e.x, e.y + 2, e.z); } }
  const want = e.waitT > 0 ? 0 : (e.running === 1 ? TRAIN_SPEED : e.running === -1 ? -2 : 0) * face;
  let v = e.vx * ux + e.vz * uz;
  v += clamp(want - v, -8 * dt, 3 * dt);
  let t = (e.x - ax) * ux + (e.z - az) * uz + v * dt;
  if (t < 0 || t > hl) {   // on to the next rail, or the end of the line
    const end = t > hl ? ex[1] : ex[0], ny = railNear(w, x + end[0], ry + end[1], z + end[2]);
    if (ny === null) {
      t = t > hl ? hl - 0.01 : 0.01;
      if (Math.abs(v) > 1 && e.running) { const me = game.player; if (me.riding === e) toast('End of the line!', 2); sfx('trainBrake', e.x, e.y, e.z); }
      v = 0; e.running = 0;
    }
  }
  e.x = ax + ux * t; e.z = az + uz * t;
  e.y = lerp(ay, by, clamp(t / hl, 0, 1)) + 0.0625;
  e.vx = ux * v; e.vz = uz * v; e.vy = 0; e.onGround = true; e.onRail = true;
  e.slope = Math.atan((by - ay) / hl) * face;
  const yawB = Math.atan2(-ux, -uz), yaw = face > 0 ? yawB : yawB + Math.PI;   // (keep facing the same way round corners)
  e.yaw = yaw;
  e.wheel += v * face * dt / 0.2;
  // a station: stop for a few seconds (once for each station passed)
  const cell = x + ',' + ry + ',' + z;
  if (cell !== e.cell) {
    e.cell = cell;
    const st = Math.abs(v) > 0.5 && !(e.waitT > 0) ? stationBeside(w, x, ry, z) : null;
    if (st && !(e.lastStop && Math.hypot(e.lastStop[0] - st[0], e.lastStop[2] - st[2]) < 9)) {
      e.lastStop = st; e.waitT = STATION_WAIT;
      sfx('trainBell', e.x, e.y + 2, e.z);
      if (MP.role === 'host') MP.sfx('trainBell', e.x, e.y + 2, e.z);
      const me = game.player;
      if (me.riding === e) toast(stationName(w, st) + '! All aboard!', 3);
    } else if (!st && e.lastStop && Math.hypot(e.lastStop[0] - x, e.lastStop[2] - z) > 12) e.lastStop = null;
  }
  // chuff chuff, and a puff of smoke from the chimney
  e.chugT = (e.chugT || 0) - dt * Math.max(0.3, Math.abs(v) / 3);
  if (Math.abs(v) > 0.4 && e.chugT <= 0) {
    e.chugT = 0.5;
    sfx('trainChug', e.x, e.y + 1, e.z, clamp(Math.abs(v) / TRAIN_SPEED, 0.4, 1));
    smokeParticles(e.x - Math.sin(e.yaw) * 1.4, e.y + 3.1, e.z - Math.cos(e.yaw) * 1.4, 3, 0.1, false);
  }
}

/* ---- stations ---- */
/* a Train Station put down beside the track: a five-block platform along it, with a sign showing its name */
function stationPlaced(game, x, y, z) {
  const w = game.world;
  let rail = null;
  for (const [dx, dz] of HDIRS) if (w.getBlock(x + dx, y, z + dz) === B.RAIL || w.getBlock(x + dx, y - 1, z + dz) === B.RAIL) { rail = [dx, dz]; break; }
  if (!rail) { toast('Put the Train Station right beside a railway track.', 3); return; }
  const ax = rail[1] ? 1 : 0, az = rail[0] ? 1 : 0;   // (along the track)
  for (const k of [-2, -1, 1, 2]) {
    const px = x + ax * k, pz = z + az * k, cur = w.getBlock(px, y, pz);
    if ((cur === B.AIR || (BLOCKS[cur] && BLOCKS[cur].replaceable && !LIQUID[cur])) && SOLID[w.getBlock(px, y - 1, pz)]) w.setBlock(px, y, pz, B.STATION, 0, true);
  }
  if (w.getBlock(x, y + 1, z) !== B.AIR) return;
  const name = STATION_NAMES[(((x * 73856093) ^ (z * 19349663)) >>> 0) % STATION_NAMES.length];
  w.setBlock(x, y + 1, z, B.SIGN, Math.round(Math.atan2(rail[0], rail[1]) / (Math.PI / 8)) & 15, true);   // (standing, facing the track)
  const lines = ['Train Station', name, '', ''];
  setSignText(w, x, y + 1, z, lines);
  if (MP.role === 'guest') MP.send({ t: 'sign', x, y: y + 1, z, l: lines });
  else if (MP.role === 'host') MP.broadcast({ t: 'sign', x, y: y + 1, z, l: lines, we: MP.we });
  toast('This is ' + name + '! Trains stop here.', 3);
}

/* ---- drawing: the engine, then each carriage where it has got to ---- */
function drawTrain(game, e, dx, dy, dz, s) {
  trainTrail(e);
  const P = PROG.entity, wr = e.wheel || 0, wheels = { wl0: [wr, 0, 0], wl1: [wr, 0, 0], wl2: [wr, 0, 0], wr0: [wr, 0, 0], wr1: [wr, 0, 0], wr2: [wr, 0, 0] };
  const one = (model, x, y, z, yaw, slope) => {
    gl.uniform1f(P.u.uBright, brightAt(game.world, x, y + 0.5, z, s));
    M4.identity(_eb);
    M4.translate(_eb, _eb, dx + x - e.x, dy + y - e.y, dz + z - e.z);
    M4.rotY(_eb, _eb, yaw + Math.PI);
    if (slope) M4.rotX(_eb, _eb, -slope);
    if (e.hurt > 0) M4.rotZ(_eb, _eb, Math.sin(e.hurt * 40) * 0.05);
    M4.scale(_eb, _eb, model.scale, model.scale, model.scale);
    drawModel(model, _eb, wheels);
  };
  gl.uniform4fv(P.u.uTint, e.hurt > 0 ? [0.8, 0.1, 0.1, 0.35] : [0, 0, 0, 0]);
  one(MODELS.train, e.x, e.y, e.z, e.yaw, e.slope || 0);
  for (let k = 1; k <= TRAIN_CARS.length; k++) { const c = carPose(e, k); one(MODELS.carriage, c.x, c.y, c.z, c.yaw, 0); }
}
