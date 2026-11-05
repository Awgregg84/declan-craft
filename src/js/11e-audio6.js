/* ===================== Sounds for the sixth wish list (added to SFX; see 11-audio.js) ===================== */
Object.assign(SFX, {
  // the laser blaster: a bright "pew", and a little fizz where the beam lands
  laserPew: (v, p) => { tone({ f: 1900, fEnd: 380, dur: 0.18, type: 'square', vol: 0.06 * v, lp: 4000, pan: p }); tone({ f: 2600, fEnd: 700, dur: 0.12, type: 'sine', vol: 0.05 * v, pan: p }); },
  laserHit: (v, p) => { nz({ f: 3000, q: 2, dur: 0.12, vol: 0.08 * v, pan: p }); tone({ f: 900, fEnd: 1500, dur: 0.08, type: 'sine', vol: 0.04 * v, pan: p }); },
});
