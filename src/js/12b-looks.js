/* ===================== Making your own character ===================== */
// A character you make is a short list of choices (skin, hair, face, clothes, shoes and hat). The list is painted
// into a skin picture here, the same way on every iPad, so playing together only the list needs to be sent. Saved
// characters stay on this device (in the profile, with their names).
const LOOK_SPEC = [
  ['skin', 6], ['hair', 9], ['hairColor', 12], ['eyes', 6], ['glasses', 3], ['beard', 3], ['mouth', 4], ['freckles', 2], ['ears', 2], ['head', 2],
  ['top', 7], ['topColor', 14], ['emblem', 8], ['bottom', 4], ['bottomColor', 14], ['shoes', 3], ['shoeColor', 14], ['hat', 8], ['hatColor', 14], ['letter', 26],
];
const LK = {};
LOOK_SPEC.forEach(([k], i) => { LK[k] = i; });
const LOOK_SKIN = ['#f8dcc6', '#f3c6a5', '#e3a982', '#c48a5c', '#97643e', '#5e3c24'];
const LOOK_HAIR = ['#f2d06b', '#d8a24a', '#a8743a', '#6b4423', '#2e2018', '#b8532a', '#9a9a9a', '#ececec', '#f07ab8', '#4a8af0', '#4ac860', '#9a5af0'];
const LOOK_EYES = ['#4a90f0', '#3aa860', '#7a4a2a', '#6a7a8a', '#2a2a2a', '#9a5af0'];
const LOOK_COLORS = ['#e1453a', '#f08a2a', '#f2cf3a', '#4ab84a', '#2a9a8a', '#3a7ae0', '#2a3a8a', '#8a4ae0', '#f07ab8', '#f4f4f4', '#9a9a9a', '#2a2a2a', '#8a5a32', '#d8c8a0'];
const LOOK_NAMES = {
  hair: ['Short', 'Spiky', 'Long', 'Ponytail', 'Curly', 'Bun', 'Buzz cut', 'Bald', 'Pigtails'],
  glasses: ['No glasses', 'Glasses', 'Sunglasses'],
  beard: ['No beard', 'Beard', 'Mustache'],
  mouth: ['Smile', 'Big grin', 'Evil grin', 'Surprised'],
  freckles: ['No freckles', 'Freckles'],
  ears: ['Normal ears', 'Big ears'],
  head: ['Normal head', 'Big head'],
  top: ['T-shirt', 'Long sleeves', 'Hoodie', 'Dress', 'Jacket', 'Tank top', 'Stripy sweater'],
  emblem: ['No picture', 'Star', 'Heart', 'First letter', 'Creeper', 'Stripe', 'Lightning', 'Smiley'],
  bottom: ['Jeans', 'Shorts', 'Skirt', 'Pants'],
  shoes: ['Sneakers', 'Boots', 'Sandals'],
  hat: ['No hat', 'Cap', 'Beanie', 'Crown', 'Bow', 'Headband', 'Flower', 'Headphones'],
};
const DEFAULT_LOOK = [1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 5, 1, 0, 6, 0, 0, 0, 0, 0];
const MAX_CHARS = 16;
/* the family, ready-made on every iPad (Declan can change them, or delete them) */
const FAMILY = [
  { name: 'Mommy', look: [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 2, 0, 5, 0, 9, 0, 0, 12] },      // long blonde hair, a teal top with a heart
  { name: 'Daddy', look: [1, 0, 3, 0, 1, 1, 0, 0, 0, 0, 2, 10, 0, 0, 6, 1, 12, 0, 0, 3] },     // short brown hair, a beard and black glasses
  { name: 'Cooper', look: [1, 1, 3, 0, 0, 0, 1, 0, 0, 1, 0, 3, 4, 1, 13, 0, 0, 0, 0, 2] },     // brown hair, a big head, a creeper T-shirt
  { name: 'Lily', look: [1, 8, 3, 0, 0, 0, 0, 0, 0, 0, 3, 7, 1, 0, 0, 0, 8, 4, 8, 11] },       // brown pigtails, a purple dress, a pink bow
  { name: 'Michael', look: [1, 0, 4, 0, 0, 0, 2, 0, 0, 0, 2, 11, 6, 3, 10, 0, 0, 0, 0, 12] },  // nearly black hair, an evil grin, a lightning hoodie
  { name: 'Luca', look: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 7, 0, 5, 0, 3, 0, 0, 11] },       // blonde hair, big ears, a smiley T-shirt
];
/* a look from anywhere (a save, or another iPad): every choice a whole number in range, or else no look at all */
function cleanLook(a) {
  if (!Array.isArray(a) || a.length < LOOK_SPEC.length) return null;
  const out = [];
  for (let i = 0; i < LOOK_SPEC.length; i++) { const v = a[i]; if (!Number.isInteger(v)) return null; out.push(clamp(v, 0, LOOK_SPEC[i][1] - 1)); }
  return out;
}
const LOOK_RARE = ['hat', 'emblem', 'glasses', 'beard', 'mouth', 'freckles', 'ears', 'head'];   // (usually left plain when picked at random)
function randomLook() {
  return LOOK_SPEC.map(([k, n]) => k === 'letter' ? 0 : LOOK_RARE.includes(k) && Math.random() < (k === 'hat' || k === 'emblem' ? 0.45 : 0.7) ? 0 : randInt(0, n - 1));
}
const letterOf = name => { const m = String(name || '').toUpperCase().match(/[A-Z]/); return m ? m[0].charCodeAt(0) - 65 : 0; };

