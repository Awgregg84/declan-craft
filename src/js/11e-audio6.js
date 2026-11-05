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
