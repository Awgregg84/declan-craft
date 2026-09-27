/* ===================== Chunk section mesher ===================== */
const BT = new Uint8Array(256 * 6);
const FRONT_T = new Int16Array(256).fill(-1), BACK_T = new Int16Array(256).fill(-1);
const FRONT_FACE = [4, 1, 5, 0], BACK_FACE = [5, 0, 4, 1];
function buildBlockTiles() {
  for (let id = 0; id < 256; id++) {
    const d = BLOCKS[id];
    if (!d || !d.tex) continue;
    const t = d.tex;
    const side = typeof t === 'string' ? t : t.side, top = typeof t === 'string' ? t : (t.top || t.side), bot = typeof t === 'string' ? t : (t.bottom || t.side);
    const tt = [side, side, top, bot, side, side];
    for (let f = 0; f < 6; f++) BT[id * 6 + f] = TILE[tt[f]];
    if (typeof t === 'object' && t.front) FRONT_T[id] = TILE[t.front];
    if (typeof t === 'object' && t.back) BACK_T[id] = TILE[t.back];
  }
}
function tileFor(id, d, data) {
  if (FRONT_T[id] >= 0) {
    const f = data & 3;
    if (d === FRONT_FACE[f]) return FRONT_T[id];
    if (BACK_T[id] >= 0 && d === BACK_FACE[f]) return BACK_T[id];
  }
  return BT[id * 6 + d];
}

