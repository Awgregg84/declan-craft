// Upgrading a Mars world to the second Mars update: a Mars world saved by the first Mars version (with something built
// where the new base dome goes, a best race time, and the rocket, the saucer and the buggies where they were left)
// opens with everything in place. The new things (the ball field, Dune Dash, the ruins) are there; the base dome is
// left out, because something was built on its ground.
// Usage: node test/upgrade-mars.mjs <the first Mars version's dist/declan-craft.html>
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname);
if (!process.argv[2]) { console.error('usage: node test/upgrade-mars.mjs <previous build .html>'); process.exit(2); }
const pages = { '/old.html': fs.readFileSync(process.argv[2]), '/new.html': fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html')) };
const server = http.createServer((req, res) => { const b = pages[req.url]; res.writeHead(b ? 200 : 404, { 'Content-Type': 'text/html' }); res.end(b || ''); }).listen(0);
const base = 'http://localhost:' + server.address().port;
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });
  const errs = [];
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const open = async (p, file) => { await p.goto(base + file, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 90000 }); };
  const waitFor = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push(e.message));
  const SPOT = [20, 36];   // (where the second update's base dome goes)

  // 1. the first Mars version: a Mars world with a gold tower built where the base will go
  await open(P, '/old.html');
  await P.evaluate(() => { game.dragLook = true; game.startWorld('marsworld', 'survival', true); });
  await waitFor(P, () => game.state === 'playing', 90000);
  await sleep(5000);
  const A = await P.evaluate(SPOT => {
    const w = game.world, pl = game.player, Y = game.gen.marsw.town.y + 1;
    for (let dy = 0; dy < 4; dy++) w.setBlock(SPOT[0], Y + dy, SPOT[1], B.GOLD_BLOCK, 0);
    pl.inv[3] = { id: I.MARS_CRYSTAL, count: 5 };
    game.stats.raceBest = { 0: 71.5 }; game.stats.martians = 1; game.day = 3;
    game.save();
    const ents = t => game.entities.filter(e => !e.removed && e.type === t).length;
    return { Y, rocket: ents('rocket'), saucer: ents('saucer'), buggy: ents('buggy'), tracks: game.gen.marsTracks().length };
  }, SPOT);
  const oldSave = await P.evaluate(() => JSON.parse(store.get(saveKey('marsworld'))));
  check('the first Mars version saved a Mars world with its rocket, saucer and buggies (two tracks then)', !oldSave.mars2 && A.rocket === 1 && A.saucer === 1 && A.buggy === 6 && A.tracks === 2 && oldSave.world.vehicles.length === 8, { vehicles: oldSave.world.vehicles.length, A });
  await P.evaluate(() => game.quitToTitle());

  // 2. the new version opens it
  await open(P, '/new.html');
  await P.evaluate(() => { game.dragLook = true; game.startWorld('marsworld', 'survival', false); });
  await waitFor(P, () => game.state === 'playing', 90000);
  await sleep(6000);
  const N = await P.evaluate(a => {
    const w = game.world, pl = game.player, M = game.gen.marsw, Y = a.Y, ents = t => game.entities.filter(e => !e.removed && e.type === t), nm = (x, y, z) => BLOCKS[w.getBlock(x, y, z)].name;
    return { vb: game.overVB.slice(), tower: nm(a.S[0], Y + 3, a.S[1]), maker: nm(M.base.x, Y, M.base.z), glass: nm(M.base.x + 3, Y + 5, M.base.z), day: game.day, crystals: pl.inv[3] && pl.inv[3].count, best: game.stats.raceBest && game.stats.raceBest[0], helmet: wearsSpaceHelmet(pl),
      rocket: ents('rocket').length, saucer: ents('saucer').length, buggy: ents('buggy').length, ball: ents('marsball').length, marshals: ents('martian').filter(e => e.marshal !== undefined).map(e => e.marshal).sort().join(''),
      field: nm(M.field.x + 4, Y - 1, M.field.z + 3), tracks: game.gen.marsTracks().length };
  }, { S: SPOT, Y: A.Y });
  check('it opens: your things, the day, your best race time and what you built are all there', N.tower === 'Block of Gold' && N.day === 3 && N.crystals === 5 && N.best === 71.5 && N.helmet, N);
  check('the base dome is left out, because something was built on its ground (and only it)', N.vb.join() === 'mbase' && N.maker !== 'Air Maker' && N.glass !== 'Glass', { vb: N.vb, maker: N.maker, glass: N.glass });
  check('the rocket, the saucer and the first six buggies are where they were (not twice), and Dune Dash brings three more', N.rocket === 1 && N.saucer === 1 && N.buggy === 9, { rocket: N.rocket, saucer: N.saucer, buggy: N.buggy });
  check('the new things are there: the ball field with its ball, and a third track with its marshal', N.field === 'Lime Wool' && N.ball === 1 && N.tracks === 3 && N.marshals === '012', { field: N.field, ball: N.ball, marshals: N.marshals });
  const T3 = await P.evaluate(() => { const t = game.gen.marsTracks()[2], q = t.pts[t.N - 8]; Object.assign(game.player, { x: q[0], y: q[2] + 1.2, z: q[1], vx: 0, vy: 0, vz: 0 }); return q; });
  await waitFor(P, () => game.world.readyAround(game.player.x, game.player.z, 1) >= 1, 60000);
  const road = await P.evaluate(q => BLOCKS[game.world.getBlock(Math.floor(q[0]), q[2], Math.floor(q[1]))].name, T3);
  check('Dune Dash is built in the old world', road === 'Race Track', road);
  // 3. saved again and opened again: the same
  await P.evaluate(() => { game.save(); });
  const newSave = await P.evaluate(() => JSON.parse(store.get(saveKey('marsworld'))));
  await P.evaluate(() => game.quitToTitle());
  await P.evaluate(() => { game.startWorld('marsworld', 'survival', false); });
  await waitFor(P, () => game.state === 'playing', 90000);
  await sleep(3000);
  const again = await P.evaluate(() => ({ vb: game.overVB.slice(), buggy: game.entities.filter(e => !e.removed && e.type === 'buggy').length }));
  check('saved by the new version (and marked so), it opens the same way again', newSave.mars2 === 1 && newSave.villages.blocked.join() === 'mbase' && again.vb.join() === 'mbase' && again.buggy === 9, { mars2: newSave.mars2, again });
  check('no page errors', errs.length === 0, errs.slice(0, 5));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails ? 1 : 0);
})();
