/* ===================== The Mars world (the seventh wish list) ===================== */
// A world of its own on Mars (see marsGen and paintMarsTown in 02b-gen3.js): you start beside your rocket on a landing
// pad, with a flying saucer on the next pad, and the Martians' village of glass domes a short walk away. Martians are
// friendly: they wave and chatter, and if you give one something from Earth (an apple, bread, a flower...) it gives
// you a present from Mars. Mars has low gravity and no air, so everyone wears a space helmet, as on the other planets.
//
// Canyon racing: two tracks start at the edge of town, each with a garage of rover buggies and a race marshal. Get in
// a buggy (or the car, the golf cart, the flying car or the saucer), tap the marshal and pick how many alien racers
// to race: 3, 2, 1, GO! Laps are counted round the track; boost pads make you faster, and the floating boxes give a
// pickup to use with a tap: a turbo, a dust cloud to drop behind you (it only slows whoever drives into it) or a
// bubble that keeps one dust cloud off you. Playing together, everyone in a vehicle at the start races; the host's
// iPad drives the alien racers and keeps the places.
//
// The flying saucer hovers like a broomstick. A tap switches its tractor beam on and off: it lifts the creature below
// and carries it along, and sets it down gently. A friend who taps a saucer someone is flying rides in the beam.
const atMars = () => game.mapId === 'marsworld' && game.dim === 'over';
const MARTIAN_COLORS = ['#58c84a', '#4a9ae0', '#e86ab8', '#f2cf3a'];   // green, blue and pink Martians; the marshal is yellow
const MARTIAN_HI = ['Zorp! Hello, Earth friend %!', 'Bleep bloop! Nice helmet, %!', 'Welcome to Mars, %! Mind the canyons.', 'Greetings, %! Have you got any apples?', 'Wibble! Want to race, %?', 'Hello %! The red dust gets everywhere.'];
const MARS_FOOD = () => [I.APPLE, I.BREAD, I.PIZZA, I.CHEESE, I.COOKED_PORKCHOP, I.STEAK, I.COOKED_CHICKEN, I.COOKED_COD, I.COOKED_SALMON, B.DANDELION, B.POPPY, B.CORNFLOWER, B.PUMPKIN, I.SUGAR];
const MARS_GIFTS = () => [[I.MARS_CRYSTAL, 1, 2, 40], [I.COIN, 3, 9, 25], [B.GLOWSTONE, 2, 4, 15], [I.EMERALD, 1, 2, 10], [I.DIAMOND, 1, 1, 5], [I.ENDER_PEARL, 1, 1, 5], [I.ALIEN_EGG, 1, 1, 8]];   // [thing, at least, at most, how likely]
// (the track's blocks, the buggy, the saucer and the Mars Crystal are named in 09ma-planets.js)

/* ---- arriving ---- */
function marsWelcome(game) {
  RACE = null; BALL.score = [0, 0]; MARS2.dust = 0; MARS2.showerT = 0; MARS2.landT = 0; MARS2.nightDone = -1; MARS2.dustSaid = false;
  if (!game.stats.marsHi) { game.stats.marsHi = 1; chat('Welcome to Mars! Your rocket and a flying saucer are on the pads behind you, the Martians live in the glass domes, and the race tracks start at the edge of town. Give a Martian something from Earth!', '#ffb27a'); }
  spaceHelmet(game);
}
/* the host puts out the rocket, the saucer and the buggies once, and keeps the Martians and the marshals about */
function marsSpawnTick(game) {
  const M = game.gen.marsw, w = game.world, Y = M.town.y + 1, S = game.stats, loaded = (x, z) => w.getBlock(Math.floor(x), M.town.y, Math.floor(z)) !== B.UNLOADED;
  const once = (bit, x, z, fn) => { if (!((S.marsKit | 0) & bit) && loaded(x, z)) { S.marsKit = (S.marsKit | 0) | bit; fn(); } };
  once(1, M.rocket[0], M.rocket[1], () => spawnVehicle(game, 'rocket', M.rocket[0] + 0.5, Y, M.rocket[1] + 0.5, 0));
  once(2, M.saucer[0], M.saucer[1], () => spawnVehicle(game, 'saucer', M.saucer[0] + 0.5, Y, M.saucer[1] + 0.5, 0));
  const garageYaw = tr => { const p = game.gen.marsTracks()[tr].pts, a = p[p.length - 16]; return Math.atan2(-(a[0] - M.tracks[tr].garage[0]), -(a[1] - M.tracks[tr].garage[1])); };   // (facing the way out to the track)
  const cars = game.entities.filter(e => e.vehicle && !e.removed);
  M.tracks.forEach((tr, i) => {
    if (tr.id && game.overVB.includes(tr.id)) return;   // (a track this world does not have)
    const [gx, gz] = tr.garage;
    once(4 << i, gx, gz, () => { for (const dx of [-3, 0, 3]) cars.push(spawnVehicle(game, 'buggy', gx + dx + 0.5, Y, gz + 0.5, garageYaw(i))); });
    // a garage never stays empty: when its buggies have all been driven away, another one is wheeled out
    if (loaded(gx, gz) && !RACE && !cars.some(e => e.type === 'buggy' && Math.hypot(e.x - gx, e.z - gz) < 7) && cars.filter(e => e.type === 'buggy').length < 14) cars.push(spawnVehicle(game, 'buggy', gx + 0.5, Y, gz + 0.5, garageYaw(i)));
  });
  if (!cars.some(e => e.type === 'saucer') && loaded(M.saucer[0], M.saucer[1])) spawnVehicle(game, 'saucer', M.saucer[0] + 0.5, Y, M.saucer[1] + 0.5, 0);   // (and there is always a saucer)
  if (!livePlayers(game).length) return;
  const mars = game.entities.filter(e => e.type === 'martian' && !e.removed);
  M.domes.concat([[M.plaza[0] + 3, M.plaza[1] + 3]]).forEach(([x, z], k) => {
    if (mars.some(e => e.homeK === k) || !loaded(x, z)) return;
    const e = spawnMob(game, 'martian', x + 0.5, Y, z + 1.5);
    e.homeK = k; e.home = [x + 0.5, z + 0.5]; e.variant = k % 3; e.aiT = 0;
  });
  mars2SpawnTick(game);
  game.gen.marsTracks().forEach((tr, i) => {
    if (mars.some(e => e.marshal === i) || (tr.id && game.overVB.includes(tr.id))) return;
    const p = marshalSpot(tr);
    if (!loaded(p[0], p[2])) return;
    const e = spawnMob(game, 'martian', p[0], p[1], p[2]);
    e.marshal = i; e.variant = 3; e.home = [p[0], p[2]];
  });
}
/* the marshal stands beside the start line, on the pit-lane side */
function marshalSpot(tr) {
  const a = tr.pts[tr.N - 12], b = tr.pts[tr.N - 11], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
  return [a[0] + (tz / l) * 7.5, tr.y + 1, a[1] - (tx / l) * 7.5];
}

