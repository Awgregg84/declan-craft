/* ===================== Procedural pixel art ===================== */
const TILE = {};          // name -> texture array layer
const TILE_NAMES = [];
const TILE_DATA = [];     // RGBA 16x16 per layer
const C = hexRGB;
const mulc = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

class Pix {
  constructor(w, hgt, seed) { this.w = w; this.h = hgt; this.d = new Uint8ClampedArray(w * hgt * 4); this.r = mulberry32(seed); }
  px(x, y, c, a) {
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = ((y | 0) * this.w + (x | 0)) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = a === undefined ? (c[3] === undefined ? 255 : c[3]) : a;
  }
  get(x, y) { const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; }
  alpha(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.d[(y * this.w + x) * 4 + 3]; }
  fill(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = fn(x, y); if (c) this.px(x, y, c); } }
  rect(x0, y0, w, hgt, c) { for (let y = y0; y < y0 + hgt; y++) for (let x = x0; x < x0 + w; x++) this.px(x, y, typeof c === 'function' ? c(x - x0, y - y0) : c); }
  ri(n) { return (this.r() * n) | 0; }
  pick(a) { return a[(this.r() * a.length) | 0]; }
  jit(c, amt) { const k = (this.r() * 2 - 1) * amt; return [c[0] + k, c[1] + k, c[2] + k]; }
}
function vfield(r, g) {
  const v = new Float32Array(g * g);
  for (let i = 0; i < g * g; i++) v[i] = r();
  const at = (a, b) => v[(((b % g) + g) % g) * g + (((a % g) + g) % g)];
  return (x, y) => {
    const fx = ((x + 0.5) / 16) * g, fy = ((y + 0.5) / 16) * g;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return lerp(lerp(at(x0, y0), at(x0 + 1, y0), sx), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), sx), sy);
  };
}
function vor(r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([r() * 16, r() * 16, r()]);
  return (x, y) => {
    let d1 = 1e9, d2 = 1e9, id = 0, bx = 0, by = 0;
    for (let i = 0; i < n; i++) for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
      const dx = x + 0.5 - pts[i][0] - ox, dy = y + 0.5 - pts[i][1] - oy, d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; id = i; bx = dx; by = dy; } else if (d < d2) d2 = d;
    }
    return { d1: Math.sqrt(d1), d2: Math.sqrt(d2), id, v: pts[id][2], dx: bx, dy: by };
  };
}
function addTile(name, fn) {
  const p = new Pix(16, 16, hashString(name));
  fn(p);
  TILE[name] = TILE_NAMES.length; TILE_NAMES.push(name); TILE_DATA.push(p.d);
}

/* ---------- reusable painters ---------- */
function paintDirt(p) {
  const pal = [C('#8a5c34'), C('#7b5130'), C('#976a41'), C('#6d4628'), C('#855733')];
  p.fill(() => p.pick(pal));
  for (let k = 0; k < 12; k++) p.px(p.ri(16), p.ri(16), p.r() < 0.5 ? C('#5c3b20') : C('#a57a4c'));
}
function paintStone(p, tint) {
  const f = vfield(p.r, 4);
  p.fill((x, y) => { const v = 110 + f(x, y) * 34 + (p.r() * 14 - 7); const c = [v, v, v]; return tint ? mixc(c, tint, 0.12) : c; });
  for (let k = 0; k < 7; k++) { const x = p.ri(16), y = p.ri(16), len = 2 + p.ri(3); for (let i = 0; i < len; i++) p.px((x + i) & 15, y, [94, 94, 94]); }
  for (let k = 0; k < 7; k++) p.px(p.ri(16), p.ri(16), [150, 150, 150]);
}
function paintCobble(p, moss) {
  const v = vor(p.r, 9), mf = vfield(p.r, 3);
  p.fill((x, y) => {
    const q = v(x, y);
    if (q.d2 - q.d1 < 1.15) { const g = 62 + p.r() * 14; return [g, g, g]; }
    let val = 98 + q.v * 62 + (p.r() * 12 - 6);
    if (q.dx + q.dy < -1.2) val += 20; else if (q.dx + q.dy > 1.6) val -= 16;
    let c = [val, val, val];
    if (moss && mf(x, y) > 0.55 && p.r() < 0.85) c = mixc(c, p.pick([C('#4c7a2c'), C('#5e8f36'), C('#3f6a24')]), 0.8);
    return c;
  });
}
function paintBark(p, pal, groove) {
  for (let x = 0; x < 16; x++) {
    const base = p.pick(pal), sh = 0.85 + p.r() * 0.25;
    for (let y = 0; y < 16; y++) p.px(x, y, mulc(p.jit(base, 6), sh));
  }
  for (let k = 0; k < 5; k++) { const x = p.ri(16), y0 = p.ri(16), len = 3 + p.ri(8); for (let i = 0; i < len; i++) p.px(x, (y0 + i) & 15, groove); }
}
function paintRings(p, bark, light, dark) {
  p.fill((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.5) return p.jit(bark, 8);
    const ring = Math.floor(d + p.r() * 0.6);
    return p.jit(ring % 2 ? dark : light, 5);
  });
}
function paintPlanks(p, base) {
  const b = C(base);
  for (let row = 0; row < 4; row++) {
    const seam = p.ri(16), tone = 0.92 + p.r() * 0.14;
    for (let y = row * 4; y < row * 4 + 4; y++) for (let x = 0; x < 16; x++) {
      let c = mulc(b, tone * (0.95 + p.r() * 0.08));
      if (y === row * 4 + 3) c = mulc(b, 0.62);
      else if (x === seam) c = mulc(b, 0.7);
      else if (p.r() < 0.07) c = mulc(b, 0.84);
      p.px(x, y, c);
    }
  }
}
function paintLeaves(p, pal) {
  p.fill(() => (p.r() < 0.17 ? null : p.jit(p.pick(pal), 9)));
  for (let k = 0; k < 10; k++) p.px(p.ri(16), p.ri(16), mulc(pal[0], 0.7));
}
function paintOre(p, a, b, glint) {
  paintStone(p);
  const n = 5 + p.ri(2);
  for (let k = 0; k < n; k++) {
    const cx = 2 + p.ri(12), cy = 2 + p.ri(12);
    const pts = [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [2, 1], [1, 2]];
    const cnt = 3 + p.ri(3);
    for (let i = 0; i < cnt; i++) { const [dx, dy] = pts[i]; p.px(cx + dx, cy + dy, i === 0 && glint ? glint : (i % 3 === 2 ? b : a)); }
  }
}
function paintMetal(p, base, hi, lo, line) {
  p.fill((x, y) => {
    if (x === 0 || y === 0) return hi;
    if (x === 15 || y === 15) return lo;
    let c = p.jit(base, 5);
    if (line && (x === 1 || y === 1)) c = mixc(c, hi, 0.5);
    if (line && (x === 14 || y === 14)) c = mixc(c, lo, 0.5);
    return c;
  });
}
function paintWool(p, hexc) {
  const b = C(hexc);
  p.fill((x, y) => { let c = mulc(b, 0.93 + p.r() * 0.12); if ((x * 3 + y * 5) % 7 === 0) c = mulc(c, 0.9); return c; });
}
function glyphs(p, x0, y0, rows, col) {
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') p.px(x0 + x, y0 + y, col); });
}
/* sprite rasterizer: masks from capsules and polygons, shaded with an outline */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}
function inPoly(px, py, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function mask(test) { const m = new Uint8Array(256); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) m[y * 16 + x] = test(x + 0.5, y + 0.5) ? 1 : 0; return m; }
const capsule = (pts, w) => (x, y) => { for (let i = 0; i < pts.length - 1; i++) if (segDist(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < w / 2) return true; return false; };
const poly = pts => (x, y) => inPoly(x, y, pts);
const circle = (cx, cy, r) => (x, y) => (x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r;
function shadeMask(p, m, pal, outline) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && m[y * 16 + x];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!m[y * 16 + x]) continue;
    let c = pal[0];
    if (!inside(x - 1, y) || !inside(x, y - 1)) c = pal[1];
    if (!inside(x + 1, y) || !inside(x, y + 1)) c = pal[2];
    p.px(x, y, c);
  }
  if (outline) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (m[y * 16 + x] || p.alpha(x, y)) continue;
    if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) p.px(x, y, pal[3]);
  }
}
const PAL = {
  stick: [C('#8a6a3c'), C('#a8844e'), C('#5a4020'), C('#2e2010')],
  wood: [C('#a8864f'), C('#c8a66a'), C('#6b5132'), C('#3a2a16')],
  stone: [C('#8f8f8f'), C('#b3b3b3'), C('#5f5f5f'), C('#2c2c2c')],
  iron: [C('#dcdcdc'), C('#ffffff'), C('#9a9a9a'), C('#444444')],
  diamond: [C('#4fe3df'), C('#bafff9'), C('#1f9fa6'), C('#0e4a50')],
};

