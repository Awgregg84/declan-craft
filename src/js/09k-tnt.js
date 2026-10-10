/* ===================== TNT of every kind ===================== */
// Normal, Mega (a much bigger blast), Ice (freezes instead of breaking), Digging (bores a tunnel the way
// its drill faces), Party (confetti and a big bounce, nothing broken) and Cluster (a blast that throws
// out little TNTs). Only a single player or the host sets them off; guests see the results.
const TNT_KINDS = ['normal', 'mega', 'ice', 'dig', 'party', 'cluster'];
const TNT_BLOCK = { normal: B.TNT, mega: B.MEGA_TNT, ice: B.ICE_TNT, dig: B.DIG_TNT, party: B.PARTY_TNT, cluster: B.CLUSTER_TNT };
const TNT_FUSE = 4;
const tntKindOf = id => (BLOCKS[id] && BLOCKS[id].tnt) || null;
/* the direction a facing block points: data 0-3 around, 4 up, 5 down (dispensers and Digging TNT) */
function facingFace(data) { const f = data & 7; return f === 4 ? 2 : f === 5 ? 3 : FRONT_FACE[f & 3]; }

/* light the TNT block at x, y, z, whatever kind it is */
function igniteTNT(game, x, y, z, fuse) {
  const w = game.world, id = w.getBlock(x, y, z), kind = tntKindOf(id);
  if (!kind) return null;
  const data = w.getData(x, y, z);
  w.setBlock(x, y, z, B.AIR, 0, true);
  return primeTNT(game, x, y, z, fuse === undefined ? TNT_FUSE : fuse, kind, data);
}
function tntGoesOff(game, e) {
  const x = e.x, y = e.y + (e.small ? 0.25 : 0.5), z = e.z;
  switch (e.kind) {
    case 'mega': explode(game, x, y, z, 7); break;
    case 'ice': iceBlast(game, x, y, z); break;
    case 'dig': startDigging(game, e); break;
    case 'party': partyBlast(game, x, y, z); break;
    case 'cluster': clusterBlast(game, x, y, z); break;
    default: explode(game, x, y, z, e.small ? 2 : 4);
  }
}

/* ---- Ice TNT: water turns to ice, lava to obsidian, grass to snow; creatures freeze; nothing breaks ---- */
function iceBlast(game, x, y, z) {
  const w = game.world, R = 6, cx = Math.floor(x), cy = Math.floor(y), cz = Math.floor(z);
  iceEffect(x, y, z);
  MP.fx('ice', x, y, z);
  for (let dy = -R; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    if (Math.hypot(dx, dy, dz) > R + randRange(-0.7, 0.3)) continue;
    const bx = cx + dx, by = cy + dy, bz = cz + dz, b = w.getBlock(bx, by, bz);
    if (b === B.WATER) w.setBlock(bx, by, bz, B.ICE, 0, true);
    else if (b === B.LAVA) w.setBlock(bx, by, bz, (w.getData(bx, by, bz) & 7) === 0 ? B.OBSIDIAN : B.COBBLE, 0, true);
    else if (b === B.GRASS) w.setBlock(bx, by, bz, B.SNOWY_GRASS, 0, true);
  }
  const hit = (e, p) => {
    const d = Math.hypot(e.x - x, e.y + 0.9 - y, e.z - z);
    if (d > R) return false;
    const l = d || 1;
    e.vx += (e.x - x) / l * 3; e.vz += (e.z - z) / l * 3;
    return true;
  };
  for (const e of game.entities) if (e.mob && !e.dead && !e.proxy && hit(e)) { if (e.type === 'magma' || e.type === 'ghast') hurtMob(game, e, 4, x, z, 'ice'); e.frozen = 6; }
  const pl = game.player;
  if (pl.alive && hit(pl)) pl.chill = 5;
  if (MP.role === 'host') for (const r of MP.remotes.values()) if (r.alive && r.lastState && Math.hypot(r.tx - x, r.ty + 0.9 - y, r.tz - z) < R) MP.hurtRemote(r, 0, 'ice', 0, 0, 0);
  game.shake = Math.max(game.shake || 0, 0.25);
}
function iceEffect(x, y, z) {
  sfx('iceBlast', x, y, z);
  for (let i = 0; i < 90 && PARTICLES.length < 1700; i++) {
    const a = Math.random() * TAU, b = randRange(-1, 1), sp = randRange(2, 9), c = Math.sqrt(1 - b * b);
    PARTICLES.push({ x, y, z, vx: Math.cos(a) * c * sp, vy: b * sp + 2, vz: Math.sin(a) * c * sp, life: randRange(0.8, 2), tile: TILE.snowflake, u: 0, v: 0, us: 16, size: randRange(0.06, 0.13), grav: 2, bright: 1 });
  }
  smokeParticles(x, y, z, 20, 2, true);
}

