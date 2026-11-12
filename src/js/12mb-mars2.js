/* ===================== More Mars (the second Mars update) ===================== */
// An Air Maker makes a bubble of air ten blocks round it: inside, you can take your helmet off, and it slowly turns the
// red dust green, with grass and flowers (it works on the Moon and the other planets too, but only Mars dust goes
// green). Your base, a glass dome near the landing pads, has one, and the Martians' own domes have air as well.
// A Martian's egg hatches into a little alien pet that follows you, grows up when it is fed, and digs up crystals.
// Out in the wilderness are five ancient ruins with treasure; at night there are meteor showers, and a meteorite
// lands not far away; now and then a dust storm blows through (it hurts nobody); there is a bounce-ball field with two
// goals; and a sandboard to slide down the dunes on. A third track, Dune Dash, is in 12m-mars.js with the others.

/* ---- air ---- */
const AIR_R = 10;
const AIRM = { t: -9, k: '', list: [], inside: false, checkT: 0, greenT: 0 };
/* the Air Makers in the chunks round a spot (worked out again a few times a second) */
function airMakersNear(w, x, z) {
  const cx0 = Math.floor(x) >> 4, cz0 = Math.floor(z) >> 4, k = w.map + ':' + cx0 + ',' + cz0;
  if (AIRM.k === k && game.t - AIRM.t < 0.4 && game.t >= AIRM.t) return AIRM.list;
  const list = [];
  for (let cx = cx0 - 1; cx <= cx0 + 1; cx++) for (let cz = cz0 - 1; cz <= cz0 + 1; cz++) {
    const c = w.getChunk(cx, cz);
    if (!c || !c.specials || !c.specials.size) continue;
    for (const i of c.specials) if (c.blocks[i] === B.AIR_MAKER) list.push({ x: cx * 16 + (i & 15), y: i >> 8, z: cz * 16 + ((i >> 4) & 15) });
  }
  AIRM.k = k; AIRM.t = game.t; AIRM.list = list;
  return list;
}
const inMartianDome = (x, y, z) => { if (!atMars()) return false; const M = game.gen.marsw; return y >= M.town.y && y < M.town.y + 7 && M.domes.some(d => Math.hypot(x - d[0] - 0.5, z - d[1] - 0.5) < 4.7); };
/* is there air to breathe here without a helmet? (an Air Maker's bubble, or a Martian's dome) */
function inAirBubble(p) {
  const w = game.world;
  if (!w || !p) return false;
  if (inMartianDome(p.x, p.y, p.z)) return true;
  return airMakersNear(w, p.x, p.z).some(m => Math.hypot(m.x + 0.5 - p.x, m.y + 0.5 - (p.y + 1), m.z + 0.5 - p.z) <= AIR_R);
}
function airTick(game, dt) {
  const pl = game.player, w = game.world;
  if (!w || game.state !== 'playing') return;
  if (!noAir()) { AIRM.inside = false; }
  else if ((AIRM.checkT -= dt) <= 0) {   // into a bubble, or out of it
    AIRM.checkT = 0.4;
    const now = inAirBubble(pl);
    if (now !== AIRM.inside && pl.alive) {
      AIRM.inside = now;
      if (now) { if (!game.stats.airHi) toast('There is air here! Inside the bubble you can take your helmet off.', 4); game.stats.airHi = 1; sfx('airHiss', pl.x, pl.y + 1, pl.z); }   // (said the first time)
      else if (!wearsSpaceHelmet(pl)) toast('Out of the air bubble: put your helmet on!', 3.5);
    }
  }
  const makers = airMakersNear(w, pl.x, pl.z);
  for (const m of makers) {   // a shimmer on the edge of each bubble, and a puff from the machine now and then
    if (Math.random() < dt * 14 && PARTICLES.length < 1400) {
      const a = Math.random() * TAU, up = Math.random() * 0.9, c = Math.cos(up * 1.5), s = Math.sin(up * 1.5);
      PARTICLES.push({ x: m.x + 0.5 + Math.cos(a) * c * AIR_R, y: m.y + 0.5 + s * AIR_R, z: m.z + 0.5 + Math.sin(a) * c * AIR_R, vx: 0, vy: 0.3, vz: 0, life: 0.8, tile: TILE.bubble_p, u: 0, v: 0, us: 16, size: 0.07, grav: 0, bright: 1 });
    }
    if (Math.random() < dt * 3 && PARTICLES.length < 1400) PARTICLES.push({ x: m.x + 0.5 + randRange(-0.3, 0.3), y: m.y + 1.05, z: m.z + 0.5 + randRange(-0.3, 0.3), vx: 0, vy: 0.9, vz: 0, life: 0.9, tile: TILE.bubble_p, u: 0, v: 0, us: 16, size: 0.05, grav: 0, bright: 1 });
  }
  if (MP.role === 'guest' || (AIRM.greenT -= dt) > 0) return;
  AIRM.greenT = 1;   // (the host, every second) the ground in each bubble near a player goes a little greener
  const seen = new Set();
  for (const p of livePlayers(game)) {
    const [px, , pz] = playerPos(p);
    AIRM.t = -9;
    for (const m of airMakersNear(w, px, pz)) {
      const key = m.x + ',' + m.y + ',' + m.z;
      if (seen.has(key)) continue;
      seen.add(key);
      for (let n = 0; n < 4; n++) {
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * (AIR_R - 1), x = Math.floor(m.x + 0.5 + Math.cos(a) * d), z = Math.floor(m.z + 0.5 + Math.sin(a) * d);
        for (let y = m.y + 5; y >= m.y - 6; y--) {
          const b = w.getBlock(x, y, z);
          if (b === B.AIR) continue;
          const above = w.getBlock(x, y + 1, z);
          if (b === B.MARS_DUST && above === B.AIR) w.setBlock(x, y, z, B.GRASS, 0);
          else if (b === B.GRASS && above === B.AIR && Math.random() < 0.06) w.setBlock(x, y + 1, z, [B.TALL_GRASS, B.TALL_GRASS, B.DANDELION, B.POPPY, B.CORNFLOWER][randInt(0, 4)], 0);
          break;
        }
      }
    }
  }
  AIRM.t = -9;
}

