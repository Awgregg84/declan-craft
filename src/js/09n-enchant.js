/* ===================== Experience, lapis lazuli and enchanting ===================== */
// Experience comes as little green orbs: from creatures you defeat, ores you mine, things you cook or trade
// for, fish you catch and Bottles o' Enchanting. Levels (and lapis lazuli) are spent at an enchanting table,
// which offers three enchantments; bookshelves around it make them stronger.

/* ---- levels (as in Minecraft) ---- */
const xpForLevel = L => (L < 16 ? 2 * L + 7 : L < 31 ? 5 * L - 38 : 9 * L - 158);
function xpLevelOf(total) {
  let L = 0, left = Math.max(0, total);
  while (left >= xpForLevel(L) && L < 2000) { left -= xpForLevel(L); L++; }
  return { level: L, prog: left / xpForLevel(L) };
}
function totalForLevel(L) { let n = 0; for (let i = 0; i < L; i++) n += xpForLevel(i); return n; }
function setXp(pl, total) {
  pl.xp = clamp(Math.round(total) || 0, 0, 1e7);
  const q = xpLevelOf(pl.xp);
  pl.xpLevel = q.level; pl.xpProg = q.prog;
  ui.xp = -1;
}
function addXp(pl, n) {
  if (!(n > 0)) return;
  const before = pl.xpLevel || 0;
  setXp(pl, (pl.xp || 0) + n);
  if (pl.xpLevel > before) sfx(pl.xpLevel % 5 === 0 ? 'levelUpBig' : 'levelUp');
  else sfx('xpOrb');
}
/* spend whole levels, keeping how far along the bar you were */
function spendLevels(pl, n) {
  const L = Math.max(0, (pl.xpLevel || 0) - n);
  setXp(pl, totalForLevel(L) + Math.floor((pl.xpProg || 0) * xpForLevel(L)));
}

/* ---- orbs ---- */
const XP_OF_MOB = { zombie: 5, creeper: 5, enderman: 5, piglin: 5, ghast: 5, pig: [1, 3], cow: [1, 3], sheep: [1, 3], chicken: [1, 3] };
function mobXp(e) {
  if (e.type === 'magma') return e.size === 2 ? 2 : 1;
  const v = XP_OF_MOB[e.type] !== undefined ? XP_OF_MOB[e.type] : MOB_DEFS[e.type] && MOB_DEFS[e.type].xp;
  return Array.isArray(v) ? randInt(v[0], v[1]) : v || 0;
}
/* experience scattered as a few orbs (bigger orbs for more) */
function dropXp(game, x, y, z, n) {
  n = Math.round(n);
  for (let guard = 0; n > 0 && guard < 20; guard++) {
    const v = n >= 37 ? 37 : n >= 17 ? 17 : n >= 7 ? 7 : n >= 3 ? 3 : 1;
    n -= v;
    const e = new Entity('xp', x + randRange(-0.3, 0.3), y, z + randRange(-0.3, 0.3));
    e.value = v; e.w = 0.12; e.h = 0.25; e.vx = randRange(-1.5, 1.5); e.vy = randRange(2, 4); e.vz = randRange(-1.5, 1.5); e.spin = Math.random() * TAU;
    game.entities.push(e);
  }
}
/* orbs fall, then float to the nearest player within 8 blocks and are soaked up (the host hands other players theirs) */
function updateXpOrb(game, e, dt) {
  const pl = game.player;
  physicsStep(game.world, e, dt, 12);
  if (e.onGround) { const f = Math.pow(0.05, dt); e.vx *= f; e.vz *= f; }
  if (e.inWater) e.vy += 14 * dt;
  if (e.age < 0.6) return;
  let best = null, bd = 8;
  const near = (p, x, y, z) => { const d = Math.hypot(x - e.x, y + 0.9 - e.y, z - e.z); if (d < bd) { bd = d; best = { p, x, y, z }; } };
  if (pl.alive && game.state === 'playing') near(pl, pl.x, pl.y, pl.z);
  if (MP.role === 'host') for (const r of MP.remotes.values()) if (r.alive && r.lastState) near(r, r.tx, r.ty, r.tz);
  if (best) {
    const dx = best.x - e.x, dy = best.y + 0.9 - e.y, dz = best.z - e.z, k = (1 - bd / 8) * 30 * dt;
    e.vx += dx / bd * k; e.vy += dy / bd * k + 12 * dt; e.vz += dz / bd * k;
    if (bd < 1.1) {
      e.removed = true;
      if (best.p === pl) addXp(pl, e.value);
      else MP.giveXp(best.p, e.value);
    }
  }
  if (e.age > 300 || e.y < -40) e.removed = true;
}
function drawXpOrb(e, dx, dy, dz, m) {
  const P = PROG.entity, pulse = 0.5 + Math.sin(e.age * 6 + (e.spin || 0)) * 0.5, sc = (0.16 + Math.min(0.2, (e.value || 1) * 0.012)) / 16;
  gl.uniform1f(P.u.uBright, 1);
  gl.uniform4f(P.u.uTint, 1, 1, 0.6, 0.35 * pulse);
  M4.translate(m, m, dx, dy + 0.12 + Math.sin(e.age * 3) * 0.04, dz);
  M4.rotY(m, m, R.cam.yaw);
  M4.scale(m, m, sc, sc, sc);
  M4.translate(m, m, 0, -8, 0);
  drawMesh(tileMesh('xp_orb'), m);
  gl.uniform4f(P.u.uTint, 0, 0, 0, 0);
}

