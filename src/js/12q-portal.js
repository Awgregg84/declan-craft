/* ===================== Nether portals =====================
   A portal is an obsidian frame (inside at least 2 wide and 3 tall) lit with flint and steel.
   Records look like { d: 'over' | 'nether', x, y, z, a, w, h }: the bottom-left inside block,
   the axis (0: the portal's face runs along x, 1: along z) and the inside size. */
const PORTAL_MAX = 21;
const okPortal = p => !!p && (p.d === 'over' || p.d === 'nether') && [p.x, p.y, p.z].every(Number.isInteger) && (p.a === 0 || p.a === 1) &&
  p.w >= 2 && p.w <= PORTAL_MAX && p.h >= 3 && p.h <= PORTAL_MAX;
const portalAxis = a => (a === 0 ? [1, 0] : [0, 1]);   // [hx, hz]: the direction along the portal

/* the frame around an empty spot, or null */
function findPortalFrame(w, x, y, z) {
  const inside = (bx, by, bz) => { const b = w.getBlock(bx, by, bz); return b === B.AIR || b === B.NETHER_PORTAL; };
  const obs = (bx, by, bz) => w.getBlock(bx, by, bz) === B.OBSIDIAN;
  if (!inside(x, y, z)) return null;
  for (const a of [0, 1]) {
    const [hx, hz] = portalAxis(a);
    let by = y;
    while (by > 1 && y - by < PORTAL_MAX && inside(x, by - 1, z)) by--;
    if (!obs(x, by - 1, z)) continue;
    let l = 0;
    while (l < PORTAL_MAX && inside(x - hx * (l + 1), by, z - hz * (l + 1))) l++;
    const ox = x - hx * l, oz = z - hz * l;
    if (!obs(ox - hx, by, oz - hz)) continue;
    let wd = 0;
    while (wd <= PORTAL_MAX && inside(ox + hx * wd, by, oz + hz * wd)) wd++;
    let ht = 0;
    while (ht <= PORTAL_MAX && inside(ox, by + ht, oz)) ht++;
    if (wd < 2 || wd > PORTAL_MAX || ht < 3 || ht > PORTAL_MAX) continue;
    let ok = true;
    for (let i = 0; i < wd && ok; i++) {
      if (!obs(ox + hx * i, by - 1, oz + hz * i) || !obs(ox + hx * i, by + ht, oz + hz * i)) ok = false;
      for (let j = 0; j < ht && ok; j++) if (!inside(ox + hx * i, by + j, oz + hz * i)) ok = false;
    }
    for (let j = 0; j < ht && ok; j++) if (!obs(ox - hx, by + j, oz - hz) || !obs(ox + hx * wd, by + j, oz + hz * wd)) ok = false;
    if (ok) return { x: ox, y: by, z: oz, a, w: wd, h: ht };
  }
  return null;
}
/* fill a frame with portal blocks */
function fillPortal(w, f) {
  const [hx, hz] = portalAxis(f.a);
  for (let i = 0; i < f.w; i++) for (let j = 0; j < f.h; j++) w.setBlock(f.x + hx * i, f.y + j, f.z + hz * i, B.NETHER_PORTAL, f.a, true);
}
function portalIntact(w, p) {
  const [hx, hz] = portalAxis(p.a);
  for (let i = 0; i < p.w; i++) for (let j = 0; j < p.h; j++) if (w.getBlock(p.x + hx * i, p.y + j, p.z + hz * i) !== B.NETHER_PORTAL) return false;
  return true;
}
/* where to stand: inside the portal (k = 0), or k blocks out in front of it (behind it when k < 0) */
function portalSpot(p, k, side) {
  const [hx, hz] = portalAxis(p.a), px = hz, pz = hx, out = k || 0;
  const x = p.x + hx * (p.w / 2) + (hx ? 0 : 0.5) + px * out, z = p.z + hz * (p.w / 2) + (hz ? 0 : 0.5) + pz * out;
  return [x + hx * (side || 0), p.y + 0.02, z + hz * (side || 0)];
}
const portalYaw = p => (p.a === 0 ? Math.PI : -Math.PI / 2);   // looking out of the front of the portal

