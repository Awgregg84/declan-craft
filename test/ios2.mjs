import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), dist = path.join(dir, '..', 'dist');
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); fs.createReadStream(path.join(dist, 'declan-craft.html')).pipe(res); }).listen(0);
const url = 'http://localhost:' + server.address().port + '/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  await p.goto(url); await sleep(2500);
  await p.tap('#btn-play'); await sleep(500);
  const info = await p.evaluate(() => {
    const e = document.elementFromPoint(195, 700), chain = [];
    for (let n = e; n; n = n.parentElement) chain.push((n.id || n.tagName.toLowerCase() + '.' + n.className) + ':' + getComputedStyle(n).touchAction);
    const s = el('scr-worlds');
    return { chain: chain.slice(0, 7), sh: s.scrollHeight, ch: s.clientHeight, overflowY: getComputedStyle(s).overflowY, display: getComputedStyle(s).display };
  });
  console.log(JSON.stringify(info, null, 1));
  const cdp = await ctx.newCDPSession(p);
  for (const [x, y0, y1] of [[195, 700, 200], [195, 500, 100], [60, 780, 300]]) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
    for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * i / 12 }] }); await sleep(20); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(700);
    console.log('swipe', x, y0, '->', y1, 'scrollTop', await p.evaluate(() => el('scr-worlds').scrollTop));
  }
  await browser.close(); server.close();
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
