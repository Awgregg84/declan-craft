/* ===================== Potions, brewing and effects ===================== */
// Fill a glass bottle at some water, then brew it at a brewing stand with an ingredient (see POTIONS in
// 01-blocks.js) to make a potion. Brew a potion with gunpowder to make a splash potion, which is thrown and
// reaches everyone (and every creature) near where it breaks. Drinking (hold Place) or being splashed gives an
// effect for a while, shown in the top corner of the screen. Healing is at once; water washes off poison and slowness.
const BREW_TIME = 8;
const BREW = {};   // ingredient -> the potion it makes from a water bottle
POTIONS.forEach((pt, k) => { if (pt.from) BREW[pt.from] = k; });
const EFFECTS = POTIONS.filter(pt => pt.dur).map(pt => pt.key);
const EFFECT_NAMES = {};
POTIONS.forEach(pt => { if (pt.dur) EFFECT_NAMES[pt.key] = pt.name.replace('Potion of ', ''); });
const potionByKey = key => POTIONS.findIndex(pt => pt.key === key);
const UNDEAD = { zombie: 1, piglin: 1 };   // healing hurts them, as in Minecraft

/* what a bottle slot's stack becomes when brewed with ingredient ing (null: nothing) */
function brewResult(st, ing) {
  const p = st && potionOf(st.id);
  if (!p || !ing) return null;
  if (ing === I.GUNPOWDER) return p.splash ? null : potionId(p.k, true);
  if (p.k !== 0 || p.splash || BREW[ing] === undefined) return null;
  return potionId(BREW[ing], false);
}
/* one brewing stand for dt seconds; true when a brew has just finished */
function stepBrew(t, dt) {
  const ing = t.slots[3], can = !!ing && [0, 1, 2].some(i => brewResult(t.slots[i], ing.id));
  if (!can) { t.t = 0; return false; }
  t.t = (t.t || 0) + dt;
  if (t.t < BREW_TIME) return false;
  t.t = 0;
  for (let i = 0; i < 3; i++) { const out = brewResult(t.slots[i], ing.id); if (out) t.slots[i] = { id: out, count: 1 }; }
  ing.count--; if (ing.count <= 0) t.slots[3] = null;
  return true;
}

/* ---- effects on players ---- */
function giveEffect(p, key, secs) {
  if (!(secs > 0)) return;
  if (!p.effects) p.effects = {};
  const cur = p.effects[key];
  p.effects[key] = Object.assign(cur || {}, { t: Math.max(cur ? cur.t : 0, secs) });
  if (p === game.player) ui.fx = '';
}
const hasEffect = (p, key) => !!(p && p.effects && p.effects[key] && p.effects[key].t > 0);
/* potion k drunk (scale 1) or splashed (less the further from the splash) */
function potionOnPlayer(pl, k, scale) {
  const pt = POTIONS[k];
  if (!pl.alive) return;
  if (pt.key === 'water') { if (pl.effects) { delete pl.effects.poison; delete pl.effects.slowness; ui.fx = ''; } return; }
  if (pt.key === 'healing') { pl.health = Math.min(20, pl.health + Math.round(8 * scale)); ui.hearts = -2; return; }
  giveEffect(pl, pt.key, pt.dur * scale);
  if (pt.bad && game.mode === 'creative') delete pl.effects[pt.key];
}
function tickEffects(pl, dt) {
  const fx = pl.effects;
  if (!fx) return;
  for (const k in fx) {
    const e = fx[k];
    e.t -= dt;
    if (!(e.t > 0)) { delete fx[k]; ui.fx = ''; continue; }
    if (k === 'poison' || k === 'regeneration') {
      e.tick = (e.tick || 0) + dt;
      const every = k === 'poison' ? 1.25 : 2.5;
      if (e.tick >= every) {
        e.tick -= every;
        if (k === 'poison') { if (pl.health > 1) { pl.invuln = 0; pl.damage(1, 'poison'); } }
        else if (pl.health < 20) pl.health = Math.min(20, pl.health + 1);
      }
    }
  }
  effectSwirls(pl.x, pl.y, pl.z, effectBits(pl), dt, game.view > 0 ? 1 : 0.25);
}
/* which effects someone has, as bits in EFFECTS order (sent to other players) */
function effectBits(p) {
  if (!p.effects) return p.fxBits || 0;
  let b = 0;
  EFFECTS.forEach((k, i) => { if (hasEffect(p, k)) b |= 1 << i; });
  return b;
}
const isInvisible = p => (p.inv ? hasEffect(p, 'invisibility') : !!((p.fxBits || 0) & (1 << EFFECTS.indexOf('invisibility'))));
/* little swirls in the effects' colors */
function effectSwirls(x, y, z, bits, dt, rate) {
  if (!bits || REDUCED_MOTION) return;
  EFFECTS.forEach((k, i) => {
    if (!(bits & (1 << i)) || k === 'invisibility' || Math.random() > dt * 5 * rate || PARTICLES.length > 1400) return;
    const a = Math.random() * TAU, pk = potionByKey(k);
    PARTICLES.push({ x: x + Math.cos(a) * 0.4, y: y + 0.2 + Math.random() * 1.6, z: z + Math.sin(a) * 0.4, vx: -Math.sin(a) * 0.4, vy: 0.6, vz: Math.cos(a) * 0.4, life: 0.7, tile: TILE['swirl_' + pk], u: 0, v: 0, us: 16, size: 0.05, grav: -0.2, bright: 1 });
  });
}