/* ---------- block tiles ---------- */
function buildTiles() {
  addTile('grass_top', p => {
    const f = vfield(p.r, 4), pal = [C('#5a9a36'), C('#65a83f'), C('#4f8a2e'), C('#70b449'), C('#5fa03a')];
    p.fill((x, y) => mulc(p.pick(pal), 0.9 + f(x, y) * 0.2));
  });
  addTile('grass_side', p => {
    paintDirt(p);
    const pal = [C('#5a9a36'), C('#65a83f'), C('#4f8a2e'), C('#70b449')];
    for (let x = 0; x < 16; x++) { const len = 3 + (p.r() < 0.55 ? 1 : 0) + (p.r() < 0.25 ? 1 : 0); for (let y = 0; y < len; y++) p.px(x, y, p.pick(pal)); }
  });
  addTile('grass_side_snow', p => {
    paintDirt(p);
    for (let x = 0; x < 16; x++) { const len = 3 + (p.r() < 0.5 ? 1 : 0) + (p.r() < 0.3 ? 1 : 0); for (let y = 0; y < len; y++) p.px(x, y, p.jit(y === len - 1 ? C('#d6e2ea') : C('#f1f6f9'), 5)); }
  });
  addTile('dirt', paintDirt);
  addTile('stone', p => paintStone(p));
  addTile('cobblestone', p => paintCobble(p, false));
  addTile('mossy_cobblestone', p => paintCobble(p, true));
  addTile('bedrock', p => {
    const v = vor(p.r, 12);
    p.fill((x, y) => { const q = v(x, y); const g = q.d2 - q.d1 < 0.9 ? 28 : 40 + q.v * 80 + p.r() * 14; return [g, g, g]; });
  });
  addTile('sand', p => {
    const pal = [C('#dbcf8e'), C('#e3d69b'), C('#d2c380'), C('#e8dca6')];
    p.fill(() => p.pick(pal));
    for (let k = 0; k < 8; k++) p.px(p.ri(16), p.ri(16), C('#bfae70'));
  });
  addTile('gravel', p => {
    const v = vor(p.r, 16), pal = [C('#8c8580'), C('#7a736e'), C('#9d9791'), C('#6c6560'), C('#a09080')];
    p.fill((x, y) => { const q = v(x, y); if (q.d2 - q.d1 < 0.7) return C('#4f4a46'); const c = pal[q.id % pal.length]; return q.dx + q.dy < -1 ? mulc(c, 1.12) : c; });
  });
  addTile('clay', p => { p.fill(() => p.jit(C('#a0a6b3'), 7)); for (let k = 0; k < 10; k++) p.px(p.ri(16), p.ri(16), C('#8a90a0')); });
  addTile('sandstone', p => {
    p.fill((x, y) => {
      if (y < 3) return p.jit(C('#e2d6a2'), 5);
      if (y === 3) return C('#c9b77e');
      if (y > 11) return p.jit(y === 12 ? C('#c4b27a') : C('#d4c48c'), 5);
      return p.jit(C('#d9ca92'), 5);
    });
  });
  addTile('sandstone_top', p => p.fill(() => p.jit(C('#dfd29a'), 6)));
  addTile('sandstone_bottom', p => { p.fill(() => p.jit(C('#d6c68c'), 7)); for (let k = 0; k < 12; k++) p.px(p.ri(16), p.ri(16), C('#bba972')); });
  addTile('oak_log', p => paintBark(p, [C('#6b5132'), C('#5e472b'), C('#76593a')], C('#43321d')));
  addTile('oak_log_top', p => paintRings(p, C('#5e472b'), C('#b8945f'), C('#9c7a4a')));
  addTile('birch_log', p => {
    p.fill((x, y) => p.jit(x % 5 === 0 ? C('#cfcfc4') : C('#e4e4dc'), 5));
    for (let k = 0; k < 9; k++) { const x = p.ri(14), y = p.ri(16), len = 2 + p.ri(3); for (let i = 0; i < len; i++) p.px(x + i, y, C('#2e2e2a')); }
  });
  addTile('birch_log_top', p => paintRings(p, C('#e0e0d6'), C('#d8c28c'), C('#c2a870')));
  addTile('spruce_log', p => paintBark(p, [C('#3f2a17'), C('#4a321c'), C('#35230f')], C('#241709')));
  addTile('spruce_log_top', p => paintRings(p, C('#3f2a17'), C('#7a5a36'), C('#654a2c')));
  addTile('oak_planks', p => paintPlanks(p, '#a8864f'));
  addTile('birch_planks', p => paintPlanks(p, '#d2c08a'));
  addTile('spruce_planks', p => paintPlanks(p, '#72512f'));
  addTile('oak_leaves', p => paintLeaves(p, [C('#3e7d24'), C('#4a8c2c'), C('#357020'), C('#56993a')]));
  addTile('birch_leaves', p => paintLeaves(p, [C('#6a9a3a'), C('#78a846'), C('#5c8a32'), C('#86b454')]));
  addTile('spruce_leaves', p => paintLeaves(p, [C('#2f5c36'), C('#386a40'), C('#28502e'), C('#42764a')]));
  addTile('glass', p => {
    p.fill((x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? (x + y) % 5 === 0 ? C('#ffffff') : C('#cfe8f2') : null);
    [[3, 6], [4, 5], [5, 4], [6, 3], [4, 7], [9, 12], [10, 11], [11, 10]].forEach(([x, y]) => p.px(x, y, C('#f4fbff')));
  });
  addTile('coal_ore', p => paintOre(p, C('#1f1f1f'), C('#3a3a3a')));
  addTile('iron_ore', p => paintOre(p, C('#d9a98a'), C('#b07d5c'), C('#f0ccb0')));
  addTile('gold_ore', p => paintOre(p, C('#fce94f'), C('#d19f1c'), C('#fffbc0')));
  addTile('diamond_ore', p => paintOre(p, C('#5ff0f5'), C('#1fb0bc'), C('#e0ffff')));
  addTile('coal_block', p => paintMetal(p, C('#1e1e1e'), C('#3a3a3a'), C('#0e0e0e'), false));
  addTile('iron_block', p => paintMetal(p, C('#dadada'), C('#f6f6f6'), C('#a0a0a0'), true));
  addTile('gold_block', p => paintMetal(p, C('#f5d43c'), C('#fff48c'), C('#c49a18'), true));
  addTile('diamond_block', p => {
    paintMetal(p, C('#62e6de'), C('#caffff'), C('#26a9a6'), true);
    for (let i = 2; i < 14; i++) { p.px(i, i, C('#9ef7f2')); p.px(15 - i, i, C('#48cfc9')); }
  });
  addTile('emerald_ore', p => paintOre(p, C('#17dd62'), C('#0b9c44'), C('#b4ffd2')));
  addTile('emerald_block', p => {
    paintMetal(p, C('#2ed36c'), C('#a6ffc6'), C('#0e8c3c'), true);
    for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) { const d = Math.abs(x - 7.5) + Math.abs(y - 7.5); if (d > 4.4 && d < 5.6) p.px(x, y, C('#15a44c')); else if (d < 2) p.px(x, y, C('#7df0a8')); }
  });
  addTile('bricks', p => {
    const cols = [C('#9c4a38'), C('#a8543f'), C('#8f4232'), C('#b05e46')];
    p.fill((x, y) => {
      if (y % 4 === 3) return p.jit(C('#b5aca1'), 6);
      const row = y >> 2, xx = (x + (row % 2) * 4) & 15;
      if (xx % 8 === 7) return p.jit(C('#b5aca1'), 6);
      const brick = row * 2 + (xx >> 3);
      const c = cols[(brick * 7 + 3) % 4];
      return p.jit(y % 4 === 0 ? mulc(c, 1.1) : c, 6);
    });
  });
  addTile('stone_bricks', p => {
    p.fill((x, y) => {
      const row = y >> 3, xx = (x + (row ? 4 : 0)) & 15;
      if (y % 8 === 7 || xx === 15) return p.jit(C('#565656'), 4);
      let v = 122 + p.r() * 12;
      if (y % 8 === 0 || xx === 0) v += 18; else if (y % 8 === 6 || xx === 14) v -= 18;
      return [v, v, v];
    });
  });
  addTile('obsidian', p => {
    const f = vfield(p.r, 5);
    p.fill((x, y) => { const n = f(x, y); let c = mixc(C('#0f0a18'), C('#2b1a40'), n); if (p.r() < 0.06) c = C('#53357a'); return c; });
  });
  addTile('glowstone', p => {
    const v = vor(p.r, 7);
    p.fill((x, y) => { const q = v(x, y); if (q.d2 - q.d1 < 1) return C('#8a5e22'); return mixc(C('#fff0a8'), C('#e3a13c'), clamp(q.d1 / 5, 0, 1)); });
  });
  addTile('snow', p => p.fill(() => p.jit(p.r() < 0.2 ? C('#e2eaf2') : C('#f4f8fb'), 4)));
  addTile('ice', p => {
    p.fill((x, y) => { const c = p.jit(C('#8fb7f7'), 6); c[3] = 185; return c; });
    for (let k = 0; k < 4; k++) { const x0 = p.ri(16), y0 = p.ri(16), len = 3 + p.ri(4); for (let i = 0; i < len; i++) p.px((x0 + i) & 15, (y0 + i) & 15, [220, 236, 255], 210); }
  });
  addTile('water', p => {
    p.fill((x, y) => { const w = Math.sin((x + y * 0.5) * 0.8) * 0.5 + 0.5; const c = mixc(C('#2c5ed4'), C('#4a7ee8'), w * 0.6 + p.r() * 0.2); c[3] = 175; return c; });
  });
  addTile('lava', p => {
    const f = vfield(p.r, 4), g = vfield(p.r, 8);
    p.fill((x, y) => { const n = f(x, y) * 0.7 + g(x, y) * 0.3; if (n > 0.62) return mixc(C('#ffb020'), C('#fff080'), (n - 0.62) * 2.5); if (n < 0.35) return mixc(C('#b83a0c'), C('#d9520f'), n / 0.35); return mixc(C('#e0620f'), C('#ff9a1e'), (n - 0.35) / 0.27); });
  });
  // ---- the Nether ----
  const paintNetherrack = p => {
    const f = vfield(p.r, 4), g = vfield(p.r, 8);
    p.fill((x, y) => {
      let c = mixc(C('#6a1818'), C('#a23a32'), f(x, y) * 0.65 + g(x, y) * 0.35);
      const k = p.r();
      if (k < 0.1) c = mixc(c, C('#b04a40'), 0.55); else if (k < 0.18) c = mixc(c, C('#300808'), 0.55);
      return c;
    });
  };
  addTile('netherrack', paintNetherrack);
  addTile('nether_quartz_ore', p => {
    paintNetherrack(p);
    for (let k = 0; k < 6; k++) {
      const cx = 1 + p.ri(13), cy = 1 + p.ri(13), horiz = p.r() < 0.5;
      for (let i = 0; i < 3; i++) p.px(cx + (horiz ? i : 0), cy + (horiz ? 0 : i), i === 1 ? C('#ffffff') : C('#e6d9c8'));
      p.px(cx + (horiz ? 1 : 1), cy + (horiz ? 1 : 1), C('#bfae9c'));
    }
  });
  addTile('soul_sand', p => {
    p.fill(() => p.jit(p.pick([C('#51402f'), C('#5b4735'), C('#4a3a2a'), C('#624e3b')]), 6));
    for (const [x, y] of [[2, 3], [9, 9]]) {   // two wailing faces
      const d = C('#2a1e14');
      p.px(x, y, d); p.px(x + 3, y, d);
      p.rect(x + 1, y + 2, 2, 2, d);
      p.px(x, y + 1, C('#3a2c1e')); p.px(x + 3, y + 1, C('#3a2c1e'));
    }
  });
  addTile('quartz_block_side', p => p.fill((x, y) => {
    let v = 228 + p.r() * 10;
    if (x === 0 || y === 0) v += 10; else if (x === 15 || y === 15) v -= 22;
    return [v, v - 5, v - 12];
  }));
  addTile('quartz_block_top', p => p.fill((x, y) => {
    let v = 232 + p.r() * 8;
    if (x === 0 || y === 0) v += 8; else if (x === 15 || y === 15) v -= 20;
    else if (x === 2 || y === 2 || x === 13 || y === 13) v -= 9;
    return [v, v - 5, v - 12];
  }));
  addTile('nether_bricks', p => p.fill((x, y) => {
    const row = y >> 2, xx = (x + (row % 2 ? 4 : 0)) & 15;
    if (y % 4 === 3 || xx % 8 === 7) return p.jit(C('#1c0b0e'), 3);
    let c = p.jit(C('#46171b'), 6);
    if (y % 4 === 0 || xx % 8 === 0) c = mixc(c, C('#6c2b30'), 0.5);
    return c;
  }));
  addTile('nether_portal', p => {
    const f = vfield(p.r, 4), g = vfield(p.r, 8);
    p.fill((x, y) => {
      const swirl = Math.sin(TAU * (x / 16 * 2 + y / 16) + f(x, y) * 5) * 0.5 + 0.5;   // repeats every 16 pixels, so it can scroll
      const n = swirl * 0.6 + g(x, y) * 0.4;
      const c = mixc(C('#3a0a8a'), C('#c070ff'), n);
      c[3] = 175 + Math.round(n * 55);
      return c;
    });
  });
  addTile('cactus_side', p => {
    p.fill((x, y) => {
      if (x === 0 || x === 15) return null;
      if (x === 1 || x === 14) return p.jit(C('#1f5c22'), 4);
      return p.jit([3, 7, 11].includes(x) ? C('#4ea650') : C('#2f7d32'), 5);
    });
    for (let k = 0; k < 8; k++) p.px([3, 7, 11][p.ri(3)], p.ri(16), C('#dbe8c4'));
  });
  addTile('cactus_top', p => p.fill((x, y) => {
    if (x === 0 || x === 15 || y === 0 || y === 15) return null;
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    return p.jit(d > 5.5 ? C('#2f7d32') : d > 3.5 ? C('#4ea650') : C('#3a8c3c'), 5);
  }));
  addTile('cactus_bottom', p => p.fill((x, y) => (x === 0 || x === 15 || y === 0 || y === 15) ? null : p.jit(C('#3a7a38'), 6)));
  addTile('tnt_side', p => {
    p.fill((x, y) => {
      if (y >= 4 && y <= 11) return p.jit(C('#e8e6e0'), 4);
      return p.jit(x % 4 === 0 ? C('#a02820') : C('#cc352b'), 6);
    });
    const k = C('#1b1b1b');
    glyphs(p, 1, 5, ['###', '.#.', '.#.', '.#.', '.#.'], k);
    glyphs(p, 6, 5, ['#..#', '##.#', '#.##', '#..#', '#..#'], k);
    glyphs(p, 12, 5, ['###', '.#.', '.#.', '.#.', '.#.'], k);
  });
  addTile('tnt_top', p => {
    p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 2) return C('#5f5f5f'); if (d < 3) return C('#333333'); return p.jit((((x >> 2) + (y >> 2)) % 2) ? C('#c8342a') : C('#b02c22'), 6); });
    p.px(7, 7, C('#1b1b1b')); p.px(8, 8, C('#1b1b1b'));
  });
  addTile('tnt_bottom', p => p.fill((x, y) => p.jit((x % 4 === 0 || y % 4 === 0) ? C('#9a261e') : C('#c0322a'), 6)));
  addTile('crafting_table_top', p => {
    paintPlanks(p, '#a8864f');
    p.fill((x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? C('#5a3f22') : ((x === 5 || x === 10 || y === 5 || y === 10) && x > 1 && x < 14 && y > 1 && y < 14) ? C('#6b4e2c') : null);
  });
  addTile('crafting_table_side', p => {
    paintPlanks(p, '#a8864f');
    p.rect(0, 0, 16, 3, (x, y) => y === 2 ? C('#4a3219') : p.jit(C('#6b4e2c'), 5));
    p.rect(3, 5, 2, 8, C('#6b5132')); p.rect(2, 5, 4, 2, C('#9a9a9a'));
    p.rect(9, 5, 5, 4, (x, y) => (y === 3 && x % 2 === 0) ? null : C('#b0b0b0')); p.rect(12, 9, 2, 4, C('#6b5132'));
  });
  addTile('crafting_table_front', p => {
    paintPlanks(p, '#a8864f');
    p.rect(0, 0, 16, 3, (x, y) => y === 2 ? C('#4a3219') : p.jit(C('#6b4e2c'), 5));
    p.rect(3, 6, 10, 2, C('#9a9a9a')); p.rect(7, 8, 2, 6, C('#6b5132'));
  });
  const furnaceBase = p => {
    p.fill((x, y) => { let v = 118 + p.r() * 16; if (x === 0 || y === 0) v += 16; if (x === 15 || y === 15) v -= 26; return [v, v, v]; });
  };
  addTile('furnace_side', furnaceBase);
  addTile('furnace_top', p => { furnaceBase(p); p.rect(2, 2, 12, 12, (x, y) => (x === 0 || y === 0 || x === 11 || y === 11) ? C('#6a6a6a') : null); });
  addTile('furnace_front', p => {
    furnaceBase(p);
    p.rect(4, 3, 8, 1, C('#4a4a4a')); p.rect(4, 5, 8, 1, C('#4a4a4a'));
    p.rect(3, 8, 10, 7, (x, y) => (x === 0 || x === 9 || y === 0) ? C('#505050') : C('#161616'));
  });
  addTile('furnace_front_lit', p => {
    furnaceBase(p);
    p.rect(4, 3, 8, 1, C('#4a4a4a')); p.rect(4, 5, 8, 1, C('#4a4a4a'));
    p.rect(3, 8, 10, 7, (x, y) => (x === 0 || x === 9 || y === 0) ? C('#505050') : y > 3 ? p.pick([C('#ffcf40'), C('#ff9a1e'), C('#ffe070')]) : y > 1 ? p.pick([C('#ff8a1e'), C('#d9420f'), C('#161616')]) : C('#3a1a0a'));
  });
  const chestBase = (p, front) => {
    p.fill((x, y) => {
      if (x === 0 || y === 0 || x === 15 || y === 15) return C('#3f2a14');
      if (y === 5) return C('#3f2a14');
      return p.jit(y < 5 ? C('#b07c40') : C('#a1702f'), 6);
    });
    if (front) { p.rect(7, 3, 2, 4, C('#d6d6d6')); p.px(7, 6, C('#5a5a5a')); p.px(8, 6, C('#5a5a5a')); }
  };
  addTile('chest_front', p => chestBase(p, true));
  addTile('chest_side', p => chestBase(p, false));
  addTile('chest_top', p => p.fill((x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? C('#3f2a14') : p.jit(C('#b07c40'), 6)));
  addTile('bookshelf', p => {
    paintPlanks(p, '#a8864f');
    const books = [C('#b33a3a'), C('#3a6ab3'), C('#3ab35a'), C('#d8b23a'), C('#7a3ab3'), C('#d86a3a'), C('#e0e0d0')];
    for (const y0 of [1, 9]) {
      p.rect(0, y0, 16, 6, C('#3a2a1a'));
      let x = 1;
      while (x < 15) { const w = 1 + p.ri(2), hgt = 4 + p.ri(2), c = p.pick(books); for (let i = 0; i < w && x < 15; i++, x++) for (let y = 0; y < hgt; y++) p.px(x, y0 + 6 - hgt + y, y === 0 ? mulc(c, 1.2) : c); if (p.r() < 0.3) x++; }
    }
  });
  const pumpkinSide = p => p.fill((x, y) => p.jit(x % 4 === 0 ? C('#c26d10') : x % 4 === 2 ? C('#f2a13a') : C('#e3891d'), 5));
  addTile('pumpkin_side', pumpkinSide);
  addTile('pumpkin_top', p => {
    p.fill((x, y) => { const a = Math.atan2(y - 7.5, x - 7.5); return p.jit(Math.floor((a + Math.PI) * 2.5) % 2 ? C('#e3891d') : C('#c97614'), 5); });
    p.rect(7, 6, 2, 3, C('#5f5a1e'));
  });
  const face = (p, col) => {
    pumpkinSide(p);
    glyphs(p, 3, 4, ['.#...', '###..'], col); glyphs(p, 9, 4, ['...#.', '..###'], col);
    glyphs(p, 3, 9, ['##########', '#.##..##.#', '..#....#..'].map(s => s.slice(0, 10)), col);
  };
  addTile('pumpkin_face', p => face(p, C('#3a1f05')));
  addTile('jack_o_lantern', p => face(p, C('#ffd84a')));
  addTile('torch', p => {
    for (let y = 8; y < 16; y++) { p.px(7, y, C('#8a6a3c')); p.px(8, y, C('#6b4f2a')); }
    p.px(7, 6, C('#fff6c0')); p.px(8, 6, C('#ffd860')); p.px(7, 7, C('#ffb030')); p.px(8, 7, C('#ff8a20'));
  });
  addTile('tall_grass', p => {
    const pal = [C('#5a9a36'), C('#4a8a2a'), C('#6aaa46'), C('#3f7a25')];
    for (let k = 0; k < 10; k++) {
      let x = 1 + p.ri(14); const hgt = 5 + p.ri(8), lean = p.r() < 0.5 ? -1 : 1, c = p.pick(pal);
      for (let i = 0; i < hgt; i++) { p.px(x, 15 - i, c); if (i > 2 && p.r() < 0.25) x += lean; }
    }
  });
  const stem = p => { for (let y = 8; y < 16; y++) p.px(7, y, C('#3f7f25')); p.px(6, 12, C('#4a8c2c')); p.px(5, 11, C('#4a8c2c')); p.px(8, 13, C('#4a8c2c')); p.px(9, 12, C('#4a8c2c')); };
  addTile('dandelion', p => { stem(p); p.rect(6, 5, 3, 3, C('#ffe030')); p.px(7, 4, C('#ffe030')); p.px(5, 6, C('#ffe030')); p.px(9, 6, C('#ffe030')); p.px(7, 6, C('#f0a020')); });
  addTile('poppy', p => { stem(p); p.rect(5, 4, 5, 4, C('#d52b1e')); p.px(5, 4, null); p.rect(6, 3, 3, 1, C('#e8483a')); p.px(7, 5, C('#2b2b2b')); p.px(9, 7, C('#b01e14')); });
  addTile('cornflower', p => { stem(p); p.rect(6, 4, 3, 3, C('#4a73e0')); p.px(7, 3, C('#6a93ff')); p.px(5, 5, C('#6a93ff')); p.px(9, 5, C('#6a93ff')); p.px(7, 5, C('#233c8a')); });
  addTile('dead_bush', p => {
    const c = C('#7a5a2a');
    const br = (x, y, dx, n) => { for (let i = 0; i < n; i++) { p.px(x, y, c); y--; if (i % 2) x += dx; } };
    br(7, 15, 0, 5); br(7, 11, -1, 6); br(8, 11, 1, 6); br(7, 13, 1, 4); br(6, 9, -1, 3);
  });
  addTile('oak_sapling', p => { for (let y = 10; y < 16; y++) p.px(7, y, C('#6b5132')); p.fill((x, y) => (Math.hypot(x - 7.5, y - 6) < 4.2 && p.r() < 0.85) ? p.pick([C('#3e7d24'), C('#4a8c2c'), C('#56993a')]) : null); });
  addTile('birch_sapling', p => { for (let y = 10; y < 16; y++) p.px(7, y, C('#d8d8d0')); p.fill((x, y) => (Math.hypot(x - 7.5, y - 6) < 4 && p.r() < 0.85) ? p.pick([C('#6a9a3a'), C('#78a846'), C('#86b454')]) : null); });
  addTile('spruce_sapling', p => { for (let y = 11; y < 16; y++) p.px(7, y, C('#4a321c')); p.fill((x, y) => (y > 2 && y < 12 && Math.abs(x - 7.5) < (y - 2) * 0.55) ? p.pick([C('#2f5c36'), C('#386a40'), C('#42764a')]) : null); });
  addTile('bed_top', p => {
    p.fill((x, y) => {
      if (x === 0 || x === 15) return C('#8a6a3c');
      if (y < 6) return (y === 0 || y === 5 || x === 1 || x === 14) ? C('#c8c8c8') : p.jit(C('#f0f0f0'), 3);
      return p.jit(y === 6 ? C('#d8d8d8') : (x + y) % 6 === 0 ? C('#c8403a') : C('#b3312c'), 4);
    });
  });
  const bedSide = p => {
    p.fill((x, y) => {
      if (y < 7) return null;
      if (y < 10) return p.jit(C('#b3312c'), 4);
      if (y === 10) return C('#eeeeee');
      if (y < 13) return p.jit(C('#8a6a3c'), 5);
      return (x < 3 || x > 12) ? C('#6b4f2a') : null;
    });
  };
  addTile('bed_side', bedSide);
  addTile('bed_end', bedSide);
  const doorWood = (p, top) => {
    p.fill((x, y) => {
      if (x === 0 || x === 15 || (top && y === 0) || (!top && y === 15)) return p.jit(C('#6b4f2a'), 4);
      if (top && x > 2 && x < 13 && y > 2 && y < 13 && x !== 7 && x !== 8 && y !== 7 && y !== 8) return null;
      if (top && (x === 7 || x === 8 || y === 7 || y === 8) && x > 1 && x < 14 && y > 1 && y < 14) return p.jit(C('#8a6a3c'), 4);
      return p.jit(x % 4 === 0 ? C('#94733f') : C('#a8864f'), 5);
    });
    if (!top) { p.px(12, 2, C('#3a3a3a')); p.px(12, 3, C('#5a5a5a')); for (let y = 5; y < 13; y += 7) for (let x = 2; x < 14; x++) p.px(x, y, C('#7d6238')); }
  };
  addTile('door_top', p => doorWood(p, true));
  addTile('door_bottom', p => doorWood(p, false));
  for (let i = 0; i < 16; i++) addTile('wool_' + i, p => paintWool(p, WOOL_COLORS[i]));
  // crack stages
  (() => {
    const r = mulberry32(99), order = [], seen = new Set();
    for (let w = 0; w < 7; w++) {
      let x = 7 + ((r() * 3) | 0) - 1, y = 7 + ((r() * 3) | 0) - 1;
      const dx = r() < 0.5 ? -1 : 1, dy = r() < 0.5 ? -1 : 1;
      for (let s = 0; s < 14; s++) {
        const k = y * 16 + x;
        if (x >= 0 && x < 16 && y >= 0 && y < 16 && !seen.has(k)) { seen.add(k); order.push(k); }
        if (r() < 0.6) x += dx; else y += dy;
        if (r() < 0.2) x -= dx;
      }
    }
    for (let st = 0; st < 10; st++) {
      const n = Math.round(order.length * (st + 1) / 10);
      addTile('destroy_' + st, p => { for (let i = 0; i < n; i++) { const k = order[i]; p.px(k & 15, k >> 4, [20, 20, 20], 200); } });
    }
  })();
  addTile('smoke', p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 5.5 ? (d < 3 ? [230, 230, 230] : [190, 190, 190]) : null; }));
  addTile('spark', p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 3.5 ? (d < 2 ? [255, 255, 220] : [255, 190, 60]) : null; }));
  // party sparks, snow, Enderman sparkles, flames
  for (const [nm, hot, edge] of [['red', '#ffd0d0', '#ff3a3a'], ['green', '#d8ffd0', '#3adf4a'], ['blue', '#d0e4ff', '#3a7aff'], ['yellow', '#fffbd0', '#ffd23a'], ['pink', '#ffd8f6', '#ff5ad2']])
    addTile('spark_' + nm, p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 4 ? (d < 2 ? C(hot) : C(edge)) : null; }));
  addTile('snowflake', p => p.fill((x, y) => { const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5); return (dx < 1 && dy < 6) || (dy < 1 && dx < 6) || (Math.abs(dx - dy) < 1 && dx < 4.5) ? [250, 252, 255] : null; }));
  addTile('ender_dot', p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 3.5 ? (d < 1.6 ? C('#f6c8ff') : C('#c23ae8')) : null; }));
  addTile('flame', p => p.fill((x, y) => { const d = Math.hypot((x - 7.5) * 1.3, y - 9); return d < 6 - (y < 9 ? (9 - y) * 0.45 : 0) ? (d < 2.5 ? C('#fff3a0') : d < 4 ? C('#ffb030') : C('#e8521a')) : null; }));
  addTile('fireball', p => p.fill((x, y) => { const v = p.r(); return v < 0.25 ? C('#4a1a08') : v < 0.55 ? C('#e8521a') : v < 0.85 ? C('#ffa030') : C('#fff080'); }));
  // ---- TNT kinds ----
  const GLYPH = {
    T: ['###', '.#.', '.#.', '.#.', '.#.'], N: ['#.#', '###', '###', '#.#', '#.#'], M: ['#.#', '###', '#.#', '#.#', '#.#'], E: ['###', '#..', '##.', '#..', '###'],
    G: ['###', '#..', '#.#', '#.#', '###'], A: ['.#.', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'], C: ['###', '#..', '#..', '#..', '###'],
    D: ['##.', '#.#', '#.#', '#.#', '##.'],
  };
  const word = (p, txt, y0, col) => { const w = txt.length * 4 - 1; let x = Math.floor((16 - w) / 2); for (const ch of txt) { glyphs(p, x, y0, GLYPH[ch], typeof col === 'function' ? col(ch, x) : col); x += 4; } };
  const tntBody = (p, base, dark, band) => p.fill((x, y) => (y >= 4 && y <= 11) ? p.jit(C(band), 4) : p.jit(x % 4 === 0 ? C(dark) : C(base), 6));
  const tntTop = (p, a, b) => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 2) return C('#5f5f5f'); if (d < 3) return C('#333333'); return p.jit((((x >> 2) + (y >> 2)) % 2) ? C(a) : C(b), 6); });
  addTile('mega_tnt_side', p => { tntBody(p, '#8a1a14', '#5a0e0a', '#1b1b1b'); word(p, 'MEGA', 5, C('#ffcf3a')); });
  addTile('mega_tnt_top', p => { tntTop(p, '#8a1a14', '#6a1410'); for (let i = 0; i < 16; i++) { p.px(i, 0, C('#ffcf3a')); p.px(i, 15, C('#ffcf3a')); p.px(0, i, C('#ffcf3a')); p.px(15, i, C('#ffcf3a')); } });
  addTile('ice_tnt_side', p => { tntBody(p, '#7ec8f0', '#4a9ad0', '#f2fbff'); word(p, 'ICE', 5, C('#1f5a9a')); });
  addTile('ice_tnt_top', p => { tntTop(p, '#9ad8f8', '#7ec8f0'); glyphs(p, 4, 4, ['#..#..#', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '#..#..#'], C('#ffffff')); });
  addTile('dig_tnt_side', p => { tntBody(p, '#b0702a', '#7a4a18', '#e8e6e0'); word(p, 'DIG', 5, C('#3a2a1a')); });
  addTile('dig_tnt_front', p => { tntBody(p, '#b0702a', '#7a4a18', '#e8e6e0'); glyphs(p, 4, 3, ['...#...', '..###..', '.#####.', '#######', '..###..', '..###..', '..###..', '..###..', '..###..'], C('#3a2a1a')); });
  addTile('dig_tnt_top', p => { tntTop(p, '#b0702a', '#966022'); });
  const RAINBOW = ['#e8483a', '#f09a2a', '#f2d43a', '#4ac84a', '#3a8ae8', '#9a4ae8'];
  addTile('party_tnt_side', p => {
    p.fill((x, y) => (y >= 4 && y <= 11) ? p.jit(C('#fafafa'), 3) : p.jit(C(RAINBOW[(x >> 1) % 6]), 5));
    word(p, 'TNT', 5, (ch, x) => C(RAINBOW[(x >> 2) % 6]));
    for (const [x, y] of [[1, 5], [14, 10], [2, 10], [13, 5]]) p.px(x, y, C(RAINBOW[(x + y) % 6]));
  });
  addTile('party_tnt_top', p => p.fill((x, y) => p.r() < 0.18 ? C(RAINBOW[p.ri(6)]) : p.jit(C('#fafafa'), 3)));
  addTile('cluster_tnt_side', p => {
    tntBody(p, '#cc352b', '#a02820', '#e8e6e0');
    for (const x0 of [1, 6, 11]) { p.rect(x0, 5, 4, 6, (x, y) => (y === 2 || y === 3) ? C('#e8e6e0') : C('#cc352b')); p.px(x0 + 1, 7, C('#1b1b1b')); p.px(x0 + 2, 8, C('#1b1b1b')); }
  });
  addTile('cluster_tnt_top', p => { tntTop(p, '#c8342a', '#b02c22'); for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) { p.px(x, y, C('#333333')); p.px(x + 1, y, C('#5f5f5f')); } });
  // ---- dispenser, lever, button, rails ----
  addTile('dispenser_front', p => {
    furnaceBase(p);
    p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 2.4 ? C('#101010') : d < 3.6 ? C('#3a3a3a') : d < 4.4 ? C('#5a5a5a') : null; });
    p.rect(3, 2, 10, 1, C('#4a4a4a')); p.rect(3, 13, 10, 1, C('#4a4a4a'));
  });
  addTile('lever_stick', p => p.fill((x, y) => p.jit(x % 3 === 0 ? C('#6b4f2a') : C('#8a6a3c'), 6)));
  addTile('lever', p => {
    p.rect(3, 11, 10, 4, (x, y) => p.jit(y === 0 ? C('#9a9a9a') : C('#7a7a7a'), 10));
    for (let i = 0; i < 8; i++) { p.px(5 + i * 0.6, 11 - i, C('#8a6a3c')); p.px(6 + i * 0.6, 11 - i, C('#6b4f2a')); }
    p.px(10, 3, C('#5a4020')); p.px(10, 4, C('#5a4020'));
  });
  addTile('button', p => { p.rect(4, 6, 8, 5, (x, y) => (y === 0 || x === 0) ? C('#a8a8a8') : (y === 4 || x === 7) ? C('#5a5a5a') : p.jit(C('#8a8a8a'), 8)); });
  const railTies = (p, pts) => { for (const [x, y] of pts) p.px(x, y, p.jit((x + y) % 5 === 0 ? C('#6b4f2a') : C('#8a6a3c'), 6)); };
  addTile('rail', p => {
    const ties = [];
    for (const y0 of [1, 5, 9, 13]) for (let y = y0; y < y0 + 2; y++) for (let x = 1; x < 15; x++) ties.push([x, y]);
    railTies(p, ties);
    for (let y = 0; y < 16; y++) for (const x of [3, 4, 11, 12]) p.px(x, y, (x === 3 || x === 11) ? C('#c8c8c8') : C('#8a8a8a'));
  });
  addTile('rail_corner', p => {   // joins the bottom edge (south) and the right edge (east)
    const ties = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(16 - (x + 0.5), 16 - (y + 0.5)), a = Math.atan2(16 - (y + 0.5), 16 - (x + 0.5));
      if (d > 2 && d < 14.5 && Math.floor(a / (Math.PI / 2) * 5 + 0.25) !== Math.floor(a / (Math.PI / 2) * 5 + 0.6)) ties.push([x, y]);
    }
    railTies(p, ties);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(16 - (x + 0.5), 16 - (y + 0.5));
      if (Math.abs(d - 4.5) < 0.75 || Math.abs(d - 12) < 0.75) p.px(x, y, (d < 4.5 || (d > 8 && d < 12)) ? C('#8a8a8a') : C('#c8c8c8'));
    }
  });
  buildItemTiles();
}

