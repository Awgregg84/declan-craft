/* ===================== Entities: physics, mobs, items, particles ===================== */
const MOB_DEFS = {
  pig: { model: 'pig', w: 0.45, h: 0.9, hp: 10, speed: 1.3, drops: [[I.PORKCHOP, 1, 3]], sound: 'pig' },
  cow: { model: 'cow', w: 0.45, h: 1.4, hp: 10, speed: 1.2, drops: [[I.BEEF, 1, 3], [I.LEATHER, 0, 2]], sound: 'cow' },
  sheep: { model: 'sheep', w: 0.45, h: 1.3, hp: 8, speed: 1.2, drops: [['wool', 1, 2]], sound: 'sheep' },
  chicken: { model: 'chicken', w: 0.25, h: 0.7, hp: 4, speed: 1.1, drops: [[I.CHICKEN, 1, 1], [I.FEATHER, 0, 2]], sound: 'chicken' },
  zombie: { model: 'zombie', w: 0.3, h: 1.95, hp: 20, speed: 2.4, hostile: true, dmg: 3, drops: [[I.ROTTEN_FLESH, 0, 2]], sound: 'zombie' },
  creeper: { model: 'creeper', w: 0.3, h: 1.7, hp: 20, speed: 2.2, hostile: true, drops: [[I.GUNPOWDER, 1, 2]], sound: 'creeper' },
  villager: { model: 'villager_farmer', w: 0.3, h: 1.9, hp: 20, speed: 1.1, drops: [], sound: 'villager', villager: true },
  // the Nether: piglins leave you alone until one is hit; magma cubes hop after you and don't mind lava
  piglin: { model: 'piglin', w: 0.3, h: 1.95, hp: 20, speed: 2.4, neutral: true, dmg: 4, fireproof: true, nether: true, drops: [[I.ROTTEN_FLESH, 0, 1], [I.GOLD_INGOT, 0, 1]], sound: 'piglin' },
  magma: { model: 'magma', w: 0.3, h: 0.6, hp: 6, speed: 3, hostile: true, hopper: true, dmg: 3, fireproof: true, nether: true, drops: [], sound: 'magma' },
};
const MOB_TYPES = Object.keys(MOB_DEFS);
let ENTITY_NID = 0;
const SHEEP_COLORS = [[0, 0.82], [7, 0.06], [8, 0.06], [12, 0.03], [15, 0.02], [6, 0.01]];
const PARTICLES = [];
const _boxes = [];

function collideBoxes(world, x0, y0, z0, x1, y1, z1, out) {
  out.length = 0;
  for (let by = Math.floor(y0) - 1; by <= Math.floor(y1); by++) for (let bz = Math.floor(z0); bz <= Math.floor(z1); bz++) for (let bx = Math.floor(x0); bx <= Math.floor(x1); bx++) {
    const b = world.getBlock(bx, by, bz);
    if (!SOLID[b]) continue;
    const bd = BLOCKS[b], bx2 = bd.boxFn ? bd.boxFn(world.getData(bx, by, bz)) : bd.box;
    if (bx2) out.push(bx + bx2[0], by + bx2[1], bz + bx2[2], bx + bx2[3], by + bx2[4], bz + bx2[5]);
    else out.push(bx, by, bz, bx + 1, by + 1, bz + 1);
  }
  return out;
}
function moveEntity(world, e, dx, dy, dz) {
  const w = e.w, bx = _boxes;
  collideBoxes(world, e.x - w + Math.min(0, dx), e.y + Math.min(0, dy), e.z - w + Math.min(0, dz), e.x + w + Math.max(0, dx), e.y + e.h + Math.max(0, dy), e.z + w + Math.max(0, dz), bx);
  const odx = dx, ody = dy, odz = dz;
  for (let i = 0; i < bx.length; i += 6) {
    if (e.x + w <= bx[i] || e.x - w >= bx[i + 3] || e.z + w <= bx[i + 2] || e.z - w >= bx[i + 5]) continue;
    if (dy > 0 && e.y + e.h <= bx[i + 1]) dy = Math.min(dy, bx[i + 1] - (e.y + e.h));
    else if (dy < 0 && e.y >= bx[i + 4]) dy = Math.max(dy, bx[i + 4] - e.y);
  }
  e.y += dy;
  for (let i = 0; i < bx.length; i += 6) {
    if (e.y + e.h <= bx[i + 1] || e.y >= bx[i + 4] || e.z + w <= bx[i + 2] || e.z - w >= bx[i + 5]) continue;
    if (dx > 0 && e.x + w <= bx[i]) dx = Math.min(dx, bx[i] - (e.x + w));
    else if (dx < 0 && e.x - w >= bx[i + 3]) dx = Math.max(dx, bx[i + 3] - (e.x - w));
  }
  e.x += dx;
  for (let i = 0; i < bx.length; i += 6) {
    if (e.y + e.h <= bx[i + 1] || e.y >= bx[i + 4] || e.x + w <= bx[i] || e.x - w >= bx[i + 3]) continue;
    if (dz > 0 && e.z + w <= bx[i + 2]) dz = Math.min(dz, bx[i + 2] - (e.z + w));
    else if (dz < 0 && e.z - w >= bx[i + 5]) dz = Math.max(dz, bx[i + 5] - (e.z - w));
  }
  e.z += dz;
  e.onGround = ody < 0 && dy > ody + 1e-7;
  e.hitCeil = ody > 0 && dy < ody - 1e-7;
  e.collidedH = Math.abs(dx - odx) > 1e-7 || Math.abs(dz - odz) > 1e-7;
  if (Math.abs(dy - ody) > 1e-7) e.vy = 0;
  if (Math.abs(dx - odx) > 1e-7) e.vx = 0;
  if (Math.abs(dz - odz) > 1e-7) e.vz = 0;
}
function boxFree(world, x, y, z, w, hgt) {
  collideBoxes(world, x - w, y, z - w, x + w, y + hgt, z + w, _boxes);
  for (let i = 0; i < _boxes.length; i += 6) {
    if (x + w <= _boxes[i] || x - w >= _boxes[i + 3] || y + hgt <= _boxes[i + 1] || y >= _boxes[i + 4] || z + w <= _boxes[i + 2] || z - w >= _boxes[i + 5]) continue;
    return false;
  }
  return true;
}
function liquidAt(world, e) {
  const x = Math.floor(e.x), z = Math.floor(e.z);
  const a = world.getBlock(x, Math.floor(e.y + 0.1), z), b = world.getBlock(x, Math.floor(e.y + e.h * 0.6), z);
  e.inWater = a === B.WATER || b === B.WATER;
  e.inLava = a === B.LAVA || b === B.LAVA;
}
/* gravity + collisions with sub-steps */
function physicsStep(world, e, dt, grav) {
  liquidAt(world, e);
  if (e.inWater || e.inLava) {
    e.vy -= grav * 0.25 * dt;
    e.vy = Math.max(e.vy, -3);
    const drag = Math.pow(e.inLava ? 0.1 : 0.3, dt);
    e.vx *= drag; e.vz *= drag;
  } else e.vy -= grav * dt;
  e.vy = Math.max(e.vy, -60);
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(e.vx), Math.abs(e.vy), Math.abs(e.vz)) * dt / 0.4));
  const sdt = dt / steps;
  const wasGround = e.onGround;
  for (let i = 0; i < steps; i++) moveEntity(world, e, e.vx * sdt, e.vy * sdt, e.vz * sdt);
  if (!e.onGround && e.vy < 0) e.fallDist = (e.fallDist || 0) - e.vy * dt;
  if (e.inWater || e.inLava) e.fallDist = 0;
  e.landed = !wasGround && e.onGround;
}

