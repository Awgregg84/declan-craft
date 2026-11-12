// More Mars (the second Mars update), playing alone. Sections can be picked: node test/wishlist8.mjs air pet ruins sky ball board track
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
  const shot = async name => { await p.screenshot({ path: path.join(out, 'w8-' + name + '.png') }); };
  await E(() => { game.startWorld('marsworld', 'survival', true); });
  await waitFor(() => game.state === 'playing', 90000);
  await E(() => {
    game.dragLook = true; game.settings.difficulty = 2; game.world.time = 0.3; game.settings.renderDist = 5;
    window.__toasts = []; const t0 = toast; window.toast = (m, s) => { window.__toasts.push(m); return t0(m, s); };
    window.T = {
      aim(tx, ty, tz) { const pl = game.player, dx = tx - pl.x, dy = ty - (pl.y + pl.eye), dz = tz - pl.z; pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
      put(x, y, z, opts) { Object.assign(game.player, { x, y, z, vx: 0, vy: 0, vz: 0, fallDist: 0, flying: false }, opts || {}); },
      hold(id, count, extra) { const pl = game.player; pl.inv[0] = id ? Object.assign({ id, count: count || 1 }, extra || {}) : null; pl.sel = 0; game.ui.dirty = true; },
      count(id) { return game.player.inv.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0); },
      ents(type) { return game.entities.filter(e => !e.removed && e.type === type); },
      tap() { game.input.use = true; game.input.usePressed = true; game.input.useOnce = true; },
      chat(re) { return Array.from(document.querySelectorAll('#chat-log div')).some(d => re.test(d.textContent)); },
      // a robot driver: it steers along the track of the race going on
      drive(on) {
        clearInterval(window.__ad); game.input.fwd = false; game.input.joyX = 0;
        if (!on) return;
        window.__seen = { boost: 0, pickup: 0, top: 0, used: 0 };
        window.__ad = setInterval(() => {
          const v = game.player.riding, R = RACE;
          if (!v || !R || R.state !== 'run' || R.me.fin) { game.input.fwd = false; game.input.joyX = 0; return; }
          const tr = R.tr, N = tr.N, cur = ((Math.floor(R.me.d) % N) + N) % N, a = tr.pts[(cur + 9) % N];
          const wantYaw = Math.atan2(-(a[0] - v.x), -(a[1] - v.z)), yaw = v.type === 'saucer' ? game.player.yaw : v.yaw, d = ((wantYaw - yaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
          game.input.fwd = true; game.input.joyX = clamp(-d * 2.5, -1, 1);
          const S = window.__seen;
          if (v.boostT > 0) S.boost = 1;
          S.top = Math.max(S.top, Math.hypot(v.vx, v.vz));
          if (R.me.pickup) { S.pickup = 1; if (!S.tapT || performance.now() - S.tapT > 1500) { S.tapT = performance.now(); S.used++; T.tap(); } }
        }, 16);
      },
    };
  });
  await sleep(5000);   // (the host puts out the rocket, the saucer, the buggies and the Martians)
  const goto = async (x, y, z, opts) => {
    await E(a => T.put(a[0], a[1], a[2], a[3]), [x, y, z, opts || null]);
    await waitFor(a => game.world.readyAround(a[0], a[1], 2) >= 1, 60000, [x, z]);
    await sleep(600);
  };
  if (process.env.DBG) console.log(JSON.stringify(await E(new Function('return (async () => {' + process.env.DBG + '})()'))));

  if (on('air')) {
    // ---------- Air Makers: your base dome, breathing, and greening Mars ----------
    const M = await E(() => game.gen.marsw);
    const b = M.base, Y = M.town.y + 1;
    await goto(b.x - 2.5, Y, b.z + 0.5);
    const base = await E(a => {
      const wd = game.world, nm = (x, y, z) => BLOCKS[wd.getBlock(x, y, z)].name, t = wd.getTile(a.x + 4, a.Y, a.z + 1, 'chest');
      return { maker: nm(a.x, a.Y, a.z), glass: nm(a.x, a.Y + a.r, a.z), floor: nm(a.x + 2, a.Y - 1, a.z), table: nm(a.x + 3, a.Y, a.z - 3), chest: nm(a.x + 4, a.Y, a.z + 1), door: nm(a.x - a.r, a.Y, a.z),
        loot: t ? t.slots.filter(Boolean).map(s => itemName(s.id) + (s.count > 1 ? ' x' + s.count : '')).sort() : null, glow: BLOCKS[B.AIR_MAKER].emit, vb: game.overVB };
    }, { x: b.x, z: b.z, r: b.r, Y });
    check('your base: a glass dome by the landing pads with an Air Maker, a crafting table and a chest', base.maker === 'Air Maker' && base.glass === 'Glass' && /Planks/.test(base.floor) && base.table === 'Crafting Table' && base.chest === 'Chest' && base.door === 'Air' && base.glow > 0 && base.vb.length === 0, base);
    check('the chest has things to start with: two more Air Makers, a Blip egg, sandboards, saplings and food', !!base.loot && ['Air Maker x2', 'Blip Egg', 'Sandboard x2', 'Oak Sapling x4', 'Apple x8'].every(n => base.loot.includes(n)), base.loot);
    await shot('base');
    const air = await E(a => {
      const pl = game.player, h = pl.inv[ARMOR_INV]; pl.inv[ARMOR_INV] = null; window.__helm = h;
      const inside = { bubble: inAirBubble(pl), breathe: canBreatheHere(pl) };
      const o = { inside, out: canBreatheHere({ x: a.x + 30, y: a.Y, z: a.z + 30, inv: [] }), dome: (d => canBreatheHere({ x: d[0] + 0.5, y: a.Y, z: d[1] + 0.5, inv: [] }))(game.gen.marsw.domes[0]), edge: [inAirBubble({ x: a.x + 8.5, y: a.Y, z: a.z + 0.5 }), inAirBubble({ x: a.x + 12.5, y: a.Y, z: a.z + 0.5 })] };
      return new Promise(res => setTimeout(() => { o.airIn = pl.air; o.hp = pl.health; o.said = window.__toasts.some(t => /There is air here/.test(t)); res(o); }, 4000));
    }, { x: b.x, z: b.z, Y });
    check('inside the bubble you can breathe without a helmet (and it says so); outside you cannot; the Martians\' domes have air too', air.inside.bubble && air.inside.breathe && air.out === false && air.dome === true && air.edge[0] && !air.edge[1] && air.airIn === 10 && air.hp === 20 && air.said, air);
    await E(a => T.put(a.x - 20.5, a.Y, a.z + 0.5), { x: b.x, z: b.z, Y });
    await sleep(4500);
    const outside = await E(() => { const pl = game.player, o = { air: pl.air, said: window.__toasts.some(t => /Out of the air bubble: put your helmet on/.test(t)) }; pl.inv[ARMOR_INV] = window.__helm; pl.air = 10; pl.health = 20; return o; });
    check('walk out with no helmet and your air runs down (and it warns you)', outside.air < 10 && outside.said, outside);
    const green = await E(a => {
      const wd = game.world, count = () => { let g = 0, f = 0; for (let x = a.x - 10; x <= a.x + 10; x++) for (let z = a.z - 10; z <= a.z + 10; z++) for (let y = a.Y - 3; y <= a.Y + 3; y++) { const id = wd.getBlock(x, y, z); if (id === B.GRASS) g++; else if (id === B.TALL_GRASS || id === B.DANDELION || id === B.POPPY || id === B.CORNFLOWER) f++; } return [g, f]; };
      T.put(a.x - 2.5, a.Y, a.z + 0.5);
      const before = count();
      for (let i = 0; i < 400; i++) { AIRM.greenT = 0; airTick(game, 0.016); }
      const after = count(), far = wd.getBlock(a.x + 14, a.Y - 1, a.z) === B.GRASS;
      return { before, after, far };
    }, { x: b.x, z: b.z, Y });
    check('the Air Maker turns the red dust green: grass, and then flowers', green.after[0] > green.before[0] + 40 && green.after[1] > 3 && !green.far, green);
    await sleep(1200);
    await E(() => { game.player.yaw = -Math.PI / 2; game.player.pitch = -0.3; });
    await sleep(600);
    await shot('green');
    const own = await E(a => { const wd = game.world, x = a.x - 34, z = a.z - 12; wd.setBlock(x, a.Y, z, B.AIR_MAKER, 0); AIRM.t = -9; const o = { near: inAirBubble({ x: x + 5.5, y: a.Y, z: z + 0.5 }), far: inAirBubble({ x: x + 14.5, y: a.Y, z: z + 0.5 }) }; wd.setBlock(x, a.Y, z, B.AIR, 0); AIRM.t = -9; o.gone = inAirBubble({ x: x + 5.5, y: a.Y, z: z + 0.5 }); return o; }, { x: b.x, z: b.z, Y });
    check('an Air Maker you put down makes its own bubble, ten blocks round (and it goes when the machine does)', own.near && !own.far && !own.gone, own);
    const rec = await E(() => ({ maker: (o => o && o.out === B.AIR_MAKER)(matchRecipe([I.IRON_INGOT, B.GLASS, I.IRON_INGOT, B.GLASS, I.MARS_CRYSTAL, B.GLASS, I.IRON_INGOT, B.GLASS, I.IRON_INGOT], 3)), board: (o => o && o.out === I.SANDBOARD)(matchRecipe([B.OAK_PLANKS, I.MARS_CRYSTAL, B.OAK_PLANKS, 0, 0, 0, 0, 0, 0], 3)),
      items: [B.AIR_MAKER, B.METEORITE, I.ALIEN_EGG, I.SANDBOARD].map(id => ({ name: itemName(id), icon: !!ICONS[id], creative: CREATIVE_LIST.includes(id) })) }));
    check('an Air Maker is made from iron and glass round a Mars Crystal; the new things have names and pictures', rec.maker && rec.board && rec.items.every(o => o.icon && o.creative) && rec.items.map(o => o.name).join() === 'Air Maker,Meteorite,Blip Egg,Sandboard', rec);
  }

  if (on('pet')) {
    // ---------- the alien pet ----------
    const M = await E(() => game.gen.marsw);
    const Y = M.town.y + 1, at = [6.5, Y, 16.5];
    await goto(at[0], at[1], at[2]);
    const egg = await E(a => { const pl = game.player; for (const e of T.ents('blip')) e.removed = true; T.hold(I.ALIEN_EGG, 2); window.__toasts.length = 0; T.aim(a[0] + 2, a[1], a[2]); T.tap(); return new Promise(res => setTimeout(() => { const e = T.ents('blip')[0]; res(e ? { stage: e.stage, mine: e.owner === PROFILE.pid, left: T.count(I.ALIEN_EGG), model: !!MODELS.alienegg && !!MODELS.blip_0, said: window.__toasts.some(t => /Blip egg/.test(t)), d: Math.hypot(e.x - pl.x, e.z - pl.z) } : null); }, 600)); }, at);
    check('tap the ground with a Blip egg: the egg sits there, yours', !!egg && egg.stage === 0 && egg.mine && egg.left === 1 && egg.model && egg.said && egg.d < 4, egg);
    await E(() => { const e = T.ents('blip')[0]; T.aim(e.x, e.y + 0.3, e.z); });
    await sleep(400);
    await shot('egg');
    await E(() => { T.ents('blip')[0].hatchT = 0.6; window.__toasts.length = 0; });
    await sleep(1500);
    const baby = await E(() => { const e = T.ents('blip')[0]; return { stage: e.stage, said: window.__toasts.some(t => /hatched: it is a baby Blip/.test(t)) }; });
    check('after a while it hatches into a baby Blip', baby.stage === 1 && baby.said, baby);
    await E(a => T.put(a[0] + 9, a[1], a[2] + 4), at);
    await sleep(5000);
    const follow = await E(() => { const e = T.ents('blip')[0], pl = game.player; return Math.hypot(e.x - pl.x, e.z - pl.z); });
    check('it follows you about', follow < 4.5, follow);
    await E(() => { const e = T.ents('blip')[0]; T.aim(e.x, e.y + 0.3, e.z); });
    await sleep(400);
    await shot('blip');
    const feed = async () => { await E(() => { const e = T.ents('blip')[0], pl = game.player; T.aim(e.x, e.y + 0.25, e.z); pl.useCd = 0; T.tap(); }); await sleep(700); };
    await E(() => { T.hold(I.APPLE, 5); window.__toasts.length = 0; });
    await feed();
    const one = await E(() => { const e = T.ents('blip')[0]; return { fed: e.fed, stage: e.stage, happy: e.happy > 0, apples: T.count(I.APPLE), hearts: PARTICLES.some(q => q.tile === TILE.heart_p), target: game.player.targetEnt && game.player.targetEnt.type }; });
    check('feed it an apple: it is happy (little hearts), and one meal nearer to growing up', one.fed === 1 && one.stage === 1 && one.happy && one.apples === 4, one);
    await feed(); await feed();
    const grown = await E(() => { const e = T.ents('blip')[0]; return { fed: e.fed, stage: e.stage, apples: T.count(I.APPLE), said: window.__toasts.some(t => /Your Blip grew up/.test(t)) }; });
    check('three meals and it grows up', grown.stage === 2 && grown.fed === 3 && grown.apples === 2 && grown.said, grown);
    await E(() => { T.hold(null); window.__toasts.length = 0; });
    await feed();
    const sit = await E(() => { const e = T.ents('blip')[0]; return { sit: e.sit, said: window.__toasts.some(t => /sits down to wait/.test(t)), x: e.x, z: e.z }; });
    await E(a => T.put(a[0], a[1], a[2]), at);
    await sleep(3500);
    const stay = await E(s => { const e = T.ents('blip')[0]; return Math.hypot(e.x - s.x, e.z - s.z); }, sit);
    check('tap it with an empty hand: it sits and waits where it is', sit.sit && sit.said && stay < 1, { sit, stay });
    await E(() => { const e = T.ents('blip')[0]; T.put(e.x + 1.5, e.y, e.z); });
    await sleep(400);
    await feed();
    await E(() => { const e = T.ents('blip')[0]; e.digT = 0.3; window.__toasts.length = 0; for (const q of T.ents('item')) q.removed = true; });
    await sleep(1500);
    const dig = await E(() => { const e = T.ents('blip')[0]; return { sit: e.sit, crystal: T.ents('item').some(q => q.id === I.MARS_CRYSTAL) || T.count(I.MARS_CRYSTAL) > 0, said: window.__toasts.some(t => /dug up a Mars Crystal/.test(t)) }; });
    check('tap again and it follows; a grown Blip digs up a Mars Crystal now and then', !dig.sit && dig.crystal && dig.said, dig);
    await E(a => T.put(a[0] - 44, a[1], a[2] + 30), at);
    await waitFor(() => game.world.readyAround(game.player.x, game.player.z, 1) >= 1, 30000);
    await sleep(3000);
    const hop = await E(() => { const e = T.ents('blip')[0], pl = game.player; return Math.hypot(e.x - pl.x, e.z - pl.z); });
    check('left far behind, it pops up beside you', hop < 6, hop);
    const keep = await E(() => {
      const e = T.ents('blip')[0], hp = e.hp; hurtMob(game, e, 9, game.player.x, game.player.z, 'player');
      const saved = saveRobots(game).filter(r => r.k === 'pet'), n0 = T.ents('blip').length;
      e.removed = true; loadRobots(game, JSON.parse(JSON.stringify(saved)));
      const b = T.ents('blip')[0];
      return { unhurt: e.hp === hp && !e.dead, saved: saved.length, n0, back: !!b && b.stage === 2 && b.fed === 3 && b.owner === PROFILE.pid && b.variant === e.variant, along: takeRobots(game).filter(r => r.k === 'pet').length };
    });
    check('nothing hurts it; it is saved with the world, and comes along when you travel', keep.unhurt && keep.saved === 1 && keep.back && keep.along === 1, keep);
    const gift = await E(() => { const pl = game.player, m = spawnMob(game, 'martian', pl.x + 1.5, pl.y, pl.z); m.variant = 0; game.stats.martians = 2; game.stats.eggGift = 0; T.hold(I.APPLE, 1); const n0 = T.count(I.ALIEN_EGG); martianTap(game, pl, m, I.APPLE, false); m.removed = true; return { eggs: T.count(I.ALIEN_EGG) - n0, flag: game.stats.eggGift, chance: MARS_GIFTS().some(g => g[0] === I.ALIEN_EGG) }; });
    check('the third present a Martian gives you is a Blip egg', gift.eggs === 1 && gift.flag === 1 && gift.chance, gift);
  }

  if (on('ruins')) {
    // ---------- ancient ruins ----------
    const R0 = await E(() => { const M = game.gen.marsw, pl = game.player, n = game.gen.nearestRuin(0, 0, []); return { n: M.ruins.length, far: M.ruins.map(r => Math.round(Math.hypot(r.x, r.z))), near: n, skip: game.gen.nearestRuin(0, 0, [n.id]).id !== n.id, hint: ruinHint(game, 0, 0) }; });
    check('five ruins lie out in the wilderness, a good walk from town, and a Martian can tell you the way', R0.n === 5 && R0.far.every(d => d > 90 && d < 170) && !!R0.near && R0.skip && R0.hint && R0.hint.d > 90 && /north|south|east|west/.test(R0.hint.dir), R0);
    const loc = await E(() => { game.runCommand('/locate ruins'); return [...document.querySelectorAll('#chat-log div')].map(d => d.textContent).filter(t => /nearest ruins/.test(t)).pop(); });
    check('/locate ruins says where the nearest are', /The nearest ruins are \d+ blocks (north|south|east|west)/.test(loc || ''), loc);
    await goto(R0.near.x + 0.5, 90, R0.near.z + 12.5, { flying: true });
    await E(() => { game.mode = 'creative'; game.player.yaw = 0; game.player.pitch = -0.6; window.__r0 = game.stats.ruins | 0; });
    await sleep(2500);
    await shot('ruin');
    const ru = await E(r => {
      const wd = game.world, h = game.gen.marsGround(game.seed, r.x, r.z), Y = h + 1, nm = (x, y, z) => BLOCKS[wd.getBlock(x, y, z)].name;
      const t = wd.getTile(r.x, Y + 1, r.z, 'chest');
      return { chest: nm(r.x, Y + 1, r.z), dais: nm(r.x + 1, Y, r.z + 1), lamp: nm(r.x + 1, Y + 1, r.z), head: nm(r.x, Y + 3, r.z - 4), eye: nm(r.x - 1, Y + 3, r.z - 3), arch: nm(r.x, Y + 5, r.z + 7), floor: nm(r.x + 3, h, r.z + 2),
        loot: t ? t.slots.filter(Boolean).map(s => itemName(s.id)) : null, book: t ? (t.slots.find(s => s && s.id === I.WRITTEN_BOOK) || {}).tag : null };
    }, R0.near);
    check('ruins: a stone floor, an arch, a statue of a Martian\'s head, and a chest between two lamps', ru.chest === 'Chest' && /Quartz/.test(ru.dais) && ru.lamp === 'Glowstone' && ru.head === 'Lime Wool' && ru.eye === 'Black Wool' && ru.arch === 'Stone Bricks' && /Stone Bricks|Cobblestone|Mars Dust/.test(ru.floor), ru);
    check('the chest holds treasure, and a tablet the old Martians wrote', !!ru.loot && ru.loot.includes('Mars Crystal') && ru.loot.includes('Coin') && !!ru.book && /Tablet/.test(ru.book.book.title) && ru.book.book.author === 'The Old Martians' && ru.book.book.pages.length >= 4, { loot: ru.loot, title: ru.book && ru.book.book.title });
    await E(r => { game.mode = 'survival'; T.put(r.x + 0.5, game.gen.marsGround(game.seed, r.x, r.z) + 1, r.z + 4.5); }, R0.near);
    await sleep(1500);
    const found = await E(() => ({ bits: game.stats.ruins | 0, before: window.__r0, said: T.chat(/You found ancient Martian ruins! \(1 of 5\.\)/), next: ruinHint(game, game.player.x, game.player.z) }));
    check('walk into them and they are found (1 of 5); the next hint is for other ruins', found.before === 0 && found.bits > 0 && found.said && found.next && found.next.d > 60, found);
  }

  if (on('sky')) {
    // ---------- meteor showers and dust storms ----------
    await goto(0.5, 59, 10.5);
    const sh = await E(() => { game.world.time = 0.7; MARS2.nightDone = -1; const r0 = Math.random; Math.random = () => 0.1; skyTick(game, 0.016); Math.random = r0; return { shower: MARS2.showerT > 0, land: MARS2.landT > 0, said: T.chat(/A meteor shower! Look up/), done: MARS2.nightDone === game.day }; });
    await sleep(1500);
    const streaks = await E(() => PARTICLES.filter(q => q.tile === TILE.laser_5 && q.y > game.player.y + 15).length);
    check('at night a meteor shower starts: streaks cross the sky', sh.shower && sh.land && sh.said && sh.done && streaks > 3, { sh, streaks });
    await E(() => { game.player.pitch = 0.7; });
    await sleep(700);
    await shot('meteors');
    await E(() => { MARS2.landT = 0.05; });
    const landed = await waitFor(() => T.chat(/A meteorite landed about \d+ blocks to the/), 10000);
    const met = await E(() => {
      const wd = game.world, pl = game.player; let at = null;
      for (let x = Math.floor(pl.x) - 48; x <= pl.x + 48 && !at; x++) for (let z = Math.floor(pl.z) - 48; z <= pl.z + 48 && !at; z++) for (let y = 40; y < 90; y++) if (wd.getBlock(x, y, z) === B.METEORITE) { at = [x, y, z]; break; }
      const drops = blockDrops(B.METEORITE, 0, null).map(d => itemName(d[0]));
      return { at, d: at && Math.hypot(at[0] - pl.x, at[2] - pl.z), glow: BLOCKS[B.METEORITE].emit, drops, hp: pl.health };
    });
    check('a meteorite lands a little way off (never near anyone): a glowing rock with a present inside', landed && !!met.at && met.d >= 16 && met.d < 50 && met.glow > 0 && met.drops[0] === 'Mars Crystal' && met.drops.length === 2 && met.hp === 20, met);
    await E(() => { game.world.time = 0.3; game.player.pitch = 0; });
    const fog0 = await E(() => R.fogEnd);
    await E(() => wxSet('rain'));
    await sleep(6000);
    const storm = await E(() => ({ dust: MARS2.dust, fog: R.fogEnd, said: T.chat(/A dust storm is blowing in/), blowing: PARTICLES.filter(q => q.tile === TILE.mars_dust_p).length, hp: game.player.health, rain: WX.amt }));
    await shot('storm');
    check('a dust storm blows in: dust flies past and you cannot see far, but nobody is hurt (and it is not rain)', storm.dust > 0.6 && storm.fog < fog0 * 0.65 && storm.said && storm.blowing > 10 && storm.hp === 20 && storm.rain === 0, { fog0, storm });
    await E(() => wxSet('clear'));
    const over = await waitFor(() => MARS2.dust < 0.05 && T.chat(/The dust storm has blown over/), 30000);
    check('and it blows over', over && await E(f => R.fogEnd > f * 0.9, fog0));
  }

  if (on('ball')) {
    // ---------- bounce ball ----------
    const M = await E(() => game.gen.marsw);
    const f = M.field, Y = M.town.y + 1;
    await goto(f.x + 0.5, Y, f.z + 4.5);
    await sleep(1500);
    const fld = await E(a => { const wd = game.world, nm = (x, y, z) => BLOCKS[wd.getBlock(x, y, z)].name, b = T.ents('marsball')[0]; return { grass: nm(a.x + 4, a.Y - 1, a.z + 3), line: nm(a.x, a.Y - 1, a.z + 2), red: nm(a.x - a.hx - 1, a.Y + 3, a.z), blue: nm(a.x + a.hx + 1, a.Y + 3, a.z), net: nm(a.x - a.hx - 2, a.Y, a.z), wall: nm(a.x, a.Y, a.z + a.hz + 1), ball: b ? [b.x - a.x - 0.5, b.z - a.z - 0.5].map(Math.round) : null, n: T.ents('marsball').length }; }, { x: f.x, z: f.z, hx: f.hx, hz: f.hz, Y });
    check('the field: green with white lines, a low wall, a red goal and a blue goal, and a ball in the middle', fld.grass === 'Lime Wool' && fld.line === 'White Wool' && fld.red === 'Red Wool' && fld.blue === 'Blue Wool' && fld.net === 'Iron Bars' && /Quartz/.test(fld.wall) && fld.n === 1 && !!fld.ball && fld.ball.join() === '0,0', fld);
    await E(a => { const b = T.ents('marsball')[0]; Object.assign(b, { x: a.x + 0.5, y: a.Y, z: a.z + 0.5, vx: 0, vy: 0, vz: 0 }); T.put(a.x + 0.5, a.Y, a.z + 3.5); game.player.yaw = 0; }, { x: f.x, z: f.z, Y });
    await sleep(600);
    await E(() => { game.input.fwd = true; });
    await sleep(1500);
    const bump = await E(a => { game.input.fwd = false; const b = T.ents('marsball')[0]; return { dz: b.z - a.z - 0.5, top: b.y - a.Y }; }, { z: f.z, Y });
    check('walk into the ball and it bounces away from you', bump.dz < -1.5, bump);
    await shot('ball');
    await sleep(3000);
    const punch = await E(a => { const b = T.ents('marsball')[0], pl = game.player; Object.assign(b, { x: a.x + 0.5, y: a.Y, z: a.z + 0.5, vx: 0, vy: 0, vz: 0, kickT: 0 }); T.put(a.x + 0.5, a.Y, a.z + 3.5); hurtMob(game, b, 2, pl.x, pl.z, 'player'); return new Promise(res => { let top = 0, far = 0; const iv = setInterval(() => { top = Math.max(top, b.y - a.Y); far = Math.min(far, b.z - a.z - 0.5); }, 30); setTimeout(() => { clearInterval(iv); res({ top, far, hp: b.hp, dead: !!b.dead, score: BALL.score.join() }); }, 2500); }); }, { x: f.x, z: f.z, Y });
    check('a punch sends it flying high (Mars has low gravity), and it bounces', punch.top > 1.8 && punch.far < -3 && !punch.dead && punch.score === '0,0', punch);
    const goal = await E(a => { const b = T.ents('marsball')[0]; Object.assign(b, { x: a.x - a.hx + 2.5, y: a.Y, z: a.z + 0.5, vx: -9, vy: 1, vz: 0, kickT: 1 }); T.put(a.x + 6.5, a.Y, a.z + 4.5); return new Promise(res => setTimeout(() => res({ score: BALL.score.slice(), said: T.chat(/GOAL! Blue scores\. Red 0 - 1 Blue/), back: Math.hypot(b.x - a.x - 0.5, b.z - a.z - 0.5) }), 2500)); }, { x: f.x, z: f.z, hx: f.hx, Y });
    check('into the red goal: GOAL! A point for Blue, and the ball goes back to the middle', goal.score.join() === '0,1' && goal.said && goal.back < 2, goal);
    const goal2 = await E(a => { const b = T.ents('marsball')[0]; Object.assign(b, { x: a.x + a.hx - 1.5, y: a.Y, z: a.z + 0.5, vx: 9, vy: 1, vz: 0, kickT: 1 }); return new Promise(res => setTimeout(() => res({ score: BALL.score.slice(), said: T.chat(/GOAL! Red scores\. Red 1 - 1 Blue/) }), 2500)); }, { x: f.x, z: f.z, hx: f.hx, Y });
    check('and into the blue goal is a point for Red', goal2.score.join() === '1,1' && goal2.said, goal2);
    const away = await E(a => { const b = T.ents('marsball')[0]; Object.assign(b, { x: a.x + 80, y: a.Y + 30, z: a.z, vx: 0, vy: 0, vz: 0 }); return new Promise(res => setTimeout(() => res(Math.hypot(b.x - a.x - 0.5, b.z - a.z - 0.5)), 1200)); }, { x: f.x, z: f.z, Y });
    check('a ball that gets lost comes back to the middle', away < 2, away);
  }

  if (on('board')) {
    // ---------- the sandboard ----------
    const s = await E(() => {   // a slope of dust to slide down: twelve steps, then a long flat
      const wd = game.world, x0 = 140, z0 = 60, top = 84;
      return { x0, z0, top };
    });
    await goto(s.x0 + 0.5, s.top + 3, s.z0 + 0.5, { flying: true });
    await E(s => {
      const wd = game.world;
      for (let k = 0; k <= 120; k++) { const y = k < 12 ? s.top : k < 36 ? s.top - Math.floor((k - 12) / 2) - 1 : s.top - 12; for (let dx = -3; dx <= 3; dx++) { for (let yy = y + 1; yy <= s.top + 5; yy++) wd.setBlock(s.x0 + dx, yy, s.z0 - k, B.AIR, 0); wd.setBlock(s.x0 + dx, y, s.z0 - k, B.MARS_DUST, 0); wd.setBlock(s.x0 + dx, y - 1, s.z0 - k, B.MARS_ROCK, 0); } }
      T.put(s.x0 + 0.5, s.top + 1, s.z0 - 0.5);
    }, s);
    await sleep(800);
    const put = await E(s => { T.hold(I.SANDBOARD, 1); T.aim(s.x0 + 0.5, s.top + 1, s.z0 - 2.5); game.player.useCd = 0; T.tap(); return new Promise(res => setTimeout(() => { const v = T.ents('sandboard')[0]; res(v ? { left: T.count(I.SANDBOARD), model: !!MODELS.sandboard, code: VEHICLES.sandboard.code } : null); }, 500)); }, s);
    check('a sandboard from your bag goes down on the ground', !!put && put.left === 0 && put.model && put.code === -21, put);
    const on1 = await E(() => { const v = T.ents('sandboard')[0]; v.yaw = 0; window.__toasts.length = 0; mountVehicle(game, v); const pl = game.player; return { riding: pl.riding === v, kind: rideKind(v), tip: window.__toasts.some(t => /slide/.test(t)), up: pl.y - v.y }; });
    check('tap it and you stand on it', on1.riding && on1.kind === 'board' && on1.tip && on1.up > 0.05 && on1.up < 0.4, on1);
    await E(() => { game.input.fwd = true; game.view = 1; });
    await sleep(1300);
    const flat = await E(() => { const v = game.player.riding; return Math.hypot(v.vx, v.vz); });
    const run = await E(s => new Promise(res => { let top = 0; const v = game.player.riding, iv = setInterval(() => { top = Math.max(top, Math.hypot(v.vx, v.vz)); if (v.z < s.z0 - 40 || performance.now() - t0 > 20000) { clearInterval(iv); game.input.fwd = false; res({ top, z: s.z0 - v.z, y: s.top - v.y }); } }, 30), t0 = performance.now(); }), s);
    await shot('board');
    check('a push gets you going slowly; down the dune every drop makes you faster', flat > 1 && flat < 6.5 && run.top > 9 && run.z >= 40 && run.y > 10, { flat, run });
    await E(() => { game.input.back = true; });
    await sleep(2000);
    const stop = await E(() => { game.input.back = false; const v = game.player.riding; return Math.hypot(v.vx, v.vz); });
    await E(() => { game.input.sneak = true; });
    await sleep(400);
    const off = await E(() => { game.input.sneak = false; game.view = 0; return { off: !game.player.riding, hp: game.player.health }; });
    check('pull back to slow down, and Sneak to step off', stop < 2 && off.off && off.hp === 20, { stop, off });
  }

  if (on('track')) {
    // ---------- Dune Dash, the third track; and worlds from before ----------
    const tr = await E(() => { const t = game.gen.marsTracks()[2], M = game.gen.marsw; return { name: t.name, id: t.id, N: t.N, laps: t.laps, loop: Math.hypot(t.pts[0][0] - t.pts[t.N - 1][0], t.pts[0][1] - t.pts[t.N - 1][1]), g: t.garage, s: t.pts[t.N - 8], ys: [...new Set(t.pts.map(q => q[2]))].length, boxes: t.boxes.length, n: game.gen.marsTracks().length }; });
    check('a third track, Dune Dash: a closed loop with ramps, a dip, a tunnel, boost pads and boxes', tr.n === 3 && tr.name === 'Dune Dash' && tr.id === 'mtrack2' && tr.N > 220 && tr.loop < 1.6 && tr.laps === 3 && tr.ys > 4 && tr.boxes === 3, tr);
    await goto(tr.g[0] + 0.5, 60, tr.g[1] + 6.5);
    await sleep(2500);
    const g = await E(a => {
      const wd = game.world, M = game.gen.marsw, Y = M.town.y, m = T.ents('martian').find(e => e.marshal === 2);
      let hole = 0; for (let x = a.g[0] - 9; x <= a.g[0] - 2; x++) for (let z = a.g[1] - 9; z <= a.g[1] + 3; z++) { const top = wd.getBlock(x, Y, z), ab = wd.getBlock(x, Y + 1, z); if (!SOLID[top] && !SOLID[wd.getBlock(x, Y - 1, z)]) hole++; }
      return { buggies: T.ents('buggy').filter(e => Math.hypot(e.x - a.g[0], e.z - a.g[1]) < 6).length, marshal: !!m, roof: BLOCKS[wd.getBlock(a.g[0], Y + 5, a.g[1])].name, road: BLOCKS[wd.getBlock(Math.floor(a.s[0]), a.s[2], Math.floor(a.s[1]))].name, hole };
    }, tr);
    check('it has its own garage of buggies and a marshal, and the way from the garage to the track is level', g.buggies === 3 && g.marshal && /Quartz/.test(g.roof) && g.road === 'Race Track' && g.hole === 0, g);
    await shot('track3');
    await E(a => { const v = T.ents('buggy').filter(e => !e.rider).sort((p, q) => Math.hypot(p.x - a.g[0], p.z - a.g[1]) - Math.hypot(q.x - a.g[0], q.z - a.g[1]))[0]; mountVehicle(game, v); Object.assign(v, { x: a.s[0], y: a.s[2] + 1.2, z: a.s[1], vx: 0, vz: 0 }); }, tr);
    await sleep(600);
    const st = await E(() => { const ok = raceStart(game, 2, 1); if (RACE) RACE.laps = 1; return { ok, track: RACE && RACE.tr.name }; });
    await waitFor(() => RACE && RACE.state === 'run', 15000);
    await E(() => T.drive(true));
    const fin = await waitFor(() => RACE && RACE.me.place > 0, 150000);
    const f = await E(() => { T.drive(false); return { best: game.stats.raceBest, fin: RACE && RACE.me.fin }; });
    check('a race round Dune Dash, start to finish', st.ok && st.track === 'Dune Dash' && fin && f.best && f.best[2] > 10, { st, f });
    await waitFor(() => !RACE, 30000);
    // a Mars world from before this update: the new things stay out of wherever something was built
    const old = await E(() => {
      const G = game.gen, M = G.marsw, seed = game.seed, ch = (x, z) => [Math.floor(x / 16), Math.floor(z / 16)], has = (cx, cz, vb, id) => G.generateChunk('marsworld', seed, cx, cz, null, vb).blocks.includes(id);
      const b = ch(M.base.x, M.base.z), f = ch(M.field.x, M.field.z), r = ch(M.ruins[0].x, M.ruins[0].z), t = G.marsTracks()[2], q = ch(t.pts[100][0], t.pts[100][1]);
      return { base: G.marsTouching(seed, [b]), field: G.marsTouching(seed, [f]), ruin: G.marsTouching(seed, [r]), track: G.marsTouching(seed, [q]), none: G.marsTouching(seed, [[40, 40]]), spawn: G.marsTouching(seed, [[0, 0]]),
        with: has(b[0], b[1], [], B.AIR_MAKER), without: has(b[0], b[1], ['mbase'], B.AIR_MAKER), road: has(q[0], q[1], [], B.TRACK), noRoad: has(q[0], q[1], ['mtrack2'], B.TRACK), flag: JSON.parse(JSON.stringify({ a: 1 })).a };
    });
    check('in a Mars world from before, each new thing is left out where something was already built (and only there)', old.base.join() === 'mbase' && old.field.join() === 'mfield' && old.ruin.join() === 'mruin0' && old.track.includes('mtrack2') && old.none.length === 0 && old.spawn.length === 0 && old.with && !old.without && old.road && !old.noRoad, old);
  }

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