/* ---- Party TNT: confetti, fireworks and a big bounce for everyone near; sheep change colour ---- */
function partyBlast(game, x, y, z) {
  partyEffect(x, y, z);
  MP.fx('party', x, y, z);
  const R = 8;
  for (const e of game.entities) {
    if (!e.mob || e.dead || e.proxy || Math.hypot(e.x - x, e.y - y, e.z - z) > R) continue;
    e.vy = randRange(10, 14); e.vx += randRange(-2, 2); e.vz += randRange(-2, 2); e.partyT = 5;
    if (e.type === 'sheep') { e.wool = randInt(0, 15); e.color = hexRGB(WOOL_COLORS[e.wool]).map(v => v / 255); }
    if (e.angryT > 0) e.angryT = 0;   // nobody stays cross at a party
  }
  const pl = game.player;
  if (pl.alive && !pl.riding && Math.hypot(pl.x - x, pl.y - y, pl.z - z) < R) { pl.vy = 14; pl.vx += randRange(-1, 1); pl.vz += randRange(-1, 1); pl.partyT = 5; pl.onGround = false; }
  if (MP.role === 'host') for (const r of MP.remotes.values()) if (r.alive && r.lastState && !r.riding && Math.hypot(r.tx - x, r.ty - y, r.tz - z) < R) MP.hurtRemote(r, 0, 'party', randRange(-1, 1), 14, randRange(-1, 1));
}
const CONFETTI = ['spark_red', 'spark_green', 'spark_blue', 'spark_yellow', 'spark_pink'];
function partyEffect(x, y, z) {
  sfx('partyPop', x, y, z);
  for (let i = 0; i < 160 && PARTICLES.length < 1800; i++) {
    const a = Math.random() * TAU, sp = randRange(1, 7);
    PARTICLES.push({ x, y: y + 0.3, z, vx: Math.cos(a) * sp, vy: randRange(5, 13), vz: Math.sin(a) * sp, life: randRange(1.5, 3.2), tile: TILE[CONFETTI[i % 5]], u: 0, v: 0, us: 16, size: randRange(0.05, 0.09), grav: 6, bright: 1 });
  }
  for (let k = 0; k < 3; k++) {   // three fireworks overhead
    const fx = x + randRange(-4, 4), fy = y + randRange(7, 11), fz = z + randRange(-4, 4), col = TILE[CONFETTI[randInt(0, 4)]];
    for (let i = 0; i < 40 && PARTICLES.length < 1900; i++) {
      const a = Math.random() * TAU, b = randRange(-1, 1), c = Math.sqrt(1 - b * b), sp = randRange(3, 5);
      PARTICLES.push({ x: fx, y: fy, z: fz, vx: Math.cos(a) * c * sp, vy: b * sp, vz: Math.sin(a) * c * sp, life: randRange(0.8, 1.4), tile: col, u: 0, v: 0, us: 16, size: 0.08, grav: 1.5, bright: 1 });
    }
  }
}

/* ---- Cluster TNT: a blast that throws out six little TNTs ---- */
function clusterBlast(game, x, y, z) {
  explode(game, x, y, z, 2.5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + randRange(-0.3, 0.3), sp = randRange(4, 7);
    const t = primeTNT(game, x - 0.5, y - 0.25, z - 0.5, randRange(1, 1.8), 'normal');
    t.small = true; t.w = 0.25; t.h = 0.5;
    t.vx = Math.cos(a) * sp; t.vz = Math.sin(a) * sp; t.vy = randRange(6, 9);
  }
}

