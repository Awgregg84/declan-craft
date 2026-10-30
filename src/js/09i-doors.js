/* ===================== Doors: wooden, glass, iron, airlocks and garage doors ===================== */
// Every door is two blocks tall (data & 3 facing, & 4 open, & 8 the top half). Iron doors only open with a lever or a
// button. Airlock doors go in underwater (no water ever comes through a door), and when one shuts it pumps the water out
// of the closed room behind it; they shut by themselves a few seconds after opening. A small room with an airlock door
// at each end is an airlock: go in, the door shuts behind you, it pumps, and then the inside door opens.
// Garage doors are panels put up side by side: a tap rolls the whole door up (or down) at once.
const DOOR_SFX = ['door', 'ironDoor', 'garageDoor', 'airlockDoor'];   // (a door's sound when playing together: its number)
const doorSfx = id => id === B.IRON_DOOR ? 1 : isGarage(id) ? 2 : id === B.AIRLOCK ? 3 : 0;
function doorSound(id, x, y, z) {
  const k = doorSfx(id);
  sfx(DOOR_SFX[k], x + 0.5, y + 0.5, z + 0.5);
  if (game.net) MP.localFx('door', x, y, z, k);
}
/* set a door's two halves open or shut (returns false if it already was) */
function setDoorOpen(w, x, y, z, open) {
  const id = w.getBlock(x, y, z);
  if (!IS_DOOR[id]) return false;
  const ly = (w.getData(x, y, z) & 8) ? y - 1 : y;
  if (w.getBlock(x, ly, z) !== id) return false;
  const ld = w.getData(x, ly, z), want = open ? ld | 4 : ld & ~4;
  if (want === ld) return false;
  w.setBlock(x, ly, z, id, want, true);
  if (w.getBlock(x, ly + 1, z) === id) w.setBlock(x, ly + 1, z, id, want | 8, true);
  return true;
}
/* a tap on a door */
function useDoor(game, pl, t) {
  const w = game.world;
  if (isGarage(t.id)) { toggleGarage(w, t.x, t.y, t.z); doorSound(t.id, t.x, t.y, t.z); return; }
  if (BLOCKS[t.id].iron) {
    if (!pl.ironTipT || game.t - pl.ironTipT > 6) { pl.ironTipT = game.t; toast('Iron doors open with a lever or a button next to them.', 3); }
    sfx('dig_metal', t.x + 0.5, t.y + 0.5, t.z + 0.5, 0.5);
    return;
  }
  const ly = (w.getData(t.x, t.y, t.z) & 8) ? t.y - 1 : t.y;
  setDoorOpen(w, t.x, ly, t.z, !(w.getData(t.x, ly, t.z) & 4));
  doorSound(t.id, t.x, t.y, t.z);
}
/* put a door down: on top of a solid block, two blocks of room, facing away from you (an airlock door can go in water) */
function placeDoor(game, pl, hid, t, creative) {
  const world = game.world, id = ITEMS[hid].door, wet = id === B.AIRLOCK;
  let px = t.x + DX[t.face], py = t.y + DY[t.face], pz = t.z + DZ[t.face];
  const free = b => b === B.AIR || (BLOCKS[b] && BLOCKS[b].replaceable && (!LIQUID[b] || (wet && b === B.WATER)));
  if (BLOCKS[t.id].replaceable && free(t.id)) { px = t.x; py = t.y; pz = t.z; }
  if (py < 1 || py + 1 >= WH || !free(world.getBlock(px, py, pz)) || !free(world.getBlock(px, py + 1, pz))) return false;
  const below = world.getBlock(px, py - 1, pz);
  if (!SOLID[below] || !OPAQUE[below]) return false;
  const hitsP = e => e.x + e.w > px && e.x - e.w < px + 1 && e.z + e.w > pz && e.z - e.w < pz + 1 && e.y < py + 2 && e.y + e.h > py;
  if (hitsP(pl)) return false;
  const f = facingFromYaw(pl.yaw);
  world.setBlock(px, py, pz, id, f, true);
  world.setBlock(px, py + 1, pz, id, f | 8, true);
  sfx(BLOCKS[id].sound === 'metal' ? 'place_metal' : BLOCKS[id].sound === 'glass' ? 'place_glass' : 'place_wood', px + 0.5, py + 0.5, pz + 0.5);
  pl.swing();
  if (!creative) pl.consumeHeld(1);
  if (wet && !game.tipped) game.tipped = {};
  if (wet && !game.tipped.airlock) { game.tipped.airlock = 1; toast('Airlock doors keep the water out. Shut one and it pumps the water out of the room behind it!', 6); }
  return true;
}

