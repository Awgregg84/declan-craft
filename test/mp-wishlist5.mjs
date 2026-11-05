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

  // ---------- Hogwarts: the host opens a Hogwarts world and she joins ----------
  const atHog = on('students') || on('quidditch');
  if (atHog) {
    await H.evaluate(() => game.quitToTitle());
    await waitFor(G, () => game.state === 'title', 15000);
    await H.evaluate(() => { ui.hostMode = true; game.startWorld('hogwarts', 'survival', true); game.settings.difficulty = 0; });
    await waitFor(H, () => game.state === 'playing' && MP.roomOpen, 150000);
    const code2 = await H.evaluate(() => MP.code);
    await G.evaluate(() => showScreen('scr-title'));
    await G.evaluate(code => { MP.join(code); }, code2);
    await waitFor(H, () => !el('join-prompt').hidden, 30000);
    await H.evaluate(() => MP.answerPrompt(true));
    check('she joins the Hogwarts world', await waitFor(G, () => game.state === 'playing' && MP.welcomed && game.mapId === 'hogwarts', 150000));
  }
  if (on('students')) {
    // 2. students: the host's iPad puts them about; she sees them and one says hello to her
    await G.evaluate(() => Object.assign(game.player, { x: 0.5, y: 73, z: -24.5, vx: 0, vy: 0, vz: 0 }));
    await H.evaluate(() => Object.assign(game.player, { x: 6.5, y: 73, z: -24.5, vx: 0, vy: 0, vz: 0 }));
    await waitFor(H, () => game.world.readyAround(0.5, -30, 1) >= 1, 60000);
    await sleep(1500);
    for (let i = 0; i < 6; i++) { await H.evaluate(() => studentTick(game)); await sleep(150); }
    check('she sees the students in their house robes', await waitFor(G, () => T.ents('student').length >= 3 && T.ents('student').every(e => e.variant >= 0 && e.variant < 8), 8000), await G.evaluate(() => T.ents('student').length));
    const sid = await H.evaluate(() => { const s = T.ents('student')[0]; s.hiT = 0; s.moving = false; return s.nid; });
    const sp = await G.evaluate(sid => { const s = game.entities.find(e => e.nid === sid); return [s.x, s.y, s.z]; }, sid);
    await G.evaluate(sp => Object.assign(game.player, { x: sp[0] + 2.5, y: sp[1], z: sp[2] + 0.5 }), sp);
    check('a student waves and says hello to her (by name)', await waitFor(G, () => T.chat(/student: ".*/) && Array.from(document.querySelectorAll('#chat-log div')).some(d => /student: ".*(Cora|!)/.test(d.textContent)), 8000)
      && await waitFor(G, sid => { const s = game.entities.find(e => e.nid === sid); return s && s.waveT > 0; }, 4000, sid));
  }
  if (on('quidditch')) {
    // 3. Quidditch: she flies onto the pitch on her broom; the match starts; she grabs the Quaffle and scores
    const L = await H.evaluate(() => game.gen.hogwarts.pitch);
    await H.evaluate(L => Object.assign(game.player, { x: L.x - 30.5, y: L.y + 1, z: L.z + 0.5 }), L);
    await G.evaluate(L => Object.assign(game.player, { x: L.x - 24.5, y: L.y + 1, z: L.z + 0.5, vx: 0, vy: 0, vz: 0 }), L);
    await waitFor(G, L => game.world.readyAround(L.x - 24.5, L.z, 2) >= 1, 60000, L);
    await G.evaluate(L => { const pl = game.player; T.hold(I.BROOM, 1); pl.target = { x: L.x - 25, y: L.y, z: L.z + 2, id: B.GRASS, face: 2 }; pl.useBlock(I.BROOM, false); }, L);
    await waitFor(G, () => T.ents('broom').length >= 1, 8000);
    await G.evaluate(() => mountVehicle(game, T.ents('broom')[0]));
    check('she gets on her broomstick', await waitFor(G, () => game.player.riding && game.player.riding.local, 8000));
    await sleep(1500);
    check('the match starts on the host', await waitFor(H, () => !!game.qm && T.ents('qplayer').length === 6, 8000));
    check('she sees both teams on their brooms, and the Quaffle', await waitFor(G, () => T.ents('qplayer').length === 6 && T.ents('quaffle').length === 1 && new Set(T.ents('qplayer').map(q => q.team)).size === 2, 8000));
    // the Quaffle comes loose right by her: she grabs it
    const hoop = await H.evaluate(() => qHoops(0)[1]);
    await G.evaluate(h => { const v = game.player.riding; v.flying = true; v.x = h[0] - 8; v.y = h[1] - 1; v.z = h[2] + 0.5; v.vx = v.vz = 0; }, hoop);
    await sleep(800);
    await H.evaluate(h => { for (const q of T.ents('qplayer')) { q.x = game.gen.hogwarts.pitch.x; q.z = game.gen.hogwarts.pitch.z + 60; } const b = game.qm.ball; b.holder = ''; b.passT = 0; b.vx = b.vy = b.vz = 0; b.x = h[0] - 8; b.y = h[1]; b.z = h[2] + 0.5; }, hoop);
    check('she flies into the Quaffle and has it', await waitFor(H, gid => game.qm && game.qm.ball.holder === gid, 8000, GID) && await waitFor(G, () => !!quaffleHeld(game), 5000));
    await G.evaluate(h => { const pl = game.player; T.aim(h[0] + 0.5, h[1] + 0.5, h[2] + 0.5); T.tap(); }, hoop);
    check('she throws it through a hoop: a goal on the host', await waitFor(H, () => game.qm && game.qm.score[0] >= 1, 8000), await H.evaluate(() => game.qm && game.qm.score));
    check('...and the score shows on her screen', await waitFor(G, () => el('qscore') && /Gryffindor 10 +- +0 Slytherin|Slytherin 10 +- +0 Gryffindor/.test(el('qscore').textContent) && T.chat(/Cora scored!/), 6000), await G.evaluate(() => el('qscore') && el('qscore').textContent));
    await G.evaluate(() => { game.view = 1; });
    await sleep(600);
    await G.screenshot({ path: path.join(out, 'mp5-guest-quidditch.png') });
    await G.evaluate(() => { game.view = 0; });
  }

  if (on('falls')) {
    // 4. Declan Falls: each of them picks who they are
    await H.evaluate(() => game.quitToTitle());
    await waitFor(G, () => game.state === 'title', 15000);
    await H.evaluate(() => { ui.hostMode = true; game.startWorld('falls', 'survival', true); });
    await waitFor(H, () => game.state === 'playing' && MP.roomOpen && ui.screen === 'scr-falls', 150000);
    await H.evaluate(() => document.querySelectorAll('#falls-chars button')[0].click());
    const code3 = await H.evaluate(() => MP.code);
    await G.evaluate(() => showScreen('scr-title'));
    await G.evaluate(code => { MP.join(code); }, code3);
    await waitFor(H, () => !el('join-prompt').hidden, 30000);
    await H.evaluate(() => MP.answerPrompt(true));
    check('she joins Declan Falls, and is asked who she is', await waitFor(G, () => game.state === 'playing' && MP.welcomed && game.mapId === 'falls' && ui.screen === 'scr-falls', 150000));
    await G.evaluate(() => document.querySelectorAll('#falls-chars button')[1].click());
    check('she is Mabel, in a sweater', await G.evaluate(() => game.stats.fc === 2 && mySkin() === 'falls_1' && game.player.inv[ARMOR_INV + 1] && game.player.inv[ARMOR_INV + 1].id === I.SWEATER));
    check('the host sees her as Mabel, and she sees him as Dipper', await waitFor(H, gid => { const r = MP.remotes.get(gid); return r && r.fc === 2 && r.armor[1] === I.SWEATER; }, 8000, GID) && await waitFor(G, () => [...MP.remotes.values()].some(r => r.fc === 1), 8000));
    // she finds a mystery: it is kept for her on the host
    await G.evaluate(() => { const m = game.gen.falls.myst[1]; Object.assign(game.player, { x: m.x + 0.5, y: game.gen.fallsGround(game.seed, m.x, m.z) + 1, z: m.z + 0.5, vx: 0, vy: 0, vz: 0 }); });
    check('she finds the glowing rock', await waitFor(G, () => mystCount() === 1 && el('myst-count').textContent === 'Mysteries found 1/6', 8000));
    check('...and the host hears about it', await waitFor(H, () => T.chat(/Cora found a mystery: The glowing rock!/), 6000));
    await sleep(800);
    await H.evaluate(() => game.save());
    const saved = await H.evaluate(gid => { const d = JSON.parse(store.get(saveKey('falls'))), me = d.stats; return { her: d.players[gid] && { fc: d.players[gid].fc, myst: d.players[gid].myst }, me: { fc: me.fc } }; }, GID);
    check('who she is and what she found are kept with the world on the host', saved.her && saved.her.fc === 2 && saved.her.myst === 2 && saved.me.fc === 1, saved);
    await H.evaluate(gid => { const r = MP.remotes.get(gid); Object.assign(game.player, { x: r.tx + 3, y: r.ty, z: r.tz, yaw: Math.PI / 2 }); }, GID);
    await sleep(800);
    await H.screenshot({ path: path.join(out, 'mp5-host-sees-mabel.png') });
  }

  check('no page errors', H.errs.length === 0 && G.errs.length === 0, H.errs.concat(G.errs).slice(0, 6));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close(); peer.close && peer.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
