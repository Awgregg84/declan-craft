/* ===================== Ghostbusters (the sixth wish list) ===================== */
// A spooky little city at dusk (see ghostGen in 02b-gen3.js): the firehouse headquarters, houses along the main street
// (two of them haunted), the library and the park. Ghosts float about playing tricks: a green slimy one swoops at you
// and splats you with slime (it only slows you down for a moment), floating sheet ghosts go "Boo!" and bang doors open
// and shut, and a big marshmallow giant stomps about the park. Nothing here can hurt you.
// You start with everything you need: the proton pack (hold to fire a crackling stream that holds a ghost still), the
// ghost trap (throw it under a ghost you are holding to catch it) and the ghost detector (in your hand, it lights up and
// beeps faster the closer you get to a ghost). The host's iPad runs the ghosts; everyone counts their own catches.
const GHOST_TYPES = ['slimer', 'sheetghost', 'marshmallow'];
const GHOST_MILESTONES = [1, 5, 10, 20, 30, 50, 75, 100];
const PROTON_RANGE = 18, TRAP_RANGE = 14, GHOST_DUSK = 0.503;
defItem(I.PROTON_PACK, 'Proton Pack', { tex: 'proton_pack', stack: 1 });
defItem(I.GHOST_TRAP, 'Ghost Trap', { tex: 'ghost_trap', stack: 1 });
defItem(I.GHOST_DETECTOR, 'Ghost Detector', { tex: 'ghost_detector', stack: 1 });
const atGhost = () => game.mapId === 'ghost' && game.dim === 'over';
const isGhost = e => !!(e && !e.removed && !e.dead && MOB_DEFS[e.type] && MOB_DEFS[e.type].ghost);

/* ---- the counter at the top of the screen (the Life Cycle world uses it too) ---- */
function hudCount(text) {
  let d = el('hud-count');
  if (!d) { d = h('div', { id: 'hud-count', role: 'status' }); el('hud').appendChild(d); }
  if (text === null) { if (!d.hidden) d.hidden = true; return; }
  if (d.textContent !== text) d.textContent = text;
  if (d.hidden) d.hidden = false;
}

/* ---- arriving: a hello, and your equipment ---- */
function ghostWelcome(game) {
  if (!game.stats.ghostHi) { game.stats.ghostHi = 1; chat("Welcome to the city! Who you gonna call? You! The firehouse is your headquarters. Ghosts are about: hold the proton pack to catch one in its stream, then throw the trap under it!", '#9aff8a'); }
  if (!game.stats.ghKit) {
    game.stats.ghKit = 1;
    const pl = game.player;
    for (const id of [I.PROTON_PACK, I.GHOST_TRAP, I.GHOST_DETECTOR]) if (!pl.inv.some(s => s && s.id === id)) { const left = pl.give(id, 1); if (left > 0) dropItem(game, pl.x, pl.y + 1, pl.z, id, 1); }
    ui.dirty = true;
    if (MP.role === 'guest') MP.sendSave();
  }
}