/* ---- what is in a Mars chest the first time it is opened (kind 0: your base's supplies; 1: a ruin's treasure) ---- */
const TABLETS = [
  ['The First Tablet', ['Long, long ago, Mars had rivers and seas.', 'We built our cities beside them, under two little moons.', 'Then the air grew thin and the water went away.', 'So we made domes of glass, and machines to make air.', 'If you find one, look after it. Things grow where there is air.']],
  ['The Racing Tablet', ['When the seas were gone, the old sea beds were smooth and wide.', 'The young ones raced across them, round and round.', 'They still do. They are very fast.', 'A good racer is kind: the dust cloud is only a joke.']],
  ['The Egg Tablet', ['A Blip comes from a speckled egg.', 'Set the egg down somewhere quiet and wait.', 'Feed your Blip things from far away and it will grow.', 'A grown Blip can smell crystals under the dust.', 'A Blip never forgets a friend.']],
  ['The Sky Tablet', ['On clear nights the sky throws stones.', 'They fall far from the domes and glow where they land.', 'Inside each one is a present from the stars.', 'Do not be afraid. Nobody has ever been hit. We counted.']],
];
function fillMarsChest(t, kind) {
  const put = (id, n, ex) => { if (n <= 0) return; const free = []; for (let i = 0; i < t.slots.length; i++) if (!t.slots[i]) free.push(i); if (!free.length) return; t.slots[free[randInt(0, free.length - 1)]] = Object.assign({ id, count: n }, ex || {}); };
  if (kind === 1) {
    const tb = TABLETS[randInt(0, TABLETS.length - 1)];
    put(I.WRITTEN_BOOK, 1, { tag: { book: { title: tb[0], author: 'The Old Martians', pages: tb[1].slice() } } });
    put(I.MARS_CRYSTAL, randInt(3, 6)); put(I.COIN, randInt(10, 25)); put(I.BILL, randInt(0, 2)); put(I.GOLD_INGOT, randInt(2, 5)); put(I.EMERALD, randInt(1, 3)); put(I.DIAMOND, randInt(0, 2));
    if (Math.random() < 0.7) put(I.ALIEN_EGG, 1);
    if (Math.random() < 0.4) put(B.AIR_MAKER, 1);
    return;
  }
  put(B.AIR_MAKER, 2); put(I.ALIEN_EGG, 1); put(I.SANDBOARD, 2);
  put(B.OAK_SAPLING, 4); put(B.BIRCH_SAPLING, 2); put(B.DANDELION, 3); put(B.POPPY, 3);
  put(I.APPLE, 8); put(I.BREAD, 6); put(B.TORCH, 16); put(B.GLASS, 32); put(B.BED, 1); put(toolId(1, 0), 1);
}

