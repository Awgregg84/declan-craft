import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname);
const dist = path.join(dir, '..', 'dist');
const out = path.join(dir, 'shots');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const f = path.join(dist, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'declan-craft.html');
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/html' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;
const scenario = process.argv[2] || 'basic';
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto(`http://localhost:${port}/declan-craft.html`);
  const shot = async name => { await page.screenshot({ path: path.join(out, name + '.png') }); console.log('shot', name); };
  const waitFor = async (fn, ms, label) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await sleep(250); } console.log('TIMEOUT waiting for', label); return false; };
  const E = (fn, arg) => page.evaluate(fn, arg);
  await sleep(2500);
  if (scenario === 'mobile') { await sleep(1); }
  console.log('validate:', await E(() => {
    const missing = [];
    for (const d of BLOCKS) if (d && d.tex) { const t = d.tex; for (const n of (typeof t === 'string' ? [t] : Object.values(t))) if (TILE[n] === undefined) missing.push(d.name + ':' + n); }
    for (const k in ITEMS) if (TILE[ITEMS[k].tex] === undefined) missing.push(ITEMS[k].name + ':' + ITEMS[k].tex);
    for (const id of CREATIVE_LIST) if (!ICONS[id]) missing.push('icon:' + id);
    return { tiles: TILE_NAMES.length, skins: SKIN_DATA.length, missing, workers: game.pool.workers.length, local: !!game.pool.local, state: game.state, chunks: game.world.chunks.size };
  }));
  if (scenario === 'basic' || scenario === 'all') {
    await waitFor(() => game.world.readyAround(game.menuSpawn[0], game.menuSpawn[2], 3) > 0.9, 30000, 'title world');
    await sleep(500);
    await shot('01-title');
    await page.click('#btn-play'); await sleep(400); await shot('02-worlds');
    const map = process.env.MAP || 'valley';
    await E(a => game.startWorld(a[0], a[1], true), [map, process.env.MODE || 'survival']);
    const ok = await waitFor(() => game.state === 'playing', 90000, 'playing');
    console.log('state', await E(() => ({ state: game.state, pos: [game.player.x, game.player.y, game.player.z].map(v => +v.toFixed(2)), chunks: game.world.chunks.size, mobs: game.entities.length, fps: game.fps })));
    await sleep(1500);
    await E(() => { el('click-hint').hidden = true; game.player.pitch = -0.25; });
    await sleep(800);
    await shot('03-play-first');
    await E(() => { game.view = 1; game.player.pitch = -0.35; });
    await sleep(900); await shot('04-third-back');
    await E(() => { game.view = 2; game.player.pitch = 0.1; });
    await sleep(900); await shot('05-third-front');
    await E(() => { game.view = 0; game.player.give(B.OAK_PLANKS, 20); game.player.give(toolId(1, 0), 1); game.player.give(B.TORCH, 16); game.player.give(I.APPLE, 3); ui.dirty = true; openInv('inv'); });
    await sleep(700); await shot('06-inventory');
    await E(() => { game.closeUI(); game.player.sel = 1; ui.dirty = true; });
    await sleep(600); await shot('07-held-tool');
    await E(() => { game.world.time = 0.7; });
    await sleep(900); await shot('08-night');
  }
  if (scenario === 'hand' || scenario === 'all') {
    if (scenario === 'hand') { await E(() => game.startWorld('valley', 'creative', true)); await waitFor(() => game.state === 'playing', 90000, 'playing'); await sleep(1000); }
    const mod = await import('./hand.mjs'); await mod.default(E, shot, sleep);
  }
  if (scenario === 'screens') { const mod = await import('./screens.mjs'); await mod.default(E, shot, sleep, page, waitFor); }
  if (scenario === 'mobile') { const mod = await import('./mobile.mjs'); await mod.default(E, shot, sleep, page, waitFor); }
  if (scenario === 'night') { const mod = await import('./night.mjs'); await mod.default(E, shot, sleep, page, waitFor); }
  if (scenario === 'dbg') { const mod = await import('./dbg.mjs?' + Date.now()); await mod.default(E, shot, sleep, page, waitFor); }
  if (scenario === 'flow') { const mod = await import('./flow.mjs'); await mod.default(E, shot, sleep, page, waitFor); }
  if (scenario === 'mech') { const mod = await import('./mech.mjs'); await mod.default(E, shot, sleep, page, waitFor); }
  console.log('stats', await E(() => ({ state: game.state, fps: game.fps, chunks: game.world.chunks.size, entities: game.entities.length, particles: PARTICLES.length })));
  console.log('ERRORS (' + errors.length + '):\n' + errors.slice(0, 30).join('\n'));
  await browser.close(); server.close();
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(1); });