/* ---- the ghosts (the host's iPad runs them) ---- */
function ghostSpawnTick(game) {
  const G = game.gen.ghost, T = G.town, w = game.world, players = livePlayers(game);
  if (!players.length) return;
  const ghosts = game.entities.filter(isGhost), count = t => ghosts.filter(e => e.type === t).length;
  const put = (type, x, z) => {
    const y = game.gen.ghostGround(game.seed, x, z) + 2 + Math.random() * 3;
    if (w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) === B.UNLOADED) return null;
    const e = spawnMob(game, type, x, y, z);
    e.home = [x, z]; e.aiT = 0; e.floatY = y;
    return e;
  };
  if (!count('marshmallow')) { const P = G.park; put('marshmallow', (P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2); }
  const want = 5 + players.length * 2;
  if (ghosts.length >= want) return;
  // round the haunted houses, the library, the park, or anywhere in town near someone
  const p = players[randInt(0, players.length - 1)], [px, , pz] = playerPos(p);
  const spots = G.houses.filter(hs => hs[2]).map(hs => [hs[0], hs[1]]).concat([[(G.library.x0 + G.library.x1) / 2, (G.library.z0 + G.library.z1) / 2], [px + randRange(-24, 24), pz + randRange(-24, 24)]]);
  const s = spots[randInt(0, spots.length - 1)], x = s[0] + randRange(-6, 6), z = s[1] + randRange(-6, 6);
  if (Math.hypot(x - T.x, z - T.z) > T.r || Math.hypot(x - px, z - pz) < 8) return;
  put(count('slimer') <= count('sheetghost') ? 'slimer' : 'sheetghost', x, z);
}
/* float about near home, through walls and all; play tricks when someone comes near */
function updateGhost(game, e, dt) {
  if (game.mapId !== 'ghost' || nearestPlayerDist(game, e) > 110) { e.removed = true; return; }
  e.walk += dt;
  const big = e.type === 'marshmallow', ground = game.gen.ghostGround(game.seed, e.x, e.z) + 1;
  if (e.trapT > 0) {   // being sucked down into a trap: smaller and smaller, then gone
    e.trapT -= dt; e.vx = e.vz = 0;
    e.y += (ground - e.y) * Math.min(1, dt * 3);
    if (e.trapT <= 0) e.removed = true;
    return;
  }
  if (e.heldT > 0) {   // held in a proton stream: it can't get away, it just wriggles
    e.heldT -= dt; e.vx *= 0.8; e.vz *= 0.8;
    e.bodyYaw += Math.sin(e.age * 18) * 0.06;
    e.x += Math.sin(e.age * 23) * 0.01; e.z += Math.cos(e.age * 19) * 0.01;
    if (Math.random() < dt * 2) { sfx('ghostWoo', e.x, e.y + e.h / 2, e.z, 0.6); MP.sfx('ghostWoo', e.x, e.y + e.h / 2, e.z); }
    return;
  }
  const near = closePlayer(game, e, big ? 14 : 9);
  if (e.cdT > 0) e.cdT -= dt;
  e.aiT -= dt;
  if (e.aiT <= 0) {   // somewhere new to float to
    e.aiT = randRange(2, 5);
    const hx = e.home ? e.home[0] : e.x, hz = e.home ? e.home[1] : e.z, a = Math.random() * TAU, r = randRange(2, big ? 10 : 14);
    e.goal = [hx + Math.cos(a) * r, 0, hz + Math.sin(a) * r];
    e.floatY = randRange(1, big ? 1.5 : 5);
  }
  let gx = e.goal ? e.goal[0] : e.x, gz = e.goal ? e.goal[2] : e.z, gy = ground + (e.floatY || 2), sp = big ? 1.1 : 2;
  if (near && !(e.cdT > 0)) {
    const [p, px, py, pz, d] = near;
    if (e.type === 'slimer') {   // swoop at them, and SPLAT
      gx = px; gz = pz; gy = py + 1; sp = 5.5;
      if (d < 1.3 && Math.abs(py + 1 - e.y) < 2) { slimePlayer(game, p, e); e.cdT = 7; e.aiT = 0; }
    } else if (e.type === 'sheetghost') {   // "Boo!", and the doors round about bang open and shut
      e.cdT = randRange(5, 9);
      sfx('ghostBoo', e.x, e.y + 1, e.z); MP.sfx('ghostBoo', e.x, e.y + 1, e.z);
      ghostDoors(game, e);
    } else {   // the giant: a big laugh and a stomp
      e.cdT = randRange(6, 10);
      sfx('ghostLaugh', e.x, e.y + 3, e.z); MP.sfx('ghostLaugh', e.x, e.y + 3, e.z);
    }
  }
  const dx = gx - e.x, dy = gy - e.y, dz = gz - e.z, dd = Math.hypot(dx, dz) || 1, k = Math.min(1, dt * 2);
  e.vx += ((dd > 0.5 ? dx / dd * sp : 0) - e.vx) * k; e.vz += ((dd > 0.5 ? dz / dd * sp : 0) - e.vz) * k;
  e.vy = clamp(dy * 1.5, -3, 3) + Math.sin(e.age * 2.2) * 0.4;
  e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;   // (ghosts float straight through walls)
  if (Math.hypot(e.vx, e.vz) > 0.2) e.bodyYaw = e.headYaw = Math.atan2(-e.vx, -e.vz);
  if (Math.random() < dt * 0.25) { sfx('ghostWoo', e.x, e.y + e.h / 2, e.z, 0.5); MP.sfx('ghostWoo', e.x, e.y + e.h / 2, e.z); }
  if (e.type === 'slimer' && Math.random() < dt * 3) slimeDrip(e.x, e.y + 0.2, e.z, 1);
}
function slimeDrip(x, y, z, n) {
  for (let i = 0; i < n && PARTICLES.length < 1500; i++) PARTICLES.push({ x: x + randRange(-0.3, 0.3), y, z: z + randRange(-0.3, 0.3), vx: randRange(-1.5, 1.5) * (n > 1 ? 1 : 0.2), vy: n > 1 ? randRange(0, 3) : -0.5, vz: randRange(-1.5, 1.5) * (n > 1 ? 1 : 0.2), life: randRange(0.4, 0.9), tile: TILE.slime, u: 0, v: 0, us: 16, size: randRange(0.06, 0.14), grav: 9, bright: 1 });
}
/* SPLAT: green slime all over someone; they are slowed down for a few seconds (no harm done) */
const SLOW_K = POTIONS.findIndex(p => p.key === 'slowness');
function slimePlayer(game, p, e) {
  const [x, y, z] = playerPos(p);
  slimeDrip(x, y + 1.2, z, 24);
  sfx('slimeSplat', x, y + 1, z); MP.sfx('slimeSplat', x, y + 1, z);
  MP.fx('slime', x, y + 1.2, z);
  const s = 3 / POTIONS[SLOW_K].dur;
  if (p === game.player) { potionOnPlayer(p, SLOW_K, s); toast("SPLAT! You got slimed! (It's only slime.)", 2.5); }
  else if (p.link) { p.link.send({ t: 'eff', k: SLOW_K, s: r2(s) }); p.link.send({ t: 'chat', m: "SPLAT! You got slimed! (It's only slime.)", c: '#9aff8a' }); }
}
/* the doors near a sheet ghost bang open and shut */
function ghostDoors(game, e) {
  const w = game.world, bx = Math.floor(e.x), by = Math.floor(game.gen.ghostGround(game.seed, e.x, e.z)) + 1, bz = Math.floor(e.z);
  for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) for (let dy = -1; dy <= 2; dy++) {
    const x = bx + dx, y = by + dy, z = bz + dz, id = w.getBlock(x, y, z);
    if (!IS_DOOR[id] || BLOCKS[id].iron || (w.getData(x, y, z) & 8)) continue;
    setDoorOpen(w, x, y, z, !(w.getData(x, y, z) & 4));
    doorSound(id, x, y, z);
    return;
  }
}