/* ===================== The alien pet: a Blip ===================== */
// It starts as an egg on the ground, hatches into a baby that follows whoever put the egg down, and grows up after
// three meals. Tap it with food to feed it; tap it with anything else and it sits and waits, or follows again. A
// grown Blip digs up a Mars Crystal now and then. Nothing hurts it. It is kept with the world like a robot.
const BLIP_COLORS = ['#7ae0d0', '#ffb84a', '#c08aff', '#ff8aa8'];
defItem(I.ALIEN_EGG, 'Blip Egg', { tex: 'alien_egg', stack: 16 });
function makePet(game, x, y, z, owner, o) {
  const e = spawnMob(game, 'blip', x, y, z);
  if (!e) return null;
  o = o || {};
  e.owner = owner; e.variant = clamp(o.c === undefined ? randInt(0, BLIP_COLORS.length - 1) : o.c | 0, 0, BLIP_COLORS.length - 1);
  e.stage = clamp(o.s | 0, 0, 2); e.fed = clamp(o.f | 0, 0, 3); e.sit = !!o.sit; e.hatchT = e.stage ? 0 : 14; e.digT = randRange(120, 200);
  e.yaw = e.bodyYaw = e.headYaw = +o.yaw || 0;
  return e;
}
const petSave = e => ({ k: 'pet', x: r2(e.x), y: r2(e.y), z: r2(e.z), yaw: r2(e.yaw), o: e.owner, c: e.variant | 0, s: e.stage | 0, f: e.fed | 0, sit: e.sit ? 1 : 0 });
/* tap the ground holding an egg */
function placeEgg(game, pl, x, y, z) {
  if (MP.role === 'guest') MP.send({ t: 'pet+', x: r2(x), y: r2(y), z: r2(z) });
  else makePet(game, x, y, z, myPid());
  sfx('pop', x, y, z);
  toast('A Blip egg! Wait a little while and it will hatch.', 4);
}
function petTell(game, e, text) {
  const own = robotOwner(game, e);
  if (own === game.player) toast(text, 3.5);
  else if (own && own.link) own.link.send({ t: 'chat', m: text, c: '#7ae0d0' });
}
/* (the host, or one player) a pet is fed, or told to sit or follow */
function petDo(game, e, what) {
  if (what === 'feed' && e.stage > 0) {
    e.happy = 2.5; e.fed = Math.min(3, (e.fed | 0) + 1);
    sfx('blipHappy', e.x, e.y + 0.5, e.z); MP.sfx('blipHappy', e.x, e.y + 0.5, e.z);
    if (e.stage === 1 && e.fed >= 3) { e.stage = 2; petTell(game, e, 'Your Blip grew up! Now it can sniff out crystals.'); sfx('levelUp', e.x, e.y, e.z); }
  } else if (what === 'sit' && e.stage > 0) { e.sit = !e.sit; sfx('blipSay', e.x, e.y + 0.5, e.z); MP.sfx('blipSay', e.x, e.y + 0.5, e.z); }
}
/* tap a pet: feed it, or sit/follow (only its owner's taps count) */
function petTap(game, pl, e, hid, creative) {
  if (!e.stage) { toast('The egg is wobbling... it will hatch soon!', 2); return; }
  if (!robotMine(e)) { toast("That's someone else's Blip.", 2); sfx('blipSay', e.x, e.y + 0.5, e.z); return; }
  const food = MARS_FOOD().includes(hid);
  if (food && !creative) pl.consumeHeld(1);
  if (e.proxy) MP.send({ t: 'pet', e: e.nid, a: food ? 'feed' : 'sit' });
  else petDo(game, e, food ? 'feed' : 'sit');
  if (food) toast(e.stage === 1 ? 'Yum! Your Blip is growing (' + Math.min(3, (e.fed | 0) + (e.proxy ? 1 : 0)) + ' of 3 meals).' : 'Yum! Your Blip is happy.', 2.5);
  else toast((e.proxy ? !e.sit : e.sit) ? 'Your Blip sits down to wait.' : 'Your Blip follows you again!', 2);
  ui.dirty = true;
}
function petSteer(game, e, dt) {
  if (e.happy > 0) e.happy -= dt;
  if (!e.stage) {   // an egg: it wobbles, and then...
    e.hatchT -= dt;
    if (e.hatchT <= 0) {
      e.stage = 1; e.happy = 2;
      sfx('blipHatch', e.x, e.y + 0.3, e.z); MP.sfx('blipHatch', e.x, e.y + 0.3, e.z);
      blockParticles(e.x - 0.5, e.y, e.z - 0.5, B.QUARTZ_BLOCK, 8, true);
      petTell(game, e, 'Your egg hatched: it is a baby Blip! Feed it things from Earth (apples, bread, flowers) to help it grow.');
    }
    return [0, 0, 0];
  }
  if (e.sayT === undefined) e.sayT = randRange(5, 12);
  if ((e.sayT -= dt) <= 0) { e.sayT = randRange(7, 16); sfx('blipSay', e.x, e.y + 0.5, e.z, 0.6); }
  const own = robotOwner(game, e);
  if (!own || e.sit) return [0, 0, 0];
  const ox = own.x - e.x, oz = own.z - e.z, od = Math.hypot(ox, oz) || 0.01;
  if (od > 26 || Math.abs(own.y - e.y) > 12) { robotHop(game, e, own); return [0, 0, 0]; }   // (left far behind: it pops up beside you)
  if (e.stage === 2 && (e.digT -= dt) <= 0) {   // a grown Blip digs up a crystal now and then
    e.digT = randRange(150, 260); e.happy = 2;
    dropItem(game, e.x, e.y + 0.4, e.z, I.MARS_CRYSTAL, 1);
    blockParticles(e.x - 0.5, e.y - 0.5, e.z - 0.5, B.MARS_DUST, 8, true);
    sfx('blipHappy', e.x, e.y + 0.5, e.z); MP.sfx('blipHappy', e.x, e.y + 0.5, e.z);
    petTell(game, e, 'Your Blip dug up a Mars Crystal!');
  }
  e.yaw = Math.atan2(-ox, -oz);
  if (od > 2.6) return [ox / od, oz / od, od > 7 ? 1.5 : 1];
  return [0, 0, 0];
}

