// Loading a world always finishes: at every render distance (2 used to stop at 52% for ever), and when a piece of the
// world never arrives (it starts with the ground around you), or nothing does (a way back to the title shows).
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname);
const html = fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html'));
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(0);
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // (the web font can stall the page loading from a test machine; it isn't needed here)
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + server.address().port + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 90000 });
  const waitFor = (fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
  const toTitle = async () => { await p.evaluate(() => { if (game.state !== 'title') game.quitToTitle(); }); await waitFor(() => game.state === 'title', 30000); };

  // 1. every render distance, from the lowest: the world opens (and a saved world opens again)
  for (const rd of [2, 3, 12]) {
    await p.evaluate(rd => { game.settings.renderDist = rd; game.applySettings(); game.startWorld('valley', 'survival', true); }, rd);
    const ok = await waitFor(() => game.state === 'playing', 60000);
    const st = await p.evaluate(() => ({ state: game.state, bar: el('load-bar').style.width, back: !el('btn-load-back').hidden }));
    check('render distance ' + rd + ': the world finishes loading', ok && !st.back, st);
    if (rd === 2) {
      await toTitle();
      await p.evaluate(() => game.startWorld('valley', null, false));
      check('render distance 2: a saved world opens again', await waitFor(() => game.state === 'playing', 60000), await p.evaluate(() => el('load-bar').style.width));
    }
    await toTitle();
  }
  await p.evaluate(() => { game.settings.renderDist = 4; game.applySettings(); });

  // 2. a piece of the world (three chunks out) never arrives: after a while it starts with the ground around you
  await p.evaluate(() => {
    const req = GenPool.prototype.request;
    window.__lost = 0;
    GenPool.prototype.request = function (job) {
      const pl = game.player, dx = job.cx - (Math.floor(pl.x) >> 4), dz = job.cz - (Math.floor(pl.z) >> 4);
      if (dx === 3 && dz === 0) { window.__lost++; return; }   // (lost on the way, and never asked for again)
      return req.call(this, job);
    };
    window.__req = req;
    game.startWorld('sky', 'creative', true);
  });
  const t0 = Date.now();
  const started = await waitFor(() => game.state === 'playing', 60000);
  const st2 = await p.evaluate(() => ({ lost: window.__lost, ready1: game.world.readyAround(game.player.x, game.player.z, 1), back: !el('btn-load-back').hidden }));
  check('a piece of the world that never arrives: it starts anyway, with the ground around you ready', started && st2.lost > 0 && st2.ready1 === 1 && Date.now() - t0 > 10000, Object.assign(st2, { secs: Math.round((Date.now() - t0) / 1000) }));
  await toTitle();

  // 3. nothing arrives at all: a way back to the title shows, and it works
  await p.evaluate(() => { GenPool.prototype.request = function () {}; game.startWorld('sky', 'creative', true); });
  check('nothing arrives: "Back to title" shows after a while', await waitFor(() => !el('btn-load-back').hidden, 60000), await p.evaluate(() => ({ state: game.state, bar: el('load-bar').style.width })));
  await p.click('#btn-load-back');
  check('and it goes back to the title', await waitFor(() => game.state === 'title' && ui.screen === 'scr-title', 15000), await p.evaluate(() => ({ state: game.state, screen: ui.screen })));
  await p.evaluate(() => { GenPool.prototype.request = window.__req; });
  await p.evaluate(() => game.startWorld('sky', 'creative', true));
  check('the next world loads as usual (and the button is hidden again)', await waitFor(() => game.state === 'playing', 60000) && await p.evaluate(() => el('btn-load-back').hidden));

  check('no page errors', errs.length === 0, errs.slice(0, 5));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e.message); process.exit(2); });
