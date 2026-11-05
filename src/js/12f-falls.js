/* ===================== Declan Falls ===================== */
// A little town in a tall pine forest by a lake (see fallsGen in 02b-gen3.js): the Mystery Shack, a water tower, a
// diner and a few houses. When you first arrive you pick who you are: Dipper, Mabel, Grunkle Stan, Soos or Wendy, each
// with their own look and the things they start with (Grunkle Stan has $500 to spend at the Declan-craft Store on the
// main street). Six mysteries are hidden about the town and the forest ("Mysteries found 3/6"), and
// odd creatures live here: garden gnomes that giggle and run off, glowing lights in the forest, and something big in
// the lake. Nothing here hurts anyone. Who you are and what you have found are kept with the world (a guest's on the
// host's iPad, with the rest of their things).
const FALLS_CHARS = [
  { name: 'Dipper', kit: 'Journal 3 and his pine tree cap', give: [[I.JOURNAL, 1], [I.PINE_CAP, 1, 1]] },
  { name: 'Mabel', kit: 'lots of colourful sweaters', give: SWEATERS.map((s, i) => [I.SWEATER + i, 1, i === 0 ? 1 : 0]) },
  { name: 'Grunkle Stan', kit: 'his fez and lots of money', give: [[I.FEZ, 1, 1], [I.BILL, 50], [I.EMERALD, 32]] },
  { name: 'Soos', kit: 'a golf cart to drive, and pizza', give: [[I.GOLF_CART, 1], [I.PIZZA, 8]] },
  { name: 'Wendy', kit: 'an axe and her flannel shirt', give: [[toolId(2, 1), 1]] },
];
const MYSTERIES = [
  ['The secret lab', 'You found a hidden door in the Mystery Shack, and a secret lab under it! Who built this?'],
  ['The glowing rock', 'A strange glowing rock! It hums when you get close...'],
  ['The secret code', 'A secret code on the wall: GHFODQ. Move each letter back three and it says... DECLAN!'],
  ['The lost Journal page', "A lost Journal page in a hollow tree! It says: 'Trust no one... except Declan.'"],
  ['The gnome hideout', 'A gnome hideout! Tiny toadstool houses... and lots of giggling.'],
  ['The crashed flying saucer', 'A crashed flying saucer, half buried in the forest! Is anybody still inside?'],
];
const FALLS_CREATURES = [['gnome', 'Garden gnomes', 'Little and cheeky. They giggle and run away!'], ['lakemon', 'The lake monster', 'Something BIG lives in the lake. It is shy, and friendly.'], ['wisp', 'Forest lights', 'Glowing lights that float about in the forest.']];
const WISP_COLORS = ['#9aff8a', '#8ad8ff', '#ffe08a'];
const atFalls = () => game.mapId === 'falls' && game.dim === 'over';
const fallsChar = () => (game.stats && atFalls() ? clamp(game.stats.fc | 0, 0, FALLS_CHARS.length) : 0);
/* the skin you are drawn with: your Declan Falls character there, else your own */
const mySkin = () => { const f = fallsChar(); return f ? 'falls_' + (f - 1) : PROFILE.skin; };
const mystCount = () => { let n = 0; for (let i = 0; i < MYSTERIES.length; i++) if ((game.stats.myst | 0) & (1 << i)) n++; return n; };

