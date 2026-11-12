/* ===================== Other planets by rocket (the sixth wish list) ===================== */
// Blasting off from home, you pick where to go: the Moon, Mars, Jupiter or Uranus. From any of them the rocket flies
// you home again. Each planet is its own place, made from the world's seed like the Moon: Mars has red dust, rocks,
// canyons, a dusty orange sky and little rovers to find; Jupiter is a gas giant with nothing to stand on, so you land
// on floating islands of cloud under a stripy orange sky with its great red storm (fall off, and a big gust blows you
// back up); Uranus is icy blue-green, very cold, with ice crystals and faint rings across the sky. There is no air on
// any of them: a space helmet, as on the Moon. Everyone playing together comes along.
const SPACE_DIMS = ['moon', 'mars', 'jupiter', 'uranus'];   // (new places go on the end)
const isSpace = d => SPACE_DIMS.includes(d);
const PLANETS = {
  moon: { name: 'the Moon', title: 'The Moon', g: MOON_G, about: 'Grey dust, craters and cheese', color: '#b8b8c0',
    welcome: 'Welcome to the Moon! There is no air here, so keep your space helmet on. Jump: you can go really high!' },
  mars: { name: 'Mars', title: 'Mars', g: 0.38, about: 'Red dust, rocks, canyons and a rover', color: '#d0603a',
    welcome: 'Welcome to Mars, the red planet! Keep your space helmet on. Jump: you can go high! Somewhere near here is a little rover to find.' },
  jupiter: { name: 'Jupiter', title: 'Jupiter', g: 1.2, about: 'Floating cloud islands in a stormy sky', color: '#e0a060',
    welcome: "Welcome to Jupiter! Nobody can stand on a gas giant, so you are on a floating island of cloud. Look out for the Great Red Storm! (Fall off, and the wind blows you back.)" },
  uranus: { name: 'Uranus', title: 'Uranus', g: 0.9, about: 'Icy, blue-green and very cold, with rings', color: '#7ad8d8',
    welcome: 'Welcome to Uranus! Brrr, it is VERY cold. Everything is ice. Look up to see its rings!' },
};
const gravOf = map => map === 'marsworld' ? PLANETS.mars.g : PLANETS[map] ? PLANETS[map].g : 1;   // (the Mars world pulls like Mars)
const placeName = d => PLANETS[d] ? PLANETS[d].name : d === 'nether' ? 'the Nether' : MAPS[game.mapId] ? MAPS[game.mapId].name : 'home';
defBlock(B.MARS_DUST, 'Mars Dust', { tex: 'mars_dust', hardness: 0.5, tool: 'shovel', sound: 'sand' });
defBlock(B.MARS_ROCK, 'Mars Rock', { tex: 'mars_rock', hardness: 1.5, tool: 'pickaxe', tier: 1 });
defBlock(B.CLOUD, 'Jupiter Cloud', { tex: 'cloud', hardness: 0.3, sound: 'wool' });
defBlock(B.URANUS_ICE, 'Uranus Ice', { tex: 'uranus_ice', hardness: 0.6, tool: 'pickaxe', sound: 'glass' });
// the Mars world's race tracks, its vehicles and a present from a Martian (see 12m-mars.js)
defBlock(B.TRACK, 'Race Track', { tex: 'track', hardness: 1.5, tool: 'pickaxe', tier: 1 });
defBlock(B.BOOST, 'Boost Pad', { tex: { top: 'boost', bottom: 'track', side: 'track' }, hardness: 1.5, tool: 'pickaxe', tier: 1, emit: 10 });
defItem(I.MARS_CRYSTAL, 'Mars Crystal', { tex: 'mars_crystal' });
defItem(I.BUGGY, 'Rover Buggy', { tex: 'buggy', stack: 1 });
defItem(I.SAUCER, 'Flying Saucer', { tex: 'saucer', stack: 1 });

