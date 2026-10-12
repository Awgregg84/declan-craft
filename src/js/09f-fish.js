/* ===================== Fish and fishing ===================== */
// Cod, salmon, tropical fish and pufferfish swim about in the water, and flop about if they end up on land. A
// pufferfish puffs up when someone comes close, and stings with poison. A fishing rod casts a bobber; when it
// dips under the water with a splash, tap again to reel in a fish (or sometimes treasure, or junk).
const TROPICAL_COLORS = ['#f08a1a', '#3a8ae8', '#e83a8a', '#3ad84a', '#f0e030', '#8a3ae8'];

/* ---- fish ---- */
function updateFish(game, e, d, dt) {
  const w = game.world, bx = Math.floor(e.x), bz = Math.floor(e.z);
  liquidAt(w, e);
  const inW = w.getBlock(bx, Math.floor(e.y + e.h * 0.5), bz) === B.WATER;
  if (inW) {
    e.dryT = 0;
    e.aiT -= dt;
    if (e.panic > 0) e.panic -= dt;
    if (e.aiT <= 0 || e.collidedH) { e.yaw = Math.random() * TAU; e.swimUp = randRange(-0.7, 0.7); e.aiT = e.panic > 0 ? randRange(0.4, 1) : randRange(1.5, 4.5); }
    let mx = -Math.sin(e.yaw), mz = -Math.cos(e.yaw);
    const ay = Math.floor(e.y + e.h * 0.5);
    if (w.getBlock(Math.floor(e.x + mx * 0.8), ay, Math.floor(e.z + mz * 0.8)) !== B.WATER) {   // the edge of the water: turn round
      e.yaw += Math.PI * randRange(0.6, 1.4); mx = -Math.sin(e.yaw); mz = -Math.cos(e.yaw); e.aiT = randRange(1, 2.5);
    }
    let vyT = e.swimUp || 0;
    if (w.getBlock(bx, Math.floor(e.y + e.h + 0.25), bz) !== B.WATER) vyT = Math.min(vyT, -0.4);   // keep under the surface
    if (w.getBlock(bx, Math.floor(e.y - 0.2), bz) !== B.WATER) vyT = Math.max(vyT, 0.2);
    const sp = d.speed * (e.panic > 0 ? 2.4 : 1) * (e.frozen > 0 ? 0 : 1) * mobSpeedFx(e), k = Math.min(1, 3 * dt);
    e.vx += (mx * sp - e.vx) * k; e.vz += (mz * sp - e.vz) * k; e.vy += (vyT - e.vy) * k;
    moveEntity(w, e, e.vx * dt, e.vy * dt, e.vz * dt);   // (no gravity in water)
    e.fallDist = 0; e.onGround = false;
  } else {   // flopping about on land, and drying out
    physicsStep(w, e, dt, 24);
    if (e.onGround) { const f = Math.pow(0.05, dt); e.vx *= f; e.vz *= f; }
    e.dryT = (e.dryT || 0) + dt;
    if (e.onGround && Math.random() < dt * 2.5) { e.vy = 4.5; e.vx = randRange(-1.5, 1.5); e.vz = randRange(-1.5, 1.5); e.yaw = Math.random() * TAU; sfx('fishFlop', e.x, e.y, e.z, 0.5); }
    if (e.dryT > 1.5) { e.dryT -= 1.5; hurtMob(game, e, 1, e.x, e.z, 'drown', undefined, { nokb: true }); }
    e.fallDist = 0;
  }
  if (d.puffs) pufferTick(game, e, dt);
  const hs = Math.hypot(e.vx, e.vz);
  if (hs > 0.05) e.bodyYaw = approachAngle(e.bodyYaw, Math.atan2(-e.vx, -e.vz), dt * 5);
  e.headYaw = e.bodyYaw;
  e.walk += dt * (2 + hs * 3); e.walkAmt = 1;
  e.pitch = clamp(-Math.atan2(e.vy, hs + 0.2) * 0.6, -0.6, 0.6);
  const pd = nearestPlayerDist(game, e);
  if (pd > 72 || (pd > 40 && Math.random() < dt * 0.02) || e.y < -30) e.removed = true;
}
/* a pufferfish puffs up when anyone is close, and a puffed-up one stings whoever touches it */
function pufferTick(game, e, dt) {
  let near = null, nd = 2.6;
  for (const p of allPlayers(game)) {
    const remote = p !== game.player;
    if (!p.alive || (remote && !p.lastState)) continue;
    const px = remote ? p.tx : p.x, py = remote ? p.ty : p.y, pz = remote ? p.tz : p.z, d = Math.hypot(px - e.x, py + 0.9 - e.y, pz - e.z);
    if (d < nd) { nd = d; near = { p, remote, px, pz }; }
  }
  e.puff = clamp((e.puff || 0) + (near ? dt * 3 : -dt * 0.4), 0, 1);
  if (e.stingCd > 0) e.stingCd -= dt;
  if (near && e.puff > 0.6 && nd < 0.9 + e.puff * 0.5 && !(e.stingCd > 0)) {
    e.stingCd = 1.5;
    if (near.remote) { if (near.p.mode === 'survival') { MP.hurtRemote(near.p, 1, 'pufferfish', 0, 0, 0); if (near.p.link) near.p.link.send({ t: 'eff', k: potionByKey('poison'), s: 0.15 }); } }
    else if (game.mode === 'survival') { near.p.damage(1, 'pufferfish', e, e.x, e.z); giveEffect(near.p, 'poison', 7); }
  }
}
/* schools of fish turn up in water near players */
function fishSpawnTick(game) {
  const w = game.world, players = allPlayers(game).filter(p => p.alive && (p === game.player || p.lastState));
  if (!players.length) return;
  let n = 0;
  for (const e of game.entities) if (e.mob && !e.dead && MOB_DEFS[e.type].fish) n++;
  if (n >= 8 * Math.min(2, players.length) || Math.random() > 0.5) return;
  const pl = players[randInt(0, players.length - 1)], px = pl === game.player ? pl.x : pl.tx, py = pl === game.player ? pl.y : pl.ty, pz = pl === game.player ? pl.z : pl.tz;
  for (let a = 0; a < 6; a++) {
    const ang = Math.random() * TAU, dist = randRange(8, 28), x = Math.floor(px + Math.cos(ang) * dist), z = Math.floor(pz + Math.sin(ang) * dist);
    for (let y = Math.min(WH - 2, Math.floor(py + 8)), k = 0; k < 28 && y - k > 1; k++) {
      const yy = y - k, b = w.getBlock(x, yy, z);
      if (b === B.UNLOADED || (SOLID[b] && b !== B.ICE)) break;
      if (b !== B.WATER || w.getBlock(x, yy - 1, z) !== B.WATER) continue;
      const r = Math.random(), type = r < 0.5 ? 'cod' : r < 0.75 ? 'salmon' : r < 0.88 ? 'tropical' : 'pufferfish';
      const count = type === 'pufferfish' ? 1 : type === 'tropical' ? randInt(1, 3) : randInt(2, 4), variant = randInt(0, TROPICAL_COLORS.length - 1);
      for (let i = 0; i < count; i++) {
        const sx = x + 0.5 + randRange(-0.8, 0.8), sz = z + 0.5 + randRange(-0.8, 0.8);
        if (w.getBlock(Math.floor(sx), yy - 1, Math.floor(sz)) === B.WATER) spawnMob(game, type, sx, yy - 0.8, sz, { variant });
      }
      return;
    }
  }
}

