/* ===================== Levers, buttons and dispensers ===================== */
// A switched-on lever (or a pressed button) powers what is right next to it, and what is next to the block
// it is stuck on: TNT lights, doors open (and shut again when the power goes) and dispensers fire once.
// A single player or the host works this out; guests just flip the levers and press the buttons.
const POWER_SRC = new Uint8Array(256), POWER_DEV = new Uint8Array(256);
POWER_SRC[B.LEVER] = POWER_SRC[B.BUTTON] = 1;
for (const id of [B.TNT, B.MEGA_TNT, B.ICE_TNT, B.DIG_TNT, B.PARTY_TNT, B.CLUSTER_TNT, B.DISPENSER, B.DOOR]) POWER_DEV[id] = 1;
const BUTTON_TIME = 1;
/* a lever or button keeps the side it is stuck to in data & 7 (an index into DX/DY/DZ); data & 8 is on */
function isPowered(w, x, y, z) {
  for (let d = 0; d < 6; d++) {
    const nx = x + DX[d], ny = y + DY[d], nz = z + DZ[d], nb = w.getBlock(nx, ny, nz);
    if (POWER_SRC[nb]) { if (w.getData(nx, ny, nz) & 8) return true; continue; }
    if (!SOLID[nb] || !OPAQUE[nb]) continue;
    for (let e = 0; e < 6; e++) {   // a solid block beside us with a switched-on lever stuck to it
      const mx = nx + DX[e], my = ny + DY[e], mz = nz + DZ[e];
      if ((mx === x && my === y && mz === z) || !POWER_SRC[w.getBlock(mx, my, mz)]) continue;
      const md = w.getData(mx, my, mz);
      if ((md & 8) && mx + DX[md & 7] === nx && my + DY[md & 7] === ny && mz + DZ[md & 7] === nz) return true;
    }
  }
  return false;
}
function tickPower(game, dt) {
  const w = game.world;
  if (w.buttons.length) {   // buttons pop back up after a second
    const keep = [];
    for (const b of w.buttons) {
      if (b[3] > w.clock) { keep.push(b); continue; }
      const d = w.getData(b[0], b[1], b[2]);
      if (w.getBlock(b[0], b[1], b[2]) === B.BUTTON && (d & 8)) { w.setBlock(b[0], b[1], b[2], B.BUTTON, d & 7, true); sfx('buttonClick', b[0] + 0.5, b[1] + 0.5, b[2] + 0.5, 0.6); MP.sfx('buttonClick', b[0] + 0.5, b[1] + 0.5, b[2] + 0.5); }
    }
    w.buttons = keep;
  }
  const q = w.powerQ;
  if (!q.length) return;
  w.powerQ = [];
  const seen = new Set();
  for (let i = 0; i < q.length; i += 7) {
    const x = q[i], y = q[i + 1], z = q[i + 2], old = q[i + 3], od = q[i + 4], id = q[i + 5], data = q[i + 6];
    if (POWER_SRC[old] || POWER_SRC[id]) {
      if (id === B.BUTTON && (data & 8) && !(old === B.BUTTON && (od & 8))) w.buttons.push([x, y, z, w.clock + BUTTON_TIME]);
      const src = POWER_SRC[id] ? data : od, sx = x + DX[src & 7], sy = y + DY[src & 7], sz = z + DZ[src & 7];
      for (const [cx, cy, cz] of [[x, y, z], [sx, sy, sz]]) for (let d = 0; d < 6; d++) {
        const px = cx + DX[d], py = cy + DY[d], pz = cz + DZ[d], k = px + ',' + py + ',' + pz;
        if (seen.has(k)) continue;
        seen.add(k);
        if (POWER_DEV[w.getBlock(px, py, pz)]) powerDevice(game, px, py, pz, false);
      }
    } else if (POWER_DEV[id] && !seen.has(x + ',' + y + ',' + z)) powerDevice(game, x, y, z, true);   // put down next to a switched-on lever
  }
}
function powerDevice(game, x, y, z, placed) {
  const w = game.world, id = w.getBlock(x, y, z);
  if (tntKindOf(id)) { if (isPowered(w, x, y, z)) igniteTNT(game, x, y, z); return; }
  if (id === B.DOOR) {
    const d = w.getData(x, y, z), ly = (d & 8) ? y - 1 : y, ld = w.getData(x, ly, z);
    if (w.getBlock(x, ly, z) !== B.DOOR) return;
    const on = isPowered(w, x, ly, z) || isPowered(w, x, ly + 1, z);
    if (placed && !on) return;
    const want = on ? ld | 4 : ld & ~4;
    if (want === ld) return;
    w.setBlock(x, ly, z, B.DOOR, want, true);
    if (w.getBlock(x, ly + 1, z) === B.DOOR) w.setBlock(x, ly + 1, z, B.DOOR, want | 8, true);
    sfx('door', x + 0.5, ly + 0.5, z + 0.5);
    MP.localFx('door', x, ly, z, 0);
    return;
  }
  if (id === B.DISPENSER) {
    const t = w.getTile(x, y, z, 'dispenser'), on = isPowered(w, x, y, z);
    if (on && !t.powered && !placed) dispense(game, x, y, z, t);
    t.powered = on;
  }
}
/* a dispenser fires one thing from a random slot: arrows, fire charges and TNT fly out, spawn eggs hatch,
   a minecart goes onto a rail in front, and anything else pops out as an item */