/* ---- enchantments ---- */
// on: what each goes on (a tool's kind, 'armor' or one armor slot); minP: the table's power needed; not: can't go with
const ENCH = {
  sharpness: { name: 'Sharpness', max: 5, on: ['sword', 'axe'] },
  knockback: { name: 'Knockback', max: 2, on: ['sword'] },
  fire_aspect: { name: 'Fire Aspect', max: 2, on: ['sword'], minP: 10 },
  looting: { name: 'Looting', max: 3, on: ['sword'], minP: 8 },
  efficiency: { name: 'Efficiency', max: 5, on: ['pickaxe', 'axe', 'shovel'] },
  fortune: { name: 'Fortune', max: 3, on: ['pickaxe', 'axe', 'shovel'], minP: 8, not: 'silk_touch' },
  silk_touch: { name: 'Silk Touch', max: 1, on: ['pickaxe', 'axe', 'shovel'], minP: 12, not: 'fortune' },
  unbreaking: { name: 'Unbreaking', max: 3, on: ['sword', 'axe', 'pickaxe', 'shovel', 'bow', 'crossbow', 'armor', 'shield', 'rod', 'lighter'] },
  protection: { name: 'Protection', max: 4, on: ['armor'] },
  feather_falling: { name: 'Feather Falling', max: 4, on: ['boots'] },
  respiration: { name: 'Respiration', max: 3, on: ['helmet'] },
  depth_strider: { name: 'Depth Strider', max: 3, on: ['boots'], minP: 8 },
  thorns: { name: 'Thorns', max: 3, on: ['chestplate'], minP: 10 },
  power: { name: 'Power', max: 5, on: ['bow'] },
  punch: { name: 'Punch', max: 2, on: ['bow'], minP: 8 },
  flame: { name: 'Flame', max: 1, on: ['bow'], minP: 12 },
  infinity: { name: 'Infinity', max: 1, on: ['bow'], minP: 16 },
  quick_charge: { name: 'Quick Charge', max: 3, on: ['crossbow'] },
  multishot: { name: 'Multishot', max: 1, on: ['crossbow'], minP: 10 },
  lure: { name: 'Lure', max: 3, on: ['rod'] },
  luck_of_the_sea: { name: 'Luck of the Sea', max: 3, on: ['rod'] },
};
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const enchText = (k, l) => ENCH[k].name + (ENCH[k].max > 1 ? ' ' + (ROMAN[l] || l) : '');
/* what kinds an item counts as for enchanting (null: it can't be enchanted) */
function enchKinds(id) {
  const a = armorOf(id);
  if (a) return ['armor', ARMOR_SLOTS[a.slot]];
  const t = toolOf(id);
  if (!t) return null;
  return [t.kind === 'crossbow' ? 'crossbow' : t.kind];
}
/* the level of one enchantment on a stack (0 if it hasn't got it) */
function enchLvl(s, k) {
  const e = s && s.tag && s.tag.ench;
  if (!e) return 0;
  for (const q of e) if (q[0] === k) return q[1];
  return 0;
}
const isEnchanted = s => !!(s && s.tag && s.tag.ench && s.tag.ench.length);
/* from another iPad: only real enchantments, at levels they can have */
TAG_CLEAN.ench = v => {
  if (!Array.isArray(v)) return null;
  const out = [];
  for (const q of v.slice(0, 6)) if (Array.isArray(q) && typeof q[0] === 'string' && Object.prototype.hasOwnProperty.call(ENCH, q[0]) && !out.some(o => o[0] === q[0])) out.push([q[0], clamp(q[1] | 0, 1, ENCH[q[0]].max)]);
  return out.length ? out : null;
};
/* bookshelves in the ring two blocks out from the table, at its height and one up (15 at most) */
function shelfPower(w, x, y, z) {
  let n = 0;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2) continue;
    for (let dy = 0; dy <= 1; dy++) if (w.getBlock(x + dx, y + dy, z + dz) === B.BOOKSHELF) n++;
  }
  return Math.min(15, n);
}
const enchLvlFor = (k, p) => clamp(Math.ceil(ENCH[k].max * p / 30), 1, ENCH[k].max);
/* the three choices for an item: the same each time for the same item, until you enchant something */
function enchOptions(st, shelves, seed) {
  const kinds = st && enchKinds(st.id);
  if (!kinds || isEnchanted(st)) return null;
  const r = mulberry32((seed ^ Math.imul(st.id, 7919)) >>> 0);
  return [0, 1, 2].map(slot => {
    const p = [3, 8, 14][slot] + shelves;
    const fits = k => ENCH[k].on.some(o => kinds.includes(o)) && (ENCH[k].minP || 0) <= p;
    const pool = Object.keys(ENCH).filter(fits);
    if (!pool.length) return null;
    const first = pool[Math.floor(r() * pool.length)], list = [[first, enchLvlFor(first, p)]];
    if (r() < p / 40) {
      const more = pool.filter(k => k !== first && ENCH[k].not !== first && ENCH[first].not !== k);
      if (more.length) { const k = more[Math.floor(r() * more.length)]; list.push([k, Math.max(1, enchLvlFor(k, p) - 1)]); }
    }
    return { ench: list, cost: slot + 1, need: Math.ceil(p / 2) };
  });
}