/* ---- effects on creatures ---- */
function potionOnMob(game, e, k, scale) {
  const pt = POTIONS[k], d = MOB_DEFS[e.type];
  if (e.dead || e.removed || d.villager && pt.bad) return;
  if (pt.key === 'water') { e.fireT = 0; if (e.type === 'enderman') { hurtMob(game, e, 1, e.x, e.z, 'water'); enderTeleport(game, e, 'dodge'); } return; }
  if (pt.key === 'healing') { if (UNDEAD[e.type]) hurtMob(game, e, Math.round(6 * scale), e.x, e.z, 'magic', undefined, { nokb: true }); else e.hp = Math.min(mobMaxHp(e), e.hp + 8 * scale); return; }
  if (!e.effects) e.effects = {};
  e.effects[pt.key] = Math.max(e.effects[pt.key] || 0, pt.dur * scale);
}
function tickMobEffects(game, e, dt) {
  const fx = e.effects;
  if (!fx) return;
  for (const k in fx) {
    fx[k] -= dt;
    if (fx[k] <= 0) { delete fx[k]; continue; }
    if (k === 'poison' || k === 'regeneration') {
      const tk = k === 'poison' ? 'fxTickP' : 'fxTickR';   // (each has its own beat)
      e[tk] = (e[tk] || 0) + dt;
      if (e[tk] >= 1.25) {
        e[tk] = 0;
        if (k === 'poison') { if (e.hp > 1 && !UNDEAD[e.type]) hurtMob(game, e, 1, e.x, e.z, 'poison', undefined, { nokb: true }); }
        else e.hp = Math.min(mobMaxHp(e), e.hp + 1);
      }
    }
  }
}
const mobSpeedFx = e => (!e.effects ? 1 : (e.effects.swiftness > 0 ? 1.4 : 1) * (e.effects.slowness > 0 ? 0.5 : 1));
const mobInvisible = e => !!(e.effects && e.effects.invisibility > 0) || !!e.invis;