/* ---------- item sprites ---------- */
function buildItemTiles() {
  addTile('stick', p => shadeMask(p, mask(capsule([[3, 13], [13, 3]], 1.9)), PAL.stick, true));
  addTile('coal', p => {
    shadeMask(p, mask((x, y) => circle(8, 8.5, 5.2)(x, y) && !(x > 11 && y < 6)), [C('#2a2a2a'), C('#505050'), C('#141414'), C('#050505')], true);
    for (let k = 0; k < 5; k++) p.px(5 + p.ri(6), 5 + p.ri(6), C('#474747'));
  });
  const ingot = (p, pal) => shadeMask(p, mask(poly([[2.5, 11.5], [4.5, 6.5], [13.5, 6.5], [13.5, 11.5]])), pal, true);
  addTile('iron_ingot', p => ingot(p, [C('#d8d8d8'), C('#ffffff'), C('#8f8f8f'), C('#3a3a3a')]));
  addTile('gold_ingot', p => ingot(p, [C('#f5d33a'), C('#fff39a'), C('#b8860b'), C('#5a3f05')]));
  addTile('diamond', p => {
    shadeMask(p, mask(poly([[8, 2.5], [13, 6.5], [8, 13.5], [3, 6.5]])), PAL.diamond, true);
    p.px(7, 5, C('#ffffff')); p.px(6, 6, C('#e8ffff'));
  });
  addTile('apple', p => {
    shadeMask(p, mask(circle(8, 9.5, 5)), [C('#d42a2a'), C('#ff6a5a'), C('#9a1a1a'), C('#4a0808')], true);
    p.px(8, 3, C('#5a4020')); p.px(8, 4, C('#5a4020')); p.px(9, 3, C('#3f8a25')); p.px(10, 2, C('#3f8a25')); p.px(6, 7, C('#ffb0a0'));
  });
  const meat = (p, a, b, c, fat) => {
    shadeMask(p, mask(poly([[3, 7], [6, 3.5], [12, 4], [13.5, 8], [11, 12.5], [5, 12.5]])), [a, b, c, mulc(c, 0.5)], true);
    for (let i = 0; i < 6; i++) p.px(6 + i, 6 + (i % 2), fat);
  };
  addTile('porkchop', p => meat(p, C('#f09a9a'), C('#ffc4c0'), C('#c86a6a'), C('#fbe6de')));
  addTile('cooked_porkchop', p => meat(p, C('#b8743e'), C('#d8a060'), C('#7a4a22'), C('#e8c890')));
  addTile('beef', p => meat(p, C('#c8302a'), C('#e8584e'), C('#8a1a14'), C('#f0c8c0')));
  addTile('steak', p => meat(p, C('#7a3a1a'), C('#a05a30'), C('#4a200c'), C('#c88a50')));
  addTile('rotten_flesh', p => { meat(p, C('#8a6a3a'), C('#a8884a'), C('#5a4020'), C('#6a8a3a')); p.px(5, 9, C('#5a7a2a')); p.px(10, 10, C('#5a7a2a')); });
  const drum = (p, a, b, c) => {
    shadeMask(p, mask(circle(9.5, 6.5, 4.3)), [a, b, c, mulc(c, 0.5)], true);
    shadeMask(p, mask(capsule([[6.5, 9.5], [3.5, 12.5]], 2.2)), [C('#f0ecdc'), C('#ffffff'), C('#c0baa8'), C('#5a5648')], true);
  };
  addTile('chicken', p => drum(p, C('#f2b8a8'), C('#ffd8c8'), C('#c88a7a')));
  addTile('cooked_chicken', p => drum(p, C('#d08a40'), C('#f0b060'), C('#8a5420')));
  addTile('gunpowder', p => {
    shadeMask(p, mask(poly([[2.5, 13], [8, 5], [13.5, 13]])), [C('#6a6a6a'), C('#9a9a9a'), C('#3a3a3a'), C('#1a1a1a')], true);
    for (let k = 0; k < 10; k++) p.px(4 + p.ri(8), 8 + p.ri(5), p.r() < 0.5 ? C('#2e2e2e') : C('#a8a8a8'));
  });
  addTile('feather', p => {
    shadeMask(p, mask(capsule([[4, 12], [12, 4]], 4.2)), [C('#f0f0f0'), C('#ffffff'), C('#c8c8c8'), C('#7a7a7a')], true);
    for (let i = 0; i < 11; i++) p.px(2 + i, 13 - i, C('#8a8a8a'));
  });
  addTile('door_item', p => {
    shadeMask(p, mask(poly([[4.5, 1], [11.5, 1], [11.5, 15], [4.5, 15]])), [C('#a8864f'), C('#c8a66a'), C('#6b5132'), C('#3a2a16')], true);
    p.rect(6, 3, 4, 4, C('#bcd8ea')); p.px(10, 9, C('#3a3a3a'));
  });
  addTile('leather', p => {
    shadeMask(p, mask(poly([[3, 4], [7, 3], [9, 4], [13, 3], [13, 12], [9, 13], [7, 12], [3, 13]])), [C('#9a5a2a'), C('#b8763e'), C('#6a3a18'), C('#3a1a08')], true);
    for (let i = 4; i < 12; i += 2) { p.px(5, i, C('#e0c090')); p.px(11, i, C('#e0c090')); }
  });
  addTile('emerald', p => {
    shadeMask(p, mask(poly([[8, 1.5], [12.8, 5], [12.8, 11], [8, 14.5], [3.2, 11], [3.2, 5]])), [C('#2ad46c'), C('#9dffc4'), C('#0f8a40'), C('#054a20')], true);
    p.px(6, 5, C('#e8fff0')); p.px(6, 6, C('#c0ffd8')); p.px(7, 4, C('#c0ffd8')); p.px(9, 11, C('#17b456'));
  });
  addTile('bread', p => {
    shadeMask(p, mask(capsule([[3.8, 10], [12.2, 6.8]], 5.4)), [C('#c88a3a'), C('#e8b465'), C('#8a5a20'), C('#4a2a08')], true);
    for (const [x, y] of [[5, 8], [6, 7], [8, 7], [9, 6], [11, 5]]) p.px(x, y, C('#f4d49a'));
  });
  addTile('flint', p => {
    shadeMask(p, mask(poly([[5, 2], [10, 2.6], [13, 7.5], [11.4, 13], [5.4, 14], [3, 8.6]])), [C('#3a3a40'), C('#6c6c74'), C('#1e1e24'), C('#08080a')], true);
    p.px(7, 5, C('#9090a0')); p.px(6, 6, C('#7c7c88'));
  });
  addTile('flint_and_steel', p => {
    shadeMask(p, mask(capsule([[3.5, 4.5], [3.5, 11], [5.5, 13.2], [9.5, 13.2], [11.5, 11]], 2.4)), PAL.iron, true);
    shadeMask(p, mask(poly([[8, 1.8], [12.8, 2.8], [14, 7.4], [10.8, 9.2], [7.6, 6.4]])), [C('#3a3a40'), C('#6c6c74'), C('#1e1e24'), C('#08080a')], true);
  });
  addTile('quartz', p => {
    shadeMask(p, mask(poly([[6, 2], [10, 2], [13.4, 7], [10.4, 14], [5.6, 14], [2.6, 7]])), [C('#ece4dc'), C('#ffffff'), C('#bcb0a6'), C('#5c5048')], true);
    p.px(7, 4, C('#ffffff')); p.px(8, 9, C('#d8cec4'));
  });
  addTile('nether_brick', p => ingot(p, [C('#5a2226'), C('#843e40'), C('#381216'), C('#180608')]));
  const EGG_PAL = { pig: ['#f0a5a2', '#db635f'], cow: ['#443626', '#a1a1a1'], sheep: ['#e7e7e7', '#ffb5b5'], chicken: ['#a1a1a1', '#ff3030'],
    zombie: ['#00afaf', '#799c65'], creeper: ['#0da70b', '#1a1a1a'], villager: ['#563c33', '#bd8b72'], piglin: ['#ea9393', '#4c7129'], magma: ['#340000', '#fcfc00'],
    enderman: ['#161616', '#000000'], ghast: ['#f9f9f9', '#bcbcbc'] };
  for (const m of EGG_MOBS) {
    addTile('egg_' + m, p => {
      const base = C(EGG_PAL[m][0]), spot = C(EGG_PAL[m][1]);
      const eg = mask((x, y) => ((x - 8) / 4.7) * ((x - 8) / 4.7) + ((y - 9) / 6.1) * ((y - 9) / 6.1) < 1);
      shadeMask(p, eg, [base, mixc(base, [255, 255, 255], 0.35), mulc(base, 0.7), mulc(base, 0.35)], true);
      for (const [x, y] of [[6, 6], [9, 8], [7, 11], [10, 12], [5, 9], [9, 4]]) if (eg[y * 16 + x]) { p.px(x, y, spot); if (eg[y * 16 + x + 1]) p.px(x + 1, y, spot); }
    });
  }
  // ---- bows, arrows, crossbows ----
  const STRING_C = C('#e8e8e8');
  // positions along a diagonal: u runs up and right, v down and right, from the middle of the tile
  const diag = (u, v) => [8 + (u + v) * 0.7071, 8 + (v - u) * 0.7071];
  const bezier = (a, c, b, n) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; out.push([s * s * a[0] + 2 * t * s * c[0] + t * t * b[0], s * s * a[1] + 2 * t * s * c[1] + t * t * b[1]]); } return out; };
  const bowArc = (p, pull) => {   // pull 0 (resting) .. 3 (fully drawn): the wood bulges up and right, the string lies on the diagonal
    const k = pull * 0.6, A = diag(-1 + k * 0.4, -7 + k * 0.5), Bt = diag(-1 + k * 0.4, 7 - k * 0.5), Cp = diag(9 + k * 0.3, 0);
    const pts = bezier(A, Cp, Bt, 10);
    shadeMask(p, mask((x, y) => capsule(pts, 1.8)(x, y) || capsule(pts.slice(4, 7), 2.6)(x, y)), PAL.wood, true);
    const [sx, sy] = diag(-1 - k * 2.2, 0);
    for (let t = 0; t <= 1; t += 0.04) { p.px(lerp(A[0], sx, t), lerp(A[1], sy, t), STRING_C); p.px(lerp(sx, Bt[0], t), lerp(sy, Bt[1], t), STRING_C); }
    return [sx, sy];
  };
  const arrowShaft = (p, x0, y0, x1, y1) => {
    for (let t = 0; t <= 1; t += 0.04) p.px(lerp(x0, x1, t), lerp(y0, y1, t), C('#8a6a3c'));
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
    for (const [a, b] of [[0, 0], [-1, 0], [0, 1], [-1, 1], [1, -1]]) p.px(x1 + a + ux, y1 + b + uy, C('#b0b0b0'));
    p.px(x1 + ux * 1.6, y1 + uy * 1.6, C('#6a6a6a'));
    for (const [a, b] of [[-1, 0], [0, 1], [-2, 1], [-1, 2], [0, 0]]) p.px(x0 + a, y0 + b, C('#f0f0f0'));
  };
  addTile('bow', p => bowArc(p, 0));
  for (let i = 0; i < 3; i++) addTile('bow_pull_' + i, p => { const [sx, sy] = bowArc(p, i + 1), [tx, ty] = diag(5.6, 0); arrowShaft(p, sx, sy, tx, ty); });
  addTile('arrow', p => arrowShaft(p, 3.5, 12.5, 11.5, 4.5));
  const crossbowBase = (p, loaded) => {   // the stock runs up and right; the bow crosses it near the front, bent forward
    shadeMask(p, mask(capsule([diag(-7, 0), diag(6, 0)], 2.6)), PAL.wood, true);
    for (const [x, y] of [diag(-4, 1.6), diag(-4.6, 2.2)]) p.px(x, y, C('#3a2a16'));   // trigger
    const tipA = diag(0, -6), tipB = diag(0, 6);
    shadeMask(p, mask(capsule(bezier(tipA, diag(5, 0), tipB, 10), 1.6)), [C('#4a4a4a'), C('#7a7a7a'), C('#2a2a2a'), C('#0a0a0a')], true);
    const [sx, sy] = loaded ? diag(-2.6, 0) : diag(0, 0);
    for (let t = 0; t <= 1; t += 0.04) { p.px(lerp(tipA[0], sx, t), lerp(tipA[1], sy, t), STRING_C); p.px(lerp(sx, tipB[0], t), lerp(sy, tipB[1], t), STRING_C); }
    if (loaded) { const [tx, ty] = diag(5.4, 0); arrowShaft(p, sx, sy, tx, ty); }
  };
  addTile('crossbow', p => crossbowBase(p, false));
  addTile('crossbow_loaded', p => crossbowBase(p, true));
  addTile('string', p => {
    for (let t = 0; t <= 1; t += 0.02) { const x = 2.5 + t * 11, y = 8 + Math.sin(t * TAU * 1.5) * 3.5; p.px(x, y, STRING_C); p.px(x, y + 1, C('#a8a8a8')); }
  });
  addTile('ender_pearl', p => {
    shadeMask(p, mask(circle(8, 8, 5.2)), [C('#0d5a4a'), C('#2a9a80'), C('#063a30'), C('#021a14')], true);
    p.px(6, 6, C('#5ad0b0')); p.px(7, 6, C('#5ad0b0')); p.px(6, 7, C('#3ab89a')); p.px(9, 9, C('#0a3a30')); p.px(10, 10, C('#0a3a30'));
  });
  addTile('ghast_tear', p => {
    shadeMask(p, mask((x, y) => circle(8, 10, 3.6)(x, y) || poly([[8, 2.4], [11.2, 8.6], [4.8, 8.6]])(x, y)), [C('#d0f0f0'), C('#ffffff'), C('#9ac8c8'), C('#4a7070')], true);
    p.px(7, 9, C('#ffffff'));
  });
  addTile('fire_charge', p => {
    shadeMask(p, mask(circle(8, 8, 5.4)), [C('#3a2a1a'), C('#5a4228'), C('#1a120a'), C('#0a0604')], true);
    for (const [x, y, c] of [[6, 6, '#ffa030'], [9, 7, '#e8521a'], [7, 9, '#ffcf3a'], [10, 10, '#e8521a'], [5, 9, '#ffa030'], [8, 5, '#ffcf3a'], [9, 11, '#ffa030']]) p.px(x, y, C(c));
  });
  addTile('minecart', p => {
    shadeMask(p, mask(poly([[1.5, 5.5], [14.5, 5.5], [13, 12], [3, 12]])), [C('#7a7a7a'), C('#a8a8a8'), C('#4a4a4a'), C('#1a1a1a')], true);
    p.rect(3, 6, 10, 2, C('#2a2a2a'));
    for (const cx of [4.5, 11.5]) shadeMask(p, mask(circle(cx, 12.5, 1.9)), [C('#3a3a3a'), C('#5a5a5a'), C('#1a1a1a'), C('#0a0a0a')], true);
  });
  addTile('car', p => {
    shadeMask(p, mask(poly([[0.8, 7.5], [4, 7.5], [5.5, 3.5], [11, 3.5], [13, 7.5], [15.2, 8], [15.2, 11.5], [0.8, 11.5]])), [C('#d42a2a'), C('#ff6a5a'), C('#9a1a1a'), C('#3a0606')], true);
    p.rect(6, 4, 2, 3, C('#9ad8f8')); p.rect(9, 4, 2, 3, C('#9ad8f8'));
    p.px(14, 8, C('#fff3a0')); p.px(1, 8, C('#ff3030'));
    for (const cx of [4, 12]) shadeMask(p, mask(circle(cx, 12, 2.2)), [C('#2a2a2a'), C('#4a4a4a'), C('#141414'), C('#050505')], true);
    p.px(4, 12, C('#b0b0b0')); p.px(12, 12, C('#b0b0b0'));
  });
  for (let m = 0; m < 4; m++) {
    const mat = TOOL_MATS[m], pal = PAL[mat];
    addTile(mat + '_pickaxe', p => {
      shadeMask(p, mask(capsule([[2.2, 13.8], [10, 6]], 1.7)), PAL.stick, true);
      shadeMask(p, mask(capsule([[2.6, 4.2], [5, 2.2], [9, 1.8], [12, 3], [13.2, 6], [13.8, 10], [11.8, 13.4]], 2.1)), pal, true);
    });
    addTile(mat + '_axe', p => {
      shadeMask(p, mask(capsule([[2.5, 13.5], [11, 5]], 1.7)), PAL.stick, true);
      shadeMask(p, mask(poly([[6, 2.2], [10, 1.6], [13.2, 4.6], [13.2, 7.2], [11.6, 8.4], [9.2, 6.2], [7.4, 6.2], [5.2, 4]])), pal, true);
    });
    addTile(mat + '_shovel', p => {
      shadeMask(p, mask(capsule([[2.2, 13.8], [9.6, 6.4]], 1.7)), PAL.stick, true);
      shadeMask(p, mask(capsule([[10.2, 5.8], [12.4, 3.6]], 4.4)), pal, true);
    });
    addTile(mat + '_sword', p => {
      shadeMask(p, mask(capsule([[1.8, 14.2], [4.6, 11.4]], 1.8)), PAL.stick, true);
      shadeMask(p, mask(capsule([[2.4, 9.4], [6.6, 13.6]], 1.8)), m === 0 ? PAL.wood : [pal[2], pal[0], mulc(pal[2], 0.7), pal[3]], true);
      shadeMask(p, mask(capsule([[5.2, 10.8], [13.6, 2.4]], 2.4)), pal, true);
    });
  }
}

