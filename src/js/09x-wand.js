/* ===================== The magic wand ===================== */
// Hold the wand and tap to cast a spell. The Spell button (or F) picks the next spell:
//   Lumos lights up the dark around you (cast it again to put it out: Nox!).
//   Wingardium Leviosa makes a creature, a block or something on the ground float up in the air for a while.
//   Stupefy stuns a creature. Expelliarmus blasts it backwards (and an enderman drops what it is carrying).
//   Accio brings a creature, a block or something on the ground flying to you.
//   Expecto Patronum sends a silver stag galloping off, chasing monsters away.
// Spells are shot like arrows (the host decides what they hit) and never hurt anybody.
const SPELLS = [
  { key: 'lumos', name: 'Lumos', tile: 'spark_yellow' },
  { key: 'leviosa', name: 'Wingardium Leviosa', tile: 'spark_blue' },
  { key: 'stupefy', name: 'Stupefy', tile: 'spark_red' },
  { key: 'expelliarmus', name: 'Expelliarmus', tile: 'spark_yellow' },
  { key: 'accio', name: 'Accio', tile: 'spark_pink' },
  { key: 'patronum', name: 'Expecto Patronum', tile: 'snowflake' },
];   // (new spells go on the end: playing together sends their numbers)
const SPELL_PATRONUS = 5;
const spellOf = e => SPELLS[clamp(e.pk | 0, 0, SPELLS.length - 1)];

/* the Spell button (or F): the next spell */
function nextSpell(game) {
  const pl = game.player;
  if (pl.heldId() !== I.WAND) return;
  pl.spell = ((pl.spell | 0) + 1) % SPELLS.length;
  showSpell(pl, true);
  sfx('click');
}
function showSpell(pl, say) {
  const s = SPELLS[pl.spell | 0], b = el('tb-spell');
  b.textContent = s.name.split(' ').pop(); b.setAttribute('aria-label', 'Spell: ' + s.name + '. Tap for the next spell.');
  if (say) showItemName(s.name);
}
/* the wand in your hand (or not): the Spell button shows, and Lumos goes out when you put it away */
function wandHeld(pl, id) {
  el('tb-spell').hidden = id !== I.WAND;
  if (id === I.WAND) showSpell(pl, false);
  else if (pl.lumos) { pl.lumos = false; sfx('lumosOff', pl.x, pl.y + 1.5, pl.z); }
}
/* tap with the wand: cast the spell (returns how long until the next one) */
function castSpell(game, pl) {
  const sp = SPELLS[pl.spell | 0];
  pl.swing();
  if (sp.key === 'lumos') {
    pl.lumos = !pl.lumos;
    sfx(pl.lumos ? 'lumosOn' : 'lumosOff', pl.x, pl.y + 1.5, pl.z);
    showItemName(pl.lumos ? 'Lumos!' : 'Nox!');
    return 0.4;
  }
  if (sp.key === 'patronum') {
    if (pl.patronusT > game.t) { toast('Your Patronus is still out there. Wait a moment!', 2); return 0.3; }
    pl.patronusT = game.t + 6;
    showItemName('Expecto Patronum!');
    playerShoot(game, 'spell', 1, { pk: SPELL_PATRONUS, noGhost: true, snd: 'patronus' });   // (the host makes the stag)
    sfx('patronus', pl.x, pl.y + 1.5, pl.z);
    return 1;
  }
  showItemName(sp.name + '!');
  playerShoot(game, 'spell', 32, { pk: pl.spell | 0, snd: 'spellCast' });
  sfx('spellCast', pl.x, pl.y + 1.5, pl.z);
  return 0.45;
}
function spellBurst(x, y, z, tile, n) {
  for (let i = 0; i < n && PARTICLES.length < 1550; i++) {
    PARTICLES.push({ x, y, z, vx: randRange(-2.5, 2.5), vy: randRange(-1.5, 2.5), vz: randRange(-2.5, 2.5), life: randRange(0.3, 0.7), tile: TILE[tile], u: 0, v: 0, us: 16, size: randRange(0.04, 0.08), grav: 0, bright: 1 });
  }
}
/* where whoever cast a spell is (this player, or someone on another iPad) */
function spellCaster(owner) {
  if (owner === 'me') { const p = game.player; return { x: p.x, y: p.y, z: p.z, me: true }; }
  const r = MP.remotes.get(owner);
  return r ? { x: r.tx, y: r.ty, z: r.tz, mode: r.mode, r } : null;
}
/* a spell hit something (the host or a one-player game decides) */
function spellHit(game, e, x, y, z, nx, ny, nz, ent, blk) {
  const sp = spellOf(e), w = game.world, m = ent && !ent.player ? ent.o : null, who = spellCaster(e.owner);
  spellBurst(x, y, z, sp.tile, 16);
  sfx('spellHit', x, y, z);
  MP.fxId('spell', x, y, z, SPELLS.indexOf(sp));
  if (m && MOB_DEFS[m.type].spirit) return;
  if (sp.key === 'stupefy' && m) { m.frozen = Math.max(m.frozen || 0, 5); m.stun = 5; m.fuse = 0; m.vx = nx * 3; m.vz = nz * 3; }
  if (sp.key === 'expelliarmus' && m) {
    m.vx = nx * 14; m.vz = nz * 14; m.vy = 8; m.fuse = 0; m.knockT = 0.6;
    if (m.carry) {   // (an enderman drops the block it carried: on the iPad of whoever cast the spell)
      if (who && who.r) MP.sendDrops(who.r, [dropEntry(m.carry, 1)], m.x, m.y + 2, m.z); else dropItem(game, m.x, m.y + 2, m.z, m.carry, 1);
      m.carry = 0;
    }
  }
  if (sp.key === 'leviosa') {
    if (m) { m.floatT = 5; m.floatY = m.y + 2.6; }
    else if (blk) floatBlock(game, blk.x, blk.y, blk.z);
    for (const it of game.entities) if (it.type === 'item' && !it.removed && Math.hypot(it.x - x, it.y - y, it.z - z) < 1.8) { it.floatT = 5; it.floatY = it.y + 2; }
  }
  if (sp.key === 'accio' && who) {
    const pull = (o, up) => { const dx = who.x - o.x, dz = who.z - o.z, l = Math.hypot(dx, dz) || 1, s = Math.min(14, 3 + l * 1.6); o.vx = dx / l * s; o.vz = dz / l * s; o.vy = up; o.knockT = 0.5; };
    if (m) pull(m, 7);
    else if (blk) accioBlock(game, blk.x, blk.y, blk.z, who);
    for (const it of game.entities) {
      if (it.type !== 'item' || it.removed || Math.hypot(it.x - x, it.y - y, it.z - z) >= 1.8) continue;
      if (who.me) { it.reel = 2; it.pickup = 0; }
      else { MP.sendDrops(who.r, [dropEntry(it.id, it.count, it)], who.x, who.y + 0.5, who.z, true); it.removed = true; }   // (into their bag, on their iPad)
    }
  }
}
/* the blocks a spell can lift or bring: plain solid ones, not containers, special blocks or bedrock */
const spellMovable = id => id && id !== B.UNLOADED && BLOCKS[id] && RENDER[id] === R_CUBE && SOLID[id] && !SPECIAL[id] && BLOCKS[id].hardness >= 0 && BLOCKS[id].blast < 1e9 &&
  ![B.CHEST, B.FURNACE, B.FURNACE_LIT, B.DISPENSER, B.BREWING_STAND, B.BEDROCK, B.NETHER_PORTAL, B.OBSIDIAN].includes(id) && !tntKindOf(id);
