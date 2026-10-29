// Declan's third wish list, playing together: the weather, Snorks and golems, the flying car, spells, robots, security
// cameras, building plans, dungeons and the rocket to the Moon all work for a guest as well as the host.
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

  // 1. the weather: rain at the host is rain for her too
  await H.evaluate(() => game.runCommand('/weather rain'));
  check('when it rains for the host, it rains for her too', await waitFor(G, () => WX.on && WX.kind === 1, 8000), await G.evaluate(() => ({ on: WX.on, kind: WX.kind })));
  await H.evaluate(() => game.runCommand('/weather thunder'));
  check('...and a thunderstorm', await waitFor(G, () => WX.on && WX.thunder, 8000));
  await H.evaluate(() => game.runCommand('/weather clear'));
  check('...and when it clears up', await waitFor(G, () => !WX.on, 8000));

  // 2. a Snork and a golem: she sees them as they are
  await H.evaluate(S => { const s = spawnMob(game, 'snork', S.x - 10.5, S.y - 4, S.z - 10.5, { variant: 3 }); s.variant = 3; spawnMob(game, 'golem', S.x + 8.5, S.y, S.z - 8.5, { home: [S.x + 8.5, S.z - 8.5] }); }, S);
  check('she sees the Snork (the right colour) and the iron golem', await waitFor(G, S => T.ents('snork').some(e => e.variant === 3) && T.ents('golem').some(g => Math.hypot(g.x - S.x - 8.5, g.z - S.z + 8.5) < 4), 8000, S), await G.evaluate(() => ({ snorks: T.ents('snork').map(e => e.variant), golems: T.ents('golem').map(g => [Math.round(g.x), Math.round(g.z)]) })));

  // 3. the flying car: she puts it down, gets in and takes off; the host sees it fly
  await G.evaluate(S => { Object.assign(game.player, { x: S.x + 6.5, y: S.y, z: S.z + 10.5, vx: 0, vy: 0, vz: 0 }); T.hold(I.FLYING_CAR, 1); }, S);
  await settle();
  await G.evaluate(S => { T.aim(S.x + 6.5, S.y - 0.5, S.z + 6.5); T.tap(); }, S);
  check('she puts a flying car down', await waitFor(H, () => T.ents('flycar').length === 1, 6000));
  await waitFor(G, () => T.ents('flycar').length === 1, 6000);
  await G.evaluate(() => mountVehicle(game, T.ents('flycar')[0]));
  check('she gets in', await waitFor(G, () => game.player.riding && game.player.riding.type === 'flycar', 6000));
  const fy0 = await H.evaluate(() => T.ents('flycar')[0].y);
  await G.evaluate(() => { game.input.jump = true; });
  check('she takes off, and the host sees it fly up', await waitFor(H, y0 => { const v = T.ents('flycar')[0]; return v.flying && v.y > y0 + 3; }, 10000, fy0), await H.evaluate(() => { const v = T.ents('flycar')[0]; return { y: v.y, flying: v.flying }; }));
  await G.evaluate(() => { game.input.jump = false; game.input.sneak = true; });   // (down she comes)
  check('she lands, and the host sees it land', await waitFor(G, () => !T.ents('flycar')[0].flying, 20000) && await waitFor(H, () => !T.ents('flycar')[0].flying, 6000));
  await G.evaluate(() => { game.input.sneak = false; });
  await sleep(300);
  await G.evaluate(() => { game.input.sneak = true; });   // (Sneak again, on the ground: out she gets)
  check('she gets out', await waitFor(G, () => !game.player.riding, 6000) && await waitFor(H, () => !T.ents('flycar')[0].rider, 6000));
  await G.evaluate(() => { game.input.sneak = false; });
  await H.evaluate(() => { for (const e of game.entities) if (e.vehicle) e.removed = true; });

  // 4. her spells: Stupefy stops the host's zombie still; her Patronus appears for everyone
  await G.evaluate(S => { Object.assign(game.player, { x: S.x + 0.5, y: S.y, z: S.z + 8.5, vx: 0, vy: 0, vz: 0 }); T.hold(I.WAND, 1); game.player.spell = SPELLS.findIndex(s => s.key === 'stupefy'); }, S);
  await H.evaluate(S => { for (const e of game.entities) if (e.mob) e.removed = true; Object.assign(game.player, { x: S.x + 10.5, y: S.y, z: S.z + 12.5 }); game.player.invuln = 999; const z = spawnMob(game, 'zombie', S.x + 0.5, S.y, S.z + 2.5); z.hp = 20; window.__z = z; }, S);   // (no golem about to fling it away)
  await waitFor(G, () => T.ents('zombie').length === 1, 6000);
  await settle();
  await G.evaluate(() => { const z = T.ents('zombie')[0]; T.aim(z.x, z.y + 1.2, z.z); game.player.useCd = 0; T.tap(); });
  check('her Stupefy stops the zombie still (at the host)', await waitFor(H, () => window.__z.frozen > 0, 6000), await H.evaluate(() => ({ frozen: window.__z.frozen, hp: window.__z.hp })));
  await H.evaluate(() => { window.__z.removed = true; });
  await G.evaluate(() => { const pl = game.player; pl.spell = SPELL_PATRONUS; pl.useCd = 0; pl.patronusT = 0; T.aim(pl.x, pl.y + 1.5, pl.z - 5); T.tap(); });
  check('her Patronus appears for the host too', await waitFor(H, () => T.ents('patronus').length === 1, 6000));
  check('...and she sees it', await waitFor(G, () => T.ents('patronus').length === 1, 6000));
  await H.evaluate(() => { for (const e of game.entities) if (e.mob) e.removed = true; game.player.invuln = 0; });
  // her Accio: a block of the floor flies into her bag (on her iPad)
  await G.evaluate(S => { const pl = game.player; Object.assign(pl, { x: S.x + 0.5, y: S.y, z: S.z + 8.5, vx: 0, vy: 0, vz: 0 }); pl.spell = SPELLS.findIndex(s => s.key === 'accio'); pl.useCd = 0; T.aim(S.x + 0.5, S.y - 0.5, S.z + 5.5); }, S);
  await settle();
  await G.evaluate(() => T.tap());
  check('her Accio brings a block of the floor into her bag', await waitFor(G, () => T.count(B.COBBLE) >= 1, 6000), await G.evaluate(() => T.count(B.COBBLE)));

  // 5. her robot: she lets it out, gives it a job, it follows her, and she puts it back in her bag
  await G.evaluate(S => { Object.assign(game.player, { x: S.x + 2.5, y: S.y, z: S.z + 4.5, vx: 0, vy: 0, vz: 0 }); T.hold(I.ROBOT, 1, { tag: { robot: 1 } }); }, S);
  await settle();
  await G.evaluate(S => { T.aim(S.x + 2.5, S.y - 0.01, S.z + 1.5); game.player.useCd = 0; T.tap(); }, S);
  check('she lets her robot out: it is hers, and red', await waitFor(H, gid => T.ents('robot').some(r => r.owner === gid && r.variant === 1), 6000, GID), await H.evaluate(() => T.ents('robot').map(r => ({ o: r.owner, c: r.variant }))));
  check('...and she sees it', await waitFor(G, gid => T.ents('robot').some(r => r.owner === gid && r.variant === 1), 6000, GID));
  await G.evaluate(() => { const r = T.ents('robot')[0]; T.hold(null); T.aim(r.x, r.y + 0.7, r.z); game.player.useCd = 0; T.tap(); });
  check('she taps it: it guards her (at the host too)', await waitFor(H, () => T.ents('robot')[0].mode === 'guard', 6000), await H.evaluate(() => T.ents('robot')[0].mode));
  check("the host can't take her robot", await H.evaluate(() => { const r = T.ents('robot')[0]; hurtMob(game, r, 1, game.player.x, game.player.z, 'player'); return !r.removed && /someone else/.test(el('toast').textContent); }));
  await G.evaluate(S => { Object.assign(game.player, { x: S.x - 2.5, y: S.y, z: S.z + 13.5, vx: 0, vy: 0, vz: 0 }); }, S);
  check('it follows her about', await waitFor(H, ([gid]) => { const r = T.ents('robot')[0], g = MP.remotes.get(gid); return Math.hypot(r.x - g.x, r.z - g.z) < 5; }, 10000, [GID]),
    await H.evaluate(gid => { const r = T.ents('robot')[0], g = MP.remotes.get(gid); return Math.round(Math.hypot(r.x - g.x, r.z - g.z)); }, GID));
  await G.evaluate(() => { const r = T.ents('robot')[0], pl = game.player; Object.assign(pl, { x: r.x, z: r.z + 2.2 }); T.aim(r.x, r.y + 0.7, r.z); });
  await settle();
  await G.evaluate(() => { const r = T.ents('robot')[0]; hurtMob(game, r, 1, game.player.x, game.player.z, 'player'); });
  check('she hits it: back in her bag (still red)', await waitFor(G, () => { const s = game.player.inv.find(q => q && q.id === I.ROBOT); return s && s.tag && s.tag.robot === 1; }, 8000) && await waitFor(H, () => T.ents('robot').length === 0, 4000),
    await G.evaluate(() => game.player.inv.filter(q => q && q.id === I.ROBOT)));

  // 6. security cameras: the host puts two up and a monitor; she switches cameras; both see the picture
  const C = await H.evaluate(S => {
    const w = game.world;
    for (let dx = -2; dx <= 2; dx++) for (let k = 0; k < 4; k++) w.setBlock(S.x + dx, S.y + k, S.z - 14, B.STONE_BRICKS, 0);
    w.setBlock(S.x, S.y + 2, S.z - 13, B.CAMERA, 16);
    w.setBlock(S.x + 12, S.y, S.z + 2, B.CAMERA, 8);
    w.setBlock(S.x + 3, S.y, S.z + 5, B.MONITOR, 0);
    return { x: S.x + 3, y: S.y, z: S.z + 5 };
  }, S);
  await waitFor(G, C => game.world.getBlock(C.x, C.y, C.z) === B.MONITOR, 6000, C);
  await G.evaluate(C => { Object.assign(game.player, { x: C.x + 0.5, y: C.y, z: C.z + 2.6, vx: 0, vy: 0, vz: 0 }); T.aim(C.x + 0.5, C.y + 0.55, C.z + 1); }, C);
  await H.evaluate(C => { Object.assign(game.player, { x: C.x - 1.5, y: C.y, z: C.z + 3.5 }); T.aim(C.x + 0.5, C.y + 0.55, C.z + 1); }, C);
  check('both see a camera picture on the monitor', await waitFor(G, () => CAMS.done.size > 0, 8000) && await waitFor(H, () => CAMS.done.size > 0, 8000));
  const d0 = await H.evaluate(C => game.world.getData(C.x, C.y, C.z), C);
  await G.evaluate(() => { game.player.useCd = 0; T.tap(); });
  check('she taps the monitor: the next camera, for everyone', await waitFor(H, ([C, d0]) => game.world.getData(C.x, C.y, C.z) !== d0, 6000, [C, d0]), await H.evaluate(C => game.world.getData(C.x, C.y, C.z), C));
  check('...and the host hears it switch', await waitFor(H, () => window.__fx.has('sfx:camSwitch'), 4000), await H.evaluate(() => Array.from(window.__fx)));
  await sleep(1200);
  await G.screenshot({ path: path.join(out, 'mp3-monitor-guest.png') });

  // 7. a building plan: she builds the snowman, and everyone hears about it
  await G.evaluate(S => { Object.assign(game.player, { x: S.x + 8.5, y: S.y, z: S.z + 12.5, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0 }); PLANUI.page = 0; planHere(false); }, S);
  const pb = await G.evaluate(() => PLAN.list.map(b => b.slice(0, 4)));
  await G.evaluate(pb => { for (const b of pb) game.world.setBlock(b[0], b[1], b[2], b[3], 0, true); }, pb);
  check('she finishes the snowman plan', await waitFor(G, () => !PLAN.cur && game.stats.plans === 1, 4000));
  check('...the host sees her snowman, and is told', await waitFor(H, pb => pb.every(b => game.world.getBlock(b[0], b[1], b[2]) === b[3]) && T.chat(/Cora built the Snowman!/), 6000, pb));

  // 8. dungeons: the same ones for her
  const D = await H.evaluate(() => game.gen.findDungeon(game.mapId, game.seed, game.player.x, game.player.z, game.world.villageBlock));
  await H.evaluate(D => Object.assign(game.player, { x: D.x + 0.5, y: D.y + 8, z: D.z + 0.5, flying: true, vx: 0, vy: 0, vz: 0 }), D);
  await G.evaluate(D => Object.assign(game.player, { x: D.x + 1.5, y: D.y + 8, z: D.z + 0.5, flying: true, vx: 0, vy: 0, vz: 0 }), D);
  const both = await waitFor(G, D => game.world.readyAround(D.x + 0.5, D.z + 0.5, 1) >= 1 && game.world.getBlock(D.x, D.y + 4, D.z) === B.TORCH, 60000, D) && await waitFor(H, D => game.world.getBlock(D.x, D.y + 4, D.z) === B.TORCH, 60000, D);
  check('she finds the same dungeon tower as the host', both, D);

  // 9. the rocket: the host blasts off, and she goes to the Moon too
  await H.evaluate(D => { Object.assign(game.player, { x: D.x + 6.5, y: D.y + 1, z: D.z + 6.5, flying: false }); game.mode = 'creative'; }, D);
  const rk = await H.evaluate(() => { const pl = game.player, top = game.world.topSolid(Math.floor(pl.x), Math.floor(pl.z)); pl.y = top + 1; const v = spawnVehicle(game, 'rocket', pl.x, top + 1, pl.z, 0); boardVehicle(game, v); rocketLaunch(game, pl, v); return !!v; });
  check('the host blasts off in the rocket...', rk);
  check('...and she goes to the Moon too', await waitFor(G, () => game.dim === 'moon' && game.state === 'playing', 180000) && await waitFor(H, () => game.dim === 'moon' && game.state === 'playing', 60000),
    await G.evaluate(() => ({ dim: game.dim, state: game.state })));
  check('...where she gets a space helmet', await waitFor(G, () => wearsSpaceHelmet(game.player) || game.mode === 'creative', 15000));
  await sleep(1500);
  await G.screenshot({ path: path.join(out, 'mp3-moon-guest.png') });
  await waitFor(H, () => game.player.riding && !game.player.riding.landing, 30000);
  await H.evaluate(() => { const v = game.player.riding; rocketLaunch(game, game.player, v); });
  check('...and home again together', await waitFor(G, () => game.dim === 'over' && game.state === 'playing', 180000) && await waitFor(H, () => game.dim === 'over', 60000), await G.evaluate(() => game.dim));

  check('no page errors', H.errs.length === 0 && G.errs.length === 0, H.errs.concat(G.errs).slice(0, 6));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close(); peer.close && peer.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