class Entity {
  constructor(type, x, y, z) {
    this.type = type; this.x = x; this.y = y; this.z = z;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = Math.random() * TAU; this.bodyYaw = this.yaw; this.headYaw = this.yaw; this.pitch = 0;
    this.w = 0.3; this.h = 0.5; this.onGround = false; this.age = 0; this.removed = false;
    this.hurt = 0; this.dead = 0; this.walk = 0; this.walkAmt = 0; this.aiT = 0; this.moving = false; this.panic = 0;
    this.fallDist = 0; this.attackCd = 0; this.fuse = 0; this.burnT = 0;
    this.nid = ++ENTITY_NID;
  }
}
/* true only for real creature names (not "constructor" and other built-in object names) */
const isMobType = t => typeof t === 'string' && Object.prototype.hasOwnProperty.call(MOB_DEFS, t);
function spawnMob(game, type, x, y, z, opts) {
  const d = MOB_DEFS[type], e = new Entity(type, x, y, z);
  e.w = d.w; e.h = d.h; e.hp = d.hp; e.mob = true;
  if (type === 'villager') {
    const o = opts || {};
    e.prof = VILLAGER_PROFS.includes(o.prof) ? o.prof : VILLAGER_PROFS[randInt(0, VILLAGER_PROFS.length - 1)];
    e.home = o.home || [x, z]; e.village = o.village || null; e.vseed = o.vseed !== undefined ? o.vseed : randInt(0, 99999);
  }
  if (type === 'magma') {   // small or big
    e.size = opts && opts.size ? clamp(opts.size | 0, 1, 2) : Math.random() < 0.6 ? 1 : 2;
    e.w = 0.3 * e.size; e.h = 0.6 * e.size; e.hp = e.size === 2 ? 12 : 5; e.hopT = randRange(0.5, 1.5);
  }
  if (type === 'sheep') {
    let r = Math.random();
    e.wool = 0;
    for (const [c, p] of SHEEP_COLORS) { if (r < p) { e.wool = c; break; } r -= p; }
    e.color = hexRGB(WOOL_COLORS[e.wool]).map(v => v / 255);
  }
  game.entities.push(e);
  return e;
}
function dropItem(game, x, y, z, id, count, strong) {
  if (!id || count <= 0) return;
  const e = new Entity('item', x, y, z);
  e.id = id; e.count = count; e.w = 0.15; e.h = 0.3; e.pickup = strong ? 1.2 : 0.4;
  const s = strong ? 4 : 2;
  e.vx = randRange(-1, 1) * s * 0.5; e.vz = randRange(-1, 1) * s * 0.5; e.vy = randRange(2, 4);
  e.spin = Math.random() * TAU;
  game.entities.push(e);
  return e;
}
function blockDrops(id, held) {
  const d = BLOCKS[id];
  if (!d || d.drop === null) return [];
  const tool = toolOf(held);
  if (d.tier > 0 && (!tool || tool.kind !== d.tool || tool.tier < d.tier)) return [];
  if (d.drop === 'leaves') {
    const out = [];
    const sap = id === B.BIRCH_LEAVES ? B.BIRCH_SAPLING : id === B.SPRUCE_LEAVES ? B.SPRUCE_SAPLING : B.OAK_SAPLING;
    if (Math.random() < 0.08) out.push([sap, 1]);
    if (id === B.OAK_LEAVES && Math.random() < 0.04) out.push([I.APPLE, 1]);
    return out;
  }
  if (d.drop === 'seeds') return [];
  if (id === B.DEAD_BUSH) return Math.random() < 0.5 ? [[I.STICK, 1]] : [];
  if (id === B.GRAVEL) return Math.random() < 0.12 ? [[I.FLINT, 1]] : [[B.GRAVEL, 1]];
  return [[d.drop, 1]];
}

