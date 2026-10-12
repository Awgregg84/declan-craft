/* ===================== TVs and coloring boards ===================== */
// A TV (iron, glass and coal) faces you when you put it down; tap it to turn it on or off. You can't pick what's
// on: a show plays for a while, then the TV goes fuzzy and something else comes on. The show is worked out from
// where the TV is and the time, so everyone playing together sees the same thing.
// A coloring board (sticks round a piece of paper) stands on the ground like an easel or hangs on a wall. Tap it to
// color it in: pick a picture to color (or a blank page) and paint with a brush or fill whole parts at once.

/* ---- TV ---- */
const TV_SLOT = 25, TV_FUZZ = 0.7;   // seconds a show lasts; seconds of fuzz between shows
const TV_W = 128, TV_H = 106;        // the picture (the screen is 12 by 10 pixels of the block)
const tvHash = (a, b, c, d) => { let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791) ^ (d * 2654435761); h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^ (h >>> 16)) >>> 0; };
function tvShow(w, x, y, z) {
  const slot = Math.floor(w.clock / TV_SLOT);
  return { slot, show: tvHash(x, y, z, slot) % TV_SHOWS.length, t: w.clock - slot * TV_SLOT, seed: tvHash(z, x, y, slot) };
}
function useTV(game, x, y, z) {
  const w = game.world, d = w.getData(x, y, z);
  w.setBlock(x, y, z, B.TV, d ^ 4, true);
  sfx(d & 4 ? 'tvOff' : 'tvOn', x + 0.5, y + 0.5, z + 0.5);
  if (game.net) MP.localFx('sfx', x + 0.5, y + 0.5, z + 0.5, SFX_NET.indexOf(d & 4 ? 'tvOff' : 'tvOn'));
}
/* a little pseudo-random sequence for a show's picture (the same on every iPad) */
function tvRand(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
function tvText(ctx, s, x, y, col, size) {
  ctx.font = '600 ' + (size || 11) + 'px "Pixelify Sans", "Courier New", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000'; ctx.fillText(s, x + 1, y + 1);
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
const tvBox = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const TV_SHOWS = [
  // a creeper wanders along... and sometimes goes BOOM
  (ctx, t, R) => {
    const g = ctx.createLinearGradient(0, 0, 0, 80); g.addColorStop(0, '#6aa8f0'); g.addColorStop(1, '#c4e2ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, TV_W, 80);
    for (let i = 0; i < 3; i++) { const cx = ((R() * 160 + t * (6 + i * 3)) % 170) - 30, cy = 10 + i * 14; tvBox(ctx, '#ffffff', cx, cy, 24, 6); tvBox(ctx, '#ffffff', cx + 5, cy - 4, 12, 4); }
    tvBox(ctx, '#5ab83a', 0, 80, TV_W, 8); tvBox(ctx, '#8a5a32', 0, 88, TV_W, TV_H - 88);
    for (let x = 0; x < TV_W; x += 8) tvBox(ctx, '#4a9a2e', x + ((x * 7) % 5), 86, 3, 2);
    const ph = t % 9, boom = ph > 7.2 && ph < 8.4, x = ((t * 18) % 170) - 20, hop = Math.abs(Math.sin(t * 6)) * 3;
    if (!boom) {
      const fl = ph > 6.2 && ph < 7.2 && Math.floor(t * 8) % 2 === 0, gr = fl ? '#ffffff' : '#4fb83a';
      tvBox(ctx, gr, x, 52 - hop, 14, 14); tvBox(ctx, gr, x + 2, 66 - hop, 10, 10);
      tvBox(ctx, '#1a1a1a', x + 2, 55 - hop, 4, 4); tvBox(ctx, '#1a1a1a', x + 8, 55 - hop, 4, 4); tvBox(ctx, '#1a1a1a', x + 5, 59 - hop, 4, 5); tvBox(ctx, '#1a1a1a', x + 3, 62 - hop, 2, 3); tvBox(ctx, '#1a1a1a', x + 9, 62 - hop, 2, 3);
      tvBox(ctx, '#3a8a2a', x + 2, 76 - hop + (Math.floor(t * 6) % 2), 4, 4); tvBox(ctx, '#3a8a2a', x + 8, 76 - hop + (Math.floor(t * 6 + 1) % 2), 4, 4);
      if (fl) tvText(ctx, 'sssss...', 64, 30, '#ffffff', 12);
    } else {
      const k = (ph - 7.2) / 1.2;
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = 6 + k * 34; ctx.fillStyle = i % 2 ? '#f0f0f0' : '#a0a0a0'; ctx.beginPath(); ctx.arc(x + 7 + Math.cos(a) * r, 64 + Math.sin(a) * r * 0.7, 8 * (1 - k * 0.5), 0, TAU); ctx.fill(); }
      tvText(ctx, 'BOOM!', 64, 30, '#ffdd33', 22);
    }
  },
  // the fish tank
  (ctx, t, R) => {
    const g = ctx.createLinearGradient(0, 0, 0, TV_H); g.addColorStop(0, '#2a7ad0'); g.addColorStop(1, '#0a2a6a'); ctx.fillStyle = g; ctx.fillRect(0, 0, TV_W, TV_H);
    tvBox(ctx, '#e8d090', 0, 94, TV_W, 12);
    for (let i = 0; i < 6; i++) { const sx = 8 + i * 22 + R() * 6; for (let y = 0; y < 26 + i % 3 * 6; y += 3) tvBox(ctx, i % 2 ? '#3aa84a' : '#2a8a3a', sx + Math.sin(t * 2 + y * 0.3 + i) * 2, 94 - y, 3, 3); }
    const cols = ['#f08a2a', '#f2cf3a', '#e8304a', '#9a5af0', '#5ad0f0'];
    for (let i = 0; i < 5; i++) {
      const dir = i % 2 ? 1 : -1, sp = 10 + R() * 14, len = 150, px = dir > 0 ? ((t * sp + R() * len) % len) - 12 : TV_W + 12 - ((t * sp + R() * len) % len), py = 18 + i * 15 + Math.sin(t * 2 + i) * 4;
      tvBox(ctx, cols[i], px - 6, py - 3, 12, 7); tvBox(ctx, cols[i], px - (dir > 0 ? 10 : -6), py - 2 + (Math.floor(t * 6) % 2), 4, 5);
      tvBox(ctx, '#ffffff', px + (dir > 0 ? 2 : -4), py - 2, 2, 2); tvBox(ctx, '#000000', px + (dir > 0 ? 3 : -4), py - 2, 1, 1);
    }
    for (let i = 0; i < 8; i++) { const bx = (R() * TV_W + Math.sin(t + i) * 3) | 0, by = TV_H - ((t * 14 + R() * TV_H) % TV_H); ctx.strokeStyle = '#cfefff'; ctx.strokeRect(bx, by, 3, 3); }
  },
  // space: stars, a planet with rings, a rocket
  (ctx, t, R) => {
    tvBox(ctx, '#05050f', 0, 0, TV_W, TV_H);
    for (let i = 0; i < 40; i++) { const sx = (R() * TV_W - t * (2 + (i % 3) * 3)) % TV_W, tw = Math.sin(t * 3 + i) > 0.6; tvBox(ctx, tw ? '#ffffaa' : '#ffffff', sx < 0 ? sx + TV_W : sx, R() * TV_H, tw ? 2 : 1, tw ? 2 : 1); }
    ctx.fillStyle = '#c8784a'; ctx.beginPath(); ctx.arc(98, 30, 16, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8a06a'; ctx.beginPath(); ctx.arc(94, 26, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#f0e0a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(98, 30, 26, 6, -0.3, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
    const k = (t % 10) / 10, rx = -20 + k * 170, ry = 90 - k * 70;
    ctx.save(); ctx.translate(rx, ry); ctx.rotate(-0.6);
    tvBox(ctx, Math.floor(t * 12) % 2 ? '#ffdd33' : '#ff7a1a', -18, -3, 6, 6);
    tvBox(ctx, '#f0f0f0', -12, -5, 18, 10); tvBox(ctx, '#e8304a', 6, -4, 5, 8); tvBox(ctx, '#3a8ae8', -4, -2, 4, 4); tvBox(ctx, '#e8304a', -12, -9, 5, 4); tvBox(ctx, '#e8304a', -12, 5, 5, 4);
    ctx.restore();
  },
  // the pig race
  (ctx, t, R) => {
    tvBox(ctx, '#5ab83a', 0, 0, TV_W, TV_H);
    for (let i = 0; i < 4; i++) tvBox(ctx, '#e8f0e0', 0, 18 + i * 26, TV_W, 2);
    for (let y = 18; y < 98; y += 4) tvBox(ctx, (y >> 2) % 2 ? '#ffffff' : '#1a1a1a', 112, y, 4, 4);
    const race = Math.floor(t / 9), k = t % 9, sp = [0, 1, 2].map(i => 10 + tvHash(race, i, 7, 3) % 9);
    let won = -1;
    for (let i = 0; i < 3; i++) {
      const px = Math.min(100, 4 + k * sp[i] + Math.sin(t * 9 + i) * 1.5), py = 26 + i * 26 + Math.abs(Math.sin(t * 10 + i * 2)) * -2;
      if (px >= 100 && won < 0) won = i;
      tvBox(ctx, '#f2a2a8', px, py, 14, 9); tvBox(ctx, '#f2a2a8', px + 12, py - 3, 7, 8); tvBox(ctx, '#e88a90', px + 18, py, 2, 3);
      tvBox(ctx, '#000000', px + 15, py - 2, 1, 1); tvBox(ctx, '#d87880', px + 1, py + 9, 2, 3 + (Math.floor(t * 10 + i) % 2)); tvBox(ctx, '#d87880', px + 10, py + 9, 2, 3 + (Math.floor(t * 10 + i + 1) % 2));
      tvText(ctx, String(i + 1), px + 6, py + 4, '#ffffff', 8);
    }
    if (k < 1.2) tvText(ctx, 'GO!', 64, 10, '#ffdd33', 14);
    else if (won >= 0) tvText(ctx, 'PIG ' + (won + 1) + ' WINS!', 64, 10, '#ffdd33', 13);
  },
  // the weather
  (ctx, t, R) => {
    const rainy = R() < 0.4, g = ctx.createLinearGradient(0, 0, 0, TV_H); g.addColorStop(0, rainy ? '#5a6a8a' : '#4aa0f0'); g.addColorStop(1, rainy ? '#8a9ab0' : '#aee0ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, TV_W, TV_H);
    tvBox(ctx, '#1a3a8a', 0, 0, TV_W, 16); tvText(ctx, 'WEATHER', 64, 8, '#ffffff', 11);
    if (!rainy) {
      ctx.save(); ctx.translate(40, 54); ctx.rotate(t * 0.6);
      for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); tvBox(ctx, '#ffd84a', 16, -2, 9, 4); }
      ctx.restore(); ctx.fillStyle = '#ffe85a'; ctx.beginPath(); ctx.arc(40, 54, 14, 0, TAU); ctx.fill();
      tvBox(ctx, '#1a1a1a', 35, 50, 3, 3); tvBox(ctx, '#1a1a1a', 43, 50, 3, 3); tvBox(ctx, '#c8602a', 36, 58, 9, 2);
    } else {
      for (let i = 0; i < 20; i++) { const rx = (R() * 60 + 14) | 0, ry = 50 + ((t * 40 + R() * 50) % 50); tvBox(ctx, '#bfe0ff', rx, ry, 1, 4); }
      for (const [cx, cy, r] of [[30, 44, 10], [42, 38, 13], [55, 45, 9]]) { ctx.fillStyle = '#e0e6f0'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); }
    }
    tvText(ctx, (rainy ? 50 + (R() * 15 | 0) : 68 + (R() * 20 | 0)) + '\u00b0', 96, 50, '#ffffff', 20);
    tvText(ctx, rainy ? 'RAINY' : 'SUNNY', 96, 74, '#ffffff', 11);
    tvBox(ctx, '#2a1a0a', 0, 92, TV_W, 14); tvText(ctx, ['Have a blocky day!', 'Bring an umbrella!', 'Great day to build!'][(R() * 3) | 0], 64 + Math.sin(t) * 2, 99, '#ffdd33', 9);
  },
  // fireworks over the town
  (ctx, t, R) => {
    const g = ctx.createLinearGradient(0, 0, 0, TV_H); g.addColorStop(0, '#05051a'); g.addColorStop(1, '#2a1a4a'); ctx.fillStyle = g; ctx.fillRect(0, 0, TV_W, TV_H);
    const cols = ['#ff4a4a', '#ffdd33', '#4aff8a', '#4ad0ff', '#ff6ae0', '#ffffff'];
    for (let n = 0; n < 4; n++) {
      const cyc = t / 1.6 + n * 0.25, i = Math.floor(cyc), k = cyc - i, h = tvHash(i, n, 3, 9), cx = 16 + h % 96, cy = 18 + (h >> 8) % 40, c = cols[(h >> 16) % cols.length];
      if (k < 0.3) tvBox(ctx, '#ffffcc', cx, 100 - (100 - cy) * (k / 0.3), 2, 4);
      else { const r = (k - 0.3) * 40; ctx.globalAlpha = 1 - (k - 0.3) / 0.7; for (let a = 0; a < 12; a++) tvBox(ctx, c, cx + Math.cos(a / 12 * TAU) * r, cy + Math.sin(a / 12 * TAU) * r + (k - 0.3) * 8, 2, 2); ctx.globalAlpha = 1; }
    }
    for (let i = 0; i < 8; i++) { const hh = 10 + (tvHash(i, 5, 5, 5) % 16); tvBox(ctx, '#0a0a14', i * 16, TV_H - hh, 15, hh); if (Math.sin(t + i) > 0) tvBox(ctx, '#ffd86a', i * 16 + 5, TV_H - hh + 4, 3, 3); }
  },
  // the baking show
  (ctx, t, R) => {
    for (let y = 0; y < 70; y += 8) for (let x = 0; x < TV_W; x += 8) tvBox(ctx, (x + y) % 16 ? '#e8f0f8' : '#d0e0f0', x, y, 8, 8);
    tvBox(ctx, '#8a5a32', 0, 70, TV_W, TV_H - 70); tvBox(ctx, '#a8744a', 0, 70, TV_W, 4);
    tvBox(ctx, '#f4f4f4', 34, 76, 60, 4);
    tvBox(ctx, '#f8c8d8', 40, 56, 48, 20); tvBox(ctx, '#ffffff', 40, 54, 48, 4); tvBox(ctx, '#e88aa8', 40, 64, 48, 3);
    for (let i = 0; i < 4; i++) { const cx = 48 + i * 10; tvBox(ctx, ['#4a8af0', '#f2cf3a', '#4ac860', '#e8304a'][i], cx, 44, 3, 10); tvBox(ctx, Math.sin(t * 15 + i) > 0 ? '#ffdd33' : '#ff8a1a', cx, 40 + (Math.sin(t * 9 + i) > 0 ? 0 : 1), 3, 4); }
    const n = Math.min(24, Math.floor(t * 2));
    for (let i = 0; i < n; i++) tvBox(ctx, ['#e8304a', '#4a8af0', '#f2cf3a', '#4ac860'][i % 4], 42 + (tvHash(i, 1, 2, 3) % 44), 57 + (tvHash(i, 4, 5, 6) % 16), 2, 1);
    tvText(ctx, 'CAKE TIME!', 64, 14, '#e8304a', 13);
  },
  // the big match
  (ctx, t, R) => {
    tvBox(ctx, '#3aa83a', 0, 0, TV_W, TV_H);
    for (let x = 0; x < TV_W; x += 16) tvBox(ctx, '#34983a', x, 0, 8, TV_H);
    ctx.strokeStyle = '#ffffff'; ctx.strokeRect(4.5, 16.5, TV_W - 9, TV_H - 21); ctx.beginPath(); ctx.moveTo(64, 16); ctx.lineTo(64, TV_H - 5); ctx.stroke(); ctx.beginPath(); ctx.arc(64, 60, 10, 0, TAU); ctx.stroke();
    tvBox(ctx, '#f4f4f4', 0, 48, 5, 24); tvBox(ctx, '#f4f4f4', TV_W - 5, 48, 5, 24);
    const bx = 64 + Math.sin(t * 0.9) * 50, by = 60 + Math.sin(t * 1.7) * 22, hop = Math.abs(Math.sin(t * 5)) * 3;
    for (const [px0, col] of [[30, '#e8304a'], [98, '#3a7ae0']]) { const px = px0 + (bx - px0) * 0.4, py = 60 + (by - 60) * 0.6; tvBox(ctx, '#f3c6a5', px - 3, py - 14, 6, 5); tvBox(ctx, col, px - 4, py - 9, 8, 8); tvBox(ctx, '#2a2a2a', px - 3, py - 1, 2, 5); tvBox(ctx, '#2a2a2a', px + 1, py - 1, 2, 5); }
    tvBox(ctx, '#ffffff', bx - 2, by - 2 - hop, 5, 5); tvBox(ctx, '#1a1a1a', bx, by - hop, 1, 1);
    tvBox(ctx, '#1a1a1a', 0, 0, TV_W, 13);
    const goals = Math.floor(t / 6);
    tvText(ctx, 'RED ' + (goals % 4) + ' - ' + (Math.floor(goals / 2) % 3) + ' BLUE', 64, 7, '#ffffff', 10);
  },
  // the dance party
  (ctx, t, R) => {
    const beat = Math.floor(t * 2);
    for (let y = 60; y < TV_H; y += 12) for (let x = 0; x < TV_W; x += 16) tvBox(ctx, ['#ff4a8a', '#4ad0ff', '#ffdd33', '#8aff4a'][(x / 16 + y / 12 + beat) & 3], x, y, 16, 12);
    tvBox(ctx, '#1a1030', 0, 0, TV_W, 60);
    for (let i = 0; i < 10; i++) { const a = t * 1.5 + i * 0.63; tvBox(ctx, '#ffffff', 64 + Math.cos(a) * 50, 10 + Math.abs(Math.sin(a * 1.3)) * 40, 2, 2); }
    ctx.fillStyle = '#c0c8d8'; ctx.beginPath(); ctx.arc(64, 8, 6, 0, TAU); ctx.fill();
    const sway = Math.sin(t * 6.28) * 6, up = Math.floor(t * 4) % 2;
    tvBox(ctx, '#7a4a2a', 56 + sway, 46, 16, 22); tvBox(ctx, '#d8a07a', 57 + sway, 28, 14, 16); tvBox(ctx, '#c08060', 62 + sway, 36, 4, 7);
    tvBox(ctx, '#1a1a1a', 59 + sway, 33, 2, 2); tvBox(ctx, '#1a1a1a', 67 + sway, 33, 2, 2);
    tvBox(ctx, '#7a4a2a', 48 + sway, up ? 34 : 50, 7, 14); tvBox(ctx, '#7a4a2a', 73 + sway, up ? 50 : 34, 7, 14);
    for (let i = 0; i < 3; i++) { const nx = 20 + i * 40 + Math.sin(t * 2 + i) * 6, ny = 52 - ((t * 20 + i * 15) % 40); tvBox(ctx, '#ffffff', nx, ny, 2, 7); tvBox(ctx, '#ffffff', nx - 3, ny + 5, 4, 3); tvBox(ctx, '#ffffff', nx + 2, ny, 3, 2); }   // music notes
  },
];
/* between shows: fuzz */
function tvFuzz(ctx, t) {
  const img = ctx.createImageData(TV_W, TV_H), d = img.data, r = tvRand((t * 1000) | 0);
  for (let i = 0; i < d.length; i += 4) { const v = (r() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  ctx.putImageData(img, 0, 0);
}
const _tv = M4.create();
SPECIAL_DRAW[B.TV] = (w, x, y, z, data, s, t, cam) => {
  if (!(data & 4)) return;
  const d2 = (x + 0.5 - cam.x) ** 2 + (z + 0.5 - cam.z) ** 2;
  if (d2 > 40 * 40) return;
  const f = data & 3, yaw = [0, -Math.PI / 2, Math.PI, Math.PI / 2][f];
  M4.identity(_tv);
  M4.translate(_tv, _tv, x + 0.5 - cam.x, y + 9 / 16 - cam.y, z + 0.5 - cam.z);
  M4.rotY(_tv, _tv, yaw);
  M4.translate(_tv, _tv, 0, 0, 0.503);
  M4.scale(_tv, _tv, 12 / 16, 10 / 16, 1);
  if (!dynFacing(_tv)) return;   // (from behind, the show isn't painted)
  const sh = tvShow(w, x, y, z), fuzz = sh.t < TV_FUZZ, fps = d2 < 18 * 18 ? 12 : 4;
  const layer = dynLayer('tv:' + w.map + ':' + x + ',' + y + ',' + z, sh.slot * 1000 + (fuzz ? -1 - Math.floor(sh.t * 20) : Math.floor(sh.t * fps)), ctx => {
    if (fuzz) tvFuzz(ctx, sh.t + sh.slot);
    else TV_SHOWS[sh.show](ctx, sh.t, tvRand(sh.seed));
  });
  if (layer < 0) return;
  gl.disable(gl.CULL_FACE);
  drawDyn(layer, _tv, 0, 0, 1, TV_H / 128, 1);   // (it glows: full brightness)
};

/* ---- coloring boards ---- */
const BOARD_N = 16;
const BOARD_COLORS = ['#ffffff', '#9e9e9e', '#4a4a4a', '#1a1a1a', '#e83a3a', '#f08a2a', '#f6d53a', '#8ae04a', '#3a9a3a', '#5ad0f0', '#3a6ae8', '#9a4ae0', '#f58ac8', '#8a5a32', '#f3c6a5', '#2a5a2a'];
const BOARD_PICS = [
  { name: 'Blank page', rows: [] },
  { name: 'Creeper', rows: ['################', '#..............#', '#..............#', '#..####..####..#', '#..####..####..#', '#..####..####..#', '#..####..####..#', '#......##......#', '#....######....#', '#....######....#', '#....######....#', '#....##..##....#', '#....##..##....#', '#..............#', '#..............#', '################'] },
  { name: 'Heart', rows: ['................', '................', '..####....####..', '.#....#..#....#.', '#......##......#', '#..............#', '#..............#', '#..............#', '.#............#.', '..#..........#..', '...#........#...', '....#......#....', '.....#....#.....', '......#..#......', '.......##.......', '................'] },
  { name: 'House', rows: ['.......##.......', '......#..#......', '.....#....#.....', '....#......#....', '...#........#...', '..#..........#..', '.##############.', '..#..........#..', '..#.###..###.#..', '..#.#.#..#.#.#..', '..#.###..###.#..', '..#..........#..', '..#....###...#..', '..#....#.#...#..', '..#....#.#...#..', '################'] },
  { name: 'Fish', rows: ['................', '................', '......#####.....', '....##.....##...', '#..#.........#..', '##.#.....##...#.', '#.#......##....#', '#..............#', '#..............#', '#.#............#', '##.#..........#.', '#..#.........#..', '....##.....##...', '......#####.....', '................', '................'] },
  { name: 'Star', rows: ['.......##.......', '.......##.......', '......#..#......', '......#..#......', '.....#....#.....', '######....######', '#..............#', '.#............#.', '..#..........#..', '...#........#...', '...#........#...', '..#....##....#..', '..#...#..#...#..', '.#...#....#...#.', '.#..#......#..#.', '####........####'] },
  { name: 'Smiley', rows: ['.....######.....', '...##......##...', '..#..........#..', '.#............#.', '.#...##..##...#.', '#....##..##....#', '#..............#', '#..............#', '#..#........#..#', '#...#......#...#', '.#...######...#.', '.#............#.', '..#..........#..', '...##......##...', '.....######.....', '................'] },
  { name: 'Pig', rows: ['................', '.##..........##.', '.#.#........#.#.', '.#..########..#.', '..#..........#..', '..#..##..##..#..', '..#..##..##..#..', '..#..........#..', '..#...####...#..', '..#..#.##.#..#..', '..#..#.##.#..#..', '..#...####...#..', '..#..........#..', '...##########...', '................', '................'] },
  { name: 'Sun', rows: ['.......##.......', '..#....##....#..', '...#........#...', '....##....##....', '.....#....#.....', '....#......#....', '###.#......#.###', '###.#......#.###', '....#......#....', '.....#....#.....', '....##....##....', '...#........#...', '..#....##....#..', '.......##.......', '................', '................'] },
  { name: 'Rocket', rows: ['.......##.......', '......#..#......', '.....#....#.....', '.....#....#.....', '.....#.##.#.....', '.....#.##.#.....', '.....#....#.....', '.....#....#.....', '....##....##....', '...#.#....#.#...', '..#..#....#..#..', '..#..#....#..#..', '..####....####..', '.....######.....', '......#..#......', '.......##.......'] },
  { name: 'Tree', rows: ['......####......', '....##....##....', '...#........#...', '..#..........#..', '.#............#.', '.#............#.', '.#............#.', '..#..........#..', '...##......##...', '.....##..##.....', '......#..#......', '......#..#......', '......#..#......', '......#..#......', '.....#....#.....', '################'] },
  { name: 'Boat', rows: ['................', '.......#........', '.......##.......', '.......#.#......', '.......#..#.....', '.......#...#....', '.......#....#...', '.......######...', '.......#........', '################', '.#............#.', '..#..........#..', '...##########...', '................', '..##..##..##..##', '##..##..##..##..'] },
];
const boardOutline = pic => { const rows = (BOARD_PICS[pic] || BOARD_PICS[0]).rows, o = new Uint8Array(256); for (let y = 0; y < rows.length; y++) for (let x = 0; x < 16; x++) if (rows[y][x] === '#') o[y * 16 + x] = 1; return o; };
const BOARD_BLANK = '.'.repeat(256);
const boardTile = (w, x, y, z) => { const t = w.tiles.get(tileKey(x, y, z)); return t && t.type === 'board' ? t : null; };
const cleanBoardPx = s => typeof s === 'string' && /^[0-9a-f.]{256}$/.test(s) ? s : null;
function setBoard(w, x, y, z, px, pic) {
  w.tiles.set(tileKey(x, y, z), { type: 'board', px: cleanBoardPx(px) || BOARD_BLANK, pic: clamp(pic | 0, 0, BOARD_PICS.length - 1) });   // (a new tile each time, so its picture is painted again)
}
/* the board's picture: paper, the colors, then the lines over them */
function paintBoard(ctx, t) {
  const o = boardOutline(t ? t.pic : 0), px = t ? t.px : BOARD_BLANK;
  ctx.fillStyle = '#f4f2ea'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 256; i++) {
    const x = (i & 15) * 8, y = (i >> 4) * 8;
    if (o[i]) { ctx.fillStyle = '#202020'; ctx.fillRect(x, y, 8, 8); continue; }
    const c = px[i];
    if (c !== '.') { ctx.fillStyle = BOARD_COLORS[parseInt(c, 16)]; ctx.fillRect(x, y, 8, 8); }
  }
}
const _bd = M4.create();
SPECIAL_DRAW[B.BOARD] = (w, x, y, z, data, s, t, cam) => {
  const P = PROG.entity, wall = data >= 16, yaw = wall ? [0, -Math.PI / 2, Math.PI, Math.PI / 2][data & 3] : (data & 15) * Math.PI / 8;
  const bright = brightAt(w, x + 0.5, y + 0.6, z + 0.5, s);
  entityBegin(texSkins);
  gl.uniform1f(P.u.uBright, bright);
  M4.identity(_bd);
  M4.translate(_bd, _bd, x + 0.5 - cam.x, y - cam.y, z + 0.5 - cam.z);
  M4.rotY(_bd, _bd, yaw);
  M4.scale(_bd, _bd, 1 / 16, 1 / 16, 1 / 16);
  gl.enable(gl.CULL_FACE);
  drawModel(MODELS[wall ? 'wall_board' : 'easel'], _bd, wall ? null : { leg3: [0.38, 0, 0] });
  M4.translate(_bd, _bd, 0, wall ? 8 : 12, wall ? -6.9 : 0.1);   // just in front of the board
  M4.scale(_bd, _bd, 16, 16, 1);
  if (!dynFacing(_bd)) return;   // (the picture can't be seen from behind)
  const tile = boardTile(w, x, y, z), layer = dynLayer('board:' + w.map + ':' + x + ',' + y + ',' + z, tile || 0, ctx => paintBoard(ctx, tile));
  if (layer >= 0) drawDyn(layer, _bd, 0, 0, 1, 1, bright);
};
/* the coloring screen */
const BOARDUI = { x: 0, y: 0, z: 0, open: false, px: null, pic: 0, color: 4, tool: 'brush', painting: false, newPic: 0 };
function openBoard(x, y, z) {
  const w = game.world, t = boardTile(w, x, y, z);
  if (ui.inv) closeInv();
  game.releasePointer();
  Object.assign(BOARDUI, { x, y, z, open: true, px: (t ? t.px : BOARD_BLANK).split(''), pic: t ? t.pic : 1, newPic: 0 });
  game.uiOpen = true;
  buildBoardUI();
  showScreen('scr-board');
}
function closeBoard() {
  if (!BOARDUI.open) return;
  BOARDUI.open = false; BOARDUI.painting = false;
  const { x, y, z } = BOARDUI, px = BOARDUI.px.join('');
  if (game.world && game.world.getBlock(x, y, z) === B.BOARD) {
    setBoard(game.world, x, y, z, px, BOARDUI.pic);
    if (MP.role === 'guest') MP.send({ t: 'board', x, y, z, px, pic: BOARDUI.pic });
    else if (MP.role === 'host') MP.broadcast({ t: 'board', x, y, z, px, pic: BOARDUI.pic, we: MP.we });
  }
  game.uiOpen = false;
  showScreen(null);
  game.releaseKeys();
  if (!game.touchOn && !game.dragLook) { game.requestPointer(); el('click-hint').hidden = !!document.pointerLockElement; }
}
function buildBoardUI() {
  const pal = el('board-palette');
  if (pal.children.length !== BOARD_COLORS.length) BOARD_COLORS.forEach((c, i) => {
    const b = h('button', { type: 'button', class: 'swatch', style: 'background:' + c, 'aria-label': 'Color ' + (i + 1) });
    b.addEventListener('click', () => { BOARDUI.color = i; if (BOARDUI.tool === 'eraser') BOARDUI.tool = 'brush'; sfx('click'); buildBoardUI(); });
    pal.appendChild(b);
  });
  Array.from(pal.children).forEach((b, i) => b.setAttribute('aria-pressed', BOARDUI.color === i ? 'true' : 'false'));   // (the same buttons, so the focus stays where it was)
  for (const tl of ['brush', 'fill', 'eraser']) el('btn-board-' + tl).setAttribute('aria-pressed', BOARDUI.tool === tl ? 'true' : 'false');
  el('board-pic-name').textContent = BOARD_PICS[BOARDUI.pic].name;
  el('board-new-note').hidden = !BOARDUI.newPic;
  drawBoardUI();
}
function drawBoardUI() {
  const cv = el('board-canvas'), ctx = cv.getContext('2d'), n = cv.width / 16, o = boardOutline(BOARDUI.pic);
  ctx.fillStyle = '#f4f2ea'; ctx.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < 256; i++) {
    const x = (i & 15) * n, y = (i >> 4) * n, c = BOARDUI.px[i];
    if (o[i]) { ctx.fillStyle = '#202020'; ctx.fillRect(x, y, n, n); continue; }
    if (c !== '.') { ctx.fillStyle = BOARD_COLORS[parseInt(c, 16)]; ctx.fillRect(x, y, n, n); }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
  for (let i = 1; i < 16; i++) { ctx.beginPath(); ctx.moveTo(i * n + 0.5, 0); ctx.lineTo(i * n + 0.5, cv.height); ctx.moveTo(0, i * n + 0.5); ctx.lineTo(cv.width, i * n + 0.5); ctx.stroke(); }
}
/* paint (or fill, or rub out) the square under a finger or the mouse */
function boardAt(e) {
  const cv = el('board-canvas'), r = cv.getBoundingClientRect();
  const cx = Math.floor((e.clientX - r.left) / r.width * 16), cy = Math.floor((e.clientY - r.top) / r.height * 16);
  return cx >= 0 && cy >= 0 && cx < 16 && cy < 16 ? cy * 16 + cx : -1;
}
function boardPaint(i, first) {
  if (i < 0) return;
  const o = boardOutline(BOARDUI.pic), px = BOARDUI.px, want = BOARDUI.tool === 'eraser' ? '.' : BOARDUI.color.toString(16);
  if (o[i]) return;
  if (BOARDUI.tool === 'fill') {
    if (!first || px[i] === want) return;
    const from = px[i], stack = [i];   // fill the part this square is in (lines stop it)
    while (stack.length) {
      const j = stack.pop();
      if (o[j] || px[j] !== from) continue;
      px[j] = want;
      const jx = j & 15, jy = j >> 4;
      if (jx > 0) stack.push(j - 1); if (jx < 15) stack.push(j + 1); if (jy > 0) stack.push(j - 16); if (jy < 15) stack.push(j + 16);
    }
    sfx('boardFill');
  } else {
    if (px[i] === want) return;
    px[i] = want;
    if (first) sfx('boardDab');
  }
  BOARDUI.newPic = 0; el('board-new-note').hidden = true;
  drawBoardUI();
}
function boardTurnPage(dir) {
  const painted = BOARDUI.px.some(c => c !== '.');
  if (painted && BOARDUI.newPic !== dir) { BOARDUI.newPic = dir; el('board-new-note').hidden = false; sfx('click'); return; }   // tap again to really change it
  BOARDUI.pic = (BOARDUI.pic + dir + BOARD_PICS.length) % BOARD_PICS.length;
  BOARDUI.px = BOARD_BLANK.split(''); BOARDUI.newPic = 0;
  sfx('pageTurn');
  buildBoardUI();
}
function setupBoardScreen() {
  const cv = el('board-canvas');
  cv.addEventListener('pointerdown', e => { e.preventDefault(); BOARDUI.painting = true; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } boardPaint(boardAt(e), true); });
  cv.addEventListener('pointermove', e => { if (BOARDUI.painting && BOARDUI.tool !== 'fill') boardPaint(boardAt(e), false); });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => { BOARDUI.painting = false; });
  for (const tl of ['brush', 'fill', 'eraser']) el('btn-board-' + tl).addEventListener('click', () => { BOARDUI.tool = tl; sfx('click'); buildBoardUI(); });
  el('btn-board-prev').addEventListener('click', () => boardTurnPage(-1));
  el('btn-board-next').addEventListener('click', () => boardTurnPage(1));
  el('btn-board-clear').addEventListener('click', () => { BOARDUI.px = BOARD_BLANK.split(''); sfx('click'); buildBoardUI(); });
  el('btn-board-done').addEventListener('click', () => { initAudio(); sfx('click'); closeBoard(); });
}
