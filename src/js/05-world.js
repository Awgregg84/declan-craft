/* ===================== World: chunks, light, block updates ===================== */
const DX = [1, -1, 0, 0, 0, 0], DY = [0, 0, 1, -1, 0, 0], DZ = [0, 0, 0, 0, 1, -1];
const HX = [1, -1, 0, 0], HZ = [0, 0, 1, -1];
const TORCH_DIRS = [null, [-1, 0], [1, 0], [0, -1], [0, 1]];
const DAY_LENGTH = 720; // seconds for a full day
const SAPLING_KIND = { [B.OAK_SAPLING]: 0, [B.BIRCH_SAPLING]: 1, [B.SPRUCE_SAPLING]: 2 };

class Chunk {
  constructor(cx, cz, blocks, light) {
    this.cx = cx; this.cz = cz; this.key = chunkKey(cx, cz);
    this.blocks = blocks; this.light = light; this.data = new Uint8Array(CVOL);
    this.meshes = new Array(NSEC).fill(null);
    this.tmeshes = new Array(NSEC).fill(null);
    this.dirty = new Uint8Array(NSEC).fill(1);
    this.counts = new Uint16Array(NSEC);
    for (let i = 0; i < CVOL; i++) if (blocks[i]) this.counts[i >> 12]++;
    this.everMeshed = false;
  }
}

/* ---------- generator worker pool ---------- */
class GenPool {
  constructor() {
    this.workers = []; this.inflight = new Map(); this.queue = []; this.nextId = 1; this.local = null;
    const n = clamp((navigator.hardwareConcurrency || 4) - 1, 1, 4);
    try {
      const src = 'const genModule = ' + genModule.toString() + ';\nlet G = null;\n' +
        'onmessage = function (e) { const m = e.data; if (m.t === "init") { G = genModule(m.B, m.P); return; }\n' +
        '  const r = G.generateChunk(m.map, m.seed, m.cx, m.cz, m.edits);\n' +
        '  postMessage({ id: m.id, blocks: r.blocks, light: r.light, spawns: r.spawns }, [r.blocks.buffer, r.light.buffer]); };';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      for (let i = 0; i < n; i++) {
        const w = new Worker(url);
        w.busy = 0;
        w.onmessage = e => this.done(w, e.data);
        w.onerror = e => { if (e.preventDefault) e.preventDefault(); this.fallBack(); };
        w.postMessage({ t: 'init', B, P: genProps() });
        this.workers.push(w);
      }
    } catch (e) { this.workers = []; }
    if (!this.workers.length) this.fallBack();
  }
  fallBack() {
    if (this.local) return;
    this.local = genModule(B, genProps());
    for (const w of this.workers) { try { w.terminate(); } catch (e) { /* ignore */ } }
    this.workers = [];
    for (const job of this.inflight.values()) this.queue.unshift(job);
    this.inflight.clear();
  }
  get capacity() { return this.local ? 2 : this.workers.length * 2; }
  get busy() { return this.inflight.size + this.queue.length; }
  request(job) {
    job.id = this.nextId++;
    if (this.local) { this.queue.push(job); return; }
    let best = this.workers[0];
    for (const w of this.workers) if (w.busy < best.busy) best = w;
    best.busy++; job.worker = best;
    this.inflight.set(job.id, job);
    best.postMessage({ t: 'gen', id: job.id, map: job.map, seed: job.seed, cx: job.cx, cz: job.cz, edits: job.edits });
  }
  done(w, m) {
    w.busy = Math.max(0, w.busy - 1);
    const job = this.inflight.get(m.id);
    if (!job) return;
    this.inflight.delete(m.id);
    job.cb(m.blocks, m.light, m.spawns);
  }
  pump(budgetMs) {
    if (!this.local) return;
    const t0 = performance.now();
    while (this.queue.length && performance.now() - t0 < budgetMs) {
      const job = this.queue.shift();
      const r = this.local.generateChunk(job.map, job.seed, job.cx, job.cz, job.edits);
      job.cb(r.blocks, r.light, r.spawns);
    }
  }
  cancelAll() { for (const job of this.inflight.values()) job.cb = () => {}; this.queue.length = 0; }
}