/* ---- arriving, and picking who you are ---- */
function fallsWelcome(game) {
  if (!game.stats.fallsHi) { game.stats.fallsHi = 1; chat('Welcome to Declan Falls! The Mystery Shack is in front of you, the lake is behind you, and the forest is all around. There are six mysteries to find...', '#ffe08a'); }
  if (!game.stats.fc) openFallsPicker();
}
function openFallsPicker() {
  if (ui.inv) closeInv();
  game.releasePointer();
  const wrap = el('falls-chars');
  wrap.textContent = '';
  FALLS_CHARS.forEach((c, i) => {
    const b = h('button', { type: 'button', class: 'btn' }, h('img', { src: faceIcon('falls_' + i, 96), alt: '' }), h('span', { text: c.name }), h('small', { text: 'Starts with ' + c.kit }));
    b.addEventListener('click', () => { initAudio(); sfx('click'); pickFallsChar(i); });
    wrap.appendChild(b);
  });
  game.uiOpen = true;
  showScreen('scr-falls');
}
function pickFallsChar(i) {
  const c = FALLS_CHARS[i], pl = game.player;
  if (!c || game.stats.fc) return;
  game.stats.fc = i + 1;
  for (const [id, n, wear] of c.give) {
    const a = wear && armorOf(id);
    if (a && !pl.inv[ARMOR_INV + a.slot]) { pl.inv[ARMOR_INV + a.slot] = { id, count: 1 }; continue; }   // (put on at once)
    const left = pl.give(id, n);
    if (left > 0) dropItem(game, pl.x, pl.y + 1, pl.z, id, left);
  }
  game.uiOpen = false;
  showScreen(null);
  game.releaseKeys();
  if (!game.touchOn && !game.dragLook) { game.requestPointer(); el('click-hint').hidden = !!document.pointerLockElement; }
  ui.dirty = true;
  sfx('levelUp');
  chat('You are ' + c.name + '! You start with ' + c.kit + '.', '#ffe08a');
  if (game.net) MP.system(playerName() + ' is ' + c.name + '!');
  if (MP.role === 'guest') MP.sendSave(); else game.save();
}

/* ---- every frame here: the mysteries you come across, the creatures you see, the counter ---- */
function fallsTick(game, dt) {
  const pl = game.player, F = game.gen.falls;
  if (!game.stats.fc && game.state === 'playing' && !game.uiOpen && !game.paused) openFallsPicker();   // (back from a pause before picking)
  if (pl.alive) F.myst.forEach((m, i) => {
    if (((game.stats.myst | 0) & (1 << i)) || Math.hypot(pl.x - m.x - 0.5, pl.z - m.z - 0.5) > m.r || (m.y !== undefined && Math.abs(pl.y - m.y) > 3.5)) return;
    game.stats.myst = (game.stats.myst | 0) | (1 << i);
    const n = mystCount();
    bigText('Mystery found!', 1.8);
    chat(MYSTERIES[i][1], '#ffe08a');
    sfx('mystery', pl.x, pl.y + 1, pl.z);
    if (game.net) MP.system(playerName() + ' found a mystery: ' + MYSTERIES[i][0] + '!');
    if (n === MYSTERIES.length) chat('You found all six mysteries! You are a real mystery hunter!', '#ffe08a');
    if (MP.role === 'guest') MP.sendSave();
  });
  game.seenT = (game.seenT || 0) - dt;
  if (game.seenT <= 0) {
    game.seenT = 0.5;
    FALLS_CREATURES.forEach(([type, name], k) => {
      if ((game.stats.seen | 0) & (1 << k)) return;
      if (!game.entities.some(e => e.type === type && !e.removed && Math.hypot(e.x - pl.x, e.y - pl.y, e.z - pl.z) < (type === 'lakemon' ? 40 : 14))) return;
      game.stats.seen = (game.stats.seen | 0) | (1 << k);
      toast('You saw ' + name.toLowerCase() + '!' + (game.player.inv.some(s => s && s.id === I.JOURNAL) ? ' (It is in your Journal now.)' : ''), 3);
    });
  }
  const d = el('myst-count'), txt = 'Mysteries found ' + mystCount() + '/' + MYSTERIES.length;
  if (d.textContent !== txt) d.textContent = txt;
  if (d.hidden) d.hidden = false;
}