/* ---- splash potions ---- */
function splashPotion(game, x, y, z, k) {
  splashFx(x, y, z, k);
  MP.fxId('splash', x, y, z, k);
  const R = 4, pl = game.player, near = (px, py, pz) => Math.hypot(px - x, py + 0.9 - y, pz - z);
  if (pl.alive) { const d = near(pl.x, pl.y, pl.z); if (d < R) potionOnPlayer(pl, k, 1 - (d / R) * 0.75); }
  if (MP.role === 'host') for (const r of MP.remotes.values()) {
    if (!r.alive || !r.lastState) continue;
    const d = near(r.tx, r.ty, r.tz);
    if (d < R && r.link) r.link.send({ t: 'eff', k, s: r2(1 - (d / R) * 0.75) });
  }
  for (const e of game.entities) if (e.mob && !e.dead && !e.removed) { const d = near(e.x, e.y + e.h * 0.5 - 0.9, e.z); if (d < R) potionOnMob(game, e, k, 1 - (d / R) * 0.75); }
}
function splashFx(x, y, z, k) {
  sfx('splashPotion', x, y, z);
  const t = TILE['swirl_' + k];
  for (let i = 0; i < 40 && PARTICLES.length < 1550; i++) {
    const a = Math.random() * TAU, sp = randRange(1, 4);
    PARTICLES.push({ x, y: y + 0.2, z, vx: Math.cos(a) * sp, vy: randRange(0.5, 3), vz: Math.sin(a) * sp, life: randRange(0.4, 0.9), tile: t, u: 0, v: 0, us: 16, size: randRange(0.05, 0.1), grav: 6, bright: 1 });
  }
  blockParticles(Math.floor(x), Math.floor(y), Math.floor(z), B.GLASS, 6, false);
}

/* ---- glass bottles: filled at water you are looking at (or standing in) ---- */
function waterInReach(pl) {
  const [ox, oy, oz] = pl.eyePos(), [dx, dy, dz] = pl.lookDir(), w = game.world;
  if (pl.inWater) return true;
  for (let t = 0; t < 4.6; t += 0.2) {
    const b = w.getBlock(Math.floor(ox + dx * t), Math.floor(oy + dy * t), Math.floor(oz + dz * t));
    if (b === B.WATER) return true;
    if (SOLID[b]) return false;
  }
  return false;
}

/* ---- the brewing stand screen ---- */
function buildBrew(panel) {
  const inv = ui.inv, slots = inv.tile.slots;
  panel.appendChild(h('h3', { text: 'Brewing Stand' }));
  const box = h('div', { class: 'brew' });
  const top = h('div', { class: 'brew-top' });
  top.appendChild(slotEl({ arr: slots, i: 3, kind: 'normal', accept: id => BREW[id] !== undefined || id === I.GUNPOWDER, label: 'Ingredient' }));
  const bub = h('div', { class: 'bubbles' }); bub.appendChild(h('div', { class: 'fill', id: 'brew-fill' }));
  top.appendChild(bub);
  box.appendChild(top);
  const row = h('div', { class: 'brew-row' });
  for (let i = 0; i < 3; i++) row.appendChild(slotEl({ arr: slots, i, kind: 'normal', accept: id => !!potionOf(id), label: 'Bottle ' + (i + 1) }, 'armor-slot sil6'));
  box.appendChild(row);
  panel.appendChild(box);
  panel.appendChild(h('p', { class: 'hint', text: 'Fill glass bottles at some water. Put up to three water bottles at the bottom and something to brew at the top. Gunpowder turns a potion into a splash potion.' }));
  const show = h('button', { type: 'button', class: 'btn brew-show', 'aria-pressed': inv.book ? 'true' : 'false' }, inv.book ? 'Hide potion recipes' : 'Potion recipes');
  show.addEventListener('click', () => { inv.book = !inv.book; buildInv(); });
  panel.appendChild(show);
}
function buildBrewBook(root) {
  const book = h('div', { class: 'panel book brew-book' });
  book.appendChild(h('h3', { text: 'Potion recipes' }));
  const list = h('div', { class: 'recipes' });
  const row = (ing, out, text) => { const r = h('div', { class: 'recipe' }); r.appendChild(tradeStack(potionId(0, false), 1)); r.appendChild(h('span', { text: '+' })); r.appendChild(tradeStack(ing, 1)); r.appendChild(h('span', { class: 'tarrow', 'aria-hidden': 'true' })); r.appendChild(tradeStack(out, 1)); r.appendChild(h('small', { text })); list.appendChild(r); };
  POTIONS.forEach((pt, k) => { if (pt.from) row(pt.from, potionId(k, false), pt.name.replace('Potion of ', '')); });
  book.appendChild(list);
  book.appendChild(h('p', { class: 'hint', text: 'Any potion + gunpowder = a splash potion to throw.' }));
  root.appendChild(book);
}
function updateBrewUI() {
  const inv = ui.inv, f = el('brew-fill');
  if (!inv || inv.kind !== 'brew' || !f) return;
  f.style.height = (clamp((inv.tile.t || 0) / BREW_TIME, 0, 1) * 100) + '%';
}

