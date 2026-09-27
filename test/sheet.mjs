import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [outFile, cols, ...files] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const imgs = files.map(f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'));
  const c = +cols, w = Math.floor(1600 / c);
  await p.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${c},${w}px);gap:2px">` + imgs.map((s, i) => `<div style="position:relative"><img src="${s}" style="width:${w}px;display:block"><span style="position:absolute;left:4px;top:2px;color:#ff0;font:14px monospace;background:#000a">${path.basename(files[i])}</span></div>`).join('') + '</body>');
  await p.waitForTimeout(300);
  const el = await p.$('body'); await el.screenshot({ path: outFile }); await b.close(); console.log('sheet', outFile);
})();