const LEAFY = new Set([B.OAK_LEAVES, B.BIRCH_LEAVES, B.SPRUCE_LEAVES]);
const solidGround = b => SOLID[b] && !LIQUID[b] && !LEAFY.has(b) && b !== B.UNLOADED && b !== B.NETHER_PORTAL;   // not on a treetop
const roomy = b => b === B.AIR || (BLOCKS[b] && BLOCKS[b].replaceable && !LIQUID[b]);
/* a place for a new 2x3 portal: its frame's bottom row sits in the ground, with room to step out on both sides */
function portalFits(w, x, y, z, a) {
  const [hx, hz] = portalAxis(a), px = hz, pz = hx;
  for (let i = -1; i <= 2; i++) {
    if (!solidGround(w.getBlock(x + hx * i, y - 1, z + hz * i))) return false;
    for (let j = 0; j <= 3; j++) if (!roomy(w.getBlock(x + hx * i, y + j, z + hz * i))) return false;
  }
  for (const s of [-1, 1]) for (let i = 0; i <= 1; i++) {
    const bx = x + hx * i + px * s, bz = z + hz * i + pz * s;
    if (!solidGround(w.getBlock(bx, y - 1, bz))) return false;
    for (let j = 0; j <= 2; j++) if (!roomy(w.getBlock(bx, y + j, bz))) return false;
  }
  return true;
}
function findPortalSpot(w, tx, ty, tz, nether) {
  const R = nether ? 14 : 28;
  for (let r = 0; r <= R; r++) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = tx + dx, z = tz + dz;
      if (nether) {
        const y0 = clamp(ty, 34, 100);
        for (let k = 0; k < 140; k++) {
          const y = y0 + (k % 2 ? (k + 1) >> 1 : -(k >> 1));
          if (y < 33 || y > 104) continue;
          for (const a of [0, 1]) if (portalFits(w, x, y, z, a)) return { x, y, z, a };
        }
      } else {
        const top = w.topSolid(x, z);
        if (top <= 0 || top > WH - 8) continue;
        for (const a of [0, 1]) if (portalFits(w, x, top + 1, z, a)) return { x, y: top + 1, z, a };
      }
    }
  }
  // nowhere good: carve a space and stand the portal on a small obsidian floor
  const top = w.topSolid(tx, tz);
  let y = nether ? clamp(ty, 40, 100) : (top > 0 && top < WH - 8 ? top + 1 : 64);
  if (!nether) while (y < WH - 8 && LIQUID[w.getBlock(tx, y, tz)]) y++;   // on top of a lake or the sea, not on its bottom
  return { x: tx, y, z: tz, a: 0, force: true };
}
function buildPortal(w, sp, dim) {
  const [hx, hz] = portalAxis(sp.a), px = hz, pz = hx;
  // a safe floor two steps out on both sides (no stepping straight into lava or off an island)
  for (const s of [-1, 1]) for (let k = 1; k <= 2; k++) for (let i = -1; i <= 2; i++) {
    const bx = sp.x + hx * i + px * s * k, bz = sp.z + hz * i + pz * s * k;
    if (!solidGround(w.getBlock(bx, sp.y - 1, bz))) w.setBlock(bx, sp.y - 1, bz, sp.force ? B.OBSIDIAN : dim === 'nether' ? B.NETHERRACK : B.COBBLE, 0, true);
    if (sp.force || k === 1) for (let j = 0; j <= 2; j++) if (!roomy(w.getBlock(bx, sp.y + j, bz))) w.setBlock(bx, sp.y + j, bz, B.AIR, 0, true);
  }
  for (let i = -1; i <= 2; i++) for (let j = -1; j <= 3; j++) {
    const edge = i === -1 || i === 2 || j === -1 || j === 3;
    w.setBlock(sp.x + hx * i, sp.y + j, sp.z + hz * i, edge ? B.OBSIDIAN : B.NETHER_PORTAL, edge ? 0 : sp.a, true);
  }
  return { d: dim, x: sp.x, y: sp.y, z: sp.z, a: sp.a, w: 2, h: 3 };
}
/* flint and steel: light a frame next to the clicked face. Returns the portal record or null. */
function lightPortalAt(game, x, y, z) {
  const f = findPortalFrame(game.world, x, y, z);
  if (!f) return null;
  fillPortal(game.world, f);
  const rec = Object.assign({ d: game.dim }, f);
  game.addPortal(rec);
  return rec;
}
