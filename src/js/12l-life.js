/* ===================== Life Cycle (the sixth wish list) ===================== */
// A friendly little city (see lifeGen in 02b-gen3.js) where you live a whole life in about ten days. You start as a
// baby: small and slow, and you can't leave your home's garden yet; grown-ups (caretakers) stay near you and keep you
// fed. Each day you grow up ("Day 3: You're a toddler!"): a kid can go out to the playground, the school and the park,
// a teen can use tools, a grown-up can drive the car and build, and an old person can do it all, a little slower.
// Your size and speed change too. On your last day, a gentle ending: "The End: what a life!", with a few things you
// did; tap, and a new life begins. Days here are short (three minutes) so a whole life fits in a play session. Playing
// together, each player has their own age, counted from when they first came; the host's clock drives the days.
const LIFE_DAY_LEN = 180, LIFE_DAYS = 10;
const LIFE_STAGES = [   // (playing together sends their numbers: new ones go on the end)
  { key: 'baby', name: 'a baby', title: 'Baby', from: 1, scale: 0.45, speed: 0.45, say: "You're a baby! The grown-ups look after you. Explore your home and garden." },
  { key: 'toddler', name: 'a toddler', title: 'Toddler', from: 3, scale: 0.58, speed: 0.65, say: "You're a toddler! You can walk about a bit faster now, but you still stay at home." },
  { key: 'kid', name: 'a kid', title: 'Kid', from: 4, scale: 0.72, speed: 0.95, say: "You're a kid! Now you can go out: the playground, the school and the park are waiting." },
  { key: 'teen', name: 'a teen', title: 'Teen', from: 6, scale: 0.88, speed: 1.05, say: "You're a teen! You can use tools now: dig, chop and mine." },
  { key: 'grownup', name: 'a grown-up', title: 'Grown-up', from: 8, scale: 1, speed: 1, say: "You're a grown-up! You can drive the car and build anything you like." },
  { key: 'old', name: 'old', title: 'Old', from: 10, scale: 0.94, speed: 0.75, say: "You're old and wise now! It's your last day: enjoy it." },
];
const atLife = () => game.mapId === 'life' && game.dim === 'over';
const dayLength = () => atLife() ? LIFE_DAY_LEN : DAY_LENGTH;
/* your age in days (1 on the day you arrive), and what you are */
const lifeDay = () => Math.max(1, (game.day | 0) - ((game.stats && game.stats.born) || game.day | 0) + 1);
const lifeStageIx = d => { let k = 0; LIFE_STAGES.forEach((s, i) => { if ((d || lifeDay()) >= s.from) k = i; }); return k; };
const lifeStage = () => LIFE_STAGES[lifeStageIx()];
/* how big you are (and what other iPads are told: 0 means "not in the Life Cycle world") */
const lifeStageNum = () => (atLife() ? lifeStageIx() + 1 : 0);
const lifeScaleOf = p => p === game.player ? (atLife() ? lifeStage().scale : 1) : (p && p.life && LIFE_STAGES[p.life - 1] ? LIFE_STAGES[p.life - 1].scale : 1);
const lifeSpeed = () => (atLife() ? lifeStage().speed : 1);
/* what you may do at your age (in Creative, anything) */
function lifeCan(what, quiet) {
  if (!atLife() || game.mode === 'creative') return true;
  const k = lifeStageIx(), ok = what === 'leave' ? k >= 2 : what === 'mine' ? k >= 3 : what === 'build' || what === 'drive' ? k >= 4 : true;
  if (!ok && !quiet && !(game.lifeTipT > game.t)) {
    game.lifeTipT = game.t + 3;
    toast(what === 'mine' ? "You're too little to dig! (Teens can use tools.)" : what === 'build' ? 'Only grown-ups can build. You can play!' : what === 'drive' ? 'Only grown-ups can drive!' : 'Babies and toddlers stay at home!', 2.5);
  }
  return ok;
}