/* ---------- mob and player skins (64x64 layers) ---------- */
const SKIN = {};
const SKIN_DATA = [];
function paintBox(S, u, v, w, hgt, d, fn) {
  const faces = { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, hgt], front: [u + d, v + d, w, hgt], left: [u + d + w, v + d, d, hgt], back: [u + 2 * d + w, v + d, w, hgt] };
  for (const f in faces) {
    const [fx, fy, fw, fh] = faces[f];
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const c = fn(f, x, y, fw, fh); if (c) S.px(fx + x, fy + y, c); }
  }
}
function addSkin(name, fn) { const S = new Pix(64, 64, hashString('skin_' + name)); fn(S); SKIN[name] = SKIN_DATA.length; SKIN_DATA.push(S.d); }

function buildSkins() {
  // --- Declan: blonde hair, blue eyes, red tee with a D, jeans ---
  addSkin('declan', S => {
    const skin = C('#f3c6a5'), skinSh = C('#e3ae8c');
    const hair = [C('#f2d06b'), C('#fbe595'), C('#e0b64a'), C('#f6da7c')], hairDk = C('#c9993a');
    const shirt = C('#e1453a'), shirtDk = C('#b8322a'), jeans = C('#3b5fa9'), jeansDk = C('#2f4d8a'), shoe = C('#3a3a3a'), sole = C('#e2e2e2');
    const H = () => S.pick(hair);
    paintBox(S, 0, 0, 8, 8, 8, (f, x, y) => {
      if (f === 'top') return H();
      if (f === 'bottom') return skinSh;
      if (f === 'back') return y < 7 ? H() : (y === 7 && x % 3 === 0 ? H() : skin);
      if (f === 'left' || f === 'right') {
        const nearFront = f === 'right' ? x >= 6 : x <= 1;
        if (y < 3) return H();
        if (y < 5 && !nearFront) return H();
        if (y === 5 && !nearFront && x % 2 === 0) return H();
        return y === 7 ? skinSh : skin;
      }
      // face: bangs, eyebrows, blue eyes, rosy cheeks, smile
      if (y < 2) return H();
      if (y === 2) return 'HsHHsssH'[x] === 'H' ? H() : skin;
      if (y === 3) return (x === 1 || x === 2 || x === 5 || x === 6) ? C('#c7a04a') : skin;
      if (y === 4) return x === 1 || x === 6 ? C('#ffffff') : x === 2 || x === 5 ? C('#4a90f0') : skin;
      if (y === 5) return x === 1 || x === 6 ? C('#e8eef6') : x === 2 || x === 5 ? C('#2458c0') : (x === 3 || x === 4) ? skinSh : skin;
      if (y === 6) return (x === 0 || x === 7) ? C('#f2b4a0') : (x === 3 || x === 4) ? C('#e6a88a') : skin;
      if (y === 7) return (x === 3 || x === 4) ? C('#b8605a') : (x === 2 || x === 5) ? C('#d98a80') : skin;
      return skin;
    });
    // hair volume layer
    paintBox(S, 32, 0, 8, 8, 8, (f, x, y) => {
      if (f === 'top') return H();
      if (f === 'bottom') return null;
      if (f === 'back') return y < 7 ? (y === 6 && x % 2 ? hairDk : H()) : null;
      if (f === 'left' || f === 'right') {
        const nearFront = f === 'right' ? x >= 6 : x <= 1;
        if (y < 3) return H();
        if (y < 5 && !nearFront) return y === 4 ? hairDk : H();
        return null;
      }
      if (y === 0) return H();
      if (y === 1) return (x % 3 === 1) ? null : H();
      if (y === 2) return (x === 0 || x === 7) ? hairDk : null;
      return null;
    });
    paintBox(S, 16, 16, 8, 12, 4, (f, x, y, fw) => {
      if (f === 'top') return shirt;
      if (f === 'bottom') return jeans;
      if (y === 11) return f === 'front' && (x === 3 || x === 4) ? C('#c8a040') : C('#5a3b22');
      if (y === 10) return shirtDk;
      if (f === 'front') {
        if (y === 0 && x >= 2 && x <= 5) return (x === 3 || x === 4) ? skin : shirtDk;
        const D = ['##.', '#.#', '#.#', '#.#', '##.'];
        if (y >= 3 && y <= 7 && x >= 3 && x <= 5 && D[y - 3][x - 3] === '#') return C('#f7f4ec');
      }
      return S.jit(shirt, 5);
    });
    const arm = (u, v) => paintBox(S, u, v, 4, 12, 4, (f, x, y) => {
      if (f === 'top') return shirt;
      if (f === 'bottom') return skinSh;
      if (y < 3) return S.jit(shirt, 5);
      if (y === 3) return shirtDk;
      return y === 11 ? skinSh : skin;
    });
    arm(40, 16); arm(32, 48);
    const leg = (u, v) => paintBox(S, u, v, 4, 12, 4, (f, x, y) => {
      if (f === 'top') return jeans;
      if (f === 'bottom') return sole;
      if (y >= 10) return y === 11 ? sole : (f === 'front' && x === 1 ? C('#e1453a') : shoe);
      return S.jit((f === 'left' || f === 'right') && x === 3 ? jeansDk : jeans, 5);
    });
    leg(0, 16); leg(16, 48);
  });
  addSkin('zombie', S => {
    const g = C('#4f8f3a'), gd = C('#3b7030'), shirt = C('#1f9e9e'), pants = C('#3a3a8a');
    paintBox(S, 0, 0, 8, 8, 8, (f, x, y) => {
      if (f !== 'front') return S.jit(f === 'top' ? gd : g, 8);
      if (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) return C('#101010');
      if (y === 4 && (x === 2 || x === 5)) return C('#1e1e1e');
      if (y === 6 && x >= 2 && x <= 5) return gd;
      return S.jit(g, 8);
    });
    paintBox(S, 16, 16, 8, 12, 4, (f, x, y) => y >= 10 ? pants : S.jit(shirt, 8));
    const arm = (u, v) => paintBox(S, u, v, 4, 12, 4, (f, x, y) => y < 3 ? S.jit(shirt, 6) : S.jit(g, 8));
    arm(40, 16); arm(32, 48);
    const leg = (u, v) => paintBox(S, u, v, 4, 12, 4, (f, x, y) => y > 9 ? C('#4a4a4a') : S.jit(pants, 6));
    leg(0, 16); leg(16, 48);
  });
  addSkin('piglin', S => {
    const pk = C('#eba29c'), pd = C('#d4847e'), rot = C('#6f9a55'), rotD = C('#557a40'), gold = C('#f2cc3a'), cloth = C('#6b4424'), belt = C('#3a2614');
    const flesh = () => S.r() < 0.16 ? (S.r() < 0.5 ? rot : rotD) : S.jit(pk, 7);
    paintBox(S, 0, 0, 10, 8, 8, (f, x, y) => {
      if (f === 'front') {
        if (y === 2 && (x === 2 || x === 7)) return C('#2a1a18');   // eyes
        if (y === 2 && (x === 3 || x === 6)) return C('#f4f0e8');
        if (y === 7 && (x === 2 || x === 7)) return C('#f7f2dc');   // tusks
        if (y >= 5 && x >= 3 && x <= 6) return pd;
      }
      if (f === 'top') return S.r() < 0.3 ? rotD : S.jit(pd, 6);
      return flesh();
    });
    paintBox(S, 36, 0, 4, 3, 1, (f, x, y) => f === 'front' && y === 1 && (x === 1 || x === 2) ? C('#7a3a36') : S.jit(C('#f3b3ad'), 5));
    paintBox(S, 48, 0, 1, 5, 4, () => S.jit(pk, 8));
    paintBox(S, 16, 16, 8, 12, 4, (f, x, y) => {
      if (y >= 8) return y === 8 ? (x % 3 === 1 ? gold : belt) : S.jit(cloth, 6);
      if (f === 'front' && y >= 2 && y <= 6 && x >= 2 && x <= 5 && (y % 2 === 0)) return C('#e8e0d0');   // ribs showing
      return flesh();
    });
    const limb = (u, v, legs) => paintBox(S, u, v, 4, 12, 4, (f, x, y) => legs ? (y >= 10 ? C('#5a3a20') : y < 3 ? S.jit(cloth, 6) : flesh()) : flesh());
    limb(40, 16); limb(32, 48); limb(0, 16, true); limb(16, 48, true);
    paintBox(S, 0, 34, 1, 1, 12, (f, x, y) => {   // golden sword: the grip is the end at the hand
      const grip = f === 'back' || (f === 'left' ? x >= 9 : f === 'top' || f === 'bottom' ? y < 3 : f === 'right' ? x < 3 : false);
      return grip ? C('#6b4424') : S.jit(gold, 12);
    });
  });
  addSkin('magma', S => {
    const f = vfield(S.r, 6);
    paintBox(S, 0, 0, 8, 8, 8, (face, x, y) => {
      if (face === 'front' && y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) return x === 1 || x === 6 ? C('#fff08a') : C('#ffc830');   // glowing eyes
      const n = f((x * 2 + (face.length * 5)) & 15, (y * 2) & 15);
      if (n > 0.66) return mixc(C('#ff8a1e'), C('#ffe060'), (n - 0.66) * 3);
      if (n > 0.58) return C('#c8400e');
      return S.jit(mixc(C('#2a0a06'), C('#4a120a'), n), 5);
    });
  });
  addSkin('creeper', S => {
    const pal = [C('#0da70b'), C('#5ee85c'), C('#0a6e08'), C('#3ac237'), C('#b5d6b0')];
    const cam = () => S.pick(pal);
    const faceRows = ['........', '........', '.##..##.', '.##..##.', '...##...', '..####..', '..####..', '..#..#..'];
    paintBox(S, 0, 0, 8, 8, 8, (f, x, y) => (f === 'front' && faceRows[y][x] === '#') ? C('#111111') : cam());
    paintBox(S, 16, 16, 8, 12, 4, () => cam());
    paintBox(S, 0, 16, 4, 6, 4, (f, x, y) => y === 5 ? C('#0a4a08') : cam());
  });
  addSkin('pig', S => {
    const pk = C('#f0a5a2'), pd = C('#e08f8d');
    paintBox(S, 0, 0, 8, 8, 8, (f, x, y) => {
      if (f === 'front') { if (y === 3 && (x === 1 || x === 6)) return C('#ffffff'); if (y === 3 && (x === 2 || x === 5)) return C('#1a1a1a'); }
      return S.jit(pk, 5);
    });
    paintBox(S, 32, 0, 4, 3, 1, (f, x, y) => f === 'front' && y === 1 && (x === 0 || x === 3) ? C('#a0524f') : C('#f7c1bf'));
    paintBox(S, 0, 32, 10, 8, 16, (f) => S.jit(f === 'bottom' ? pd : pk, 5));
    paintBox(S, 0, 16, 4, 6, 4, (f, x, y) => y === 5 ? C('#b86a68') : S.jit(pd, 4));
  });
  addSkin('cow', S => {
    const w = C('#eeeeee'), k = C('#2b2b2b');
    const spots = (x, y, s) => (hashString(s + ':' + x + ':' + y) % 5 < 2) ? k : w;
    paintBox(S, 0, 0, 8, 8, 6, (f, x, y) => {
      if (f === 'front') { if (y === 3 && (x === 1 || x === 6)) return C('#ffffff'); if (y === 3 && (x === 2 || x === 5)) return C('#111111'); return (y < 3) ? k : w; }
      return k;
    });
    paintBox(S, 40, 0, 4, 3, 1, (f, x, y) => f === 'front' && y === 1 && (x === 0 || x === 3) ? C('#6a3a3a') : C('#e8b0a8'));
    paintBox(S, 32, 0, 1, 3, 1, () => C('#d8d0c0'));
    paintBox(S, 0, 36, 12, 10, 18, (f, x, y) => spots((x / 3) | 0, (y / 3) | 0, f));
    paintBox(S, 0, 16, 4, 12, 4, (f, x, y) => y > 9 ? C('#3a3a3a') : (y < 5 ? k : w));
  });
  addSkin('sheep', S => {
    const face = C('#e0c8a8');
    paintBox(S, 0, 0, 6, 6, 8, (f, x, y) => {
      if (f === 'front') { if (y === 2 && (x === 1 || x === 4)) return C('#1a1a1a'); if (y === 4 && (x === 2 || x === 3)) return C('#c89a8a'); }
      return S.jit(face, 5);
    });
    paintBox(S, 0, 32, 8, 8, 14, () => S.jit(C('#d8d0c0'), 5));
    paintBox(S, 0, 16, 4, 10, 4, (f, x, y) => y > 7 ? C('#7a6a5a') : S.jit(face, 5));
  });
  addSkin('sheep_wool', S => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const v = 215 + S.r() * 40; S.px(x, y, [v, v, v]); }
  });
  addSkin('chicken', S => {
    const wh = C('#f2f2f2');
    paintBox(S, 0, 0, 4, 6, 3, (f, x, y) => { if (f === 'front' && y === 1 && (x === 0 || x === 3)) return C('#111111'); return S.jit(wh, 4); });
    paintBox(S, 16, 0, 4, 2, 2, () => C('#f0a020'));
    paintBox(S, 16, 8, 2, 2, 2, () => C('#d0302c'));
    paintBox(S, 0, 16, 6, 6, 8, () => S.jit(wh, 5));
    paintBox(S, 32, 16, 1, 4, 6, () => S.jit(C('#e2e2e2'), 5));
    paintBox(S, 32, 32, 1, 5, 1, () => C('#e8a030'));
  });
  // --- second player: long brown hair, blue eyes, purple top ---
  addSkin('sister', S => {
    const skin = C('#f3c6a5'), skinSh = C('#e3ae8c');
    const hair = [C('#6b4226'), C('#7a4c2c'), C('#5e391f'), C('#845532')], hairDk = C('#4a2c16');
    const shirt = C('#8e4fd0'), shirtDk = C('#6e36a8'), legs = C('#2f3f8a'), legsDk = C('#26336f'), shoe = C('#e86a9a'), sole = C('#f4f4f4');
    const H = () => S.pick(hair);
    paintBox(S, 0, 0, 8, 8, 8, (f, x, y) => {
      if (f === 'top' || f === 'back') return H();
      if (f === 'bottom') return skinSh;
      if (f === 'left' || f === 'right') {
        const nearFront = f === 'right' ? x >= 6 : x <= 1;
        if (y < 3 || !nearFront) return H();
        return y === 7 ? skinSh : skin;
      }
      if (y < 2) return H();
      if (x === 0 || x === 7) return H();
      if (y === 2) return x === 1 || x === 2 ? H() : skin;
      if (y === 3) return (x === 1 || x === 2 || x === 5 || x === 6) ? C('#5a3a22') : skin;
      if (y === 4) return x === 1 || x === 6 ? C('#ffffff') : x === 2 || x === 5 ? C('#4a90f0') : skin;
      if (y === 5) return x === 1 || x === 6 ? C('#e8eef6') : x === 2 || x === 5 ? C('#2458c0') : (x === 3 || x === 4) ? skinSh : skin;
      if (y === 6) return (x === 1 || x === 6) ? C('#f4a8a0') : skin;
      if (y === 7) return (x === 3 || x === 4) ? C('#d0606a') : skin;
      return skin;
    });
    paintBox(S, 32, 0, 8, 8, 8, (f, x, y) => {
      if (f === 'top') return H();
      if (f === 'bottom') return null;
      if (f === 'back') return y === 7 && x % 2 ? hairDk : H();
      if (f === 'left' || f === 'right') { const nearFront = f === 'right' ? x >= 6 : x <= 1; return (y < 3 || !nearFront) ? (y > 5 && x % 3 === 0 ? hairDk : H()) : null; }
      if (y === 0) return H();
      if (y === 1) return x < 4 || x === 7 ? H() : null;
      return (x === 0 || x === 7) && y < 7 ? H() : null;
    });
    const HEART = ['##.##', '#####', '.###.', '..#..'];
    paintBox(S, 16, 16, 8, 12, 4, (f, x, y) => {
      if (f === 'top') return shirt;
      if (f === 'bottom') return legs;
      if (f === 'back' && y < 4) return y === 3 && x % 2 ? hairDk : H();
      if (y === 11) return shirtDk;
      if (f === 'front') {
        if (y === 0 && x >= 2 && x <= 5) return (x === 3 || x === 4) ? skin : shirtDk;
        if (y >= 4 && y <= 7 && x >= 2 && x <= 6 && HEART[y - 4][x - 2] === '#') return C('#ffb0d8');
      }
      return S.jit(shirt, 5);
    });
    const arm = (u, v) => paintBox(S, u, v, 4, 12, 4, (f, x, y) => {
      if (f === 'top') return shirt;
      if (f === 'bottom') return skinSh;
      if (y < 3) return S.jit(shirt, 5);
      if (y === 3) return shirtDk;
      return y === 11 ? skinSh : skin;
    });
    arm(40, 16); arm(32, 48);
    const leg = (u, v) => paintBox(S, u, v, 4, 12, 4, (f, x, y) => {
      if (f === 'top') return legs;
      if (f === 'bottom') return sole;
      if (y >= 10) return y === 11 ? sole : shoe;
      return S.jit((f === 'left' || f === 'right') && x === 3 ? legsDk : legs, 5);
    });
    leg(0, 16); leg(16, 48);
  });
  // --- villagers: tall head, big nose, robe and folded arms; one skin per job ---
  const VSKIN = C('#c9936f'), VSKIN_SH = C('#b07a5c');
  const paintVillager = (S, o) => {
    const hair = o.hair || C('#4a3222');
    const straw = C('#d8c060'), cap = C('#3a3a3a');
    paintBox(S, 0, 0, 8, 10, 8, (f, x, y) => {
      if (f === 'top') return S.jit(o.hat === 'straw' ? straw : o.hat === 'cap' ? cap : o.hat === 'hood' ? o.robe : hair, 5);
      if (f === 'bottom') return VSKIN_SH;
      if (o.hat === 'hood' && (f !== 'front' ? y < 9 : (y < 2 || x === 0 || x === 7))) return S.jit(o.robe, 5);
      if (o.hat === 'straw' && y < 2) return S.jit(straw, 6);
      if (o.hat === 'straw' && y === 2) return C('#b89a40');
      if (o.hat === 'cap' && y < 2) return S.jit(cap, 4);
      if (o.hat === 'band' && y === 1) return C('#c0302a');
      if (f === 'front') {
        if (y < 2) return S.jit(hair, 5);
        if (y === 3) return (x === 1 || x === 2 || x === 5 || x === 6) ? C('#3a2a1a') : VSKIN;
        if (y === 4) return x === 1 || x === 6 ? C('#f4f4f4') : x === 2 || x === 5 ? C('#2e8a3a') : VSKIN;
        if (y === 9 && x >= 2 && x <= 5) return VSKIN_SH;
        return VSKIN;
      }
      if (f === 'back') return y < 6 ? S.jit(hair, 5) : VSKIN;
      return y < 2 ? S.jit(hair, 5) : VSKIN;
    });
    paintBox(S, 32, 0, 2, 4, 2, (f, x, y) => y === 3 && f === 'front' ? mulc(VSKIN_SH, 0.9) : VSKIN_SH);
    paintBox(S, 40, 0, 4, 6, 4, (f, x, y) => y >= 4 ? C('#2a2420') : S.jit(C('#4a3a2c'), 4));
    paintBox(S, 0, 20, 8, 19, 6, (f, x, y, fw, fh) => {
      if (f === 'top') return o.robe;
      if (f === 'bottom' || y === fh - 1) return o.robeDk;
      if (o.belt && y === 8) return o.belt;
      if (f === 'front' && o.apron && y >= 5 && y < fh - 2 && x >= 1 && x <= 6) return S.jit(o.apron, 4);
      if (o.trim && f === 'front' && (x === 3 || x === 4) && y > 1) return o.trim;
      return S.jit(o.robe, 5);
    });
    paintBox(S, 32, 20, 4, 8, 4, (f) => f === 'bottom' ? VSKIN : S.jit(o.robe, 5));
    paintBox(S, 0, 46, 16, 4, 4, (f, x) => (f === 'front' || f === 'top' || f === 'bottom') && x >= 6 && x <= 9 ? VSKIN : S.jit(o.robeDk, 4));
  };
  const VILLAGER_LOOKS = {
    farmer: { robe: C('#8a5a33'), robeDk: C('#6a4222'), hat: 'straw', belt: C('#4a3018') },
    butcher: { robe: C('#7a4a2a'), robeDk: C('#5a3218'), apron: C('#f0f0f0'), hat: 'band' },
    toolsmith: { robe: C('#5a4a3a'), robeDk: C('#3a3024'), apron: C('#262626'), hat: 'cap' },
    shepherd: { robe: C('#e8dcc0'), robeDk: C('#c8b898'), belt: C('#7a4a22'), hair: C('#6a4a2a') },
    mason: { robe: C('#7c7c7c'), robeDk: C('#5a5a5a'), apron: C('#cfcfcf'), hair: C('#2a2a2a') },
    cleric: { robe: C('#6a2a8a'), robeDk: C('#4a1a64'), trim: C('#e0b830'), hat: 'hood' },
  };
  for (const prof in VILLAGER_LOOKS) addSkin('villager_' + prof, S => paintVillager(S, VILLAGER_LOOKS[prof]));
  // --- Endermen: tall and black, purple eyes; the jaw drops when one is angry ---
  const ENDER = C('#161616'), ENDER_LT = C('#242424'), EYE = C('#e079fa'), EYE_IN = C('#cc00fa');
  const enderSkin = S => {
    const blk = () => S.r() < 0.12 ? ENDER_LT : S.jit(ENDER, 4);
    paintBox(S, 0, 0, 8, 6, 8, (f, x, y) => {   // upper head
      if (f === 'front' && y === 3 && (x <= 2 || x >= 5)) return (x === 1 || x === 6) ? EYE_IN : EYE;
      if (f === 'bottom') return C('#3a0a3a');
      return blk();
    });
    paintBox(S, 32, 0, 8, 2, 8, (f) => f === 'top' ? C('#3a0a3a') : blk());   // jaw
    paintBox(S, 16, 16, 8, 12, 4, () => blk());
    paintBox(S, 48, 16, 2, 30, 2, () => blk());
    paintBox(S, 56, 16, 2, 30, 2, () => blk());
  };
  addSkin('enderman', enderSkin);
  // --- Ghasts: big, white, crying; eyes and mouth open when one shoots ---
  const ghastSkin = (S, fire) => {
    const wh = C('#f2f2f2'), gr = C('#d6d6d6');
    paintBox(S, 0, 0, 16, 16, 16, (f, x, y) => {
      if (f === 'front') {
        const eye = (x >= 3 && x <= 5) || (x >= 10 && x <= 12);
        if (fire) {
          if (eye && y >= 5 && y <= 7) return (x === 4 || x === 11) && y === 6 ? C('#1a0000') : C('#b01818');
          if (y >= 10 && y <= 13 && x >= 5 && x <= 10) return y === 10 || x === 5 || x === 10 ? C('#5a0a0a') : C('#2a0505');
        } else {
          if (eye && y === 6) return C('#4a4a4a');
          if ((x === 4 || x === 11) && y >= 7 && y <= 10) return C('#a8b8c0');   // tears
          if (y === 12 && x >= 6 && x <= 9) return C('#4a4a4a');
        }
      }
      return S.r() < 0.1 ? gr : S.jit(wh, 4);
    });
    paintBox(S, 0, 32, 2, 14, 2, (f, x, y) => S.jit(y > 10 ? gr : wh, 5));
  };
  addSkin('ghast', S => ghastSkin(S, false));
  addSkin('ghast_fire', S => ghastSkin(S, true));
  // --- minecart: riveted iron, darker inside ---
  addSkin('minecart', S => {
    const plate = (f, x, y, fw, fh) => {
      if (x === 0 || y === 0) return C('#9a9a9a');
      if (x === fw - 1 || y === fh - 1) return C('#4a4a4a');
      if ((x === 1 || x === fw - 2) && (y === 1 || y === fh - 2)) return C('#bcbcbc');   // rivets
      return S.jit(f === 'top' ? C('#5a5a5a') : C('#727272'), 5);
    };
    paintBox(S, 0, 0, 14, 2, 18, plate);       // floor
    paintBox(S, 0, 20, 2, 7, 14, plate);       // long sides
    paintBox(S, 32, 20, 14, 7, 2, plate);      // ends
    paintBox(S, 32, 30, 1, 3, 3, (f, x, y) => (f === 'left' || f === 'right') && x === 1 && y === 1 ? C('#9a9a9a') : C('#2a2a2a'));   // wheels
  });
  // --- the car: a red convertible with a windscreen, headlights and black wheels (1 pixel = 1/8 block) ---
  addSkin('car', S => {
    const red = C('#d42a2a'), redLt = C('#ff5a4a'), redDk = C('#9a1a1a');
    const paint = (f, x, y, fw, fh) => f === 'top' ? S.jit(redLt, 4) : f === 'bottom' ? C('#2a2a2a') : y === fh - 1 ? redDk : S.jit(red, 4);
    paintBox(S, 0, 0, 11, 2, 18, (f, x, y, fw, fh) => f === 'top' ? S.jit(C('#3a3a3a'), 4) : paint(f, x, y, fw, fh));   // floor pan
    paintBox(S, 0, 20, 1, 3, 18, paint);   // sides
    paintBox(S, 0, 41, 9, 3, 6, (f, x, y, fw, fh) => {   // hood, with headlights and a grille in front
      if (f === 'front' && y === 1 && (x <= 1 || x >= fw - 2)) return C('#fff3a0');
      if (f === 'front' && y >= 1 && x >= 3 && x <= fw - 4) return (x % 2) ? C('#3a3a3a') : C('#8a8a8a');
      return paint(f, x, y, fw, fh);
    });
    paintBox(S, 30, 41, 9, 3, 5, paint);   // trunk
    paintBox(S, 0, 50, 8, 1, 4, () => S.jit(C('#5a3a20'), 6));   // seat cushion
    paintBox(S, 24, 50, 8, 4, 1, () => S.jit(C('#4a3018'), 6));   // seat back
    paintBox(S, 42, 50, 9, 3, 1, (f, x, y, fw) => (f === 'front' || f === 'back') && x > 0 && x < fw - 1 && y > 0 ? null : C('#c8c8c8'));   // windscreen frame
    paintBox(S, 0, 56, 1, 3, 3, (f, x, y) => (f === 'left' || f === 'right') ? (x === 1 && y === 1 ? C('#d0d0d0') : C('#1e1e1e')) : C('#2a2a2a'));   // wheels with hubcaps
    paintBox(S, 8, 56, 2, 2, 1, () => C('#1a1a1a'));   // steering wheel
    paintBox(S, 14, 56, 9, 1, 1, (f, x) => f === 'back' && (x <= 1 || x >= 7) ? C('#ff3030') : C('#2a2a2a'));   // back bumper, tail lights
  });
  addSkin('item_glint', S => { /* reserved */ });
}
/* a player's face as a small picture, for menus */
function faceIcon(skin, size) {
  const d = SKIN_DATA[SKIN[skin]], cv = document.createElement('canvas');
  cv.width = cv.height = size || 64;
  const ctx = cv.getContext('2d'), s = cv.width / 8;
  const at = (u, v) => { const i = (v * 64 + u) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const hat = at(40 + x, 8 + y), c = hat[3] > 0 ? hat : at(8 + x, 8 + y);
    ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    ctx.fillRect(x * s, y * s, s, s);
  }
  return cv.toDataURL();
}

