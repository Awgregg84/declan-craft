/* ===================== Game ===================== */
const SETTINGS_KEY = 'declancraft:v1:settings';
const DEFAULT_SETTINGS = {
  renderDist: IS_TOUCH ? 4 : 6, fov: 70, sens: 100, volume: 80, music: true, difficulty: 1, keepInv: true,
  autoJump: IS_TOUCH, bobbing: !REDUCED_MOTION, clouds: true, quality: IS_TOUCH ? 0 : 1, touch: 0, animals: true,
};
function loadSettings() { try { return JSON.parse(store.get(SETTINGS_KEY) || '{}') || {}; } catch (e) { return {}; } }
const saveKey = map => 'declancraft:v1:world:' + map;
function loadSaveMeta(map) {
  const s = store.get(saveKey(map));
  if (!s) return null;
  try { const d = JSON.parse(s); return { mode: d.mode, day: d.day, seed: d.seed }; } catch (e) { return null; }
}
const LOAD_TIPS = ['Punch a tree to collect wood.', 'Press E to open your inventory and turn logs into planks.', 'A crafting table lets you make tools.',
  'Torches keep monsters away at night.', 'Sleep in a bed to skip the night.', 'Creepers hiss before they explode. Run!', 'Cook food in a furnace to fill up more hunger.',
  'Sneak to stop yourself falling off edges.', 'In Creative, double-tap jump to fly.', 'Press V to see Declan from behind.', 'Diamonds hide deep underground near lava.'];
const DEATH_MSG = {
  fall: 'Declan fell from a high place', lava: 'Declan tried to swim in lava', drown: 'Declan ran out of air', zombie: 'Declan was caught by a Zombie',
  explosion: 'Declan was blown up', cactus: 'Declan hugged a cactus', starve: 'Declan got too hungry', void: 'Declan fell out of the world',
};

