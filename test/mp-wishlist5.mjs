// Declan's fifth wish list, playing together: a guest drives a tank, turns its turret and fires paint; the Hogwarts
// students and Quidditch teams are run by the host and seen (and played with) by a guest; a guest picks their own
// Declan Falls character.
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
      window.T = {
        ents: type => game.entities.filter(e => !e.removed && e.type === type),
        aim(tx, ty, tz) { const pl = game.player, dx = tx - pl.x, dy = ty - (pl.y + pl.eye), dz = tz - pl.z; pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
        tap() { const i = game.input; i.use = true; i.usePressed = true; i.useOnce = true; },
        count: id => game.player.inv.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0),
        hold(id, n, ex) { const pl = game.player; pl.inv[0] = id ? Object.assign({ id, count: n || 1 }, ex || {}) : null; pl.sel = 0; game.ui.dirty = true; },
        chat: re => Array.from(document.querySelectorAll('#chat-log div')).some(d => re.test(d.textContent)),
      };
    });
    return p;
  }
  const waitFor = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
  const H = await open(HOST, 'host'), G = await open(GUEST, 'guest');
  const settle = () => sleep(600);

  await H.evaluate(() => { game.dragLook = true; ui.hostMode = true; game.startWorld('valley', 'survival', true); });
  await waitFor(H, () => game.state === 'playing' && MP.roomOpen, 120000);
  const code = await H.evaluate(() => MP.code);
  await G.evaluate(code => { game.dragLook = true; MP.join(code); }, code);
  await waitFor(H, () => !el('join-prompt').hidden, 30000);
  await H.evaluate(() => MP.answerPrompt(true));
  check('guest joins', await waitFor(G, () => game.state === 'playing' && MP.welcomed, 120000));

  // a big stone floor in the sky with a deep pool in one corner, both players on it
  const S = await H.evaluate(() => {
    const w = game.world, pl = game.player, x = Math.floor(pl.x), y = 100, z = Math.floor(pl.z);
    game.settings.difficulty = 2; game.settings.animals = false; w.time = 0.25; MP.syncTime();
    for (let dx = -16; dx <= 16; dx++) for (let dz = -16; dz <= 16; dz++) { w.setBlock(x + dx, y - 1, z + dz, B.STONE, 0); for (let k = 0; k < 8; k++) w.setBlock(x + dx, y + k, z + dz, B.AIR, 0); }
    for (let dx = -16; dx <= -6; dx++) for (let dz = -16; dz <= -6; dz++) { const edge = dx === -16 || dx === -6 || dz === -16 || dz === -6; for (let k = 1; k <= 8; k++) w.setBlock(x + dx, y - k, z + dz, edge || k === 8 ? B.STONE : B.WATER, 0); }
    Object.assign(pl, { x: x + 0.5, y, z: z + 8.5, vx: 0, vy: 0, vz: 0, flying: false, yaw: 0, pitch: 0 });
    return { x, y, z };
  });
  await waitFor(G, S => game.world.getBlock(S.x + 16, S.y - 1, S.z + 16) === B.STONE && game.world.getBlock(S.x - 9, S.y - 4, S.z - 9) === B.WATER, 15000, S);
  await G.evaluate(S => Object.assign(game.player, { x: S.x + 3.5, y: S.y, z: S.z + 8.5, vx: 0, vy: 0, vz: 0, flying: false }), S);
  await sleep(800);

  const want = process.argv.slice(2), on = k => !want.length || want.includes(k);

  if (on('tanks')) {
    // 1. she puts down a pink tank, drives it, turns its turret and fires paint at a sheep
    await G.evaluate(S => Object.assign(game.player, { x: S.x + 6.5, y: S.y, z: S.z + 15.5, yaw: 0, pitch: -0.5, vx: 0, vy: 0, vz: 0 }), S);
    await settle();
    await G.evaluate(S => { T.hold(I.TANK + 4, 1); game.player.target = { x: S.x + 6, y: S.y - 1, z: S.z + 12, id: B.STONE, face: 2 }; game.player.useBlock(I.TANK + 4, false); }, S);
    check('she puts down a pink tank; it is pink on the host too', await waitFor(H, () => T.ents('tank').length === 1 && T.ents('tank')[0].tc === 4, 8000));
    const tid = await H.evaluate(() => T.ents('tank')[0].nid);
    check('and pink on her iPad', await waitFor(G, tid => game.entities.some(e => e.nid === tid && e.tc === 4), 8000, tid));
    await G.evaluate(tid => { const v = game.entities.find(e => e.nid === tid); mountVehicle(game, v); }, tid);
    check('she gets in to drive it', await waitFor(G, () => game.player.riding && game.player.riding.local, 8000));
    const z0 = await H.evaluate(() => T.ents('tank')[0].z);
    await G.evaluate(() => { const pl = game.player; pl.yaw = pl.riding.yaw; pl.pitch = 0; game.input.fwd = true; });
    await sleep(1500);
    await G.evaluate(() => { game.input.fwd = false; const pl = game.player; pl.yaw = pl.riding.yaw + 1; pl.pitch = 0.2; });
    await sleep(900);
    const hv = await H.evaluate(z0 => { const v = T.ents('tank')[0]; return { dz: Math.round((v.z - z0) * 10) / 10, rel: Math.round((v.turret - v.yaw) * 100) / 100, gun: Math.round(v.gun * 100) / 100 }; }, z0);
    check('the host sees her tank drive along and its turret turn to where she looks', hv.dz < -1 && Math.abs(hv.rel - 1) < 0.1 && Math.abs(hv.gun - 0.2) < 0.05, hv);
    // a sheep in front of her gun
    const sid = await H.evaluate(() => { const v = T.ents('tank')[0], yaw = v.turret; const s = spawnMob(game, 'sheep', v.x - Math.sin(yaw) * 6, v.y, v.z - Math.cos(yaw) * 6); s.wool = 0; s.ai = () => {}; return s.nid; });
    await waitFor(G, sid => game.entities.some(e => e.nid === sid), 8000, sid);
    await G.evaluate(() => { game.player.pitch = 0.02; });
    await sleep(500);
    await G.evaluate(() => { T.tap(); });
    check('her paint shell paints the sheep pink on the host, and hurts nothing', await waitFor(H, sid => { const s = game.entities.find(e => e.nid === sid); return s && s.wool === 6 && !s.dead && s.hp === MOB_DEFS.sheep.hp; }, 8000, sid));
    check('she sees the splat where it lands', await waitFor(G, () => window.__fx.has('paint'), 5000));
    await G.evaluate(() => { game.view = 1; });
    await sleep(700);
    await H.screenshot({ path: path.join(out, 'mp5-host-sees-tank.png') });
    await G.evaluate(() => { game.view = 0; dismountVehicle(game); });
    await settle();
  }

  check('no page errors', H.errs.length === 0 && G.errs.length === 0, H.errs.concat(G.errs).slice(0, 6));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close(); peer.close && peer.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
