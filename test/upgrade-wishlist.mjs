// Upgrading to the wish-list version: a world saved by the previous version (with a build, a chest, a furnace,
// things in the inventory and a trip to the Nether) opens with everything in place, and the new things work in it
// (a car put down there is saved and comes back).
// Usage: node test/upgrade-wishlist.mjs <previous version's dist/declan-craft.html>
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname);
if (!process.argv[2]) { console.error('usage: node test/upgrade-wishlist.mjs <previous build .html>'); process.exit(2); }
const pages = { '/old.html': fs.readFileSync(process.argv[2]), '/new.html': fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html')) };
const server = http.createServer((req, res) => { const b = pages[req.url]; res.writeHead(b ? 200 : 404, { 'Content-Type': 'text/html' }); res.end(b || ''); }).listen(0);
const base = 'http://localhost:' + server.address().port;
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });
  const errs = [];
  const open = async (p, file) => { await p.goto(base + file); await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 }); };
  const waitFor = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push(e.message));

  // 1. the previous version: a survival world with a build, a chest and a furnace, then a trip to the Nether and back
  await open(P, '/old.html');
  await P.evaluate(() => game.startWorld('valley', 'survival', true));
  await waitFor(P, () => game.state === 'playing', 90000);
  const A = await P.evaluate(() => {
    const w = game.world, pl = game.player, x = Math.floor(pl.x) + 3, y = Math.floor(pl.y), z = Math.floor(pl.z) + 3;
    for (let dy = 0; dy < 3; dy++) w.setBlock(x, y + dy, z, B.GOLD_BLOCK, 0);
    w.setBlock(x + 2, y, z, B.CHEST, 0); w.getTile(x + 2, y, z, 'chest').slots[3] = { id: I.DIAMOND, count: 7 };
    w.setBlock(x + 4, y, z, B.FURNACE, 0); Object.assign(w.getTile(x + 4, y, z, 'furnace'), { slots: [{ id: B.IRON_ORE, count: 3 }, { id: I.COAL, count: 2 }, null] });
    pl.inv[0] = { id: toolId(2, 0), count: 1, dmg: 17 }; pl.inv[5] = { id: B.TNT, count: 9 }; pl.inv[20] = { id: I.EMERALD, count: 33 };
    game.stats.mined = 12; game.day = 4;
    game.save();
    return { x, y, z, px: pl.x, pz: pl.z };
  });
  await P.evaluate(() => { const pl = game.player; game.travel(Math.floor(pl.x), Math.floor(pl.y), Math.floor(pl.z)); });
  await waitFor(P, () => game.state === 'playing' && game.dim === 'nether', 90000);
  await P.evaluate(() => { const pl = game.player; game.world.setBlock(Math.floor(pl.x) + 2, Math.floor(pl.y), Math.floor(pl.z), B.GLOWSTONE, 0); game.save(); });
  const N = await P.evaluate(() => ({ x: Math.floor(game.player.x) + 2, y: Math.floor(game.player.y), z: Math.floor(game.player.z) }));
  await P.evaluate(() => { const pl = game.player; game.travel(Math.floor(pl.x), Math.floor(pl.y), Math.floor(pl.z)); });
  await waitFor(P, () => game.state === 'playing' && game.dim === 'over', 90000);
  await P.evaluate(A => { Object.assign(game.player, { x: A.px, z: A.pz, y: A.y + 1, vx: 0, vy: 0, vz: 0 }); game.save(); }, A);
  const oldSave = await P.evaluate(() => JSON.parse(store.get(saveKey('valley'))));
  check('the previous version saved a world that has been to the Nether', !!oldSave.nether && Array.isArray(oldSave.portals) && oldSave.portals.length >= 2 && !oldSave.world.vehicles, { nether: !!oldSave.nether, portals: oldSave.portals && oldSave.portals.length });
  await P.evaluate(() => game.quitToTitle());

  // 2. the new version opens it: everything is where it was
  await open(P, '/new.html');
  await P.evaluate(() => game.startWorld('valley', null, false));
  check('the new version opens the world', await waitFor(P, () => game.state === 'playing', 90000));
  await waitFor(P, A => game.world.getBlock(A.x, A.y, A.z) !== B.UNLOADED, 60000, A);
  const got = await P.evaluate(A => {
    const w = game.world, pl = game.player, ch = w.getTile(A.x + 2, A.y, A.z), fu = w.getTile(A.x + 4, A.y, A.z);
    return {
      gold: [0, 1, 2].every(d => w.getBlock(A.x, A.y + d, A.z) === B.GOLD_BLOCK), chest: w.getBlock(A.x + 2, A.y, A.z) === B.CHEST && ch && ch.slots[3] && ch.slots[3].id === I.DIAMOND && ch.slots[3].count === 7,
      furnace: fu && fu.slots[0] && fu.slots[0].id === B.IRON_ORE, pick: pl.inv[0] && pl.inv[0].id === toolId(2, 0) && pl.inv[0].dmg === 17,
      tnt: pl.inv[5] && pl.inv[5].count === 9, em: pl.inv[20] && pl.inv[20].count === 33, mode: game.mode, day: game.day, mined: game.stats.mined, dim: game.dim,
      near: Math.hypot(pl.x - A.px, pl.z - A.pz) < 1, vehicles: game.entities.filter(e => e.vehicle).length,
    };
  }, A);
  check('builds, chest, furnace, inventory, mode and day are all as they were', got.gold && got.chest && got.furnace && got.pick && got.tnt && got.em && got.mode === 'survival' && got.day === 4 && got.mined === 12 && got.dim === 'over' && got.near && got.vehicles === 0, got);
  // 3. the new things work here: a car, saved and back again; Mega TNT and a lever in the old world
  const car = await P.evaluate(A => {
    const pl = game.player, w = game.world;
    spawnVehicle(game, 'car', A.x + 0.5, A.y + 4, A.z + 3.5, 0.7);
    w.setBlock(A.x + 6, A.y, A.z, B.LEVER, 3); w.setBlock(A.x + 6, A.y - 1, A.z, B.STONE, 0);
    pl.inv[1] = { id: I.BOW, count: 1 }; pl.inv[2] = { id: I.ARROW, count: 16 };
    game.save();
    const d = JSON.parse(store.get(saveKey('valley')));
    return { saved: d.world.vehicles, nether: !!d.nether };
  }, A);
  check('a car put down in the old world is saved with it (and the Nether is still saved)', Array.isArray(car.saved) && car.saved.length === 1 && car.saved[0].k === 'car' && car.nether, car);
  await P.evaluate(() => game.quitToTitle());
  await P.evaluate(() => game.startWorld('valley', null, false));
  await waitFor(P, () => game.state === 'playing', 90000);
  check('and is back after opening it again, with the new things in the inventory', await P.evaluate(() => game.entities.filter(e => e.vehicle && e.type === 'car').length === 1 && game.player.inv[1].id === I.BOW && game.player.inv[2].count === 16));
  // 4. the Nether part of the old save
  await P.evaluate(() => { const pl = game.player, p = game.portals.find(q => q.d === 'over'); if (p) [pl.x, pl.y, pl.z] = portalSpot(p, 0); game.travel(Math.floor(pl.x), Math.floor(pl.y), Math.floor(pl.z)); });
  await waitFor(P, () => game.state === 'playing' && game.dim === 'nether', 90000);
  await waitFor(P, N => game.world.getBlock(N.x, N.y, N.z) !== B.UNLOADED, 30000, N);
  check("the old world's Nether is still there, with what was built in it", await P.evaluate(N => game.world.getBlock(N.x, N.y, N.z) === B.GLOWSTONE, N));

  check('no page errors', errs.length === 0, errs.slice(0, 5));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
