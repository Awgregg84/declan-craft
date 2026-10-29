// Declan's third wish list, playing alone. Sections can be picked: node test/wishlist3.mjs golems rain ...
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
const want = process.argv.slice(2), on = k => !want.length || want.includes(k);
const FRONT_FACE_OF = d => [4, 1, 5, 0][d & 3];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // (the web font can stall the page loading from a test machine; it isn't needed here)
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:' + server.address().port + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 90000 });
  const E = (fn, arg) => p.evaluate(fn, arg);
  const waitFor = (fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
  const shot = async name => { await p.screenshot({ path: path.join(out, 'w3-' + name + '.png') }); };
  await E(() => { game.startWorld('valley', 'survival', true); });
  await waitFor(() => game.state === 'playing', 90000);
  await E(() => {
    game.dragLook = true; game.settings.difficulty = 2; game.world.time = 0.25;
    window.__toasts = []; const t0 = toast; window.toast = (m, s) => { window.__toasts.push(m); return t0(m, s); };
    window.T = {
      stage(x, y, z, r, h) { const w = game.world; for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { w.setBlock(x + dx, y - 1, z + dz, B.STONE, 0); for (let k = 0; k < (h || 6); k++) w.setBlock(x + dx, y + k, z + dz, B.AIR, 0); } },
      clearMobs() { for (const e of game.entities) if (e.mob || e.type === 'proj' || e.type === 'item' || e.type === 'tnt' || e.type === 'xp') e.removed = true; },
      aim(tx, ty, tz) { const pl = game.player, dx = tx - pl.x, dy = ty - (pl.y + pl.eye), dz = tz - pl.z; pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
      put(x, y, z, opts) { Object.assign(game.player, { x, y, z, vx: 0, vy: 0, vz: 0, fallDist: 0, flying: false }, opts || {}); },
      hold(id, count, extra) { const pl = game.player; pl.inv[0] = id ? Object.assign({ id, count: count || 1 }, extra || {}) : null; pl.sel = 0; game.ui.dirty = true; },
      count(id) { return game.player.inv.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0); },
      ents(type) { return game.entities.filter(e => !e.removed && e.type === type); },
      tap() { game.input.use = true; game.input.usePressed = true; game.input.useOnce = true; },
    };
  });
  const base = await E(() => { const pl = game.player; return { x: Math.floor(pl.x), y: 100, z: Math.floor(pl.z) }; });
  const area = (dx, dz) => ({ x: base.x + dx, y: base.y, z: base.z + dz });
  const goto = async C => {
    await E(C => T.put(C.x + 0.5, C.y + 3, C.z + 0.5, { flying: true }), C);
    await waitFor(C => game.world.readyAround(C.x + 0.5, C.z + 0.5, 1) >= 1, 60000, C);
  };

  if (on('golems')) {
    // ---------- iron golems ----------
    const G = area(0, 0);
    await goto(G);
    await E(G => { T.stage(G.x, G.y, G.z, 14, 8); T.clearMobs(); T.put(G.x + 0.5, G.y, G.z + 10.5, { yaw: 0, pitch: -0.1 }); for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.setMode('survival'); game.player.health = 20; game.world.time = 0.75; }, G);
    await sleep(300);
    const eg = await E(() => { const id = I.EGG + EGG_MOBS.indexOf('golem'); return { name: itemName(id), icon: !!ICONS[id], creative: CREATIVE_LIST.includes(id) }; });
    check('there is an Iron Golem spawn egg', eg.name === 'Iron Golem Spawn Egg' && eg.icon && eg.creative, eg);
    // a village's people come with its iron golem (two for a big village)
    const vg = await E(G => {
      spawnVillagers(game, ['villager', G.x + 0.5, G.y, G.z - 6.5, 5, 'vtest1', 'farmer,librarian']);
      spawnVillagers(game, ['villager', G.x + 8.5, G.y, G.z - 6.5, 7, 'vtest2', 'farmer']);
      const g1 = T.ents('golem').filter(g => g.village === 'vtest1'), g2 = T.ents('golem').filter(g => g.village === 'vtest2');
      return { g1: g1.length, g2: g2.length, home: g1[0] && g1[0].home, hp: g1[0] && g1[0].hp };
    }, G);
    check('every village has an iron golem (a big one has two), with 100 health', vg.g1 === 1 && vg.g2 === 2 && vg.hp === 100, vg);
    await sleep(1500);
    await shot('golems-village');
    // it leaves you alone
    await E(() => { for (const g of T.ents('golem')) { g.x = game.player.x + 1.5; g.z = game.player.z; } game.player.health = 20; });
    await sleep(3000);
    check("golems leave players alone", await E(() => game.player.health === 20 && T.ents('golem').every(g => !(g.angryT > 0))));
    // a zombie comes into the village: a golem goes after it and flings it up in the air
    await E(G => { for (const e of game.entities) if (e.mob && e.village === 'vtest2') e.removed = true; T.put(G.x + 0.5, G.y, G.z + 12.5); }, G);
    const zid = await E(G => { const z = spawnMob(game, 'zombie', G.x + 6.5, G.y, G.z - 2.5); z.hp = 40; window.__zmaxY = z.y; window.__zy0 = z.y; return z.nid; }, G);
    let flung = false;
    for (let i = 0; i < 60 && !flung; i++) {
      await sleep(250);
      flung = await E(zid => { const z = game.entities.find(e => e.nid === zid); if (!z) return true; window.__zmaxY = Math.max(window.__zmaxY, z.y); return z.hp < 40 && window.__zmaxY - window.__zy0 > 1; }, zid);
    }
    const zz = await E(zid => { const z = game.entities.find(e => e.nid === zid); return { hp: z ? z.hp : 'gone', up: Math.round((window.__zmaxY - window.__zy0) * 10) / 10 }; }, zid);
    check('a golem goes after a zombie and flings it up in the air', flung, zz);
    await E(zid => { const z = game.entities.find(e => e.nid === zid); if (z) z.removed = true; }, zid);
    // hit one, and it comes after you
    await E(() => { const g = T.ents('golem')[0]; g.x = game.player.x + 2; g.z = game.player.z; g.prey = null; game.player.health = 20; game.player.invuln = 0; hurtMob(game, g, 1, game.player.x, game.player.z, 'player'); });
    check('hit a golem and it comes after you', await waitFor(() => game.player.health < 20, 8000), await E(() => ({ hp: game.player.health, angry: T.ents('golem')[0].angryT })));
    await E(() => { for (const g of T.ents('golem')) { g.angryT = 0; g.removed = true; } game.player.health = 20; });
    // build one: four iron blocks in a T and a pumpkin on top
    const bld = await E(G => {
      const w = game.world, x = G.x, y = G.y, z = G.z;
      w.setBlock(x, y, z, B.IRON_BLOCK, 0); w.setBlock(x, y + 1, z, B.IRON_BLOCK, 0); w.setBlock(x - 1, y + 1, z, B.IRON_BLOCK, 0); w.setBlock(x + 1, y + 1, z, B.IRON_BLOCK, 0);
      w.setBlock(x, y + 1, z + 3, B.STONE, 0); T.put(x + 0.5, y + 2, z + 3.5);   // (standing on a ledge, looking down at the top of the T)
      T.hold(B.PUMPKIN, 1); T.aim(x + 0.5, y + 2, z + 0.5); T.tap();
      return { x, y, z };
    }, G);
    await sleep(600);
    const built = await E(B0 => { const w = game.world, g = T.ents('golem').find(e => e.built); return { golem: !!g, home: g && g.home, iron: [w.getBlock(B0.x, B0.y, B0.z), w.getBlock(B0.x, B0.y + 1, B0.z), w.getBlock(B0.x - 1, B0.y + 1, B0.z)], pumpkin: T.count(B.PUMPKIN) }; }, bld);
    check('four iron blocks in a T with a pumpkin on top come to life as an iron golem', built.golem && built.iron.every(b => b === 0) && built.pumpkin === 0, built);
    check('one you built never turns on you, even when hit', await E(() => { const g = T.ents('golem').find(e => e.built); hurtMob(game, g, 1, game.player.x, game.player.z, 'player'); return !(g.angryT > 0); }));
    // it holds out a poppy for a villager now and then (drawn in its hand); it stays when you go far away
    await E(G => { const g = T.ents('golem').find(e => e.built); g.rose = 5; T.put(g.x + 0.5, g.y, g.z + 5.5); T.aim(g.x, g.y + 1.6, g.z); game.view = 0; }, G);
    await sleep(800);
    await shot('golem-poppy');
    await E(G => T.put(G.x + 120.5, G.y + 30, G.z + 0.5, { flying: true }), G);
    await sleep(2500);
    check("golems don't wander off or vanish when you go away", await E(() => T.ents('golem').some(e => e.built)));
    check('/summon golem works', await E(() => { const n = T.ents('golem').length; game.runCommand('/summon golem'); return T.ents('golem').length === n + 1; }));
    await E(() => { for (const g of T.ents('golem')) g.removed = true; });
  }

  if (on('weather')) {
    // ---------- rain, snow and thunderstorms ----------
    // somewhere it rains (not a snowy place or a desert), high enough to be above any hills
    const W = await E(b => { const g = game.gen, m = game.world.map, sd = game.seed, ok = (x, z) => g.climateAt(m, sd, x, z) === 1;
      for (let r = 40; r < 4000; r += 40) for (let a = 0; a < 16; a++) { const x = Math.round(b.x + Math.cos(a / 16 * Math.PI * 2) * r), z = Math.round(b.z + Math.sin(a / 16 * Math.PI * 2) * r); if (ok(x, z) && ok(x + 14, z + 14) && ok(x - 14, z - 14) && ok(x + 14, z - 14) && ok(x - 14, z + 14)) return { x, y: 117, z }; }
      return { x: b.x + 40, y: 117, z: b.z }; }, base);
    await goto(W);
    await E(W => { T.stage(W.x, W.y, W.z, 10, 10); T.clearMobs(); T.put(W.x + 0.5, W.y, W.z + 0.5, { yaw: 0, pitch: 0 }); game.setMode('survival'); game.world.time = 0.3; game.runCommand('/weather clear'); WX.snap = true; }, W);
    await sleep(500);
    check('the weather starts clear (and changes by itself later)', await E(() => !WX.on && WX.amt === 0 && WX.t > 60));
    await E(() => { game.runCommand('/weather rain'); window.__k = game.gen.climateAt(game.world.map, game.seed, game.player.x, game.player.z); });
    const r1 = await E(() => ({ on: WX.on, amt: WX.amt }));
    await waitFor(() => WX.amt > 0.95, 40000);
    const r2 = await E(() => ({ on: WX.on, amt: Math.round(WX.amt * 100) / 100, kind: WX.kind, here: window.__k, dark: Math.round(WX.dark * 100) / 100, sky: Math.round(game.sky.skyLight * 100) / 100 }));
    check('/weather rain: the rain comes in gently and the sky gets darker', r1.on && r1.amt < 0.5 && r2.amt > 0.85 && r2.dark > 0.5 && r2.sky < 0.95, { r1, r2 });
    check('it is raining here (not snowing, not a desert)', r2.kind === 1 && r2.here === 1, r2);
    await shot('rain');
    // the rain stops at roofs: under one it isn't drawn (the column top is the roof), and the drops splash
    const roof = await E(W => {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) game.world.setBlock(W.x + dx, W.y + 4, W.z + dz, B.OAK_PLANKS, 0);
      wxColumns(game.world, W.x, W.z, 4, W.y + 1.6);
      const size = 9, at = (x, z) => WX.tops[(z - W.z + 4) * size + (x - W.x + 4)];
      return { under: at(W.x, W.z), open: at(W.x + 3, W.z + 3), ground: W.y };
    }, W);
    check('rain stops at a roof (and falls to the ground in the open)', roof.under === roof.ground + 5 && roof.open === roof.ground, roof);
    check('drops splash on the ground', await waitFor(() => PARTICLES.some(p => p.tile === TILE.drip), 8000));
    // rain puts out a creature on fire, and a zombie doesn't burn in it, even at noon
    const fire = await E(W => { const p = spawnMob(game, 'pig', W.x + 3.5, W.y, W.z + 3.5); p.fireT = 8; p.aiT = 99; return p.nid; }, W);
    check('rain puts out a pig on fire', await waitFor(nid => { const p = game.entities.find(e => e.nid === nid); return p && !(p.fireT > 0); }, 3000, fire));
    const zh = await E(W => { game.world.time = 0.25; const z = spawnMob(game, 'zombie', W.x - 3.5, W.y, W.z - 3.5); z.hp = 20; window.__zr = z; game.mode = 'creative'; return z.hp; }, W);
    await sleep(3500);
    check("zombies don't burn in the rain", await E(() => window.__zr.hp === 20 && !window.__zr.removed && !(window.__zr.burnT > 0)), await E(() => ({ hp: window.__zr.hp })));
    // fish bite sooner
    check('fish bite sooner in the rain', await E(() => { let a = 0; for (let i = 0; i < 400; i++) a += fishWait({ lure: 0 }); return a / 400 < 11; }));
    // clear again: the zombie burns as usual
    await E(() => { game.runCommand('/weather clear'); WX.snap = true; });
    await sleep(500);
    check('in the sun again, the zombie burns', await waitFor(() => window.__zr.hp < 20 || window.__zr.dead || window.__zr.removed, 8000));
    await E(() => { T.clearMobs(); game.setMode('survival'); });
    // snow: everywhere with /weather snow (and in cold places when it rains)
    await E(() => { game.runCommand('/weather snow'); WX.snap = true; });
    await sleep(1500);
    check('/weather snow makes it snow', await E(() => WX.kind === 2 && WX.amt > 0.9 && WX.snowAll));
    await shot('snow');
    const cold = await E(() => { const g = game.gen, m = game.world.map, sd = game.seed; const seen = new Set(); for (let x = -3000; x <= 3000; x += 120) for (let z = -3000; z <= 3000; z += 120) seen.add(g.climateAt(m, sd, x, z)); return Array.from(seen).sort(); });
    check('the world has rainy, snowy and dry (desert) places', cold.join() === '0,1,2', cold);
    // a thunderstorm: darker, lightning now and then, and monsters may come out
    await E(() => { game.runCommand('/weather thunder'); WX.snap = true; WX.boltT = 0.5; });
    const st = await waitFor(() => !!WX.bolt || WX.flash > 0, 8000);
    check('a thunderstorm has lightning', st, await E(() => ({ storm: WX.storm, day: game.sky.day })));
    check('a thunderstorm is dark enough for monsters', await E(() => game.sky.day < 0.6));
    // saved with the world
    await E(() => game.save());
    const sv = await E(() => JSON.parse(store.get(saveKey(game.slot))).weather);
    check('the weather is saved', sv && sv.on && sv.th && sv.t > 0, sv);
    // sleeping through the night clears it
    await E(() => { game.world.time = 0.6; game.sleeping = 1; });
    check('sleeping through the night clears the weather', await waitFor(() => !WX.on && game.world.time < 0.5, 5000));
    check('/weather tells you what to type', await E(() => { const n = document.querySelectorAll('#chat-log div').length; game.runCommand('/weather banana'); const l = document.querySelectorAll('#chat-log div'); return l.length > n && /weather clear/.test(l[l.length - 1].textContent); }));
    await E(() => { game.runCommand('/weather clear'); WX.snap = true; });
  }

  if (on('snorks')) {
    // ---------- Snorks ----------
    const S = area(-40, 0);
    await goto(S);
    // a pool, 7 deep, with coral on the floor
    await E(S => {
      const w = game.world; T.clearMobs();
      for (let dx = -7; dx <= 7; dx++) for (let dz = -7; dz <= 7; dz++) {
        w.setBlock(S.x + dx, S.y - 8, S.z + dz, B.SAND, 0);
        for (let k = -7; k < 6; k++) w.setBlock(S.x + dx, S.y + k, S.z + dz, Math.abs(dx) === 7 || Math.abs(dz) === 7 ? (k < 0 ? B.GLASS : B.AIR) : k < 0 ? B.WATER : B.AIR, 0);
      }
      w.setBlock(S.x - 7, S.y - 1, S.z - 9, B.STONE, 0);
      w.setBlock(S.x + 2, S.y - 7, S.z + 2, B.CORAL_RED, 0); w.setBlock(S.x - 3, S.y - 7, S.z - 1, B.CORAL_YELLOW, 0); w.setBlock(S.x - 2, S.y - 7, S.z + 3, B.CORAL_BLUE, 0);
      T.put(S.x + 0.5, S.y + 3, S.z + 0.5, { flying: true }); game.setMode('survival'); game.world.time = 0.3; game.runCommand('/weather clear');
      for (let i = 0; i < 41; i++) game.player.inv[i] = null;
    }, S);
    const eg = await E(() => { const id = I.EGG + EGG_MOBS.indexOf('snork'); return { name: itemName(id), icon: !!ICONS[id], creative: CREATIVE_LIST.includes(id), coral: [B.CORAL_RED, B.CORAL_YELLOW, B.CORAL_BLUE].map(b => itemName(b) + (ICONS[b] && CREATIVE_LIST.includes(b) ? '' : '!')) }; });
    check('there is a Snork spawn egg, and three coral blocks', eg.name === 'Snork Spawn Egg' && eg.icon && eg.creative && eg.coral.join() === 'Red Coral Block,Yellow Coral Block,Blue Coral Block', eg);
    // Snorks turn up in deep water near you, a few together, all different colours
    const sp = await E(S => { T.put(S.x + 0.5, S.y + 3, S.z - 18.5, { flying: true }); for (let i = 0; i < 400 && !T.ents('snork').length; i++) snorkSpawnTick(game); const s = T.ents('snork'); return { n: s.length, colours: new Set(s.map(e => e.variant)).size, inWater: s.every(e => game.world.getBlock(Math.floor(e.x), Math.floor(e.y + 0.5), Math.floor(e.z)) === B.WATER) }; }, S);
    check('a family of Snorks turns up in deep water near you', sp.n >= 2 && sp.n <= 4 && sp.colours === sp.n && sp.inWater, sp);
    await sleep(3000);
    check('they swim about and stay in the water', await E(() => T.ents('snork').length >= 2 && T.ents('snork').every(e => game.world.getBlock(Math.floor(e.x), Math.floor(e.y + 0.5), Math.floor(e.z)) === B.WATER)));
    await E(() => { for (const s of T.ents('snork')) s.removed = true; });
    await E(S => { for (let i = 0; i < 3; i++) spawnMob(game, 'snork', S.x + 0.5 + i, S.y - 5, S.z + 0.5, { home: [S.x + 0.5, S.z + 0.5] }); }, S);
    // nothing hurts them
    check('nothing can hurt a Snork', await E(() => { const s = T.ents('snork')[0]; hurtMob(game, s, 100, s.x + 1, s.z, 'player'); explode(game, s.x, s.y, s.z, 3, 'test'); return s.hp === 20 && !s.dead && !s.removed; }));
    // hold a fish: they come to you
    await E(S => { T.put(S.x + 0.5, S.y - 3, S.z + 0.5, { flying: true }); T.hold(I.COD, 5); for (const s of T.ents('snork')) { s.x = S.x + 0.5 + (Math.random() * 2 - 1) * 5; s.z = S.z + 5.5; s.y = S.y - 6; s.panic = 0; } }, S);
    check('hold a fish and the Snorks swim over to you', await waitFor(() => T.ents('snork').every(s => Math.hypot(s.x - game.player.x, s.y - game.player.y, s.z - game.player.z) < 3.5), 15000),
      await E(() => T.ents('snork').map(s => Math.round(Math.hypot(s.x - game.player.x, s.y - game.player.y, s.z - game.player.z) * 10) / 10)));
    await E(() => { const s = T.ents('snork'), n = s.length; T.aim(s.reduce((a, e) => a + e.x, 0) / n, s.reduce((a, e) => a + e.y + 0.7, 0) / n, s.reduce((a, e) => a + e.z, 0) / n); });
    await sleep(400);
    await shot('snorks');
    // give one a fish: a present
    const gift = await E(() => {
      const s = T.ents('snork')[0], pl = game.player, before = pl.inv.filter(Boolean).map(t => t.id + 'x' + t.count).join();
      snorkGift(game, pl, s, I.COD, false);
      const got = pl.inv.filter(t => t && t.id !== I.COD);
      snorkGift(game, pl, s, I.COD, false);   // (again straight away: it's still eating)
      return { before, cod: T.count(I.COD), got: got.map(t => itemName(t.id) + ' x' + t.count), toast: el('toast').textContent, happy: s.happy > 0 };
    });
    check('give a Snork a fish and it gives you a present (one fish at a time)', gift.cod === 4 && gift.got.length === 1 && gift.happy && /still eating/.test(gift.toast), gift);
    check('tapping a Snork without a fish tells you what they like', await E(() => { const s = T.ents('snork')[1]; snorkGift(game, game.player, s, 0, false); return /love fish/.test(el('toast').textContent); }));
    // out of air under water: a Snork shares its air
    const air = await E(() => { const pl = game.player; pl.flying = false; pl.air = 2; pl.airT = 0; pl.snorkAirT = 0; return pl.headInWater; });
    await sleep(800);
    const air2 = await E(() => ({ air: game.player.air, under: game.player.headInWater }));
    check('running out of air under water, a Snork shares its air with you', air2.air === 10 && air2.under, { air, air2 });
    // tap one for real (it is the thing you are looking at)
    const tap = await E(() => { const s = T.ents('snork')[2] || T.ents('snork')[0]; s.giftT = 0; const pl = game.player; T.hold(I.SALMON, 2); T.aim(s.x, s.y + 0.6, s.z); window.__sn = s; window.__inv = pl.inv.filter(Boolean).length; T.tap(); return true; });
    check('tapping a Snork with a fish gives it the fish', await waitFor(() => T.count(I.SALMON) === 1, 3000), await E(() => ({ salmon: T.count(I.SALMON), tgt: game.player.targetEnt && game.player.targetEnt.type })));
    check('/summon snork works', await E(() => { const n = T.ents('snork').length; game.runCommand('/summon snork'); return T.ents('snork').length === n + 1; }));
    // coral reefs grow on the sea floor
    const reef = await E(() => {
      const g = game.gen, sd = game.seed;
      for (let r = 0; r < 60; r += 3) for (let a = 0; a < 12; a++) {
        const cx = Math.round(Math.cos(a / 12 * Math.PI * 2) * r), cz = Math.round(Math.sin(a / 12 * Math.PI * 2) * r);
        const c = g.generateChunk('valley', sd, cx, cz, null, null);
        let n = 0; for (let i = 0; i < c.blocks.length; i++) if (c.blocks[i] >= B.CORAL_RED && c.blocks[i] <= B.CORAL_BLUE) n++;
        if (n) return { cx, cz, n };
      }
      return null;
    });
    check('coral reefs grow on the sea floor', !!reef, reef);
    await E(() => { for (const s of T.ents('snork')) s.removed = true; game.player.flying = false; });
  }

  if (on('flying')) {
    // ---------- the flying car and broomsticks ----------
    const F = area(0, 40);
    await goto(F);
    await E(F => { T.stage(F.x, F.y, F.z, 12, 14); T.clearMobs(); for (const e of game.entities) if (e.vehicle) e.removed = true; T.put(F.x + 0.5, F.y, F.z + 0.5, { yaw: 0, pitch: -0.4 }); game.setMode('survival'); game.player.health = 20; for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.runCommand('/weather clear'); }, F);
    await sleep(300);
    const items = await E(() => ({ car: itemName(I.FLYING_CAR), broom: itemName(I.BROOM), icons: !!ICONS[I.FLYING_CAR] && !!ICONS[I.BROOM],
      recipes: RECIPES.filter(r => r.out === I.FLYING_CAR || r.out === I.BROOM).length, creative: CREATIVE_LIST.includes(I.FLYING_CAR) && CREATIVE_LIST.includes(I.BROOM) }));
    check('there is a Flying Car and a Broomstick (to make, and in Creative)', items.car === 'Flying Car' && items.broom === 'Broomstick' && items.icons && items.recipes === 2 && items.creative, items);
    // put the flying car down and get in
    await E(F => { T.hold(I.FLYING_CAR, 1); T.aim(F.x + 0.5, F.y - 0.5, F.z - 2.5); T.tap(); }, F);
    const fc = await waitFor(() => T.ents('flycar').length === 1, 3000);
    check('put a flying car down on the ground', fc && await E(() => T.count(I.FLYING_CAR) === 0));
    await E(() => { const v = T.ents('flycar')[0]; boardVehicle(game, v); game.player.pitch = 0; });
    // it drives along the ground like a car
    const g0 = await E(() => { const v = T.ents('flycar')[0]; return { x: v.x, y: v.y, z: v.z }; });
    await E(() => { game.input.fwd = true; });
    await sleep(1200);
    await E(() => { game.input.fwd = false; });
    const g1 = await E(() => { const v = T.ents('flycar')[0]; return { d: Math.hypot(v.x - window.__g0x, v.z - window.__g0z), x: v.x, y: v.y, z: v.z, flying: !!v.flying }; });
    check('it drives along the ground', Math.hypot(g1.x - g0.x, g1.z - g0.z) > 2 && Math.abs(g1.y - g0.y) < 0.2 && !g1.flying, { g0, g1 });
    // Jump: it takes off, wings out
    await E(() => { game.input.jump = true; });
    await sleep(1500);
    await E(() => { game.input.jump = false; });
    const up = await E(() => { const v = T.ents('flycar')[0]; return { y: v.y, flying: !!v.flying }; });
    check('Jump makes it take off', up.flying && up.y > g1.y + 3, { up, g1 });
    await shot('flycar');
    // it hovers when you let go
    await sleep(500);
    const h0 = await E(() => T.ents('flycar')[0].y);
    await sleep(1500);
    const h1 = await E(() => ({ y: T.ents('flycar')[0].y, pl: game.player.y, riding: !!game.player.riding }));
    check('it hovers in the air when you let go (and you stay in it)', Math.abs(h1.y - h0) < 0.5 && h1.riding, { h0, h1 });
    // forward goes where you look
    await E(() => { const pl = game.player; pl.yaw = Math.PI / 2; pl.pitch = 0.4; window.__p0 = [T.ents('flycar')[0].x, T.ents('flycar')[0].y]; game.input.fwd = true; });
    await sleep(1200);
    await E(() => { game.input.fwd = false; });
    const fw = await E(() => { const v = T.ents('flycar')[0]; return { dx: v.x - window.__p0[0], dy: v.y - window.__p0[1] }; });
    check('pushing forward flies where you look (left and up here)', fw.dx < -3 && fw.dy > 1, fw);
    // Sneak in the air takes it down (it doesn't drop you out), and it lands by itself
    await E(() => { game.input.sneak = true; });
    const landed = await waitFor(() => { const v = T.ents('flycar')[0]; return v && !v.flying; }, 15000);
    await E(() => { game.input.sneak = false; });
    const ld = await E(() => ({ riding: !!game.player.riding, hp: game.player.health }));
    check('Sneak in the air brings it down, and it lands gently', landed && ld.riding && ld.hp === 20, ld);
    await sleep(300);
    await E(() => { game.input.sneak = true; });
    await sleep(300);
    await E(() => { game.input.sneak = false; });
    check('on the ground, Sneak gets out', await E(() => !game.player.riding && game.player.health === 20));
    // left in the air with nobody in it, it floats down
    await E(() => { const v = T.ents('flycar')[0]; v.flying = true; v.y += 6; window.__fy = v.y; });
    check('a flying car left in the air floats gently down', await waitFor(() => { const v = T.ents('flycar')[0]; return !v.flying && v.y < window.__fy - 5; }, 15000));
    // brooms: they hover waiting, fly quicker
    await E(F => { T.put(F.x + 0.5, F.y, F.z + 0.5); T.hold(I.BROOM, 1); T.aim(F.x + 2.5, F.y - 0.5, F.z + 2.5); T.tap(); }, F);
    check('put a broom down', await waitFor(() => T.ents('broom').length === 1, 3000));
    await E(() => { const b = T.ents('broom')[0]; b.y += 1.5; window.__by = b.y; });
    await sleep(1000);
    check('a broom with nobody on it hovers where it is', await E(() => Math.abs(T.ents('broom')[0].y - window.__by) < 0.05));
    await E(() => { const b = T.ents('broom')[0]; b.y = window.__by - 1.5; boardVehicle(game, b); const pl = game.player; pl.yaw = 0; pl.pitch = 0.3; window.__b0 = [b.x, b.y, b.z]; game.input.fwd = true; });
    await sleep(1200);
    await E(() => { game.input.fwd = false; });
    const bf = await E(() => { const b = T.ents('broom')[0]; return { dz: b.z - window.__b0[2], dy: b.y - window.__b0[1], flying: !!b.flying, pose: rideKind(game.player.riding) }; });
    check('on a broom, push forward and it flies off where you look', bf.flying && bf.dz < -2.5 && bf.dy > 1 && bf.pose === 'broom', bf);
    const fs = await E(F => { game.save(); const d = JSON.parse(store.get(saveKey(game.slot))), b = d.world.vehicles.find(v => v.k === 'broom'); return { py: d.player.y, by: b && b.y, fly: T.ents('broom')[0].y, F: F.y }; }, F);
    check('saved while flying: you and the broom are kept on the ground below, not up in the air', Math.abs(fs.py - fs.F) < 1.1 && Math.abs(fs.by - fs.F) < 0.6 && fs.fly > fs.F + 1, fs);
    await E(() => { game.view = 1; game.player.pitch = -0.2; });
    await sleep(500);
    await shot('broom');
    await E(() => { game.view = 0; game.input.sneak = true; });
    check('a broom lands too', await waitFor(() => !T.ents('broom')[0].flying, 15000));
    await E(() => { game.input.sneak = false; });
    await sleep(200);
    await E(() => { game.input.sneak = true; });
    await sleep(300);
    await E(() => { game.input.sneak = false; });
    check('and Sneak gets off', await E(() => !game.player.riding && game.player.health === 20));
    // they are saved with the world
    const sv = await E(() => saveVehicles(game).map(v => v.k).sort().join());
    check('flying cars and brooms are saved with the world', sv === 'broom,flycar', sv);
    check('/summon flycar and /summon broom work', await E(() => { game.runCommand('/summon flycar'); game.runCommand('/summon broom'); return T.ents('flycar').length === 2 && T.ents('broom').length === 2; }));
    await E(() => { for (const e of game.entities) if (e.vehicle) e.removed = true; });
  }

  if (on('moon')) {
    // ---------- the rocket and the Moon ----------
    const M = area(-40, 40);
    await goto(M);
    await E(M => { T.stage(M.x, M.y, M.z, 8, 10); T.clearMobs(); for (const e of game.entities) if (e.vehicle) e.removed = true; T.put(M.x + 0.5, M.y, M.z + 3.5, { yaw: 0, pitch: -0.3 }); game.setMode('survival'); game.player.health = 20; game.player.food = 20; for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.runCommand('/weather clear'); game.world.time = 0.3; }, M);
    await sleep(300);
    const items = await E(() => ({ names: [I.ROCKET, I.SPACE_HELMET, I.CHEESE, B.FLAG, B.MOON_DUST, B.MOON_ROCK, B.MOON_CHEESE].map(itemName),
      icons: [I.ROCKET, I.SPACE_HELMET, I.CHEESE, B.FLAG, B.MOON_DUST, B.MOON_ROCK, B.MOON_CHEESE].every(id => ICONS[id] && CREATIVE_LIST.includes(id)),
      recipes: RECIPES.filter(r => [I.ROCKET, I.SPACE_HELMET, B.FLAG].includes(r.out)).length }));
    check('there is a Rocket, a Space Helmet, a Flag, and Moon blocks and cheese', items.icons && items.recipes === 3 && items.names.join() === 'Rocket,Space Helmet,Moon Cheese,Flag,Moon Dust,Moon Rock,Moon Cheese', items);
    await E(M => { T.hold(I.ROCKET, 1); T.aim(M.x + 0.5, M.y - 0.5, M.z + 0.5); T.tap(); }, M);
    check('put a rocket down on the ground', await waitFor(() => T.ents('rocket').length === 1, 3000));
    await shot('rocket');
    // get in, tap: 3, 2, 1, blast off... and everyone goes to the Moon
    await E(() => { boardVehicle(game, T.ents('rocket')[0]); window.__pad = [Math.floor(T.ents('rocket')[0].x), Math.floor(T.ents('rocket')[0].z)]; });
    await sleep(300);
    await E(() => { game.runCommand('/weather rain'); WX.snap = true; T.tap(); });
    const cd = await waitFor(() => !el('big-text').hidden && /^[123]$/.test(el('big-text').textContent), 4000);
    check('tap in the rocket: the countdown starts', cd, await E(() => ({ t: el('big-text').textContent, launch: T.ents('rocket')[0] && T.ents('rocket')[0].launchT })));
    const lift = await waitFor(() => T.ents('rocket')[0] && T.ents('rocket')[0].lifted, 15000);
    const ly = await E(() => T.ents('rocket')[0] ? T.ents('rocket')[0].y : null);
    const up = await waitFor(ly => T.ents('rocket')[0] && T.ents('rocket')[0].y > ly + 3, 10000, ly);   // (game time runs slower than real time on a busy machine)
    const ly2 = await E(() => T.ents('rocket')[0] ? T.ents('rocket')[0].y : null);
    check('Blast off! The rocket goes up', lift && up, { ly, ly2 });
    await waitFor(() => game.state === 'loading', 30000);
    const way = await E(() => { const d = JSON.parse(store.get(saveKey(game.slot))), r = (d.world.vehicles || []).find(v => v.k === 'rocket'); return { dim: d.dim, rocket: r && [Math.floor(r.x), r.y, Math.floor(r.z)], py: d.player.y, pad: window.__pad }; });
    check('the save made on the way has you on the ground beside your rocket, ready to go again (if the iPad closed the game)', way.dim === 'over' && way.rocket && way.rocket[0] === way.pad[0] && way.rocket[2] === way.pad[1] && Math.abs(way.rocket[1] - way.py) < 1.1 && way.py < 110, way);
    check('...and goes to the Moon', await waitFor(() => game.dim === 'moon' && game.state === 'playing', 150000), await E(() => ({ dim: game.dim, state: game.state })));
    check("it was raining at home, but there's no rain on the Moon", await waitFor(() => WX.on && WX.amt === 0 && WX.dark === 0 && game.gen.climateAt('moon', game.seed, 0, 0) === 0, 2000), await E(() => ({ on: WX.on, amt: WX.amt, dark: WX.dark })));
    const land = await waitFor(() => game.player.riding && game.player.riding.type === 'rocket' && !game.player.riding.landing, 30000);
    const lm = await E(() => ({ sky: game.sky.moon && game.sky.stars === 1, helmet: wearsSpaceHelmet(game.player), toast: el('toast').textContent, map: game.world.map }));
    check('the rocket lands on the Moon with you in it (black sky, stars and the Earth)', land && lm.sky && lm.map === 'moon' && /landed on the Moon/.test(lm.toast), lm);
    check('you get a space helmet to wear', lm.helmet);
    await E(() => { game.input.sneak = true; });
    await sleep(300);
    await E(() => { game.input.sneak = false; });
    check('Sneak gets out of the rocket', await E(() => !game.player.riding));
    await E(() => { game.view = 0; game.player.pitch = 0.35; game.player.yaw += 2.4; });
    await sleep(800);
    await shot('moon');
    // breathing: fine in the helmet; without it the air runs out
    await sleep(2000);
    check('with the space helmet on you can breathe', await E(() => game.player.air === 10));
    await E(() => { const pl = game.player; window.__h = pl.inv[ARMOR_INV]; pl.inv[ARMOR_INV] = null; pl.airT = 0; });
    check('without it, your air runs out on the Moon', await waitFor(() => game.player.air <= 8, 8000), await E(() => game.player.air));
    await E(() => { const pl = game.player; pl.inv[ARMOR_INV] = window.__h; });
    check('put it back on and you can breathe again', await waitFor(() => game.player.air === 10, 8000));
    // weak gravity: jumping goes high, falling doesn't hurt much
    const P0 = await E(() => { const pl = game.player, x = Math.floor(pl.x), z = Math.floor(pl.z), w = game.world; const y = w.topSolid(x, z) + 1; for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { w.setBlock(x + dx, y - 1, z + dz, B.MOON_ROCK, 0); for (let k = 0; k < 12; k++) w.setBlock(x + dx, y + k, z + dz, B.AIR, 0); } T.put(x + 0.5, y, z + 0.5); return { x, y, z }; });
    await sleep(400);
    await E(() => { window.__top = game.player.y; window.__y0 = game.player.y; game.input.jump = true; window.__jt = setInterval(() => { window.__top = Math.max(window.__top, game.player.y); }, 20); });
    await sleep(300);
    await E(() => { game.input.jump = false; });
    await sleep(2200);
    const jump = await E(() => { clearInterval(window.__jt); return Math.round((window.__top - window.__y0) * 10) / 10; });
    check('on the Moon you jump really high', jump > 3, jump);
    await E(P0 => { T.put(P0.x + 0.5, P0.y + 9, P0.z + 0.5); game.player.health = 20; }, P0);
    await waitFor(() => game.player.onGround, 8000);
    check('...and a long fall hardly hurts', await E(() => game.player.health >= 19), await E(() => game.player.health));
    // the Moon is made of cheese (some of it)
    const ch = await E(P0 => { const w = game.world; w.setBlock(P0.x + 2, P0.y, P0.z, B.MOON_CHEESE, 0); game.player.breakBlock(P0.x + 2, P0.y, P0.z, true); return T.ents('item').some(e => e.id === I.CHEESE); }, P0);
    check('moon cheese drops cheese you can eat', ch && await E(() => ITEMS[I.CHEESE].food > 0));
    // a flag
    const fz = await E(P0 => { T.clearMobs(); const r = T.ents('rocket')[0], away = r && r.z > P0.z + 0.5 ? -2 : 2; T.put(P0.x + 0.5, P0.y, P0.z + 0.5); T.hold(B.FLAG, 1); T.aim(P0.x + 0.5, P0.y - 0.5, P0.z + 0.5 + away); T.tap(); return P0.z + away; }, P0);
    check('put a flag up on the Moon', await waitFor(() => T.count(B.FLAG) === 0, 3000) && await E(a => game.world.getBlock(a.x, a.y, a.fz) === B.FLAG && Array.from(document.querySelectorAll('#chat-log div')).some(d => /flag on the Moon/.test(d.textContent)), { x: P0.x, y: P0.y, fz }),
      await E(() => ({ flags: T.count(B.FLAG), riding: !!game.player.riding })));
    await E(() => { game.player.pitch = -0.2; });
    await sleep(500);
    await shot('moon-flag');
    const po = await E(() => {   // (an obsidian frame, lit with flint and steel)
      const pl = game.player, w = game.world, x = Math.floor(pl.x) + 3, y = Math.floor(pl.y), z = Math.floor(pl.z), cells = [];
      for (let dx = 0; dx < 4; dx++) for (let dy = 0; dy < 5; dy++) { cells.push([x + dx, y + dy, z]); w.setBlock(x + dx, y + dy, z, dx === 0 || dx === 3 || dy === 0 || dy === 4 ? B.OBSIDIAN : B.AIR, 0); }
      const lit = !!lightPortalAt(game, x + 1, y + 1, z), portal = cells.filter(c => w.getBlock(c[0], c[1], c[2]) === B.NETHER_PORTAL).length;
      for (const c of cells) w.setBlock(c[0], c[1], c[2], B.AIR, 0);
      return { lit, portal };
    });
    check("a Nether portal won't light on the Moon (the rocket is the way home)", !po.lit && po.portal === 0, po);
    check('beds and /locate village say there are none of those on the Moon', await E(() => { game.trySleep(0, 0, 0); game.runCommand('/locate village'); const l = Array.from(document.querySelectorAll('#chat-log div')).map(d => d.textContent).join('|'); return /on the Moon/.test(l) && /no villages on the Moon/.test(l); }));
    check('nothing lives on the Moon', await E(() => { for (let i = 0; i < 30; i++) spawnTick(game); return !game.entities.some(e => e.mob && !e.removed); }));
    // saved there: the game comes back on the Moon
    await E(() => game.save());
    const sv = await E(() => { const d = JSON.parse(store.get(saveKey(game.slot))); return { dim: d.dim, moon: !!d.moon, world: !!d.world, ms: d.moonSpawn, pad: d.rocketPad, rockets: (d.moon.vehicles || []).filter(v => v.k === 'rocket').length }; });
    check('saved on the Moon, with the rocket there and the launch pad at home remembered', sv.dim === 'moon' && sv.moon && sv.world && sv.rockets === 1 && sv.pad && sv.pad.join() === (await E(() => window.__pad.join())), sv);
    // fly home: it lands back on the launch pad
    await E(() => { const r = T.ents('rocket')[0]; boardVehicle(game, r); rocketLaunch(game, game.player, r); });
    check('fly home in the rocket', await waitFor(() => game.dim === 'over' && game.state === 'playing', 150000), await E(() => ({ dim: game.dim, state: game.state })));
    await waitFor(() => game.player.riding && !game.player.riding.landing, 30000);
    const home = await E(() => { const r = T.ents('rocket')[0]; return { x: r && Math.floor(r.x), z: r && Math.floor(r.z), pad: window.__pad, sky: !game.sky.moon }; });
    check('...and it lands back where it took off', home.x === home.pad[0] && home.z === home.pad[1] && home.sky, home);
    await E(() => { game.input.sneak = true; });
    await sleep(300);
    await E(() => { game.input.sneak = false; for (const e of game.entities) if (e.vehicle) e.removed = true; game.view = 0; });
  }

  if (on('wand')) {
    // ---------- the magic wand ----------
    const W = area(40, 40);
    await goto(W);
    await E(W => { T.stage(W.x, W.y, W.z, 12, 10); T.clearMobs(); T.put(W.x + 0.5, W.y, W.z + 6.5, { yaw: 0, pitch: 0 }); game.setMode('survival'); game.player.health = 20; for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.world.time = 0.3; game.runCommand('/weather clear'); game.settings.difficulty = 2; }, W);
    await sleep(300);
    const it = await E(() => ({ name: itemName(I.WAND), icon: !!ICONS[I.WAND], creative: CREATIVE_LIST.includes(I.WAND), recipe: RECIPES.some(r => r.out === I.WAND), spells: SPELLS.map(s => s.name) }));
    check('there is a Magic Wand with six spells', it.name === 'Magic Wand' && it.icon && it.creative && it.recipe && it.spells.length === 6, it);
    await E(() => { T.hold(I.WAND, 1); });
    await sleep(400);
    const pick = await E(() => { const b = el('tb-spell'), shown = !b.hidden, first = b.textContent; nextSpell(game); const second = el('item-name').textContent; for (let i = 0; i < 5; i++) nextSpell(game); return { shown, first, second, back: game.player.spell }; });
    check('holding the wand shows the Spell button, and it picks the next spell', pick.shown && pick.first === 'Lumos' && pick.second === 'Wingardium Leviosa' && pick.back === 0, pick);
    // Lumos lights up around you; Nox puts it out; putting the wand away does too
    await E(() => { game.player.spell = 0; castSpell(game, game.player); });
    await sleep(300);
    check('Lumos lights up the dark around you', await E(() => game.player.lumos && game.sky.lumos === 1));
    await E(() => castSpell(game, game.player));
    await sleep(300);
    check('cast it again (Nox) and it goes out', await E(() => !game.player.lumos && !game.sky.lumos));
    await E(() => { castSpell(game, game.player); T.hold(B.STONE, 1); });
    await sleep(400);
    check('putting the wand away puts the light out', await E(() => !game.player.lumos));
    await E(() => T.hold(I.WAND, 1));
    // Stupefy: a zombie is stunned and stops
    const cast = async (key, mob, at) => {
      await E(a => { const pl = game.player; pl.spell = SPELLS.findIndex(s => s.key === a.key); T.aim(a.x, a.y, a.z); pl.useCd = 0; T.tap(); }, Object.assign({ key }, at));
      await sleep(900);
    };
    const z1 = await E(W => { game.mode = 'creative'; const z = spawnMob(game, 'zombie', W.x + 0.5, W.y, W.z - 2.5); window.__z = z; return { x: z.x, y: z.y + 1, z: z.z }; }, W);
    await cast('stupefy', 'zombie', z1);
    const st = await E(() => ({ frozen: window.__z.frozen > 0, stun: window.__z.stun > 0, hp: window.__z.hp }));
    check('Stupefy stuns a zombie (and doesn\'t hurt it)', st.frozen && st.stun && st.hp === 20, st);
    await E(() => { window.__z.frozen = 0; window.__z.stun = 0; });
    // Expelliarmus: blasts it backwards
    const z2 = await E(() => { const z = window.__z; z.x = game.player.x; z.z = game.player.z - 4; z.vx = z.vz = 0; window.__z0 = z.z; return { x: z.x, y: z.y + 1, z: z.z }; });
    await cast('expelliarmus', 'zombie', z2);
    check('Expelliarmus blasts a zombie backwards', await E(() => window.__z.z < window.__z0 - 2.5), await E(() => ({ z: window.__z.z, z0: window.__z0 })));
    await E(() => { window.__z.removed = true; });
    // Wingardium Leviosa: a pig floats up (and comes down again later)
    const pg = await E(W => { const p = spawnMob(game, 'pig', W.x + 0.5, W.y, W.z + 2.5); p.aiT = 99; window.__p = p; window.__py = p.y; return { x: p.x, y: p.y + 0.5, z: p.z }; }, W);
    await E(() => { const pl = game.player; pl.z = window.__p.z + 4; });
    await cast('leviosa', 'pig', pg);
    await sleep(1200);
    check('Wingardium Leviosa makes a pig float up in the air', await E(() => window.__p.y > window.__py + 1.8 && window.__p.floatT > 0), await E(() => ({ dy: window.__p.y - window.__py })));
    await shot('leviosa');
    check('...and it floats back down when the spell wears off', await waitFor(() => window.__p.y < window.__py + 0.2 && !(window.__p.floatT > 0), 12000));
    // ...and a block
    const bl = await E(W => { game.world.setBlock(W.x + 3, W.y, W.z + 2, B.OAK_PLANKS, 0); T.put(W.x + 3.5, W.y, W.z + 6.5); return { x: W.x + 3.5, y: W.y + 0.5, z: W.z + 2.5 }; }, W);
    await cast('leviosa', 'block', bl);
    check('Leviosa lifts a block up into the air', await E(() => T.ents('falling').some(e => e.id === B.OAK_PLANKS && e.floatT > 0)));
    check('...and puts it back down', await waitFor(W => game.world.getBlock(W.x + 3, W.y, W.z + 2) === B.OAK_PLANKS && !T.ents('falling').length, 15000, W));
    // Accio: a block (or a thing on the ground) flies to you
    await E(() => { game.setMode('survival'); });
    await cast('accio', 'block', bl);
    check('Accio brings a block to you (in Survival it lands in your bag)', await waitFor(() => T.count(B.OAK_PLANKS) === 1, 8000), await E(W => ({ block: game.world.getBlock(W.x + 3, W.y, W.z + 2), planks: T.count(B.OAK_PLANKS) }), W));
    const far = await E(W => { dropItem(game, W.x + 3.5, W.y + 0.2, W.z - 6.5, I.DIAMOND, 1); return { x: W.x + 3.5, y: W.y + 0.1, z: W.z - 6.5 }; }, W);
    await sleep(600);
    await cast('accio', 'item', far);
    check('Accio brings a diamond lying far away', await waitFor(() => T.count(I.DIAMOND) === 1, 8000));
    // Expecto Patronum: a silver stag chases the monsters off
    const zs = await E(W => { T.clearMobs(); game.mode = 'creative'; T.put(W.x + 0.5, W.y, W.z + 8.5); game.player.yaw = 0; game.player.pitch = 0; const out = []; for (let i = 0; i < 3; i++) { const z = spawnMob(game, 'zombie', W.x - 1.5 + i * 1.5, W.y, W.z + 1.5); out.push(z.nid); } window.__zs = out; return out; }, W);
    await E(() => { const pl = game.player; pl.spell = SPELL_PATRONUS; pl.useCd = 0; pl.patronusT = 0; T.tap(); });
    check('Expecto Patronum: a silver stag appears', await waitFor(() => T.ents('patronus').length === 1, 3000));
    await sleep(700);
    await shot('patronus');
    const fled = await waitFor(() => window.__zs.every(n => { const z = game.entities.find(e => e.nid === n); return !z || z.fleeT > 0; }), 6000);
    check('...and it chases the zombies away', fled, await E(() => window.__zs.map(n => { const z = game.entities.find(e => e.nid === n); return z ? Math.round(z.fleeT * 10) / 10 : 'gone'; })));
    check('the stag fades away after a while', await waitFor(() => T.ents('patronus').length === 0, 12000));
    check('casting it again straight away has to wait', await E(() => { const pl = game.player; pl.useCd = 0; pl.patronusT = game.t + 5; castSpell(game, pl); return /still out there/.test(el('toast').textContent); }));
    await E(() => { T.clearMobs(); game.setMode('survival'); });
  }

  if (on('plans')) {
    // ---------- books of building plans ----------
    const Q = area(-40, 40);
    await goto(Q);
    await E(Q => { T.stage(Q.x, Q.y, Q.z, 14, 16); T.clearMobs(); T.put(Q.x + 0.5, Q.y, Q.z + 6.5, { yaw: 0, pitch: 0 }); game.setMode('survival'); game.player.health = 20; for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.world.time = 0.3; game.runCommand('/weather clear'); setPlan(null); game.stats.plans = 0; }, Q);
    await sleep(300);
    const it = await E(() => ({ name: itemName(I.PLAN_BOOK), icon: !!ICONS[I.PLAN_BOOK], creative: CREATIVE_LIST.includes(I.PLAN_BOOK), recipe: RECIPES.some(r => r.out === I.PLAN_BOOK), plans: PLANS.length }));
    check('there is a Book of Building Plans with ten plans in it', it.name === 'Book of Building Plans' && it.icon && it.creative && it.recipe && it.plans === 10, it);
    await E(() => { T.hold(I.PLAN_BOOK, 1); PLANUI.page = 0; T.tap(); });
    check('tap with the book: it opens', await waitFor(() => ui.screen === 'scr-plans', 3000));
    const pg = await E(() => { const a = { name: el('plan-name').textContent, num: el('plan-num').textContent, prevOff: el('btn-plan-prev').disabled, allHidden: el('btn-plan-all').hidden, stopHidden: el('btn-plan-stop').hidden, needs: el('plan-needs').textContent };
      el('btn-plan-next').click(); a.next = el('plan-name').textContent + ' / ' + el('plan-num').textContent; el('btn-plan-prev').click(); a.back = el('plan-name').textContent;
      const c = el('plan-pic'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; a.picture = n; return a; });
    check('each page has the plan\'s name, a picture and what you need', pg.name === 'Snowman' && pg.num === 'Plan 1 of 10' && /2 Snow Block|2 Snow/.test(pg.needs) && /Pumpkin/.test(pg.needs) && pg.picture > 500 && pg.prevOff, pg);
    check('Next and Back turn the pages', pg.next === 'Pixel Heart / Plan 2 of 10' && pg.back === 'Snowman', pg);
    check('Build it all now is only there in Creative', pg.allHidden && pg.stopHidden, pg);
    await shot('plans-book');
    // build it here: an outline appears in front of you
    await E(() => el('btn-plan-build').click());
    await sleep(800);
    const pl0 = await E(Q => ({ screen: ui.screen, cur: PLAN.cur, list: PLAN.list.map(b => b.slice(0, 4)), hud: el('plan-hud').hidden ? null : el('plan-hud').textContent, at: [Math.floor(game.player.x), Math.floor(game.player.z)] }), Q);
    check('Build it here: the book closes and the outline is put down just in front of you', pl0.screen === null && pl0.cur && pl0.cur.key === 'snowman' && pl0.list.length === 3 && pl0.list.every(b => b[0] === pl0.at[0] && b[2] === pl0.at[1] - 3), pl0);
    check('the count at the top says how many blocks are done', pl0.hud === 'Snowman: 0 of 3 blocks', pl0.hud);
    await E(() => { const pl = game.player; pl.z += 3; pl.x += 2; pl.yaw = 0.6; pl.pitch = -0.15; });
    await sleep(500);
    await shot('plans-outline');
    // put the blocks in (a wrong one shows red)
    await E(() => { const pl = game.player, b = PLAN.list; T.hold(B.SNOW, 2); T.put(b[0][0] + 0.5, b[0][1], b[0][2] + 3.5); T.aim(b[0][0] + 0.5, b[0][1] - 0.01, b[0][2] + 0.5); pl.useCd = 0; T.tap(); });
    await sleep(400);
    await E(() => { const pl = game.player, b = PLAN.list; T.aim(b[0][0] + 0.5, b[0][1] + 0.99, b[0][2] + 0.5); pl.useCd = 0; T.tap(); });
    await sleep(400);
    await E(() => { const pl = game.player, b = PLAN.list; T.hold(B.DIRT, 1); T.put(b[0][0] + 0.5, b[0][1] + 2, b[0][2] + 3.5, { flying: true }); T.aim(b[1][0] + 0.5, b[1][1] + 0.99, b[1][2] + 0.5); pl.useCd = 0; T.tap(); });
    await sleep(900);
    const pr = await E(() => ({ hud: el('plan-hud').textContent, blocks: PLAN.list.map(b => game.world.getBlock(b[0], b[1], b[2])), bad: PLAN.list.map(b => !!b.bad) }));
    check('placing blocks in the outline counts them, and a wrong one is shown in red', pr.hud === 'Snowman: 2 of 3 blocks (1 in red to break)' && pr.bad[2] && !pr.bad[0], pr);
    await E(() => { game.player.yaw = 0.6; game.player.pitch = -0.1; game.player.x += 2; });
    await sleep(400);
    await shot('plans-wrong');
    // the plan is kept with the world
    await E(() => game.save());
    const sv = await E(() => { const d = JSON.parse(store.get(saveKey(game.slot))); return d.plan; });
    check('the plan you are building is saved with the world', sv && sv.key === 'snowman' && sv.dim === 'over', sv);
    await E(() => { setPlan(null); const d = JSON.parse(store.get(saveKey(game.slot))); game.startWorld(game.slot, d.mode || 'survival', false); });
    await waitFor(() => game.state === 'playing', 90000);
    await sleep(800);
    const back = await E(() => ({ cur: PLAN.cur, hud: el('plan-hud').hidden ? null : el('plan-hud').textContent }));
    check('...and it is still there when you come back to the world', back.cur && back.cur.key === 'snowman' && back.hud === 'Snowman: 2 of 3 blocks (1 in red to break)', back);
    // break the wrong one and finish it: a celebration
    await E(() => { const b = PLAN.list[2]; game.world.setBlock(b[0], b[1], b[2], B.PUMPKIN, 0, true); });
    check('finish it: You built it!', await waitFor(() => !PLAN.cur && el('big-text').textContent === 'You built it!' && game.stats.plans === 1 && el('plan-hud').hidden, 3000),
      await E(() => ({ cur: PLAN.cur, big: el('big-text').textContent, plans: game.stats.plans })));
    check('...and everyone is told', await E(() => Array.from(document.querySelectorAll('#chat-log div')).some(d => / built the Snowman!/.test(d.textContent))));
    // Creative: build it all at once
    await goto(Q);
    await E(Q => { T.stage(Q.x, Q.y, Q.z, 14, 16); T.clearMobs(); game.setMode('creative'); T.put(Q.x + 0.5, Q.y, Q.z + 10.5, { yaw: 0, pitch: 0 }); T.hold(I.PLAN_BOOK, 1); PLANUI.page = PLANS.findIndex(p => p.key === 'house'); openPlans(); }, Q);
    const cr = await E(() => ({ all: !el('btn-plan-all').hidden, name: el('plan-name').textContent }));
    check('in Creative there is a Build it all now button', cr.all && cr.name === 'Cozy House', cr);
    await E(() => el('btn-plan-all').click());
    check('Build it all now builds the whole thing at once', await waitFor(() => game.stats.plans === 2 && !PLAN.cur, 4000), await E(() => ({ plans: game.stats.plans, cur: PLAN.cur })));
    const house = await E(Q => { let n = 0; for (const b of planAt({ key: 'house', x: Q.x, y: Q.y, z: Q.z + 8, rot: 0 })) if (game.world.getBlock(b[0], b[1], b[2]) === b[3]) n++; return { n, of: PLANS.find(p => p.key === 'house').blocks.length }; }, Q);
    check('...a whole Cozy House', house.n === house.of, house);
    await E(() => { const pl = game.player; pl.x += 6; pl.z += 4; pl.y += 4; pl.flying = true; pl.yaw = 0.5; pl.pitch = -0.3; });
    await sleep(900);
    await shot('plans-house');
    // facing another way: it is turned to match
    await E(Q => { T.stage(Q.x, Q.y, Q.z, 14, 16); T.put(Q.x + 0.5, Q.y, Q.z + 0.5, { yaw: Math.PI / 2, pitch: 0 }); PLANUI.page = PLANS.findIndex(p => p.key === 'bridge'); openPlans(); el('btn-plan-build').click(); }, Q);
    const tr = await E(Q => { const xs = PLAN.list.map(b => b[0]), zs = PLAN.list.map(b => b[2]); return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), px: Q.x }; }, Q);
    check('facing another way, the plan is turned to match (the bridge goes the way you face)', tr.maxX === tr.px - 2 && tr.minX === tr.px - 14 && tr.maxZ - tr.minZ === 4, tr);
    await E(() => { openPlans(); });
    check('Put plan away is there while you are building one', await E(() => !el('btn-plan-stop').hidden));
    await E(() => el('btn-plan-stop').click());
    check('...and it takes the outline away', await E(() => !PLAN.cur && el('plan-hud').hidden && ui.screen === null));
    await E(() => { game.setMode('survival'); game.player.flying = false; });
  }

  if (on('cameras')) {
    // ---------- security cameras and monitors ----------
    const K = area(-40, -40);
    await goto(K);
    await E(K => { T.stage(K.x, K.y, K.z, 14, 10); T.clearMobs(); game.setMode('survival'); game.player.health = 20; for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.world.time = 0.3; game.runCommand('/weather clear');
      const w = game.world; for (let dx = -3; dx <= 3; dx++) for (let k = 0; k < 4; k++) w.setBlock(K.x + dx, K.y + k, K.z - 8, B.STONE_BRICKS, 0); }, K);
    await sleep(300);
    const it = await E(() => ({ cam: itemName(B.CAMERA), mon: itemName(B.MONITOR), icons: !!ICONS[B.CAMERA] && !!ICONS[B.MONITOR], creative: CREATIVE_LIST.includes(B.CAMERA) && CREATIVE_LIST.includes(B.MONITOR), recipes: RECIPES.some(r => r.out === B.CAMERA) && RECIPES.some(r => r.out === B.MONITOR) }));
    check('there are Security Cameras and Camera Monitors', it.cam === 'Security Camera' && it.mon === 'Camera Monitor' && it.icons && it.creative && it.recipes, it);
    // put a camera up on the wall: it looks out from the wall
    await E(K => { T.hold(B.CAMERA, 2); T.put(K.x + 0.5, K.y, K.z - 4.5); T.aim(K.x + 0.5, K.y + 2.5, K.z - 7 + 0.01); game.player.useCd = 0; T.tap(); }, K);
    await sleep(400);
    const wc = await E(K => { const w = game.world; return { id: w.getBlock(K.x, K.y + 2, K.z - 7) === B.CAMERA, d: w.getData(K.x, K.y + 2, K.z - 7), left: T.count(B.CAMERA) }; }, K);
    check('put a camera on a wall: it looks out from the wall', wc.id && wc.d >= 16 && FRONT_FACE_OF(wc.d) === 4 && wc.left === 1, wc);
    // ...and one standing on a block, looking back at you
    await E(K => { const w = game.world; w.setBlock(K.x + 5, K.y, K.z - 2, B.STONE_BRICKS, 0); T.put(K.x + 5.5, K.y, K.z + 2.5, { yaw: 0 }); T.aim(K.x + 5.5, K.y + 0.99, K.z - 1.5); game.player.useCd = 0; T.tap(); }, K);
    await sleep(400);
    const sc = await E(K => { const w = game.world; return { id: w.getBlock(K.x + 5, K.y + 1, K.z - 2) === B.CAMERA, d: w.getData(K.x + 5, K.y + 1, K.z - 2) }; }, K);
    check('...or on top of a block, looking back at you', sc.id && sc.d < 16 && (sc.d === 0 || sc.d === 15 || sc.d === 1), sc);
    // a monitor shows what the nearest camera sees
    await E(K => { T.hold(B.MONITOR, 1); T.put(K.x + 0.5, K.y, K.z + 3.5, { yaw: 0, pitch: 0 }); T.aim(K.x + 0.5, K.y - 0.01, K.z + 0.5); game.player.useCd = 0; T.tap(); }, K);
    await sleep(300);
    await E(K => { T.put(K.x + 0.5, K.y, K.z + 2.2); T.aim(K.x + 0.5, K.y + 0.55, K.z + 0.5); spawnMob(game, 'pig', K.x + 0.5, K.y, K.z - 4.5).aiT = 99; }, K);
    await E(K => { window.__camKey = n => { const c = camerasNear(game.world, K.x, K.y, K.z, true)[n]; return c && camKey(game.world, c); }; }, K);
    const camShown = n => waitFor(n => { const k = window.__camKey(n), e = k && CAMS.done.get(k); return !!e && DYN.map.get(k) === e.dyn; }, 5000, n);
    const shown = await camShown(0);
    const pic = await E(K => {
      const en = DYN.map.get(window.__camKey(0));
      if (!en) return null;
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, DYN.tex, 0, en.i);
      const px = new Uint8Array(128 * TV_H * 4); gl.readPixels(0, 0, 128, TV_H, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
      const avg = (r0, r1) => { const a = [0, 0, 0]; for (let y = r0; y < r1; y++) for (let x = 0; x < 128; x++) for (let c = 0; c < 3; c++) a[c] += px[(y * 128 + x) * 4 + c]; return a.map(v => Math.round(v / ((r1 - r0) * 128))); };
      return { ground: avg(0, 25), sky: avg(TV_H - 12, TV_H), data: game.world.getData(K.x, K.y, K.z) };
    }, K);
    check('the monitor shows what the camera sees (the stone floor below, blue sky above)', shown && pic && Math.abs(pic.ground[0] - pic.ground[2]) < 30 && pic.ground[2] < pic.sky[2] - 60 && pic.sky[2] > pic.sky[0] + 60, pic);
    await sleep(600);
    await shot('cameras-monitor');
    // tap it: the next camera
    await E(K => { T.hold(null); T.aim(K.x + 0.5, K.y + 0.55, K.z + 1); game.player.useCd = 0; T.tap(); }, K);
    await sleep(400);
    const sw = await E(K => ({ data: game.world.getData(K.x, K.y, K.z), toast: el('toast').textContent }), K);
    check('tap the monitor: it switches to the next camera', (sw.data >> 2) === 1 && /Camera 2 of 2/.test(sw.toast), sw);
    check('...and shows that one', await camShown(1));
    await sleep(600);
    await shot('cameras-monitor2');
    // a camera on a wall falls off if the wall goes
    await E(K => { game.world.setBlock(K.x, K.y + 2, K.z - 8, B.AIR, 0, true); }, K);
    check('take the wall away and the camera falls off', await waitFor(K => game.world.getBlock(K.x, K.y + 2, K.z - 7) !== B.CAMERA && T.ents('item').some(e => e.id === B.CAMERA), 3000, K));
    await E(K => { game.world.setBlock(K.x + 5, K.y + 1, K.z - 2, B.AIR, 0, true); T.clearMobs(); }, K);
    await sleep(1200);
    await E(K => { T.aim(K.x + 0.5, K.y + 0.55, K.z + 1); game.player.useCd = 0; T.tap(); }, K);
    await sleep(300);
    check('with no cameras left, tapping the monitor says to put one up', await E(() => /no security cameras/.test(el('toast').textContent)));
    await sleep(600);
    await shot('cameras-none');
    check('drawing camera pictures never got stuck', await E(() => !CAMS.broken && !CAMS.pass));
  }

  if (on('dungeons')) {
    // ---------- dungeons ----------
    const it = await E(() => ({ spawner: itemName(B.SPAWNER), bars: itemName(B.IRON_BARS), cracked: itemName(B.CRACKED_BRICKS), recipe: RECIPES.some(r => r.out === B.IRON_BARS), smelt: SMELT[B.STONE_BRICKS] === B.CRACKED_BRICKS }));
    check('there are monster spawners, iron bars and cracked stone bricks', it.spawner === 'Monster Spawner' && it.bars === 'Iron Bars' && it.cracked === 'Cracked Stone Bricks' && it.recipe && it.smelt, it);
    // every kind of dungeon is somewhere near
    const DG = await E(() => {
      const pl = game.player, out = {}, all = new Set();
      for (let r = 0; r < 9; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
        if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
        for (const d of game.gen.dungeonsNear('valley', game.seed, pl.x + a * 80, pl.z + b * 80)) { all.add(d.id); if (!out[d.kind] || Math.hypot(d.x - pl.x, d.z - pl.z) < Math.hypot(out[d.kind].x - pl.x, out[d.kind].z - pl.z)) out[d.kind] = d; }
      }
      window.__dg = out;
      return { kinds: Object.keys(out).sort(), n: all.size, out };
    });
    check('there are dungeons of all four kinds: Monster Rooms, Mazes, Treasure Vaults and Lava Temples', DG.kinds.join() === 'maze,monster,temple,vault' && DG.n > 20, { kinds: DG.kinds, n: DG.n });
    const visit = async d => {
      await goto({ x: d.S[0], y: d.g + 6, z: d.S[1] });
      await waitFor(d => game.world.readyAround(d.x + 0.5, d.z + 0.5, 1) >= 1, 60000, d);
      await sleep(300);
    };
    const geo = d => E(d => {
      const w = game.world, at2 = (u, v) => [d.E[0] + d.D[0] * u - d.D[1] * v, d.E[1] + d.D[1] * u + d.D[0] * v], S = d.S, g = d.g;
      const RING = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]], K = g - d.y + 1, eIdx = RING.findIndex(q => q[0] === d.D[0] && q[1] === d.D[1]), o = (((eIdx - K) % 8) + 8) % 8;
      let steps = 0, room = 0;
      for (let k = 0; k < K; k++) { const [a, b] = RING[(o + k) % 8]; if (SOLID[w.getBlock(S[0] + a, g - k, S[1] + b)] && !SOLID[w.getBlock(S[0] + a, g - k + 1, S[1] + b)] && !SOLID[w.getBlock(S[0] + a, g - k + 2, S[1] + b)]) steps++; }
      const find = (id, y0, y1) => { const out = []; for (let u = 0; u <= 18; u++) for (let v = -9; v <= 9; v++) { const [x, z] = at2(u, v); for (let yy = y0; yy <= y1; yy++) if (w.getBlock(x, yy, z) === id) out.push([x, yy, z, w.getData(x, yy, z)]); } return out; };
      return { tower: w.getBlock(S[0], g + 5, S[1]) === B.TORCH && w.getBlock(S[0] + 2, g + 5, S[1] + 2) !== B.AIR, steps, K,
        spawners: find(B.SPAWNER, d.y, d.y + 1), chests: find(B.CHEST, d.y, d.y + 2), lava: find(B.LAVA, d.y - 1, d.y - 1).length, bars: find(B.IRON_BARS, d.y, d.y + 3).length };
    }, d);
    // a Monster Room: the tower, the stairs all the way down, a spawner and two chests
    const M = DG.out.monster;
    await visit(M);
    const mg = await geo(M);
    check('a dungeon has a little stone tower on top, with a torch', mg.tower, mg);
    check('...and stairs inside winding all the way down to it', mg.steps === mg.K && mg.K >= 13, { steps: mg.steps, K: mg.K });
    check('a Monster Room has a zombie spawner and two treasure chests', mg.spawners.length === 1 && mg.spawners[0][3] === 0 && mg.chests.length === 2 && mg.chests.every(c => (c[3] & 8) && (c[3] >> 4) === 1), { spawners: mg.spawners, chests: mg.chests });
    // get down there: you're told what you found
    await E(d => { T.put(d.E[0] + 0.5 + d.D[0] * 2, d.y, d.E[1] + 0.5 + d.D[1] * 2, { flying: true }); game.setMode('survival'); game.player.flying = false; game.player.health = 20; game.settings.difficulty = 2; T.clearMobs(); }, M);
    check('get down into it and you are told what you found', await waitFor(() => Array.from(document.querySelectorAll('#chat-log div')).some(d => /You found a Monster Room/.test(d.textContent)), 4000));
    // the spawner makes zombies while you are near (not more than a few)
    const zs = await waitFor(() => game.entities.filter(e => e.mob && !e.dead && e.fromSpawner && e.type === 'zombie').length >= 1, 25000);
    check('the spawner makes zombies while you are near', zs, await E(() => game.entities.filter(e => e.mob && e.fromSpawner).length));
    await E(() => { game.player.health = 20; game.player.invuln = 999; });
    await shot('dungeon-monster');
    // a chest's treasure
    const loot = await E(c => { const t = game.world.getTile(c[0], c[1], c[2], 'chest'); return { n: t.slots.filter(Boolean).length, iron: t.slots.some(s => s && s.id === I.IRON_INGOT), data: game.world.getData(c[0], c[1], c[2]) }; }, mg.chests[0]);
    check('its chests are full of treasure (filled when first opened)', loot.n >= 4 && loot.iron && loot.data < 8, loot);
    // break the spawner: experience, and no more zombies
    await E(s => { T.clearMobs(); const pl = game.player; T.hold(toolId(2, 0), 1); pl.breakBlock(s[0], s[1], s[2], true); }, mg.spawners[0]);
    await sleep(500);
    check('break the spawner: experience, and it\'s gone', await E(s => game.world.getBlock(s[0], s[1], s[2]) === B.AIR && T.ents('xp').length > 0, mg.spawners[0]));
    await sleep(15000);
    check('...and no more zombies come', await E(() => !game.entities.some(e => e.mob && !e.dead && e.fromSpawner)));
    await E(() => { game.player.invuln = 0; });
    // a Maze: there is a way through to the treasure in the middle
    const Z = DG.out.maze;
    await visit(Z);
    const zg = await geo(Z);
    const path = await E(d => {
      const w = game.world, at2 = (u, v) => [d.E[0] + d.D[0] * u - d.D[1] * v, d.E[1] + d.D[1] * u + d.D[0] * v], key = (x, z) => x + ',' + z;
      const free = (x, z) => !SOLID[w.getBlock(x, d.y, z)] && !SOLID[w.getBlock(x, d.y + 1, z)];
      const [sx, sz] = at2(-1, 0), goal = at2(8, 0), seen = new Set([key(sx, sz)]), q = [[sx, sz, 0]];
      while (q.length) { const [x, z, n] = q.shift(); if (x === goal[0] && z === goal[1]) return n; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, nz = z + b; if (!seen.has(key(nx, nz)) && free(nx, nz) && Math.abs(nx - d.x) < 14 && Math.abs(nz - d.z) < 14) { seen.add(key(nx, nz)); q.push([nx, nz, n + 1]); } } }
      return -1;
    }, Z);
    check('a Maze has a way through it to the treasure in the middle', path > 8 && zg.chests.length === 1 && (zg.chests[0][3] >> 4) === 2 && zg.spawners.length === 1, { path, chests: zg.chests, spawners: zg.spawners.length });
    // a Treasure Vault: iron bars, a guard, and three chests of the best treasure
    const V = DG.out.vault;
    await visit(V);
    const vg = await geo(V);
    check('a Treasure Vault has iron bars, a spawner on guard, and three chests of the best treasure', vg.bars >= 20 && vg.spawners.length === 1 && vg.chests.length === 3 && vg.chests.every(c => (c[3] >> 4) === 3), { bars: vg.bars, spawners: vg.spawners.length, chests: vg.chests });
    const best = await E(c => { const t = game.world.getTile(c[0], c[1], c[2], 'chest'); return t.slots.filter(s => s && s.id === I.DIAMOND).reduce((n, s) => n + s.count, 0); }, vg.chests[0]);
    check('...with diamonds in', best >= 3, best);
    // a Lava Temple: a moat of lava, the treasure on an island, and a spawner of magma cubes
    const L = DG.out.temple;
    await visit(L);
    const lg = await geo(L);
    check('a Lava Temple has a lava moat round an island with treasure and a magma cube spawner', lg.lava >= 40 && lg.spawners.length === 1 && lg.spawners[0][3] === 1 && lg.chests.length === 2, { lava: lg.lava, spawners: lg.spawners, chests: lg.chests.length });
    await E(d => { T.put(d.E[0] + 0.5 + d.D[0] * 1, d.y + 0.5, d.E[1] + 0.5 + d.D[1] * 1, { flying: true, yaw: Math.atan2(-d.D[0], -d.D[1]), pitch: -0.2 }); game.setMode('creative'); }, L);
    await sleep(1500);
    await shot('dungeon-temple');
    // /locate dungeon
    await E(() => game.runCommand('/locate dungeon'));
    check('/locate dungeon says where the nearest one is', await E(() => Array.from(document.querySelectorAll('#chat-log div')).some(d => /The nearest dungeon \(a .+\) is \d+ blocks/.test(d.textContent))));
    // Peaceful: spawners make nothing
    await visit(M);
    await E(d => { game.setMode('survival'); game.settings.difficulty = 0; T.put(d.E[0] + 0.5 + d.D[0] * 2, d.y, d.E[1] + 0.5 + d.D[1] * 2); game.world.setBlock(d.x, d.y, d.z, B.SPAWNER, 0, true); T.clearMobs(); }, M);
    await sleep(9000);
    check('on Peaceful, spawners make nothing', await E(() => !game.entities.some(e => e.mob && !e.dead && e.fromSpawner)));
    await E(() => { game.settings.difficulty = 2; game.setMode('survival'); });
    // a world saved before there were dungeons: none where anything was built
    const old = await E(d => {
      game.save();
      const k = saveKey(game.slot), data = JSON.parse(store.get(k));
      delete data.dungeons;
      const cx = Math.floor(d.S[0] / 16), cz = Math.floor(d.S[1] / 16);
      data.world.edits = data.world.edits || {};
      data.world.edits[cx + ',' + cz] = data.world.edits[cx + ',' + cz] || [];
      store.set(k, JSON.stringify(data));
      return { id: d.id, cx, cz };
    }, M);
    await E(() => { game.startWorld(game.slot, null, false); });
    await waitFor(() => game.state === 'playing', 90000);
    const blk = await E(o => ({ blocked: game.overVB.includes(o.id), others: game.overVB.filter(id => id[0] === 'd').length }), old);
    check('a world from before there were dungeons keeps them out of what was already built', blk.blocked, blk);
    await visit(M);
    check('...so that one isn\'t there (no tower)', await E(d => game.world.getBlock(d.S[0], d.g + 5, d.S[1]) !== B.TORCH && game.world.getBlock(d.S[0] + 2, d.g + 5, d.S[1] + 2) === B.AIR, M));
    await E(() => game.save());
    check('...and it is remembered', await E(o => { const d = JSON.parse(store.get(saveKey(game.slot))); return d.dungeons === 1 && d.villages.blocked.includes(o.id); }, old));
  }

  if (on('robots')) {
    // ---------- robots ----------
    const Rb = area(40, -40);
    await goto(Rb);
    await E(Rb => { T.stage(Rb.x, Rb.y, Rb.z, 16, 8); T.clearMobs(); for (const e of game.entities) if (e.type === 'robot') e.removed = true; T.put(Rb.x + 0.5, Rb.y, Rb.z + 0.5, { yaw: 0, pitch: 0 }); game.setMode('survival'); game.player.health = 20; for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.world.time = 0.3; game.runCommand('/weather clear'); game.settings.difficulty = 2; }, Rb);
    await sleep(300);
    const it = await E(() => ({ name: itemName(I.ROBOT), icon: !!ICONS[I.ROBOT], creative: CREATIVE_LIST.includes(I.ROBOT), recipe: RECIPES.some(r => r.out === I.ROBOT) }));
    check('there is a Robot', it.name === 'Robot' && it.icon && it.creative && it.recipe, it);
    // let it out: it says hello and follows you
    await E(Rb => { T.hold(I.ROBOT, 1, { tag: { robot: 2 } }); T.aim(Rb.x + 0.5, Rb.y - 0.01, Rb.z - 2.5); game.player.useCd = 0; T.tap(); }, Rb);
    check('tap the ground with a robot: out it comes (a blue one, as it was)', await waitFor(() => T.ents('robot').length === 1, 3000) && await E(() => { const r = T.ents('robot')[0]; return r.owner === PROFILE.pid && r.mode === 'follow' && r.variant === 2 && T.count(I.ROBOT) === 0 && /Beep boop/.test(el('toast').textContent); }),
      await E(() => { const r = T.ents('robot')[0]; return r && { owner: r.owner === PROFILE.pid, mode: r.mode, c: r.variant, left: T.count(I.ROBOT) }; }));
    await E(Rb => { T.put(Rb.x + 0.5, Rb.y, Rb.z + 12.5); }, Rb);
    check('it follows you', await waitFor(() => { const r = T.ents('robot')[0], pl = game.player; return Math.hypot(r.x - pl.x, r.z - pl.z) < 4.5; }, 8000), await E(() => { const r = T.ents('robot')[0], pl = game.player; return Math.round(Math.hypot(r.x - pl.x, r.z - pl.z) * 10) / 10; }));
    await sleep(400);
    await shot('robot-follow');
    await E(Rb => { T.put(Rb.x + 40.5, Rb.y + 3, Rb.z + 0.5, { flying: true }); }, Rb);
    await waitFor(Rb => game.world.readyAround(Rb.x + 40.5, Rb.z + 0.5, 1) >= 1, 30000, Rb);
    await E(Rb => { const w = game.world; for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { w.setBlock(Rb.x + 40 + dx, Rb.y - 1, Rb.z + dz, B.STONE, 0); for (let k = 0; k < 4; k++) w.setBlock(Rb.x + 40 + dx, Rb.y + k, Rb.z + dz, B.AIR, 0); } T.put(Rb.x + 40.5, Rb.y, Rb.z + 0.5); }, Rb);
    check('left far behind, it zips over to you', await waitFor(() => { const r = T.ents('robot')[0], pl = game.player; return Math.hypot(r.x - pl.x, r.z - pl.z) < 4; }, 5000));
    await E(Rb => { T.put(Rb.x + 0.5, Rb.y, Rb.z + 0.5); const r = T.ents('robot')[0]; r.x = Rb.x + 0.5; r.z = Rb.z - 1.5; r.y = Rb.y; }, Rb);
    // tap it: guard. It zaps a zombie
    await E(() => { const r = T.ents('robot')[0]; T.hold(null); T.aim(r.x, r.y + 0.7, r.z); game.player.useCd = 0; T.tap(); });
    await sleep(300);
    check('tap it: it guards you', await E(() => T.ents('robot')[0].mode === 'guard' && /Guarding you/.test(el('toast').textContent)));
    await E(Rb => { game.player.invuln = 999; const z = spawnMob(game, 'zombie', Rb.x + 0.5, Rb.y, Rb.z - 7.5); window.__z = z; z.hp = 20; }, Rb);
    check('...and zaps a zombie that comes near', await waitFor(() => window.__z.hp < 20 || window.__z.dead || window.__z.removed, 8000), await E(() => ({ hp: window.__z.hp })));
    await sleep(300);
    await shot('robot-zap');
    check('...again and again till it is gone', await waitFor(() => window.__z.dead || window.__z.removed, 15000), await E(() => ({ hp: window.__z.hp })));
    await E(() => { for (const e of game.entities) if (e.mob && e.type !== 'robot') e.removed = true; game.player.invuln = 0; });
    // collect: it picks things up and puts them in your bag
    await E(() => { const r = T.ents('robot')[0]; T.aim(r.x, r.y + 0.7, r.z); game.player.useCd = 0; T.tap(); });
    await sleep(300);
    check('tap it again: it collects things', await E(() => T.ents('robot')[0].mode === 'collect'));
    await E(Rb => { dropItem(game, Rb.x + 6.5, Rb.y + 0.2, Rb.z - 4.5, I.DIAMOND, 2); dropItem(game, Rb.x - 5.5, Rb.y + 0.2, Rb.z - 3.5, B.COBBLE, 5); }, Rb);
    check('...it fetches things lying about into your bag', await waitFor(() => T.count(I.DIAMOND) === 2 && T.count(B.COBBLE) === 5, 15000), await E(() => ({ d: T.count(I.DIAMOND), c: T.count(B.COBBLE) })));
    // stay
    await E(() => { const r = T.ents('robot')[0]; r.mode = r.mode; T.put(r.x, r.y, r.z + 2.5); T.aim(r.x, r.y + 0.7, r.z); game.player.useCd = 0; T.tap(); });
    await sleep(300);
    const at = await E(() => { const r = T.ents('robot')[0]; return { mode: r.mode, x: r.x, z: r.z }; });
    await E(Rb => { T.put(Rb.x + 0.5, Rb.y, Rb.z + 12.5); }, Rb);
    await sleep(3000);
    check('...and again: it stays where it is', at.mode === 'stay' && await E(a => { const r = T.ents('robot')[0]; return Math.hypot(r.x - a.x, r.z - a.z) < 0.5; }, at));
    // kept with the world
    await E(() => game.save());
    const sv = await E(() => JSON.parse(store.get(saveKey(game.slot))).world.robots);
    check('robots are saved with the world', Array.isArray(sv) && sv.length === 1 && sv[0].m === 'stay' && sv[0].c === 2 && sv[0].o === (await E(() => PROFILE.pid)), sv);
    // hit it: back in your bag, still blue
    await E(() => { const r = T.ents('robot')[0]; T.put(r.x, r.y, r.z + 2.5); T.aim(r.x, r.y + 0.7, r.z); });
    await E(() => { const r = T.ents('robot')[0]; hurtMob(game, r, 1, game.player.x, game.player.z, 'player'); });
    await sleep(300);
    const back = await E(() => { const s = game.player.inv.find(q => q && q.id === I.ROBOT); return { gone: T.ents('robot').length === 0, tag: s && s.tag }; });
    check('hit it: it goes back in your bag (and stays blue)', back.gone && back.tag && back.tag.robot === 2, back);
    // nothing hurts a robot
    await E(Rb => { T.hold(I.ROBOT, 1, { tag: { robot: 3 } }); T.put(Rb.x + 0.5, Rb.y, Rb.z + 0.5); T.aim(Rb.x + 0.5, Rb.y - 0.01, Rb.z - 2.5); game.player.useCd = 0; T.tap(); }, Rb);
    await waitFor(() => T.ents('robot').length === 1, 3000);
    check('a robot that belongs to someone who plays here with you stays theirs', await E(() => {
      MP.guestSaves = Object.assign({}, MP.guestSaves, { cora123: { x: 0 } });
      const e = makeRobot(game, game.player.x + 2, game.player.y, game.player.z, 'cora123', 1, 'stay', 0), mine = robotMine(e);
      e.removed = true; delete MP.guestSaves.cora123;
      return !mine && e.owner === 'cora123';
    }));
    check('nothing hurts a robot (not even an explosion)', await E(() => { const r = T.ents('robot')[0]; explode(game, r.x + 1, r.y + 0.5, r.z, 3); hurtMob(game, r, 50, r.x, r.z, 'zombie'); return !r.removed && !r.dead && r.hp === 100; }));
    await E(() => { const r = T.ents('robot')[0]; r.y = -25; r.vy = 0; });
    check('a robot that falls out of the world comes back to you', await waitFor(() => { const r = T.ents('robot')[0], pl = game.player; return r && r.y > 0 && Math.hypot(r.x - pl.x, r.z - pl.z) < 4; }, 4000), await E(() => T.ents('robot').map(r => [r.x, r.y, r.z])));
    // it comes with you in the rocket, to the Moon and back
    await E(Rb => { for (const e of game.entities) if ((e.mob && e.type !== 'robot') || e.type === 'item' || e.type === 'xp') e.removed = true; game.mode = 'creative'; spawnVehicle(game, 'rocket', Rb.x + 3.5, Rb.y, Rb.z + 0.5, 0); }, Rb);
    await sleep(300);
    await E(() => { const r = T.ents('rocket')[0]; boardVehicle(game, r); rocketLaunch(game, game.player, r); });
    check('a robot following you comes along in the rocket', await waitFor(() => game.dim === 'moon' && game.state === 'playing', 150000) && await waitFor(() => T.ents('robot').length === 1, 5000),
      await E(() => ({ dim: game.dim, robots: T.ents('robot').length })));
    await waitFor(() => game.player.riding && game.player.riding.type === 'rocket' && !game.player.riding.landing, 30000);
    await E(() => { const r = T.ents('rocket')[0]; rocketLaunch(game, game.player, r); });
    const home = await waitFor(() => game.dim === 'over' && game.state === 'playing', 150000);
    check('...and back home again', home && await waitFor(() => T.ents('robot').length === 1, 5000), await E(() => ({ dim: game.dim, robots: T.ents('robot').length })));
    await waitFor(() => game.player.riding && !game.player.riding.landing, 30000);
    await E(() => { game.input.sneak = true; });
    await sleep(300);
    await E(() => { game.input.sneak = false; for (const e of game.entities) if (e.vehicle || e.type === 'robot') e.removed = true; game.view = 0; game.setMode('survival'); });
  }

  if (on('hogwarts')) {
    // ---------- the Hogwarts world ----------
    const cards = await E(() => { buildWorldCards(); return Array.from(document.querySelectorAll('#world-cards h3')).map(h => h.textContent); });
    check('there is a Hogwarts world to pick', cards.includes('Hogwarts') && cards.length === 4, cards);
    await E(() => { game.startWorld('hogwarts', 'survival', true); });
    check('a new Hogwarts world starts', await waitFor(() => game.state === 'playing' && game.mapId === 'hogwarts', 150000));
    await E(() => { game.dragLook = true; game.world.time = 0.3; game.runCommand('/weather clear'); });
    const st = await E(() => { const pl = game.player, L = game.gen.hogwarts; return { at: [Math.round(pl.x), Math.round(pl.y), Math.round(pl.z)], spawn: L.spawn, kit: [I.WAND, I.BROOM].every(id => pl.inv.some(s => s && s.id === id)), welcome: Array.from(document.querySelectorAll('#chat-log div')).some(d => /Welcome to Hogwarts/.test(d.textContent)) }; });
    check('you start in the castle courtyard, with a wand and a broomstick', Math.abs(st.at[0] - st.spawn[0]) < 2 && Math.abs(st.at[2] - st.spawn[2]) < 2 && st.kit && st.welcome, st);
    await sleep(1500);
    await shot('hogwarts');
    // the Great Hall: the Sorting Hat, the house tables, floating candles, stained glass
    const hall = await E(() => { const w = game.world, h = game.gen.hogwarts.hat; let candles = 0, glass = 0; for (let x = -8; x <= 8; x++) for (let z = -70; z <= -36; z++) for (let y = 73; y < 100; y++) { const b = w.getBlock(x, y, z); if (b === B.CANDLE) candles++; if (b === B.STAINED_GLASS) glass++; } return { hat: w.getBlock(h[0], h[1], h[2]) === B.SORTING_HAT, candles, glass, light: w.getLight(0, 74, -50) }; });
    check('the Great Hall has the Sorting Hat, floating candles and stained glass windows, and it is light inside', hall.hat && hall.candles > 20 && hall.glass > 40 && Math.max(hall.light >> 4, hall.light & 15) >= 8, hall);
    // sit under the Sorting Hat: it picks your house
    await E(() => { const h = game.gen.hogwarts.hat; T.put(h[0] + 0.5, h[1], h[2] + 3.5); T.hold(0); T.aim(h[0] + 0.5, h[1] + 1, h[2] + 0.5); T.tap(); });
    await sleep(600);
    await E(() => { game.player.pitch = 0.1; });
    await shot('sorting-hat');
    const house = await waitFor(() => game.stats.house >= 0, 8000);
    const hs = await E(() => ({ house: houseOf() && houseOf().name, big: el('big-text').textContent, line: Array.from(document.querySelectorAll('#chat-log div')).map(d => d.textContent).filter(t => /Sorting Hat put/.test(t)) }));
    check('tap the Sorting Hat: it thinks, then puts you in a house', house && hs.house && hs.line.length === 1 && hs.big === hs.house.toUpperCase() + '!', hs);
    // Quidditch: fly through a hoop on a broom for a goal
    const L0 = await E(() => game.gen.hogwarts);
    const hoop = L0.hoops[1];
    await goto({ x: hoop[0], y: hoop[1], z: hoop[2] });
    await E(h => { const pl = game.player; const b = spawnVehicle(game, 'broom', h[0] - 4.5, h[1] - 0.45, h[2] + 0.5, -Math.PI / 2); boardVehicle(game, b); b.flying = true; pl.yaw = -Math.PI / 2; pl.pitch = 0; game.input.fwd = true; }, hoop);
    const goal = await waitFor(() => game.stats.goals >= 1, 8000);
    await E(() => { game.input.fwd = false; });
    const gl = await E(() => ({ goals: game.stats.goals, at: [game.player.x, game.player.y], line: Array.from(document.querySelectorAll('#chat-log div')).map(d => d.textContent).filter(t => /scored a goal/.test(t)) }));
    check('fly a broom through a hoop: Goal! 10 points to your house', goal && gl.line.length === 1 && /10 points to/.test(gl.line[0]), gl);
    // the Golden Snitch: it turns up over the pitch, and you can catch it
    const P0 = L0.pitch;
    await E(P0 => { const pl = game.player, b = pl.riding; b.x = P0.x + 0.5; b.z = P0.z + 0.5; b.y = P0.y + 8; game.snitchT = 0; }, P0);
    for (let i = 0; i < 3; i++) await E(() => spawnTick(game));
    check('the Golden Snitch zips about over the pitch', await waitFor(() => T.ents('snitch').length === 1, 3000));
    await sleep(1500);
    const sn = await E(P0 => { const s = T.ents('snitch')[0]; return { moved: Math.hypot(s.x - P0.x - 0.5, s.z - P0.z - 0.5) > 1 || Math.abs(s.y - P0.y - 12) > 1 }; }, P0);
    check('...darting about', sn.moved, sn);
    await E(() => { const s = T.ents('snitch')[0], b = game.player.riding; b.x = s.x; b.y = s.y - 0.95; b.z = s.z; game.player.x = s.x; game.player.y = s.y - 0.9; game.player.z = s.z; });
    const caught = await waitFor(() => game.stats.snitch >= 1, 3000);
    check('catch it: 150 points!', caught && await E(() => T.ents('snitch').length === 0 && Array.from(document.querySelectorAll('#chat-log div')).some(d => /caught the Golden Snitch! 150 points/.test(d.textContent))));
    await E(() => { game.input.sneak = true; });
    await sleep(200);
    await E(() => { game.input.sneak = false; });
    // Hogsmeade: snowy, with villagers
    const V = L0.village;
    await goto({ x: V.x, y: V.y + 6, z: V.z });
    check('Hogsmeade has villagers', await waitFor(() => T.ents('villager').length >= 4, 20000), await E(() => T.ents('villager').length));
    // the house you are in is saved with the world
    await E(() => game.save());
    check('your house is saved with the world', await E(() => JSON.parse(store.get(saveKey('hogwarts'))).stats.house === game.stats.house));
  }

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
