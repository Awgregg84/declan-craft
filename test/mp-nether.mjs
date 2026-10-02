// Playing together in the Nether: whoever steps through a portal takes everyone along.
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
const HOST = { skin: 'declan', name: 'Declan', pid: 'hostpid0001' }, GUEST = { skin: 'sister', name: 'Cora', pid: 'guestpid002' };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'] });
  const url = 'http://localhost:' + server.address().port + '/';
  async function open(profile, label) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
    await ctx.addInitScript(([port, prof]) => {
      window.DC_NET = { host: '127.0.0.1', port, secure: false, path: '/', key: 'peerjs', iceServers: [], mqtt: [] };
      if (!localStorage.getItem('declancraft:v1:profile')) localStorage.setItem('declancraft:v1:profile', JSON.stringify(prof));
    }, [PEER_PORT, profile]);
    const p = await ctx.newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(label + ': ' + e.message));
    await p.goto(url);
    await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
    await p.evaluate(() => { window.__chat = []; const say = chat; chat = (m, c) => { window.__chat.push(String(m)); return say(m, c); }; });   // lines fade from the screen after 10 s
    return p;
  }
  const waitFor = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
  const chatHas = (p, re, ms) => waitFor(p, re => window.__chat.some(t => new RegExp(re).test(t)), ms || 8000, re);
  const H = await open(HOST, 'host'), G = await open(GUEST, 'guest');

  // host a creative world, guest joins
  await H.evaluate(() => { game.dragLook = true; ui.hostMode = true; game.startWorld('valley', 'creative', true); });
  await waitFor(H, () => game.state === 'playing' && MP.roomOpen, 120000);
  const code = await H.evaluate(() => MP.code);
  await G.evaluate(code => { game.dragLook = true; MP.join(code); }, code);
  await waitFor(H, () => !el('join-prompt').hidden, 30000);
  await H.evaluate(() => MP.answerPrompt(true));
  check('guest joins', await waitFor(G, () => game.state === 'playing' && MP.welcomed, 120000));

  // a lit portal on a platform, both players next to it
  const F = await H.evaluate(() => {
    const w = game.world, pl = game.player, x = Math.floor(pl.x) + 2, y = 100, z = Math.floor(pl.z) + 2;
    for (let dx = -5; dx <= 6; dx++) for (let dz = -5; dz <= 5; dz++) w.setBlock(x + dx, y - 1, z + dz, B.STONE, 0);
    for (let i = -1; i <= 2; i++) for (let j = -1; j <= 3; j++) if (i === -1 || i === 2 || j === -1 || j === 3) w.setBlock(x + i, y + j, z, B.OBSIDIAN, 0);
    lightPortalAt(game, x, y, z);
    Object.assign(pl, { x: x + 1, y, z: z + 3.5, vx: 0, vy: 0, vz: 0, flying: false, yaw: Math.PI, pitch: 0 });
    return { x, y, z };
  });
  check('guest sees the lit portal', await waitFor(G, F => game.world.getBlock(F.x, F.y + 1, F.z) === B.NETHER_PORTAL && game.world.getBlock(F.x + 3, F.y - 1, F.z + 3) === B.STONE, 10000, F));
  await G.evaluate(F => Object.assign(game.player, { x: F.x + 3.5, y: F.y, z: F.z + 3.5, vx: 0, vy: 0, vz: 0, flying: false }), F);   // only once the platform is there
  // a chest by the portal, open on her screen as everyone travels
  const C = { x: F.x - 3, y: F.y, z: F.z + 2 };
  await H.evaluate(C => { const w = game.world; w.setBlock(C.x, C.y, C.z, B.CHEST, 0); w.getTile(C.x, C.y, C.z, 'chest').slots[0] = { id: I.DIAMOND, count: 10 }; }, C);
  await waitFor(G, C => game.world.getBlock(C.x, C.y, C.z) === B.CHEST, 8000, C);
  await G.evaluate(C => game.openScreen('chest', MP.openTile(C.x, C.y, C.z, 'chest')), C);
  check('guest opens the chest', await waitFor(G, () => ui.inv && ui.inv.tile && !ui.inv.tile.loading && ui.inv.tile.slots[0] && ui.inv.tile.slots[0].count === 10, 8000));
  await G.evaluate(() => { ui.inv.tile.slots[0].count = 6; game.player.inv.fill(null); game.player.inv[8] = { id: I.DIAMOND, count: 4 }; });   // she takes 4 just as the portal fires: not sent yet
  // the host takes a while to find the way out on the other side
  await H.evaluate(() => { const real = window.__arrived = MP.arrived; MP.arrived = function (p) { setTimeout(() => real.call(MP, p), 25000); }; });
  await sleep(1500);

  // 1. the guest steps in: both go to the Nether
  await G.evaluate(F => Object.assign(game.player, { x: F.x + 1, z: F.z + 0.5 }), F);
  check('the host goes too', await waitFor(H, () => game.dim === 'nether' && game.state === 'playing', 120000));
  await H.evaluate(() => { MP.arrived = window.__arrived; });
  const held = await waitFor(G, () => game.state === 'loading' && game.awaitTp > 0 && /Waiting for Declan/.test(el('load-tip').textContent), 22000);
  check('she waits on the loading screen until the host has found the way out', held, await G.evaluate(() => ({ st: game.state, wait: game.awaitTp > 0, tip: el('load-tip').textContent })));
  check('the guest arrives in the Nether', await waitFor(G, () => game.dim === 'nether' && game.world.map === 'nether' && game.state === 'playing', 120000));
  const pos = async () => [await H.evaluate(() => [game.player.x, game.player.y, game.player.z]), await G.evaluate(() => [game.player.x, game.player.y, game.player.z])];
  await sleep(1500);
  let [hp, gp] = await pos();
  check('she comes out right next to the host', Math.hypot(hp[0] - gp[0], hp[2] - gp[2]) < 4 && Math.abs(hp[1] - gp[1]) < 2, { hp, gp });
  check('everyone is told why', await chatHas(H, 'Cora went into the Nether. Everyone travels together') && await chatHas(G, 'Cora went into the Nether. Everyone travels together'));
  check('they see each other again', await waitFor(H, () => { const r = MP.remotes.get('guestpid002'); return r && r.has && r.lastState; }, 15000) && await waitFor(G, () => { const r = MP.remotes.get('host'); return r && r.has; }, 15000));
  const ch = await H.evaluate(C => { const t = game.dims.over.tiles[tileKey(C.x, C.y, C.z)], s = MP.guestSaves.guestpid002; return { chest: t && t.slots[0] ? t.slots[0].count : 0, open: t && t.viewers ? t.viewers.size : 0, hers: s ? s.inv.filter(q => q && q.id === I.DIAMOND).reduce((a, q) => a + q.count, 0) : -1 }; }, C);
  check('the chest she had open keeps her last change: nothing lost or copied', ch.chest === 6 && ch.open === 0 && ch.hers === 4, ch);
  await H.screenshot({ path: path.join(out, 'mp-nether-host.png') });

  // 2. building in the Nether works both ways
  const N = await H.evaluate(() => { const pl = game.player, x = Math.floor(pl.x) + 1, y = Math.floor(pl.y) + 2, z = Math.floor(pl.z) + 1; game.world.setBlock(x, y, z, B.GOLD_BLOCK, 0); return { x, y, z }; });
  check('host blocks appear for the guest', await waitFor(G, N => game.world.getBlock(N.x, N.y, N.z) === B.GOLD_BLOCK, 10000, N));
  await G.evaluate(N => game.world.setBlock(N.x, N.y + 1, N.z, B.QUARTZ_BLOCK, 0), N);
  check('guest blocks appear for the host', await waitFor(H, N => game.world.getBlock(N.x, N.y + 1, N.z) === B.QUARTZ_BLOCK, 10000, N));

  // 3. a piglin the guest hits goes after the guest
  await G.evaluate(() => { game.setMode('survival'); game.player.health = 20; });
  await sleep(800);
  const nid = await H.evaluate(() => { const r = MP.remotes.get('guestpid002'); for (const e of game.entities) if (e.mob) e.removed = true; window.__pg = spawnMob(game, 'piglin', r.tx + 1.5, r.ty, r.tz); return window.__pg.nid; });
  check('guest sees the piglin', await waitFor(G, nid => game.entities.some(e => e.proxy && e.nid === nid), 10000, nid));
  const calm = await G.evaluate(() => game.player.health);
  await G.evaluate(nid => { const e = game.entities.find(e => e.proxy && e.nid === nid); hurtMob(game, e, 2, game.player.x, game.player.z, 'player'); }, nid);
  check('it gets angry at her', await waitFor(H, () => window.__pg.angryT > 0 && window.__pg.angryAt === 'guestpid002', 8000));
  check('...and she gets hurt', await waitFor(G, h => game.player.health < h, 20000, calm), await G.evaluate(() => game.player.health));
  await H.evaluate(() => { window.__pg.removed = true; });
  await G.evaluate(() => { game.setMode('creative'); });

  // 4. the host walks back in: both come home, next to the first portal
  await H.evaluate(() => { const q = game.portals.find(r => r.d === 'nether'), s = portalSpot(q, 0); Object.assign(game.player, { x: s[0], y: s[1], z: s[2], portalLock: false }); });
  check('the host goes home, and takes her along', await waitFor(H, () => game.dim === 'over' && game.state === 'playing', 120000) && await waitFor(G, () => game.dim === 'over' && game.world.map === 'valley' && game.state === 'playing', 120000));
  await sleep(1500);
  [hp, gp] = await pos();
  check('both come out of the first portal', Math.hypot(hp[0] - (F.x + 1), hp[2] - (F.z + 0.5)) < 1 && Math.hypot(gp[0] - (F.x + 1), gp[2] - (F.z + 0.5)) < 4, { hp, gp });
  check('the gold and quartz stayed in the Nether', await G.evaluate(N => game.world.getBlock(N.x, N.y, N.z) !== B.GOLD_BLOCK, N));
  check('...and the chest at home still has 6 diamonds', await H.evaluate(C => { const t = game.world.tiles.get(tileKey(C.x, C.y, C.z)); return !!t && !!t.slots[0] && t.slots[0].count === 6; }, C));

  // 5. joining while the host is in the Nether puts you in the Nether too
  await H.evaluate(F => Object.assign(game.player, { x: F.x + 1, z: F.z + 3.5, portalLock: false }), F);
  await sleep(600);
  await H.evaluate(F => Object.assign(game.player, { x: F.x + 1, z: F.z + 0.5 }), F);
  await waitFor(H, () => game.dim === 'nether' && game.state === 'playing', 120000);
  await waitFor(G, () => game.dim === 'nether' && game.state === 'playing', 120000);
  await G.evaluate(() => game.quitToTitle());
  check('host sees her leave', await chatHas(H, 'Cora left the game', 10000));
  const sv = await H.evaluate(() => MP.guestSaves.guestpid002 && MP.guestSaves.guestpid002.dim);
  check('her save says she was in the Nether', sv === 'nether', sv);
  await G.evaluate(code => MP.join(code), code);
  await waitFor(H, () => !el('join-prompt').hidden, 30000);
  await H.evaluate(() => MP.answerPrompt(true));
  check('rejoining lands her in the Nether with the host', await waitFor(G, () => game.state === 'playing' && MP.welcomed && game.dim === 'nether' && game.world.map === 'nether', 120000));
  [hp, gp] = await pos();
  check('...near the host', Math.hypot(hp[0] - gp[0], hp[2] - gp[2]) < 6, { hp, gp });
  await G.screenshot({ path: path.join(out, 'mp-nether-guest.png') });

  await H.evaluate(() => game.quitToTitle());
  check('guest is told the game ended', await waitFor(G, () => !el('scr-msg').hidden, 10000));
  check('no script errors', H.errs.length + G.errs.length === 0, H.errs.concat(G.errs).slice(0, 4));
  await browser.close(); server.close(); peer.close && peer.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
