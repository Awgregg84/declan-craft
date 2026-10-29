/* ===================== Robots ===================== */
// Make a robot and keep it in your bag. Tap the ground to let it out: it says hello and follows you about. Tap it to
// change what it does: Follow me, Guard me (it zaps monsters that come near), Collect things (it picks up what is
// lying about and puts it in your bag) or Stay here. Hit it to put it back in your bag. Nothing can hurt a robot.
// Each robot keeps its colour, and comes with you through portals and in the rocket. Only its owner can pick it up.
const ROBOT_COLORS = ['#c8d2de', '#ff5a4a', '#4a8cff', '#ffcf3a', '#5ad06a'];
const ROBOT_COLOR_NAMES = ['Silver', 'Red', 'Blue', 'Gold', 'Green'];
const ROBOT_MODES = ['follow', 'guard', 'collect', 'stay'];
const ROBOT_MODE_SAY = { follow: 'Following you!', guard: 'Guarding you! I zap monsters.', collect: 'Collecting things for you!', stay: 'Staying here!' };
const ROBOT_LIGHT = [[0.3, 1, 0.4], [1, 0.25, 0.2], [1, 0.85, 0.2], [0.4, 0.65, 1]];   // its antenna light: follow, guard, collect, stay
TAG_CLEAN.robot = v => (Number.isInteger(v) && v >= 0 && v < ROBOT_COLORS.length ? v : null);
const robotColor = c => hexRGB(ROBOT_COLORS[c] || ROBOT_COLORS[0]).map(v => v / 255);
const myPid = () => PROFILE.pid;
/* is this robot mine? (playing alone, every robot is: one from before a new character was made is yours too) */
function robotMine(e) { if (!MP.role && e.owner !== myPid() && !(MP.guestSaves && MP.guestSaves[e.owner])) e.owner = myPid(); return e.owner === myPid(); }   // (not one that belongs to someone who plays here with you)

/* let one out (here, or on the host for someone playing together: owner is who it belongs to) */
function makeRobot(game, x, y, z, owner, c, mode, yaw) {
  const e = spawnMob(game, 'robot', x, y, z);
  if (!e) return null;
  e.owner = owner; e.variant = clamp(c | 0, 0, ROBOT_COLORS.length - 1); e.color = robotColor(e.variant);
  e.mode = ROBOT_MODES.includes(mode) ? mode : 'follow';
  e.yaw = e.bodyYaw = e.headYaw = yaw || 0;
  return e;
}
/* the player (here or playing together) a robot belongs to, if they are here */
function robotOwner(game, e) {
  if (robotMine(e)) return game.player.alive ? game.player : null;
  const r = MP.role === 'host' ? MP.remotes.get(e.owner) : null;
  return r && r.has && r.alive ? r : null;
}
/* tap the ground holding a robot */
function placeRobot(game, pl, st, x, y, z) {
  const c = st.tag && Number.isInteger(st.tag.robot) ? st.tag.robot : randInt(0, ROBOT_COLORS.length - 1), yaw = pl.yaw + Math.PI;   // (it faces you)
  if (MP.role === 'guest') MP.send({ t: 'robot+', x: r2(x), y: r2(y), z: r2(z), c, yaw: r2(yaw) });
  else makeRobot(game, x, y, z, myPid(), c, 'follow', yaw);
  sfx('robotSay', x, y + 1, z);
  toast('Beep boop! Hello, ' + playerName() + '! Tap me to change what I do. Hit me to put me back in your bag.', 4);
}
/* tap a robot: the next thing to do (only its owner can) */
function robotTap(game, pl, e) {
  if (!robotMine(e)) { toast("That's someone else's robot.", 2); sfx('robotHurt', e.x, e.y + 0.8, e.z); return; }
  const mode = ROBOT_MODES[(ROBOT_MODES.indexOf(e.mode) + 1) % ROBOT_MODES.length];
  if (e.proxy) { MP.send({ t: 'robot', e: e.nid, a: 'mode', m: mode }); e.modeT = game.t + 1; }   // (the host's word on it comes back in a moment)
  e.mode = mode;
  toast('Robot: ' + ROBOT_MODE_SAY[mode], 2.5);
  sfx('robotMode', e.x, e.y + 0.8, e.z);
}
/* hit a robot: back in its owner's bag (host or one player; who: the player who hit it) */
function robotHit(game, e, who) {
  if (e.removed || e.dead) return;
  if (who === myPid()) robotMine(e);
  if (who !== e.owner) { if (who === myPid()) toast("That's someone else's robot.", 2); sfx('robotHurt', e.x, e.y + 0.8, e.z); e.hurt = 0.2; return; }
  e.removed = true;
  const st = { id: I.ROBOT, count: 1, tag: { robot: e.variant | 0 } };
  sfx('robotPick', e.x, e.y + 0.6, e.z);
  smokeParticles(e.x, e.y + 0.5, e.z, 6, 0.3, false);
  if (who === myPid()) {
    if (game.giveItem(I.ROBOT, 1, st) > 0) dropItem(game, e.x, e.y + 0.5, e.z, I.ROBOT, 1, true, st);
    toast('Your robot is back in your bag.', 2);
  } else {
    const r = MP.remotes.get(who);
    if (r) MP.sendDrops(r, [dropEntry(I.ROBOT, 1, st)], r.x, r.y + 0.5, r.z, true);
    else dropItem(game, e.x, e.y + 0.5, e.z, I.ROBOT, 1, true, st);
  }
}

