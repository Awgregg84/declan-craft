// Declan's fourth wish list, playing alone. Sections can be picked: node test/wishlist4.mjs doors airlock garage planes
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
  const shot = async name => { await p.screenshot({ path: path.join(out, 'w4-' + name + '.png') }); };
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

  if (process.env.DBG) {   // (a quick look at something: DBG='code run in the page' node test/wishlist4.mjs dbg)
    const D = area(0, 0);
    await goto(D);
    console.log(JSON.stringify(await E(new Function('D', 'return (async () => {' + process.env.DBG + '})()'), D)));
  }

  if (on('doors')) {
    // ---------- birch, spruce, glass and iron doors ----------
    const D = area(0, 0);
    await goto(D);
    await E(D => { T.stage(D.x, D.y, D.z, 8, 6); T.clearMobs(); game.setMode('survival'); T.put(D.x + 0.5, D.y, D.z + 3.5, { yaw: 0, pitch: -0.2 }); }, D);
    await sleep(300);
    const items = await E(() => [I.BIRCH_DOOR, I.SPRUCE_DOOR, I.GLASS_DOOR, I.IRON_DOOR, I.AIRLOCK, B.GARAGE_DOOR].map(id => ({ name: itemName(id), icon: !!ICONS[id], creative: CREATIVE_LIST.includes(id) })));
    check('the new doors are in Creative, with names and pictures', items.every(o => o.icon && o.creative) && items.map(o => o.name).join() === 'Birch Door,Spruce Door,Glass Door,Iron Door,Airlock Door,Garage Door', items);
    const rec = await E(() => {
      const make = (n, g) => { const o = matchRecipe(g, n); return o ? itemName(o.out) + ' x' + o.count : null; };
      const P = B.BIRCH_PLANKS, S = B.SPRUCE_PLANKS, O = B.OAK_PLANKS, Gl = B.GLASS, Ir = I.IRON_INGOT;
      return [make(3, [P, P, 0, P, P, 0, P, P, 0]), make(3, [S, S, 0, S, S, 0, S, S, 0]), make(3, [O, O, 0, O, O, 0, O, O, 0]), make(3, [Gl, Gl, 0, Gl, Gl, 0, Gl, Gl, 0]),
        make(3, [Ir, Ir, 0, Ir, Ir, 0, Ir, Ir, 0]), make(3, [Ir, Ir, 0, Gl, Ir, 0, Ir, Ir, 0]), make(3, [O, O, O, O, Ir, O, O, O, O])];
    });
    check('each door is crafted from its own material', rec.join() === 'Birch Door x3,Spruce Door x3,Oak Door x3,Glass Door x3,Iron Door x3,Airlock Door x2,Garage Door x4', rec);
    // put each one down and tap it
    const res = await E(async D => {
      const w = game.world, pl = game.player, out = {};
      for (const [k, id] of [['birch', I.BIRCH_DOOR], ['spruce', I.SPRUCE_DOOR], ['glass', I.GLASS_DOOR], ['iron', I.IRON_DOOR]]) {
        const x = D.x + [-3, -1, 1, 3][Object.keys(out).length];
        T.put(x + 0.5, D.y, D.z + 3.5, { yaw: 0, pitch: -0.3 });
        T.hold(id, 1);
        pl.target = { x, y: D.y - 1, z: D.z, id: B.STONE, face: 2 };
        const placed = pl.useBlock(id, false);
        const b = w.getBlock(x, D.y, D.z), top = w.getBlock(x, D.y + 1, D.z), used = T.count(id) === 0;
        pl.target = { x, y: D.y, z: D.z, id: b, face: 5 };
        pl.useBlock(0, false);
        out[k] = { placed, b: BLOCKS[b].name, top: top === b && (w.getData(x, D.y + 1, D.z) & 8) === 8, used, open: !!(w.getData(x, D.y, D.z) & 4) };
      }
      return out;
    }, D);
    check('birch, spruce and glass doors go down two blocks tall and open with a tap', ['birch', 'spruce', 'glass'].every(k => res[k].placed && res[k].top && res[k].used && res[k].open), res);
    check("an iron door doesn't open with a tap", res.iron.placed && res.iron.b === 'Iron Door' && !res.iron.open && (await E(() => window.__toasts.some(m => /lever or a button/.test(m)))), res.iron);
    // a lever next to the iron door opens it, and switching it off shuts it
    const lev = await E(async D => {
      const w = game.world, x = D.x + 3;
      w.setBlock(x - 1, D.y, D.z, B.LEVER, 3, true);   // a lever on the ground beside the door
      useSwitch(game, x - 1, D.y, D.z, B.LEVER);
      await new Promise(r => setTimeout(r, 400));
      const on = !!(w.getData(x, D.y, D.z) & 4);
      useSwitch(game, x - 1, D.y, D.z, B.LEVER);
      await new Promise(r => setTimeout(r, 400));
      return { on, off: !(w.getData(x, D.y, D.z) & 4) };
    }, D);
    check('a lever opens and shuts an iron door', lev.on && lev.off, lev);
    // breaking a door gives the door back; the other half goes too
    const brk = await E(D => {
      const w = game.world, x = D.x - 3;
      w.setBlock(x, D.y + 1, D.z, B.AIR, 0, true);
      return { bottom: w.getBlock(x, D.y, D.z), drop: BLOCKS[B.BIRCH_DOOR].drop === I.BIRCH_DOOR };
    }, D);
    check('breaking one half of a door takes the whole door, and it drops the door', brk.bottom === 0 && brk.drop, brk);
    await E(D => { const pl = game.player; T.put(D.x + 0.5, D.y, D.z + 4.5, { yaw: 0, pitch: -0.15 }); game.world.setBlock(D.x - 1, D.y, D.z, B.AIR, 0, true); }, D);
    await sleep(800);
    await shot('doors');
  }

  if (on('airlock')) {
    // ---------- an underwater base with an airlock ----------
    // a stone box under the sea: a 5x3x5 room, and a little airlock room (1x2x1 inside... 2 long) at its front, with an
    // airlock door at each end; all of it full of water
    const A = area(40, 0);
    await goto(A);
    const made = await E(A => {
      const w = game.world, x0 = A.x - 4, z0 = A.z - 4;
      for (let x = x0 - 2; x <= x0 + 10; x++) for (let z = z0 - 6; z <= z0 + 10; z++) { w.setBlock(x, A.y - 1, z, B.STONE, 0); for (let y = A.y; y < A.y + 7; y++) w.setBlock(x, y, z, B.WATER, 0); }
      // the room: inside x0..x0+4, y A.y..A.y+2, z0..z0+4; walls around it
      for (let x = x0 - 1; x <= x0 + 5; x++) for (let z = z0 - 1; z <= z0 + 5; z++) for (let y = A.y; y <= A.y + 3; y++) {
        const edge = x === x0 - 1 || x === x0 + 5 || z === z0 - 1 || z === z0 + 5 || y === A.y + 3;
        if (edge) w.setBlock(x, y, z, B.GLASS, 0);
      }
      // the airlock room in front (toward -z): inside x0+2, z0-3..z0-2, two tall; doors at z0-1 (inner) and z0-4 (outer)
      const ax = x0 + 2;
      for (let z = z0 - 4; z <= z0 - 1; z++) for (let y = A.y; y <= A.y + 2; y++) for (const x of [ax - 1, ax + 1]) w.setBlock(x, y, z, B.STONE, 0);
      for (let z = z0 - 4; z <= z0 - 1; z++) w.setBlock(ax, A.y + 2, z, B.STONE, 0);
      for (let y = A.y; y <= A.y + 1; y++) w.setBlock(ax, y, z0 - 1, B.WATER, 0);   // (a doorway into the room)
      return { x0, z0, ax };
    }, A);
    // put the two doors in (in the water)
    const doors = await E(([A, M]) => {
      const pl = game.player, w = game.world, out = [];
      for (const z of [M.z0 - 1, M.z0 - 4]) {
        T.put(M.ax + 0.5, A.y, z - 1.5, { yaw: Math.PI, pitch: -0.3 });   // (in the water, looking +z... facing the door's way)
        T.hold(I.AIRLOCK, 1);
        pl.target = { x: M.ax, y: A.y - 1, z, id: B.STONE, face: 2 };
        out.push(pl.useBlock(I.AIRLOCK, false) && w.getBlock(M.ax, A.y, z) === B.AIRLOCK && w.getBlock(M.ax, A.y + 1, z) === B.AIRLOCK);
      }
      return out;
    }, [A, made]);
    check('airlock doors go in underwater', doors.every(Boolean), doors);
    const room = await E(M => { const w = game.world; let n = 0; for (let x = M.x0; x < M.x0 + 5; x++) for (let z = M.z0; z < M.z0 + 5; z++) for (let y = 0; y < 3; y++) if (w.getBlock(x, game.player.y | 0 + 0, z) === B.WATER) n++; return n; }, made);
    // shutting the doors (they were put down shut) pumped the water out of the closed rooms behind them
    await sleep(1500);
    const dry = await E(([A, M]) => {
      const w = game.world; let wet = 0, cells = 0;
      for (let x = M.x0; x < M.x0 + 5; x++) for (let z = M.z0; z < M.z0 + 5; z++) for (let y = A.y; y < A.y + 3; y++) { cells++; if (w.getBlock(x, y, z) === B.WATER) wet++; }
      const lock = [w.getBlock(M.ax, A.y, M.z0 - 2), w.getBlock(M.ax, A.y, M.z0 - 3), w.getBlock(M.ax, A.y + 1, M.z0 - 2)];
      const sea = w.getBlock(M.ax, A.y, M.z0 - 6);
      return { wet, cells, lock, sea };
    }, [A, made]);
    check('the airlock pumps the water out of the base and the airlock room', dry.wet === 0 && dry.lock.every(b => b === 0), dry);
    check('the sea outside stays wet', dry.sea === 7, dry);
    check('the pump says so', await E(() => window.__toasts.some(m => /pumped the water out/.test(m))));
    // swim up to the outer door and open it: no water comes in
    await E(([A, M]) => { const pl = game.player; T.put(M.ax + 0.5, A.y, M.z0 - 5.5, { yaw: Math.PI, pitch: 0 }); pl.target = { x: M.ax, y: A.y, z: M.z0 - 4, id: B.AIRLOCK, face: 4 }; pl.useBlock(0, false); }, [A, made]);
    await sleep(1200);
    const op = await E(([A, M]) => { const w = game.world; return { open: !!(w.getData(M.ax, A.y, M.z0 - 4) & 4), lock: w.getBlock(M.ax, A.y, M.z0 - 3) }; }, [A, made]);
    check('opening the outer door lets no water in', op.open && op.lock === 0, op);
    // walk into the airlock room: the outer door shuts behind you, it hisses, and the inner door opens
    await E(([A, M]) => T.put(M.ax + 0.5, A.y, M.z0 - 2.5, { yaw: Math.PI }), [A, made]);
    const cyc = await waitFor(([A, M]) => { const w = game.world; return !(w.getData(M.ax, A.y, M.z0 - 4) & 4) && !!(w.getData(M.ax, A.y, M.z0 - 1) & 4); }, 9000, [A, made]);
    check('inside the airlock room, the outer door shuts and then the inner door opens', cyc, await E(([A, M]) => { const w = game.world; return [w.getData(M.ax, A.y, M.z0 - 4), w.getData(M.ax, A.y, M.z0 - 1)]; }, [A, made]));
    await E(([A, M]) => T.put(M.x0 + 2.5, A.y, M.z0 + 2.5, { yaw: 0, pitch: -0.1 }), [A, made]);
    const shut = await waitFor(([A, M]) => !(game.world.getData(M.ax, A.y, M.z0 - 1) & 4), 9000, [A, made]);
    check('the inner door shuts again once you are through, and the outer one stays shut', shut && !(await E(([A, M]) => game.world.getData(M.ax, A.y, M.z0 - 4) & 4, [A, made])));
    const dry2 = await E(([A, M]) => { const w = game.world; let wet = 0; for (let x = M.x0; x < M.x0 + 5; x++) for (let z = M.z0; z < M.z0 + 5; z++) for (let y = A.y; y < A.y + 3; y++) if (w.getBlock(x, y, z) === B.WATER) wet++; return wet; }, [A, made]);
    check('the base is still dry', dry2 === 0, dry2);
    await E(([A, M]) => T.put(M.x0 + 2.5, A.y, M.z0 + 3.5, { yaw: 0, pitch: -0.05 }), [A, made]);
    await sleep(800);
    await shot('airlock');
    // a regular door can't go in the water
    const reg = await E(([A, M]) => { const pl = game.player; T.put(M.ax + 0.5, A.y, M.z0 - 7.5); T.hold(I.DOOR, 1); pl.target = { x: M.ax, y: A.y - 1, z: M.z0 - 9, id: B.STONE, face: 2 }; return pl.useBlock(I.DOOR, false); }, [A, made]);
    check("an ordinary door won't go in the water", reg === false);
  }

  if (on('garage')) {
    // ---------- a garage door: four wide and three tall ----------
    const G = area(-40, 0);
    await goto(G);
    await E(G => { T.stage(G.x, G.y, G.z, 8, 8); T.clearMobs(); game.setMode('creative'); }, G);
    const placed = await E(G => {
      const pl = game.player, w = game.world;
      T.put(G.x + 1.5, G.y, G.z + 4.5, { yaw: 0, pitch: -0.2 });
      T.hold(B.GARAGE_DOOR, 64);
      let n = 0;
      for (let x = G.x - 1; x <= G.x + 2; x++) {   // the bottom row, on the ground
        pl.target = { x, y: G.y - 1, z: G.z, id: B.STONE, face: 2 };
        if (pl.useBlock(B.GARAGE_DOOR, true)) n++;
        for (let y = G.y; y < G.y + 2; y++) { pl.target = { x, y, z: G.z, id: w.getBlock(x, y, G.z), face: 2 }; if (pl.useBlock(B.GARAGE_DOOR, true)) n++; }
      }
      for (const y of [G.y, G.y + 1, G.y + 2]) { w.setBlock(G.x - 2, y, G.z, B.STONE, 0); w.setBlock(G.x + 3, y, G.z, B.STONE, 0); }
      for (let x = G.x - 2; x <= G.x + 3; x++) w.setBlock(x, G.y + 3, G.z, B.STONE, 0);
      return { n, data: w.getData(G.x, G.y + 1, G.z) & 3 };
    }, G);
    check('garage door panels go up side by side and on top of each other', placed.n === 12, placed);
    await sleep(600);
    await shot('garage-shut');
    const solid = await E(G => { const e = { x: G.x + 0.5, y: G.y, z: G.z + 1.5, w: 0.3, h: 1.8, vx: 0, vy: 0, vz: 0 }; moveEntity(game.world, e, 0, 0, -3); return e.z; }, G);
    check('a shut garage door is a wall', solid > G.z + 0.6, solid);
    const opened = await E(G => {
      const pl = game.player, w = game.world;
      pl.target = { x: G.x, y: G.y, z: G.z, id: B.GARAGE_DOOR, face: 5 };
      pl.useBlock(0, true);
      let open = 0; for (let x = G.x - 1; x <= G.x + 2; x++) for (let y = G.y; y < G.y + 3; y++) if (w.getBlock(x, y, G.z) === B.GARAGE_OPEN) open++;
      const e = { x: G.x + 0.5, y: G.y, z: G.z + 1.5, w: 0.8, h: 1.0, vx: 0, vy: 0, vz: 0 }; moveEntity(w, e, 0, 0, -3);
      return { open, through: e.z < G.z - 1 };
    }, G);
    check('one tap rolls the whole garage door up, and a car fits through', opened.open === 12 && opened.through, opened);
    await sleep(800);
    await shot('garage-open');
    const shutAgain = await E(G => { const pl = game.player, w = game.world; pl.target = { x: G.x + 2, y: G.y + 2, z: G.z, id: B.GARAGE_OPEN, face: 5 }; const before = w.getBlock(G.x + 2, G.y + 2, G.z), r = pl.useBlock(0, true); let n = 0; for (let x = G.x - 1; x <= G.x + 2; x++) for (let y = G.y; y < G.y + 3; y++) if (w.getBlock(x, y, G.z) === B.GARAGE_DOOR) n++; return n === 12 ? n : { n, before, r }; }, G);
    check('another tap (even on the rolled-up top) brings it down', shutAgain === 12, shutAgain);
    const water = await E(() => game.world.flowable(B.GARAGE_OPEN) || game.world.flowable(B.AIRLOCK));
    check("water doesn't wash doors away", !water);
  }

  if (on('planes')) {
    // ---------- planes ----------
    const P = area(0, 80);
    await goto(P);
    await E(P => {   // a long runway, running north (-z)
      const w = game.world;
      for (let dx = -5; dx <= 5; dx++) for (let dz = -70; dz <= 12; dz++) { w.setBlock(P.x + dx, P.y - 1, P.z + dz, dx === 0 && dz % 6 === 0 ? B.WOOL : B.STONE, 0); for (let k = 0; k < 12; k++) w.setBlock(P.x + dx, P.y + k, P.z + dz, B.AIR, 0); }
      T.clearMobs(); game.setMode('survival'); game.settings.difficulty = 0;   // (peaceful: no monsters on the runway)
    }, P);
    await waitFor(P => game.world.readyAround(P.x + 0.5, P.z - 30, 3) >= 1, 60000, P);
    const items = await E(() => [I.PLANE, I.JET, I.AIRLINER].map(id => ({ name: itemName(id), icon: !!ICONS[id], creative: CREATIVE_LIST.includes(id) })));
    check('there are three planes, with pictures, in Creative', items.every(o => o.icon && o.creative) && items.map(o => o.name).join() === 'Propeller Plane,Jet,Passenger Plane', items);
    const rec = await E(() => {
      const make = (n, g) => { const o = matchRecipe(g, n); return o ? itemName(o.out) : null; };
      return [make(3, [0, I.IRON_INGOT, 0, B.WOOL + 14, I.IRON_INGOT, B.WOOL, 0, I.IRON_INGOT, 0]), make(3, [I.PLANE, I.GUNPOWDER, I.GUNPOWDER, I.IRON_INGOT, I.IRON_INGOT, 0, 0, 0, 0]), make(3, [I.PLANE, I.PLANE, B.IRON_BLOCK, 0, 0, 0, 0, 0, 0])];
    });
    check('planes are made from iron and wool (a jet adds gunpowder; two planes and a block of iron make a passenger plane)', rec.join() === 'Propeller Plane,Jet,Passenger Plane', rec);
    // put them down on the runway
    const put = await E(P => {
      const pl = game.player, out = [];
      for (const [id, dx] of [[I.PLANE, 0], [I.JET, -3.5], [I.AIRLINER, 3.5]]) {
        T.put(P.x + 0.5 + dx, P.y, P.z + 8.5, { yaw: 0, pitch: -0.5 });
        T.hold(id, 1);
        pl.target = { x: Math.floor(P.x + dx), y: P.y - 1, z: P.z + 6, id: B.STONE, face: 2 };
        out.push(pl.useBlock(id, false) && T.count(id) === 0);
      }
      return { out, types: T.ents('plane').length + T.ents('jet').length + T.ents('airliner').length };
    }, P);
    check('planes go down on the ground', put.out.every(Boolean) && put.types === 3, put);
    await E(P => { T.put(P.x + 0.5, P.y, P.z + 11.5, { yaw: 0, pitch: -0.1 }); game.view = 0; }, P);
    await sleep(1200);
    await shot('planes-parked');
    // get in the propeller plane and take off down the runway
    const pilot = await E(() => { const v = T.ents('plane')[0]; v.x = Math.floor(v.x) + 0.5; mountVehicle(game, v); const pl = game.player; return { riding: pl.riding === v, seat: pl.seat, tip: window.__toasts.some(m => /look up to take off/.test(m)) }; });
    check('get in a plane: a tip says how to fly it', pilot.riding && !pilot.seat && pilot.tip, pilot);
    await E(() => { const pl = game.player; pl.yaw = 0; pl.pitch = 0; game.input.fwd = true; });
    const fast = await waitFor(() => (T.ents('plane')[0].spd || 0) > 6, 8000);
    const ground = await E(() => { const v = T.ents('plane')[0]; return { flying: !!v.flying, spd: Math.round(v.spd * 10) / 10, z: v.z }; });
    check("it speeds along the ground, but doesn't take off while you look ahead", fast && !ground.flying, ground);
    await E(() => { game.player.pitch = 0.4; });
    const up = await waitFor(() => T.ents('plane')[0].flying, 6000);
    const y0 = await E(() => T.ents('plane')[0].y);
    await E(() => { game.input.joyX = 0.5; });   // (round in a circle)
    await sleep(3000);
    const climb = await E(y0 => { const v = T.ents('plane')[0]; return { y: Math.round(v.y - y0), spd: Math.round(v.spd), bank: Math.round(v.bank * 100) / 100, slope: Math.round(v.slope * 100) / 100 }; }, y0);
    check('look up and it takes off, climbs, and banks into its turn', up && climb.y > 4 && Math.abs(climb.bank) > 0.15 && climb.slope > 0.1, climb);
    await E(() => { game.view = 1; });
    await sleep(500);
    await shot('plane-flying');
    await E(() => { game.view = 0; });
    // let go: it can't hover, so it slows down, its nose drops and it glides down to land
    const hi = await E(() => { game.input.fwd = false; game.player.pitch = 0; return T.ents('plane')[0].y; });
    await sleep(4000);
    const glide = await E(hi => { const v = T.ents('plane')[0]; return { dy: Math.round(v.y - hi), spd: Math.round(v.spd), thr: Math.round(v.thr * 100) / 100 }; }, hi);
    check("let go and it can't hover: it slows and glides down", glide.dy < -2 && glide.thr < 0.1, glide);
    const landed = await waitFor(() => { const v = T.ents('plane')[0]; return !v.flying; }, 40000);
    const ld = await E(() => { const v = T.ents('plane')[0], pl = game.player; return { landed: !v.flying, hp: pl.health, alive: pl.alive, y: Math.round(v.y) }; });
    check('it lands by itself, gently', landed && ld.alive && ld.hp === 20, Object.assign(ld, { why: await E(() => game.deathMsg || game.lastDeath || null) }));
    await E(() => { game.input.joyX = 0; game.input.back = true; });
    await waitFor(() => (T.ents('plane')[0].spd || 0) < 1, 10000);
    await E(() => { game.input.back = false; game.input.sneak = true; });
    await sleep(300);
    const out1 = await E(() => { game.input.sneak = false; return { out: !game.player.riding, spd: T.ents('plane')[0].spd }; });
    check('pull back to stop, then Sneak gets out', out1.out, out1);
    // a jet is faster than the propeller plane
    const speeds = await E(() => ({ plane: PLANES.plane.speed, jet: PLANES.jet.speed, airliner: PLANES.airliner.speed, car: 11, flycar: FLYERS.flycar.speed, broom: FLYERS.broom.speed }));
    check('planes are the fastest way to travel (the jet most of all)', speeds.jet > speeds.airliner && speeds.airliner > speeds.plane && speeds.plane > speeds.broom, speeds);
    // the passenger plane: someone else is flying it, and we sit in a seat behind
    const pass = await E(P => {
      const v = T.ents('airliner')[0], pl = game.player;
      T.put(v.x + 2.5, v.y, v.z);
      v.rider = 'friend';   // (pretend a friend got in first)
      mountVehicle(game, v);
      const seat = pl.seat, d = Math.hypot(pl.x - v.x, pl.z - v.z), inside = pl.y > v.y;
      return { seat, riding: pl.riding === v, d: Math.round(d * 10) / 10, inside, seats: PLANES.airliner.seats.length - 1, tip: window.__toasts.some(m => /passenger/.test(m)) };
    }, P);
    check('the passenger plane has five seats for friends, and you can sit in one while someone else flies', pass.seat === 1 && pass.riding && pass.d < 3 && pass.seats === 5 && pass.tip, pass);
    await E(() => { game.view = 1; game.player.pitch = -0.25; });
    await sleep(800);
    await shot('airliner-passenger');
    await E(() => { game.view = 0; });
    // up in the air, a passenger who gets out floats down on a parachute
    await E(() => { const v = T.ents('airliner')[0]; v.y += 40; v.flying = true; v.spd = 15; });
    await sleep(300);
    await E(() => { game.input.sneak = true; });
    await sleep(200);
    const jump = await E(() => { game.input.sneak = false; const pl = game.player; return { out: !pl.riding, chute: pl.chute, y: Math.round(pl.y) }; });
    check('a passenger in the air jumps out with a parachute', jump.out && jump.chute, jump);
    await sleep(1200);
    const fall = await E(() => ({ vy: Math.round(game.player.vy * 10) / 10, chute: game.player.chute }));
    check('the parachute floats down slowly', fall.chute && fall.vy >= -3.05, fall);
    await E(() => { game.view = 2; game.player.pitch = 0.1; });
    await sleep(400);
    await shot('parachute');
    await E(() => { game.view = 0; });
    const down = await waitFor(() => !game.player.chute, 30000);
    check('and lands with no harm done', down && (await E(() => game.player.health === 20 && game.player.alive)), await E(() => game.player.health));
    await E(() => { T.ents('airliner')[0].rider = null; });
    // the jet and the passenger plane fly too
    for (const type of ['jet', 'airliner']) {
      const r = await E(([P, type]) => {
        const v = T.ents(type)[0], pl = game.player;
        v.x = P.x + 0.5; v.z = P.z + 6.5; v.y = P.y; v.yaw = 0; v.flying = false; v.spd = 0; v.vy = 0;
        T.put(P.x + 2.5, P.y, P.z + 6.5);
        mountVehicle(game, v); pl.yaw = 0; pl.pitch = 0.4; game.input.fwd = true;
        return pl.riding === v && !pl.seat;
      }, [P, type]);
      const flew = await waitFor(type => T.ents(type)[0].flying && T.ents(type)[0].y > game.world.topSolid(Math.floor(T.ents(type)[0].x), Math.floor(T.ents(type)[0].z)) + 4, 15000, type);
      const info = await E(type => { const v = T.ents(type)[0]; return { spd: Math.round(v.spd), y: Math.round(v.y) }; }, type);
      check('the ' + (type === 'jet' ? 'jet' : 'passenger plane') + ' takes off after its run', r && flew, info);
      if (type === 'jet') { await E(() => { game.view = 1; }); await sleep(600); await shot('jet-flying'); await E(() => { game.view = 0; }); }
      await E(() => { game.input.fwd = false; const v = game.player.riding; if (v) { v.flying = false; v.spd = 0; v.y = game.world.topSolid(Math.floor(v.x), Math.floor(v.z)) + 1; } dismountVehicle(game); });
    }
    // planes are saved with the world (one in the air is kept on the ground below)
    await E(() => game.save());
    const saved = await E(() => { const d = JSON.parse(store.get(saveKey(game.slot))); return (d.vehicles || (d.world && d.world.vehicles) || []).map(v => v.k).sort().join(); });
    check('planes are saved with the world', /airliner/.test(saved) && /jet/.test(saved) && /plane/.test(saved), saved);
  }

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