/* ---- the proton pack: hold to fire ---- */
/* the ghost a stream from here, this way, would catch (it bends a little toward the nearest one) */
function protonTarget(game, ox, oy, oz, dx, dy, dz) {
  let best = null, bs = 0.97;
  for (const e of game.entities) {
    if (!isGhost(e) || e.trapT > 0) continue;
    const tx = e.x - ox, ty = e.y + e.h * 0.5 - oy, tz = e.z - oz, d = Math.hypot(tx, ty, tz);
    if (d > PROTON_RANGE + e.w || d < 0.3) continue;
    const c = (tx * dx + ty * dy + tz * dz) / d + Math.min(0.03, e.w * 0.02);
    if (c > bs) { bs = c; best = e; }
  }
  return best;
}
/* a crackling, twisting stream of orange and blue sparks */
function protonBeam(x0, y0, z0, x1, y1, z1, t) {
  const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0), n = Math.min(60, Math.ceil(L * 3));
  for (let i = 0; i <= n && PARTICLES.length < 1560; i++) {
    const f = i / n, wob = Math.sin(f * 14 + t * 30) * 0.18 * Math.sin(f * Math.PI);
    PARTICLES.push({ x: x0 + (x1 - x0) * f + wob, y: y0 + (y1 - y0) * f + Math.cos(f * 11 + t * 27) * 0.15 * Math.sin(f * Math.PI), z: z0 + (z1 - z0) * f - wob, vx: 0, vy: 0, vz: 0, life: 0.09, tile: i % 3 ? TILE.proton : TILE.laser_2, u: 0, v: 0, us: 16, size: 0.07, grav: 0, bright: 1 });
  }
}
function protonTick(game, pl, dt) {
  const [dx, dy, dz] = pl.lookDir(), [ex, ey, ez] = pl.eyePos(), rx = Math.cos(pl.yaw) * 0.3, rz = -Math.sin(pl.yaw) * 0.3;
  const g = protonTarget(game, ex, ey, ez, dx, dy, dz);
  if (g) pl.protonHit = { e: g, t: game.t };   // (the ghost in your stream: the trap goes under it)
  const end = g ? [g.x, g.y + g.h * 0.5, g.z] : [ex + dx * PROTON_RANGE * 0.7, ey + dy * PROTON_RANGE * 0.7, ez + dz * PROTON_RANGE * 0.7];
  protonBeam(ex + rx + dx * 0.4, ey - 0.35, ez + rz + dz * 0.4, end[0], end[1], end[2], game.t);
  pl.protonT = (pl.protonT || 0) - dt;
  if (pl.protonT > 0) return;
  pl.protonT = 0.15;
  sfx('protonCrackle', ex, ey, ez);
  if (MP.role === 'guest') MP.send({ t: 'proton', p: [r2(ex), r2(ey), r2(ez)], d: [dx, dy, dz].map(v => Math.round(v * 1000) / 1000) });
  else { if (g) { g.heldT = 0.45; g.heldBy = 'me'; } MP.localFx('proton', r2(end[0]), r2(end[1]), r2(end[2]), 0); }
}
/* a guest's stream, on the host: worked out here (so the ghost is held), and everyone sees it */
function protonMsg(game, r, m) {
  if (!okXYZ(m.p) || !okXYZ(m.d) || Math.hypot(m.p[0] - r.tx, m.p[2] - r.tz) > 6) return;
  const l = Math.hypot(m.d[0], m.d[1], m.d[2]);
  if (l < 0.5 || l > 1.5) return;
  const g = protonTarget(game, m.p[0], m.p[1], m.p[2], m.d[0] / l, m.d[1] / l, m.d[2] / l);
  if (g) { g.heldT = 0.45; g.heldBy = r.id; }
  const end = g ? [g.x, g.y + g.h * 0.5, g.z] : [m.p[0] + m.d[0] / l * 12, m.p[1] + m.d[1] / l * 12, m.p[2] + m.d[2] / l * 12];
  MP.outFx.push(['proton', r2(end[0]), r2(end[1]), r2(end[2]), 0, r.id]);
  protonBeam(m.p[0], m.p[1] - 0.35, m.p[2], end[0], end[1], end[2], game.t);
}
function protonFx(x, y, z, from) {
  const r = MP.remotes.get(from);
  if (r) { protonBeam(r.x, r.y + 1.2, r.z, x, y, z, game.t); if (Math.random() < 0.5) sfx('protonCrackle', r.x, r.y + 1, r.z, 0.7); }
}

