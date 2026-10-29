/* ===================== Pictures for the third wish list ===================== */
// Block pictures go in buildBlockTiles3 (called right after buildNewBlockTiles, so they stay below 256 for the
// chunk meshes); item pictures in buildItemTiles3; skins for creatures, vehicles and models in buildSkins3.
function buildBlockTiles3() {
  // coral blocks: bumpy, with little dark holes where the coral animals live
  const coral = (p, base, light, dark) => {
    const v = vor(p.r, 11);
    p.fill((x, y) => { const q = v(x, y); return q.d1 < 1.05 ? dark : q.d2 - q.d1 < 0.8 ? mulc(base, 0.84) : p.r() < 0.22 ? light : p.jit(base, 8); });
  };
  addTile('coral_red', p => coral(p, C('#e0485a'), C('#ff8c98'), C('#7a1424')));
  // a security camera (its picture in your bag), and the camera monitor: grey, with a screen and a green light
  addTile('camera_item', p => {
    p.rect(7, 10, 2, 3, C('#7a8088')); p.rect(5, 13, 6, 2, C('#5a5f68'));
    p.rect(4, 4, 9, 6, C('#eceef2')); p.rect(4, 9, 9, 1, C('#c4c8d0')); p.rect(12, 4, 1, 6, C('#d4d8de'));
    p.rect(1, 5, 3, 4, C('#2a2d33')); p.rect(2, 6, 1, 2, C('#3a6ac8')); p.px(2, 6, C('#8ab0ff'));
    p.px(11, 5, C('#ff3a2a'));
  });
  // dungeons: a monster spawner's dark iron cage, old cracked stone bricks, and iron bars
  addTile('spawner', p => p.fill((x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15, bar = x % 5 === 0 || y % 5 === 0;
    if (!edge && !bar) return null;
    return (x + y) % 7 === 0 ? C('#4a525c') : edge ? C('#1a1d22') : C('#2c3138');
  }));
  addTile('cracked_bricks', p => p.fill((x, y) => {
    const row = y >> 3, xx = (x + (row ? 4 : 0)) & 15;
    const crack = (y === 2 && x >= 3 && x <= 5) || (y === 3 && (x === 5 || x === 6)) || (y === 4 && x === 6) || (y === 10 && x >= 9 && x <= 10) || (y === 11 && x >= 10 && x <= 12) || (y === 12 && x === 12) || (x === 2 && y >= 12 && y <= 13);
    if (y % 8 === 7 || xx === 15 || crack) return p.jit(C('#4e4e4e'), 4);
    let v = 116 + p.r() * 14;
    if (y % 8 === 0 || xx === 0) v += 16; else if (y % 8 === 6 || xx === 14) v -= 18;
    return [v, v, v];
  }));
  addTile('iron_bars', p => p.fill((x, y) => {
    const bar = x % 5 === 2 || x % 5 === 3, rail = y === 0 || y === 15 || y === 7;
    if (!bar && !rail) return null;
    return bar && x % 5 === 2 ? C('#c4cad2') : rail && !bar ? C('#7a8088') : C('#8e959e');
  }));
  const grey = (p, edge) => p.fill((x, y) => edge && (x === 0 || y === 0 || x === 15 || y === 15) ? C('#2e3238') : C(p.r() < 0.5 ? '#50565f' : '#4c525a'));
  addTile('monitor_front', p => {
    grey(p, true);
    p.rect(2, 2, 12, 10, (x, y) => (x - y === 5 || x - y === 6) && y < 6 ? C('#1a2a22') : C('#0a140e'));   // the screen
    p.rect(1, 1, 14, 1, C('#6a717c')); p.rect(1, 1, 1, 12, C('#6a717c'));
    for (const x of [3, 5, 7]) p.px(x, 13, C('#2a2e34'));   // buttons
    p.px(12, 13, C('#3aff6a')); p.px(13, 13, C('#2ac04a'));   // the light
  });
  addTile('monitor_side', p => grey(p, true));
  addTile('monitor_top', p => { grey(p, true); for (const y of [4, 6, 8, 10]) p.rect(3, y, 10, 1, C('#2a2e34')); });
  addTile('monitor_back', p => { grey(p, true); for (const y of [3, 5, 7, 9]) p.rect(4, y, 8, 1, C('#2a2e34')); p.rect(6, 11, 4, 2, C('#c8c8c8')); });
  addTile('coral_yellow', p => coral(p, C('#f0c43a'), C('#ffe88c'), C('#94700c')));
  addTile('coral_blue', p => coral(p, C('#3a78e6'), C('#8cbaff'), C('#16367e')));
  // a flag (its picture is a block picture: blocks' pictures must come first)
  addTile('flag_item', p => {
    p.rect(3, 1, 1, 15, C('#9a9a9a')); p.px(3, 0, C('#d0d0d0'));
    for (let y = 2; y < 9; y++) for (let x = 4; x < 15; x++) p.px(x, y, ((y - 2) % 2 === 0) ? C('#d82a2a') : C('#ffffff'));
    for (let y = 2; y < 6; y++) for (let x = 4; x < 9; x++) p.px(x, y, (x + y) % 2 ? C('#2a3a9a') : C('#ffffff'));
  });
  // Hogwarts: slate roof tiles, stained glass, a floating candle and the Sorting Hat
  addTile('slate', p => p.fill((x, y) => { const row = y >> 2, off = (row & 1) * 4, edge = y % 4 === 3 || (x + off) % 8 === 0; return edge ? C('#262c3a') : p.jit(row % 2 ? C('#4a5468') : C('#535e74'), 6); }));
  addTile('stained_glass', p => {
    const cols = [C('#d8382a'), C('#2a5ad8'), C('#f2c81e'), C('#3aa84a'), C('#9a3ad8'), C('#2ab0d0')];
    p.fill((x, y) => (x % 5 === 0 || y % 5 === 0 || x === 15 || y === 15 ? C('#2a2a2a') : p.jit(cols[(((x / 5) | 0) * 3 + ((y / 5) | 0) * 2) % cols.length], 10)));
  });
  addTile('candle_item', p => { p.rect(7, 6, 3, 9, C('#f4f0e0')); p.rect(9, 6, 1, 9, C('#d8d0b8')); p.px(8, 5, C('#2a2a2a')); p.rect(7, 2, 3, 3, C('#ffb030')); p.px(8, 1, C('#fff2a0')); p.px(8, 3, C('#fff2a0')); });
  addTile('sorting_hat_item', p => {
    shadeMask(p, mask(poly([[1, 14], [15, 14], [12, 11], [10, 4], [6, 1], [7, 6], [4, 11]])), [C('#7a5a3a'), C('#9a7a52'), C('#5a3e24'), C('#2a1a0a')], true);
    p.px(7, 9, C('#3a2414')); p.px(9, 9, C('#3a2414')); p.rect(7, 11, 3, 1, C('#3a2414'));
  });
  // the Moon: fine grey dust, darker rock with little craters, and cheese full of holes
  addTile('moon_dust', p => { const f = vfield(p.r, 4); p.fill((x, y) => { const v = 178 + f(x, y) * 16 + (p.r() * 16 - 8); return p.r() < 0.06 ? [v - 40, v - 40, v - 38] : p.r() < 0.05 ? [v + 22, v + 22, v + 22] : [v, v, v - 4]; }); });
  addTile('moon_rock', p => {
    const v = vor(p.r, 5), f = vfield(p.r, 4);
    p.fill((x, y) => { const q = v(x, y), g = 128 + f(x, y) * 22 + (p.r() * 12 - 6); return q.d1 < 1.4 + q.v * 1.2 ? [g - 34, g - 34, g - 30] : q.d1 < 2.1 + q.v * 1.2 && q.dy < 0 ? [g + 24, g + 24, g + 22] : [g, g, g - 3]; });
  });
  addTile('moon_cheese', p => {
    const holes = [[3, 4, 2.2], [11, 3, 1.6], [8, 10, 2.6], [2, 12, 1.4], [13, 12, 1.8], [12, 7.5, 1]];
    p.fill((x, y) => {
      for (const [hx, hy, hr] of holes) { const d = Math.hypot(x + 0.5 - hx, y + 0.5 - hy); if (d < hr) return y + 0.5 < hy ? C('#a8781a') : C('#c8922a'); if (d < hr + 0.8 && y + 0.5 > hy) return C('#ffe88a'); }
      return p.jit(C('#f2c84a'), 6);
    });
  });
}
function buildItemTiles3() {
  // the weather: rain streaks and snowflakes (drawn on sheets that scroll down, so they wrap around top to bottom),
  // the glow of a lightning bolt, and a splash of rain on the ground
  addTile('rain', p => {   // (half a block wide and one block tall: each drop is a thin streak)
    for (let i = 0; i < 9; i++) {
      const x = (i * 7 + p.ri(2)) & 15, y = p.ri(16), len = 4 + p.ri(4);
      for (let k = 0; k < len; k++) p.px(x, (y + k) & 15, k === len - 1 ? [215, 228, 255] : [160, 182, 230], 50 + Math.round((k / (len - 1)) * 150));
    }
  });
  addTile('snowfall', p => {   // (half a block each way: little flakes)
    for (let i = 0; i < 5; i++) {
      const x = (i * 5 + p.ri(3)) & 15, y = (i * 13 + p.ri(4)) & 15, big = i % 2 === 0;
      p.px(x, y, [255, 255, 255], 250);
      if (big) { p.px((x + 1) & 15, y, [238, 242, 252], 235); p.px(x, (y + 1) & 15, [238, 242, 252], 235); p.px((x + 1) & 15, (y + 1) & 15, [220, 228, 242], 215); }
    }
    for (let i = 0; i < 3; i++) p.px(p.ri(16), p.ri(16), [240, 245, 255], 170);
  });
  addTile('bolt', p => p.fill((x, y) => { const d = Math.abs(x - 7.5); return d < 1 ? [255, 255, 255, 255] : d < 2 ? [225, 220, 255, 220] : d < 3 ? [185, 175, 255, 140] : d < 4.5 ? [150, 140, 255, 60] : null; }));
  // the flying car (with its wings out) and a broomstick
  addTile('flycar', p => {
    shadeMask(p, mask(poly([[0.5, 4.5], [5, 4.5], [5, 6], [0.5, 6]])), [C('#f4f4f4'), C('#ffffff'), C('#c8c8c8'), C('#5a5a5a')], true);   // a wing behind
    shadeMask(p, mask(poly([[0.8, 8.5], [4, 8.5], [5.5, 4.5], [11, 4.5], [13, 8.5], [15.2, 9], [15.2, 12.5], [0.8, 12.5]])), [C('#2a8ef0'), C('#6ab8ff'), C('#1a5aa8'), C('#0a2a5a')], true);
    p.rect(6, 5, 2, 3, C('#bfe8ff')); p.rect(9, 5, 2, 3, C('#bfe8ff'));
    shadeMask(p, mask(poly([[3, 9.5], [9, 9.5], [7.5, 11.5], [1, 11.5]])), [C('#f4f4f4'), C('#ffffff'), C('#c8c8c8'), C('#5a5a5a')], true);   // the wing in front
    p.px(1, 10, C('#e8402a')); p.px(1, 11, C('#e8402a'));
    p.px(14, 9, C('#fff3a0')); p.px(0, 9, C('#ff8a20'));
    for (const cx of [4, 12]) shadeMask(p, mask(circle(cx, 13, 2)), [C('#2a2a2a'), C('#4a4a4a'), C('#141414'), C('#050505')], true);
  });
  addTile('broom', p => {
    shadeMask(p, mask(capsule([[14.5, 1.5], [6.5, 9.5]], 1.6)), [C('#8a5a30'), C('#b07a48'), C('#5a3a20'), C('#2a1a0a')], true);
    shadeMask(p, mask(poly([[6.5, 7.5], [8.5, 9.5], [4, 15.5], [0.5, 15.5], [0.5, 12]])), [C('#c8a050'), C('#e8c878'), C('#8a6a30'), C('#4a3410')], true);
    p.px(6, 9, C('#3a2a1a')); p.px(7, 10, C('#3a2a1a')); p.px(5, 8, C('#3a2a1a'));
    for (const [x, y] of [[2, 14], [3, 13], [1, 13], [4, 14]]) p.px(x, y, C('#a8803a'));
  });
  // the rocket, the space helmet, a wedge of moon cheese and a flag
  addTile('rocket', p => {
    shadeMask(p, mask(poly([[7.5, 0.5], [10, 4], [10, 11], [5, 11], [5, 4]])), [C('#f4f4f4'), C('#ffffff'), C('#c4c4c4'), C('#4a4a4a')], true);
    shadeMask(p, mask(poly([[7.5, 0.5], [9.4, 3.2], [5.6, 3.2]])), [C('#e8402a'), C('#ff7a5a'), C('#a82a1a'), C('#4a0a04')], true);
    shadeMask(p, mask(poly([[5, 8], [2, 13], [5, 12]])), [C('#e8402a'), C('#ff7a5a'), C('#a82a1a'), C('#4a0a04')], true);
    shadeMask(p, mask(poly([[10, 8], [13, 13], [10, 12]])), [C('#e8402a'), C('#ff7a5a'), C('#a82a1a'), C('#4a0a04')], true);
    shadeMask(p, mask(circle(7.5, 6, 1.3)), [C('#4ab0f0'), C('#a8e0ff'), C('#2a70b0'), C('#0a2040')], false);
    p.rect(6, 11, 3, 1, C('#5a5a5a')); p.px(7, 12, C('#ffb030')); p.px(6, 13, C('#ff7020')); p.px(8, 13, C('#ff7020')); p.px(7, 14, C('#ffd060'));
  });
  addTile('space_helmet', p => {
    shadeMask(p, mask(circle(8, 8.5, 6.5)), [C('#f0f0f0'), C('#ffffff'), C('#c0c0c0'), C('#3a3a3a')], true);
    shadeMask(p, mask(poly([[4, 6], [12, 6], [12.5, 10.5], [3.5, 10.5]])), [C('#e0a830'), C('#ffe080'), C('#a07010'), C('#3a2a04')], true);
    p.px(5, 7, C('#fff8d0')); p.px(6, 7, C('#fff8d0')); p.rect(5, 13, 6, 1, C('#9a9a9a'));
  });
  addTile('cheese', p => {
    shadeMask(p, mask(poly([[1, 12.5], [15, 12.5], [15, 6], [3, 4]])), [C('#f2c84a'), C('#ffe88a'), C('#c8922a'), C('#5a3a08')], true);
    for (const [x, y] of [[5, 8], [9, 10], [12, 8], [7, 11]]) { p.px(x, y, C('#b07a18')); p.px(x + 1, y, C('#c8922a')); }
  });
  // a robot: its silver head and glowing eyes, its body and legs
  addTile('robot', p => {
    p.rect(7, 0, 2, 2, C('#ffd23a')); p.rect(7, 2, 2, 1, C('#3a3f48'));
    p.rect(4, 3, 8, 5, C('#c8ced8')); p.rect(4, 7, 8, 1, C('#a8b0bc')); p.rect(5, 4, 6, 2, C('#1a2430')); p.px(6, 4, C('#7af6ff')); p.px(9, 4, C('#7af6ff'));
    p.rect(5, 8, 6, 4, C('#ff5a4a')); p.rect(6, 9, 4, 2, C('#c83a2a'));
    p.rect(3, 8, 2, 3, C('#9aa2ae')); p.rect(11, 8, 2, 3, C('#9aa2ae'));
    p.rect(5, 12, 2, 3, C('#9aa2ae')); p.rect(9, 12, 2, 3, C('#9aa2ae')); p.rect(5, 15, 2, 1, C('#3a3f48')); p.rect(9, 15, 2, 1, C('#3a3f48'));
  });
  // a book of building plans: blue, with a little house on the front
  addTile('plan_book', p => {
    shadeMask(p, mask(poly([[2.5, 2], [13.5, 2], [13.5, 14.5], [2.5, 14.5]])), [C('#2a5ac8'), C('#4a7ae8'), C('#1a3a8a'), C('#0a1a4a')], true);
    p.rect(3, 3, 1, 11, C('#f0e8d0'));
    for (const [x, y] of [[8, 5], [7, 6], [9, 6], [6, 7], [10, 7]]) p.px(x, y, C('#ffffff'));
    p.rect(6, 8, 5, 4, C('#ffffff')); p.rect(8, 10, 1, 2, C('#2a5ac8'));
  });
  // a magic wand: dark polished wood with a carved handle
  addTile('wand', p => {
    shadeMask(p, mask(capsule([[13.5, 2.5], [4, 12]], 1.4)), [C('#4a2e1a'), C('#7a5232'), C('#2a180c'), C('#120804')], true);
    shadeMask(p, mask(capsule([[5.5, 10.5], [2.5, 13.5]], 2.4)), [C('#6a4226'), C('#9a6a40'), C('#3a2414'), C('#140a04')], true);
    p.px(4, 11, C('#c8a060')); p.px(3, 12, C('#c8a060')); p.px(14, 2, C('#e8d8b0'));
  });
  addTile('drip', p => p.fill((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 5 ? (d < 2.5 ? [235, 245, 255] : [170, 200, 245]) : null; }));
}