/* ---- Martians ---- */
function martianSteer(game, e, dt) {
  if (e.waveT > 0) e.waveT -= dt;
  if (game.mapId !== 'marsworld' || nearestPlayerDist(game, e) > 110) { e.removed = true; return [0, 0, 0]; }
  const near = closePlayer(game, e, 5);
  if (e.marshal !== undefined) {   // the marshal keeps to his post, and waves his flag at whoever comes by
    if (near) { e.yaw = Math.atan2(-(near[1] - e.x), -(near[3] - e.z)); e.waveT = 0.5; }
    const hx = e.home[0] - e.x, hz = e.home[1] - e.z, hd = Math.hypot(hx, hz);
    return hd > 0.8 ? [hx / hd, hz / hd, 0.6] : [0, 0, 0];
  }
  if (near && !(e.hiT > game.t)) {   // someone new: a wave and a hello
    e.hiT = game.t + 40; e.waveT = 2.5;
    const [p] = near, name = p === game.player ? playerName() : p.name || 'friend', hint = Math.random() < 0.3 ? ruinHint(game, near[1], near[3]) : null;   // (now and then: where the nearest ruins are)
    const line = 'A Martian: "' + (hint ? RUIN_HINTS[randInt(0, RUIN_HINTS.length - 1)].replace('#', hint.d).replace('@', hint.dir) : MARTIAN_HI[randInt(0, MARTIAN_HI.length - 1)]).replace('%', name) + '"';
    if (p === game.player) chat(line, MARTIAN_COLORS[e.variant % 3]); else if (p.link) p.link.send({ t: 'chat', m: line, c: MARTIAN_COLORS[e.variant % 3] });
    sfx('martianHi', e.x, e.y + 1, e.z); MP.sfx('martianHi', e.x, e.y + 1, e.z);
  }
  if (near && e.waveT > 0) { e.yaw = Math.atan2(-(near[1] - e.x), -(near[3] - e.z)); return [0, 0, 0]; }
  e.aiT -= dt;
  if (e.aiT <= 0) {
    e.moving = Math.random() < 0.6; e.aiT = randRange(2, 5); e.yaw = Math.random() * TAU;
    if (e.home && Math.hypot(e.home[0] - e.x, e.home[1] - e.z) > 9) e.yaw = Math.atan2(-(e.home[0] - e.x), -(e.home[1] - e.z));
  }
  if (e.collidedH && e.moving) e.yaw += Math.PI * randRange(0.5, 1.5);
  return e.moving ? [-Math.sin(e.yaw), -Math.cos(e.yaw), 0.5] : [0, 0, 0];
}
/* tap a Martian: the marshal starts a race; any other swaps something from Earth for a present from Mars */
function martianTap(game, pl, e, hid, creative) {
  if (e.marshal !== undefined) { openRaceMenu(e.marshal); return; }
  e.waveT = 1.5;
  if (!MARS_FOOD().includes(hid)) { sfx('martianHi', e.x, e.y + 1, e.z); toast('Martians love things from Earth! Give one an apple, some bread or a flower and it gives you a present.', 3.5); return; }
  if (e.fedAt > game.t) { sfx('martianHi', e.x, e.y + 1, e.z); toast('This Martian is still admiring the last present. Ooooh!', 2.5); return; }
  if (!creative) pl.consumeHeld(1);
  e.fedAt = game.t + 10;
  const G = MARS_GIFTS();
  let r = Math.random() * G.reduce((a, g) => a + g[3], 0), g = G[0];
  for (const q of G) { if (r < q[3]) { g = q; break; } r -= q[3]; }
  if (g[0] === I.ALIEN_EGG) game.stats.eggGift = 1;
  else if (!game.stats.eggGift && (game.stats.martians | 0) >= 2) { g = G.find(q => q[0] === I.ALIEN_EGG); game.stats.eggGift = 1; }   // (your third present is always a Blip's egg, if you have not had one)
  const n = randInt(g[1], g[2]), left = pl.give(g[0], n);
  if (left > 0) dropItem(game, pl.x, pl.y + 1, pl.z, g[0], left);
  ui.dirty = true;
  toast('The Martian gave you ' + (n > 1 ? n + ' x ' : /^[AEIOU]/.test(itemName(g[0])) ? 'an ' : 'a ') + itemName(g[0]) + '!', 3);
  sfx('martianHappy', e.x, e.y + 1, e.z);
  if (game.net) MP.localFx('sfx', e.x, e.y + 1, e.z, SFX_NET.indexOf('martianHappy'));
  game.stats.martians = (game.stats.martians || 0) + 1;
}

