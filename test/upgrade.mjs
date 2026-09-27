// Upgrading: a world saved by the previous version keeps its builds when villages arrive.
// A village that would overlap anything the player built is left out of that world.
// Usage: node test/upgrade.mjs <previous version's dist/declan-craft.html>
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), out = path.join(dir, 'shots');
if (!process.argv[2]) { console.error('usage: node test/upgrade.mjs <previous build .html>'); process.exit(2); }
const pages = { '/old.html': fs.readFileSync(process.argv[2]), '/new.html': fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html')) };
const server = http.createServer((req, res) => { const b = pages[req.url]; res.writeHead(b ? 200 : 404, { 'Content-Type': 'text/html' }); res.end(b || ''); }).listen(0);
const base = 'http://localhost:' + server.address().port;
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
const KEY = 'declancraft:v1:world:valley';

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });
  const errs = [];
  const open = async (p, file) => { await p.goto(base + file); await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 }); };
  const waitFor = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);

  // 1. the previous version: a new world
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push('old: ' + e.message));
  await open(P, '/old.html');
  await P.evaluate(() => game.startWorld('valley', 'creative', true));
  await waitFor(P, () => game.state === 'playing', 90000);
  const seed = await P.evaluate(() => game.seed);

  // 2. where the new version would put the village near spawn
  const Q = await ctx.newPage(); Q.on('pageerror', e => errs.push('new: ' + e.message));
  await open(Q, '/new.html');
  const v = await Q.evaluate(seed => game.gen.findVillage('valley', seed, 0.5, 0.5, []), seed);
  await Q.close();
  check('the new version has a village near this world\'s spawn', !!v, { seed, v });

  // 3. back in the previous version: build right where that village would go, and save
  await P.evaluate(v => Object.assign(game.player, { x: v[0] + 0.5, y: v[1] + 16, z: v[2] + 12.5, vx: 0, vy: 0, vz: 0, flying: true, yaw: 0, pitch: -0.6 }), v);
  await waitFor(P, v => game.world.getBlock(v[0], 1, v[2]) !== B.UNLOADED && game.world.getBlock(v[0] + 12, 1, v[2] + 12) !== B.UNLOADED, 60000, v);
  const built = await P.evaluate(v => {
    const w = game.world;
    for (let dy = 0; dy < 4; dy++) w.setBlock(v[0], v[1] + 3 + dy, v[2], B.GOLD_BLOCK, 0);
    for (let dx = -2; dx <= 2; dx++) w.setBlock(v[0] + dx, v[1] + 2, v[2] + 6, B.OAK_PLANKS, 0);
    game.save();
    const d = JSON.parse(localStorage.getItem('declancraft:v1:world:valley'));
    return { gold: w.getBlock(v[0], v[1] + 5, v[2]) === B.GOLD_BLOCK, chunks: Object.keys(d.world.edits).length, villagesField: 'villages' in d, playersField: 'players' in d };
  }, v);
  check('previous version saved the build (old save format)', built.gold && built.chunks >= 1 && !built.villagesField && !built.playersField, built);
  await P.evaluate(() => game.quitToTitle());

  // 4. the new version opens that save
  await open(P, '/new.html');
  await P.evaluate(() => game.startWorld('valley', null, false));
  check('new version opens the old world', await waitFor(P, () => game.state === 'playing', 90000));
  await waitFor(P, v => game.world.getBlock(v[0], 1, v[2]) !== B.UNLOADED && game.world.getBlock(v[0] + 12, 1, v[2] + 12) !== B.UNLOADED && game.world.getBlock(v[0] - 12, 1, v[2] - 12) !== B.UNLOADED, 60000, v);
  const after = await P.evaluate(v => {
    const w = game.world, c = { door: 0, bed: 0, gravel: 0 };
    let gold = 0, planks = 0;
    for (let dy = 0; dy < 4; dy++) if (w.getBlock(v[0], v[1] + 3 + dy, v[2]) === B.GOLD_BLOCK) gold++;
    for (let dx = -2; dx <= 2; dx++) if (w.getBlock(v[0] + dx, v[1] + 2, v[2] + 6) === B.OAK_PLANKS) planks++;
    for (let x = v[0] - 20; x <= v[0] + 20; x++) for (let z = v[2] - 20; z <= v[2] + 20; z++) for (let y = v[1] - 4; y <= v[1] + 10; y++) {
      const b = w.getBlock(x, y, z);
      if (b === B.DOOR) c.door++; else if (b === B.BED) c.bed++; else if (b === B.GRAVEL) c.gravel++;
    }
    const next = game.gen.findVillage('valley', game.seed, 0.5, 0.5, w.villageBlock);
    return { gold, planks, village: c, blocked: w.villageBlock.slice(), villagers: game.entities.filter(e => e.type === 'villager').length, next };
  }, v);
  check('the build is untouched', after.gold === 4 && after.planks === 5, after);
  check('no village is dropped on top of it', after.village.door === 0 && after.village.bed === 0 && after.villagers === 0 && after.blocked.length >= 1, after);
  check('villages elsewhere still exist', !after.next || Math.hypot(after.next[0] - v[0], after.next[2] - v[2]) > 60, after.next);
  await P.screenshot({ path: path.join(out, 'upgrade.png') });

  // 5. saving writes the new format, and it stays that way
  const saved = await P.evaluate(() => { game.save(); const d = JSON.parse(localStorage.getItem('declancraft:v1:world:valley')); return { blocked: d.villages && d.villages.blocked, players: d.players }; });
  check('new save remembers which village was left out', Array.isArray(saved.blocked) && saved.blocked.join() === after.blocked.join() && saved.players && typeof saved.players === 'object', saved);
  await P.evaluate(() => game.quitToTitle());
  await open(P, '/new.html');
  await P.evaluate(() => game.startWorld('valley', null, false));
  await waitFor(P, () => game.state === 'playing', 90000);
  await waitFor(P, v => game.world.getBlock(v[0], 1, v[2]) !== B.UNLOADED, 60000, v);
  const again = await P.evaluate(v => ({ gold: game.world.getBlock(v[0], v[1] + 5, v[2]) === B.GOLD_BLOCK, blocked: game.world.villageBlock.slice() }), v);
  check('reopening keeps both', again.gold && again.blocked.join() === after.blocked.join(), again);
  // 6. an old save where the player stands (with nothing built) right where a village would now go
  await P.evaluate(() => game.quitToTitle());
  await P.evaluate(v => {
    const d = JSON.parse(localStorage.getItem('declancraft:v1:world:valley'));
    delete d.villages; delete d.players; d.world.edits = {}; d.world.tiles = {};
    Object.assign(d.player, { x: v[0] + 3.5, y: v[1] + 1, z: v[2] + 0.5, flying: false });
    localStorage.setItem('declancraft:v1:world:valley', JSON.stringify(d));
  }, v);
  await P.evaluate(() => game.startWorld('valley', null, false));
  await waitFor(P, () => game.state === 'playing', 90000);
  await waitFor(P, v => game.world.getBlock(v[0], 1, v[2]) !== B.UNLOADED, 60000, v);
  const stand = await P.evaluate(v => { const w = game.world; let doors = 0; for (let x = v[0] - 20; x <= v[0] + 20; x++) for (let z = v[2] - 20; z <= v[2] + 20; z++) for (let y = v[1] - 4; y <= v[1] + 10; y++) if (w.getBlock(x, y, z) === B.DOOR) doors++; return { blocked: w.villageBlock.slice(), doors }; }, v);
  check('no village appears where an old save left the player', stand.blocked.includes('v0_0') && stand.doors === 0, stand);
  check('no script errors', errs.length === 0, errs.slice(0, 3));
  await browser.close(); server.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
