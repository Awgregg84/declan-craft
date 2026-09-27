// Renders the website's Home Screen icons and link-preview picture from the game itself.
// Usage: node build.mjs && node tools/make-assets.mjs   (writes assets/*.png)
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const html = fs.readFileSync(path.join(root, 'dist', 'declan-craft.html'));
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(0);
const url = 'http://localhost:' + server.address().port + '/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
  // Icons: Declan's face (skin base layer plus hair layer) on a sky and grass background.
  const icons = await page.evaluate(sizes => {
    const d = SKIN_DATA[SKIN.declan], at = (x, y) => { const i = (y * 64 + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
    const out = {};
    for (const S of sizes) {
      const cv = document.createElement('canvas'); cv.width = cv.height = S;
      const g = cv.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, S); sky.addColorStop(0, '#a8d8ff'); sky.addColorStop(1, '#5b9be6');
      g.fillStyle = sky; g.fillRect(0, 0, S, S);
      const band = Math.round(S * 0.2);
      g.fillStyle = '#7a5433'; g.fillRect(0, S - band, S, band);
      g.fillStyle = '#5da33a'; g.fillRect(0, S - band, S, Math.round(band * 0.45));
      g.fillStyle = '#4a8a2e'; g.fillRect(0, S - band + Math.round(band * 0.45), S, Math.max(1, Math.round(S / 90)));
      const cell = Math.floor(S * 0.66 / 8), F = cell * 8, ox = Math.round((S - F) / 2), oy = Math.round((S - F) / 2 - S * 0.04);
      g.fillStyle = 'rgba(0, 0, 0, 0.28)'; g.fillRect(ox + Math.round(cell * 0.4), oy + Math.round(cell * 0.4), F, F);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const hair = at(40 + x, 8 + y), c = hair[3] > 0 ? hair : at(8 + x, 8 + y);
        g.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; g.fillRect(ox + x * cell, oy + y * cell, cell, cell);
      }
      out[S] = cv.toDataURL('image/png');
    }
    return out;
  }, [180, 192, 512]);
  const save = (name, dataURL) => { fs.writeFileSync(path.join(root, 'assets', name), Buffer.from(dataURL.split(',')[1], 'base64')); console.log('wrote assets/' + name); };
  save('apple-touch-icon.png', icons[180]); save('icon-192.png', icons[192]); save('icon-512.png', icons[512]);
  // Link-preview picture: the title screen without its buttons.
  await page.evaluate(() => { el('title-menu').hidden = true; document.querySelector('.foot').hidden = true; el('splash').textContent = 'Made for Declan!'; });
  await sleep(12000);
  await page.screenshot({ path: path.join(root, 'assets', 'og-image.jpg'), type: 'jpeg', quality: 86 }); console.log('wrote assets/og-image.jpg');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
