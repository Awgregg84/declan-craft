// Nether creatures: zombified piglins (friendly until hit) and magma cubes (hop after you).
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
  const gameWait = async secs => { const t0 = await E(() => game.world.clock); await waitFor(a => game.world.clock - a[0] >= a[1], 120000, [t0, secs]); };
  await E(() => { game.settings.difficulty = 2; game.startWorld('valley', 'creative', true); });
  await waitFor(() => game.state === 'playing', 90000);
  await E(() => { game.dragLook = true; const pl = game.player; game.travel(Math.floor(pl.x), Math.floor(pl.y), Math.floor(pl.z)); });
  check('in the Nether', await waitFor(() => game.state === 'playing' && game.dim === 'nether', 90000));

  // 1. piglins turn up by themselves; no overworld monsters or animals here
  await E(() => { for (let i = 0; i < 40; i++) spawnTick(game); });
  const pop = await E(() => { const c = {}; for (const e of game.entities) if (e.mob) c[e.type] = (c[e.type] || 0) + 1; return c; });
  check('zombified piglins spawn in the Nether, and only Nether creatures', (pop.piglin || 0) >= 2 && Object.keys(pop).every(t => t === 'piglin' || t === 'magma'), pop);

  // 2. a test arena: a netherrack floor in the air
  const A = await E(() => {
    const w = game.world, pl = game.player, x = Math.floor(pl.x), y = 110, z = Math.floor(pl.z);
    for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) { w.setBlock(x + dx, y - 1, z + dz, B.NETHERRACK, 0); for (let dy = 0; dy < 4; dy++) w.setBlock(x + dx, y + dy, z + dz, B.AIR, 0); }
    for (const e of game.entities) if (e.mob) e.removed = true;
    game.setMode('survival');
    Object.assign(pl, { x: x + 0.5, y, z: z + 0.5, vx: 0, vy: 0, vz: 0, flying: false, yaw: 0, pitch: -0.25, health: 20 });
    return { x, y, z };
  });
  await sleep(500);
  await E(A => { window.__p1 = spawnMob(game, 'piglin', A.x + 0.5, A.y, A.z - 2.5); window.__p2 = spawnMob(game, 'piglin', A.x + 3.5, A.y, A.z - 4.5); }, A);
  await gameWait(3);
  const calm = await E(() => ({ hp: game.player.health, angry: !!(window.__p1.angryT > 0) }));
  check('piglins leave you alone at first', calm.hp === 20 && !calm.angry, calm);
  await p.screenshot({ path: path.join(out, 'nether-piglins.png') });
  await E(() => { const e = window.__p1; hurtMob(game, e, 2, game.player.x, game.player.z, 'player'); });
  const mad = await E(() => ({ a: window.__p1.angryT > 0, b: window.__p2.angryT > 0 }));
  check('hitting one makes the piglins nearby angry', mad.a && mad.b, mad);
  await gameWait(3);
  const hit = await E(() => game.player.health);
  check('angry piglins attack', hit < 20, hit);
  await E(() => { window.__p1.removed = window.__p2.removed = true; game.player.health = 20; });

  // 3. magma cubes hop after you and hurt
  await E(A => { window.__m = spawnMob(game, 'magma', A.x + 0.5, A.y, A.z - 5.5, { size: 2 }); window.__maxVy = 0; }, A);
  let maxVy = 0;
  for (let i = 0; i < 12; i++) { await sleep(250); maxVy = Math.max(maxVy, await E(() => window.__m.vy)); }
  check('a magma cube hops', maxVy > 2, +maxVy.toFixed(2));
  await gameWait(4);
  const mh = await E(() => ({ hp: game.player.health, d: Math.hypot(window.__m.x - game.player.x, window.__m.z - game.player.z) }));
  check('...toward you, and hurts', mh.hp < 20 && mh.d < 3, mh);
  await p.screenshot({ path: path.join(out, 'nether-magma.png') });
  // 4. no harm from lava
  const lava = await E(A => {
    const m = window.__m, w = game.world;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) w.setBlock(A.x + 5 + dx, A.y - 1, A.z + 5 + dz, B.LAVA, 0);
    Object.assign(m, { x: A.x + 5.5, y: A.y - 1, z: A.z + 5.5, vx: 0, vz: 0 }); game.setMode('creative');
    return m.hp;
  }, A);
  await gameWait(2);
  check('magma cubes do not burn in lava', await E(hp => window.__m.hp === hp && !window.__m.dead, lava));
  // 5. Peaceful: magma cubes go away and piglins stay calm, even when hit
  const calm2 = await E(A => {
    for (const e of game.entities) if (e.mob) e.removed = true;
    const m = spawnMob(game, 'magma', A.x + 0.5, A.y, A.z - 5.5), pg = spawnMob(game, 'piglin', A.x + 2.5, A.y, A.z - 3.5);
    pg.angryT = 20; pg.angryAt = 'me';
    game.settings.difficulty = 0; spawnTick(game);
    const r = { magmaStays: !m.removed, stillAngry: pg.angryT > 0 };
    hurtMob(game, pg, 1, game.player.x, game.player.z, 'player');
    r.angryWhenHit = pg.angryT > 0;
    game.settings.difficulty = 2; pg.removed = true;
    return r;
  }, A);
  check('on Peaceful, no magma cubes and no angry piglins', !calm2.magmaStays && !calm2.stillAngry && !calm2.angryWhenHit, calm2);
  // 6. spawn eggs
  const eggs = await E(() => ['piglin', 'magma'].map(m => { const id = I.EGG + EGG_MOBS.indexOf(m); return CREATIVE_LIST.includes(id) && itemName(id); }));
  check('spawn eggs for the new creatures', eggs.join() === 'Zombified Piglin Spawn Egg,Magma Cube Spawn Egg', eggs);
  check('no script errors', errs.length === 0, errs.slice(0, 3));
  await browser.close(); server.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