const game = {
  state: 'boot', world: null, player: new Player(), entities: [], mode: 'survival', mapId: null, seed: 0,
  settings: Object.assign({}, DEFAULT_SETTINGS, loadSettings()),
  input: { fwd: false, back: false, left: false, right: false, jump: false, sneak: false, sprint: false, mine: false, use: false, minePressed: false, usePressed: false, useOnce: false, joyX: 0, joyY: 0, joySprint: false, lookX: 0, lookY: 0 },
  view: 0, uiOpen: false, paused: false, pool: null, sky: null, t: 0, lastT: 0, hurtFlash: 0, hurtTilt: 0, shake: 0, stats: {}, day: 1,
  ui, gen: null, locked: false, dragLook: false, hideHud: false, debug: false, saveT: 0, spawnT: 0, debugT: 0, loadT: 0, sleeping: 0,
  lastJumpT: 0, lastFwdT: 0, touchOn: false, fov: 70, warnedSave: false, titleYaw: 0, menuSpawn: [0, 80, 0],

  giveItem(id, n) { return this.player.give(id, n); },
  applySettings() {
    const S = this.settings;
    store.set(SETTINGS_KEY, JSON.stringify(S));
    setVolume(S.volume / 100);
    AUDIO.musicOn = S.music;
    R.scale = S.quality ? 2 : 1;
    this.touchOn = S.touch === 1 || (S.touch === 0 && (IS_TOUCH || this.sawTouch));
    el('touch').hidden = !this.touchOn;
    el('hud').classList.toggle('touch', this.touchOn);
    if (this.touchOn) el('click-hint').hidden = true;
  },
  setMode(m) {
    this.mode = m;
    if (m === 'survival') this.player.flying = false;
    el('btn-mode').textContent = 'Game Mode: ' + (m === 'creative' ? 'Creative' : 'Survival');
    el('tb-fly').hidden = m !== 'creative';
    for (const e of this.entities) if (e.mob && MOB_DEFS[e.type].hostile) e.fuse = 0;
    ui.hearts = ui.food = -2;
  },

  /* ---- pointer lock ---- */
  requestPointer() {
    if (this.touchOn || this.state !== 'playing' || this.uiOpen) return;
    if (!glCanvas.requestPointerLock) { this.useDragLook(); return; }
    try {
      const r = glCanvas.requestPointerLock();
      if (r && r.catch) r.catch(() => this.useDragLook());
    } catch (e) { this.useDragLook(); }
  },
  useDragLook() {
    if (this.dragLook) return;
    this.dragLook = true;
    el('click-hint').hidden = true;
    toast('Drag with the mouse to look around. Click without dragging to break, right-click to place.', 5);
  },
  releasePointer() { if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); },

  /* ---- screens ---- */
  toggleInventory() { if (this.state !== 'playing' || this.paused) return; if (this.uiOpen) this.closeUI(); else openInv('inv'); },
  openScreen(kind, tile) { if (kind === 'craft') openInv('craft'); else openInv(kind, tile); },
  closeUI() {
    if (!this.uiOpen) return;
    closeInv();
    showScreen(null);
    this.releaseKeys();
    if (!this.touchOn && !this.dragLook) { this.requestPointer(); el('click-hint').hidden = !!document.pointerLockElement; }
  },
  pause() {
    if (this.state !== 'playing' || this.paused) return;
    if (this.uiOpen) closeInv();
    this.uiOpen = false;
    this.paused = true;
    this.releaseKeys();
    this.releasePointer();
    el('click-hint').hidden = true;
    const s = this.stats;
    el('pause-stats').textContent = 'Day ' + this.day + ' - blocks mined ' + (s.mined || 0) + ', placed ' + (s.placed || 0) + ', crafted ' + (s.crafted || 0);
    showScreen('scr-pause');
    this.save();
  },
  resume() {
    if (!this.paused) return;
    this.paused = false;
    showScreen(null);
    if (!this.touchOn && !this.dragLook) { this.requestPointer(); el('click-hint').hidden = false; }
  },
  releaseKeys() { const i = this.input; i.fwd = i.back = i.left = i.right = i.jump = i.sneak = i.sprint = i.mine = i.use = false; i.lookX = i.lookY = 0; },
  cycleView() { this.view = (this.view + 1) % 3; toast(['First person', 'Behind Declan', 'Facing Declan'][this.view], 1.2); },
  onJumpPress() {
    const t = nowS();
    if (this.mode === 'creative' && t - this.lastJumpT < 0.3) { this.player.flying = !this.player.flying; this.lastJumpT = 0; }
    else this.lastJumpT = t;
  },

  /* ---- world lifecycle ---- */
  startMenuWorld() {
    if (this.world) this.world.destroy();
    this.pool.cancelAll();
    const seed = hashString('declan-title');
    this.world = new World('valley', seed);
    this.world.time = 0.06;
    this.menuSpawn = this.gen.spawnPoint('valley', seed);
    this.entities = []; PARTICLES.length = 0;
    this.state = 'title';
  },
  startWorld(mapId, mode, fresh) {
    initAudio();
    if (fresh) store.del(saveKey(mapId));
    let data = null;
    const raw = store.get(saveKey(mapId));
    if (raw) { try { data = JSON.parse(raw); } catch (e) { data = null; } }
    if (this.world) this.world.destroy();
    this.pool.cancelAll();
    this.entities = []; PARTICLES.length = 0;
    this.mapId = mapId;
    this.seed = data ? data.seed : ((Math.random() * 2147483647) | 0);
    this.world = new World(mapId, this.seed);
    this.wireWorld();
    const pl = this.player = new Player();
    this.stats = data && data.stats ? data.stats : {};
    this.day = data ? data.day || 1 : 1;
    this.setMode(data ? data.mode : (mode || 'survival'));
    if (data) {
      this.world.load(data.world);
      this.world.time = data.time || 0.02;
      this.world.clock = data.clock || 0;
      const p = data.player;
      Object.assign(pl, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, health: p.health, food: p.food, air: p.air || 10, sel: p.sel || 0, spawn: p.spawn || null, flying: !!p.flying });
      pl.inv = (p.inv || []).slice(0, 36);
      while (pl.inv.length < 36) pl.inv.push(null);
      this.worldSpawn = data.worldSpawn || this.gen.spawnPoint(mapId, this.seed);
      this.fresh = false;
    } else {
      this.worldSpawn = this.gen.spawnPoint(mapId, this.seed);
      [pl.x, pl.y, pl.z] = this.worldSpawn;
      pl.yaw = Math.PI * 0.75;
      this.world.time = 0.02;
      this.fresh = true;
    }
    pl.bodyYaw = pl.yaw;
    this.view = 0; this.paused = false; this.uiOpen = false;
    ui.dirty = true; ui.hearts = ui.food = ui.air = -2;
    this.state = 'loading';
    this.loadT = 0;
    el('load-title').textContent = 'Building ' + MAPS[mapId].name;
    el('load-tip').textContent = 'Tip: ' + LOAD_TIPS[randInt(0, LOAD_TIPS.length - 1)];
    showScreen('scr-loading');
    el('hud').hidden = true;
  },
  wireWorld() {
    const w = this.world;
    w.onBreak = (x, y, z, id) => { if (this.mode === 'survival') for (const [d, n] of blockDrops(id, 0)) dropItem(this, x + 0.5, y + 0.3, z + 0.5, d, n); blockParticles(x, y, z, id, 6, true); };
    w.onFall = (x, y, z, id) => { const e = new Entity('falling', x + 0.5, y, z + 0.5); e.id = id; e.w = 0.49; e.h = 0.98; this.entities.push(e); };
    w.onDrop = (x, y, z, st) => { const e = dropItem(this, x, y, z, st.id, st.count, true); if (e && st.dmg) e.dmg = st.dmg; };
    w.onSound = (n, x, y, z) => sfx(n, x, y, z);
  },
  finishLoading() {
    const pl = this.player, w = this.world;
    if (this.fresh) {
      const x = Math.floor(pl.x), z = Math.floor(pl.z);
      let y = w.topSolid(x, z);
      if (y < 0) y = 80;
      pl.y = y + 1.01;
      this.worldSpawn = [pl.x, pl.y, pl.z];
      let best = -1;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU, dx = -Math.sin(a), dz = -Math.cos(a);
        const hit = raycast(w, pl.x, pl.y + 1.6, pl.z, dx, -0.08, dz, 24);
        const d = hit ? hit.t : 24;
        if (d > best) { best = d; pl.yaw = a; }
      }
      pl.bodyYaw = pl.yaw; pl.pitch = -0.1;
      if (this.mode === 'survival') chat('Welcome to ' + MAPS[this.mapId].name + '! Punch a tree to get started.', '#ffff55');
      else chat('Creative mode: every block is in your inventory (E). Double-tap jump to fly.', '#ffff55');
      this.save();
    }
    this.state = 'playing';
    showScreen(null);
    el('hud').hidden = this.hideHud;
    el('click-hint').hidden = this.touchOn || this.dragLook;
    ui.dirty = true;
  },
  quitToTitle() {
    this.save();
    this.paused = false; this.uiOpen = false;
    this.releasePointer();
    el('hud').hidden = true; el('click-hint').hidden = true;
    this.startMenuWorld();
    el('splash').textContent = SPLASHES[randInt(0, SPLASHES.length - 1)];
    showScreen('scr-title');
  },
  save() {
    if (!this.world || this.state === 'title' || this.state === 'boot' || this.state === 'loading' || !this.mapId) return;
    const pl = this.player;
    const data = {
      v: 1, map: this.mapId, seed: this.seed, mode: this.mode, time: this.world.time, day: this.day, clock: this.world.clock,
      worldSpawn: this.worldSpawn, stats: this.stats,
      player: { x: pl.x, y: pl.y, z: pl.z, yaw: pl.yaw, pitch: pl.pitch, health: pl.alive ? pl.health : 20, food: pl.alive ? pl.food : 20, air: pl.air, inv: pl.inv, sel: pl.sel, spawn: pl.spawn, flying: pl.flying },
      world: this.world.serialize(),
    };
    if (!pl.alive) { const sp = this.spawnPos(); data.player.x = sp[0]; data.player.y = sp[1]; data.player.z = sp[2]; }
    const ok = store.set(saveKey(this.mapId), JSON.stringify(data));
    if (!ok && !this.warnedSave) { this.warnedSave = true; toast("This browser won't let the game save, so your world will reset when you leave.", 6); }
  },
  spawnPos() {
    const pl = this.player;
    if (pl.spawn) return [pl.spawn[0] + 0.5, pl.spawn[1] + 0.6, pl.spawn[2] + 0.5];
    return this.worldSpawn.slice();
  },
  onDeath(cause) {
    this.state = 'dead';
    this.releasePointer();
    el('click-hint').hidden = true;
    if (this.uiOpen) { closeInv(); this.uiOpen = false; }
    const pl = this.player;
    if (!this.settings.keepInv) { for (let i = 0; i < 36; i++) if (pl.inv[i]) { dropItem(this, pl.x, pl.y + 1, pl.z, pl.inv[i].id, pl.inv[i].count, true); pl.inv[i] = null; } ui.dirty = true; }
    el('death-msg').textContent = DEATH_MSG[cause] || 'Declan fainted';
    showScreen('scr-death');
    this.stats.deaths = (this.stats.deaths || 0) + 1;
  },
  respawn() {
    const pl = this.player, w = this.world;
    let [x, y, z] = this.spawnPos();
    if (pl.spawn && w.getBlock(pl.spawn[0], pl.spawn[1], pl.spawn[2]) !== B.BED) { pl.spawn = null; chat('Your bed was missing, so you woke up at the world spawn.'); [x, y, z] = this.worldSpawn; }
    Object.assign(pl, { x, y, z, vx: 0, vy: 0, vz: 0, health: 20, food: 20, air: 10, alive: true, fallDist: 0, invuln: 2 });
    this.state = 'playing';
    showScreen(null);
    el('click-hint').hidden = this.touchOn || this.dragLook;
    if (!this.touchOn && !this.dragLook) this.requestPointer();
    ui.hearts = ui.food = -2;
  },
  trySleep(x, y, z) {
    const pl = this.player, t = this.world.time;
    pl.spawn = [x, y, z];
    const night = t > 0.53 && t < 0.97;
    if (!night) { chat('Respawn point set. You can only sleep at night.'); return; }
    for (const e of this.entities) if (e.mob && MOB_DEFS[e.type].hostile && !e.dead && Math.hypot(e.x - pl.x, e.z - pl.z) < 8) { chat('You may not rest now, there are monsters nearby.'); return; }
    this.sleeping = 2.2;
    el('fx-fade').style.opacity = 1;
    sfx('sleep');
  },

  /* ---- chat commands ---- */
  openChat(prefix) {
    if (this.state !== 'playing' || this.uiOpen || this.paused) return;
    this.chatOpen = true; this.releaseKeys();
    this.releasePointer();
    el('chat-form').hidden = false; el('chat-log').classList.add('open');
    const inp = el('chat-input'); inp.value = prefix || '';
    setTimeout(() => inp.focus(), 0);
  },
  closeChat() {
    this.chatOpen = false;
    el('chat-form').hidden = true; el('chat-log').classList.remove('open');
    el('chat-input').blur();
    if (!this.touchOn && !this.dragLook) { this.requestPointer(); el('click-hint').hidden = !!document.pointerLockElement; }
  },
  findItem(name) {
    const q = name.toLowerCase().replace(/[_\s]/g, '');
    const all = CREATIVE_LIST;
    return all.find(id => itemName(id).toLowerCase().replace(/[\s']/g, '') === q) || all.find(id => itemName(id).toLowerCase().replace(/[\s']/g, '').includes(q)) || 0;
  },
  runCommand(text) {
    const pl = this.player, w = this.world;
    const a = text.slice(1).trim().split(/\s+/), cmd = (a[0] || '').toLowerCase();
    const say = m => chat(m, '#aaaaff');
    const num = (s, base) => s === undefined ? NaN : s.startsWith('~') ? base + (parseFloat(s.slice(1)) || 0) : parseFloat(s);
    switch (cmd) {
      case 'help': say('Commands: /time set day|night, /gamemode survival|creative, /give <item> [count], /tp x y z, /summon <mob>, /spawnpoint, /seed, /difficulty peaceful|easy|normal, /kill, /clear'); break;
      case 'time': {
        const v = (a[2] || a[1] || '').toLowerCase();
        const map = { day: 0.04, morning: 0.02, noon: 0.25, sunset: 0.47, night: 0.56, midnight: 0.75 };
        if (map[v] === undefined) { say('Try /time set day or /time set night'); break; }
        w.time = map[v]; say('Time set to ' + v); break;
      }
      case 'gamemode': case 'gm': {
        const v = (a[1] || '').toLowerCase();
        const m = ['creative', 'c', '1'].includes(v) ? 'creative' : ['survival', 's', '0'].includes(v) ? 'survival' : null;
        if (!m) { say('Try /gamemode creative or /gamemode survival'); break; }
        this.setMode(m); say('Game mode set to ' + m); break;
      }
      case 'give': {
        const cnt = parseInt(a[a.length - 1], 10), hasCnt = a.length > 2 && !isNaN(cnt);
        const id = this.findItem(a.slice(1, hasCnt ? -1 : undefined).join(' '));
        if (!id) { say('No item called ' + a.slice(1).join(' ')); break; }
        const n = clamp(hasCnt ? cnt : 1, 1, 640);
        const left = pl.give(id, n);
        say('Gave ' + (n - left) + ' ' + itemName(id)); break;
      }
      case 'tp': case 'teleport': {
        const x = num(a[1], pl.x), y = num(a[2], pl.y), z = num(a[3], pl.z);
        if ([x, y, z].some(isNaN)) { say('Try /tp 0 100 0 (use ~ for your position)'); break; }
        Object.assign(pl, { x, y: clamp(y, -10, 250), z, vx: 0, vy: 0, vz: 0, fallDist: 0 }); say('Teleported'); break;
      }
      case 'summon': {
        const t = (a[1] || '').toLowerCase();
        if (MOB_DEFS[t]) { const [dx, , dz] = pl.lookDir(); spawnMob(this, t, pl.x + dx * 3, pl.y + 0.5, pl.z + dz * 3); say('Summoned a ' + t); }
        else if (t === 'tnt') { primeTNT(this, Math.floor(pl.x + 2), Math.floor(pl.y + 1), Math.floor(pl.z), 4); }
        else say('You can summon: pig, cow, sheep, chicken, zombie, creeper, tnt');
        break;
      }
      case 'spawnpoint': case 'setspawn': this.worldSpawn = [pl.x, pl.y, pl.z]; pl.spawn = null; say('Spawn point set here'); break;
      case 'seed': say('Seed: ' + this.seed); break;
      case 'kill': pl.invuln = 0; if (this.mode === 'creative') say('You cannot be hurt in Creative'); else pl.damage(1000, 'void'); break;
      case 'clear': pl.inv.fill(null); ui.dirty = true; say('Inventory cleared'); break;
      case 'difficulty': {
        const v = ['peaceful', 'easy', 'normal'].indexOf((a[1] || '').toLowerCase());
        if (v < 0) { say('Try /difficulty peaceful, easy or normal'); break; }
        this.settings.difficulty = v; this.applySettings(); say('Difficulty set to ' + a[1]); break;
      }
      case 'weather': say('The weather is always lovely in Declan-craft.'); break;
      case 'heal': pl.health = 20; pl.food = 20; say('Healed'); break;
      default: say('Unknown command. Type /help');
    }
  },
};

