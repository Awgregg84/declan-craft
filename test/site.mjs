// Website checks: Home Screen app tags, offline start and play, website-down fallback, updates.
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), site = path.join(dir, '..', 'dist', 'site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg' };
let mode = 'up', hits = 0, extra = '';
const server = http.createServer((req, res) => {
  if (mode === 'offline') { req.socket.destroy(); return; }
  const u = new URL(req.url, 'http://x');
  let rel = u.pathname.startsWith('/declan-craft/') ? u.pathname.slice('/declan-craft/'.length) : null;
  if (rel === '') rel = 'index.html';
  const f = rel && path.join(site, rel);
  if (mode === 'down' || !f || !fs.existsSync(f)) { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('<h1>404 Not Found</h1>'); return; }
  if (rel === 'index.html') hits++;
  let body = fs.readFileSync(f);
  if (rel === 'index.html' && extra) body = Buffer.from(body.toString().replace('<head>', '<head>\n' + extra));
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(body);
}).listen(0);
const base = 'http://localhost:' + server.address().port + '/declan-craft/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + JSON.stringify(info) : '')); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPad (gen 7)'] }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const booted = () => p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok && !document.getElementById('title-menu').hidden, null, { timeout: 60000 }).then(() => true, () => false);
  // 1. first visit: game starts, offline copy is saved
  await p.goto(base); const ok1 = await booted();
  const sw = await p.evaluate(async () => {
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 50 && !navigator.serviceWorker.controller; i++) await new Promise(r => setTimeout(r, 100));
    const keys = []; for (const n of await caches.keys()) for (const r of await (await caches.open(n)).keys()) keys.push(new URL(r.url).pathname);
    return { controlled: !!navigator.serviceWorker.controller, cached: keys.sort() };
  });
  check('first visit: game starts and saves an offline copy', ok1 && sw.controlled && ['/declan-craft/', '/declan-craft/apple-touch-icon.png', '/declan-craft/manifest.webmanifest'].every(k => sw.cached.includes(k)), sw);
  // 2. Home Screen app details
  const meta = await p.evaluate(async () => {
    const q = s => { const e = document.querySelector(s); return e && (e.content || e.href); };
    const man = await (await fetch(q('link[rel=manifest]'))).json();
    const size = src => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth + 'x' + i.naturalHeight); i.onerror = () => r('broken'); i.src = src; });
    const icons = []; for (const ic of man.icons) icons.push(ic.sizes + '=' + await size(new URL(ic.src, location.href).href));
    return { name: man.name, display: man.display, icons, touchIcon: await size(q('link[rel=apple-touch-icon]')), capable: q('meta[name=apple-mobile-web-app-capable]'),
      title: q('meta[name=apple-mobile-web-app-title]'), ogImage: q('meta[property="og:image"]'), robots: q('meta[name=robots]') };
  });
  check('Home Screen icon, full-screen mode and link preview tags', meta.display === 'standalone' && meta.icons.every(s => { const [a, b] = s.split('='); return a === b; }) && meta.touchIcon === '180x180' && meta.capable === 'yes' && meta.title === 'Declan-craft' && meta.ogImage === 'https://awgregg84.github.io/declan-craft/og-image.jpg' && meta.robots === 'noindex', meta);
  // 3. no connection at all: starts from the saved copy and a new world can be played
  mode = 'offline'; await p.reload(); const ok3 = await booted();
  let playing = false;
  if (ok3) { await p.evaluate(() => game.startWorld('valley', 'survival', true)); playing = await p.waitForFunction(() => game.state === 'playing' && game.world.chunks.size > 20, null, { timeout: 120000 }).then(() => true, () => false); }
  const st = await p.evaluate(() => ({ state: game.state, chunks: game.world && game.world.chunks.size }));
  check('offline: starts and plays a new world', ok3 && playing, st);
  await p.evaluate(() => game.quitToTitle());
  // 4. website taken down (404 everywhere): still starts from the saved copy
  mode = 'down'; await p.reload(); check('website down: still starts', await booted());
  // 5. back online with a changed page: the update is used right away
  mode = 'up'; extra = '<meta name="test-update" content="v2">'; const before = hits;
  await p.reload(); const ok5 = await booted();
  const upd = await p.evaluate(() => { const m = document.querySelector('meta[name=test-update]'); return m && m.content; });
  check('online again: newest version is used', ok5 && upd === 'v2' && hits > before, { upd, hits: hits - before });
  check('no script errors', errs.length === 0, errs.slice(0, 3));
  await browser.close(); server.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
