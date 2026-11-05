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
      const ok = await waitFor(S => game.entities.some(e => e.type === 'villager' && e.prof === 'shopkeeper' && !e.removed && Math.hypot(e.x - S[0] - 0.5, e.z - S[2] - 0.5) < 3), 40000, S);
      const at = await E(S => {
        const w = game.world, e = game.entities.find(q => q.type === 'villager' && q.prof === 'shopkeeper');
        // the sign over the door, two blocks in front of the shopkeeper's place and up
        let sign = null; for (let dz = -8; dz <= 8; dz++) for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy <= 3; dy++) { const l = signLines(w, S[0] + dx, S[1] + dy, S[2] + dz); if (l) sign = l; }
        let shelves = 0, counter = 0; for (let dz = -6; dz <= 6; dz++) for (let dx = -4; dx <= 4; dx++) { if (w.getBlock(S[0] + dx, S[1], S[2] + dz) === B.BOOKSHELF) shelves++; if (w.getBlock(S[0] + dx, S[1], S[2] + dz) === B.SPRUCE_PLANKS) counter++; }
        return { sign, shelves, counter, prof: e && PROF_NAMES[e.prof] };
      }, S);
      at.keepers = await E(S => game.entities.filter(q => q.prof === 'shopkeeper').map(q => [q.x - S[0], q.y - S[1], q.z - S[2]].map(v => Math.round(v * 10) / 10)), S);
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

  if (on('planets')) {
    // ---------- other planets by rocket ----------
    const tiles = await E(() => ({ blockTiles: Math.max(...['mars_dust', 'mars_rock', 'cloud', 'uranus_ice', 'station_top', 'station_side'].map(n => TILE[n])), dims: DIMS.slice() }));
    check('new places go on the end of the list, and block pictures stay below tile 256', tiles.blockTiles < 256 && tiles.dims.join() === 'over,nether,moon,mars,jupiter,uranus', tiles);
    const P = area(0, 40);
    await goto(P);
    await E(P => { T.stage(P.x, P.y, P.z, 6, 8); T.clearMobs(); game.setMode('survival'); const pl = game.player; for (let i = 0; i < 41; i++) pl.inv[i] = null; T.put(P.x + 2.5, P.y, P.z + 0.5); game.world.time = 0.3; }, P);
    const pick = await E(P => new Promise(res => {
      const r = spawnVehicle(game, 'rocket', P.x + 0.5, P.y, P.z + 0.5, 0); boardVehicle(game, r);
      rocketLaunch(game, game.player, r);
      const box = el('planet-pick'), names = Array.from(document.querySelectorAll('.planet-btn .planet-name')).map(e => e.textContent);
      const shown = box && !box.hidden;
      document.querySelector('.planet-btn[data-planet="mars"]').click();
      setTimeout(() => res({ shown, names, dest: r.dest, counting: r.launchT > 0, hidden: box.hidden }), 300);
    }), P);
    check('blast off from home: pick the Moon, Mars, Jupiter or Uranus', pick.shown && pick.names.join() === 'The Moon,Mars,Jupiter,Uranus' && pick.dest === 'mars' && pick.counting && pick.hidden, pick);
    const visit = async (dest, look) => {
      await E(dest => { const r = T.ents('rocket')[0]; game.rocketTravel(null, r, dest); }, dest);
      await waitFor(dest => game.state === 'playing' && game.dim === dest && !game.arrival, 90000, dest);
      await waitFor(() => !T.ents('rocket').some(r => r.landing), 20000);
      await E(() => { if (game.player.riding) dismountVehicle(game); });
      await sleep(1500);
      const o = await E(() => {
        const pl = game.player, w = game.world, below = w.getBlock(Math.floor(pl.x), Math.floor(pl.y - 0.5), Math.floor(pl.z));
        return { dim: game.dim, map: w.map, below: BLOCKS[below] && BLOCKS[below].name, helmet: wearsSpaceHelmet(pl), breathe: canBreatheHere(pl), g: gravOf(w.map), sky: skyState(0.3, w.map).space, chat: Array.from(document.querySelectorAll('#chat-log div')).slice(-4).map(d => d.textContent) };
      });
      if (look) { await E(look => { const pl = game.player; pl.yaw = look[0]; pl.pitch = look[1]; game.view = 0; }, look); await sleep(1200); await shot('planet-' + dest); }
      return o;
    };
    const mars = await visit('mars', [0.6, 0.15]);
    check('Mars: red dust, a space helmet, low gravity, a dusty sky', mars.dim === 'mars' && /Mars/.test(mars.below) && mars.helmet && mars.breathe && mars.g < 0.5 && mars.sky, mars);
    const rover = await E(() => { const pl = game.player, v = game.gen.nearestRover(game.seed, pl.x, pl.z); return { v, dist: Math.hypot(v.x - pl.x, v.z - pl.z), hint: Array.from(document.querySelectorAll('#chat-log div')).some(d => /rover is about/.test(d.textContent)) }; });
    check('a rover to find (the helmet radio says where)', rover.dist < 140 && rover.hint, rover);
    const found = await E(async v => {
      const pl = game.player; T.put(v.x + 0.5, 110, v.z + 4.5, { flying: true });
      await new Promise(r => { const t0 = performance.now(), k = () => (game.world.readyAround(v.x, v.z, 1) >= 1 || performance.now() - t0 > 30000) ? r() : setTimeout(k, 200); k(); });
      const w = game.world, top = w.topSolid(v.x, v.z), id = w.getBlock(v.x, top, v.z);
      T.put(v.x + 0.5, top + 1, v.z + 3.5, { flying: false });
      await new Promise(r => setTimeout(r, 1200));
      return { top: BLOCKS[id] && BLOCKS[id].name, found: !!game.stats.rover };
    }, rover.v);
    check('walk up to it: "You found a Mars rover!"', found.found && /Iron|Lapis|Glass|Bars/.test(found.top), found);
    await E(() => { const pl = game.player; game.view = 1; pl.yaw += Math.PI; pl.pitch = -0.25; }); await sleep(1000); await shot('planet-mars-rover'); await E(() => { game.view = 0; });
    // home, then Jupiter
    await E(() => { const pl = game.player, r = spawnVehicle(game, 'rocket', pl.x, pl.y, pl.z, 0); });
    const home = await visit('over');
    check('the rocket flies home from Mars', home.dim === 'over' && !home.sky, home);
    await E(() => { const pl = game.player; spawnVehicle(game, 'rocket', pl.x, pl.y, pl.z, 0); });
    const jup = await visit('jupiter', [0.4, 0.25]);
    check('Jupiter: you land on a floating island of cloud, under a stormy sky', jup.dim === 'jupiter' && /Cloud|Wool/.test(jup.below) && jup.helmet && jup.g > 1 && jup.sky, jup);
    const gust = await E(() => new Promise(res => { const pl = game.player; Object.assign(pl, { y: 12, vy: -20, flying: false }); setTimeout(() => res({ y: pl.y, toast: window.__toasts.slice(-1)[0] }), 600); }));
    check('fall off an island and the wind blows you back', gust.y > 40 && /gust/.test(gust.toast), gust);
    await E(() => { const pl = game.player; spawnVehicle(game, 'rocket', pl.x, pl.y, pl.z, 0); });
    await visit('over');
    await E(() => { const pl = game.player; spawnVehicle(game, 'rocket', pl.x, pl.y, pl.z, 0); });
    const ura = await visit('uranus', [1.2, 0.35]);
    check('Uranus: blue-green ice, very cold, rings in the sky', ura.dim === 'uranus' && /Ice/.test(ura.below) && ura.helmet && ura.sky && ura.chat.some(c => /cold/.test(c)), ura);
    await E(() => game.save());
    const sv = await E(() => { const d = JSON.parse(store.get(saveKey('valley'))); return { dim: d.dim, has: ['mars', 'jupiter', 'uranus'].filter(k => d[k]), ps: Object.keys(d.planetSpawn || {}) }; });
    check('the planets are kept with the world, and you are still on Uranus', sv.dim === 'uranus' && sv.has.length === 3 && sv.ps.length === 3, sv);
    await E(() => { game.startWorld('valley', 'survival', false); });
    await waitFor(() => game.state === 'playing', 90000);
    check('load it again: back on Uranus', await E(() => game.dim === 'uranus' && game.world.map === 'uranus'));
    await E(() => { const pl = game.player; spawnVehicle(game, 'rocket', pl.x, pl.y, pl.z, 0); });
    await visit('over');
  }

  const GHOST_DUSK_T = 0.503;
  if (on('ghosts')) {
    // ---------- the Ghostbusters world ----------
    await E(() => { game.startWorld('ghost', 'survival', true); });
    await waitFor(() => game.state === 'playing' && game.mapId === 'ghost', 90000);
    await sleep(1500);
    const g0 = await E(() => {
      const pl = game.player, has = id => pl.inv.some(s => s && s.id === id), G = game.gen.ghost, w = game.world;
      let red = 0; for (let x = -14; x <= 14; x++) for (let y = 70; y <= 90; y++) if (w.getBlock(x, y, G.hq.z1 + 1) === B.WOOL + 14) red++;
      return { kit: [has(I.PROTON_PACK), has(I.GHOST_TRAP), has(I.GHOST_DETECTOR)], card: !!MAPS.ghost && !!SLOTS.ghost, items: [I.PROTON_PACK, I.GHOST_TRAP, I.GHOST_DETECTOR].map(id => !!ICONS[id] && CREATIVE_LIST.includes(id)),
        red, time: w.time, hello: Array.from(document.querySelectorAll('#chat-log div')).some(d => /Who you gonna call/.test(d.textContent)), count: el('hud-count') && el('hud-count').textContent };
    });
    check('a Ghostbusters world, and you start with a proton pack, a trap and a detector', g0.card && g0.kit.every(Boolean) && g0.items.every(Boolean) && g0.hello, g0);
    check('the firehouse has GHOST BUSTERS on its board; it is always dusk; the counter shows', g0.red > 60 && Math.abs(g0.time - GHOST_DUSK_T) < 0.01 && g0.count === 'Ghosts caught: 0', g0);
    await E(() => { const pl = game.player; T.put(0.5, 65, 6.5, { yaw: 0, pitch: 0.28 }); game.view = 0; });
    await sleep(1500); await shot('ghost-hq');
    check('ghosts float about the city, and the marshmallow giant is in the park', await waitFor(() => T.ents('slimer').length + T.ents('sheetghost').length >= 3 && T.ents('marshmallow').length === 1, 20000),
      await E(() => ({ s: T.ents('slimer').length, g: T.ents('sheetghost').length, m: T.ents('marshmallow').length })));
    // the detector
    const det = await E(() => new Promise(res => {
      const pl = game.player; for (const e of game.entities) if (isGhost(e)) e.removed = true;
      T.put(0.5, 65, 4.5, { yaw: 0, pitch: 0 }); T.hold(I.GHOST_DETECTOR, 1);
      const far = spawnMob(game, 'sheetghost', 0.5, 66, 30.5); far.ai = () => {}; far.home = [0.5, 30.5]; far.heldT = 99;
      setTimeout(() => {
        const o = { far: el('pke').textContent, lv1: +el('pke').dataset.level, shown: !el('pke').hidden };
        far.x = 0.5; far.z = 1.5; far.y = 66;
        setTimeout(() => { o.near = el('pke').textContent; o.lv2 = +el('pke').dataset.level; far.removed = true; res(o); }, 500);
      }, 500);
    }));
    check('the ghost detector lights up and beeps faster the closer a ghost is', det.shown && det.lv2 >= 5 && det.lv2 > det.lv1 && /HERE|close/.test(det.near), det);
    // the proton pack holds a ghost; the trap catches it
    const pr = await E(() => new Promise(res => {
      const pl = game.player, e = spawnMob(game, 'slimer', 0.5, 66, -2.5); e.home = [0.5, -2.5]; e.cdT = 99; window.__g = e;
      T.put(0.5, 65, 4.5); T.hold(I.PROTON_PACK, 1); T.aim(e.x, e.y + 0.5, e.z);
      game.input.use = true;
      setTimeout(() => { const o = { held: e.heldT > 0, beam: PARTICLES.filter(q => q.tile === TILE.proton).length }; game.input.use = false; res(o); }, 600);
    }));
    await shot('ghost-proton');
    check('hold the proton pack at a ghost: a crackling stream holds it still', pr.held && pr.beam > 5, pr);
    const tr = await E(() => new Promise(res => {
      const pl = game.player, e = window.__g; e.heldT = 2;
      T.hold(I.GHOST_TRAP, 1); pl.useCd = 0; T.tap();
      setTimeout(() => { const o = { sucking: e.trapT > 0 || e.removed }; setTimeout(() => { o.gone = e.removed; o.count = game.stats.ghosts; o.hud = el('hud-count').textContent; o.big = el('big-text').textContent; res(o); }, 1900); }, 200);
    }));
    check('throw the trap under it: caught! (the first one is cheered)', tr.sucking && tr.gone && tr.count === 1 && tr.hud === 'Ghosts caught: 1' && /first ghost/.test(tr.big), tr);
    const tr2 = await E(() => new Promise(res => { const pl = game.player; pl.useCd = 0; T.tap(); setTimeout(() => res(window.__toasts.slice(-1)[0]), 300); }));
    check('a trap with no ghost held tells you what to do', /proton pack stream/.test(tr2), tr2);
    // slimed!
    const sl = await E(() => new Promise(res => {
      const pl = game.player; for (const e of game.entities) if (isGhost(e)) e.removed = true;
      T.put(0.5, 65, 4.5); const h0 = pl.health; const e = spawnMob(game, 'slimer', 3.5, 66, 4.5); e.home = [3.5, 4.5];
      const t0 = performance.now(), k = () => { if (hasEffect(pl, 'slowness') || performance.now() - t0 > 8000) res({ slow: hasEffect(pl, 'slowness'), health: pl.health === h0, toast: window.__toasts.slice(-1)[0] }); else setTimeout(k, 100); }; k();
    }));
    check('a slimy ghost swoops and SPLATs you: slowed down a moment, not hurt', sl.slow && sl.health && /slimed/.test(sl.toast), sl);
    const dr = await E(() => { const w = game.world, e = spawnMob(game, 'sheetghost', 10.5, 67, 12.5); for (const y of [65, 66]) w.setBlock(10, y, 14, B.DOOR, y === 66 ? 8 : 0); const before = w.getData(10, 65, 14) & 4; ghostDoors(game, e); const after = w.getData(10, 65, 14) & 4; e.removed = true; return { before, after }; });
    check('a sheet ghost bangs doors open and shut', dr.before !== dr.after, dr);
    await E(() => game.save());
    const gs = await E(() => JSON.parse(store.get(saveKey('ghost'))).stats.ghosts);
    check('the ghosts you caught are kept with the world', gs === 1, gs);
  }

  if (on('life')) {
    // ---------- the Life Cycle world ----------
    await E(() => { game.startWorld('life', 'survival', true); });
    await waitFor(() => game.state === 'playing' && game.mapId === 'life', 90000);
    await sleep(2500);
    const b = await E(() => { const pl = game.player; return { card: !!MAPS.life && !!SLOTS.life, hud: el('hud-count').textContent, h: pl.h, eye: pl.eye, speed: lifeSpeed(), dayLen: dayLength(), stage: lifeStage().key, hello: Array.from(document.querySelectorAll('#chat-log div')).some(d => /brand new baby/.test(d.textContent)) }; });
    check('a Life Cycle world: you start as a baby, small and slow; a day lasts 3 minutes', b.card && b.hud === 'Day 1 of 10: Baby' && b.h < 1 && b.eye < 0.9 && b.speed < 0.6 && b.dayLen === 180 && b.stage === 'baby' && b.hello, b);
    check('grown-ups look after you at home, and the family car is out front', await waitFor(() => game.entities.filter(e => e.caretaker && !e.removed).length === 2 && T.ents('car').length === 1, 15000),
      await E(() => ({ care: game.entities.filter(e => e.caretaker).length, car: T.ents('car').length })));
    await E(() => { T.put(0.5, 65, 4.5, { yaw: Math.PI, pitch: 0.1 }); game.view = 1; }); await sleep(2000); await shot('life-baby'); await E(() => { game.view = 0; });
    const lim = await E(() => new Promise(res => {
      const pl = game.player; T.put(30.5, 65, 0.5);
      setTimeout(() => {
        const o = { back: Math.abs(pl.x) < 13, toast: window.__toasts.slice(-1)[0] };
        o.mine = lifeCan('mine', true); o.build = lifeCan('build', true); o.drive = lifeCan('drive', true);
        pl.food = 5; setTimeout(() => { o.fed = pl.food === 20; res(o); }, 300);
      }, 300);
    }));
    check("a baby can't leave the garden, dig, build or drive, and is kept fed", lim.back && /stay at home/.test(lim.toast) && !lim.mine && !lim.build && !lim.drive && lim.fed, lim);
    const grow = await E(() => new Promise(res => {
      const out = [];
      const step = days => new Promise(r => { game.day = game.stats.born + days - 1; setTimeout(() => { const pl = game.player; out.push({ d: lifeDay(), stage: lifeStage().key, hud: el('hud-count').textContent, big: el('big-text').textContent, toast: window.__toasts.slice(-1)[0], h: Math.round(pl.h * 100) / 100, leave: lifeCan('leave', true), mine: lifeCan('mine', true), drive: lifeCan('drive', true) }); r(); }, 400); });
      (async () => { for (const d of [3, 4, 6, 8, 10]) await step(d); res(out); })();
    }));
    check('each day you grow up: "Day 3: You\'re a toddler!"', grow[0].stage === 'toddler' && grow[0].big === 'Day 3' && /Day 3: You're a toddler!/.test(grow[0].toast) && grow[0].hud === 'Day 3 of 10: Toddler', grow[0]);
    check('a kid can go out, a teen can use tools, a grown-up can drive and build; you get bigger', grow[1].stage === 'kid' && grow[1].leave && !grow[1].mine && grow[2].stage === 'teen' && grow[2].mine && !grow[2].drive && grow[3].stage === 'grownup' && grow[3].drive && grow[3].h > grow[1].h && grow[1].h > grow[0].h && grow[4].stage === 'old', grow);
    await E(() => { game.day = game.stats.born + 3; T.put(36.5, 65, -2.5, { yaw: Math.PI / 2, pitch: -0.05 }); }); await sleep(2000); await shot('life-playground');
    const end = await E(() => new Promise(res => { game.day = game.stats.born + 10; setTimeout(() => { const e = el('life-end'); res({ shown: !!e, text: e && e.textContent }); }, 500); }));
    check('after the last day: "The End: what a life!" with a few things you did', end.shown && /The End: what a life!/.test(end.text) && /Blocks built/.test(end.text), end);
    await shot('life-end');
    await E(() => document.querySelector('#life-end .btn').click());
    await waitFor(() => game.state === 'playing' && game.mapId === 'life' && !el('life-end'), 90000);
    await sleep(1500);
    const again = await E(() => ({ day: lifeDay(), stage: lifeStage().key, worldDay: game.day }));
    check('tap, and a new game starts: a baby again', again.day === 1 && again.stage === 'baby' && again.worldDay === 1, again);
  }

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