/* ---- particles ---- */
function blockParticles(x, y, z, id, n, spread) {
  if (!BLOCKS[id] || !BLOCKS[id].tex) return;
  const t = id === B.GRASS ? BT[id * 6 + 2] : BT[id * 6];
  for (let i = 0; i < n; i++) {
    if (PARTICLES.length > 1600) break;
    PARTICLES.push({
      x: x + (spread ? Math.random() : 0.5 + randRange(-0.3, 0.3)), y: y + (spread ? Math.random() : 0.5 + randRange(-0.3, 0.3)), z: z + (spread ? Math.random() : 0.5 + randRange(-0.3, 0.3)),
      vx: randRange(-1.6, 1.6), vy: randRange(0.5, 3.5), vz: randRange(-1.6, 1.6),
      life: randRange(0.4, 0.9), tile: t, u: randInt(0, 12), v: randInt(0, 12), us: 4, size: randRange(0.05, 0.09), grav: 14,
    });
  }
}
function smokeParticles(x, y, z, n, spread, big) {
  for (let i = 0; i < n; i++) {
    if (PARTICLES.length > 1600) break;
    PARTICLES.push({
      x: x + randRange(-spread, spread), y: y + randRange(-spread, spread), z: z + randRange(-spread, spread),
      vx: randRange(-1, 1), vy: randRange(0.3, 1.5), vz: randRange(-1, 1),
      life: randRange(0.5, 1.2), tile: TILE.smoke, u: 0, v: 0, us: 16, size: big ? randRange(0.3, 0.6) : randRange(0.1, 0.18), grav: -0.5, grow: big ? 0.6 : 0.2, bright: 1,
    });
  }
}
function sparkParticles(x, y, z, n) {
  for (let i = 0; i < n; i++) PARTICLES.push({ x: x + randRange(-0.3, 0.3), y: y + randRange(0, 1.6), z: z + randRange(-0.3, 0.3), vx: 0, vy: randRange(0.5, 1.5), vz: 0, life: randRange(0.2, 0.5), tile: TILE.spark, u: 0, v: 0, us: 16, size: 0.08, grav: -1, bright: 1 });
}
function updateParticles(world, dt) {
  let j = 0;
  for (let i = 0; i < PARTICLES.length; i++) {
    const p = PARTICLES[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    p.vy -= p.grav * dt;
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
    if (p.grav > 0 && SOLID[world.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz))]) { p.vx *= 0.5; p.vz *= 0.5; p.vy = 0; }
    else { p.x = nx; p.y = ny; p.z = nz; }
    if (p.grow) p.size += p.grow * dt;
    PARTICLES[j++] = p;
  }
  PARTICLES.length = j;
}