/* ===================== Ancient ruins ===================== */
const RUIN_HINTS = ['Psst, %! There are old ruins about # blocks to the @. Nobody knows who built them!', 'My grandma says there is treasure in the ruins, # blocks to the @.', 'Have you seen the big stone head, %? It is # blocks to the @.'];
function ruinHint(game, x, z) {
  const ru = atMars() ? game.gen.nearestRuin(x, z, game.overVB.concat(MARS2.found.map(k => 'mruin' + k))) : null;
  return ru ? { d: Math.round(Math.hypot(ru.x - x, ru.z - z)), dir: compass(ru.x - x, ru.z - z) || 'side' } : null;
}
const MARS2 = { found: [], ruinT: 0, meteorT: 0, showerT: 0, landT: 0, nightDone: -1, dust: 0, dustSaid: false, windT: 0 };
function ruinsTick(game, dt) {
  const pl = game.player;
  if ((MARS2.ruinT -= dt) > 0) return;
  MARS2.ruinT = 0.6;
  MARS2.found = [0, 1, 2, 3, 4].filter(k => (game.stats.ruins | 0) & (1 << k));
  const ru = game.gen.nearestRuin(pl.x, pl.z, game.overVB);
  if (!ru || Math.hypot(ru.x - pl.x, ru.z - pl.z) > 9 || ((game.stats.ruins | 0) & (1 << ru.k))) return;
  game.stats.ruins = (game.stats.ruins | 0) | (1 << ru.k);
  const n = [0, 1, 2, 3, 4].filter(k => game.stats.ruins & (1 << k)).length;
  chat('You found ancient Martian ruins! (' + n + ' of 5.) Who built them, long ago? There is something in the chest...', '#ffd24a');
  bigText('Ruins found!', 2); sfx('mystery');
  if (MP.role === 'guest') MP.sendSave();
}