/* ---- garage doors ---- */
/* all the panels joined to this one, side by side and one above another in the same wall */
function garageGroup(w, x, y, z) {
  const ax = w.getData(x, y, z) & 1, out = [], seen = new Set([posKey(x, y, z)]), q = [[x, y, z]];
  while (q.length && out.length < 128) {
    const c = q.pop();
    out.push(c);
    for (const [dx, dy, dz] of ax ? [[0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] : [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]]) {
      const nx = c[0] + dx, ny = c[1] + dy, nz = c[2] + dz, k = posKey(nx, ny, nz);
      if (seen.has(k) || !isGarage(w.getBlock(nx, ny, nz)) || (w.getData(nx, ny, nz) & 1) !== ax) continue;
      seen.add(k); q.push([nx, ny, nz]);
    }
  }
  return out;
}
function setGarage(w, x, y, z, open) {
  let changed = false;
  for (const [gx, gy, gz] of garageGroup(w, x, y, z)) if (w.setBlock(gx, gy, gz, open ? B.GARAGE_OPEN : B.GARAGE_DOOR, w.getData(gx, gy, gz) & 3, true)) changed = true;
  return changed;
}
const toggleGarage = (w, x, y, z) => setGarage(w, x, y, z, w.getBlock(x, y, z) === B.GARAGE_DOOR);
/* a garage door panel goes up like a wall: on the side of a block, or on top of one (or of another panel) */
function placeGarage(game, pl, t, creative) {
  const w = game.world;
  let px = t.x + DX[t.face], py = t.y + DY[t.face], pz = t.z + DZ[t.face];
  if (BLOCKS[t.id].replaceable && !LIQUID[t.id]) { px = t.x; py = t.y; pz = t.z; }
  const cur = w.getBlock(px, py, pz);
  if (py < 0 || py >= WH || cur === B.UNLOADED || !(cur === B.AIR || (BLOCKS[cur].replaceable && !LIQUID[cur]))) return false;
  // in line with a panel it is put against; otherwise across the way you are looking
  const data = isGarage(t.id) && t.face !== 2 && t.face !== 3 ? w.getData(t.x, t.y, t.z) & 3 : facingFromYaw(pl.yaw);
  const bb = garageBox(data), hitsP = e => e.x + e.w > px + bb[0] && e.x - e.w < px + bb[3] && e.z + e.w > pz + bb[2] && e.z - e.w < pz + bb[5] && e.y < py + 1 && e.y + e.h > py;
  if (hitsP(pl)) return false;
  // open if the door it joins is rolled up
  let open = false;
  for (let d = 0; d < 6; d++) { const nb = w.getBlock(px + DX[d], py + DY[d], pz + DZ[d]); if (nb === B.GARAGE_OPEN && (w.getData(px + DX[d], py + DY[d], pz + DZ[d]) & 1) === (data & 1)) open = true; }
  w.setBlock(px, py, pz, open ? B.GARAGE_OPEN : B.GARAGE_DOOR, data, true);
  sfx('place_metal', px + 0.5, py + 0.5, pz + 0.5);
  if (game.net) MP.localFx('place', px, py, pz, B.GARAGE_DOOR);
  pl.swing();
  if (!creative) pl.consumeHeld(1);
  return true;
}
/* a lever or button: open while any panel of the door is powered */
function powerGarage(game, x, y, z, placed) {
  const w = game.world, group = garageGroup(w, x, y, z), on = group.some(c => isPowered(w, c[0], c[1], c[2]));
  if (placed && !on) return;   // (put up, or rolled by hand: only a switched-on lever changes it)
  if (setGarage(w, x, y, z, on)) { sfx('garageDoor', x + 0.5, y + 0.5, z + 0.5); MP.localFx('door', x, y, z, 2); }
}