/* ---- fishing ---- */
/* tap with a rod: cast the bobber, or reel it back in (with a fish, if one has just bitten) */
function useRod(game, pl, creative) {
  const b = pl.bobber;
  if (b && !b.removed) { reelIn(game, pl, b, creative); return; }
  const [dx, dy, dz] = pl.lookDir(), [ex, ey, ez] = pl.eyePos();
  const e = new Entity('bobber', ex + dx * 0.6, ey - 0.1 + dy * 0.6, ez + dz * 0.6);
  e.w = 0.1; e.h = 0.15; e.vx = dx * 13; e.vy = dy * 13 + 3; e.vz = dz * 13; e.state = 'fly'; e.biteT = 0;
  e.lure = enchLvl(pl.held(), 'lure'); e.luck = enchLvl(pl.held(), 'luck_of_the_sea');
  e.waitT = fishWait(e);
  game.entities.push(e);
  pl.bobber = e;
  sfx('cast', pl.x, pl.y + 1.5, pl.z);
}
const fishWait = e => Math.max(2, randRange(5, 22) - e.lure * 4);
function reelIn(game, pl, b, creative) {
  b.removed = true; pl.bobber = null;
  sfx('reel', pl.x, pl.y + 1.5, pl.z);
  if (b.state !== 'water' || !(b.biteT > 0)) return;   // nothing on the line
  const loot = fishingLoot(b.luck), e = dropItem(game, b.x, b.y + 0.3, b.z, loot.id, loot.count, false, loot);
  if (e) {   // it jumps out of the water and flies in to you
    e.vx = (pl.x - b.x) * 0.5; e.vz = (pl.z - b.z) * 0.5; e.vy = 7; e.pickup = 0; e.reel = 2;
  }
  dropXp(game, pl.x, pl.y + 0.5, pl.z, randInt(1, 6));
  if (!creative) pl.damageTool(1);
  game.stats.fish = (game.stats.fish || 0) + 1;
  if (!game.tipped) game.tipped = {};
  if (!game.tipped.fish) { game.tipped.fish = 1; toast('You caught ' + (loot.tag && loot.tag.book ? 'a book' : itemName(loot.id).replace(/^Raw /, 'a ')) + '!', 2.5); }
}
/* what comes up on the line: mostly fish, sometimes treasure (more with Luck of the Sea), sometimes junk */
function fishingLoot(luck) {
  const r = Math.random(), treasure = 0.05 + luck * 0.021, junk = Math.max(0.01, 0.1 - luck * 0.025);
  if (r < treasure) {
    const k = randInt(0, 5);
    if (k === 0) return { id: I.BOW, count: 1, dmg: randInt(0, 150), tag: { ench: randomEnch('bow') } };
    if (k === 1) return { id: I.FISHING_ROD, count: 1, dmg: randInt(0, 30), tag: { ench: randomEnch('rod') } };
    if (k === 2) return { id: I.WRITTEN_BOOK, count: 1, tag: randomStoryBook() };
    if (k === 3) return { id: I.EMERALD, count: randInt(1, 2) };
    if (k === 4) return { id: I.LAPIS, count: randInt(2, 5) };
    return { id: I.XP_BOTTLE, count: 1 };
  }
  if (r < treasure + junk) {
    const k = randInt(0, 5);
    if (k === 0) return { id: armorId(0, 3), count: 1, dmg: randInt(10, 50) };   // an old boot!
    return { id: [I.STICK, I.STRING, I.ROTTEN_FLESH, I.GLASS_BOTTLE, I.LEATHER][k - 1], count: 1 };
  }
  const f = Math.random();
  return { id: f < 0.6 ? I.COD : f < 0.85 ? I.SALMON : f < 0.87 ? I.TROPICAL_FISH : I.PUFFERFISH, count: 1 };
}
/* one or two enchantments for treasure from the sea */
function randomEnch(kind) {
  const pool = Object.keys(ENCH).filter(k => ENCH[k].on.includes(kind)), out = [];
  for (let i = 0; i < 2 && pool.length; i++) {
    if (i && Math.random() < 0.5) break;
    const k = pool.splice(randInt(0, pool.length - 1), 1)[0];
    if (out.some(q => ENCH[q[0]].not === k || ENCH[k].not === q[0])) continue;
    out.push([k, randInt(1, ENCH[k].max)]);
  }
  return out;
}
function updateBobber(game, e, dt) {
  const w = game.world, pl = game.player;
  if (pl.bobber !== e || !pl.alive || pl.heldId() !== I.FISHING_ROD || (pl.riding && pl.riding.type !== 'boat') || Math.hypot(pl.x - e.x, pl.y - e.y, pl.z - e.z) > 32 || game.state !== 'playing') {
    e.removed = true; if (pl.bobber === e) pl.bobber = null;
    return;
  }
  const bx = Math.floor(e.x), bz = Math.floor(e.z), here = w.getBlock(bx, Math.floor(e.y), bz);
  if (e.state === 'fly') {
    if (here === B.WATER) { e.state = 'water'; e.vx *= 0.2; e.vz *= 0.2; e.vy = 0; sfx('splash', e.x, e.y, e.z, 0.5); splashBits(e.x, e.y + 0.1, e.z, 6); }
    else {
      physicsStep(w, e, dt, 16);
      if (e.onGround || e.collidedH) e.state = 'ground';
    }
    return;
  }
  if (e.state === 'ground') { if (here === B.WATER) e.state = 'water'; else { physicsStep(w, e, dt, 16); e.vx = e.vz = 0; } return; }
  // in the water: float at the top, and wait for a bite
  let top = Math.floor(e.y);
  while (w.getBlock(bx, top + 1, bz) === B.WATER && top < WH - 1) top++;
  if (w.getBlock(bx, top, bz) !== B.WATER) { e.state = 'ground'; return; }
  const surf = top + 0.82, dip = e.biteT > 0 ? -0.3 : 0;
  e.x += e.vx * dt; e.z += e.vz * dt; e.vx *= Math.pow(0.1, dt); e.vz *= Math.pow(0.1, dt);
  e.y += (surf + dip + Math.sin(e.age * 3) * 0.03 - e.y) * Math.min(1, dt * 8);
  if (e.biteT > 0) {
    e.biteT -= dt;
    if (e.biteT <= 0) e.waitT = fishWait(e);   // too slow: it got away
    return;
  }
  e.waitT -= dt;
  if (e.waitT < 1.6 && Math.random() < dt * 8) {   // something swimming up to it
    const a = Math.random() * TAU, d = e.waitT * 1.5 + 0.3;
    PARTICLES.push({ x: e.x + Math.cos(a) * d, y: surf - 0.05, z: e.z + Math.sin(a) * d, vx: 0, vy: 0.3, vz: 0, life: 0.5, tile: TILE.bubble_p, u: 0, v: 0, us: 16, size: 0.05, grav: 0, bright: 1 });
  }
  if (e.waitT <= 0) {   // a bite! the bobber goes under
    e.biteT = 1.3;
    sfx('fishBite', e.x, e.y, e.z); splashBits(e.x, surf, e.z, 12);
  }
}
function splashBits(x, y, z, n) {
  for (let i = 0; i < n && PARTICLES.length < 1550; i++) PARTICLES.push({ x, y, z, vx: randRange(-1.2, 1.2), vy: randRange(1, 3), vz: randRange(-1.2, 1.2), life: randRange(0.3, 0.6), tile: TILE.bubble_p, u: 0, v: 0, us: 16, size: 0.05, grav: 10, bright: 1 });
}