/* ===================== Racing ===================== */
const RACE_VEHICLES = ['buggy', 'car', 'golfcart', 'flycar', 'saucer', 'tank'];
const RACE_COLORS = ['#e1453a', '#3a7ae0', '#f2cf3a', '#9a5ae0'];
const PICKUPS = [['turbo', 'Turbo'], ['dust', 'Dust cloud'], ['bubble', 'Bubble']];
let RACE = null;   // the race going on (the same on every iPad, each with its own "me")
const myRaceId = () => (MP.role === 'guest' ? PROFILE.pid : 'host');
const raceVehicle = pl => (pl.riding && !pl.seat && RACE_VEHICLES.includes(pl.riding.type) ? pl.riding : null);
const fmtSecs = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const raceBests = () => { const b = game.stats.raceBest || {}; return [0, 1, 2, 3].map(i => +b[i] || 0); };   // (a guest's best times are kept in the host's world)
const fmtTime = s0 => { const s = Math.round(s0 * 10) / 10; return fmtTime1(s); };
const fmtTime1 = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor((s * 10) % 10);
const placeWord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
/* a place on the starting grid: [x, y, z, yaw, how far before the line] */
function gridSlot(tr, k) {
  const back = 4 + 4 * Math.floor(k / 2), a = tr.pts[tr.N - back], b = tr.pts[(tr.N - back + 1) % tr.N], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1, side = k % 2 ? 2.2 : -2.2;
  return [a[0] - (tz / l) * side, a[2] + 1, a[1] + (tx / l) * side, Math.atan2(-tx, -tz), back];
}

/* ---- the marshal's menu ---- */
function openRaceMenu(ti) {
  const tr = game.gen.marsTracks()[ti], pl = game.player;
  if (!tr) return;
  if (RACE) { toast('A race is on already. Wait for the chequered flag!', 2.5); return; }
  const root = el('race-menu') || document.body.appendChild(h('div', { id: 'race-menu', class: 'planet-pick', role: 'dialog', 'aria-label': 'Race' }));
  root.textContent = '';
  const box = h('div', { class: 'panel' }), best = game.stats.raceBest && game.stats.raceBest[ti], ready = !!raceVehicle(pl);
  let ai = game.raceAi === undefined ? 2 : game.raceAi;
  const close = () => { root.hidden = true; game.uiOpen = false; if (!game.touchOn && !game.dragLook) game.requestPointer(); };
  box.appendChild(h('h3', { text: tr.name }));
  box.appendChild(h('p', { class: 'race-info', text: tr.laps + ' laps. ' + (best ? 'Your best time: ' + fmtTime(best) : 'No best time yet.') }));
  const row = h('div', { class: 'race-ai', role: 'group', 'aria-label': 'Alien racers' });
  row.appendChild(h('span', { text: 'Alien racers:' }));
  const btns = [0, 1, 2, 3].map(n => { const b = h('button', { type: 'button', class: 'race-n', text: String(n) }); b.addEventListener('click', () => { ai = game.raceAi = n; sfx('click'); mark(); }); row.appendChild(b); return b; });
  const mark = () => btns.forEach((b, n) => { b.classList.toggle('on', n === ai); b.setAttribute('aria-pressed', n === ai ? 'true' : 'false'); });
  mark();
  box.appendChild(row);
  if (!ready) box.appendChild(h('p', { class: 'race-info no', text: 'Get in a buggy first (or a car, the golf cart or the saucer), then tap me again!' }));
  const go = h('button', { type: 'button', class: 'planet-btn race-go', text: 'Start the race!' });
  go.disabled = !ready;
  go.addEventListener('click', () => { initAudio(); sfx('click'); close(); if (MP.role === 'guest') MP.send({ t: 'race', a: 'start', ti, ai }); else raceStart(game, ti, ai); });
  box.appendChild(go);
  const no = h('button', { type: 'button', class: 'planet-cancel', text: 'Not now' });
  no.addEventListener('click', () => { sfx('click'); close(); });
  box.appendChild(no);
  root.appendChild(box);
  root.hidden = false;
  game.releasePointer();
  game.uiOpen = true;
}