/* ---- airlocks (worked out by a single player or the host) ---- */
const AIRLOCK_SHUT = 3.5, AIRLOCK_ROOM = 6000, AIRLOCK_CHAMBER = 48;
const AIRLOCKS = { open: new Map(), pumps: [] };
/* a block change: an airlock door opened, shut or was put down (from World.setBlock) */
function airlockChanged(w, x, y, z, old, od, id, data) {
  if (id !== B.AIRLOCK) { if (old === B.AIRLOCK && !(od & 8)) AIRLOCKS.open.delete(posKey(x, y, z)); return; }
  if (data & 8) return;   // (the bottom half speaks for the door)
  const k = posKey(x, y, z);
  if (data & 4) { if (!AIRLOCKS.open.has(k)) AIRLOCKS.open.set(k, { x, y, z, t: 0, auto: false }); return; }
  const was = AIRLOCKS.open.get(k);
  AIRLOCKS.open.delete(k);
  if (old !== B.AIRLOCK || (od & 4)) AIRLOCKS.pumps.push({ x, y, z, t: 0.6, cycled: !!(was && was.auto) });
}
/* the room on one side of a door: the open blocks joined together (null if it is too big, or open to the world) */
function airlockRoom(w, starts) {
  const seen = new Set(), cells = [], q = [];
  for (const c of starts) { const k = posKey(c[0], c[1], c[2]); if (!seen.has(k)) { seen.add(k); q.push(c); } }
  while (q.length) {
    const [x, y, z] = q.pop(), b = w.getBlock(x, y, z);
    if (b === B.UNLOADED || y < 0 || y >= WH) return null;
    if (SOLID[b] || IS_DOOR[b] || isGarage(b) || b === B.LAVA) continue;
    cells.push([x, y, z, b]);
    if (cells.length > AIRLOCK_ROOM) return null;
    for (let d = 0; d < 6; d++) {
      const nx = x + DX[d], ny = y + DY[d], nz = z + DZ[d], k = posKey(nx, ny, nz);
      if (seen.has(k)) continue;
      seen.add(k); q.push([nx, ny, nz]);
    }
  }
  return cells;
}
/* where the players are (a block each for their feet and head) */
function playerCells(game) {
  const out = [], add = (x, y, z) => { out.push(posKey(Math.floor(x), Math.floor(y + 0.1), Math.floor(z)), posKey(Math.floor(x), Math.floor(y + 1.2), Math.floor(z))); };
  const pl = game.player;
  if (pl.alive) add(pl.x, pl.y, pl.z);
  if (MP.role === 'host') for (const r of MP.remotes.values()) if (r.has && r.alive) add(r.tx, r.ty, r.tz);
  return out;
}
/* a door has shut: pump the water out of a closed room on either side; and if someone is in a little airlock
   room, open its other door for them */