/* ---- where does the rocket go? (picked before the countdown, at home) ---- */
function pickPlanet(game, pl, v, go) {
  const root = el('planet-pick') || document.body.appendChild(h('div', { id: 'planet-pick', class: 'planet-pick', role: 'dialog', 'aria-label': 'Where shall we go?' }));
  root.textContent = '';
  const box = h('div', { class: 'panel' });
  box.appendChild(h('h3', { text: 'Where shall we go?' }));
  const close = () => { root.hidden = true; game.uiOpen = false; if (!game.touchOn && !game.dragLook) game.requestPointer(); };
  for (const d of SPACE_DIMS) {
    if (d === 'mars' && game.mapId === 'marsworld') continue;   // (in the Mars world you are there already)
    const P = PLANETS[d], b = h('button', { type: 'button', class: 'planet-btn', 'data-planet': d });
    b.appendChild(h('span', { class: 'planet-dot', style: 'background:' + P.color }));
    b.appendChild(h('span', { class: 'planet-name', text: P.title }));
    b.appendChild(h('span', { class: 'planet-about', text: P.about }));
    b.addEventListener('click', () => { initAudio(); sfx('click'); close(); go(d); });
    box.appendChild(b);
  }
  const no = h('button', { type: 'button', class: 'planet-cancel', text: 'Not yet' });
  no.addEventListener('click', () => { sfx('click'); close(); });
  box.appendChild(no);
  root.appendChild(box);
  root.hidden = false;
  game.releasePointer();
  game.uiOpen = true;
}

/* ---- arriving, and what happens each moment on a planet ---- */
/* a space helmet for anyone without one, and a hello the first time */
function spaceArrival(game) {
  const pl = game.player, d = game.dim;
  if (!isSpace(d) || !pl.alive) return;
  const key = d === 'moon' ? 'moon' : 'p_' + d;
  if (!game.stats[key]) { game.stats[key] = 1; chat(PLANETS[d].welcome, '#ffd24a'); if (d === 'mars') roverHint(game); }
  spaceHelmet(game);
}
function spaceHelmet(game) {
  const pl = game.player;
  if (game.mode !== 'survival' || !pl.alive) return;
  if (wearsSpaceHelmet(pl) || pl.inv.some(s => s && s.id === I.SPACE_HELMET)) return;
  if (!pl.inv[ARMOR_INV]) pl.inv[ARMOR_INV] = { id: I.SPACE_HELMET, count: 1 };
  else if (pl.give(I.SPACE_HELMET, 1) > 0) dropItem(game, pl.x, pl.y + 1, pl.z, I.SPACE_HELMET, 1);
  else toast('You have a space helmet in your bag. Put it on so you can breathe!', 4);
  ui.dirty = true; ui.armor = -2;
}
const compass = (dx, dz) => (dz < -Math.abs(dx) * 0.4 ? 'north' : dz > Math.abs(dx) * 0.4 ? 'south' : '') + (dx > Math.abs(dz) * 0.4 ? 'east' : dx < -Math.abs(dz) * 0.4 ? 'west' : '');
function roverHint(game) {
  const pl = game.player, v = game.gen.nearestRover(game.seed, pl.x, pl.z);
  if (v) chat('Your helmet radio says: a rover is about ' + Math.round(Math.hypot(v.x - pl.x, v.z - pl.z)) + ' blocks to the ' + (compass(v.x - pl.x, v.z - pl.z) || 'side') + '.', '#9ad8f0');
}
function planetTick(game, dt) {
  const pl = game.player, d = game.dim;
  if (!isSpace(d) || game.state !== 'playing' || !pl.alive) return;
  if (d === 'jupiter' && pl.y < 24 && !pl.riding) {   // fell off a cloud island: a big gust blows you back up
    const s = game.spawnPos();
    Object.assign(pl, { x: s[0], y: s[1] + 4, z: s[2], vx: 0, vy: 0, vz: 0, fallDist: 0 });
    toast('Whoosh! A big gust of wind blows you back onto the island.', 3);
    sfx('rocketRoar', pl.x, pl.y, pl.z, 0.3);
  }
  if (d === 'mars' && !game.stats.rover) {   // found a rover?
    game.roverT = (game.roverT || 0) - dt;
    if (game.roverT <= 0) {
      game.roverT = 0.5;
      const v = game.gen.nearestRover(game.seed, pl.x, pl.z);
      if (v && Math.hypot(v.x - pl.x, v.z - pl.z) < 5) { game.stats.rover = 1; chat('You found a Mars rover! Beep boop. It has been exploring Mars all by itself.', '#ffd24a'); sfx('levelUp'); bigText('Rover found!', 2); }
    }
  }
  if (d === 'uranus') {   // tiny ice crystals drifting in the cold air
    for (let i = 0; i < 2 && PARTICLES.length < 1400; i++) if (Math.random() < dt * 30) PARTICLES.push({ x: pl.x + randRange(-8, 8), y: pl.y + randRange(2, 7), z: pl.z + randRange(-8, 8), vx: randRange(-0.6, 0.6), vy: -randRange(0.4, 1), vz: randRange(-0.6, 0.6), life: 4, tile: TILE.snowflake, u: 0, v: 0, us: 16, size: 0.04, grav: 0, bright: 1 });
  }
}