/* ---- the enchanting table screen ---- */
function openEnchant(x, y, z) {
  if (ui.inv) closeInv();
  game.releasePointer();
  ui.inv = { kind: 'ench', ench: { slots: [null, null], x, y, z, shelves: shelfPower(game.world, x, y, z), key: '' }, els: [], grid: null, out: null, n: 0, book: false, search: '' };
  buildInv();
  showScreen('scr-inv');
  game.uiOpen = true;
  sfx('chest', x + 0.5, y + 0.5, z + 0.5);
}
function buildEnchant(panel) {
  const E = ui.inv.ench;
  panel.appendChild(h('h3', { text: 'Enchanting Table' }));
  const row = h('div', { class: 'ench' }), left = h('div', { class: 'ench-slots' });
  left.appendChild(slotEl({ arr: E.slots, i: 0, kind: 'normal', accept: id => !!enchKinds(id), label: 'Something to enchant' }, 'big'));
  left.appendChild(slotEl({ arr: E.slots, i: 1, kind: 'normal', accept: id => id === I.LAPIS, label: 'Lapis lazuli' }, 'armor-slot sil5'));
  row.appendChild(left);
  row.appendChild(h('div', { class: 'ench-opts', id: 'ench-opts' }));
  panel.appendChild(row);
  panel.appendChild(h('p', { class: 'hint', id: 'ench-info' }));
  E.key = '';
  renderEnchOpts();
}
/* the three choice buttons: what each gives, what it costs, and whether you can */
function renderEnchOpts() {
  const inv = ui.inv, box = el('ench-opts');
  if (!inv || inv.kind !== 'ench' || !box) return;
  const E = inv.ench, pl = game.player, it = E.slots[0], lap = E.slots[1], creative = game.mode === 'creative';
  const key = (it ? it.id + ':' + JSON.stringify(it.tag || 0) : '') + '|' + (lap ? lap.count : 0) + '|' + (pl.xpLevel || 0) + '|' + (pl.enchSeed || 0) + '|' + creative;
  if (key === E.key) return;
  E.key = key;
  box.textContent = '';
  const opts = it ? enchOptions(it, E.shelves, pl.enchSeed || 0) : null;
  el('ench-info').textContent = (creative ? 'Creative: enchanting is free. ' : 'You are level ' + (pl.xpLevel || 0) + '. ') +
    (E.shelves ? E.shelves + ' bookshelves make it stronger.' : 'Bookshelves around the table (one block away) make it stronger.');
  for (let i = 0; i < 3; i++) {
    const o = opts && opts[i];
    let why = '';
    if (!it) why = 'Put a tool, weapon or armor in the big slot';
    else if (!opts) why = isEnchanted(it) ? 'This is already enchanted' : "This can't be enchanted";
    else if (!o) why = 'Nothing here';
    else if (!creative && (pl.xpLevel || 0) < o.need) why = 'Needs level ' + o.need;
    else if (!creative && (!lap || lap.count < o.cost)) why = 'Needs ' + o.cost + ' lapis lazuli';
    const label = o ? o.ench.map(q => enchText(q[0], q[1])).join(' + ') : '...';
    const b = h('button', { type: 'button', class: 'ench-opt' + (why ? ' cant' : ''), 'aria-disabled': why ? 'true' : 'false' },
      h('span', { class: 'en', text: label }), h('small', { text: why || (o.cost + (o.cost > 1 ? ' levels' : ' level') + ' and ' + o.cost + ' lapis') }), h('b', { class: 'lv', text: o ? String(o.need) : '' }));
    b.addEventListener('click', () => { if (why) { sfx('click'); toast(why, 2); return; } doEnchant(i); });
    box.appendChild(b);
  }
}
function doEnchant(i) {
  const E = ui.inv.ench, pl = game.player, it = E.slots[0], lap = E.slots[1], creative = game.mode === 'creative';
  const opts = it ? enchOptions(it, E.shelves, pl.enchSeed || 0) : null, o = opts && opts[i];
  if (!o || (!creative && ((pl.xpLevel || 0) < o.need || !lap || lap.count < o.cost))) return;
  it.tag = Object.assign(it.tag || {}, { ench: o.ench.map(q => q.slice()) });
  if (!creative) { lap.count -= o.cost; if (lap.count <= 0) E.slots[1] = null; spendLevels(pl, o.cost); }
  pl.enchSeed = (Math.random() * 2147483647) | 0;
  sfx('enchant');
  for (let k = 0; k < 24 && PARTICLES.length < 1500; k++) PARTICLES.push({ x: E.x + 0.5 + randRange(-1.5, 1.5), y: E.y + 1 + randRange(0, 1.5), z: E.z + 0.5 + randRange(-1.5, 1.5), vx: randRange(-0.5, 0.5), vy: randRange(-0.6, 0.2), vz: randRange(-0.5, 0.5), life: randRange(0.6, 1.2), tile: TILE.glyph, u: 0, v: 0, us: 16, size: 0.07, grav: 0, bright: 1 });
  toast(itemName(it.id) + ': ' + o.ench.map(q => enchText(q[0], q[1])).join(' and ') + '!', 3);
  game.stats.enchanted = (game.stats.enchanted || 0) + 1;
  ui.dirty = true;
  if (MP.role === 'guest') MP.sendSave();
  refreshInv();
  renderEnchOpts();
}
/* closing the screen gives back what was in its slots */
function returnEnchant(inv) {
  const pl = game.player;
  for (let i = 0; i < 2; i++) {
    const s = inv.ench.slots[i];
    if (!s) continue;
    const left = pl.give(s.id, s.count, s);
    if (left > 0) dropItem(game, pl.x, pl.y + 1.2, pl.z, s.id, left, true, s);
    inv.ench.slots[i] = null;
  }
}

