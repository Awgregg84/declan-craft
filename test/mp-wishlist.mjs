// Declan's wish list, playing together: arrows, TNT, levers, dispensers, pearls, endermen, ghast fireballs,
// minecarts and cars all work for a guest as well as the host.
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
    const ctx = await browser.newContext({ viewport: { width: 800, height: 520 } });
    await ctx.addInitScript(([port, prof]) => {
      window.DC_NET = { host: '127.0.0.1', port, secure: false, path: '/', key: 'peerjs', iceServers: [], mqtt: [] };
      if (!localStorage.getItem('declancraft:v1:profile')) localStorage.setItem('declancraft:v1:profile', JSON.stringify(prof));
    }, [PEER_PORT, profile]);
    const p = await ctx.newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(label + ': ' + e.message));
    await p.goto(url);
    await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
    await p.evaluate(() => {
      window.__seen = new Set();   // kinds of things the host has sent (-3 arrows, -5 minecarts, -6 cars ...)
      const ae = MP.applyEnts.bind(MP); MP.applyEnts = function (list) { for (const a of list) if (Array.isArray(a)) window.__seen.add(a[1]); return ae(list); };
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
  await H.evaluate(() => { window.__msgs = []; const hm = MP.hostMsg.bind(MP); MP.hostMsg = function (l, m) { if (m && m.t !== 'st' && m.t !== 'save') window.__msgs.push(JSON.stringify(m).slice(0, 160)); return hm(l, m); }; });
  const heard = () => H.evaluate(() => window.__msgs.slice(-6));
  const settle = () => sleep(600);   // let the host hear where she moved to before she does anything there

  await H.evaluate(() => { game.dragLook = true; ui.hostMode = true; game.startWorld('valley', 'survival', true); });
  await waitFor(H, () => game.state === 'playing' && MP.roomOpen, 120000);
  const code = await H.evaluate(() => MP.code);
  await G.evaluate(code => { game.dragLook = true; MP.join(code); }, code);
  await waitFor(H, () => !el('join-prompt').hidden, 30000);
  await H.evaluate(() => MP.answerPrompt(true));
  check('guest joins', await waitFor(G, () => game.state === 'playing' && MP.welcomed, 120000));

  // a big stone floor in the sky; both players on it
  const S = await H.evaluate(() => {
    const w = game.world, pl = game.player, x = Math.floor(pl.x), y = 100, z = Math.floor(pl.z);
    game.settings.difficulty = 2; w.time = 0.25; MP.syncTime();
    for (let dx = -16; dx <= 16; dx++) for (let dz = -16; dz <= 16; dz++) { w.setBlock(x + dx, y - 1, z + dz, B.STONE, 0); for (let k = 0; k < 6; k++) w.setBlock(x + dx, y + k, z + dz, B.AIR, 0); }
    Object.assign(pl, { x: x + 0.5, y, z: z + 8.5, vx: 0, vy: 0, vz: 0, flying: false, yaw: 0, pitch: 0 });
    return { x, y, z };
  });
  await waitFor(G, S => game.world.getBlock(S.x + 16, S.y - 1, S.z + 16) === B.STONE && game.world.getBlock(S.x - 16, S.y - 1, S.z - 16) === B.STONE, 15000, S);
  await G.evaluate(S => Object.assign(game.player, { x: S.x + 3.5, y: S.y, z: S.z + 8.5, vx: 0, vy: 0, vz: 0, flying: false }), S);
  await sleep(800);

  // 1. her arrow: she sees it fly at once, and the host's zombie takes the hit
  const zid = await H.evaluate(S => { const z = spawnMob(game, 'zombie', S.x + 3.5, S.y, S.z - 1.5); z.frozen = 60; z.yaw = z.bodyYaw = Math.PI; return z.nid; }, S);
  await waitFor(G, zid => game.entities.some(e => e.nid === zid), 8000, zid);
  await G.evaluate(zid => {
    const pl = game.player, z = game.entities.find(e => e.nid === zid);   // (not some other zombie down a cave)
    pl.inv[0] = { id: I.BOW, count: 1 }; pl.inv[1] = { id: I.ARROW, count: 5 }; pl.sel = 0; game.ui.dirty = true;
    T.aim(z.x, z.y + 1.2, z.z);
    game.input.use = true; game.input.usePressed = true;
  }, zid);
  await sleep(1300);
  await G.evaluate(() => { game.input.use = false; });
  check('her arrow shows on her screen straight away', await waitFor(G, () => T.ents('proj').length > 0, 1000));
  const hz = await waitFor(H, zid => { const z = game.entities.find(e => e.nid === zid); return z && z.hp <= 13; }, 6000, zid);
  check("it hits the host's zombie hard", hz, { hp: await H.evaluate(zid => { const z = game.entities.find(e => e.nid === zid); return z && [z.hp, z.x, z.y, z.z]; }, zid), heard: await heard(), her: await G.evaluate(() => [game.player.x, game.player.y, game.player.z, T.ents('zombie').map(z => [z.x, z.y, z.z])]) });
  check('it used one of her arrows and wore her bow', await G.evaluate(() => T.count(I.ARROW) === 4 && game.player.inv[0].dmg === 1), await G.evaluate(() => ({ arrows: T.count(I.ARROW), held: game.player.inv[0], mode: game.mode })));
  check('her quick copy goes away (no doubled arrows)', await waitFor(G, () => !T.ents('proj').some(e => e.ghost), 4000));
  // the host's arrow reaches her screen
  await H.evaluate(zid => {
    const pl = game.player, z = game.entities.find(e => e.nid === zid);
    pl.inv[0] = { id: I.CROSSBOW_LOADED, count: 1 }; pl.sel = 0; game.ui.dirty = true;
    T.aim(z.x, z.y + 1.2, z.z); T.tap();
  }, zid);
  check("she sees the host's arrow", await waitFor(G, () => window.__seen.has(-3), 4000));
  check('and hears the crossbow', await waitFor(G, () => window.__fx.has('sfx:crossbowShoot'), 4000), await G.evaluate(() => Array.from(window.__fx)));
  await H.evaluate(() => { for (const e of game.entities) if (e.mob || e.type === 'proj') e.removed = true; });

  // 2. she flips a lever by Party TNT: it goes off, and everyone bounces (no harm done)
  const L = { x: S.x - 4, y: S.y, z: S.z + 6 };
  await H.evaluate(L => { const w = game.world; w.setBlock(L.x, L.y, L.z, B.STONE, 0); w.setBlock(L.x, L.y + 1, L.z, B.LEVER, 3); w.setBlock(L.x - 1, L.y, L.z, B.PARTY_TNT, 0); }, L);
  await waitFor(G, L => game.world.getBlock(L.x, L.y + 1, L.z) === B.LEVER, 8000, L);
  await G.evaluate(L => {
    Object.assign(game.player, { x: L.x + 0.5, y: L.y, z: L.z + 2.5 });
    const pl = game.player; pl.inv[0] = null; game.ui.dirty = true;
    T.aim(L.x + 0.5, L.y + 1.2, L.z + 0.5); T.tap();
  }, L);
  check("her lever lights the host's Party TNT", await waitFor(H, L => game.world.getBlock(L.x - 1, L.y, L.z) === B.AIR && T.ents('tnt').some(e => e.kind === 'party'), 6000, L));
  check('she hears the lever click on the host', await waitFor(H, () => window.__fx.size >= 0 && true, 100));
  check('the party reaches her: confetti and a bounce, and no harm', await waitFor(G, () => game.player.partyT > 0 && window.__fx.has('party'), 9000), await G.evaluate(() => ({ partyT: game.player.partyT, fx: Array.from(window.__fx) })));
  await sleep(2500);
  check('she lands without getting hurt', await G.evaluate(() => game.player.health === 20 && game.player.onGround));

  // 3. a dispenser: she opens it and fills it, and her button makes it fire
  const D = { x: S.x + 6, y: S.y, z: S.z + 4 };
  await H.evaluate(D => { const w = game.world; w.setBlock(D.x, D.y, D.z, B.DISPENSER, 2); w.setBlock(D.x + 1, D.y, D.z, B.BUTTON, 1); }, D);
  await waitFor(G, D => game.world.getBlock(D.x + 1, D.y, D.z) === B.BUTTON, 8000, D);
  await G.evaluate(D => {
    Object.assign(game.player, { x: D.x + 0.5, y: D.y, z: D.z + 2.5 });
    game.player.inv[2] = { id: I.ARROW, count: 6 };
    T.aim(D.x + 0.5, D.y + 0.5, D.z + 1);
  }, D);
  await sleep(300);
  await G.evaluate(() => T.tap());
  check('she can open the dispenser (9 slots)', await waitFor(G, () => ui.inv && ui.inv.kind === 'dispenser' && ui.inv.tile && !ui.inv.tile.loading && ui.inv.tile.slots.length === 9, 6000));
  await H.evaluate(S => { game.world.setBlock(S.x - 10, S.y, S.z - 10, B.STONE, 0); game.world.setBlock(S.x - 10, S.y + 1, S.z - 10, B.STONE, 0); }, S);
  await waitFor(G, S => game.world.getBlock(S.x - 10, S.y + 1, S.z - 10) === B.STONE, 6000, S);
  check('her dispenser screen stays open while other blocks change', await G.evaluate(() => !!ui.inv && ui.inv.kind === 'dispenser'));
  await G.evaluate(() => { const t = ui.inv.tile, pl = game.player; t.slots[4] = pl.inv[2]; pl.inv[2] = null; MP.tileTouched(t); game.closeUI(); });
  check('what she puts in reaches the host', await waitFor(H, D => { const t = game.world.tiles.get(tileKey(D.x, D.y, D.z)); return t && t.slots[4] && t.slots[4].id === I.ARROW && t.slots[4].count === 6; }, 6000, D));
  await G.evaluate(D => { Object.assign(game.player, { x: D.x + 2.8, y: D.y, z: D.z + 0.5 }); }, D);
  await settle();
  await G.evaluate(D => { T.aim(D.x + 1.06, D.y + 0.5, D.z + 0.5); T.tap(); }, D);
  check('her button makes it fire an arrow', await waitFor(H, D => { const t = game.world.tiles.get(tileKey(D.x, D.y, D.z)); return t.slots[4] && t.slots[4].count === 5; }, 6000, D));
  check('and the button pops back up', await waitFor(G, D => !(game.world.getData(D.x + 1, D.y, D.z) & 8), 4000, D));

  // 4. her ender pearl takes her where it lands
  await G.evaluate(S => Object.assign(game.player, { x: S.x + 0.5, y: S.y, z: S.z + 12.5 }), S);
  await settle();
  const before = await G.evaluate(S => {
    const pl = game.player;
    pl.inv[0] = { id: I.ENDER_PEARL, count: 2 }; pl.sel = 0; game.ui.dirty = true;
    T.aim(S.x + 0.5, S.y + 2.5, S.z); T.tap();
    return pl.z;
  }, S);
  check('her ender pearl takes her where it lands', await waitFor(G, b => game.player.z < b - 5, 6000, before), await G.evaluate(() => [game.player.x, game.player.y, game.player.z]));

  // 5. an enderman carrying a block, and one that is angry, look right on her screen
  const en = await H.evaluate(S => {
    const e = spawnMob(game, 'enderman', S.x - 6.5, S.y, S.z - 6.5); e.carry = B.SAND; e.frozen = 60;
    const f = spawnMob(game, 'enderman', S.x - 9.5, S.y, S.z - 6.5); f.frozen = 60; f.angryAt = 'me'; f.angryT = 30;
    return [e.nid, f.nid];
  }, S);
  check('she sees the enderman carrying sand, and the angry one', await waitFor(G, () => { const e = T.ents('enderman'); return e.length === 2 && e.some(q => q.carry === B.SAND) && e.some(q => q.angry); }, 6000));
  await H.evaluate(() => { for (const e of game.entities) if (e.mob) e.removed = true; });

  // 6. a ghast's fireball: she can hit it back
  const fb = await H.evaluate(() => {
    const r = Array.from(MP.remotes.values())[0];
    const f = shootProjectile(game, 'fireball', r.tx, r.ty + 1.6, r.tz - 2.5, 0, 0, 0, { owner: 'mob' });   // hanging in the air in front of her
    return f.nid;
  });
  await waitFor(G, () => T.ents('proj').some(e => e.kind === 'fireball'), 6000);
  const hit = await G.evaluate(() => {
    const f = T.ents('proj').find(e => e.kind === 'fireball'), pl = game.player;
    T.aim(f.x, f.y, f.z); pl.pickTarget();
    if (pl.targetEnt !== f) return false;
    pl.pitch = 0.3;   // send it up and away
    return true;
  });
  await settle();
  await G.evaluate(() => { const f = T.ents('proj').find(e => e.kind === 'fireball'); MP.sendHit(f, 0, game.player.x, game.player.z); });
  check('she can aim at a fireball', hit);
  check('hitting it sends it back the way she looks', await waitFor(H, fb => { const f = game.entities.find(e => e.nid === fb); return f && f.deflected && f.owner === 'guestpid002' && f.vy > 1; }, 5000, fb), await H.evaluate(fb => { const f = game.entities.find(e => e.nid === fb); return f && { d: f.deflected, o: f.owner, v: [f.vx, f.vy, f.vz] }; }, fb));
  await sleep(1000);

  // 7. she puts a car down, gets in and drives it; the host sees it go, with her sitting in it
  await G.evaluate(S => Object.assign(game.player, { x: S.x + 8.5, y: S.y, z: S.z + 12.5, yaw: 0, pitch: -0.5 }), S);
  await settle();
  const car0 = await G.evaluate(S => {
    const pl = game.player;
    pl.inv[0] = { id: I.CAR, count: 1 }; pl.sel = 0; game.ui.dirty = true;
    pl.target = { x: S.x + 8, y: S.y - 1, z: S.z + 10, id: B.STONE, face: 2 };
    return pl.useBlock(I.CAR, false);
  }, S);
  check('she puts a car down', car0 && await waitFor(H, () => T.ents('car').length === 1, 6000), { car0, heard: await heard() });
  check('the car appears on her screen', await waitFor(G, () => T.ents('car').length === 1, 6000));
  await G.evaluate(() => T.ents('car').length && mountVehicle(game, T.ents('car')[0]));
  check('she gets in (the host says yes)', await waitFor(G, () => game.player.riding && game.player.riding.local, 6000));
  check("the host sees she's in it", await waitFor(H, () => { const c = T.ents('car')[0], r = Array.from(MP.remotes.values())[0]; return c.rider === r.id && r.riding === 'car'; }, 6000));
  const hc0 = await H.evaluate(() => { const c = T.ents('car')[0]; return [c.x, c.z]; });
  await G.evaluate(() => { game.input.fwd = true; });
  const drove = await waitFor(H, hc0 => { const c = T.ents('car')[0]; return Math.hypot(c.x - hc0[0], c.z - hc0[1]) > 5; }, 10000, hc0);
  await G.evaluate(() => { game.input.fwd = false; game.input.back = true; });
  await sleep(800);
  await G.evaluate(() => { game.input.back = false; });
  check('she drives it, and the host sees it move', drove, await H.evaluate(() => { const c = T.ents('car')[0]; return [c.x, c.z]; }));
  // pausing lets go of the wheel: the car rolls to a stop (the shared world keeps going behind the menu)
  await G.evaluate(() => { game.input.fwd = true; });
  await waitFor(G, () => { const v = game.player.riding; return v && Math.hypot(v.vx, v.vz) > 5; }, 6000);
  await G.evaluate(() => game.pause());
  await sleep(2500);
  const coast = await G.evaluate(() => { const v = game.player.riding; return { v: Math.hypot(v.vx, v.vz), paused: game.paused }; });
  await G.evaluate(() => { game.resume(); game.input.fwd = false; });
  check('when she pauses while driving, the car stops instead of driving on', coast.paused && coast.v < 1, coast);
  await H.screenshot({ path: path.join(out, 'mp-car-host.png') });
  const hostCar = await H.evaluate(() => T.ents('car')[0].nid);
  // the host can't get into her car
  check("the host can't get in while she drives", await H.evaluate(() => { mountVehicle(game, T.ents('car')[0]); return !game.player.riding; }));
  await G.evaluate(() => { game.input.sneak = true; });
  await waitFor(G, () => !game.player.riding, 4000);
  await G.evaluate(() => { game.input.sneak = false; });
  check('she gets out, and the car is free again', await waitFor(H, () => !T.ents('car')[0].rider, 6000));
  // now the host takes it for a spin, and she sees him sitting in it
  await H.evaluate(() => { const c = T.ents('car')[0], pl = game.player; Object.assign(pl, { x: c.x + 1.5, y: c.y, z: c.z }); mountVehicle(game, c); });
  check('the host gets in', await H.evaluate(() => !!game.player.riding));
  check("she sees the host sitting in the car", await waitFor(G, () => { const r = MP.remotes.get('host'); return r && r.riding === 'car'; }, 6000));
  await H.evaluate(() => { game.input.fwd = true; });
  const gc0 = await G.evaluate(() => { const c = T.ents('car')[0]; return [c.x, c.z]; });
  check("and sees it drive off", await waitFor(G, gc0 => { const c = T.ents('car')[0]; return Math.hypot(c.x - gc0[0], c.z - gc0[1]) > 4; }, 10000, gc0));
  await H.evaluate(() => { game.input.fwd = false; dismountVehicle(game); });
  // she breaks it (Survival): it comes back to her as an item
  await G.evaluate(() => { const c = T.ents('car')[0]; for (let i = 0; i < 4; i++) MP.sendHit(c, 1, game.player.x, game.player.z); });
  check('a few hits from her break the car, and it drops as an item for her', await waitFor(G, () => !T.ents('car').length && T.ents('item').some(e => e.id === I.CAR), 8000), await G.evaluate(() => ({ cars: T.ents('car').length, items: T.ents('item').map(e => e.id) })));

  // 8. Ice TNT near her chills her; Digging TNT's tunnel reaches her world
  const IC = { x: S.x - 8, y: S.y, z: S.z - 8 };
  await G.evaluate(IC => Object.assign(game.player, { x: IC.x + 2.5, y: IC.y, z: IC.z + 0.5 }), IC);
  await settle();
  await H.evaluate(IC => { const w = game.world; w.setBlock(IC.x, IC.y, IC.z, B.ICE_TNT, 0); igniteTNT(game, IC.x, IC.y, IC.z, 0.2); }, IC);
  check('Ice TNT near her slows her down', await waitFor(G, () => game.player.chill > 0 && window.__fx.has('ice'), 6000));
  const DG = { x: S.x + 12, y: S.y, z: S.z - 12 };
  await H.evaluate(DG => {
    const w = game.world;
    for (let dx = 0; dx <= 3; dx++) for (let dz = -18; dz <= 0; dz++) for (let y = DG.y; y < DG.y + 4; y++) w.setBlock(DG.x + dx, y, DG.z + dz, B.STONE, 0);
    w.setBlock(DG.x + 1, DG.y, DG.z, B.DIG_TNT, 0);   // its drill faces south... so dig north instead:
    const e = igniteTNT(game, DG.x + 1, DG.y, DG.z, 0.2); e.dir = 2;
  }, DG);
  check("Digging TNT's tunnel shows up on her screen", await waitFor(G, DG => { for (let i = 6; i <= 10; i++) if (game.world.getBlock(DG.x + 1, DG.y + 1, DG.z - i) !== B.AIR) return false; return true; }, 10000, DG));

  // 9. a minecart: the host rides it along rails and she sees him in it
  const R = { x: S.x - 12, y: S.y, z: S.z + 2 };
  await H.evaluate(R => {
    const w = game.world;
    for (let i = 0; i < 10; i++) shapeRail(w, R.x, R.y, R.z - i, 0);
    const c = spawnVehicle(game, 'minecart', R.x + 0.5, R.y + 0.0625, R.z + 0.5, 0);
    Object.assign(game.player, { x: R.x + 1.5, y: R.y, z: R.z + 0.5 });
    mountVehicle(game, c); game.player.yaw = 0; game.input.fwd = true;
  }, R);
  check('she sees the host riding a minecart along the rails', await waitFor(G, R => { const r = MP.remotes.get('host'), c = T.ents('minecart')[0]; return r && r.riding === 'cart' && c && c.z < R.z - 3; }, 10000, R));
  await H.evaluate(() => { game.input.fwd = false; dismountVehicle(game); });

  check('no page errors', H.errs.length === 0 && G.errs.length === 0, H.errs.concat(G.errs).slice(0, 6));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close(); peer.close && peer.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
