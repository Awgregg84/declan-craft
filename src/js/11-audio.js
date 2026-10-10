/* ===================== Sound (all synthesized) ===================== */
const AUDIO = { ctx: null, master: null, sfx: null, music: null, noise: null, lx: 0, ly: 0, lz: 0, lyaw: 0, musicTimer: null, volume: 0.8, musicOn: true };
function impulse(ctx, secs, decay) {
  const len = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return buf;
}
function initAudio() {
  if (AUDIO.ctx) { if (AUDIO.ctx.state === 'suspended') AUDIO.ctx.resume().catch(() => {}); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    AUDIO.ctx = new AC();
  } catch (e) { AUDIO.ctx = null; return; }
  const ctx = AUDIO.ctx;
  AUDIO.master = ctx.createGain(); AUDIO.master.gain.value = AUDIO.volume; AUDIO.master.connect(ctx.destination);
  AUDIO.sfx = ctx.createGain(); AUDIO.sfx.gain.value = 0.9; AUDIO.sfx.connect(AUDIO.master);
  AUDIO.music = ctx.createGain(); AUDIO.music.gain.value = 0.28;
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 3, 2.4);
  const wet = ctx.createGain(); wet.gain.value = 0.55;
  AUDIO.music.connect(AUDIO.master); AUDIO.music.connect(wet); wet.connect(verb); verb.connect(AUDIO.master);
  const len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AUDIO.noise = buf;
  scheduleMusic(6);
}
function setVolume(v) { AUDIO.volume = v; if (AUDIO.master) AUDIO.master.gain.value = v; }
function out(pan, dest) {
  const ctx = AUDIO.ctx;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(dest || AUDIO.sfx); return p; }
  return dest || AUDIO.sfx;
}
function nz(o) {
  const ctx = AUDIO.ctx, t = ctx.currentTime + (o.when || 0), dur = o.dur || 0.12;
  const src = ctx.createBufferSource(); src.buffer = AUDIO.noise;
  const fl = ctx.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.Q.value = o.q || 1;
  fl.frequency.setValueAtTime(o.f || 1000, t);
  if (o.fEnd) fl.frequency.exponentialRampToValueAtTime(o.fEnd, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.4, t + (o.attack || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl); fl.connect(g); g.connect(out(o.pan, o.dest));
  src.start(t, Math.random() * 0.8); src.stop(t + dur + 0.05);
}
function tone(o) {
  const ctx = AUDIO.ctx, t = ctx.currentTime + (o.when || 0), dur = o.dur || 0.2;
  const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f || 440, t);
  if (o.fEnd) osc.frequency.exponentialRampToValueAtTime(o.fEnd, t + dur);
  let node = osc;
  if (o.vib) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
    lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
  }
  if (o.lp) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; node.connect(lp); node = lp; }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.attack || 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  node.connect(g); g.connect(out(o.pan, o.dest));
  osc.start(t); osc.stop(t + dur + 0.05);
}
const MAT = {
  stone: { f: 2200, q: 1.2, fEnd: 900 }, wood: { f: 700, q: 2.5, knock: 160 }, grass: { f: 3200, q: 0.6, type: 'bandpass' },
  gravel: { f: 1000, q: 0.8, crunch: true }, sand: { f: 4500, q: 0.5, type: 'highpass' }, glass: { f: 3800, q: 1.5 },
  wool: { f: 600, q: 0.5, type: 'lowpass' }, snow: { f: 2600, q: 0.6 }, metal: { f: 1800, q: 4, ring: 900 },
};
function matSound(kind, mat, v, pan) {
  const m = MAT[mat] || MAT.stone, r = randRange(0.85, 1.15);
  const dur = kind === 'step' ? 0.07 : kind === 'dig' ? 0.1 : kind === 'place' ? 0.12 : 0.22;
  const vol = (kind === 'step' ? 0.18 : kind === 'dig' ? 0.3 : 0.45) * v;
  nz({ f: m.f * r, q: m.q, type: m.type, dur, vol, pan, fEnd: m.fEnd ? m.fEnd * r : undefined });
  if (m.crunch) nz({ f: m.f * 1.6 * r, q: 1, dur: dur * 0.6, vol: vol * 0.6, when: dur * 0.4, pan });
  if (m.knock) tone({ f: m.knock * r, fEnd: m.knock * 0.7, dur: dur * 0.8, vol: vol * 0.7, type: 'triangle', pan });
  if (m.ring) tone({ f: m.ring * r, dur: 0.25, vol: vol * 0.3, type: 'square', lp: 2500, pan });
  if (mat === 'glass' && kind === 'break') for (let i = 0; i < 5; i++) tone({ f: randRange(2200, 5200), dur: 0.12, vol: 0.08 * v, when: i * 0.025, pan });
  if (kind === 'break' || kind === 'place') tone({ f: 110 * r, fEnd: 60, dur: 0.1, vol: vol * 0.5, pan });
}
const SFX = {
  hurt: (v, p) => { tone({ f: 330, fEnd: 170, dur: 0.18, type: 'sawtooth', vol: 0.22 * v, lp: 1200, pan: p }); nz({ f: 900, q: 0.8, dur: 0.1, vol: 0.2 * v, pan: p }); },
  pop: (v, p) => tone({ f: randRange(500, 700), fEnd: 1300, dur: 0.07, vol: 0.18 * v, pan: p }),
  eat: (v, p) => nz({ f: randRange(1200, 2200), q: 1.2, dur: 0.07, vol: 0.28 * v, pan: p }),
  burp: (v, p) => tone({ f: 170, fEnd: 90, dur: 0.3, type: 'sawtooth', vol: 0.2 * v, lp: 700, vib: [30, 20], pan: p }),
  explode: (v, p) => { nz({ f: 900, fEnd: 90, type: 'lowpass', q: 0.7, dur: 1.5, vol: 0.9 * v, pan: p }); tone({ f: 70, fEnd: 30, dur: 1.0, vol: 0.7 * v, pan: p }); nz({ f: 3000, fEnd: 400, q: 0.5, dur: 0.5, vol: 0.4 * v, pan: p }); },
  fuse: (v, p) => nz({ f: 4200, type: 'highpass', q: 0.5, dur: 1.2, vol: 0.18 * v, attack: 0.05, pan: p }),
  hiss: (v, p) => nz({ f: 5200, q: 0.9, dur: 1.4, vol: 0.3 * v, attack: 0.6, pan: p }),
  fizz: (v, p) => nz({ f: 5000, type: 'highpass', dur: 0.5, vol: 0.25 * v, pan: p }),
  splash: (v, p) => nz({ f: 1400, fEnd: 300, type: 'lowpass', dur: 0.5, vol: 0.35 * v, pan: p }),
  click: (v) => tone({ f: 1400, fEnd: 700, dur: 0.04, type: 'square', vol: 0.06 * v, lp: 3000 }),
  craft: (v) => { tone({ f: 880, dur: 0.12, vol: 0.08 * v, type: 'triangle' }); tone({ f: 1320, dur: 0.18, vol: 0.06 * v, when: 0.06, type: 'triangle' }); },
  toolBreak: (v, p) => { nz({ f: 2500, dur: 0.25, vol: 0.4 * v, pan: p }); tone({ f: 600, fEnd: 200, dur: 0.3, type: 'square', vol: 0.1 * v, lp: 2000, pan: p }); },
  chest: (v, p) => { tone({ f: 180, fEnd: 120, dur: 0.3, type: 'sawtooth', vol: 0.1 * v, lp: 600, pan: p }); nz({ f: 500, type: 'lowpass', dur: 0.25, vol: 0.2 * v, pan: p }); },
  door: (v, p) => { tone({ f: 240, fEnd: 170, dur: 0.22, type: 'sawtooth', vol: 0.08 * v, lp: 900, pan: p }); nz({ f: 700, q: 2, dur: 0.12, vol: 0.25 * v, when: 0.15, pan: p }); },
  sleep: (v) => { for (let i = 0; i < 4; i++) tone({ f: [523, 659, 784, 1046][i], dur: 0.6, vol: 0.06 * v, when: i * 0.15, type: 'triangle' }); },
  pigSay: (v, p) => { for (let i = 0; i < 2; i++) tone({ f: randRange(260, 320), fEnd: 200, dur: 0.14, type: 'square', vol: 0.12 * v, lp: 900, when: i * 0.2, pan: p }); },
  pigHurt: (v, p) => tone({ f: 420, fEnd: 260, dur: 0.18, type: 'square', vol: 0.14 * v, lp: 1200, pan: p }),
  pigDeath: (v, p) => tone({ f: 360, fEnd: 120, dur: 0.5, type: 'square', vol: 0.14 * v, lp: 1000, pan: p }),
  cowSay: (v, p) => tone({ f: 120, fEnd: 95, dur: 0.9, type: 'sawtooth', vol: 0.14 * v, lp: 520, vib: [5, 6], attack: 0.1, pan: p }),
  cowHurt: (v, p) => tone({ f: 160, fEnd: 110, dur: 0.35, type: 'sawtooth', vol: 0.16 * v, lp: 700, pan: p }),
  cowDeath: (v, p) => tone({ f: 140, fEnd: 70, dur: 0.8, type: 'sawtooth', vol: 0.16 * v, lp: 600, pan: p }),
  sheepSay: (v, p) => tone({ f: 420, dur: 0.6, type: 'sawtooth', vol: 0.1 * v, lp: 1400, vib: [22, 25], attack: 0.04, pan: p }),
  sheepHurt: (v, p) => tone({ f: 520, dur: 0.3, type: 'sawtooth', vol: 0.12 * v, lp: 1600, vib: [26, 30], pan: p }),
  sheepDeath: (v, p) => tone({ f: 460, fEnd: 200, dur: 0.6, type: 'sawtooth', vol: 0.12 * v, lp: 1400, vib: [22, 30], pan: p }),
  chickenSay: (v, p) => { for (let i = 0; i < 3; i++) tone({ f: randRange(900, 1300), dur: 0.05, type: 'square', vol: 0.06 * v, lp: 3000, when: i * 0.09, pan: p }); },
  chickenHurt: (v, p) => tone({ f: 1500, fEnd: 900, dur: 0.12, type: 'square', vol: 0.08 * v, lp: 3000, pan: p }),
  chickenDeath: (v, p) => tone({ f: 1300, fEnd: 500, dur: 0.3, type: 'square', vol: 0.08 * v, lp: 3000, pan: p }),
  zombieSay: (v, p) => { tone({ f: 95, fEnd: 70, dur: 0.9, type: 'sawtooth', vol: 0.16 * v, lp: 380, vib: [7, 8], attack: 0.15, pan: p }); nz({ f: 400, type: 'lowpass', dur: 0.8, vol: 0.08 * v, pan: p }); },
  zombieHurt: (v, p) => tone({ f: 130, fEnd: 80, dur: 0.35, type: 'sawtooth', vol: 0.18 * v, lp: 500, pan: p }),
  zombieDeath: (v, p) => tone({ f: 110, fEnd: 45, dur: 0.9, type: 'sawtooth', vol: 0.18 * v, lp: 450, pan: p }),
  villagerSay: (v, p) => { tone({ f: 165, fEnd: 205, dur: 0.32, type: 'sawtooth', vol: 0.12 * v, lp: 900, vib: [9, 7], attack: 0.03, pan: p }); tone({ f: 330, fEnd: 410, dur: 0.3, type: 'triangle', vol: 0.05 * v, lp: 1400, pan: p }); },
  villagerYes: (v, p) => { for (let i = 0; i < 2; i++) tone({ f: 190 + i * 70, fEnd: 240 + i * 80, dur: 0.14, type: 'sawtooth', vol: 0.11 * v, lp: 1000, when: i * 0.16, pan: p }); },
  villagerNo: (v, p) => tone({ f: 210, fEnd: 140, dur: 0.42, type: 'sawtooth', vol: 0.12 * v, lp: 800, vib: [11, 9], pan: p }),
  villagerHurt: (v, p) => tone({ f: 260, fEnd: 170, dur: 0.22, type: 'sawtooth', vol: 0.13 * v, lp: 1000, pan: p }),
  villagerDeath: (v, p) => tone({ f: 220, fEnd: 90, dur: 0.6, type: 'sawtooth', vol: 0.13 * v, lp: 900, pan: p }),
  join: (v) => { [523, 659, 784].forEach((f, i) => tone({ f, dur: 0.35, vol: 0.07 * v, when: i * 0.1, type: 'triangle' })); },
  leave: (v) => { [659, 494].forEach((f, i) => tone({ f, dur: 0.35, vol: 0.06 * v, when: i * 0.12, type: 'triangle' })); },
  flint: (v, p) => { nz({ f: 3600, q: 3, dur: 0.06, vol: 0.3 * v, pan: p }); nz({ f: 5200, q: 2, dur: 0.08, vol: 0.22 * v, when: 0.05, pan: p }); },
  portalLight: (v, p) => { tone({ f: 110, fEnd: 330, dur: 1.2, type: 'sawtooth', vol: 0.1 * v, lp: 700, vib: [6, 14], attack: 0.2, pan: p }); nz({ f: 800, type: 'lowpass', dur: 1.0, vol: 0.12 * v, attack: 0.3, pan: p }); },
  portalNear: (v, p) => tone({ f: 70, fEnd: 95, dur: 2.4, type: 'sawtooth', vol: 0.09 * v, lp: 420, vib: [3, 10], attack: 0.6, pan: p }),
  portalTravel: (v) => { tone({ f: 60, fEnd: 240, dur: 1.6, type: 'sawtooth', vol: 0.12 * v, lp: 900, vib: [5, 18], attack: 0.1 }); nz({ f: 400, fEnd: 2400, type: 'bandpass', q: 1.5, dur: 1.4, vol: 0.14 * v, attack: 0.2 }); },
  portalBreak: (v, p) => { nz({ f: 2600, q: 1.2, dur: 0.4, vol: 0.3 * v, pan: p }); tone({ f: 500, fEnd: 120, dur: 0.5, type: 'triangle', vol: 0.1 * v, pan: p }); },
  piglinSay: (v, p) => { for (let i = 0; i < 2; i++) tone({ f: randRange(150, 190), fEnd: 110, dur: 0.18, type: 'sawtooth', vol: 0.13 * v, lp: 700, when: i * 0.22, pan: p }); },
  piglinHurt: (v, p) => tone({ f: 260, fEnd: 150, dur: 0.25, type: 'sawtooth', vol: 0.16 * v, lp: 900, pan: p }),
  piglinDeath: (v, p) => tone({ f: 220, fEnd: 60, dur: 0.8, type: 'sawtooth', vol: 0.16 * v, lp: 700, pan: p }),
  piglinAngry: (v, p) => { tone({ f: 200, fEnd: 320, dur: 0.3, type: 'sawtooth', vol: 0.18 * v, lp: 1100, pan: p }); tone({ f: 320, fEnd: 180, dur: 0.3, type: 'sawtooth', vol: 0.16 * v, lp: 1100, when: 0.3, pan: p }); },
  magmaSay: (v, p) => { nz({ f: 500, fEnd: 200, type: 'lowpass', dur: 0.3, vol: 0.25 * v, pan: p }); tone({ f: 90, fEnd: 60, dur: 0.25, type: 'triangle', vol: 0.12 * v, pan: p }); },
  magmaHurt: (v, p) => { nz({ f: 900, fEnd: 300, type: 'lowpass', dur: 0.25, vol: 0.28 * v, pan: p }); },
  magmaDeath: (v, p) => { nz({ f: 700, fEnd: 120, type: 'lowpass', dur: 0.6, vol: 0.3 * v, pan: p }); tone({ f: 120, fEnd: 40, dur: 0.5, type: 'triangle', vol: 0.12 * v, pan: p }); },
  // bows, crossbows, dispensers, switches
  bowDraw: (v, p) => { tone({ f: 200, fEnd: 320, dur: 0.6, type: 'sawtooth', vol: 0.045 * v, lp: 800, vib: [18, 6], pan: p }); nz({ f: 1400, q: 3, dur: 0.45, vol: 0.05 * v, attack: 0.1, pan: p }); },
  bowShoot: (v, p) => { tone({ f: 190, fEnd: 85, dur: 0.2, type: 'triangle', vol: 0.2 * v, pan: p }); nz({ f: 2600, fEnd: 800, q: 1.5, dur: 0.16, vol: 0.22 * v, pan: p }); },
  arrowHit: (v, p) => { nz({ f: 800, q: 2, dur: 0.06, vol: 0.3 * v, pan: p }); tone({ f: 260, fEnd: 140, dur: 0.08, type: 'square', vol: 0.06 * v, lp: 1200, pan: p }); },
  crossbowLoad: (v, p) => { for (let i = 0; i < 5; i++) nz({ f: 3000, q: 4, dur: 0.03, vol: 0.12 * v, when: i * 0.24, pan: p }); },
  crossbowLoaded: (v, p) => { tone({ f: 300, fEnd: 190, dur: 0.1, type: 'square', vol: 0.08 * v, lp: 1500, pan: p }); nz({ f: 1200, q: 3, dur: 0.05, vol: 0.2 * v, pan: p }); },
  crossbowShoot: (v, p) => { nz({ f: 3200, fEnd: 800, q: 1, dur: 0.2, vol: 0.3 * v, pan: p }); tone({ f: 150, fEnd: 70, dur: 0.15, type: 'triangle', vol: 0.22 * v, pan: p }); },
  dispense: (v, p) => { tone({ f: 1200, fEnd: 600, dur: 0.05, type: 'square', vol: 0.08 * v, lp: 3000, pan: p }); nz({ f: 1800, fEnd: 600, dur: 0.15, vol: 0.15 * v, when: 0.03, pan: p }); },
  dispenseFail: (v, p) => { for (let i = 0; i < 2; i++) tone({ f: 900, dur: 0.04, type: 'square', vol: 0.07 * v, lp: 2500, when: i * 0.09, pan: p }); },
  leverClick: (v, p) => { tone({ f: 700, fEnd: 400, dur: 0.05, type: 'square', vol: 0.1 * v, lp: 2000, pan: p }); nz({ f: 1200, q: 3, dur: 0.04, vol: 0.15 * v, pan: p }); },
  buttonClick: (v, p) => tone({ f: 1000, fEnd: 600, dur: 0.04, type: 'square', vol: 0.08 * v, lp: 2500, pan: p }),
  pearlThrow: (v, p) => nz({ f: 1500, fEnd: 500, q: 1, dur: 0.25, vol: 0.18 * v, pan: p }),
  // endermen and ghasts
  endermanSay: (v, p) => tone({ f: 300, fEnd: 120, dur: 0.6, type: 'sawtooth', vol: 0.08 * v, lp: 900, vib: [12, 40], pan: p }),
  endermanStare: (v, p) => { tone({ f: 600, fEnd: 900, dur: 1.0, type: 'sawtooth', vol: 0.13 * v, lp: 2400, vib: [25, 80], attack: 0.05, pan: p }); nz({ f: 2000, q: 2, dur: 1.0, vol: 0.1 * v, pan: p }); },
  endermanAngry: (v, p) => tone({ f: 650, fEnd: 950, dur: 0.6, type: 'sawtooth', vol: 0.12 * v, lp: 2400, vib: [25, 80], pan: p }),
  endermanHurt: (v, p) => tone({ f: 500, fEnd: 250, dur: 0.3, type: 'sawtooth', vol: 0.12 * v, lp: 1600, vib: [30, 60], pan: p }),
  endermanDeath: (v, p) => tone({ f: 600, fEnd: 80, dur: 1.2, type: 'sawtooth', vol: 0.14 * v, lp: 1400, vib: [20, 60], pan: p }),
  endermanPortal: (v, p) => { nz({ f: 600, fEnd: 3000, q: 2, dur: 0.35, vol: 0.2 * v, pan: p }); tone({ f: 200, fEnd: 800, dur: 0.3, vol: 0.07 * v, pan: p }); },
  ghastSay: (v, p) => { tone({ f: 700, fEnd: 480, dur: 1.2, vol: 0.06 * v, vib: [6, 30], attack: 0.3, pan: p }); tone({ f: 1050, fEnd: 720, dur: 1.2, type: 'triangle', vol: 0.03 * v, vib: [5, 40], attack: 0.3, pan: p }); },
  ghastWarn: (v, p) => tone({ f: 400, fEnd: 900, dur: 0.6, type: 'sawtooth', vol: 0.08 * v, lp: 1800, vib: [10, 20], pan: p }),
  ghastShoot: (v, p) => { nz({ f: 400, fEnd: 2000, q: 0.8, dur: 0.4, vol: 0.3 * v, pan: p }); tone({ f: 120, fEnd: 60, dur: 0.3, type: 'triangle', vol: 0.15 * v, pan: p }); },
  ghastHurt: (v, p) => tone({ f: 900, fEnd: 600, dur: 0.4, vol: 0.1 * v, vib: [8, 50], pan: p }),
  ghastDeath: (v, p) => tone({ f: 800, fEnd: 200, dur: 1.4, vol: 0.12 * v, vib: [6, 60], pan: p }),
  // minecarts and the car
  minecartRoll: (v, p) => { nz({ f: 300, type: 'lowpass', dur: 0.3, vol: 0.12 * v, pan: p }); tone({ f: 60, dur: 0.3, type: 'triangle', vol: 0.05 * v, pan: p }); },
  carEngine: (v, p) => tone({ f: 48 + 40 * v, fEnd: 44 + 40 * v, dur: 0.2, type: 'sawtooth', vol: 0.07 * v, lp: 420, pan: p }),
  carStart: (v, p) => { tone({ f: 40, fEnd: 120, dur: 0.6, type: 'sawtooth', vol: 0.12 * v, lp: 600, pan: p }); nz({ f: 300, type: 'lowpass', dur: 0.5, vol: 0.1 * v, pan: p }); },
  honk: (v, p) => { for (let i = 0; i < 2; i++) { tone({ f: 440, dur: 0.2, type: 'square', vol: 0.09 * v, lp: 2000, when: i * 0.28, pan: p }); tone({ f: 554, dur: 0.2, type: 'square', vol: 0.07 * v, lp: 2000, when: i * 0.28, pan: p }); } },
  // TNT
  partyPop: (v, p) => {
    nz({ f: 2500, q: 0.8, dur: 0.15, vol: 0.4 * v, pan: p });
    tone({ f: 600, fEnd: 1300, dur: 0.6, type: 'square', vol: 0.05 * v, lp: 3000, vib: [15, 30], when: 0.1, pan: p });
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone({ f, dur: 0.25, type: 'triangle', vol: 0.08 * v, when: 0.25 + i * 0.11, pan: p }));
  },
  iceBlast: (v, p) => {
    nz({ f: 4000, q: 1, dur: 0.6, vol: 0.3 * v, pan: p }); nz({ f: 800, fEnd: 200, type: 'lowpass', dur: 0.8, vol: 0.3 * v, pan: p });
    for (let i = 0; i < 6; i++) tone({ f: randRange(2000, 4200), dur: 0.12, vol: 0.04 * v, when: i * 0.05, pan: p });
  },
  digBoom: (v, p) => { nz({ f: 600, fEnd: 100, type: 'lowpass', q: 0.7, dur: 0.5, vol: 0.4 * v, pan: p }); tone({ f: 60, fEnd: 35, dur: 0.4, vol: 0.3 * v, pan: p }); },
  creeperSay: () => {},
  creeperHurt: (v, p) => nz({ f: 2000, q: 1, dur: 0.2, vol: 0.2 * v, pan: p }),
  creeperDeath: (v, p) => nz({ f: 1500, fEnd: 400, q: 1, dur: 0.5, vol: 0.25 * v, pan: p }),
};
function sfx(name, x, y, z, vmul) {
  if (!AUDIO.ctx || AUDIO.ctx.state !== 'running') return;
  let v = vmul === undefined ? 1 : vmul, pan = 0;
  if (x !== undefined) {
    const dx = x - AUDIO.lx, dy = y - AUDIO.ly, dz = z - AUDIO.lz, d = Math.hypot(dx, dy, dz);
    if (d > 28) return;
    v *= clamp(1 - d / 28, 0, 1);
    if (d > 0.5) { const rx = Math.cos(AUDIO.lyaw), rz = -Math.sin(AUDIO.lyaw); pan = ((dx * rx + dz * rz) / d) * 0.7; }
  }
  if (v < 0.01) return;
  try {
    const us = name.indexOf('_');
    if (us > 0) { matSound(name.slice(0, us), name.slice(us + 1), v, pan); return; }
    const f = SFX[name];
    if (f) f(v, pan);
  } catch (e) { /* audio errors never break the game */ }
}

