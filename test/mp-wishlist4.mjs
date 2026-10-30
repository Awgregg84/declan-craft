// Declan's fourth wish list, playing together: the new doors, airlocks and garage doors work for a guest as well as the
// host, and a friend can ride in a plane someone else is flying (and jump out with a parachute).
// Needs the dev copy of the room service: cd tools && npm install
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

  // 1. doors: she puts down a glass door and opens it; the host sees it
  await G.evaluate(S => {
    const pl = game.player; Object.assign(pl, { x: S.x + 3.5, y: S.y, z: S.z + 3.5, yaw: 0, pitch: -0.3 });
    T.hold(I.GLASS_DOOR, 1); pl.target = { x: S.x + 3, y: S.y - 1, z: S.z + 1, id: B.STONE, face: 2 }; pl.useBlock(I.GLASS_DOOR, false);
    pl.target = { x: S.x + 3, y: S.y, z: S.z + 1, id: B.GLASS_DOOR, face: 5 }; pl.useBlock(0, false);
  }, S);
  check('she puts down a glass door and opens it, and the host sees it open', await waitFor(H, S => game.world.getBlock(S.x + 3, S.y, S.z + 1) === B.GLASS_DOOR && (game.world.getData(S.x + 3, S.y, S.z + 1) & 4) === 4, 8000, S));
  // 2. an airlock: a sealed glass room full of water with an airlock door standing open; she shuts it and the host's
  // pump empties the room, for both of them
  const A = { x: S.x - 12, y: S.y, z: S.z + 8 };
  await H.evaluate(A => {
    const w = game.world;
    for (let x = A.x - 2; x <= A.x + 2; x++) for (let z = A.z - 2; z <= A.z + 2; z++) for (let y = A.y; y <= A.y + 3; y++) {
      const edge = x === A.x - 2 || x === A.x + 2 || z === A.z - 2 || z === A.z + 2 || y === A.y + 3;
      w.setBlock(x, y, z, edge ? B.GLASS : B.WATER, 0);
    }
    w.setBlock(A.x, A.y, A.z + 2, B.AIRLOCK, 4, true); w.setBlock(A.x, A.y + 1, A.z + 2, B.AIRLOCK, 12, true);   // (standing open, in the front wall)
  }, A);
  await waitFor(G, A => game.world.getBlock(A.x, A.y + 1, A.z) === B.WATER && game.world.getBlock(A.x, A.y, A.z + 2) === B.AIRLOCK, 8000, A);
  await G.evaluate(A => { const pl = game.player; Object.assign(pl, { x: A.x + 0.5, y: A.y, z: A.z + 4.5, yaw: 0, pitch: -0.2 }); T.hold(0); pl.target = { x: A.x, y: A.y, z: A.z + 2, id: B.AIRLOCK, face: 5 }; pl.useBlock(0, false); }, A);
  const drained = await waitFor(G, A => { const w = game.world; for (let x = A.x - 1; x <= A.x + 1; x++) for (let z = A.z - 1; z <= A.z + 1; z++) for (let y = A.y; y <= A.y + 2; y++) if (w.getBlock(x, y, z) !== B.AIR) return false; return true; }, 10000, A);
  check('she shuts an airlock door and the room behind it is pumped dry (for her too)', drained, await G.evaluate(A => game.world.getBlock(A.x, A.y + 1, A.z), A));
  check('...and she hears the pump', await waitFor(G, () => window.__fx.has('sfx:airlockDrain'), 5000));
  // 3. a garage door: she rolls it up, and it is up for the host too
  await H.evaluate(S => { const w = game.world; for (let x = S.x + 8; x <= S.x + 10; x++) for (let y = S.y; y <= S.y + 1; y++) w.setBlock(x, y, S.z, B.GARAGE_DOOR, 0, true); }, S);
  await waitFor(G, S => game.world.getBlock(S.x + 10, S.y + 1, S.z) === B.GARAGE_DOOR, 8000, S);
  await G.evaluate(S => { const pl = game.player; Object.assign(pl, { x: S.x + 9.5, y: S.y, z: S.z + 2.5, yaw: 0 }); pl.target = { x: S.x + 9, y: S.y, z: S.z, id: B.GARAGE_DOOR, face: 5 }; pl.useBlock(0, false); }, S);
  check('she rolls up a garage door, and it is up for the host', await waitFor(H, S => { let n = 0; for (let x = S.x + 8; x <= S.x + 10; x++) for (let y = S.y; y <= S.y + 1; y++) if (game.world.getBlock(x, y, S.z) === B.GARAGE_OPEN) n++; return n === 6; }, 8000, S));
  check('...and she hears it', await waitFor(G, () => window.__fx.has('door'), 5000));

  // 4. the host flies the passenger plane and she rides in a seat behind
  await H.evaluate(S => {
    for (const x of [S.x + 3]) for (const y of [S.y, S.y + 1]) game.world.setBlock(x, y, S.z + 1, B.AIR, 0, true);
    const v = spawnVehicle(game, 'airliner', S.x + 0.5, S.y, S.z + 13.5, 0);
    Object.assign(game.player, { x: S.x + 2.5, y: S.y, z: S.z + 13.5, yaw: 0, pitch: 0 });
    mountVehicle(game, v);
  }, S);
  const nid = await H.evaluate(() => game.player.riding && game.player.riding.nid);
  await waitFor(G, nid => game.entities.some(e => e.nid === nid && e.rider), 8000, nid);
  await G.evaluate(S => Object.assign(game.player, { x: S.x - 2, y: S.y, z: S.z + 13.5, vx: 0, vy: 0, vz: 0 }), S);
  await settle();
  await G.evaluate(nid => { const v = game.entities.find(e => e.nid === nid); mountVehicle(game, v); }, nid);
  check('she gets into a seat in the plane the host is flying', await waitFor(G, () => game.player.riding && game.player.seat === 1, 8000) && await H.evaluate(gid => { const v = game.player.riding; return !!v && v.pass && v.pass[1] === gid; }, GID),
    await G.evaluate(() => ({ seat: game.player.seat, riding: !!game.player.riding })));
  await H.evaluate(() => { game.input.fwd = true; game.player.pitch = 0; });
  await waitFor(H, () => (game.player.riding.spd || 0) > 10, 10000);
  await H.evaluate(() => { game.player.pitch = 0.35; });
  const off = await waitFor(H, S => game.player.riding.flying && game.player.riding.y > S.y + 8, 15000, S);
  const g1 = await G.evaluate(nid => { const v = game.entities.find(e => e.nid === nid), pl = game.player; return { y: pl.y, d: v ? Math.hypot(pl.x - v.x, pl.z - v.z) : 99 }; }, nid);
  check('the host takes off, and she flies along in her seat', off && g1.y > S.y + 6 && g1.d < 4, g1);
  await G.evaluate(() => { game.view = 1; });
  await sleep(800);
  await G.screenshot({ path: path.join(out, 'mp4-passenger-guest.png') });
  await G.evaluate(() => { game.view = 0; });
  check('the host hears his passenger sitting with him (she is in the plane on his iPad too)', await H.evaluate(gid => { const r = MP.remotes.get(gid); return !!r && r.riding === 'car'; }, GID));
  // she jumps out with a parachute; the host sees it
  await G.evaluate(() => { game.input.sneak = true; });
  await sleep(300);
  await G.evaluate(() => { game.input.sneak = false; });
  check('up in the air, she jumps out with a parachute', await G.evaluate(() => !game.player.riding && game.player.chute));
  check('...the host sees her parachute', await waitFor(H, gid => { const r = MP.remotes.get(gid); return !!r && r.chute; }, 5000, GID));
  check('...and her seat is free again', await waitFor(H, gid => { const v = game.player.riding; return !!v && !(v.pass || []).includes(gid); }, 5000, GID));
  await H.evaluate(() => { game.view = 1; });
  await sleep(600);
  await H.screenshot({ path: path.join(out, 'mp4-parachute-host.png') });
  await H.evaluate(() => { game.view = 0; game.input.fwd = false; });
  check('she floats down and lands safely', await waitFor(G, () => !game.player.chute, 60000) && await G.evaluate(() => game.player.alive && game.player.health === 20), await G.evaluate(() => game.player.health));
  // the host lands (put back down on the floor) and gets out
  await H.evaluate(S => { const v = game.player.riding; v.flying = false; v.spd = 0; v.x = S.x + 0.5; v.y = S.y; v.z = S.z + 13.5; dismountVehicle(game); }, S);

  // 5. now she flies the propeller plane, and the host rides behind her
  await G.evaluate(S => Object.assign(game.player, { x: S.x + 6.5, y: S.y, z: S.z + 15.5, yaw: 0, pitch: -0.5, vx: 0, vy: 0, vz: 0, chute: false }), S);
  await settle();
  await G.evaluate(S => { T.hold(I.PLANE, 1); game.player.target = { x: S.x + 6, y: S.y - 1, z: S.z + 13, id: B.STONE, face: 2 }; game.player.useBlock(I.PLANE, false); }, S);
  check('she puts down a propeller plane', await waitFor(H, () => T.ents('plane').length === 1, 8000));
  const pid = await H.evaluate(() => T.ents('plane')[0].nid);
  await waitFor(G, pid => game.entities.some(e => e.nid === pid), 8000, pid);
  await G.evaluate(pid => { const v = game.entities.find(e => e.nid === pid); mountVehicle(game, v); }, pid);
  check('she gets in to fly it', await waitFor(G, () => game.player.riding && !game.player.seat && game.player.riding.local, 8000));
  await waitFor(H, gid => T.ents('plane')[0].rider === gid, 8000, GID);
  await H.evaluate(S => { Object.assign(game.player, { x: S.x + 8.5, y: S.y, z: S.z + 13.5 }); mountVehicle(game, T.ents('plane')[0]); }, S);
  check('the host gets in the seat behind her', await H.evaluate(() => game.player.riding && game.player.seat === 1));
  await G.evaluate(() => { game.player.yaw = 0; game.player.pitch = 0; game.input.fwd = true; });
  await waitFor(G, () => (game.player.riding.spd || 0) > 7, 10000);
  await G.evaluate(() => { game.player.pitch = 0.4; });
  const gup = await waitFor(G, S => game.player.riding.flying && game.player.riding.y > S.y + 8, 15000, S);
  const h1 = await H.evaluate(() => { const v = T.ents('plane')[0], pl = game.player; return { y: pl.y, d: Math.hypot(pl.x - v.x, pl.z - v.z), seat: pl.seat }; });
  check('she takes off, and the host flies along behind her', gup && h1.y > S.y + 6 && h1.d < 3 && h1.seat === 1, h1);
  await H.evaluate(() => { game.view = 1; });
  await sleep(600);
  await H.screenshot({ path: path.join(out, 'mp4-host-passenger.png') });
  await H.evaluate(() => { game.view = 0; });
  await G.evaluate(() => { game.input.fwd = false; });

  check('no page errors', H.errs.length === 0 && G.errs.length === 0, H.errs.concat(G.errs).slice(0, 6));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close(); peer.close && peer.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
