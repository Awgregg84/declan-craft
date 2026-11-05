// Declan's sixth wish list, playing together. Sections can be picked: node test/mp-wishlist6.mjs lasers money trains planets ghosts life
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
  /* the host starts another world and she joins it again */
  async function hostAgain(slot) {
    await G.evaluate(() => game.quitToTitle());
    await H.evaluate(() => game.quitToTitle());
    await sleep(1500);
    await H.evaluate(slot => { ui.hostMode = true; game.startWorld(slot, 'survival', true); }, slot);
    await waitFor(H, () => game.state === 'playing' && MP.roomOpen, 120000);
    const code = await H.evaluate(() => MP.code);
    await G.evaluate(code => { MP.join(code); }, code);
    await waitFor(H, () => !el('join-prompt').hidden, 30000);
    await H.evaluate(() => MP.answerPrompt(true));
    return waitFor(G, () => game.state === 'playing' && MP.welcomed, 120000);
  }

  if (on('lasers')) {
    // a guest fires a laser at a zombie (the host hurts it) and at a pig (nothing happens); the host sees her beam
    await H.evaluate(S => {
      for (const e of game.entities) if (e.mob) e.removed = true;
      const z = spawnMob(game, 'zombie', S.x + 3.5, S.y, S.z + 0.5); z.ai = () => {}; window.__z = z;
      const p = spawnMob(game, 'pig', S.x + 6.5, S.y, S.z + 0.5); p.ai = () => {}; window.__p = p;
      window.__fx = new Set();
    }, S);
    const zid = await H.evaluate(() => window.__z.nid), pid2 = await H.evaluate(() => window.__p.nid);
    await waitFor(G, ids => ids.every(id => game.entities.some(e => e.nid === id)), 8000, [zid, pid2]);
    const hp0 = await H.evaluate(() => window.__z.hp);
    await G.evaluate(([zid, S]) => { const pl = game.player; Object.assign(pl, { x: S.x + 3.5, y: S.y, z: S.z + 8.5 }); T.hold(I.LASER, 1); const z = game.entities.find(e => e.nid === zid); T.aim(z.x, z.y + 1, z.z); pl.useCd = 0; T.tap(); }, [zid, S]);
    check('her laser hurts the zombie (the host decides)', await waitFor(H, hp0 => window.__z.hp < hp0, 6000, hp0));
    check('the host sees her beam', await waitFor(H, () => window.__fx.has('laser') || PARTICLES.some(q => q.tile === TILE.laser_0), 6000));
    const php = await H.evaluate(() => window.__p.hp);
    await G.evaluate(([pid2, S]) => { const pl = game.player; Object.assign(pl, { x: S.x + 6.5, y: S.y, z: S.z + 8.5 }); const p = game.entities.find(e => e.nid === pid2); T.aim(p.x, p.y + 0.5, p.z); pl.useCd = 0; T.tap(); }, [pid2, S]);
    await sleep(1500);
    check('her laser does not hurt a pig', await H.evaluate(php => window.__p.hp === php && !window.__p.dead, php));
    // the host fires: she sees the beam
    await G.evaluate(() => { window.__fx = new Set(); });
    await H.evaluate(S => { const pl = game.player; Object.assign(pl, { x: S.x + 3.5, y: S.y, z: S.z + 6.5, vx: 0, vz: 0 }); T.hold(I.LASER, 1); T.aim(S.x + 3.5, S.y + 1, S.z - 6); pl.useCd = 0; T.tap(); }, S);
    check('she sees the host\'s beam', await waitFor(G, () => window.__fx.has('laser'), 6000));
    await H.evaluate(() => { for (const e of game.entities) if (e.mob) e.removed = true; });
  }

  if (on('money')) {
    // a shopkeeper on the host; she buys bread with her own money (the host checks), sells cobblestone, and can't cheat
    await H.evaluate(S => { for (const e of game.entities) if (e.mob) e.removed = true; const e = spawnMob(game, 'villager', S.x + 0.5, S.y, S.z + 4.5, { prof: 'shopkeeper', home: [S.x + 0.5, S.z + 4.5], village: 'stest', vseed: 5 }); window.__k = e; }, S);
    const kid = await H.evaluate(() => window.__k.nid);
    check('she sees the shopkeeper', await waitFor(G, kid => game.entities.some(e => e.nid === kid && e.prof === 'shopkeeper'), 8000, kid));
    await G.evaluate(S => { const pl = game.player; Object.assign(pl, { x: S.x + 0.5, y: S.y, z: S.z + 7.5 }); for (let i = 0; i < 36; i++) pl.inv[i] = null; giveMoney(pl, 12); pl.give(B.COBBLE, 16); }, S);
    await G.evaluate(kid => { const e = game.entities.find(q => q.nid === kid); openTrade(e); shopDeal(false, 0); }, kid);
    check('she buys bread: the host says yes, and her money goes down', await waitFor(G, () => T.count(I.BREAD) === 3 && moneyOf(game.player) === 9, 8000), await G.evaluate(() => [T.count(I.BREAD), moneyOf(game.player)]));
    await G.evaluate(() => { ui.inv.tab = 1; buildInv(); shopDeal(true, 0); });
    check('she sells 16 cobblestone for $1', await waitFor(G, () => T.count(B.COBBLE) === 0 && moneyOf(game.player) === 10, 8000));
    check('the host keeps her money with her things', await waitFor(H, gid => { const s = MP.guestSaves[gid]; return s && moneyOf(s) === 10; }, 8000, GID));
    // money that the host never heard about doesn't buy anything
    await G.evaluate(() => { window.__ss = MP.sendSave; MP.sendSave = () => {}; giveMoney(game.player, 100); ui.inv.tab = 0; buildInv(); const k = SHOP_BUY.findIndex(it => it[0] === I.LASER); shopDeal(false, k); });
    await sleep(2500);
    check('the host says no to money it never saw', await G.evaluate(() => T.count(I.LASER) === 0 && /not just now/.test(document.querySelector('.trade-msg').textContent)));
    await G.evaluate(() => { MP.sendSave = window.__ss; closeInv(); });
  }

  if (on('trains')) {
    // the host drives a train and she rides in a carriage; then she drives it herself
    await H.evaluate(S => { const w = game.world; for (let dx = -15; dx <= 15; dx++) w.setBlock(S.x + dx, S.y, S.z + 2, B.RAIL, 1); for (const e of game.entities) if (e.vehicle) e.removed = true; window.__t = spawnVehicle(game, 'train', S.x - 11.5, S.y + 0.0625, S.z + 2.5, -Math.PI / 2); }, S);
    const tid = await H.evaluate(() => window.__t.nid);
    check('she sees the train', await waitFor(G, tid => game.entities.some(e => e.nid === tid && e.type === 'train'), 8000, tid));
    await H.evaluate(S => { const pl = game.player; Object.assign(pl, { x: S.x - 11.5, y: S.y, z: S.z + 4.5 }); mountVehicle(game, window.__t); }, S);
    await G.evaluate(([tid, S]) => { const pl = game.player; Object.assign(pl, { x: S.x - 14.5, y: S.y, z: S.z + 4.5 }); }, [tid, S]);
    await sleep(800);
    await G.evaluate(tid => mountVehicle(game, game.entities.find(e => e.nid === tid)), tid);
    check('she gets a seat in a carriage', await waitFor(G, () => game.player.riding && game.player.seat >= 1, 8000), await G.evaluate(() => game.player.seat));
    await H.evaluate(() => { game.input.fwd = true; }); await sleep(400); await H.evaluate(() => { game.input.fwd = false; });
    await sleep(2500);
    const ride = await G.evaluate(tid => { const v = game.entities.find(e => e.nid === tid), pl = game.player, c = carPose(v, TRAIN_SEATS[pl.seat][3]); return { moved: v.x, seat: pl.seat, near: Math.hypot(pl.x - c.x, pl.z - c.z) }; }, tid);
    const hostSees = await H.evaluate(gid => { const r = MP.remotes.get(gid); return { seat: r.seat, inSeat: r.inPlane }; }, GID);
    check('the train sets off with her in it', ride.moved > S.x - 9 && ride.near < 1.5 && hostSees.seat === ride.seat && hostSees.inSeat, { ride, hostSees });
    await H.evaluate(() => { const v = window.__t; v.running = 0; });
    await sleep(1500);
    await G.evaluate(() => { game.input.sneak = true; }); await sleep(300); await G.evaluate(() => { game.input.sneak = false; });
    check('she gets out', await waitFor(G, () => !game.player.riding, 5000));
    check('and the host lets her seat go', await waitFor(H, gid => !(window.__t.pass || []).includes(gid), 5000, GID));
    await H.evaluate(() => dismountVehicle(game));
    await sleep(500);
    await G.evaluate(tid => { const v = game.entities.find(e => e.nid === tid), pl = game.player; Object.assign(pl, { x: v.x, y: v.y, z: v.z + 2 }); mountVehicle(game, v); }, tid);
    check('she drives it', await waitFor(G, () => game.player.riding && !game.player.seat && game.player.riding.local, 8000));
    const x0 = await H.evaluate(() => window.__t.x);
    await G.evaluate(() => { game.input.fwd = true; }); await sleep(400); await G.evaluate(() => { game.input.fwd = false; });
    check('the train goes along on the host too', await waitFor(H, x0 => window.__t.x > x0 + 3, 8000, x0));
    await G.evaluate(() => { game.player.riding.running = 0; dismountVehicle(game); });
    await sleep(500);
  }

  if (on('planets')) {
    // the host blasts off to Jupiter and she comes too; back home, she picks Uranus in her own rocket and everyone goes
    await H.evaluate(S => { for (const e of game.entities) if (e.vehicle) e.removed = true; const pl = game.player; Object.assign(pl, { x: S.x + 0.5, y: S.y, z: S.z - 3.5 }); const r = spawnVehicle(game, 'rocket', S.x + 0.5, S.y, S.z - 5.5, 0); boardVehicle(game, r); game.rocketTravel(null, r, 'jupiter'); }, S);
    check('the host flies to Jupiter, and she comes along', await waitFor(G, () => game.dim === 'jupiter' && game.state === 'playing' && !game.awaitTp, 90000));
    await sleep(3000);
    const gj = await G.evaluate(() => { const pl = game.player, w = game.world; let solid = false; for (let k = 0; k < 6; k++) if (SOLID[w.getBlock(Math.floor(pl.x), Math.floor(pl.y) - k, Math.floor(pl.z))]) solid = true; return { helmet: wearsSpaceHelmet(pl) || pl.inv.some(s => s && s.id === I.SPACE_HELMET), y: pl.y, solid, sky: skyState(0.3, w.map).planet }; });
    check('she is on a cloud island, with a space helmet', gj.helmet && gj.solid && gj.sky === 2, gj);
    await H.evaluate(() => { const pl = game.player; if (pl.riding) dismountVehicle(game); const r = T.ents('rocket')[0]; boardVehicle(game, r); game.rocketTravel(null, r); });
    check('home again together', await waitFor(G, () => game.dim === 'over' && game.state === 'playing' && !game.awaitTp, 90000));
    await sleep(2500);
    await G.evaluate(() => { if (game.player.riding) dismountVehicle(game); });
    await sleep(500);
    await H.evaluate(() => { if (game.player.riding) dismountVehicle(game); for (const e of T.ents('rocket')) e.removed = true; });
    await sleep(800);
    await G.evaluate(() => { const pl = game.player; T.hold(I.ROCKET, 1); const x = Math.floor(pl.x) + 2, z = Math.floor(pl.z); const top = game.world.topSolid(x, z); pl.target = { x, y: top, z, id: game.world.getBlock(x, top, z), face: 2 }; pl.useBlock(I.ROCKET, true); });
    check('she puts down her own rocket', await waitFor(G, () => game.entities.some(e => e.type === 'rocket' && !e.removed && Math.hypot(e.x - game.player.x, e.z - game.player.z) < 4), 8000));
    await G.evaluate(() => { const pl = game.player, d = e => Math.hypot(e.x - (Math.floor(pl.x) + 2.5), e.z - (Math.floor(pl.z) + 0.5)), r = game.entities.filter(e => e.type === 'rocket' && !e.removed).sort((a, b) => d(a) - d(b))[0]; mountVehicle(game, r); });
    check('she gets in', await waitFor(G, () => game.player.riding && game.player.riding.type === 'rocket', 8000));
    await G.evaluate(() => { rocketLaunch(game, game.player, game.player.riding); });
    const shown = await G.evaluate(() => !el('planet-pick').hidden);
    await G.evaluate(() => document.querySelector('.planet-btn[data-planet="uranus"]').click());
    check('she picks Uranus, and the host hears about it', shown && await waitFor(H, () => Array.from(document.querySelectorAll('#chat-log div')).some(d => /blasting off to Uranus/.test(d.textContent)), 8000));
    check('everyone goes to Uranus', await waitFor(H, () => game.dim === 'uranus' && game.state === 'playing', 60000) && await waitFor(G, () => game.dim === 'uranus' && game.state === 'playing', 60000));
    await sleep(3000);
    await H.evaluate(() => { const pl = game.player; if (pl.riding) dismountVehicle(game); const r = spawnVehicle(game, 'rocket', pl.x, pl.y, pl.z, 0); game.rocketTravel(null, r); });
    await waitFor(G, () => game.dim === 'over' && game.state === 'playing' && !game.awaitTp, 90000);
    await sleep(1500);
  }

  if (on('ghosts')) {
    // the Ghostbusters city: she gets her own equipment, holds a ghost in her stream, traps it, and gets slimed
    check('the host shares the Ghostbusters city and she joins', await hostAgain('ghost'));
    await sleep(2000);
    const kit = await G.evaluate(() => [I.PROTON_PACK, I.GHOST_TRAP, I.GHOST_DETECTOR].every(id => game.player.inv.some(s => s && s.id === id)));
    check('she starts with her own proton pack, trap and detector', kit);
    await H.evaluate(() => { for (const e of game.entities) if (isGhost(e)) e.removed = true; Object.assign(game.player, { x: -6.5, y: 65, z: 4.5 }); const e = spawnMob(game, 'slimer', 0.5, 66.5, -1.5); e.home = [0.5, -1.5]; e.cdT = 99; e.aiT = 99; e.goal = [0.5, 0, -1.5]; window.__g = e; window.__fx = new Set(); });
    const gid = await H.evaluate(() => window.__g.nid);
    await G.evaluate(() => Object.assign(game.player, { x: 0.5, y: 65, z: 5.5, vx: 0, vz: 0 }));
    check('she sees the ghost', await waitFor(G, gid => game.entities.some(e => e.nid === gid), 10000, gid));
    await G.evaluate(gid => { const e = game.entities.find(q => q.nid === gid); T.hold(I.PROTON_PACK, 1); T.aim(e.x, e.y + 0.5, e.z); game.input.use = true; }, gid);
    check('her proton stream holds the ghost (on the host)', await waitFor(H, () => window.__g.heldT > 0, 6000));
    check('and the host sees her stream', await waitFor(H, () => PARTICLES.some(q => q.tile === TILE.proton), 6000));
    await G.evaluate(() => { game.input.use = false; T.hold(I.GHOST_TRAP, 1); game.player.useCd = 0; T.tap(); });
    check('she throws the trap: the ghost is caught, and it counts for her', await waitFor(H, () => window.__g.removed, 8000) && await waitFor(G, () => game.stats.ghosts === 1, 8000));
    check('the host keeps her count with her things', await waitFor(H, gid => MP.guestSaves[gid] && MP.guestSaves[gid].gh === 1, 8000, GID));
    await H.evaluate(gid => { const r = MP.remotes.get(gid), e = spawnMob(game, 'slimer', r.tx + 3, r.ty + 1, r.tz); e.home = [r.tx + 3, r.tz]; }, GID);
    check('a slimy ghost slimes her (slowed a moment, not hurt)', await waitFor(G, () => hasEffect(game.player, 'slowness'), 12000) && await G.evaluate(() => game.player.health === 20));
  }

  check('no page errors', H.errs.length === 0 && G.errs.length === 0, H.errs.concat(G.errs).slice(0, 6));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close(); peer.close && peer.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
