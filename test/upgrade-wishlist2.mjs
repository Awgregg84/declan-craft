// Upgrading to the second wish-list version: a world saved by the previous version (a build, a chest, a furnace, a
// dispenser, a car and a minecart, a full inventory, a trip to the Nether, a guest's things, a character and name)
// opens with everything in place, and the new things work in it (armor goes on, a boat floats, a sign keeps its words).
// Usage: node test/upgrade-wishlist2.mjs <previous version's dist/declan-craft.html>
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname);
if (!process.argv[2]) { console.error('usage: node test/upgrade-wishlist2.mjs <previous build .html>'); process.exit(2); }
const pages = { '/old.html': fs.readFileSync(process.argv[2]), '/new.html': fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html')) };
const server = http.createServer((req, res) => { const b = pages[req.url]; res.writeHead(b ? 200 : 404, { 'Content-Type': 'text/html' }); res.end(b || ''); }).listen(0);
const base = 'http://localhost:' + server.address().port;
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });
  const errs = [];
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // (the web font can stall the page loading from a test machine; it isn't needed here)
  const open = async (p, file) => { await p.goto(base + file, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 90000 }); };
  const waitFor = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push(e.message));

  // 1. the previous version
  await open(P, '/old.html');
  await P.evaluate(() => { PROFILE.skin = 'sister'; PROFILE.name = 'Lily'; saveProfile(); game.settings.difficulty = 1; game.applySettings(); game.startWorld('valley', 'survival', true); });
  await waitFor(P, () => game.state === 'playing', 90000);
  const A = await P.evaluate(() => {
    const w = game.world, pl = game.player, x = Math.floor(pl.x) + 3, y = Math.floor(pl.y), z = Math.floor(pl.z) + 3;
    for (let dy = 0; dy < 3; dy++) w.setBlock(x, y + dy, z, B.GOLD_BLOCK, 0);
    w.setBlock(x + 2, y, z, B.CHEST, 0); w.getTile(x + 2, y, z, 'chest').slots[3] = { id: I.DIAMOND, count: 7 };
    w.setBlock(x + 4, y, z, B.FURNACE, 0); Object.assign(w.getTile(x + 4, y, z, 'furnace'), { slots: [{ id: B.IRON_ORE, count: 3 }, { id: I.COAL, count: 2 }, null] });
    w.setBlock(x + 6, y, z, B.DISPENSER, 2); w.getTile(x + 6, y, z, 'dispenser').slots[4] = { id: I.ARROW, count: 12 };
    for (let i = 0; i < 4; i++) { w.setBlock(x + 8, y - 1, z + i, B.STONE, 0); w.setBlock(x + 8, y, z + i, B.AIR, 0); }   // (firm ground under the rails, wherever the world put us)
    for (let i = 0; i < 4; i++) shapeRail(w, x + 8, y, z + i, 0);
    spawnVehicle(game, 'minecart', x + 8.5, y + 0.0625, z + 0.5, 0);
    spawnVehicle(game, 'car', x - 3.5, y, z + 0.5, 1.2);
    for (let i = 0; i < 36; i++) pl.inv[i] = null;
    pl.inv[0] = { id: toolId(2, 0), count: 1, dmg: 17 }; pl.inv[5] = { id: B.TNT, count: 9 }; pl.inv[20] = { id: I.EMERALD, count: 33 }; pl.inv[35] = { id: I.BOW, count: 1, dmg: 40 };
    MP.guestSaves.guestpid002 = { x: x + 1, y, z: z + 1, inv: [{ id: I.STEAK, count: 5 }].concat(new Array(35).fill(null)), mode: 'survival', health: 15, food: 12, name: 'Cooper' };
    game.stats.mined = 12; game.day = 4;
    game.save();
    return { x, y, z, px: pl.x, pz: pl.z };
  });
  await P.evaluate(() => { const pl = game.player; game.travel(Math.floor(pl.x), Math.floor(pl.y), Math.floor(pl.z)); });
  await waitFor(P, () => game.state === 'playing' && game.dim === 'nether', 90000);
  await P.evaluate(() => { const pl = game.player; game.world.setBlock(Math.floor(pl.x) + 2, Math.floor(pl.y), Math.floor(pl.z), B.GLOWSTONE, 0); game.save(); });
  await P.evaluate(() => { const pl = game.player; game.travel(Math.floor(pl.x), Math.floor(pl.y), Math.floor(pl.z)); });
  await waitFor(P, () => game.state === 'playing' && game.dim === 'over', 90000);
  await P.evaluate(A => { Object.assign(game.player, { x: A.px, z: A.pz, y: A.y + 1, vx: 0, vy: 0, vz: 0 }); game.save(); }, A);
  const oldSave = await P.evaluate(() => JSON.parse(store.get(saveKey('valley'))));
  check('the previous version saved a world with vehicles, a guest and a trip to the Nether', !!oldSave.nether && oldSave.world.vehicles.length === 2 && oldSave.player.inv.length === 36 && !!oldSave.players.guestpid002,
    { nether: !!oldSave.nether, vehicles: oldSave.world.vehicles && oldSave.world.vehicles.length, inv: oldSave.player.inv.length });
  await P.evaluate(() => game.quitToTitle());

  // 2. the new version opens it: everything is where it was
  await open(P, '/new.html');
  const prof = await P.evaluate(() => ({ skin: PROFILE.skin, name: PROFILE.name, chars: PROFILE.chars.map(c => c.name).join(), diff: game.settings.difficulty, btn: el('btn-char').textContent }));
  check('your character, name and settings are kept (and the family is there to pick too)', prof.skin === 'sister' && prof.name === 'Lily' && prof.chars === 'Mommy,Daddy,Cooper,Lily,Michael,Luca' && prof.diff === 1 && /Lily/.test(prof.btn), prof);
  await P.evaluate(() => game.startWorld('valley', null, false));
  check('the new version opens the world', await waitFor(P, () => game.state === 'playing', 90000));
  await waitFor(P, A => game.world.getBlock(A.x + 8, A.y, A.z + 3) !== B.UNLOADED && game.world.getBlock(A.x - 4, A.y, A.z) !== B.UNLOADED, 60000, A);
  const got = await P.evaluate(A => {
    const w = game.world, pl = game.player, ch = w.getTile(A.x + 2, A.y, A.z), fu = w.getTile(A.x + 4, A.y, A.z), di = w.getTile(A.x + 6, A.y, A.z);
    return {
      gold: [0, 1, 2].every(d => w.getBlock(A.x, A.y + d, A.z) === B.GOLD_BLOCK), chest: ch && ch.slots[3] && ch.slots[3].id === I.DIAMOND && ch.slots[3].count === 7,
      furnace: fu && fu.slots[0] && fu.slots[0].id === B.IRON_ORE, disp: di && di.slots[4] && di.slots[4].count === 12, rails: w.getBlock(A.x + 8, A.y, A.z + 3) === B.RAIL,
      pick: pl.inv[0] && pl.inv[0].id === toolId(2, 0) && pl.inv[0].dmg === 17, tnt: pl.inv[5] && pl.inv[5].count === 9, em: pl.inv[20] && pl.inv[20].count === 33, bow: pl.inv[35] && pl.inv[35].id === I.BOW && pl.inv[35].dmg === 40,
      slots: pl.inv.length, newSlots: pl.inv.slice(36).every(s => s === null), mode: game.mode, day: game.day, mined: game.stats.mined, dim: game.dim, hardcore: game.hardcore, slot: game.slot,
      near: Math.hypot(pl.x - A.px, pl.z - A.pz) < 1, cart: game.entities.filter(e => e.type === 'minecart').length, car: game.entities.filter(e => e.type === 'car').length, portals: game.portals.length,
    };
  }, A);
  check('the build, the chest, the furnace, the dispenser and the rails are all there', got.gold && got.chest && got.furnace && got.disp && got.rails, got);
  check('the inventory is all there (with room now for armor and a shield)', got.pick && got.tnt && got.em && got.bow && got.slots === 41 && got.newSlots, got);
  check('the car and the minecart are there', got.cart === 1 && got.car === 1, got);
  check('the same world: Survival, day 4, the stats and the portals kept, and not Hardcore', got.mode === 'survival' && got.day === 4 && got.mined === 12 && got.portals >= 2 && got.near && got.dim === 'over' && !got.hardcore && got.slot === 'valley', got);
  check("a guest's things saved in it are kept (with the new slots added)", await P.evaluate(() => { const d = cleanGuestSave(MP.guestSaves.guestpid002); return !!d && d.inv.length === 41 && d.inv[0].id === I.STEAK && d.inv[0].count === 5; }));
  // 3. the new things work in it
  const nw = await P.evaluate(A => {
    const w = game.world, pl = game.player, out = {};
    pl.inv[1] = { id: armorId(2, 1), count: 1 }; pl.sel = 1; equipArmor(pl); out.armor = pl.inv[37] && pl.inv[37].id === armorId(2, 1) && armorPoints(pl.inv) === 6;
    for (let dx = 0; dx < 4; dx++) for (let dz = 0; dz < 4; dz++) { w.setBlock(A.x + dx, A.y - 1, A.z + 6 + dz, B.WATER, 0); w.setBlock(A.x + dx, A.y - 2, A.z + 6 + dz, B.WATER, 0); }
    spawnVehicle(game, 'boat', A.x + 2, A.y - 1 + 0.875 + 0.03, A.z + 8, 0);
    w.setBlock(A.x + 10, A.y, A.z, B.SIGN, 0); setSignText(w, A.x + 10, A.y, A.z, ['Old world', 'new things', '', '']);
    return out;
  }, A);
  await P.waitForTimeout(1500);
  const fl = await P.evaluate(() => { const b = game.entities.find(e => e.type === 'boat'); return b && b.afloat; });
  check('armor goes on, and a boat floats, in the old world', nw.armor && fl, { nw, fl });
  await P.evaluate(() => game.save());
  await P.evaluate(() => game.quitToTitle());
  await P.evaluate(() => game.startWorld('valley', null, false));
  await waitFor(P, () => game.state === 'playing', 90000);
  await waitFor(P, A => game.world.getBlock(A.x + 10, A.y, A.z) !== B.UNLOADED, 60000, A);
  const again = await P.evaluate(A => ({ sign: (signLines(game.world, A.x + 10, A.y, A.z) || [])[0], boats: game.entities.filter(e => e.type === 'boat').length, armor: game.player.inv[37] && game.player.inv[37].id }), A);
  check('and it all saves and comes back', again.sign === 'Old world' && again.boats === 1 && again.armor === await P.evaluate(() => armorId(2, 1)), again);
  check('no page errors', errs.length === 0, errs.slice(0, 5));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
