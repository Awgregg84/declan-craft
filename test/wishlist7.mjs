// The seventh wish list: the Mars world, playing alone. Sections can be picked: node test/wishlist7.mjs world aliens saucer race
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
  const shot = async name => { await p.screenshot({ path: path.join(out, 'w7-' + name + '.png') }); };
  const cards = await E(() => { showScreen('scr-worlds'); buildWorldCards(); return [...document.querySelectorAll('#world-cards .card')].map(c => ({ h: c.querySelector('h3').textContent, pic: !!c.querySelector('canvas'), modes: c.querySelectorAll('.modes .btn').length })); });
  await shot('card');
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

  if (on('world')) {
    // ---------- a world of its own on Mars ----------
    check('there are eight world cards, and Mars is one of them, with a picture and both ways to play', cards.length === 8 && cards[6].h === 'Mars' && cards[6].pic && cards[6].modes === 2 && cards[7].h === 'Hardcore', cards.map(c => c.h));
    const w = await E(() => {
      const pl = game.player, M = game.gen.marsw, wd = game.world, by = t => T.ents(t);
      const sky = skyState(0.3, 'marsworld'), mars = skyState(0.3, 'mars'), valley = skyState(0.3, 'valley');
      return {
        map: game.mapId, dim: game.dim, name: MAPS.marsworld.name, at: [pl.x, pl.y, pl.z].map(Math.round), fromSpawn: Math.hypot(pl.x - M.spawn[0], pl.z - M.spawn[2]),
        below: BLOCKS[wd.getBlock(Math.floor(pl.x), Math.floor(pl.y) - 1, Math.floor(pl.z))].name, helmet: wearsSpaceHelmet(pl), breathe: canBreatheHere(pl), g: gravOf(wd.map),
        sky: JSON.stringify(sky.zenith) === JSON.stringify(mars.zenith) && JSON.stringify(sky.zenith) !== JSON.stringify(valley.zenith),
        hello: T.chat(/Welcome to Mars/), punch: T.chat(/Punch a tree/),
        rocket: by('rocket').map(e => Math.hypot(e.x - M.rocket[0] - 0.5, e.z - M.rocket[1] - 0.5)), saucer: by('saucer').map(e => Math.hypot(e.x - M.saucer[0] - 0.5, e.z - M.saucer[1] - 0.5)),
        buggies: M.tracks.map(tr => by('buggy').filter(e => Math.hypot(e.x - tr.garage[0], e.z - tr.garage[1]) < 6).length),
        martians: by('martian').filter(e => e.marshal === undefined).map(e => e.variant).sort().join(''), marshals: by('martian').filter(e => e.marshal !== undefined).map(e => e.marshal).sort().join(''),
        pads: [BLOCKS[wd.getBlock(M.rocket[0], M.town.y, M.rocket[1])].name, BLOCKS[wd.getBlock(M.saucer[0], M.town.y, M.saucer[1])].name],
      };
    });
    check('the Mars world: you start on red dust beside the landing pads, with a hello, in a space helmet', w.map === 'marsworld' && w.dim === 'over' && w.name === 'Mars' && w.fromSpawn < 4 && /Mars/.test(w.below) && w.helmet && w.breathe && w.hello && !w.punch, w);
    check('it has Mars\'s gravity and Mars\'s orange sky', w.g === 0.38 && w.sky, { g: w.g, sky: w.sky });
    check('your rocket is on its pad and a flying saucer on the next one', w.rocket.length === 1 && w.rocket[0] < 1 && w.saucer.length === 1 && w.saucer[0] < 1 && w.pads[0] !== w.pads[1], { rocket: w.rocket, saucer: w.saucer, pads: w.pads });
    check('three rover buggies wait in each track\'s garage', w.buggies.join() === '3,3', w.buggies);
    check('six Martians in three colours live in the village, and a race marshal stands at each track', w.martians === '001122' && w.marshals === '01', { martians: w.martians, marshals: w.marshals });
    await shot('start');
    const air = await E(() => { const pl = game.player, h = pl.inv[ARMOR_INV]; pl.inv[ARMOR_INV] = null; const off = canBreatheHere(pl); pl.inv[ARMOR_INV] = h; return { off, on: canBreatheHere(pl) }; });
    check('there is no air: without the helmet you cannot breathe', air.off === false && air.on === true, air);
    const wx = await E(() => { wxSet('thunder'); return new Promise(res => setTimeout(() => { const o = { on: WX.on, amt: WX.amt }; wxSet('clear'); res(o); }, 2500)); });
    check('it never rains on Mars', wx.on && wx.amt < 0.05, wx);
    const night = await E(() => { game.world.time = 0.8; return new Promise(res => setTimeout(() => { const o = { hostile: game.entities.filter(e => e.mob && !e.removed && MOB_DEFS[e.type].hostile).length, animals: game.entities.filter(e => e.mob && !e.removed && !MOB_DEFS[e.type].special).length }; game.world.time = 0.3; res(o); }, 6000)); });
    check('no monsters come out at night (only Martians live here)', night.hostile === 0 && night.animals === 0, night);
    const pick = await E(() => { pickPlanet(game, game.player, null, () => {}); const o = [...document.querySelectorAll('#planet-pick .planet-btn')].map(b => b.dataset.planet); document.querySelector('#planet-pick .planet-cancel').click(); return o; });
    check('the rocket still flies to the Moon, Jupiter and Uranus from here (not to Mars: you are there)', pick.join() === 'moon,jupiter,uranus', pick);
    // the village and the tracks
    const town = await E(() => {
      const M = game.gen.marsw, wd = game.world, Y = M.town.y, nm = (x, y, z) => BLOCKS[wd.getBlock(x, y, z)].name;
      const d = M.domes[4];
      return { floor: nm(d[0] + 2, Y, d[1]), glass: nm(d[0], Y + 6, d[1]), inside: nm(d[0] + 1, Y + 2, d[1]), plaza: nm(M.plaza[0] + 3, Y, M.plaza[1]), crystal: nm(M.plaza[0], Y + 2, M.plaza[1]) };
    });
    check('the village: glass domes with coloured floors round a plaza with a glowing crystal', /Wool/.test(town.floor) && town.glass === 'Glass' && town.inside === 'Air' && /Quartz/.test(town.plaza) && /Glass/.test(town.crystal), town);
    const tr0 = await E(() => game.gen.marsTracks().map(tr => ({ name: tr.name, N: tr.N, laps: tr.laps, loop: Math.hypot(tr.pts[0][0] - tr.pts[tr.N - 1][0], tr.pts[0][1] - tr.pts[tr.N - 1][1]), ys: [...new Set(tr.pts.map(q => q[2]))].sort().join(), boost: tr.boost.reduce((a, b) => a + b, 0), tunnel: tr.tunnel.reduce((a, b) => a + b, 0), boxes: tr.boxes.length, start: tr.pts[0].slice(0, 2).map(Math.round) })));
    check('two race tracks, each a closed loop with boost pads, pickup boxes, a ramp and a tunnel (Crater Run has a dip too)', tr0.length === 2 && tr0[0].name === 'Canyon Loop' && tr0[1].name === 'Crater Run' && tr0.every(t => t.N > 300 && t.loop < 1.6 && t.laps === 3 && t.boost >= 8 && t.tunnel > 10 && t.boxes >= 2 && t.ys.includes(',')) && /5[4-7]/.test(tr0[1].ys), tr0);
    for (const ti of [0, 1]) {
      const s = tr0[ti].start;
      await goto(s[0] + 0.5, 70, s[1] + 0.5, { flying: true });
      const b = await E(ti => {
        const tr = game.gen.marsTracks()[ti], wd = game.world, at = (i, dy) => { const q = tr.pts[i]; return BLOCKS[wd.getBlock(Math.floor(q[0]), q[2] + (dy || 0), Math.floor(q[1]))].name; };
        const q = tr.pts[20], nx = tr.pts[21], l = Math.hypot(nx[0] - q[0], nx[1] - q[1]), side = [q[0] + (nx[1] - q[1]) / l * 5, q[1] - (nx[0] - q[0]) / l * 5];
        return { road: at(20), above: at(20, 1), line: at(0), arch: at(0, 6), barrier: BLOCKS[wd.getBlock(Math.floor(side[0]), q[2] + 1, Math.floor(side[1]))].name, rail: BLOCKS[wd.getBlock(Math.floor(side[0]), q[2] + 2, Math.floor(side[1]))].name };
      }, ti);
      check(tr0[ti].name + ': a dark road between red-and-white barriers, with a chequered start line under an arch', b.road === 'Race Track' && b.above === 'Air' && /Wool/.test(b.line) && /Wool/.test(b.arch) && /Wool/.test(b.barrier) && b.rail === 'Iron Bars', b);
    }
    const bp = await E(() => { const tr = game.gen.marsTracks()[0], i = tr.boost.indexOf(1) + 1, q = tr.pts[i]; return { i, at: [q[0], q[2], q[1]] }; });
    await goto(bp.at[0], bp.at[1] + 12, bp.at[2], { flying: true });
    const bb = await E(bp => { const wd = game.world, id = wd.getBlock(Math.floor(bp.at[0]), bp.at[1], Math.floor(bp.at[2])); return { name: BLOCKS[id].name, glow: BLOCKS[id].emit }; }, bp);
    check('boost pads glow on the track', bb.name === 'Boost Pad' && bb.glow > 0, bb);
    await E(() => { game.player.pitch = -1.2; });
    await sleep(1500);
    await shot('boost');
    const items = await E(() => [I.BUGGY, I.SAUCER, I.MARS_CRYSTAL, B.TRACK, B.BOOST].map(id => ({ name: itemName(id), icon: !!ICONS[id], creative: CREATIVE_LIST.includes(id) })));
    check('the buggy, the saucer, the Mars Crystal and the track blocks have names and pictures, and are in Creative', items.every(o => o.icon && o.creative) && items.map(o => o.name).join() === 'Rover Buggy,Flying Saucer,Mars Crystal,Race Track,Boost Pad', items.map(o => o.name));
  }

  if (on('aliens')) {
    // ---------- friendly Martians ----------
    const M = await E(() => game.gen.marsw);
    await goto(M.plaza[0] + 0.5, M.town.y + 1, M.plaza[1] + 3.5);
    const near = async () => E(() => {
      const pl = game.player, m = T.ents('martian').filter(e => e.marshal === undefined).sort((a, b) => Math.hypot(a.x - pl.x, a.z - pl.z) - Math.hypot(b.x - pl.x, b.z - pl.z))[0];
      m.aiT = 30; m.moving = false; m.fedAt = 0;
      const wd = game.world; let x = m.x, z = m.z + 1.6;
      for (const [dx, dz] of [[0, 1.6], [1.6, 0], [0, -1.6], [-1.6, 0]]) if (boxFree(wd, m.x + dx, m.y, m.z + dz, 0.3, 1.8) && !raycast(wd, m.x + dx, m.y + 1.2, m.z + dz, -dx / 1.6, 0, -dz / 1.6, 1.5)) { x = m.x + dx; z = m.z + dz; break; }
      T.put(x, m.y, z); T.aim(m.x, m.y + 0.8, m.z);
      return m.nid;
    });
    const mid = await near();
    await sleep(1200);
    const hi = await E(mid => { const m = game.entities.find(e => e.nid === mid); return { hello: T.chat(/^A Martian: "/), wave: m.waveT > 0, model: !!MODELS['martian_' + m.variant], h: m.h }; }, mid);
    check('a Martian says hello and waves when you come near', hi.hello && hi.wave && hi.model, hi);
    await shot('martian');
    const tapIt = async (id, n) => {
      await E(a => { const m = game.entities.find(e => e.nid === a[0]); T.put(game.player.x, game.player.y, game.player.z); T.aim(m.x, m.y + 0.8, m.z); T.hold(a[1], a[2]); window.__toasts.length = 0; window.__inv = game.player.inv.map(s => s ? s.id + ':' + s.count : '').join(); T.tap(); }, [mid, id, n]);
      await sleep(600);
      return E(() => ({ toasts: window.__toasts.slice(), held: T.count(game.player.inv[0] ? game.player.inv[0].id : -1), changed: window.__inv !== game.player.inv.map(s => s ? s.id + ':' + s.count : '').join(), target: game.player.targetEnt && game.player.targetEnt.type }));
    };
    const apple = await E(() => I.APPLE), stone = await E(() => B.STONE);
    const no = await tapIt(stone, 5);
    check('tap a Martian with something it does not want: it tells you what Martians like', no.toasts.some(t => /Martians love things from Earth/.test(t)) && !no.changed, no);
    const yes = await tapIt(apple, 3);
    const got = await E(() => ({ apples: T.count(I.APPLE), gifts: MARS_GIFTS().map(g => [itemName(g[0]), T.count(g[0])]).filter(g => g[1] > 0), n: game.stats.martians }));
    check('give a Martian an apple: it takes one and gives you a present from Mars', yes.toasts.some(t => /^The Martian gave you /.test(t)) && got.apples === 2 && got.gifts.length === 1 && got.n === 1, { yes: yes.toasts, got });
    const again = await tapIt(apple, 2);
    check('it needs a moment before the next present (nothing is taken)', again.toasts.some(t => /still admiring/.test(t)) && !again.changed, again.toasts);
    const food = await E(() => ({ ok: [I.APPLE, I.BREAD, B.POPPY, I.PIZZA].every(id => MARS_FOOD().includes(id)), no: MARS_FOOD().includes(B.STONE), crystal: MARS_GIFTS()[0][0] === I.MARS_CRYSTAL, sell: SHOP_SELL.some(q => q[0] === I.MARS_CRYSTAL && q[2] >= 5) }));
    check('Martians like apples, bread, flowers and pizza; a Mars Crystal is the usual present, and stores buy it', food.ok && !food.no && food.crystal && food.sell, food);
    const hurt = await E(mid => { const m = game.entities.find(e => e.nid === mid), hp = m.hp; hurtMob(game, m, 8, game.player.x, game.player.z, 'player'); return { hp, after: m.hp, dead: !!m.dead }; }, mid);
    check('nothing hurts a Martian', hurt.after === hurt.hp && !hurt.dead, hurt);
  }

  if (on('saucer')) {
    // ---------- the flying saucer and its tractor beam ----------
    const M = await E(() => game.gen.marsw);
    await goto(M.saucer[0] + 0.5, M.town.y + 1, M.saucer[1] + 3.5);
    const got = await E(() => { const v = T.ents('saucer')[0]; mountVehicle(game, v); return { riding: game.player.riding === v, flyer: isFlyer(v), seats: hasSeats(v) && seatCount(v), y: v.y, tip: window.__toasts.some(t => /tractor beam/.test(t)) }; });
    check('tap the saucer to get in (it tells you how to fly it)', got.riding && got.flyer && got.seats === 2 && got.tip, got);
    await E(() => { game.input.jump = true; });
    await sleep(1800);
    const up = await E(() => { game.input.jump = false; const v = game.player.riding; return { flying: v.flying, y: v.y }; });
    await sleep(2500);
    const hover = await E(() => { const v = game.player.riding; return { flying: v.flying, y: v.y }; });
    await sleep(1500);
    const hover2 = await E(() => { const v = game.player.riding; return { flying: v.flying, y: v.y }; });
    check('Jump takes it up, and it hovers when you let go', up.flying && up.y > got.y + 3 && hover.flying && hover2.flying && Math.abs(hover2.y - hover.y) < 0.6, { from: got.y, up, hover, hover2 });
    await E(() => { game.view = 1; });
    // a sheep on the ground below: the beam lifts it, carries it along, and sets it down unhurt
    const spot = [M.saucer[0] + 0.5, M.town.y + 1, M.saucer[1] - 6.5];
    const sheep = await E(spot => {
      const v = game.player.riding, e = spawnMob(game, 'sheep', spot[0], spot[1], spot[2]);
      Object.assign(v, { x: spot[0], y: spot[1] + 6, z: spot[2], vx: 0, vy: 0, vz: 0 });
      window.__toasts.length = 0; T.tap();
      return { nid: e.nid, hp: e.hp, beamable: beamable(e), big: beamable({ mob: true, w: 1.2, type: 'marshmallow' }), martian: beamable(T.ents('martian')[0]) };
    }, spot);
    await sleep(3500);
    const lift = await E(a => { const v = game.player.riding, e = game.entities.find(q => q.nid === a.nid); return { on: v.beamOn, held: v.beam === e && e.beamV === v, up: e.y - a.y, under: Math.hypot(e.x - v.x, e.z - v.z), below: v.y - e.y }; }, { nid: sheep.nid, y: spot[1] });
    check('a tap switches the tractor beam on: it lifts the sheep below up under the saucer', lift.on && lift.held && lift.up > 2 && lift.under < 0.6 && lift.below > 0.5 && sheep.beamable && !sheep.big && sheep.martian, { lift, sheep });
    await shot('beam');
    await E(() => { const v = game.player.riding; window.__mv = setInterval(() => { v.x += 0.12; }, 16); });
    await sleep(2500);
    const carry = await E(nid => { clearInterval(window.__mv); const v = game.player.riding, e = game.entities.find(q => q.nid === nid); return { moved: v.x, under: Math.hypot(e.x - v.x, e.z - v.z), held: e.beamV === v }; }, sheep.nid);
    check('fly along, and the sheep comes too', carry.held && carry.moved > spot[0] + 8 && carry.under < 4, carry);
    await sleep(800);
    await E(() => T.tap());
    await sleep(5000);
    const down = await E(a => { const v = game.player.riding, e = game.entities.find(q => q.nid === a.nid); return { on: v.beamOn, free: !e.beamV && !v.beam, hp: e.hp, dead: !!e.dead, ground: e.onGround, y: e.y - a.y }; }, { nid: sheep.nid, y: spot[1] });
    check('tap again: the beam goes off and the sheep floats down, not hurt at all', !down.on && down.free && down.hp === sheep.hp && !down.dead && down.ground && Math.abs(down.y) < 1.5, down);
    const seat = await E(() => { const v = game.player.riding, s = saucerSeat(v, 1), d = seatOf(v); return { below: v.y - s[1], drv: d[1] - v.y }; });
    check('a friend rides hanging in the beam under the saucer', seat.below > 2 && seat.drv > 0, seat);
    // land and get out
    await E(() => { game.input.sneak = true; });
    const landed = await waitFor(() => game.player.riding && !game.player.riding.flying, 30000);
    await E(() => { game.input.sneak = false; });
    await sleep(300);
    await E(() => { game.input.sneak = true; });
    await waitFor(() => !game.player.riding, 5000);
    const out2 = await E(() => { game.input.sneak = false; game.view = 0; const v = T.ents('saucer')[0]; return { out: !game.player.riding, flying: v.flying, hp: game.player.health }; });
    check('Sneak brings it down to land, and Sneak again gets you out', landed && out2.out && !out2.flying && out2.hp === 20, out2);
    const put = await E(() => {
      const pl = game.player, wd = game.world, n0 = T.ents('saucer').length, b0 = T.ents('buggy').length;
      const bx = Math.floor(pl.x) + 3, bz = Math.floor(pl.z), by = Math.floor(pl.y) - 1;
      T.hold(I.BUGGY, 1); T.aim(bx + 0.5, by + 1, bz + 0.5); T.tap();
      return new Promise(res => setTimeout(() => res({ buggies: T.ents('buggy').length - b0, left: T.count(I.BUGGY), saucers: T.ents('saucer').length - n0 }), 500));
    });
    check('a buggy from your bag can be put down anywhere', put.buggies === 1 && put.left === 0, put);
  }

  if (on('race')) {
    // ---------- canyon racing ----------
    const info = await E(() => { const tr = game.gen.marsTracks()[0], ms = marshalSpot(tr); return { ms, g: tr.garage, N: tr.N, y: tr.y, kinds: ['buggy', 'car', 'golfcart', 'flycar', 'saucer'].every(t => RACE_VEHICLES.includes(t)), broom: RACE_VEHICLES.includes('broom') }; });
    check('you can race in a buggy, a car, the golf cart, the flying car or the saucer', info.kinds && !info.broom, info);
    await goto(info.ms[0] + 1.5, info.ms[1], info.ms[2] + 1.5);
    await sleep(1500);
    const m0 = await E(() => {
      const pl = game.player, m = T.ents('martian').find(e => e.marshal === 0);
      T.put(m.x + 1.8, m.y, m.z); T.aim(m.x, m.y + 0.8, m.z); T.hold(null); T.tap();
      return new Promise(res => setTimeout(() => {
        const r = el('race-menu');
        const o = { marshal: !!m && Math.hypot(m.x - m.home[0], m.z - m.home[1]) < 2, flag: m.variant, open: !!r && !r.hidden, h: r && r.querySelector('h3').textContent, info: r && [...r.querySelectorAll('.race-info')].map(e => e.textContent), go: r && r.querySelector('.race-go').disabled, ai: r && r.querySelectorAll('.race-n').length };
        if (r) r.querySelector('.planet-cancel').click();
        o.shut = !r || r.hidden; res(o);
      }, 600));
    });
    check('tap the race marshal on foot: the menu names the track, and says to get in a buggy first', m0.marshal && m0.open && m0.h === 'Canyon Loop' && /3 laps/.test(m0.info[0]) && m0.info.some(t => /Get in a buggy first/.test(t)) && m0.go === true && m0.ai === 4 && m0.shut, m0);
    // into a buggy from the garage, up to the marshal, and start a race against two aliens
    const b0 = await E(() => {
      const pl = game.player, M = game.gen.marsw, g = M.tracks[0].garage, v = T.ents('buggy').filter(e => !e.rider).sort((a, b) => Math.hypot(a.x - g[0], a.z - g[1]) - Math.hypot(b.x - g[0], b.z - g[1]))[0], m = T.ents('martian').find(e => e.marshal === 0);
      const d = Math.hypot(v.x - g[0], v.z - g[1]);
      mountVehicle(game, v);
      Object.assign(v, { x: m.x + 2.4, y: m.y, z: m.z, vx: 0, vz: 0 });
      return { inGarage: d < 6, riding: pl.riding === v, type: v.type };
    });
    await sleep(700);
    const m1 = await E(() => {
      const m = T.ents('martian').find(e => e.marshal === 0);
      T.aim(m.x, m.y + 0.8, m.z); T.tap();
      return new Promise(res => setTimeout(() => {
        const r = el('race-menu'), o = { open: !!r && !r.hidden, go: r && r.querySelector('.race-go').disabled, info: r && [...r.querySelectorAll('.race-info')].map(e => e.textContent) };
        if (o.open) { r.querySelectorAll('.race-n')[2].click(); o.picked = r.querySelectorAll('.race-n')[2].classList.contains('on'); r.querySelector('.race-go').click(); }
        res(o);
      }, 600));
    });
    await sleep(500);
    await shot('grid');
    const st = await E(() => {
      const R = RACE, v = game.player.riding, tr = R && R.tr, s = tr && tr.pts[0];
      return R ? { state: R.state, me: R.me.in, d: R.me.d, racers: T.ents('racer').length, names: T.ents('racer').map(e => e.rc.name).join(), fromLine: Math.hypot(v.x - s[0], v.z - s[1]), view: game.view, hud: el('hud-count').textContent, boxes: R.boxes.length, at: [v.x, v.z] } : null;
    });
    check('in a buggy, the marshal starts a race: you and two alien racers line up behind the start line', b0.inGarage && b0.riding && m1.open && m1.go === false && m1.picked && !!st && st.state === 'count' && st.me && st.d < 0 && st.racers === 2 && st.names === 'Zorp,Bleep' && st.fromLine < 12 && st.view === 1 && /get ready/.test(st.hud) && st.boxes >= 6, { b0, m1, st });
    await E(() => { game.input.fwd = true; });
    const went = await waitFor(() => RACE && RACE.state === 'run', 15000);
    const held = await E(a => { game.input.fwd = false; const v = game.player.riding; return { moved: Math.hypot(v.x - a[0], v.z - a[1]), t: RACE.t }; }, st.at);
    check('3, 2, 1... nobody can move until GO!', went && held.moved < 1.5 && held.t < 1.5, held);
    // dust clouds and the bubble (before driving off)
    const dust = await E(() => {
      const R = RACE, v = game.player.riding, e = T.ents('racer')[0];
      R.laps = 1;   // (one lap is enough for a test)
      window.__m0 = moneyOf(game.player);
      raceDust({ x: e.x, y: e.y, z: e.z, by: 'host' });
      raceDust({ x: v.x, y: v.y, z: v.z, by: 'ai1' });
      return new Promise(res => setTimeout(() => {
        const o = { racerSlow: e.rc.slowT > 0, meSlow: v.slowT > 0 };
        v.slowT = 0; R.me.shield = R.t + 20; raceDust({ x: v.x, y: v.y, z: v.z, by: 'ai1' });
        setTimeout(() => { o.shielded = !(v.slowT > 0); o.shieldGone = !(R.me.shield > R.t); o.mine = (() => { R.clouds.length = 0; raceDust({ x: v.x, y: v.y, z: v.z, by: 'host' }); return 1; })(); setTimeout(() => { o.ownCloud = !(v.slowT > 0); R.clouds.length = 0; res(o); }, 300); }, 300);
      }, 300));
    });
    check('a dust cloud slows whoever drives into it (never the one who dropped it); a bubble keeps one cloud off', dust.racerSlow && dust.meSlow && dust.shielded && dust.shieldGone && dust.ownCloud, dust);
    await E(() => T.drive(true));
    await sleep(6000);
    await shot('racing');
    const mid = await E(() => { const R = RACE; return { hud: el('hud-count').textContent, d: R.me.d, t: R.t, list: R.list.map(q => q[1] + ':' + q[2]), racers: T.ents('racer').map(e => Math.floor(e.rc.d)), place: racePlace() }; });
    check('off you go: the lap, the time and your place show at the top, and the aliens race round too', /^Lap 1\/1 +0:\d\d +\d(st|nd|rd)/.test(mid.hud) && mid.d > 30 && mid.racers.every(d => d > 20) && mid.list.length === 3 && mid.place >= 1 && mid.place <= 3, mid);
    // off the track: you are put back on it
    const off = await E(() => { const v = game.player.riding; window.__toasts.length = 0; v.y -= 14; return new Promise(res => setTimeout(() => { const R = RACE, tr = R.tr, cur = Math.floor(R.me.d) % tr.N; res({ back: window.__toasts.some(t => /Back on the track/.test(t)), near: Math.hypot(v.x - tr.pts[cur][0], v.z - tr.pts[cur][1]), y: v.y - tr.pts[cur][2] }); }, 700)); });
    check('fall off the track, and you are put back on it', off.back && off.near < 12 && off.y > -1 && off.y < 4, off);
    const fin = await waitFor(() => RACE && RACE.me.place > 0, 120000);
    await shot('finish');
    const f = await E(() => { const R = RACE, S = window.__seen; return { fin: R && R.me.fin, hud: el('hud-count').textContent, seen: S, best: game.stats.raceBest, races: game.stats.races, money: moneyOf(game.player) - window.__m0, chat: T.chat(/You finished Canyon Loop in \d:\d\d\.\d: \d(st|nd|rd) place!.* You win \$\d+/), place: RACE.me.place }; });
    check('round the lap: boost pads make you faster, boxes give pickups that a tap uses', fin && f.seen.boost === 1 && f.seen.top > 15 && f.seen.pickup === 1 && f.seen.used >= 1, f.seen);
    check('over the line: your time, your place, a best time kept, and prize money', fin && f.fin > 10 && /^Finished: \d(st|nd|rd) in \d:\d\d\.\d/.test(f.hud) && f.best && f.best[0] > 10 && f.races === 1 && f.chat && f.money === ([20, 10, 5][f.place - 1] || 2), f);
    const over = await waitFor(() => !RACE, 30000);
    await sleep(500);
    const end = await E(() => { T.drive(false); return { racers: T.ents('racer').length, hud: el('hud-count').hidden, view: game.view, results: T.chat(/^Canyon Loop results: 1\. /), riding: !!game.player.riding }; });
    check('the race ends: the results are read out, the aliens drive off, and the view goes back', over && end.racers === 0 && end.hud && end.view === 0 && end.results && end.riding, end);
    // the marshal's menu remembers your best time; Crater Run races too, in a saucer
    const m2 = await E(() => { openRaceMenu(0); const r = el('race-menu'), o = [...r.querySelectorAll('.race-info')].map(e => e.textContent); r.querySelector('.planet-cancel').click(); return o; });
    check('the marshal remembers your best time', /Your best time: \d:\d\d\.\d/.test(m2[0]), m2);
    await E(() => { dismountVehicle(game); const tr = game.gen.marsTracks()[1], s = tr.pts[tr.N - 8]; T.put(s[0], s[2] + 1.2, s[1]); });
    await waitFor(() => game.world.readyAround(game.player.x, game.player.z, 2) >= 1, 60000);
    await sleep(800);
    const r2 = await E(() => { const pl = game.player, v = spawnVehicle(game, 'saucer', pl.x, pl.y, pl.z, 0); boardVehicle(game, v); const ok = raceStart(game, 1, 1); if (RACE) RACE.laps = 1; return { ok, track: RACE && RACE.tr.name, racers: T.ents('racer').length }; });
    check('Crater Run starts too, with the saucer on the grid and one alien', r2.ok && r2.track === 'Crater Run' && r2.racers === 1, r2);
    await waitFor(() => RACE && RACE.state === 'run', 15000);
    await E(() => { T.drive(true); window.__sp = setInterval(() => { const v = game.player.riding, R = RACE; if (!v || !R || R.state !== 'run') return; const tr = R.tr, a = tr.pts[(Math.floor(Math.max(0, R.me.d)) + 6) % tr.N]; game.player.pitch = clamp((a[2] + 2.5 - v.y) * 0.15, -0.5, 0.5); }, 16); });
    const fin2 = await waitFor(() => RACE && RACE.me.place > 0, 150000);
    const f2 = await E(() => { clearInterval(window.__sp); T.drive(false); const v = game.player.riding; return { fin: RACE && RACE.me.fin, best: game.stats.raceBest, flying: v && v.flying }; });
    check('a whole lap of Crater Run in the saucer: over the ramps, through the dip and the tunnel', fin2 && f2.fin > 10 && f2.best[1] > 10 && f2.flying, f2);
    await waitFor(() => !RACE, 30000);
    // the garages never stay empty
    const stock = await E(() => { for (const e of T.ents('buggy')) e.removed = true; return new Promise(res => setTimeout(() => { const M = game.gen.marsw; res(M.tracks.map(tr => T.ents('buggy').filter(e => Math.hypot(e.x - tr.garage[0], e.z - tr.garage[1]) < 7).length)); }, 3500)); });
    check('when the buggies have all gone, a new one is wheeled out at the garage', stock[1] >= 1, stock);
  }

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
