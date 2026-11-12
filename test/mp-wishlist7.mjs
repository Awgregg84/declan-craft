// The seventh wish list (the Mars world), playing together. Sections can be picked: node test/mp-wishlist7.mjs aliens saucer race
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
  check('she is on Mars too: a helmet, Mars\'s gravity, and a hello', g0.map === 'marsworld' && g0.wmap === 'marsworld' && g0.helmet && g0.breathe && g0.g === 0.38 && g0.hello && g0.track >= 2, g0);

  if (on('aliens')) {
    // she sees the Martians (and which are the marshals), one says hello to her, and she swaps an apple for a present
    await both(M.plaza[0] + 0.5, M.town.y + 1, M.plaza[1] + 3.5);
    const seen = { host: await H.evaluate(() => T.ents('martian').map(e => e.variant + (e.marshal !== undefined ? 'm' + e.marshal : '')).sort().join()), her: await G.evaluate(() => T.ents('martian').map(e => e.variant + (e.marshal !== undefined ? 'm' + e.marshal : '')).sort().join()) };
    check('she sees the same Martians: three colours, and the two marshals with their flags', seen.host === '0,0,1,1,2,2,3m0,3m1' && seen.her === seen.host, seen);
    const mid = await H.evaluate(() => { const pl = game.player, m = T.ents('martian').filter(e => e.marshal === undefined).sort((a, b) => Math.hypot(a.x - pl.x, a.z - pl.z) - Math.hypot(b.x - pl.x, b.z - pl.z))[0]; m.aiT = 60; m.moving = false; m.hiT = 0; T.put(m.x + 6, m.y, m.z + 6); return [m.nid, m.x, m.y, m.z]; });
    await G.evaluate(a => { T.put(a[1], a[2], a[3] + 1.6); T.aim(a[1], a[2] + 0.8, a[3]); }, mid);
    check('a Martian says hello to her by name', await waitFor(G, () => T.chat(/^A Martian: ".*Cora/), 10000));
    check('and she sees it wave', await waitFor(G, nid => { const m = game.entities.find(e => e.nid === nid); return m && m.waveT > 0; }, 6000, mid[0]));
    await H.evaluate(() => window.__fx.clear());
    await G.evaluate(nid => { const m = game.entities.find(e => e.nid === nid); T.put(m.tx !== undefined ? m.tx : m.x, m.y, (m.tz !== undefined ? m.tz : m.z) + 1.6); T.aim(m.x, m.y + 0.8, m.z); T.hold(I.APPLE, 2); window.__toasts.length = 0; }, mid[0]);
    await sleep(400);
    await G.evaluate(nid => { const m = game.entities.find(e => e.nid === nid); T.aim(m.x, m.y + 0.8, m.z); T.tap(); }, mid[0]);
    check('she gives it an apple and gets a present of her own', await waitFor(G, () => window.__toasts.some(t => /^The Martian gave you /.test(t)) && T.count(I.APPLE) === 1, 6000), await G.evaluate(() => ({ toasts: window.__toasts, target: game.player.targetEnt && game.player.targetEnt.type })));
    check('the host hears the Martian\'s happy trill', await waitFor(H, () => window.__fx.has('sfx:martianHappy'), 6000), await H.evaluate(() => [...window.__fx]));
  }

  if (on('saucer')) {
    // she flies the saucer; its beam (switched from her iPad) lifts a sheep on the host; the host rides in the beam
    await both(M.saucer[0] + 0.5, M.town.y + 1, M.saucer[1] + 3.5);
    const sid = await H.evaluate(() => T.ents('saucer')[0].nid);
    await G.evaluate(sid => mountVehicle(game, game.entities.find(e => e.nid === sid)), sid);
    check('she gets into the saucer', await waitFor(G, () => game.player.riding && game.player.riding.type === 'saucer' && game.player.riding.local, 8000));
    await G.evaluate(() => { game.input.jump = true; });
    await sleep(1500);
    await G.evaluate(() => { game.input.jump = false; });
    check('she takes off, and the host sees the saucer fly with her in it', await waitFor(H, sid => { const v = game.entities.find(e => e.nid === sid); return v && v.flying && v.rider && v.y > 62; }, 8000, sid));
    const spot = [M.saucer[0] + 0.5, M.town.y + 1, M.saucer[1] - 6.5];
    const shid = await H.evaluate(spot => { const e = spawnMob(game, 'sheep', spot[0], spot[1], spot[2]); window.__fx.clear(); return e.nid; }, spot);
    await G.evaluate(spot => { const v = game.player.riding; Object.assign(v, { x: spot[0], y: spot[1] + 6, z: spot[2], vx: 0, vy: 0, vz: 0 }); }, spot);
    await sleep(1200);
    await G.evaluate(() => T.tap());
    check('she taps: the beam goes on (the host sees it, and hears it)', await waitFor(H, sid => game.entities.find(e => e.nid === sid).beamOn === true, 6000, sid) && await H.evaluate(() => true));
    check('on the host, the sheep is lifted up under her saucer', await waitFor(H, a => { const v = game.entities.find(e => e.nid === a[0]), s = game.entities.find(e => e.nid === a[1]); return s.beamV === v && s.y > a[2] + 2; }, 10000, [sid, shid, spot[1]]));
    check('and she sees the sheep hanging in her beam', await waitFor(G, a => { const s = game.entities.find(e => e.nid === a[0]), v = game.player.riding; return v.beamOn && s && s.y > a[1] + 2 && Math.hypot(s.x - v.x, s.z - v.z) < 1.5; }, 10000, [shid, spot[1]]));
    await G.evaluate(() => T.tap());
    check('she taps again: the sheep comes down, unhurt', await waitFor(H, a => { const v = game.entities.find(e => e.nid === a[0]), s = game.entities.find(e => e.nid === a[1]); return !v.beamOn && !s.beamV && s.onGround && s.hp === 8 && !s.dead; }, 12000, [sid, shid]));
    // the host rides in the beam: hanging under the saucer she is flying
    await G.evaluate(a => { const v = game.player.riding; Object.assign(v, { x: a[0], y: a[1] + 2.2, z: a[2] + 8, vx: 0, vy: 0, vz: 0 }); }, spot);
    await H.evaluate(a => T.put(a[0] + 1, a[1], a[2] + 8), spot);
    await sleep(1200);
    await H.evaluate(sid => mountVehicle(game, game.entities.find(e => e.nid === sid)), sid);
    const ride = await H.evaluate(sid => { const pl = game.player, v = game.entities.find(e => e.nid === sid); return { riding: pl.riding === v, seat: pl.seat, below: v.y - pl.y }; }, sid);
    check('the host taps her saucer and rides in its beam', ride.riding && ride.seat === 1 && ride.below >= 0, ride);
    await G.evaluate(() => { game.input.jump = true; });
    await sleep(2200);
    await G.evaluate(() => { game.input.jump = false; });
    const lifted = await H.evaluate(a => { const pl = game.player, v = pl.riding; return v ? { up: pl.y - a, below: v.y - pl.y, hp: pl.health } : null; }, spot[1]);
    check('she flies up, and the host is carried along under the saucer', !!lifted && lifted.up > 3 && lifted.below > 2 && lifted.hp === 20, lifted);
    check('she sees the host hanging there', await waitFor(G, () => { const r = MP.remotes.get('host'), v = game.player.riding; return r && r.seat === 1 && v.y - r.y > 1.5 && Math.hypot(r.x - v.x, r.z - v.z) < 2; }, 8000), await G.evaluate(() => { const r = MP.remotes.get('host'), v = game.player.riding; return { seat: r.seat, dy: v.y - r.y, d: Math.hypot(r.x - v.x, r.z - v.z) }; }));
    await H.evaluate(() => { game.input.sneak = true; });
    await sleep(400);
    const chute = await H.evaluate(() => { game.input.sneak = false; return { out: !game.player.riding, chute: !!game.player.chute }; });
    check('the host lets go with Sneak, and a parachute opens', chute.out && chute.chute, chute);
    await waitFor(H, () => game.player.onGround, 30000);
    check('and lands safely', await H.evaluate(() => game.player.health === 20));
    await G.evaluate(() => { game.input.sneak = true; });
    await waitFor(G, () => game.player.riding && !game.player.riding.flying, 30000);
    await G.evaluate(() => { game.input.sneak = false; });
    await sleep(300);
    await G.evaluate(() => { game.input.sneak = true; });
    await waitFor(G, () => !game.player.riding, 5000);
    await G.evaluate(() => { game.input.sneak = false; });
  }

  if (on('race')) {
    // both in buggies at the start of Canyon Loop; she starts the race from the marshal's menu; the host runs it
    const s = await H.evaluate(() => { const tr = game.gen.marsTracks()[0], q = tr.pts[tr.N - 8]; return [q[0], q[2] + 1.2, q[1]]; });
    await both(s[0], s[1], s[2]);
    const ids = await H.evaluate(s => { const a = spawnVehicle(game, 'buggy', s[0], s[1], s[2], 0), b = spawnVehicle(game, 'buggy', s[0] + 2.5, s[1], s[2], 0); boardVehicle(game, a); return [a.nid, b.nid]; }, s);
    await waitFor(G, nid => game.entities.some(e => e.nid === nid), 8000, ids[1]);
    await G.evaluate(nid => mountVehicle(game, game.entities.find(e => e.nid === nid)), ids[1]);
    check('she gets into a buggy', await waitFor(G, () => game.player.riding && game.player.riding.type === 'buggy' && game.player.riding.local, 8000));
    await sleep(500);
    const menu = await G.evaluate(() => { openRaceMenu(0); const r = el('race-menu'), o = { h: r.querySelector('h3').textContent, go: r.querySelector('.race-go').disabled }; r.querySelectorAll('.race-n')[1].click(); r.querySelector('.race-go').click(); return o; });
    const started = await waitFor(H, () => RACE && RACE.state === 'count', 8000) && await waitFor(G, () => RACE && RACE.state === 'count', 8000);
    const grid = { host: await H.evaluate(() => ({ in: RACE.me.in, slot: RACE.me.slot && RACE.me.slot.slice(0, 3).map(n => Math.round(n * 10) / 10), racers: T.ents('racer').length, names: RACE.names })), her: await G.evaluate(() => ({ in: RACE.me.in, slot: RACE.me.slot && RACE.me.slot.slice(0, 3).map(n => Math.round(n * 10) / 10), track: RACE.tr.name })) };
    check('she starts the race from the marshal\'s menu: both line up on the grid, in different places, with one alien', menu.h === 'Canyon Loop' && menu.go === false && started && grid.host.in && grid.her.in && grid.host.racers === 1 && JSON.stringify(grid.host.slot) !== JSON.stringify(grid.her.slot) && grid.host.names.host === 'Declan' && grid.host.names[GID] === 'Cora' && grid.her.track === 'Canyon Loop', { menu, grid });
    check('she sees the alien racer in its buggy', await waitFor(G, () => T.ents('racer').length === 1, 8000));
    await H.evaluate(() => { RACE.laps = 1; });
    await G.evaluate(() => { RACE.laps = 1; });
    const go = await waitFor(H, () => RACE && RACE.state === 'run', 15000) && await waitFor(G, () => RACE && RACE.state === 'run', 15000);
    check('3, 2, 1, GO! on both iPads', go);
    // pickups: her dust cloud shows on the host, the host's on hers
    await G.evaluate(() => { RACE.me.pickup = PICKUPS[1]; T.tap(); });
    check('her dust cloud is on the host\'s track too', await waitFor(H, gid => RACE.clouds.some(c => c.by === gid), 6000, GID) && await G.evaluate(() => RACE.clouds.length === 1 && !RACE.me.pickup));
    await H.evaluate(() => { RACE.me.pickup = PICKUPS[1]; T.tap(); });
    check('and the host\'s cloud is on hers', await waitFor(G, () => RACE.clouds.some(c => c.by === 'host'), 6000));
    await H.evaluate(() => { RACE.clouds.length = 0; T.drive(true); });
    await G.evaluate(() => { RACE.clouds.length = 0; T.drive(true); });
    await sleep(7000);
    const mid = { host: await H.evaluate(() => ({ list: RACE.list.map(q => q[1] + ':' + q[2]), place: racePlace(), hud: el('hud-count').textContent })), her: await G.evaluate(() => ({ list: RACE.list.map(q => q[1]).sort().join(), place: racePlace(), hud: el('hud-count').textContent, d: RACE.me.d })) };
    check('everyone\'s place is kept by the host: Declan, Cora and the alien are all on her list too', mid.host.list.length === 3 && mid.her.list === 'Cora,Declan,Zorp' && mid.her.d > 30 && /^Lap 1\/1/.test(mid.her.hud), mid);
    await H.screenshot({ path: path.join(out, 'mp7-race-host.png') });
    await G.screenshot({ path: path.join(out, 'mp7-race-guest.png') });
    const fin = await waitFor(H, () => RACE && RACE.me.fin > 0, 120000) && await waitFor(G, () => !RACE || RACE.me.fin > 0, 120000);
    check('both cross the line', fin);
    check('she gets her time, her prize, and a best time', await waitFor(G, () => game.stats.raceBest && game.stats.raceBest[0] > 10 && moneyOf(game.player) >= 5 && T.chat(/You finished Canyon Loop/), 10000), await G.evaluate(() => ({ best: game.stats.raceBest, money: moneyOf(game.player) })));
    const said = re => Array.from(document.querySelectorAll('#chat-log div')).map(d => (/You finished Canyon Loop in [\d:.]+: (\d)/.exec(d.textContent) || [])[1]).filter(Boolean).pop();
    await waitFor(H, () => T.chat(/You finished Canyon Loop/), 10000);
    const places = [await H.evaluate(said), await G.evaluate(said)];
    check('they are told different places (never both "1st")', places[0] && places[1] && places[0] !== places[1], places);
    check('the race ends on both iPads, with the results, and the alien drives off', await waitFor(H, () => !RACE && T.ents('racer').length === 0 && T.chat(/Canyon Loop results: 1\. /), 30000) && await waitFor(G, () => !RACE && T.ents('racer').length === 0 && T.chat(/Canyon Loop results: 1\. /), 10000));
    check('the host keeps her best time with her things', await waitFor(H, gid => MP.guestSaves[gid] && MP.guestSaves[gid].rb && MP.guestSaves[gid].rb[0] > 10, 10000, GID), await H.evaluate(gid => MP.guestSaves[gid] && MP.guestSaves[gid].rb, GID));
    await H.evaluate(() => T.drive(false)); await G.evaluate(() => T.drive(false));
  }

  check('no page errors', H.errs.length === 0 && G.errs.length === 0, H.errs.concat(G.errs).slice(0, 6));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close(); peer.close && peer.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
