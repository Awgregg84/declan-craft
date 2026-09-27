import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), dist = path.join(dir, '..', 'dist'), out = path.join(dir, 'shots');
const server = http.createServer((req, res) => { const f = path.join(dist, 'declan-craft.html'); res.writeHead(200, { 'Content-Type': 'text/html' }); fs.createReadStream(f).pipe(res); }).listen(0);
const url = 'http://localhost:' + server.address().port + '/declan-craft.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
(async () => {
  const browser = await chromium.launch({ args });
  const iphone = devices['iPhone 13'];
  // 1. preview without JavaScript (what Messages / Files show on an iPhone)
  { const ctx = await browser.newContext({ ...iphone, javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(url); await sleep(800);
    const vis = await p.evaluate(() => ({ note: !document.getElementById('boot-note').hidden, noteText: document.getElementById('boot-note').innerText.slice(0, 80), menuHidden: document.getElementById('title-menu').hidden, heading: getComputedStyle(document.getElementById('logo-text')).display }));
    console.log('1. no-JS preview:', JSON.stringify(vis)); await p.screenshot({ path: path.join(out, 'ios-nojs.png') }); await ctx.close(); }
  // 2. forced startup failure shows the reason
  { const ctx = await browser.newContext({ ...iphone }); const p = await ctx.newPage();
    await p.addInitScript(() => { CanvasRenderingContext2D.prototype.createPattern = function () { throw new Error('simulated startup failure'); }; });
    await p.goto(url); await sleep(2500);
    const t = await p.evaluate(() => ({ note: !document.getElementById('boot-note').hidden, text: document.getElementById('boot-note').innerText.replace(/\s+/g, ' ').slice(0, 160), menuHidden: document.getElementById('title-menu').hidden }));
    console.log('2. startup error:', JSON.stringify(t)); await p.screenshot({ path: path.join(out, 'ios-bootfail.png') }); await ctx.close(); }
  // 3. iPhone emulation: boots, menus scroll with a real touch swipe
  { const ctx = await browser.newContext({ ...iphone }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT/.test(m.text())) errs.push(m.text()); });
    await p.goto(url); await sleep(3000);
    const booted = await p.evaluate(() => ({ ok: BOOT.ok, menu: !document.getElementById('title-menu').hidden, note: !document.getElementById('boot-note').hidden, touchOn: game.touchOn }));
    console.log('3a. iPhone boot:', JSON.stringify(booted));
    await p.tap('#btn-help'); await sleep(500);
    const cdp = await ctx.newCDPSession(p);
    const before = await p.evaluate(() => el('scr-help').scrollTop);
    const swipe = async (x, y0, y1) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
      for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * i / 10 }] }); await sleep(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    for (let i = 0; i < 4; i++) { await swipe(195, 600, 100); await sleep(600); }
    const after = await p.evaluate(() => { const s = el('scr-help'), d = el('btn-help-done').getBoundingClientRect(); return { scrollTop: Math.round(s.scrollTop), max: s.scrollHeight - s.clientHeight, doneVisible: d.bottom <= window.innerHeight && d.top >= 0 }; });
    console.log('3b. How to Play touch scroll:', 'before', before, JSON.stringify(after));
    await p.screenshot({ path: path.join(out, 'ios-help-scrolled.png') });
    await p.tap('#btn-help-done'); await sleep(300);
    await p.tap('#btn-play'); await sleep(500);
    const w = await p.evaluate(() => { const s = el('scr-worlds'); return { overflow: s.scrollHeight - s.clientHeight }; });
    await swipe(195, 600, 100); await sleep(700);   // inside the 664px-tall viewport
    const w2 = await p.evaluate(() => { const b = el('btn-worlds-back').getBoundingClientRect(); return { scrollTop: Math.round(el('scr-worlds').scrollTop), backVisible: b.bottom <= window.innerHeight }; });
    console.log('3c. world list touch scroll:', JSON.stringify(w), JSON.stringify(w2));
    // start a world with a tap, then check play works and a screen tap places a block
    await p.evaluate(() => { const b = [...document.querySelectorAll('#world-cards .btn')].find(x => x.textContent === 'Create World'); b.scrollIntoView(); });
    await sleep(200);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#world-cards .btn')].find(x => x.textContent === 'Create World'); b.click(); });
    const t0 = Date.now(); while (Date.now() - t0 < 60000 && !(await p.evaluate(() => game.state === 'playing'))) await sleep(300);
    await sleep(1200);
    await p.evaluate(() => {
      const pl = game.player, w = game.world, x = Math.floor(pl.x), y = Math.floor(pl.y), z = Math.floor(pl.z);
      // flat ground all round, so the block always has room (a step next to the spawn would put it inside the player)
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { w.setBlock(x + dx, y - 1, z + dz, B.STONE, 0); for (let dy = 0; dy < 3; dy++) w.setBlock(x + dx, y + dy, z + dz, B.AIR, 0); }
      pl.inv[0] = { id: B.COBBLE, count: 3 }; pl.sel = 0; pl.pitch = -1.0; ui.dirty = true;
    });
    await sleep(400);
    await p.touchscreen.tap(195, 420); await sleep(600);
    const placed = await p.evaluate(() => game.player.inv[0] ? game.player.inv[0].count : 0);
    console.log('3d. tap-to-place on iPhone:', placed === 2 ? 'PASS' : 'CHECK', 'cobble left', placed, '| state', await p.evaluate(() => game.state));
    await p.screenshot({ path: path.join(out, 'ios-play.png') });
    // 4. graphics context loss shows the restart screen
    await p.evaluate(() => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
    await sleep(800);
    console.log('4. context lost:', JSON.stringify(await p.evaluate(() => ({ screen: !el('gl-lost').hidden, saved: !!store.get(saveKey('valley')) }))));
    console.log('   page errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
    await ctx.close(); }
  await browser.close(); server.close();
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