/* ---- the host starts it: everyone sitting in a vehicle near the start is in ---- */
function raceStart(game, ti, ai) {
  const tr = game.gen.marsTracks()[ti];
  if (!tr || RACE || !atMars()) return false;
  const s0 = tr.pts[0], slots = {}, names = {};
  let k = 0;
  const near = (x, z) => Math.hypot(x - s0[0], z - s0[1]) < 45;
  if (raceVehicle(game.player) && near(game.player.x, game.player.z)) { slots.host = k++; names.host = playerName(); }
  for (const r of MP.remotes.values()) if (r.alive && k < 6 && near(r.tx, r.tz) && game.entities.some(q => q.vehicle && !q.removed && q.rider === r.id && RACE_VEHICLES.includes(q.type))) { slots[r.id] = k++; names[r.id] = r.name; }
  if (!k) return false;
  ai = clamp(ai | 0, 0, 3);
  const m = { t: 'race', a: 'go', ti, slots, names, ai, n: k };
  for (let i = 0; i < ai; i++) {   // the alien racers line up behind
    const g = gridSlot(tr, k + i), e = spawnMob(game, 'racer', g[0], g[1], g[2]);
    e.variant = i; e.bodyYaw = e.headYaw = e.yaw = g[3];
    e.rc = { d: -g[4], lane: (k + i) % 2 ? 2.2 : -2.2, speed: 9.8 + i * 0.7, name: ['Zorp', 'Bleep', 'Wibble'][i] };
  }
  MP.broadcast(Object.assign({ we: MP.we }, m));
  raceBegin(game, m);
  return true;
}
/* on every iPad: the race is on. If you are in it, your vehicle goes to its place on the grid */
function raceBegin(game, m) {
  const tr = game.gen.marsTracks()[m.ti | 0], pl = game.player, id = myRaceId();
  if (!tr || !atMars()) return;
  const slot = m.slots && m.slots[id], v = raceVehicle(pl), inRace = slot !== undefined && !!v;
  RACE = { ti: tr.i, tr, laps: tr.laps, state: 'count', cd: 4.2, shown: 0, t: 0, names: m.names || {}, list: [], clouds: [], sendT: 0, endT: 0,
    boxes: [], prog: {}, me: { in: inRace, d: 0, fin: 0, lastT: 0, pickup: null, shield: 0, slot: null } };
  for (const bi of tr.boxes) for (const lat of [-2.6, 0, 2.6]) { const a = tr.pts[bi], b = tr.pts[(bi + 1) % tr.N], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; RACE.boxes.push({ x: a[0] - (tz / l) * lat, y: a[2] + 1.7, z: a[1] + (tx / l) * lat, t: 0 }); }
  if (inRace) {
    const g = gridSlot(tr, slot);
    RACE.me.slot = g; RACE.me.d = -g[4];
    Object.assign(v, { x: g[0], y: g[1], z: g[2], yaw: g[3], lastYaw: g[3], vx: 0, vy: 0, vz: 0, flying: false, boostT: 0, slowT: 0 });
    pl.yaw = g[3]; pl.pitch = -0.28;   // (looking down the track a little, from above and behind)
    if (game.view === 0) { RACE.viewBefore = 0; game.view = 1; }   // (watch your buggy from behind while you race)
    chat(tr.name + ': ' + tr.laps + ' laps. Get ready...', '#ffd24a');
  } else chat('A race is starting on ' + tr.name + '!', '#ffd24a');
}
/* your place: 1 plus everyone who is further round (or finished sooner) */
function racePlace() {
  const me = RACE.me, id = myRaceId();
  let n = 1;
  for (const [who, , d, fin] of RACE.list) { if (who === id) continue; if (me.fin ? fin && fin < me.fin : fin || d > me.d) n++; }
  return n;
}
function raceTick(game, dt) {
  const R = RACE, pl = game.player;
  if (!R) return;
  if (!atMars()) { raceEnd(game, []); return; }   // (off in the rocket, or another world)
  const tr = R.tr, me = R.me, v = raceVehicle(pl), N = tr.N, host = MP.role !== 'guest';
  if (R.state === 'count') {   // 3, 2, 1... held on the grid
    R.cd -= dt;
    const n = Math.ceil(R.cd - 1);
    if (n !== R.shown && n >= 1 && n <= 3) { R.shown = n; if (me.in) bigText(String(n)); sfx('rocketBeep', pl.x, pl.y + 1, pl.z); }
    if (me.in && v && me.slot) { v.x = me.slot[0]; v.z = me.slot[2]; v.vx = v.vz = 0; v.yaw = me.slot[3]; v.flying = false; }
    if (R.cd <= 1) { R.state = 'run'; R.t = 0; me.lastT = 0; if (me.in) bigText('GO!', 1.2); sfx('raceGo', pl.x, pl.y + 1, pl.z); }
    hudCount(tr.name + ': get ready!');
    return;
  }
  R.t += dt;
  if (me.in && !me.fin) {
    if (!v) { me.outT = (me.outT || 0) + dt; if (me.outT > 6) { me.in = false; toast('You left the race.', 2.5); if (R.viewBefore !== undefined && game.view === 1) game.view = R.viewBefore; } }
    else {
      me.outT = 0;
      // how far round: the nearest bit of track a little ahead of where you were
      const cur = ((Math.floor(me.d) % N) + N) % N, [bi, dist] = game.gen.trackNear(tr, v.x, v.z, cur - 3, 36), ty = tr.pts[bi][2];
      let k = ((bi - cur) % N + N) % N; if (k > N / 2) k -= N;
      if (dist < 9 && Math.abs(v.y - ty) < 12 && k > 0) { me.d = Math.floor(me.d) + k; me.lastT = R.t; }
      const here = tr.pts[cur];
      if (v.y < here[2] - 6 || (R.t - me.lastT > 6 && Math.hypot(v.x - here[0], v.z - here[1]) > 10)) {   // off a bridge, or lost: back on the track
        const nx = tr.pts[(cur + 1) % N];
        Object.assign(v, { x: here[0], y: here[2] + 1.2, z: here[1], vx: 0, vy: 0, vz: 0, yaw: Math.atan2(-(nx[0] - here[0]), -(nx[1] - here[1])), flying: false });
        pl.yaw = v.lastYaw = v.yaw; me.lastT = R.t; toast('Back on the track!', 1.5);
      }
      if (v.type === 'saucer' && tr.boost[cur] && dist < 3 && v.y - ty < 4) raceBoost(v);
      for (const b of R.boxes) if (!(b.t > R.t) && Math.hypot(b.x - v.x, b.z - v.z) < 1.8 && Math.abs(b.y - v.y - 0.7) < 3) {   // a pickup box
        b.t = R.t + 4;
        if (!me.pickup) { me.pickup = PICKUPS[randInt(0, PICKUPS.length - 1)]; sfx('racePickup', v.x, v.y, v.z); toast('You got: ' + me.pickup[1] + '! Tap to use it.', 2); }
      }
      for (const c of R.clouds) if (c.by !== myRaceId() && !c.hit && Math.hypot(c.x - v.x, c.z - v.z) < 3 && Math.abs(c.y - v.y) < 4) {   // into someone's dust cloud
        c.hit = true;
        if (me.shield > R.t) { me.shield = 0; toast('Your bubble kept the dust off!', 2); sfx('pop'); }
        else { v.slowT = 1.8; toast('Cough! A dust cloud!', 1.5); }
      }
      if (me.d >= R.laps * N) {   // over the line for the last time (your place is read out a moment later, when every iPad agrees on it)
        me.fin = R.t; me.sayT = R.t + 1.2; v.boostT = 0;
        bigText('Finished!', 1.2); sfx('raceGo', v.x, v.y, v.z);
      }
    }
  }
  if (me.sayT && R.t >= me.sayT) raceAnnounce(game);
  // dust clouds hang about for a few seconds
  for (const c of R.clouds) if (Math.random() < dt * 14) smokeParticles(c.x + randRange(-1.5, 1.5), c.y + randRange(0, 1.5), c.z + randRange(-1.5, 1.5), 1, 0.5, true);
  R.clouds = R.clouds.filter(c => c.t > R.t);
  if (me.shield > R.t && v && Math.random() < dt * 20 && PARTICLES.length < 1500) { const a = Math.random() * TAU; PARTICLES.push({ x: v.x + Math.cos(a) * 1.3, y: v.y + 0.3 + Math.random() * 1.4, z: v.z + Math.sin(a) * 1.3, vx: 0, vy: 0.4, vz: 0, life: 0.4, tile: TILE.bubble_p, u: 0, v: 0, us: 16, size: 0.08, grav: 0, bright: 1 }); }
  // tell the host how far you are; the host tells everyone the places
  R.sendT -= dt;
  if (R.sendT <= 0) {
    R.sendT = 0.4;
    if (!host) { if (me.in || me.fin) MP.send({ t: 'race', a: 'p', d: Math.floor(me.d), f: me.fin ? Math.round(me.fin * 10) / 10 : 0, o: me.in ? 0 : 1 }); }
    else raceHostTick(game);
  }
  if (!RACE) return;
  const lap = clamp(Math.floor(me.d / N) + 1, 1, R.laps);
  hudCount(me.in ? (me.fin ? 'Finished: ' + (me.place ? placeWord(me.place) + ' in ' : '') + fmtTime(me.fin) : 'Lap ' + lap + '/' + R.laps + '   ' + fmtSecs(R.t) + '   ' + placeWord(racePlace()) + (me.pickup ? '   [' + me.pickup[1] + ': tap!]' : '')) : 'Race: ' + tr.name + '   ' + fmtSecs(R.t));
}
function raceBoost(v) { if (!(v.boostT > 0.6)) sfx('raceBoost', v.x, v.y, v.z); v.boostT = 1.6; }
/* your place, your time and your prize, once you are over the line */
function raceAnnounce(game) {
  const R = RACE, me = R.me, pl = game.player, S = game.stats;
  if (!me.sayT) return;
  me.sayT = 0;
  const place = me.place = racePlace(), prize = [20, 10, 5][place - 1] || 2;
  if (!S.raceBest) S.raceBest = {};
  const best = !S.raceBest[R.ti] || me.fin < S.raceBest[R.ti];
  if (best) S.raceBest[R.ti] = Math.round(me.fin * 10) / 10;
  S.races = (S.races | 0) + 1;
  bigText(placeWord(place) + ' place!', 2.5);
  chat('You finished ' + R.tr.name + ' in ' + fmtTime(me.fin) + ': ' + placeWord(place) + ' place!' + (best ? ' A new best time!' : '') + ' You win $' + prize + '.', '#ffd24a');
  giveMoney(pl, prize);
  sfx('levelUp'); if (place === 1) partyEffect(pl.x, pl.y + 1, pl.z);
  if (MP.role === 'guest') MP.sendSave();
}
/* tap while racing: use your pickup */
function raceUsePickup(game, pl) {
  const R = RACE, me = R && R.me, v = raceVehicle(pl);
  if (!me || !me.in || !v || R.state !== 'run') return false;
  if (!me.pickup) return true;
  const kind = me.pickup[0];
  me.pickup = null;
  if (kind === 'turbo') { v.boostT = 2.6; sfx('raceBoost', v.x, v.y, v.z); }
  else if (kind === 'bubble') { me.shield = R.t + 25; sfx('bottleFill', v.x, v.y, v.z); toast('Bubble on!', 1.5); }
  else {
    const c = { x: r2(v.x + Math.sin(v.yaw) * 2.5), y: r2(v.y), z: r2(v.z + Math.cos(v.yaw) * 2.5), by: myRaceId() };
    if (MP.role === 'guest') MP.send({ t: 'race', a: 'dust', x: c.x, y: c.y, z: c.z });
    else { MP.broadcast({ t: 'race', a: 'dust', x: c.x, y: c.y, z: c.z, by: c.by, we: MP.we }); }
    raceDust(c);
  }
  return true;
}
function raceDust(c) { if (!RACE) return; RACE.clouds.push({ x: +c.x, y: +c.y, z: +c.z, by: c.by, t: RACE.t + 7 }); smokeParticles(+c.x, +c.y + 0.5, +c.z, 14, 1.2, true); sfx('raceDust', +c.x, +c.y, +c.z); }
/* the host: everyone's progress, the alien racers, and the end of the race */
function raceHostTick(game) {
  const R = RACE, me = R.me, list = [];
  if (me.in || me.fin) list.push(['host', playerName(), Math.floor(me.d), me.fin || 0]);
  let humans = me.in && !me.fin ? 1 : 0, firstFin = me.fin || 0;
  for (const id in R.prog) {
    const p = R.prog[id], r = MP.remotes.get(id);
    if (!r) { delete R.prog[id]; continue; }
    list.push([id, r.name, p.d, p.f]);
    if (!p.f && !p.o) humans++;
    if (p.f && (!firstFin || p.f < firstFin)) firstFin = p.f;
  }
  for (const id in R.names) if (id !== 'host' && !R.prog[id] && MP.remotes.get(id)) { list.push([id, R.names[id], -1, 0]); if (R.t < 8) humans++; }   // (not heard from yet)
  for (const e of game.entities) if (e.type === 'racer' && !e.removed && e.rc) list.push(['ai' + e.variant, e.rc.name, Math.floor(e.rc.d), e.rc.fin || 0]);
  R.list = list;
  MP.broadcast({ t: 'race', a: 's', l: list, we: MP.we });
  if (!humans || (firstFin && R.t > firstFin + 45) || R.t > 420) {   // everyone is home (or it has gone on long enough)
    if (!R.endT) R.endT = R.t + 3;
    else if (R.t > R.endT) { MP.broadcast({ t: 'race', a: 'end', l: list, we: MP.we }); raceEnd(game, list); }
  }
}
function raceEnd(game, list) {
  if (!RACE) return;
  raceAnnounce(game);
  const R = RACE, rows = (Array.isArray(list) ? list : []).filter(q => Array.isArray(q)).map(q => [String(q[1] || '?').slice(0, 16), +q[2] || 0, +q[3] || 0]);
  rows.sort((a, b) => (a[2] && b[2] ? a[2] - b[2] : a[2] ? -1 : b[2] ? 1 : b[1] - a[1]));
  if (rows.length) chat(R.tr.name + ' results: ' + rows.map((q, i) => (i + 1) + '. ' + q[0] + (q[2] ? ' ' + fmtTime(q[2]) : '')).join('   '), '#ffd24a');
  for (const e of game.entities) if (e.type === 'racer' && !e.proxy) e.removed = true;
  if (R.viewBefore !== undefined && game.view === 1) game.view = R.viewBefore;
  RACE = null;
  hudCount(null);
}
/* messages: a guest to the host */
function raceHostMsg(game, r, m) {
  if (m.a === 'start') { if (!RACE && atMars() && !raceStart(game, m.ti | 0, m.ai | 0) && r.link) r.link.send({ t: 'chat', m: 'Get in a buggy near the start line first!', c: '#ffd24a' }); return; }
  if (!RACE) return;
  if (m.a === 'p') RACE.prog[r.id] = { d: clamp(m.d | 0, -40, 1e6), f: Math.max(0, +m.f || 0), o: m.o ? 1 : 0 };
  else if (m.a === 'dust' && okXYZ([m.x, m.y, m.z]) && Math.hypot(m.x - r.tx, m.z - r.tz) < 12) { const c = { x: +m.x, y: +m.y, z: +m.z, by: r.id }; MP.broadcast({ t: 'race', a: 'dust', x: c.x, y: c.y, z: c.z, by: c.by, we: MP.we }, r.id); raceDust(c); }
}
/* and the host to everyone */
function raceGuestMsg(game, m) {
  if (m.a === 'go') raceBegin(game, m);
  else if (!RACE) return;
  else if (m.a === 's' && Array.isArray(m.l)) RACE.list = m.l.filter(q => Array.isArray(q) && q.length >= 4).slice(0, 12).map(q => [String(q[0]), String(q[1]), +q[2] || 0, +q[3] || 0]);
  else if (m.a === 'dust' && okXYZ([m.x, m.y, m.z])) raceDust({ x: m.x, y: m.y, z: m.z, by: String(m.by || '') });
  else if (m.a === 'end') raceEnd(game, m.l);
}
/* an alien racer (the host's iPad drives it round the track) */
function updateRacer(game, e, dt) {
  const R = RACE, rc = e.rc;
  if (!R || !rc || game.mapId !== 'marsworld') { e.removed = true; return; }
  e.walk += dt * 8;
  if (R.state !== 'run') return;
  const tr = R.tr, N = tr.N, i = ((Math.floor(rc.d) % N) + N) % N;
  if (rc.slowT > 0) rc.slowT -= dt;
  if (rc.boostT > 0) rc.boostT -= dt;
  if (tr.boost[i]) rc.boostT = 1.4;
  let best = R.me.in ? R.me.d : -1e9;
  for (const id in R.prog) best = Math.max(best, R.prog[id].d);
  let sp = rc.fin ? Math.max(0, (rc.sp || 0) - dt * 6) : rc.speed * (rc.boostT > 0 ? 1.4 : 1) * (rc.slowT > 0 ? 0.45 : 1) * (best > -1e8 ? (rc.d - best > 25 ? 0.82 : best - rc.d > 35 ? 1.2 : 1) : 1) * (tr.pts[(i + 3) % N][2] !== tr.pts[i][2] ? 0.75 : 1);   // (slower up and down the ramps, like you)
  rc.sp = sp;
  rc.d += sp * dt;
  if (!rc.fin && rc.d >= R.laps * N) rc.fin = R.t;
  for (const c of R.clouds) if (c.by !== 'ai' + e.variant && !c['a' + e.variant] && Math.hypot(c.x - e.x, c.z - e.z) < 3) { c['a' + e.variant] = true; rc.slowT = 1.8; }
  const j = ((Math.floor(rc.d) % N) + N) % N, f = rc.d - Math.floor(rc.d), a = tr.pts[j], b = tr.pts[(j + 1) % N], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
  e.x = a[0] + tx * f - (tz / l) * rc.lane; e.z = a[1] + tz * f + (tx / l) * rc.lane;
  e.y += (a[2] + 1 - e.y) * Math.min(1, dt * 7);
  e.bodyYaw = e.headYaw = e.yaw = Math.atan2(-tx, -tz);
  e.walkAmt = clamp(sp / 10, 0, 1);
}
/* pickup boxes spin over the track while a race is on */
const _rb = M4.create();
function drawRace(cam, t) {
  if (!RACE || !MODELS.itembox) return;
  const P = PROG.entity;
  gl.uniform4fv(P.u.uTint, [0, 0, 0, 0]);
  for (const b of RACE.boxes) {
    if (b.t > RACE.t) continue;
    gl.uniform1f(P.u.uBright, 1);
    M4.identity(_rb); M4.translate(_rb, _rb, b.x - cam.x, b.y - cam.y + Math.sin(t * 2 + b.x) * 0.15, b.z - cam.z); M4.rotY(_rb, _rb, t * 1.5); M4.scale(_rb, _rb, 1 / 16, 1 / 16, 1 / 16);
    drawModel(MODELS.itembox, _rb, null);
  }
}