/* Wingardium Leviosa on a block: up it floats, and comes back down a while later */
function floatBlock(game, x, y, z) {
  const w = game.world, id = w.getBlock(x, y, z);
  if (!spellMovable(id)) return;
  w.setBlock(x, y, z, B.AIR, 0, true);
  const e = new Entity('falling', x + 0.5, y, z + 0.5);
  e.id = id; e.w = 0.49; e.h = 0.98; e.floatT = 4; e.floatY = y + 2.5;
  game.entities.push(e);
}
/* Accio on a block: out it pops, and flies to whoever called it (what it would drop, in Survival) */
function accioBlock(game, x, y, z, who) {
  const w = game.world, id = w.getBlock(x, y, z);
  if (!spellMovable(id)) return;
  w.setBlock(x, y, z, B.AIR, 0, true);
  sfx('break_' + SOUND_OF(id), x + 0.5, y + 0.5, z + 0.5);
  blockParticles(x, y, z, id, 10, true);
  MP.fxId('break', x, y, z, id);
  if ((who.me ? game.mode : who.mode) !== 'survival') return;
  const got = blockDrops(id, toolId(3, 0));   // (as if broken with a diamond pickaxe)
  if (!who.me) { MP.sendDrops(who.r, got.map(([d, n]) => dropEntry(d, n)), who.x, who.y + 0.5, who.z, true); return; }   // (someone on another iPad: into their bag there)
  for (const [d, n] of got) {
    const it = dropItem(game, x + 0.5, y + 0.5, z + 0.5, d, n);
    if (it) { it.reel = 2; it.pickup = 0; }
  }
}
/* something floating (a creature, a block or a dropped thing): it rises, and stays up until the spell wears off */
function floatTick(world, e, dt, grav) {
  if (!(e.floatT > 0)) return false;
  e.floatT -= dt;
  e.vy = clamp((e.floatY - e.y) * 3, -2, 3) + grav * (world.map === 'moon' ? MOON_G : 1) * dt;   // (gravity is taken off again in physicsStep)
  e.fallDist = 0;
  if (Math.random() < dt * 6 && PARTICLES.length < 1500) PARTICLES.push({ x: e.x + randRange(-0.4, 0.4), y: e.y + randRange(0, 0.6), z: e.z + randRange(-0.4, 0.4), vx: 0, vy: 0.3, vz: 0, life: 0.6, tile: TILE.spark_blue, u: 0, v: 0, us: 16, size: 0.04, grav: 0, bright: 1 });
  return true;
}

