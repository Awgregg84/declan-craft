/* ===================== World generation for the third wish list =====================
   Like genModule, genModule3 is turned into text and run in the generator workers too (see GenPool), so it may only
   use its arguments (B, and H: genModule's helpers) and what it makes itself. */
function genModule3(B, H) {
  'use strict';
  const { WH, CVOL, idx, clamp, mulberry32, hash3, makeNoise, fbm2, placeTree, decorate, oreVeins, PLAINS, FOREST } = H;

  /* ========== The Moon: grey dust over moon rock, covered in craters, with cheese inside ========== */
  function moonGen(seed) {
    const nA = makeNoise(seed ^ 0x6d00a1), nB = makeNoise(seed ^ 0x6d00b2), nC = makeNoise(seed ^ 0x6d00c3);
    const CELL = 40, cache = new Map();
    function craters(gx, gz) {   // none, one or two in each 40-block square: small ones, and now and then a big one
      const k = gx + ',' + gz;
      let list = cache.get(k);
      if (list) return list;
      const r = mulberry32(hash3(seed ^ 0x51c, gx, gz));
      list = [];
      const n = r() < 0.8 ? (r() < 0.4 ? 2 : 1) : 0;
      for (let i = 0; i < n; i++) { const big = r() < 0.15; list.push({ x: (gx + r()) * CELL, z: (gz + r()) * CELL, r: big ? 13 + r() * 9 : 3 + r() * 7, cheese: r() < 0.3 }); }
      if (cache.size > 5000) cache.clear();
      cache.set(k, list);
      return list;
    }
    /* the height of the ground here, and whether it is the bottom of a crater full of cheese */
    function column(x, z) {
      let h = 50 + fbm2(nA, x * 0.005, z * 0.005, 3) * 9 + fbm2(nB, x * 0.04, z * 0.04, 2) * 1.6, cheese = false;
      const gx = Math.floor(x / CELL), gz = Math.floor(z / CELL);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (const c of craters(gx + dx, gz + dz)) {
        const d = Math.hypot(x - c.x, z - c.z) / c.r;
        if (d < 1) { h -= (1 - d * d) * c.r * 0.42; if (c.cheese && d < 0.55) cheese = true; }   // the bowl
        else if (d < 1.7) h += Math.pow(1 - (d - 1) / 0.7, 2) * c.r * 0.16;   // its raised rim
      }
      return [Math.round(clamp(h, 8, WH - 24)), cheese];
    }
    function generate(cx, cz) {
      const blocks = new Uint8Array(CVOL), x0 = cx * 16, z0 = cz * 16, r = mulberry32(hash3(seed ^ 0x33, cx, cz));
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const x = x0 + lx, z = z0 + lz, [h, cheese] = column(x, z);
        for (let y = 0; y <= h; y++) {
          let b;
          if (y === 0 || (y < 3 && r() < 0.6)) b = B.BEDROCK;
          else if (y > h - 3) b = B.MOON_DUST;
          else b = nC.n3(x * 0.07, y * 0.09, z * 0.07) > 0.5 ? B.MOON_CHEESE : B.MOON_ROCK;   // pockets of cheese in the rock
          blocks[idx(lx, y, lz)] = b;
        }
        if (cheese) { blocks[idx(lx, h, lz)] = B.MOON_CHEESE; if (r() < 0.6) blocks[idx(lx, h - 1, lz)] = B.MOON_CHEESE; }
      }
      for (let k = 0; k < 2; k++) {   // boulders of moon rock lying about
        if (r() > 0.35) continue;
        const lx = 2 + ((r() * 12) | 0), lz = 2 + ((r() * 12) | 0), h = column(x0 + lx, z0 + lz)[0], s = r() < 0.3 ? 2 : 1;
        for (let dy = 1; dy <= s; dy++) for (let dx = 0; dx < s; dx++) for (let dz = 0; dz < s; dz++) if (h + dy < WH) blocks[idx(lx + dx, h + dy, lz + dz)] = B.MOON_ROCK;
      }
      return { blocks, spawns: [] };
    }
    function spawn() { return [0.5, column(0, 0)[0] + 1, 0.5]; }
    return { generate, spawn };
  }

  /* ========== The other planets (the sixth wish list): Mars, Jupiter and Uranus, reached by rocket ========== */
  const ROVER_CELL = 96, ISLE_CELL = 44;
  /* Mars: red dust over dark red rock, rolling hills cut by deep canyons, boulders, and a little rover in each 96-block square */
  function roverAt(seed, gx, gz) { const r = mulberry32(hash3(seed ^ 0x40e, gx, gz)); return { x: Math.floor((gx + 0.2 + r() * 0.6) * ROVER_CELL), z: Math.floor((gz + 0.2 + r() * 0.6) * ROVER_CELL), yaw: (r() * 4) | 0 }; }
  function marsGen(seed, town) {   // (town: the Mars world, with its base, the aliens' village and the race tracks)
    const nA = makeNoise(seed ^ 0x3a5a), nB = makeNoise(seed ^ 0x3a5b), nC = makeNoise(seed ^ 0x3a5c);
    function column(x, z) {
      const base = 54 + fbm2(nA, x * 0.006, z * 0.006, 3) * 12 + fbm2(nB, x * 0.05, z * 0.05, 2) * 1.5;
      const c = Math.abs(fbm2(nC, x * 0.004, z * 0.004, 2)), cut = c < 0.07 ? (1 - c / 0.07) : 0;   // a winding canyon where the noise crosses zero
      let h = base - Math.pow(cut, 0.6) * 26;
      if (town) { const T = MW.town, d = Math.hypot(x - T.x, z - T.z); if (d < T.r + 18) { const k = d <= T.r ? 1 : 1 - (d - T.r) / 18; h += (T.y - h) * k * k * (3 - 2 * k); } }   // (level ground for the base and the village)
      return Math.round(clamp(h, 8, WH - 24));
    }
    function generate(cx, cz, vb) {
      const blocks = new Uint8Array(CVOL), x0 = cx * 16, z0 = cz * 16, r = mulberry32(hash3(seed ^ 0x3a5, cx, cz));
      let data = null;
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const h = column(x0 + lx, z0 + lz);
        for (let y = 0; y <= h; y++) blocks[idx(lx, y, lz)] = y === 0 || (y < 3 && r() < 0.6) ? B.BEDROCK : y > h - 3 ? B.MARS_DUST : (y % 7 === 3 ? B.MARS_DUST : B.MARS_ROCK);   // (layers in the canyon walls)
      }
      for (let k = 0; k < 3; k++) {   // red boulders
        if (r() > 0.4) continue;
        const lx = 2 + ((r() * 12) | 0), lz = 2 + ((r() * 12) | 0), h = column(x0 + lx, z0 + lz), s = r() < 0.3 ? 2 : 1;
        for (let dy = 1; dy <= s; dy++) for (let dx = 0; dx < s; dx++) for (let dz = 0; dz < s; dz++) if (h + dy < WH) blocks[idx(lx + dx, h + dy, lz + dz)] = B.MARS_ROCK;
      }
      // the rover: six wheels, a white body, a mast with a camera, and blue solar panels
      const gx = Math.floor((x0 + 8) / ROVER_CELL), gz = Math.floor((z0 + 8) / ROVER_CELL);
      for (let dgz = -1; dgz <= 1; dgz++) for (let dgx = -1; dgx <= 1; dgx++) {
        const v = roverAt(seed, gx + dgx, gz + dgz);
        if (v.x < x0 - 4 || v.x > x0 + 19 || v.z < z0 - 4 || v.z > z0 + 19) continue;
        const h = column(v.x, v.z), sw = v.yaw & 1, P = (a, b, y, id) => { const x = v.x + (sw ? b : a), z = v.z + (sw ? a : b); if (x >= x0 && x < x0 + 16 && z >= z0 && z < z0 + 16 && y > 0 && y < WH) blocks[idx(x - x0, y, z - z0)] = id; };
        for (let a = -2; a <= 2; a++) for (let b = -1; b <= 1; b++) for (let y = h - 2; y <= h; y++) P(a, b, y, B.MARS_ROCK);   // (flat ground under it)
        for (let a = -2; a <= 2; a++) for (let b = -1; b <= 1; b++) for (let y = h + 1; y <= h + 6; y++) P(a, b, y, B.AIR);
        for (const a of [-2, 0, 2]) for (const b of [-1, 1]) P(a, b, h + 1, B.COAL_BLOCK);
        for (let a = -2; a <= 2; a++) P(a, 0, h + 2, B.IRON_BLOCK);
        for (let a = -1; a <= 1; a++) { P(a, -1, h + 2, B.QUARTZ_BLOCK); P(a, 1, h + 2, B.QUARTZ_BLOCK); }
        for (let a = -2; a <= 0; a++) for (const b of [-1, 0, 1]) P(a, b, h + 3, B.LAPIS_BLOCK);
        P(2, 0, h + 3, B.IRON_BARS); P(2, 0, h + 4, B.IRON_BARS); P(2, 0, h + 5, B.GLASS);
      }
      if (town) {
        const P = painter(blocks, cx, cz), skip = id => !!(vb && vb.has(id));
        const setD = (x, y, z, id, dv) => { const lx = x - x0, lz = z - z0; if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= 1 && y < WH) { blocks[idx(lx, y, lz)] = id; if (!data) data = new Uint8Array(CVOL); data[idx(lx, y, lz)] = dv; } };
        paintMarsTown(P);
        if (!skip(MW.base.id)) paintMarsBase(P, setD);
        if (!skip(MW.field.id)) paintMarsField(P);
        for (const ru of MW.ruins) if (!skip(ru.id)) paintRuin(P, setD, ru, column);
        for (const tr of marsTracks()) if (!skip(tr.id)) { if (tr.id) paintGarage(P, tr); paintTrack(blocks, cx, cz, tr, column); }
      }
      return { blocks, spawns: [], data };
    }
    function spawn() { return town ? MW.spawn.slice() : [0.5, column(0, 0) + 1, 0.5]; }
    return { generate, spawn, column };
  }
  /* ---- the Mars world (the seventh wish list): a landing pad, the aliens' village of glass domes, and two race tracks ---- */
  const MW = {
    town: { x: 0, z: 0, r: 46, y: 58 },
    spawn: [0.5, 59, 10.5],
    rocket: [10, 24], saucer: [-12, 24],   // the two landing pads
    plaza: [-22, -16],
    domes: [[-22, -31, 14], [-36, -22, 5], [-36, -8, 11], [-9, -24, 4], [-20, -2, 10]],   // [x, z, floor colour]
    tracks: [
      { name: 'Canyon Loop', laps: 3, y: 58, garage: [27, 12],
        way: [[40, 4], [40, -30], [52, -58], [80, -66], [104, -50], [108, -14], [96, 14], [104, 40], [88, 62], [58, 58], [42, 36]],
        boost: [0.12, 0.62], boxes: [0.26, 0.74], ramps: [[0.46, 2]], dips: [], tunnels: [[0.84, 0.05]] },
      { name: 'Crater Run', laps: 3, y: 58, garage: [-4, -38],
        way: [[-10, -52], [-44, -56], [-72, -76], [-76, -112], [-52, -138], [-60, -170], [-30, -190], [4, -176], [0, -140], [24, -120], [30, -86], [14, -60]],
        boost: [0.08, 0.5, 0.8], boxes: [0.2, 0.46, 0.72], ramps: [[0.3, 3], [0.9, 2]], dips: [[0.55, 0.12, 4]], tunnels: [[0.38, 0.05]] },
      // (the second Mars update. Things with an id are kept out of a world from before wherever something was built: see marsTouching)
      { id: 'mtrack2', name: 'Dune Dash', laps: 3, y: 58, garage: [-42, 4],
        way: [[-54, 14], [-54, 42], [-66, 64], [-92, 74], [-118, 62], [-128, 34], [-118, 6], [-96, -8], [-72, -12], [-58, -6]],
        boost: [0.1, 0.45, 0.75], boxes: [0.22, 0.5, 0.8], ramps: [[0.3, 3], [0.62, 2]], dips: [[0.86, 0.08, 3]], tunnels: [[0.52, 0.05]] },
    ],
    base: { id: 'mbase', x: 20, z: 36, r: 6 },   // your own dome, with an Air Maker inside
    field: { id: 'mfield', x: -12, z: 40, hx: 12, hz: 6 },   // the bounce-ball field: a goal at each end (x - hx and x + hx)
    ruins: [{ id: 'mruin0', x: 140, z: -30 }, { id: 'mruin1', x: -10, z: 100 }, { id: 'mruin2', x: -120, z: -70 }, { id: 'mruin3', x: 80, z: -120 }, { id: 'mruin4', x: 70, z: 120 }],
  };
  /* (for a Mars world from before the second update) the new things whose ground overlaps any of the given chunks */
  function marsTouching(chunks) {
    const out = new Set(), hit = (x1, z1, x2, z2, cx, cz) => x2 >= cx * 16 && x1 <= cx * 16 + 15 && z2 >= cz * 16 && z1 <= cz * 16 + 15;
    for (const [cx, cz] of chunks) {
      const b = MW.base, f = MW.field;
      if (hit(b.x - b.r - 1, b.z - b.r - 1, b.x + b.r + 1, b.z + b.r + 1, cx, cz)) out.add(b.id);
      if (hit(f.x - f.hx - 2, f.z - f.hz - 2, f.x + f.hx + 2, f.z + f.hz + 2, cx, cz)) out.add(f.id);
      for (const ru of MW.ruins) if (hit(ru.x - 9, ru.z - 9, ru.x + 9, ru.z + 9, cx, cz)) out.add(ru.id);
      for (const tr of marsTracks()) if (tr.id && !out.has(tr.id) && (tr.pts.some(q => q[0] > cx * 16 - 11 && q[0] < cx * 16 + 27 && q[1] > cz * 16 - 11 && q[1] < cz * 16 + 27) || hit(tr.garage[0] - 6, tr.garage[1] - 5, tr.garage[0] + 6, tr.garage[1] + 5, cx, cz))) out.add(tr.id);
    }
    return Array.from(out);
  }
  /* the nearest ruins that are there: { id, x, z, k } */
  function nearestRuin(x, z, blocked) {
    let best = null, bd = 1e18;
    MW.ruins.forEach((ru, k) => { const d = (ru.x - x) * (ru.x - x) + (ru.z - z) * (ru.z - z); if (d < bd && !(blocked && blocked.includes(ru.id))) { bd = d; best = { id: ru.id, x: ru.x, z: ru.z, k }; } });
    return best;
  }
  /* a track: its waypoints joined by a smooth closed curve and walked one block at a time. pts: [x, z, y] for each step;
     boost and tunnel: flags for each step; boxes: the steps where pickup boxes float */
  let _tracks = null;
  function marsTracks() {
    if (_tracks) return _tracks;
    _tracks = MW.tracks.map((tr, ti) => {
      const W = tr.way, n = W.length, dense = [];
      for (let i = 0; i < n; i++) {
        const p0 = W[(i + n - 1) % n], p1 = W[i], p2 = W[(i + 1) % n], p3 = W[(i + 2) % n];
        for (let s = 0; s < 40; s++) {
          const t = s / 40, t2 = t * t, t3 = t2 * t;
          dense.push([0, 1].map(k => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3)));
        }
      }
      const pts = [[dense[0][0], dense[0][1], tr.y]];
      let last = dense[0];
      for (let i = 1; i <= dense.length; i++) {   // one step for each block of the way round
        const q = dense[i % dense.length];
        let d = Math.hypot(q[0] - last[0], q[1] - last[1]);
        while (d >= 1) { last = [last[0] + (q[0] - last[0]) / d, last[1] + (q[1] - last[1]) / d]; pts.push([last[0], last[1], tr.y]); d = Math.hypot(q[0] - last[0], q[1] - last[1]); }
      }
      if (Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]) < 0.6) pts.pop();
      const N = pts.length, at = f => Math.floor(f * N) % N, boost = new Uint8Array(N), tunnel = new Uint8Array(N), pit = new Uint8Array(N);
      for (const [f, rise] of tr.ramps) for (let k = 0; k < rise * 3; k++) pts[(at(f) + k) % N][2] = tr.y + Math.floor(k / 3) + 1;   // up a ramp, and off the end
      for (const [f, len, depth] of tr.dips) { const L = Math.floor(len * N); for (let i = 0; i < L; i++) pts[(at(f) + i) % N][2] = tr.y - Math.min(depth, Math.floor(i / 2) + 1, Math.floor((L - 1 - i) / 4) + 1); }
      for (const f of tr.boost) for (let k = 0; k < 4; k++) boost[(at(f) + k) % N] = 1;
      for (const [f, len] of tr.tunnels) for (let k = 0; k < Math.floor(len * N); k++) tunnel[(at(f) + k) % N] = 1;
      for (let k = 10; k <= 22; k++) pit[N - k] = 1;   // (the way in from the garage, just before the start line)
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
      for (const q of pts) { x0 = Math.min(x0, q[0]); z0 = Math.min(z0, q[1]); x1 = Math.max(x1, q[0]); z1 = Math.max(z1, q[1]); }
      return { i: ti, id: tr.id || null, name: tr.name, laps: tr.laps, y: tr.y, garage: tr.garage, pts, N, boost, tunnel, pit, boxes: tr.boxes.map(at), bbox: [x0 - 11, z0 - 11, x1 + 11, z1 + 11] };
    });
    return _tracks;
  }
  /* the nearest step of a track to a spot: [step, distance, which side (-1 left, 1 right of the way you drive)] */
  function trackNear(tr, x, z, from, span) {
    let bi = -1, bd = 1e9;
    const N = tr.N, a = from === undefined ? 0 : from, n = span === undefined ? N : span;
    for (let k = 0; k < n; k++) { const i = ((a + k) % N + N) % N, q = tr.pts[i], d = (q[0] - x) * (q[0] - x) + (q[1] - z) * (q[1] - z); if (d < bd) { bd = d; bi = i; } }
    const q = tr.pts[bi], nx = tr.pts[(bi + 1) % N], side = (nx[0] - q[0]) * (z - q[1]) - (nx[1] - q[1]) * (x - q[0]) < 0 ? -1 : 1;
    return [bi, Math.sqrt(bd), side];
  }
  /* the track in one chunk: a dark road nine blocks wide between striped barriers, cut through the hills and carried on
     bridges over the canyons; boost pads, a start line under an arch, ramps to jump off, and a tunnel */
  function paintTrack(blocks, cx, cz, tr, column) {
    const x0 = cx * 16, z0 = cz * 16, bb = tr.bbox;
    if (bb[2] < x0 || bb[0] > x0 + 15 || bb[3] < z0 || bb[1] > z0 + 15) return;
    const near = [];
    for (let i = 0; i < tr.N; i++) { const q = tr.pts[i]; if (q[0] > x0 - 11 && q[0] < x0 + 27 && q[1] > z0 - 11 && q[1] < z0 + 27) near.push(i); }
    if (!near.length) return;
    for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
      const x = x0 + lx + 0.5, z = z0 + lz + 0.5;
      let bi = -1, bd = 1e9;
      for (const i of near) { const q = tr.pts[i], d = (q[0] - x) * (q[0] - x) + (q[1] - z) * (q[1] - z); if (d < bd) { bd = d; bi = i; } }
      const d = Math.sqrt(bd), q = tr.pts[bi], nx = tr.pts[(bi + 1) % tr.N], left = (nx[0] - q[0]) * (z - q[1]) - (nx[1] - q[1]) * (x - q[0]) < 0;
      const open = tr.pit[bi] && left, wide = open ? 10.5 : 5.6;   // (the pit lane is on the left, towards the base)
      if (d > wide) continue;
      const ty = q[2], h = column(x0 + lx, z0 + lz), road = d <= 4.3 || open, arch = bi < 2 || bi === tr.N - 1, tun = tr.tunnel[bi];
      const set = (y, id) => { if (y > 0 && y < WH) blocks[idx(lx, y, lz)] = id; };
      if (h < ty - 3) { set(ty - 1, B.MARS_ROCK); if (bi % 12 === 0 && d < 1.6) for (let y = h + 1; y < ty - 1; y++) set(y, B.MARS_ROCK); }   // a bridge, on a pillar now and then
      else for (let y = Math.min(h, ty) + 1; y < ty; y++) set(y, B.MARS_ROCK);
      set(ty, arch && road ? B.WOOL + (((x0 + lx + z0 + lz) & 1) ? 15 : 0) : road && tr.boost[bi] && d <= 2.1 ? B.BOOST : B.TRACK);
      const top = tun ? ty + 5 : WH - 1;
      for (let y = ty + 1; y <= top; y++) set(y, B.AIR);
      if (tun) { set(ty + 6, B.MARS_ROCK); set(ty + 7, B.MARS_ROCK); if (bi % 6 === 0 && d < 1) set(ty + 5, B.GLOWSTONE); }
      if (!road && tun) for (let y = ty + 1; y <= ty + 5; y++) set(y, B.MARS_ROCK);   // (a tunnel's walls)
      else if (!road) { set(ty + 1, B.WOOL + ((bi >> 1) & 1 ? 14 : 0)); set(ty + 2, arch ? B.QUARTZ_BLOCK : B.IRON_BARS); if (arch) for (let y = ty + 3; y <= ty + 5; y++) set(y, B.QUARTZ_BLOCK); }
      if (arch && !tun) set(ty + 6, B.WOOL + (((x0 + lx + z0 + lz) & 1) ? 15 : 0));   // the start arch, in black and white checks
    }
  }
  function paintMarsTown(P) {
    const T = MW.town, Y = T.y + 1;
    if (!P.near(-60, -60, 60, 60)) return;
    for (const [px, pz, id] of [[MW.rocket[0], MW.rocket[1], B.STONE_BRICKS], [MW.saucer[0], MW.saucer[1], B.LAPIS_BLOCK]]) {   // the landing pads, with lamps round them
      P.disc(px, pz, 4.6, Y, Y + 8, B.AIR, false);
      P.disc(px, pz, 3.6, T.y, T.y, id, false);
      for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) P.set(px + dx, T.y, pz + dz, B.GLOWSTONE);
    }
    // paths of darker rock: from where you start to the pads, the village and the two garages
    const path = (ax, az, bx, bz) => { for (const [ox, oz] of [[0, 0], [1, 0], [0, 1]]) P.line(ax + ox, az + oz, bx + ox, bz + oz, T.y, T.y, B.MARS_ROCK); };
    path(0, 10, MW.rocket[0] - 3, MW.rocket[1] - 3); path(0, 10, MW.saucer[0] + 3, MW.saucer[1] - 3);
    path(0, 10, MW.plaza[0] + 4, MW.plaza[1] + 4); path(2, 10, MW.tracks[0].garage[0] - 6, MW.tracks[0].garage[1]);
    path(MW.plaza[0] + 4, MW.plaza[1] - 4, MW.tracks[1].garage[0] - 2, MW.tracks[1].garage[1] + 5);
    // the aliens' village: glass domes round a plaza with a glowing crystal
    const [vx, vz] = MW.plaza;
    P.disc(vx, vz, 5.5, T.y, T.y, B.QUARTZ_BLOCK, false);
    P.box(vx, Y, vz, vx, Y + 3, vz, B.STAINED_GLASS); P.set(vx, Y + 4, vz, B.GLOWSTONE);
    for (const [dx, dz, col] of MW.domes) {
      for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) {
        const r = Math.hypot(x, z);
        if (r <= 5.4) P.set(dx + x, T.y, dz + z, r > 4.4 ? B.QUARTZ_BLOCK : B.WOOL + col);
        for (let y = 0; y <= 6; y++) { const rr = Math.hypot(x, y, z); if (rr > 4.5 && rr <= 5.5) P.set(dx + x, Y + y, dz + z, B.GLASS); else if (rr <= 4.5) P.set(dx + x, Y + y, dz + z, B.AIR); }
      }
      const a = Math.atan2(vz - dz, vx - dx), ox = Math.round(Math.cos(a) * 5), oz = Math.round(Math.sin(a) * 5);   // the doorway faces the plaza
      for (let k = 4; k <= 6; k++) { const ex = dx + Math.round(Math.cos(a) * k), ez = dz + Math.round(Math.sin(a) * k); P.box(ex, Y, ez, ex, Y + 1, ez, B.AIR); }
      P.set(dx, T.y, dz, B.GLOWSTONE);
      P.set(dx - Math.sign(ox || 1) * 2, Y, dz - Math.sign(oz || 1) * 2, B.WOOL + ((col + 3) % 16));   // (a little table)
    }
    // a garage at each of the first two tracks: a roof on four posts, where the buggies wait (a later track brings its own)
    for (const tr of MW.tracks) if (!tr.id) paintGarage(P, tr);
  }
  function paintGarage(P, tr) {
    const T = MW.town, Y = T.y + 1;
    {
      const [gx, gz] = tr.garage;
      P.box(gx - 5, Y, gz - 4, gx + 5, Y + 4, gz + 4, B.AIR);
      for (const [dx, dz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) P.box(gx + dx, Y, gz + dz, gx + dx, Y + 3, gz + dz, B.IRON_BLOCK);
      P.box(gx - 5, Y + 4, gz - 4, gx + 5, Y + 4, gz + 4, B.QUARTZ_BLOCK);
      P.box(gx - 4, T.y, gz - 3, gx + 4, T.y, gz + 3, B.STONE_BRICKS);
      P.set(gx, Y + 3, gz, B.GLOWSTONE);
    }
  }
  /* your own base (the second Mars update): a glass dome with an Air Maker in the middle, so you can take your helmet
     off inside; a chest of things to start a garden with, a crafting table and a furnace */
  function paintMarsBase(P, setD) {
    const b = MW.base, T = MW.town, Y = T.y + 1, R = b.r;
    if (!P.near(b.x - R - 2, b.z - R - 2, b.x + R + 2, b.z + R + 2)) return;
    for (let x = -R - 1; x <= R + 1; x++) for (let z = -R - 1; z <= R + 1; z++) {
      const r = Math.hypot(x, z);
      if (r <= R + 0.4) { P.box(b.x + x, T.y - 3, b.z + z, b.x + x, T.y - 1, b.z + z, B.MARS_ROCK); P.set(b.x + x, T.y, b.z + z, r > R - 0.6 ? B.QUARTZ_BLOCK : (x + z) & 1 ? B.OAK_PLANKS : B.BIRCH_PLANKS); }
      for (let y = 0; y <= R + 1; y++) { const rr = Math.hypot(x, y, z); if (rr > R - 0.5 && rr <= R + 0.5) P.set(b.x + x, Y + y, b.z + z, B.GLASS); else if (rr <= R - 0.5) P.set(b.x + x, Y + y, b.z + z, B.AIR); }
    }
    for (let k = R - 1; k <= R + 1; k++) P.box(b.x - k, Y, b.z, b.x - k, Y + 1, b.z, B.AIR);   // the doorway, towards the landing pads
    P.set(b.x, Y, b.z, B.AIR_MAKER);
    P.set(b.x + 3, Y, b.z - 3, B.CRAFTING_TABLE); P.set(b.x + 4, Y, b.z - 2, B.FURNACE);
    setD(b.x + 4, Y, b.z + 1, B.CHEST, 1 | 8 | 64);   // (64: a Mars chest; filled when first opened)
    for (const [dx, dz] of [[0, 4], [0, -4], [4, 0]]) P.set(b.x + dx, T.y, b.z + dz, B.GLOWSTONE);
    for (const [ox, oz] of [[0, 0], [0, 1]]) P.line(MW.rocket[0] + 3, MW.rocket[1] + 3 + oz, b.x - R - 1, b.z + oz, T.y, T.y, B.MARS_ROCK);   // (a path from the rocket's pad)
  }
  /* the bounce-ball field: green, with white lines, a low wall round it and a goal at each end */
  function paintMarsField(P) {
    const f = MW.field, T = MW.town, Y = T.y + 1;
    if (!P.near(f.x - f.hx - 3, f.z - f.hz - 3, f.x + f.hx + 3, f.z + f.hz + 3)) return;
    for (let x = -f.hx - 2; x <= f.hx + 2; x++) for (let z = -f.hz - 1; z <= f.hz + 1; z++) {
      const ax = Math.abs(x), az = Math.abs(z), inside = ax <= f.hx && az <= f.hz, goal = ax > f.hx && az <= 2;
      P.box(f.x + x, T.y - 3, f.z + z, f.x + x, T.y - 1, f.z + z, B.MARS_ROCK);
      P.box(f.x + x, Y, f.z + z, f.x + x, Y + 9, f.z + z, B.AIR);
      const line = inside && (ax === f.hx || az === f.hz || x === 0 || (Math.abs(Math.hypot(x, z) - 3) < 0.5));
      P.set(f.x + x, T.y, f.z + z, inside || goal ? B.WOOL + (line ? 0 : 5) : B.QUARTZ_BLOCK);
      if (!inside && !goal && ax <= f.hx + 1) P.set(f.x + x, Y, f.z + z, B.QUARTZ_BLOCK);   // the low wall
      if (ax === f.hx + 2 && az <= 2) P.box(f.x + x, Y, f.z + z, f.x + x, Y + 2, f.z + z, B.IRON_BARS);   // the back of the goal
      if (ax > f.hx && az === 3) P.box(f.x + x, Y, f.z + z, f.x + x, Y + 2, f.z + z, B.WOOL + (x < 0 ? 14 : 11));   // its posts: red at one end, blue at the other
      if (ax > f.hx && az <= 3) P.set(f.x + x, Y + 3, f.z + z, B.WOOL + (x < 0 ? 14 : 11));   // and its top
    }
  }
  /* ancient ruins out in the wilderness: broken pillars round a stone floor, an arch, a statue of a Martian's head, and a chest of treasure */
  function paintRuin(P, setD, ru, column) {
    if (!P.near(ru.x - 9, ru.z - 9, ru.x + 9, ru.z + 9)) return;
    const h = column(ru.x, ru.z), Y = h + 1, r = mulberry32(hash3(0x7a15, ru.x, ru.z));
    for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) {
      const d = Math.hypot(x, z), k = r();
      if (d > 8.3) continue;
      P.box(ru.x + x, h - 5, ru.z + z, ru.x + x, h - 1, ru.z + z, B.MARS_ROCK);
      P.box(ru.x + x, Y, ru.z + z, ru.x + x, Y + 10, ru.z + z, B.AIR);
      P.set(ru.x + x, h, ru.z + z, d > 7.3 ? B.MARS_ROCK : k < 0.2 ? B.MOSSY_COBBLE : k < 0.45 ? B.COBBLE : k < 0.52 ? B.MARS_DUST : B.STONE_BRICKS);
    }
    for (let k = 0; k < 8; k++) {   // a ring of pillars, some of them broken off
      const a = (k / 8) * Math.PI * 2 + 0.39, px = ru.x + Math.round(Math.cos(a) * 6), pz = ru.z + Math.round(Math.sin(a) * 6), tall = 2 + ((r() * 4) | 0);
      P.box(px, Y, pz, px, Y + tall, pz, B.QUARTZ_BLOCK);
      if (tall >= 5) P.set(px, Y + tall + 1, pz, B.STONE_BRICKS);
    }
    P.box(ru.x - 2, Y, ru.z + 7, ru.x - 2, Y + 4, ru.z + 7, B.STONE_BRICKS); P.box(ru.x + 2, Y, ru.z + 7, ru.x + 2, Y + 4, ru.z + 7, B.STONE_BRICKS);   // the arch
    P.box(ru.x - 2, Y + 5, ru.z + 7, ru.x + 2, Y + 5, ru.z + 7, B.STONE_BRICKS);
    // the statue: a Martian's head on a pillar, with two dark eyes and two antennae
    P.box(ru.x, Y, ru.z - 4, ru.x, Y + 1, ru.z - 4, B.STONE_BRICKS);
    P.box(ru.x - 1, Y + 2, ru.z - 5, ru.x + 1, Y + 4, ru.z - 3, B.WOOL + 5);
    P.set(ru.x - 1, Y + 3, ru.z - 3, B.WOOL + 15); P.set(ru.x + 1, Y + 3, ru.z - 3, B.WOOL + 15);
    P.box(ru.x - 1, Y + 5, ru.z - 4, ru.x - 1, Y + 6, ru.z - 4, B.IRON_BARS); P.box(ru.x + 1, Y + 5, ru.z - 4, ru.x + 1, Y + 6, ru.z - 4, B.IRON_BARS);
    P.set(ru.x - 1, Y + 7, ru.z - 4, B.WOOL + 4); P.set(ru.x + 1, Y + 7, ru.z - 4, B.WOOL + 4);
    // the treasure, on a little dais with a lamp at each side
    P.box(ru.x - 1, Y, ru.z - 1, ru.x + 1, Y, ru.z + 1, B.QUARTZ_BLOCK);
    setD(ru.x, Y + 1, ru.z, B.CHEST, 0 | 8 | 64 | 16);   // (64 + 16: a Mars ruin's treasure)
    P.set(ru.x - 1, Y + 1, ru.z, B.GLOWSTONE); P.set(ru.x + 1, Y + 1, ru.z, B.GLOWSTONE);
  }
  /* Jupiter: nobody can stand on a gas giant, so: floating islands of cloud, one in each 44-block square, over nothing */
  function isleAt(seed, gx, gz) {
    const r = mulberry32(hash3(seed ^ 0x1f9, gx, gz));
    return { x: Math.floor((gx + 0.3 + r() * 0.4) * ISLE_CELL), z: Math.floor((gz + 0.3 + r() * 0.4) * ISLE_CELL), y: 60 + ((r() * 18) | 0), r: 7 + r() * 6, k: r() };
  }
  function jupiterGen(seed) {
    const nA = makeNoise(seed ^ 0x1f1);
    function generate(cx, cz) {
      const blocks = new Uint8Array(CVOL), x0 = cx * 16, z0 = cz * 16, r = mulberry32(hash3(seed ^ 0x1f2, cx, cz));
      const gx = Math.floor((x0 + 8) / ISLE_CELL), gz = Math.floor((z0 + 8) / ISLE_CELL);
      for (let dgz = -1; dgz <= 1; dgz++) for (let dgx = -1; dgx <= 1; dgx++) {
        const s = isleAt(seed, gx + dgx, gz + dgz);
        if (s.x + s.r + 2 < x0 || s.x - s.r - 2 > x0 + 15 || s.z + s.r + 2 < z0 || s.z - s.r - 2 > z0 + 15) continue;
        for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
          const x = x0 + lx, z = z0 + lz, d = Math.hypot(x - s.x, z - s.z) / (s.r * (0.85 + 0.15 * nA.n2(x * 0.15, z * 0.15)));
          if (d >= 1) continue;
          const top = s.y + Math.round((1 - d * d) * 2), bot = s.y - Math.round((1 - d) * s.r * 0.8) - 1;
          for (let y = Math.max(1, bot); y <= top; y++) blocks[idx(lx, y, lz)] = (y === top) ? B.CLOUD : ((y + Math.floor(s.k * 5)) % 4 === 0 ? B.WOOL + 1 : (y % 4 === 2 ? B.WOOL + 12 : B.CLOUD));   // stripes of orange and brown
        }
      }
      return { blocks, spawns: [] };
    }
    function spawn() { const s = isleAt(seed, 0, 0); return [s.x + 0.5, s.y + 3, s.z + 0.5]; }
    return { generate, spawn };
  }
  /* Uranus: icy blue-green ground, smooth and cold, with tall ice crystals growing out of it */
  function uranusGen(seed) {
    const nA = makeNoise(seed ^ 0x0a1), nB = makeNoise(seed ^ 0x0a2);
    function column(x, z) { return Math.round(clamp(52 + fbm2(nA, x * 0.008, z * 0.008, 3) * 8 + fbm2(nB, x * 0.06, z * 0.06, 1) * 1.2, 8, WH - 30)); }
    function generate(cx, cz) {
      const blocks = new Uint8Array(CVOL), x0 = cx * 16, z0 = cz * 16, r = mulberry32(hash3(seed ^ 0x0a3, cx, cz));
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const h = column(x0 + lx, z0 + lz);
        for (let y = 0; y <= h; y++) blocks[idx(lx, y, lz)] = y === 0 || (y < 3 && r() < 0.6) ? B.BEDROCK : y > h - 4 ? B.URANUS_ICE : B.ICE;
      }
      for (let k = 0; k < 3; k++) {   // ice crystals: tall pointed spikes
        if (r() > 0.45) continue;
        const lx = 2 + ((r() * 12) | 0), lz = 2 + ((r() * 12) | 0), h = column(x0 + lx, z0 + lz), tall = 4 + ((r() * 8) | 0), id = r() < 0.5 ? B.ICE : B.URANUS_ICE;
        for (let y = 1; y <= tall && h + y < WH; y++) {
          blocks[idx(lx, h + y, lz)] = id;
          if (y < tall * 0.45) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ax = lx + dx, az = lz + dz; if (ax >= 0 && ax < 16 && az >= 0 && az < 16) blocks[idx(ax, h + y, az)] = id; }
        }
      }
      return { blocks, spawns: [] };
    }
    function spawn() { return [0.5, column(0, 0) + 1, 0.5]; }
    return { generate, spawn, column };
  }
  /* where a rocket comes down: on Jupiter, the cloud island nearest to where it took off from home */
  function planetLanding(map, seed, x, z) {
    if (map !== 'jupiter') return [x, z];
    let best = null, bd = Infinity;
    const gx = Math.floor(x / ISLE_CELL), gz = Math.floor(z / ISLE_CELL);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const s = isleAt(seed, gx + dx, gz + dz), d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } }
    return [best.x, best.z];
  }
  function nearestRover(seed, x, z) {
    let best = null, bd = Infinity;
    const gx = Math.floor(x / ROVER_CELL), gz = Math.floor(z / ROVER_CELL);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const v = roverAt(seed, gx + dx, gz + dz), d = Math.hypot(v.x - x, v.z - z); if (d < bd) { bd = d; best = v; } }
    return best;
  }

  /* ========== Hogwarts: the castle above the Black Lake, the Quidditch pitch, Hagrid's hut by the Forbidden Forest,
     and Hogsmeade in the snow. The places are the same in every Hogwarts world; the hills and trees around them differ. ========== */
  const HW = {
    castle: { x0: -42, x1: 42, z0: -86, z1: -14, y: 72 },   // the plateau it stands on (the top block is at y)
    lake: { x: 0, z: 46, rx: 80, rz: 48, y: 60 },
    pitch: { x: 130, z: -46, hx: 42, hz: 24, y: 66 },
    hut: { x: -72, z: -14, y: 66 },
    village: { x: 14, z: -186, y: 70 },
    forest: -92,   // the Forbidden Forest: everything west of here
    spawn: [0.5, 73, -26.5],
    hat: [0, 73, -63],   // the Sorting Hat, in the Great Hall
    towers: [
      { x: 0, z: -80, r: 6, top: 112 }, { x: -32, z: -70, r: 5, top: 106 }, { x: 32, z: -70, r: 5, top: 104 },
      { x: 36, z: -22, r: 4, top: 114 }, { x: -36, z: -22, r: 4, top: 98 }, { x: -34, z: -46, r: 3, top: 92 }, { x: 34, z: -46, r: 3, top: 92 },
    ],
  };
  /* the six goal hoops of the Quidditch pitch: [x, y, z] of each ring's middle (radius 2.5, facing along x) */
  HW.hoops = [];
  for (const end of [-1, 1]) for (const [dz, up] of [[-6, 10], [0, 14], [6, 10]]) HW.hoops.push([HW.pitch.x + end * (HW.pitch.hx - 6), HW.pitch.y + 1 + up, HW.pitch.z + dz]);

  /* drawing shapes into one chunk's blocks (whatever falls outside the chunk is left out) */
  function painter(blocks, cx, cz) {
    const X0 = cx * 16, Z0 = cz * 16;
    const P = {
      near: (x1, z1, x2, z2) => x2 >= X0 && x1 <= X0 + 15 && z2 >= Z0 && z1 <= Z0 + 15,
      set(x, y, z, id) { const lx = x - X0, lz = z - Z0; if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= 1 && y < WH) blocks[idx(lx, y, lz)] = id; },
      get(x, y, z) { const lx = x - X0, lz = z - Z0; return lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= 0 && y < WH ? blocks[idx(lx, y, lz)] : -1; },
      box(x1, y1, z1, x2, y2, z2, id) {
        const a = Math.max(Math.min(x1, x2), X0), b = Math.min(Math.max(x1, x2), X0 + 15), c = Math.max(Math.min(z1, z2), Z0), d = Math.min(Math.max(z1, z2), Z0 + 15);
        for (let x = a; x <= b; x++) for (let z = c; z <= d; z++) for (let y = Math.max(1, y1); y <= Math.min(WH - 1, y2); y++) blocks[idx(x - X0, y, z - Z0)] = id;
      },
      walls(x1, y1, z1, x2, y2, z2, id) { P.box(x1, y1, z1, x2, y2, z1, id); P.box(x1, y1, z2, x2, y2, z2, id); P.box(x1, y1, z1, x1, y2, z2, id); P.box(x2, y1, z1, x2, y2, z2, id); },
      disc(ox, oz, r, y1, y2, id, ring) {
        if (!P.near(ox - r - 1, oz - r - 1, ox + r + 1, oz + r + 1)) return;
        for (let x = Math.floor(ox - r); x <= Math.ceil(ox + r); x++) for (let z = Math.floor(oz - r); z <= Math.ceil(oz + r); z++) {
          const d = Math.hypot(x - ox, z - oz);
          if (d > r + 0.3 || (ring && d < r - 0.9)) continue;
          for (let y = y1; y <= y2; y++) P.set(x, y, z, id);
        }
      },
      cone(ox, oz, r, y, h, id) { for (let k = 0; k < h; k++) P.disc(ox, oz, Math.max(0.4, r * (1 - k / h)), y + k, y + k, id, false); },
      line(ax, az, bx, bz, y1, y2, id) {   // a wall one block thick from a to b
        const n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(bz - az)));
        if (!P.near(Math.min(ax, bx) - 1, Math.min(az, bz) - 1, Math.max(ax, bx) + 1, Math.max(az, bz) + 1)) return;
        for (let i = 0; i <= n; i++) { const x = Math.round(ax + (bx - ax) * i / n), z = Math.round(az + (bz - az) * i / n); for (let y = y1; y <= y2; y++) P.set(x, y, z, id); if (i % 2 === 0) P.set(x, y2 + 1, z, id); }
      },
    };
    return P;
  }
  const WOOL = c => B.WOOL + c, RED = 14, GOLD = 4, GREEN = 13, SILVER = 8, BLUE = 11, BRONZE = 1, BLACK = 15, WHITE = 0;
  const HOUSE_COLORS = [[RED, GOLD], [GREEN, SILVER], [BLUE, BRONZE], [GOLD, BLACK]];

  function hogwartsGen(seed) {
    const nA = makeNoise(seed ^ 0x40a1), nB = makeNoise(seed ^ 0x40b2), nC = makeNoise(seed ^ 0x40c3);
    const C = HW.castle, L = HW.lake, Q = HW.pitch, U = HW.hut, V = HW.village, smooth = t => t * t * (3 - 2 * t);
    const lakeD = (x, z) => Math.hypot((x - L.x) / L.rx, (z - L.z) / L.rz);
    function column(x, z) {
      let h = 67 + fbm2(nA, x * 0.008, z * 0.008, 3) * 7 + fbm2(nB, x * 0.03, z * 0.03, 2) * 1.5;
      const far = Math.hypot(x - 20, z + 50);   // mountains all round, far off
      if (far > 240) h += Math.min(46, (far - 240) * 0.35) * (0.6 + 0.4 * fbm2(nC, x * 0.01, z * 0.01, 3));
      const flat = (d, rin, rout, to) => { if (d < rout) h += (to - h) * smooth(d <= rin ? 1 : 1 - (d - rin) / (rout - rin)); };
      flat(Math.hypot(Math.max(C.x0 - x, 0, x - C.x1), Math.max(C.z0 - z, 0, z - C.z1)), 0, 9, C.y);   // the castle's plateau
      flat(Math.max(0, Math.hypot((x - Q.x) / Q.hx, (z - Q.z) / Q.hz) - 1) * Q.hz, 6, 18, Q.y);   // the Quidditch pitch
      flat(Math.hypot(x - U.x, z - U.z), 9, 18, U.y);   // Hagrid's hut
      flat(Math.hypot((x - V.x) / 1.6, z - V.z), 24, 38, V.y);   // Hogsmeade
      const ld = lakeD(x, z);   // the Black Lake
      if (ld < 1) h = Math.min(h, L.y - 1 - (1 - ld * ld) * 14);
      else if (ld < 1.12) h = Math.min(h, L.y - 1 + (h - L.y + 1) * smooth((ld - 1) / 0.12));
      return Math.round(clamp(h, 8, WH - 16));
    }
    /* is (x, z) somewhere a tree mustn't grow (the castle, the pitch, the hut, the village, the lake)? */
    const clear = (x, z) => (x > C.x0 - 6 && x < C.x1 + 6 && z > C.z0 - 6 && z < C.z1 + 6) || Math.hypot((x - Q.x) / (Q.hx + 14), (z - Q.z) / (Q.hz + 14)) < 1 ||
      Math.hypot(x - U.x, z - U.z) < 12 || Math.hypot((x - V.x) / 1.6, z - V.z) < 36 || lakeD(x, z) < 1.15;
    const forest = x => clamp((HW.forest - x) / 14, 0, 1);

    function paintCastle(P) {
      if (!P.near(C.x0 - 8, C.z0 - 8, C.x1 + 8, C.z1 + 8)) return;
      const Y = C.y + 1, SB = B.STONE_BRICKS;
      P.box(-34, C.y, -36, 34, C.y, -19, B.GRAVEL);   // the courtyard
      // curtain walls from tower to tower, with battlements, and a gate on the south side
      const T = HW.towers, ring = [T[4], T[5], T[1], T[0], T[2], T[6], T[3]];
      for (let i = 0; i + 1 < ring.length; i++) P.line(ring[i].x, ring[i].z, ring[i + 1].x, ring[i + 1].z, C.y, Y + 11, SB);
      P.line(T[3].x, T[3].z, T[4].x, T[4].z, C.y, Y + 9, SB);
      P.box(-3, Y, -23, 3, Y + 6, -21, B.AIR);   // the gate
      // the Great Hall: stained glass windows, a ceiling you can see the sky through, the house tables, floating candles
      P.box(-7, Y, -69, 7, Y + 13, -37, B.AIR);
      P.walls(-8, C.y, -70, 8, Y + 13, -36, SB);
      P.box(-7, C.y, -69, 7, C.y, -37, SB);
      for (let z = -66; z <= -40; z += 4) { P.box(-8, Y + 3, z, -8, Y + 10, z + 1, B.STAINED_GLASS); P.box(8, Y + 3, z, 8, Y + 10, z + 1, B.STAINED_GLASS); }
      P.box(-2, Y, -36, 2, Y + 5, -36, B.AIR);   // the doors (wide open)
      for (let k = 0; k <= 8; k++) {   // the roof: slate low down, glass higher up, so you see the sky from inside (an enchanted ceiling!)
        const y = Y + 14 + k, id = k >= 3 ? B.GLASS : B.SLATE;
        if (k === 8) P.box(0, y, -70, 0, y, -36, B.SLATE);
        else { P.box(-8 + k, y, -70, -8 + k, y, -36, id); P.box(8 - k, y, -70, 8 - k, y, -36, id); }
      }
      for (let k = 1; k <= 8; k++) { P.box(-8 + k, Y + 13 + k, -70, 8 - k, Y + 13 + k, -70, SB); P.box(-8 + k, Y + 13 + k, -36, 8 - k, Y + 13 + k, -36, SB); }   // its gable ends
      HOUSE_COLORS.forEach(([c1, c2], i) => {   // the four long tables, and each house's banner above it
        const tx = -6 + i * 4;
        P.box(tx, Y, -62, tx, Y, -42, B.OAK_PLANKS);
        for (let z = -59; z <= -45; z += 7) P.set(tx, Y + 1, z, B.TORCH);
        P.box(tx, Y + 6, -70, tx, Y + 11, -70, WOOL(c1)); P.set(tx, Y + 8, -70, WOOL(c2)); P.set(tx, Y + 6, -70, WOOL(c2));
      });
      P.box(-7, C.y, -69, 7, Y, -66, SB);   // the staff table, up on its platform
      P.box(-5, Y + 1, -67, 5, Y + 1, -67, B.OAK_PLANKS);
      P.set(HW.hat[0], HW.hat[1], HW.hat[2], B.SORTING_HAT);
      for (let x = -6; x <= 6; x += 3) for (let z = -64; z <= -40; z += 4) P.set(x, Y + 5 + ((x + z) & 1), z, B.CANDLE);
      // two wings of classrooms
      for (const [a, b] of [[-28, -12], [12, 28]]) {
        P.box(a + 1, Y, -65, b - 1, Y + 9, -41, B.AIR);
        P.walls(a, C.y, -66, b, Y + 9, -40, SB);
        P.box(a + 1, C.y, -65, b - 1, C.y, -41, B.OAK_PLANKS); P.box(a + 1, Y + 5, -65, b - 1, Y + 5, -41, B.OAK_PLANKS);
        P.box(a, Y + 10, -66, b, Y + 10, -40, B.SLATE);
        for (let z = -63; z <= -43; z += 5) { P.box(a, Y + 2, z, a, Y + 3, z, B.GLASS); P.box(b, Y + 2, z, b, Y + 3, z, B.GLASS); P.box(a, Y + 7, z, a, Y + 8, z, B.GLASS); P.box(b, Y + 7, z, b, Y + 8, z, B.GLASS); }
        P.box(a < 0 ? b : a, Y, -45, a < 0 ? b : a, Y + 2, -44, B.AIR);   // a door onto the courtyard side
        for (let x = a + 2; x < b - 1; x += 3) P.set(x, Y + 4, -53, B.TORCH);
      }
      // the towers: round, with pointed slate roofs, windows, and a staircase winding up inside
      for (const t of HW.towers) {
        if (!P.near(t.x - t.r - 2, t.z - t.r - 2, t.x + t.r + 2, t.z + t.r + 2)) continue;
        P.disc(t.x, t.z, t.r - 1, Y, t.top, B.AIR, false);
        P.disc(t.x, t.z, t.r, C.y - 4, t.top, SB, true);
        P.disc(t.x, t.z, t.r - 1, C.y, C.y, B.OAK_PLANKS, false);
        P.disc(t.x, t.z, t.r, t.top + 1, t.top + 1, SB, false);
        P.cone(t.x, t.z, t.r + 1.5, t.top + 2, Math.min(WH - 1 - (t.top + 2), (t.r + 1) * 2), B.SLATE);
        for (let y = Y + 4; y < t.top - 1; y += 6) for (const [dx, dz] of [[t.r, 0], [-t.r, 0], [0, t.r], [0, -t.r]]) P.box(t.x + dx, y, t.z + dz, t.x + dx, y + 1, t.z + dz, B.GLASS);
        const dirx = Math.sign(-t.x) || 1;   // a door toward the middle
        P.box(t.x + dirx * t.r, Y, t.z, t.x + dirx * t.r, Y + 2, t.z, B.AIR);
        if (t.r >= 4) for (let y = Y; y < t.top; y++) {   // the stairs: one step up each block of the way round
          const a = (y - Y) * (Math.PI * 2 / (t.r * 4)), rr = t.r - 1.6;
          P.set(Math.round(t.x + Math.cos(a) * rr), y, Math.round(t.z + Math.sin(a) * rr), SB);
        }
        P.disc(t.x, t.z, t.r - 1, t.top - 1, t.top - 1, B.OAK_PLANKS, false);   // a floor to stand on at the top
        P.set(t.x, t.top, t.z, B.TORCH);
      }
    }
    function paintPitch(P) {
      if (!P.near(Q.x - Q.hx - 12, Q.z - Q.hz - 12, Q.x + Q.hx + 12, Q.z + Q.hz + 12)) return;
      const Y = Q.y + 1;
      P.box(Q.x, Q.y, Q.z - Q.hz + 3, Q.x, Q.y, Q.z + Q.hz - 3, WOOL(WHITE));   // the middle line, and the circle
      for (let a = 0; a < 64; a++) P.set(Math.round(Q.x + Math.cos(a / 64 * Math.PI * 2) * 5), Q.y, Math.round(Q.z + Math.sin(a / 64 * Math.PI * 2) * 5), WOOL(WHITE));
      for (const [hx, hy, hz] of HW.hoops) {   // a golden hoop on a pole
        P.box(hx, Y, hz, hx, hy - 3, hz, B.OAK_LOG);
        for (let a = 0; a < 40; a++) P.set(hx, Math.round(hy + Math.cos(a / 40 * Math.PI * 2) * 2.5), Math.round(hz + Math.sin(a / 40 * Math.PI * 2) * 2.5), B.GOLD_BLOCK);
      }
      for (let i = 0; i < 16; i++) {   // the stands: wooden towers all round, hung with the houses' colours
        const a = i / 16 * Math.PI * 2, sx = Math.round(Q.x + Math.cos(a) * (Q.hx + 7)), sz = Math.round(Q.z + Math.sin(a) * (Q.hz + 7)), [c1, c2] = HOUSE_COLORS[i % 4];
        P.box(sx - 1, Q.y - 3, sz - 1, sx + 1, Y + 8, sz + 1, B.SPRUCE_PLANKS);
        P.box(sx - 1, Y + 9, sz - 1, sx + 1, Y + 11, sz + 1, WOOL(c1)); P.box(sx - 1, Y + 10, sz - 1, sx + 1, Y + 10, sz + 1, WOOL(c2));
        P.box(sx - 2, Y + 12, sz - 2, sx + 2, Y + 12, sz + 2, B.SPRUCE_PLANKS);
        P.walls(sx - 2, Y + 13, sz - 2, sx + 2, Y + 13, sz + 2, WOOL(c1));
      }
    }
    function paintHut(P) {
      if (!P.near(U.x - 10, U.z - 10, U.x + 14, U.z + 10)) return;
      const Y = U.y + 1;
      P.disc(U.x, U.z, 3.5, Y, Y + 4, B.AIR, false);
      P.disc(U.x, U.z, 3.5, U.y, U.y, B.OAK_PLANKS, false);
      P.disc(U.x, U.z, 3.5, Y, Y + 3, B.COBBLE, true);
      P.box(U.x + 3, Y, U.z, U.x + 4, Y + 1, U.z, B.AIR);   // the door
      P.set(U.x - 3, Y + 1, U.z, B.GLASS); P.set(U.x, Y + 1, U.z + 3, B.GLASS);
      P.cone(U.x, U.z, 4.6, Y + 4, 4, B.SPRUCE_PLANKS);
      P.box(U.x - 2, Y + 4, U.z - 2, U.x - 2, Y + 7, U.z - 2, B.COBBLE);   // the chimney
      P.set(U.x - 2, Y + 3, U.z + 1, B.TORCH);
      for (let i = 0; i < 8; i++) { const px = U.x + 7 + (i % 4) * 2, pz = U.z - 3 + Math.floor(i / 4) * 3; P.box(px, U.y, pz, px, U.y, pz, B.GRASS); P.set(px, Y, pz, B.PUMPKIN); }   // the pumpkin patch
    }
    function paintVillage(P) {
      if (!P.near(V.x - 40, V.z - 20, V.x + 40, V.z + 20)) return;
      const Y = V.y + 1;
      P.box(V.x - 34, V.y, V.z - 2, V.x + 34, V.y, V.z + 2, B.GRAVEL);   // the high street
      for (let i = 0; i < 5; i++) for (const side of [-1, 1]) {
        const hx = V.x - 28 + i * 14, hz = V.z + side * 9, wood = (i + (side > 0 ? 1 : 0)) % 2;
        P.box(hx - 3, Y, hz - 3, hx + 3, Y + 4, hz + 3, B.AIR);
        P.walls(hx - 3, V.y, hz - 3, hx + 3, Y + 3, hz + 3, wood ? B.SPRUCE_PLANKS : B.COBBLE);
        P.box(hx - 2, V.y, hz - 2, hx + 2, V.y, hz + 2, B.OAK_PLANKS);
        P.box(hx - 1, Y + 1, hz - side * 3, hx + 1, Y + 2, hz - side * 3, B.GLASS);
        P.box(hx + 2, Y, hz - side * 3, hx + 2, Y + 1, hz - side * 3, B.AIR);   // the door, onto the street
        for (let k = 0; k <= 3; k++) { P.box(hx - 4, Y + 4 + k, hz - 3 + k, hx + 4, Y + 4 + k, hz + 3 - k, B.SPRUCE_PLANKS); P.box(hx - 4, Y + 5 + k, hz - 3 + k, hx + 4, Y + 5 + k, hz - 3 + k, B.SNOW); P.box(hx - 4, Y + 5 + k, hz + 3 - k, hx + 4, Y + 5 + k, hz + 3 - k, B.SNOW); }
        P.set(hx, Y + 2, hz, B.TORCH);
      }
      for (let x = V.x - 30; x <= V.x + 30; x += 10) { P.box(x, Y, V.z + 3, x, Y + 2, V.z + 3, B.SPRUCE_LOG); P.set(x, Y + 3, V.z + 3, B.TORCH); }   // lamp posts
    }

    function generate(cx, cz) {
      const blocks = new Uint8Array(CVOL), x0 = cx * 16, z0 = cz * 16, cols = new Int32Array(256), r = mulberry32(hash3(seed ^ 0x40a, cx, cz));
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const x = x0 + lx, z = z0 + lz, h = column(x, z), snowy = Math.hypot((x - V.x) / 1.6, z - V.z) < 34, shore = h <= L.y && lakeD(x, z) < 1.2;
        cols[lz * 16 + lx] = h;
        for (let y = 0; y <= Math.max(h, L.y - 1); y++) {
          let b;
          if (y === 0 || (y < 3 && r() < 0.6)) b = B.BEDROCK;
          else if (y < h - 3) b = B.STONE;
          else if (y < h) b = shore ? B.SAND : B.DIRT;
          else if (y === h) b = h < L.y - 3 ? B.GRAVEL : shore ? B.SAND : snowy ? B.SNOWY_GRASS : B.GRASS;
          else b = B.WATER;
          blocks[idx(lx, y, lz)] = b;
        }
      }
      oreVeins(blocks, r, B.STONE, [[B.COAL_ORE, 16, 5, 100, 9], [B.IRON_ORE, 10, 5, 64, 7], [B.GOLD_ORE, 3, 5, 32, 6], [B.DIAMOND_ORE, 2, 5, 16, 5], [B.EMERALD_ORE, 2, 5, 40, 1]]);
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) { const x = x0 + lx, z = z0 + lz; if (!clear(x, z)) decorate(blocks, r, lx, lz, cols[lz * 16 + lx], forest(x) > 0.5 ? FOREST : PLAINS); }
      for (let ncz = cz - 1; ncz <= cz + 1; ncz++) for (let ncx = cx - 1; ncx <= cx + 1; ncx++) {   // trees (from the chunks round about too, so they cross borders)
        const tr = mulberry32(hash3(seed ^ 0x7ee, ncx, ncz));
        for (let k = 0; k < 14; k++) {
          const tx = ncx * 16 + ((tr() * 16) | 0), tz = ncz * 16 + ((tr() * 16) | 0), roll = tr(), kr = tr(), hr = tr();
          const f = forest(tx), dens = (f * 0.75 + (1 - f) * 0.02) * (k < 8 ? 1 : f);
          if (roll >= dens || clear(tx, tz)) continue;
          const own = ncx === cx && ncz === cz, th = own ? cols[(tz - z0) * 16 + (tx - x0)] : column(tx, tz);
          if (th <= L.y || th > WH - 20) continue;
          if (own && blocks[idx(tx - x0, th, tz - z0)] !== B.GRASS) continue;
          placeTree(blocks, cx, cz, tx, th + 1, tz, f > 0.5 ? (kr < 0.6 ? 2 : 0) : kr < 0.2 ? 1 : 0, f > 0.5 ? Math.min(1, hr + 0.4) : hr);
        }
      }
      const P = painter(blocks, cx, cz);
      paintCastle(P); paintPitch(P); paintHut(P); paintVillage(P);
      const spawns = [], inside = (x, z) => x >= x0 && x < x0 + 16 && z >= z0 && z < z0 + 16;
      if (inside(V.x, V.z)) spawns.push(['villager', V.x + 0.5, V.y + 1, V.z + 0.5, 6, 'hogsmeade', 'farmer,librarian,cleric,butcher,shepherd,toolsmith']);
      if (inside(U.x + 6, U.z + 6)) spawns.push(['pig', U.x + 6.5, U.y + 1, U.z + 6.5, 2]);
      return { blocks, spawns };
    }
    function spawn() { return HW.spawn.slice(); }
    return { generate, spawn };
  }

  /* ========== Dungeons, deep under Sunny Valley ==========
     A little old stone tower on the surface, with a staircase winding down inside it, leads to one of four kinds of
     dungeon: a Monster Room (a monster spawner and two chests), a Maze (with treasure in the middle), a Treasure Vault
     (behind iron bars, guarded) or a Lava Temple (treasure on an island in a moat of lava). Each 80-block square of the
     world has one or none, worked out from the seed alone, so every iPad builds the same ones. */
  const DCELL = 80;
  const DSIZE = { monster: [10, 5, 4], maze: [18, 9, 3], vault: [10, 5, 4], temple: [14, 7, 6] };   // [length from the door to the back wall, half the width, height inside]
  const DNAME = { monster: 'Monster Room', maze: 'Maze', vault: 'Treasure Vault', temple: 'Lava Temple' };
  const DIRS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const RING = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];   // the steps go round the post in the middle
  const MOB_ZOMBIE = 0, MOB_MAGMA = 1;   // (what a spawner makes: its data)
  /* G: the world's own pieces: column(x, z) (height | biome << 8), SEA, OCEAN, FROZEN, villagesNear(x, z), spawn() */
  function dungeonPlanner(seed, G) {
    const cache = new Map();
    let home = null;
    function at(gx, gz) {
      const key = gx + ',' + gz;
      if (cache.has(key)) return cache.get(key);
      const d = plan(gx, gz);
      cache.set(key, d);
      if (cache.size > 400) cache.delete(cache.keys().next().value);
      return d;
    }
    const hAt = (x, z) => G.column(x, z) & 255;
    function plan(gx, gz) {
      const r = mulberry32(hash3(seed + 2027, gx, gz));
      if (r() > 0.6) return null;
      const roll = r(), kind = roll < 0.4 ? 'monster' : roll < 0.65 ? 'maze' : roll < 0.85 ? 'temple' : 'vault';
      const [U, V, h] = DSIZE[kind];
      const x = gx * DCELL + 20 + Math.floor(r() * (DCELL - 40)), z = gz * DCELL + 20 + Math.floor(r() * (DCELL - 40)), d0 = (r() * 4) | 0;
      if (!home) { const sp = G.spawn(); home = [sp[0], sp[2]]; }
      if (Math.hypot(x - home[0], z - home[1]) < 48) return null;   // (not right where a new world starts)
      for (let t = 0; t < 4; t++) {
        const D = DIRS4[(d0 + t) & 3], W = [-D[1], D[0]];
        const E = [x - D[0] * (U >> 1), z - D[1] * (U >> 1)];   // the middle of the room's wall on the stairs side (the room's door)
        const S = [E[0] - D[0] * 5, E[1] - D[1] * 5];   // the middle of the stairs
        const gcv = G.column(S[0], S[1]), g = gcv & 255, gb = gcv >> 8;
        if (g <= G.SEA + 1 || g > 96 || gb === G.OCEAN || gb === G.FROZEN) continue;   // (the tower stands on dry land, not up a mountain)
        let flat = true;
        for (const [a, b] of [[3, 0], [-3, 0], [0, 3], [0, -3], [3, 3], [-3, -3], [3, -3], [-3, 3]]) if (Math.abs(hAt(S[0] + a, S[1] + b) - g) > 2) { flat = false; break; }
        if (!flat) continue;
        let low = g;
        for (let u = 0; u <= U + 2; u += 3) for (let v = -V; v <= V + 2; v += 3) low = Math.min(low, hAt(E[0] + D[0] * Math.min(u, U) + W[0] * Math.min(v, V), E[1] + D[1] * Math.min(u, U) + W[1] * Math.min(v, V)));
        const y = Math.min(low - h - 7, g - 12);   // (deep enough to have plenty of rock over it)
        if (y < 12) continue;
        const xs = [S[0] - 4, S[0] + 4, E[0] + W[0] * V, E[0] - W[0] * V, E[0] + D[0] * U + W[0] * V, E[0] + D[0] * U - W[0] * V];   // (the tower's path and the trees cleared round it reach 4 out)
        const zs = [S[1] - 4, S[1] + 4, E[1] + W[1] * V, E[1] - W[1] * V, E[1] + D[1] * U + W[1] * V, E[1] + D[1] * U - W[1] * V];
        const bbox = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
        for (const vg of G.villagesNear(x, z)) { const b = vg.bbox; if (b[2] >= bbox[0] - 4 && b[0] <= bbox[2] + 4 && b[3] >= bbox[1] - 4 && b[1] <= bbox[3] + 4) return null; }
        const K = g - y + 1, eIdx = RING.findIndex(q => q[0] === D[0] && q[1] === D[1]);
        return { id: 'd' + gx + ',' + gz, kind, name: DNAME[kind], x, z, y, h, U, V, D, W, E, S, g, K, o: (((eIdx - K) % 8) + 8) % 8, bbox, rs: hash3(seed + 2029, gx, gz) };
      }
      return null;
    }
    /* the dungeons whose squares are around this spot */
    function near(x, z) {
      const gx = Math.floor(x / DCELL), gz = Math.floor(z / DCELL), out = [];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const d = at(gx + dx, gz + dz); if (d) out.push(d); }
      return out;
    }
    function nearest(x, z, blocked) {
      const gx = Math.floor(x / DCELL), gz = Math.floor(z / DCELL);
      let best = null, bd = Infinity;
      for (let r = 0; r <= 8; r++) {
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const d = at(gx + dx, gz + dz);
          if (!d || (blocked && blocked.has(d.id))) continue;
          const dist = Math.hypot(d.S[0] - x, d.S[1] - z);
          if (dist < bd) { bd = dist; best = d; }
        }
        if (best && bd < (r - 0.5) * DCELL) break;
      }
      return best;
    }

    /* ---- building one (the part of it in this chunk) ---- */
    function build(blocks, data, cx, cz, d) {
      const P = painter(blocks, cx, cz), X0 = cx * 16, Z0 = cz * 16;
      const setD = (x, y, z, id, dv) => { const lx = x - X0, lz = z - Z0; if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= 1 && y < WH) { blocks[idx(lx, y, lz)] = id; data[idx(lx, y, lz)] = dv; } };
      const pick = (x, y, z, k) => hash3(d.rs + k, x, y * 7919 + z) / 4294967296;   // (the same in every chunk, whichever is built first)
      const OLD = (x, y, z) => P.set(x, y, z, pick(x, y, z, 1) < 0.2 ? B.MOSSY_COBBLE : pick(x, y, z, 2) < 0.25 ? B.CRACKED_BRICKS : B.STONE_BRICKS);
      const { y, h, U, V, D, W, E, S, g } = d;
      const at2 = (u, v) => [E[0] + D[0] * u + W[0] * v, E[1] + D[1] * u + W[1] * v];   // a spot in the room: u in from the door, v across
      const face = (fu, fv) => { const fx = D[0] * fu + W[0] * fv, fz = D[1] * fu + W[1] * fv; return fz > 0 ? 0 : fx < 0 ? 1 : fz < 0 ? 2 : 3; };   // (a chest's data: which way its front faces)
      const chest = (u, v, fu, fv, tier) => { const [x, z] = at2(u, v); setD(x, y, z, B.CHEST, face(fu, fv) | 8 | (tier << 4)); };   // (filled when first opened)
      const torch = (u, v, yy) => { const [x, z] = at2(u, v); setD(x, yy === undefined ? y : yy, z, B.TORCH, 0); };
      // the tower and its staircase
      if (P.near(S[0] - 4, S[1] - 4, S[0] + 4, S[1] + 4)) {
        for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) for (let yy = g + 1; yy <= g + 16; yy++) {   // (no tree over it)
          const id = P.get(S[0] + a, yy, S[1] + b);
          if (id === B.OAK_LEAVES || id === B.BIRCH_LEAVES || id === B.SPRUCE_LEAVES || id === B.OAK_LOG || id === B.BIRCH_LOG || id === B.SPRUCE_LOG) P.set(S[0] + a, yy, S[1] + b, B.AIR);
        }
        for (let yy = y - 1; yy <= g + 4; yy++) for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
          const x = S[0] + a, z = S[1] + b;
          if (yy === y - 1 || yy === g + 4 || Math.abs(a) === 2 || Math.abs(b) === 2) OLD(x, yy, z);   // the floor at the bottom, the walls, the roof
          else P.set(x, yy, z, a === 0 && b === 0 ? B.STONE_BRICKS : B.AIR);   // the post up the middle
        }
        for (let k = 0; k < d.K; k++) { const [a, b] = RING[(d.o + k) % 8]; OLD(S[0] + a, g - k, S[1] + b); }   // the steps, round and round
        for (let k = 5; k < d.K - 2; k += 8) { const [a, b] = RING[(d.o + k) % 8]; setD(S[0] + a, g - k + 1, S[1] + b, B.TORCH, 0); }   // (a torch on a step now and then)
        const [ra, rb] = RING[d.o], dr = rb ? [ra, 2 * rb] : [2 * ra, 0], n = rb ? [0, rb] : [ra, 0];
        OLD(S[0] + dr[0], g, S[1] + dr[1]); P.set(S[0] + dr[0], g + 1, S[1] + dr[1], B.AIR); P.set(S[0] + dr[0], g + 2, S[1] + dr[1], B.AIR);   // the door
        for (let t = 1; t <= 2; t++) {   // (a path outside it, with nothing in the way)
          const px = S[0] + dr[0] + n[0] * t, pz = S[1] + dr[1] + n[1] * t;
          OLD(px, g, pz);
          for (let yy = g + 1; yy <= g + 3; yy++) P.set(px, yy, pz, B.AIR);
        }
        for (const [a, b] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (a !== dr[0] || b !== dr[1]) P.set(S[0] + a, g + 2, S[1] + b, B.IRON_BARS);   // little windows
        for (const [a, b] of [[2, 2], [-2, 2], [2, -2], [-2, -2]]) OLD(S[0] + a, g + 5, S[1] + b);   // the top of the tower
        setD(S[0], g + 5, S[1], B.TORCH, 0);
        for (let yy = y; yy <= y + 2; yy++) P.set(S[0] + 2 * D[0], yy, S[1] + 2 * D[1], B.AIR);   // the way out at the bottom
      }
      // the passage from the stairs to the room
      for (let k = 1; k <= 2; k++) {
        const x = E[0] - D[0] * k, z = E[1] - D[1] * k;
        if (!P.near(x - 1, z - 1, x + 1, z + 1)) continue;
        for (let yy = y - 1; yy <= y + 3; yy++) { if (yy === y - 1 || yy === y + 3) OLD(x, yy, z); else P.set(x, yy, z, B.AIR); OLD(x + W[0], yy, z + W[1]); OLD(x - W[0], yy, z - W[1]); }
      }
      // the room
      const c0 = at2(0, -V), c1 = at2(U, V);
      if (!P.near(Math.min(c0[0], c1[0]), Math.min(c0[1], c1[1]), Math.max(c0[0], c1[0]), Math.max(c0[1], c1[1]))) return;
      const r = mulberry32(d.rs);
      const shell = (wall, floor, ceil) => {
        for (let u = 0; u <= U; u++) for (let v = -V; v <= V; v++) {
          const [x, z] = at2(u, v), edge = u === 0 || u === U || v === -V || v === V;
          for (let yy = y - 1; yy <= y + h; yy++) {
            if (yy === y - 1) floor(x, yy, z, u, v);
            else if (yy === y + h) ceil(x, yy, z, u, v);
            else if (edge) wall(x, yy, z, u, v);
            else P.set(x, yy, z, B.AIR);
          }
        }
        const [x, z] = at2(0, 0);
        for (let yy = y; yy <= y + 2; yy++) P.set(x, yy, z, B.AIR);   // the doorway
      };
      const cobble = (x, yy, z) => P.set(x, yy, z, pick(x, yy, z, 3) < 0.4 ? B.MOSSY_COBBLE : B.COBBLE);
      if (d.kind === 'monster') {
        // a dark, mossy room: a monster spawner in the middle, two chests by the walls and a couple of torches
        shell(cobble, cobble, cobble);
        const [sx, sz] = at2(5, 0); setD(sx, y, sz, B.SPAWNER, MOB_ZOMBIE);
        const spots = [[9, -3, -1, 0], [9, 3, -1, 0], [9, 0, -1, 0], [5, -4, 0, 1], [5, 4, 0, -1], [3, -4, 0, 1], [3, 4, 0, -1]];
        const a = (r() * spots.length) | 0, b = (a + 1 + ((r() * (spots.length - 1)) | 0)) % spots.length;
        for (const s of [spots[a], spots[b]]) chest(s[0], s[1], s[2], s[3], 1);
        torch(1, -4); torch(1, 4); torch(9, -4); torch(9, 4);
      } else if (d.kind === 'maze') {
        // a maze of stone corridors (9 by 9), with a little room of treasure in the middle and a spawner in a dead end
        shell(OLD, (x, yy, z) => P.set(x, yy, z, B.STONE_BRICKS), OLD);
        for (let u = 1; u < U; u++) for (let v = -V + 1; v < V; v++) { const [x, z] = at2(u, v); for (let yy = y; yy < y + h; yy++) OLD(x, yy, z); }
        const N = 9, seen = new Uint8Array(N * N), depth = new Int16Array(N * N), open = (i, j) => { const [x, z] = at2(i, j); for (let yy = y; yy < y + h; yy++) P.set(x, yy, z, B.AIR); };
        const cu = i => 1 + 2 * i, cv = j => -8 + 2 * j, links = new Uint8Array(N * N);
        const stack = [[0, 4]];
        seen[4] = 1; open(cu(0), cv(4));
        while (stack.length) {   // (a winding path through every cell)
          const [i, j] = stack[stack.length - 1], next = [];
          for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + a, nj = j + b; if (ni >= 0 && ni < N && nj >= 0 && nj < N && !seen[ni * N + nj]) next.push([ni, nj]); }
          if (!next.length) { stack.pop(); continue; }
          const [ni, nj] = next[(r() * next.length) | 0];
          seen[ni * N + nj] = 1; depth[ni * N + nj] = depth[i * N + j] + 1; links[i * N + j]++; links[ni * N + nj]++;
          open(cu(ni), cv(nj)); open((cu(i) + cu(ni)) >> 1, (cv(j) + cv(nj)) >> 1);
          stack.push([ni, nj]);
        }
        for (let k = 0; k < 10; k++) {   // a few more gaps, so there's more than one way round
          const i = (r() * N) | 0, j = (r() * (N - 1)) | 0;
          if (r() < 0.5) { if (i < N - 1) open(cu(i) + 1, cv(j)); } else open(cu(i), cv(j) + 1);
        }
        for (let u = 7; u <= 11; u++) for (let v = -2; v <= 2; v++) open(u, v);   // the treasure room in the middle
        chest(9, 0, -1, 0, 2);
        { const [x, z] = at2(9, 0); P.set(x, y + h, z, B.GLOWSTONE); }
        let far = -1, fd = 0;
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (links[i * N + j] === 1 && depth[i * N + j] > fd && !(i >= 3 && i <= 5 && j >= 3 && j <= 5)) { fd = depth[i * N + j]; far = i * N + j; }
        if (far >= 0) { const [x, z] = at2(cu((far / N) | 0), cv(far % N)); setD(x, y, z, B.SPAWNER, MOB_ZOMBIE); }
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if ((i * 3 + j * 2) % 5 === 0 && i * N + j !== far) { const [x, z] = at2(cu(i), cv(j)); P.set(x, y + h, z, B.GLOWSTONE); }   // (lights in the ceiling, here and there)
      } else if (d.kind === 'vault') {
        // a hall with a spawner on guard, iron bars with a gap, and the vault: chests of treasure on a white floor under glowing lights
        shell((x, yy, z, u) => P.set(x, yy, z, u === U && yy === y + h - 1 ? B.GOLD_BLOCK : B.STONE_BRICKS),
          (x, yy, z, u) => P.set(x, yy, z, u >= 6 && u < U ? B.QUARTZ_BLOCK : B.STONE_BRICKS),
          (x, yy, z, u, v) => P.set(x, yy, z, u >= 6 && u < U && (v === -3 || v === 3) && (u === 6 || u === 9) ? B.GLOWSTONE : B.STONE_BRICKS));
        for (let v = -V + 1; v < V; v++) { const [x, z] = at2(5, v); for (let yy = y; yy < y + h; yy++) P.set(x, yy, z, v === 0 && yy < y + 2 ? B.AIR : B.IRON_BARS); }
        { const [x, z] = at2(3, r() < 0.5 ? -3 : 3); setD(x, y, z, B.SPAWNER, MOB_ZOMBIE); }
        torch(1, -4); torch(1, 4);
        chest(9, -3, -1, 0, 3); chest(9, 0, -1, 0, 3); chest(9, 3, -1, 0, 3);
      } else {
        // a temple of nether brick, with a moat of lava round an island: treasure on a golden stand, and a spawner of magma cubes
        const mid = 7, ring = (u, v) => Math.max(Math.abs(u - mid), Math.abs(v));
        shell((x, yy, z) => P.set(x, yy, z, B.NETHER_BRICKS), (x, yy, z, u, v) => {
          const k = ring(u, v);
          if ((k === 3 || k === 4) && !(u < mid && Math.abs(v) <= 1)) { P.set(x, yy, z, B.LAVA); P.set(x, yy - 1, z, B.NETHER_BRICKS); }   // (the bridge goes over it)
          else P.set(x, yy, z, B.NETHER_BRICKS);
        }, (x, yy, z, u, v) => P.set(x, yy, z, (u === 2 || u === U - 2) && (v === -5 || v === 5) ? B.GLOWSTONE : B.NETHER_BRICKS));
        for (const [u, v] of [[1, -6], [1, 6], [U - 1, -6], [U - 1, 6]]) { const [x, z] = at2(u, v); for (let yy = y; yy < y + h; yy++) P.set(x, yy, z, B.OBSIDIAN); }
        { const [x, z] = at2(mid, 0); P.set(x, y, z, B.GOLD_BLOCK); setD(x, y + 1, z, B.CHEST, face(-1, 0) | 8 | (2 << 4)); }
        { const [x, z] = at2(mid + 2, r() < 0.5 ? -2 : 2); setD(x, y, z, B.SPAWNER, MOB_MAGMA); }
        chest(mid + 2, 0, -1, 0, 1);
      }
    }
    return { at, near, nearest, build };
  }

  /* ========== Declan Falls: a little town among tall pines by a lake. The Mystery Shack (a wooden gift shop with its
     name on the roof), a water tower, a diner and a few houses; and out in the forest, six mysteries to find. ========== */
  const FF = {
    town: { x: 0, z: -8, r: 54, y: 66 },
    lake: { x: 0, z: 76, rx: 46, rz: 28, y: 62 },
    shack: { x0: -10, x1: 10, z0: -40, z1: -26 },
    tower: { x: 28, z: -22 },
    diner: { x0: 4, x1: 24, z0: 16, z1: 24 },
    houses: [[-32, 20], [-17, 20], [36, 20]],
    store: { x0: 14, x1: 28, z0: -4, z1: 8, bbox: [10, -5, 32, 10] },   // the Declan-craft Store (the sixth wish list), on the main street
    spawn: [0.5, 67, 3.5],
    // the six mysteries: where each is (y: only that high, for one underground), and how close you must come
    myst: [
      { x: 4, y: 60, z: -50, r: 4.5 },    // the secret lab under the Shack (through a hidden door at its back)
      { x: -74, z: -40, r: 3.5 },         // a strange glowing rock
      { x: 40, z: -86, r: 7 },            // a secret code on a stone wall
      { x: -30, z: -92, r: 2.2 },         // a lost Journal page in a hollow tree
      { x: 72, z: -6, r: 7 },             // the gnomes' hideout
      { x: -70, z: 34, r: 8 },            // a crashed flying saucer
    ],
  };
  const FONT = ['###|#.#|###|#.#|#.#', '##.|#.#|##.|#.#|##.', '###|#..|#..|#..|###', '##.|#.#|#.#|#.#|##.', '###|#..|##.|#..|###', '###|#..|##.|#..|#..',
    '###|#..|#.#|#.#|###', '#.#|#.#|###|#.#|#.#', '###|.#.|.#.|.#.|###', '..#|..#|..#|#.#|###', '#.#|#.#|##.|#.#|#.#', '#..|#..|#..|#..|###', '#.#|###|###|#.#|#.#',
    '###|#.#|#.#|#.#|#.#', '###|#.#|#.#|#.#|###', '###|#.#|###|#..|#..', '###|#.#|#.#|###|..#', '###|#.#|##.|#.#|#.#', '###|#..|###|..#|###', '###|.#.|.#.|.#.|.#.',
    '#.#|#.#|#.#|#.#|###', '#.#|#.#|#.#|#.#|.#.', '#.#|#.#|###|###|#.#', '#.#|#.#|.#.|#.#|#.#', '#.#|#.#|.#.|.#.|.#.', '###|..#|.#.|#..|###'].map(t => t.split('|'));
  /* letters three blocks wide and five high, read from the south (x to the right), with their top row at y */
  function writeText(P, text, x, y, z, id) {
    for (const ch of text) {
      const g = FONT[ch.charCodeAt(0) - 65];
      if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '#') P.set(x + c, y - r, z, id);
      x += 4;
    }
  }
  function fallsGen(seed) {
    const nA = makeNoise(seed ^ 0xfa11a), nB = makeNoise(seed ^ 0xfa11b), nC = makeNoise(seed ^ 0xfa11c), smooth = t => t * t * (3 - 2 * t);
    const T = FF.town, L = FF.lake, S = FF.shack, Y = T.y + 1;
    const lakeD = (x, z) => Math.hypot((x - L.x) / L.rx, (z - L.z) / L.rz);
    const raw = (x, z) => {
      let h = 67 + fbm2(nA, x * 0.01, z * 0.01, 3) * 9 + fbm2(nB, x * 0.04, z * 0.04, 2) * 1.5;
      const far = Math.hypot(x, z);   // mountains far off all round
      if (far > 220) h += Math.min(50, (far - 220) * 0.4) * (0.6 + 0.4 * fbm2(nC, x * 0.01, z * 0.01, 3));
      return h;
    };
    const mystY = FF.myst.map(m => Math.round(raw(m.x, m.z)));
    function column(x, z) {
      let h = raw(x, z);
      const flat = (d, rin, rout, to) => { if (d < rout) h += (to - h) * smooth(d <= rin ? 1 : 1 - (d - rin) / (rout - rin)); };
      flat(Math.hypot(x - T.x, z - T.z), T.r - 6, T.r + 16, T.y);   // the town
      FF.myst.forEach((m, i) => { if (i) flat(Math.hypot(x - m.x, z - m.z), m.r + 4, m.r + 12, mystY[i]); });   // (a level patch round each mystery in the forest)
      const ld = lakeD(x, z);
      if (ld < 1) h = Math.min(h, L.y - 1 - (1 - ld * ld) * 12);
      else if (ld < 1.15) h = Math.min(h, L.y - 1 + (h - L.y + 1) * smooth((ld - 1) / 0.15));
      return Math.round(clamp(h, 8, WH - 16));
    }
    const clear = (x, z) => Math.hypot(x - T.x, z - T.z) < T.r + 2 || lakeD(x, z) < 1.18 || FF.myst.some((m, i) => i && Math.hypot(x - m.x, z - m.z) < m.r + 5);
    /* a tall pine: a long bare trunk, and layers of branches getting smaller to a point */
    function tallPine(P, x, y, z, hgt) {
      const top = y + hgt, low = y + Math.floor(hgt * 0.3);
      for (let yy = top + 1; yy >= low; yy--) {
        const t = (top + 1 - yy) / (top + 1 - low), rad = (0.6 + t * 2.6) * ((top - yy) % 3 === 2 ? 0.65 : 1);
        for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dz) <= rad + 0.2 && P.get(x + dx, yy, z + dz) === B.AIR) P.set(x + dx, yy, z + dz, B.SPRUCE_LEAVES);
      }
      for (let k = 0; k < hgt; k++) P.set(x, y + k, z, B.SPRUCE_LOG);
    }
    /* ---- the town ---- */
    function paintShack(P) {
      if (!P.near(S.x0 - 6, S.z0 - 16, S.x1 + 6, S.z1 + 6)) return;
      const W = B.SPRUCE_PLANKS, LOG = B.SPRUCE_LOG;
      P.box(S.x0, Y, S.z0, S.x1, Y + 5, S.z1, B.AIR);
      P.walls(S.x0, T.y, S.z0, S.x1, Y + 5, S.z1, W);
      P.box(S.x0 + 1, T.y, S.z0 + 1, S.x1 - 1, T.y, S.z1 - 1, B.OAK_PLANKS);
      for (const [x, z] of [[S.x0, S.z0], [S.x1, S.z0], [S.x0, S.z1], [S.x1, S.z1]]) P.box(x, Y, z, x, Y + 5, z, LOG);
      for (let k = 0; k <= 8; k++) P.box(S.x0 - 1, Y + 6 + k, S.z0 - 1 + k, S.x1 + 1, Y + 6 + k, S.z1 + 1 - k, k === 8 ? LOG : B.SPRUCE_PLANKS);   // the roof
      for (let k = 0; k < 8; k++) { P.box(S.x0 + 1, Y + 6 + k, S.z0 + k, S.x1 - 1, Y + 6 + k, S.z1 - k, B.AIR); }
      P.box(S.x0 + 1, Y + 6, S.z0 + 1, S.x1 - 1, Y + 6, S.z1 - 1, B.AIR);
      // the front: a door, windows, and a porch with posts
      P.box(-1, Y, S.z1, 1, Y + 2, S.z1, B.AIR);
      for (const x of [-7, -6, 6, 7]) P.box(x, Y + 1, S.z1, x, Y + 2, S.z1, B.GLASS);
      P.box(S.x0, T.y, S.z1 + 1, S.x1, T.y, S.z1 + 3, B.SPRUCE_PLANKS);
      for (const x of [S.x0, -3, 3, S.x1]) { P.box(x, Y, S.z1 + 3, x, Y + 3, S.z1 + 3, LOG); }
      P.box(S.x0, Y + 4, S.z1 + 1, S.x1, Y + 4, S.z1 + 3, B.SPRUCE_PLANKS);
      // its name on a big board on the roof: MYSTERY SHACK
      const bz = S.z1 - 2;
      P.box(-15, Y + 7, bz, 15, Y + 19, bz, B.SPRUCE_PLANKS);
      for (const x of [-12, 12]) P.box(x, Y + 4, bz, x, Y + 6, bz, LOG);
      writeText(P, 'MYSTERY', -13, Y + 18, bz, B.WOOL);
      writeText(P, 'SHACK', -9, Y + 12, bz, B.WOOL);
      // inside: the gift shop (shelves, a counter, odd things for sale)
      P.box(S.x0 + 1, Y, S.z0 + 1, S.x0 + 1, Y + 2, S.z1 - 2, B.BOOKSHELF);
      P.box(S.x1 - 1, Y, S.z0 + 1, S.x1 - 1, Y + 2, S.z1 - 2, B.BOOKSHELF);
      P.box(-6, Y, -33, -2, Y, -33, B.SPRUCE_PLANKS); P.set(-6, Y + 1, -33, B.PUMPKIN); P.set(-3, Y + 1, -33, B.GLASS);
      P.box(2, Y, -30, 6, Y, -30, B.OAK_PLANKS); P.set(4, Y + 1, -30, B.JACK_O_LANTERN);
      for (const [x, z] of [[-5, -29], [5, -36], [-5, -37]]) P.set(x, Y + 3, z, B.GLOWSTONE);
      for (let x = S.x0 + 2; x <= S.x1 - 2; x++) P.set(x, Y, S.z0 + 1, B.BOOKSHELF);
      // the hidden door: a gap behind the shelves at the back, and steps down to a secret lab under the ground
      P.box(8, Y, S.z0, 8, Y + 1, S.z0, B.AIR); P.set(8, Y, S.z0 + 1, B.AIR); P.set(8, Y + 1, S.z0 + 1, B.AIR);
      const m = FF.myst[0], F = m.y - 1;   // the lab
      P.box(-3, F - 1, -55, 11, F + 5, -46, B.STONE_BRICKS);
      P.box(-2, F + 1, -54, 10, F + 4, -47, B.AIR);
      for (const [x, z] of [[-1, -53], [9, -53], [-1, -48], [9, -48]]) P.set(x, F + 4, z, B.GLOWSTONE);
      P.box(1, F + 1, -54, 7, F + 3, -54, B.IRON_BLOCK); P.box(2, F + 2, -54, 6, F + 2, -54, B.STAINED_GLASS); P.set(4, F + 3, -53, B.LEVER);   // a strange machine
      P.set(-1, F + 1, -50, B.BOOKSHELF); P.set(-1, F + 2, -50, B.BOOKSHELF); P.set(0, F + 1, -47, B.CRAFTING_TABLE);
      for (let k = 0; k <= 6; k++) { const z = S.z0 - 1 - k, f = Y - 2 - k; P.box(7, f - 1, z, 9, Y + 3, z, B.STONE_BRICKS); P.box(8, f + 1, z, 8, f + 3, z, B.AIR); P.set(8, f, z, B.SPRUCE_PLANKS); }
    }
    function paintTower(P) {   // the water tower: four legs, a round white tank with a blue band, and a pointed roof
      const { x, z } = FF.tower;
      if (!P.near(x - 7, z - 7, x + 7, z + 7)) return;
      for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) P.box(x + dx, Y, z + dz, x + dx, Y + 15, z + dz, B.SPRUCE_LOG);
      for (const k of [5, 10]) { P.line(x - 4, z - 4, x + 4, z - 4, Y + k, Y + k, B.SPRUCE_PLANKS); P.line(x - 4, z + 4, x + 4, z + 4, Y + k, Y + k, B.SPRUCE_PLANKS); }
      for (let k = 0; k < 16; k++) P.set(x + 5, Y + k, z, B.IRON_BARS);   // a ladder of sorts
      P.disc(x, z, 5, Y + 16, Y + 16, B.QUARTZ_BLOCK, false);
      P.disc(x, z, 5, Y + 17, Y + 23, B.QUARTZ_BLOCK, true);
      P.disc(x, z, 5, Y + 20, Y + 20, B.WOOL + 3, true);
      P.cone(x, z, 5.6, Y + 24, 5, B.SLATE);
    }
    function paintDiner(P) {   // a long white diner with a red stripe, big windows and DINER on the roof
      const D = FF.diner;
      if (!P.near(D.x0 - 2, D.z0 - 2, D.x1 + 2, D.z1 + 2)) return;
      P.box(D.x0, Y, D.z0, D.x1, Y + 4, D.z1, B.AIR);
      P.walls(D.x0, T.y, D.z0, D.x1, Y + 4, D.z1, B.QUARTZ_BLOCK);
      P.box(D.x0, Y + 3, D.z0, D.x1, Y + 3, D.z0, B.WOOL + 14);
      P.box(D.x0, Y + 5, D.z0, D.x1, Y + 5, D.z1, B.QUARTZ_BLOCK);
      P.box(D.x0 + 1, T.y, D.z0 + 1, D.x1 - 1, T.y, D.z1 - 1, B.WOOL);
      for (let x = D.x0 + 1; x < D.x1; x++) if ((x - D.x0) % 2) P.box(x, T.y, D.z0 + 1, x, T.y, D.z1 - 1, B.WOOL + 15);   // a black-and-white floor
      for (let x = D.x0 + 2; x <= D.x1 - 2; x++) if (Math.abs(x - 14) > 1) P.box(x, Y + 1, D.z0, x, Y + 2, D.z0, B.GLASS);
      P.box(13, Y, D.z0, 15, Y + 2, D.z0, B.AIR);   // the door, onto the street
      P.box(D.x0 + 2, Y, D.z1 - 2, D.x1 - 2, Y, D.z1 - 2, B.QUARTZ_BLOCK);   // the counter
      for (const x of [D.x0 + 3, D.x0 + 7, D.x1 - 7, D.x1 - 3]) { P.set(x, Y, D.z0 + 3, B.WOOL + 14); P.set(x, Y, D.z0 + 4, B.OAK_PLANKS); }
      P.set(D.x0 + 3, Y + 4, D.z0 + 4, B.GLOWSTONE); P.set(D.x1 - 3, Y + 4, D.z0 + 4, B.GLOWSTONE);
      P.box(D.x0 + 1, Y + 6, D.z0 + 4, D.x1 - 1, Y + 11, D.z0 + 4, B.QUARTZ_BLOCK);
      writeText(P, 'DINER', D.x0 + 1, Y + 10, D.z0 + 4, B.WOOL + 14);
    }
    function paintStore(P) {   // white walls, big windows, STORE on a board on the roof, shelves, and a counter with the shopkeeper behind it
      const D = FF.store, mx = 21;
      if (!P.near(D.x0 - 2, D.z0 - 2, D.x1 + 2, D.z1 + 2)) return;
      P.box(D.x0 - 1, Y, D.z0 - 1, D.x1 + 1, Y + 14, D.z1 + 1, B.AIR);
      P.walls(D.x0, T.y, D.z0, D.x1, Y + 4, D.z1, B.QUARTZ_BLOCK);
      for (const x of [D.x0, D.x1]) for (const z of [D.z0, D.z1]) P.box(x, T.y, z, x, Y + 4, z, B.STONE_BRICKS);
      P.box(D.x0, Y + 5, D.z0, D.x1, Y + 5, D.z1, B.STONE_BRICKS);
      P.box(D.x0 + 1, T.y, D.z0 + 1, D.x1 - 1, T.y, D.z1 - 1, B.QUARTZ_BLOCK);
      for (let x = D.x0 + 1; x < D.x1; x++) for (let z = D.z0 + 1; z < D.z1; z++) if ((x + z) & 1) P.set(x, T.y, z, B.WOOL + 11);   // a blue-and-white floor
      for (let x = D.x0 + 2; x <= D.x1 - 2; x++) if (Math.abs(x - mx) > 1) P.box(x, Y + 1, D.z1, x, Y + 3, D.z1, B.GLASS);   // big shop windows
      P.box(mx, Y, D.z1, mx, Y + 2, D.z1, B.AIR);   // the door, onto the street
      for (let x = D.x0; x <= D.x1; x++) P.set(x, Y + 4, D.z1 + 1, B.WOOL + ((x & 1) ? 0 : 14));   // a striped awning
      P.set(mx + 2, Y, D.z1 + 1, B.SIGN);   // "Declan-craft Store" (the words go on when it is first seen)
      for (let z = D.z0 + 1; z <= D.z1 - 3; z++) for (const x of [D.x0 + 1, D.x1 - 1]) { P.set(x, Y, z, B.BOOKSHELF); P.set(x, Y + 1, z, z % 3 ? B.BOOKSHELF : B.PUMPKIN); }
      for (let x = D.x0 + 1; x <= D.x1 - 1; x++) { P.set(x, Y, D.z0 + 1, B.BOOKSHELF); P.set(x, Y + 1, D.z0 + 1, B.BOOKSHELF); P.set(x, Y + 2, D.z0 + 1, B.BOOKSHELF); }
      P.box(D.x0 + 3, Y, D.z0 + 4, D.x1 - 4, Y, D.z0 + 4, B.SPRUCE_PLANKS);   // the counter
      for (const x of [D.x0 + 4, mx, D.x1 - 4]) P.set(x, Y + 4, 2, B.GLOWSTONE);
      P.box(D.x0 - 3, Y + 6, D.z1 - 2, D.x1 + 3, Y + 13, D.z1 - 2, B.QUARTZ_BLOCK);   // the board on the roof
      for (const x of [D.x0 + 1, D.x1 - 1]) P.set(x, Y + 5, D.z1 - 2, B.STONE_BRICKS);
      writeText(P, 'STORE', D.x0 - 2, Y + 12, D.z1 - 2, B.WOOL + 11);
    }
    function paintHouses(P) {
      for (const [hx, hz] of FF.houses) {
        if (!P.near(hx - 6, hz - 6, hx + 6, hz + 6)) continue;
        P.box(hx - 3, Y, hz - 3, hx + 3, Y + 4, hz + 3, B.AIR);
        P.walls(hx - 3, T.y, hz - 3, hx + 3, Y + 3, hz + 3, hx < 0 ? B.SPRUCE_PLANKS : B.BIRCH_PLANKS);
        P.box(hx - 2, T.y, hz - 2, hx + 2, T.y, hz + 2, B.OAK_PLANKS);
        P.box(hx - 1, Y + 1, hz + 3, hx + 1, Y + 2, hz + 3, B.GLASS);
        P.box(hx, Y, hz - 3, hx, Y + 1, hz - 3, B.AIR);   // the door, onto the street
        P.box(hx + 2, Y + 1, hz - 3, hx + 2, Y + 2, hz - 3, B.GLASS);
        for (let k = 0; k <= 3; k++) P.box(hx - 4, Y + 4 + k, hz - 3 + k, hx + 4, Y + 4 + k, hz + 3 - k, B.SPRUCE_PLANKS);
        P.set(hx, Y + 2, hz, B.TORCH);
      }
    }
    function paintStreets(P) {
      P.box(-1, T.y, S.z1 + 4, 1, T.y, 10, B.GRAVEL);   // up to the Shack
      P.box(-44, T.y, 10, 44, T.y, 12, B.GRAVEL);   // the main street
      P.box(-1, T.y, 13, 1, T.y, 44, B.GRAVEL);   // down to the lake
      for (let x = -40; x <= 40; x += 10) if (Math.abs(x) > 2) { P.box(x, Y, 9, x, Y + 2, 9, B.SPRUCE_LOG); P.set(x, Y + 3, 9, B.TORCH); }   // lamp posts
      P.box(-3, T.y - 1, 46, 3, T.y - 1, 54, B.SPRUCE_PLANKS);   // a jetty out over the lake
    }
    /* ---- the mysteries out in the forest ---- */
    function paintMysteries(P) {
      const M = FF.myst;
      { const m = M[1], y = mystY[1] + 1; if (P.near(m.x - 3, m.z - 3, m.x + 3, m.z + 3)) {   // a strange glowing rock on a mossy mound
        P.disc(m.x, m.z, 2.2, y - 1, y - 1, B.MOSSY_COBBLE, false); P.box(m.x - 1, y, m.z - 1, m.x + 1, y, m.z + 1, B.OBSIDIAN); P.set(m.x, y + 1, m.z, B.GLOWSTONE); P.set(m.x, y, m.z, B.GLOWSTONE);
      } }
      { const m = M[2], y = mystY[2] + 1; if (P.near(m.x - 14, m.z - 2, m.x + 14, m.z + 2)) {   // a stone wall with a secret code on it
        P.box(m.x - 13, y, m.z, m.x + 13, y + 6, m.z, B.STONE_BRICKS); P.box(m.x - 13, y + 7, m.z, m.x + 13, y + 7, m.z, B.MOSSY_COBBLE);
        writeText(P, 'GHFODQ', m.x - 11, y + 5, m.z, B.WOOL + 15);
      } }
      { const m = M[3], y = mystY[3] + 1; if (P.near(m.x - 4, m.z - 4, m.x + 4, m.z + 4)) {   // a huge old hollow tree, with a Journal page inside
        P.box(m.x - 1, y, m.z - 1, m.x + 1, y + 12, m.z + 1, B.OAK_LOG); P.box(m.x, y, m.z, m.x, y + 3, m.z, B.AIR); P.box(m.x, y, m.z + 1, m.x, y + 1, m.z + 1, B.AIR);
        P.set(m.x, y, m.z, B.BOOKSHELF);
        P.disc(m.x, m.z, 4, y + 11, y + 13, B.OAK_LEAVES, false); P.disc(m.x, m.z, 2.5, y + 14, y + 14, B.OAK_LEAVES, false);
      } }
      { const m = M[4], y = mystY[4] + 1; if (P.near(m.x - 8, m.z - 8, m.x + 8, m.z + 8)) {   // the gnomes' hideout: little toadstool houses
        for (const [dx, dz] of [[-4, -2], [0, -5], [4, -1], [-2, 4], [3, 4]]) {
          P.box(m.x + dx, y, m.z + dz, m.x + dx, y + 1, m.z + dz, B.BIRCH_LOG);
          P.disc(m.x + dx, m.z + dz, 1.5, y + 2, y + 2, B.WOOL + 14, false); P.set(m.x + dx, y + 3, m.z + dz, B.WOOL + 14); P.set(m.x + dx + 1, y + 2, m.z + dz, B.WOOL);
        }
        P.disc(m.x, m.z, 1, y - 1, y - 1, B.GRAVEL, false);
      } }
      { const m = M[5], y = mystY[5] + 1; if (P.near(m.x - 9, m.z - 9, m.x + 9, m.z + 9)) {   // a crashed flying saucer, tipped up and half buried
        for (let dx = -7; dx <= 7; dx++) for (let dz = -7; dz <= 7; dz++) {
          const d = Math.hypot(dx, dz); if (d > 7.2) continue;
          const tilt = Math.round(dx * 0.35), yy = y - 1 + tilt;
          P.set(m.x + dx, yy, m.z + dz, d > 6 ? B.IRON_BARS : B.IRON_BLOCK);
          if (d < 5.5) P.set(m.x + dx, yy + 1, m.z + dz, d > 4.5 ? B.GLOWSTONE : d < 3 ? B.GLASS : B.IRON_BLOCK);
          if (d < 3) { P.set(m.x + dx, yy + 2, m.z + dz, B.GLASS); if (d < 2) P.set(m.x + dx, yy + 3, m.z + dz, B.GLASS); }
        }
        for (let dx = -9; dx <= -6; dx++) P.box(m.x + dx, y - 1, m.z - 1, m.x + dx, y - 1, m.z + 1, B.DIRT);   // the furrow it dug
      } }
    }
    function generate(cx, cz, vb) {
      const blocks = new Uint8Array(CVOL), x0 = cx * 16, z0 = cz * 16, cols = new Int32Array(256), r = mulberry32(hash3(seed ^ 0xfa1, cx, cz));
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const x = x0 + lx, z = z0 + lz, h = column(x, z), shore = h <= L.y && lakeD(x, z) < 1.25;
        cols[lz * 16 + lx] = h;
        for (let y = 0; y <= Math.max(h, L.y - 1); y++) {
          let b;
          if (y === 0 || (y < 3 && r() < 0.6)) b = B.BEDROCK;
          else if (y < h - 3) b = B.STONE;
          else if (y < h) b = shore ? B.SAND : B.DIRT;
          else if (y === h) b = h < L.y - 3 ? B.GRAVEL : shore ? B.SAND : B.GRASS;
          else b = B.WATER;
          blocks[idx(lx, y, lz)] = b;
        }
      }
      oreVeins(blocks, r, B.STONE, [[B.COAL_ORE, 16, 5, 100, 9], [B.IRON_ORE, 10, 5, 64, 7], [B.GOLD_ORE, 3, 5, 32, 6], [B.DIAMOND_ORE, 2, 5, 16, 5], [B.EMERALD_ORE, 2, 5, 40, 1]]);
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) { const x = x0 + lx, z = z0 + lz; if (!clear(x, z) || (Math.hypot(x - T.x, z - T.z) < T.r && r() < 0.3)) decorate(blocks, r, lx, lz, cols[lz * 16 + lx], clear(x, z) ? PLAINS : FOREST); }
      const P = painter(blocks, cx, cz);
      for (let ncz = cz - 1; ncz <= cz + 1; ncz++) for (let ncx = cx - 1; ncx <= cx + 1; ncx++) {   // tall pines (from the chunks round about too, so they cross borders)
        const tr = mulberry32(hash3(seed ^ 0x9e1, ncx, ncz));
        for (let k = 0; k < 7; k++) {
          const tx = ncx * 16 + ((tr() * 16) | 0), tz = ncz * 16 + ((tr() * 16) | 0), hr = tr();
          if (clear(tx, tz)) continue;
          const own = ncx === cx && ncz === cz, th = own ? cols[(tz - z0) * 16 + (tx - x0)] : column(tx, tz);
          if (th <= L.y || th > WH - 30) continue;
          if (own && blocks[idx(tx - x0, th, tz - z0)] !== B.GRASS) continue;
          tallPine(P, tx, th + 1, tz, 11 + ((hr * 9) | 0));
        }
      }
      paintStreets(P); paintShack(P); paintTower(P); paintDiner(P); paintHouses(P); paintMysteries(P);
      const spawns = [], D = FF.store;
      if (!(vb && vb.has('fstore'))) {
        paintStore(P);
        if (P.near(21, -1, 21, -1)) spawns.push(['shop', 21.5, Y, -0.5, 1, 'fstore', 23, Y, D.z1 + 1]);
      }
      return { blocks, spawns };
    }
    function spawn() { return FF.spawn.slice(); }
    return { generate, spawn, column, mystY };
  }

  /* ========== Ghostbusters (the sixth wish list): a spooky little city at dusk. The firehouse headquarters with its
     name on a board, houses along the main street (two of them haunted), the library and the park. ========== */
  const GB = {
    town: { x: 0, z: -6, r: 72, y: 64 },
    hq: { x0: -12, x1: 12, z0: -28, z1: -9 },
    library: { x0: -54, x1: -30, z0: -30, z1: -11 },
    park: { x0: 26, x1: 60, z0: -44, z1: -10 },
    houses: [[-44, 18, 1], [-26, 18, 0], [-8, 18, 0], [26, 18, 0], [44, 18, 1]],   // [x, z, haunted]
    spawn: [0.5, 65, 4.5],
  };
  function ghostGen(seed) {
    const nA = makeNoise(seed ^ 0x6b05), nB = makeNoise(seed ^ 0x6b06), smooth = t => t * t * (3 - 2 * t), T = GB.town, Y = T.y + 1;
    function column(x, z) {
      let h = 66 + fbm2(nA, x * 0.012, z * 0.012, 3) * 8 + fbm2(nB, x * 0.05, z * 0.05, 2) * 1.2;
      const d = Math.hypot(x - T.x, z - T.z);
      if (d < T.r + 18) h += (T.y - h) * smooth(d <= T.r ? 1 : 1 - (d - T.r) / 18);
      return Math.round(clamp(h, 8, WH - 16));
    }
    const inTown = (x, z) => Math.hypot(x - T.x, z - T.z) < T.r + 2;
    function paintStreets(P) {
      P.box(-70, T.y, 2, 70, T.y, 6, B.STONE_BRICKS);   // the main street
      P.box(-70, T.y, 1, 70, T.y, 1, B.COBBLE); P.box(-70, T.y, 7, 70, T.y, 7, B.COBBLE);   // (kerbs)
      P.box(-2, T.y, 7, 2, T.y, 60, B.STONE_BRICKS);   // a street south, past the houses
      P.box(-2, T.y, -8, 2, T.y, 1, B.STONE_BRICKS);   // up to the firehouse
      for (let x = -64; x <= 64; x += 12) for (const z of [0, 8]) { P.box(x, Y, z, x, Y + 3, z, B.SPRUCE_LOG); P.set(x, Y + 4, z, B.JACK_O_LANTERN); }   // spooky lamp posts
    }
    function paintHQ(P) {   // the firehouse: red brick, three big doors, and GHOST BUSTERS on a board above
      const D = GB.hq;
      if (!P.near(D.x0 - 4, D.z0 - 2, D.x1 + 4, D.z1 + 2)) return;
      P.box(D.x0, Y, D.z0, D.x1, Y + 18, D.z1, B.AIR);
      P.walls(D.x0, T.y, D.z0, D.x1, Y + 9, D.z1, B.BRICKS);
      P.box(D.x0, Y + 10, D.z0, D.x1, Y + 10, D.z1, B.STONE_BRICKS);
      P.box(D.x0 + 1, T.y, D.z0 + 1, D.x1 - 1, T.y, D.z1 - 1, B.STONE);
      P.box(D.x0 + 1, Y + 5, D.z0 + 1, D.x1 - 1, Y + 5, D.z1 - 1, B.SPRUCE_PLANKS);   // the upstairs floor
      P.box(-1, Y + 5, D.z0 + 2, 1, Y + 5, D.z0 + 4, B.AIR); P.box(0, Y, D.z0 + 3, 0, Y + 9, D.z0 + 3, B.IRON_BARS);   // the firehouse pole, through a hole
      for (const x0 of [-10, -2, 6]) P.box(x0, Y, D.z1, x0 + 4, Y + 3, D.z1, B.AIR);   // three big doors onto the street
      for (const x of [D.x0 + 2, D.x0 + 5, D.x1 - 5, D.x1 - 2]) P.box(x, Y + 6, D.z1, x + 1, Y + 8, D.z1, B.GLASS);
      for (let z = D.z0 + 2; z <= D.z1 - 3; z += 3) { P.set(D.x0 + 1, Y, z, B.IRON_BLOCK); P.set(D.x0 + 1, Y + 1, z, B.IRON_BLOCK); }   // lockers
      P.box(D.x1 - 4, Y, D.z0 + 1, D.x1 - 1, Y + 2, D.z0 + 2, B.IRON_BLOCK); P.box(D.x1 - 3, Y + 1, D.z0 + 2, D.x1 - 2, Y + 1, D.z0 + 2, B.GLOWSTONE);   // the ghost containment unit (its light glows)
      for (const x of [-8, 0, 8]) P.set(x, Y + 4, -18, B.GLOWSTONE);
      P.box(D.x0 + 2, Y + 6, D.z0 + 2, D.x0 + 2, Y + 7, D.z1 - 2, B.BOOKSHELF);
      // the board: GHOST over BUSTERS, red on white
      const bz = D.z1 + 1;
      P.box(-14, Y + 11, bz, 14, Y + 23, bz, B.QUARTZ_BLOCK);
      writeText(P, 'GHOST', -9, Y + 22, bz, B.WOOL + 14);
      writeText(P, 'BUSTERS', -13, Y + 16, bz, B.WOOL + 14);
      for (const x of [-12, 12]) P.box(x, Y + 10, bz, x, Y + 10, bz, B.QUARTZ_BLOCK);
    }
    function paintLibrary(P) {   // white stone with columns, and rows of bookshelves inside
      const D = GB.library;
      if (!P.near(D.x0 - 2, D.z0 - 2, D.x1 + 2, D.z1 + 4)) return;
      P.box(D.x0, Y, D.z0, D.x1, Y + 10, D.z1, B.AIR);
      P.walls(D.x0, T.y, D.z0, D.x1, Y + 6, D.z1, B.QUARTZ_BLOCK);
      P.box(D.x0, Y + 7, D.z0, D.x1, Y + 7, D.z1, B.STONE_BRICKS);
      P.box(D.x0 + 1, T.y, D.z0 + 1, D.x1 - 1, T.y, D.z1 - 1, B.OAK_PLANKS);
      P.box(D.x0 + 2, T.y, D.z1 + 1, D.x1 - 2, T.y, D.z1 + 2, B.QUARTZ_BLOCK);   // the steps
      for (let x = D.x0 + 2; x <= D.x1 - 2; x += 4) P.box(x, Y, D.z1 + 2, x, Y + 5, D.z1 + 2, B.QUARTZ_BLOCK);   // columns
      P.box(D.x0, Y + 6, D.z1 + 1, D.x1, Y + 6, D.z1 + 2, B.QUARTZ_BLOCK);
      P.box(-43, Y, D.z1, -41, Y + 2, D.z1, B.AIR);   // the door
      for (let x = D.x0 + 3; x <= D.x1 - 3; x += 3) { if (Math.abs(x + 42) <= 1) continue; P.box(x, Y + 2, D.z1, x, Y + 4, D.z1, B.GLASS); }
      for (let z = D.z0 + 2; z <= D.z1 - 4; z += 3) P.box(D.x0 + 3, Y, z, D.x1 - 3, Y + 2, z, B.BOOKSHELF);   // rows of shelves
      for (let z = D.z0 + 2; z <= D.z1 - 4; z += 3) P.box(-43, Y, z, -41, Y + 2, z, B.AIR);   // (an aisle down the middle)
      for (const x of [-48, -36]) P.set(x, Y + 6, -20, B.GLOWSTONE);
    }
    function paintPark(P) {   // grass, old trees, a pond, benches and a path
      const D = GB.park;
      if (!P.near(D.x0 - 8, D.z0 - 8, D.x1 + 8, D.z1 + 8)) return;
      P.box(D.x0, T.y, D.z0, D.x1, T.y, D.z1, B.GRASS);
      P.box(D.x0, Y, D.z0, D.x1, Y, D.z0, B.OAK_PLANKS); P.box(D.x0, Y, D.z0, D.x0, Y, D.z1, B.OAK_PLANKS); P.box(D.x1, Y, D.z0, D.x1, Y, D.z1, B.OAK_PLANKS);   // a low fence
      P.box(D.x0 + 1, T.y, -12, D.x1 - 1, T.y, -11, B.GRAVEL); P.box(42, T.y, D.z0 + 1, 43, T.y, -12, B.GRAVEL);   // paths
      P.disc(34, -32, 5, T.y, T.y, B.WATER, false); P.disc(34, -32, 3.6, T.y - 1, T.y - 1, B.WATER, false);   // the pond
      for (const [x, z] of [[30, -18], [52, -20], [54, -36], [47, -40], [30, -41]]) { const r = mulberry32(hash3(seed ^ 0x9a7, x, z)); placeTree(P.blocks, P.cx, P.cz, x, Y, z, 0, r()); }
      for (const [x, z] of [[36, -13], [48, -13], [44, -26]]) P.box(x, Y, z, x + 2, Y, z, B.SPRUCE_PLANKS);   // benches
      P.box(42, Y, -25, 42, Y + 2, -25, B.SPRUCE_LOG); P.set(42, Y + 3, -25, B.GLOWSTONE);
    }
    function paintHouses(P) {
      for (const [hx, hz, haunted] of GB.houses) {
        if (!P.near(hx - 7, hz - 7, hx + 7, hz + 7)) continue;
        const wall = haunted ? B.MOSSY_COBBLE : (hx < 0 ? B.BIRCH_PLANKS : B.SPRUCE_PLANKS), roof = haunted ? B.OBSIDIAN : B.BRICKS;
        P.box(hx - 4, Y, hz - 4, hx + 4, Y + 9, hz + 4, B.AIR);
        P.walls(hx - 4, T.y, hz - 4, hx + 4, Y + 3, hz + 4, wall);
        P.box(hx - 3, T.y, hz - 3, hx + 3, T.y, hz + 3, haunted ? B.SOUL_SAND : B.OAK_PLANKS);
        P.box(hx, Y, hz - 4, hx, Y + 1, hz - 4, B.AIR);   // the door, onto the street
        for (const x of [hx - 2, hx + 2]) P.box(x, Y + 1, hz - 4, x, Y + 2, hz - 4, haunted ? B.AIR : B.GLASS);   // (a haunted house's windows are broken)
        for (let k = 0; k <= 4; k++) P.box(hx - 5, Y + 4 + k, hz - 4 + k, hx + 5, Y + 4 + k, hz + 4 - k, roof);
        if (haunted) { P.set(hx - 1, Y, hz - 5, B.JACK_O_LANTERN); P.set(hx + 3, Y + 3, hz - 5, B.CRACKED_BRICKS); P.box(hx + 3, Y + 4, hz - 5, hx + 3, Y + 6, hz - 5, B.IRON_BARS); P.set(hx - 3, Y, hz + 3, B.CRACKED_BRICKS); }
        else P.set(hx, Y + 2, hz, B.TORCH);
      }
    }
    function generate(cx, cz) {
      const blocks = new Uint8Array(CVOL), x0 = cx * 16, z0 = cz * 16, cols = new Int32Array(256), r = mulberry32(hash3(seed ^ 0x6b0, cx, cz));
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const x = x0 + lx, z = z0 + lz, h = column(x, z);
        cols[lz * 16 + lx] = h;
        for (let y = 0; y <= h; y++) blocks[idx(lx, y, lz)] = y === 0 || (y < 3 && r() < 0.6) ? B.BEDROCK : y < h - 3 ? B.STONE : y < h ? B.DIRT : B.GRASS;
      }
      oreVeins(blocks, r, B.STONE, [[B.COAL_ORE, 14, 5, 100, 9], [B.IRON_ORE, 8, 5, 64, 7], [B.GOLD_ORE, 3, 5, 32, 6]]);
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) if (!inTown(x0 + lx, z0 + lz)) decorate(blocks, r, lx, lz, cols[lz * 16 + lx], FOREST);
      const P = painter(blocks, cx, cz);
      P.blocks = blocks; P.cx = cx; P.cz = cz;
      for (let k = 0; k < 3; k++) {   // old trees out of town
        const lx = 2 + ((r() * 12) | 0), lz = 2 + ((r() * 12) | 0), x = x0 + lx, z = z0 + lz;
        if (inTown(x, z) || r() < 0.3) continue;
        placeTree(blocks, cx, cz, x, cols[lz * 16 + lx] + 1, z, r() < 0.5 ? 0 : 2, r());
      }
      paintStreets(P); paintHQ(P); paintLibrary(P); paintPark(P); paintHouses(P);
      return { blocks, spawns: [] };
    }
    function spawn() { return GB.spawn.slice(); }
    return { generate, spawn, column };
  }

  /* ========== Life Cycle (the sixth wish list): a friendly little city. Your home with its fenced garden in the middle,
     a playground, the school, the park, streets, and neighbours' houses. ========== */
  const LC = {
    town: { x: 0, z: 0, r: 80, y: 64 },
    home: { x: 0, z: 0, r: 12 },   // the garden fence: babies and toddlers stay inside it
    house: { x0: -5, x1: 5, z0: -10, z1: -2 },
    playground: { x0: 26, x1: 46, z0: -12, z1: 10 },
    school: { x0: -18, x1: 18, z0: -58, z1: -34 },
    park: { x0: -48, x1: -26, z0: -12, z1: 12 },
    houses: [[-40, 32], [-20, 32], [20, 32], [40, 32], [-62, -30], [62, -30]],
    car: [8.5, 65, 17.5],
    spawn: [0.5, 65, -0.5],
  };
  function lifeGen(seed) {
    const nA = makeNoise(seed ^ 0x11fe), smooth = t => t * t * (3 - 2 * t), T = LC.town, Y = T.y + 1;
    function column(x, z) {
      let h = 66 + fbm2(nA, x * 0.01, z * 0.01, 3) * 7;
      const d = Math.hypot(x - T.x, z - T.z);
      if (d < T.r + 20) h += (T.y - h) * smooth(d <= T.r ? 1 : 1 - (d - T.r) / 20);
      return Math.round(clamp(h, 8, WH - 16));
    }
    const inTown = (x, z) => Math.hypot(x - T.x, z - T.z) < T.r + 2;
    const WOOLS = [14, 4, 11, 5, 1, 6, 3, 10];
    function paintHome(P) {
      const H = LC.home, D = LC.house;
      if (!P.near(-14, -14, 14, 14)) return;
      for (let x = -H.r; x <= H.r; x++) for (const z of [-H.r, H.r]) P.set(x, Y, z, B.BIRCH_PLANKS);   // the garden fence
      for (let z = -H.r; z <= H.r; z++) for (const x of [-H.r, H.r]) P.set(x, Y, z, B.BIRCH_PLANKS);
      P.box(-1, Y, H.r, 1, Y, H.r, B.AIR);   // the gate
      P.box(-1, T.y, 1, 1, T.y, H.r + 3, B.GRAVEL);   // the path to it
      P.box(D.x0, Y, D.z0, D.x1, Y + 9, D.z1, B.AIR);
      P.walls(D.x0, T.y, D.z0, D.x1, Y + 3, D.z1, B.BRICKS);
      P.box(D.x0 + 1, T.y, D.z0 + 1, D.x1 - 1, T.y, D.z1 - 1, B.OAK_PLANKS);
      for (let k = 0; k <= 5; k++) P.box(D.x0 - 1 + k, Y + 4 + k, D.z0 - 1, D.x1 + 1 - k, Y + 4 + k, D.z1 + 1, k === 5 ? B.BRICKS : B.SPRUCE_PLANKS);
      for (let k = 0; k < 5; k++) P.box(D.x0 + k, Y + 4 + k, D.z0, D.x1 - k, Y + 4 + k, D.z1, B.AIR);
      P.box(0, Y, D.z1, 0, Y + 1, D.z1, B.AIR);   // the door
      for (const x of [-3, 3]) P.box(x, Y + 1, D.z1, x, Y + 2, D.z1, B.GLASS);
      P.set(D.x0 + 1, Y, D.z0 + 1, B.BED); P.set(D.x1 - 1, Y, D.z0 + 1, B.CRAFTING_TABLE); P.set(D.x1 - 1, Y, D.z0 + 2, B.FURNACE);
      P.set(-2, Y, -6, B.WOOL + 14); P.set(-1, Y, -6, B.WOOL + 4); P.set(-2, Y + 1, -6, B.WOOL + 11);   // a pile of toy blocks
      P.set(0, Y + 3, -6, B.GLOWSTONE);
      // the garden: flowers, a sandpit, a little tree
      P.box(5, T.y, 4, 8, T.y, 7, B.SAND);
      for (const [x, z] of [[-8, 4], [-9, 6], [-7, 8], [-10, 9], [9, -5], [10, -8]]) P.set(x, Y, z, (x + z) & 1 ? B.POPPY : B.DANDELION);
    }
    function paintPlayground(P) {   // soft sand, a slide, swings, a climbing frame and a roundabout
      const D = LC.playground;
      if (!P.near(D.x0 - 2, D.z0 - 2, D.x1 + 2, D.z1 + 2)) return;
      P.box(D.x0, T.y, D.z0, D.x1, T.y, D.z1, B.SAND);
      for (let k = 0; k < 5; k++) { P.set(30 + k, Y + 4 - k, -6, B.QUARTZ_BLOCK); }   // the slide
      P.box(29, Y, -7, 29, Y + 4, -7, B.IRON_BARS); P.box(29, Y, -5, 29, Y + 4, -5, B.IRON_BARS); P.set(29, Y + 4, -6, B.QUARTZ_BLOCK);
      for (let k = 0; k <= 4; k++) P.set(28, Y + k, -6, k % 2 ? B.AIR : B.OAK_PLANKS);
      P.box(36, Y, 2, 36, Y + 4, 2, B.OAK_LOG); P.box(42, Y, 2, 42, Y + 4, 2, B.OAK_LOG); P.box(36, Y + 5, 2, 42, Y + 5, 2, B.OAK_LOG);   // the swings
      for (const x of [38, 40]) { P.box(x, Y + 2, 2, x, Y + 4, 2, B.IRON_BARS); P.set(x, Y + 1, 2, B.WOOL + (x === 38 ? 14 : 11)); }
      for (let x = 32; x <= 36; x++) for (let z = 4; z <= 8; z++) if (x === 32 || x === 36 || z === 4 || z === 8) P.box(x, Y, z, x, Y + 3, z, B.IRON_BARS);   // the climbing frame
      P.box(32, Y + 4, 4, 36, Y + 4, 8, B.SPRUCE_PLANKS);
      P.disc(42, -6, 2.2, Y, Y, B.WOOL + 5, false); P.set(42, Y + 1, -6, B.IRON_BARS);   // the roundabout
    }
    function paintSchool(P) {   // red brick, big windows, SCHOOL on the front, desks and a blackboard
      const D = LC.school;
      if (!P.near(D.x0 - 2, D.z0 - 2, D.x1 + 2, D.z1 + 4)) return;
      P.box(D.x0, Y, D.z0, D.x1, Y + 16, D.z1, B.AIR);
      P.walls(D.x0, T.y, D.z0, D.x1, Y + 6, D.z1, B.BRICKS);
      P.box(D.x0, Y + 7, D.z0, D.x1, Y + 7, D.z1, B.STONE_BRICKS);
      P.box(D.x0 + 1, T.y, D.z0 + 1, D.x1 - 1, T.y, D.z1 - 1, B.OAK_PLANKS);
      for (let x = D.x0 + 2; x <= D.x1 - 2; x += 3) if (Math.abs(x) > 2) P.box(x, Y + 2, D.z1, x + 1, Y + 4, D.z1, B.GLASS);
      P.box(-1, Y, D.z1, 1, Y + 2, D.z1, B.AIR);   // the doors
      P.box(D.x0 + 4, Y + 1, D.z0 + 1, D.x1 - 4, Y + 4, D.z0 + 1, B.WOOL + 15);   // the blackboard
      for (let z = D.z0 + 5; z <= D.z1 - 4; z += 3) for (let x = D.x0 + 4; x <= D.x1 - 4; x += 4) { P.set(x, Y, z, B.OAK_PLANKS); P.set(x + 1, Y, z, B.OAK_PLANKS); }   // desks
      for (const x of [-10, 0, 10]) P.set(x, Y + 6, -46, B.GLOWSTONE);
      P.box(-11, Y + 8, D.z1, 11, Y + 15, D.z1, B.QUARTZ_BLOCK);
      writeText(P, 'SCHOOL', -11, Y + 14, D.z1, B.WOOL + 11);
      P.box(D.x0, T.y, D.z1 + 1, D.x1, T.y, D.z1 + 8, B.STONE_BRICKS);   // the schoolyard
    }
    function paintPark(P) {
      const D = LC.park;
      if (!P.near(D.x0 - 8, D.z0 - 8, D.x1 + 8, D.z1 + 8)) return;
      P.disc(-37, 0, 4.5, T.y, T.y, B.WATER, false);
      for (const [x, z] of [[-44, -8], [-30, -9], [-45, 8], [-29, 9]]) placeTree(P.blocks, P.cx, P.cz, x, Y, z, 0, 0.5);
      for (const [x, z] of [[-37, -7], [-37, 7]]) P.box(x - 1, Y, z, x + 1, Y, z, B.SPRUCE_PLANKS);
      for (let x = D.x0; x <= D.x1; x += 2) P.set(x, Y, D.z1 + 1, x % 4 ? B.POPPY : B.CORNFLOWER);
    }
    function paintStreets(P) {
      P.box(-78, T.y, 15, 78, T.y, 20, B.STONE_BRICKS);   // the main street, past the front gate
      P.box(18, T.y, -60, 23, T.y, 15, B.STONE_BRICKS);   // a street north to the school
      P.box(-23, T.y, -33, 23, T.y, -28, B.STONE_BRICKS);
      for (let x = -70; x <= 70; x += 14) { P.box(x, Y, 14, x, Y + 2, 14, B.SPRUCE_LOG); P.set(x, Y + 3, 14, B.GLOWSTONE); }
    }
    function paintHouses(P) {   // the neighbours: little houses in bright colours
      LC.houses.forEach(([hx, hz], i) => {
        if (!P.near(hx - 6, hz - 6, hx + 6, hz + 6)) return;
        const c = B.WOOL + WOOLS[i % WOOLS.length], north = hz > 0;
        P.box(hx - 4, Y, hz - 4, hx + 4, Y + 8, hz + 4, B.AIR);
        P.walls(hx - 4, T.y, hz - 4, hx + 4, Y + 3, hz + 4, c);
        P.box(hx - 3, T.y, hz - 3, hx + 3, T.y, hz + 3, B.OAK_PLANKS);
        const dz = north ? hz - 4 : hz + 4;
        P.box(hx, Y, dz, hx, Y + 1, dz, B.AIR); P.box(hx + 2, Y + 1, dz, hx + 2, Y + 2, dz, B.GLASS); P.box(hx - 2, Y + 1, dz, hx - 2, Y + 2, dz, B.GLASS);
        for (let k = 0; k <= 4; k++) P.box(hx - 5 + k, Y + 4 + k, hz - 5, hx + 5 - k, Y + 4 + k, hz + 5, B.BRICKS);
        P.set(hx, Y + 2, hz, B.TORCH);
      });
    }
    function generate(cx, cz) {
      const blocks = new Uint8Array(CVOL), x0 = cx * 16, z0 = cz * 16, cols = new Int32Array(256), r = mulberry32(hash3(seed ^ 0x11f, cx, cz));
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const x = x0 + lx, z = z0 + lz, h = column(x, z);
        cols[lz * 16 + lx] = h;
        for (let y = 0; y <= h; y++) blocks[idx(lx, y, lz)] = y === 0 || (y < 3 && r() < 0.6) ? B.BEDROCK : y < h - 3 ? B.STONE : y < h ? B.DIRT : B.GRASS;
      }
      oreVeins(blocks, r, B.STONE, [[B.COAL_ORE, 14, 5, 100, 9], [B.IRON_ORE, 8, 5, 64, 7], [B.GOLD_ORE, 3, 5, 32, 6], [B.DIAMOND_ORE, 1, 5, 16, 4]]);
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) if (!inTown(x0 + lx, z0 + lz) || r() < 0.08) decorate(blocks, r, lx, lz, cols[lz * 16 + lx], PLAINS);
      const P = painter(blocks, cx, cz);
      P.blocks = blocks; P.cx = cx; P.cz = cz;
      for (let k = 0; k < 2; k++) {
        const lx = 2 + ((r() * 12) | 0), lz = 2 + ((r() * 12) | 0), x = x0 + lx, z = z0 + lz;
        if (inTown(x, z) || r() < 0.4) continue;
        placeTree(blocks, cx, cz, x, cols[lz * 16 + lx] + 1, z, r() < 0.7 ? 0 : 1, r());
      }
      paintStreets(P); paintHome(P); paintPlayground(P); paintSchool(P); paintPark(P); paintHouses(P);
      return { blocks, spawns: [] };
    }
    function spawn() { return LC.spawn.slice(); }
    return { generate, spawn, column };
  }

  return { MW, marsTracks, trackNear, marsTouching, nearestRuin, moonGen, marsGen, jupiterGen, uranusGen, planetLanding, nearestRover, hogwartsGen, HW, fallsGen, FF, ghostGen, GB, lifeGen, LC, dungeonPlanner };
}