/* ===================== The flying saucer's tractor beam ===================== */
const BEAM_REACH = 12;
const beamable = m => { const d = m.mob && !m.dead && !m.removed && MOB_DEFS[m.type]; return !!d && m.w <= 0.8 && !d.ghost && !d.racer && !d.lakemon && !d.spirit && !d.snitch && !d.ball && !d.qplayer && !d.fish && !d.swimmer && !d.flyer; };
/* tap in the saucer: the beam goes on (and lifts the creature under you) or off (and sets it down) */
function saucerBeam(game, pl, v) {
  v.beamOn = !v.beamOn;
  sfx(v.beamOn ? 'beamOn' : 'beamOff', v.x, v.y, v.z);
  if (MP.role === 'guest') MP.send({ t: 'beam', e: v.nid, on: v.beamOn ? 1 : 0 });
  else if (game.net) MP.sfx(v.beamOn ? 'beamOn' : 'beamOff', v.x, v.y, v.z);
}
/* each frame, for every saucer (the host or a one-player game holds the creature; every iPad draws the beam) */
function saucerTick(game, v, dt) {
  const w = game.world, host = MP.role !== 'guest';
  if (!v.rider && v.beamOn && host) v.beamOn = false;
  if (v.beamOn) {
    for (let i = 0; i < 3 && PARTICLES.length < 1500; i++) { const a = Math.random() * TAU, d = Math.random() * BEAM_REACH * 0.6, rr = 0.3 + d * 0.12; PARTICLES.push({ x: v.x + Math.cos(a) * rr, y: v.y - d, z: v.z + Math.sin(a) * rr, vx: 0, vy: 1.5, vz: 0, life: 0.5, tile: TILE.laser_1, u: 0, v: 0, us: 16, size: 0.1, grav: 0, bright: 1 }); }
  }
  if (!host) return;
  let m = v.beam && !v.beam.removed && !v.beam.dead ? v.beam : null;
  if (!v.beamOn) { if (m) { m.beamV = null; m.partyT = Math.max(m.partyT || 0, 30); m.fallDist = 0; } v.beam = null; return; }   // (set down: it floats to the ground unhurt)
  if (!m) {   // look for something to lift
    let bd = 1e9;
    for (const q of game.entities) {
      if (!beamable(q) || q.beamV) continue;
      const dy = v.y - q.y, dd = Math.hypot(q.x - v.x, q.z - v.z);
      if (dy < -1 || dy > BEAM_REACH || dd > 1.2 + dy * 0.2 || dd + dy >= bd) continue;
      bd = dd + dy; m = q;
    }
    if (m) { v.beam = m; m.beamV = v; sfx('beamCatch', m.x, m.y, m.z); MP.sfx('beamCatch', m.x, m.y, m.z); }
  }
}
/* a creature held in a beam rises to hang under the saucer, turning slowly (called in place of its own doings) */
function beamedMob(game, e, dt) {
  const v = e.beamV;
  if (!v || v.removed || !v.beamOn || v.beam !== e) { e.beamV = null; e.partyT = Math.max(e.partyT || 0, 30); return false; }
  const ty = v.y - e.h - 0.6, k = Math.min(1, dt * 4);
  e.x += (v.x - e.x) * k; e.z += (v.z - e.z) * k; e.y += clamp(ty - e.y, -6 * dt, 5 * dt);
  e.vx = e.vy = e.vz = 0; e.fallDist = 0; e.onGround = false;
  e.bodyYaw += dt * 1.5; e.headYaw = e.bodyYaw; e.walkAmt = 0.4; e.walk += dt * 6;
  return true;
}

