/* ===================== Armor and shields ===================== */
// Armor goes in the four armor slots of the inventory (or tap Place holding it to put it on). It takes some of
// the damage from monsters, arrows, blasts, fire and cactus, but not from falling, drowning, hunger or the void,
// and wears out doing it. A shield, held in the hand or put in the off-hand slot, is raised by holding Place:
// it stops hits, arrows, fireballs and blasts from in front.
const ARMOR_CAUSES = new Set(['zombie', 'piglin', 'magma', 'enderman', 'explosion', 'arrow', 'fireball', 'ghast', 'cactus', 'lava', 'fire', 'golem']);
const SHIELD_CAUSES = new Set(['zombie', 'piglin', 'magma', 'enderman', 'explosion', 'arrow', 'fireball', 'ghast']);
/* the armor ids someone has on (a player here, or one on another iPad), helmet to boots */
function wornArmor(p) {
  if (p.inv) { const out = []; for (let k = 0; k < 4; k++) { const s = p.inv[ARMOR_INV + k]; out.push(s ? s.id : 0); } return out; }
  return p.armor || [0, 0, 0, 0];
}
function armorPoints(inv) {
  let n = 0;
  for (let k = 0; k < 4; k++) { const s = inv[ARMOR_INV + k], a = s && armorOf(s.id); if (a) n += a.def; }
  return n;
}
/* the share of a hit that armor takes away: 4% a point, 80% at most */
const armorCut = pts => Math.min(0.8, pts * 0.04);
function wearArmor(pl, dmg) {
  const n = Math.max(1, Math.floor(dmg / 4));
  for (let k = 0; k < 4; k++) {
    const i = ARMOR_INV + k, s = pl.inv[i], t = s && toolOf(s.id);
    if (!t || unbroken(s)) continue;
    s.dmg = (s.dmg || 0) + n;
    if (s.dmg >= t.dur) { pl.inv[i] = null; sfx('toolBreak'); toast('Your ' + itemName(s.id) + ' broke!', 2.5); }
  }
  game.ui.dirty = true;
}
/* tap Place holding a piece of armor: put it on (whatever was on goes into the hand) */
function equipArmor(pl) {
  const s = pl.inv[pl.sel], a = s && armorOf(s.id);
  if (!a) return false;
  const i = ARMOR_INV + a.slot;
  pl.inv[pl.sel] = pl.inv[i]; pl.inv[i] = s;
  sfx('armorEquip', pl.x, pl.y + 1, pl.z);
  game.ui.dirty = true;
  return true;
}
/* which hand has a shield: 'main' (held), 'off' (the off-hand slot) or null */
function shieldHand(pl) {
  if (pl.heldId() === I.SHIELD) return 'main';
  return pl.inv[OFFHAND] && pl.inv[OFFHAND].id === I.SHIELD ? 'off' : null;
}
/* the off-hand shield goes up when what is in your hand has nothing to do: empty, a weapon or tool, or a block
   while you are not pointing at anything to put it on */
function offhandFree(pl, hid) {
  if (!hid) return true;
  const t = toolOf(hid);
  if (t) return wearsOnHit(t);
  return isBlockItem(hid) && !pl.target;
}
/* is something at fx, fz in front of the player (where a raised shield faces)? */
function shieldFacing(pl, fx, fz) {
  const dx = fx - pl.x, dz = fz - pl.z, l = Math.hypot(dx, dz);
  return l < 0.05 || (-Math.sin(pl.yaw) * dx - Math.cos(pl.yaw) * dz) / l > -0.1;
}
function shieldBlock(pl, amount, src) {
  const i = pl.heldId() === I.SHIELD ? pl.sel : OFFHAND, s = pl.inv[i];
  sfx('shieldBlock', pl.x, pl.y + 1.2, pl.z);
  pl.blockJolt = 0.2;
  if (s && s.id === I.SHIELD && game.mode !== 'creative' && !unbroken(s)) {
    s.dmg = (s.dmg || 0) + 1 + Math.floor(amount);
    if (s.dmg >= ITEMS[I.SHIELD].tool.dur) { pl.inv[i] = null; sfx('toolBreak'); toast('Your shield broke!', 2.5); }
    game.ui.dirty = true;
  }
  if (src && src.mob && !src.proxy && !src.dead) {   // whatever hit it is pushed back
    const dx = src.x - pl.x, dz = src.z - pl.z, l = Math.hypot(dx, dz) || 1;
    src.vx += dx / l * 6; src.vz += dz / l * 6; src.vy = Math.max(src.vy, 3);
  }
}

/* ---- drawing ---- */
const _am = M4.create();
/* which of someone's things shimmer (enchanted): bits 0-3 their armor, bit 4 what is in their hand */
function wornGlint(p) {
  if (!p.inv) return p.glint || 0;
  let g = 0;
  for (let k = 0; k < 4; k++) if (isEnchanted(p.inv[ARMOR_INV + k])) g |= 1 << k;
  if (isEnchanted(p.inv[p.sel])) g |= 16;
  return g;
}
/* the purple shimmer on enchanted things in the world */
function glintOn(on) {
  const u = PROG.entity.u;
  if (on) gl.uniform4f(u.uTint, 0.62, 0.32, 1, REDUCED_MOTION ? 0.25 : 0.2 + 0.13 * Math.sin(game.t * 4));
  else gl.uniform4f(u.uTint, 0, 0, 0, 0);
}
/* armor over a posed player model (base is the model's matrix, already scaled) */
function drawArmor(ids, base, pose, t, glint) {
  for (let k = 0; k < 4; k++) {
    const a = ids[k] && armorOf(ids[k]);
    if (!a) continue;
    if (glint & (1 << k)) glintOn(true);
    drawModel(MODELS[a.model || 'armor_' + ARMOR_MATS[a.mat] + '_' + k], base, pose);   // (a space helmet has its own)
    if (glint & (1 << k)) glintOn(false);
  }
}
/* a shield on someone's arm: hanging at the side, or up in front of them when they block */
function drawShield(base, pose, hand, blocking) {
  _am.set(base);
  const side = hand === 'main' ? -1 : 1;
  if (blocking) {
    M4.translate(_am, _am, side * 2.5, 15, 7.5);
    M4.rotY(_am, _am, -side * 0.25);
  } else {
    const arm = pose[hand === 'main' ? 'rarm' : 'larm'] || [0, 0, 0], pv = [side * 6, 22, 0];
    M4.translate(_am, _am, pv[0], pv[1], pv[2]);
    if (arm[2]) M4.rotZ(_am, _am, arm[2]);
    if (arm[1]) M4.rotY(_am, _am, arm[1]);
    if (arm[0]) M4.rotX(_am, _am, arm[0]);
    M4.translate(_am, _am, side * 3.2, -7, 1);
    M4.rotY(_am, _am, side * Math.PI / 2);
  }
  drawModel(MODELS.shield, _am, null);
}
/* the shield hand of this device's player, or of someone on another iPad (from what their iPad says) */
function shieldOf(p) { return p.inv ? shieldHand(p) : p.shield || null; }
