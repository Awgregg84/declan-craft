// Declan's sixth wish list, playing alone. Sections can be picked: node test/wishlist6.mjs books lasers money trains planets ghosts life
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
  const shot = async name => { await p.screenshot({ path: path.join(out, 'w6-' + name + '.png') }); };
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

  if (process.env.DBG) {   // (a quick look at something: DBG='code run in the page' node test/wishlist6.mjs dbg)
    const D = area(0, 0);
    await goto(D);
    console.log(JSON.stringify(await E(new Function('D', 'return (async () => {' + process.env.DBG + '})()'), D)));
  }

  if (on('books')) {
    // ---------- story books of old tales ----------
    const t = await E(() => TALES.map((tl, k) => ({ name: itemName(I.TALE + k), icon: !!ICONS[I.TALE + k], creative: CREATIVE_LIST.includes(I.TALE + k), pages: tl.pages.length })));
    check('eight old tales, each with its title, a cover picture, in Creative', t.length === 8 && t.every(o => o.icon && o.creative && o.pages >= 5) && t[0].name === 'The Three Little Pigs' && t[7].name === 'The Ugly Duckling', t.map(o => o.name));
    const r = await E(() => {
      T.hold(I.TALE + 2, 1); T.tap(); return new Promise(res => setTimeout(() => {
        const o = { screen: ui.screen, title: el('book-title').textContent, page: el('book-page').textContent.slice(0, 20), num: el('book-num').textContent };
        bookTurn(1); o.num2 = el('book-num').textContent; closeBook(null); o.held = game.player.inv[0] && game.player.inv[0].id; o.after = ui.screen; res(o);
      }, 400));
    });
    check('a tale opens like a book, page by page, with its title at the top, and stays in your hand', r.screen === 'scr-book' && r.title === 'The Tortoise and the Hare' && /^Page 1 of 8/.test(r.num) && /^Page 2 of 8/.test(r.num2) && r.held === (await E(() => I.TALE + 2)) && !r.after, r);
    const lib = await E(() => {
      const tr = tradesFor('librarian', 5).filter(x => isTale(x.get[0])).map(x => x.get[0] - I.TALE);
      let found = 0; for (let i = 0; i < 40; i++) { const c = { slots: new Array(27).fill(null) }; fillVillageChest(c); if (c.slots.some(s => s && isTale(s.id))) found++; }
      return { tr, found };
    });
    check('librarians sell tales, and village chests often have one', lib.tr.length === 2 && lib.found > 10 && lib.found < 40, lib);
  }

  if (on('lasers')) {
    // ---------- the laser blaster ----------
    const P = area(40, 0);
    await goto(P);
    await E(P => { T.stage(P.x, P.y, P.z, 14, 6); T.clearMobs(); game.setMode('survival'); game.settings.difficulty = 2; game.world.time = 0.25; }, P);
    const info = await E(() => ({ name: itemName(I.LASER), icon: !!ICONS[I.LASER], creative: CREATIVE_LIST.includes(I.LASER), rec: (o => o && o.out === I.LASER)(matchRecipe([I.IRON_INGOT, I.IRON_INGOT, B.GLASS, I.IRON_INGOT, B.GLOWSTONE, 0, I.IRON_INGOT, 0, 0], 3)) }));
    check('the Laser Blaster has a picture, a recipe, and is in Creative', info.name === 'Laser Blaster' && info.icon && info.creative && info.rec, info);
    const shoot = await E(P => new Promise(res => {
      const pl = game.player, out = {};
      T.put(P.x + 0.5, P.y, P.z + 0.5, { yaw: 0, pitch: 0 }); T.hold(I.LASER, 1);
      const z = spawnMob(game, 'zombie', P.x + 0.5, P.y, P.z - 8.5); z.noAI = true; z.ai = () => {};
      out.btn = !el('tb-spell').hidden || null;
      setTimeout(() => {
        out.btn = !el('tb-spell').hidden;
        T.aim(z.x, z.y + 1, z.z); const hp0 = z.hp; pl.useCd = 0; T.tap();
        let parts = 0; const pc = setInterval(() => { parts = Math.max(parts, PARTICLES.filter(q => q.tile === TILE.laser_0).length); }, 20);
        setTimeout(() => {
          clearInterval(pc); out.zombie = hp0 - z.hp; out.parts = parts;
          z.removed = true;
          const friends = ['villager', 'pig', 'golem', 'snork', 'student'].map(t => { const m = spawnMob(game, t, P.x + 0.5, P.y, P.z - 6.5); return m; });
          let k = 0; const hp = friends.map(m => m.hp);
          const next = () => {
            if (k > 0) friends[k - 1].removed = true;
            if (k >= friends.length) { out.friends = friends.map((m, i) => hp[i] - m.hp); return res(out); }
            const m = friends[k++]; m.x = P.x + 0.5; m.z = P.z - 6.5; m.vx = m.vz = 0;
            T.aim(m.x, m.y + m.h * 0.5, m.z); pl.useCd = 0; T.tap(); setTimeout(next, 250);
          };
          next();
        }, 300);
      }, 300);
    }), P);
    check('a laser beam hurts a monster, with a glow where it hits', shoot.zombie >= 4 && shoot.parts > 20 && shoot.btn, shoot);
    check('it never hurts villagers, pigs, golems, Snorks or students', shoot.friends.every(d => d === 0), shoot.friends);
    const more = await E(P => new Promise(res => {
      const pl = game.player, w = game.world, out = {};
      T.clearMobs();
      w.setBlock(P.x, P.y, P.z - 9, B.TNT, 0); w.setBlock(P.x + 2, P.y, P.z - 9, B.STONE, 0);
      T.put(P.x + 0.5, P.y, P.z + 0.5); T.aim(P.x + 2.5, P.y + 0.5, P.z - 8.5); pl.useCd = 0; T.tap();
      setTimeout(() => {
        out.stone = w.getBlock(P.x + 2, P.y, P.z - 9) === B.STONE;
        T.aim(P.x + 0.5, P.y + 0.5, P.z - 8.5); pl.useCd = 0; T.tap();
        setTimeout(() => {
          out.tnt = T.ents('tnt').length;
          T.clearMobs(); w.setBlock(P.x, P.y, P.z - 9, B.AIR, 0);
          // the colour button
          const c0 = pl.laserC | 0; nextSpell(game); out.col = [c0, pl.laserC, el('tb-spell').textContent];
          // a quick second tap is too soon
          let n = 0; const f0 = window.fireLaser; window.fireLaser = (g, q) => { n++; return f0(g, q); };
          pl.useCd = 0; T.tap();
          setTimeout(() => { T.tap(); setTimeout(() => { out.shots = n; window.fireLaser = f0; out.cd = n === 1; res(out); }, 150); }, 120);
        }, 300);
      }, 300);
    }), P);
    check('it breaks no blocks, and lights TNT', more.stone && more.tnt === 1, more);
    check('the Color button picks the beam colour, and the blaster has a short cooldown', more.col[1] === 1 && more.col[2] === 'Green' && more.cd, more);
    await E(() => T.clearMobs());
  }

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
