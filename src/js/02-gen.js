/* ===================== World generation =====================
   genModule is self-contained: it is serialized into a Web Worker with
   Function.prototype.toString and also called directly as a fallback. */
function genModule(B, P) {
  'use strict';
  const CS = 16, WH = 128, CVOL = CS * CS * WH;
  const OPQ = Uint8Array.from(P.opaque), FIL = Uint8Array.from(P.filter), EMI = Uint8Array.from(P.emit);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const c01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const idx = (x, y, z) => x | (z << 4) | (y << 8);

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash3(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x3c6ef372, 0x165667b1) ^ Math.imul((c | 0) - 0x61c88647, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  const r01 = (a, b, c) => hash3(a, b, c) / 4294967296;

  /* ---- seeded simplex noise (after Stefan Gustavson, public domain) ---- */
  const GRAD3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6, F3 = 1 / 3, G3 = 1 / 6;
  function makeNoise(seed) {
    const rnd = mulberry32(seed >>> 0);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
    const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }
    function n2(xin, yin) {
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s), j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t), y0 = yin - (j - t);
      const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      let n = 0, tt;
      tt = 0.5 - x0 * x0 - y0 * y0;
      if (tt > 0) { const g = pm12[ii + perm[jj]] * 3; tt *= tt; n += tt * tt * (GRAD3[g] * x0 + GRAD3[g + 1] * y0); }
      tt = 0.5 - x1 * x1 - y1 * y1;
      if (tt > 0) { const g = pm12[ii + i1 + perm[jj + j1]] * 3; tt *= tt; n += tt * tt * (GRAD3[g] * x1 + GRAD3[g + 1] * y1); }
      tt = 0.5 - x2 * x2 - y2 * y2;
      if (tt > 0) { const g = pm12[ii + 1 + perm[jj + 1]] * 3; tt *= tt; n += tt * tt * (GRAD3[g] * x2 + GRAD3[g + 1] * y2); }
      return 70 * n;
    }
    function n3(xin, yin, zin) {
      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
      const t = (i + j + k) * G3;
      const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }
      const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      const ii = i & 255, jj = j & 255, kk = k & 255;
      let n = 0, tt;
      tt = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (tt > 0) { const g = pm12[ii + perm[jj + perm[kk]]] * 3; tt *= tt; n += tt * tt * (GRAD3[g] * x0 + GRAD3[g + 1] * y0 + GRAD3[g + 2] * z0); }
      tt = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (tt > 0) { const g = pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; tt *= tt; n += tt * tt * (GRAD3[g] * x1 + GRAD3[g + 1] * y1 + GRAD3[g + 2] * z1); }
      tt = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (tt > 0) { const g = pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; tt *= tt; n += tt * tt * (GRAD3[g] * x2 + GRAD3[g + 1] * y2 + GRAD3[g + 2] * z2); }
      tt = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (tt > 0) { const g = pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; tt *= tt; n += tt * tt * (GRAD3[g] * x3 + GRAD3[g + 1] * y3 + GRAD3[g + 2] * z3); }
      return 32 * n;
    }
    return { n2, n3 };
  }
  function fbm2(n, x, z, oct) {
    let a = 1, f = 1, s = 0, t = 0;
    for (let o = 0; o < oct; o++) { s += a * n.n2(x * f, z * f); t += a; a *= 0.5; f *= 2.03; }
    return s / t;
  }

  const OCEAN = 0, BEACH = 1, PLAINS = 2, FOREST = 3, DESERT = 4, SNOWY = 5, PEAKS = 6, FROZEN = 7;
  const FLOWERS = [B.DANDELION, B.POPPY, B.CORNFLOWER];
  const MOBS = ['pig', 'cow', 'sheep', 'chicken'];

  /* ---- shared helpers for decoration ---- */
  function put(blocks, cx, cz, wx, y, wz, id, onlyAir) {
    const lx = wx - cx * 16, lz = wz - cz * 16;
    if (lx < 0 || lx > 15 || lz < 0 || lz > 15 || y < 1 || y >= WH) return;
    const i = idx(lx, y, lz);
    if (onlyAir) { const b = blocks[i]; if (b !== B.AIR && b !== B.TALL_GRASS && b !== B.DANDELION && b !== B.POPPY && b !== B.CORNFLOWER) return; }
    blocks[i] = id;
  }
  const SPRUCE_RAD = [0, 1, 1, 2, 1, 2, 2, 3, 2, 3, 3];
  function placeTree(blocks, cx, cz, x, y, z, kind, hr) {
    if (kind === 2) {
      const hgt = 6 + ((hr * 4) | 0);
      for (let dy = hgt; dy >= 2; dy--) {
        const k = hgt - dy, rad = SPRUCE_RAD[Math.min(k, SPRUCE_RAD.length - 1)];
        for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
          if (rad > 0 && Math.abs(dx) + Math.abs(dz) > rad + (rad > 1 ? 1 : 0)) continue;
          put(blocks, cx, cz, x + dx, y + dy, z + dz, B.SPRUCE_LEAVES, true);
        }
      }
      put(blocks, cx, cz, x, y + hgt + 1, z, B.SPRUCE_LEAVES, true);
      for (let dy = 0; dy < hgt; dy++) put(blocks, cx, cz, x, y + dy, z, B.SPRUCE_LOG, false);
    } else {
      const log = kind === 1 ? B.BIRCH_LOG : B.OAK_LOG, leaf = kind === 1 ? B.BIRCH_LEAVES : B.OAK_LEAVES;
      const hgt = (kind === 1 ? 5 : 4) + ((hr * 3) | 0);
      for (let dy = hgt - 3; dy <= hgt; dy++) {
        const rad = dy >= hgt - 1 ? 1 : 2;
        for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
          const corner = Math.abs(dx) === rad && Math.abs(dz) === rad;
          if (corner && (dy === hgt || r01(x + dx, y + dy, z + dz) < 0.5)) continue;
          put(blocks, cx, cz, x + dx, y + dy, z + dz, leaf, true);
        }
      }
      for (let dy = 0; dy < hgt; dy++) put(blocks, cx, cz, x, y + dy, z, log, false);
    }
    put(blocks, cx, cz, x, y - 1, z, B.DIRT, false);
  }
  function oreVeins(blocks, r, host, list) {
    for (const [id, tries, ymin, ymax, size] of list) {
      for (let t = 0; t < tries; t++) {
        let x = (r() * 16) | 0, y = ymin + ((r() * (ymax - ymin)) | 0), z = (r() * 16) | 0;
        for (let s = 0; s < size; s++) {
          if (x >= 0 && x < 16 && z >= 0 && z < 16 && y > 0 && y < WH) {
            const i = idx(x, y, z);
            if (blocks[i] === host) blocks[i] = id;
          }
          const d = (r() * 6) | 0;
          if (d === 0) x++; else if (d === 1) x--; else if (d === 2) z++; else if (d === 3) z--; else if (d === 4) y++; else y--;
        }
      }
    }
  }
  /* In-column decoration on top of a surface block at height h. */
  function decorate(blocks, r, lx, lz, h, bio) {
    if (h + 1 >= WH) return;
    const sb = blocks[idx(lx, h, lz)], ai = idx(lx, h + 1, lz);
    if (blocks[ai] !== B.AIR) return;
    const q = r();
    if (sb === B.GRASS) {
      if (bio === PLAINS) {
        if (q < 0.14) blocks[ai] = B.TALL_GRASS;
        else if (q < 0.175) blocks[ai] = FLOWERS[(r() * 3) | 0];
        else if (q < 0.1765) blocks[ai] = B.PUMPKIN;
      } else if (bio === FOREST) {
        if (q < 0.07) blocks[ai] = B.TALL_GRASS;
        else if (q < 0.082) blocks[ai] = FLOWERS[(r() * 3) | 0];
      }
    } else if (sb === B.SAND && bio === DESERT) {
      if (q < 0.005 && lx > 0 && lx < 15 && lz > 0 && lz < 15) {
        const tall = 1 + ((r() * 3) | 0);
        for (let k = 1; k <= tall && h + k < WH; k++) {
          const y = h + k;
          if (blocks[idx(lx + 1, y, lz)] || blocks[idx(lx - 1, y, lz)] || blocks[idx(lx, y, lz + 1)] || blocks[idx(lx, y, lz - 1)]) break;
          blocks[idx(lx, y, lz)] = B.CACTUS;
        }
      } else if (q < 0.014) blocks[ai] = B.DEAD_BUSH;
    }
  }

  /* ========== Map 1: Sunny Valley ========== */
  function valleyGen(seed) {
    const SEA = 48;
    const nC = makeNoise(seed ^ 0x1a2b3c), nE = makeNoise(seed ^ 0x2b3c4d), nR = makeNoise(seed ^ 0x3c4d5e),
      nD = makeNoise(seed ^ 0x4d5e6f), nT = makeNoise(seed ^ 0x5e6f70), nM = makeNoise(seed ^ 0x6f7081),
      nK1 = makeNoise(seed ^ 0x708192), nK2 = makeNoise(seed ^ 0x8192a3), nK3 = makeNoise(seed ^ 0x92a3b4);
    function column(x, z) {
      const c = fbm2(nC, x * 0.0017, z * 0.0017, 4) * 1.5 + 0.1;
      const e = fbm2(nE, x * 0.004, z * 0.004, 3) * 1.4;
      const rg = 1 - Math.abs(fbm2(nR, x * 0.0055, z * 0.0055, 4) * 1.6);
      const d = fbm2(nD, x * 0.028, z * 0.028, 3);
      let h = c < -0.2 ? SEA - 6 + (c + 0.2) * 45 : SEA - 6 + (c + 0.2) * 32;
      h += d * (2.5 + 6 * c01(e + 0.4));
      const mt = c01((c - 0.08) * 3) * c01(e * 1.3 + 0.2);
      h += mt * Math.pow(c01(rg), 2.4) * 60;
      h = Math.round(clamp(h, 8, WH - 14));
      let t = nT.n2(x * 0.0021, z * 0.0021);
      if (h > 78) t -= (h - 78) * 0.025;
      const m = nM.n2(x * 0.0024, z * 0.0024);
      let bio;
      if (h < SEA) bio = t < -0.5 ? FROZEN : OCEAN;
      else if (h <= SEA + 2 && c < -0.08) bio = t < -0.45 ? SNOWY : (t > 0.4 && m < 0.05 ? DESERT : BEACH);
      else if (h >= 90) bio = PEAKS;
      else if (t < -0.42) bio = SNOWY;
      else if (t > 0.38 && m < 0.08) bio = DESERT;
      else if (m > 0.1) bio = FOREST;
      else bio = PLAINS;
      return h | (bio << 8);
    }
    // coarse cave grids (every 4 blocks), trilinearly interpolated
    const GN = 5 * 33 * 5, K1 = new Float32Array(GN), K2 = new Float32Array(GN), K3 = new Float32Array(GN);
    function sampleCaves(cx, cz) {
      let k = 0;
      for (let gy = 0; gy < 33; gy++) for (let gz = 0; gz < 5; gz++) for (let gx = 0; gx < 5; gx++, k++) {
        const x = cx * 16 + gx * 4, y = gy * 4, z = cz * 16 + gz * 4;
        K1[k] = nK1.n3(x * 0.03, y * 0.05, z * 0.03);
        K2[k] = nK2.n3(x * 0.03, y * 0.05, z * 0.03);
        K3[k] = y < 60 ? nK3.n3(x * 0.017, y * 0.03, z * 0.017) : -1;
      }
    }
    function tri(G, lx, y, lz) {
      const fx = lx * 0.25, fy = y * 0.25, fz = lz * 0.25;
      const x0 = fx | 0, y0 = fy | 0, z0 = fz | 0, tx = fx - x0, ty = fy - y0, tz = fz - z0;
      const i = (y0 * 5 + z0) * 5 + x0;
      const a = G[i] + (G[i + 1] - G[i]) * tx, b = G[i + 5] + (G[i + 6] - G[i + 5]) * tx;
      const c = G[i + 25] + (G[i + 26] - G[i + 25]) * tx, d = G[i + 30] + (G[i + 31] - G[i + 30]) * tx;
      const e = a + (b - a) * tz, f = c + (d - c) * tz;
      return e + (f - e) * ty;
    }
    function isCave(lx, y, lz, h) {
      if (y < 5 || y > h) return false;
      if (h <= SEA + 1 && y > h - 7) return false;
      const a = tri(K1, lx, y, lz), b = tri(K2, lx, y, lz);
      let th = 0.0042;
      if (y > h - 5) th *= 0.5;
      if (a * a + b * b < th) return true;
      if (y < 54 && y < h - 8) { const c = tri(K3, lx, y, lz); if (c > 0.6 - (54 - y) * 0.0025) return true; }
      return false;
    }
    function generate(cx, cz, vb) {
      const blocks = new Uint8Array(CVOL);
      const x0 = cx * 16, z0 = cz * 16;
      const cols = new Int32Array(256);
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) cols[lz * 16 + lx] = column(x0 + lx, z0 + lz);
      sampleCaves(cx, cz);
      const r = mulberry32(hash3(seed, cx, cz));
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const cv = cols[lz * 16 + lx], h = cv & 255, bio = cv >> 8;
        let slope = 0;
        const hn = [lx > 0 ? cols[lz * 16 + lx - 1] : cv, lx < 15 ? cols[lz * 16 + lx + 1] : cv, lz > 0 ? cols[(lz - 1) * 16 + lx] : cv, lz < 15 ? cols[(lz + 1) * 16 + lx] : cv];
        for (const n of hn) slope = Math.max(slope, Math.abs((n & 255) - h));
        const top = Math.max(h, SEA);
        const sandy = bio === DESERT || bio === BEACH;
        const wet = bio === OCEAN || bio === FROZEN;
        const rocky = (bio === PEAKS || h > 84) && slope >= 3;
        for (let y = 0; y <= top; y++) {
          let b;
          if (y === 0) b = B.BEDROCK;
          else if (y < 4 && r() < 0.75 - y * 0.2) b = B.BEDROCK;
          else if (y < h - 3) b = B.STONE;
          else if (y < h) {
            if (sandy) b = y < h - 2 ? B.SANDSTONE : B.SAND;
            else if (wet) b = h > SEA - 6 ? B.SAND : B.GRAVEL;
            else if (rocky || bio === PEAKS) b = B.STONE;
            else b = B.DIRT;
          } else if (y === h) {
            if (wet) b = h > SEA - 5 ? B.SAND : (r01(x0 + lx, 7, z0 + lz) < 0.25 ? B.CLAY : B.GRAVEL);
            else if (sandy) b = B.SAND;
            else if (rocky) b = h >= 100 ? B.SNOW : B.STONE;
            else if (bio === PEAKS) b = h >= 96 ? B.SNOW : B.SNOWY_GRASS;
            else if (bio === SNOWY) b = B.SNOWY_GRASS;
            else b = B.GRASS;
          } else {
            b = (y === SEA && (bio === FROZEN || bio === SNOWY)) ? B.ICE : B.WATER;
          }
          if (b !== B.BEDROCK && b !== B.WATER && b !== B.ICE && isCave(lx, y, lz, h)) b = y <= 9 ? B.LAVA : B.AIR;
          blocks[idx(lx, y, lz)] = b;
        }
      }
      oreVeins(blocks, r, B.STONE, [[B.COAL_ORE, 18, 5, 110, 9], [B.IRON_ORE, 11, 5, 64, 7], [B.GOLD_ORE, 3, 5, 32, 6],
        [B.DIAMOND_ORE, 2, 5, 16, 5], [B.GRAVEL, 4, 5, 90, 18], [B.DIRT, 4, 5, 90, 18]]);
      // emeralds: single blocks, commoner under mountains (own random stream so older worlds keep their layout)
      const er = mulberry32(hash3(seed + 31, cx, cz));
      for (let t = 0; t < 4; t++) {
        const lx = (er() * 16) | 0, lz = (er() * 16) | 0, ey = 5 + ((er() * 44) | 0), keep = er();
        if (keep < ((cols[lz * 16 + lx] & 255) > 80 ? 0.8 : 0.2) && blocks[idx(lx, ey, lz)] === B.STONE) blocks[idx(lx, ey, lz)] = B.EMERALD_ORE;
      }
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) { const cv = cols[lz * 16 + lx]; decorate(blocks, r, lx, lz, cv & 255, cv >> 8); }
      // trees from this chunk and its neighbours (so canopies cross borders cleanly)
      for (let ncz = cz - 1; ncz <= cz + 1; ncz++) for (let ncx = cx - 1; ncx <= cx + 1; ncx++) {
        const tr = mulberry32(hash3(seed + 7, ncx, ncz));
        for (let k = 0; k < 8; k++) {
          const tx = ncx * 16 + ((tr() * 16) | 0), tz = ncz * 16 + ((tr() * 16) | 0);
          const roll = tr(), kr = tr(), hr = tr();
          const own = ncx === cx && ncz === cz;
          const cv = own ? cols[(tz - z0) * 16 + (tx - x0)] : column(tx, tz);
          const th = cv & 255, tb = cv >> 8;
          if (th <= SEA || th > WH - 20) continue;
          let dens = 0, kind = 0;
          if (tb === FOREST) { dens = 0.8; kind = kr < 0.3 ? 1 : 0; }
          else if (tb === PLAINS) { dens = 0.07; kind = kr < 0.15 ? 1 : 0; }
          else if (tb === SNOWY) { dens = 0.35; kind = 2; }
          else if (tb === PEAKS && th < 96) { dens = 0.05; kind = 2; }
          if (roll >= dens) continue;
          if (own) { const sb = blocks[idx(tx - x0, th, tz - z0)]; if (sb !== B.GRASS && sb !== B.SNOWY_GRASS) continue; }
          placeTree(blocks, cx, cz, tx, th + 1, tz, kind, hr);
        }
      }
      const spawns = [];
      // villages near this chunk (built after trees so houses replace any branches in the way)
      let data = null;
      const cgx = Math.floor(x0 / VCELL), cgz = Math.floor(z0 / VCELL);
      for (let gz = cgz - 1; gz <= cgz + 1; gz++) for (let gx = cgx - 1; gx <= cgx + 1; gx++) {
        const v = villageAt(gx, gz);
        if (!v || (vb && vb.has(v.id))) continue;
        const bb = v.bbox;
        if (bb[2] < x0 || bb[0] > x0 + 15 || bb[3] < z0 || bb[1] > z0 + 15) continue;
        if (!data) data = new Uint8Array(CVOL);
        buildVillage(blocks, data, cx, cz, v, cols);
        const sx = v.x, sz = v.z + 3;
        if (sx >= x0 && sx < x0 + 16 && sz >= z0 && sz < z0 + 16) spawns.push(['villager', sx + 0.5, (cols[(sz - z0) * 16 + (sx - x0)] & 255) + 1, sz + 0.5, v.profs.length, v.id, v.profs.join(',')]);
      }
      if (r() < 0.16) {
        const type = MOBS[(r() * 4) | 0], count = 2 + ((r() * 3) | 0);
        for (let a = 0; a < 6; a++) {
          const lx = 1 + ((r() * 14) | 0), lz = 1 + ((r() * 14) | 0);
          const cv = cols[lz * 16 + lx], hh = cv & 255, bio = cv >> 8;
          if ((bio === PLAINS || bio === FOREST) && blocks[idx(lx, hh, lz)] === B.GRASS && hh + 2 < WH && !OPQ[blocks[idx(lx, hh + 1, lz)]]) {
            spawns.push([type, x0 + lx + 0.5, hh + 1, z0 + lz + 0.5, count]); break;
          }
        }
      }
      return { blocks, spawns, data };
    }

    /* ---- villages: a well, gravel paths, houses and gardens ---- */
    const VCELL = 176, VR = 26;
    const PROFS = ['farmer', 'butcher', 'toolsmith', 'shepherd', 'mason', 'cleric'];
    const vcache = new Map();
    let spawnXZ = null;
    const VSLOTS = [[0, -12], [12, 0], [0, 12], [-12, 0]];
    /* How good a spot is for a village well: null if it can't hold one, otherwise a score (higher is better).
       A village needs mostly dry, gently sloping land; houses stand on cobblestone footings where the ground dips. */
    function villageSite(x, z) {
      const cv = column(x, z), y = cv & 255, bio = cv >> 8;
      if (y <= SEA + 1 || y > 84 || bio === PEAKS || bio === FROZEN || bio === BEACH || bio === OCEAN) return null;
      let bad = 0, dev = 0, n = 0;
      for (let dz = -14; dz <= 14; dz += 7) for (let dx = -14; dx <= 14; dx += 7) {
        const c = column(x + dx, z + dz), hh = c & 255, b = c >> 8;
        if (hh <= SEA + 1 || hh > 90 || b === PEAKS || b === FROZEN) bad++;
        else { dev += Math.abs(hh - y); n++; }
      }
      if (bad > 6) return null;
      let slots = 0;
      for (const [dx, dz] of VSLOTS) { const hh = column(x + dx, z + dz) & 255; if (hh > SEA + 1 && Math.abs(hh - y) <= 3) slots++; }
      if (slots < 2) return null;
      return { x, z, y, score: slots * 10 - bad * 2 - (dev / n) * 2 + (bio === PLAINS || bio === FOREST ? 4 : 0) };
    }
    function villageAt(gx, gz) {
      const key = gx + ',' + gz;
      if (vcache.has(key)) return vcache.get(key);
      vcache.set(key, null);
      if (!spawnXZ) { const sp = spawn(); spawnXZ = [Math.floor(sp[0]), Math.floor(sp[2])]; }
      const sx = spawnXZ[0], sz = spawnXZ[1], sgx = Math.floor(sx / VCELL), sgz = Math.floor(sz / VCELL);
      const r = mulberry32(hash3(seed + 1013, gx, gz));
      let site = null;
      if (gx === sgx && gz === sgz) {
        // every new world gets a village a short walk from where you start: try spots all around, keep the best
        let bestS = -1e9;
        for (let k = 0; k < 128 && !(k === 64 && site); k++) {   // farther out only if nothing fits close by
          const a = k * 2.39996, d = 28 + (k % 8) * 6 + (k >= 64 ? 48 : 0);
          const s = villageSite(Math.round(sx + Math.cos(a) * d), Math.round(sz + Math.sin(a) * d));
          if (s && s.score - d * 0.1 > bestS) { bestS = s.score - d * 0.1; site = s; }
        }
      } else if (r() < 0.6) {
        const home = villageAt(sgx, sgz);
        let bestS = -1e9;
        for (let k = 0; k < 8; k++) {
          const x = gx * VCELL + VR + 6 + Math.floor(r() * (VCELL - 2 * VR - 12)), z = gz * VCELL + VR + 6 + Math.floor(r() * (VCELL - 2 * VR - 12));
          if (home && Math.hypot(home.x - x, home.z - z) < 90) continue;
          const s = villageSite(x, z);
          if (s && s.score > bestS) { bestS = s.score; site = s; }
        }
      }
      const v = site ? layoutVillage(site, r, gx, gz) : null;
      vcache.set(key, v);
      if (vcache.size > 600) vcache.delete(vcache.keys().next().value);
      return v;
    }
    function layoutVillage(site, r, gx, gz) {
      const vx = site.x, vz = site.z, vy = site.y, houses = [], gardens = [], paths = [];
      for (let t = -3; t <= 2; t++) paths.push([vx + t, vz - 3], [vx + t, vz + 2], [vx - 3, vz + t], [vx + 2, vz + t]);
      const kinds = ['small', 'medium', 'smith', 'small'];
      for (let i = 3; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t; }
      [[0, -12, 's'], [12, 0, 'w'], [0, 12, 'n'], [-12, 0, 'e']].forEach(([dx, dz, door], i) => {
        const kind = kinds[i], hx = vx + dx, hz = vz + dz, hy = column(hx, hz) & 255;
        if (hy <= SEA + 1 || Math.abs(hy - vy) > 3) return;
        const along = kind === 'small' ? 5 : 7, deep = kind === 'smith' ? 6 : 5, ns = door === 'n' || door === 's';
        const w = ns ? along : deep, d = ns ? deep : along, hs = { kind, x0: hx - (w >> 1), z0: hz - (d >> 1), w, d, y: hy, door };
        const mx = hs.x0 + (w >> 1), mz = hs.z0 + (d >> 1);
        hs.out = door === 's' ? [mx, hs.z0 + d] : door === 'n' ? [mx, hs.z0 - 1] : door === 'e' ? [hs.x0 + w, mz] : [hs.x0 - 1, mz];
        houses.push(hs);
        let x = hs.out[0], z = hs.out[1];
        for (let g = 0; g < 30 && !(x >= vx - 3 && x <= vx + 2 && z >= vz - 3 && z <= vz + 2); g++) {
          paths.push([x, z]);
          if (ns) z += Math.sign(vz - z); else x += Math.sign(vx - x);
        }
      });
      const diag = [[12, -12], [12, 12], [-12, 12], [-12, -12]], ng = (r() * 3) | 0;
      for (let i = 0; i < ng; i++) {
        const dd = diag.splice((r() * diag.length) | 0, 1)[0], hx = vx + dd[0], hz = vz + dd[1], hy = column(hx, hz) & 255;
        if (hy > SEA + 1 && Math.abs(hy - vy) <= 2) gardens.push({ x0: hx - 3, z0: hz - 2, w: 7, d: 5, y: hy });
      }
      const profs = PROFS.slice();
      for (let i = profs.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = profs[i]; profs[i] = profs[j]; profs[j] = t; }
      const n = Math.max(2, Math.min(6, houses.length + 1));
      if (houses.some(hs => hs.kind === 'smith') && profs.indexOf('toolsmith') >= n) { profs.splice(profs.indexOf('toolsmith'), 1); profs.unshift('toolsmith'); }
      return { id: 'v' + gx + '_' + gz, x: vx, z: vz, y: vy, houses, gardens, paths, profs: profs.slice(0, n), bbox: [vx - 18, vz - 18, vx + 18, vz + 18] };
    }
    function buildVillage(blocks, data, cx, cz, v, cols) {
      const x0 = cx * 16, z0 = cz * 16;
      const inC = (x, z) => x >= x0 && x < x0 + 16 && z >= z0 && z < z0 + 16;
      const hAt = (x, z) => inC(x, z) ? (cols[(z - z0) * 16 + (x - x0)] & 255) : (column(x, z) & 255);
      const P = (x, y, z, id, dv) => { if (!inC(x, z) || y < 1 || y >= WH) return; const i = idx(x - x0, y, z - z0); blocks[i] = id; data[i] = dv || 0; };
      const plant = b => b === B.TALL_GRASS || b === B.DANDELION || b === B.POPPY || b === B.CORNFLOWER || b === B.PUMPKIN;
      for (const [px, pz] of v.paths) {
        if (!inC(px, pz)) continue;
        const h = hAt(px, pz), lx = px - x0, lz = pz - z0;
        if (h <= SEA || h + 1 >= WH) continue;
        if (plant(blocks[idx(lx, h + 1, lz)])) blocks[idx(lx, h + 1, lz)] = B.AIR;
        const top = blocks[idx(lx, h, lz)];
        if (top === B.GRASS || top === B.DIRT || top === B.SAND || top === B.SNOWY_GRASS) blocks[idx(lx, h, lz)] = B.GRAVEL;
      }
      buildWell(P, v, hAt);
      for (const g of v.gardens) buildGarden(P, g, hAt);
      for (const hs of v.houses) buildHouse(P, hs, hAt);
    }
    function buildWell(P, v, hAt) {
      const y = v.y;
      for (let dz = -2; dz <= 1; dz++) for (let dx = -2; dx <= 1; dx++) {
        const x = v.x + dx, z = v.z + dz, inner = dx >= -1 && dx <= 0 && dz >= -1 && dz <= 0;
        const corner = (dx === -2 || dx === 1) && (dz === -2 || dz === 1);
        for (let yy = hAt(x, z) + 1; yy < y - 3; yy++) P(x, yy, z, B.COBBLE);
        P(x, y - 3, z, B.COBBLE);
        for (let yy = y - 2; yy <= y; yy++) P(x, yy, z, inner ? B.WATER : B.COBBLE);
        P(x, y + 1, z, inner ? B.AIR : B.COBBLE);
        for (let yy = y + 2; yy <= y + 3; yy++) P(x, yy, z, corner ? B.OAK_LOG : B.AIR);
        P(x, y + 4, z, B.COBBLE);
        for (let yy = y + 5; yy <= y + 8; yy++) P(x, yy, z, B.AIR);
      }
      P(v.x - 2, y + 5, v.z - 2, B.TORCH); P(v.x + 1, y + 5, v.z + 1, B.TORCH);
    }
    const DOOR_F = { s: 0, n: 2, e: 3, w: 1 };
    const tdat = (ax, az) => ax === -1 ? 1 : ax === 1 ? 2 : az === -1 ? 3 : 4;   // wall torch leaning on the block at (ax, az)
    function buildHouse(P, hs, hAt) {
      const kind = hs.kind, x0 = hs.x0, z0 = hs.z0, x1 = x0 + hs.w - 1, z1 = z0 + hs.d - 1, y = hs.y, door = hs.door, H = 3;
      const wall = kind === 'smith' ? B.COBBLE : B.OAK_PLANKS, roof = kind === 'smith' ? B.STONE_BRICKS : B.OAK_PLANKS;
      for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) {
        if (x < x0 || x > x1 || z < z0 || z > z1) { for (let yy = y + 1; yy <= y + H + 4; yy++) P(x, yy, z, B.AIR); continue; }
        const per = x === x0 || x === x1 || z === z0 || z === z1, corner = (x === x0 || x === x1) && (z === z0 || z === z1);
        for (let yy = hAt(x, z) + 1; yy < y; yy++) P(x, yy, z, B.COBBLE);
        P(x, y, z, per || kind === 'smith' ? B.COBBLE : B.OAK_PLANKS);
        for (let yy = y + 1; yy <= y + H; yy++) P(x, yy, z, corner ? B.OAK_LOG : per ? wall : B.AIR);
        P(x, y + H + 1, z, roof);
        P(x, y + H + 2, z, x > x0 && x < x1 && z > z0 && z < z1 ? roof : B.AIR);
        for (let yy = y + H + 3; yy <= y + H + 6; yy++) P(x, yy, z, B.AIR);
      }
      const mx = x0 + (hs.w >> 1), mz = z0 + (hs.d >> 1), ns = door === 'n' || door === 's';
      const nx = door === 'e' ? 1 : door === 'w' ? -1 : 0, nz = door === 's' ? 1 : door === 'n' ? -1 : 0;
      const dx = ns ? mx : (door === 'e' ? x1 : x0), dz = ns ? (door === 's' ? z1 : z0) : mz;
      P(dx, y + 1, dz, B.DOOR, DOOR_F[door]); P(dx, y + 2, dz, B.DOOR, DOOR_F[door] | 8);
      const ox = hs.out[0], oz = hs.out[1];
      for (let yy = hAt(ox, oz) + 1; yy < y; yy++) P(ox, yy, oz, B.COBBLE);
      P(ox, y, oz, B.COBBLE);
      for (let yy = y + 1; yy <= y + 3; yy++) P(ox, yy, oz, B.AIR);
      const sx = ns ? 1 : 0, sz = ns ? 0 : 1;
      P(ox + sx, y + 2, oz + sz, B.TORCH, tdat(-nx, -nz));
      // back wall: torch in the middle, windows either side; side walls: a window each
      const bx = ns ? mx : (door === 'e' ? x0 : x1), bz = ns ? (door === 's' ? z0 : z1) : mz;
      P(bx + nx, y + 2, bz + nz, B.TORCH, tdat(-nx, -nz));
      P(bx + sx, y + 2, bz + sz, B.GLASS); P(bx - sx, y + 2, bz - sz, B.GLASS);
      if (ns) { P(x0, y + 2, mz, B.GLASS); P(x1, y + 2, mz, B.GLASS); } else { P(mx, y + 2, z0, B.GLASS); P(mx, y + 2, z1, B.GLASS); }
      // furniture in the back corners, and near the front for bigger houses
      const c1 = [bx + nx + sx, bz + nz + sz], c2 = [bx + nx - sx, bz + nz - sz];
      const f1 = [dx - nx + sx * ((hs.w >> 1) - 1) * (ns ? 1 : 0), dz - nz + sz * ((hs.d >> 1) - 1) * (ns ? 0 : 1)];
      if (kind === 'smith') { P(c1[0], y + 1, c1[1], B.FURNACE); P(c2[0], y + 1, c2[1], B.FURNACE); P(f1[0], y + 1, f1[1], B.CRAFTING_TABLE); }
      else {
        P(c1[0], y + 1, c1[1], B.BED); P(c2[0], y + 1, c2[1], B.CRAFTING_TABLE);
        if (kind === 'medium') { P(f1[0], y + 1, f1[1], B.BOOKSHELF); P(f1[0], y + 2, f1[1], B.BOOKSHELF); }
      }
    }
    function buildGarden(P, g, hAt) {
      const x1 = g.x0 + g.w - 1, z1 = g.z0 + g.d - 1, y = g.y, FL = [B.DANDELION, B.POPPY, B.CORNFLOWER];
      for (let z = g.z0; z <= z1; z++) for (let x = g.x0; x <= x1; x++) {
        const per = x === g.x0 || x === x1 || z === g.z0 || z === z1, mid = z === g.z0 + 2;
        for (let yy = hAt(x, z) + 1; yy < y; yy++) P(x, yy, z, B.DIRT);
        P(x, y, z, per ? B.OAK_LOG : mid ? B.WATER : B.GRASS);
        P(x, y + 1, z, per || mid ? B.AIR : (x % 2 === 0 ? B.PUMPKIN : FL[(((x + z * 3) % 3) + 3) % 3]));
        for (let yy = y + 2; yy <= y + 5; yy++) P(x, yy, z, B.AIR);
      }
    }
    function villagesNear(x, z) {
      const gx = Math.floor(x / VCELL), gz = Math.floor(z / VCELL), out = [];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const v = villageAt(gx + dx, gz + dz); if (v) out.push(v); }
      return out;
    }
    function nearestVillage(x, z, blocked) {
      const gx = Math.floor(x / VCELL), gz = Math.floor(z / VCELL);
      let best = null, bd = Infinity;
      for (let r = 0; r <= 6; r++) {
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const v = villageAt(gx + dx, gz + dz);
          if (!v || blocked.has(v.id)) continue;
          const d = Math.hypot(v.x - x, v.z - z);
          if (d < bd) { bd = d; best = v; }
        }
        if (best && bd < (r - 0.5) * VCELL) break;
      }
      return best ? [best.x, best.y, best.z] : null;
    }
    function spawn() {
      for (let rad = 0; rad < 1200; rad += 8) {
        const steps = rad === 0 ? 1 : Math.max(8, (rad / 4) | 0);
        for (let s = 0; s < steps; s++) {
          const a = (s / steps) * Math.PI * 2, x = Math.round(Math.cos(a) * rad), z = Math.round(Math.sin(a) * rad);
          const cv = column(x, z), hh = cv & 255, bio = cv >> 8;
          if (bio === PLAINS && hh > SEA + 1 && hh < 76) return [x + 0.5, hh + 1, z + 0.5];
        }
      }
      return [0.5, 90, 0.5];
    }
    return { generate, spawn, column, villagesNear, nearestVillage };
  }

  /* ========== Map 2: Sky Islands ========== */
  function skyGen(seed) {
    const nA = makeNoise(seed ^ 0x51a1), nB = makeNoise(seed ^ 0x52b2), nC = makeNoise(seed ^ 0x53c3),
      nH = makeNoise(seed ^ 0x54d4), nT = makeNoise(seed ^ 0x55e5), nP = makeNoise(seed ^ 0x56f6);
    const LAY = [
      { n: nA, f: 0.0105, th: 0.17, base: 66, amp: 14, thick: 64 },
      { n: nB, f: 0.019, th: 0.30, base: 98, amp: 8, thick: 38 },
      { n: nC, f: 0.016, th: 0.33, base: 36, amp: 7, thick: 30 },
    ];
    const tmp = new Float32Array(9);
    function islands(x, z, out) {
      let n = 0;
      for (let k = 0; k < 3; k++) {
        const L = LAY[k];
        let a = fbm2(L.n, x * L.f, z * L.f, 3) * 1.6;
        if (k === 0) { const d = Math.sqrt(x * x + z * z); a += Math.max(0, 1 - d / 46) * 0.95; }
        if (a <= L.th) continue;
        const t = a - L.th;
        const top = Math.round(L.base + Math.min(t, 0.7) * L.amp + fbm2(nH, x * 0.05 + k * 71, z * 0.05, 2) * 2.4);
        const thick = Math.round(1 + t * L.thick + Math.abs(nH.n2(x * 0.11 + k * 31, z * 0.11)) * 4);
        out[n * 3] = top; out[n * 3 + 1] = Math.max(2, top - thick); out[n * 3 + 2] = t;
        n++;
      }
      return n;
    }
    function biomeAt(x, z) {
      const t = nT.n2(x * 0.0035, z * 0.0035);
      if (Math.abs(x) < 40 && Math.abs(z) < 40) return PLAINS;
      if (t < -0.45) return SNOWY;
      if (t > 0.45) return DESERT;
      return nP.n2(x * 0.01, z * 0.01) > 0.1 ? FOREST : PLAINS;
    }
    function topAt(x, z) {
      const n = islands(x, z, tmp);
      let best = -1;
      for (let i = 0; i < n; i++) if (tmp[i * 3] > best) best = tmp[i * 3];
      return best;
    }
    function generate(cx, cz) {
      const blocks = new Uint8Array(CVOL);
      const x0 = cx * 16, z0 = cz * 16;
      const r = mulberry32(hash3(seed, cx, cz));
      const isl = new Float32Array(9);
      const tops = new Int16Array(256).fill(-1), bios = new Uint8Array(256);
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const x = x0 + lx, z = z0 + lz;
        const n = islands(x, z, isl);
        if (!n) continue;
        const bio = biomeAt(x, z);
        bios[lz * 16 + lx] = bio;
        let best = -1;
        for (let k = 0; k < n; k++) {
          const top = isl[k * 3], bot = isl[k * 3 + 1], t = isl[k * 3 + 2];
          if (top > best) best = top;
          const pond = bio !== DESERT && t > 0.5 && nP.n2(x * 0.06 + k * 9, z * 0.06) > 0.58;
          for (let y = bot; y <= top && y < WH; y++) {
            let b;
            if (y === top) b = pond ? B.WATER : bio === DESERT ? B.SAND : bio === SNOWY ? B.SNOWY_GRASS : B.GRASS;
            else if (pond && y === top - 1) b = B.WATER;
            else if (y > top - 4) b = bio === DESERT ? (y > top - 3 ? B.SAND : B.SANDSTONE) : (pond ? B.SAND : B.DIRT);
            else b = B.STONE;
            blocks[idx(lx, y, lz)] = b;
          }
          if (t < 0.3 && r01(x, k, z) < 0.03 && bot > 3) {
            blocks[idx(lx, bot - 1, lz)] = B.GLOWSTONE;
            if (r01(z, k, x) < 0.5) blocks[idx(lx, bot - 2, lz)] = B.GLOWSTONE;
          }
        }
        tops[lz * 16 + lx] = best;
      }
      oreVeins(blocks, r, B.STONE, [[B.COAL_ORE, 16, 20, 115, 9], [B.IRON_ORE, 12, 20, 110, 7], [B.GOLD_ORE, 4, 20, 110, 6],
        [B.DIAMOND_ORE, 3, 20, 110, 4], [B.GRAVEL, 2, 20, 110, 12]]);
      const er = mulberry32(hash3(seed + 31, cx, cz));
      for (let t = 0; t < 3; t++) {
        const lx = (er() * 16) | 0, lz = (er() * 16) | 0, ey = 20 + ((er() * 90) | 0);
        if (er() < 0.35 && blocks[idx(lx, ey, lz)] === B.STONE) blocks[idx(lx, ey, lz)] = B.EMERALD_ORE;
      }
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const t = tops[lz * 16 + lx];
        if (t > 0) decorate(blocks, r, lx, lz, t, bios[lz * 16 + lx]);
      }
      for (let ncz = cz - 1; ncz <= cz + 1; ncz++) for (let ncx = cx - 1; ncx <= cx + 1; ncx++) {
        const tr = mulberry32(hash3(seed + 13, ncx, ncz));
        for (let k = 0; k < 7; k++) {
          const tx = ncx * 16 + ((tr() * 16) | 0), tz = ncz * 16 + ((tr() * 16) | 0);
          const roll = tr(), kr = tr(), hr = tr();
          const own = ncx === cx && ncz === cz;
          const th = own ? tops[(tz - z0) * 16 + (tx - x0)] : topAt(tx, tz);
          if (th < 4 || th > WH - 16) continue;
          const tb = own ? bios[(tz - z0) * 16 + (tx - x0)] : biomeAt(tx, tz);
          let dens = 0, kind = 0;
          if (tb === FOREST) { dens = 0.6; kind = kr < 0.35 ? 1 : 0; }
          else if (tb === PLAINS) { dens = 0.14; kind = kr < 0.2 ? 1 : 0; }
          else if (tb === SNOWY) { dens = 0.3; kind = 2; }
          if (roll >= dens) continue;
          if (own) { const sb = blocks[idx(tx - x0, th, tz - z0)]; if (sb !== B.GRASS && sb !== B.SNOWY_GRASS) continue; }
          else if (Math.abs(tx) < 3 && Math.abs(tz) < 3) continue;
          if (own && Math.abs(tx) < 3 && Math.abs(tz) < 3) continue;
          placeTree(blocks, cx, cz, tx, th + 1, tz, kind, hr);
        }
      }
      const spawns = [];
      if (r() < 0.2) {
        const type = MOBS[(r() * 4) | 0], count = 2 + ((r() * 2) | 0);
        for (let a = 0; a < 8; a++) {
          const lx = 1 + ((r() * 14) | 0), lz = 1 + ((r() * 14) | 0), t = tops[lz * 16 + lx];
          if (t > 0 && t + 2 < WH && blocks[idx(lx, t, lz)] === B.GRASS && !OPQ[blocks[idx(lx, t + 1, lz)]]) {
            spawns.push([type, x0 + lx + 0.5, t + 1, z0 + lz + 0.5, count]); break;
          }
        }
      }
      return { blocks, spawns };
    }
    function spawn() { const t = topAt(0, 0); return [0.5, (t > 0 ? t : 70) + 1, 0.5]; }
    return { generate, spawn };
  }

  /* ========== The Nether: netherrack caverns over a lava sea, between bedrock floor and ceiling ========== */
  function netherGen(seed) {
    const nA = makeNoise(seed ^ 0x6e31), nB = makeNoise(seed ^ 0x6e32), nC = makeNoise(seed ^ 0x6e33), nS = makeNoise(seed ^ 0x6e34);
    const LAVA_Y = 31;
    const G = new Float32Array(5 * 33 * 5);
    function density(x, y, z) {
      let d = 0.62 * nA.n3(x * 0.016, y * 0.027, z * 0.016) + 0.3 * nB.n3(x * 0.04, y * 0.06, z * 0.04) + 0.12 * nC.n3(x * 0.1, y * 0.13, z * 0.1) - 0.1;
      if (y < 22) d += (22 - y) * 0.045;       // a solid floor under the lava sea
      if (y > 100) d += (y - 100) * 0.05;     // and a thick roof
      return d;
    }
    function tri(lx, y, lz) {
      const fx = lx * 0.25, fy = y * 0.25, fz = lz * 0.25;
      const x0 = fx | 0, y0 = fy | 0, z0 = fz | 0, tx = fx - x0, ty = fy - y0, tz = fz - z0;
      const i = (y0 * 5 + z0) * 5 + x0;
      const a = G[i] + (G[i + 1] - G[i]) * tx, b = G[i + 5] + (G[i + 6] - G[i + 5]) * tx;
      const c = G[i + 25] + (G[i + 26] - G[i + 25]) * tx, d = G[i + 30] + (G[i + 31] - G[i + 30]) * tx;
      const e = a + (b - a) * tz, f = c + (d - c) * tz;
      return e + (f - e) * ty;
    }
    function generate(cx, cz) {
      const blocks = new Uint8Array(CVOL), x0 = cx * 16, z0 = cz * 16;
      let k = 0;
      for (let gy = 0; gy < 33; gy++) for (let gz = 0; gz < 5; gz++) for (let gx = 0; gx < 5; gx++, k++) G[k] = density(x0 + gx * 4, gy * 4, z0 + gz * 4);
      const r = mulberry32(hash3(seed ^ 0x6e7e, cx, cz));
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const x = x0 + lx, z = z0 + lz;
        for (let y = 0; y < WH; y++) {
          const i = idx(lx, y, lz);
          if (y === 0 || y === WH - 1 || (y < 5 && r01(x, y, z) * 5 > y) || (y > WH - 6 && r01(z, y + 7, x) * 5 > WH - 1 - y)) { blocks[i] = B.BEDROCK; continue; }
          if (tri(lx, y, lz) > 0) blocks[i] = B.NETHERRACK;
          else if (y <= LAVA_Y) blocks[i] = B.LAVA;
        }
        // soul sand along the lava shores, gravel on some higher ledges
        const soul = nS.n2(x * 0.045, z * 0.045), grav = nS.n2(x * 0.06 + 300, z * 0.06 - 200);
        for (let y = 2; y < WH - 2; y++) {
          const i = idx(lx, y, lz);
          if (blocks[i] !== B.NETHERRACK || blocks[i + 256] !== 0) continue;
          if (y >= LAVA_Y - 1 && y <= LAVA_Y + 9 && soul > 0.22) {
            blocks[i] = B.SOUL_SAND;
            if (blocks[i - 256] === B.NETHERRACK) blocks[i - 256] = B.SOUL_SAND;
          } else if (y >= 58 && y <= 74 && grav > 0.5) blocks[i] = B.GRAVEL;
        }
      }
      oreVeins(blocks, r, B.NETHERRACK, [[B.NETHER_QUARTZ_ORE, 14, 10, 117, 8]]);
      // glowstone hanging from the roof
      for (let t = 0; t < 4; t++) {
        const lx = 2 + ((r() * 12) | 0), lz = 2 + ((r() * 12) | 0), roll = r();
        if (roll > 0.7) continue;
        let y = WH - 8;
        while (y > LAVA_Y + 12 && !(blocks[idx(lx, y, lz)] === 0 && OPQ[blocks[idx(lx, y + 1, lz)]])) y--;
        if (y <= LAVA_Y + 12) continue;
        let gx = lx, gy = y, gz = lz;
        const n = 12 + ((r() * 26) | 0);
        for (let s = 0; s < n; s++) {
          if (gx >= 0 && gx < 16 && gz >= 0 && gz < 16 && gy > LAVA_Y + 2 && gy < WH - 1 && blocks[idx(gx, gy, gz)] === 0) blocks[idx(gx, gy, gz)] = B.GLOWSTONE;
          const d = (r() * 6) | 0;
          if (d === 0) gx++; else if (d === 1) gx--; else if (d === 2) gz++; else if (d === 3) gz--; else gy--;
          if (Math.abs(gx - lx) > 3) gx = lx;
          if (Math.abs(gz - lz) > 3) gz = lz;
        }
      }
      return { blocks, spawns: [] };
    }
    function spawn() { return [0.5, 64, 0.5]; }
    return { generate, spawn };
  }

  const gens = new Map();
  function getGen(map, seed) {
    const k = map + ':' + seed;
    let g = gens.get(k);
    if (!g) { g = map === 'sky' ? skyGen(seed) : map === 'nether' ? netherGen(seed) : valleyGen(seed); gens.set(k, g); }
    return g;
  }

  /* ---- chunk-local lighting (sky + block), refined across borders on the main thread ---- */
  const QSIZE = 1 << 17, QMASK = QSIZE - 1;
  const lq = new Int32Array(QSIZE);
  function computeLight(blocks) {
    const light = new Uint8Array(CVOL);
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      let l = 15;
      for (let y = WH - 1; y >= 0; y--) {
        const i = x | (z << 4) | (y << 8), b = blocks[i];
        if (OPQ[b]) break;
        l -= FIL[b];
        if (l <= 0) break;
        light[i] = l << 4;
      }
    }
    let qh = 0, qt = 0;
    for (let i = 0; i < CVOL; i++) {
      const L = light[i] >> 4;
      if (L < 2) continue;
      const x = i & 15, z = (i >> 4) & 15, y = i >> 8, m = L - 1;
      if ((x > 0 && !OPQ[blocks[i - 1]] && (light[i - 1] >> 4) < m) || (x < 15 && !OPQ[blocks[i + 1]] && (light[i + 1] >> 4) < m) ||
        (z > 0 && !OPQ[blocks[i - 16]] && (light[i - 16] >> 4) < m) || (z < 15 && !OPQ[blocks[i + 16]] && (light[i + 16] >> 4) < m) ||
        (y > 0 && !OPQ[blocks[i - 256]] && (light[i - 256] >> 4) < m)) { lq[qt & QMASK] = i; qt++; }
    }
    qt = spread(blocks, light, qh, qt, true);
    qh = qt;
    for (let i = 0; i < CVOL; i++) { const e = EMI[blocks[i]]; if (e) { light[i] = (light[i] & 0xf0) | e; lq[qt & QMASK] = i; qt++; } }
    spread(blocks, light, qh, qt, false);
    return light;
  }
  function spread(blocks, light, qh, qt, sky) {
    while (qh < qt) {
      const i = lq[qh & QMASK]; qh++;
      const L = sky ? light[i] >> 4 : light[i] & 15;
      if (L <= 1) continue;
      const x = i & 15, z = (i >> 4) & 15, y = i >> 8;
      for (let d = 0; d < 6; d++) {
        let j;
        if (d === 0) { if (x === 15) continue; j = i + 1; }
        else if (d === 1) { if (x === 0) continue; j = i - 1; }
        else if (d === 2) { if (z === 15) continue; j = i + 16; }
        else if (d === 3) { if (z === 0) continue; j = i - 16; }
        else if (d === 4) { if (y === WH - 1) continue; j = i + 256; }
        else { if (y === 0) continue; j = i - 256; }
        const b = blocks[j];
        if (OPQ[b]) continue;
        let nl = L - 1 - FIL[b];
        if (sky && d === 5 && L === 15 && !FIL[b]) nl = 15;
        if (sky) { if ((light[j] >> 4) < nl) { light[j] = (light[j] & 15) | (nl << 4); lq[qt & QMASK] = j; qt++; } }
        else if ((light[j] & 15) < nl) { light[j] = (light[j] & 0xf0) | nl; lq[qt & QMASK] = j; qt++; }
      }
    }
    return qt;
  }

  function generateChunk(map, seed, cx, cz, edits, vb) {
    const g = getGen(map, seed);
    const res = g.generate(cx, cz, vb && vb.length ? new Set(vb) : null);
    const blocks = res.blocks;
    if (edits) for (let k = 0; k < edits.length; k += 2) blocks[edits[k]] = edits[k + 1] & 255;
    const light = computeLight(blocks);
    return { blocks, light, spawns: res.spawns, data: res.data || null };
  }
  function spawnPoint(map, seed) { return getGen(map, seed).spawn(); }
  /* villages whose ground overlaps any of the given chunks (used to keep them out of already-built areas) */
  function villagesTouching(map, seed, chunks) {
    if (map !== 'valley') return [];
    const g = getGen(map, seed), out = new Set();
    for (const [cx, cz] of chunks) for (const v of g.villagesNear(cx * 16 + 8, cz * 16 + 8)) {
      const bb = v.bbox;
      if (bb[2] >= cx * 16 && bb[0] <= cx * 16 + 15 && bb[3] >= cz * 16 && bb[1] <= cz * 16 + 15) out.add(v.id);
    }
    return Array.from(out);
  }
  function findVillage(map, seed, x, z, blocked) { return map === 'valley' ? getGen(map, seed).nearestVillage(x, z, new Set(blocked || [])) : null; }
  return { generateChunk, spawnPoint, computeLight, makeNoise, mulberry32, hash3, villagesTouching, findVillage };
}
