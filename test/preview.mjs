import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), dist = path.join(dir, '..', 'dist'), out = path.join(dir, 'shots');
const html = fs.readFileSync(path.join(dist, 'declan-craft.html'), 'utf8');
let serve = html;
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(serve); }).listen(0);
const url = 'http://localhost:' + server.address().port + '/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const PLAY = 'https://awgregg84.github.io/declan-craft/';
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + JSON.stringify(info) : '')); };
(async () => {
  const browser = await chromium.launch({ args });
  // 1. Mail / Messages / Files preview (JavaScript off): Play link shown, fits on screen, and a tap follows it.
  for (const name of ['iPad (gen 7)', 'iPad Pro 11 landscape', 'iPhone 13']) {
    const ctx = await browser.newContext({ ...devices[name], javaScriptEnabled: false }); const p = await ctx.newPage();
    await ctx.route('https://awgregg84.github.io/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>web copy</p>' }));
    await p.goto(url); await sleep(600);
    const v = await p.evaluate(() => {
      const a = document.querySelector('.play-link'), r = a.getBoundingClientRect(), note = document.getElementById('boot-note').getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { href: a.href, shown: r.height > 0 && getComputedStyle(a).display !== 'none', onTop: top === a || a.contains(top),
        startingHidden: getComputedStyle(document.querySelector('.js-only')).display === 'none', menuHidden: document.getElementById('title-menu').hidden,
        noteFits: note.bottom <= innerHeight, h: Math.round(r.height), text: document.getElementById('boot-note').innerText.replace(/\s+/g, ' ') };
    });
    check(name + ' preview: Play link visible and tappable', v.shown && v.onTop && v.noteFits && v.startingHidden && v.menuHidden && v.href === PLAY, v);
    await p.screenshot({ path: path.join(out, 'preview-' + name.replace(/\W+/g, '-') + '.png') });
    await p.tap('.play-link'); await sleep(600);
    check(name + ' preview: tapping Play opens the web copy', p.url() === PLAY, { url: p.url() });
    await ctx.close();
  }
  // 2. Normal start: the preview text never displays, the menu appears, no slow-start hint.
  { const ctx = await browser.newContext({ ...devices['iPad (gen 7)'] }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => {
      window.__seen = [];
      new MutationObserver(() => { const n = document.querySelector('.nojs-only'); if (n) window.__seen.push(getComputedStyle(n).display); }).observe(document, { childList: true, subtree: true });
    });
    await p.goto(url); await sleep(10500);
    const v = await p.evaluate(() => ({ seen: [...new Set(window.__seen)], ok: BOOT.ok, menu: !document.getElementById('title-menu').hidden, note: !document.getElementById('boot-note').hidden,
      nojs: getComputedStyle(document.querySelector('.nojs-only')).display }));
    check('normal start: preview text never shown, menu up', v.ok && v.menu && !v.note && v.nojs === 'none' && v.seen.every(d => d === 'none') && !errs.length, { ...v, errs });
    await ctx.close(); }
  // 3. A browser too old to read the game code: "Starting" stays, then the hint appears.
  { const marker = "/* ---- 00-core.js ---- */\n'use strict';";
    if (!html.includes(marker)) throw new Error('script marker not found');
    serve = html.replace(marker, marker + ' this is not valid;');
    const ctx = await browser.newContext({ ...devices['iPad (gen 7)'] }); const p = await ctx.newPage();
    await p.goto(url); await sleep(1500);
    const early = await p.evaluate(() => ({ slow: getComputedStyle(document.getElementById('boot-slow')).display !== 'none', starting: getComputedStyle(document.querySelector('.js-only')).display !== 'none' && getComputedStyle(document.getElementById('boot-note')).display !== 'none' }));
    await sleep(8500);
    const late = await p.evaluate(() => ({ broken: typeof BOOT === 'undefined', noteShown: getComputedStyle(document.getElementById('boot-note')).display !== 'none', slow: getComputedStyle(document.getElementById('boot-slow')).display !== 'none', text: document.getElementById('boot-note').innerText.replace(/\s+/g, ' ') }));
    check('old browser: hint appears only after a wait', early.starting && !early.slow && late.broken && late.noteShown && late.slow && !/preview/.test(late.text), { early, late });
    await p.screenshot({ path: path.join(out, 'preview-oldbrowser.png') });
    serve = html; await ctx.close(); }
  await browser.close(); server.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