/* ---- drawing the line and the bobber ---- */
const _bb = M4.create();
let LINE_BUF = null, LINE_VAO = null;
function drawFishingLines(game, s, cam) {
  const list = [];
  const pl = game.player, b = pl.bobber;
  if (b && !b.removed) list.push([rodTip(pl, game.view === 0), [b.x, b.y, b.z]]);
  for (const r of MP.remotes.values()) if (r.has && r.alive && r.bobberAt) list.push([rodTip(r, false), r.bobberAt]);
  if (!list.length) return;
  const P = PROG.entity;
  entityBegin(texTiles);
  gl.disable(gl.CULL_FACE);
  for (const [, q] of list) {
    gl.uniform1f(P.u.uBright, brightAt(game.world, q[0], q[1] + 0.2, q[2], s));
    M4.identity(_bb);
    M4.translate(_bb, _bb, q[0] - cam.x, q[1] - cam.y, q[2] - cam.z);
    M4.rotY(_bb, _bb, cam.yaw);
    M4.scale(_bb, _bb, 0.25 / 16, 0.25 / 16, 0.25 / 16);
    M4.translate(_bb, _bb, 0, -6, 0);
    drawMesh(tileMesh('bobber'), _bb);
  }
  // the lines: a little slack, sagging in the middle. Each bit is a thin strip turned to face us (GL lines are
  // only one pixel wide, which is hard to see on an iPad)
  if (!LINE_BUF) { LINE_BUF = gl.createBuffer(); LINE_VAO = gl.createVertexArray(); gl.bindVertexArray(LINE_VAO); gl.bindBuffer(gl.ARRAY_BUFFER, LINE_BUF); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); }
  const N = 14, f = new Float32Array(list.length * N * 18), px = 0.8 * Math.tan(cam.fov / 2) / (R.height / R.dpr / 2);   // (half a strip's width, a block away)
  let o = 0;
  for (const [a, q] of list) {
    const sag = Math.min(1.2, Math.hypot(q[0] - a[0], q[2] - a[2]) * 0.06);
    const at = t => [a[0] + (q[0] - a[0]) * t - cam.x, a[1] + (q[1] + 0.1 - a[1]) * t - sag * 4 * t * (1 - t) - cam.y, a[2] + (q[2] - a[2]) * t - cam.z];
    for (let i = 0; i < N; i++) {
      const A = at(i / N), Bp = at((i + 1) / N), d = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]], m = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2, (A[2] + Bp[2]) / 2];
      const sx = d[1] * m[2] - d[2] * m[1], sy = d[2] * m[0] - d[0] * m[2], sz = d[0] * m[1] - d[1] * m[0], sl = Math.hypot(sx, sy, sz) || 1, h = px * Math.hypot(m[0], m[1], m[2]) / sl;
      const s0 = [A[0] - sx * h, A[1] - sy * h, A[2] - sz * h], s1 = [A[0] + sx * h, A[1] + sy * h, A[2] + sz * h], s2 = [Bp[0] + sx * h, Bp[1] + sy * h, Bp[2] + sz * h], s3 = [Bp[0] - sx * h, Bp[1] - sy * h, Bp[2] - sz * h];
      for (const v of [s0, s1, s2, s0, s2, s3]) { f.set(v, o); o += 3; }
    }
  }
  const L = PROG.line;
  gl.useProgram(L.p);
  gl.uniformMatrix4fv(L.u.uViewProj, false, R.vp);
  gl.uniform3f(L.u.uOffset, 0, 0, 0);
  gl.uniform4f(L.u.uColor, 0.12, 0.12, 0.12, 1);
  gl.bindVertexArray(LINE_VAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, LINE_BUF);
  gl.bufferData(gl.ARRAY_BUFFER, f, gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, o / 3);
  gl.bindVertexArray(null);
  entityBegin(texSkins);
}
/* where the end of someone's rod is (seen from their own eyes in first person, or from outside) */
function rodTip(p, firstPerson) {
  if (firstPerson) {   // the tip of the rod drawn in the hand (which has its own view), moved out into the world
    const cam = GAME_CAM, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const fw = [-sy * cp, sp, -cy * cp], rt = [cy, 0, -sy], up = [sy * sp, cp, cy * sp];
    const t = R.rodTip || [0.6, -0.2, -1], k = Math.tan(cam.fov / 2) / Math.tan(35 * Math.PI / 180);
    return [0, 1, 2].map(i => [cam.x, cam.y, cam.z][i] + rt[i] * t[0] * k + up[i] * t[1] * k - fw[i] * t[2]);
  }
  if (p.rodTipW && p.rodTipW[3] === game.t) return p.rodTipW;   // the rod as drawn this frame
  const yaw = p.yaw, by = p.bodyYaw;   // (the rod is in the right hand)
  return [p.x - Math.sin(yaw) * 1.1 + Math.cos(by) * 0.35, p.y + 2.1 + Math.sin(p.pitch) * 0.8, p.z - Math.cos(yaw) * 1.1 - Math.sin(by) * 0.35];
}