class World {
  constructor(map, seed) {
    this.map = map; this.seed = seed;
    this.chunks = new Map();
    this.requested = new Set();
    this.edits = new Map();
    this.tiles = new Map();
    this.time = 0.02;
    this.clock = 0;
    this.dirtyList = new Set();
    this.urgentList = new Set();
    this.liquidQ = []; this.liquidSet = new Set();
    this.gravQ = [];
    this.saplings = new Map();
    this.spawnQueue = [];
    this.order = []; this.orderDirty = true; this.centerCX = 1e9; this.centerCZ = 1e9;
    this._lk = -1; this._lc = null;
    this._qa = []; this._qb = []; this._qr = [];
    this.randT = 0;
    this.onBreak = null; this.onFall = null; this.onDrop = null; this.onSound = null;
    this.alive = true;
  }
  getChunk(cx, cz) {
    const k = chunkKey(cx, cz);
    if (k === this._lk) return this._lc;
    const c = this.chunks.get(k) || null;
    this._lk = k; this._lc = c;
    return c;
  }
  getBlock(x, y, z) {
    if (y < 0 || y >= WH) return 0;
    const c = this.getChunk(x >> 4, z >> 4);
    return c ? c.blocks[(x & 15) | ((z & 15) << 4) | (y << 8)] : B.UNLOADED;
  }
  getData(x, y, z) {
    if (y < 0 || y >= WH) return 0;
    const c = this.getChunk(x >> 4, z >> 4);
    return c ? c.data[(x & 15) | ((z & 15) << 4) | (y << 8)] : 0;
  }
  getLight(x, y, z) {
    if (y >= WH) return 0xf0;
    if (y < 0) return this.map === 'sky' ? 0xf0 : 0;
    const c = this.getChunk(x >> 4, z >> 4);
    return c ? c.light[(x & 15) | ((z & 15) << 4) | (y << 8)] : 0xf0;
  }
  topSolid(x, z) {
    for (let y = WH - 1; y >= 0; y--) { const b = this.getBlock(x, y, z); if (SOLID[b] && b !== B.UNLOADED) return y; }
    return -1;
  }

  /* ---- dirty tracking ---- */
  markDirty(c, s, urgent) {
    if (s < 0 || s >= NSEC) return;
    if (!c.dirty[s]) { c.dirty[s] = 1; this.dirtyList.add(c); }
    if (urgent) { c.dirty[s] = 2; this.urgentList.add(c); }
  }
  markAround(x, y, z, urgent) {
    const lx = x & 15, lz = z & 15, ly = y & 15, s = y >> 4;
    const x0 = lx === 0 ? -1 : 0, x1 = lx === 15 ? 1 : 0, z0 = lz === 0 ? -1 : 0, z1 = lz === 15 ? 1 : 0;
    const s0 = ly === 0 ? -1 : 0, s1 = ly === 15 ? 1 : 0;
    const cx = x >> 4, cz = z >> 4;
    for (let dz = z0; dz <= z1; dz++) for (let dx = x0; dx <= x1; dx++) {
      const c = this.getChunk(cx + dx, cz + dz);
      if (!c) continue;
      for (let ds = s0; ds <= s1; ds++) this.markDirty(c, s + ds, urgent);
    }
  }