/* ---- arriving: your birthday, and the family car ---- */
function lifeWelcome(game) {
  if (!game.stats.born) { game.stats.born = game.day | 0; game.stats.lifeSeen = 0; game.stats.placedAt = game.stats.placed | 0; game.stats.minedAt = game.stats.mined | 0; }
  if (!game.stats.lifeHi) { game.stats.lifeHi = 1; chat('Welcome to Life Cycle! You are a brand new baby. Every day you grow up a little. What will your life be like?', '#ffd8f0'); }
  if (MP.role === 'guest') MP.sendSave();
}
function lifeSpawnTick(game) {
  const L = game.gen.life, w = game.world;
  if (!game.stats.lifeCar && w.getBlock(Math.floor(L.car[0]), Math.floor(L.car[1]) - 1, Math.floor(L.car[2])) !== B.UNLOADED) { game.stats.lifeCar = 1; spawnVehicle(game, 'car', L.car[0], L.car[1], L.car[2], Math.PI / 2); }   // (the family car, out on the street)
  const care = game.entities.filter(e => e.type === 'villager' && e.caretaker && !e.removed);
  if (care.length < 2 && w.getBlock(L.home.x, L.town.y, L.home.z) !== B.UNLOADED) {
    for (let i = care.length; i < 2; i++) { const e = spawnMob(game, 'villager', L.home.x + (i ? 3.5 : -2.5), L.town.y + 1, L.home.z + 2.5, { prof: i ? 'farmer' : 'librarian', home: [L.home.x + 0.5, L.home.z + 2.5], village: 'lifehome' + i, vseed: 7 + i }); e.caretaker = true; }
  }
}
/* a caretaker stays close to the nearest baby or toddler (anyone else: at home) */
function caretakerSteer(game, e) {
  let best = null, bd = 40;
  for (const p of livePlayers(game)) {
    const small = p === game.player ? lifeStageIx() <= 1 : (p.life || 0) >= 1 && p.life <= 2;
    if (!small) continue;
    const [x, , z] = playerPos(p), d = Math.hypot(x - e.x, z - e.z);
    if (d < bd) { bd = d; best = [x, z, d]; }
  }
  if (!best) return null;
  if (best[2] < 2.5) { e.moving = false; e.yaw = Math.atan2(-(best[0] - e.x), -(best[1] - e.z)); return [0, 0, 0]; }
  e.moving = true; e.yaw = Math.atan2(-(best[0] - e.x), -(best[1] - e.z));
  return [(best[0] - e.x) / best[2], (best[1] - e.z) / best[2], best[2] > 6 ? 1.4 : 0.8];
}

