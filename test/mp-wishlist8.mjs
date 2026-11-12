// More Mars (the second Mars update), playing together. Sections can be picked: node test/mp-wishlist8.mjs air pet ball sky board
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), out = path.join(dir, 'shots');
const { PeerServer } = require(path.join(dir, '..', 'tools', 'node_modules', 'peer'));
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html'));
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(0);
const PEER_PORT = 9100 + Math.floor(Math.random() * 800);
const peer = PeerServer({ port: PEER_PORT, host: '127.0.0.1', path: '/' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
const HOST = { skin: 'declan', name: 'Declan', pid: 'hostpid0001' };
const GUEST = { skin: 'sister', name: 'Cora', pid: 'guestpid002' };
const GID = GUEST.pid;

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'] });
  const url = 'http://localhost:' + server.address().port + '/';
  async function open(profile, label) {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 520 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(([port, prof]) => {
      window.DC_NET = { host: '127.0.0.1', port, secure: false, path: '/', key: 'peerjs', iceServers: [], mqtt: [] };
      if (!localStorage.getItem('declancraft:v1:profile')) localStorage.setItem('declancraft:v1:profile', JSON.stringify(prof));
    }, [PEER_PORT, profile]);
    const p = await ctx.newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(label + ': ' + e.message));
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
    await p.evaluate(() => {
      window.__fx = new Set();
      const pf = MP.playFx.bind(MP); MP.playFx = function (list) { if (Array.isArray(list)) for (const f of list) if (Array.isArray(f)) window.__fx.add(f[0] + (f[0] === 'sfx' ? ':' + SFX_NET[f[4]] : '')); return pf(list); };
      window.__toasts = []; const t0 = toast; window.toast = (m, s) => { window.__toasts.push(m); return t0(m, s); };
      window.T = {
        ents: type => game.entities.filter(e => !e.removed && e.type === type),
        aim(tx, ty, tz) { const pl = game.player, dx = tx - pl.x, dy = ty - (pl.y + pl.eye), dz = tz - pl.z; pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
        tap() { const i = game.input; i.use = true; i.usePressed = true; i.useOnce = true; },
        put(x, y, z) { Object.assign(game.player, { x, y, z, vx: 0, vy: 0, vz: 0, fallDist: 0, flying: false }); },
        count: id => game.player.inv.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0),
        hold(id, n, ex) { const pl = game.player; pl.inv[0] = id ? Object.assign({ id, count: n || 1 }, ex || {}) : null; pl.sel = 0; game.ui.dirty = true; },
        chat: re => Array.from(document.querySelectorAll('#chat-log div')).some(d => re.test(d.textContent)),
        drive(on) {   // a robot driver: it steers along the track of the race going on
          clearInterval(window.__ad); game.input.fwd = false; game.input.joyX = 0;
          if (!on) return;
          window.__ad = setInterval(() => {
            const v = game.player.riding, R = RACE;
            if (!v || !R || R.state !== 'run' || R.me.fin) { game.input.fwd = false; game.input.joyX = 0; return; }
            const tr = R.tr, N = tr.N, cur = ((Math.floor(R.me.d) % N) + N) % N, a = tr.pts[(cur + 9) % N];
            const d = ((Math.atan2(-(a[0] - v.x), -(a[1] - v.z)) - v.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
            game.input.fwd = true; game.input.joyX = clamp(-d * 2.5, -1, 1);
          }, 16);
        },
      };
    });
    return p;
  }
  const waitFor = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
  const H = await open(HOST, 'host'), G = await open(GUEST, 'guest');
  const want = process.argv.slice(2), on = k => !want.length || want.includes(k);

  await H.evaluate(() => { game.dragLook = true; ui.hostMode = true; game.startWorld('marsworld', 'survival', true); });
  await waitFor(H, () => game.state === 'playing' && MP.roomOpen, 120000);
  await H.evaluate(() => { game.settings.renderDist = 5; game.world.time = 0.3; MP.syncTime(); });
  const code = await H.evaluate(() => MP.code);
  await G.evaluate(code => { game.dragLook = true; MP.join(code); }, code);
  await waitFor(H, () => !el('join-prompt').hidden, 30000);
  await H.evaluate(() => MP.answerPrompt(true));
  check('the host shares the Mars world and she joins', await waitFor(G, () => game.state === 'playing' && MP.welcomed, 120000));
  await G.evaluate(() => { game.settings.renderDist = 5; });
  await sleep(5000);
  const M = await H.evaluate(() => game.gen.marsw);
  const both = async (x, y, z) => {   // both players to a spot, side by side
    await H.evaluate(a => T.put(a[0], a[1], a[2]), [x, y, z]);
    await G.evaluate(a => T.put(a[0] + 1.5, a[1], a[2]), [x, y, z]);
    await waitFor(H, a => game.world.readyAround(a[0], a[1], 2) >= 1, 60000, [x, z]);
    await waitFor(G, a => game.world.readyAround(a[0], a[1], 2) >= 1, 60000, [x, z]);
    await sleep(1200);
  };
  const g0 = await G.evaluate(() => { const pl = game.player; return { map: game.mapId, wmap: game.world.map, helmet: wearsSpaceHelmet(pl), breathe: canBreatheHere(pl), g: gravOf(game.world.map), hello: T.chat(/Welcome to Mars/), track: game.gen.marsTracks().length }; });
  check('she is on Mars too: a helmet, Mars\'s gravity, and a hello', g0.map === 'marsworld' && g0.wmap === 'marsworld' && g0.helmet && g0.breathe && g0.g === 0.38 && g0.hello && g0.track === 3, g0);

  if (on('air')) {
    // an Air Maker's bubble is the same on both iPads; the host's machine greens the ground, and she sees it
    const b = M.base, Y = M.town.y + 1;
    await both(b.x - 2.5, Y, b.z + 0.5);
    const g1 = await G.evaluate(a => { const pl = game.player, h = pl.inv[ARMOR_INV]; pl.inv[ARMOR_INV] = null; const o = { maker: game.world.getBlock(a.x, a.Y, a.z) === B.AIR_MAKER, bubble: inAirBubble(pl), breathe: canBreatheHere(pl), out: canBreatheHere({ x: a.x + 30, y: a.Y, z: a.z, inv: [] }) }; pl.inv[ARMOR_INV] = h; return o; }, { x: b.x, z: b.z, Y });
    check('she can breathe without a helmet in the base\'s air bubble too', g1.maker && g1.bubble && g1.breathe && g1.out === false, g1);
    const grass0 = await G.evaluate(a => { let n = 0; for (let x = a.x - 10; x <= a.x + 10; x++) for (let z = a.z - 10; z <= a.z + 10; z++) for (let y = a.Y - 3; y <= a.Y + 2; y++) if (game.world.getBlock(x, y, z) === B.GRASS) n++; return n; }, { x: b.x, z: b.z, Y });
    await H.evaluate(() => { for (let i = 0; i < 300; i++) { AIRM.greenT = 0; airTick(game, 0.016); } });
    check('the ground the host\'s Air Maker turns green goes green on her iPad too', await waitFor(G, a => { let n = 0; for (let x = a.x - 10; x <= a.x + 10; x++) for (let z = a.z - 10; z <= a.z + 10; z++) for (let y = a.Y - 3; y <= a.Y + 2; y++) if (game.world.getBlock(x, y, z) === B.GRASS) n++; return n > a.g0 + 40; }, 15000, { x: b.x, z: b.z, Y, g0: grass0 }));
  }

  if (on('pet')) {
    // she sets an egg down: the host hatches it, it follows her, she feeds it and it grows; the host cannot boss it about
    const Y = M.town.y + 1, at = [6.5, Y, 16.5];
    await both(at[0], at[1], at[2]);
    await G.evaluate(a => { T.hold(I.ALIEN_EGG, 1); T.aim(a[0] + 3.5, a[1], a[2] + 0.5); window.__toasts.length = 0; T.tap(); }, at);
    check('she sets a Blip egg down: it is hers, on the host', await waitFor(H, gid => T.ents('blip').some(e => e.owner === gid && e.stage === 0), 8000, GID) && await G.evaluate(() => T.count(I.ALIEN_EGG) === 0));
    check('she sees the egg', await waitFor(G, () => T.ents('blip').some(e => e.stage === 0 && e.owner === PROFILE.pid), 8000));
    await H.evaluate(() => { T.ents('blip')[0].hatchT = 0.5; });
    check('it hatches, and she is told', await waitFor(G, () => T.ents('blip').some(e => e.stage === 1) && T.chat(/hatched: it is a baby Blip/), 8000));
    await G.evaluate(a => T.put(a[0] + 9, a[1], a[2] + 5), at);
    check('it follows her (not the host)', await waitFor(H, gid => { const e = T.ents('blip')[0], r = MP.remotes.get(gid); return Math.hypot(e.x - r.tx, e.z - r.tz) < 4.5 && Math.hypot(e.x - game.player.x, e.z - game.player.z) > 5; }, 12000, GID));
    await G.evaluate(() => T.hold(I.APPLE, 3));
    for (let k = 0; k < 3; k++) for (let tries = 0; tries < 5; tries++) {   // (it may be waddling after her: tap until the meal lands)
      await G.evaluate(() => { const e = T.ents('blip')[0], pl = game.player; if (Math.hypot(e.x - pl.x, e.z - pl.z) > 3) T.put(e.x + 1.4, e.y, e.z); T.aim(e.x, e.y + 0.25, e.z); pl.useCd = 0; });
      await sleep(250);
      await G.evaluate(() => { const e = T.ents('blip')[0]; T.aim(e.x, e.y + 0.25, e.z); T.tap(); });
      if (await waitFor(H, k => T.ents('blip')[0].fed >= k + 1, 2500, k)) break;
    }
    await sleep(300);
    const fed = { host: await H.evaluate(() => { const e = T.ents('blip')[0]; return { fed: e.fed, stage: e.stage }; }), apples: await G.evaluate(() => T.count(I.APPLE)) };
    check('she feeds it three apples and it grows up', fed.host.fed === 3 && fed.host.stage === 2 && fed.apples === 0 && await waitFor(G, () => T.ents('blip')[0].stage === 2 && T.chat(/Your Blip grew up/), 6000), fed);
    const boss = await H.evaluate(() => { const e = T.ents('blip')[0], pl = game.player; window.__toasts.length = 0; petTap(game, pl, e, 0, false); return { sit: !!e.sit, said: window.__toasts.some(t => /someone else's Blip/.test(t)) }; });
    check('the host cannot tell her Blip what to do', !boss.sit && boss.said, boss);
    await G.evaluate(() => { const e = T.ents('blip')[0]; T.hold(null); T.aim(e.x, e.y + 0.25, e.z); game.player.useCd = 0; T.tap(); });
    check('she taps it and it sits (on the host, and on her iPad)', await waitFor(H, () => T.ents('blip')[0].sit === true, 5000) && await waitFor(G, () => T.ents('blip')[0].sit === true, 5000));
    check('her Blip is kept with the host\'s world', await H.evaluate(gid => saveRobots(game).some(r => r.k === 'pet' && r.o === gid && r.s === 2), GID));
  }

  if (on('ball')) {
    // she knocks the ball about; a goal is called on both iPads
    const f = M.field, Y = M.town.y + 1;
    await both(f.x + 4.5, Y, f.z + 4.5);
    check('she sees the ball on the field', await waitFor(G, () => T.ents('marsball').length === 1, 10000));
    await H.evaluate(a => { const b = T.ents('marsball')[0]; Object.assign(b, { x: a.x + 0.5, y: a.Y, z: a.z + 0.5, vx: 0, vy: 0, vz: 0, kickT: 0 }); T.put(a.x + 8.5, a.Y, a.z + 5.5); }, { x: f.x, z: f.z, Y });
    await G.evaluate(a => { T.put(a.x + 0.5, a.Y, a.z + 3.5); game.player.yaw = 0; }, { x: f.x, z: f.z, Y });
    await sleep(800);
    await G.evaluate(() => { game.input.fwd = true; });
    check('she walks into it and it bounces away (the host moves it)', await waitFor(H, a => T.ents('marsball')[0].z < a.z - 1.5, 8000, { z: f.z }));
    await G.evaluate(() => { game.input.fwd = false; });
    await sleep(2500);
    await H.evaluate(a => { const b = T.ents('marsball')[0]; Object.assign(b, { x: a.x + 0.5, y: a.Y, z: a.z + 0.5, vx: 0, vy: 0, vz: 0, kickT: 0 }); }, { x: f.x, z: f.z, Y });
    await G.evaluate(a => T.put(a.x + 2.5, a.Y, a.z + 0.5), { x: f.x, z: f.z, Y });
    await sleep(800);
    await G.evaluate(() => { const b = T.ents('marsball')[0]; T.aim(b.x, b.y + 0.4, b.z); hurtMob(game, b, 2, game.player.x, game.player.z, 'player'); });
    check('her punch sends it at the red goal: GOAL! is called on both iPads', await waitFor(H, () => T.chat(/GOAL! Blue scores\. Red 0 - 1 Blue/), 12000) && await waitFor(G, () => T.chat(/GOAL! Blue scores\. Red 0 - 1 Blue/), 6000), await H.evaluate(() => ({ score: BALL.score, b: (b => [b.x, b.y, b.z, b.vx])(T.ents('marsball')[0]) })));
  }

  if (on('sky')) {
    // a meteor shower and a meteorite, and a dust storm, on both iPads
    await both(0.5, M.town.y + 1, 10.5);
    await H.evaluate(() => { game.world.time = 0.7; MP.syncTime(); MARS2.nightDone = -1; const r0 = Math.random; Math.random = () => 0.1; skyTick(game, 0.016); Math.random = r0; });
    check('a meteor shower starts on both iPads', await waitFor(G, () => MARS2.showerT > 0 && T.chat(/A meteor shower/), 6000) && await H.evaluate(() => MARS2.showerT > 0));
    await H.evaluate(() => { MARS2.landT = 0.05; });
    check('a meteorite lands: both are told where', await waitFor(H, () => T.chat(/A meteorite landed about/), 10000) && await waitFor(G, () => T.chat(/A meteorite landed about/), 6000));
    const rock = await H.evaluate(() => { const wd = game.world, pl = game.player; for (let x = Math.floor(pl.x) - 48; x <= pl.x + 48; x++) for (let z = Math.floor(pl.z) - 48; z <= pl.z + 48; z++) for (let y = 40; y < 90; y++) if (wd.getBlock(x, y, z) === B.METEORITE) return [x, y, z]; return null; });
    check('and the glowing rock is there on her iPad too, away from both players', !!rock && await waitFor(G, r => game.world.getBlock(r[0], r[1], r[2]) === B.METEORITE, 8000, rock) && await H.evaluate(a => { const r = MP.remotes.get(a.gid); return Math.hypot(a.r[0] - game.player.x, a.r[2] - game.player.z) >= 16 && Math.hypot(a.r[0] - r.tx, a.r[2] - r.tz) >= 16; }, { r: rock, gid: GID }), rock);
    await H.evaluate(() => { game.world.time = 0.3; wxSet('rain'); });
    check('the host\'s dust storm blows on her iPad too (and nobody is hurt)', await waitFor(G, () => MARS2.dust > 0.5 && T.chat(/A dust storm is blowing in/), 20000) && await G.evaluate(() => game.player.health === 20));
    await H.evaluate(() => wxSet('clear'));
    check('and blows over', await waitFor(G, () => MARS2.dust < 0.05, 30000));
  }

  if (on('board')) {
    // she rides a sandboard; the host sees her standing on it
    await both(8.5, M.town.y + 1, 4.5);
    await G.evaluate(() => { const pl = game.player; T.hold(I.SANDBOARD, 1); T.aim(pl.x + 0.5, pl.y, pl.z - 2.5); game.player.useCd = 0; T.tap(); });
    check('her sandboard goes down (the host makes it)', await waitFor(H, () => T.ents('sandboard').length === 1, 8000) && await waitFor(G, () => T.ents('sandboard').length === 1, 8000));
    await G.evaluate(() => mountVehicle(game, T.ents('sandboard')[0]));
    check('she gets on', await waitFor(G, () => game.player.riding && game.player.riding.type === 'sandboard' && game.player.riding.local, 8000));
    await G.evaluate(() => { game.input.fwd = true; });
    check('the host sees her standing on it, sliding along', await waitFor(H, gid => { const r = MP.remotes.get(gid), v = T.ents('sandboard')[0]; return r.riding === 'board' && v.rider && Math.abs(v.speed === undefined ? Math.hypot(v.vx, v.vz) : v.speed) > 1; }, 10000, GID), await H.evaluate(gid => { const r = MP.remotes.get(gid), v = T.ents('sandboard')[0]; return { riding: r.riding, rider: v.rider, sp: Math.hypot(v.vx, v.vz) }; }, GID));
    await G.evaluate(() => { game.input.fwd = false; game.input.sneak = true; });
    await waitFor(G, () => !game.player.riding, 5000);
    await G.evaluate(() => { game.input.sneak = false; });
  }

  check('no page errors', H.errs.length === 0 && G.errs.length === 0, H.errs.concat(G.errs).slice(0, 6));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close(); peer.close && peer.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