/* ---- Journal 3: what you have found so far ---- */
function openJournal() {
  const seen = game.stats.seen | 0, myst = game.stats.myst | 0, who = fallsChar() ? FALLS_CHARS[fallsChar() - 1].name : playerName();
  const pages = [
    'JOURNAL 3\n\nThis journal now belongs to ' + who + '.\n\nDeclan Falls is full of strange things. Write down everything you find... and trust no one!',
    'CREATURES\n\n' + FALLS_CREATURES.map(([t, n, about], k) => (seen & (1 << k)) ? n + ': ' + about : '???: not found yet').join('\n\n'),
    'MYSTERIES ' + mystCount() + '/' + MYSTERIES.length + '\n\n' + MYSTERIES.map(([n], i) => (myst & (1 << i)) ? '* ' + n : '* ???').join('\n'),
    'CLUES\n\nThe Shack has more rooms than it shows.\nSomething glows in the western woods.\nA wall in the north woods has a message.\nThe oldest tree is hollow.\nGnomes live east of town.\nSomething fell from the sky south-west of town.',
  ];
  if (ui.inv) closeInv();
  game.releasePointer();
  Object.assign(BOOKUI, { slot: -1, st: { id: I.WRITTEN_BOOK, count: 1, tag: { book: { title: 'Journal 3', author: '???', pages } } }, edit: false, signing: false, page: 0, pages: pages.slice() });
  game.uiOpen = true;
  showScreen('scr-book');
  showBookPage();
  sfx('pageTurn');
}