/* ---- the ghost trap: throw it under a ghost someone is holding ---- */
function throwTrap(game, pl) {
  pl.swing();
  const near = e => isGhost(e) && !(e.trapT > 0) && Math.hypot(e.x - pl.x, e.z - pl.z) < TRAP_RANGE;
  const mine = pl.protonHit && game.t - pl.protonHit.t < 1.5 && near(pl.protonHit.e) ? pl.protonHit.e : null;   // (on a guest's iPad only the host knows which ghosts are held: the one in your own stream, or the nearest)
  const held = mine || game.entities.filter(e => near(e) && (e.heldT > 0 || (MP.role === 'guest' && e.proxy))).sort((a, b) => Math.hypot(a.x - pl.x, a.z - pl.z) - Math.hypot(b.x - pl.x, b.z - pl.z))[0];
  if (!held) { toast('First catch a ghost in the proton pack stream (hold Place), then throw the trap under it!', 3.5); return 0.4; }
  sfx('trapThrow', pl.x, pl.y + 1, pl.z);
  if (MP.role === 'guest') MP.send({ t: 'trap', e: held.nid });
  else catchGhost(game, held, 'me');
  return 1;
}
/* the trap opens under the ghost, light pours up, the ghost is sucked down and the trap snaps shut */
const GHOST_TRAPS = [];
function catchGhost(game, e, by) {
  if (!isGhost(e) || e.trapT > 0) return;
  const gy = game.gen.ghostGround(game.seed, e.x, e.z) + 1;
  e.trapT = 1.3; e.heldT = 0;
  trapFx(e.x, gy, e.z, e.type === 'marshmallow');
  MP.fxId('trap', e.x, gy, e.z, e.type === 'marshmallow' ? 1 : 0);
  if (by === 'me') ghostCaught(game, e.type);
  else { const r = MP.remotes.get(by); if (r && r.link) r.link.send({ t: 'ghostc', k: GHOST_TYPES.indexOf(e.type) }); }
}
function trapFx(x, y, z, big) {
  GHOST_TRAPS.push({ x, y, z, t: 0, big });
  sfx('trapOpen', x, y, z);
}
/* one more ghost caught by you: count it, and cheer at the milestones */
function ghostCaught(game, type) {
  const n = game.stats.ghosts = (game.stats.ghosts | 0) + 1, pl = game.player;
  const what = type === 'marshmallow' ? 'the marshmallow giant' : type === 'slimer' ? 'a slimy green ghost' : 'a sheet ghost';
  toast('You caught ' + what + '! Ghosts caught: ' + n, 3);
  if (GHOST_MILESTONES.includes(n) || type === 'marshmallow') {
    bigText(n === 1 ? 'Your first ghost!' : n + ' ghosts caught!', 2.2);
    sfx('levelUp'); partyEffect(pl.x, pl.y + 1, pl.z);
    chat(playerName() + (n === 1 ? ' caught their first ghost!' : ' has caught ' + n + ' ghosts!'), '#9aff8a');
    if (game.net) MP.system(playerName() + (n === 1 ? ' caught their first ghost!' : ' has caught ' + n + ' ghosts!'));
  }
  if (MP.role === 'guest') MP.sendSave();
}
function updateTraps(dt) {
  for (const tr of GHOST_TRAPS) {
    tr.t += dt;
    if (tr.t < 1.3 && PARTICLES.length < 1500) for (let i = 0; i < 3; i++) PARTICLES.push({ x: tr.x + randRange(-0.4, 0.4) * (tr.big ? 2 : 1), y: tr.y + 0.2, z: tr.z + randRange(-0.4, 0.4) * (tr.big ? 2 : 1), vx: 0, vy: randRange(3, 6), vz: 0, life: 0.5, tile: TILE.spark_yellow, u: 0, v: 0, us: 16, size: 0.09, grav: 0, bright: 1 });
    if (tr.t >= 1.3 && !tr.shut) { tr.shut = true; sfx('trapShut', tr.x, tr.y, tr.z); smokeParticles(tr.x, tr.y + 0.3, tr.z, 6, 0.2, false); }
  }
  for (let i = GHOST_TRAPS.length - 1; i >= 0; i--) if (GHOST_TRAPS[i].t > 2.4) GHOST_TRAPS.splice(i, 1);
}
const _gt = M4.create();
function drawTraps(cam) {
  if (!GHOST_TRAPS.length) return;
  const P = PROG.entity;
  for (const tr of GHOST_TRAPS) {
    const open = tr.t < 1.3 ? Math.min(1, tr.t * 5) : Math.max(0, 1 - (tr.t - 1.3) * 6);
    gl.uniform1f(P.u.uBright, 1); gl.uniform4fv(P.u.uTint, [0, 0, 0, 0]);
    M4.identity(_gt); M4.translate(_gt, _gt, tr.x - cam.x, tr.y - cam.y, tr.z - cam.z); M4.scale(_gt, _gt, 1 / 16, 1 / 16, 1 / 16);
    drawModel(MODELS.ghost_trap, _gt, { lidL: [0, 0, open * 1.2], lidR: [0, 0, -open * 1.2] });
  }
}