/* ---- Digging TNT: a row of small blasts, one slice at a time, boring a 3x3 tunnel 16 blocks long ---- */
function startDigging(game, e) {
  const f = facingFace(e.dir | 0), w = game.world;
  sfx('explode', e.x, e.y + 0.5, e.z, 0.6);
  smokeParticles(e.x, e.y + 0.5, e.z, 16, 0.8, true);
  if (MP.role === 'host') MP.outFx.push(['boom', r2(e.x), r2(e.y + 0.5), r2(e.z), 1]);
  w.diggers.push({ x: Math.floor(e.x), y: Math.floor(e.y + 0.5), z: Math.floor(e.z), f, step: 0, t: 0 });
}
function tickDiggers(game, dt) {
  const w = game.world;
  if (!w.diggers.length) return;
  for (const d of w.diggers) {
    d.t -= dt;
    if (d.t > 0) continue;
    d.t = 0.08;
    const dx = DX[d.f], dy = DY[d.f], dz = DZ[d.f];
    // two directions across the tunnel; a sideways tunnel has its floor level with where the TNT stood
    const ux = dy !== 0 ? 1 : 0, uy = dy !== 0 ? 0 : 1, vx = dz !== 0 ? 1 : 0, vz = dz !== 0 ? 0 : 1;
    const cx = d.x + dx * d.step, cy = d.y + dy * d.step + (dy === 0 ? 1 : 0), cz = d.z + dz * d.step;
    let hard = 0;
    w.beginBlast();
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const bx = cx + ux * a + vx * b, by = cy + uy * a, bz = cz + vz * b;
      const id = w.getBlock(bx, by, bz);
      if (!id || id === B.UNLOADED || LIQUID[id]) continue;
      if (BLOCKS[id].blast >= 1e9 || BLOCKS[id].hardness < 0) { hard++; continue; }
      if (tntKindOf(id)) { igniteTNT(game, bx, by, bz, randRange(0.5, 1.2)); continue; }
      w.setBlock(bx, by, bz, B.AIR, 0, true);
      if (Math.random() < 0.35) blockParticles(bx, by, bz, id, 4, true);
      if (game.mode === 'survival' && (/ ore$/i.test(BLOCKS[id].name) || Math.random() < 0.2)) for (const [did, n] of blockDrops(id, toolId(3, 0))) dropForNearest(game, bx + 0.5, by + 0.5, bz + 0.5, did, n);   // ores always
    }
    w.endBlast();
    if (d.step % 2 === 0) { sfx('digBoom', cx + 0.5, cy + 0.5, cz + 0.5); smokeParticles(cx + 0.5, cy + 0.5, cz + 0.5, 4, 0.8, true); if (MP.role === 'host') MP.fx('smoke', cx + 0.5, cy + 0.5, cz + 0.5); }
    for (const e of game.entities) if (e.mob && !e.dead && Math.abs(e.x - (cx + 0.5)) < 1.8 && Math.abs(e.z - (cz + 0.5)) < 1.8 && Math.abs(e.y + e.h / 2 - (cy + 0.5)) < 2) hurtMob(game, e, 3, cx + 0.5 - dx, cz + 0.5 - dz, 'explosion');
    d.step++;
    if (d.step > 16 || hard >= 6) d.done = true;
  }
  w.diggers = w.diggers.filter(d => !d.done);
}

/* ---- drawing a lit TNT block (it swells and flashes just before it goes) ---- */
function drawTNT(e, dx, dy, dz, eb) {
  const P = PROG.entity, size = e.small ? 0.5 : 1, grow = e.fuse < 0.4 ? 1 + (0.4 - e.fuse) * 0.4 : 1, s = size * grow / 16;
  M4.translate(eb, eb, dx, dy, dz);
  M4.scale(eb, eb, s, s, s);
  gl.uniform4f(P.u.uTint, 1, 1, 1, Math.floor(e.fuse * 5) % 2 === 0 ? 0.5 : 0);
  gl.enable(gl.CULL_FACE);
  drawMesh(itemMesh(TNT_BLOCK[e.kind] || B.TNT), eb);
  gl.disable(gl.CULL_FACE);
}