/* ---------- input ---------- */
function setupInput() {
  const inp = game.input, S = game.settings;
  const playing = () => game.state === 'playing' && !game.paused && !game.uiOpen && !game.chatOpen;
  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const c = e.code;
    if (c === 'F5' || c === 'F3' || c === 'F1' || c === 'Space' || c === 'Slash' || c.startsWith('Arrow')) { if (game.state === 'playing') e.preventDefault(); }
    if (game.state === 'playing' && game.uiOpen) {
      if (c === 'KeyE' || c === 'Escape') { e.preventDefault(); game.closeUI(); }
      else if (/^Digit[1-9]$/.test(c) && ui.hoverRef && ui.hoverRef.arr) {
        const n = +c.slice(5) - 1, ref = ui.hoverRef, pl = game.player;
        if (ref.arr !== pl.inv || ref.i !== n) { const tmp = pl.inv[n]; if (!tmp || !ref.accept || ref.accept(tmp.id)) { pl.inv[n] = ref.arr[ref.i]; ref.arr[ref.i] = tmp; updateCraft(); ui.dirty = true; refreshInv(); } }
      }
      return;
    }
    if (game.state === 'playing' && game.paused) { if (c === 'Escape') { e.preventDefault(); game.resume(); } return; }
    if (!playing()) return;
    if (e.repeat && !c.startsWith('Arrow')) { if (c === 'KeyW' || c === 'KeyA' || c === 'KeyS' || c === 'KeyD' || c === 'Space' || c.startsWith('Shift')) return; }
    switch (c) {
      case 'KeyW': { const t = nowS(); if (t - game.lastFwdT < 0.28) inp.sprint = true; game.lastFwdT = t; inp.fwd = true; break; }
      case 'KeyS': inp.back = true; break;
      case 'KeyA': inp.left = true; break;
      case 'KeyD': inp.right = true; break;
      case 'KeyR': inp.sprint = true; break;
      case 'Space': inp.jump = true; game.onJumpPress(); break;
      case 'ShiftLeft': case 'ShiftRight': inp.sneak = true; break;
      case 'KeyE': openInv('inv'); break;
      case 'KeyQ': game.player.dropHeld(e.shiftKey); break;
      case 'KeyV': case 'F5': game.cycleView(); break;
      case 'F3': game.debug = !game.debug; el('debug').hidden = !game.debug; break;
      case 'F1': game.hideHud = !game.hideHud; el('hud').hidden = game.hideHud; break;
      case 'KeyT': e.preventDefault(); game.openChat(''); break;
      case 'Slash': game.openChat('/'); break;
      case 'Escape': game.pause(); break;
      case 'ArrowLeft': inp.lookX = -1; break;
      case 'ArrowRight': inp.lookX = 1; break;
      case 'ArrowUp': inp.lookY = 1; break;
      case 'ArrowDown': inp.lookY = -1; break;
      default:
        if (/^Digit[1-9]$/.test(c)) selectSlot(+c.slice(5) - 1);
    }
  });
  window.addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW': inp.fwd = false; inp.sprint = false; break;
      case 'KeyS': inp.back = false; break;
      case 'KeyA': inp.left = false; break;
      case 'KeyD': inp.right = false; break;
      case 'KeyR': inp.sprint = false; break;
      case 'Space': inp.jump = false; break;
      case 'ShiftLeft': case 'ShiftRight': inp.sneak = false; break;
      case 'ArrowLeft': case 'ArrowRight': inp.lookX = 0; break;
      case 'ArrowUp': case 'ArrowDown': inp.lookY = 0; break;
    }
  });
  window.addEventListener('blur', () => game.releaseKeys());
  document.addEventListener('pointerlockchange', () => {
    game.locked = document.pointerLockElement === glCanvas;
    if (game.locked) { game.lockT = performance.now(); el('click-hint').hidden = true; return; }
    if (game.state === 'playing' && !game.paused && !game.uiOpen && !game.chatOpen && !game.dragLook && !game.touchOn) game.pause();
  });
  document.addEventListener('pointerlockerror', () => game.useDragLook());
  const look = (dx, dy, k) => {
    const pl = game.player, s = (S.sens / 100) * k;
    pl.yaw -= dx * s; pl.pitch = clamp(pl.pitch - dy * s, -1.55, 1.55);
  };
  document.addEventListener('mousemove', e => {
    ui.px = e.clientX; ui.py = e.clientY;
    if (ui.inv) moveCursorEl();
    // browsers can report one huge fake jump right after the mouse is captured
    if (game.locked && playing() && performance.now() - (game.lockT || 0) > 120 && Math.abs(e.movementX) < 500 && Math.abs(e.movementY) < 500) look(e.movementX, e.movementY, 0.0025);
  });
  // mouse on the game canvas
  let drag = null;
  glCanvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    initAudio();
    if (game.state !== 'playing' || game.paused || game.uiOpen || game.chatOpen) return;
    e.preventDefault();
    if (!game.locked && !game.dragLook) { game.requestPointer(); return; }
    if (game.dragLook) { drag = { x: e.clientX, y: e.clientY, moved: false, b: e.button }; try { glCanvas.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
    if (e.button === 0) { if (!game.dragLook) { inp.mine = true; inp.minePressed = true; } else drag.mineTimer = setTimeout(() => { if (drag && !drag.moved) { inp.mine = true; inp.minePressed = true; } }, 170); }
    else if (e.button === 2) { inp.use = true; inp.usePressed = true; }
    else if (e.button === 1) pickBlock();
  });
  glCanvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || !drag || !game.dragLook) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) { if (!inp.mine) drag.moved = true; }
    if (drag.moved && playing()) look(dx, dy, 0.005);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const up = e => {
    if (e.pointerType === 'touch') return;
    if (drag) { clearTimeout(drag.mineTimer); if (drag.b === 0 && !drag.moved && !inp.mine && playing()) { inp.mine = true; inp.minePressed = true; setTimeout(() => { inp.mine = false; }, 60); } drag = null; }
    if (e.button === 0) inp.mine = false;
    if (e.button === 2) inp.use = false;
  };
  window.addEventListener('pointerup', up);
  glCanvas.addEventListener('contextmenu', e => e.preventDefault());
  el('app').addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('wheel', e => {
    if (!playing()) return;
    e.preventDefault();
    const pl = game.player;
    selectSlot((pl.sel + (e.deltaY > 0 ? 1 : 8)) % 9);
  }, { passive: false });
  // touch look, tap to place, press and hold to break
  const touches = new Map();
  glCanvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    e.preventDefault();
    initAudio();
    if (!game.sawTouch) { game.sawTouch = true; game.applySettings(); }
    if (!playing()) return;
    const t = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), moved: false, mining: false };
    t.timer = setTimeout(() => { if (!t.moved) { t.mining = true; inp.mine = true; inp.minePressed = true; } }, 300);
    touches.set(e.pointerId, t);
    try { glCanvas.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
  });
  glCanvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'touch') return;
    const t = touches.get(e.pointerId);
    if (!t) return;
    const dx = e.clientX - t.x, dy = e.clientY - t.y;
    t.x = e.clientX; t.y = e.clientY;
    if (Math.hypot(t.x - t.sx, t.y - t.sy) > 10) t.moved = true;
    if (playing()) look(dx, dy, 0.0055);
  });
  const tend = e => {
    if (e.pointerType !== 'touch') return;
    const t = touches.get(e.pointerId);
    if (!t) return;
    touches.delete(e.pointerId);
    clearTimeout(t.timer);
    if (t.mining) inp.mine = false;
    else if (!t.moved && performance.now() - t.t0 < 300 && playing()) { inp.use = true; inp.usePressed = true; inp.useOnce = true; }
  };
  glCanvas.addEventListener('pointerup', tend); glCanvas.addEventListener('pointercancel', tend);
  // title screen head tracking
  el('app').addEventListener('pointermove', e => { ui.px = e.clientX; ui.py = e.clientY; if (ui.inv) moveCursorEl(); });
  // chat
  el('chat-form').addEventListener('submit', e => {
    e.preventDefault();
    const v = el('chat-input').value.trim();
    game.closeChat();
    if (!v) return;
    if (v.startsWith('/')) game.runCommand(v); else chat('<Declan> ' + v);
  });
  el('chat-input').addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); game.closeChat(); } e.stopPropagation(); });
}
function pickBlock() {
  const pl = game.player, t = pl.target;
  if (!t) return;
  let id = t.id === B.FURNACE_LIT ? B.FURNACE : t.id;
  if (!ICONS[id]) return;
  for (let i = 0; i < 9; i++) if (pl.inv[i] && pl.inv[i].id === id) { selectSlot(i); return; }
  if (game.mode === 'creative') { pl.inv[pl.sel] = { id, count: 64 }; ui.dirty = true; showItemName(itemName(id)); }
}

