/* ===================== Sounds for the seventh wish list: the Mars world (added to SFX; see 11-audio.js) ===================== */
Object.assign(SFX, {
  // a Martian's chatter (wobbly bleeps going up and down), and a happy trill
  martianHi: (v, p) => { [660, 990, 740, 1180].forEach((f, i) => tone({ f, fEnd: f * (i % 2 ? 0.8 : 1.25), dur: 0.09, type: 'square', vol: 0.035 * v, lp: 2600, when: i * 0.1, pan: p })); },
  martianSay: (v, p) => { [880, 620].forEach((f, i) => tone({ f, fEnd: f * 1.2, dur: 0.08, type: 'square', vol: 0.02 * v, lp: 2400, when: i * 0.09, pan: p })); },
  martianHurt: (v, p) => tone({ f: 900, fEnd: 1300, dur: 0.15, type: 'square', vol: 0.03 * v, lp: 2600, pan: p }),
  martianHappy: (v, p) => { [784, 988, 1175, 1568].forEach((f, i) => tone({ f, dur: 0.12, type: 'triangle', vol: 0.06 * v, when: i * 0.08, vib: [14, 30], pan: p })); },
  // racing: the start, a boost pad, a pickup box, a puff of dust; the buggy's engine
  raceGo: (v, p) => { tone({ f: 1047, dur: 0.6, type: 'square', vol: 0.06 * v, lp: 3000, pan: p }); tone({ f: 1568, dur: 0.6, type: 'triangle', vol: 0.05 * v, pan: p }); },
  raceBoost: (v, p) => { tone({ f: 300, fEnd: 1500, dur: 0.45, type: 'sawtooth', vol: 0.06 * v, lp: 2400, pan: p }); nz({ f: 800, fEnd: 3200, q: 1, dur: 0.4, vol: 0.08 * v, pan: p }); },
  racePickup: (v, p) => { [880, 1320, 1760].forEach((f, i) => tone({ f, dur: 0.1, type: 'triangle', vol: 0.07 * v, when: i * 0.06, pan: p })); },
  raceDust: (v, p) => nz({ f: 500, fEnd: 200, q: 0.8, dur: 0.5, vol: 0.14 * v, pan: p }),
  buggyEngine: (v, p) => { tone({ f: 96 + Math.random() * 10, dur: 0.2, type: 'sawtooth', vol: 0.05 * v, lp: 700, pan: p }); tone({ f: 190 + Math.random() * 14, dur: 0.16, type: 'square', vol: 0.02 * v, lp: 900, pan: p }); },
  // the flying saucer: a humming wobble, and its tractor beam going on, catching something, and going off
  saucerHum: (v, p) => tone({ f: 180, dur: 0.5, type: 'sine', vol: 0.06 * v, vib: [9, 30], attack: 0.1, pan: p }),
  beamOn: (v, p) => tone({ f: 260, fEnd: 880, dur: 0.5, type: 'sine', vol: 0.07 * v, vib: [12, 40], pan: p }),
  beamOff: (v, p) => tone({ f: 880, fEnd: 240, dur: 0.4, type: 'sine', vol: 0.06 * v, vib: [12, 40], pan: p }),
  beamCatch: (v, p) => { tone({ f: 520, fEnd: 1040, dur: 0.25, type: 'triangle', vol: 0.07 * v, pan: p }); tone({ f: 1560, dur: 0.2, type: 'sine', vol: 0.04 * v, when: 0.2, pan: p }); },
});
