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
    function generate(cx, cz) {
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
      return { blocks, spawns };
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
    return { generate, spawn, column };
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

  const gens = new Map();
  function getGen(map, seed) {
    const k = map + ':' + seed;
    let g = gens.get(k);
    if (!g) { g = map === 'sky' ? skyGen(seed) : valleyGen(seed); gens.set(k, g); }
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

  function generateChunk(map, seed, cx, cz, edits) {
    const g = getGen(map, seed);
    const res = g.generate(cx, cz);
    const blocks = res.blocks;
    if (edits) for (let k = 0; k < edits.length; k += 2) blocks[edits[k]] = edits[k + 1] & 255;
    const light = computeLight(blocks);
    return { blocks, light, spawns: res.spawns };
  }
  function spawnPoint(map, seed) { return getGen(map, seed).spawn(); }
  return { generateChunk, spawnPoint, computeLight, makeNoise, mulberry32, hash3 };
}