/* ---- the creatures (the host's iPad runs them) ---- */
function fallsSpawnTick(game) {
  const F = game.gen.falls, T = F.town, L = F.lake, w = game.world, players = livePlayers(game);
  const ents = t => game.entities.filter(e => e.type === t && !e.removed);
  if (!players.length) return;
  const ground = (x, z) => game.gen.fallsGround(game.seed, x, z) + 1;
  const put = (type, x, z, up) => {
    const y = ground(x, z) + (up || 0);
    if (w.getBlock(Math.floor(x), y - 1, Math.floor(z)) === B.UNLOADED || !boxFree(w, x, y, z, MOB_DEFS[type].w, MOB_DEFS[type].h)) return null;
    const e = spawnMob(game, type, x, y, z);
    e.home = [x, z]; e.aiT = 0;
    return e;
  };
  if (!ents('lakemon').length && players.some(p => { const [x, , z] = playerPos(p); return Math.hypot(x - L.x, z - L.z) < 100; })) {
    const e = spawnMob(game, 'lakemon', L.x + 0.5, L.y - 5, L.z + 0.5); e.ang = Math.random() * TAU;
  }
  const gnomes = ents('gnome'), wisps = ents('wisp'), hide = F.myst[4];
  for (const p of players) {
    const [px, , pz] = playerPos(p);
    if (Math.hypot(px - hide.x, pz - hide.z) < 40 && gnomes.filter(e => Math.hypot(e.x - hide.x, e.z - hide.z) < 14).length < 4) { const a = Math.random() * TAU, e = put('gnome', hide.x + 0.5 + Math.cos(a) * 3, hide.z + 0.5 + Math.sin(a) * 3); if (e) gnomes.push(e); }
    if (Math.hypot(px - T.x, pz - T.z) < T.r - 8) continue;   // (not in the middle of town)
    const a = Math.random() * TAU, r = randRange(12, 24), x = Math.floor(px + Math.cos(a) * r) + 0.5, z = Math.floor(pz + Math.sin(a) * r) + 0.5;
    if (Math.hypot(x - T.x, z - T.z) < T.r || Math.hypot((x - L.x) / L.rx, (z - L.z) / L.rz) < 1.2) continue;
    if (gnomes.length < 12 && gnomes.filter(e => Math.hypot(e.x - px, e.z - pz) < 40).length < 3) { const e = put('gnome', x, z); if (e) gnomes.push(e); }
    else if (wisps.length < 10 && wisps.filter(e => Math.hypot(e.x - px, e.z - pz) < 40).length < 3) { const e = put('wisp', x, z, 1.5); if (e) { e.variant = randInt(0, WISP_COLORS.length - 1); e.color = hexRGB(WISP_COLORS[e.variant]).map(v => v / 255); wisps.push(e); } }
  }
}
/* gnomes: potter about near home; when someone comes close they giggle, hop and run off */
function gnomeSteer(game, e, dt) {
  if (nearestPlayerDist(game, e) > 70 || game.mapId !== 'falls') { e.removed = true; return [0, 0, 0]; }
  const near = closePlayer(game, e, 6);
  if (near || e.panic > 0) {
    if (e.panic > 0) e.panic -= dt;
    if (near) e.yaw = Math.atan2(near[1] - e.x, near[3] - e.z);   // (facing away from them)
    if (!(e.giggleT > game.t)) { e.giggleT = game.t + randRange(1.5, 3.5); sfx('gnomeGiggle', e.x, e.y + 0.7, e.z); MP.sfx('gnomeGiggle', e.x, e.y + 0.7, e.z); }
    if (e.onGround && Math.random() < dt * 1.5) e.vy = 6.5;   // a cheeky hop
    if (e.collidedH) e.yaw += randRange(-1.5, 1.5);
    return [-Math.sin(e.yaw), -Math.cos(e.yaw), 1];
  }
  e.aiT -= dt;
  if (e.aiT <= 0) {
    e.moving = Math.random() < 0.6; e.aiT = randRange(1, 3.5); e.yaw = Math.random() * TAU;
    if (e.home && Math.hypot(e.home[0] - e.x, e.home[1] - e.z) > 8) e.yaw = Math.atan2(-(e.home[0] - e.x), -(e.home[1] - e.z));
  }
  return e.moving ? [-Math.sin(e.yaw), -Math.cos(e.yaw), 0.4] : [0, 0, 0];
}
/* the lake monster: swims slowly round the lake, now and then lifting its long neck out of the water */
function updateLakemon(game, e, dt) {
  const L = game.gen.falls.lake;
  if (game.mapId !== 'falls' || nearestPlayerDist(game, e) > 130) { e.removed = true; return; }
  e.ang = (e.ang || 0) + dt * 0.07;
  const up = Math.sin(e.age * 0.22) > 0.2 || e.peekT > game.t, ty = up ? L.y - 1.6 : L.y - 5.5;
  const tx = L.x + Math.cos(e.ang) * L.rx * 0.5, tz = L.z + Math.sin(e.ang) * L.rz * 0.5;
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1, sp = Math.min(2, d);
  e.vx = dx / d * sp; e.vz = dz / d * sp; e.vy = clamp((ty - e.y) * 0.8, -1.2, 1.2);
  e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
  if (Math.hypot(e.vx, e.vz) > 0.2) e.yaw = Math.atan2(-e.vx, -e.vz);
  e.bodyYaw = approachAngle(e.bodyYaw, e.yaw, dt); e.headYaw = e.bodyYaw;
  e.walk += dt; e.walkAmt = 0.4;
  if (up && e.y > L.y - 2.2 && !(e.roarT > game.t)) { e.roarT = game.t + randRange(8, 16); sfx('lakemonSay', e.x, e.y + 2, e.z); MP.sfx('lakemonSay', e.x, e.y + 2, e.z); }
  if (up && Math.random() < dt * 6 && PARTICLES.length < 1500) PARTICLES.push({ x: e.x + randRange(-1.2, 1.2), y: L.y + 0.1, z: e.z + randRange(-1.2, 1.2), vx: 0, vy: 0.6, vz: 0, life: 0.6, tile: TILE.bubble_p, u: 0, v: 0, us: 16, size: 0.08, grav: 0.5, bright: 1 });
}
/* the forest lights: drift about over the ground, bobbing, and float away from anyone who comes near */
function updateWisp(game, e, dt) {
  if (game.mapId !== 'falls' || nearestPlayerDist(game, e) > 60) { e.removed = true; return; }
  const near = closePlayer(game, e, 4);
  e.aiT -= dt;
  if (e.aiT <= 0 || near) {
    e.aiT = randRange(2, 5);
    const a = near ? Math.atan2(e.z - near[3], e.x - near[1]) + randRange(-0.6, 0.6) : Math.random() * TAU, r = near ? 5 : randRange(1, 4);
    const hx = e.home ? e.home[0] : e.x, hz = e.home ? e.home[1] : e.z, bx = near ? e.x : hx, bz = near ? e.z : hz;
    e.goal = [bx + Math.cos(a) * r, game.gen.fallsGround(game.seed, bx + Math.cos(a) * r, bz + Math.sin(a) * r) + 1.5 + Math.random() * 1.5, bz + Math.sin(a) * r];
  }
  const g = e.goal || [e.x, e.y, e.z], dx = g[0] - e.x, dy = g[1] - e.y, dz = g[2] - e.z, d = Math.hypot(dx, dy, dz) || 1, sp = near ? 3 : 1.2, k = Math.min(1, dt * 2);
  e.vx += (dx / d * Math.min(sp, d) - e.vx) * k; e.vy += (dy / d * Math.min(sp, d) - e.vy) * k + Math.sin(e.age * 3) * 0.02; e.vz += (dz / d * Math.min(sp, d) - e.vz) * k;
  e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
  e.walk += dt; e.bodyYaw = e.headYaw = e.age;
  wispGlow(e, dt);
}
function wispGlow(e, dt) {
  if (Math.random() < dt * 10 && PARTICLES.length < 1500) PARTICLES.push({ x: e.x + randRange(-0.15, 0.15), y: e.y + 0.15, z: e.z + randRange(-0.15, 0.15), vx: 0, vy: 0.2, vz: 0, life: 0.7, tile: TILE.spark_yellow, u: 0, v: 0, us: 16, size: 0.035, grav: 0, bright: 1 });
}