/* ---- painting a look into a 64x64 skin (the same layout as the ready-made characters) ---- */
const FONT3 = ['###|#.#|###|#.#|#.#', '##.|#.#|##.|#.#|##.', '###|#..|#..|#..|###', '##.|#.#|#.#|#.#|##.', '###|#..|##.|#..|###', '###|#..|##.|#..|#..',
  '###|#..|#.#|#.#|###', '#.#|#.#|###|#.#|#.#', '###|.#.|.#.|.#.|###', '..#|..#|..#|#.#|###', '#.#|#.#|##.|#.#|#.#', '#..|#..|#..|#..|###', '#.#|###|###|#.#|#.#',
  '###|#.#|#.#|#.#|#.#', '###|#.#|#.#|#.#|###', '###|#.#|###|#..|#..', '###|#.#|#.#|###|..#', '###|#.#|##.|#.#|#.#', '###|#..|###|..#|###', '###|.#.|.#.|.#.|.#.',
  '#.#|#.#|#.#|#.#|###', '#.#|#.#|#.#|#.#|.#.', '#.#|#.#|###|###|#.#', '#.#|#.#|.#.|#.#|#.#', '#.#|#.#|.#.|.#.|.#.', '###|..#|.#.|#..|###'].map(s => s.split('|'));
