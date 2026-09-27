// Playing together: two browsers (host and guest) meet through a local copy of the PeerJS
// room service, then play in the same world over a direct WebRTC connection.
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
    const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } });
    await ctx.addInitScript(([port, prof]) => {
      window.DC_NET = { host: '127.0.0.1', port, secure: false, path: '/', key: 'peerjs', iceServers: [] };
      if (!localStorage.getItem('declancraft:v1:profile')) localStorage.setItem('declancraft:v1:profile', JSON.stringify(prof));
    }, [PEER_PORT, profile]);
    const p = await ctx.newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(label + ': ' + e.message));
    await p.goto(url);
    await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
    return p;
  }
  const waitFor = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 200 }).then(() => true, () => false);
  const chatHas = (p, text, ms) => waitFor(p, t => [...el('chat-log').children].some(d => d.textContent === t), ms || 8000, text);
  const H = await open(HOST, 'host'), G = await open(GUEST, 'guest');

  // ---- 1. Declan hosts a new world ----
  await H.click('#btn-together');
  await H.click('#btn-host');
  check('host picks a world to share', await H.evaluate(() => !el('scr-worlds').hidden && el('worlds-h').textContent === 'Choose a World to Share'));
  await H.click('#world-cards .card >> nth=0 >> text=Create World');
  check('host world loads', await waitFor(H, () => game.state === 'playing', 120000));
  check('room opens with a code', await waitFor(H, () => MP.roomOpen && /^[A-Z]+[2-9]$/.test(MP.code), 20000), await H.evaluate(() => MP.code));
  const code = await H.evaluate(() => MP.code);
  const hb = await H.evaluate(() => ({ badge: el('room-badge').textContent, shown: !el('room-badge').hidden, chat: el('chat-log').textContent }));
  check('host sees the room code', hb.shown && hb.badge === 'Room ' + code && hb.chat.includes('Your room code is ' + code), hb);
  await H.evaluate(() => game.pause());
  await sleep(300);
  const pz = await H.evaluate(() => ({ shown: !el('scr-pause').hidden, big: el('room-code-big').textContent, invite: el('btn-invite').hidden, help: el('room-help').textContent }));
  if (pz.shown) {
    check('pause menu shows the room code big', pz.big === code && pz.invite && pz.help.includes(code), pz);
    await H.screenshot({ path: path.join(out, 'mp-host-pause.png') });
    await H.evaluate(() => game.resume());
  }

  // ---- 2. a wrong code ----
  await G.click('#btn-together');
  await G.click('#btn-join');
  await G.fill('#join-code', 'nope 9');
  check('code box tidies what is typed', await G.evaluate(() => el('join-code').value) === 'NOPE9', await G.evaluate(() => el('join-code').value));
  await G.click('#btn-join-go');
  check('wrong code: explains no game was found', await waitFor(G, () => /No game found with the code NOPE9/.test(el('join-status').textContent), 30000), await G.evaluate(() => el('join-status').textContent));
  check('can try again after', await G.evaluate(() => !el('btn-join-go').disabled && MP.role === null));

  // ---- 3. Cora asks to join; Declan says not now ----
  await G.fill('#join-code', code.toLowerCase());
  await G.click('#btn-join-go');
  check('host is asked', await waitFor(H, () => !el('join-prompt').hidden, 30000));
  const pr = await H.evaluate(() => ({ text: el('join-prompt-text').textContent, face: el('join-face').src.startsWith('data:image') }));
  check('prompt names who wants to join', pr.text === 'Cora wants to join your world.' && pr.face, pr);
  const lock = await H.evaluate(() => { const b = el('btn-deny'), r = b.getBoundingClientRect(); return { locked: !!document.pointerLockElement, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b }; });
  check('on a computer the mouse is freed so the prompt can be clicked', !lock.locked && lock.top, lock);
  const gs = await G.evaluate(() => el('join-status').textContent);
  check('guest is told to wait for the host', /Waiting for the host to let you in/.test(gs), gs);
  await H.screenshot({ path: path.join(out, 'mp-join-prompt.png') });
  await H.click('#btn-deny');
  check('guest hears "not now"', await waitFor(G, () => /said not now/.test(el('join-status').textContent), 15000), await G.evaluate(() => el('join-status').textContent));
  check('prompt goes away', await H.evaluate(() => el('join-prompt').hidden && MP.remotes.size === 0));

  // ---- 4. asks again; Declan lets her in ----
  await G.click('#btn-join-go');
  check('host is asked again', await waitFor(H, () => !el('join-prompt').hidden, 30000));
  await H.click('#btn-allow');
  check('guest joins and the world loads', await waitFor(G, () => game.state === 'playing' && MP.welcomed, 120000));
  await H.evaluate(() => { game.dragLook = true; game.resume(); });   // keep playing without capturing the mouse
  await G.evaluate(() => { game.dragLook = true; });
  const w1 = await H.evaluate(() => ({ seed: game.seed, map: game.mapId, x: game.player.x, z: game.player.z }));
  const w2 = await G.evaluate(() => ({ seed: game.seed, map: game.mapId, x: game.player.x, z: game.player.z, remote: game.world.remote, badge: el('room-badge').textContent, quit: el('btn-quit').textContent }));
  check('guest builds the same world, next to the host', w2.remote && w2.seed === w1.seed && w2.map === w1.map && Math.hypot(w2.x - w1.x, w2.z - w1.z) < 3, { w1, w2 });
  check('guest sees whose world it is', w2.badge === "In Declan's world" && w2.quit === "Leave Declan's World", w2);
  check('both know each other', await H.evaluate(() => { const r = MP.remotes.get('guestpid002'); return !!r && r.name === 'Cora' && r.skin === 'sister'; }) &&
    await G.evaluate(() => { const r = MP.remotes.get('host'); return !!r && r.name === 'Declan' && r.skin === 'declan'; }));
  check('host is told', await chatHas(H, 'Cora joined the game') && /2 players/.test(await H.evaluate(() => el('room-badge').textContent)));
  check('guest is welcomed', await chatHas(G, "You joined Declan's world!"));

  // ---- 4b. the host's link to the room service drops for a moment ----
  await H.evaluate(() => { window.__codeLines = [...el('chat-log').children].filter(d => d.textContent.startsWith('Your room code')).length; MP.sig.ws.close(); });
  check('room comes back with the same code after a network blip', await waitFor(H, code => !MP.roomOpen, 5000, code) && await waitFor(H, code => MP.roomOpen && MP.code === code, 20000, code), await H.evaluate(() => MP.code));
  check('...without repeating the code in chat', await H.evaluate(() => [...el('chat-log').children].filter(d => d.textContent.startsWith('Your room code')).length === window.__codeLines));
  check('the game connection is not affected', await G.evaluate(() => MP.welcomed && MP.hostLink && MP.hostLink.ready));

  // ---- 5. a platform in the sky: blocks travel from host to guest ----
  const P = await H.evaluate(() => { const pl = game.player; return { x: Math.floor(pl.x), y: Math.min(110, Math.floor(pl.y) + 14), z: Math.floor(pl.z) }; });
  await H.evaluate(P => { const w = game.world; for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) w.setBlock(P.x + dx, P.y, P.z + dz, B.STONE, 0); w.setBlock(P.x, P.y + 1, P.z - 5, B.GOLD_BLOCK, 0); }, P);
  check('host blocks appear for the guest', await waitFor(G, P => { const w = game.world; for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) if (w.getBlock(P.x + dx, P.y, P.z + dz) !== B.STONE) return false; return w.getBlock(P.x, P.y + 1, P.z - 5) === B.GOLD_BLOCK; }, 10000, P));
  // both stand on it, facing each other
  await H.evaluate(P => { game.setMode('creative'); Object.assign(game.player, { x: P.x + 0.5, y: P.y + 1.01, z: P.z + 3.5, vx: 0, vy: 0, vz: 0, flying: false, yaw: 0, pitch: -0.05 }); }, P);
  await G.evaluate(P => { Object.assign(game.player, { x: P.x + 0.5, y: P.y + 1.01, z: P.z - 1.5, vx: 0, vy: 0, vz: 0, flying: false, yaw: Math.PI, pitch: -0.05 }); }, P);
  // ...and from guest to host
  await G.evaluate(P => { game.world.setBlock(P.x + 3, P.y + 1, P.z, B.DIAMOND_BLOCK, 0); game.world.setBlock(P.x, P.y + 1, P.z - 5, B.AIR, 0); }, P);
  check('guest blocks appear for the host', await waitFor(H, P => game.world.getBlock(P.x + 3, P.y + 1, P.z) === B.DIAMOND_BLOCK && game.world.getBlock(P.x, P.y + 1, P.z - 5) === B.AIR, 10000, P));
  check('host sees the guest move there', await waitFor(H, P => { const r = MP.remotes.get('guestpid002'); return Math.hypot(r.x - (P.x + 0.5), r.z - (P.z - 1.5)) < 0.5; }, 10000, P));
  check('guest sees the host move there', await waitFor(G, P => { const r = MP.remotes.get('host'); return Math.hypot(r.x - (P.x + 0.5), r.z - (P.z + 3.5)) < 0.5; }, 10000, P));
  await sleep(1500);
  const tags = await H.evaluate(() => [...document.querySelectorAll('#nametags .nametag')].map(t => t.textContent + ':' + (t.style.display || 'shown')));
  check('host sees a name tag over Cora', tags.join() === 'Cora:shown', tags);
  const tagsG = await G.evaluate(() => [...document.querySelectorAll('#nametags .nametag')].map(t => t.textContent + ':' + (t.style.display || 'shown')));
  check('guest sees a name tag over Declan', tagsG.join() === 'Declan:shown', tagsG);
  await H.screenshot({ path: path.join(out, 'mp-host-view.png') });
  await G.screenshot({ path: path.join(out, 'mp-guest-view.png') });

  // ---- 6. chat both ways ----
  await G.evaluate(() => MP.say('hi Declan'));
  check('guest chat reaches the host', await chatHas(H, '<Cora> hi Declan'));
  await H.evaluate(() => MP.say('hi Cora'));
  check('host chat reaches the guest', await chatHas(G, '<Declan> hi Cora'));

  // ---- 7. creatures: the guest sees the host's pig and can hit it ----
  await H.evaluate(P => { window.__pig = spawnMob(game, 'pig', P.x - 2.5, P.y + 1, P.z - 1.5); }, P);
  check('guest sees the pig', await waitFor(G, nid => game.entities.some(e => e.proxy && e.type === 'pig' && e.nid === nid && !e.removed), 10000, await H.evaluate(() => window.__pig.nid)));
  const hp0 = await H.evaluate(() => window.__pig.hp);
  const nid = await H.evaluate(() => window.__pig.nid);
  await G.evaluate(nid => { const e = game.entities.find(e => e.proxy && e.nid === nid); game.setMode('survival'); hurtMob(game, e, 3, game.player.x, game.player.z, 'player'); }, nid);
  check('guest hit hurts the pig on the host', await waitFor(H, hp0 => window.__pig.hp < hp0, 8000, hp0), await H.evaluate(() => window.__pig.hp));
  await sleep(700);
  await G.evaluate(nid => { const e = game.entities.find(e => e.proxy && e.nid === nid); if (e) hurtMob(game, e, 20, game.player.x, game.player.z, 'player'); }, nid);
  check('the pig dies for both', await waitFor(H, () => !!window.__pig.dead, 8000) && await waitFor(G, nid => !game.entities.some(e => e.proxy && e.nid === nid && !e.removed), 8000, nid));
  check('its drops go to the guest who hit it', await waitFor(G, () => game.entities.some(e => e.type === 'item' && e.id === I.PORKCHOP) || countItem(game.player, I.PORKCHOP) > 0, 8000));

  // ---- 7b. falling sand and TNT: the host runs them, the guest only shows them ----
  await G.evaluate(() => game.setMode('creative'));
  await H.evaluate(() => { window.__guestSets = 0; const hm = MP.hostMsg; window.__hm = hm; MP.hostMsg = function (l, m) { if (m.t === 'set' && Array.isArray(m.b) && m.b.length) window.__guestSets++; return hm.call(this, l, m); }; });
  const S = { x: P.x + 4, y: P.y + 6, z: P.z + 4 };
  await H.evaluate(S => game.world.setBlock(S.x, S.y, S.z, B.SAND, 0), S);
  check('guest sees the sand fall', await waitFor(G, () => game.entities.some(e => e.proxy && e.type === 'falling'), 8000));
  const sandOk = await waitFor(H, S => game.world.getBlock(S.x, S.y - 5, S.z) === B.SAND && !game.entities.some(e => e.type === 'falling'), 20000, S) &&
    await waitFor(G, S => game.world.getBlock(S.x, S.y - 5, S.z) === B.SAND && !game.entities.some(e => e.type === 'falling' && !e.removed), 20000, S);
  await sleep(1500);
  const sandG = await G.evaluate(S => ({ above: game.world.getBlock(S.x, S.y - 4, S.z) === B.AIR, items: game.entities.filter(e => e.type === 'item' && e.id === B.SAND).length }), S);
  check('it lands once, in the same place for both', sandOk && sandG.above && sandG.items === 0, sandG);
  const T = { x: P.x - 4, y: P.y + 1, z: P.z + 4 };
  await H.evaluate(T => primeTNT(game, T.x, T.y, T.z, 1.2), T);
  check('guest sees the lit TNT', await waitFor(G, () => game.entities.some(e => e.proxy && e.type === 'tnt'), 8000));
  await waitFor(H, () => !game.entities.some(e => e.type === 'tnt'), 20000);
  await sleep(2500);
  const crater = await Promise.all([H, G].map(pg => pg.evaluate(T => { const a = []; for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) for (let dy = -6; dy <= 6; dy++) a.push(game.world.getBlock(T.x + dx, T.y + dy, T.z + dz)); return a.join(','); }, T)));
  const holes = crater[0].split(',').filter(v => v === '0').length;
  check('the blast is the host\'s alone: same crater on both, nothing extra from the guest', crater[0] === crater[1] && holes > 20 && await H.evaluate(() => window.__guestSets === 0) && await G.evaluate(() => !game.entities.some(e => !e.proxy && e.type === 'tnt')), { holes, sets: await H.evaluate(() => window.__guestSets) });
  await H.evaluate(() => { MP.hostMsg = window.__hm; });

  // ---- 8. a shared chest ----
  const C = { x: P.x - 3, y: P.y + 1, z: P.z + 1 };
  await H.evaluate(C => { const w = game.world; w.setBlock(C.x, C.y, C.z, B.CHEST, 0); const t = w.getTile(C.x, C.y, C.z, 'chest'); t.slots[0] = { id: I.APPLE, count: 5 }; }, C);
  check('guest sees the chest', await waitFor(G, C => game.world.getBlock(C.x, C.y, C.z) === B.CHEST, 8000, C));
  await G.evaluate(C => game.openScreen('chest', MP.openTile(C.x, C.y, C.z, 'chest')), C);
  check('guest opens it and sees what is inside', await waitFor(G, () => ui.inv && ui.inv.tile && !ui.inv.tile.loading && ui.inv.tile.slots[0] && ui.inv.tile.slots[0].id === I.APPLE && ui.inv.tile.slots[0].count === 5, 8000));
  await G.evaluate(() => { const t = ui.inv.tile; t.slots[0].count = 3; t.slots[1] = { id: I.APPLE, count: 2 }; MP.tileTouched(t); });
  check('guest changes reach the host chest', await waitFor(H, C => { const t = game.world.tiles.get(tileKey(C.x, C.y, C.z)); return t.slots[0] && t.slots[0].count === 3 && t.slots[1] && t.slots[1].count === 2; }, 8000, C));
  await G.evaluate(() => { game.player.give(I.APPLE, 2); ui.inv.tile.slots[1] = null; MP.tileTouched(ui.inv.tile); });
  check('her things are saved on the host right after a chest move', await waitFor(H, () => { const s = MP.guestSaves.guestpid002; return !!s && s.inv.some(q => q && q.id === I.APPLE && q.count >= 2); }, 2000));
  const hc = await H.evaluate(C => { const t = MP.useTile(C.x, C.y, C.z, 'chest'); game.player.breakBlock(C.x, C.y, C.z, false); return { opened: !!t, toast: el('toast').textContent, still: game.world.getBlock(C.x, C.y, C.z) === B.CHEST }; }, C);
  check('while she has it open, the host is told and can\'t break it', !hc.opened && /Cora is using this chest/.test(hc.toast) && hc.still, hc);
  await G.evaluate(() => game.closeUI());
  check('closing tells the host', await waitFor(H, C => { const t = game.world.tiles.get(tileKey(C.x, C.y, C.z)); return !t.viewers || t.viewers.size === 0; }, 8000, C));
  await H.evaluate(C => game.openScreen('chest', MP.useTile(C.x, C.y, C.z, 'chest')), C);
  await G.evaluate(C => game.openScreen('chest', MP.useTile(C.x, C.y, C.z, 'chest')), C);
  check('while the host has it open, the guest is told', await waitFor(G, () => !ui.inv && /Declan is using this chest/.test(el('toast').textContent), 8000), await G.evaluate(() => el('toast').textContent));
  const brk = await G.evaluate(C => { game.player.breakBlock(C.x, C.y, C.z, false); return game.world.getBlock(C.x, C.y, C.z) === B.AIR; }, C);
  check('...and if she breaks it meanwhile, it comes back', brk && await waitFor(G, C => game.world.getBlock(C.x, C.y, C.z) === B.CHEST, 8000, C) && await H.evaluate(C => game.world.getBlock(C.x, C.y, C.z) === B.CHEST && game.world.tiles.has(tileKey(C.x, C.y, C.z)), C));
  await H.evaluate(() => game.closeUI());

  // ---- 8b. a furnace open on the guest's iPad cooks there, then the host carries on ----
  const F = { x: P.x - 3, y: P.y + 1, z: P.z - 1 };
  await H.evaluate(F => { const w = game.world; w.setBlock(F.x, F.y, F.z, B.FURNACE, 0); const t = w.getTile(F.x, F.y, F.z, 'furnace'); t.slots[0] = { id: B.IRON_ORE, count: 3 }; t.slots[1] = { id: I.COAL, count: 1 }; }, F);
  await waitFor(G, F => game.world.getBlock(F.x, F.y, F.z) === B.FURNACE, 8000, F);
  await G.evaluate(F => game.openScreen('furnace', MP.useTile(F.x, F.y, F.z, 'furnace')), F);
  check('guest opens the furnace', await waitFor(G, () => ui.inv && ui.inv.tile && !ui.inv.tile.loading, 8000));
  check('it cooks on her iPad and lights up for both', await waitFor(G, () => ui.inv && ui.inv.tile.cook > 1, 20000) && await waitFor(H, F => game.world.getBlock(F.x, F.y, F.z) === B.FURNACE_LIT, 8000, F));
  await G.evaluate(() => game.closeUI());
  check('after she closes it the host finishes the job, nothing lost', await waitFor(H, F => { const t = game.world.tiles.get(tileKey(F.x, F.y, F.z)); return !!t && !t.slots[0] && t.slots[2] && t.slots[2].id === I.IRON_INGOT && t.slots[2].count === 3; }, 120000, F),
    await H.evaluate(F => game.world.tiles.get(tileKey(F.x, F.y, F.z)), F));

  // ---- 9. time of day follows the host ----
  await H.evaluate(() => game.runCommand('/time set night'));
  check('night falls for both', await waitFor(G, () => Math.abs(game.world.time - 0.56) < 0.03, 8000), await G.evaluate(() => game.world.time));
  await G.evaluate(() => game.runCommand('/time set day'));
  check('the guest can change the time too', await waitFor(H, () => Math.abs(game.world.time - 0.04) < 0.03, 8000) && await waitFor(G, () => Math.abs(game.world.time - 0.04) < 0.03, 8000), await G.evaluate(() => game.world.time));
  const day = await H.evaluate(() => { game.day = 7; MP.syncTime(); return game.day; });
  check('day count follows the host', await waitFor(G, day => game.day === day, 8000, day));

  // ---- 10. trading with the host's villager ----
  await H.evaluate(P => { window.__v = spawnMob(game, 'villager', P.x + 2.5, P.y + 1, P.z - 1.5, { prof: 'mason', home: [P.x + 2.5, P.z - 1.5], vseed: 321 }); }, P);
  check('guest sees the villager and its job', await waitFor(G, () => game.entities.some(e => e.proxy && e.type === 'villager' && e.prof === 'mason' && e.vseed === 321), 10000));
  await G.evaluate(() => { const pl = game.player; pl.inv.fill(null); pl.inv[3] = { id: B.COBBLE, count: 16 }; openTrade(game.entities.find(e => e.proxy && e.type === 'villager' && e.vseed === 321)); });
  check('villager stops to trade on the host', await waitFor(H, () => window.__v.tradeT > 0, 8000));
  const tr = await G.evaluate(() => { const title = document.querySelector('#inv-root h3').textContent; document.querySelector('.trade:not(.cant)').click(); return { title, emerald: countItem(game.player, I.EMERALD), cobble: countItem(game.player, B.COBBLE) }; });
  check('guest trades cobblestone for an emerald', tr.title === 'Mason' && tr.emerald === 1 && tr.cobble === 0, tr);
  await G.evaluate(() => game.closeUI());
  check('villager goes back to its day', await waitFor(H, () => window.__v.tradeT <= 0, 8000));

  // ---- 11. monsters go after the guest too ----
  await H.evaluate(() => { game.runCommand('/time set night'); });
  await G.evaluate(() => { game.setMode('survival'); game.player.health = 20; });
  await sleep(600);
  await H.evaluate(P => { window.__z = spawnMob(game, 'zombie', P.x + 0.5, P.y + 1, P.z - 3.5); }, P);
  check('a zombie can hurt the guest', await waitFor(G, () => game.player.health < 20, 20000), await G.evaluate(() => game.player.health));
  await H.evaluate(() => { window.__z.removed = true; game.runCommand('/time set day'); });

  // ---- 11b. dying with the game menu open (a shared world keeps going) ----
  await H.evaluate(() => { game.runCommand('/time set night'); game.setMode('survival'); game.player.health = 2; game.pause(); });
  await H.evaluate(() => { window.__z2 = spawnMob(game, 'zombie', game.player.x + 1.2, game.player.y, game.player.z); });
  check('the host can be caught with the menu open', await waitFor(H, () => game.state === 'dead', 30000));
  await H.evaluate(() => { window.__z2.removed = true; game.respawn(); });
  const rs = await H.evaluate(() => ({ paused: game.paused, state: game.state, hud: !el('hud').hidden }));
  check('...and respawns ready to play, not stuck', !rs.paused && rs.state === 'playing' && rs.hud, rs);
  await H.evaluate(() => { game.setMode('creative'); game.runCommand('/time set day'); });
  await G.evaluate(() => { game.runCommand('/summon constructor'); game.runCommand('/time set constructor'); });
  await sleep(1500);
  check('odd names sent by a guest are ignored', await H.evaluate(() => !game.entities.some(e => !MOB_DEFS.hasOwnProperty(e.type) && e.mob) && isFinite(game.world.time)));

  // ---- 12. leaving keeps her things in Declan's world; coming back restores them ----
  await G.evaluate(() => game.quitToTitle());
  check('host sees Cora leave', await chatHas(H, 'Cora left the game', 10000) && await H.evaluate(() => MP.remotes.size === 0 && !document.querySelector('#nametags .nametag')));
  const saved = await H.evaluate(() => { const s = MP.guestSaves.guestpid002; return s && { emerald: s.inv.filter(Boolean).filter(q => q.id === I.EMERALD).length, name: s.name }; });
  check('host keeps her things', !!saved && saved.emerald === 1 && saved.name === 'Cora', saved);
  await H.evaluate(() => game.save());
  const inSave = await H.evaluate(() => { const d = JSON.parse(localStorage.getItem('declancraft:v1:world:valley')); return !!(d.players && d.players.guestpid002 && d.players.guestpid002.inv); });
  check("her things are in the host's save file", inSave);
  check('guest is back at the title', await G.evaluate(() => game.state !== 'playing' && !el('scr-title').hidden && MP.role === null));
  await G.click('#btn-together');
  await G.click('#btn-join');
  await G.fill('#join-code', code);
  await G.click('#btn-join-go');
  check('host is asked when she comes back', await waitFor(H, () => !el('join-prompt').hidden, 30000));
  await H.click('#btn-allow');
  check('guest rejoins', await waitFor(G, () => game.state === 'playing' && MP.welcomed, 120000));
  const back = await G.evaluate(P => ({ emerald: countItem(game.player, I.EMERALD), near: Math.hypot(game.player.x - (P.x + 0.5), game.player.z - (P.z - 1.5)) < 4 }), P);
  check('her things and place come back', back.emerald === 1 && back.near, back);

  // ---- 12b. the room service re-attaches quietly when the same room reconnects with its token ----
  const quiet = await H.evaluate(() => new Promise(res => { const s = new Signal(roomPeerId(MP.code), { onOpen: () => { res(true); s.close(); }, onClose: why => res(why) }, MP.token); setTimeout(() => res('timeout'), 8000); }));
  check('same room and token re-attach quietly', quiet === true, quiet);

  // ---- 13. Declan saves and quits: Cora is told, and her last things are kept ----
  await G.evaluate(() => { game.player.give(I.DIAMOND, 7); });
  await H.evaluate(() => game.quitToTitle());
  check('guest is told the game ended', await waitFor(G, () => !el('scr-msg').hidden && el('msg-title').textContent === 'Game ended', 10000), await G.evaluate(() => el('msg-title').textContent + ' / ' + el('msg-text').textContent));
  await G.screenshot({ path: path.join(out, 'mp-game-ended.png') });
  await sleep(2500);
  const fin = await H.evaluate(() => { const d = JSON.parse(localStorage.getItem('declancraft:v1:world:valley')), q = d.players && d.players.guestpid002; return q ? q.inv.filter(Boolean).filter(x => x.id === I.DIAMOND).reduce((a, x) => a + x.count, 0) : -1; });
  check("what she picked up just before is saved in Declan's world", fin === 7, fin);
  check('both are back to playing alone', await H.evaluate(() => MP.role === null && game.net === null) && await G.evaluate(() => MP.role === null && game.net === null));
  // ---- 14. playing alone, then inviting from the game menu ----
  await H.click('#btn-play');
  await H.click('#world-cards .card >> nth=0 >> text=Continue');
  check('host continues the saved world alone', await waitFor(H, () => game.state === 'playing' && MP.role === null, 120000) && await H.evaluate(() => el('room-badge').hidden));
  await H.evaluate(() => { game.dragLook = true; game.pause(); });
  check('game menu offers Invite a Player', await H.evaluate(() => !el('btn-invite').hidden && el('pause-room').hidden));
  await H.click('#btn-invite');
  check('inviting opens a room', await waitFor(H, () => MP.role === 'host' && MP.roomOpen && el('room-code-big').textContent === MP.code, 20000) && await H.evaluate(() => el('btn-invite').hidden && !el('pause-room').hidden));
  await H.evaluate(() => game.quitToTitle());
  check('no script errors', H.errs.length + G.errs.length === 0, H.errs.concat(G.errs).slice(0, 4));
  await browser.close(); server.close(); peer.close && peer.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