/* ---------- main loop ---------- */
const TITLE_CAM = { x: 0, y: 90, z: 0, yaw: 0, pitch: -0.18, fov: 70 * Math.PI / 180, roll: 0 };
const GAME_CAM = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, fov: 70 * Math.PI / 180, roll: 0 };
function renderWorld(cam, dt, withEntities) {
  const w = game.world, pl = game.player, S = game.settings;
  R.cam = cam;
  setupCamera(cam);
  const under = withEntities && game.view === 0 ? (pl.headInWater ? 'water' : pl.headInLava ? 'lava' : null) : null;
  const s = skyState(w.time, w.map, under);
  game.sky = s;
  const rd = S.renderDist;
  R.fogColor = s.fog;
  if (under === 'water') { R.fogStart = 0; R.fogEnd = 22; }
  else if (under === 'lava') { R.fogStart = 0; R.fogEnd = 3; }
  else { R.fogEnd = rd * 16 - 6; R.fogStart = R.fogEnd * 0.55; }
  gl.viewport(0, 0, R.width, R.height);
  gl.clearColor(s.fog[0], s.fog[1], s.fog[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (!under) drawSky(s);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CCW);
  collectVisible(w, rd);
  terrainUniforms(s, game.t, 0.5);
  drawTerrainList(R.visO, false);
  if (withEntities) {
    drawEntities(game, s, game.t, cam);
    const tg = pl.target;
    if (tg && pl.alive && !game.uiOpen && game.view !== 2) {
      drawOutline(tg.x, tg.y, tg.z);
      if (pl.mining && pl.mining.p > 0) drawCrack(tg.x, tg.y, tg.z, Math.floor(pl.mining.p * 10));
    }
  }
  gl.disable(gl.CULL_FACE);
  drawParticles(PARTICLES, w, s);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  terrainUniforms(s, game.t, 0.02);
  drawTerrainList(R.visT, true);
  if (S.clouds && !under) {
    if (w.map === 'sky') { drawClouds(s, game.t, 26); drawClouds(s, game.t + 400, 126); }
    else drawClouds(s, game.t, 110);
  }
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  if (withEntities && game.view === 0 && pl.alive && !game.hideHud) drawFirstPerson(pl, s, w);
}
function updateCamera(dt) {
  const pl = game.player, cam = GAME_CAM, S = game.settings;
  const bobOn = S.bobbing && !REDUCED_MOTION && game.view === 0 ? pl.bobAmt : 0;
  let ex = pl.x, ey = pl.y + pl.eye + (bobOn ? -Math.abs(Math.cos(pl.bob)) * 0.06 * bobOn : 0), ez = pl.z;
  let yaw = pl.yaw, pitch = pl.pitch;
  if (game.shake > 0 && !REDUCED_MOTION) { ex += randRange(-1, 1) * game.shake * 0.2; ey += randRange(-1, 1) * game.shake * 0.2; }
  if (game.view > 0) {
    const [dx, dy, dz] = pl.lookDir(), sgn = game.view === 1 ? -1 : 1;
    const hit = raycast(game.world, ex, ey, ez, dx * sgn, dy * sgn, dz * sgn, 4.2);
    const dist = hit ? Math.max(0.5, hit.t - 0.3) : 4;
    ex += dx * sgn * dist; ey += dy * sgn * dist; ez += dz * sgn * dist;
    if (game.view === 2) { yaw += Math.PI; pitch = -pitch; }
  }
  cam.x = ex; cam.y = ey; cam.z = ez; cam.yaw = yaw; cam.pitch = pitch;
  let fov = S.fov;
  if (pl.sprinting) fov *= 1.12;
  if (pl.flying && pl.sprinting) fov *= 1.05;
  game.fov = lerp(game.fov || fov, fov, Math.min(1, dt * 10));
  cam.fov = game.fov * Math.PI / 180;
  cam.roll = game.hurtTilt > 0 && !REDUCED_MOTION ? Math.sin(game.hurtTilt * Math.PI) * 0.1 : 0;
  AUDIO.lx = pl.x; AUDIO.ly = pl.y + pl.eye; AUDIO.lz = pl.z; AUDIO.lyaw = pl.yaw;
}
function debugText() {
  const pl = game.player, w = game.world, x = Math.floor(pl.x), y = Math.floor(pl.y), z = Math.floor(pl.z);
  const L = w.getLight(x, Math.floor(pl.y + 0.5), z);
  const dirs = ['north', 'west', 'south', 'east'];
  const f = dirs[((Math.round(pl.yaw / (Math.PI / 2)) % 4) + 4) % 4];
  const hrs = Math.floor(((w.time * 24) + 6) % 24), mins = Math.floor((((w.time * 24) + 6) % 1) * 60);
  const tg = pl.target;
  return 'Declan-craft  ' + game.fps + ' fps\n' +
    'XYZ: ' + pl.x.toFixed(1) + ' / ' + pl.y.toFixed(1) + ' / ' + pl.z.toFixed(1) + '\n' +
    'Chunk: ' + (x >> 4) + ', ' + (z >> 4) + '   Facing: ' + f + '\n' +
    'Light: sky ' + (L >> 4) + ', block ' + (L & 15) + '\n' +
    'Day ' + game.day + '  ' + String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + '\n' +
    'Chunks: ' + w.chunks.size + '  Mobs: ' + game.entities.filter(e => e.mob).length + '\n' +
    (tg ? 'Looking at: ' + itemName(tg.id) + ' (' + tg.x + ', ' + tg.y + ', ' + tg.z + ')' : 'Looking at: sky');
}
let fpsN = 0, fpsT = 0;
function frame(ts) {
  if (game.glLost) return;
  requestAnimationFrame(frame);
  const t = ts / 1000;
  let dt = game.lastT ? t - game.lastT : 0.016;
  game.lastT = t;
  if (dt > 0.1) dt = 0.1;
  if (dt <= 0) dt = 0.001;
  game.t += dt;
  fpsN++; fpsT += dt;
  if (fpsT >= 0.5) { game.fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
  resizeGL();
  const w = game.world, S = game.settings;
  if (!w) return;
  if (game.state === 'title') {
    const sp = game.menuSpawn;
    w.stream(game.pool, sp[0], sp[2], Math.min(S.renderDist, 6));
    game.pool.pump(8);
    w.meshStep(6, Math.min(S.renderDist, 6));
    game.titleYaw += dt * (REDUCED_MOTION ? 0.004 : 0.03);
    const top = Math.max(w.topSolid(Math.floor(sp[0]), Math.floor(sp[2])), 60);
    Object.assign(TITLE_CAM, { x: sp[0], y: top + 14, z: sp[2], yaw: game.titleYaw, pitch: -0.16, fov: 70 * Math.PI / 180, roll: 0 });
    renderWorld(TITLE_CAM, dt, false);
    const cv = el('title-char');
    if (cv && getComputedStyle(cv).display !== 'none') {
      const r = cv.getBoundingClientRect(), mx = (ui.px - (r.left + r.width / 2)) / window.innerWidth, my = (ui.py - (r.top + r.height * 0.2)) / window.innerHeight;
      const tt = game.t;
      drawPreview(r, { head: [clamp(my, -0.6, 0.6) * 1.2, clamp(mx, -0.8, 0.8) * 1.4, 0], rarm: [Math.sin(tt * 1.3) * 0.08, 0, 0.08], larm: [-Math.sin(tt * 1.3) * 0.08, 0, -0.08] }, 0.35, tt);
    }
    return;
  }
  const pl = game.player;
  if (game.state === 'loading') {
    game.loadT += dt;
    w.stream(game.pool, pl.x, pl.z, S.renderDist);
    game.pool.pump(20);
    w.meshStep(14, S.renderDist);
    const p = w.readyAround(pl.x, pl.z, 2);
    el('load-bar').style.width = Math.round(p * 100) + '%';
    el('load-bar-wrap').setAttribute('aria-valuenow', Math.round(p * 100));
    if (p >= 1 && game.loadT > 0.4) game.finishLoading();
    gl.viewport(0, 0, R.width, R.height); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    return;
  }
  // playing, paused or dead
  const running = !game.paused;
  if (running) {
    const inp = game.input;
    if (inp.lookX || inp.lookY) { pl.yaw -= inp.lookX * dt * 2.2 * S.sens / 100; pl.pitch = clamp(pl.pitch + inp.lookY * dt * 1.8 * S.sens / 100, -1.55, 1.55); }
    if (game.state === 'playing' && pl.alive) {
      const steps = dt > 0.034 ? 2 : 1;
      for (let i = 0; i < steps; i++) pl.update(dt / steps);
    }
    if (inp.useOnce) { inp.useOnce = false; inp.use = false; }
    w.stream(game.pool, pl.x, pl.z, S.renderDist);
    game.pool.pump(6);
    w.tick(dt, pl.x, pl.z);
    updateEntities(game, dt);
    updateParticles(w, dt);
    game.spawnT -= dt;
    if (game.spawnT <= 0) { game.spawnT = 1; spawnTick(game); }
    if (game.sleeping > 0) {
      game.sleeping -= dt;
      if (game.sleeping <= 0.9 && w.time > 0.5) { w.time = 0.01; game.day++; chat('Good morning! Day ' + game.day + '.'); }
      if (game.sleeping <= 0) el('fx-fade').style.opacity = 0;
    } else {
      w.time += dt / DAY_LENGTH;
      if (w.time >= 1) { w.time -= 1; game.day++; }
    }
    if (game.state === 'playing') {
      game.saveT += dt;
      if (game.saveT > 30) { game.saveT = 0; game.save(); }
    }
  }
  w.meshStep(running ? 4 : 8, S.renderDist);
  if (game.hurtFlash > 0) game.hurtFlash = Math.max(0, game.hurtFlash - dt);
  if (game.hurtTilt > 0) game.hurtTilt = Math.max(0, game.hurtTilt - dt * 3);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt);
  updateCamera(dt);
  if (ui.inv && ui.inv.kind === 'inv') {
    const ce = el('inv-char');
    if (ce) {
      const r = ce.getBoundingClientRect(), cw = Math.round(r.width * R.dpr), ch = Math.round(r.height * R.dpr);
      if (ce.width !== cw) ce.width = cw;
      if (ce.height !== ch) ce.height = ch;
      const mx = (ui.px - (r.left + r.width / 2)) / 200, my = (ui.py - (r.top + r.height * 0.25)) / 200;
      drawPreview(r, { head: [clamp(my, -0.6, 0.6), clamp(mx, -0.9, 0.9), 0], rarm: [Math.sin(game.t * 1.3) * 0.06, 0, 0.06], larm: [-Math.sin(game.t * 1.3) * 0.06, 0, -0.06] }, 0.3, game.t, ce);
    }
  }
  renderWorld(GAME_CAM, dt, true);
  if (ui.inv) updateFurnaceUI();
  el('fx-water').hidden = !(pl.headInWater && game.view === 0);
  el('fx-lava').hidden = !(pl.headInLava && game.view === 0);
  el('fx-hurt').style.opacity = clamp(game.hurtFlash * 2, 0, 1);
  el('crosshair').hidden = game.view === 2 || game.uiOpen;
  renderHUD(dt);
  if (game.debug) { game.debugT -= dt; if (game.debugT <= 0) { game.debugT = 0.25; el('debug').textContent = debugText(); } }
}

/* ---------- boot ---------- */
function wireButtons() {
  const click = (id, fn) => el(id).addEventListener('click', () => { initAudio(); sfx('click'); fn(); });
  click('btn-play', () => { buildWorldCards(); showScreen('scr-worlds'); });
  click('btn-worlds-back', () => showScreen('scr-title'));
  click('btn-help', () => { ui.back = 'scr-title'; showScreen('scr-help'); });
  click('btn-settings', () => { ui.back = 'scr-title'; buildSettings(); showScreen('scr-settings'); });
  click('btn-settings-done', () => showScreen(ui.back));
  click('btn-help-done', () => showScreen(ui.back));
  click('btn-resume', () => game.resume());
  click('btn-mode', () => game.setMode(game.mode === 'creative' ? 'survival' : 'creative'));
  click('btn-p-settings', () => { ui.back = 'scr-pause'; buildSettings(); showScreen('scr-settings'); });
  click('btn-p-help', () => { ui.back = 'scr-pause'; showScreen('scr-help'); });
  click('btn-quit', () => game.quitToTitle());
  click('btn-respawn', () => game.respawn());
  click('btn-death-title', () => game.quitToTitle());
  el('click-hint').addEventListener('click', () => { initAudio(); game.requestPointer(); });
  el('scr-inv').addEventListener('pointerdown', e => {
    if (e.target !== el('scr-inv') && e.target !== el('inv-root')) return;
    if (ui.cursor && game.mode === 'survival') { const pl = game.player, st = ui.cursor; dropItem(game, pl.x, pl.y + pl.eye - 0.3, pl.z, st.id, st.count, true); ui.cursor = null; moveCursorEl(); }
    else if (ui.cursor) { ui.cursor = null; moveCursorEl(); }
    else game.closeUI();
  });
}
function boot() {
  uiScale();
  window.addEventListener('resize', uiScale);
  if (!initGL()) { BOOT.ok = true; el('nogl').hidden = false; el('scr-title').hidden = true; return null; }
  buildAllArt();
  buildBlockTiles();
  buildTileTexture(); buildSkinTexture(); buildCloudTexture();
  buildModels(); buildOutline(); initRenderExtras();
  buildIcons(); buildHudIcons();
  const stoneURL = tileCanvas('stone', 32).toDataURL(), dirtURL = tileCanvas('dirt', 32).toDataURL();
  document.documentElement.style.setProperty('--stone-img', 'url(' + stoneURL + ')');
  document.documentElement.style.setProperty('--dirt-img', 'url(' + dirtURL + ')');
  drawLogo();
  el('splash').textContent = SPLASHES[randInt(0, SPLASHES.length - 1)];
  buildHotbar(); buildHelp(); setupTouch(); setupInput(); wireButtons();
  game.gen = genModule(B, genProps());
  game.pool = new GenPool();
  game.applySettings();
  game.startMenuWorld();
  window.addEventListener('visibilitychange', () => { if (document.hidden) { if (game.state === 'playing') game.pause(); game.save(); } });
  window.addEventListener('pagehide', () => game.save());
  glCanvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    game.glLost = true;
    try { game.save(); } catch (x) { /* ignore */ }
    el('gl-lost').hidden = false;
  });
  el('btn-reload').addEventListener('click', () => location.reload());
  el('logo').hidden = false; el('logo-text').hidden = true; el('boot-note').hidden = true; el('title-menu').hidden = false;
  BOOT.ok = true;
  showScreen('scr-title');
  requestAnimationFrame(frame);
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) { try { hot.snapshot(() => { game.save(); return { resume: game.state === 'playing' || game.state === 'dead' ? game.mapId : null }; }); } catch (e) { /* optional */ } }
  return hot;
}
let booted = false;
function start(data) {
  if (booted) return null;
  booted = true;
  let hot = null;
  try { hot = boot(); }
  catch (e) { showBootProblem('Declan-craft could not start on this device.', 'Details: ' + (e && e.message ? e.message : e) + '. Updating the browser usually fixes this. You can also play on a computer.'); return null; }
  if (data && data.resume && MAPS[data.resume] && loadSaveMeta(data.resume)) game.startWorld(data.resume, null, false);
  return hot;
}
(function () {
  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) { try { hot.ready(start); return; } catch (e) { /* fall through */ } }
  start((hot && hot.data) || {});
})();