  /* ---- light propagation across chunks ---- */
  lightAdd(q, sky) {
    let h = 0;
    while (h < q.length) {
      const x = q[h++], y = q[h++], z = q[h++];
      const c = this.getChunk(x >> 4, z >> 4);
      if (!c) continue;
      const i = (x & 15) | ((z & 15) << 4) | (y << 8);
      const L = sky ? c.light[i] >> 4 : c.light[i] & 15;
      if (L <= 1) continue;
      for (let d = 0; d < 6; d++) {
        const ny = y + DY[d];
        if (ny < 0 || ny >= WH) continue;
        const nx = x + DX[d], nz = z + DZ[d];
        const nc = ((nx >> 4) === c.cx && (nz >> 4) === c.cz) ? c : this.getChunk(nx >> 4, nz >> 4);
        if (!nc) continue;
        const ni = (nx & 15) | ((nz & 15) << 4) | (ny << 8);
        const b = nc.blocks[ni];
        if (OPAQUE[b]) continue;
        let nl = L - 1 - FILTER[b];
        if (sky && d === 3 && L === 15 && !FILTER[b]) nl = 15;
        const cur = sky ? nc.light[ni] >> 4 : nc.light[ni] & 15;
        if (cur >= nl) continue;
        nc.light[ni] = sky ? (nc.light[ni] & 15) | (nl << 4) : (nc.light[ni] & 0xf0) | nl;
        this.markAround(nx, ny, nz, false);
        q.push(nx, ny, nz);
      }
    }
    q.length = 0;
  }
  lightRemove(x, y, z, sky, addQ) {
    const rq = this._qr;
    const c0 = this.getChunk(x >> 4, z >> 4);
    if (!c0) return;
    const i0 = (x & 15) | ((z & 15) << 4) | (y << 8);
    const v0 = sky ? c0.light[i0] >> 4 : c0.light[i0] & 15;
    if (!v0) return;
    c0.light[i0] = sky ? c0.light[i0] & 15 : c0.light[i0] & 0xf0;
    this.markAround(x, y, z, false);
    rq.push(x, y, z, v0);
    let h = 0;
    while (h < rq.length) {
      const cx = rq[h++], cy = rq[h++], cz = rq[h++], val = rq[h++];
      for (let d = 0; d < 6; d++) {
        const ny = cy + DY[d];
        if (ny < 0 || ny >= WH) continue;
        const nx = cx + DX[d], nz = cz + DZ[d];
        const nc = this.getChunk(nx >> 4, nz >> 4);
        if (!nc) continue;
        const ni = (nx & 15) | ((nz & 15) << 4) | (ny << 8);
        const nl = sky ? nc.light[ni] >> 4 : nc.light[ni] & 15;
        if (!nl) continue;
        if (nl < val || (sky && d === 3 && val === 15 && nl === 15)) {
          const em = sky ? 0 : EMIT[nc.blocks[ni]];
          nc.light[ni] = sky ? nc.light[ni] & 15 : (nc.light[ni] & 0xf0) | em;
          this.markAround(nx, ny, nz, false);
          if (em) addQ.push(nx, ny, nz);
          rq.push(nx, ny, nz, nl);
        } else addQ.push(nx, ny, nz);
      }
    }
    rq.length = 0;
  }
  relight(x, y, z, oldId, newId) {
    const c = this.getChunk(x >> 4, z >> 4);
    if (!c) return;
    const i = (x & 15) | ((z & 15) << 4) | (y << 8);
    const qa = this._qa, qb = this._qb;
    const oldOp = OPAQUE[oldId], newOp = OPAQUE[newId];
    // block light
    if (EMIT[oldId] || newOp || FILTER[newId] > FILTER[oldId]) this.lightRemove(x, y, z, false, qb);
    if (EMIT[newId]) { c.light[i] = (c.light[i] & 0xf0) | EMIT[newId]; qb.push(x, y, z); }
    if (!newOp && (oldOp || FILTER[newId] < FILTER[oldId])) for (let d = 0; d < 6; d++) { const ny = y + DY[d]; if (ny >= 0 && ny < WH) qb.push(x + DX[d], ny, z + DZ[d]); }
    this.lightAdd(qb, false);
    // sky light
    if (newOp || FILTER[newId] > FILTER[oldId]) this.lightRemove(x, y, z, true, qa);
    if (!newOp && (oldOp || FILTER[newId] < FILTER[oldId])) {
      if (y === WH - 1) { c.light[i] = (c.light[i] & 15) | 0xf0; qa.push(x, y, z); }
      for (let d = 0; d < 6; d++) { const ny = y + DY[d]; if (ny >= 0 && ny < WH) qa.push(x + DX[d], ny, z + DZ[d]); }
    }
    this.lightAdd(qa, true);
  }

