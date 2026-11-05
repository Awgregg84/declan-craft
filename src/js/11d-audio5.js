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
Object.assign(SFX, {
  // Hogwarts: a student says "hi!", a referee's whistle, and the thump of catching and throwing the Quaffle
  studentHi: (v, p) => { tone({ f: 520, fEnd: 660, dur: 0.12, type: 'triangle', vol: 0.08 * v, pan: p }); tone({ f: 700, fEnd: 880, dur: 0.16, type: 'triangle', vol: 0.08 * v, when: 0.13, pan: p }); },
  studentHurt: (v, p) => tone({ f: 420, fEnd: 260, dur: 0.18, type: 'triangle', vol: 0.09 * v, pan: p }),
  whistle: (v, p) => { tone({ f: 2400, dur: 0.5, type: 'sine', vol: 0.1 * v, vib: [30, 60], pan: p }); tone({ f: 2400, dur: 0.25, type: 'sine', vol: 0.1 * v, vib: [30, 60], when: 0.6, pan: p }); },
  quaffleCatch: (v, p) => { nz({ f: 500, q: 1.2, dur: 0.1, vol: 0.25 * v, pan: p }); tone({ f: 160, fEnd: 90, dur: 0.12, type: 'sine', vol: 0.2 * v, pan: p }); },
  quaffleThrow: (v, p) => nz({ f: 600, fEnd: 1400, q: 0.9, dur: 0.25, vol: 0.18 * v, pan: p }),
  quaffleHurt: (v, p) => nz({ f: 500, q: 1.2, dur: 0.08, vol: 0.15 * v, pan: p }),
});