/* ---- what a robot does (host or one player). Returns [mx, mz, speed multiplier] like golemSteer ---- */
const ROBOT_ZAP = 9;   // how far it can zap
function robotSteer(game, e, dt) {
  if (e.zapT > 0) e.zapT -= dt;
  if (e.sayT === undefined) e.sayT = randRange(6, 14);
  if ((e.sayT -= dt) <= 0) { e.sayT = randRange(8, 18); sfx('robotSay', e.x, e.y + 1, e.z, 0.6); }
  if (e.mode === 'stay') return [0, 0, 0];
  const own = robotOwner(game, e);
  if (!own) return [0, 0, 0];   // (its owner isn't here: it waits)
  const ox = own.x - e.x, oz = own.z - e.z, od = Math.hypot(ox, oz) || 0.01;
  if (od > 24 || Math.abs(own.y - e.y) > 12) { robotHop(game, e, own); return [0, 0, 0]; }   // (left far behind: it zips over to you)
  if (e.mode === 'guard') {   // zap the nearest monster near you
    e.scanT = (e.scanT || 0) - dt;
    if (e.scanT <= 0 || (e.prey && (e.prey.removed || e.prey.dead))) { e.scanT = 0.4; e.prey = robotPrey(game, e, own); }
    const p = e.prey;
    if (p) {
      const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz) || 0.01;
      e.yaw = Math.atan2(-dx, -dz);
      if (dist < ROBOT_ZAP && e.attackCd <= 0 && robotSees(game.world, e, p)) { e.attackCd = 1.1; robotZap(game, e, p); }
      if (dist > 5) return [dx / dist, dz / dist, 1];
      return [0, 0, 0];
    }
  }
  if (e.mode === 'collect') {   // go and get things lying about (not ones just dropped)
    e.scanT = (e.scanT || 0) - dt;
    if (e.scanT <= 0 || (e.item && e.item.removed)) { e.scanT = 0.5; e.item = robotItem(game, e, own); }
    const it = e.item;
    if (it) {
      const dx = it.x - e.x, dz = it.z - e.z, dist = Math.hypot(dx, dz) || 0.01;
      e.yaw = Math.atan2(-dx, -dz);
      if (dist < 1.1 && Math.abs(it.y - e.y) < 1.5) { robotTake(game, e, it, own); e.item = null; return [0, 0, 0]; }
      return [dx / dist, dz / dist, 1];
    }
  }
  if (od > 3.2) { e.yaw = Math.atan2(-ox, -oz); return [ox / od, oz / od, od > 8 ? 1.3 : 1]; }   // follow you
  e.yaw = Math.atan2(-ox, -oz);   // (and look at you)
  return [0, 0, 0];
}
/* fell out of the world: back beside its owner (or, with nobody to go to, at the spawn point, waiting there) */
function robotRescue(game, e) {
  const own = robotOwner(game, e);
  if (own) robotHop(game, e, own);
  if (e.y < -20) { const sp = game.spawnPos(); e.x = sp[0]; e.y = sp[1]; e.z = sp[2]; e.vx = e.vy = e.vz = 0; e.fallDist = 0; if (!own) e.mode = 'stay'; }
}
/* zip over next to its owner */
function robotHop(game, e, own) {
  const w = game.world;
  for (let k = 0; k < 10; k++) {
    const a = Math.random() * TAU, x = own.x + Math.cos(a) * 1.6, z = own.z + Math.sin(a) * 1.6, y = Math.floor(own.y + 0.01);
    if (SOLID[w.getBlock(Math.floor(x), y - 1, Math.floor(z))] && boxFree(w, x, y, z, 0.3, 1.15)) {
      smokeParticles(e.x, e.y + 0.5, e.z, 5, 0.3, false);
      e.x = x; e.y = y; e.z = z; e.vx = e.vy = e.vz = 0; e.fallDist = 0;
      sfx('robotSay', x, y + 1, z, 0.5);
      return;
    }
  }
}
function robotPrey(game, e, own) {
  let best = null, bd = 12;
  for (const m of game.entities) {
    if (!m.mob || m.dead || m.removed || m === e) continue;
    const d = MOB_DEFS[m.type];
    if (!(d.hostile || (d.neutral && !d.guard && m.angryT > 0)) || d.flyer) continue;
    const dist = Math.hypot(m.x - e.x, m.z - e.z);
    if (dist >= bd || Math.abs(m.y - e.y) > 5 || Math.hypot(m.x - own.x, m.z - own.z) > 16) continue;
    bd = dist; best = m;
  }
  return best;
}
const robotSees = (w, e, m) => { const ex = e.x, ey = e.y + 0.9, ez = e.z, dx = m.x - ex, dy = m.y + m.h * 0.6 - ey, dz = m.z - ez, d = Math.hypot(dx, dy, dz) || 1, hit = raycast(w, ex, ey, ez, dx / d, dy / d, dz / d, d); return !hit || hit.t >= d - 0.3; };
/* zap! a little blue bolt from its antenna */
function robotZap(game, e, m) {
  const tx = m.x, ty = m.y + m.h * 0.6, tz = m.z;
  zapBeam(e.x, e.y + 1.05, e.z, tx, ty, tz);
  sfx('robotZap', e.x, e.y + 1, e.z);
  if (MP.role === 'host') MP.fxId('zap', tx, ty, tz, e.nid);
  e.armSwing = 0.3;
  hurtMob(game, m, 4, e.x, e.z, 'player', e.owner === myPid() ? undefined : e.owner);   // (as if its owner hit it: experience for them)
}
function zapBeam(x0, y0, z0, x1, y1, z1) {
  const n = Math.min(24, Math.ceil(Math.hypot(x1 - x0, y1 - y0, z1 - z0) * 3));
  for (let i = 0; i <= n && PARTICLES.length < 1500; i++) {
    const t = i / n;
    PARTICLES.push({ x: x0 + (x1 - x0) * t + randRange(-0.04, 0.04), y: y0 + (y1 - y0) * t + randRange(-0.04, 0.04), z: z0 + (z1 - z0) * t + randRange(-0.04, 0.04), vx: 0, vy: 0, vz: 0, life: randRange(0.12, 0.25), tile: TILE.spark, u: 0, v: 0, us: 16, size: 0.07, grav: 0, bright: 1 });
  }
  sparkParticles(x1, y1 - 0.5, z1, 4);
}
function robotItem(game, e, own) {
  let best = null, bd = 12;
  for (const it of game.entities) {
    if (it.type !== 'item' || it.removed || it.age < 2 || it.reel > 0) continue;
    const d = Math.hypot(it.x - e.x, it.z - e.z);
    if (d < bd && Math.abs(it.y - e.y) < 4 && Math.hypot(it.x - own.x, it.z - own.z) < 20) { bd = d; best = it; }
  }
  return best;
}
/* it picks a thing up and puts it straight into its owner's bag */
function robotTake(game, e, it, own) {
  const st = cloneStack(it);
  it.removed = true;
  sfx('pop', e.x, e.y + 0.6, e.z);
  e.armSwing = 0.3;
  if (own === game.player) {
    const left = game.giveItem(st.id, st.count, st);
    if (left > 0) { dropItem(game, own.x, own.y + 0.5, own.z, st.id, left, true, st); toast('Your bag is full!', 2); }
  } else MP.sendDrops(own, [dropEntry(st.id, st.count, st)], own.x, own.y + 0.5, own.z, true);
}

