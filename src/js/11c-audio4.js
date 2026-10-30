/* ===================== Sounds for the fourth wish list: doors and planes (added to SFX; see 11-audio.js) ===================== */
Object.assign(SFX, {
  // doors: an iron door clanks, a garage door rumbles up and down, an airlock door thunks and seals with a hiss
  ironDoor: (v, p) => { tone({ f: 180, fEnd: 120, dur: 0.3, type: 'square', vol: 0.06 * v, lp: 700, pan: p }); nz({ f: 2400, q: 3, dur: 0.12, vol: 0.12 * v, when: 0.18, pan: p }); },
  garageDoor: (v, p) => { nzLong({ f: 260, fEnd: 200, type: 'lowpass', q: 1.5, dur: 1.2, vol: 0.2 * v, attack: 0.1, pan: p }); for (let i = 0; i < 9; i++) nz({ f: 900, q: 4, dur: 0.04, vol: 0.06 * v, when: 0.1 + i * 0.12, pan: p }); },
  airlockDoor: (v, p) => { tone({ f: 110, fEnd: 70, dur: 0.35, type: 'sine', vol: 0.25 * v, pan: p }); nz({ f: 3200, type: 'highpass', dur: 0.35, vol: 0.06 * v, when: 0.25, pan: p }); },
  airlockHiss: (v, p) => nzLong({ f: 4200, fEnd: 2200, type: 'highpass', dur: 1.2, vol: 0.09 * v, attack: 0.15, pan: p }),
  airlockDrain: (v, p) => {   // the pump gurgles the water away
    nzLong({ f: 500, fEnd: 160, type: 'lowpass', q: 2, dur: 2, vol: 0.22 * v, attack: 0.2, pan: p });
    for (let i = 0; i < 10; i++) tone({ f: randRange(250, 650), fEnd: randRange(700, 1100), dur: 0.08, type: 'sine', vol: 0.06 * v, when: 0.15 + i * 0.17 + Math.random() * 0.06, pan: p });
  },
  // planes: a propeller's buzz, a jet's roar and a big plane's hum (each played over and over while it flies), the
  // rush of taking off, the squeak of the wheels touching down, a bump, and a parachute popping open
  planeProp: (v, p) => { tone({ f: 70 + v * 40, dur: 0.24, type: 'sawtooth', vol: 0.05 * v, lp: 500, attack: 0.03, vib: [24, 18], pan: p }); nz({ f: 300, q: 1, dur: 0.22, vol: 0.05 * v, attack: 0.03, pan: p }); },
  planeJet: (v, p) => { nzLong({ f: 900 + v * 900, type: 'bandpass', q: 0.6, dur: 0.36, vol: 0.12 * v, attack: 0.06, pan: p }); tone({ f: 1800 + v * 600, dur: 0.34, type: 'sine', vol: 0.015 * v, attack: 0.06, pan: p }); },
  planeHum: (v, p) => { tone({ f: 95, dur: 0.36, type: 'sawtooth', vol: 0.04 * v, lp: 400, attack: 0.06, pan: p }); nzLong({ f: 600, type: 'bandpass', q: 0.8, dur: 0.36, vol: 0.07 * v, attack: 0.06, pan: p }); },
  planeTakeoff: (v, p) => nzLong({ f: 400, fEnd: 1600, type: 'bandpass', q: 0.7, dur: 1.2, vol: 0.14 * v, attack: 0.2, pan: p }),
  planeLand: (v, p) => { tone({ f: 1400, fEnd: 900, dur: 0.12, type: 'triangle', vol: 0.05 * v, pan: p }); tone({ f: 1300, fEnd: 850, dur: 0.12, type: 'triangle', vol: 0.04 * v, when: 0.1, pan: p }); nz({ f: 300, q: 0.8, dur: 0.2, vol: 0.15 * v, pan: p }); },
  planeBump: (v, p) => { nz({ f: 200, q: 0.8, dur: 0.25, vol: 0.3 * v, pan: p }); tone({ f: 90, fEnd: 50, dur: 0.25, type: 'sine', vol: 0.25 * v, pan: p }); },
  chuteOpen: (v, p) => { nz({ f: 1200, fEnd: 300, q: 0.8, dur: 0.35, vol: 0.2 * v, pan: p }); tone({ f: 200, fEnd: 120, dur: 0.2, type: 'sine', vol: 0.1 * v, when: 0.05, pan: p }); },
});