/* ---- the ghost detector: lights and a beep that speeds up as a ghost gets closer ---- */
function detectorTick(game, dt) {
  const pl = game.player, held = pl.heldId() === I.GHOST_DETECTOR && atGhost();
  let box = el('pke');
  if (!held) { if (box && !box.hidden) box.hidden = true; return; }
  if (!box) { box = h('div', { id: 'pke', role: 'status', 'aria-live': 'off' }); box.appendChild(h('div', { class: 'pke-lights' })); box.appendChild(h('div', { class: 'pke-say' })); el('hud').appendChild(box); for (let i = 0; i < 6; i++) box.firstChild.appendChild(h('span')); }
  box.hidden = false;
  let d = Infinity;
  for (const e of game.entities) if (isGhost(e)) d = Math.min(d, Math.hypot(e.x - pl.x, e.y + e.h / 2 - pl.y - 1, e.z - pl.z) - e.w);
  const lvl = d === Infinity ? 0 : clamp(Math.ceil((42 - d) / 7), 0, 6);
  box.firstChild.childNodes.forEach((s, i) => { const on = i < lvl; if (s.classList.contains('on') !== on) s.classList.toggle('on', on); });
  const say = lvl === 0 ? 'No ghosts near' : lvl <= 2 ? 'A ghost... somewhere' : lvl <= 4 ? 'Ghost close!' : 'GHOST RIGHT HERE!';
  if (box.lastChild.textContent !== say) box.lastChild.textContent = say;
  box.dataset.level = lvl;
  if (!lvl) return;
  pl.pkeT = (pl.pkeT || 0) - dt;
  if (pl.pkeT <= 0) { pl.pkeT = [1.2, 0.9, 0.6, 0.4, 0.25, 0.12][lvl - 1]; sfx('pkeBeep', pl.x, pl.y + 1, pl.z, 0.4 + lvl * 0.1); }
}
/* every frame in this world */
function ghostTick(game, dt) {
  const pl = game.player;
  if (MP.role !== 'guest') game.world.time = GHOST_DUSK;   // (always dusk here)
  updateTraps(dt);
  detectorTick(game, dt);
  hudCount('Ghosts caught: ' + (game.stats.ghosts | 0));
  if (pl.heldId() === I.PROTON_PACK && game.input.use && pl.alive && !game.uiOpen && !pl.riding && game.state === 'playing') protonTick(game, pl, dt);
}

