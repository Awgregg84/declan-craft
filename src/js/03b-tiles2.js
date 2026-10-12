/* ===================== Pictures for the second wish list ===================== */
// Block pictures go in buildNewBlockTiles (before the item pictures, so they stay below 256 for the chunk
// meshes); item pictures in buildNewItemTiles; skins and models' pictures in buildNewSkins.
function buildNewBlockTiles() {
  // (blocks drawn specially still need their picture among the block pictures, which must stay under 256)
  addTile('sign_item', p => {
    shadeMask(p, mask((x, y) => (x > 1 && x < 15 && y > 1.5 && y < 9.5) || (x > 7 && x < 9.2 && y >= 9.5 && y < 15)), [C('#b8945a'), C('#d8b47a'), C('#7a5a32'), C('#3a2a14')], true);
    for (const y of [4, 6]) for (let x = 4; x < 12; x++) if ((x + y) % 4) p.px(x, y, C('#4a3218'));
  });
  addTile('brewing_item', p => {
    for (let y = 2; y < 14; y++) { p.px(7, y, C('#d8a84a')); p.px(8, y, C('#a87a2a')); }
    for (const [x0, y0] of [[2, 12], [10, 12], [6, 13]]) p.rect(x0, y0, 4, 2, (x, y) => y ? C('#4a4a4a') : C('#8a8a8a'));
    for (const x0 of [2, 11]) { p.rect(x0, 8, 3, 4, C('#c8dcf0')); p.rect(x0, 9, 3, 3, C('#e86a6a')); }
  });
  addTile('board_item', p => {   // an easel with a picture on it
    for (const [x0, x1] of [[3, 1], [12, 14]]) for (let y = 4; y < 16; y++) p.px(Math.round(x0 + (x1 - x0) * (y - 4) / 12), y, C('#6a4a26'));
    shadeMask(p, mask((x, y) => x > 1.5 && x < 14.5 && y > 0.5 && y < 11.5), [C('#f4f2ea'), C('#ffffff'), C('#c8c4b8'), C('#5a3a1a')], true);
    for (let x = 3; x < 13; x++) { p.px(x, 8, C(['#e83a3a', '#f08a2a', '#f6d53a', '#8ae04a', '#3a6ae8', '#9a4ae0'][x % 6])); p.px(x, 9, C('#3a9a3a')); p.px(x, 10, C('#3a9a3a')); }
    for (const [x, y] of [[10, 3], [11, 3], [10, 4], [11, 4], [9, 4], [12, 4], [10, 5], [11, 5]]) p.px(x, y, C('#f6d53a'));
  });
  const plastic = (p, edge) => p.fill((x, y) => edge && (x === 0 || y === 0 || x === 15 || y === 15) ? C('#1c1c20') : C(p.r() < 0.5 ? '#2c2c32' : '#2a2a30'));
  addTile('tv_front', p => {
    plastic(p, true);
    p.rect(2, 2, 12, 10, (x, y) => (x - y === 5 || x - y === 6) && y < 6 ? C('#222834') : C('#0e1018'));   // the screen, with a shine
    p.rect(1, 1, 14, 1, C('#3a3a42')); p.rect(1, 1, 1, 12, C('#3a3a42'));
    for (let x = 2; x < 9; x++) for (const y of [13, 14]) if ((x + y) % 2) p.px(x, y, C('#141418'));   // the speaker
    p.px(11, 13, C('#9a9a9a')); p.px(13, 13, C('#9a9a9a')); p.px(12, 14, C('#d83a3a'));
  });
  addTile('tv_side', p => plastic(p, true));
  addTile('tv_top', p => { plastic(p, true); for (const y of [4, 6, 8, 10]) p.rect(3, y, 10, 1, C('#141418')); });
  addTile('tv_back', p => { plastic(p, true); for (const y of [3, 5, 7, 9]) p.rect(4, y, 8, 1, C('#141418')); p.rect(5, 11, 6, 3, C('#c8c8c8')); });
  addTile('lapis_ore', p => paintOre(p, C('#2556c8'), C('#173a8c'), C('#7aa6ff')));
  addTile('lapis_block', p => {
    const f = vfield(p.r, 4);
    p.fill((x, y) => {
      if (x === 0 || y === 0) return C('#3a64c8');
      if (x === 15 || y === 15) return C('#12286a');
      const n = f(x, y), k = p.r();
      if (k < 0.05) return C('#d8e0f0');   // flecks of gold and white, as in real lapis
      if (k < 0.08) return C('#e8c44a');
      return mixc(C('#1a3a9a'), C('#2e5ad0'), n);
    });
  });
  const obsid = (p, x, y, f) => { let c = mixc(C('#0f0a18'), C('#2b1a40'), f(x, y)); if (p.r() < 0.06) c = C('#53357a'); return c; };
  addTile('ench_top', p => {
    const f = vfield(p.r, 5);
    p.fill((x, y) => {
      const e = Math.min(x, y, 15 - x, 15 - y);
      if (e < 2) return obsid(p, x, y, f);
      if ((x === 2 || x === 13) && (y === 2 || y === 13)) return C('#7af0ea');   // diamonds in the corners
      if (e === 2) return C('#5a0e0e');
      return p.jit((x + y) % 4 === 0 ? C('#9a2424') : C('#b22e2e'), 6);
    });
  });
  addTile('ench_side', p => {   // (the table is 12 tall: rows 4-15 show) a red cloth with a fringe over obsidian
    const f = vfield(p.r, 5);
    p.fill((x, y) => {
      if (y < 4) return null;
      if (y < 7 || (y === 7 && x % 3 !== 1)) return p.jit(y === 4 ? C('#d23a3a') : C('#a82626'), 6);
      if (y === 8 && x % 3 === 1) return C('#7a1818');
      return obsid(p, x, y, f);
    });
    for (const x of [2, 13]) p.px(x, 5, C('#7af0ea'));
  });
  addTile('brewing_base', p => p.fill((x, y) => (x === 0 || y === 0) ? C('#9a9a9a') : (x === 15 || y === 15) ? C('#4a4a4a') : p.jit(C('#6e6e6e'), 10)));
  addTile('brewing_rod', p => p.fill((x, y) => p.jit((x + y) % 5 === 0 ? C('#f0d070') : x % 4 === 0 ? C('#a87a2a') : C('#d8a84a'), 6)));
  addTile('sugar_cane', p => {
    for (const [x0, w, shade] of [[3, 2, 0.95], [7, 2, 1.05], [11, 2, 0.9]]) {
      for (let y = 0; y < 16; y++) for (let x = x0; x < x0 + w; x++) {
        const node = (y + x0) % 5 === 0;
        p.px(x, y, node ? mulc(C('#5e9a3a'), shade) : mulc(x === x0 ? C('#a6dc72') : C('#86c058'), shade));
      }
    }
    for (const [x, y] of [[5, 3], [6, 2], [9, 9], [10, 8], [2, 11], [1, 10], [13, 4], [14, 3]]) p.px(x, y, C('#7ab84a'));
  });
}