/* ===================== Meteor showers and dust storms ===================== */
/* a streak across the night sky, somewhere above you */
function meteorStreak(game) {
  const pl = game.player, a = Math.random() * TAU, d = randRange(20, 60), x = pl.x + Math.cos(a) * d, z = pl.z + Math.sin(a) * d, y = pl.y + randRange(30, 55), b = Math.random() * TAU, sp = randRange(28, 44);
  for (let i = 0; i < 7 && PARTICLES.length < 1500; i++) PARTICLES.push({ x: x - Math.cos(b) * i * 0.7, y: y + i * 0.35, z: z - Math.sin(b) * i * 0.7, vx: Math.cos(b) * sp, vy: -sp * 0.5, vz: Math.sin(b) * sp, life: 0.9 - i * 0.08, tile: TILE.laser_5, u: 0, v: 0, us: 16, size: 0.5 - i * 0.05, grav: 0, bright: 1 });
}
/* a meteorite comes down at a spot: a trail, a thump, and a glowing rock (the host puts the rock there) */
function meteorLand(game, x, y, z) {
  for (let i = 0; i < 40 && PARTICLES.length < 1500; i++) PARTICLES.push({ x: x + 0.5 + i * 0.35, y: y + 1 + i * 0.9, z: z + 0.5 + i * 0.2, vx: -0.4, vy: -1, vz: -0.2, life: 0.5 + i * 0.03, tile: i % 3 ? TILE.flame : TILE.laser_5, u: 0, v: 0, us: 16, size: 0.35, grav: 0, bright: 1 });
  smokeParticles(x + 0.5, y + 1.2, z + 0.5, 16, 1.4, true);
  sfx('meteorThump', x + 0.5, y + 1, z + 0.5);
}
function meteorMsg(game, m) {
  if (m.a === 'shower') { MARS2.showerT = 22; chat('A meteor shower! Look up at the sky!', '#ffd24a'); }
  else if (m.a === 'land' && okXYZ([m.x, m.y, m.z])) {
    meteorLand(game, m.x, m.y, m.z);
    const pl = game.player;
    chat('A meteorite landed about ' + Math.round(Math.hypot(m.x - pl.x, m.z - pl.z)) + ' blocks to the ' + (compass(m.x - pl.x, m.z - pl.z) || 'side') + '! It glows: go and dig it up.', '#ffd24a');
  }
}
function skyTick(game, dt) {
  const w = game.world, pl = game.player, host = MP.role !== 'guest', night = w.time > 0.56 && w.time < 0.94;
  // meteor shower: once on most nights, the host starts one; a little later a meteorite lands
  if (MARS2.showerT > 0) { MARS2.showerT -= dt; if (Math.random() < dt * 3.5) meteorStreak(game); }
  if (host) {
    if (night && MARS2.nightDone !== game.day && w.time > 0.62 && !MARS2.dust) {
      MARS2.nightDone = game.day;
      if (Math.random() < 0.7) { MARS2.landT = 12; const m = { t: 'meteor', a: 'shower', we: MP.we }; MP.broadcast(m); meteorMsg(game, m); }
    }
    if (MARS2.landT > 0 && (MARS2.landT -= dt) <= 0) {
      const ps = livePlayers(game);
      for (let k = 0; k < 12 && ps.length; k++) {
        const [px, , pz] = playerPos(ps[randInt(0, ps.length - 1)]), a = Math.random() * TAU, d = randRange(24, 44), x = Math.floor(px + Math.cos(a) * d), z = Math.floor(pz + Math.sin(a) * d);
        if (ps.some(p => { const q = playerPos(p); return Math.hypot(q[0] - x, q[2] - z) < 16; })) continue;   // (never near anybody)
        let y = -1;
        for (let yy = WH - 2; yy > 1; yy--) { const b = w.getBlock(x, yy, z); if (b === B.UNLOADED) break; if (b !== B.AIR) { y = b === B.MARS_DUST || b === B.MARS_ROCK ? yy : -1; break; } }   // (only out on open ground)
        if (y < 0) continue;
        w.setBlock(x, y, z, B.METEORITE, 0);
        const m = { t: 'meteor', a: 'land', x, y, z, we: MP.we };
        MP.broadcast(m); meteorMsg(game, m);
        break;
      }
    }
  }
  // dust storm: Mars's weather. The sky closes in and dust blows past; it hurts nobody
  const storm = WX.on ? 1 : 0;
  MARS2.dust += (storm - MARS2.dust) * Math.min(1, dt * 0.35);
  if (MARS2.dust < 0.003) MARS2.dust = 0;
  if (storm && !MARS2.dustSaid) { MARS2.dustSaid = true; chat('A dust storm is blowing in! It cannot hurt you, but it is hard to see far.', '#ffb27a'); }
  if (!storm && MARS2.dustSaid && MARS2.dust < 0.1) { MARS2.dustSaid = false; chat('The dust storm has blown over.', '#ffb27a'); }
  if (MARS2.dust > 0.05) {
    for (let n = MARS2.dust * dt * 70; n > 0 && PARTICLES.length < 1300; n--) {
      if (n < 1 && Math.random() > n) break;
      PARTICLES.push({ x: pl.x + randRange(-14, 6), y: pl.y + randRange(-1, 6), z: pl.z + randRange(-10, 10), vx: randRange(9, 15), vy: randRange(-0.5, 0.5), vz: randRange(-2, 2), life: randRange(0.6, 1.3), tile: TILE.mars_dust_p, u: 0, v: 0, us: 16, size: randRange(0.04, 0.09), grav: 0, bright: 0 });
    }
    if ((MARS2.windT -= dt) <= 0) { MARS2.windT = 2.2; sfx('dustWind', undefined, undefined, undefined, MARS2.dust * (inAirBubble(pl) ? 0.35 : 1)); }
  }
}
/* how far you can see in a dust storm (called where the fog is set) */
function marsFog() { if (MARS2.dust > 0 && atMars()) { const k = 1 - 0.55 * MARS2.dust; R.fogEnd *= k; R.fogStart = Math.min(R.fogStart, R.fogEnd * 0.15); } }