/* ---- damage, explosions ---- */
function hurtMob(game, e, dmg, fx, fz, cause, by) {
  if (e.dead || e.removed) return;
  const d = MOB_DEFS[e.type];
  if (e.proxy) { MP.sendHit(e, dmg, fx, fz); e.hurt = 0.45; sfx(d.sound + 'Hurt', e.x, e.y + 0.5, e.z); return; }
  e.hurt = 0.45;
  let dx = e.x - fx, dz = e.z - fz;
  const l = Math.hypot(dx, dz) || 1;
  dx /= l; dz /= l;
  e.vx = dx * 7; e.vz = dz * 7; e.vy = 5;
  if (!d.hostile) { e.panic = d.villager ? 2.5 : 4; e.yaw = Math.atan2(-dx, -dz); }
  if (d.villager) { sfx('villagerHurt', e.x, e.y + 1.5, e.z); return; }   // villagers are never harmed
  if (d.neutral && cause === 'player' && game.settings.difficulty > 0) {   // on Peaceful they just take the hit
    const who = by || 'me';
    for (const o of game.entities) {
      if (o.type !== e.type || o.dead || o.removed || Math.hypot(o.x - e.x, o.z - e.z) > 16) continue;
      if (!(o.angryT > 0)) sfx(d.sound + 'Angry', o.x, o.y + 1.6, o.z);
      o.angryAt = who; o.angryT = 30;
    }
  }
  e.hp -= dmg;
  sfx(d.sound + (e.hp <= 0 ? 'Death' : 'Hurt'), e.x, e.y + 0.5, e.z);
  if (e.hp <= 0) {
    e.dead = 0.001;
    const killer = by ? MP.remotes.get(by) : null;
    if ((killer ? killer.mode : game.mode) === 'survival' || cause === 'explosion') {
      const loot = [];
      for (const [id, a, b] of d.drops) {
        const n = randInt(a, b);
        if (n > 0) loot.push([id === 'wool' ? B.WOOL + (e.wool || 0) : id, n]);
      }
      if (killer) MP.sendDrops(killer, loot, e.x, e.y + 0.5, e.z);
      else for (const [id, n] of loot) dropItem(game, e.x, e.y + 0.5, e.z, id, n);
    }
    if (game.stats && !killer) game.stats.kills = (game.stats.kills || 0) + 1;
  }
}
function explode(game, x, y, z, power) {
  const world = game.world, r = power;
  sfx('explode', x, y, z);
  smokeParticles(x, y, z, 40, r * 0.6, true);
  const cx = Math.floor(x), cy = Math.floor(y), cz = Math.floor(z), R = Math.ceil(r) + 1;
  for (let dy = -R; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const d = Math.hypot(dx, dy, dz);
    if (d > r + randRange(-0.6, 0.4)) continue;
    const bx = cx + dx, by = cy + dy, bz = cz + dz, b = world.getBlock(bx, by, bz);
    if (!b || b === B.UNLOADED || LIQUID[b] || BLOCKS[b].blast >= 1e9) continue;
    if (b === B.TNT) { world.setBlock(bx, by, bz, B.AIR, 0, true); primeTNT(game, bx, by, bz, randRange(0.4, 1.2)); continue; }
    world.setBlock(bx, by, bz, B.AIR, 0, true);
    if (game.mode === 'survival' && Math.random() < 0.3) for (const [id, n] of blockDrops(b, toolId(3, 0))) dropItem(game, bx + 0.5, by + 0.5, bz + 0.5, id, n);
  }
  const reach = r * 2;
  const hit = (e, isPlayer) => {
    const ex = e.x, ey = e.y + e.h * 0.5, ez = e.z, d = Math.hypot(ex - x, ey - y, ez - z);
    if (d >= reach) return;
    const imp = 1 - d / reach, l = d || 1;
    const dmg = Math.floor(((imp * imp + imp) / 2) * 2.4 * power + 1);
    e.vx += ((ex - x) / l) * imp * 14; e.vy += Math.max(3, ((ey - y) / l) * imp * 10); e.vz += ((ez - z) / l) * imp * 14;
    if (isPlayer) game.player.damage(dmg, 'explosion');
    else if (e.mob) hurtMob(game, e, dmg, x, z, 'explosion');
  };
  for (const e of game.entities) if (!e.removed && (e.mob || e.type === 'item')) hit(e, false);
  if (game.player.alive) hit(game.player, true);
  if (MP.role === 'host') MP.explosion(x, y, z, power, reach);
  game.shake = Math.max(game.shake || 0, 0.25 + power * 0.08);
}
function primeTNT(game, x, y, z, fuse) {
  const e = new Entity('tnt', x + 0.5, y, z + 0.5);
  e.w = 0.49; e.h = 0.98; e.fuse = fuse; e.vy = 3; e.vx = randRange(-0.5, 0.5); e.vz = randRange(-0.5, 0.5);
  game.entities.push(e);
  sfx('fuse', x + 0.5, y + 0.5, z + 0.5);
  return e;
}

