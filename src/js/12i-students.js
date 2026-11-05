/* ===================== Hogwarts students and Quidditch teams ===================== */
// Students in their house robes walk about the Great Hall, the courtyard and Hogsmeade (only in the Hogwarts world),
// and wave and say hello when you come near. When anyone goes onto the Quidditch pitch, a match starts: your house's
// team (the host's house, or Gryffindor before the Sorting Hat has spoken) against another house, three players a
// side on broomsticks, passing the Quaffle and throwing it through the other team's hoops (10 points a goal). Fly up
// to the Quaffle to grab it (you can steal it, too), tap to throw it, and score through the hoops at the east end.
// Catching the Golden Snitch ends the match: 150 points to your team, and the team with the most points wins.
// The host runs it all; the students, the players and the Quaffle are creatures, so guests see them like any other.
const STUDENT_LOOKS = 8;   // (house = variant & 3; two looks for each house)
const STUDENT_HI = ['Hello, %!', 'Hi %! Have you been to the Great Hall?', 'Hello! Go %h!', 'Watch out for the moving staircases, %!', 'Hi %! Have you seen the Golden Snitch?', 'Hello %! I love it here.', 'Hi! Are you coming to the Quidditch match, %?'];

/* ---- students ---- */
function studentSpots() {
  const H = game.gen.hogwarts, C = H.castle, V = H.village;
  return [{ x0: -6, x1: 6, z0: -66, z1: -40, y: C.y + 1 }, { x0: -30, x1: 30, z0: -34, z1: -21, y: C.y + 1 }, { x0: V.x - 30, x1: V.x + 30, z0: V.z - 1, z1: V.z + 1, y: V.y + 1 }];   // the Great Hall, the courtyard, Hogsmeade
}
const playerPos = p => p === game.player ? [p.x, p.y, p.z] : [p.tx, p.ty, p.tz];
const livePlayers = game => allPlayers(game).filter(p => p.alive && (p === game.player || p.lastState));
/* (the host, every second) a few students about wherever a player is near the castle or the village */
function studentTick(game) {
  const w = game.world, all = game.entities.filter(e => e.type === 'student' && !e.removed);
  if (all.length >= 16) return;
  for (const p of livePlayers(game)) {
    const [px, , pz] = playerPos(p);
    if (all.filter(e => Math.hypot(e.x - px, e.z - pz) < 48).length >= 6) continue;
    const spots = studentSpots().filter(s => Math.hypot((s.x0 + s.x1) / 2 - px, (s.z0 + s.z1) / 2 - pz) < 60);
    if (!spots.length) continue;
    const s = spots[randInt(0, spots.length - 1)], x = Math.floor(randRange(s.x0, s.x1 + 1)) + 0.5, z = Math.floor(randRange(s.z0, s.z1 + 1)) + 0.5;
    if (Math.hypot(x - px, z - pz) < 6) continue;   // (not right next to you)
    for (let y = s.y + 2; y >= s.y - 2; y--) {
      const b = w.getBlock(Math.floor(x), y - 1, Math.floor(z));
      if (b === B.UNLOADED) break;
      if (SOLID[b] && boxFree(w, x, y, z, 0.3, 1.8)) { const e = spawnMob(game, 'student', x, y, z); e.variant = randInt(0, STUDENT_LOOKS - 1); e.home = [x, z]; all.push(e); break; }
    }
  }
}
/* the nearest player within r of a creature: [player, x, y, z, distance] */
function closePlayer(game, e, r) {
  let best = null;
  for (const p of livePlayers(game)) { const [x, y, z] = playerPos(p), d = Math.hypot(x - e.x, z - e.z); if (d < r && Math.abs(y - e.y) < 3) { r = d; best = [p, x, y, z, d]; } }
  return best;
}
function studentSteer(game, e, dt) {
  if (e.waveT > 0) e.waveT -= dt;
  if (nearestPlayerDist(game, e) > 80 || game.mapId !== 'hogwarts') { e.removed = true; return [0, 0, 0]; }
  if (e.panic > 0) { e.panic -= dt; return [-Math.sin(e.yaw), -Math.cos(e.yaw), 1.8]; }
  const near = closePlayer(game, e, 5);
  if (near && !(e.hiT > game.t)) {   // someone new: a wave and a hello
    e.hiT = game.t + 45; e.waveT = 2.5;
    const [p] = near, H = HOUSES[e.variant & 3], name = p === game.player ? playerName() : p.name || 'friend';
    const line = 'A ' + H.name + ' student: "' + STUDENT_HI[randInt(0, STUDENT_HI.length - 1)].replace('%h', H.name).replace('%', name) + '"';
    if (p === game.player) chat(line, H.color);
    else if (p.link) p.link.send({ t: 'chat', m: line, c: H.color });
    sfx('studentHi', e.x, e.y + 1.6, e.z); MP.sfx('studentHi', e.x, e.y + 1.6, e.z);
  }
  if (near && e.waveT > 0) { e.yaw = Math.atan2(-(near[1] - e.x), -(near[3] - e.z)); e.lookP = 0; return [0, 0, 0]; }   // (stop and look at you while waving)
  e.aiT -= dt;
  if (e.aiT <= 0) {
    if (Math.random() < 0.4) { e.moving = false; e.aiT = randRange(2, 5); }
    else {
      e.moving = true; e.aiT = randRange(2, 5); e.yaw = Math.random() * TAU;
      if (e.home && Math.hypot(e.home[0] - e.x, e.home[1] - e.z) > 9) e.yaw = Math.atan2(-(e.home[0] - e.x), -(e.home[1] - e.z));   // (back towards where it started)
    }
  }
  if (e.collidedH && e.moving) { e.yaw += Math.PI * randRange(0.5, 1.5); }
  return e.moving ? [-Math.sin(e.yaw), -Math.cos(e.yaw), 0.6] : [0, 0, 0];
}