/* ---- every frame here ---- */
function lifeTick(game, dt) {
  const pl = game.player, L = game.gen.life, st = lifeStage(), d = lifeDay();
  hudCount('Day ' + Math.min(d, LIFE_DAYS) + ' of ' + LIFE_DAYS + ': ' + st.title);
  if (!pl.alive || game.state !== 'playing') return;
  // a new day: you grew up
  if (d > (game.stats.lifeSeen | 0) && d <= LIFE_DAYS) {
    const first = !game.stats.lifeSeen, was = first ? -1 : lifeStageIx(game.stats.lifeSeen);
    game.stats.lifeSeen = d;
    const now = lifeStageIx(d), grew = now !== was;
    bigText('Day ' + d, 2.2);
    if (grew) toast('Day ' + d + ": You're " + st.name + '!', 4);
    chat('Day ' + d + ': ' + (grew ? st.say : ["You're still " + st.name + '. Have a lovely day!', 'Another day! What will you do today?'][d % 2]), '#ffd8f0');
    if (grew && !first) { sfx('levelUp'); if (game.net) MP.system(playerName() + ' is ' + st.name + ' now!'); }
    if (MP.role === 'guest') MP.sendSave();
  }
  // the end of your last day: the end of a lovely life
  if (d > LIFE_DAYS && !el('life-end')) { lifeEnd(game); return; }
  // babies and toddlers stay inside the garden fence
  if (!lifeCan('leave', true) && !pl.riding) {
    const dx = pl.x - (L.home.x + 0.5), dz = pl.z - (L.home.z + 0.5), r = L.home.r - 0.8, dd = Math.max(Math.abs(dx), Math.abs(dz));
    if (dd > r) { pl.x = L.home.x + 0.5 + clamp(dx, -r, r); pl.z = L.home.z + 0.5 + clamp(dz, -r, r); pl.vx = pl.vz = 0; lifeCan('leave'); }
  }
  // the grown-ups keep a baby or toddler fed
  if (lifeStageIx() <= 1 && pl.food < 14 && game.mode === 'survival') { pl.food = 20; ui.food = -2; toast('A grown-up gives you a bottle of milk. Yum!', 2.5); sfx('eat', pl.x, pl.y + 1, pl.z); }
}
/* the ending: a few things you did, then a new life */
function lifeEnd(game) {
  const s = game.stats, built = Math.max(0, (s.placed | 0) - (s.placedAt | 0)), dug = Math.max(0, (s.mined | 0) - (s.minedAt | 0));
  game.releasePointer();
  game.uiOpen = true;
  const box = h('div', { id: 'life-end', class: 'life-end', role: 'dialog', 'aria-label': 'The End' });
  const p = h('div', { class: 'panel' });
  p.appendChild(h('h2', { text: 'The End: what a life!' }));
  p.appendChild(h('p', { text: playerName() + ' lived ' + LIFE_DAYS + ' happy days: a baby, a toddler, a kid, a teen, a grown-up, and old and wise.' }));
  const ul = h('ul', { class: 'life-stats' });
  for (const line of ['Blocks built: ' + built, 'Blocks dug: ' + dug, 'Ghosts caught: ' + (s.ghosts | 0), 'Things bought at the store: ' + (s.shopped | 0)]) ul.appendChild(h('li', { text: line }));
  p.appendChild(ul);
  const b = h('button', { type: 'button', class: 'btn', text: 'Tap to start a new life' });
  b.addEventListener('click', () => { initAudio(); sfx('click'); lifeAgain(game); });
  p.appendChild(b);
  box.appendChild(p);
  document.body.appendChild(box);
  sfx('levelUp');
  if (game.net) MP.system(playerName() + "'s life is complete. What a life!");
}
function lifeAgain(game) {
  const box = el('life-end');
  if (box) box.remove();
  game.uiOpen = false;
  if (!MP.role && game.slot) { game.startWorld(game.slot, game.mode, true); return; }   // (alone: the world starts over as a new game)
  // playing together: you are born again here, as a baby at home (the world goes on for everyone else)
  const s = game.stats, L = game.gen.life, pl = game.player;
  s.born = game.day | 0; s.lifeSeen = 0; s.placedAt = s.placed | 0; s.minedAt = s.mined | 0;
  Object.assign(pl, { x: L.spawn[0], y: L.spawn[1], z: L.spawn[2], vx: 0, vy: 0, vz: 0, fallDist: 0 });
  if (pl.riding) dismountVehicle(game);
  toast('A new life begins!', 3);
  if (!game.touchOn && !game.dragLook) game.requestPointer();
  if (MP.role === 'guest') MP.sendSave(); else game.save();
}

/* the world's picture on its card: a little town, a house with a garden, a sunny sky */
function drawLifeThumb(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#6ab8ff'); g.addColorStop(1, '#d8f0ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff2a0'; ctx.fillRect(130, 8, 12, 12);
  ctx.fillStyle = '#5daa3a'; ctx.fillRect(0, 50, W, 20);
  ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 58, W, 5);
  [['#e1453a', 12], ['#f2cf3a', 40], ['#3a7ae0', 104], ['#9a5ae0', 132]].forEach(([c, x]) => { ctx.fillStyle = c; ctx.fillRect(x, 36, 18, 14); ctx.fillStyle = '#8a3a2a'; ctx.beginPath(); ctx.moveTo(x - 2, 36); ctx.lineTo(x + 9, 28); ctx.lineTo(x + 20, 36); ctx.fill(); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 7, 43, 4, 7); });
  ctx.fillStyle = '#c8462e'; ctx.fillRect(68, 30, 24, 20); ctx.fillStyle = '#7a3a2a'; ctx.beginPath(); ctx.moveTo(65, 30); ctx.lineTo(80, 20); ctx.lineTo(95, 30); ctx.fill();
  ctx.fillStyle = '#f4f4f4'; for (let x = 60; x <= 100; x += 4) ctx.fillRect(x, 46, 2, 5);
  ctx.fillStyle = '#ffd0b0'; ctx.fillRect(78, 44, 4, 6); ctx.fillStyle = '#3a7ae0'; ctx.fillRect(78, 47, 4, 3);
}