/* the world's picture on its card: pines, the water tower and the lake at sunset */
function drawFallsThumb(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#3a5a9a'); g.addColorStop(0.55, '#e8906a'); g.addColorStop(1, '#f8d090');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a4a6a'; ctx.fillRect(0, 54, W, 16);   // the lake
  ctx.fillStyle = '#e0e0e0'; ctx.fillRect(104, 18, 18, 10); ctx.fillStyle = '#5a6a7a'; ctx.beginPath(); ctx.moveTo(102, 18); ctx.lineTo(113, 10); ctx.lineTo(124, 18); ctx.fill();   // the water tower
  ctx.fillStyle = '#5a3a1a'; for (const x of [106, 119]) ctx.fillRect(x, 28, 2, 26);
  ctx.fillStyle = '#6a4a2a'; ctx.fillRect(40, 38, 34, 16); ctx.fillStyle = '#4a2e14'; ctx.beginPath(); ctx.moveTo(36, 38); ctx.lineTo(57, 26); ctx.lineTo(78, 38); ctx.fill();   // the Shack
  ctx.fillStyle = '#f0e0b0'; ctx.fillRect(44, 22, 26, 6); ctx.fillStyle = '#3a2a1a'; for (let x = 46; x < 68; x += 3) ctx.fillRect(x, 24, 2, 2);   // its sign
  const pine = (x, y, s) => { ctx.fillStyle = '#1e3a24'; for (let k = 0; k < 4; k++) { const w = (4 - k) * s; ctx.fillRect(x - w, y - (k + 1) * s * 2.2, w * 2, s * 2.4); } ctx.fillStyle = '#4a2e14'; ctx.fillRect(x - 1, y - 2, 2, 4); };
  for (const [x, s] of [[6, 2.4], [18, 3], [30, 2.2], [86, 2.6], [96, 2], [134, 3], [148, 2.4], [156, 2.8]]) pine(x, 54, s);
}