/* ---- saving the effects you have ---- */
function saveEffects(pl) { const o = {}; for (const k of EFFECTS) if (hasEffect(pl, k)) o[k] = Math.round(pl.effects[k].t); return o; }
function loadEffects(pl, o) {
  pl.effects = {};
  if (o && typeof o === 'object') for (const k of EFFECTS) { const t = +o[k]; if (t > 0) pl.effects[k] = { t: Math.min(t, 600) }; }
  ui.fx = '';
}

/* ---- the effects you have, in the top corner of the screen ---- */
const FX_ICON = {};
function buildEffectIcons() {
  const G = {
    regeneration: ['.KK.KK.', 'KWWKWWK', 'KWWWWWK', '.KWWWK.', '..KWK..', '...K...', '.......'],
    swiftness: ['...K...', '..KWK..', '.KWWWK.', 'KKWWWKK', '..KWK..', '..KWK..', '..KKK..'],
    strength: ['.......', 'KKKKKK.', 'KWWWWWK', 'KWWWWWK', 'KWWWWK.', 'KKKKK..', '.......'],
    fire_resistance: ['...K...', '..KWK..', '.KWWK..', '.KWWWK.', 'KWWWWWK', 'KWWWWWK', '.KKKKK.'],
    night_vision: ['.......', '.KKKKK.', 'KWWKWWK', 'KWKKKWK', 'KWWKWWK', '.KKKKK.', '.......'],
    water_breathing: ['..KKK..', '.KWWWK.', 'KWWKWWK', 'KWWWWWK', 'KWWWWWK', '.KWWWK.', '..KKK..'],
    leaping: ['..KKK..', '.KWWWK.', 'KWWWWWK', '..KWK..', '..KWK..', '..KWK..', '..KKK..'],
    invisibility: ['.K.K.K.', 'K.....K', '.......', 'K.....K', '.......', 'K.....K', '.K.K.K.'],
    poison: ['...K...', '..KWK..', '.KWWWK.', '.KWWWK.', 'KWWWWWK', 'KWWWWWK', '.KKKKK.'],
    slowness: ['..KKK..', '.KWWWK.', 'KWWKWWK', 'KWKKKWK', 'KWWKKWK', '.KWWWK.', '..KKK..'],
  };
  for (const k of EFFECTS) FX_ICON[k] = pixelIcon(G[k], { K: '#101010', W: POTIONS[potionByKey(k)].color }, 4);
}
function renderEffects() {
  const pl = game.player, fx = pl.effects || {}, keys = EFFECTS.filter(k => hasEffect(pl, k)), box = el('effects');
  const sig = keys.map(k => k + Math.ceil(fx[k].t)).join(',');
  if (sig === ui.fx) return;
  ui.fx = sig;
  if (keys.join() !== ui.fxSet || box.children.length !== keys.length) {   // an effect began or ended: new rows (a screen reader says which)
    ui.fxSet = keys.join();
    box.textContent = '';
    for (const k of keys) box.appendChild(h('div', { class: 'fx-row' + (POTIONS[potionByKey(k)].bad ? ' bad' : '') }, h('img', { src: FX_ICON[k], alt: '' }),
      h('span', {}, h('span', { text: EFFECT_NAMES[k] }), h('span', { class: 'fx-time', 'aria-hidden': 'true' }))));
  }
  keys.forEach((k, i) => {   // the time left changes every second, quietly
    const s = Math.ceil(fx[k].t), t = box.children[i].querySelector('.fx-time');
    t.textContent = ' ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  });
}