/* ===================== Bounce ball ===================== */
// A big ball on the field by the landing pads. Walk, drive or fly into it and it bounces away, high in Mars's low
// gravity; a punch sends it further. Into the goal at the red end is a point for Blue, and the other way round.
const BALL = { score: [0, 0], idleT: 0 };
function ballKick(game, e, fx, fz, power, up) {
  if (e.proxy) return;
  let dx = e.x - fx, dz = e.z - fz; const l = Math.hypot(dx, dz) || 1;
  dx /= l; dz /= l;
  e.vx = dx * power; e.vz = dz * power; e.vy = Math.max(e.vy, up);
  e.kickT = 0.25; e.onGround = false;
  sfx('ballBoing', e.x, e.y + 0.3, e.z); MP.sfx('ballBoing', e.x, e.y + 0.3, e.z);
}
function ballReset(game, e) {
  const M = game.gen.marsw, f = M.field;
  smokeParticles(e.x, e.y + 0.4, e.z, 6, 0.4, false);
  Object.assign(e, { x: f.x + 0.5, y: M.town.y + 3, z: f.z + 0.5, vx: 0, vy: 0, vz: 0 });
}
function updateBall(game, e, dt) {
  const w = game.world;
  if (game.mapId !== 'marsworld' || w.getBlock(Math.floor(e.x), Math.floor(e.y + 0.2), Math.floor(e.z)) === B.UNLOADED) return;
  if (e.kickT > 0) e.kickT -= dt;
  e.vy -= 24 * gravOf(w.map) * dt;
  const steps = Math.max(1, Math.ceil(Math.hypot(e.vx, e.vy, e.vz) * dt / 0.3)), h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const vx = e.vx, vy = e.vy, vz = e.vz, x0 = e.x, y0 = e.y, z0 = e.z;
    moveEntity(w, e, vx * h, vy * h, vz * h);
    if (vy > 0 && e.y - y0 < vy * h * 0.5) e.vy = -vy * 0.5;   // off a ceiling
    if (e.onGround && vy < 0) { e.vy = vy < -2.2 ? -vy * 0.74 : 0; if (vy < -3) sfx('ballBoing', e.x, e.y, e.z, 0.5); }
    if (Math.abs(vx * h) > 1e-5 && Math.abs(e.x - x0) < Math.abs(vx * h) * 0.5) e.vx = -vx * 0.72;   // off a wall
    if (Math.abs(vz * h) > 1e-5 && Math.abs(e.z - z0) < Math.abs(vz * h) * 0.5) e.vz = -vz * 0.72;
  }
  if (e.onGround) { const f = Math.pow(0.45, dt); e.vx *= f; e.vz *= f; }
  e.walk += Math.hypot(e.vx, e.vz) * dt * 2.2; e.walkAmt = 1;
  if (Math.hypot(e.vx, e.vz) > 0.3) e.bodyYaw = e.headYaw = e.yaw = Math.atan2(-e.vx, -e.vz);
  // whoever bumps into it knocks it on
  if (!(e.kickT > 0)) {
    for (const p of livePlayers(game)) {
      const [px, py, pz] = playerPos(p), d = Math.hypot(px - e.x, pz - e.z);
      if (d < 0.95 && py < e.y + e.h + 0.3 && py + 1.8 > e.y) { ballKick(game, e, px, pz, 7 + Math.min(8, Math.hypot(p.vx || 0, p.vz || 0)), 4.2); break; }
    }
    if (!(e.kickT > 0)) for (const v of game.entities) {
      if (!v.vehicle || v.removed || !v.rider) continue;
      if (Math.abs(v.x - e.x) < v.w + e.w + 0.2 && Math.abs(v.z - e.z) < v.w + e.w + 0.2 && v.y < e.y + e.h && v.y + v.h > e.y) { ballKick(game, e, v.x, v.z, 6 + Math.min(14, Math.hypot(v.vx, v.vz) * 1.2), 5); break; }
    }
  }
  // a goal? out of bounds?
  const M = game.gen.marsw, f = M.field, Y = M.town.y + 1, ax = e.x - (f.x + 0.5), az = e.z - (f.z + 0.5);
  if (Math.abs(ax) > f.hx + 0.9 && Math.abs(ax) < f.hx + 2.6 && Math.abs(az) < 2.6 && e.y < Y + 3 && e.y > Y - 1) {
    const k = ax < 0 ? 1 : 0;   // (into the red goal, at the west end: a point for Blue)
    BALL.score[k]++; BALL.idleT = 0;
    const line = 'GOAL! ' + (k ? 'Blue' : 'Red') + ' scores. Red ' + BALL.score[0] + ' - ' + BALL.score[1] + ' Blue';
    chat(line, k ? '#6aa8ff' : '#ff6a5a'); bigText('GOAL!', 1.6); sfx('levelUp');
    MP.broadcast({ t: 'chat', m: line, c: k ? '#6aa8ff' : '#ff6a5a' }); MP.sfx('ballGoal', e.x, e.y, e.z);
    partyEffect(e.x, e.y + 1, e.z);
    ballReset(game, e);
  } else if (Math.hypot(ax, az) > 60 || e.y < 20) ballReset(game, e);
  else if (Math.abs(ax) > f.hx + 4 || Math.abs(az) > f.hz + 3) {   // over the wall: if nobody goes after it, it rolls back to the middle
    e.outT = closePlayer(game, e, 7) ? 0 : (e.outT || 0) + dt;
    if (e.outT > 6) { e.outT = 0; ballReset(game, e); }
  } else e.outT = 0;
  if (!closePlayer(game, { x: f.x, y: Y, z: f.z }, 40)) { BALL.idleT += dt; if (BALL.idleT > 90 && (BALL.score[0] || BALL.score[1])) BALL.score = [0, 0]; } else BALL.idleT = 0;
}

