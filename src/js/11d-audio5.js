/* ===================== Sounds for the fifth wish list (added to SFX; see 11-audio.js) ===================== */
Object.assign(SFX, {
  // a tank: its engine rumbles and its tracks clank; it fires with a big friendly "bloop", and the paint goes splat
  tankEngine: (v, p) => { tone({ f: 36 + 22 * v, fEnd: 32 + 22 * v, dur: 0.26, type: 'sawtooth', vol: 0.07 * v, lp: 320, pan: p }); nz({ f: 1400, q: 5, dur: 0.03, vol: 0.05 * v, when: 0.1, pan: p }); },
  tankFire: (v, p) => {
    tone({ f: 180, fEnd: 55, dur: 0.3, type: 'sine', vol: 0.32 * v, pan: p });
    nz({ f: 700, q: 0.8, dur: 0.18, vol: 0.25 * v, pan: p });
    tone({ f: 500, fEnd: 1300, dur: 0.12, type: 'triangle', vol: 0.06 * v, when: 0.03, pan: p });
  },
  paintSplat: (v, p) => { nz({ f: 900, fEnd: 200, q: 1.4, dur: 0.22, vol: 0.28 * v, pan: p }); tone({ f: 320, fEnd: 90, dur: 0.16, type: 'sine', vol: 0.14 * v, pan: p }); },
});