/* ---------- canvases for UI: tiles, icons, hearts ---------- */
function tileCanvas(name, size) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size || 16;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const src = document.createElement('canvas'); src.width = src.height = 16;
  src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(TILE_DATA[TILE[name]]), 16, 16), 0, 0);
  ctx.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}
const ICONS = {};      // id -> dataURL
function tileSrc(name) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(TILE_DATA[TILE[name]]), 16, 16), 0, 0);
  return c;
}
function blockFaceTiles(id) {
  const t = BLOCKS[id].tex;
  if (typeof t === 'string') return { top: t, side: t, front: t };
  return { top: t.top || t.side, side: t.side, front: t.front || t.side };
}
function buildIcons() {
  const S = 64, s = S / 32;
  const all = CREATIVE_LIST.concat([B.FURNACE_LIT, I.CROSSBOW_LOADED]);
  for (const id of all) {
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    if (id < 256 && (RENDER[id] === R_CUBE || RENDER[id] === R_LIQUID || RENDER[id] === R_CACTUS || RENDER[id] === R_BED)) {
      const ft = blockFaceTiles(id);
      const sideH = RENDER[id] === R_BED ? 0.6 : 1;
      const draw = (name, a, b, c, d, e, f, dark) => {
        ctx.setTransform(a, b, c, d, e, f);
        ctx.drawImage(tileSrc(name), 0, 0, 16, 16);
        if (dark) { ctx.fillStyle = 'rgba(0,0,0,' + dark + ')'; ctx.fillRect(0, 0, 16, 16); }
      };
      const yo = (1 - sideH) * 16 * s;
      draw(ft.top, s, s / 2, -s, s / 2, 16 * s, yo, 0);
      draw(ft.front, s, s / 2, 0, s * sideH, 0, 8 * s + yo, 0.18);
      draw(ft.side, s, -s / 2, 0, s * sideH, 16 * s, 16 * s + yo, 0.38);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      const name = id < 256 ? blockFaceTiles(id).side : ITEMS[id].tex;
      ctx.drawImage(tileSrc(name), 0, 0, S, S);
    }
    ICONS[id] = cv.toDataURL();
  }
}
function pixelIcon(rows, pal, scale) {
  const w = rows[0].length, hgt = rows.length, sc = scale || 4;
  const cv = document.createElement('canvas'); cv.width = w * sc; cv.height = hgt * sc;
  const ctx = cv.getContext('2d');
  rows.forEach((row, y) => { for (let x = 0; x < w; x++) { const c = pal[row[x]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x * sc, y * sc, sc, sc); } } });
  return cv.toDataURL();
}
const HUD_ICONS = {};
function buildHudIcons() {
  const heart = ['.KK...KK.', 'KRRK.KRRK', 'KRWRRRRRK', 'KRRRRRRRK', '.KRRRRRK.', '..KRRRK..', '...KRK...', '....K....'];
  const pal = { K: '#1a0a0a', R: '#e0282a', W: '#ffd0d0', D: '#7a1a1a', E: '#3a2a2a' };
  HUD_ICONS.heart = pixelIcon(heart, pal);
  HUD_ICONS.heartHalf = pixelIcon(heart.map(r => r.split('').map((c, x) => (x > 4 && c !== 'K' && c !== '.') ? 'E' : c).join('')), pal);
  HUD_ICONS.heartEmpty = pixelIcon(heart.map(r => r.replace(/[RW]/g, 'E')), pal);
  const food = ['....KK..', '...KBBK.', '..KBBBK.', '.KMMBK..', 'KMMMK...', 'KMMK....', '.KK.....'];
  const fpal = { K: '#2a1a0a', B: '#f0e6d0', M: '#b5652a', E: '#3a2a1a' };
  HUD_ICONS.food = pixelIcon(food, fpal);
  HUD_ICONS.foodHalf = pixelIcon(food.map(r => r.split('').map((c, x) => (x < 4 && c === 'M') ? 'E' : c).join('')), fpal);
  HUD_ICONS.foodEmpty = pixelIcon(food.map(r => r.replace(/[MB]/g, 'E')), fpal);
  HUD_ICONS.bubble = pixelIcon(['..KKK..', '.KWBBK.', 'KWBBBBK', 'KBBBBBK', 'KBBBBBK', '.KBBBK.', '..KKK..'], { K: '#1a3a8a', W: '#ffffff', B: '#6ab0ff' });
}

function buildAllArt() {
  buildTiles();
  buildSkins();
}