const EMBLEMS = {   // 6x6 pictures for the front of a top (Y yellow, R red, G green, K black, W white or black to show up)
  1: ['..YY..', '..YY..', 'YYYYYY', '.YYYY.', '.Y..Y.', 'Y....Y'],
  2: ['.R..R.', 'RRRRRR', 'RRRRRR', '.RRRR.', '..RR..', '......'],
  4: ['GGGGGG', 'KKGGKK', 'KKGGKK', 'GGKKGG', 'GKKKKG', 'GKGGKG'],
  6: ['...YY.', '..YY..', '.YYYY.', '..YY..', '.YY...', '.Y....'],
  7: ['.YYYY.', 'YKYYKY', 'YYYYYY', 'YKYYKY', 'YYKKYY', '.YYYY.'],
};
function paintLook(S, L) {
  const sk = C(LOOK_SKIN[L[LK.skin]]), skD = mulc(sk, 0.88), skL = mulc(sk, 1.04);
  const hc = C(LOOK_HAIR[L[LK.hairColor]]), hcL = mulc(hc, 1.14), hcD = mulc(hc, 0.76);
  const hair = () => { const r = S.r(); return r < 0.22 ? hcL : r < 0.4 ? hcD : hc; };
  const hs = L[LK.hair], bald = hs === 7, buzz = hs === 6, long = hs === 2, pony = hs === 3, curly = hs === 4, bun = hs === 5, spiky = hs === 1, pig = hs === 8;
  const eye = C(LOOK_EYES[L[LK.eyes]]), glasses = L[LK.glasses], mouth = L[LK.mouth], freckles = L[LK.freckles] === 1, mustache = L[LK.beard] === 2;
  const top = L[LK.top], tc = C(LOOK_COLORS[L[LK.topColor]]), tcD = mulc(tc, 0.8);
  const bot = L[LK.bottom], bc = C(LOOK_COLORS[L[LK.bottomColor]]), bcD = mulc(bc, 0.78);
  const shoe = L[LK.shoes], sc = C(LOOK_COLORS[L[LK.shoeColor]]), scD = mulc(sc, 0.72);
  const hat = L[LK.hat], hatC = C(LOOK_COLORS[L[LK.hatColor]]), hatD = mulc(hatC, 0.78), hatL = mulc(hatC, 1.12);
  const dark = c => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11 < 120;
  const W = C('#f4f4f4'), K = C('#222222'), beard = L[LK.beard] === 1, dress = top === 3, brow = mulc(hcD, bald ? 0.7 : 0.9), lip = C('#5a1a1a');
  // the mouth: a smile, a big grin with teeth, an evil grin (wide, and up at one side) or a surprised O
  const mouthAt = (x, y) => {
    if (mouth === 0) return y === 7 && (x === 3 || x === 4) ? C('#b8605a') : y === 7 && (x === 2 || x === 5) ? mixc(sk, C('#c8605a'), 0.45) : null;
    if (mouth === 1) return y === 6 && x >= 2 && x <= 5 ? C('#ffffff') : y === 7 && x >= 2 && x <= 5 ? C('#a83a3a') : y === 6 && (x === 1 || x === 6) ? C('#b8605a') : null;
    if (mouth === 2) return (y === 6 && x >= 1 && x <= 6) ? (x % 2 ? C('#ffffff') : C('#e0e0e0')) : (y === 7 && x >= 1 && x <= 6) || (x === 7 && (y === 5 || y === 6)) ? lip : null;
    return (y === 6 || y === 7) && (x === 3 || x === 4) ? lip : null;
  };
  const jit = (c, n) => S.jit(c, n);
  // ---- the head: hair, face, and what is on the face ----
  paintBox(S, 0, 0, 8, 8, 8, (f, x, y) => {
    if (f === 'bottom') return beard ? hair() : skD;
    if (f === 'top') return bald ? skL : buzz ? (S.r() < 0.6 ? hcD : skD) : pig && (x === 3 || x === 4) ? skD : hair();   // (pigtails: parted in the middle)
    if (f === 'back') {
      if (bald) return y === 7 ? skD : sk;
      if (buzz) return y < 5 ? (S.r() < 0.6 ? hcD : skD) : sk;
      if (long || curly || pony || pig) return hair();
      return y < 6 ? hair() : y === 6 && x % 3 ? hair() : sk;
    }
    if (f === 'left' || f === 'right') {
      const nf = f === 'right' ? x >= 6 : x <= 1;   // (next to the face)
      if (beard && nf && y >= 4) return hair();
      if (bald) return y === 7 ? skD : sk;
      if (buzz) return y < 3 ? (S.r() < 0.6 ? hcD : skD) : y === 7 ? skD : sk;
      if (y < (curly ? 4 : 3)) return hair();
      if (!nf && (long || pig || (curly && y < 7) || y < 5)) return hair();
      if (!nf && y === 5 && x % 2 === 0 && !curly) return hair();
      return y === 7 ? skD : sk;
    }
    // the face
    const bang = bald ? false : buzz ? y === 0 && S.r() < 0.6 : spiky ? y === 0 || (y === 1 && x % 2 === 0) : long ? y < 2 || ((x === 0 || x === 7) && y < 7)
      : pony ? y < 2 || (y === 2 && x < 3) : curly ? y < 2 || (y === 2 && x % 2 === 0) || ((x === 0 || x === 7) && y < 5) : bun ? y === 0 || (y === 1 && (x === 0 || x === 7))
      : pig ? y < 2 || (y === 2 && (x < 2 || x > 5))
      : y < 2 || (y === 2 && 'HsHHsssH'[x] === 'H');
    if (bang) return buzz ? hcD : hair();
    if (glasses === 1 && (y === 3 || (y === 4 && (x === 0 || x === 3 || x === 4 || x === 7)))) return K;   // glasses (black rims)
    if (glasses === 2 && (y === 3 || y === 4)) return y === 4 && (x === 1 || x === 5) ? C('#6a7a8a') : y === 4 && (x === 2 || x === 6) ? C('#1e2430') : C('#141414');   // sunglasses
    if (mouth === 2 && y === 2 && (x === 1 || x === 6)) return brow;   // an evil grin: eyebrows up at the ends...
    if (y === 3) return (mouth === 2 ? x === 2 || x === 5 : x === 1 || x === 2 || x === 5 || x === 6) ? brow : sk;   // ...and down in the middle
    if (y === 4) return x === 1 || x === 6 ? C('#ffffff') : x === 2 || x === 5 ? eye : sk;
    const m = mouthAt(x, y);
    if (beard && (y >= 6 || (y === 5 && (x === 0 || x === 7)))) return m || hair();   // (the mouth shows through a beard)
    if (mustache && y === 6 && x >= 2 && x <= 5) return hair();
    if (m) return m;
    if (y === 5) return x === 1 || x === 6 ? C('#e8eef6') : x === 2 || x === 5 ? mulc(eye, 0.6) : (x === 3 || x === 4) ? skD : freckles && (x === 0 || x === 7) ? mulc(sk, 0.78) : sk;
    if (y === 6) return freckles && (x === 1 || x === 6) ? mulc(sk, 0.78) : (x === 0 || x === 7) ? mixc(sk, C('#f07a70'), 0.3) : (x === 3 || x === 4) ? mulc(sk, 0.93) : sk;
    return sk;
  });
  // ---- the layer over the head: more hair, then the hat ----
  paintBox(S, 32, 0, 8, 8, 8, (f, x, y) => {
    const nf = f === 'right' ? x >= 6 : x <= 1;
    // the hat first (it goes over the hair)
    if (hat === 1) {   // a cap
      if (f === 'top') return (x === 3 || x === 4) && (y === 3 || y === 4) ? hatD : jit(hatC, 4);
      if (f === 'front') return y < 2 ? jit(hatC, 4) : y === 2 ? hatD : null;
      if (f === 'back') return y < 2 && !(y === 1 && (x === 3 || x === 4)) ? jit(hatC, 4) : hairBit();
      if (f === 'left' || f === 'right') return y < 2 ? jit(hatC, 4) : hairBit();
    }
    if (hat === 2) {   // a beanie
      if (f === 'top') return (x === 3 || x === 4) && (y === 3 || y === 4) ? hatL : (x + y) % 2 ? hatC : mulc(hatC, 0.92);
      if (f !== 'bottom' && y < 3) return y === 2 ? hatD : x % 2 ? hatC : mulc(hatC, 0.92);
      if (f !== 'bottom' && f !== 'front') return hairBit();
      return null;
    }
    if (hat === 3 && f !== 'top' && f !== 'bottom' && y < 2) {   // a golden crown with jewels
      if (y === 0) return x % 2 === 0 ? C('#f2cf3a') : null;
      return f === 'front' && (x === 2 || x === 5) ? hatC : C('#d8a828');
    }
    if (hat === 4 && ((f === 'top' && x >= 5 && y >= 5 && (x !== 6 || y === 6)) || (f === 'front' && y === 0 && x >= 5))) return f === 'top' && x === 6 ? hatD : hatC;   // a bow
    if (hat === 5 && f !== 'top' && f !== 'bottom' && y === 1) return hatC;   // a headband
    if (hat === 6 && ((f === 'front' && x < 3 && y < 3 && (x === 1 || y === 1)) || (f === 'top' && x < 2 && y >= 6))) return f === 'front' && x === 1 && y === 1 ? C('#f2cf3a') : hatC;   // a flower
    if (hat === 7) {   // headphones
      if (f === 'top' && (y === 3 || y === 4)) return C('#3a3a3a');
      if ((f === 'left' || f === 'right') && (x === 3 || x === 4) && y < 2) return C('#3a3a3a');
      if ((f === 'left' || f === 'right') && x >= 2 && x <= 5 && y >= 2 && y <= 5) return x === 2 || x === 5 || y === 2 || y === 5 ? hatD : hatC;
    }
    return hairBit();
    function hairBit() {
      if (bald || buzz || f === 'bottom') return null;
      if (f === 'top') return spiky ? (S.r() < 0.5 ? hcL : hc) : bun && x >= 2 && x <= 5 && y < 3 ? hcD : pig && (x === 3 || x === 4) ? null : hair();
      if (f === 'back') {
        if (pony && (x === 3 || x === 4)) return hcD;   // the ponytail
        if (bun && y < 2 && x >= 2 && x <= 5) return hcD;
        return long || curly ? (y < 7 || x % 2 ? hair() : null) : y < 6 ? (y === 5 && x % 2 ? hcD : hair()) : null;
      }
      if (f === 'left' || f === 'right') {
        if (y < 3) return hair();
        if (!nf && (long || curly || y < 5)) return y === 4 && !long && !curly ? hcD : hair();
        return null;
      }
      if (f === 'front') {
        if (y === 0) return spiky ? (x % 2 ? null : hcL) : hair();
        if (y === 1 && !spiky && !bun && x % 3 !== 1) return hair();
        if ((long || curly) && (x === 0 || x === 7) && y < 6) return hcD;
      }
      return null;
    }
  });
  // ---- big ears, and pigtails (extra pieces on made characters' heads, see-through unless painted here) ----
  if (L[LK.ears]) for (const u of [0, 8]) paintBox(S, u, 32, 3, 5, 1, (f, x, y) => f === 'front' && x === 1 && y >= 1 && y <= 3 ? mulc(sk, 0.82) : f === 'bottom' ? skD : sk);
  if (pig) for (const u of [16, 26]) paintBox(S, u, 32, 3, 6, 2, (f, x, y) => f === 'top' ? hcD : y === 0 ? C('#e83a6a') : hair());   // with a hair tie
  // ---- the body: the top (and a picture on it), the hem, the belt ----
  const emb = L[LK.emblem], letter = FONT3[L[LK.letter]] || FONT3[0];
  const embColor = ch => ch === 'Y' ? (L[LK.topColor] === 2 ? W : C('#f2cf3a')) : ch === 'R' ? (L[LK.topColor] === 0 ? W : C('#e8304a')) : ch === 'G' ? C('#4ab84a') : ch === 'K' ? K : null;
  const topAt = (f, x, y) => {   // rows 0-9 (and 10-11 for longer tops), any side
    if (top === 6) return (y >> 1) % 2 ? W : jit(tc, 4);   // stripes
    if (top === 4 && f === 'front' && (x === 3 || x === 4)) return y === 0 ? sk : W;   // an open jacket over a white shirt
    if (top === 4 && f === 'front' && (x === 2 || x === 5)) return tcD;
    if (top === 2 && f === 'back' && y < 3) return tcD;   // a hoodie: the hood down at the back, strings and a pocket at the front
    if (top === 2 && f === 'front' && !L[LK.emblem] && (x === 2 || x === 5) && y >= 1 && y <= 3) return W;
    if (top === 2 && f === 'front' && y >= 7 && y <= 9 && x >= 1 && x <= 6) return tcD;
    if (top === 5 && (f === 'top' ? (x < 2 || x > 5) : f === 'front' || f === 'back' ? y === 0 && (x < 2 || x > 5) : f === 'left' || f === 'right' ? y === 0 : false)) return sk;   // tank top straps
    if (f === 'front' && y === 0 && (x === 3 || x === 4) && top !== 2) return sk;   // the neck
    if (f === 'front' && y === 0 && (x === 2 || x === 5) && top !== 2 && top !== 5) return tcD;
    if (dress && y === 6) return tcD;   // a sash
    return jit(tc, 4);
  };
  paintBox(S, 16, 16, 8, 12, 4, (f, x, y) => {
    if (f === 'top') return topAt(f, x, 0);
    if (f === 'bottom') return dress ? tc : bot === 2 ? bc : bcD;
    if (y === 11) return dress ? tcD : bot === 2 ? jit(bc, 4) : (f === 'front' && (x === 3 || x === 4) ? C('#c8a040') : mulc(bc, 0.6));   // a belt (with a buckle), or the top of a skirt
    if (y === 10) return dress || bot === 2 ? (dress ? jit(tc, 4) : jit(bc, 4)) : top === 2 || top === 4 || top === 6 ? topAt(f, x, y) : tcD;
    if (f === 'front' && emb && top !== 4) {   // the picture on the front
      if (emb === 3 && x >= 3 && x <= 5 && y >= 2 && y <= 6) { if (letter[y - 2][x - 3] === '#') return dark(tc) ? W : K; }
      else if (emb === 5 && (y === 4 || y === 5)) return dark(tc) ? W : K;
      else if (EMBLEMS[emb] && x >= 1 && x <= 6 && y >= 2 && y <= 7) { const c = embColor(EMBLEMS[emb][y - 2][x - 1]); if (c) return c; }
    }
    if (emb === 5 && (y === 4 || y === 5) && top !== 4) return dark(tc) ? W : K;
    if (f === 'back' && long && y < 4 + (x % 2)) return hair();   // long hair down the back
    if (f === 'back' && pony && (x === 3 || x === 4) && y < 3) return hcD;   // and a ponytail
    return topAt(f, x, y);
  });
  // ---- arms: sleeves (long, short or none), then hands ----
  const sleeve = top === 1 || top === 2 || top === 4 || top === 6 ? 10 : top === 5 ? 0 : dress ? 2 : 3;
  const arm = (u, v) => paintBox(S, u, v, 4, 12, 4, (f, x, y) => {
    if (f === 'top') return sleeve ? topAt(f, x + 2, 1) : sk;
    if (f === 'bottom') return skD;
    if (y < sleeve) return top === 6 ? ((y >> 1) % 2 ? W : jit(tc, 4)) : jit(tc, 4);
    if (y === sleeve && sleeve) return sleeve === 10 ? tcD : tcD;
    return y === 11 ? skD : sk;
  });
  arm(40, 16); arm(32, 48);
  // ---- legs: jeans, shorts, a skirt or pants (or the bottom of a dress), then shoes ----
  const leg = (u, v) => paintBox(S, u, v, 4, 12, 4, (f, x, y) => {
    if (f === 'top') return dress ? tc : bc;
    if (f === 'bottom') return shoe === 2 ? scD : shoe === 1 ? scD : C('#e2e2e2');
    if (shoe === 1 && y >= 8) return y === 11 ? scD : jit(sc, 4);   // boots
    if (y === 11) return shoe === 2 ? scD : C('#f0f0f0');
    if (y === 10) return shoe === 2 ? (x % 2 === 0 || f === 'back' ? sc : sk) : (f === 'front' && x === 1 ? W : jit(sc, 4));
    if (dress) return y < 5 ? jit(tc, 4) : y === 5 ? tcD : sk;
    if (bot === 1) return y < 5 ? jit(bc, 4) : y === 5 ? bcD : sk;   // shorts
    if (bot === 2) return y < 4 ? jit(bc, 4) : y === 4 ? bcD : sk;   // a skirt
    if (bot === 0 && (f === 'left' || f === 'right') && x === 3) return bcD;   // the seam down jeans
    return jit(bc, 5);
  });
  leg(0, 16); leg(16, 48);
}