/* a glass bottle with a cork (and a colored potion in it); splash potions are rounder, with a short neck */
function potionBottle(p, liquid, splash) {
  const cy = splash ? 9.8 : 10.2, r = splash ? 5 : 4.6;
  shadeMask(p, mask((x, y) => (Math.hypot(x - 8, y - cy) < r) || (x > 6.2 && x < 9.8 && y > (splash ? 3.5 : 2.5) && y < 7)), [C('#c8dcf0'), C('#ffffff'), C('#8aa4c0'), C('#3a4a5a')], true);
  p.rect(7, splash ? 3 : 2, 2, 2, C('#8a6a3c'));   // the cork
  if (liquid) for (let y = 7; y < 15; y++) for (let x = 3; x < 14; x++) if (Math.hypot(x + 0.5 - 8, y + 0.5 - cy) < r - 0.9 && y > 7) p.px(x, y, (x + y) % 5 === 0 ? mixc(C(liquid), [255, 255, 255], 0.35) : C(liquid));
  if (splash) { p.px(3, 3, C('#e0f0ff')); p.px(13, 4, C('#e0f0ff')); p.px(2, 6, C('#e0f0ff')); }
}
function buildNewItemTiles() {
  addTile('sugar', p => {
    shadeMask(p, mask((x, y) => (y > 7 && Math.abs(x - 8) < (y - 6) * 0.9 + 1 && y < 14)), [C('#f4f4f4'), C('#ffffff'), C('#c8c8d0'), C('#7a7a84')], true);
    for (let k = 0; k < 6; k++) p.px(5 + p.ri(7), 9 + p.ri(4), C('#dedee8'));
  });
  addTile('paper', p => {
    shadeMask(p, mask(poly([[2.5, 3], [13.5, 2], [14, 13.5], [3, 14.2]])), [C('#f2f0e6'), C('#ffffff'), C('#cfcabc'), C('#7a7468')], true);
    for (let y = 5; y < 13; y += 2) for (let x = 5; x < 12; x++) if ((x + y) % 7) p.px(x, y, C('#b8c4d8'));
  });
  addTile('book', p => {
    shadeMask(p, mask(poly([[2, 4], [11, 2], [14, 11.5], [5, 14]])), [C('#7a3a1e'), C('#a8562e'), C('#4a200c'), C('#200a02')], true);
    for (let i = 0; i < 9; i++) { p.px(5 + i, 13 - i * 0.25, C('#f4ecd8')); p.px(5 + i, 12.4 - i * 0.25, C('#d8ccb0')); }
    p.px(7, 6, C('#e8c44a')); p.px(8, 6, C('#e8c44a')); p.px(9, 7, C('#e8c44a'));
  });
  addTile('lapis', p => {
    shadeMask(p, mask(poly([[4, 3], [11, 2.5], [13.5, 8], [10, 13.5], [4.5, 12.5], [2.5, 7.5]])), [C('#2556c8'), C('#5a8af0'), C('#163a8c'), C('#0a1a4a')], true);
    p.px(6, 5, C('#b4ccff')); p.px(7, 5, C('#b4ccff')); p.px(9, 10, C('#e8c44a'));
  });
  addTile('xp_bottle', p => { potionBottle(p, '#5ad83a', false); p.px(6, 9, C('#ffffff')); p.px(10, 11, C('#f0ff9a')); });
  addTile('glass_bottle', p => potionBottle(p, null, false));
  POTIONS.forEach((pt, k) => { addTile('potion_' + k, p => potionBottle(p, pt.color, false)); addTile('splash_' + k, p => potionBottle(p, pt.color, true)); });
  POTIONS.forEach((pt, k) => addTile('swirl_' + k, p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 4 ? mixc(C(pt.color), [255, 255, 255], d < 2 ? 0.45 : 0) : null; })));
  addTile('magma_cream', p => {
    shadeMask(p, mask(circle(8, 8.5, 5)), [C('#3a1a0a'), C('#5a2a10'), C('#1a0a04'), C('#0a0402')], true);
    for (const [x, y] of [[6, 7], [9, 6], [8, 9], [10, 10], [5, 10], [7, 11]]) p.px(x, y, C(p.r() < 0.5 ? '#ff9a2a' : '#ffd84a'));
  });
  // fish
  const fish = (p, body, belly, fin, eye) => {
    shadeMask(p, mask((x, y) => ((x - 8) * (x - 8)) / 30 + ((y - 8) * (y - 8)) / 9 < 1 && x > 2.5 || poly([[1, 4.5], [4, 8], [1, 11.5]])(x, y)), [C(body), mixc(C(body), [255, 255, 255], 0.3), C(belly), mulc(C(body), 0.4)], true);
    p.px(11, 7, C(eye || '#101010')); for (let x = 6; x < 11; x++) p.px(x, 5, C(fin));
  };
  addTile('cod', p => fish(p, '#c8a878', '#e8dcc0', '#a88858'));
  addTile('cooked_cod', p => fish(p, '#c88a4a', '#e8b878', '#8a5a2a'));
  addTile('salmon', p => fish(p, '#c84a3a', '#e88a6a', '#8a2a1a'));
  addTile('cooked_salmon', p => fish(p, '#b85a2a', '#d88a4a', '#7a3a14'));
  addTile('tropical_fish', p => { fish(p, '#f08a1a', '#ffffff', '#f0f0f0'); for (let y = 5; y < 12; y++) { p.px(7, y, C('#ffffff')); p.px(10, y, C('#ffffff')); } p.px(11, 7, C('#101010')); });
  addTile('pufferfish', p => {
    shadeMask(p, mask(circle(8, 8.5, 5.2)), [C('#e8c83a'), C('#fff08a'), C('#a88a1a'), C('#4a3a0a')], true);
    for (const [x, y] of [[3, 4], [12, 4], [2, 9], [14, 9], [4, 14], [11, 14], [8, 2]]) p.px(x, y, C('#f4f4e0'));
    p.px(10, 7, C('#101010')); p.px(6, 7, C('#101010'));
  });
  for (const cast of [0, 1]) addTile(cast ? 'fishing_rod_cast' : 'fishing_rod', p => {
    shadeMask(p, mask(capsule([[2, 14], [13.5, 2.5]], 1.6)), PAL.stick, true);
    if (!cast) { for (let y = 3; y < 13; y++) p.px(14, y, C('#e8e8e8')); p.px(14, 13, C('#9a9a9a')); p.px(13, 12, C('#9a9a9a')); }
  });
  addTile('xp_orb', p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 4.5 ? (d < 1.6 ? C('#ffffc0') : d < 3 ? C('#c8f04a') : C('#5aa81e')) : null; }));
  addTile('book_quill', p => {
    shadeMask(p, mask(poly([[1.5, 5], [10, 3], [12.5, 12.5], [4, 14.5]])), [C('#7a3a1e'), C('#a8562e'), C('#4a200c'), C('#200a02')], true);
    for (let i = 0; i < 8; i++) p.px(4 + i, 13.6 - i * 0.25, C('#f4ecd8'));
    shadeMask(p, mask(capsule([[8, 13], [14.5, 1.5]], 1.6)), [C('#f4f4f4'), C('#ffffff'), C('#b8b8c0'), C('#5a5a64')], true);   // the feather pen
    p.px(8, 13, C('#2a2a2a'));
  });
  addTile('written_book', p => {
    shadeMask(p, mask(poly([[2, 4], [11, 2], [14, 11.5], [5, 14]])), [C('#2a4a9a'), C('#4a6ac8'), C('#162a5a'), C('#08122a')], true);
    for (let i = 0; i < 9; i++) { p.px(5 + i, 13 - i * 0.25, C('#f4ecd8')); p.px(5 + i, 12.4 - i * 0.25, C('#d8ccb0')); }
    for (const [x, y] of [[6, 6], [7, 6], [8, 6], [9, 7], [6, 8], [7, 8], [8, 9]]) p.px(x, y, C('#e8c44a'));
  });
  addTile('bobber', p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 8.5); if (y < 4 && x === 7) return C('#3a3a3a'); return d < 4.5 ? (y < 8.5 ? (d < 2 && y < 7 ? C('#ff8a8a') : C('#d82a2a')) : C('#f4f4f4')) : null; }));
  addTile('bubble_p', p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 4.5 && d > 2.8 ? C('#e8f4ff') : d <= 2.8 && x < 7 && y < 7 ? C('#ffffff') : null; }));
  addTile('boat', p => {
    shadeMask(p, mask(capsule([[11.5, 1.5], [8.5, 8]], 0.8)), [C('#6b4a2a'), C('#8a6038'), C('#4a3018'), C('#1a0e04')], true);   // a paddle
    shadeMask(p, mask(poly([[0.5, 7], [15.5, 7], [13.5, 12.5], [2.5, 12.5]])), [C('#a8824e'), C('#d0a86a'), C('#6b4a2a'), C('#2a1a0a')], true);
    for (let x = 2; x < 14; x++) p.px(x, 9, C('#7a5a32'));
  });
  addTile('submarine', p => {
    const Y = [C('#f2c81a'), C('#ffe25a'), C('#b88a0a'), C('#3a2a04')];
    p.rect(7, 0, 1, 3, C('#5a5a5a')); p.px(8, 0, C('#5a5a5a'));   // the periscope
    shadeMask(p, mask(poly([[5.5, 3], [9.5, 3], [10, 6.5], [5, 6.5]])), Y, true);   // the tower
    shadeMask(p, mask(capsule([[4, 9.5], [12, 9.5]], 3.3)), Y, true);
    for (const cx of [6, 9, 12]) { p.px(cx, 9, C('#9ae4ff')); p.px(cx, 10, C('#3a8ab8')); }   // portholes
    p.rect(0, 8, 1, 4, C('#8a8a8a')); p.px(1, 10, C('#5a5a5a'));   // the propeller
  });
  addTile('glyph', p => glyphs(p, 5, 4, ['#.#.#', '.###.', '#.#.#', '..#..', '.#.#.', '#...#', '.###.', '..#..'], C('#f0f0ff')));
}

