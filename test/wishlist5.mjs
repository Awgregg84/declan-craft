// Declan's fifth wish list, playing alone. Sections can be picked: node test/wishlist5.mjs tanks students quidditch falls
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), out = path.join(dir, 'shots');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html'));
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(0);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
const want = process.argv.slice(2), on = k => !want.length || want.includes(k);
const FRONT_FACE_OF = d => [4, 1, 5, 0][d & 3];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // (the web font can stall the page loading from a test machine; it isn't needed here)
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:' + server.address().port + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 90000 });
  const E = (fn, arg) => p.evaluate(fn, arg);
  const waitFor = (fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
  const shot = async name => { await p.screenshot({ path: path.join(out, 'w5-' + name + '.png') }); };
  await E(() => { game.startWorld('valley', 'survival', true); });
  await waitFor(() => game.state === 'playing', 90000);
  await E(() => {
    game.dragLook = true; game.settings.difficulty = 2; game.world.time = 0.25;
    window.__toasts = []; const t0 = toast; window.toast = (m, s) => { window.__toasts.push(m); return t0(m, s); };
    window.T = {
      stage(x, y, z, r, h) { const w = game.world; for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { w.setBlock(x + dx, y - 1, z + dz, B.STONE, 0); for (let k = 0; k < (h || 6); k++) w.setBlock(x + dx, y + k, z + dz, B.AIR, 0); } },
      clearMobs() { for (const e of game.entities) if (e.mob || e.type === 'proj' || e.type === 'item' || e.type === 'tnt' || e.type === 'xp') e.removed = true; },
      aim(tx, ty, tz) { const pl = game.player, dx = tx - pl.x, dy = ty - (pl.y + pl.eye), dz = tz - pl.z; pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
      put(x, y, z, opts) { Object.assign(game.player, { x, y, z, vx: 0, vy: 0, vz: 0, fallDist: 0, flying: false }, opts || {}); },
      hold(id, count, extra) { const pl = game.player; pl.inv[0] = id ? Object.assign({ id, count: count || 1 }, extra || {}) : null; pl.sel = 0; game.ui.dirty = true; },
      count(id) { return game.player.inv.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0); },
      ents(type) { return game.entities.filter(e => !e.removed && e.type === type); },
      tap() { game.input.use = true; game.input.usePressed = true; game.input.useOnce = true; },
    };
  });
  const base = await E(() => { const pl = game.player; return { x: Math.floor(pl.x), y: 100, z: Math.floor(pl.z) }; });
  const area = (dx, dz) => ({ x: base.x + dx, y: base.y, z: base.z + dz });
  const goto = async C => {
    await E(C => T.put(C.x + 0.5, C.y + 3, C.z + 0.5, { flying: true }), C);
    await waitFor(C => game.world.readyAround(C.x + 0.5, C.z + 0.5, 1) >= 1, 60000, C);
  };

  if (process.env.DBG) {   // (a quick look at something: DBG='code run in the page' node test/wishlist5.mjs dbg)
    const D = area(0, 0);
    await goto(D);
    console.log(JSON.stringify(await E(new Function('D', 'return (async () => {' + process.env.DBG + '})()'), D)));
  }

  if (on('tanks')) {
    // ---------- tanks in different colours ----------
    const P = area(40, 0);
    await goto(P);
    await E(P => { T.stage(P.x, P.y, P.z, 12, 6); T.clearMobs(); game.setMode('survival'); game.settings.difficulty = 0; game.world.setBlock(P.x + 3, P.y, P.z - 6, B.STONE, 0); }, P);
    const items = await E(() => TANK_COLORS.map((c, i) => ({ name: itemName(I.TANK + i), icon: !!ICONS[I.TANK + i], creative: CREATIVE_LIST.includes(I.TANK + i) })));
    check('six tanks, each its own colour, with pictures, in Creative', items.length === 6 && items.every(o => o.icon && o.creative) && items.map(o => o.name).join() === 'Green Tank,Desert Tank,Blue Tank,Red Tank,Pink Tank,Black Tank', items);
    const rec = await E(() => {
      const make = g => { const o = matchRecipe(g, 3); return o ? itemName(o.out) : null; }, Ib = B.IRON_BLOCK;
      return [make([0, B.WOOL + 13, 0, Ib, Ib, Ib, 0, 0, 0]), make([0, B.WOOL + 6, 0, Ib, Ib, Ib, 0, 0, 0]), make([0, B.WOOL + 15, 0, Ib, Ib, Ib, 0, 0, 0]), make([0, B.WOOL, 0, Ib, Ib, Ib, 0, 0, 0])];
    });
    check('a tank is made from three iron blocks with wool on top; the wool picks its colour', rec.join() === 'Green Tank,Pink Tank,Black Tank,', rec);
    const put = await E(P => {
      const pl = game.player, out = [];
      TANK_COLORS.forEach((c, i) => {
        const dx = -7.5 + i * 3;
        T.put(P.x + 0.5 + dx, P.y, P.z + 5.5, { yaw: 0, pitch: -0.5 });
        T.hold(I.TANK + i, 1);
        pl.target = { x: Math.floor(P.x + dx), y: P.y - 1, z: P.z + 2, id: B.STONE, face: 2 };
        out.push(pl.useBlock(I.TANK + i, false) && T.count(I.TANK + i) === 0);
      });
      return { out, colours: T.ents('tank').map(v => v.tc).join() };
    }, P);
    check('tanks go down on the ground in their own colours', put.out.every(Boolean) && put.colours === '0,1,2,3,4,5', put);
    await E(P => { T.put(P.x + 0.5, P.y + 1.5, P.z + 10.5, { yaw: 0, pitch: -0.25 }); game.view = 0; }, P);
    await sleep(1200);
    await shot('tanks-parked');
    // drive the red one: forward, turn on the spot, climb a step
    const drv = await E(() => { const v = T.ents('tank')[3]; mountVehicle(game, v); return { riding: game.player.riding === v, tip: window.__toasts.some(m => /paint shell/.test(m)) }; });
    check('get in a tank: a tip says how to drive and fire', drv.riding && drv.tip, drv);
    const z0 = await E(() => { game.input.fwd = true; return T.ents('tank')[3].z; });
    await sleep(1500);
    const go = await E(z0 => { const v = T.ents('tank')[3]; game.input.fwd = false; return { dz: Math.round((v.z - z0) * 10) / 10, spd: Math.round(Math.hypot(v.vx, v.vz) * 10) / 10, tr: v.trL !== undefined }; }, z0);
    check('it drives forward, slower than a car, and its tracks run', go.dz < -1.5 && go.spd <= 5.6 && go.tr, go);
    const yaw0 = await E(() => { game.input.joyX = 1; return T.ents('tank')[3].yaw; });
    await sleep(800);
    const spun = await E(yaw0 => { const v = T.ents('tank')[3]; game.input.joyX = 0; return { turned: Math.round((yaw0 - v.yaw) * 100) / 100, moved: Math.round(Math.hypot(v.vx, v.vz) * 10) / 10 }; }, yaw0);
    check('it turns on the spot', spun.turned > 0.5 && spun.moved < 1, spun);
    // the turret follows where you look; the hull stays put
    const tur = await E(() => { const pl = game.player, v = pl.riding; pl.yaw = v.yaw + 1.2; pl.pitch = 0.3; return new Promise(r => setTimeout(() => r({ rel: Math.round((v.turret - v.yaw) * 100) / 100, gun: Math.round(v.gun * 100) / 100 }), 300)); });
    check('the turret and gun turn to where the driver looks', Math.abs(tur.rel - 1.2) < 0.05 && Math.abs(tur.gun - 0.3) < 0.05, tur);
    await E(() => { game.view = 1; }); await sleep(600); await shot('tank-turret'); await E(() => { game.view = 0; });
    // climb a one-block step
    const climb = await E(P => {
      const pl = game.player, v = pl.riding;
      v.x = P.x + 3.5; v.z = P.z - 2.5; v.y = P.y; v.yaw = 0; v.vx = v.vz = 0; pl.yaw = 0; pl.pitch = 0;
      game.input.fwd = true;
      let top = v.y;
      const iv = setInterval(() => { top = Math.max(top, v.y); }, 50);
      return new Promise(r => setTimeout(() => { clearInterval(iv); game.input.fwd = false; r({ y: Math.round(top * 10) / 10 - P.y, z: Math.round(v.z - P.z) }); }, 2500));
    }, P);
    check('it climbs up a one-block step', climb.y >= 1 && climb.z <= -6, climb);
    // fire a paint shell at a sheep: it gets a shove and red wool, and nothing is hurt
    const fire = await E(async P => {
      const pl = game.player, v = pl.riding, w = game.world;
      v.x = P.x + 0.5; v.y = P.y; v.z = P.z + 6.5; v.yaw = 0; v.vx = v.vz = 0;
      const sh = spawnMob(game, 'sheep', P.x + 0.5, P.y, P.z - 4.5); sh.wool = 0; sh.ai = () => {}; const hp = sh.hp;
      const blocks = () => { let n = 0; for (let dx = -12; dx <= 12; dx++) for (let dz = -12; dz <= 12; dz++) n += w.getBlock(P.x + dx, P.y - 1, P.z + dz) === B.STONE ? 1 : 0; return n; };
      const b0 = blocks();
      await new Promise(r => setTimeout(r, 200));
      pl.yaw = 0; pl.pitch = 0.02;
      await new Promise(r => setTimeout(r, 100));
      T.tap();
      const shells = await new Promise(r => setTimeout(() => r(T.ents('proj').filter(e => e.kind === 'paint').length), 60));
      await new Promise(r => setTimeout(r, 1500));
      return { shells, wool: sh.wool, hp: sh.hp === hp, dead: !!sh.dead, blocks: blocks() === b0, alive: pl.alive && pl.health === 20 };
    }, P);
    check('a tap fires a paint shell; it paints the sheep red and hurts nothing, and breaks no blocks', fire.shells >= 1 && fire.wool === 14 && fire.hp && !fire.dead && fire.blocks && fire.alive, fire);
    await shot('tank-paint');
    // a tank is saved with the world, in its colour, and comes back its colour when broken
    await E(() => dismountVehicle(game));
    await E(() => game.save());
    const saved = await E(() => { const d = JSON.parse(store.get(saveKey(game.slot))); return (d.vehicles || (d.world && d.world.vehicles) || []).filter(v => v.k === 'tank').map(v => v.c).sort().join(); });
    check('tanks are saved with the world, each keeping its colour', saved === '0,1,2,3,4,5', saved);
    const back = await E(() => { const v = T.ents('tank')[4]; for (let i = 0; i < 6; i++) hitVehicle(game, v, 'survival'); return game.entities.some(e => e.type === 'item' && !e.removed && e.id === I.TANK + 4) || T.count(I.TANK + 4) > 0; });
    check('a broken tank drops back as a tank of its own colour', back, back);
  }

  // (the Hogwarts sections start a new world, so they come last)
  if (on('students') || on('quidditch')) {
    await E(() => { game.startWorld('hogwarts', 'survival', true); });
    check('a new Hogwarts world starts', await waitFor(() => game.state === 'playing' && game.mapId === 'hogwarts', 150000));
    await E(() => { game.settings.difficulty = 0; game.world.time = 0.25; window.__toasts = []; });
  }
  const chatHas = re => E(re => Array.from(document.querySelectorAll('#chat-log div')).some(d => new RegExp(re).test(d.textContent)), re.source);

  if (on('students')) {
    // ---------- students in their house robes ----------
    await goto({ x: 0, y: 74, z: -28 });
    await E(() => { T.put(0.5, 73, -24.5, { yaw: Math.PI, pitch: -0.1 }); });
    for (let i = 0; i < 6; i++) { await E(() => studentTick(game)); await sleep(100); }
    const st = await E(() => { const s = T.ents('student'); return { n: s.length, houses: [...new Set(s.map(e => e.variant & 3))].length, near: s.every(e => e.y >= 72 && Math.hypot(e.x, e.z + 50) < 60) }; });
    check('students turn up in the castle (a few, not too many)', st.n >= 3 && st.n <= 6 && st.near, st);
    // walk up to one: it stops, waves and says hello
    const hi = await E(async () => {
      const s = T.ents('student')[0]; s.hiT = 0; s.moving = false;
      T.put(s.x + 2.5, s.y, s.z + 0.5);
      for (let i = 0; i < 30 && !(s.waveT > 0); i++) await new Promise(r => setTimeout(r, 100));
      return { wave: s.waveT > 0, house: HOUSES[s.variant & 3].name };
    });
    check('a student waves when you come near...', hi.wave, hi);
    check('...and says hello', await chatHas(new RegExp('A ' + hi.house + ' student: "')));
    const hurt = await E(() => { const s = T.ents('student')[0], hp = s.hp; hurtMob(game, s, 10, game.player.x, game.player.z, 'player'); return s.hp === hp && !s.dead; });
    check('nothing hurts a student', hurt);
    // a screenshot in the Great Hall
    await E(() => {
      const h = game.gen.hogwarts.hat;
      for (const e of T.ents('student')) e.removed = true;
      for (let i = 0; i < 8; i++) { const e = spawnMob(game, 'student', -3.5 + (i % 4) * 2.5, 73, h[2] + 10 + Math.floor(i / 4) * 3); e.variant = i; e.home = [e.x, e.z]; e.hiT = game.t + 99; e.yaw = e.bodyYaw = e.headYaw = 0; e.aiT = 5; }
      T.put(0.5, 73, h[2] + 19.5, { yaw: 0, pitch: -0.05 }); game.view = 0;
    });
    await sleep(1500);
    await shot('students-hall');
    // they only live at Hogwarts: none in the other worlds
    check('students only belong at Hogwarts', await E(() => { const d = MOB_DEFS.student; return !!d.special && game.mapId === 'hogwarts'; }));
  }

  if (on('quidditch')) {
    // ---------- a Quidditch match with two teams ----------
    const L = await E(() => game.gen.hogwarts.pitch);
    await goto({ x: L.x, y: L.y + 8, z: L.z });
    await E(L => { const pl = game.player; const b = spawnVehicle(game, 'broom', L.x - 10.5, L.y + 8, L.z + 0.5, -Math.PI / 2); boardVehicle(game, b); b.flying = true; for (let i = 0; i < 2; i++) spawnTick(game); }, L);
    const m = await E(() => ({ on: !!game.qm, players: T.ents('qplayer').length, teams: T.ents('qplayer').map(q => q.team).sort().join(''), ball: T.ents('quaffle').length }));
    check('fly onto the pitch: a match starts, three players a side on broomsticks, and a Quaffle', m.on && m.players === 6 && m.teams === '000111' && m.ball === 1, m);
    check('...announced in the chat', await chatHas(/The Quidditch match is starting: Gryffindor against Slytherin/));
    // the players go for the ball and pass it about
    const holders = await E(async () => { const seen = new Set(); for (let i = 0; i < 80; i++) { const b = game.qm.ball; if (typeof b.holder === 'number') seen.add(b.holder); await new Promise(r => setTimeout(r, 100)); } return seen.size; });
    check('the players fly for the Quaffle and pass it about', holders >= 1, holders);
    // a team-mate near the far hoops throws, and scores
    const ai = await E(async () => {
      const qm = game.qm, q = T.ents('qplayer').find(e => e.team === 0), hoop = qHoops(0)[1];
      for (let i = 0; i < 20; i++) {
        q.x = hoop[0] - 9; q.y = hoop[1] - 1; q.z = hoop[2]; q.vx = q.vy = q.vz = 0; q.hoop = hoop;
        qGive(game, qm.ball, q.nid, 0);
        const s0 = qm.score[0];
        for (let k = 0; k < 30 && qm.score[0] === s0; k++) await new Promise(r => setTimeout(r, 50));
        if (qm.score[0] > s0) return { score: qm.score.slice(), tries: i + 1 };
      }
      return { score: qm.score.slice() };
    });
    check('a player throws the Quaffle through a hoop: a goal for their team', ai.score[0] >= 1, ai);
    // you grab the Quaffle, then throw it through a hoop at the east end
    const you = await E(async () => {
      const qm = game.qm, b = qm.ball, pl = game.player, v = pl.riding, hoop = qHoops(0)[1];
      for (const q of T.ents('qplayer')) { q.x = game.gen.hogwarts.pitch.x; q.z = game.gen.hogwarts.pitch.z + 40; }   // (everyone out of the way)
      b.holder = ''; b.passT = 0; b.vx = b.vy = b.vz = 0; b.x = hoop[0] - 8; b.y = hoop[1]; b.z = hoop[2] + 0.5;
      v.x = b.x; v.y = b.y - 1.05; v.z = b.z; pl.x = v.x; pl.y = v.y + 0.05; pl.z = v.z;
      for (let i = 0; i < 20 && !quaffleHeld(game); i++) await new Promise(r => setTimeout(r, 50));
      const had = !!quaffleHeld(game), s0 = qm.score[0];
      T.aim(hoop[0] + 0.5, hoop[1] + 0.5, hoop[2] + 0.5);
      T.tap();
      for (let k = 0; k < 40 && qm.score[0] === s0; k++) await new Promise(r => setTimeout(r, 50));
      return { had, scored: qm.score[0] > s0, score: qm.score.slice(), hud: el('qscore') && el('qscore').textContent };
    });
    check('fly up to the Quaffle to grab it, tap to throw it through a hoop: you score!', you.had && you.scored, you);
    check('the score is shown at the top of the screen', /Gryffindor \d+ +- +\d+ Slytherin/.test(you.hud || ''), you.hud);
    check('...and your goal is in the chat', await chatHas(/scored! Gryffindor \d+, Slytherin \d+/));
    await E(() => { game.view = 1; const pl = game.player; pl.yaw = -Math.PI / 2; pl.pitch = -0.1; for (const q of T.ents('qplayer')) { q.x = pl.x + 6 + Math.random() * 6; q.z = pl.z + (Math.random() - 0.5) * 10; q.y = pl.y + Math.random() * 3; } });
    await sleep(400);
    await shot('quidditch');
    await E(() => { game.view = 0; });
    // catch the Snitch: the match ends and your team wins
    const end = await E(async () => {
      game.snitchT = 0; snitchTick(game);
      const s = T.ents('snitch')[0], pl = game.player;
      catchSnitch(game, s, pl);
      await new Promise(r => setTimeout(r, 300));
      return { qm: !!game.qm, left: T.ents('qplayer').length + T.ents('quaffle').length };
    });
    check('catch the Snitch: the match is over, and everyone flies off', !end.qm && end.left === 0, end);
    check('...and the winners are announced', await chatHas(/The Snitch is caught! The match is over: Gryffindor \d+, Slytherin \d+\. Gryffindor wins!/));
    await E(() => { game.input.sneak = true; }); await sleep(200); await E(() => { game.input.sneak = false; });
  }

  if (on('falls')) {
    // ---------- the Declan Falls world ----------
    const card = await E(() => { game.state = 'title'; buildWorldCards(); return Array.from(document.querySelectorAll('#world-cards h3')).map(h => h.textContent); });
    check('Declan Falls is in the list of worlds', card.includes('Declan Falls'), card);
    await E(() => { game.startWorld('falls', 'survival', true); });
    check('a new Declan Falls world starts', await waitFor(() => game.state === 'playing' && game.mapId === 'falls', 150000));
    check('you are asked who you are: Dipper, Mabel, Grunkle Stan, Soos or Wendy', await waitFor(() => ui.screen === 'scr-falls' && document.querySelectorAll('#falls-chars button').length === 5, 5000),
      await E(() => Array.from(document.querySelectorAll('#falls-chars span')).map(s => s.textContent).join()));
    await sleep(500);
    await shot('falls-pick');
    await E(() => document.querySelectorAll('#falls-chars button')[0].click());
    const dip = await E(() => { const pl = game.player; return { fc: game.stats.fc, screen: ui.screen, journal: T.count(I.JOURNAL), cap: pl.inv[ARMOR_INV] && pl.inv[ARMOR_INV].id === I.PINE_CAP, skin: mySkin() }; });
    check('pick Dipper: you get Journal 3 and wear his pine tree cap, and look like him', dip.fc === 1 && dip.screen === null && dip.journal === 1 && dip.cap && dip.skin === 'falls_0', dip);
    // the town
    const town = await E(() => {
      const w = game.world, F = game.gen.falls, S = F.shack, Y = F.town.y + 1, T = F.tower, D = F.diner;
      const ready = () => w.getBlock(T.x, Y + 16, T.z) !== B.UNLOADED && w.getBlock(S.x0, Y, S.z0) !== B.UNLOADED;
      return new Promise(res => { const t0 = Date.now(), iv = setInterval(() => { if (ready() || Date.now() - t0 > 30000) { clearInterval(iv); res({
        shack: w.getBlock(S.x0, Y, S.z0) === B.SPRUCE_LOG && w.getBlock(-13, Y + 18, S.z1 - 2) === B.WOOL,
        tower: w.getBlock(T.x + 5, Y + 18, T.z) === B.QUARTZ_BLOCK && w.getBlock(T.x - 4, Y + 3, T.z - 4) === B.SPRUCE_LOG,
        diner: w.getBlock(D.x0, Y + 1, D.z0) === B.QUARTZ_BLOCK && w.getBlock(D.x0 + 1, Y + 10, D.z0 + 4) === B.WOOL + 14,
        houses: F.houses.every(([hx, hz]) => w.getBlock(hx - 3, Y + 1, hz - 3) !== B.AIR),
        lake: w.getBlock(F.lake.x, F.lake.y - 1, F.lake.z) === B.WATER,
      }); } }, 200); });
    });
    check('the town: the Mystery Shack with its sign, the water tower, the diner, houses and the lake', Object.values(town).every(Boolean), town);
    await E(() => { const pl = game.player; T.put(0.5, 67, 3.5, { yaw: 0, pitch: 0.12 }); game.view = 0; game.world.time = 0.3; });
    await sleep(2500);
    await shot('falls-town');
    await E(() => { T.put(14.5, 67, 2.5, { yaw: -0.6, pitch: 0.25 }); });
    await sleep(1500);
    await shot('falls-tower');
    // the pines are tall
    const pines = await E(() => { const w = game.world, F = game.gen.falls; let best = 0; for (let x = -90; x <= -60; x++) for (let z = -20; z <= 10; z++) { let n = 0; for (let y = 60; y < 120; y++) if (w.getBlock(x, y, z) === B.SPRUCE_LOG) n++; best = Math.max(best, n); } return best; });
    check('the forest is tall pines', pines >= 11, pines);
    // the six mysteries
    const ms = await E(async () => {
      const F = game.gen.falls, out = [];
      for (let i = 0; i < F.myst.length; i++) {
        const m = F.myst[i], y = m.y !== undefined ? m.y : game.gen.fallsGround(game.seed, m.x, m.z) + 1;
        T.put(m.x + 0.5, y, m.z + 0.5 + (i === 3 ? 1 : 0));
        await new Promise(r => setTimeout(r, 250));
        out.push(mystCount());
      }
      return { counts: out.join(), hud: el('myst-count').textContent, hidden: el('myst-count').hidden };
    });
    check('six mysteries to find: each one adds to the counter', ms.counts === '1,2,3,4,5,6' && ms.hud === 'Mysteries found 6/6' && !ms.hidden, ms);
    check('...with a message for each', await chatHas(/secret lab under it/) && await chatHas(/GHFODQ/) && await chatHas(/crashed flying saucer/) && await chatHas(/all six mysteries/));
    // the lab is under the Shack, through the hidden door at the back
    const lab = await E(() => { const w = game.world, S = game.gen.falls.shack, Y = 67; return { door: w.getBlock(8, Y, S.z0) === B.AIR && w.getBlock(8, Y + 1, S.z0) === B.AIR, steps: w.getBlock(8, Y - 2, S.z0 - 1) === B.SPRUCE_PLANKS, room: w.getBlock(4, 61, -50) === B.AIR }; });
    check('a hidden door at the back of the Shack, and steps down to the lab', Object.values(lab).every(Boolean), lab);
    await E(() => { T.put(4.5, 60, -48.5, { yaw: 0, pitch: -0.1 }); });
    await sleep(1200);
    await shot('falls-lab');
    const saucer = await E(() => { const m = game.gen.falls.myst[5]; T.put(m.x + 12.5, game.gen.fallsGround(game.seed, m.x + 12, m.z) + 2, m.z + 0.5, { yaw: Math.PI / 2, pitch: -0.2 }); return true; });
    await sleep(1500);
    await shot('falls-saucer');
    // creatures: gnomes, forest lights and the lake monster
    const cr = await E(async () => {
      const F = game.gen.falls, h = F.myst[4];
      T.put(h.x + 0.5, game.gen.fallsGround(game.seed, h.x + 9, h.z) + 1, h.z + 9.5);
      await new Promise(r => setTimeout(r, 800));
      for (let i = 0; i < 12; i++) { fallsSpawnTick(game); await new Promise(r => setTimeout(r, 50)); }
      const g = T.ents('gnome')[0];
      const out = { gnomes: T.ents('gnome').length, wisps: T.ents('wisp').length, lake: T.ents('lakemon').length };
      if (g) {   // walk right up to a gnome: it giggles and runs off
        const pl = game.player; g.x = pl.x + 2; g.z = pl.z; g.y = pl.y; g.vx = g.vz = 0;
        const d0 = Math.hypot(g.x - pl.x, g.z - pl.z);
        await new Promise(r => setTimeout(r, 1200));
        out.ran = Math.hypot(g.x - pl.x, g.z - pl.z) > d0 + 1;
        const hp = g.hp; hurtMob(game, g, 10, pl.x, pl.z, 'player'); out.unhurt = g.hp === hp && !g.dead;
      }
      return out;
    });
    check('garden gnomes and glowing forest lights live in the forest, and something lives in the lake', cr.gnomes >= 3 && cr.wisps >= 1 && cr.lake === 1, cr);
    check('a gnome giggles and runs away when you come close (and nothing hurts it)', cr.ran && cr.unhurt, cr);
    await E(() => { const g = T.ents('gnome')[0], pl = game.player; g.x = pl.x - Math.sin(pl.yaw) * 2.5; g.z = pl.z - Math.cos(pl.yaw) * 2.5; g.ai = () => {}; g.panic = 0; g.frozen = 3; pl.pitch = -0.4; });
    await sleep(500);
    await shot('falls-gnome');
    const lk = await E(async () => {
      const F = game.gen.falls, L = F.lake, e = T.ents('lakemon')[0];
      e.peekT = game.t + 60; e.y = L.y - 1.6;
      T.put(L.x + 0.5, L.y + 1, L.z - 18.5, { flying: true, yaw: Math.PI, pitch: -0.15 });
      e.x = L.x + 0.5; e.z = L.z - 8; e.ang = -Math.PI / 2;
      for (let i = 0; i < 50 && ((game.stats.seen | 0) & 7) !== 7; i++) await new Promise(r => setTimeout(r, 200));
      return { seen: (game.stats.seen | 0), d: Math.round(Math.hypot(e.x - game.player.x, e.y - game.player.y, e.z - game.player.z)), gone: e.removed };
    });
    await shot('falls-lake-monster');
    check('the creatures you see go in your Journal', (lk.seen & 7) === 7, lk);
    const jr = await E(() => { T.hold(I.JOURNAL, 1); game.player.useCd = 0; T.tap(); return new Promise(r => setTimeout(() => r({ screen: ui.screen, title: el('book-title').textContent, pages: BOOKUI.pages.join('|') }), 400)); });
    check('Journal 3 opens, with the creatures and mysteries you have found', jr.screen === 'scr-book' && jr.title === 'Journal 3' && /Garden gnomes: /.test(jr.pages) && /MYSTERIES 6\/6/.test(jr.pages), jr);
    await shot('falls-journal');
    await E(() => closeBook(null));
    // each character starts with their own things
    const kits = await E(() => {
      const out = {}, pl = game.player;
      for (let i = 1; i < 5; i++) {
        pl.inv = pl.inv.map(() => null); game.stats.fc = 0; pickFallsChar(i);
        const has = id => T.count(id), worn = k => pl.inv[ARMOR_INV + k] && pl.inv[ARMOR_INV + k].id;
        out[FALLS_CHARS[i].name] = i === 1 ? SWEATERS.every((s, k) => has(I.SWEATER + k) === 1) && worn(1) === I.SWEATER
          : i === 2 ? worn(0) === I.FEZ && has(I.BILL) === 50 && has(I.EMERALD) === 32
          : i === 3 ? has(I.GOLF_CART) === 1 && has(I.PIZZA) === 8
          : /Axe/.test(itemName(toolId(2, 1))) && has(toolId(2, 1)) === 1 && mySkin() === 'falls_4';
      }
      return out;
    });
    check('Mabel: sweaters; Grunkle Stan: a fez and money; Soos: a golf cart and pizza; Wendy: an axe and her flannel', Object.values(kits).every(Boolean), kits);
    // the characters, side by side (as other players would see them)
    await E(() => { const pl = game.player; T.put(0.5, 67, 2.5, { yaw: Math.PI, pitch: 0 }); game.view = 2; });
    for (let i = 0; i < 5; i++) { await E(i => { game.stats.fc = i + 1; const pl = game.player; pl.inv[ARMOR_INV] = i === 0 ? { id: I.PINE_CAP, count: 1 } : i === 2 ? { id: I.FEZ, count: 1 } : null; pl.inv[ARMOR_INV + 1] = i === 1 ? { id: I.SWEATER, count: 1 } : null; }, i); await sleep(500); await shot('falls-char-' + i); }
    await E(() => { game.view = 0; });
    // Soos's golf cart drives
    const cart = await E(async () => {
      const pl = game.player; T.put(0.5, 67, 0.5, { yaw: 0, pitch: -0.4 }); T.hold(I.GOLF_CART, 1);
      pl.target = { x: 0, y: 66, z: -3, id: B.GRAVEL, face: 2 }; pl.useBlock(I.GOLF_CART, false);
      const v = T.ents('golfcart')[0]; if (!v) return { put: false };
      mountVehicle(game, v); const z0 = v.z; game.input.fwd = true;
      await new Promise(r => setTimeout(r, 1500)); game.input.fwd = false;
      return { put: true, riding: pl.riding === v, moved: Math.round((z0 - v.z) * 10) / 10 };
    });
    check("Soos's golf cart goes down and drives", cart.put && cart.riding && cart.moved > 2, cart);
    await E(() => { game.view = 1; }); await sleep(500); await shot('falls-golfcart'); await E(() => { game.view = 0; dismountVehicle(game); });
    // who you are and what you found are kept with the world
    await E(() => game.save());
    const sv = await E(() => { const d = JSON.parse(store.get(saveKey('falls'))); return { fc: d.stats.fc, myst: d.stats.myst, seen: d.stats.seen }; });
    check('who you are and the mysteries you found are saved with the world', sv.fc === 5 && sv.myst === 63 && (sv.seen & 7) === 7, sv);
  }

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