/* ---- keeping robots with the world, and taking them along to another world ---- */
function saveRobots(game) {
  return game.entities.filter(e => e.type === 'robot' && !e.removed && !e.proxy).map(e => ({ x: r2(e.x), y: r2(e.y), z: r2(e.z), yaw: r2(e.yaw), o: e.owner, c: e.variant | 0, m: e.mode }));
}
function loadRobots(game, list) {
  if (!Array.isArray(list)) return;
  for (const r of list.slice(0, 64)) if (r && [r.x, r.y, r.z].every(n => typeof n === 'number' && isFinite(n))) makeRobot(game, r.x, r.y, r.z, String(r.o || '').slice(0, 16), r.c, r.m, +r.yaw || 0);
}
/* the robots that come along when you go to another world (those following someone who is going) */
function takeRobots(game) {
  const out = [];
  for (const e of game.entities) if (e.type === 'robot' && !e.removed && !e.proxy && e.mode !== 'stay' && robotOwner(game, e)) { out.push({ o: e.owner, c: e.variant | 0, m: e.mode }); e.removed = true; }
  return out;
}
function bringRobots(game, list) {
  const pl = game.player;
  for (const r of list || []) { const a = Math.random() * TAU; makeRobot(game, pl.x + Math.cos(a) * 1.5, pl.y + 0.2, pl.z + Math.sin(a) * 1.5, r.o, r.c, r.m, pl.yaw + Math.PI); }
}