/* ---- per-frame updates ---- */
function updateEntities(game, dt) {
  const world = game.world, pl = game.player;
  for (const e of game.entities) {
    if (e.removed) continue;
    if (e.proxy) { updateProxy(e, dt); continue; }   // the host's creatures, TNT and sand: only glide to where the host says
    e.age += dt;
    if (e.type === 'item') {
      physicsStep(world, e, dt, 20);
      if (e.inWater) e.vy += 30 * dt;
      if (e.onGround) { const f = Math.pow(0.02, dt); e.vx *= f; e.vz *= f; }
      e.pickup -= dt;
      if (e.age > 300) e.removed = true;
      if (pl.alive && e.pickup <= 0) {
        const dx = pl.x - e.x, dy = (pl.y + 0.8) - e.y, dz = pl.z - e.z, d = Math.hypot(dx, dy, dz);
        if (d < 1.6) {
          const left = game.giveItem(e.id, e.count);
          if (left < e.count) sfx('pop', e.x, e.y, e.z);
          if (left <= 0) e.removed = true; else e.count = left;
        }
      }
      if (e.y < -40) e.removed = true;
      continue;
    }
    if (e.type === 'falling') {
      physicsStep(world, e, dt, 26);
      if (e.onGround || e.age > 20) {
        e.removed = true;
        const bx = Math.floor(e.x), by = Math.floor(e.y + 0.2), bz = Math.floor(e.z), cur = world.getBlock(bx, by, bz);
        if (cur === B.AIR || LIQUID[cur] || (!SOLID[cur] && cur !== B.UNLOADED)) world.setBlock(bx, by, bz, e.id, 0, true);
        else dropItem(game, e.x, e.y + 0.5, e.z, e.id, 1);
      }
      if (e.y < -40) e.removed = true;
      continue;
    }
    if (e.type === 'tnt') {
      physicsStep(world, e, dt, 24);
      if (e.onGround) { e.vx *= 0.8; e.vz *= 0.8; }
      e.fuse -= dt;
      if (Math.random() < dt * 20) smokeParticles(e.x, e.y + 1.1, e.z, 1, 0.05, false);
      if (e.fuse <= 0) { e.removed = true; explode(game, e.x, e.y + 0.5, e.z, 4); }
      continue;
    }
    if (e.mob) updateMob(game, e, dt);
  }
  let j = 0;
  for (const e of game.entities) if (!e.removed) game.entities[j++] = e;
  game.entities.length = j;
}
function approachAngle(a, b, maxStep) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  if (d > maxStep) d = maxStep; else if (d < -maxStep) d = -maxStep;
  return a + d;
}
/* the nearest player a monster can go after (in multiplayer, any player in survival) */
function mobTarget(game, e) {
  let best = null, bd = 20;
  const pl = game.player;
  const consider = (p, remote, mode) => {
    if (!p.alive || mode !== 'survival') return;
    const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz);
    if (dist < bd && Math.abs(p.y - e.y) < 10) { bd = dist; best = { p, remote, dist, dx, dz }; }
  };
  consider(pl, false, game.mode);
  if (MP.role === 'host') for (const r of MP.remotes.values()) if (r.lastState) consider(r, true, r.mode);   // lastState: done loading
  return best;
}
/* the player an angry piglin is after (this device's player is 'me'), in the same form as mobTarget */
function angryTarget(game, e) {
  const p = e.angryAt === 'me' ? game.player : MP.role === 'host' ? MP.remotes.get(e.angryAt) : null;
  const mode = p === game.player ? game.mode : p && p.mode;
  if (!p || !p.alive || mode !== 'survival' || (p !== game.player && !p.lastState)) { e.angryT = 0; return null; }
  const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz);
  if (dist > 32 || Math.abs(p.y - e.y) > 12) return null;
  return { p, remote: p !== game.player, dist, dx, dz };
}
/* magma cubes move only by hopping: toward a player when there is one, otherwise here and there */
function hopMob(game, e, d, dt, tg) {
  const world = game.world;
  e.hopT -= dt;
  if (e.onGround) {
    e.vx *= Math.pow(0.001, dt); e.vz *= Math.pow(0.001, dt);
    if (e.hopT <= 0) {
      let dx, dz;
      if (tg && tg.dist > 0.3) { dx = tg.dx / tg.dist; dz = tg.dz / tg.dist; e.yaw = Math.atan2(-dx, -dz); }
      else { e.yaw += randRange(-1.5, 1.5); dx = -Math.sin(e.yaw); dz = -Math.cos(e.yaw); }
      const sp = tg ? d.speed : d.speed * 0.5;
      e.vx = dx * sp; e.vz = dz * sp; e.vy = tg ? 7.5 : 5.5;
      e.hopT = tg ? randRange(0.6, 1.1) : randRange(1.5, 3.5);
      e.squash = 0;
      sfx(d.sound + 'Say', e.x, e.y + 0.3, e.z);
    }
  }
  const wasAir = !e.onGround;
  physicsStep(world, e, dt, 24);
  if (wasAir && e.onGround) e.squash = 0.25;   // flattened a moment on landing
  if (e.squash > 0) e.squash -= dt;
  e.fallDist = 0;
  if (tg && e.attackCd <= 0) {
    const tp = tg.p, reach = e.w + 0.55;
    if (tg.dist < reach && tp.y < e.y + e.h + 0.2 && tp.y + 1.8 > e.y) {
      e.attackCd = 1;
      const dmg = e.size === 2 ? 4 : 2, kx = (tg.dx / (tg.dist || 1)) * 5, kz = (tg.dz / (tg.dist || 1)) * 5;
      if (tg.remote) MP.hurtRemote(tp, dmg, e.type, kx, 3, kz);
      else { tp.damage(dmg, e.type, e); tp.vx += kx; tp.vz += kz; tp.vy = Math.max(tp.vy, 3); }
    }
  }
  const pd = nearestPlayerDist(game, e);
  if (pd > 80 || (pd > 40 && Math.random() < dt * 0.02) || e.y < -30) e.removed = true;
  e.bodyYaw = approachAngle(e.bodyYaw, e.yaw, dt * 6); e.headYaw = e.bodyYaw;
}
function nearestPlayerDist(game, e) {
  let d = Math.hypot(game.player.x - e.x, game.player.z - e.z);
  if (MP.role === 'host') for (const r of MP.remotes.values()) d = Math.min(d, Math.hypot(r.x - e.x, r.z - e.z));
  return d;
}
function allPlayers(game) {
  const list = [game.player];
  for (const r of MP.remotes.values()) list.push(r);
  return list;
}
function updateMob(game, e, dt) {
  const d = MOB_DEFS[e.type], world = game.world;
  if (e.hurt > 0) e.hurt -= dt;
  if (e.attackCd > 0) e.attackCd -= dt;
  if (e.dead) {
    e.dead += dt;
    physicsStep(world, e, dt, 26);
    e.vx *= 0.85; e.vz *= 0.85;
    if (e.dead > 0.9) { e.removed = true; smokeParticles(e.x, e.y + e.h * 0.5, e.z, 10, e.w + 0.2, false); }
    return;
  }
  let mx = 0, mz = 0, speed = d.speed;
  if (e.angryT > 0) e.angryT -= dt;
  const tg = d.hostile ? mobTarget(game, e) : d.neutral && e.angryT > 0 ? angryTarget(game, e) : null, chase = !!tg;
  if (d.hopper) { hopMob(game, e, d, dt, tg); return; }
  const dxp = tg ? tg.dx : 0, dzp = tg ? tg.dz : 0, dist = tg ? tg.dist : 0;
  if (chase) {
    const tp = tg.p;
    e.yaw = Math.atan2(-dxp, -dzp);
    if (dist > 0.6) { mx = dxp / dist; mz = dzp / dist; }
    if (e.type === 'creeper') {
      if (dist < 2.8) { if (!e.fuse) sfx('hiss', e.x, e.y + 1, e.z); e.fuse += dt; mx = mz = 0; }
      else if (dist > 6 && e.fuse > 0) e.fuse = Math.max(0, e.fuse - dt);
      else if (e.fuse > 0) { e.fuse += dt; mx *= 0.3; mz *= 0.3; }
      if (e.fuse >= 1.5) { e.removed = true; explode(game, e.x, e.y + 0.8, e.z, 3); return; }
    } else if (dist < 1.25 && Math.abs(tp.y - e.y) < 1.6 && e.attackCd <= 0) {
      e.attackCd = 1;
      e.armSwing = 0.3;
      const kx = (dxp / (dist || 1)) * 6, kz = (dzp / (dist || 1)) * 6;
      if (tg.remote) MP.hurtRemote(tp, d.dmg, e.type, kx, 4, kz);
      else { tp.damage(d.dmg, e.type, e); tp.vx += kx; tp.vz += kz; tp.vy = Math.max(tp.vy, 4); }
    }
  } else if (d.villager) {
    const st = villagerSteer(game, e, dt);
    mx = st[0]; mz = st[1]; speed *= st[2];
  } else {
    if (e.fuse > 0) e.fuse = Math.max(0, e.fuse - dt);
    if (e.panic > 0) {
      e.panic -= dt;
      mx = -Math.sin(e.yaw); mz = -Math.cos(e.yaw); speed *= 1.9;
      if (Math.random() < dt * 1.2) e.yaw += randRange(-1.2, 1.2);
    } else {
      e.aiT -= dt;
      if (e.aiT <= 0) {
        if (Math.random() < 0.45) { e.moving = false; e.aiT = randRange(2, 6); }
        else { e.moving = true; e.yaw = Math.random() * TAU; e.aiT = randRange(1.5, 4); }
        if (Math.random() < 0.08) sfx(d.sound + 'Say', e.x, e.y + 0.5, e.z);
      }
      if (e.moving) { mx = -Math.sin(e.yaw); mz = -Math.cos(e.yaw); speed *= d.hostile ? 0.45 : 0.55; }
    }
  }
  if ((mx || mz) && !chase) {
    const ax = Math.floor(e.x + mx * (e.w + 0.5)), az = Math.floor(e.z + mz * (e.w + 0.5)), fy = Math.floor(e.y + 0.01);
    const b1 = world.getBlock(ax, fy - 1, az), b2 = world.getBlock(ax, fy - 2, az);
    if (!SOLID[b1] && !SOLID[b2] && !LIQUID[b1] && b1 !== B.UNLOADED) { mx = mz = 0; e.aiT = 0; e.panic = 0; }
  }
  const acc = e.onGround ? 10 : 2.5;
  e.vx += (mx * speed - e.vx) * Math.min(1, acc * dt);
  e.vz += (mz * speed - e.vz) * Math.min(1, acc * dt);
  if (e.collidedH && (mx || mz) && e.onGround) e.vy = 8.4;
  if (e.inWater && (mx || mz || chase)) e.vy = Math.max(e.vy, 2.2);
  if (e.inWater && e.type !== 'zombie') e.vy += 16 * dt;
  if (e.type === 'chicken' && !e.onGround && e.vy < -2) e.vy = -2;
  physicsStep(world, e, dt, 26);
  if (e.landed) { if (e.fallDist > 4 && e.type !== 'chicken') hurtMob(game, e, Math.floor(e.fallDist - 3), e.x, e.z, 'fall'); e.fallDist = 0; }
  if (e.inLava && !d.fireproof && e.age % 0.5 < dt) hurtMob(game, e, 2, e.x, e.z, 'lava');
  if (e.type === 'zombie') {
    const s = game.sky;
    const L = world.getLight(Math.floor(e.x), Math.floor(e.y + 1.6), Math.floor(e.z));
    if (s && s.day > 0.75 && (L >> 4) >= 15 && !e.inWater) {
      e.burnT += dt;
      if (Math.random() < dt * 15) sparkParticles(e.x, e.y, e.z, 1);
      if (e.burnT > 1) { e.burnT = 0; hurtMob(game, e, 2, e.x, e.z, 'fire'); }
    }
  }
  if (d.hostile || d.neutral) {
    const pd = nearestPlayerDist(game, e);
    if (pd > 80 || (pd > 40 && Math.random() < dt * 0.02)) e.removed = true;
  }
  if (e.y < -30) e.removed = true;
  if (e.armSwing > 0) e.armSwing -= dt;
  const hs = Math.hypot(e.vx, e.vz);
  e.walk += hs * dt * 2.6;
  e.walkAmt = lerp(e.walkAmt, Math.min(1, hs / 2), Math.min(1, dt * 8));
  const faceYaw = hs > 0.3 ? Math.atan2(-e.vx, -e.vz) : e.yaw;
  e.bodyYaw = approachAngle(e.bodyYaw, chase ? e.yaw : faceYaw, dt * 6);
  e.headYaw = approachAngle(e.headYaw, e.yaw, dt * 8);
  if (chase) e.pitch = Math.atan2((tg.p.y + 1.5) - (e.y + e.h * 0.9), dist) * 0.7;
  else if (d.villager) e.pitch = lerp(e.pitch, e.lookP || 0, Math.min(1, dt * 4));
  else e.pitch *= 0.95;
}