/* ---- the Quidditch match (the host runs it) ---- */
// game.qm: { home, away (house numbers), score: [home, away] in goals, ball: the Quaffle, t: how long nobody has been on the pitch }
const onPitch = (x, y, z, k) => { const L = game.gen.hogwarts.pitch; return Math.hypot((x - L.x) / (L.hx + 6), (z - L.z) / (L.hz + 6)) < (k || 1) && y > L.y - 4; };
function qmatchTick(game) {   // (every second)
  const L = game.gen.hogwarts.pitch, qm = game.qm;
  const near = livePlayers(game).some(p => { const [x, y, z] = playerPos(p); return onPitch(x, y, z, qm ? 1.6 : 1); });
  if (qm) {
    qm.t = near ? 0 : qm.t + 1;
    if (qm.t > 30 || qm.ball.removed) qmatchClear(game);
    return;
  }
  if (!near) return;
  const home = game.stats.house >= 0 && game.stats.house < 4 ? game.stats.house : 0, away = home === 1 ? 0 : 1;
  const ball = spawnMob(game, 'quaffle', L.x + 0.5, L.y + 14, L.z + 0.5);
  game.qm = { home, away, score: [0, 0], ball, t: 0 };
  ball.vx = ball.vy = ball.vz = 0; ball.holder = ''; ball.team = -1;
  for (let team = 0; team < 2; team++) for (let i = 0; i < 3; i++) {
    const q = spawnMob(game, 'qplayer', L.x + (team ? 1 : -1) * 12, L.y + 8 + i * 3, L.z + (i - 1) * 8);
    q.team = team; q.variant = (team ? away : home) + 4 * (i % 2); q.yaw = q.bodyYaw = team ? Math.PI / 2 : -Math.PI / 2; q.aiT = 0;
  }
  const line = 'The Quidditch match is starting: ' + HOUSES[home].name + ' against ' + HOUSES[away].name + '! Grab the Quaffle and throw it through the hoops at the east end.';
  chat(line, '#ffd24a'); MP.system(line);
  sfx('whistle'); MP.sfx('whistle', L.x, L.y + 10, L.z);
}
function qmatchClear(game) {
  for (const e of game.entities) if ((e.type === 'qplayer' || e.type === 'quaffle') && !e.removed) e.removed = true;
  game.qm = null;
}
/* the Snitch was caught (by a player, so on the home team): the match ends */
function qmatchEnd(game) {
  const qm = game.qm;
  if (!qm) return;
  const h = qm.score[0] * 10 + 150, a = qm.score[1] * 10, win = h >= a ? qm.home : qm.away;
  const line = 'The Snitch is caught! The match is over: ' + HOUSES[qm.home].name + ' ' + h + ', ' + HOUSES[qm.away].name + ' ' + a + '. ' + HOUSES[win].name + ' wins!';
  chat(line, HOUSES[win].color); MP.system(line);
  qmatchClear(game);
  game.qmEnded = [HOUSES[win].name + ' wins!', game.t];
}
/* the hoops a team throws at: the home team at the east end (+x), the other team at the west end */
const qHoops = team => game.gen.hogwarts.hoops.filter(h => (h[0] > game.gen.hogwarts.pitch.x) === (team === 0));
function qHolderPos(e) { return [e.x - Math.sin(e.bodyYaw) * 0.45, e.y + 1.25, e.z - Math.cos(e.bodyYaw) * 0.45]; }
/* players on brooms: fly to the ball, pass it, throw it at the hoops, and chase whoever has it */
function updateQPlayer(game, e, dt) {
  const qm = game.qm, L = game.gen.hogwarts.pitch;
  if (!qm || game.mapId !== 'hogwarts') { e.removed = true; return; }
  const ball = qm.ball, mine = ball.holder === e.nid, mates = ball.team === e.team;
  e.aiT -= dt;
  let tx, ty, tz, sp = 7;
  if (mine) {   // fly at the hoops; pass now and then; throw when close enough
    const hoop = e.hoop && qHoops(e.team).includes(e.hoop) ? e.hoop : (e.hoop = qHoops(e.team)[randInt(0, 2)]);
    const dir = e.team === 0 ? 1 : -1;
    tx = hoop[0] - dir * 9; ty = hoop[1] - 1; tz = hoop[2]; sp = 6.5;
    if (Math.hypot(tx - e.x, ty - e.y, tz - e.z) < 3) qThrowAt(game, e, hoop[0] + 0.5 + dir * 2, hoop[1] + 0.5 + randRange(-1.4, 1.4), hoop[2] + 0.5 + randRange(-1.4, 1.4), 14);
    else if (e.aiT <= 0) {
      e.aiT = randRange(2, 4);
      const mate = game.entities.find(q => q.type === 'qplayer' && !q.removed && q !== e && q.team === e.team && (q.x - e.x) * dir > 3);
      if (mate && Math.random() < 0.5) qThrowAt(game, e, mate.x, mate.y + 1.2, mate.z, 13);
    }
  } else if (ball.holder && mates) {   // a team-mate (or you) has it: fly alongside, ahead
    const [hx, hy, hz] = qBallPos(ball), dir = e.team === 0 ? 1 : -1, side = ((e.nid % 3) - 1) * 7;
    tx = hx + dir * 7; ty = hy + ((e.nid % 2) ? 2 : -1); tz = hz + side;
  } else {   // the ball is loose, or the other team has it: go for it (the nearest two of each team)
    const [hx, hy, hz] = qBallPos(ball);
    const rank = game.entities.filter(q => q.type === 'qplayer' && !q.removed && q.team === e.team && Math.hypot(q.x - hx, q.z - hz) < Math.hypot(e.x - hx, e.z - hz)).length;
    if (rank < 2) { tx = hx; ty = hy - 1; tz = hz; sp = 8; }
    else { tx = L.x + (e.team === 0 ? -1 : 1) * 14; ty = L.y + 10; tz = L.z + ((e.nid % 3) - 1) * 8; }   // (one stays back to defend)
    const reach = Math.hypot(hx - e.x, hz - e.z) < 1.6 && hy > e.y - 1 && hy < e.y + 2.2;
    if (reach && !(e.grabT > game.t) && !(ball.passT > game.t && ball.team === e.team)) {   // reach it: take a loose ball; snatch it from someone now and then
      e.grabT = game.t + 0.5;
      if (!ball.holder || Math.random() < (typeof ball.holder === 'string' ? 0.25 : 0.4)) qGive(game, ball, e.nid, e.team);
    }
  }
  // keep over the pitch, above the grass
  ty = clamp(ty, L.y + 1.5, L.y + 26);
  const dx = tx - e.x, dy = ty - e.y, dz = tz - e.z, d = Math.hypot(dx, dy, dz) || 1, k = Math.min(1, dt * 2.5), go = d > 0.8 ? sp : d * sp / 0.8;
  e.vx += (dx / d * go - e.vx) * k; e.vy += (dy / d * go - e.vy) * k; e.vz += (dz / d * go - e.vz) * k;
  e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
  const hs = Math.hypot(e.vx, e.vz);
  if (hs > 0.5) e.yaw = Math.atan2(-e.vx, -e.vz);
  e.bodyYaw = approachAngle(e.bodyYaw, e.yaw, dt * 4); e.headYaw = e.bodyYaw; e.pitch = 0;
  e.walk += dt; e.walkAmt = 0; e.onGround = false;
}
/* where the Quaffle is (in someone's hands, or flying free) */
function qBallPos(ball) { return [ball.x, ball.y, ball.z]; }
function qGive(game, ball, holder, team) {
  ball.holder = holder; ball.team = team; ball.vx = ball.vy = ball.vz = 0;
  sfx('quaffleCatch', ball.x, ball.y, ball.z); MP.sfx('quaffleCatch', ball.x, ball.y, ball.z);
}
/* throw from where the holder is, at a point, with a little lob */
function qThrowAt(game, holder, x, y, z, speed) {
  const ball = game.qm.ball, [bx, by, bz] = qHolderPos(holder), dx = x - bx, dz = z - bz, hd = Math.hypot(dx, dz) || 1, t = hd / speed;
  ball.x = bx; ball.y = by; ball.z = bz;
  ball.vx = dx / t; ball.vz = dz / t; ball.vy = (y - by) / t + 0.5 * QUAFFLE_G * t;
  ball.holder = ''; ball.passT = game.t + 0.4; ball.from = holder.nid || holder.id || 'me';
  holder.aiT = randRange(2, 4);
  sfx('quaffleThrow', bx, by, bz); MP.sfx('quaffleThrow', bx, by, bz);
}
const QUAFFLE_G = 9;
function updateQuaffle(game, e, dt) {
  const qm = game.qm, L = game.gen.hogwarts.pitch, w = game.world;
  if (!qm || qm.ball !== e) { e.removed = true; return; }
  if (e.holder) {   // carried along in someone's hands
    const h = typeof e.holder === 'number' ? game.entities.find(q => q.nid === e.holder && !q.removed) : null;
    const p = typeof e.holder === 'string' ? (e.holder === PROFILE.pid ? game.player : MP.remotes.get(e.holder)) : null;
    if (h) [e.x, e.y, e.z] = qHolderPos(h);
    else if (p && p.alive) { const [x, y, z] = playerPos(p), yaw = p === game.player ? p.yaw : p.yaw || 0; e.x = x - Math.sin(yaw) * 0.5; e.y = y + 1.1; e.z = z - Math.cos(yaw) * 0.5; }
    else e.holder = '';   // (they've gone: it drops)
    e.vx = e.vy = e.vz = 0;
  } else {
    const px = e.x;
    e.vy -= QUAFFLE_G * dt;
    moveEntity(w, e, e.vx * dt, e.vy * dt, e.vz * dt);
    if (e.onGround) { e.vy = Math.abs(e.vy) > 2 ? -e.vy * 0.4 : 0; e.vx *= Math.pow(0.2, dt); e.vz *= Math.pow(0.2, dt); }
    // through a hoop? (each end's hoops count for the team throwing at them)
    for (const team of [0, 1]) for (const [hx, hy, hz] of qHoops(team)) {
      const mx = hx + 0.5;
      if ((px - mx) * (e.x - mx) > 0 || px === e.x || e.team !== team) continue;
      const t = (mx - px) / (e.x - px), z = e.z - e.vz * dt * (1 - t), y = e.y - e.vy * dt * (1 - t);
      if (Math.hypot(y - (hy + 0.5), z - (hz + 0.5)) > 2.4) continue;
      qGoal(game, team, e.from, mx, hy + 0.5, hz + 0.5);
      return;
    }
    if (!onPitch(e.x, e.y, e.z, 1.3) || e.y < L.y - 2) { e.x = L.x + 0.5; e.y = L.y + 14; e.z = L.z + 0.5; e.vx = e.vy = e.vz = 0; e.team = -1; }   // (out of the pitch: back to the middle)
    // a player flying into a loose ball (or one the other team holds) grabs it
  }
  if (!e.holder || typeof e.holder === 'number') {
    const p = game.player;
    if (p.alive && atHogwarts() && !(e.passT > game.t) && Math.hypot(p.x - e.x, p.y + 1 - e.y, p.z - e.z) < 1.8 && !(p.qGrabT > game.t)) {
      p.qGrabT = game.t + 0.6;
      if (!e.holder || Math.random() < 0.5) { qGive(game, e, PROFILE.pid, 0); toast('You have the Quaffle! Tap to throw it.', 2.5); }
    }
  }
  e.walk += dt * 3; e.yaw = e.bodyYaw = e.headYaw = 0;
}
function qGoal(game, team, from, x, y, z) {
  const qm = game.qm, ball = qm.ball;
  qm.score[team]++;
  partyEffect(x, y, z); MP.fx('party', x, y, z);
  const who = from === 'me' ? playerName() : typeof from === 'string' && MP.remotes.get(from) ? MP.remotes.get(from).name : null;
  const line = (who ? who + ' scored! ' : 'GOAL for ' + HOUSES[team ? qm.away : qm.home].name + '! ') + HOUSES[qm.home].name + ' ' + qm.score[0] * 10 + ', ' + HOUSES[qm.away].name + ' ' + qm.score[1] * 10 + '.';
  chat(line, HOUSES[team ? qm.away : qm.home].color); MP.system(line);
  // the other team takes it from the middle
  const L = game.gen.hogwarts.pitch;
  ball.x = L.x + 0.5; ball.y = L.y + 12; ball.z = L.z + 0.5; ball.vx = ball.vy = ball.vz = 0; ball.holder = ''; ball.team = -1; ball.passT = game.t + 1;
}
/* the player throws the Quaffle (a guest asks the host) */
function quaffleHeld(game) {
  const b = game.entities.find(e => e.type === 'quaffle' && !e.removed);
  return b && b.holder === PROFILE.pid ? b : null;
}
function throwQuaffle(game, pl) {
  const b = quaffleHeld(game);
  if (!b) return false;
  const [dx, dy, dz] = pl.lookDir();
  if (MP.role === 'guest') { MP.send({ t: 'quaffle', a: 'throw', e: b.nid, d: [r2(dx), r2(dy), r2(dz)] }); b.holder = ''; }
  else qThrowDir(game, b, pl, dx, dy, dz, 'me');
  pl.swing();
  return true;
}
function qThrowDir(game, b, p, dx, dy, dz, from) {
  const [x, y, z] = playerPos(p), l = Math.hypot(dx, dy, dz) || 1, v = [p.vx || 0, 0, p.vz || 0];
  b.holder = ''; b.team = 0; b.from = from; b.passT = game.t + 0.5;
  b.x = x + dx / l * 0.8; b.y = y + 1.4 + dy / l * 0.8; b.z = z + dz / l * 0.8;
  b.vx = dx / l * 16 + v[0] * 0.5; b.vy = dy / l * 16 + 2; b.vz = dz / l * 16 + v[2] * 0.5;
  sfx('quaffleThrow', b.x, b.y, b.z); MP.sfx('quaffleThrow', b.x, b.y, b.z);
}
/* (host) a guest's request: grab the Quaffle, or throw it where they look */
function quaffleMsg(game, r, m) {
  const b = game.qm && game.qm.ball;
  if (!b || b.removed || b.nid !== m.e) return;
  if (m.a === 'grab') {
    if (b.holder === r.id || (b.passT > game.t) || Math.hypot(r.tx - b.x, r.ty + 1 - b.y, r.tz - b.z) > 3.5) return;
    if (!b.holder || typeof b.holder === 'number') { if (!b.holder || Math.random() < 0.5) qGive(game, b, r.id, 0); }
  } else if (m.a === 'throw' && b.holder === r.id && Array.isArray(m.d) && m.d.length === 3 && m.d.every(n => typeof n === 'number' && isFinite(n))) qThrowDir(game, b, r, m.d[0], m.d[1], m.d[2], r.id);
}
/* (a guest, every frame) close to the Quaffle: ask the host for it */
function quaffleReach(game) {
  if (MP.role !== 'guest' || !game.player.alive || game.qAsk > game.t) return;
  const pl = game.player;
  for (const e of game.entities) if (e.type === 'quaffle' && !e.removed && e.holder !== PROFILE.pid && Math.hypot(e.x - pl.x, e.y - (pl.y + 1), e.z - pl.z) < 1.8) { game.qAsk = game.t + 0.6; MP.send({ t: 'quaffle', a: 'grab', e: e.nid }); return; }
}
/* the score, at the top of the screen, while a match is on (on every iPad, read from the Quaffle) */
function qmatchHud(game) {
  const b = game.entities.find(e => e.type === 'quaffle' && !e.removed), pl = game.player;
  let d = el('qscore');
  if (!d) { d = document.createElement('div'); d.id = 'qscore'; d.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);padding:4px 12px;background:rgba(0,0,0,0.55);color:#fff;font:600 18px "Pixelify Sans",monospace;border-radius:6px;pointer-events:none;z-index:5;display:none;white-space:nowrap'; document.body.appendChild(d); }
  const show = !!b && onPitch(pl.x, pl.y, pl.z, 1.8);
  if (!show) { if (d.style.display !== 'none') d.style.display = 'none'; game.qPrev = null; return; }
  const info = MP.role === 'guest' ? qDecode(b.qx | 0) : { home: game.qm.home, away: game.qm.away, s: game.qm.score.slice() };
  const txt = HOUSES[info.home].name + ' ' + info.s[0] * 10 + '  -  ' + info.s[1] * 10 + ' ' + HOUSES[info.away].name + (quaffleHeld(game) ? '   (you have the Quaffle!)' : '');
  if (d.textContent !== txt) d.textContent = txt;
  d.style.display = '';
  const prev = game.qPrev;
  if (prev && (info.s[0] > prev[0] || info.s[1] > prev[1])) { bigText('GOAL!', 1.2); sfx('goalCheer', pl.x, pl.y + 1, pl.z); }
  game.qPrev = info.s;
}
/* (the Quaffle's number in the creature list: who has it, the score and the teams) */
function qEncode(e) {
  const qm = game.qm, kind = !e.holder ? 0 : typeof e.holder === 'string' ? 3 : e.team === 0 ? 1 : 2;
  return qm ? kind | (Math.min(255, qm.score[0]) << 2) | (Math.min(255, qm.score[1]) << 10) | (qm.home << 18) | (qm.away << 20) : 0;
}
const qDecode = x => ({ kind: x & 3, s: [(x >> 2) & 255, (x >> 10) & 255], home: (x >> 18) & 3, away: (x >> 20) & 3 });

/* ---- drawing: a player's broomstick under them ---- */
const _qb = M4.create();
function drawMobBroom(e, dx, dy, dz) {
  const m = MODELS.broom;
  M4.identity(_qb);
  M4.translate(_qb, _qb, dx, dy - 0.05, dz);
  M4.rotY(_qb, _qb, e.bodyYaw + Math.PI);
  M4.scale(_qb, _qb, m.scale, m.scale, m.scale);
  drawModel(m, _qb, null);
}