/* ---- the book floating over each enchanting table, turning to face the nearest player ---- */
const ENCH_BOOKS = new Map();
SPECIAL_DRAW[B.ENCH_TABLE] = (w, x, y, z, data, s, t, cam) => {
  const k = tileKey(x, y, z);
  let b = ENCH_BOOKS.get(k);
  if (!b) { b = { yaw: 0, open: 0, shelves: shelfPower(w, x, y, z), shelfT: t }; ENCH_BOOKS.set(k, b); if (ENCH_BOOKS.size > 64) ENCH_BOOKS.delete(ENCH_BOOKS.keys().next().value); }
  if (t - b.shelfT > 5) { b.shelfT = t; b.shelves = shelfPower(w, x, y, z); }
  const pl = game.player, cx = x + 0.5, cz = z + 0.5, d = Math.hypot(pl.x - cx, pl.z - cz), dt = Math.min(0.1, t - (b.t || t));
  b.t = t;
  const near = d < 5;
  b.yaw = approachAngle(b.yaw, near ? Math.atan2(pl.x - cx, pl.z - cz) : b.yaw + 0.3, dt * (near ? 4 : 0.6));
  b.open = clamp(b.open + (near ? dt : -dt) * 1.5, 0, 1);
  const bob = REDUCED_MOTION ? 0 : Math.sin(t * 2 + x) * 0.05;
  const P = PROG.entity;
  entityBegin(texSkins);
  gl.uniform1f(P.u.uBright, brightAt(w, cx, y + 1.2, cz, s));
  M4.identity(_sd);
  M4.translate(_sd, _sd, cx - cam.x, y + 1.05 + bob - cam.y, cz - cam.z);
  M4.rotY(_sd, _sd, b.yaw);
  M4.rotX(_sd, _sd, 1.2);   // standing up, leaning back a little, pages toward the player
  M4.scale(_sd, _sd, 1 / 16, 1 / 16, 1 / 16);
  const a = 0.15 + b.open * 1.05, flap = REDUCED_MOTION ? 0 : Math.sin(t * 5) * 0.05 * b.open, th = Math.PI / 2 - a;
  gl.enable(gl.CULL_FACE);
  drawModel(MODELS.ench_book, _sd, { lc: [0, 0, -th - flap], rc: [0, 0, th + flap] });
  // letters drift from the bookshelves into the book
  if (b.shelves && d < 12 && Math.random() < dt * (1 + b.shelves * 0.3) && PARTICLES.length < 1400) {
    const ang = Math.random() * TAU, sx = cx + Math.cos(ang) * 2.2, sz = cz + Math.sin(ang) * 2.2, sy = y + 1.5 + Math.random();
    PARTICLES.push({ x: sx, y: sy, z: sz, vx: (cx - sx) * 0.9, vy: (y + 1 - sy) * 0.9, vz: (cz - sz) * 0.9, life: 1.1, tile: TILE.glyph, u: 0, v: 0, us: 16, size: 0.06, grav: 0, bright: 1 });
  }
};