/* ---- the skin layers kept for made characters: yours, the one being made, and other players' ---- */
const LOOK_LAYERS_REMOTE = ['custom_r0', 'custom_r1', 'custom_r2', 'custom_r3'];
const LOOK_LAYERS = ['custom_me', 'custom_prev'].concat(LOOK_LAYERS_REMOTE);
function lookPixels(look) { const S = new Pix(64, 64, hashString('look')); paintLook(S, look); return S.d; }
function setSkinPixels(name, data) {
  const i = SKIN[name];
  if (i === undefined) return;
  SKIN_DATA[i].set(data);
  if (!texSkins) return;
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texSkins);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, SKIN_DATA[i]);
}
const lookFace = (look, size) => faceIconData(lookPixels(look), size);
const LAYER_LOOK = {};
function paintLayer(name, look) { setSkinPixels(name, lookPixels(look)); LAYER_LOOK[name] = look; }
/* how much bigger a head is drawn (0: the usual size) */
const headScaleFor = skin => { const l = LAYER_LOOK[skin]; return l && l[LK.head] ? 1.25 : 0; };
/* someone playing with us as a character they made: give them one of the spare layers (or a ready-made look) */
function remoteLookSkin(look, skip) {
  const used = new Set();
  for (const r of MP.remotes.values()) if (r !== skip) used.add(r.skin);
  const free = LOOK_LAYERS_REMOTE.find(k => !used.has(k));
  if (!free) return 'declan';
  paintLayer(free, look);
  return free;
}
/* the look you are playing as (null for a ready-made character) */
const myLook = () => PROFILE.skin === 'custom_me' && PROFILE.chars[PROFILE.cur] ? PROFILE.chars[PROFILE.cur].look : null;
function applyMyLook() { const l = myLook(); if (l) paintLayer('custom_me', l); }

