// Frame-time probe for a build: node test/perf.mjs dist/declan-craft.html
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const file = process.argv[2];
const html = fs.readFileSync(file);
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(0);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://localhost:' + server.address().port + '/');
  await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
  await p.evaluate(() => game.startWorld('valley', 'survival', true));
  await p.waitForFunction(() => game.state === 'playing', null, { timeout: 90000 });
  await sleep(6000);
  const r = await p.evaluate(() => new Promise(res => {
    const f = []; let last = performance.now(); const t0 = last;
    const tick = () => { const n = performance.now(); f.push(n - last); last = n; if (n - t0 < 6000) requestAnimationFrame(tick); else res(f); };
    requestAnimationFrame(tick);
  }));
  r.sort((a, b) => a - b);
  const q = k => Math.round(r[Math.floor(r.length * k)]);
  console.log(file.split('/').slice(-3).join('/'), 'frames', r.length, 'median', q(0.5), 'ms  p90', q(0.9), 'ms  max', Math.round(r[r.length - 1]), 'ms | chunks', await p.evaluate(() => game.world.chunks.size), 'entities', await p.evaluate(() => game.entities.length));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