const PADV = 18 * 18 * 18;
const padB = new Uint8Array(PADV), padL = new Uint8Array(PADV), padD = new Uint8Array(PADV);
const STRIDE = [1, 324, 18];
const FACE_DEF = [
  { axis: 0, sgn: 1, c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { axis: 0, sgn: -1, c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { axis: 1, sgn: 1, c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { axis: 1, sgn: -1, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { axis: 2, sgn: 1, c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { axis: 2, sgn: -1, c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];
const FACE_UV = [[0, 16], [16, 16], [16, 0], [0, 0]];
const FN = new Int32Array(6), FS1 = new Int32Array(24), FS2 = new Int32Array(24);
for (let d = 0; d < 6; d++) {
  const F = FACE_DEF[d], t1 = (F.axis + 1) % 3, t2 = (F.axis + 2) % 3;
  FN[d] = F.sgn * STRIDE[F.axis];
  for (let k = 0; k < 4; k++) {
    FS1[d * 4 + k] = (F.c[k][t1] ? 1 : -1) * STRIDE[t1];
    FS2[d * 4 + k] = (F.c[k][t2] ? 1 : -1) * STRIDE[t2];
  }
}

class QuadWriter {
  constructor() { this.cap = 4096; this.alloc(); this.n = 0; }
  alloc() { this.buf = new ArrayBuffer(this.cap * 64); this.u16 = new Uint16Array(this.buf); this.u8 = new Uint8Array(this.buf); }
  grow() { const old = this.u8; this.cap *= 2; this.alloc(); this.u8.set(old); }
  quad() { if (this.n >= this.cap) this.grow(); return this.n++; }
  vtx(q, k, x, y, z, w, u, v, tile, sky, blk) {
    const vi = q * 4 + k, o16 = vi * 8, o8 = vi * 16;
    const u16 = this.u16, u8 = this.u8;
    u16[o16] = x; u16[o16 + 1] = y; u16[o16 + 2] = z; u16[o16 + 3] = w;
    u8[o8 + 8] = u; u8[o8 + 9] = v; u8[o8 + 10] = tile; u8[o8 + 11] = 0;
    u8[o8 + 12] = sky; u8[o8 + 13] = blk; u8[o8 + 14] = 0; u8[o8 + 15] = 0;
  }
}
const WO = new QuadWriter(), WT = new QuadWriter();

function fillPad(world, c, s) {
  const y0 = s * 16 - 1;
  const nb = fillPad.nb || (fillPad.nb = new Array(9));
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) nb[(dz + 1) * 3 + dx + 1] = world.getChunk(c.cx + dx, c.cz + dz);
  const below = world.map === 'sky' ? B.AIR : B.BEDROCK;
  for (let pz = 0; pz < 18; pz++) {
    const wz = pz - 1, ciz = wz < 0 ? 0 : wz > 15 ? 2 : 1, lz = wz & 15;
    for (let px = 0; px < 18; px++) {
      const wx = px - 1, cix = wx < 0 ? 0 : wx > 15 ? 2 : 1, lx = wx & 15;
      const ch = nb[ciz * 3 + cix], col = lx | (lz << 4);
      let pi = pz * 18 + px;
      for (let py = 0; py < 18; py++, pi += 324) {
        const y = y0 + py;
        if (y < 0) { padB[pi] = below; padL[pi] = below ? 0 : 0xf0; padD[pi] = 0; }
        else if (y >= WH) { padB[pi] = 0; padL[pi] = 0xf0; padD[pi] = 0; }
        else if (!ch) { padB[pi] = B.STONE; padL[pi] = 0; padD[pi] = 0; }
        else { const i = col | (y << 8); padB[pi] = ch.blocks[i]; padL[pi] = ch.light[i]; padD[pi] = ch.data[i]; }
      }
    }
  }
}

const _ao = [0, 0, 0, 0], _sk = [0, 0, 0, 0], _bl = [0, 0, 0, 0];
function emitFace(W, d, x, y, z, pi, tile, flag, topH) {
  const F = FACE_DEF[d], qi = pi + FN[d];
  for (let k = 0; k < 4; k++) {
    const a = qi + FS1[d * 4 + k], b = qi + FS2[d * 4 + k], cc = a + FS2[d * 4 + k];
    const ba = padB[a], bb = padB[b], bc = padB[cc];
    const oa = AOCC[ba], ob = AOCC[bb], oc = AOCC[bc];
    _ao[k] = (oa && ob) ? 0 : 3 - oa - ob - oc;
    let L = padL[qi], sky = L >> 4, blk = L & 15, n = 1;
    if (!OPAQUE[ba]) { L = padL[a]; sky += L >> 4; blk += L & 15; n++; }
    if (!OPAQUE[bb]) { L = padL[b]; sky += L >> 4; blk += L & 15; n++; }
    if (!OPAQUE[bc] && !(oa && ob)) { L = padL[cc]; sky += L >> 4; blk += L & 15; n++; }
    _sk[k] = Math.round((sky * 17) / n); _bl[k] = Math.round((blk * 17) / n);
  }
  const q = W.quad(), flip = _ao[0] + _ao[2] < _ao[1] + _ao[3];
  const fw = (flag * 8 + d) * 4;
  for (let j = 0; j < 4; j++) {
    const k = flip ? (j + 1) & 3 : j, cr = F.c[k];
    const vy = cr[1] ? (topH !== 16 ? y * 16 + topH : (y + 1) * 16) : y * 16;
    W.vtx(q, j, (x + cr[0]) * 16, vy, (z + cr[2]) * 16, fw + _ao[k], FACE_UV[k][0], FACE_UV[k][1], tile, _sk[k], _bl[k]);
  }
}
/* Axis-aligned box inside one voxel (1/16 units), flat-lit with the voxel's own light. */
function emitBox(W, x, y, z, pi, b0x, b0y, b0z, b1x, b1y, b1z, tiles, uvs, faces, flag, uvShift) {
  const L = padL[pi], sky = (L >> 4) * 17, blk = (L & 15) * 17;
  for (let d = 0; d < 6; d++) {
    if (!(faces & (1 << d))) continue;
    const F = FACE_DEF[d], q = W.quad(), r = uvs[d], fw = (flag * 8 + d) * 4 + 3;
    for (let k = 0; k < 4; k++) {
      const cr = F.c[k], kk = d === 2 && uvShift ? (k + uvShift) & 3 : k;
      const uvk = FACE_UV[kk];
      const u = uvk[0] ? r[2] : r[0], v = uvk[1] ? r[3] : r[1];
      W.vtx(q, k, x * 16 + (cr[0] ? b1x : b0x), y * 16 + (cr[1] ? b1y : b0y), z * 16 + (cr[2] ? b1z : b0z), fw, u, v, tiles[d], sky, blk);
    }
  }
}
const FULL_UV = [0, 0, 16, 16];
const TORCH_UV = [[7, 6, 9, 16], [7, 6, 9, 16], [7, 6, 9, 8], [7, 14, 9, 16], [7, 6, 9, 16], [7, 6, 9, 16]];
const BED_UV = [[0, 7, 16, 16], [0, 7, 16, 16], FULL_UV, FULL_UV, [0, 7, 16, 16], [0, 7, 16, 16]];
const SIX_FULL = [FULL_UV, FULL_UV, FULL_UV, FULL_UV, FULL_UV, FULL_UV];
const _tiles6 = [0, 0, 0, 0, 0, 0];

function meshSection(world, c, s) {
  c.dirty[s] = 0;
  if (!c.counts[s]) {
    freeSectionMesh(c.meshes[s]); freeSectionMesh(c.tmeshes[s]); c.meshes[s] = c.tmeshes[s] = null;
    return;
  }
  fillPad(world, c, s);
  WO.n = 0; WT.n = 0;
  for (let y = 0; y < 16; y++) for (let z = 0; z < 16; z++) {
    let pi = (y + 1) * 324 + (z + 1) * 18 + 1;
    for (let x = 0; x < 16; x++, pi++) {
      const id = padB[pi];
      if (!id) continue;
      const r = RENDER[id];
      if (r === R_CUBE) {
        const W = PASS[id] === 2 ? WT : WO, data = padD[pi];
        for (let d = 0; d < 6; d++) {
          const n = padB[pi + FN[d]];
          if (OPAQUE[n] || (n === id && CULLSAME[id])) continue;
          emitFace(W, d, x, y, z, pi, tileFor(id, d, data), 0, 16);
        }
      } else if (r === R_LIQUID) {
        const W = id === B.WATER ? WT : WO, flag = id === B.WATER ? 1 : 2, lv = padD[pi];
        const above = padB[pi + 324];
        let hgt = 16;
        if (above !== id) {
          const level = lv & 7;
          hgt = (lv & 8) ? 15 : level === 0 ? 14 : Math.max(2, Math.round(14 - level * (id === B.WATER ? 1.6 : 3.5)));
        }
        for (let d = 0; d < 6; d++) {
          const n = padB[pi + FN[d]];
          if (n === id || OPAQUE[n]) continue;
          if (d === 3 && LIQUID[n]) continue;
          emitFace(W, d, x, y, z, pi, BT[id * 6 + d], flag, hgt);
        }
      } else if (r === R_CROSS) {
        const t = BT[id * 6], L = padL[pi], sky = (L >> 4) * 17, blk = (L & 15) * 17;
        const w = (6 * 4 + 3), x0 = x * 16, y0 = y * 16, z0 = z * 16;
        const P = [[2, 2, 14, 14], [2, 14, 14, 2]];
        for (const [ax, az, bx, bz] of P) {
          let q = WO.quad();
          WO.vtx(q, 0, x0 + ax, y0, z0 + az, w, 0, 16, t, sky, blk);
          WO.vtx(q, 1, x0 + bx, y0, z0 + bz, w, 16, 16, t, sky, blk);
          WO.vtx(q, 2, x0 + bx, y0 + 16, z0 + bz, w, 16, 0, t, sky, blk);
          WO.vtx(q, 3, x0 + ax, y0 + 16, z0 + az, w, 0, 0, t, sky, blk);
          q = WO.quad();
          WO.vtx(q, 0, x0 + bx, y0, z0 + bz, w, 16, 16, t, sky, blk);
          WO.vtx(q, 1, x0 + ax, y0, z0 + az, w, 0, 16, t, sky, blk);
          WO.vtx(q, 2, x0 + ax, y0 + 16, z0 + az, w, 0, 0, t, sky, blk);
          WO.vtx(q, 3, x0 + bx, y0 + 16, z0 + bz, w, 16, 0, t, sky, blk);
        }
      } else if (r === R_TORCH) {
        const t = BT[id * 6], data = padD[pi];
        let ox = 0, oz = 0, oy = 0;
        if (data >= 1 && data <= 4) { const o = TORCH_DIRS[data]; ox = o[0] * 5; oz = o[1] * 5; oy = 3; }
        for (let f = 0; f < 6; f++) _tiles6[f] = t;
        emitBox(WO, x, y, z, pi, 7 + ox, oy, 7 + oz, 9 + ox, 10 + oy, 9 + oz, _tiles6, TORCH_UV, 63, 0, 0);
      } else if (r === R_CACTUS) {
        let faces = 0x33;
        if (!OPAQUE[padB[pi + 324]] && padB[pi + 324] !== id) faces |= 4;
        if (!OPAQUE[padB[pi - 324]] && padB[pi - 324] !== id) faces |= 8;
        for (let f = 0; f < 6; f++) _tiles6[f] = BT[id * 6 + f];
        emitBox(WO, x, y, z, pi, 1, 0, 1, 15, 16, 15, _tiles6, SIX_FULL, faces, 0, 0);
      } else if (r === R_DOOR) {
        const data = padD[pi], bb = doorBox(data), t = (data & 8) ? TILE.door_top : TILE.door_bottom;
        for (let f = 0; f < 6; f++) _tiles6[f] = t;
        emitBox(WO, x, y, z, pi, bb[0] * 16, bb[1] * 16, bb[2] * 16, bb[3] * 16, bb[4] * 16, bb[5] * 16, _tiles6, SIX_FULL, 63, 0, 0);
      } else if (r === R_BED) {
        const data = padD[pi], f = data & 3;
        for (let d = 0; d < 6; d++) _tiles6[d] = tileFor(id, d, data);
        emitBox(WO, x, y, z, pi, 0, 0, 0, 16, 9, 16, _tiles6, BED_UV, OPAQUE[padB[pi - 324]] ? 0x37 : 63, 0, f);
      }
    }
  }
  if (WO.n) c.meshes[s] = uploadSectionMesh(c.meshes[s], WO.u8, WO.n);
  else if (c.meshes[s]) { freeSectionMesh(c.meshes[s]); c.meshes[s] = null; }
  if (WT.n) c.tmeshes[s] = uploadSectionMesh(c.tmeshes[s], WT.u8, WT.n);
  else if (c.tmeshes[s]) { freeSectionMesh(c.tmeshes[s]); c.tmeshes[s] = null; }
}