/* ===================== The sandboard ===================== */
// Stand on it and slide: a push forward kicks you along slowly, and every block you drop down a dune makes you
// faster. It slides best on dust and sand. Left and right steer; Sneak gets off.
defItem(I.SANDBOARD, 'Sandboard', { tex: 'sandboard', stack: 1, fuel: 5 });
function boardStep(game, e, dt) {
  const w = game.world, driven = !!e.rider, throttle = driven ? e.ctrlZ || 0 : 0, steer = driven ? e.ctrlX || 0 : 0;
  let fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), v = e.vx * fx + e.vz * fz;
  const under = w.getBlock(Math.floor(e.x), Math.floor(e.y - 0.5), Math.floor(e.z)), slick = under === B.MARS_DUST || under === B.SAND || under === B.SNOW || under === B.MOON_DUST || under === B.ICE || under === B.URANUS_ICE;
  if (throttle > 0.1 && v < 5.5) v += throttle * 7 * dt;   // a push with your foot
  else if (throttle < -0.1) v -= Math.sign(v) * Math.min(Math.abs(v), 14 * dt);   // dragging a foot: slow down
  if (e.onGround) {
    if (e.groundY !== undefined && e.y < e.groundY - 0.4) { v += Math.min(3, e.groundY - e.y) * 3.2; if (driven && v > 8) sfx('boardSwish', e.x, e.y, e.z, 0.7); }   // down a step of the dune: faster!
    e.groundY = e.y;
    v *= Math.pow(slick ? 0.86 : 0.5, dt);
  }
  v = clamp(v, -2, 19);
  e.yaw -= steer * clamp(Math.abs(v) / 3, 0.25, 1) * 2.2 * dt;
  fx = -Math.sin(e.yaw); fz = -Math.cos(e.yaw);
  e.vx = fx * v; e.vz = fz * v;
  const before = e.onGround;
  physicsStep(w, e, dt, 24);
  if (e.collidedH && before && v > 3.5 && boxFree(w, e.x + fx * 0.35, e.y + 1.05, e.z + fz * 0.35, e.w, e.h)) {   // a one-block bump: over it, a bit slower
    e.vy = 7.2 * Math.sqrt(gravOf(w.map)); const sp = Math.max(2.5, v - 2.5); e.vx = fx * sp; e.vz = fz * sp;
  }
  e.fallDist = 0;
  e.bank = lerp(e.bank || 0, steer * 0.35 * clamp(v / 6, 0, 1), Math.min(1, dt * 6));
  if (driven && e.onGround && v > 5 && Math.random() < dt * 20 && PARTICLES.length < 1400) PARTICLES.push({ x: e.x - fx * 0.7 + randRange(-0.2, 0.2), y: e.y + 0.1, z: e.z - fz * 0.7 + randRange(-0.2, 0.2), vx: -fx, vy: 1.2, vz: -fz, life: 0.5, tile: TILE.mars_dust_p, u: 0, v: 0, us: 16, size: 0.07, grav: 6, bright: 0 });
}

/* ---- every frame ---- */
function mars2Tick(game, dt) {
  airTick(game, dt);
  if (!atMars() || game.state !== 'playing') { MARS2.dust = 0; MARS2.showerT = 0; return; }
  ruinsTick(game, dt);
  skyTick(game, dt);
}
/* (the host, every second, with the Martians) the ball on its field, and the third track's buggies and marshal */
function mars2SpawnTick(game) {
  const M = game.gen.marsw, w = game.world, f = M.field;
  if (!game.overVB.includes(f.id) && w.getBlock(f.x, M.town.y, f.z) !== B.UNLOADED && !game.entities.some(e => e.type === 'marsball' && !e.removed)) spawnMob(game, 'marsball', f.x + 0.5, M.town.y + 2, f.z + 0.5);
}
