/* ===================== Sounds for the sixth wish list (added to SFX; see 11-audio.js) ===================== */
Object.assign(SFX, {
  // the laser blaster: a bright "pew", and a little fizz where the beam lands
  laserPew: (v, p) => { tone({ f: 1900, fEnd: 380, dur: 0.18, type: 'square', vol: 0.06 * v, lp: 4000, pan: p }); tone({ f: 2600, fEnd: 700, dur: 0.12, type: 'sine', vol: 0.05 * v, pan: p }); },
  laserHit: (v, p) => { nz({ f: 3000, q: 2, dur: 0.12, vol: 0.08 * v, pan: p }); tone({ f: 900, fEnd: 1500, dur: 0.08, type: 'sine', vol: 0.04 * v, pan: p }); },
});
Object.assign(SFX, {
  // the store: a little bell over the door, and the cash register's "ka-ching!"
  shopBell: (v, p) => { tone({ f: 1568, dur: 0.5, type: 'sine', vol: 0.07 * v, pan: p }); tone({ f: 2093, dur: 0.5, type: 'sine', vol: 0.05 * v, when: 0.12, pan: p }); },
  cashRegister: (v, p) => { nz({ f: 2500, q: 3, dur: 0.06, vol: 0.12 * v, pan: p }); tone({ f: 2637, dur: 0.35, type: 'triangle', vol: 0.08 * v, when: 0.08, pan: p }); tone({ f: 3520, dur: 0.4, type: 'triangle', vol: 0.06 * v, when: 0.14, pan: p }); },
});
Object.assign(SFX, {
  // the train: a two-note horn, a chuff of steam, the station bell, and a hiss of brakes
  trainHorn: (v, p) => { for (const f of [311, 392]) tone({ f, dur: 0.75, type: 'sawtooth', vol: 0.06 * v, lp: 1400, attack: 0.04, pan: p }); for (const f of [311, 392]) tone({ f, dur: 0.5, type: 'sawtooth', vol: 0.05 * v, lp: 1400, attack: 0.04, when: 0.85, pan: p }); },
  trainChug: (v, p) => { nz({ f: 500, fEnd: 200, q: 0.9, dur: 0.16, vol: 0.12 * v, pan: p }); tone({ f: 70, fEnd: 50, dur: 0.12, type: 'sine', vol: 0.1 * v, pan: p }); },
  trainBell: (v, p) => { for (let i = 0; i < 4; i++) { tone({ f: 1320, dur: 0.3, type: 'triangle', vol: 0.07 * v, when: i * 0.32, pan: p }); tone({ f: 2640, dur: 0.2, type: 'sine', vol: 0.03 * v, when: i * 0.32, pan: p }); } },
  trainBrake: (v, p) => nzLong({ f: 5000, type: 'highpass', dur: 0.9, vol: 0.06 * v, attack: 0.02, pan: p }),
});
Object.assign(SFX, {
  // the ghosts: a wobbly "woooo", a "BOO!", the giant's big laugh, a slime SPLAT, and a little squeak when one is poked
  ghostWoo: (v, p) => tone({ f: 420, fEnd: 300, dur: 1.1, type: 'sine', vol: 0.06 * v, vib: [5, 40], attack: 0.25, pan: p }),
  ghostBoo: (v, p) => { tone({ f: 180, fEnd: 120, dur: 0.6, type: 'sawtooth', vol: 0.08 * v, lp: 900, vib: [6, 10], attack: 0.05, pan: p }); nz({ f: 400, q: 1, dur: 0.3, vol: 0.06 * v, pan: p }); },
  ghostLaugh: (v, p) => { for (let i = 0; i < 4; i++) tone({ f: 130 - i * 6, fEnd: 100 - i * 6, dur: 0.18, type: 'sawtooth', vol: 0.09 * v, lp: 700, when: i * 0.22, pan: p }); },
  ghostHurt: (v, p) => tone({ f: 700, fEnd: 950, dur: 0.15, type: 'sine', vol: 0.05 * v, pan: p }),
  slimeSplat: (v, p) => { nz({ f: 600, fEnd: 150, q: 1.6, dur: 0.35, vol: 0.3 * v, pan: p }); tone({ f: 200, fEnd: 70, dur: 0.25, type: 'sine', vol: 0.15 * v, pan: p }); },
  // the proton pack's crackle, the trap thrown, opening with a whoosh of light, and snapping shut; the detector's beep
  protonCrackle: (v, p) => { nz({ f: 2400, q: 1.2, dur: 0.14, vol: 0.09 * v, pan: p }); tone({ f: 90 + Math.random() * 40, dur: 0.14, type: 'sawtooth', vol: 0.05 * v, lp: 600, pan: p }); },
  trapThrow: (v, p) => nz({ f: 500, fEnd: 1500, q: 1, dur: 0.3, vol: 0.12 * v, pan: p }),
  trapOpen: (v, p) => { tone({ f: 300, fEnd: 1400, dur: 1.2, type: 'triangle', vol: 0.07 * v, pan: p }); nzLong({ f: 3000, type: 'highpass', dur: 1.2, vol: 0.05 * v, attack: 0.1, pan: p }); },
  trapShut: (v, p) => { nz({ f: 900, q: 2, dur: 0.08, vol: 0.25 * v, pan: p }); tone({ f: 880, dur: 0.15, type: 'square', vol: 0.04 * v, when: 0.1, lp: 3000, pan: p }); },
  pkeBeep: (v, p) => tone({ f: 900 + v * 700, dur: 0.06, type: 'square', vol: 0.045, lp: 3500, pan: p }),
});
