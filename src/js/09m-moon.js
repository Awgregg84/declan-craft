/* ===================== The rocket and the Moon ===================== */
// Make a rocket and stand it on the ground. Tap it to get in, then tap again: 3, 2, 1... blast off! Everyone playing
// together comes along. On the Moon there is no air, so wear a space helmet (the rocket gives you one if you have
// none), or stay in the rocket. Gravity is weak there: you jump high and fall slowly. Tap the rocket to fly home; it
// lands back where it took off. Put up a flag to show you were there!
const MOON_G = 0.32;   // how much of the usual gravity there is on the Moon
const ROCKET_UP = 7.5;   // seconds from the start of the countdown to leaving the world behind

/* big words in the middle of the screen (a countdown) */
function bigText(text, secs) {
  const e = el('big-text');
  e.textContent = text; e.hidden = false;
  e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  clearTimeout(bigText.tm);
  bigText.tm = setTimeout(() => { e.hidden = true; }, (secs || 0.9) * 1000);
}
const wearsSpaceHelmet = p => !!(p.inv && p.inv[ARMOR_INV] && p.inv[ARMOR_INV].id === I.SPACE_HELMET);
const inRocket = p => !!(p.riding && p.riding.type === 'rocket');
/* can this player breathe where they are? (on the Moon: only in a space helmet, or inside the rocket) */
const canBreatheHere = p => game.dim !== 'moon' || wearsSpaceHelmet(p) || inRocket(p);

