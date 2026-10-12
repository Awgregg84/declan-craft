// Declan's second wish list, playing together: a character you made, armor and enchanted things, signs, coloring
// boards, the TV, potions, experience, brewing, fish and fishing, boats and submarines, and Hardcore all work for
// a guest as well as the host.
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
const LOOK = [2, 8, 3, 1, 1, 0, 1, 1, 1, 1, 3, 8, 2, 2, 6, 2, 8, 6, 2, 12];   // brown pigtails, glasses, a big grin, freckles, big ears and a big head, a pink dress with a heart, a flower
const HOST = { skin: 'declan', name: 'Declan', pid: 'hostpid0001' };
const GUEST = { skin: 'custom_me', name: 'Mommy', pid: 'guestpid002', chars: [{ name: 'Mommy', look: LOOK }], cur: 0 };
const GID = GUEST.pid;

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'] });
  const url = 'http://localhost:' + server.address().port + '/';
  async function open(profile, label) {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 520 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // (the web font can stall the page loading from a test machine; it isn't needed here)
    await ctx.addInitScript(([port, prof]) => {
      window.DC_NET = { host: '127.0.0.1', port, secure: false, path: '/', key: 'peerjs', iceServers: [], mqtt: [] };
      if (!localStorage.getItem('declancraft:v1:profile')) localStorage.setItem('declancraft:v1:profile', JSON.stringify(prof));
    }, [PEER_PORT, profile]);
    const p = await ctx.newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(label + ': ' + e.message));
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });   // (slow when the machine is busy)
    await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
    await p.evaluate(() => {
      window.__fx = new Set();
      const pf = MP.playFx.bind(MP); MP.playFx = function (list) { if (Array.isArray(list)) for (const f of list) if (Array.isArray(f)) window.__fx.add(f[0] + (f[0] === 'sfx' ? ':' + SFX_NET[f[4]] : '')); return pf(list); };
      window.T = {
        ents: type => game.entities.filter(e => !e.removed && e.type === type),
        aim(tx, ty, tz) { const pl = game.player, dx = tx - pl.x, dy = ty - (pl.y + pl.eye), dz = tz - pl.z; pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
        tap() { const i = game.input; i.use = true; i.usePressed = true; i.useOnce = true; },
        count: id => game.player.inv.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0),
      };
    });
    return p;
  }
  const waitFor = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
  const H = await open(HOST, 'host'), G = await open(GUEST, 'guest');
  const settle = () => sleep(600);   // let the host hear where she moved to before she does anything there
  const join = async () => {
    await waitFor(H, () => game.state === 'playing' && MP.roomOpen, 120000);
    const code = await H.evaluate(() => MP.code);
    await G.evaluate(code => { game.dragLook = true; MP.join(code); }, code);
    await waitFor(H, () => !el('join-prompt').hidden, 30000);
    return code;
  };

  // 0. she plays as the character she made: the host sees it (and her face when she asks to join)
  await H.evaluate(() => { game.dragLook = true; ui.hostMode = true; game.startWorld('valley', 'survival', true); });
  await join();
  check('the join prompt shows the character she made', await H.evaluate(look => el('join-face').src === lookFace(look, 64), LOOK));
  await H.evaluate(() => MP.answerPrompt(true));
  check('guest joins', await waitFor(G, () => game.state === 'playing' && MP.welcomed, 120000));
  const seen = await H.evaluate(([look, gid]) => { const r = MP.remotes.get(gid), px = lookPixels(look); return { skin: r.skin, same: SKIN_DATA[SKIN[r.skin]].every((v, i) => v === px[i]), big: headScaleFor(r.skin), name: r.name }; }, [LOOK, GID]);
  check('the host sees her as the character she made (big head and all)', seen.skin === 'custom_r0' && seen.same && seen.big > 1 && seen.name === 'Mommy', seen);
  check('she sees the host as his character', await G.evaluate(() => MP.remotes.get('host').skin === 'declan'));

  // a big stone floor in the sky, with a pool (four deep) in one corner; both players on it
  const S = await H.evaluate(() => {
    const w = game.world, pl = game.player, x = Math.floor(pl.x), y = 100, z = Math.floor(pl.z);
    game.settings.difficulty = 2; game.settings.animals = false; w.time = 0.25; MP.syncTime();
    for (let dx = -16; dx <= 16; dx++) for (let dz = -16; dz <= 16; dz++) { w.setBlock(x + dx, y - 1, z + dz, B.STONE, 0); for (let k = 0; k < 6; k++) w.setBlock(x + dx, y + k, z + dz, B.AIR, 0); }
    for (let dx = -16; dx <= -2; dx++) for (let dz = -16; dz <= -2; dz++) {
      const edge = dx === -16 || dx === -2 || dz === -16 || dz === -2;
      for (let k = 1; k <= 5; k++) w.setBlock(x + dx, y - k, z + dz, edge || k === 5 ? B.STONE : B.WATER, 0);
    }
    Object.assign(pl, { x: x + 0.5, y, z: z + 8.5, vx: 0, vy: 0, vz: 0, flying: false, yaw: 0, pitch: 0 });
    return { x, y, z };
  });
  await waitFor(G, S => game.world.getBlock(S.x + 16, S.y - 1, S.z + 16) === B.STONE && game.world.getBlock(S.x - 9, S.y - 1, S.z - 9) === B.WATER, 15000, S);
  await G.evaluate(S => Object.assign(game.player, { x: S.x + 3.5, y: S.y, z: S.z + 8.5, vx: 0, vy: 0, vz: 0, flying: false }), S);
  await sleep(800);

  // 1. her armor, her enchanted sword (it shines) and her shield
  await G.evaluate(() => { const pl = game.player; pl.inv[37] = { id: armorId(3, 1), count: 1 }; pl.inv[36] = { id: armorId(2, 0), count: 1 }; pl.inv[0] = { id: toolId(3, 3), count: 1, tag: { ench: [['sharpness', 3]] } }; pl.sel = 0; pl.inv[OFFHAND] = { id: I.SHIELD, count: 1 }; game.ui.dirty = true; });
  check('the host sees her armor, her shining enchanted sword and her shield', await waitFor(H, gid => { const r = MP.remotes.get(gid); return r.armor[1] === armorId(3, 1) && r.armor[0] === armorId(2, 0) && (r.glint & 16) && r.shield === 'off'; }, 6000, GID),
    await H.evaluate(gid => { const r = MP.remotes.get(gid); return { armor: r.armor, glint: r.glint, shield: r.shield }; }, GID));
  await H.evaluate(S => { const pl = game.player; Object.assign(pl, { x: S.x + 3.5, y: S.y, z: S.z + 12.5 }); T.aim(S.x + 3.5, S.y + 1, S.z + 8.5); game.view = 0; }, S);
  await sleep(1200);
  await H.screenshot({ path: path.join(out, 'mp2-made-host.png') });
  await G.evaluate(() => { const pl = game.player; pl.inv[0] = pl.inv[36] = pl.inv[37] = pl.inv[OFFHAND] = null; game.ui.dirty = true; });

  // 2. a sign, coloring boards and a TV
  const SB = { x: S.x + 4, y: S.y, z: S.z - 6 };
  await H.evaluate(SB => { const w = game.world; w.setBlock(SB.x, SB.y, SB.z, B.SIGN, 0); w.setBlock(SB.x + 2, SB.y, SB.z, B.BOARD, 0); w.setBlock(SB.x + 4, SB.y, SB.z, B.TV, 0); w.setBlock(SB.x + 6, SB.y, SB.z, B.BOARD, 0); }, SB);
  await waitFor(G, SB => game.world.getBlock(SB.x + 6, SB.y, SB.z) === B.BOARD, 8000, SB);
  await G.evaluate(SB => { Object.assign(game.player, { x: SB.x + 2.5, y: SB.y, z: SB.z + 3.5, vx: 0, vy: 0, vz: 0 }); }, SB);
  await settle();
  await G.evaluate(SB => { openSign(SB.x, SB.y, SB.z); document.querySelectorAll('.sign-line')[0].value = 'Hi Declan!'; closeSign(); }, SB);
  check('her words on a sign reach the host', await waitFor(H, SB => { const l = signLines(game.world, SB.x, SB.y, SB.z); return l && l[0] === 'Hi Declan!'; }, 6000, SB));
  await G.evaluate(SB => { openBoard(SB.x + 2, SB.y, SB.z); BOARDUI.color = 4; BOARDUI.tool = 'fill'; boardPaint(17, true); closeBoard(); }, SB);
  check('her coloring reaches the host', await waitFor(H, SB => { const t = boardTile(game.world, SB.x + 2, SB.y, SB.z); return t && t.pic === 1 && t.px.split('').filter(c => c === '4').length > 100; }, 6000, SB));
  await H.evaluate(SB => { openBoard(SB.x + 6, SB.y, SB.z); BOARDUI.pic = 2; BOARDUI.px = BOARD_BLANK.split(''); BOARDUI.color = 10; BOARDUI.tool = 'fill'; boardPaint(5 * 16 + 7, true); closeBoard(); }, SB);
  check("she sees the host's coloring", await waitFor(G, SB => { const t = boardTile(game.world, SB.x + 6, SB.y, SB.z); return t && t.pic === 2 && t.px.includes('a'); }, 6000, SB));
  await G.evaluate(SB => { T.aim(SB.x + 4.5, SB.y + 0.5, SB.z + 1); T.tap(); }, SB);
  check('her tap turns the TV on for everyone', await waitFor(H, SB => (game.world.getData(SB.x + 4, SB.y, SB.z) & 4) === 4, 6000, SB));
  check('and the host hears it come on', await waitFor(H, () => window.__fx.has('sfx:tvOn'), 4000), await H.evaluate(() => Array.from(window.__fx)));
  const clocks = [await H.evaluate(() => game.world.clock), await G.evaluate(() => game.world.clock)];
  check('both see the same show (their clocks agree)', Math.abs(clocks[0] - clocks[1]) < 2, clocks);
  await G.evaluate(() => { game.world.clock -= 40; });   // (as if her iPad had been asleep for a while)
  await sleep(2600);
  const clocks2 = [await H.evaluate(() => game.world.clock), await G.evaluate(() => game.world.clock)];
  check('and a clock that falls behind is put right, so the shows stay together', Math.abs(clocks2[0] - clocks2[1]) < 2, clocks2);
  // a sign the host writes where her world isn't loaded (far off): she still gets the words, and a sign broken there takes them with it
  const far = await G.evaluate(() => {
    const x = Math.floor(game.player.x) + 2000, y = 70, z = Math.floor(game.player.z), out = { unloaded: game.world.getBlock(x, y, z) === B.UNLOADED };
    MP.guestMsg({ t: 'b', b: [x, y, z, B.SIGN, 0], we: MP.we });
    MP.guestMsg({ t: 'sign', x, y, z, l: ['Far away', '', '', ''], we: MP.we });
    out.words = (signLines(game.world, x, y, z) || [])[0];
    MP.guestMsg({ t: 'b', b: [x, y, z, B.AIR, 0, x, y, z, B.SIGN, 0], we: MP.we });   // broken, and a new one put there
    out.after = signLines(game.world, x, y, z);
    MP.guestMsg({ t: 'board', x: x + 1, y, z, px: BOARD_BLANK, pic: 3, we: MP.we });   // (no board known there: left alone)
    out.board = boardTile(game.world, x + 1, y, z);
    return out;
  });
  check('signs far away get their words, and lose them when broken', far.unloaded && far.words === 'Far away' && far.after === null && far.board === null, far);
  await H.evaluate(SB => { const pl = game.player; Object.assign(pl, { x: SB.x + 3.5, y: SB.y, z: SB.z + 4.5 }); T.aim(SB.x + 3.5, SB.y + 0.6, SB.z + 0.5); }, SB);
  await sleep(1500);
  await H.screenshot({ path: path.join(out, 'mp2-boards-host.png') });

  // 3. potions: a splash of poison reaches her; the host sees her swiftness swirls
  await G.evaluate(S => { Object.assign(game.player, { x: S.x + 3.5, y: S.y, z: S.z + 8.5 }); game.player.effects = {}; game.player.health = 20; }, S);
  await settle();
  await H.evaluate(gid => { const r = MP.remotes.get(gid); splashPotion(game, r.tx, r.ty + 0.5, r.tz, potionByKey('poison')); }, GID);
  check('a splash potion of poison reaches her', await waitFor(G, () => hasEffect(game.player, 'poison'), 6000));
  await G.evaluate(() => { game.player.effects = {}; giveEffect(game.player, 'swiftness', 60); });
  check('the host sees she has Swiftness', await waitFor(H, gid => MP.remotes.get(gid).fxBits & (1 << EFFECTS.indexOf('swiftness')), 6000, GID));
  await G.evaluate(() => { game.player.effects = {}; game.player.health = 20; });

  // 4. experience: she defeats a zombie, and the orbs come to her
  const zid = await H.evaluate(S => { const z = spawnMob(game, 'zombie', S.x + 0.5, S.y, S.z + 4.5); z.frozen = 60; return z.nid; }, S);
  await waitFor(G, id => game.entities.some(e => e.nid === id), 6000, zid);
  await G.evaluate(S => Object.assign(game.player, { x: S.x + 0.5, y: S.y, z: S.z + 6.5 }), S);
  await settle();
  const xp0 = await G.evaluate(() => game.player.xp || 0);
  await G.evaluate(id => { const z = game.entities.find(e => e.nid === id); for (let i = 0; i < 6; i++) MP.sendHit(z, 5, game.player.x, game.player.z); }, zid);
  check('she defeats a zombie, and its experience comes to her', await waitFor(G, x => game.player.xp > x, 8000, xp0), await G.evaluate(() => game.player.xp));

  // 5. brewing: she opens the host's brewing stand; it brews on her iPad and the potions reach the host
  const BS = { x: S.x - 2 + 8, y: S.y, z: S.z + 10 };
  await H.evaluate(BS => game.world.setBlock(BS.x, BS.y, BS.z, B.BREWING_STAND, 0), BS);
  await waitFor(G, BS => game.world.getBlock(BS.x, BS.y, BS.z) === B.BREWING_STAND, 6000, BS);
  await G.evaluate(BS => { Object.assign(game.player, { x: BS.x + 0.5, y: BS.y, z: BS.z + 2.5 }); T.aim(BS.x + 0.5, BS.y + 0.5, BS.z + 0.5); }, BS);
  await settle();
  await G.evaluate(() => T.tap());
  check('she can open the brewing stand', await waitFor(G, () => ui.inv && ui.inv.kind === 'brew' && ui.inv.tile && !ui.inv.tile.loading, 6000));
  await G.evaluate(() => { const t = ui.inv.tile; for (let i = 0; i < 3; i++) t.slots[i] = { id: I.POTION, count: 1 }; t.slots[3] = { id: I.SUGAR, count: 1 }; MP.tileTouched(t); });
  check('it brews, and the potions reach the host', await waitFor(H, BS => { const t = game.world.tiles.get(tileKey(BS.x, BS.y, BS.z)); return t && t.slots[0] && t.slots[0].id === I.POTION + 3; }, 60000, BS),   // (8 seconds of game time: longer when two games share a slow machine)
    { host: await H.evaluate(BS => { const t = game.world.tiles.get(tileKey(BS.x, BS.y, BS.z)); return t && { s: t.slots.map(s => s && s.id + 'x' + s.count), t: t.t, v: t.viewers && Array.from(t.viewers) }; }, BS),
      guest: await G.evaluate(() => { const t = ui.inv && ui.inv.tile; return t && { s: t.slots.map(s => s && s.id + 'x' + s.count), t: t.t, remote: t.remote, loading: t.loading, kind: ui.inv.kind }; }) });
  await G.evaluate(() => game.closeUI());

  // 6. fish: she sees a tropical fish in its colors; a pufferfish stings her
  const P = { x: S.x - 9, y: S.y, z: S.z - 9 };
  const fish = await H.evaluate(P => { const t = spawnMob(game, 'tropical', P.x + 0.5, P.y - 2.5, P.z + 0.5, { variant: 3 }); const p = spawnMob(game, 'pufferfish', P.x + 2.5, P.y - 1.6, P.z + 0.5); return [t.nid, p.nid]; }, P);
  check('she sees the fish, the tropical one in its colors', await waitFor(G, f => { const t = game.entities.find(e => e.nid === f[0]); return t && t.variant === 3 && t.color && Math.abs(t.color[0] - 0x3a / 255) < 0.02; }, 8000, fish));
  await G.evaluate(P => { Object.assign(game.player, { x: P.x + 2.5, y: P.y - 1.5, z: P.z + 1.5, vx: 0, vy: 0, vz: 0 }); game.player.health = 20; game.player.effects = {}; game.player.invuln = 0; }, P);
  await settle();
  await H.evaluate(([f, gid]) => { const p = game.entities.find(e => e.nid === f[1]), r = MP.remotes.get(gid); const iv = setInterval(() => { if (!p || p.removed) return clearInterval(iv); p.x = r.tx; p.y = r.ty + 0.6; p.z = r.tz + 0.3; }, 50); setTimeout(() => clearInterval(iv), 5000); }, [fish, GID]);
  check('a pufferfish stings her with poison when she swims close', await waitFor(G, () => game.player.health < 20 && hasEffect(game.player, 'poison'), 8000), await G.evaluate(() => ({ hp: game.player.health, fx: Object.keys(game.player.effects || {}) })));
  check('and she sees it puffed up', await G.evaluate(f => { const p = game.entities.find(e => e.nid === f[1]); return !!p && p.puff > 0.5; }, fish));
  await H.evaluate(() => { for (const e of game.entities) if (e.mob) e.removed = true; });
  await G.evaluate(() => { game.player.effects = {}; game.player.health = 20; });

  // 7. fishing: the host sees her line; she reels in a catch
  await G.evaluate(P => { Object.assign(game.player, { x: P.x + 0.5, y: P.y, z: P.z + 8.5, vx: 0, vy: 0, vz: 0 }); }, P);
  await settle();
  await G.evaluate(P => { const pl = game.player; pl.inv[0] = { id: I.FISHING_ROD, count: 1 }; pl.sel = 0; game.ui.dirty = true; T.aim(P.x + 0.5, P.y - 0.5, P.z + 3.5); T.tap(); }, P);
  check('her float lands in the water', await waitFor(G, () => game.player.bobber && game.player.bobber.state === 'water', 6000));
  check('the host sees her fishing line', await waitFor(H, gid => !!MP.remotes.get(gid).bobberAt, 4000, GID));
  await H.evaluate(P => { const pl = game.player; Object.assign(pl, { x: P.x + 4.5, y: P.y, z: P.z + 11.5 }); T.aim(P.x + 0.5, P.y + 0.5, P.z + 6); }, P);
  await sleep(1200);
  await H.screenshot({ path: path.join(out, 'mp2-fishing-host.png') });
  await G.evaluate(() => { game.player.bobber.waitT = 0.05; });
  await waitFor(G, () => game.player.bobber && game.player.bobber.biteT > 0, 3000);
  const n0 = await G.evaluate(() => { const b = game.player.bobber; return { n: game.player.inv.filter(Boolean).length, bite: b && b.biteT, state: b && b.state, cd: game.player.useCd }; });
  await G.evaluate(() => T.tap());
  check('she reels in a catch', await waitFor(G, n => game.player.inv.filter(Boolean).length > n, 6000, n0.n), { n0, after: await G.evaluate(() => ({ inv: game.player.inv.filter(Boolean).map(s => s.id), items: T.ents('item').map(e => [e.id, +e.x.toFixed(1), +e.y.toFixed(1), +e.z.toFixed(1)]), pl: [game.player.x, game.player.y, game.player.z], bob: !!game.player.bobber })) });

  // 8. a boat: she puts it on the water, gets in and rows; the host sees it all
  await G.evaluate(P => { const pl = game.player; Object.assign(pl, { x: P.x + 0.5, y: P.y, z: P.z + 8.5 }); pl.inv[0] = { id: I.BOAT, count: 1 }; pl.sel = 0; game.ui.dirty = true; }, P);
  await settle();
  await G.evaluate(P => { T.aim(P.x + 0.5, P.y - 0.5, P.z + 4.5); T.tap(); }, P);
  check('she puts a boat on the water', await waitFor(H, () => T.ents('boat').length === 1, 6000));
  await waitFor(G, () => T.ents('boat').length === 1, 6000);
  await G.evaluate(() => mountVehicle(game, T.ents('boat')[0]));
  check('she gets in', await waitFor(G, () => game.player.riding && game.player.riding.local, 6000));
  check('the host sees her sitting in the boat', await waitFor(H, gid => MP.remotes.get(gid).riding === 'boat', 6000, GID));
  const b0 = await H.evaluate(() => { const b = T.ents('boat')[0]; return [b.x, b.z]; });
  await G.evaluate(() => { game.input.fwd = true; });
  check('she rows, and the host sees the boat go', await waitFor(H, b0 => { const b = T.ents('boat')[0]; return Math.hypot(b.x - b0[0], b.z - b0[1]) > 2.5; }, 10000, b0));
  await G.evaluate(() => { game.input.fwd = false; });
  await sleep(800);
  await H.screenshot({ path: path.join(out, 'mp2-boat-host.png') });
  await G.evaluate(() => { game.input.sneak = true; });
  await waitFor(G, () => !game.player.riding, 4000);
  await G.evaluate(() => { game.input.sneak = false; });
  check('she gets out, and the boat is free again', await waitFor(H, () => !T.ents('boat')[0].rider, 6000));
  // a submarine: she dives in it, and her sonar ping is heard
  await G.evaluate(P => { const pl = game.player; Object.assign(pl, { x: P.x - 3.5, y: P.y, z: P.z + 8.5, vx: 0, vy: 0, vz: 0 }); pl.inv[0] = { id: I.SUBMARINE, count: 1 }; pl.sel = 0; game.ui.dirty = true; }, P);
  await settle();
  await G.evaluate(P => { T.aim(P.x - 3.5, P.y - 0.5, P.z + 4.5); T.tap(); }, P);
  check('she puts a submarine in the water', await waitFor(H, () => T.ents('submarine').length === 1, 6000));
  await waitFor(G, () => T.ents('submarine').length === 1, 6000);
  await G.evaluate(() => mountVehicle(game, T.ents('submarine')[0]));
  await waitFor(G, () => game.player.riding && game.player.riding.local, 6000);
  check('the host sees her in the submarine', await waitFor(H, gid => MP.remotes.get(gid).riding === 'sub', 6000, GID));
  await G.evaluate(() => { game.player.useCd = 0; T.tap(); });
  check('her sonar ping is heard on the host', await waitFor(H, () => window.__fx.has('sfx:sonar'), 4000), await H.evaluate(() => Array.from(window.__fx)));
  const s0 = await H.evaluate(() => T.ents('submarine')[0].y);
  await G.evaluate(() => { game.player.pitch = -0.8; game.input.fwd = true; });
  check('she dives, and the host sees the submarine go down', await waitFor(H, y => T.ents('submarine')[0].y < y - 1, 10000, s0));
  await G.evaluate(() => { game.input.fwd = false; });
  check('she can breathe down there', await G.evaluate(() => game.player.headInWater && game.player.air === 10));
  await G.evaluate(() => { game.input.sneak = true; });
  await waitFor(G, () => !game.player.riding, 4000);
  await G.evaluate(() => { game.input.sneak = false; });

  // 9. Hardcore, together: when the host's one life is gone, the world closes for everyone
  await H.evaluate(() => game.quitToTitle());
  await waitFor(G, () => game.state === 'title', 15000);
  await H.evaluate(() => { store.del(saveKey('hardcore')); ui.hostMode = true; game.startWorld('hardcore', 'survival', true); });
  await join();
  await H.evaluate(() => MP.answerPrompt(true));
  check('she joins the Hardcore world, and it is Hardcore for her too', await waitFor(G, () => game.state === 'playing' && MP.welcomed && game.hardcore && game.mode === 'survival', 120000));
  // the host saves and quits: her things are kept in the Hardcore world (and not in Sunny Valley)
  const valleyHer = await H.evaluate(gid => JSON.stringify(JSON.parse(store.get(saveKey('valley'))).players[gid]), GID);
  await G.evaluate(() => { game.player.inv[3] = { id: I.EMERALD, count: 7 }; });
  await sleep(500);
  await H.evaluate(() => game.quitToTitle());
  await waitFor(G, () => game.state === 'title', 15000);
  await sleep(2000);
  const kept = await H.evaluate(gid => { const hc = JSON.parse(store.get(saveKey('hardcore'))), v = JSON.parse(store.get(saveKey('valley'))); return { hc: hc.players[gid] && hc.players[gid].inv[3], valley: JSON.stringify(v.players[gid]) }; }, GID);
  check("her last save goes into the Hardcore world, and Sunny Valley's is left alone", kept.hc && kept.hc.id === await H.evaluate(() => I.EMERALD) && kept.hc.count === 7 && kept.valley === valleyHer, kept);
  await H.evaluate(() => { ui.hostMode = true; game.startWorld('hardcore', null, false); });
  await G.evaluate(() => showScreen('scr-title'));
  await join();
  await H.evaluate(() => MP.answerPrompt(true));
  check('back in the Hardcore world, with her things', await waitFor(G, () => game.state === 'playing' && MP.welcomed && game.hardcore && T.count(I.EMERALD) === 7, 120000));
  await sleep(1000);
  await H.evaluate(() => { const pl = game.player; pl.invuln = 0; pl.damage(1000, 'lava'); });
  check("when the host's one life is gone, the world is gone for both of them", await waitFor(G, () => game.state === 'title' && ui.screen === 'scr-msg' && /Hardcore world is gone/.test(el('msg-text').textContent), 15000) && await H.evaluate(() => !MP.role && !store.get(saveKey('hardcore'))),
    await G.evaluate(() => ({ state: game.state, screen: ui.screen, msg: el('msg-text').textContent })));
  await sleep(2000);
  check('(and nothing of hers from that world lands in Sunny Valley)', await H.evaluate(([gid, v]) => JSON.stringify(JSON.parse(store.get(saveKey('valley'))).players[gid]) === v, [GID, valleyHer]));
  // ...and when her one life is gone, she is out of that world
  await H.evaluate(() => { game.quitToTitle(); ui.hostMode = true; game.startWorld('hardcore', 'survival', true); });
  await G.evaluate(() => showScreen('scr-title'));
  await join();
  await H.evaluate(() => MP.answerPrompt(true));
  await waitFor(G, () => game.state === 'playing' && MP.welcomed && game.hardcore, 120000);
  await sleep(1000);
  await G.evaluate(() => { const pl = game.player; pl.invuln = 0; pl.damage(1000, 'lava'); });
  check('her one life is gone: Game Over, and no respawning', await G.evaluate(() => ui.screen === 'scr-death' && el('death-h').textContent === 'Game Over!' && el('btn-respawn').hidden && el('btn-hc-new').hidden));
  check('the host knows she is out', await waitFor(H, gid => game.hcOut.includes(gid), 6000, GID));
  // the host goes through a portal: she doesn't come back to life on the other side
  await H.evaluate(() => { const pl = game.player; game.travel(Math.floor(pl.x), Math.floor(pl.y), Math.floor(pl.z)); });
  check('when the host goes to the Nether, she stays out (back at the title)', await waitFor(G, () => game.state === 'title' && ui.screen === 'scr-msg' && /one life/.test(el('msg-text').textContent) && !MP.role, 30000),
    await G.evaluate(() => ({ state: game.state, screen: ui.screen, role: MP.role })));
  await waitFor(H, () => game.state === 'playing' && game.dim === 'nether', 90000);
  await sleep(1500);
  const code3 = await H.evaluate(() => MP.code);
  await G.evaluate(code => { showScreen('scr-join'); MP.join(code); }, code3);
  check('she can not come back into that Hardcore world', await waitFor(G, () => /one life/.test(el('join-status').textContent), 30000), await G.evaluate(() => el('join-status').textContent));
  check('(and the host was not even asked)', await H.evaluate(() => el('join-prompt').hidden));

  check('no page errors', H.errs.length === 0 && G.errs.length === 0, H.errs.concat(G.errs).slice(0, 6));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close(); peer.close && peer.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