function dispense(game, x, y, z, t) {
  const w = game.world, data = w.getData(x, y, z), f = facingFace(data), dx = DX[f], dy = DY[f], dz = DZ[f];
  const fx = x + 0.5 + dx * 0.7, fy = y + 0.5 + dy * 0.7, fz = z + 0.5 + dz * 0.7;
  const full = [];
  for (let i = 0; i < t.slots.length; i++) if (t.slots[i]) full.push(i);
  if (!full.length || (t.viewers && t.viewers.size)) { sfx('dispenseFail', fx, fy, fz); MP.sfx('dispenseFail', fx, fy, fz); return; }
  const i = full[randInt(0, full.length - 1)], st = t.slots[i], id = st.id;
  const take = () => { st.count--; if (st.count <= 0) t.slots[i] = null; MP.tileChanged(t); };
  smokeParticles(fx, fy, fz, 5, 0.1, false); MP.fx('smoke', fx, fy, fz);
  const spread = () => randRange(-0.6, 0.6);
  if (id === I.ARROW) {
    shootProjectile(game, 'arrow', fx, fy, fz, dx * 26 + spread(), dy * 26 + (dy ? 0 : 1.5), dz * 26 + spread(), { owner: 'disp', dmg: 4, pickup: true });
    take(); sfx('bowShoot', fx, fy, fz); MP.sfx('bowShoot', fx, fy, fz);
    return;
  }
  if (id === I.FIRE_CHARGE) {
    shootProjectile(game, 'charge', fx, fy, fz, dx * 16 + spread(), dy * 16 + spread() * 0.5, dz * 16 + spread(), { owner: 'disp' });
    take(); sfx('ghastShoot', fx, fy, fz, 0.6); MP.sfx('ghastShoot', fx, fy, fz);
    return;
  }
  const kind = tntKindOf(id);
  if (kind) {
    const dir = f === 2 ? 4 : f === 3 ? 5 : FRONT_FACE.indexOf(f), e = primeTNT(game, x + dx, y + dy, z + dz, TNT_FUSE, kind, dir);
    e.vx = dx * 1.5; e.vz = dz * 1.5; e.vy = dy > 0 ? 5 : dy < 0 ? -1 : 2;
    take();
    return;
  }
  const egg = id >= 256 && ITEMS[id] && ITEMS[id].egg;
  if (egg && boxFree(w, x + 0.5 + dx, y + Math.min(0, dy), z + 0.5 + dz, MOB_DEFS[egg].w, Math.min(1.9, MOB_DEFS[egg].h))) {
    spawnMob(game, egg, x + 0.5 + dx, y + Math.min(0, dy), z + 0.5 + dz, { home: [x + 0.5 + dx, z + 0.5 + dz] });
    take(); sfx('dispense', fx, fy, fz); MP.sfx('dispense', fx, fy, fz);
    return;
  }
  if (id === I.MINECART && w.getBlock(x + dx, y + dy, z + dz) === B.RAIL) {
    spawnVehicle(game, 'minecart', x + dx + 0.5, y + dy + 0.0625, z + dz + 0.5, 0);
    take(); sfx('dispense', fx, fy, fz); MP.sfx('dispense', fx, fy, fz);
    return;
  }
  if (id === I.FLINT_AND_STEEL && lightPortalAt(game, x + dx, y + dy, z + dz)) {
    sfx('portalLight', fx, fy, fz);
    st.dmg = (st.dmg || 0) + 1;
    if (st.dmg >= ITEMS[id].tool.dur) t.slots[i] = null;
    MP.tileChanged(t);
    return;
  }
  const e = dropForNearest(game, fx, fy - 0.15, fz, id, 1, st.dmg);
  if (e) { e.vx = dx * 5 + spread(); e.vy = dy * 5 + 1.5; e.vz = dz * 5 + spread(); }
  take(); sfx('dispense', fx, fy, fz); MP.sfx('dispense', fx, fy, fz);
}
/* playing together, things only exist on one iPad: something that comes out of a machine goes to whoever is
   nearest (a guest gets it on their screen, right there) */
function dropForNearest(game, x, y, z, id, n, dmg) {
  const pl = game.player;
  let best = null, bd = pl.alive ? Math.hypot(pl.x - x, pl.y - y, pl.z - z) : 1e9;
  if (MP.role === 'host') for (const r of MP.remotes.values()) { if (!r.alive || !r.lastState) continue; const d = Math.hypot(r.tx - x, r.ty - y, r.tz - z); if (d < bd) { bd = d; best = r; } }
  if (best) { MP.sendDrops(best, [[id, n, dmg || 0]], x, y, z); return null; }
  const e = dropItem(game, x, y, z, id, n, true);
  if (e && dmg) e.dmg = dmg;
  return e;
}
/* a player flips a lever or presses a button (on a guest the host takes it from there) */
function useSwitch(game, x, y, z, id) {
  const w = game.world, d = w.getData(x, y, z);
  if (id === B.LEVER) { w.setBlock(x, y, z, B.LEVER, d ^ 8, true); sfx('leverClick', x + 0.5, y + 0.5, z + 0.5); }
  else if (!(d & 8)) { w.setBlock(x, y, z, B.BUTTON, d | 8, true); sfx('buttonClick', x + 0.5, y + 0.5, z + 0.5); }
  else { if (!w.remote && !w.buttons.some(b => b[0] === x && b[1] === y && b[2] === z)) w.buttons.push([x, y, z, w.clock]); return; }   // stuck down (from a saved world): pop it up
  if (game.net) MP.localFx('sfx', x + 0.5, y + 0.5, z + 0.5, SFX_NET.indexOf(id === B.LEVER ? 'leverClick' : 'buttonClick'));
}
