/* ===================== The flying car and broomsticks ===================== */
// Both go where you look. The flying car drives along the ground like a car; Jump (or pushing forward while looking
// up) folds out its wings and it takes off. In the air, push forward to fly the way you are looking, Jump goes up and
// Sneak goes down; let go and it hovers. It lands by itself when it comes down onto the ground, and then Sneak gets
// out. A broomstick flies the same way, quicker and nimbler, and hovers waiting when nobody is on it. With nobody on
// board, a flying car (or a broom still in the air) floats gently down.
const FLYERS = {
  flycar: { speed: 12, climb: 6, turn: 1.6, follow: 3, acc: 1.6 },
  broom: { speed: 15, climb: 7, turn: 2.3, follow: 6, acc: 2.6 },
};
const isFlyer = v => !!(v && FLYERS[v.type]);
/* the height to stand at on the ground under a spot up in the air (on water too), or -1 if there is none (nothing but
   the void, or lava) */
function groundUnder(w, x, y, z) {
  const bx = Math.floor(x), bz = Math.floor(z);
  for (let yy = Math.min(WH - 2, Math.floor(y)); yy >= 1; yy--) {
    const b = w.getBlock(bx, yy - 1, bz);
    if (b === B.UNLOADED || b === B.LAVA) return -1;
    if (SOLID[b] || b === B.WATER) return yy;
  }
  return -1;
}
/* is this a flying car, a broom or a rocket up in the air? (saved, it is kept on the ground below, and its rider beside it) */
const aloft = (w, v) => (isFlyer(v) || v.type === 'rocket') && !SOLID[w.getBlock(Math.floor(v.x), Math.floor(v.y + 0.01) - 1, Math.floor(v.z))];

function flyStep(game, e, dt) {
  const w = game.world, pl = game.player, F = FLYERS[e.type], me = e.rider === 'me', broom = e.type === 'broom';
  const thr = me ? e.ctrlZ || 0 : 0, steer = me ? e.ctrlX || 0 : 0, up = me && !!e.up, down = me && !!e.down;
  if (me) {   // it heads where its driver looks; left and right turn the view, and so the vehicle
    pl.yaw -= steer * F.turn * dt;
    e.yaw = approachAngle(e.yaw, pl.yaw, dt * F.follow);
  }
  const pitch = me ? clamp(pl.pitch, -1.2, 1.2) : 0;
  if (!e.flying && me && (up || (thr > 0.3 && pitch > 0.35) || (broom && Math.abs(thr) > 0.1))) {   // take off
    e.flying = true; e.vy = Math.max(e.vy, broom ? 2 : 3);
    sfx(broom ? 'broomWhoosh' : 'flycarLift', e.x, e.y, e.z);
  }
  if (e.flying) {
    const cp = Math.cos(pitch), sp = thr > 0.1 ? thr * F.speed : thr < -0.1 ? thr * F.speed * 0.4 : 0, k = Math.min(1, dt * F.acc);
    let tvy = Math.sin(pitch) * sp + (up ? F.climb : 0) - (down ? F.climb : 0);
    if (!me) tvy = -2;   // nobody on board: it floats down
    else if (!sp && !up && !down) tvy = Math.sin(e.age * 2.2) * 0.25;   // hovering, bobbing a little
    if (e.y > WH + 48) tvy = Math.min(tvy, 0);   // (high enough)
    e.vx += (-Math.sin(e.yaw) * cp * sp - e.vx) * k; e.vz += (-Math.cos(e.yaw) * cp * sp - e.vz) * k;
    e.vy += (tvy - e.vy) * Math.min(1, dt * 3);
    moveEntity(w, e, e.vx * dt, e.vy * dt, e.vz * dt);
    if (e.onGround && !up) { e.flying = false; e.vy = 0; sfx(broom ? 'broomWhoosh' : 'flycarLand', e.x, e.y, e.z, 0.6); }   // touched down
    e.onGround = false; e.fallDist = 0;
    e.slope = lerp(e.slope || 0, sp ? clamp(pitch * Math.sign(sp), -0.6, 0.6) : 0, Math.min(1, dt * 3));
    e.bank = lerp(e.bank || 0, steer * (broom ? 0.5 : 0.3), Math.min(1, dt * 4));
    if (!broom && (sp > 0.5 || up) && Math.random() < dt * 30 && PARTICLES.length < 1500) {   // flames from the jets
      const bx = e.x + Math.sin(e.yaw) * 1.4, bz = e.z + Math.cos(e.yaw) * 1.4, side = (Math.random() < 0.5 ? -1 : 1) * 0.38;
      PARTICLES.push({ x: bx + Math.cos(e.yaw) * side, y: e.y + 0.5, z: bz - Math.sin(e.yaw) * side, vx: Math.sin(e.yaw) * 2, vy: randRange(-0.2, 0.2), vz: Math.cos(e.yaw) * 2, life: randRange(0.15, 0.3), tile: TILE.flame, u: 0, v: 0, us: 16, size: randRange(0.1, 0.16), grav: 0, bright: 1 });
    }
    if (broom && Math.hypot(e.vx, e.vz) > 9 && Math.random() < dt * 12 && PARTICLES.length < 1500) PARTICLES.push({ x: e.x + Math.sin(e.yaw) * 1, y: e.y + 0.7, z: e.z + Math.cos(e.yaw) * 1, vx: 0, vy: 0, vz: 0, life: 0.5, tile: TILE.ender_dot, u: 0, v: 0, us: 16, size: 0.05, grav: 0, bright: 1 });   // a trail of sparkles
  } else if (broom) {   // a broom waiting where it was left: it hovers there, quite still
    const f = Math.pow(0.02, dt); e.vx *= f; e.vz *= f; e.vy = 0;
    moveEntity(w, e, e.vx * dt, 0, e.vz * dt);
    e.slope = lerp(e.slope || 0, 0, Math.min(1, dt * 3)); e.bank = lerp(e.bank || 0, 0, Math.min(1, dt * 3)); e.fallDist = 0;
  } else {   // the flying car on the ground: it drives like a car, the way its driver looks
    const sx = e.ctrlX; e.ctrlX = 0;
    carStep(game, e, dt);
    e.ctrlX = sx;
    e.bank = lerp(e.bank || 0, 0, Math.min(1, dt * 4));
  }
}
/* the sounds: an engine humming in the air; a broom whooshes when it goes fast */
function flySounds(e, sp) {
  if (!e.rider) return;
  if (e.type === 'flycar') {
    if (e.flying) { e.sndT = 0.3; sfx('flycarHum', e.x, e.y, e.z, clamp(0.45 + Math.hypot(sp, e.vy || 0) / 14, 0.45, 1)); }
    else if (sp > 0.5) { e.sndT = 0.16; sfx('carEngine', e.x, e.y, e.z, clamp(0.4 + sp / 12, 0.4, 1)); }
  } else if (e.flying && sp > 6) { e.sndT = 0.5; sfx('broomWhoosh', e.x, e.y, e.z, clamp(sp / 16, 0.3, 0.8)); }
}
/* the rider in the air can't just step out: Sneak takes it down instead (and gets out once it has landed) */
function flyControls(game, pl, v, fx, fz, inp) {
  v.up = !!inp.jump; v.down = !!inp.sneak && !!v.flying;
  if (inp.sneak && !pl.sneakHeld && !v.flying) { pl.sneakHeld = true; dismountVehicle(game); return; }
  pl.sneakHeld = !!inp.sneak;
  v.ctrlX = fx; v.ctrlZ = fz;
}
