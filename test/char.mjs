// Character choice and name: title button, character screen, saved profile, the model in game.
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), out = path.join(dir, 'shots');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html'));
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(0);
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const url = 'http://localhost:' + server.address().port + '/';
  await p.goto(url);
  await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
  const E = (fn, arg) => p.evaluate(fn, arg);
  const waitFor = (fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
  const shown = id => E(id => !el(id).hidden, id);
  const label = id => E(id => el(id).textContent, id);

  // 1. first run: Declan, no name typed yet
  const t0 = await E(() => ({ label: el('btn-char').textContent, img: !!el('btn-char').querySelector('img'), prof: JSON.parse(localStorage.getItem('declancraft:v1:profile')) }));
  check('title shows who is playing', /Playing as Declan/.test(t0.label) && t0.img && t0.prof.skin === 'declan' && t0.prof.pid.length >= 6, t0);

  // 2. the character screen
  await p.tap('#btn-char');
  const c1 = await E(() => ({ shown: !el('scr-char').hidden, cards: [...document.querySelectorAll('.char-card')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')), note: el('char-note').textContent }));
  check('character screen offers both looks', c1.shown && c1.cards.join() === 'Blonde hair:true,Brown hair:false' && /stays on this device/.test(c1.note), c1);
  await p.tap('.char-card >> nth=1');
  await p.fill('#char-name', 'Cora');
  await p.screenshot({ path: path.join(out, 'char.png') });
  const c2 = await E(() => ({ cards: [...document.querySelectorAll('.char-card')].map(b => b.getAttribute('aria-pressed')).join(), prof: JSON.parse(localStorage.getItem('declancraft:v1:profile')) }));
  check('picking brown hair and typing a name saves them', c2.cards === 'false,true' && c2.prof.skin === 'sister' && c2.prof.name === 'Cora', c2);
  await p.tap('#btn-char-done');
  check('Done goes back to the title', await shown('scr-title'));
  check('title button shows the new name', /Playing as Cora/.test(await label('btn-char')), await label('btn-char'));
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(out, 'title-sister.png') });

  // 3. names are cleaned, and an empty name falls back
  await p.tap('#btn-char');
  await p.fill('#char-name', '  <Zo>e   Bee  and more letters');
  await p.tap('#btn-char-done');
  check('names are tidied and kept short', await E(() => PROFILE.name) === 'Zoe Bee a', await E(() => PROFILE.name));   // the box holds 16 characters
  await p.tap('#btn-char');
  await p.fill('#char-name', '');
  await p.tap('#btn-char-done');
  check('no name: brown hair plays as "Player"', /Playing as Player/.test(await label('btn-char')), await label('btn-char'));

  // 4. Play Together needs a name first
  await p.tap('#btn-together');
  check('Play Together screen shows the character too', await shown('scr-mp') && /Playing as Player/.test(await label('btn-mp-char')), await label('btn-mp-char'));
  await p.tap('#btn-host');
  const n1 = await E(() => ({ char: !el('scr-char').hidden, note: el('char-note').textContent }));
  check('hosting without a name asks for one', n1.char && /Type your name first/.test(n1.note), n1);
  await p.fill('#char-name', 'Cora');
  await p.tap('#btn-char-done');
  const n2 = await E(() => ({ worlds: !el('scr-worlds').hidden, h: el('worlds-h').textContent }));
  check('after typing a name it carries on to choosing a world', n2.worlds && /Share/.test(n2.h), n2);
  await p.tap('#btn-worlds-back');

  // 5. it is remembered after closing the game
  await p.reload();
  await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
  check('character is remembered', /Playing as Cora/.test(await label('btn-char')) && await E(() => PROFILE.skin) === 'sister', await label('btn-char'));

  // 6. in a world: the right model, name in the inventory, third-person view
  await E(() => game.startWorld('valley', 'creative', true));
  await waitFor(() => game.state === 'playing', 90000);
  const g1 = await E(() => ({ model: playerModelFor(PROFILE.skin) === MODELS.player_sister, other: playerModelFor('declan') === MODELS.player_declan }));
  check('the game uses the brown-haired model', g1.model && g1.other, g1);
  await E(() => { game.setMode('survival'); game.toggleInventory(); });
  const inv = await E(() => { const c = document.getElementById('inv-char'); return c ? c.getAttribute('aria-label') : null; });
  check('inventory shows the name', inv === 'Cora', inv);
  await p.screenshot({ path: path.join(out, 'sister-inv.png') });
  await E(() => { if (ui.inv) game.closeUI(); game.player.pitch = 0; game.view = 2; });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(out, 'sister-front.png') });
  check('no script errors', errs.length === 0, errs.slice(0, 3));
  await browser.close(); server.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