/* the world's picture on its card: the city at dusk, the firehouse, and a ghost or two */
function drawGhostThumb(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a1a4a'); g.addColorStop(0.6, '#a8486a'); g.addColorStop(1, '#f0a050');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = mulberry32(13);
  for (let x = 0; x < W; x += 10 + ((r() * 8) | 0)) { const hh = 14 + ((r() * 22) | 0); ctx.fillStyle = '#1e1a2a'; ctx.fillRect(x, H - 12 - hh, 9, hh); ctx.fillStyle = '#f2d24a'; if (r() < 0.6) ctx.fillRect(x + 3, H - 8 - hh, 2, 2); }
  ctx.fillStyle = '#8a2a1e'; ctx.fillRect(56, 26, 48, 32); ctx.fillStyle = '#f2f2f2'; ctx.fillRect(52, 16, 56, 10);
  ctx.fillStyle = '#c82a2a'; ctx.font = 'bold 8px sans-serif'; ctx.fillText('GHOSTBUSTERS', 54, 24);
  ctx.fillStyle = '#1a1a1a'; for (const x of [60, 74, 88]) ctx.fillRect(x, 40, 10, 18);
  ctx.fillStyle = '#3a3a3a'; ctx.fillRect(0, H - 12, W, 12);
  ctx.fillStyle = 'rgba(120,255,120,0.85)'; ctx.beginPath(); ctx.arc(26, 26, 8, 0, TAU); ctx.fill(); ctx.fillStyle = '#1a3a1a'; ctx.fillRect(22, 24, 2, 2); ctx.fillRect(28, 24, 2, 2); ctx.fillRect(23, 29, 6, 2);
  ctx.fillStyle = 'rgba(240,240,255,0.85)'; ctx.fillRect(126, 22, 14, 16); ctx.beginPath(); ctx.arc(133, 22, 7, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(129, 22, 2, 3); ctx.fillRect(135, 22, 2, 3);
}