/* ---- mob spawning ---- */
function spawnTick(game) {
  const world = game.world;
  if (MP.role === 'guest') { world.spawnQueue.length = 0; return; }
  if (game.settings.difficulty === 0) for (const e of game.entities) if (e.mob) { if (MOB_DEFS[e.type].hostile) e.removed = true; else if (e.angryT) e.angryT = 0; }   // Peaceful: no monsters, and nothing stays angry
  let passive = 0, hostile = 0;
  for (const e of game.entities) if (e.mob && !e.dead) { const d = MOB_DEFS[e.type]; if (d.hostile) hostile++; else if (!d.villager) passive++; }
  while (world.spawnQueue.length) {
    const sp = world.spawnQueue.shift(), [type, x, y, z, count] = sp;
    if (type === 'villager') { spawnVillagers(game, sp); continue; }
    if (passive >= 36 || !game.settings.animals) continue;
    for (let i = 0; i < count; i++) {
      const sx = x + randRange(-1.5, 1.5), sz = z + randRange(-1.5, 1.5);
      if (boxFree(world, sx, y, sz, MOB_DEFS[type].w, MOB_DEFS[type].h)) { spawnMob(game, type, sx, y, sz); passive++; }
    }
  }
  if (world.map === 'nether') { netherSpawnTick(game); return; }
  const players = allPlayers(game).filter(p => p.alive && (p === game.player ? game.mode : p.mode) === 'survival');
  if (!players.length || game.settings.difficulty === 0) return;
  const cap = (game.settings.difficulty === 1 ? 6 : 12) * Math.min(2, players.length);
  if (hostile >= cap) return;
  const pl = players[randInt(0, players.length - 1)];
  const s = game.sky;
  for (let a = 0; a < 6; a++) {
    const ang = Math.random() * TAU, dist = randRange(22, 40);
    const x = Math.floor(pl.x + Math.cos(ang) * dist), z = Math.floor(pl.z + Math.sin(ang) * dist);
    let y = Math.floor(pl.y + randRange(-10, 12));
    if (y > WH - 3) y = WH - 3;
    let found = -1;
    for (let k = 0; k < 20 && y - k > 1; k++) {
      const yy = y - k;
      const b0 = world.getBlock(x, yy - 1, z), b1 = world.getBlock(x, yy, z), b2 = world.getBlock(x, yy + 1, z);
      if (b0 === B.UNLOADED) break;
      if (SOLID[b0] && OPAQUE[b0] && b1 === B.AIR && b2 === B.AIR) { found = yy; break; }
    }
    if (found < 0) continue;
    const L = world.getLight(x, found, z);
    const eff = Math.max(L & 15, (L >> 4) - Math.round((1 - s.day) * 11));
    if (eff >= 7) continue;
    spawnMob(game, Math.random() < 0.6 ? 'zombie' : 'creeper', x + 0.5, found, z + 0.5);
    return;
  }
}