function airlockPump(game, p) {
  const w = game.world, { x, y, z } = p;
  if (w.getBlock(x, y, z) !== B.AIRLOCK || (w.getData(x, y, z) & 12)) return;
  const f = w.getData(x, y, z) & 3, ox = f & 1 ? 1 : 0, oz = f & 1 ? 0 : 1, here = playerCells(game);
  let drained = 0, cycled = false;
  for (const s of [1, -1]) {
    const room = airlockRoom(w, [[x + ox * s, y, z + oz * s], [x + ox * s, y + 1, z + oz * s]]);
    if (!room) continue;
    const wet = room.filter(c => c[3] === B.WATER);
    if (wet.length) {
      w.beginBlast();
      for (const c of wet) w.setBlock(c[0], c[1], c[2], B.AIR, 0, true);
      w.endBlast();
      drained += wet.length;
      for (let i = 0; i < 24 && PARTICLES.length < 1500; i++) {
        const c = wet[(Math.random() * wet.length) | 0];
        PARTICLES.push({ x: c[0] + Math.random(), y: c[1] + Math.random(), z: c[2] + Math.random(), vx: 0, vy: randRange(0.6, 1.6), vz: 0, life: randRange(0.5, 1), tile: TILE.bubble_p, u: 0, v: 0, us: 16, size: randRange(0.08, 0.14), grav: 0 });
      }
    }
    if (p.cycled || room.length > AIRLOCK_CHAMBER) continue;
    const keys = new Set(room.map(c => posKey(c[0], c[1], c[2])));
    if (!here.some(k => keys.has(k))) continue;
    for (const c of room) for (let d = 0; d < 4; d++) {   // someone is in the airlock room: open its other door
      const nx = c[0] + HX[d], nz = c[2] + HZ[d];
      for (const ny of [c[1], c[1] - 1]) {
        if ((nx === x && nz === z) || w.getBlock(nx, ny, nz) !== B.AIRLOCK || (w.getData(nx, ny, nz) & 12)) continue;
        if (setDoorOpen(w, nx, ny, nz, true)) {
          cycled = true;
          const o = AIRLOCKS.open.get(posKey(nx, ny, nz));
          if (o) { o.auto = true; o.t = -1; }   // (it stays open a little longer)
          doorSound(B.AIRLOCK, nx, ny, nz);
        }
      }
    }
  }
  if (drained) {
    sfx('airlockDrain', x + 0.5, y + 1, z + 0.5); MP.sfx('airlockDrain', x + 0.5, y + 1, z + 0.5);
    const pl = game.player;
    if (Math.hypot(pl.x - x, pl.y - y, pl.z - z) < 24) toast('Glug glug! The airlock pumped the water out.', 3);
  } else if (cycled) { sfx('airlockHiss', x + 0.5, y + 1, z + 0.5); MP.sfx('airlockHiss', x + 0.5, y + 1, z + 0.5); }
}
/* each frame: open airlock doors shut themselves once nobody is in the doorway; shut ones pump */
function tickAirlocks(game, dt) {
  const w = game.world;
  if (w.remote) { AIRLOCKS.open.clear(); AIRLOCKS.pumps.length = 0; return; }
  if (AIRLOCKS.pumps.length) {
    const due = AIRLOCKS.pumps.filter(p => (p.t -= dt) <= 0);
    AIRLOCKS.pumps = AIRLOCKS.pumps.filter(p => p.t > 0);
    for (const p of due) airlockPump(game, p);
  }
  if (!AIRLOCKS.open.size) return;
  let here = null;
  for (const [k, o] of AIRLOCKS.open) {
    if (w.getBlock(o.x, o.y, o.z) !== B.AIRLOCK || !(w.getData(o.x, o.y, o.z) & 4)) { AIRLOCKS.open.delete(k); continue; }
    o.t += dt;
    if (o.t < AIRLOCK_SHUT) continue;
    if (!here) here = new Set(playerCells(game));
    if (here.has(posKey(o.x, o.y, o.z)) || here.has(posKey(o.x, o.y + 1, o.z))) { o.t = AIRLOCK_SHUT - 0.5; continue; }   // (someone is in the doorway)
    if (setDoorOpen(w, o.x, o.y, o.z, false)) doorSound(B.AIRLOCK, o.x, o.y, o.z);
  }
}
