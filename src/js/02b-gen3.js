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

  return { moonGen, hogwartsGen, HW, dungeonPlanner };
}