/* The Nether: groups of zombified piglins wander about; magma cubes turn up low down, near the lava. */
function netherSpawnTick(game) {
  const world = game.world, players = allPlayers(game).filter(p => p.alive && (p === game.player || p.lastState));
  if (!players.length) return;
  let pig = 0, mag = 0;
  for (const e of game.entities) if (e.mob && !e.dead) { if (e.type === 'piglin') pig++; else if (e.type === 'magma') mag++; }
  const n = Math.min(2, players.length), wantMagma = game.settings.difficulty > 0 && mag < 4 * n && Math.random() < 0.35;
  if (!wantMagma && pig >= 10 * n) return;
  const pl = players[randInt(0, players.length - 1)];
  for (let a = 0; a < 6; a++) {
    const ang = Math.random() * TAU, dist = randRange(18, 36);
    const x = Math.floor(pl.x + Math.cos(ang) * dist), z = Math.floor(pl.z + Math.sin(ang) * dist);
    let y = Math.min(WH - 3, Math.floor(pl.y + randRange(-8, 14))), found = -1;
    for (let k = 0; k < 24 && y - k > 2; k++) {
      const yy = y - k, b0 = world.getBlock(x, yy - 1, z);
      if (b0 === B.UNLOADED) break;
      if (SOLID[b0] && OPAQUE[b0] && world.getBlock(x, yy, z) === B.AIR && world.getBlock(x, yy + 1, z) === B.AIR) { found = yy; break; }
    }
    if (found < 0) continue;
    if (wantMagma) { if (found > 60) continue; spawnMob(game, 'magma', x + 0.5, found, z + 0.5); return; }
    const count = randInt(2, 4);
    for (let i = 0; i < count; i++) {
      const sx = x + 0.5 + randRange(-1.5, 1.5), sz = z + 0.5 + randRange(-1.5, 1.5);
      if (boxFree(world, sx, found, sz, 0.3, 1.95)) spawnMob(game, 'piglin', sx, found, sz);
    }
    return;
  }
}

