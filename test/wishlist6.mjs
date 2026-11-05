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

  if (on('money')) {
    // ---------- money and the Declan-craft Store ----------
    const m1 = await E(() => {
      const pl = game.player; game.setMode('survival');
      for (let i = 0; i < 36; i++) pl.inv[i] = null;
      const out = { names: [itemName(I.COIN), itemName(I.BILL)], icons: !!ICONS[I.COIN] && !!ICONS[I.BILL], creative: CREATIVE_LIST.includes(I.COIN) && CREATIVE_LIST.includes(I.BILL) };
      giveMoney(pl, 23); out.m0 = moneyOf(pl); out.c0 = [T.count(I.BILL), T.count(I.COIN)];
      payMoney(pl, 7); out.m1 = moneyOf(pl); out.c1 = [T.count(I.BILL), T.count(I.COIN)];
      out.cant = payMoney(pl, 99); out.m2 = moneyOf(pl);
      out.gold = blockDrops(B.GOLD_ORE, toolId(2, 0)).some(([id, n]) => id === I.COIN && n >= 1);
      let found = 0; for (let i = 0; i < 20; i++) { const c = { slots: new Array(27).fill(null) }; fillVillageChest(c); if (c.slots.some(q => q && q.id === I.COIN)) found++; }
      out.chests = found;
      return out;
    });
    check('coins ($1) and ten dollar bills ($10), with pictures, in Creative', m1.names.join() === 'Coin,Ten Dollar Bill' && m1.icons && m1.creative, m1);
    check('money adds up, and paying gives change', m1.m0 === 23 && m1.c0.join() === '2,3' && m1.m1 === 16 && m1.c1.join() === '1,6' && m1.cant === false && m1.m2 === 16, m1);
    check('gold ore gives a little money, and village chests have coins', m1.gold && m1.chests === 20, m1);
    const S = await E(() => { const pl = game.player; return game.gen.findStore(game.mapId, game.seed, pl.x, pl.z, game.world.villageBlock); });
    check('the nearest village has a Declan-craft Store (/locate store)', Array.isArray(S), S);
    if (S) {
      await E(S => T.put(S[0] + 0.5, S[1] + 6, S[2] + 0.5, { flying: true }), S);
      await waitFor(S => game.world.readyAround(S[0], S[2], 2) >= 1, 60000, S);
      const ok = await waitFor(S => game.entities.some(e => e.type === 'villager' && e.prof === 'shopkeeper' && !e.removed && Math.hypot(e.x - S[0] - 0.5, e.z - S[2] - 0.5) < 3), 20000, S);
      const at = await E(S => {
        const w = game.world, e = game.entities.find(q => q.type === 'villager' && q.prof === 'shopkeeper');
        // the sign over the door, two blocks in front of the shopkeeper's place and up
        let sign = null; for (let dz = -8; dz <= 8; dz++) for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy <= 3; dy++) { const l = signLines(w, S[0] + dx, S[1] + dy, S[2] + dz); if (l) sign = l; }
        let shelves = 0, counter = 0; for (let dz = -6; dz <= 6; dz++) for (let dx = -4; dx <= 4; dx++) { if (w.getBlock(S[0] + dx, S[1], S[2] + dz) === B.BOOKSHELF) shelves++; if (w.getBlock(S[0] + dx, S[1], S[2] + dz) === B.SPRUCE_PLANKS) counter++; }
        return { sign, shelves, counter, prof: e && PROF_NAMES[e.prof] };
      }, S);
      check('the store has a shopkeeper, shelves, a counter and its sign', ok && at.sign && at.sign[0] === 'Declan-craft' && at.sign[1] === 'Store' && at.shelves >= 6 && at.counter >= 4 && at.prof === 'Shopkeeper', at);
      // look at it from outside the door
      await E(S => { const e = game.entities.find(q => q.type === 'villager' && q.prof === 'shopkeeper'), w = game.world; let fz = 0; for (const dz of [-1, 1]) if (w.getBlock(S[0], S[1], S[2] + dz * 5) === B.GLASS_DOOR) fz = dz; T.put(S[0] + 0.5, S[1] + 1, S[2] + fz * 11 + 0.5, { flying: true, yaw: fz > 0 ? 0 : Math.PI, pitch: -0.1 }); game.world.time = 0.25; }, S);
      await sleep(1500); await shot('store-outside');
      await E(S => { const w = game.world; let fz = 0; for (const dz of [-1, 1]) if (w.getBlock(S[0], S[1], S[2] + dz * 5) === B.GLASS_DOOR) fz = dz; T.put(S[0] + 0.5, S[1], S[2] + fz * 3.2 + 0.5, { flying: false, yaw: fz > 0 ? 0 : Math.PI, pitch: -0.05 }); }, S);
      await sleep(1000); await shot('store-inside');
      const shop = await E(() => {
        const pl = game.player, e = game.entities.find(q => q.type === 'villager' && q.prof === 'shopkeeper'), out = {};
        giveMoney(pl, 5); pl.give(B.COBBLE, 16);
        openTrade(e); out.kind = ui.inv && ui.inv.kind; out.money = el('shop-money').textContent; out.rows = document.querySelectorAll('.shop-list .trade').length;
        const m0 = moneyOf(pl), b0 = T.count(I.BREAD); shopDeal(false, 0); out.bought = [m0 - moneyOf(pl), T.count(I.BREAD) - b0];
        const k = SHOP_BUY.findIndex(it => it[0] === I.LASER); shopDeal(false, k); out.cant = [T.count(I.LASER), document.querySelector('.trade-msg').textContent];
        ui.inv.tab = 1; buildInv(); const m1 = moneyOf(pl); shopDeal(true, 0); out.sold = [moneyOf(pl) - m1, T.count(B.COBBLE)];
        closeInv(); openInv('inv'); out.line = (el('inv-money') || {}).textContent; closeInv();
        game.setMode('creative'); openTrade(e); out.cmoney = el('shop-money').textContent; const l0 = T.count(I.LASER), mm = moneyOf(pl); shopDeal(false, k); out.free = [T.count(I.LASER) - l0, moneyOf(pl) - mm]; closeInv(); game.setMode('survival');
        return out;
      });
      check('tap the shopkeeper: the store screen, with your money', shop.kind === 'shop' && /You have \$\d+/.test(shop.money) && shop.rows > 20, shop);
      check('buy bread for $3; a laser is too dear; sell 16 cobblestone for $1', shop.bought.join() === '3,3' && shop.cant[0] === 0 && /You need \$40/.test(shop.cant[1]) && shop.sold.join() === '1,0', shop);
      check('the inventory shows how much money you have; in Creative everything is free', /^Money: \$\d+$/.test(shop.line) && /free/.test(shop.cmoney) && shop.free.join() === '1,0', shop);
    }
    const fall = await E(() => {
      const res = game.gen.generateChunk('falls', 7, 1, -1, null, null), res2 = game.gen.generateChunk('falls', 7, 1, -1, null, ['fstore']);
      return { spawn: res.spawns.filter(s => s[0] === 'shop').length, blocked: res2.spawns.filter(s => s[0] === 'shop').length, stan: FALLS_CHARS[2].give.some(([id, n]) => id === I.BILL && n * 10 >= 300), at: game.gen.findStore('falls', 7, 0, 0, []),
        old: game.gen.storesTouching('falls', 7, [[1, 0]]), oldV: (() => { const s = game.gen.findStore(game.mapId, game.seed, game.player.x, game.player.z, []); return s ? game.gen.storesTouching('valley', game.seed, [[Math.floor(s[0] / 16), Math.floor(s[2] / 16)]]).length : -1; })() };
    });
    check('Declan Falls has a store too, and Grunkle Stan starts with lots of money', fall.spawn === 1 && fall.blocked === 0 && fall.stan && Array.isArray(fall.at), fall);
    check('older worlds get no store where something was built', fall.old.join() === 'fstore' && fall.oldV === 1, fall);
  }

  if (on('trains')) {
    // ---------- trains and stations ----------
    const P = area(-60, 0);
    await goto(P);
    await E(P => { T.stage(P.x, P.y, P.z, 24, 8); T.clearMobs(); game.setMode('creative'); const w = game.world; for (let dx = -22; dx <= 22; dx++) w.setBlock(P.x + dx, P.y, P.z, B.RAIL, 1); }, P);
    const info = await E(() => {
      const make = (g, n) => { const o = matchRecipe(g, n); return o ? itemName(o.out) : null; }, M = I.MINECART, Y = B.WOOL + 4, S = B.STONE_BRICKS;
      return { names: [itemName(I.TRAIN), BLOCKS[B.STATION].name], icons: !!ICONS[I.TRAIN] && !!ICONS[B.STATION], creative: CREATIVE_LIST.includes(I.TRAIN) && CREATIVE_LIST.includes(B.STATION),
        rec: [make([B.FURNACE, 0, 0, M, M, M, 0, 0, 0], 3), make([Y, Y, Y, S, S, S, 0, 0, 0], 3)], code: VEHICLES.train.code, ent: ENT_CODE['-18'] };
    });
    check('the Train and the Train Station: pictures, recipes, in Creative', info.names.join() === 'Train,Train Station' && info.icons && info.creative && info.rec.join() === 'Train,Train Station' && info.code === -18 && info.ent === 'train', info);
    const st = await E(P => {
      const pl = game.player, w = game.world;
      T.put(P.x + 0.5, P.y, P.z + 3.5, { yaw: 0, pitch: -0.6 }); T.hold(B.STATION, 1);
      pl.target = { x: P.x, y: P.y - 1, z: P.z + 1, id: B.STONE, face: 2 };
      pl.useBlock(B.STATION, true);
      let n = 0, where = []; for (let dx = -3; dx <= 3; dx++) for (let dz = -1; dz <= 3; dz++) for (let dy = -1; dy <= 1; dy++) if (w.getBlock(P.x + dx, P.y + dy, P.z + dz) === B.STATION) { n++; where.push([dx, dy, dz]); }
      return { n, where, sign: signLines(w, P.x, P.y + 1, P.z + 1) };
    }, P);
    check('a Train Station beside the track builds a platform with a sign showing its name', st.n === 5 && st.sign && st.sign[0] === 'Train Station' && st.sign[1].length > 2, st);
    const put = await E(P => {
      const pl = game.player;
      T.put(P.x - 17.5, P.y, P.z + 2.5, { yaw: -Math.PI / 2, pitch: -0.5 }); T.hold(I.TRAIN, 1);
      pl.target = { x: P.x - 18, y: P.y, z: P.z, id: B.RAIL, face: 2 };
      const ok = pl.useBlock(I.TRAIN, true), v = T.ents('train')[0];
      return { ok, n: T.ents('train').length, y: v && v.y - P.y };
    }, P);
    check('the train goes on the rails', put.ok && put.n === 1 && put.y < 0.2, put);
    await E(() => { const v = T.ents('train')[0]; mountVehicle(game, v); game.view = 1; });
    await E(() => { game.input.fwd = true; }); await sleep(400); await E(() => { game.input.fwd = false; });
    const run = await E(() => { const v = T.ents('train')[0]; return { riding: game.player.riding === v, running: v.running }; });
    check('get in and push forward: off it goes', run.riding && run.running === 1, run);
    const stopped = await waitFor(P => { const v = T.ents('train')[0]; return v.waitT > 0 && Math.abs(v.x - P.x - 0.5) < 4; }, 20000, P);
    const stopInfo = await E(() => { const v = T.ents('train')[0]; return { x: v.x, waitT: v.waitT, speed: Math.hypot(v.vx, v.vz), toast: window.__toasts.slice(-2) }; });
    await sleep(800); await shot('train-station');
    check('it stops at the station for a few seconds, and says its name', stopped && stopInfo.toast.some(t => /All aboard/.test(t)), stopInfo);
    const cars = await E(() => { const v = T.ents('train')[0], c1 = carPose(v, 1), c2 = carPose(v, 2); return { d1: v.x - c1.x, d2: v.x - c2.x, z: [c1.z - v.z, c2.z - v.z] }; });
    check('two carriages follow behind the engine along the track', Math.abs(cars.d1 - 4.65) < 0.3 && Math.abs(cars.d2 - 9.05) < 0.3 && cars.z.every(d => Math.abs(d) < 0.1), cars);
    const goes = await waitFor(P => { const v = T.ents('train')[0]; return v.x > P.x + 8; }, 15000, P);
    check('then it goes on by itself', goes);
    const end = await waitFor(P => { const v = T.ents('train')[0]; return !v.running && v.x > P.x + 20; }, 15000, P);
    check('and stops at the end of the line', end, await E(() => { const v = T.ents('train')[0]; return { x: v.x, running: v.running }; }));
    await E(() => { game.input.back = true; }); await sleep(300); await E(() => { game.input.back = false; });
    await sleep(1500);
    const back = await E(P => { const v = T.ents('train')[0]; return { x: v.x - P.x, running: v.running }; }, P);
    check('pull back to back up', back.running === -1 && back.x < 21.4, back);
    await E(P => { const v = T.ents('train')[0]; v.running = 0; game.view = 0; dismountVehicle(game); T.put(v.x - 4, P.y + 1.5, P.z + 7.5, { flying: true, yaw: 0.35, pitch: -0.2 }); }, P);
    await sleep(800); await shot('train-side');
    await E(() => { const v = T.ents('train')[0]; mountVehicle(game, v); });
    const seat = await E(() => {
      const pl = game.player, v = T.ents('train')[0];
      dismountVehicle(game); v.running = 0;
      v.rider = 'someone';   // (a friend drives)
      mountVehicle(game, v);
      const c1 = carPose(v, 1), o = { seat: pl.seat, near: Math.hypot(pl.x - c1.x, pl.z - c1.z) };
      dismountVehicle(game); o.out = !pl.riding && pl.seat === 0; o.off = Math.hypot(pl.x - c1.x, pl.z - c1.z); v.rider = null;
      return o;
    });
    check('a friend sits in a carriage, and gets out beside it', seat.seat === 1 && seat.near < 1.2 && seat.out && seat.off < 3.5, seat);
    await E(() => game.save());
    const saved = await E(() => { const d = JSON.parse(store.get(saveKey('valley'))); return (d.world.vehicles || []).filter(v => v.k === 'train').length; });
    check('the train is kept with the world', saved === 1, saved);
    await E(() => { for (const v of T.ents('train')) v.removed = true; game.view = 0; game.setMode('survival'); });
  }

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
