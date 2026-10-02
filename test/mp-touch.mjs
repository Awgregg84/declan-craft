// Play Together screens on touch devices (iPad landscape and iPhone portrait): layout checks and screenshots.
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), out = path.join(dir, 'shots');
const { PeerServer } = require(path.join(dir, '..', 'tools', 'node_modules', 'peer'));
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html'));
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(0);
const PEER_PORT = 9100 + Math.floor(Math.random() * 800);
const peer = PeerServer({ port: PEER_PORT, host: '127.0.0.1', path: '/' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
const overlap = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const url = 'http://localhost:' + server.address().port + '/';
  const setups = [
    { name: 'ipad', ctx: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } },
    { name: 'iphone', ctx: { ...devices['iPhone 13'] } },
  ];
  for (const su of setups) {
    const ctx = await browser.newContext(su.ctx);
    await ctx.addInitScript(port => {
      window.DC_NET = { host: '127.0.0.1', port, secure: false, path: '/', key: 'peerjs', iceServers: [], mqtt: [] };
      localStorage.setItem('declancraft:v1:profile', JSON.stringify({ skin: 'declan', name: 'Declan', pid: 'touchhost01' }));
    }, PEER_PORT);
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url);
    await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
    const waitFor = (fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
    // the Play Together and Join screens
    await p.tap('#btn-together');
    await sleep(300);
    const mp = await p.evaluate(() => { const r = id => el(id).getBoundingClientRect(); const all = ['btn-mp-char', 'btn-host', 'btn-join', 'btn-mp-back'].map(r); return { fits: all.every(b => b.top >= 0 && b.bottom <= innerHeight + 1 && b.left >= 0 && b.right <= innerWidth), tall: all.every(b => b.height >= 44) }; });
    check(su.name + ': Play Together buttons fit and are easy to tap', mp.fits && mp.tall, mp);
    await p.screenshot({ path: path.join(out, 'mpt-' + su.name + '-together.png') });
    await p.tap('#btn-join');
    await sleep(300);
    const jn = await p.evaluate(() => { const i = el('join-code'), r = i.getBoundingClientRect(), cs = getComputedStyle(i); return { font: parseFloat(cs.fontSize), h: r.height, caps: i.getAttribute('autocapitalize') }; });
    check(su.name + ': code box is big and does not zoom the page', jn.font >= 16 && jn.h >= 44 && jn.caps === 'characters', jn);
    await p.screenshot({ path: path.join(out, 'mpt-' + su.name + '-join.png') });
    await p.tap('#btn-join-back');
    // hosting in game: badge, touch buttons, join prompt, game menu
    await p.tap('#btn-host');
    await p.tap('#world-cards .card >> nth=0 >> text=Create World');
    await waitFor(() => game.state === 'playing', 120000);
    check(su.name + ': room opens', await waitFor(() => MP.roomOpen, 20000));
    await sleep(500);
    const lay = await p.evaluate(() => {
      const box = e => { if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null; };
      const badge = box(el('room-badge')), btns = [...document.querySelectorAll('#touch button, #touch .tbtn, #touch [role=button]')].map(box).filter(Boolean);
      return { badge, hits: btns.filter(b => b && badge && b.left < badge.right && badge.left < b.right && b.top < badge.bottom && badge.top < b.bottom).length, n: btns.length };
    });
    check(su.name + ': room badge clear of the touch buttons', !!lay.badge && lay.hits === 0, lay);
    // Chat button (only in a shared game)
    check(su.name + ': Chat button shows in a shared game', await p.evaluate(() => !el('tb-chat').hidden && el('tb-chat').getBoundingClientRect().height >= 44));
    await p.tap('#tb-chat');
    const ch = await p.evaluate(() => ({ open: game.chatOpen && !el('chat-form').hidden, focused: document.activeElement === el('chat-input'), hint: el('chat-input').getAttribute('enterkeyhint') }));
    check(su.name + ': tapping Chat opens the box with the keyboard', ch.open && ch.focused && ch.hint === 'send', ch);
    await p.screenshot({ path: path.join(out, 'mpt-' + su.name + '-chat.png') });
    await p.keyboard.type('hi from the iPad');
    await p.keyboard.press('Enter');
    check(su.name + ': message is sent and the box closes', await p.evaluate(() => !game.chatOpen && [...el('chat-log').children].some(d => d.textContent === '<Declan> hi from the iPad')));
    await p.tap('#tb-chat');
    await p.evaluate(() => el('chat-input').blur());
    await sleep(500);
    check(su.name + ': tapping away closes the chat box', await p.evaluate(() => !game.chatOpen && el('chat-form').hidden));
    await p.evaluate(() => { MP.pending.push({ hello: { name: 'Cora', skin: 'sister', pid: 'fake' }, closed: false, send() {}, close() {} }); MP.showPrompt(); });
    await sleep(400);
    const pr = await p.evaluate(() => { const r = el('join-prompt').getBoundingClientRect(), a = el('btn-allow').getBoundingClientRect(), d = el('btn-deny').getBoundingClientRect(); return { fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, tall: a.height >= 44 && d.height >= 44, top: document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2) === el('btn-allow'), paused: game.paused }; });
    check(su.name + ': join prompt fits and can be tapped without pausing', pr.fits && pr.tall && pr.top && !pr.paused, pr);
    await p.screenshot({ path: path.join(out, 'mpt-' + su.name + '-prompt.png') });
    await p.tap('#btn-deny');
    check(su.name + ': prompt closes', await p.evaluate(() => el('join-prompt').hidden));
    await p.evaluate(() => game.pause());
    await sleep(300);
    const pm = await p.evaluate(() => { const s = el('scr-pause'), r = el('room-code-big').getBoundingClientRect(); return { code: el('room-code-big').textContent === MP.code, visible: r.height > 0, scrolls: s.scrollHeight > s.clientHeight }; });
    check(su.name + ': game menu shows the room code', pm.code && pm.visible, pm);
    await p.screenshot({ path: path.join(out, 'mpt-' + su.name + '-pause.png') });
    check(su.name + ': no script errors', errs.length === 0, errs.slice(0, 3));
    await p.evaluate(() => game.quitToTitle());
    await p.tap('#btn-play');
    await p.tap('#world-cards .card >> nth=0 >> text=Continue');
    await waitFor(() => game.state === 'playing', 120000);
    check(su.name + ': no Chat button when playing alone', await p.evaluate(() => el('tb-chat').hidden));
    await p.evaluate(() => game.quitToTitle());
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