/* ---- the character maker screen ---- */
const MAKER_TABS = [
  { id: 'face', label: 'Face', parts: [['skin', 'Skin', LOOK_SKIN], ['eyes', 'Eyes', LOOK_EYES], ['mouth', 'Mouth'], ['freckles', 'Freckles'], ['ears', 'Ears'], ['head', 'Head']] },
  { id: 'hair', label: 'Hair', parts: [['hair', 'Hair'], ['hairColor', 'Hair color', LOOK_HAIR], ['beard', 'Beard']] },
  { id: 'glasses', label: 'Glasses', parts: [['glasses', 'Glasses']] },
  { id: 'top', label: 'Top', parts: [['top', 'Top'], ['topColor', 'Color', LOOK_COLORS], ['emblem', 'Picture']] },
  { id: 'bottom', label: 'Bottom', parts: [['bottom', 'Bottom'], ['bottomColor', 'Color', LOOK_COLORS]] },
  { id: 'shoes', label: 'Shoes', parts: [['shoes', 'Shoes'], ['shoeColor', 'Color', LOOK_COLORS]] },
  { id: 'hat', label: 'Hat', parts: [['hat', 'Hat'], ['hatColor', 'Color', LOOK_COLORS]] },
];
function openMaker(idx) {
  const c = idx >= 0 ? PROFILE.chars[idx] : null;
  ui.maker = { idx, look: c ? c.look.slice() : (PROFILE.chars.length ? randomLook() : DEFAULT_LOOK.slice()), tab: ui.maker ? ui.maker.tab : 'face', yaw: 0.35, del: false };
  el('maker-name').value = c ? c.name : '';
  if (!c) ui.maker.look[LK.letter] = 0;
  el('btn-maker-delete').hidden = !c;
  el('btn-maker-delete').textContent = 'Delete';
  makerChanged();
  showScreen('scr-maker');
}
function makerChanged() {
  const m = ui.maker;
  m.look[LK.letter] = letterOf(el('maker-name').value);
  paintLayer('custom_prev', m.look);
  buildMakerOpts();
}
function buildMakerOpts() {
  const m = ui.maker, tabs = el('maker-tabs'), box = el('maker-opts'), a = document.activeElement;
  const fk = a && (tabs.contains(a) || box.contains(a)) ? a.getAttribute('data-k') : null;   // (the button with the focus gets it back after)
  tabs.textContent = '';
  for (const t of MAKER_TABS) {
    const b = h('button', { type: 'button', class: 'btn maker-tab', role: 'tab', 'aria-selected': m.tab === t.id ? 'true' : 'false', text: t.label, 'data-k': 'tab:' + t.id });
    b.addEventListener('click', () => { m.tab = t.id; sfx('click'); buildMakerOpts(); });
    tabs.appendChild(b);
  }
  box.textContent = '';
  const tab = MAKER_TABS.find(t => t.id === m.tab) || MAKER_TABS[0];
  for (const [key, label, colors] of tab.parts) {
    const row = h('div', { class: 'maker-row', role: 'group', 'aria-label': label }, h('div', { class: 'maker-label', text: label }));
    const opts = h('div', { class: colors ? 'maker-swatches' : 'maker-choices' });
    const n = LOOK_SPEC[LK[key]][1];
    for (let i = 0; i < n; i++) {
      const on = m.look[LK[key]] === i;
      const b = colors ? h('button', { type: 'button', class: 'swatch', style: 'background:' + colors[i], 'aria-label': label + ' ' + (i + 1), 'aria-pressed': on ? 'true' : 'false', 'data-k': key + ':' + i })
        : h('button', { type: 'button', class: 'btn maker-choice', 'aria-pressed': on ? 'true' : 'false', text: LOOK_NAMES[key][i], 'data-k': key + ':' + i });
      b.addEventListener('click', () => { m.look[LK[key]] = i; sfx('click'); makerChanged(); });
      opts.appendChild(b);
    }
    row.appendChild(opts);
    box.appendChild(row);
  }
  if (fk) { const b = tabs.querySelector('[data-k="' + fk + '"]') || box.querySelector('[data-k="' + fk + '"]'); if (b) b.focus(); }
}
function setupMaker() {
  const inp = el('maker-name');
  inp.addEventListener('input', () => { if (ui.maker) makerChanged(); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } e.stopPropagation(); });
  el('btn-maker-random').addEventListener('click', () => { if (!ui.maker) return; sfx('click'); ui.maker.look = randomLook(); makerChanged(); });
  el('btn-maker-cancel').addEventListener('click', () => { sfx('click'); ui.maker = null; buildCharScreen(); showScreen('scr-char'); });
  el('btn-maker-save').addEventListener('click', () => {
    const m = ui.maker;
    if (!m) return;
    initAudio(); sfx('click');
    const c = { name: cleanName(inp.value), look: cleanLook(m.look) || DEFAULT_LOOK.slice() };
    let i = m.idx;
    if (i >= 0 && PROFILE.chars[i]) PROFILE.chars[i] = c;
    else { if (PROFILE.chars.length >= MAX_CHARS) PROFILE.chars.shift(); PROFILE.chars.push(c); i = PROFILE.chars.length - 1; }
    ui.maker = null;
    pickChar(i);
    showScreen('scr-char');
  });
  el('btn-maker-delete').addEventListener('click', () => {
    const m = ui.maker, b = el('btn-maker-delete');
    if (!m || m.idx < 0) return;
    sfx('click');
    if (!m.del) { m.del = true; b.textContent = 'Tap again to delete'; return; }
    PROFILE.chars.splice(m.idx, 1);
    if (PROFILE.skin === 'custom_me') {
      if (PROFILE.cur === m.idx) { PROFILE.skin = 'declan'; PROFILE.cur = 0; }
      else if (PROFILE.cur > m.idx) PROFILE.cur--;
    }
    saveProfile(); applyMyLook(); updateCharButtons();
    ui.maker = null; buildCharScreen(); showScreen('scr-char');
  });
  // turn the character round by dragging it (or with the arrow buttons)
  const cv = el('maker-view');
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
  cv.addEventListener('pointermove', e => { if (drag === null || !ui.maker) return; ui.maker.yaw += (e.clientX - drag) * 0.02; drag = e.clientX; });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('pointercancel', () => { drag = null; });
  el('btn-maker-turn').addEventListener('click', () => { if (ui.maker) { ui.maker.yaw += Math.PI / 2; sfx('click'); } });
}
/* each frame while the maker is open: the character, turning slowly unless it was just turned by hand */
function drawMaker(t) {
  const m = ui.maker, cv = el('maker-view');
  if (!m || !cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
  const w = Math.max(40, Math.round(r.width * dpr)), hgt = Math.max(40, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== hgt) { cv.width = w; cv.height = hgt; }
  drawPreview(r, { head: [0, Math.sin(t * 0.7) * 0.25, 0], rarm: [Math.sin(t * 1.3) * 0.08, 0, 0.08], larm: [-Math.sin(t * 1.3) * 0.08, 0, -0.08] }, m.yaw, t, cv, MODELS.player_custom_prev);
}
