// Declan's wish list, playing alone: bows, arrows and crossbows; ender pearls and fire charges; five new TNTs;
// levers, buttons and dispensers; endermen and ghasts; rails, minecarts and the car (and that they are saved).
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
  const waitFor = (fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
  await E(() => { game.startWorld('valley', 'survival', true); });
  await waitFor(() => game.state === 'playing', 90000);
  await E(() => {
    game.dragLook = true; game.settings.difficulty = 2; game.world.time = 0.25;
    window.__toasts = []; const t0 = toast; window.toast = (m, s) => { window.__toasts.push(m); return t0(m, s); };
    // helpers used by the steps below
    window.T = {
      // a flat stone floor at y-1 with clear air above, around x, z
      stage(x, y, z, r, h) { const w = game.world; for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { w.setBlock(x + dx, y - 1, z + dz, B.STONE, 0); for (let k = 0; k < (h || 6); k++) w.setBlock(x + dx, y + k, z + dz, B.AIR, 0); } },
      clearMobs() { for (const e of game.entities) if (e.mob || e.type === 'proj' || e.type === 'item' || e.type === 'tnt') e.removed = true; },
      aim(tx, ty, tz) { const pl = game.player, dx = tx - pl.x, dy = ty - (pl.y + pl.eye), dz = tz - pl.z; pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
      put(x, y, z, opts) { Object.assign(game.player, { x, y, z, vx: 0, vy: 0, vz: 0, fallDist: 0, flying: false }, opts || {}); },
      hold(id, count) { const pl = game.player; pl.inv[0] = id ? { id, count: count || 1 } : null; pl.sel = 0; game.ui.dirty = true; },
      count(id) { return game.player.inv.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0); },
      blocks(x0, y0, z0, x1, y1, z1, id) { let n = 0; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) if (game.world.getBlock(x, y, z) === id) n++; return n; },
      solid(x0, y0, z0, x1, y1, z1) { let n = 0; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) if (SOLID[game.world.getBlock(x, y, z)]) n++; return n; },
      ents(type) { return game.entities.filter(e => !e.removed && e.type === type); },
    };
  });
  const base = await E(() => { const pl = game.player; return { x: Math.floor(pl.x), y: 100, z: Math.floor(pl.z) }; });
  const area = (dx, dz) => ({ x: base.x + dx, y: base.y, z: base.z + dz });
  const goto = async C => {
    await E(C => T.put(C.x + 0.5, C.y + 3, C.z + 0.5, { flying: true }), C);
    await waitFor(C => game.world.readyAround(C.x + 0.5, C.z + 0.5, 1) >= 1, 60000, C);
  };

  // ---------- 1. bows ----------
  const A = area(0, 0);
  await goto(A);
  await E(A => { T.stage(A.x, A.y, A.z, 12); T.clearMobs(); T.put(A.x + 0.5, A.y, A.z + 0.5); T.hold(I.BOW); game.player.inv[5] = { id: I.ARROW, count: 5 }; }, A);
  await sleep(400);
  const z1 = await E(A => {
    const z = spawnMob(game, 'zombie', A.x + 0.5, A.y, A.z - 8.5); z.yaw = z.bodyYaw = 0; z.frozen = 30;   // standing still to be shot
    T.aim(z.x, z.y + 1.2, z.z);
    game.input.use = true; game.input.usePressed = true;
    return { nid: z.nid, hp: z.hp };
  }, A);
  await sleep(1300);
  check('holding Place pulls the bow back', await E(() => game.player.drawT > 0.9));
  await E(() => { game.input.use = false; });
  await sleep(900);
  const b1 = await E(z1 => { const z = game.entities.find(e => e.nid === z1.nid); return { hp: z ? z.hp : null, arrows: T.count(I.ARROW), bow: game.player.inv[0] && game.player.inv[0].dmg, flying: T.ents('proj').length, toasts: window.__toasts.slice() }; }, z1);
  check('letting go shoots an arrow that hurts the zombie (a full pull hits hard)', b1.hp !== null && z1.hp - b1.hp >= 7 && b1.arrows === 4 && b1.bow === 1, b1);
  // a quick tap is a quick shot, into a wall: the arrow sticks, and you can pick it up again
  const w1 = await E(A => {
    T.clearMobs();
    for (let y = A.y; y < A.y + 4; y++) for (let x = A.x - 2; x <= A.x + 2; x++) game.world.setBlock(x, y, A.z - 6, B.STONE, 0);
    T.aim(A.x + 0.5, A.y + 1.6, A.z - 6);
    game.input.use = true; game.input.usePressed = true; game.input.useOnce = true;
  }, A);
  await sleep(1200);
  const w2 = await E(() => { const a = T.ents('proj'); return { n: a.length, stuck: a.length && a[0].stuck, arrows: T.count(I.ARROW), z: a.length ? a[0].z : null }; });
  check('a quick tap fires a quick shot that sticks in the wall', w2.n === 1 && w2.stuck && w2.arrows === 3, w2);
  await E(A => T.put(A.x + 0.5, A.y, A.z - 4.6), A);
  check('walking up to your arrow picks it back up', await waitFor(() => T.count(I.ARROW) === 4 && !T.ents('proj').length, 4000), await E(() => ({ arrows: T.count(I.ARROW), proj: T.ents('proj').length })));
  // no arrows: nothing to shoot
  await E(A => { for (let i = 0; i < 36; i++) if (game.player.inv[i] && game.player.inv[i].id === I.ARROW) game.player.inv[i] = null; T.put(A.x + 0.5, A.y, A.z + 0.5); window.__toasts = []; game.input.use = true; game.input.usePressed = true; game.input.useOnce = true; }, A);
  await sleep(400);
  check('without arrows the bow says so and shoots nothing', await E(() => !T.ents('proj').length && window.__toasts.some(t => /arrows/.test(t))), await E(() => window.__toasts));

  // ---------- 2. crossbows ----------
  await E(A => { T.clearMobs(); T.hold(I.CROSSBOW); game.player.inv[5] = { id: I.ARROW, count: 2 }; game.input.use = true; game.input.usePressed = true; game.input.useOnce = true; }, A);
  await sleep(500);
  check('a tap starts loading the crossbow', await E(() => game.player.loadT > 0 && game.player.inv[0].id === I.CROSSBOW));
  check('it finishes loading by itself, using an arrow', await waitFor(() => game.player.inv[0] && game.player.inv[0].id === I.CROSSBOW_LOADED, 3000), await E(() => ({ id: game.player.inv[0].id, arrows: T.count(I.ARROW) })));
  const c1 = await E(A => {
    const z = spawnMob(game, 'zombie', A.x + 0.5, A.y, A.z - 4.5); z.frozen = 30;
    T.aim(z.x, z.y + 1.2, z.z);
    game.input.use = true; game.input.usePressed = true; game.input.useOnce = true;
    return { nid: z.nid, hp: z.hp };
  }, A);
  await sleep(700);
  const c2 = await E(c1 => { const z = game.entities.find(e => e.nid === c1.nid); return { hp: z && z.hp, empty: game.player.inv[0].id === I.CROSSBOW, arrows: T.count(I.ARROW) }; }, c1);
  check('the next tap fires it (9 damage) and it is empty again', c1.hp - c2.hp >= 8 && c2.empty && c2.arrows === 1, c2);
  // in Creative, bows need no arrows
  await E(A => { T.clearMobs(); game.setMode('creative'); T.hold(I.BOW); for (let i = 1; i < 36; i++) game.player.inv[i] = null; T.aim(A.x + 0.5, A.y + 1, A.z - 6); game.input.use = true; game.input.usePressed = true; game.input.useOnce = true; }, A);
  await sleep(500);
  check('in Creative, a bow shoots without arrows', await E(() => T.ents('proj').length === 1 && !T.ents('proj')[0].pickup));
  // endermen dodge arrows
  await waitFor(() => game.player.shotCd <= 0, 3000);
  const en1 = await E(A => {
    T.clearMobs(); game.setMode('survival'); T.hold(I.BOW); game.player.inv[5] = { id: I.ARROW, count: 4 };
    for (let y = A.y; y < A.y + 4; y++) for (let x = A.x - 2; x <= A.x + 2; x++) game.world.setBlock(x, y, A.z - 6, B.AIR, 0);
    const e = spawnMob(game, 'enderman', A.x + 0.5, A.y, A.z - 7.5); e.frozen = 30;
    T.aim(e.x, e.y + 1.4, e.z);
    game.input.use = true; game.input.usePressed = true; game.input.useOnce = true;
    return { nid: e.nid, x: e.x, z: e.z, hp: e.hp };
  }, A);
  await waitFor(en1 => { const e = game.entities.find(q => q.nid === en1.nid); return e && Math.hypot(e.x - en1.x, e.z - en1.z) > 1; }, 3000, en1);
  const en2 = await E(en1 => { const e = game.entities.find(q => q.nid === en1.nid); return e && { moved: Math.hypot(e.x - en1.x, e.z - en1.z), hp: e.hp, arrows: T.ents('proj').map(a => [a.x, a.y, a.z, a.stuck]) }; }, en1);
  check('an arrow never hits an enderman: it teleports out of the way', en2 && en2.moved > 1 && en2.hp === en1.hp, en2);

  // ---------- 3. ender pearls and fire charges ----------
  const P = area(30, 0);
  await goto(P);
  await E(P => {
    T.clearMobs(); T.stage(P.x, P.y, P.z, 14);
    T.put(P.x + 0.5, P.y, P.z + 10.5); T.hold(I.ENDER_PEARL, 3);
    T.aim(P.x + 0.5, P.y + 3, P.z);   // up and over: it lands on the floor ahead
    game.input.use = true; game.input.usePressed = true; game.input.useOnce = true;
  }, P);
  await sleep(2500);
  const pe = await E(P => { const pl = game.player; return { z: pl.z, y: pl.y, n: T.count(I.ENDER_PEARL), hp: pl.health }; }, P);
  check('a thrown ender pearl takes you where it lands', pe.z < P.z + 8 && Math.abs(pe.y - P.y) < 1.5 && pe.n === 2 && pe.hp === 17, pe);
  await E(P => {
    const w = game.world;
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let y = P.y + 4; y < P.y + 8; y++) w.setBlock(P.x + 10 + dx, y, P.z + dz, B.STONE, 0);
    T.put(P.x + 10.5, P.y, P.z + 0.5); T.hold(I.ENDER_PEARL, 1); game.player.yaw = 0; game.player.pitch = 1.5;
    game.input.use = true; game.input.usePressed = true; game.input.useOnce = true;
  }, P);
  await waitFor(() => T.count(I.ENDER_PEARL) === 0 && !T.ents('proj').length, 5000);
  const pc = await E(() => ({ y: game.player.y, free: boxFree(game.world, game.player.x, game.player.y, game.player.z, 0.3, 1.8) }));
  check('a pearl thrown up at a ceiling lands you under it, not inside it', pc.free && pc.y < P.y + 4, pc);
  await waitFor(() => game.player.useCd <= 0, 3000);
  const fc = await E(P => {
    T.clearMobs(); T.put(P.x + 0.5, P.y, P.z + 0.5); T.hold(I.FIRE_CHARGE, 2);
    const pig = spawnMob(game, 'pig', P.x + 0.5, P.y, P.z - 5.5); pig.frozen = 30;
    T.aim(pig.x, pig.y + 0.5, pig.z);
    game.input.use = true; game.input.usePressed = true; game.input.useOnce = true;
    return { nid: pig.nid, hp: pig.hp };
  }, P);
  await sleep(1000);
  const fc2 = await E(fc => { const e = game.entities.find(q => q.nid === fc.nid); return { hp: e ? e.hp : -1, n: T.count(I.FIRE_CHARGE) }; }, fc);
  check('a thrown fire charge burns what it hits', fc2.hp <= fc.hp - 5 && fc2.n === 1, fc2);
  await waitFor(() => game.player.useCd <= 0, 3000);
  const fp = await E(P => {
    const w = game.world, x = P.x - 6, y = P.y, z = P.z - 8;
    for (let i = -1; i <= 2; i++) for (let j = -1; j <= 3; j++) if (i === -1 || i === 2 || j === -1 || j === 3) w.setBlock(x + i, y + j, z, B.OBSIDIAN, 0);
    T.hold(I.FIRE_CHARGE, 1);
    T.put(x + 0.5, y, z + 2.5); T.aim(x + 0.5, y, z + 0.5);   // the top of the frame's bottom row
    game.input.use = true; game.input.usePressed = true; game.input.useOnce = true;
    return { x, y, z };
  }, P);
  await sleep(500);
  check('a fire charge lights an obsidian frame', await E(fp => game.world.getBlock(fp.x, fp.y, fp.z) === B.NETHER_PORTAL && T.count(I.FIRE_CHARGE) === 0, fp), await E(fp => game.world.getBlock(fp.x, fp.y, fp.z), fp));

  // ---------- 4. TNT ----------
  const blast = async (kind, d, setup) => {
    const C = area(d, 50);
    await goto(C);
    const r = await E(([kind, C, setup]) => {
      T.clearMobs();
      const w = game.world;
      for (let dx = -12; dx <= 12; dx++) for (let dz = -12; dz <= 12; dz++) for (let y = C.y - 10; y < C.y; y++) w.setBlock(C.x + dx, y, C.z + dz, B.STONE, 0);
      for (let dx = -12; dx <= 12; dx++) for (let dz = -12; dz <= 12; dz++) for (let y = C.y; y < C.y + 8; y++) w.setBlock(C.x + dx, y, C.z + dz, B.AIR, 0);
      T.put(C.x + 0.5, C.y + 30, C.z + 20.5, { flying: true });
      if (setup) new Function('C', setup)(C);
      const before = T.solid(C.x - 11, C.y - 10, C.z - 11, C.x + 11, C.y - 1, C.z + 11);
      w.setBlock(C.x, C.y, C.z, TNT_BLOCK[kind], kind === 'dig' ? 0 : 0);
      igniteTNT(game, C.x, C.y, C.z, 0.3);
      return { before };
    }, [kind, C, setup || '']);
    return { C, before: r.before };
  };
  const solidAfter = C => E(C => T.solid(C.x - 11, C.y - 10, C.z - 11, C.x + 11, C.y - 1, C.z + 11), C);
  let t = await blast('normal', 0);
  await sleep(1500);
  const normalGone = t.before - await solidAfter(t.C);
  check('TNT still blows a hole', normalGone > 20, normalGone);
  t = await blast('mega', 40);
  await sleep(2000);
  const megaGone = t.before - await solidAfter(t.C);
  check('Mega TNT blows a much bigger hole', megaGone > normalGone * 4, { megaGone, normalGone });
  t = await blast('ice', 80, `
    const w = game.world;
    for (let dx = 2; dx <= 4; dx++) for (let dz = -1; dz <= 1; dz++) w.setBlock(C.x + dx, C.y - 1, C.z + dz, B.WATER, 0);
    for (let dx = -4; dx <= -2; dx++) for (let dz = -1; dz <= 1; dz++) w.setBlock(C.x + dx, C.y - 1, C.z + dz, B.LAVA, 0);
    for (let dz = 2; dz <= 4; dz++) w.setBlock(C.x, C.y - 1, C.z + dz, B.GRASS, 0);
    window.__icePig = spawnMob(game, 'pig', C.x + 0.5, C.y, C.z - 3.5);
    window.__iceMagma = spawnMob(game, 'magma', C.x - 0.5, C.y, C.z + 3.5, { size: 2 });`);
  await sleep(1500);
  const ice = await E(C => ({ ice: T.blocks(C.x + 2, C.y - 1, C.z - 1, C.x + 4, C.y - 1, C.z + 1, B.ICE), obs: T.blocks(C.x - 4, C.y - 1, C.z - 1, C.x - 2, C.y - 1, C.z + 1, B.OBSIDIAN),
    snow: T.blocks(C.x, C.y - 1, C.z + 2, C.x, C.y - 1, C.z + 4, B.SNOWY_GRASS), frozen: window.__icePig.frozen > 0, magma: window.__iceMagma.frozen, solid: T.solid(C.x - 11, C.y - 10, C.z - 11, C.x + 11, C.y - 1, C.z + 11) }), t.C);
  check('Ice TNT freezes water to ice, lava to obsidian, grass to snow, and the pig; nothing breaks', ice.ice === 9 && ice.obs === 9 && ice.snow === 3 && ice.frozen && ice.solid >= t.before, ice);
  check('and a magma cube stays frozen too (it is also hurt by the cold)', ice.magma > 2, ice.magma);
  t = await blast('dig', 120, `
    const w = game.world;   // solid rock to the west
    for (let dx = -22; dx <= -1; dx++) for (let dz = -4; dz <= 4; dz++) for (let y = C.y; y < C.y + 5; y++) w.setBlock(C.x + dx, y, C.z + dz, B.STONE, 0);`);
  await E(C => { const tn = T.ents('tnt')[0]; tn.dir = 1; }, t.C);   // its drill faces west (-x)
  await sleep(3500);
  const dig = await E(C => {
    let len = 0;
    for (let i = 1; i <= 20; i++) if (game.world.getBlock(C.x - i, C.y, C.z) === B.AIR && game.world.getBlock(C.x - i, C.y + 2, C.z + 1) === B.AIR) len = i; else break;
    return { len, wall: game.world.getBlock(C.x - 8, C.y + 1, C.z + 2) === B.STONE, floor: game.world.getBlock(C.x - 8, C.y - 1, C.z) === B.STONE };
  }, t.C);
  check('Digging TNT bores a 3x3 tunnel about 16 long the way it faces', dig.len >= 12 && dig.wall && dig.floor, dig);
  t = await blast('party', 160, `
    window.__partyPig = spawnMob(game, 'pig', C.x + 2.5, C.y, C.z + 0.5);
    const s = spawnMob(game, 'sheep', C.x - 2.5, C.y, C.z + 0.5); s.wool = 0; window.__partySheep = s;
    T.put(C.x + 0.5, C.y, C.z + 3.5);`);
  await E(() => { game.setMode('survival'); game.player.health = 20; });
  await waitFor(() => !T.ents('tnt').length, 5000);
  const party = await E(C => ({ pigUp: window.__partyPig.vy > 3 || window.__partyPig.y > C.y + 0.5, partyT: game.player.partyT > 0, vy: game.player.vy, solid: T.solid(C.x - 11, C.y - 10, C.z - 11, C.x + 11, C.y - 1, C.z + 11), confetti: PARTICLES.filter(q => q.tile === TILE.spark_red || q.tile === TILE.spark_blue).length }), t.C);
  await sleep(3000);
  const party2 = await E(() => ({ hp: game.player.health, onGround: game.player.onGround }));
  check('Party TNT: confetti and a big bounce for everyone, nothing broken', party.pigUp && party.partyT && party.confetti > 30 && party.solid >= t.before, party);
  check('and nobody gets hurt landing', party2.hp === 20, party2);
  await E(() => game.setMode('creative'));
  t = await blast('cluster', 200);
  await waitFor(() => T.ents('tnt').some(e => e.small), 5000);
  const cl1 = await E(() => T.ents('tnt').filter(e => e.small).length);
  await waitFor(() => !T.ents('tnt').length, 10000);
  await sleep(300);
  const cl2 = await E(() => T.ents('tnt').length);
  const clGone = t.before - await solidAfter(t.C);
  check('Cluster TNT throws out six little TNTs, which go off too', cl1 === 6 && cl2 === 0 && clGone > normalGone * 0.6, { cl1, cl2, clGone, normalGone });

  // ---------- 5. levers, buttons and dispensers ----------
  const M = area(0, 100);
  await goto(M);
  await E(M => { T.clearMobs(); T.stage(M.x, M.y, M.z, 12); T.put(M.x + 0.5, M.y, M.z + 6.5); game.setMode('survival'); }, M);
  // a lever placed by tapping the top of a block, with TNT on the far side of that block
  const lv = await E(M => {
    const w = game.world, pl = game.player;
    w.setBlock(M.x, M.y, M.z, B.STONE, 0); w.setBlock(M.x, M.y, M.z - 1, B.TNT, 0);
    T.hold(B.LEVER, 2);
    pl.target = { x: M.x, y: M.y, z: M.z, id: B.STONE, face: 2 };
    const ok = pl.useBlock(B.LEVER, false);
    return { ok, lever: w.getBlock(M.x, M.y + 1, M.z) === B.LEVER, d: w.getData(M.x, M.y + 1, M.z) };
  }, M);
  check('a lever goes on top of a block (stuck to the side you tapped)', lv.ok && lv.lever && lv.d === 3, lv);
  await E(M => { const pl = game.player; T.hold(null); pl.target = { x: M.x, y: M.y + 1, z: M.z, id: B.LEVER, face: 2 }; pl.useBlock(0, false); }, M);
  await sleep(300);
  const lv2 = await E(M => ({ d: game.world.getData(M.x, M.y + 1, M.z), gone: game.world.getBlock(M.x, M.y, M.z - 1) === B.AIR, lit: T.ents('tnt').length }), M);
  check('flipping it on lights TNT next to the block it is on', (lv2.d & 8) && lv2.gone && lv2.lit === 1, lv2);
  await E(() => { for (const e of T.ents('tnt')) e.removed = true; });
  // a lever by a door opens it, and shuts it again
  const dr = await E(M => {
    const w = game.world, x = M.x + 4, z = M.z;
    w.setBlock(x, M.y, z, B.DOOR, 0); w.setBlock(x, M.y + 1, z, B.DOOR, 8);
    w.setBlock(x + 1, M.y, z, B.STONE, 0); w.setBlock(x + 1, M.y + 1, z, B.LEVER, 3);
    useSwitch(game, x + 1, M.y + 1, z, B.LEVER);
    return { x, z };
  }, M);
  await sleep(300);
  const d1 = await E(([dr, M]) => game.world.getData(dr.x, M.y, dr.z), [dr, M]);
  await E(([dr, M]) => useSwitch(game, dr.x + 1, M.y + 1, dr.z, B.LEVER), [dr, M]);
  await sleep(300);
  const d2 = await E(([dr, M]) => ({ lo: game.world.getData(dr.x, M.y, dr.z), hi: game.world.getData(dr.x, M.y + 1, dr.z) }), [dr, M]);
  check('a lever opens a door next to its block, and flipping it back shuts it', (d1 & 4) && d2.lo === 0 && d2.hi === 8, { d1, d2 });
  // a button by a dispenser full of arrows: one arrow per press; the button pops back up
  const ds = await E(M => {
    const w = game.world, x = M.x - 4, z = M.z;
    w.setBlock(x, M.y, z, B.DISPENSER, 2);   // facing north (-z)
    const t = w.getTile(x, M.y, z, 'dispenser'); t.slots[4] = { id: I.ARROW, count: 3 };
    w.setBlock(x + 1, M.y, z, B.BUTTON, 1);   // on the dispenser's east side (stuck to -x)
    return { x, z };
  }, M);
  const up = () => waitFor(([ds, M]) => !(game.world.getData(ds.x + 1, M.y, ds.z) & 8) && !game.world.powerQ.length, 5000, [ds, M]);
  const press = async () => { await up(); await E(([ds, M]) => useSwitch(game, ds.x + 1, M.y, ds.z, B.BUTTON), [ds, M]); };
  await sleep(250);
  await press();
  await waitFor(() => T.ents('proj').length > 0, 3000);
  const ds1 = await E(([ds, M]) => { const a = T.ents('proj'); return { n: a.length, vz: a[0] && a[0].vz, left: game.world.getTile(ds.x, M.y, ds.z).slots[4].count, pressed: game.world.getData(ds.x + 1, M.y, ds.z) & 8 }; }, [ds, M]);
  check('pressing a button fires an arrow out of the dispenser the way it faces', ds1.n === 1 && ds1.vz < -10 && ds1.left === 2, ds1);
  check('the button pops back up after a second', await up());
  // a dispenser with TNT lights it in front; with an egg, a creature hatches; with cobblestone, it throws it out
  await E(([ds, M]) => {
    for (const e of T.ents('proj')) e.removed = true;
    const t = game.world.getTile(ds.x, M.y, ds.z, 'dispenser'); t.slots.fill(null); t.slots[0] = { id: B.PARTY_TNT, count: 1 };
  }, [ds, M]);
  await press();
  check('a dispenser lights TNT in front of it', await waitFor(() => T.ents('tnt').length === 1 && T.ents('tnt')[0].kind === 'party', 3000));
  await E(() => { for (const e of T.ents('tnt')) e.removed = true; });
  await E(([ds, M]) => { const t = game.world.getTile(ds.x, M.y, ds.z, 'dispenser'); t.slots[1] = { id: I.EGG + EGG_MOBS.indexOf('chicken'), count: 1 }; }, [ds, M]);
  await press();
  check('a dispenser hatches a spawn egg', await waitFor(([ds, M]) => T.ents('chicken').filter(c => Math.hypot(c.x - (ds.x + 0.5), c.z - (ds.z - 0.5)) < 3).length === 1, 3000, [ds, M]));
  await E(([ds, M]) => { const t = game.world.getTile(ds.x, M.y, ds.z, 'dispenser'); t.slots[2] = { id: B.COBBLE, count: 5 }; }, [ds, M]);
  await press();
  check('and throws other things out as items', await waitFor(() => T.ents('item').some(e => e.id === B.COBBLE && e.vz < -1), 3000));
  // breaking the block a lever is on drops the lever
  const br = await E(M => { game.world.setBlock(M.x, M.y, M.z, B.AIR, 0, true); return { gone: game.world.getBlock(M.x, M.y + 1, M.z) === B.AIR }; }, M);
  await sleep(200);
  check('a lever falls off when its block is broken', br.gone && await E(() => T.ents('item').some(e => e.id === B.LEVER)), br);
  // opening a dispenser shows 9 slots
  await E(([ds, M]) => { const pl = game.player; pl.target = { x: ds.x, y: M.y, z: ds.z, id: B.DISPENSER, face: 4 }; pl.useBlock(0, false); }, [ds, M]);
  await sleep(300);
  check('tapping a dispenser opens its 9 slots', await E(() => ui.inv && ui.inv.kind === 'dispenser' && document.querySelectorAll('#inv-root .disp .slot').length === 9), await E(() => ui.inv && ui.inv.kind));
  await p.screenshot({ path: path.join(out, 'dispenser.png') });
  await E(() => game.closeUI());

  // ---------- 6. endermen ----------
  const N = area(40, 100);
  await goto(N);
  const st = await E(N => {
    T.clearMobs(); T.stage(N.x, N.y, N.z, 12); game.setMode('survival'); T.hold(null);
    T.put(N.x + 0.5, N.y, N.z + 6.5);
    const e = spawnMob(game, 'enderman', N.x + 0.5, N.y, N.z - 2.5); e.yaw = e.bodyYaw = e.headYaw = 0;
    T.aim(e.x, e.y + e.h - 0.3, e.z);
    return e.nid;
  }, N);
  check('looking an enderman in the eyes makes it angry', await waitFor(nid => { const e = game.entities.find(q => q.nid === nid); return e && e.angryT > 0; }, 3000, st));
  await p.screenshot({ path: path.join(out, 'enderman.png') });
  const calm = await E(N => {
    T.clearMobs(); game.player.health = 20;
    const e = spawnMob(game, 'enderman', N.x + 0.5, N.y, N.z - 2.5);
    game.player.pitch = -1.2;   // looking at the floor
    return e.nid;
  }, N);
  await sleep(1500);
  check('one you do not look at stays calm', await E(nid => { const e = game.entities.find(q => q.nid === nid); return e && !(e.angryT > 0); }, calm));
  // an enderman picks up a natural block and later puts it down
  const take = await E(N => {
    T.clearMobs();
    const w = game.world;
    const e = spawnMob(game, 'enderman', N.x + 0.5, N.y, N.z + 0.5); e.tpT = 100;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      w.setBlock(N.x + dx, N.y - 1, N.z + dz, B.GRASS, 0);
      const em = w.edits.get(chunkKey((N.x + dx) >> 4, (N.z + dz) >> 4));   // as if it had always been there
      if (em) em.delete(((N.x + dx) & 15) | (((N.z + dz) & 15) << 4) | ((N.y - 1) << 8));
    }
    const r0 = Math.random;
    Math.random = () => 0.0001;
    try { for (let i = 0; i < 20 && !e.carry; i++) enderTick(game, e, 0.05); } finally { Math.random = r0; }
    return { grassHeld: e.carry === B.GRASS, nid: e.nid, grass: T.blocks(N.x - 2, N.y - 1, N.z - 2, N.x + 2, N.y - 1, N.z + 2, B.GRASS) };
  }, N);
  check('a calm enderman picks up a grass block it finds', take.grassHeld && take.grass === 24, take);
  // endermen hate water
  const wet = await E(N => {
    T.clearMobs();
    const e = spawnMob(game, 'enderman', N.x + 6.5, N.y, N.z + 0.5); e.frozen = 0;
    game.world.setBlock(N.x + 6, N.y, N.z, B.WATER, 0);
    for (let i = 0; i < 4; i++) enderTick(game, e, 0.2);
    return { moved: Math.hypot(e.x - (N.x + 6.5), e.z - (N.z + 0.5)), hp: e.hp };
  }, N);
  check('an enderman in water gets hurt and teleports away', wet.moved > 0.5 && wet.hp < 40, wet);

  // ---------- 7. ghasts ----------
  await E(() => { T.clearMobs(); game.setMode('creative'); });
  const G = area(-40, 100);
  G.y = 105;
  await goto(G);
  await E(G => { T.stage(G.x, G.y, G.z, 10, 14); T.put(G.x + 0.5, G.y, G.z + 0.5); game.setMode('survival'); game.player.health = 20; }, G);
  const gh = await E(G => { const g = spawnMob(game, 'ghast', G.x + 0.5, G.y + 6, G.z - 9.5); return g.nid; }, G);
  // (the check holds the first fireball still where it is, so it can be hit back below)
  check('a ghast that can see you shoots a fireball', await waitFor(() => { const f = T.ents('proj').find(e => e.kind === 'fireball'); if (f) { f.vx = f.vy = f.vz = 0; window.__fb = f.nid; } return !!f; }, 15000));
  const fb = await E(() => { game.setMode('creative'); return { nid: window.__fb }; });   // no more fireballs at us
  // hit it back
  await E(fb => { const f = game.entities.find(e => e.nid === fb.nid); const pl = game.player; f.x = pl.x; f.y = pl.y + 1.6; f.z = pl.z - 1.5; f.vx = 0; f.vy = 0; f.vz = 12; }, fb);
  const df = await E(([fb, gh]) => {
    const f = game.entities.find(e => e.nid === fb.nid), g = game.entities.find(e => e.nid === gh);
    const pl = game.player; T.aim(f.x, f.y, f.z); pl.pickTarget();
    const hitIt = pl.targetEnt === f;
    T.aim(g.x, g.y + 1.5, g.z);
    deflectFireball(game, f, pl.lookDir(), 'me');
    return { hitIt, vz: f.vz, defl: f.deflected };
  }, [fb, gh]);
  check('you can hit a fireball, and it flies back the way you look', df.hitIt && df.vz < -5 && df.defl, df);
  check('a ghast hit by its own fireball dies', await waitFor(gh => { const g = game.entities.find(e => e.nid === gh); return !g || g.dead; }, 10000, gh));
  await E(() => T.clearMobs());

  // ---------- 8. rails, minecarts and the car ----------
  const V = area(0, -60);
  await goto(V);
  const rl = await E(V => {
    T.clearMobs(); T.stage(V.x, V.y, V.z, 14); game.setMode('creative');
    const w = game.world, pl = game.player;
    T.put(V.x + 0.5, V.y, V.z + 4.5); pl.yaw = Math.PI / 2;   // facing west
    // tap rails down one at a time: a line east, a corner, a line south, and a slope up
    const tap = (x, z) => { pl.target = { x, y: V.y - 1, z, id: B.STONE, face: 2 }; return pl.useBlock(B.RAIL, true); };
    T.hold(B.RAIL, 64);
    for (let i = 0; i < 6; i++) tap(V.x + i, V.z);
    for (let j = 1; j < 6; j++) tap(V.x + 5, V.z + j);
    w.setBlock(V.x + 5, V.y, V.z + 6, B.STONE, 0); w.setBlock(V.x + 5, V.y, V.z + 7, B.STONE, 0); w.setBlock(V.x + 5, V.y + 1, V.z + 7, B.STONE, 0);
    pl.target = { x: V.x + 5, y: V.y, z: V.z + 6, id: B.STONE, face: 2 }; pl.useBlock(B.RAIL, true);
    pl.target = { x: V.x + 5, y: V.y + 1, z: V.z + 7, id: B.STONE, face: 2 }; pl.useBlock(B.RAIL, true);
    const d = (x, y, z) => w.getData(x, y, z);
    return { line: d(V.x + 2, V.y, V.z), corner: d(V.x + 5, V.y, V.z), south: d(V.x + 5, V.y, V.z + 3), up: d(V.x + 5, V.y, V.z + 5) };
  }, V);
  check('rails join up by themselves: straight, round a corner, up a slope', rl.line === 1 && rl.corner === 7 && rl.south === 0 && rl.up === 5, rl);
  const mc = await E(V => {
    const pl = game.player;
    T.hold(I.MINECART, 1);
    pl.target = { x: V.x + 1, y: V.y, z: V.z, id: B.RAIL, face: 2 };
    const placed = pl.useBlock(I.MINECART, true);
    const cart = T.ents('minecart')[0];
    T.put(V.x + 1.5, V.y, V.z + 1.5); T.aim(cart.x, cart.y + 0.3, cart.z); pl.pickTarget();
    const aimed = pl.targetEnt === cart;
    game.input.use = true; game.input.usePressed = true; game.input.useOnce = true;
    return { placed, aimed };
  }, V);
  await sleep(300);
  check('a minecart goes on a rail, and tapping it gets you in', mc.placed && mc.aimed && await E(() => !!game.player.riding && game.player.riding.type === 'minecart'), mc);
  await E(() => {
    const pl = game.player; pl.yaw = -Math.PI / 2; game.input.fwd = true;   // look east and push
    window.__cartMaxY = 0; (function track() { const c = T.ents('minecart')[0]; if (c) window.__cartMaxY = Math.max(window.__cartMaxY, c.y); if (!window.__stopTrack) requestAnimationFrame(track); })();
  });
  const rode = await waitFor(V => { const c = T.ents('minecart')[0]; return c && c.z > V.z + 2.5 && Math.abs(c.x - (V.x + 5.5)) < 0.05; }, 8000, V);
  await E(() => { game.input.fwd = false; });
  const cpos = await E(() => { const c = T.ents('minecart')[0], pl = game.player; return { x: c.x, y: c.y, z: c.z, px: pl.x, pz: pl.z }; });
  check('pushing forward rolls it along the rails and round the corner, with you in it', rode && Math.hypot(cpos.px - cpos.x, cpos.pz - cpos.z) < 0.5, cpos);
  await waitFor(() => window.__cartMaxY > 100.5, 8000);
  await waitFor(() => { const c = T.ents('minecart')[0]; return Math.hypot(c.vx, c.vz) < 0.05; }, 30000);
  const cend = await E(V => { window.__stopTrack = true; const c = T.ents('minecart')[0]; return { x: c.x, y: c.y, z: c.z, v: Math.hypot(c.vx, c.vz), maxY: window.__cartMaxY }; }, V);
  check('it climbs the slope, and in the end comes to a stop on the rails', cend.maxY > V.y + 0.5 && cend.v < 0.05 && (Math.abs(cend.x - (V.x + 5.5)) < 0.02 || Math.abs(cend.z - (V.z + 0.5)) < 0.02), cend);
  await E(() => { game.input.sneak = true; });
  await waitFor(() => !game.player.riding, 3000);
  await E(() => { game.input.sneak = false; });
  const off = await E(() => ({ riding: !!game.player.riding, d: Math.hypot(game.player.x - T.ents('minecart')[0].x, game.player.z - T.ents('minecart')[0].z) }));
  check('Sneak gets you out, beside the minecart', !off.riding && off.d > 0.6 && off.d < 2, off);
  // the car
  const car = await E(V => {
    const pl = game.player;
    T.put(V.x - 6.5, V.y, V.z + 8.5); pl.yaw = 0; pl.pitch = -0.6;
    T.hold(I.CAR, 1);
    pl.target = { x: V.x - 7, y: V.y - 1, z: V.z + 6, id: B.STONE, face: 2 };
    const ok = pl.useBlock(I.CAR, true);
    const c = T.ents('car')[0];
    mountVehicle(game, c);
    return { ok, yaw: c.yaw, x: c.x, z: c.z, riding: game.player.riding === c };
  }, V);
  check('a car goes on the ground facing the way you face, and you can get in', car.ok && Math.abs(car.yaw) < 0.01 && car.riding, car);
  await E(() => { game.input.fwd = true; });
  await waitFor(car => T.ents('car')[0].z < car.z - 6, 8000, car);
  const drove = await E(car => { const c = T.ents('car')[0]; return { dz: c.z - car.z, dx: c.x - car.x, v: Math.hypot(c.vx, c.vz) }; }, car);
  check('the joystick drives it forward', drove.dz < -4 && Math.abs(drove.dx) < 1, drove);
  await E(() => { game.input.right = true; });
  await waitFor(() => T.ents('car')[0].yaw < -0.6, 6000);
  const turned = await E(() => { const c = T.ents('car')[0]; return { yaw: c.yaw, pyaw: game.player.yaw }; });
  await E(() => { game.input.right = false; game.input.fwd = false; game.input.back = true; });
  await sleep(1500);
  await E(() => { game.input.back = false; });
  check('and steers right (your view turns with it)', turned.yaw < -0.5 && turned.pyaw < -0.4, turned);
  // up a one-block step
  const step = await E(V => {
    T.clearMobs();
    const w = game.world, c = T.ents('car')[0];
    for (let dz = -14; dz <= 14; dz++) for (let dx = -14; dx <= 14; dx++) w.setBlock(V.x + dx, V.y - 1, V.z + dz, B.STONE, 0);
    Object.assign(c, { x: V.x - 6.5, y: V.y, z: V.z + 8, yaw: 0, vx: 0, vz: 0 });
    for (let dx = -10; dx <= -3; dx++) for (let dz = -14; dz <= 0; dz++) w.setBlock(V.x + dx, V.y, V.z + dz, B.STONE, 0);
    const z = spawnMob(game, 'zombie', V.x - 6.5, V.y, V.z + 3.5); z.frozen = 30;
    game.input.fwd = true;
    return z.nid;
  }, V);
  await waitFor(V => T.ents('car')[0].z < V.z - 2, 8000, V);
  await E(() => { game.input.fwd = false; });
  const st2 = await E(([V, nid]) => { const c = T.ents('car')[0], z = game.entities.find(e => e.nid === nid); return { y: c.y, z: c.z, zhp: z ? z.hp : 0, zx: z && z.x }; }, [V, step]);
  check('the car hops up a one-block step', st2.y >= V.y + 1 - 0.01, st2);
  check('and knocks a zombie flying', st2.zhp < 20, st2);
  const sv = await E(() => {
    game.save();
    const d = JSON.parse(store.get(saveKey(game.mapId))), c = T.ents('car')[0];
    return { riding: !!game.player.riding, y: d.player.y, cy: c.y, free: boxFree(game.world, d.player.x, d.player.y, d.player.z, 0.3, 1.8), d: Math.hypot(d.player.x - c.x, d.player.z - c.z) };
  });
  check('saving while in the car saves you standing beside it (not in the floor)', sv.riding && sv.free && sv.y >= sv.cy - 0.01 && sv.d < 2.5, sv);
  // honk, get out, and break it in Survival: it drops back as an item
  await E(() => { game.input.use = true; game.input.usePressed = true; game.input.useOnce = true; });
  await waitFor(() => !game.input.useOnce, 3000);   // (the honk is done before getting out, so that tap can't put down another car)
  await E(() => { dismountVehicle(game); T.hold(null); game.setMode('survival'); });
  const brk = await E(() => {
    const c = T.ents('car')[0], pl = game.player;
    for (let i = 0; i < 4; i++) hitVehicle(game, c, 'survival', 'me');
    return { gone: c.removed, item: T.ents('item').some(e => e.id === I.CAR) };
  });
  check('a few hits break the car, and you get it back', brk.gone && brk.item, brk);
  // vehicles are saved with the world
  await E(V => { game.setMode('creative'); spawnVehicle(game, 'car', V.x + 0.5, V.y, V.z - 6, 1.2); game.save(); }, V);
  const saved = await E(() => { const d = JSON.parse(store.get(saveKey(game.mapId))); return d.world.vehicles; });
  check('minecarts and cars are saved with the world', Array.isArray(saved) && saved.some(v => v.k === 'car' && Math.abs(v.yaw - 1.2) < 0.01) && saved.some(v => v.k === 'minecart'), saved);
  await E(() => game.quitToTitle());
  await sleep(500);
  await E(() => game.startWorld('valley', null, false));
  await waitFor(() => game.state === 'playing', 90000);
  check('and are back after loading it again', await E(() => T.ents('car').length === 1 && T.ents('minecart').length === 1), await E(() => game.entities.filter(e => e.vehicle).map(e => e.type)));

  // ---------- 9. the crafting recipes ----------
  const rec = await E(() => {
    const m = (rows, map, n) => { const g = []; for (const r of rows) for (const ch of r.padEnd(n, ' ')) g.push(ch === ' ' ? 0 : map[ch]); while (g.length < n * n) g.push(0); const o = matchRecipe(g, n); return o ? [o.out, o.count] : null; };
    return {
      bow: m([' ST', 'S T', ' ST'], { S: I.STICK, T: I.STRING }, 3), arrow: m(['F', 'S', 'E'], { F: I.FLINT, S: I.STICK, E: I.FEATHER }, 3),
      xbow: m(['SIS', 'TFT', ' S '], { S: I.STICK, I: I.IRON_INGOT, T: I.STRING, F: I.FLINT }, 3), disp: m(['CCC', 'CBC', 'CCC'], { C: B.COBBLE, B: I.BOW }, 3),
      rail: m(['I I', 'ISI', 'I I'], { I: I.IRON_INGOT, S: I.STICK }, 3), cart: m(['I I', 'III'], { I: I.IRON_INGOT }, 3), car: m([' G ', 'III', 'C C'], { G: B.GLASS, I: I.IRON_INGOT, C: I.COAL }, 3),
      mega: m(['TT', 'TT'], { T: B.TNT }, 2), ice: m(['TI'], { T: B.TNT, I: B.ICE }, 2), dig: m(['TI', 'F '], { T: B.TNT, I: I.IRON_INGOT, F: I.FLINT }, 2),
      party: m(['TF', 'W '], { T: B.TNT, F: I.FEATHER, W: B.WOOL + 3 }, 2), cluster: m(['TG', 'GG'], { T: B.TNT, G: I.GUNPOWDER }, 2),
      string: m(['W'], { W: B.WOOL }, 2), lever: m(['S', 'C'], { S: I.STICK, C: B.COBBLE }, 2), button: m(['S'], { S: B.STONE }, 2), charge: m(['GC', 'F '], { G: I.GUNPOWDER, C: I.COAL, F: I.FLINT }, 2),
    };
  });
  const ids = await E(() => ({ bow: I.BOW, arrow: I.ARROW, xbow: I.CROSSBOW, disp: B.DISPENSER, rail: B.RAIL, cart: I.MINECART, car: I.CAR, mega: B.MEGA_TNT, ice: B.ICE_TNT, dig: B.DIG_TNT, party: B.PARTY_TNT, cluster: B.CLUSTER_TNT, string: I.STRING, lever: B.LEVER, button: B.BUTTON, charge: I.FIRE_CHARGE }));
  const counts = { arrow: 4, rail: 16, string: 4, charge: 3 };
  const bad = Object.keys(ids).filter(k => !rec[k] || rec[k][0] !== ids[k] || rec[k][1] !== (counts[k] || 1));
  check('every new recipe makes the right thing', bad.length === 0, bad.map(k => [k, rec[k]]));

  check('no page errors', errs.length === 0, errs.slice(0, 5));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