/* ---- Expecto Patronum: a silver stag ---- */
function summonPatronus(game, x, y, z, vx, vz) {
  const w = game.world, yaw = Math.atan2(-vx, -vz), sx = x - Math.sin(yaw) * 1.5, sz = z - Math.cos(yaw) * 1.5;
  let sy = Math.floor(y);
  for (let k = 0; k < 6 && sy > 1 && !SOLID[w.getBlock(Math.floor(sx), sy - 1, Math.floor(sz))]; k++) sy--;
  const e = spawnMob(game, 'patronus', sx, sy, sz, {});
  e.yaw = e.bodyYaw = e.headYaw = yaw; e.life = 7;
  spellBurst(sx, sy + 1, sz, 'snowflake', 30);
  return e;
}
function updatePatronus(game, e, dt) {
  const w = game.world;
  e.life = (e.life || 7) - dt;
  if (e.life <= 0) { e.removed = true; spellBurst(e.x, e.y + 0.8, e.z, 'snowflake', 30); return; }
  const sp = e.life > 1 ? 7 : 7 * e.life, fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
  // it gallops over the ground, and floats up over anything in its way (it is a spirit, after all)
  const nx = e.x + fx * sp * dt, nz = e.z + fz * sp * dt, bx = Math.floor(nx), bz = Math.floor(nz);
  let gy = Math.floor(e.y) + 3;
  while (gy > Math.floor(e.y) - 6 && gy > 1 && !SOLID[w.getBlock(bx, gy - 1, bz)]) gy--;
  e.x = nx; e.z = nz; e.y += (gy - e.y) * Math.min(1, dt * 8);
  e.vx = fx * sp; e.vz = fz * sp;
  e.walk += dt * 11; e.walkAmt = 1; e.bodyYaw = e.headYaw = e.yaw;
  if (Math.random() < dt * 25 && PARTICLES.length < 1500) PARTICLES.push({ x: e.x + randRange(-0.5, 0.5), y: e.y + randRange(0.2, 1.6), z: e.z + randRange(-0.5, 0.5), vx: 0, vy: 0.2, vz: 0, life: 0.8, tile: TILE.snowflake, u: 0, v: 0, us: 16, size: 0.05, grav: 0, bright: 1 });
  e.scareT = (e.scareT || 0) - dt;
  if (e.scareT > 0) return;
  e.scareT = 0.2;
  for (const m of game.entities) {   // monsters close to it are chased away
    if (!m.mob || m.dead || m.removed || m === e) continue;
    const d = MOB_DEFS[m.type];
    if (!(d.hostile || (d.neutral && !d.guard && m.angryT > 0))) continue;
    const dx = m.x - e.x, dz = m.z - e.z, dist = Math.hypot(dx, dz);
    if (dist > 6 || Math.abs(m.y - e.y) > 4) continue;
    const l = dist || 1;
    m.vx = dx / l * 9; m.vz = dz / l * 9; m.vy = Math.max(m.vy, 6); m.knockT = 0.4;
    m.fleeT = 8; m.panic = 8; m.yaw = Math.atan2(-dx, -dz); m.fuse = 0; m.angryT = 0;
    if (!m.scaredSnd) { m.scaredSnd = 1; sfx(d.sound + 'Hurt', m.x, m.y + 1, m.z); }
  }
}
/* drawn last, glowing and see-through (after the water) */
const PATRONUS_Q = [];
function drawPatronuses(s) {
  if (!PATRONUS_Q.length) return;
  const P = PROG.entity, model = MODELS.patronus;
  entityBegin(texSkins);
  gl.blendFunc(gl.SRC_ALPHA, s.day > 0.5 && !s.moon ? gl.ONE_MINUS_SRC_ALPHA : gl.ONE);   // (glowing in the dark; silvery in daylight, so you can see its shape)
  gl.uniform1f(P.u.uBright, 1); gl.uniform4f(P.u.uTint, 0.7, 0.85, 1, 0.35);
  for (const q of PATRONUS_Q) { gl.uniform1f(P.u.uAlpha, q.a); drawModel(model, q.m, q.pose); }   // (q.m: its own copy of the matrix)
  gl.uniform1f(P.u.uAlpha, 1); gl.uniform4f(P.u.uTint, 0, 0, 0, 0);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  PATRONUS_Q.length = 0;
}
