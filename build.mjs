import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
const dir = path.dirname(new URL(import.meta.url).pathname);
const src = f => fs.readFileSync(path.join(dir, 'src', f), 'utf8');
// The public website (GitHub Pages). The Play button in the no-JavaScript preview notice sends people here.
const SITE_URL = 'https://awgregg84.github.io/declan-craft/';
const PLAY_URL = SITE_URL;
const css = src('style.css');
const body = src('body.html').replaceAll('%PLAY_URL_TEXT%', PLAY_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')).replaceAll('%PLAY_URL%', PLAY_URL);
if (body.includes('%PLAY_URL')) { console.error('unreplaced PLAY_URL placeholder'); process.exit(1); }
const jsDir = path.join(dir, 'src', 'js');
const js = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort().map(f => '/* ---- ' + f + ' ---- */\n' + fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n');
if (/<\/script/i.test(js)) { console.error('script close tag inside JS'); process.exit(1); }
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">';
const title = '<title>Declan-craft</title>';
const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">';
const page = (head, tail) => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n${viewport}\n${title}\n${head}${fonts}\n<style>\n${css}</style>\n</head>\n<body>\n${body}\n<script>\n${js}\n</script>\n${tail}</body>\n</html>\n`;

// Website extras: Home Screen icon and full-screen app mode, link-preview card, offline copy.
const desc = 'A block-building adventure made for Declan: explore two worlds, mine, craft, build and survive the night.';
const siteHead = [
  `<meta name="description" content="${desc}">`,
  '<meta name="robots" content="noindex">',
  '<meta name="theme-color" content="#0b1020">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Declan-craft">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="Declan-craft">',
  '<meta property="og:title" content="Declan-craft">',
  `<meta property="og:description" content="${desc}">`,
  `<meta property="og:url" content="${SITE_URL}">`,
  `<meta property="og:image" content="${SITE_URL}og-image.jpg">`,
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta property="og:image:alt" content="The Declan-craft title screen: a blocky green valley with Declan in a red shirt">',
  '<meta name="twitter:card" content="summary_large_image">',
].join('\n') + '\n';
const siteTail = `<script>
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
if (navigator.storage && navigator.storage.persist && (navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches))) navigator.storage.persist().catch(function () {});
</script>
`;
const ASSETS = ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og-image.jpg'];

const outputs = [
  ['declan-craft.html', page('', '')],
  ['declan-craft-artifact.html', `${title}\n${fonts}\n<style>\n${css}</style>\n${body}\n<script>\n${js}\n</script>\n`],
];
const missing = ASSETS.filter(a => !fs.existsSync(path.join(dir, 'assets', a)));
fs.rmSync(path.join(dir, 'dist', 'site'), { recursive: true, force: true });
if (missing.length) console.warn('Skipping the website: missing assets/' + missing.join(', assets/') + ' (run node tools/make-assets.mjs, then build again).');
else {
  const siteHtml = page(siteHead, siteTail);
  const hash = crypto.createHash('sha256').update(siteHtml);
  for (const a of ASSETS) hash.update(fs.readFileSync(path.join(dir, 'assets', a)));
  outputs.push(
    ['site/index.html', siteHtml],
    ['site/sw.js', src('site/sw.js').replace('__VERSION__', hash.digest('hex').slice(0, 12))],
    ['site/manifest.webmanifest', JSON.stringify(JSON.parse(src('site/manifest.webmanifest')), null, 2) + '\n'],
    ['site/.nojekyll', ''],
  );
  fs.mkdirSync(path.join(dir, 'dist', 'site'), { recursive: true });
}
for (const [name, text] of outputs) {
  const bad = [...text].findIndex(ch => ch.charCodeAt(0) > 126 || (ch.charCodeAt(0) < 32 && ch !== '\n' && ch !== '\t' && ch !== '\r'));
  if (bad >= 0) { console.error(name + ': non-ASCII at', bad, JSON.stringify(text.slice(bad - 40, bad + 40))); process.exit(1); }
  fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'dist', name), text);
  console.log(name, (text.length / 1024).toFixed(1) + ' KB');
}
if (!missing.length) {
  for (const a of ASSETS) fs.copyFileSync(path.join(dir, 'assets', a), path.join(dir, 'dist', 'site', a));
  console.log('site assets:', ASSETS.join(', '));
}