function buildSkins3() {
  // the Golden Snitch, the Sorting Hat (on its stool) and a candle
  addSkin('snitch', S => {
    paintBox(S, 0, 0, 3, 3, 3, (f, x, y) => ((x + y) % 3 === 0 ? C('#b8860b') : x === 0 && y === 0 ? C('#fff2a0') : C('#f2c83a')));
    paintBox(S, 12, 0, 5, 1, 3, (f, x) => (x % 2 ? C('#e8e8f0') : C('#c8c8d8')));
  });
  addSkin('sorting_hat', S => {
    const leather = () => { const r = S.r(); return r < 0.15 ? C('#5a3e24') : r < 0.3 ? C('#8a6a44') : C('#7a5a3a'); };
    paintBox(S, 0, 0, 14, 1, 14, leather);
    paintBox(S, 0, 16, 8, 5, 8, (f, x, y) => (f === 'front' && ((y === 1 && (x === 2 || x === 5)) || (y === 3 && x >= 2 && x <= 5)) ? C('#2a1a0a') : leather()));   // its eyes and mouth (creases)
    paintBox(S, 32, 16, 5, 4, 5, leather); paintBox(S, 52, 16, 3, 3, 3, leather);
    paintBox(S, 0, 32, 10, 2, 10, () => S.jit(C('#8a5a30'), 6)); paintBox(S, 40, 32, 2, 9, 2, () => S.jit(C('#6a4422'), 6));
  });
  addSkin('candle', S => {
    paintBox(S, 0, 0, 2, 7, 2, (f, x, y) => (y < 2 && x === 0 ? C('#e8e0c8') : C('#f6f2e4')));
    paintBox(S, 8, 0, 1, 1, 1, () => C('#2a2a2a'));
    paintBox(S, 12, 0, 1, 2, 1, (f, x, y) => (y === 0 ? C('#fff2a0') : C('#ffa030')));
  });
  // a Patronus: a stag made of silvery-blue light (drawn glowing and see-through)
  addSkin('patronus', S => {
    const glow = (f, x, y) => { const r = S.r(); return r < 0.15 ? C('#ffffff') : r < 0.5 ? C('#d8ecff') : C('#a8d0ff'); };
    paintBox(S, 0, 0, 6, 6, 14, glow); paintBox(S, 40, 0, 3, 6, 3, glow); paintBox(S, 0, 20, 4, 4, 6, (f, x, y) => (f === 'front' && y === 1 && (x === 0 || x === 3) ? C('#4a7ad0') : glow()));
    paintBox(S, 20, 20, 1, 5, 1, () => C('#ffffff')); paintBox(S, 28, 20, 3, 1, 1, () => C('#ffffff'));
    paintBox(S, 52, 0, 2, 10, 2, glow); paintBox(S, 24, 26, 2, 2, 2, glow);
  });
  // the rocket: white with a red nose and fins, a round window, and the engine underneath
  addSkin('rocket', S => {
    const white = C('#f2f2f2'), whiteD = C('#c8c8c8'), red = C('#e0382a'), redD = C('#a02418'), grey = C('#7a7a7a');
    paintBox(S, 0, 0, 8, 20, 8, (f, x, y) => {
      if (f === 'front' && Math.hypot(x + 0.5 - 4, y + 0.5 - 5) < 2.4) return Math.hypot(x + 0.5 - 4, y + 0.5 - 5) < 1.7 ? (x < 4 && y < 5 ? C('#c8f0ff') : C('#3a8ad0')) : C('#9a9a9a');   // the window
      if (y === 1 || y === 14) return red;   // stripes
      return (x + y) % 9 === 0 ? whiteD : S.jit(white, 3);
    });
    paintBox(S, 32, 0, 6, 3, 6, (f, x, y) => (y === 2 ? redD : S.jit(red, 4)));
    paintBox(S, 32, 10, 4, 2, 4, () => S.jit(red, 4));
    paintBox(S, 48, 10, 2, 2, 2, () => S.jit(redD, 4));
    paintBox(S, 32, 17, 3, 8, 1, (f, x, y) => (y === 7 ? redD : S.jit(red, 4)));
    paintBox(S, 40, 17, 1, 8, 3, (f, x, y) => (y === 7 ? redD : S.jit(red, 4)));
    paintBox(S, 0, 29, 6, 3, 6, (f, x, y) => (y === 2 ? C('#4a4a4a') : S.jit(grey, 5)));
    paintBox(S, 24, 29, 4, 3, 4, (f, x, y) => (f === 'bottom' ? C('#ff9a30') : y === 2 ? C('#3a3a3a') : S.jit(C('#5a5a5a'), 5)));
  });
  // a space helmet: white, with a big gold visor at the front
  addSkin('space_helmet', S => paintBox(S, 0, 0, 8, 8, 8, (f, x, y) => {
    if (f === 'front' && x >= 1 && x <= 6 && y >= 2 && y <= 6) return x <= 2 && y <= 3 ? C('#fff2b0') : (x + y) % 5 === 0 ? C('#e8b840') : C('#d09a20');
    if (y === 7) return C('#a8a8a8');
    return S.jit(C('#f2f2f2'), 3);
  }));
  // a flag on a pole (with a rod along the top to hold it out: there's no wind on the Moon)
  // a robot: a silver head with a dark visor and glowing eyes, a white body (coloured when drawn), dark joints
  addSkin('robot', S => {
    const metal = C('#c8ced8'), dark = C('#3a3f48');
    paintBox(S, 0, 0, 6, 5, 6, (f, x, y) => {
      if (f === 'front') { if (y >= 1 && y <= 2 && x >= 1 && x <= 4) return (x === 1 || x === 4) ? C('#7af6ff') : C('#1a2430'); if (y === 4 && x >= 2 && x <= 3) return dark; }
      if ((f === 'left' || f === 'right') && y >= 1 && y <= 2 && x >= 2 && x <= 3) return C('#8a929e');   // (its ears)
      return f === 'top' ? S.jit(C('#dfe4ea'), 3) : y === 4 ? C('#a8b0bc') : S.jit(metal, 3);
    });
    paintBox(S, 24, 0, 1, 2, 1, () => dark);
    paintBox(S, 28, 0, 2, 2, 2, (f, x, y) => (x === 0 && y === 0 ? C('#ffffff') : C('#e8e8e8')));
    paintBox(S, 0, 12, 6, 5, 4, (f, x, y) => {
      if (f === 'front' && y >= 1 && y <= 3 && x >= 1 && x <= 4) return (x + y) % 2 ? C('#8a8a8a') : C('#b8b8b8');   // a panel of buttons
      return y === 4 ? C('#bdbdbd') : S.jit(C('#f2f2f2'), 3);
    });
    for (const u of [24, 32]) paintBox(S, u, 12, 2, 5, 2, (f, x, y) => (y === 4 ? dark : S.jit(metal, 3)));
    for (const u of [40, 48]) paintBox(S, u, 12, 2, 4, 2, (f, x, y) => (y === 3 ? C('#2a2e34') : S.jit(C('#9aa2ae'), 3)));
  });
  // a security camera: white, with a dark lens and a red light; grey metal stand and arm
  addSkin('camera', S => {
    const white = C('#eceef2'), shade = C('#c4c8d0'), metal = C('#8a9098');
    paintBox(S, 0, 0, 4, 4, 7, (f, x, y, fw, fh) => (f === 'top' && x === 3 && y === 6 ? C('#ff3a2a') : f === 'bottom' ? shade : y === fh - 1 && f !== 'top' ? shade : S.jit(white, 3)));
    paintBox(S, 24, 0, 3, 3, 1, (f, x, y) => (f === 'front' ? (x === 1 && y === 1 ? C('#3a6ac8') : x === 0 && y === 0 ? C('#5a5e66') : C('#16181c')) : C('#2a2d33')));
    paintBox(S, 0, 16, 4, 1, 4, () => S.jit(C('#5a5f68'), 4));
    paintBox(S, 20, 16, 1, 6, 1, () => S.jit(metal, 5));
    paintBox(S, 28, 16, 3, 3, 1, () => S.jit(C('#5a5f68'), 4));
    paintBox(S, 40, 16, 1, 1, 4, () => S.jit(metal, 5));
  });
  addSkin('flag', S => {
    paintBox(S, 0, 0, 1, 30, 1, () => S.jit(C('#b8b8b8'), 6));
    paintBox(S, 4, 0, 14, 9, 1, (f, x, y) => {
      if (f !== 'front' && f !== 'back') return C('#e8e8e8');
      const xx = f === 'back' ? 13 - x : x;   // (the canton is next to the pole on both sides)
      if (xx < 6 && y < 5) return (xx + y) % 2 ? C('#22348a') : C('#ffffff');
      return y % 2 ? C('#ffffff') : C('#d22a2a');
    });
    paintBox(S, 4, 12, 14, 1, 1, () => C('#d0d0d0'));
  });
  // the flying car: the car's shape painted sky blue, with white wings (red tips), a tail fin and two jets
  addSkin('flycar', S => {
    const blue = C('#2a8ef0'), blueLt = C('#6ab8ff'), blueDk = C('#1a5aa8');
    const paint = (f, x, y, fw, fh) => f === 'top' ? S.jit(blueLt, 4) : f === 'bottom' ? C('#2a2a2a') : y === fh - 1 ? blueDk : y === 0 && f !== 'front' && f !== 'back' ? C('#f2d21e') : S.jit(blue, 4);
    paintBox(S, 0, 0, 11, 2, 18, (f, x, y, fw, fh) => f === 'top' ? S.jit(C('#3a3a3a'), 4) : paint(f, x, y, fw, fh));
    paintBox(S, 0, 20, 1, 3, 18, paint);
    paintBox(S, 0, 41, 9, 3, 6, (f, x, y, fw, fh) => {
      if (f === 'front' && y === 1 && (x <= 1 || x >= fw - 2)) return C('#fff3a0');
      if (f === 'front' && y >= 1 && x >= 3 && x <= fw - 4) return (x % 2) ? C('#3a3a3a') : C('#c8c8c8');
      return paint(f, x, y, fw, fh);
    });
    paintBox(S, 30, 41, 9, 3, 5, paint);
    paintBox(S, 0, 50, 8, 1, 4, () => S.jit(C('#f0f0f0'), 6));
    paintBox(S, 24, 50, 8, 4, 1, () => S.jit(C('#dcdcdc'), 6));
    paintBox(S, 42, 50, 9, 3, 1, (f, x, y, fw) => (f === 'front' || f === 'back') && x > 0 && x < fw - 1 && y > 0 ? null : C('#e8e8e8'));
    paintBox(S, 0, 56, 1, 3, 3, (f, x, y) => (f === 'left' || f === 'right') ? (x === 1 && y === 1 ? C('#f2d21e') : C('#1e1e1e')) : C('#2a2a2a'));
    paintBox(S, 8, 56, 2, 2, 1, () => C('#1a1a1a'));
    paintBox(S, 14, 56, 9, 1, 1, (f, x) => f === 'back' && (x <= 1 || x >= 7) ? C('#ff3030') : C('#2a2a2a'));
    paintBox(S, 40, 20, 5, 1, 7, (f, x, y, fw) => (f === 'top' || f === 'bottom') && (x === 0 || x === fw - 1) ? C('#e8402a') : S.jit(C('#f4f4f4'), 4));   // the wings
    paintBox(S, 40, 29, 1, 4, 3, (f, x, y) => y === 0 ? C('#ffffff') : S.jit(C('#e8402a'), 4));   // the tail fin
    paintBox(S, 48, 29, 2, 2, 2, f => f === 'back' ? C('#1a1a1a') : C('#9aa0a8'));   // the jets
  });
  // a broomstick: a long wooden handle, and a bundle of twigs tied on at the back
  addSkin('broom', S => {
    const wood = C('#7a5230'), woodL = C('#9a6a40'), woodD = C('#5a3a20'), straw = C('#c8a050'), strawL = C('#e0c070'), strawD = C('#8a6a30');
    paintBox(S, 0, 0, 1, 1, 20, (f, x, y) => (x + y) % 5 === 0 ? woodD : (x % 3 === 0 ? woodL : S.jit(wood, 4)));
    paintBox(S, 0, 22, 3, 3, 5, (f, x, y) => (f === 'front' || (f !== 'back' && x === 0) ? C('#3a2a1a') : (x + y) % 3 === 0 ? strawD : (x % 2 ? strawL : S.jit(straw, 6))));   // tied on
    paintBox(S, 0, 32, 4, 4, 4, (f, x, y) => f === 'back' ? ((x + y) % 2 ? strawD : straw) : (x % 2 ? strawL : (x % 3 ? straw : strawD)));
    paintBox(S, 24, 22, 1, 1, 1, () => woodD);
  });
  // Snorks: a big round head with big eyes and a smile, and a snorkel on top (each one its own colours)
  SNORK_COLORS.forEach(([bodyHex, snorkHex], i) => addSkin('snork_' + i, S => {
    const body = C(bodyHex), bodyL = mixc(body, [255, 255, 255], 0.35), bodyD = mulc(body, 0.8), sn = C(snorkHex), snD = mulc(sn, 0.72), snL = mixc(sn, [255, 255, 255], 0.3);
    const skin = () => { const r = S.r(); return r < 0.1 ? bodyD : r < 0.2 ? bodyL : S.jit(body, 4); };
    paintBox(S, 0, 0, 8, 7, 8, (f, x, y) => {
      if (f === 'front') {
        if ((x === 1 || x === 2 || x === 5 || x === 6) && y >= 1 && y <= 3) return (x === 2 || x === 5) && y >= 2 ? C('#141414') : C('#ffffff');   // big eyes
        if ((y === 5 && (x === 3 || x === 4)) || (y === 4 && (x === 2 || x === 5))) return C('#6a1418');   // a smile
        if (y === 4 && (x === 1 || x === 6)) return mixc(body, C('#ff6a6a'), 0.35);   // rosy cheeks
      }
      return skin();
    });
    paintBox(S, 32, 0, 2, 5, 2, (f, x, y) => (y % 2 ? snD : sn));   // the snorkel
    paintBox(S, 44, 0, 2, 2, 5, (f, x, y) => (f === 'front' ? C('#1a1a1a') : f === 'top' ? snL : sn));   // its end, bent forward
    paintBox(S, 0, 16, 7, 6, 5, (f, x, y) => (f === 'front' && x >= 1 && x <= 5 && y >= 1 && y <= 4 && !((x === 1 || x === 5) && (y === 1 || y === 4)) ? bodyL : skin()));
    paintBox(S, 24, 16, 2, 5, 2, (f, x, y) => (y === 4 ? bodyL : skin()));
    paintBox(S, 32, 16, 2, 5, 2, (f, x, y) => (y === 4 ? bodyL : skin()));
    paintBox(S, 40, 16, 2, 4, 2, (f, x, y) => (y === 3 ? bodyD : skin()));
    paintBox(S, 48, 16, 2, 4, 2, (f, x, y) => (y === 3 ? bodyD : skin()));
  }));
  // the iron golem: pale iron with cracks, vines hanging down, a long nose and little dark red eyes (its model is
  // twice the usual scale, so the picture is half the usual size)
  addSkin('golem', S => {
    const iron = C('#d8d0c4'), ironL = C('#e8e2d6'), ironD = C('#aaa296'), crack = C('#8a8478'), vine = C('#4a8a2a'), vineD = C('#356a1e');
    const metal = (x, y) => { const r = S.r(); return r < 0.06 ? crack : r < 0.2 ? ironD : r < 0.34 ? ironL : S.jit(iron, 5); };
    const vines = (x, y, len) => (x * 7 + 3) % 5 === 0 && y < len + ((x * 3) % 3) ? (y % 2 ? vineD : vine) : null;
    paintBox(S, 0, 0, 4, 5, 4, (f, x, y) => {
      if (f === 'front') {
        if (y === 1) return ironD;   // the brow
        if (y === 2 && (x === 0 || x === 3)) return C('#6a1a12');   // eyes
        if (y === 4 && (x === 1 || x === 2)) return crack;   // mouth
      }
      if (f === 'top') return S.r() < 0.3 ? vine : metal(x, y);
      return metal(x, y);
    });
    paintBox(S, 16, 0, 1, 2, 1, () => S.jit(ironD, 4));   // the nose
    paintBox(S, 0, 10, 9, 6, 6, (f, x, y) => {
      if (f === 'top') return S.r() < 0.35 ? vine : metal(x, y);
      if (f === 'front' || f === 'back') { const v = vines(x, y, 4); if (v) return v; }
      return metal(x, y);
    });
    paintBox(S, 30, 10, 4, 3, 3, (f, x, y) => { const v = vines(x + 1, y, 2); return v || metal(x, y); });   // the waist
    const arm = (u, v, vined) => paintBox(S, u, v, 2, 15, 3, (f, x, y) => {
      if (vined && y < 5 && (f === 'front' || f === 'right') && (x + y) % 3 === 0) return y % 2 ? vineD : vine;
      if (y === 14) return ironD;   // the hand
      return metal(x, y);
    });
    arm(0, 24, true); arm(10, 24, false);
    const leg = (u, v, vined) => paintBox(S, u, v, 3, 8, 3, (f, x, y) => {
      if (vined && f === 'front' && x === 1 && y < 5) return y % 2 ? vineD : vine;
      if (y === 7) return ironD;
      return metal(x, y);
    });
    leg(20, 24, false); leg(32, 24, true);
  });
}