/* tap inside a rocket: the countdown starts (and everyone playing together is told) */
function rocketLaunch(game, pl, v) {
  if (v.launchT > 0 || v.landing) return;
  if (game.dim === 'nether') { toast("A rocket can't take off in the Nether: there's a roof in the way!", 3); return; }
  v.launchT = 0.001; v.shown = 0; v.lifted = false; v.gone = false;
  game.viewBefore = game.view; game.view = 1;   // (watch it go from behind)
  chat(game.dim === 'moon' ? '3, 2, 1... off home we go!' : '3, 2, 1... off to the Moon!', '#ffd24a');
  if (game.net) MP.rocketLaunch(game.dim === 'moon');
}
function rocketFlames(e, k) {
  for (let i = 0; i < 3 && PARTICLES.length < 1500; i++) {
    if (Math.random() > k) continue;
    PARTICLES.push({ x: e.x + randRange(-0.2, 0.2), y: e.y - 0.1, z: e.z + randRange(-0.2, 0.2), vx: randRange(-1, 1), vy: randRange(-7, -4), vz: randRange(-1, 1),
      life: randRange(0.2, 0.45), tile: TILE.flame, u: 0, v: 0, us: 16, size: randRange(0.18, 0.3), grav: 0, bright: 1 });
  }
  if (Math.random() < k * 0.8) smokeParticles(e.x, e.y - 0.6, e.z, 1, 0.5, true);
}
function rocketStep(game, e, dt) {
  const w = game.world, me = e.rider === 'me';
  if (e.landing) {   // coming down onto the ground on its flames, slower and slower
    const top = w.topSolid(Math.floor(e.x), Math.floor(e.z)), gy = top >= 0 ? top + 1 : e.y - 40;
    e.vy += (-clamp((e.y - gy) * 0.9, 1.5, 14) - e.vy) * Math.min(1, dt * 4);
    moveEntity(w, e, 0, e.vy * dt, 0);
    rocketFlames(e, 0.7);
    if (e.onGround || e.y < -20) {
      e.landing = false; e.vy = 0; e.padY = undefined;
      sfx('rocketLand', e.x, e.y, e.z);
      smokeParticles(e.x, e.y + 0.3, e.z, 14, 1.4, true);
      if (me) {
        if (game.viewBefore !== undefined) { game.view = game.viewBefore; game.viewBefore = undefined; }
        toast(game.dim === 'moon' ? 'You landed on the Moon! Press Sneak to get out.' : 'Home again! Press Sneak to get out.', 4);
      }
    }
    e.fallDist = 0;
    return;
  }
  if (e.launchT > 0) {
    if (!e.rider) {   // (whoever was in it is gone: it comes back down)
      e.launchT = 0; if (e.lifted) e.landing = true;
      return;
    }
    if (e.padY === undefined) e.padY = e.y;   // (where it stood: in a save made on the way, it is still there)
    e.launchT += dt;
    if (e.launchT < 3) {   // 3, 2, 1...
      const n = 3 - Math.floor(e.launchT);
      if (n !== e.shown) { e.shown = n; if (me) bigText(String(n)); sfx('rocketBeep', e.x, e.y + 2, e.z); }
      if (Math.random() < dt * 8) smokeParticles(e.x, e.y + 0.2, e.z, 1, 0.7, true);
      return;
    }
    if (!e.lifted) { e.lifted = true; if (me) bigText('Blast off!', 1.4); sfx('rocketRoar', e.x, e.y, e.z); smokeParticles(e.x, e.y + 0.3, e.z, 16, 1.6, true); }
    if (me) game.shake = Math.max(game.shake, 0.22);
    e.vy = Math.min(45, (e.vy || 0) + dt * (4 + (e.launchT - 3) * 7));
    e.y += e.vy * dt;   // (straight up, whatever is in the way)
    rocketFlames(e, 1);
    if (e.launchT > ROCKET_UP && me && !e.gone) {   // out of sight: off to the other world, everyone together
      e.gone = true;
      if (MP.role === 'guest') MP.send({ t: 'rocket', e: e.nid });
      else game.rocketTravel(null, e);
    }
    if (e.launchT > ROCKET_UP + 10) { e.launchT = 0; e.lifted = false; e.gone = false; e.vy = 0; e.landing = true; }   // (it couldn't go after all: back down)
    return;
  }
  e.vx *= Math.pow(0.01, dt); e.vz *= Math.pow(0.01, dt);   // standing still on the ground (or falling down onto it)
  physicsStep(w, e, dt, 24);
  e.fallDist = 0;
}
/* arriving on the Moon (or loading a world there, or waking up there): a space helmet for anyone without one */
function moonArrival(game) {
  const pl = game.player;
  if (game.dim !== 'moon' || game.mode !== 'survival' || !pl.alive) return;
  if (!game.stats.moon) { game.stats.moon = 1; chat('Welcome to the Moon! There is no air here, so keep your space helmet on. Jump: you can go really high!', '#ffd24a'); }
  if (wearsSpaceHelmet(pl) || pl.inv.some(s => s && s.id === I.SPACE_HELMET)) return;
  if (!pl.inv[ARMOR_INV]) pl.inv[ARMOR_INV] = { id: I.SPACE_HELMET, count: 1 };
  else if (pl.give(I.SPACE_HELMET, 1) > 0) dropItem(game, pl.x, pl.y + 1, pl.z, I.SPACE_HELMET, 1);
  else toast('You have a space helmet in your bag. Put it on so you can breathe!', 4);
  ui.dirty = true; ui.armor = -2;
}
/* a flag standing on its block, turned toward whoever put it up */
const _fg = M4.create();
SPECIAL_DRAW[B.FLAG] = (w, x, y, z, data, s, t, cam) => {
  const P = PROG.entity;
  entityBegin(texSkins);
  gl.uniform1f(P.u.uBright, brightAt(w, x + 0.5, y + 1, z + 0.5, s));
  M4.identity(_fg);
  M4.translate(_fg, _fg, x + 0.5 - cam.x, y - cam.y, z + 0.5 - cam.z);
  M4.rotY(_fg, _fg, (data & 15) * Math.PI / 8);
  M4.scale(_fg, _fg, 1 / 16, 1 / 16, 1 / 16);
  gl.enable(gl.CULL_FACE);
  drawModel(MODELS.flag, _fg, null);
};