/* ---- gentle generative piano ---- */
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
function pianoNote(midi, when, vel) {
  const ctx = AUDIO.ctx, t = ctx.currentTime + when, f = NOTE(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.01);
  g.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(8000, f * 7), t); lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.6), t + 2);
  const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.003;
  const g2 = ctx.createGain(); g2.gain.value = 0.3;
  o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(AUDIO.music);
  o1.start(t); o2.start(t); o1.stop(t + 3.7); o2.stop(t + 3.7);
}
const CHORDS = [[48, [60, 62, 64, 67, 69, 72, 74, 76]], [45, [57, 60, 62, 64, 67, 69, 72, 76]], [41, [57, 60, 65, 67, 69, 72, 77]], [43, [59, 62, 67, 69, 71, 74, 79]]];
function playPhrase() {
  if (!AUDIO.ctx || !AUDIO.musicOn || AUDIO.ctx.state !== 'running') return;
  let t = 0.1;
  const bars = 2 + randInt(0, 2);
  let ci = randInt(0, 3);
  for (let b = 0; b < bars; b++) {
    const [root, scale] = CHORDS[ci];
    pianoNote(root, t, 0.16); pianoNote(root + 7, t + 0.02, 0.08);
    let k = randInt(2, scale.length - 3);
    const n = randInt(3, 6);
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.8) pianoNote(scale[k], t + 0.05, randRange(0.07, 0.14));
      if (Math.random() < 0.15) pianoNote(scale[Math.max(0, k - 2)], t + 0.06, 0.06);
      k = clamp(k + randInt(-2, 2), 0, scale.length - 1);
      t += randRange(0.45, 0.8);
    }
    t += 0.3;
    ci = (ci + [1, 2, 3][randInt(0, 2)]) % 4;
  }
}
function scheduleMusic(delay) {
  clearTimeout(AUDIO.musicTimer);
  AUDIO.musicTimer = setTimeout(() => { playPhrase(); scheduleMusic(randRange(18, 40)); }, delay * 1000);
}
