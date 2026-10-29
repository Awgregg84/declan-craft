/* ===================== Sounds for the third wish list (added to SFX; see 11-audio.js) ===================== */
/* like nz, for sounds longer than the one second of noise (it goes round and round) */
function nzLong(o) {
  const ctx = AUDIO.ctx, t = ctx.currentTime + (o.when || 0), dur = o.dur || 1;
  const src = ctx.createBufferSource(); src.buffer = AUDIO.noise; src.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = o.type || 'lowpass'; fl.Q.value = o.q || 0.7;
  fl.frequency.setValueAtTime(o.f || 400, t);
  if (o.fEnd) fl.frequency.exponentialRampToValueAtTime(o.fEnd, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + (o.attack || 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl); fl.connect(g); g.connect(out(o.pan, o.dest));
  src.start(t, Math.random() * 0.9); src.stop(t + dur + 0.05);
}
Object.assign(SFX, {
  // a robot: beep boop; a bonk when hit; a zap; a rising bleep for a new job; a whoosh into the bag
  robotSay: (v, p) => { const n = randInt(2, 3); for (let i = 0; i < n; i++) tone({ f: randRange(600, 1400), dur: 0.07, type: 'square', vol: 0.05 * v, lp: 2600, when: i * 0.1, pan: p }); },
  robotHurt: (v, p) => { tone({ f: 300, fEnd: 200, dur: 0.12, type: 'triangle', vol: 0.18 * v, pan: p }); nz({ f: 1800, q: 2, dur: 0.06, vol: 0.08 * v, pan: p }); },
  robotDeath: () => {},
  robotZap: (v, p) => { tone({ f: 1800, fEnd: 300, dur: 0.18, type: 'sawtooth', vol: 0.08 * v, lp: 4000, pan: p }); nz({ f: 5000, type: 'highpass', dur: 0.1, vol: 0.05 * v, pan: p }); },
  robotMode: (v, p) => { tone({ f: 700, dur: 0.06, type: 'square', vol: 0.05 * v, lp: 3000, pan: p }); tone({ f: 1050, dur: 0.08, type: 'square', vol: 0.05 * v, lp: 3000, when: 0.08, pan: p }); },
  robotPick: (v, p) => { tone({ f: 500, fEnd: 1400, dur: 0.18, type: 'sine', vol: 0.12 * v, pan: p }); },
  // a monitor switching cameras: a click and a flick of static
  camSwitch: (v, p) => { tone({ f: 1400, dur: 0.04, type: 'square', vol: 0.05 * v, lp: 3000, pan: p }); nz({ f: 3200, type: 'highpass', dur: 0.12, vol: 0.07 * v, when: 0.03, pan: p }); },
  // thunder: close by a crack and a long rumble; far away just the rumble, rolling on
  thunderNear: (v, p) => {
    nz({ f: 3200, fEnd: 400, type: 'lowpass', q: 0.7, dur: 0.35, vol: 0.5 * v, attack: 0.004, pan: p });
    nzLong({ f: 500, fEnd: 70, dur: 3.4, vol: 0.55 * v, attack: 0.06, when: 0.08, pan: p });
    for (let i = 0; i < 3; i++) nzLong({ f: randRange(150, 260), fEnd: 50, dur: randRange(1, 1.8), vol: 0.35 * v, attack: 0.2, when: 0.5 + i * randRange(0.4, 0.8), pan: p });
    tone({ f: 46, fEnd: 30, dur: 2.6, type: 'sine', vol: 0.3 * v, vib: [3, 5], attack: 0.15, when: 0.12, pan: p });
  },
  thunderFar: (v, p) => {
    nzLong({ f: 280, fEnd: 55, dur: 3.8, vol: 0.42 * v, attack: 0.5, pan: p });
    for (let i = 0; i < 2; i++) nzLong({ f: randRange(120, 200), fEnd: 45, dur: randRange(1.2, 2), vol: 0.28 * v, attack: 0.3, when: 0.6 + i * randRange(0.6, 1.1), pan: p });
    tone({ f: 38, fEnd: 27, dur: 3, type: 'sine', vol: 0.22 * v, vib: [2, 4], attack: 0.6, pan: p });
  },
  // Hogwarts: the crowd cheering a goal, a fanfare for the Snitch, and the Sorting Hat thinking, then calling out a house
  goalCheer: (v, p) => { nzLong({ f: 1200, fEnd: 900, type: 'bandpass', q: 0.5, dur: 1.8, vol: 0.25 * v, attack: 0.15, pan: p }); [523, 659, 784].forEach((f, i) => tone({ f, dur: 0.25, type: 'square', vol: 0.05 * v, lp: 2500, when: i * 0.1, pan: p })); },
  snitchCaught: (v, p) => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.22, type: 'triangle', vol: 0.09 * v, when: i * 0.11, pan: p })),
  hatHmm: (v, p) => { tone({ f: 130, fEnd: 115, dur: 1.2, type: 'sawtooth', vol: 0.07 * v, lp: 500, vib: [4, 6], attack: 0.2, pan: p }); tone({ f: 110, fEnd: 125, dur: 1, type: 'sawtooth', vol: 0.05 * v, lp: 450, vib: [3, 5], attack: 0.2, when: 1.2, pan: p }); },
  hatHouse: (v, p) => [392, 523, 659, 784].forEach((f, i) => tone({ f, dur: 0.45, type: 'triangle', vol: 0.09 * v, when: i * 0.12, pan: p })),
  snitchSay: () => {}, snitchHurt: () => {}, snitchDeath: () => {}, snitchAngry: () => {},
  // spells: a sparkling swish, a pop of light where it hits, Lumos and Nox, and a Patronus (a shining chord)
  spellCast: (v, p) => { nzLong({ f: 2200, fEnd: 6000, type: 'bandpass', q: 2, dur: 0.35, vol: 0.12 * v, attack: 0.02, pan: p }); [1568, 2093, 2637].forEach((f, i) => tone({ f, dur: 0.12, type: 'sine', vol: 0.05 * v, when: i * 0.04, pan: p })); },
  spellHit: (v, p) => { tone({ f: 1200, fEnd: 500, dur: 0.18, type: 'triangle', vol: 0.1 * v, pan: p }); nz({ f: 5000, q: 1.5, dur: 0.12, vol: 0.08 * v, pan: p }); },
  lumosOn: (v, p) => [880, 1175, 1760].forEach((f, i) => tone({ f, dur: 0.3, type: 'sine', vol: 0.07 * v, when: i * 0.05, pan: p })),
  lumosOff: (v, p) => [1760, 1175, 880].forEach((f, i) => tone({ f, dur: 0.2, type: 'sine', vol: 0.05 * v, when: i * 0.04, pan: p })),
  patronus: (v, p) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 1.6 - i * 0.1, type: 'sine', vol: 0.06 * v, vib: [5, 4], attack: 0.15, when: i * 0.06, pan: p })); nzLong({ f: 4000, fEnd: 8000, type: 'highpass', dur: 1.2, vol: 0.05 * v, attack: 0.3, pan: p }); },
  patronusSay: () => {}, patronusHurt: () => {}, patronusDeath: () => {}, patronusAngry: () => {},
  // the rocket: countdown beeps, the roar as it blasts off, and the bump as it lands
  rocketBeep: (v, p) => tone({ f: 880, dur: 0.18, type: 'square', vol: 0.08 * v, lp: 3000, pan: p }),
  rocketRoar: (v, p) => {
    nzLong({ f: 1400, fEnd: 200, dur: 4.5, vol: 0.5 * v, attack: 0.2, pan: p });
    nzLong({ f: 300, fEnd: 60, dur: 4.5, vol: 0.45 * v, attack: 0.3, pan: p });
    tone({ f: 55, fEnd: 40, dur: 4, type: 'sawtooth', vol: 0.18 * v, lp: 300, attack: 0.3, pan: p });
  },
  rocketLand: (v, p) => { nz({ f: 400, fEnd: 80, type: 'lowpass', dur: 0.6, vol: 0.4 * v, pan: p }); tone({ f: 70, fEnd: 40, dur: 0.4, vol: 0.3 * v, pan: p }); },
  // the flying car taking off, landing and humming along in the air; a broom whooshing by
  flycarLift: (v, p) => { tone({ f: 180, fEnd: 520, dur: 0.7, type: 'sawtooth', vol: 0.1 * v, lp: 1600, pan: p }); nzLong({ f: 900, fEnd: 2400, type: 'bandpass', q: 0.8, dur: 0.8, vol: 0.12 * v, attack: 0.1, pan: p }); },
  flycarLand: (v, p) => { tone({ f: 420, fEnd: 160, dur: 0.5, type: 'sawtooth', vol: 0.08 * v, lp: 1200, pan: p }); nz({ f: 300, q: 0.8, dur: 0.15, vol: 0.2 * v, when: 0.3, pan: p }); },
  flycarHum: (v, p) => { tone({ f: 140, fEnd: 150, dur: 0.34, type: 'sawtooth', vol: 0.05 * v, lp: 700, attack: 0.05, pan: p }); nz({ f: 1800, q: 0.7, dur: 0.32, vol: 0.05 * v, attack: 0.05, pan: p }); },
  broomWhoosh: (v, p) => nzLong({ f: 700, fEnd: 2600, type: 'bandpass', q: 1.2, dur: 0.6, vol: 0.18 * v, attack: 0.15, pan: p }),
  // Snorks: little toots through their snorkels
  snorkSay: (v, p) => { tone({ f: 520, fEnd: 590, dur: 0.12, type: 'square', vol: 0.07 * v, lp: 1800, vib: [14, 12], pan: p }); tone({ f: 660, fEnd: 700, dur: 0.16, type: 'square', vol: 0.07 * v, lp: 1800, vib: [14, 12], when: 0.15, pan: p }); },
  snorkHurt: (v, p) => tone({ f: 720, fEnd: 430, dur: 0.2, type: 'square', vol: 0.08 * v, lp: 1600, pan: p }),
  snorkDeath: (v, p) => tone({ f: 600, fEnd: 300, dur: 0.3, type: 'square', vol: 0.07 * v, lp: 1400, pan: p }),
  snorkAngry: (v, p) => tone({ f: 300, dur: 0.2, type: 'square', vol: 0.06 * v, lp: 1200, pan: p }),
  snorkToot: (v, p) => { tone({ f: 440, fEnd: 480, dur: 0.6, type: 'sawtooth', vol: 0.09 * v, lp: 1400, vib: [6, 10], attack: 0.03, pan: p }); nz({ f: 900, q: 2, dur: 0.4, vol: 0.05 * v, when: 0.1, pan: p }); },
  snorkHappy: (v, p) => [523, 659, 784, 1047].forEach((f, i) => tone({ f, fEnd: f * 1.04, dur: 0.12, type: 'square', vol: 0.07 * v, lp: 2200, vib: [14, 10], when: i * 0.1, pan: p })),
  // iron golems: heavy and metallic
  golemSay: (v, p) => { tone({ f: 92, fEnd: 70, dur: 0.55, type: 'triangle', vol: 0.2 * v, lp: 600, vib: [5, 6], attack: 0.06, pan: p }); nz({ f: 700, q: 3, dur: 0.4, vol: 0.06 * v, pan: p }); },
  golemHurt: (v, p) => { tone({ f: 420, fEnd: 300, dur: 0.25, type: 'square', vol: 0.12 * v, lp: 1800, pan: p }); nz({ f: 2600, q: 4, dur: 0.15, vol: 0.14 * v, pan: p }); },
  golemDeath: (v, p) => { nz({ f: 600, type: 'lowpass', dur: 0.9, vol: 0.3 * v, pan: p }); tone({ f: 120, fEnd: 40, dur: 1, type: 'sawtooth', vol: 0.16 * v, lp: 400, pan: p }); },
  golemAngry: (v, p) => tone({ f: 70, fEnd: 110, dur: 0.6, type: 'sawtooth', vol: 0.18 * v, lp: 500, vib: [9, 10], pan: p }),
  golemAttack: (v, p) => { nz({ f: 900, fEnd: 300, q: 1.2, dur: 0.25, vol: 0.22 * v, pan: p }); tone({ f: 85, fEnd: 50, dur: 0.22, type: 'sine', vol: 0.3 * v, when: 0.12, pan: p }); },
  golemBuilt: (v, p) => { [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.35, type: 'triangle', vol: 0.12 * v, when: i * 0.09, pan: p })); tone({ f: 900, dur: 0.6, type: 'square', vol: 0.05 * v, lp: 2500, when: 0.36, pan: p }); },
});