/* ---- creatures on fire (Fire Aspect, Flame) ---- */
function mobFire(game, e, dt) {
  if (!(e.fireT > 0)) return;
  e.fireT -= dt;
  if (e.inWater) e.fireT = 0;
  if (Math.random() < dt * 18 && PARTICLES.length < 1500) PARTICLES.push({ x: e.x + randRange(-e.w, e.w), y: e.y + Math.random() * e.h, z: e.z + randRange(-e.w, e.w), vx: 0, vy: 0.8, vz: 0, life: randRange(0.25, 0.5), tile: TILE.flame, u: 0, v: 0, us: 16, size: 0.12, grav: -0.5, bright: 1 });
  if (e.proxy) return;
  e.burnTick = (e.burnTick || 0) + dt;
  if (e.burnTick >= 1) { e.burnTick = 0; if (!MOB_DEFS[e.type].fireproof) hurtMob(game, e, 1, e.x, e.z, 'fire'); }
}

/* ---- Bottle o' Enchanting: thrown, it breaks into experience ---- */
function xpBottleBreak(game, x, y, z) {
  sfx('break_glass', x, y, z);
  for (let k = 0; k < 16 && PARTICLES.length < 1500; k++) PARTICLES.push({ x, y, z, vx: randRange(-2, 2), vy: randRange(0, 3), vz: randRange(-2, 2), life: randRange(0.4, 0.8), tile: TILE.xp_orb, u: 0, v: 0, us: 16, size: 0.05, grav: 4, bright: 1 });
  MP.fx('xpb', x, y, z);
  dropXp(game, x, y + 0.2, z, randInt(3, 11));
}

/* ---- what enchantments do (the rest is where each thing happens) ---- */
/* Protection on any armor, and Feather Falling on boots for falls: the share of a hit taken away */
function armorEnchCut(pl, cause) {
  if (cause === 'void' || cause === 'starve') return 0;
  let n = 0;
  for (let k = 0; k < 4; k++) n += enchLvl(pl.inv[ARMOR_INV + k], 'protection');
  let cut = n * 0.04;
  if (cause === 'fall') cut += enchLvl(pl.inv[ARMOR_INV + 3], 'feather_falling') * 0.12;
  return Math.min(0.8, cut);
}
/* Thorns: a creature that hits you may be hurt back */
function thornsBack(pl, src) {
  const l = enchLvl(pl.inv[ARMOR_INV + 1], 'thorns');
  if (!l || Math.random() >= 0.15 * l) return;
  if (src.proxy) MP.send({ t: 'hit', e: src.nid, d: randInt(1, 4), x: pl.x, z: pl.z });   // (a guest: the creature is really on the host's iPad)
  else hurtMob(game, src, randInt(1, 4), pl.x, pl.z, 'thorns');
}
/* Unbreaking: each use only sometimes wears it down */
const unbroken = s => { const l = enchLvl(s, 'unbreaking'); return l > 0 && Math.random() >= 1 / (l + 1); };