function buildNewSkins() {
  for (const k of LOOK_LAYERS) addSkin(k, S => paintLook(S, DEFAULT_LOOK));   // (made characters are painted into these)
  // fish: the eyes go near the front (the +z end) of each side
  const fishSkin = (name, w, h, d, body, top, belly, eye, extra) => addSkin(name, S => {
    paintBox(S, 0, 0, w, h, d, (f, x, y, fw, fh) => {
      if ((f === 'right' && x === fw - 2 || f === 'left' && x === 1) && y === 1) return C(eye || '#101010');
      if (f === 'top') return S.jit(C(top), 6);
      if (f === 'bottom') return S.jit(C(belly), 5);
      if (f !== 'front' && f !== 'back' && y === fh - 1) return S.jit(C(belly), 5);
      return S.jit(C(body), 7);
    });
    paintBox(S, 0, 16, 1, h, 3, () => S.jit(C(top), 6));   // tail
    paintBox(S, 32, 0, 1, 2, 3, () => S.jit(C(top), 6));   // fin
    if (extra) extra(S);
  });
  fishSkin('cod', 2, 3, 7, '#c8a878', '#9a7a4a', '#e8dcc0');
  fishSkin('salmon', 3, 4, 9, '#c84a3a', '#5a6a5a', '#e88a6a');
  fishSkin('tropical', 2, 4, 5, '#ffffff', '#e0e0e0', '#f4f4f4', '#101010', S => { for (let y = 0; y < 16; y++) for (const x of [4, 9]) S.px(x, y, C('#7a7a7a')); });
  addSkin('pufferfish', S => {
    paintBox(S, 0, 0, 4, 4, 4, (f, x, y, fw, fh) => {
      if (f === 'front' && y === 1 && (x === 0 || x === 3)) return C('#101010');
      if (f === 'front' && y === 3 && (x === 1 || x === 2)) return C('#e88a4a');
      if ((x + y * 3) % 5 === 0) return C('#f4f4e0');   // spines
      return f === 'bottom' ? C('#f0e8b0') : S.jit(C('#e8c83a'), 8);
    });
    paintBox(S, 0, 16, 1, 2, 1, () => C('#3ac3e8'));   // fins
  });
  // a wooden boat: boards everywhere, and darker paddles
  addSkin('boat', S => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      if (y >= 48) { S.px(x, y, S.jit(C('#6b4a2a'), 5)); continue; }
      S.px(x, y, y % 4 === 3 || (x + (y >> 2) * 7) % 16 === 0 ? C('#7a5a32') : S.jit(C('#a8824e'), 6));
    }
  });
  // a yellow submarine: round windows along the sides, a lamp on the nose, a grey propeller and periscope
  addSkin('submarine', S => {
    const Y = C('#f2c81a'), YL = C('#ffe25a'), YD = C('#c89a10');
    const paint = (f, x, y, fw, fh) => f === 'top' ? S.jit(YL, 4) : f === 'bottom' ? S.jit(C('#8a6a10'), 4) : y === fh - 1 ? YD : S.jit(Y, 4);
    paintBox(S, 0, 0, 14, 9, 18, (f, x, y, fw, fh) => {   // the hull, with portholes
      if (f === 'left' || f === 'right') for (const cx of [4, 9, 14]) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - 4); if (d < 1.6) return C('#9ae4ff'); if (d < 2.4) return C('#5a5a5a'); }
      if ((f === 'left' || f === 'right') && y === 7) return YD;
      return paint(f, x, y, fw, fh);
    });
    paintBox(S, 0, 28, 10, 7, 3, (f, x, y, fw, fh) => f === 'front' && Math.hypot(x + 0.5 - 5, y + 0.5 - 3) < 1.8 ? C('#fffbd0') : paint(f, x, y, fw, fh));   // the nose, with its lamp
    paintBox(S, 28, 28, 8, 5, 3, paint);   // the tail
    paintBox(S, 0, 40, 6, 3, 5, paint);    // the tower
    paintBox(S, 24, 40, 1, 5, 1, () => C('#5a5a5a'));   // the periscope
    paintBox(S, 30, 40, 1, 1, 3, (f) => f === 'front' ? C('#9ae4ff') : C('#5a5a5a'));
    paintBox(S, 40, 40, 3, 1, 4, paint);   // fins
    paintBox(S, 54, 40, 1, 5, 2, paint);   // the rudder
    paintBox(S, 0, 50, 2, 2, 3, () => C('#6a6a6a'));   // the propeller
    paintBox(S, 8, 50, 7, 1, 1, () => S.jit(C('#9a9a9a'), 6));
    paintBox(S, 24, 50, 1, 7, 1, () => S.jit(C('#9a9a9a'), 6));
  });
  // its glass dome: see-through, with a yellow frame and a shine
  addSkin('sub_glass', S => {
    paintBox(S, 0, 0, 12, 12, 11, (f, x, y, fw, fh) => {
      if (f === 'bottom') return null;
      if (x === 0 || x === fw - 1 || (f !== 'top' && (y === 0 || y === fh - 1))) return C('#e8b81a');
      if ((f === 'front' || f === 'right' || f === 'left') && Math.abs(x - y - 2) < 1) return [255, 255, 255, 150];
      return [190, 238, 255, 70];
    });
  });
  // coloring boards: a light wooden frame, legs, a ledge
  addSkin('board_wood', S => {
    const wood = () => S.jit(C('#c8a06a'), 6);
    paintBox(S, 0, 0, 18, 18, 1, (f, x, y, fw, fh) => f === 'front' ? (x === 0 || y === 0 || x === fw - 1 || y === fh - 1 ? C('#a87a46') : C('#f4f2ea')) : wood());
    paintBox(S, 40, 0, 1, 23, 1, () => S.jit(C('#8a6238'), 6));
    paintBox(S, 0, 24, 18, 1, 2, wood);
  });
  // signs: oak boards on a post
  addSkin('sign', S => {
    const wood = (f, x, y, fw, fh) => (y === fh - 1 || x === 0 || x === fw - 1) ? S.jit(C('#8a6a3c'), 4) : S.jit((y + (x >> 2)) % 4 === 3 ? C('#9a7a48') : C('#b8945a'), 5);
    paintBox(S, 0, 0, 16, 8, 2, wood);
    paintBox(S, 0, 16, 2, 8, 2, () => S.jit(C('#6b5132'), 6));
  });
  // the book floating over an enchanting table: leather covers with gold edges, and pages with lines of writing
  addSkin('ench_book', S => {
    const cover = (f, x, y, fw, fh) => (x === 0 || y === 0 || x === fw - 1 || y === fh - 1) ? C('#c89a3a') : S.jit(C('#7a3a1e'), 6);
    const page = (f, x, y, fw, fh) => f === 'top' ? (y % 2 === 1 && x > 0 && x < fw - 1 && (x * 7 + y * 3) % 5 ? C('#5a4a3a') : S.jit(C('#f4ecd8'), 4)) : C('#e4dcc4');
    paintBox(S, 0, 0, 6, 1, 9, cover);
    paintBox(S, 0, 12, 6, 1, 9, cover);
    paintBox(S, 32, 0, 5, 1, 8, page);
    paintBox(S, 32, 12, 5, 1, 8, page);
  });
}