/* ---- drawing ---- */
const _eb = M4.create();
function mobPose(e, t) {
  const a = Math.sin(e.walk) * 0.9 * e.walkAmt, hy = ((e.headYaw - e.bodyYaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const head = [-e.pitch, clamp(hy, -1, 1), 0];
  if (e.type === 'zombie') {
    const sw = e.armSwing > 0 ? Math.sin(e.armSwing / 0.3 * Math.PI) * 0.6 : 0;
    return { head, rarm: [-1.45 - sw + Math.sin(t * 2) * 0.05, 0, 0.05], larm: [-1.45 - sw + Math.sin(t * 2 + 1) * 0.05, 0, -0.05], rleg: [a, 0, 0], lleg: [-a, 0, 0] };
  }
  if (e.type === 'villager') return { head, rleg: [a, 0, 0], lleg: [-a, 0, 0], rarmU: [-0.75, 0, 0], larmU: [-0.75, 0, 0] };
  if (e.type === 'piglin') {
    const sw = e.armSwing > 0 ? Math.sin(e.armSwing / 0.3 * Math.PI) * 1.2 : 0, up = e.angryT > 0 || e.angry ? -0.5 : 0;
    return { head, rarm: [-a * 0.6 + up - sw, 0, 0.05], larm: [a * 0.6, 0, -0.05], rleg: [a, 0, 0], lleg: [-a, 0, 0] };
  }
  if (e.type === 'chicken') return { head, leg1: [a, 0, 0], leg2: [-a, 0, 0], wing1: [0, 0, e.onGround ? 0 : Math.sin(t * 25) * 0.6 + 0.6], wing2: [0, 0, e.onGround ? 0 : -(Math.sin(t * 25) * 0.6 + 0.6)] };
  return { head, leg1: [a, 0, 0], leg2: [-a, 0, 0], leg3: [-a, 0, 0], leg4: [a, 0, 0] };
}
function drawEntities(game, s, t, cam) {
  const world = game.world, P = PROG.entity;
  entityBegin(texSkins);
  gl.enable(gl.CULL_FACE);
  for (const e of game.entities) {
    if (!e.mob) continue;
    const dx = e.x - cam.x, dy = e.y - cam.y, dz = e.z - cam.z;
    if (dx * dx + dz * dz > R.fogEnd * R.fogEnd) continue;
    if (!boxInFrustum(R.planes, dx - 1, dy, dz - 1, dx + 1, dy + 2.2, dz + 1)) continue;
    const def = MOB_DEFS[e.type], model = MODELS[e.type === 'villager' ? 'villager_' + (e.prof || 'farmer') : def.model];
    gl.uniform1f(P.u.uBright, brightAt(world, e.x, e.y + e.h * 0.7, e.z, s));
    let tint = e.hurt > 0 || e.dead ? [0.8, 0.1, 0.1, 0.45] : [0, 0, 0, 0];
    let sc = model.scale;
    if (e.type === 'creeper' && e.fuse > 0) {
      const f = e.fuse / 1.5;
      if (Math.floor(e.fuse * 8) % 2 === 0) tint = [1, 1, 1, 0.55 * f];
      sc *= 1 + f * 0.18;
    }
    gl.uniform4fv(P.u.uTint, tint);
    M4.identity(_eb);
    M4.translate(_eb, _eb, dx, dy, dz);
    M4.rotY(_eb, _eb, e.bodyYaw + Math.PI);
    if (e.dead) M4.rotZ(_eb, _eb, Math.min(1, e.dead / 0.4) * Math.PI / 2);
    if (e.type === 'magma') {
      const k = e.squash > 0 ? -e.squash * 1.4 : e.onGround ? 0 : clamp((e.vy || 0) / 14, -0.25, 0.4), z = (e.size || 1) * 1.2;
      M4.scale(_eb, _eb, sc * z * (1 - k * 0.5), sc * z * (1 + k), sc * z * (1 - k * 0.5));
    } else M4.scale(_eb, _eb, sc, sc, sc);
    drawModel(model, _eb, mobPose(e, t), e.color);
  }
  if (game.view > 0 && game.player.alive) drawPlayerModel(game, s, t, cam);
  if (MP.remotes.size) drawRemotePlayers(game, s, t, cam);
  entityBegin(texTiles);
  gl.disable(gl.CULL_FACE);
  for (const e of game.entities) {
    if (e.mob) continue;
    const dx = e.x - cam.x, dy = e.y - cam.y, dz = e.z - cam.z;
    if (dx * dx + dz * dz > R.fogEnd * R.fogEnd) continue;
    gl.uniform1f(P.u.uBright, brightAt(world, e.x, e.y + 0.3, e.z, s));
    M4.identity(_eb);
    if (e.type === 'item') {
      const cube = isCubeItem(e.id), bob = Math.sin(e.age * 2.5 + e.spin) * 0.06 + 0.08;
      M4.translate(_eb, _eb, dx, dy + bob, dz);
      M4.rotY(_eb, _eb, e.age * 1.6 + e.spin);
      const sc = cube ? 0.25 / 16 : 0.42 / 16;
      M4.scale(_eb, _eb, sc, sc, sc);
      gl.uniform4f(P.u.uTint, 0, 0, 0, 0);
      const mesh = itemMesh(e.id);
      drawMesh(mesh, _eb);
      if (e.count > 1 && cube) { M4.translate(_eb, _eb, 3, 3, 3); drawMesh(mesh, _eb); }
    } else if (e.type === 'falling' || e.type === 'tnt') {
      const grow = e.type === 'tnt' && e.fuse < 0.4 ? 1 + (0.4 - e.fuse) * 0.4 : 1;
      M4.translate(_eb, _eb, dx, dy, dz);
      M4.scale(_eb, _eb, grow / 16, grow / 16, grow / 16);
      const flash = e.type === 'tnt' && Math.floor(e.fuse * 5) % 2 === 0;
      gl.uniform4f(P.u.uTint, 1, 1, 1, flash ? 0.5 : 0);
      gl.enable(gl.CULL_FACE);
      drawMesh(itemMesh(e.type === 'tnt' ? B.TNT : e.id), _eb);
      gl.disable(gl.CULL_FACE);
    }
  }
  gl.uniform4f(P.u.uTint, 0, 0, 0, 0);
}