  /* ---- chunk lifecycle ---- */
  addChunk(cx, cz, blocks, light, spawns) {
    if (this.chunks.has(chunkKey(cx, cz))) return;
    const c = new Chunk(cx, cz, blocks, light);
    const em = this.edits.get(c.key);
    if (em) for (const [i, v] of em) {
      c.data[i] = v >> 8;
      const id = v & 255;
      if (SAPLING_KIND[id] !== undefined) this.saplings.set(posKey(cx * 16 + (i & 15), i >> 8, cz * 16 + ((i >> 4) & 15)), this.clock + randRange(30, 90));
    }
    this.chunks.set(c.key, c); this._lk = -1;
    this.dirtyList.add(c);
    this.orderDirty = true;
    const qa = this._qa, qb = this._qb;
    for (let d = 0; d < 4; d++) {
      const n = this.getChunk(cx + HX[d], cz + HZ[d]);
      if (!n) continue;
      for (let y = 0; y < WH; y++) for (let t = 0; t < 16; t++) {
        let lxa, lza, lxb, lzb;
        if (d === 0) { lxa = 15; lza = t; lxb = 0; lzb = t; }
        else if (d === 1) { lxa = 0; lza = t; lxb = 15; lzb = t; }
        else if (d === 2) { lxa = t; lza = 15; lxb = t; lzb = 0; }
        else { lxa = t; lza = 0; lxb = t; lzb = 15; }
        const ia = lxa | (lza << 4) | (y << 8), ib = lxb | (lzb << 4) | (y << 8);
        const la = c.light[ia], lb = n.light[ib];
        const wxa = cx * 16 + lxa, wza = cz * 16 + lza, wxb = n.cx * 16 + lxb, wzb = n.cz * 16 + lzb;
        if (!OPAQUE[n.blocks[ib]]) { if ((la >> 4) - 1 > (lb >> 4)) qa.push(wxa, y, wza); if ((la & 15) - 1 > (lb & 15)) qb.push(wxa, y, wza); }
        if (!OPAQUE[c.blocks[ia]]) { if ((lb >> 4) - 1 > (la >> 4)) qa.push(wxb, y, wzb); if ((lb & 15) - 1 > (la & 15)) qb.push(wxb, y, wzb); }
      }
    }
    this.lightAdd(qa, true);
    this.lightAdd(qb, false);
    if (spawns) for (const s of spawns) this.spawnQueue.push(s);
  }
  removeChunk(c) {
    for (let s = 0; s < NSEC; s++) { freeSectionMesh(c.meshes[s]); freeSectionMesh(c.tmeshes[s]); c.meshes[s] = c.tmeshes[s] = null; }
    this.chunks.delete(c.key); this._lk = -1;
    this.dirtyList.delete(c); this.urgentList.delete(c);
    this.orderDirty = true;
  }
  editsFor(key) {
    const em = this.edits.get(key);
    if (!em) return null;
    const a = [];
    for (const [i, v] of em) a.push(i, v);
    return a;
  }
  stream(pool, px, pz, R) {
    const pcx = Math.floor(px) >> 4, pcz = Math.floor(pz) >> 4;
    if (pcx !== this.centerCX || pcz !== this.centerCZ) { this.centerCX = pcx; this.centerCZ = pcz; this.orderDirty = true; }
    if (this.orderDirty) this.rebuildOrder(R);
    const need = R + 1;
    if (pool.busy < pool.capacity + 2) {
      let n = 0;
      for (let r = 0; r <= need && n < 4; r++) {
        for (let dz = -r; dz <= r && n < 4; dz++) for (let dx = -r; dx <= r && n < 4; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (dx * dx + dz * dz > need * need + 2) continue;
          const cx = pcx + dx, cz = pcz + dz, k = chunkKey(cx, cz);
          if (this.chunks.has(k) || this.requested.has(k)) continue;
          this.requested.add(k);
          n++;
          pool.request({
            map: this.map, seed: this.seed, cx, cz, edits: this.editsFor(k),
            cb: (blocks, light, spawns) => { this.requested.delete(k); if (this.alive) this.addChunk(cx, cz, blocks, light, spawns); },
          });
        }
        if (pool.busy >= pool.capacity + 2) break;
      }
    }
    const far = R + 3;
    for (const c of this.chunks.values()) {
      if (Math.abs(c.cx - pcx) > far || Math.abs(c.cz - pcz) > far) this.removeChunk(c);
    }
  }
  rebuildOrder() {
    const pcx = this.centerCX, pcz = this.centerCZ;
    this.order = Array.from(this.chunks.values());
    for (const c of this.order) c.dist2 = (c.cx - pcx) * (c.cx - pcx) + (c.cz - pcz) * (c.cz - pcz);
    this.order.sort((a, b) => a.dist2 - b.dist2);
    this.orderDirty = false;
  }
  meshable(c) {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && !this.getChunk(c.cx + dx, c.cz + dz)) return false;
    return true;
  }
  meshStep(budgetMs, R) {
    for (const c of this.urgentList) {
      for (let s = 0; s < NSEC; s++) if (c.dirty[s] === 2) meshSection(this, c, s);
    }
    this.urgentList.clear();
    const t0 = performance.now();
    let did = 0;
    for (const c of this.order) {
      if (c.dist2 > (R + 0.5) * (R + 0.5)) break;
      if (!this.dirtyList.has(c)) continue;
      if (!this.meshable(c)) continue;
      for (let s = 0; s < NSEC; s++) {
        if (c.dirty[s]) { meshSection(this, c, s); did++; }
        if (did > 1 && performance.now() - t0 > budgetMs) return;
      }
      c.everMeshed = true;
      this.dirtyList.delete(c);
    }
  }
  readyAround(x, z, r) {
    const pcx = Math.floor(x) >> 4, pcz = Math.floor(z) >> 4;
    let ok = 0, total = 0;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      total++;
      const c = this.getChunk(pcx + dx, pcz + dz);
      if (c && c.everMeshed && !this.dirtyList.has(c)) ok++;
    }
    return ok / total;
  }

  /* ---- block changes ---- */
  setBlock(x, y, z, id, data, urgent) {
    if (y < 0 || y >= WH) return false;
    const c = this.getChunk(x >> 4, z >> 4);
    if (!c) return false;
    const i = (x & 15) | ((z & 15) << 4) | (y << 8);
    const old = c.blocks[i], od = c.data[i];
    data = data | 0;
    if (old === id && od === data) return false;
    c.blocks[i] = id; c.data[i] = data;
    const s = y >> 4;
    if (!old && id) c.counts[s]++; else if (old && !id) c.counts[s]--;
    let em = this.edits.get(c.key);
    if (!em) { em = new Map(); this.edits.set(c.key, em); }
    em.set(i, id | (data << 8));
    if (old !== id) this.relight(x, y, z, old, id);
    this.markAround(x, y, z, urgent);
    if (old !== id) {
      const tileOld = old === B.CHEST || old === B.FURNACE || old === B.FURNACE_LIT;
      const furnaceSwap = (old === B.FURNACE || old === B.FURNACE_LIT) && (id === B.FURNACE || id === B.FURNACE_LIT);
      if (tileOld && !furnaceSwap) this.dropTile(x, y, z);
      if (SAPLING_KIND[id] !== undefined) this.saplings.set(posKey(x, y, z), this.clock + randRange(40, 100));
    }
    this.neighborChanged(x, y, z);
    return true;
  }
  canStay(x, y, z, id, data) {
    const d = BLOCKS[id];
    if (!d || !d.plant) return true;
    const below = this.getBlock(x, y - 1, z);
    if (below === B.UNLOADED) return true;
    if (d.plant === 'soil') return below === B.GRASS || below === B.DIRT || below === B.SNOWY_GRASS;
    if (d.plant === 'sand') return id === B.CACTUS ? (below === B.SAND || below === B.CACTUS) : (below === B.SAND || below === B.DIRT || below === B.GRASS);
    if (d.plant === 'torch') {
      if (!data) return SOLID[below] && OPAQUE[below];
      const o = TORCH_DIRS[data];
      if (!o) return true;
      const b = this.getBlock(x + o[0], y, z + o[1]);
      return b === B.UNLOADED || (SOLID[b] && OPAQUE[b]);
    }
    return true;
  }
  checkSupport(x, y, z) {
    const b = this.getBlock(x, y, z);
    if (!b || b === B.UNLOADED || !BLOCKS[b].plant) return;
    if (!this.canStay(x, y, z, b, this.getData(x, y, z))) {
      this.setBlock(x, y, z, B.AIR, 0, true);
      if (this.onBreak) this.onBreak(x, y, z, b, true);
    }
  }
  neighborChanged(x, y, z) {
    const id = this.getBlock(x, y, z);
    for (const dy of [-1, 1]) {
      const ny = y + dy;
      if (this.getBlock(x, ny, z) === B.DOOR && id !== B.DOOR) {
        const nd = this.getData(x, ny, z);
        if ((dy === 1 && (nd & 8)) || (dy === -1 && !(nd & 8))) this.setBlock(x, ny, z, B.AIR, 0, true);
      }
    }
    if (LIQUID[id]) this.scheduleLiquid(x, y, z);
    if (BLOCKS[id] && BLOCKS[id].gravity) this.gravQ.push(x, y, z);
    for (let d = 0; d < 6; d++) {
      const nx = x + DX[d], ny = y + DY[d], nz = z + DZ[d];
      const nb = this.getBlock(nx, ny, nz);
      if (LIQUID[nb]) this.scheduleLiquid(nx, ny, nz);
      if (d === 2 && BLOCKS[nb] && BLOCKS[nb].gravity) this.gravQ.push(nx, ny, nz);
      if (nb && nb !== B.UNLOADED && BLOCKS[nb].plant && d !== 3) this.checkSupport(nx, ny, nz);
    }
  }

  /* ---- liquids ---- */
  scheduleLiquid(x, y, z) {
    const k = posKey(x, y, z);
    if (this.liquidSet.has(k)) return;
    this.liquidSet.add(k);
    const lava = this.getBlock(x, y, z) === B.LAVA;
    this.liquidQ.push({ x, y, z, k, t: this.clock + (lava ? 1.2 : 0.25) });
  }
  flowable(b) { return b === B.AIR || (!SOLID[b] && !LIQUID[b] && b !== B.UNLOADED && b !== B.DOOR); }
  flowInto(x, y, z, id, data) {
    const b = this.getBlock(x, y, z);
    if (b !== B.AIR && this.onBreak) this.onBreak(x, y, z, b, true);
    this.setBlock(x, y, z, id, data);
  }
  mixLiquids(x, y, z, flowing, target) {
    if (flowing === B.WATER && target === B.LAVA) this.setBlock(x, y, z, this.getData(x, y, z) === 0 ? B.OBSIDIAN : B.COBBLE, 0);
    else if (flowing === B.LAVA && target === B.WATER) this.setBlock(x, y, z, B.STONE, 0);
    else return;
    if (this.onSound) this.onSound('fizz', x + 0.5, y + 0.5, z + 0.5);
  }
  updateLiquid(x, y, z) {
    const id = this.getBlock(x, y, z);
    if (!LIQUID[id]) return;
    const maxL = id === B.WATER ? 7 : 3;
    const data = this.getData(x, y, z);
    let level = data & 7, falling = (data & 8) !== 0;
    if (!(level === 0 && !falling)) {
      let best = 99, srcCount = 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + HX[d], nz = z + HZ[d];
        if (this.getBlock(nx, y, nz) !== id) continue;
        const nd = this.getData(nx, y, nz);
        if (nd === 0) srcCount++;
        const nlv = (nd & 8) ? 0 : (nd & 7);
        if (nlv + 1 < best) best = nlv + 1;
      }
      let nd = -1;
      if (id === B.WATER && srcCount >= 2) {
        const below = this.getBlock(x, y - 1, z);
        if (SOLID[below] || (below === B.WATER && this.getData(x, y - 1, z) === 0)) nd = 0;
      }
      if (nd < 0) {
        if (this.getBlock(x, y + 1, z) === id) nd = 8;
        else if (best <= maxL) nd = best;
        else { this.setBlock(x, y, z, B.AIR, 0); return; }
      }
      if (nd !== data) this.setBlock(x, y, z, id, nd);
      level = nd & 7; falling = (nd & 8) !== 0;
    }
    const source = level === 0 && !falling;
    if (y > 0) {
      const below = this.getBlock(x, y - 1, z);
      if (this.flowable(below)) { this.flowInto(x, y - 1, z, id, 8); if (!source) return; }
      else if (below === id) { if (!source) return; }
      else if (LIQUID[below]) { this.mixLiquids(x, y - 1, z, id, below); return; }
    } else if (this.map === 'sky') return;
    const next = falling ? 1 : level + 1;
    if (next > maxL) return;
    for (let d = 0; d < 4; d++) {
      const nx = x + HX[d], nz = z + HZ[d], nb = this.getBlock(nx, y, nz);
      if (nb === B.UNLOADED) continue;
      if (this.flowable(nb)) this.flowInto(nx, y, nz, id, next);
      else if (nb === id) { const nd = this.getData(nx, y, nz); if (!(nd & 8) && nd !== 0 && (nd & 7) > next) this.setBlock(nx, y, nz, id, next); }
      else if (LIQUID[nb]) this.mixLiquids(nx, y, nz, id, nb);
    }
  }
  tickLiquids() {
    if (!this.liquidQ.length) return;
    const q = this.liquidQ;
    this.liquidQ = [];
    let n = 0;
    for (const e of q) {
      if (e.t <= this.clock && n < 300) { this.liquidSet.delete(e.k); n++; this.updateLiquid(e.x, e.y, e.z); }
      else this.liquidQ.push(e);
    }
  }
  tickGravity() {
    if (!this.gravQ.length) return;
    const q = this.gravQ;
    this.gravQ = [];
    for (let i = 0; i < q.length; i += 3) {
      const x = q[i], y = q[i + 1], z = q[i + 2], b = this.getBlock(x, y, z);
      if (!BLOCKS[b] || !BLOCKS[b].gravity || y <= 0) continue;
      const below = this.getBlock(x, y - 1, z);
      if (below === B.AIR || LIQUID[below] || (!SOLID[below] && below !== B.UNLOADED)) {
        this.setBlock(x, y, z, B.AIR, 0, true);
        if (this.onFall) this.onFall(x, y, z, b);
      }
    }
  }

  /* ---- trees from saplings ---- */
  growTree(x, y, z, kind) {
    const hgt = kind === 2 ? 6 + randInt(0, 3) : (kind === 1 ? 5 : 4) + randInt(0, 2);
    for (let dy = 1; dy <= hgt + 1; dy++) { const b = this.getBlock(x, y + dy, z); if (b !== B.AIR && !BLOCKS[b].replaceable && b !== B.OAK_LEAVES && b !== B.BIRCH_LEAVES && b !== B.SPRUCE_LEAVES) return false; }
    const log = [B.OAK_LOG, B.BIRCH_LOG, B.SPRUCE_LOG][kind], leaf = [B.OAK_LEAVES, B.BIRCH_LEAVES, B.SPRUCE_LEAVES][kind];
    const put = (px, py, pz, id) => { const b = this.getBlock(px, py, pz); if (b === B.AIR || (BLOCKS[b] && BLOCKS[b].replaceable && !LIQUID[b])) this.setBlock(px, py, pz, id, 0, true); };
    if (kind === 2) {
      const RAD = [0, 1, 1, 2, 1, 2, 2, 3, 2];
      for (let dy = hgt; dy >= 2; dy--) {
        const k = hgt - dy, rad = RAD[Math.min(k, RAD.length - 1)];
        for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
          if (rad > 0 && Math.abs(dx) + Math.abs(dz) > rad + (rad > 1 ? 1 : 0)) continue;
          put(x + dx, y + dy, z + dz, leaf);
        }
      }
      put(x, y + hgt + 1, z, leaf);
    } else {
      for (let dy = hgt - 3; dy <= hgt; dy++) {
        const rad = dy >= hgt - 1 ? 1 : 2;
        for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
          if (Math.abs(dx) === rad && Math.abs(dz) === rad && (dy === hgt || Math.random() < 0.5)) continue;
          put(x + dx, y + dy, z + dz, leaf);
        }
      }
    }
    for (let dy = 0; dy < hgt; dy++) this.setBlock(x, y + dy, z, log, 0, true);
    if (this.getBlock(x, y - 1, z) === B.GRASS) this.setBlock(x, y - 1, z, B.DIRT, 0, true);
    return true;
  }
  tickSaplings() {
    for (const [k, t] of this.saplings) {
      if (t > this.clock) continue;
      const y = k % 256, rest = (k - y) / 256, z = (rest % 2097152) - 1048576, x = Math.floor(rest / 2097152) - 1048576;
      const b = this.getBlock(x, y, z);
      if (b === B.UNLOADED) { this.saplings.set(k, this.clock + 10); continue; }
      this.saplings.delete(k);
      if (SAPLING_KIND[b] === undefined) continue;
      if ((this.getLight(x, y + 1, z) >> 4) < 8 && (this.getLight(x, y + 1, z) & 15) < 9) { this.saplings.set(k, this.clock + 30); continue; }
      this.setBlock(x, y, z, B.AIR, 0, true);
      if (!this.growTree(x, y, z, SAPLING_KIND[b])) { this.setBlock(x, y, z, b, 0, true); this.saplings.set(k, this.clock + 60); }
    }
  }
  randomTicks(px, pz) {
    const pcx = Math.floor(px) >> 4, pcz = Math.floor(pz) >> 4;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const c = this.getChunk(pcx + dx, pcz + dz);
      if (!c) continue;
      for (let k = 0; k < 24; k++) {
        const i = (Math.random() * CVOL) | 0, b = c.blocks[i];
        if (b !== B.DIRT && b !== B.GRASS) continue;
        const y = i >> 8;
        if (y >= WH - 1) continue;
        const x = c.cx * 16 + (i & 15), z = c.cz * 16 + ((i >> 4) & 15);
        const above = c.blocks[i + 256];
        if (b === B.GRASS) { if (OPAQUE[above] || LIQUID[above]) this.setBlock(x, y, z, B.DIRT, 0); continue; }
        if (OPAQUE[above] || LIQUID[above] || (c.light[i + 256] >> 4) < 9) continue;
        const nb = this.getBlock(x + randInt(-1, 1), y + randInt(-1, 1), z + randInt(-1, 1));
        if (nb === B.GRASS) this.setBlock(x, y, z, B.GRASS, 0);
      }
    }
  }

  /* ---- tile entities (chests and furnaces) ---- */
  getTile(x, y, z, create) {
    const k = tileKey(x, y, z);
    let t = this.tiles.get(k);
    if (!t && create) {
      t = create === 'chest' ? { type: 'chest', slots: new Array(27).fill(null) } : { type: 'furnace', slots: [null, null, null], burn: 0, burnMax: 0, cook: 0 };
      this.tiles.set(k, t);
    }
    return t || null;
  }
  dropTile(x, y, z) {
    const k = tileKey(x, y, z), t = this.tiles.get(k);
    if (!t) return;
    this.tiles.delete(k);
    if (this.onDrop) for (const s of t.slots) if (s) this.onDrop(x + 0.5, y + 0.5, z + 0.5, s);
  }
  tickFurnaces(dt) {
    for (const [k, t] of this.tiles) {
      if (t.type !== 'furnace') continue;
      const [x, y, z] = k.split(',').map(Number);
      const b = this.getBlock(x, y, z);
      if (b === B.UNLOADED) continue;
      const input = t.slots[0], fuel = t.slots[1], out = t.slots[2];
      const result = input ? SMELT[input.id] : undefined;
      const canSmelt = result !== undefined && (!out || (out.id === result && out.count < maxStack(result)));
      if (t.burn > 0) t.burn -= dt;
      if (t.burn <= 0 && canSmelt && fuel && fuelValue(fuel.id) > 0) {
        t.burn = t.burnMax = fuelValue(fuel.id);
        fuel.count--; if (fuel.count <= 0) t.slots[1] = null;
      }
      if (t.burn > 0 && canSmelt) {
        t.cook += dt;
        if (t.cook >= SMELT_TIME) {
          t.cook = 0;
          input.count--; if (input.count <= 0) t.slots[0] = null;
          if (out) out.count++; else t.slots[2] = { id: result, count: 1 };
        }
      } else if (t.cook > 0) t.cook = Math.max(0, t.cook - dt * 2);
      if (t.burn < 0) t.burn = 0;
      const lit = t.burn > 0;
      if (lit && b === B.FURNACE) this.setBlock(x, y, z, B.FURNACE_LIT, this.getData(x, y, z));
      else if (!lit && b === B.FURNACE_LIT) this.setBlock(x, y, z, B.FURNACE, this.getData(x, y, z));
    }
  }

  tick(dt, px, pz) {
    this.clock += dt;
    this.tickLiquids();
    this.tickGravity();
    this.randT += dt;
    if (this.randT > 0.25) { this.randT = 0; this.randomTicks(px, pz); this.tickSaplings(); }
    this.tickFurnaces(dt);
  }

  /* ---- save format ---- */
  serialize() {
    const edits = {};
    for (const [k, em] of this.edits) {
      const cx = Math.floor(k / 65536) - 32768, cz = (k % 65536) - 32768;
      const a = [];
      for (const [i, v] of em) a.push(i, v);
      edits[cx + ',' + cz] = a;
    }
    const tiles = {};
    for (const [k, t] of this.tiles) tiles[k] = t;
    return { edits, tiles };
  }
  load(data) {
    if (!data) return;
    if (data.edits) for (const ck in data.edits) {
      const [cx, cz] = ck.split(',').map(Number), a = data.edits[ck], em = new Map();
      for (let i = 0; i < a.length; i += 2) em.set(a[i], a[i + 1]);
      this.edits.set(chunkKey(cx, cz), em);
    }
    if (data.tiles) for (const k in data.tiles) this.tiles.set(k, data.tiles[k]);
  }
  destroy() {
    this.alive = false;
    for (const c of this.chunks.values()) this.removeChunk(c);
  }
}
