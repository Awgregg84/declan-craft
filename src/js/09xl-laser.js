/* ===================== The Laser Blaster (the sixth wish list) ===================== */
// A tap fires a bright beam in the colour you picked (the Color button at the top, or F, picks the next one), with a
// "pew" and a little glow where it hits. It only hurts monsters: players, pets, villagers, students, golems, robots and
// every other friendly creature are left alone, and it breaks no blocks (though it lights TNT, for fun). The host, or a
// one-player game, decides what a beam hits; a guest sees their own beam at once.
const LASER_COLORS = [['Red', '#ff3a3a'], ['Green', '#3aff6a'], ['Blue', '#4a9aff'], ['Purple', '#c05aff'], ['Pink', '#ff6ad0'], ['Yellow', '#ffe83a']];   // (new colours go on the end)
const LASER_RANGE = 40, LASER_DMG = 5, LASER_CD = 0.35;
defItem(I.LASER, 'Laser Blaster', { tex: 'laser', stack: 1 });
/* a monster the beam may hurt (an angry piglin counts; never a friend) */
const laserPrey = m => { const d = MOB_DEFS[m.type]; return !!d && !d.robot && !d.spirit && !!(d.hostile || (d.neutral && !d.guard && m.angryT > 0)); };
/* what a beam from o along d meets first: a creature, a block or nothing (the end of the beam) */
function laserTrace(game, ox, oy, oz, dx, dy, dz, skip) {
  const hit = raycast(game.world, ox, oy, oz, dx, dy, dz, LASER_RANGE, true);
  let t = hit ? hit.t : LASER_RANGE, mob = null;
  for (const e of game.entities) {
    if (!e.mob || e.dead || e.removed || e === skip) continue;
    const hw = (e.w || 0.6) / 2 + 0.1, tb = rayBox(ox, oy, oz, dx, dy, dz, e.x - hw, e.y, e.z - hw, e.x + hw, e.y + (e.h || 1.8), e.z + hw);
    if (tb >= 0 && tb < t) { t = tb; mob = e; }
  }
  return { t, mob, blk: !mob && hit ? hit : null, x: ox + dx * t, y: oy + dy * t, z: oz + dz * t };
}
/* the beam does what it does (the host or a one-player game): monsters are hurt, TNT lights */
function laserHit(game, tr, ox, oz, by) {
  if (tr.mob && laserPrey(tr.mob)) hurtMob(game, tr.mob, LASER_DMG, ox, oz, 'player', by);
  else if (tr.blk && tntKindOf(tr.blk.id)) igniteTNT(game, tr.blk.x, tr.blk.y, tr.blk.z);
}
/* the beam and the glow, on this iPad */
function laserBeam(x0, y0, z0, x1, y1, z1, c) {
  const tile = TILE['laser_' + clamp(c | 0, 0, LASER_COLORS.length - 1)], n = Math.min(80, Math.ceil(Math.hypot(x1 - x0, y1 - y0, z1 - z0) * 4));
  for (let i = 0; i <= n && PARTICLES.length < 1550; i++) {
    const t = i / n;
    PARTICLES.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, z: z0 + (z1 - z0) * t, vx: 0, vy: 0, vz: 0, life: 0.16 + t * 0.06, tile, u: 0, v: 0, us: 16, size: 0.06, grav: 0, bright: 1 });
  }
  for (let i = 0; i < 14 && PARTICLES.length < 1580; i++) PARTICLES.push({ x: x1, y: y1, z: z1, vx: randRange(-1.6, 1.6), vy: randRange(-1, 2), vz: randRange(-1.6, 1.6), life: randRange(0.2, 0.45), tile, u: 0, v: 0, us: 16, size: randRange(0.06, 0.13), grav: 0, bright: 1 });
  sfx('laserHit', x1, y1, z1);
}
/* tap with the blaster: pew! (returns how long until the next shot) */
function fireLaser(game, pl) {
  const [dx, dy, dz] = pl.lookDir(), [ex, ey, ez] = pl.eyePos(), c = pl.laserC | 0;
  pl.swing();
  const tr = laserTrace(game, ex, ey, ez, dx, dy, dz);
  // the beam starts at the blaster, a little to the right and below your eyes
  const rx = Math.cos(pl.yaw) * 0.25, rz = -Math.sin(pl.yaw) * 0.25;
  laserBeam(ex + rx + dx * 0.5, ey - 0.2 + dy * 0.5, ez + rz + dz * 0.5, tr.x, tr.y, tr.z, c);
  sfx('laserPew', ex, ey, ez);
  if (MP.role === 'guest') MP.send({ t: 'laser', p: [r2(ex), r2(ey), r2(ez)], d: [dx, dy, dz].map(v => Math.round(v * 1000) / 1000), c });
  else { laserHit(game, tr, ex, ez); MP.localFx('laser', r2(tr.x), r2(tr.y), r2(tr.z), c); }
  return LASER_CD;
}
/* a guest's shot, on the host: it is traced again here, and everyone sees it */
function laserMsg(game, r, m) {
  if (!okXYZ(m.p) || !okXYZ(m.d) || Math.hypot(m.p[0] - r.tx, m.p[2] - r.tz) > 6 || Math.abs(m.p[1] - r.ty - 1.5) > 12) return;
  if (r.laserT > game.t) return;   // (not faster than a blaster can fire)
  r.laserT = game.t + LASER_CD * 0.8;
  const l = Math.hypot(m.d[0], m.d[1], m.d[2]);
  if (l < 0.5 || l > 1.5) return;
  const dx = m.d[0] / l, dy = m.d[1] / l, dz = m.d[2] / l, c = clamp(m.c | 0, 0, LASER_COLORS.length - 1);
  const tr = laserTrace(game, m.p[0], m.p[1], m.p[2], dx, dy, dz);
  laserHit(game, tr, m.p[0], m.p[2], r.id);
  laserBeam(m.p[0], m.p[1] - 0.2, m.p[2], tr.x, tr.y, tr.z, c);
  sfx('laserPew', m.p[0], m.p[1], m.p[2]);
  MP.outFx.push(['laser', r2(tr.x), r2(tr.y), r2(tr.z), c, r.id]);
}
/* someone else's beam (from the host's word on it) */
function laserFx(x, y, z, c, from) {
  const r = MP.remotes.get(from);
  if (r) { const sx = r.x !== undefined ? r.x : r.tx, sy = (r.y !== undefined ? r.y : r.ty) + 1.4, sz = r.z !== undefined ? r.z : r.tz; laserBeam(sx, sy, sz, x, y, z, c); sfx('laserPew', sx, sy, sz); }
  else laserBeam(x, y, z, x, y, z, c);
}
/* the Color button (or F) while holding the blaster */
function nextLaserColor(pl) {
  pl.laserC = ((pl.laserC | 0) + 1) % LASER_COLORS.length;
  showLaserColor(pl, true);
  sfx('click');
}
function showLaserColor(pl, say) {
  const b = el('tb-spell'), n = LASER_COLORS[pl.laserC | 0][0];
  b.textContent = n; b.setAttribute('aria-label', 'Laser colour: ' + n + '. Tap for the next colour.');
  if (say) showItemName(n + ' laser');
}
