// Declan's fifth wish list, playing alone. Sections can be picked: node test/wishlist5.mjs tanks students quidditch falls
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
  const shot = async name => { await p.screenshot({ path: path.join(out, 'w5-' + name + '.png') }); };
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

  if (process.env.DBG) {   // (a quick look at something: DBG='code run in the page' node test/wishlist5.mjs dbg)
    const D = area(0, 0);
    await goto(D);
    console.log(JSON.stringify(await E(new Function('D', 'return (async () => {' + process.env.DBG + '})()'), D)));
  }

  if (on('tanks')) {
    // ---------- tanks in different colours ----------
    const P = area(40, 0);
    await goto(P);
    await E(P => { T.stage(P.x, P.y, P.z, 12, 6); T.clearMobs(); game.setMode('survival'); game.settings.difficulty = 0; game.world.setBlock(P.x + 3, P.y, P.z - 6, B.STONE, 0); }, P);
    const items = await E(() => TANK_COLORS.map((c, i) => ({ name: itemName(I.TANK + i), icon: !!ICONS[I.TANK + i], creative: CREATIVE_LIST.includes(I.TANK + i) })));
    check('six tanks, each its own colour, with pictures, in Creative', items.length === 6 && items.every(o => o.icon && o.creative) && items.map(o => o.name).join() === 'Green Tank,Desert Tank,Blue Tank,Red Tank,Pink Tank,Black Tank', items);
    const rec = await E(() => {
      const make = g => { const o = matchRecipe(g, 3); return o ? itemName(o.out) : null; }, Ib = B.IRON_BLOCK;
      return [make([0, B.WOOL + 13, 0, Ib, Ib, Ib, 0, 0, 0]), make([0, B.WOOL + 6, 0, Ib, Ib, Ib, 0, 0, 0]), make([0, B.WOOL + 15, 0, Ib, Ib, Ib, 0, 0, 0]), make([0, B.WOOL, 0, Ib, Ib, Ib, 0, 0, 0])];
    });
    check('a tank is made from three iron blocks with wool on top; the wool picks its colour', rec.join() === 'Green Tank,Pink Tank,Black Tank,', rec);
    const put = await E(P => {
      const pl = game.player, out = [];
      TANK_COLORS.forEach((c, i) => {
        const dx = -7.5 + i * 3;
        T.put(P.x + 0.5 + dx, P.y, P.z + 5.5, { yaw: 0, pitch: -0.5 });
        T.hold(I.TANK + i, 1);
        pl.target = { x: Math.floor(P.x + dx), y: P.y - 1, z: P.z + 2, id: B.STONE, face: 2 };
        out.push(pl.useBlock(I.TANK + i, false) && T.count(I.TANK + i) === 0);
      });
      return { out, colours: T.ents('tank').map(v => v.tc).join() };
    }, P);
    check('tanks go down on the ground in their own colours', put.out.every(Boolean) && put.colours === '0,1,2,3,4,5', put);
    await E(P => { T.put(P.x + 0.5, P.y + 1.5, P.z + 10.5, { yaw: 0, pitch: -0.25 }); game.view = 0; }, P);
    await sleep(1200);
    await shot('tanks-parked');
    // drive the red one: forward, turn on the spot, climb a step
    const drv = await E(() => { const v = T.ents('tank')[3]; mountVehicle(game, v); return { riding: game.player.riding === v, tip: window.__toasts.some(m => /paint shell/.test(m)) }; });
    check('get in a tank: a tip says how to drive and fire', drv.riding && drv.tip, drv);
    const z0 = await E(() => { game.input.fwd = true; return T.ents('tank')[3].z; });
    await sleep(1500);
    const go = await E(z0 => { const v = T.ents('tank')[3]; game.input.fwd = false; return { dz: Math.round((v.z - z0) * 10) / 10, spd: Math.round(Math.hypot(v.vx, v.vz) * 10) / 10, tr: v.trL !== undefined }; }, z0);
    check('it drives forward, slower than a car, and its tracks run', go.dz < -1.5 && go.spd <= 5.6 && go.tr, go);
    const yaw0 = await E(() => { game.input.joyX = 1; return T.ents('tank')[3].yaw; });
    await sleep(800);
    const spun = await E(yaw0 => { const v = T.ents('tank')[3]; game.input.joyX = 0; return { turned: Math.round((yaw0 - v.yaw) * 100) / 100, moved: Math.round(Math.hypot(v.vx, v.vz) * 10) / 10 }; }, yaw0);
    check('it turns on the spot', spun.turned > 0.5 && spun.moved < 1, spun);
    // the turret follows where you look; the hull stays put
    const tur = await E(() => { const pl = game.player, v = pl.riding; pl.yaw = v.yaw + 1.2; pl.pitch = 0.3; return new Promise(r => setTimeout(() => r({ rel: Math.round((v.turret - v.yaw) * 100) / 100, gun: Math.round(v.gun * 100) / 100 }), 300)); });
    check('the turret and gun turn to where the driver looks', Math.abs(tur.rel - 1.2) < 0.05 && Math.abs(tur.gun - 0.3) < 0.05, tur);
    await E(() => { game.view = 1; }); await sleep(600); await shot('tank-turret'); await E(() => { game.view = 0; });
    // climb a one-block step
    const climb = await E(P => {
      const pl = game.player, v = pl.riding;
      v.x = P.x + 3.5; v.z = P.z - 2.5; v.y = P.y; v.yaw = 0; v.vx = v.vz = 0; pl.yaw = 0; pl.pitch = 0;
      game.input.fwd = true;
      let top = v.y;
      const iv = setInterval(() => { top = Math.max(top, v.y); }, 50);
      return new Promise(r => setTimeout(() => { clearInterval(iv); game.input.fwd = false; r({ y: Math.round(top * 10) / 10 - P.y, z: Math.round(v.z - P.z) }); }, 2500));
    }, P);
    check('it climbs up a one-block step', climb.y >= 1 && climb.z <= -6, climb);
    // fire a paint shell at a sheep: it gets a shove and red wool, and nothing is hurt
    const fire = await E(async P => {
      const pl = game.player, v = pl.riding, w = game.world;
      v.x = P.x + 0.5; v.y = P.y; v.z = P.z + 6.5; v.yaw = 0; v.vx = v.vz = 0;
      const sh = spawnMob(game, 'sheep', P.x + 0.5, P.y, P.z - 4.5); sh.wool = 0; sh.ai = () => {}; const hp = sh.hp;
      const blocks = () => { let n = 0; for (let dx = -12; dx <= 12; dx++) for (let dz = -12; dz <= 12; dz++) n += w.getBlock(P.x + dx, P.y - 1, P.z + dz) === B.STONE ? 1 : 0; return n; };
      const b0 = blocks();
      await new Promise(r => setTimeout(r, 200));
      pl.yaw = 0; pl.pitch = 0.02;
      await new Promise(r => setTimeout(r, 100));
      T.tap();
      const shells = await new Promise(r => setTimeout(() => r(T.ents('proj').filter(e => e.kind === 'paint').length), 60));
      await new Promise(r => setTimeout(r, 1500));
      return { shells, wool: sh.wool, hp: sh.hp === hp, dead: !!sh.dead, blocks: blocks() === b0, alive: pl.alive && pl.health === 20 };
    }, P);
    check('a tap fires a paint shell; it paints the sheep red and hurts nothing, and breaks no blocks', fire.shells >= 1 && fire.wool === 14 && fire.hp && !fire.dead && fire.blocks && fire.alive, fire);
    await shot('tank-paint');
    // a tank is saved with the world, in its colour, and comes back its colour when broken
    await E(() => dismountVehicle(game));
    await E(() => game.save());
    const saved = await E(() => { const d = JSON.parse(store.get(saveKey(game.slot))); return (d.vehicles || (d.world && d.world.vehicles) || []).filter(v => v.k === 'tank').map(v => v.c).sort().join(); });
    check('tanks are saved with the world, each keeping its colour', saved === '0,1,2,3,4,5', saved);
    const back = await E(() => { const v = T.ents('tank')[4]; for (let i = 0; i < 6; i++) hitVehicle(game, v, 'survival'); return game.entities.some(e => e.type === 'item' && !e.removed && e.id === I.TANK + 4) || T.count(I.TANK + 4) > 0; });
    check('a broken tank drops back as a tank of its own colour', back, back);
  }

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