/* a friend riding along hangs in the beam under the saucer (on the ground: stands just behind it) */
function saucerSeat(v, k) {
  if (!k) return seatOf(v);
  const gy = game.world ? groundUnder(game.world, v.x, v.y, v.z) : -1, low = gy < 0 ? 2.6 : clamp(v.y - gy, 0, 2.6), back = (1 - low / 2.6) * (v.w + 0.7);
  return [v.x + Math.sin(v.yaw) * back, v.y - low, v.z + Math.cos(v.yaw) * back];
}
/* an alien racer's buggy, under it */
const _rk = M4.create();
function drawRacerBuggy(e, dx, dy, dz) {
  const m = MODELS.buggy, wr = e.walk * 1.5;
  M4.identity(_rk); M4.translate(_rk, _rk, dx, dy, dz); M4.rotY(_rk, _rk, e.bodyYaw + Math.PI); M4.scale(_rk, _rk, m.scale, m.scale, m.scale);
  drawModel(m, _rk, { wfl: [wr, 0, 0], wfr: [wr, 0, 0], wbl: [wr, 0, 0], wbr: [wr, 0, 0] });
}
/* every frame: the race, and every flying saucer's beam */
function marsTick(game, dt) {
  raceTick(game, dt);
  mars2Tick(game, dt);   // (air bubbles; and on Mars the ruins, the meteors and the dust storms: see 12mb-mars2.js)
  for (const e of game.entities) {
    if (e.removed) continue;
    if (e.type === 'saucer') saucerTick(game, e, dt);
    else if (e.type === 'blip' && e.happy > 0 && Math.random() < dt * 7 && PARTICLES.length < 1400) PARTICLES.push({ x: e.x + randRange(-0.3, 0.3), y: e.y + 0.7, z: e.z + randRange(-0.3, 0.3), vx: 0, vy: 1.1, vz: 0, life: 0.8, tile: TILE.heart_p, u: 0, v: 0, us: 16, size: 0.09, grav: 0, bright: 1 });   // (a happy Blip: little hearts)
  }
}
/* the picture on the world's card: red hills under an orange sky, glass domes, a saucer and a buggy */
function drawMarsThumb(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#c8703a'); g.addColorStop(1, '#f2b880');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff2d8'; ctx.fillRect(126, 8, 8, 8);
  for (let x = 0; x < W; x++) { const hgt = 34 + Math.sin(x * 0.045) * 8 + Math.sin(x * 0.17) * 3; ctx.fillStyle = '#a84a28'; ctx.fillRect(x, hgt, 1, H); }
  for (let x = 0; x < W; x++) { const hgt = 50 + Math.sin(x * 0.07 + 2) * 3; ctx.fillStyle = '#c8603a'; ctx.fillRect(x, hgt, 1, H); }
  ctx.fillStyle = '#3a3a3e'; ctx.fillRect(0, 60, W, 6);   // the track
  ctx.fillStyle = '#f4f4f4'; for (let x = 4; x < W; x += 16) ctx.fillRect(x, 62, 8, 2);
  for (const [x, r] of [[30, 11], [52, 8]]) {   // glass domes
    ctx.fillStyle = 'rgba(190, 240, 255, 0.75)'; ctx.beginPath(); ctx.arc(x, 52, r, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, 52, r, Math.PI, 0); ctx.stroke();
  }
  ctx.fillStyle = '#58c84a'; ctx.fillRect(28, 44, 5, 8); ctx.fillRect(27, 40, 7, 5); ctx.fillStyle = '#10101c'; ctx.fillRect(28, 42, 2, 2); ctx.fillRect(31, 42, 2, 2);   // a Martian
  ctx.fillStyle = '#8adcf4'; ctx.fillRect(96, 14, 12, 5); ctx.fillStyle = '#c8c8d4'; ctx.fillRect(86, 19, 32, 4); ctx.fillStyle = '#ffe04a'; for (let x = 89; x < 116; x += 6) ctx.fillRect(x, 20, 2, 2);   // the saucer
  ctx.fillStyle = 'rgba(140, 255, 200, 0.45)'; ctx.beginPath(); ctx.moveTo(98, 23); ctx.lineTo(106, 23); ctx.lineTo(112, 44); ctx.lineTo(92, 44); ctx.fill();   // (and its beam)
  ctx.fillStyle = '#f08a2a'; ctx.fillRect(124, 54, 18, 5); ctx.fillStyle = '#d8d8de'; ctx.fillRect(128, 49, 8, 1); ctx.fillRect(128, 49, 1, 5); ctx.fillRect(135, 49, 1, 5);   // a buggy
  ctx.fillStyle = '#1c1c1c'; ctx.fillRect(125, 58, 5, 5); ctx.fillRect(136, 58, 5, 5);
}
