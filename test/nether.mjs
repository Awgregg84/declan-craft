// The Nether: build and light a portal, travel there and back, linked portals, saving, breaking frames, respawning,
// and where new portals go when there is no room.
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), out = path.join(dir, 'shots');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html'));
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(0);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await browser.newPage({ viewport: { width: 1024, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + server.address().port + '/');
  await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
  const E = (fn, arg) => p.evaluate(fn, arg);
  const waitFor = (fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
  await E(() => { game.startWorld('valley', 'creative', true); });
  await waitFor(() => game.state === 'playing', 90000);
  await E(() => { game.dragLook = true; });

  // 1. an obsidian frame on a platform in the sky, lit with flint and steel
  const F = await E(() => {
    const w = game.world, pl = game.player, x = Math.floor(pl.x) + 3, y = 100, z = Math.floor(pl.z) + 3;
    for (let dx = -4; dx <= 6; dx++) for (let dz = -4; dz <= 4; dz++) w.setBlock(x + dx, y - 1, z + dz, B.STONE, 0);
    for (let i = -1; i <= 2; i++) for (let j = -1; j <= 3; j++) if (i === -1 || i === 2 || j === -1 || j === 3) w.setBlock(x + i, y + j, z, B.OBSIDIAN, 0);
    Object.assign(pl, { x: x + 1, y: y, z: z + 2.5, vx: 0, vy: 0, vz: 0, flying: false, yaw: 0, pitch: -0.5 });
    pl.inv[0] = { id: I.FLINT_AND_STEEL, count: 1 }; pl.sel = 0; ui.dirty = true;
    return { x, y, z };
  });
  await sleep(600);
  const lit = await E(F => {
    const pl = game.player;
    pl.target = { x: F.x, y: F.y - 1, z: F.z, id: B.OBSIDIAN, face: 2 };   // top of the frame's bottom row
    const ok = pl.useBlock(pl.heldId(), true);
    let n = 0; for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) if (game.world.getBlock(F.x + i, F.y + j, F.z) === B.NETHER_PORTAL) n++;
    return { ok, n, recs: game.portals.length };
  }, F);
  check('flint and steel lights an obsidian frame', lit.ok && lit.n === 6 && lit.recs === 1, lit);
  await E(F => { const pl = game.player; Object.assign(pl, { x: F.x + 1, z: F.z + 3.5, yaw: 0, pitch: 0 }); }, F);
  await sleep(1500);
  await p.screenshot({ path: path.join(out, 'nether-portal.png') });
  const nolight = await E(F => { const pl = game.player; pl.target = { x: F.x + 5, y: F.y - 1, z: F.z, id: B.STONE, face: 2 }; pl.useBlock(pl.heldId(), true); return game.world.getBlock(F.x + 5, F.y, F.z); }, F);
  check('lighting outside a frame does nothing', nolight === 0, nolight);

  // 2. step in: after a moment you travel to the Nether
  await E(F => Object.assign(game.player, { x: F.x + 1, z: F.z + 0.5 }), F);
  check('standing in the portal takes you to the Nether', await waitFor(() => game.dim === 'nether' && game.state === 'playing', 90000));
  const n1 = await E(() => {
    const pl = game.player, w = game.world;
    const here = [0.2, 1.2].some(h => w.getBlock(Math.floor(pl.x), Math.floor(pl.y + h), Math.floor(pl.z)) === B.NETHER_PORTAL);
    let rack = 0, lava = 0;
    for (let x = -24; x <= 24; x += 2) for (let z = -24; z <= 24; z += 2) for (let y = 10; y < 120; y += 2) { const b = w.getBlock(Math.floor(pl.x) + x, y, Math.floor(pl.z) + z); if (b === B.NETHERRACK) rack++; else if (b === B.LAVA) lava++; }
    return { map: w.map, here, lock: pl.portalLock, rack, lava, pos: [pl.x, pl.y, pl.z].map(v => Math.round(v)), portals: game.portals.map(q => q.d), spawn: !!game.netherSpawn, fog: game.sky && game.sky.nether };
  });
  check('you arrive in a Nether portal, among netherrack and lava', n1.map === 'nether' && n1.here && n1.lock && n1.rack > 500 && n1.lava > 20 && n1.spawn, n1);
  check('both portals are remembered', n1.portals.filter(d => d === 'over').length === 1 && n1.portals.filter(d => d === 'nether').length === 1, n1.portals);
  await sleep(2000);
  const safe = await E(() => { const q = game.portals.find(r => r.d === 'nether'), w = game.world; let ok = 0; for (const k of [1, 2, -1, -2]) { const s = portalSpot(q, k); if (solidGround(w.getBlock(Math.floor(s[0]), Math.floor(s[1]) - 1, Math.floor(s[2])))) ok++; } return ok; });
  check('there is floor to step out onto, both ways', safe === 4, safe);
  await E(() => { const q = game.portals.find(r => r.d === 'nether'), s = portalSpot(q, 2); Object.assign(game.player, { x: s[0], y: s[1], z: s[2], pitch: -0.05 }); });
  await sleep(1500);
  await p.screenshot({ path: path.join(out, 'nether-inside.png') });
  await E(() => { game.player.yaw += Math.PI; game.player.pitch = 0.1; });
  await sleep(1500);
  await p.screenshot({ path: path.join(out, 'nether-portal-back.png') });

  // 3. stepping out and back in returns you through the same portal you came in by
  check('stepping out unlocks the portal', await waitFor(() => !game.player.portalLock, 10000));
  await E(() => { const q = game.portals.find(r => r.d === 'nether'), s = portalSpot(q, 0); Object.assign(game.player, { x: s[0], y: s[1], z: s[2] }); });
  check('...and walking back in goes home', await waitFor(() => game.dim === 'over' && game.state === 'playing', 90000));
  const back = await E(F => { const pl = game.player; return { dx: Math.abs(pl.x - (F.x + 1)), dz: Math.abs(pl.z - (F.z + 0.5)), dy: Math.abs(pl.y - F.y), recs: game.portals.length }; }, F);
  check('you come out of the portal you built', back.dx < 0.6 && back.dz < 0.6 && back.dy < 0.6 && back.recs === 2, back);

  // 4. saving in the Nether and coming back to it. The game saves as you leave and as you arrive,
  //    and whatever doesn't fit in a full inventory comes along.
  await E(F => Object.assign(game.player, { x: F.x + 1, y: F.y, z: F.z + 3.5, portalLock: false }), F);
  await sleep(500);
  await E(() => {
    const o = window.__storeSet = store.set; window.__saves = [];
    store.set = (k, v) => { if (k === saveKey('valley')) window.__saves.push(JSON.parse(v).dim); return o.call(store, k, v); };
    game.saveT = -1e9;   // no timed saves during the trip
    game.setMode('survival');
    const pl = game.player; pl.health = 20;
    for (let i = 0; i < 36; i++) pl.inv[i] = { id: B.STONE, count: 64 };
    game.openScreen('inv'); ui.inv.grid[0] = { id: I.DIAMOND, count: 3 };
  });
  await E(F => Object.assign(game.player, { x: F.x + 1, z: F.z + 0.5 }), F);
  await waitFor(() => game.dim === 'nether' && game.state === 'playing', 90000);
  const trip = await E(() => {
    const pl = game.player, d = game.entities.find(e => e.type === 'item' && e.id === I.DIAMOND && !e.removed);
    return { saves: window.__saves.slice(), diamonds: d ? d.count : 0, near: d ? +Math.hypot(d.x - pl.x, d.z - pl.z).toFixed(2) : -1, open: !!ui.inv };
  });
  check('the game saves as you leave and as you arrive', trip.saves.join() === 'over,nether', trip.saves);
  check('what did not fit in a full inventory comes along', trip.diamonds === 3 && trip.near >= 0 && trip.near < 3 && !trip.open, trip);
  await E(() => { store.set = window.__storeSet; game.saveT = 0; game.player.inv.fill(null); ui.dirty = true; game.setMode('creative'); for (const e of game.entities) if (e.type === 'item') e.removed = true; });
  const mark = await E(() => { const pl = game.player, w = game.world, x = Math.floor(pl.x) + 1, y = Math.floor(pl.y) + 3, z = Math.floor(pl.z) + 2; w.setBlock(x, y, z, B.GOLD_BLOCK, 0); game.save(); return { x, y, z }; });
  await E(() => game.quitToTitle());
  const meta = await E(() => loadSaveMeta('valley'));
  check('the world list says you are in the Nether', meta && meta.nether, meta);
  await E(() => game.startWorld('valley', null, false));
  await waitFor(() => game.state === 'playing', 90000);
  const again = await E(M => ({ dim: game.dim, map: game.world.map, gold: game.world.getBlock(M.x, M.y, M.z) === B.GOLD_BLOCK, portals: game.portals.length }), mark);
  check('reopening the world puts you back in the Nether with your changes', again.dim === 'nether' && again.map === 'nether' && again.gold && again.portals === 2, again);
  const c0 = await E(() => game.world.clock);
  await waitFor(c0 => game.world.clock - c0 > 3, 60000, c0);
  check('...and the portal you saved in does not send you straight home', await E(() => game.dim === 'nether' && game.state === 'playing'));

  // 5. dying in the Nether: you wake up by the portal you came through; your bed in the Overworld is kept
  const death = await E(() => {
    const pl = game.player; game.setMode('survival'); pl.spawn = [5, 70, 5];
    pl.damage(100, 'lava'); const st = game.state; game.respawn();
    const s = game.netherSpawn;
    return { st, dim: game.dim, near: Math.hypot(pl.x - s[0], pl.z - s[2]) < 0.1, bed: pl.spawn && pl.spawn.join() };
  });
  check('dying in the Nether: back at its portal, bed kept', death.st === 'dead' && death.dim === 'nether' && death.near && death.bed === '5,70,5', death);
  const c1 = await E(() => game.world.clock);
  await waitFor(c1 => game.world.clock - c1 > 4, 60000, c1);
  check('...and the portal you wake up in does not send you home', await E(() => game.dim === 'nether' && game.state === 'playing' && game.player.portalLock));
  const bed = await E(() => { game.trySleep(1, 60, 1); return { spawn: game.player.spawn.join(), msg: el('chat-log').lastChild.textContent }; });
  check("beds don't work in the Nether", bed.spawn === '5,70,5' && /don't work in the Nether/.test(bed.msg), bed);
  await E(() => game.setMode('creative'));
  const sp = await E(() => {
    const ws = game.worldSpawn.join(), pl = game.player; game.netherSpawn = [0.5, 64, 0.5];
    game.runCommand('/spawnpoint');
    const ns = game.netherSpawn;
    return { overworldKept: game.worldSpawn.join() === ws, here: Math.hypot(ns[0] - pl.x, ns[1] - pl.y, ns[2] - pl.z) < 0.01 };
  });
  check('/spawnpoint in the Nether sets where you wake up there, and leaves the Overworld spawn alone', sp.overworldKept && sp.here, sp);

  // 6. back home, then breaking the frame empties the portal
  await E(() => { const q = game.portals.find(r => r.d === 'nether'), s = portalSpot(q, 0); Object.assign(game.player, { x: s[0], y: s[1], z: s[2], portalLock: false }); });
  await waitFor(() => game.dim === 'over' && game.state === 'playing', 90000);
  await E(F => { game.player.x += 0; game.world.setBlock(F.x - 1, F.y + 1, F.z, B.AIR, 0, true); Object.assign(game.player, { z: F.z + 3.5 }); }, F);
  check('breaking the frame makes the portal disappear', await waitFor(F => { for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) if (game.world.getBlock(F.x + i, F.y + j, F.z) === B.NETHER_PORTAL) return false; return true; }, 8000, F));
  // lava next to a lit portal doesn't flow into it
  await E(F => { const w = game.world; w.setBlock(F.x - 1, F.y + 1, F.z, B.OBSIDIAN, 0, true); fillPortal(w, { x: F.x, y: F.y, z: F.z, a: 0, w: 2, h: 3 }); w.setBlock(F.x, F.y + 2, F.z + 1, B.LAVA, 0, true); w.setBlock(F.x + 1, F.y + 2, F.z - 1, B.WATER, 0, true); }, F);
  await sleep(4000);
  const lava = await E(F => { let n = 0; for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) if (game.world.getBlock(F.x + i, F.y + j, F.z) === B.NETHER_PORTAL) n++; return n; }, F);
  check('lava and water do not wash a portal away', lava === 6, lava);

  // 7. flint from gravel; soul sand slows you down
  const fl = await E(() => { let n = 0; for (let i = 0; i < 400; i++) for (const [id] of blockDrops(B.GRAVEL, 0)) if (id === I.FLINT) n++; return n; });
  check('gravel sometimes drops flint', fl > 20 && fl < 90, fl);
  const soul = await E(() => {
    const pl = game.player, w = game.world, x = Math.floor(pl.x), z = Math.floor(pl.z) + 6, y = 110;
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 30; dz++) w.setBlock(x + dx, y - 1, z + dz, dz > 12 ? B.SOUL_SAND : B.STONE, 0);
    game.setMode('survival');
    Object.assign(pl, { x: x + 0.5, y, z: z + 0.5, vx: 0, vy: 0, vz: 0, yaw: Math.PI, pitch: 0, flying: false });
    return { x, y, z };
  });
  await sleep(500);
  const speed = async () => { await E(() => { game.input.fwd = true; }); const a = await E(() => [game.player.z, game.world.clock]); await sleep(1500); const b = await E(() => [game.player.z, game.world.clock]); await E(() => { game.input.fwd = false; }); return (b[0] - a[0]) / (b[1] - a[1]); };
  const v1 = await speed();
  await E(S => Object.assign(game.player, { z: S.z + 16.5, vx: 0, vz: 0 }), soul);
  await sleep(500);
  const v2 = await speed();
  check('soul sand slows you down', v1 > 3 && v2 < v1 * 0.6, { stone: +v1.toFixed(2), soulSand: +v2.toFixed(2) });

  // 8. with no room anywhere near, a new portal stands on the water, not on the bottom of the lake
  const pond = await E(() => {
    const w = game.world, pl = game.player, x = Math.floor(pl.x) - 12, z = Math.floor(pl.z) - 12, top = w.topSolid(x, z);
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      for (let y = top - 6; y <= top; y++) w.setBlock(x + dx, y, z + dz, y === top - 6 ? B.STONE : B.WATER, 0);
      for (let y = top + 1; y <= top + 14; y++) w.setBlock(x + dx, y, z + dz, B.AIR, 0);
    }
    const fits = portalFits; portalFits = () => false;   // pretend nothing fits
    const sp = findPortalSpot(w, x, 64, z, false);
    portalFits = fits;
    const under = w.getBlock(x, sp.y - 1, z), above = w.getBlock(x, sp.y, z);
    const p = buildPortal(w, sp, 'over'), s = portalSpot(p, 1), bx = Math.floor(s[0]), by = Math.floor(s[1]), bz = Math.floor(s[2]);
    return { bed: top - 6, y: sp.y, force: !!sp.force, onWater: !!LIQUID[under], airAbove: above === B.AIR, dryFeet: w.getBlock(bx, by, bz) === B.AIR, obsidianFloor: w.getBlock(bx, by - 1, bz) === B.OBSIDIAN };
  });
  check('with no room nearby, a new portal stands on the water, not the lake bed', pond.force && pond.onWater && pond.airAbove && pond.y > pond.bed + 1 && pond.dryFeet && pond.obsidianFloor, pond);
  const leafy = await E(() => solidGround(B.OAK_LEAVES) || solidGround(B.BIRCH_LEAVES) || solidGround(B.SPRUCE_LEAVES));
  check('treetops are not ground for a portal', !leafy);
  check('no script errors', errs.length === 0, errs.slice(0, 3));
  await browser.close(); server.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
