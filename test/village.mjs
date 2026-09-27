// Villages, villagers and trading in a fresh Sunny Valley world.
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
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + server.address().port + '/');
  await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
  const E = (fn, arg) => p.evaluate(fn, arg);
  const waitFor = (fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
  await E(() => { game.settings.animals = true; game.startWorld('valley', 'survival', true); });
  await waitFor(() => game.state === 'playing', 90000);
  // 1. a village a short walk from spawn
  const v = await E(() => { const s = game.worldSpawn, f = game.gen.findVillage('valley', game.seed, s[0], s[2], []); return f && { x: f[0], y: f[1], z: f[2], dist: Math.round(Math.hypot(f[0] - s[0], f[2] - s[2])) }; });
  check('new world starts near a village', v && v.dist < 125, v);
  if (!v) { await browser.close(); server.close(); process.exit(1); }
  // 2. go there and look around
  await E(v => { const pl = game.player; game.setMode('creative'); Object.assign(pl, { x: v.x + 0.5, y: v.y + 14, z: v.z + 20.5, vx: 0, vy: 0, vz: 0, flying: true, yaw: 0, pitch: -0.55 }); }, v);
  await waitFor(() => game.world.readyAround(game.player.x, game.player.z, 2) >= 1, 60000);
  await waitFor(() => game.entities.some(e => e.type === 'villager'), 30000);
  await sleep(1500);
  const vill = await E(v => {
    const w = game.world, c = { door: 0, bed: 0, water: 0, gravel: 0, torch: 0, glass: 0 };
    for (let x = v.x - 20; x <= v.x + 20; x++) for (let z = v.z - 20; z <= v.z + 20; z++) for (let y = v.y - 4; y <= v.y + 10; y++) {
      const b = w.getBlock(x, y, z);
      if (b === B.DOOR) c.door++; else if (b === B.BED) c.bed++; else if (b === B.WATER) c.water++; else if (b === B.GRAVEL) c.gravel++; else if (b === B.TORCH) c.torch++; else if (b === B.GLASS) c.glass++;
    }
    const vs = game.entities.filter(e => e.type === 'villager');
    return { blocks: c, villagers: vs.length, profs: vs.map(e => e.prof), homes: vs.map(e => e.village) };
  }, v);
  check('village has a well, houses with doors and beds, paths and lights', vill.blocks.door >= 4 && vill.blocks.bed >= 1 && vill.blocks.water >= 4 && vill.blocks.gravel >= 20 && vill.blocks.torch >= 4 && vill.blocks.glass >= 4, vill.blocks);
  check('villagers live there, each with a job', vill.villagers >= 2 && vill.profs.every(q => VILLAGER_PROFS_T.includes(q)), { n: vill.villagers, profs: vill.profs });
  await p.screenshot({ path: path.join(out, 'village.png') });
  // 3. villagers wander but stay near home
  await sleep(6000);
  const roam = await E(() => game.entities.filter(e => e.type === 'villager').map(e => Math.round(Math.hypot(e.x - e.home[0], e.z - e.home[1]))));
  check('villagers stay near their village', roam.every(d => d < 24), roam);
  // 4. tapping a villager opens trading; trading cobblestone for an emerald
  const tr = await E(v => {
    const pl = game.player, w = game.world;
    game.setMode('survival');
    const x = Math.floor(v.x) + 30, z = Math.floor(v.z) + 30, y = 112;
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) w.setBlock(x + dx, y, z + dz, B.STONE, 0);
    Object.assign(pl, { x: x + 0.5, y: y + 1, z: z + 2.5, vx: 0, vy: 0, vz: 0, flying: false, yaw: 0, pitch: -0.2 });
    const m = spawnMob(game, 'villager', x + 0.5, y + 1, z + 0.5, { prof: 'mason', home: [x + 0.5, z + 0.5] });
    m.tradeT = 30; window.__m = m;
    pl.inv.fill(null); pl.inv[0] = { id: B.COBBLE, count: 20 }; pl.sel = 1; ui.dirty = true;
    return { x, y, z };
  }, v);
  await sleep(800);
  await E(() => { game.input.use = true; game.input.usePressed = true; });
  await waitFor(() => ui.inv && ui.inv.kind === 'trade', 8000);
  await E(() => { game.input.use = false; });
  const opened = await E(() => ({ kind: ui.inv && ui.inv.kind, title: document.querySelector('#inv-root h3') && document.querySelector('#inv-root h3').textContent, rows: document.querySelectorAll('.trade').length, can: document.querySelectorAll('.trade:not(.cant)').length }));
  check('tapping a villager opens its trades', opened.kind === 'trade' && opened.title === 'Mason' && opened.rows === 6 && opened.can === 1, opened);
  await p.screenshot({ path: path.join(out, 'trade.png') });
  const t1 = await E(() => { document.querySelector('.trade:not(.cant)').click(); const pl = game.player; return { emerald: countItem(pl, I.EMERALD), cobble: countItem(pl, B.COBBLE) }; });
  check('16 cobblestone buys 1 emerald', t1.emerald === 1 && t1.cobble === 4, t1);
  await p.screenshot({ path: path.join(out, 'trade2.png') });
  const t2 = await E(() => { document.querySelectorAll('.trade')[0].click(); const pl = game.player; return { emerald: countItem(pl, I.EMERALD), cobble: countItem(pl, B.COBBLE), toast: el('toast').textContent }; });
  check('not enough cobblestone: nothing changes', t2.emerald === 1 && t2.cobble === 4 && /need 16 Cobblestone/.test(t2.toast), t2);
  const t3 = await E(() => { const pl = game.player; pl.inv[5] = { id: I.EMERALD, count: 1 }; buildInv(); document.querySelectorAll('.trade')[4].click(); return { glass: countItem(pl, B.GLASS), emerald: countItem(pl, I.EMERALD) }; });
  check('an emerald buys 6 glass', t3.glass === 6 && t3.emerald === 1, t3);
  await E(() => game.closeUI());
  // 5. villagers cannot be hurt
  const hurt = await E(() => { const m = window.__m, hp = m.hp; hurtMob(game, m, 10, m.x - 1, m.z, 'player'); return { before: hp, after: m.hp, dead: !!m.dead }; });
  check('villagers are never harmed', hurt.after === hurt.before && !hurt.dead, hurt);
  // 6. spawn egg
  const egg = await E(tp => {
    const pl = game.player, n0 = game.entities.filter(e => e.type === 'villager').length;
    pl.inv[1] = { id: I.EGG + EGG_MOBS.indexOf('pig'), count: 1 }; pl.sel = 1; pl.pitch = -1.2; pl.pickTarget();
    const ok = pl.useBlock(pl.heldId(), false);
    return { ok, pigs: game.entities.filter(e => e.type === 'pig' && Math.hypot(e.x - pl.x, e.z - pl.z) < 4).length, used: !pl.inv[1] };
  }, tr);
  check('a spawn egg makes a creature', egg.ok && egg.pigs >= 1 && egg.used, egg);
  // 7. emerald ore underground, /locate village
  const ore = await E(() => { let n = 0; for (const c of game.world.chunks.values()) for (let i = 0; i < c.blocks.length; i++) if (c.blocks[i] === B.EMERALD_ORE) n++; return { n, chunks: game.world.chunks.size }; });
  check('emerald ore generates', ore.n > 0, ore);
  const loc = await E(() => { game.runCommand('/locate village'); const log = el('chat-log'); return log.lastChild && log.lastChild.textContent; });
  check('/locate village gives directions', /nearest village is \d+ blocks/.test(loc || ''), loc);
  check('no script errors', errs.length === 0, errs.slice(0, 3));
  await browser.close(); server.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
const VILLAGER_PROFS_T = ['farmer', 'butcher', 'toolsmith', 'shepherd', 'mason', 'cleric'];
