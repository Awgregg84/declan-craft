/* ===================== Dungeons ===================== */
// Deep under Sunny Valley there are dungeons (the world's generator builds them, see 02b-gen3.js). Look for a little
// old stone tower: the stairs inside wind down to a Monster Room, a Maze, a Treasure Vault or a Lava Temple. A monster
// spawner makes zombies (in a Lava Temple, magma cubes) while someone is near it, unless it's Peaceful: break it with
// a pickaxe to stop it. The chests are full of treasure, the best in the Treasure Vault.

/* a chest that has never been opened is filled when it first is: a village's, or a dungeon's (tier 1-3: better and better) */
function fillChestLoot(t, tier) { if (tier) fillDungeonChest(t, tier); else fillVillageChest(t); }
function fillDungeonChest(t, tier) {
  const put = (id, n, ex) => { if (n <= 0) return; const free = []; for (let i = 0; i < t.slots.length; i++) if (!t.slots[i]) free.push(i); if (!free.length) return; t.slots[free[randInt(0, free.length - 1)]] = Object.assign({ id, count: n }, ex || {}); };
  const chance = p => Math.random() < p;
  put(I.BREAD, randInt(1, 3)); put(I.IRON_INGOT, randInt(1, 4)); put(I.COAL, randInt(2, 8));
  if (tier === 1) {
    put(I.GOLD_INGOT, randInt(0, 3)); put(I.ARROW, randInt(0, 8)); put(I.GUNPOWDER, randInt(0, 3)); put(I.STRING, randInt(0, 3)); put(I.APPLE, randInt(0, 2));
    if (chance(0.3)) put(I.DIAMOND, 1);
    if (chance(0.4)) put(I.XP_BOTTLE, randInt(1, 2));
    if (chance(0.25)) put(I.WRITTEN_BOOK, 1, { tag: randomStoryBook() });
  } else if (tier === 2) {
    put(I.GOLD_INGOT, randInt(2, 6)); put(I.DIAMOND, randInt(1, 3)); put(I.EMERALD, randInt(1, 4)); put(I.ENDER_PEARL, randInt(0, 2)); put(I.XP_BOTTLE, randInt(1, 3));
    put(toolId(2, chance(0.5) ? 0 : 3), 1);   // an iron pickaxe or sword
  } else {
    put(I.DIAMOND, randInt(3, 6)); put(I.EMERALD, randInt(3, 8)); put(I.GOLD_INGOT, randInt(4, 10)); put(B.GOLD_BLOCK, randInt(0, 2)); put(I.XP_BOTTLE, randInt(2, 5));
    put(toolId(3, chance(0.5) ? 0 : 3), 1);   // a diamond pickaxe or sword
    if (chance(0.5)) put(B.DIAMOND_BLOCK, 1);
  }
}

/* ---- monster spawners: on the host (or playing alone), once a second (from spawnTick) ---- */
const SPAWNER_MOBS = ['zombie', 'magma'];
const SPAWNERS = { wait: new Map() };
function fireParticles(x, y, z, n) {
  for (let i = 0; i < n && PARTICLES.length < 1500; i++) PARTICLES.push({ x: x + randRange(-0.3, 0.3), y: y + randRange(-0.2, 0.3), z: z + randRange(-0.3, 0.3), vx: randRange(-0.3, 0.3), vy: randRange(0.4, 1.2), vz: randRange(-0.3, 0.3), life: randRange(0.25, 0.6), tile: TILE.flame, u: 0, v: 0, us: 16, size: randRange(0.08, 0.16), grav: -0.5, bright: 1 });
}
function spawnerTick(game) {
  if (MP.role === 'guest' || difficulty() === 0) return;
  const w = game.world, players = allPlayers(game).filter(p => p.alive);
  if (!players.length) return;
  const seen = new Set();
  for (const p of players) {
    const pcx = Math.floor(p.x) >> 4, pcz = Math.floor(p.z) >> 4;
    for (let cx = pcx - 1; cx <= pcx + 1; cx++) for (let cz = pcz - 1; cz <= pcz + 1; cz++) {
      const c = w.getChunk(cx, cz);
      if (!c || !c.specials || !c.specials.size || seen.has(c)) continue;
      seen.add(c);
      for (const i of c.specials) if (c.blocks[i] === B.SPAWNER) spawnerRun(game, cx * 16 + (i & 15), i >> 8, cz * 16 + ((i >> 4) & 15), c.data[i], players);
    }
  }
}
function spawnerRun(game, x, y, z, data, players) {
  const k = posKey(x, y, z), cx = x + 0.5, cz = z + 0.5;
  if (!players.some(p => Math.abs(p.x - cx) < 16 && Math.abs(p.y - y) < 10 && Math.abs(p.z - cz) < 16)) { SPAWNERS.wait.delete(k); return; }   // (only while someone is near)
  let t = SPAWNERS.wait.get(k);
  if (t === undefined) t = randInt(2, 5);
  if (--t > 0) { SPAWNERS.wait.set(k, t); return; }
  const easy = difficulty() === 1;
  SPAWNERS.wait.set(k, easy ? randInt(12, 20) : randInt(8, 15));
  const type = SPAWNER_MOBS[data] || 'zombie', def = MOB_DEFS[type];
  let near = 0;
  for (const e of game.entities) if (e.mob && !e.dead && e.type === type && Math.abs(e.x - cx) < 9 && Math.abs(e.z - cz) < 9 && Math.abs(e.y - y) < 5) near++;
  if (near >= 4) return;
  const w = game.world;
  for (let n = easy ? 1 : randInt(1, 2), tries = 0; n > 0 && tries < 12; tries++) {
    const sx = Math.floor(cx + randRange(-3.5, 3.5)) + 0.5, sz = Math.floor(cz + randRange(-3.5, 3.5)) + 0.5;
    for (const sy of [y, y + 1, y - 1]) {
      const below = w.getBlock(Math.floor(sx), sy - 1, Math.floor(sz));
      if (!SOLID[below] || !boxFree(w, sx, sy, sz, def.w, def.h)) continue;
      const m = spawnMob(game, type, sx, sy, sz);
      if (m) m.fromSpawner = true;
      fireParticles(sx, sy + 0.4, sz, 6);
      smokeParticles(cx, y + 0.5, cz, 4, 0.4, true);
      n--;
      break;
    }
  }
}
/* the little monster turning round and round inside the cage */
const _sp = M4.create();
SPECIAL_DRAW[B.SPAWNER] = (w, x, y, z, data, s, t, cam) => {
  const type = SPAWNER_MOBS[data] || 'zombie', model = MODELS[MOB_DEFS[type].model];
  if (!model) return;
  const d2 = (x + 0.5 - cam.x) ** 2 + (y + 0.5 - cam.y) ** 2 + (z + 0.5 - cam.z) ** 2;
  if (d2 > 24 * 24) return;
  entityBegin(texSkins);
  gl.uniform1f(PROG.entity.u.uBright, brightAt(w, x + 0.5, y + 0.5, z + 0.5, s));
  M4.identity(_sp);
  M4.translate(_sp, _sp, x + 0.5 - cam.x, y + 0.12 + Math.sin(t * 2) * 0.04 - cam.y, z + 0.5 - cam.z);
  M4.rotY(_sp, _sp, t * 2.2);
  const sc = model.scale * (type === 'magma' ? 0.75 : 0.36);
  M4.scale(_sp, _sp, sc, sc, sc);
  gl.enable(gl.CULL_FACE);
  drawModel(model, _sp, null);
  if (!CAMS.pass && Math.random() < 0.08 && PARTICLES.length < 1400) fireParticles(x + 0.5, y + 0.3, z + 0.5, 1);
};

/* ---- finding one: a word in the chat the first time you get down into each ---- */
const DUNGEON_SAY = {
  monster: 'You found a Monster Room! Break the spawner with a pickaxe to stop the zombies coming.',
  maze: 'You found a Maze! The treasure is in the middle. Torches help you find your way back.',
  vault: 'You found a Treasure Vault! Get past the guard to the treasure behind the bars.',
  temple: 'You found a Lava Temple! Cross the bridge to the treasure, and don\'t fall in the lava.',
};
function dungeonTick(game) {
  if (game.dim !== 'over' || game.mapId !== 'valley' || !game.player.alive) return;
  const pl = game.player, d = game.gen.dungeonHere(game.mapId, game.seed, Math.floor(pl.x), Math.floor(pl.y), Math.floor(pl.z), game.world.villageBlock);
  if (!d) return;
  const found = game.stats.dungeons || (game.stats.dungeons = []);
  if (found.includes(d.id)) return;
  found.push(d.id);
  if (found.length > 200) found.shift();
  chat(DUNGEON_SAY[d.kind] || 'You found a dungeon!', '#ffb84a');
  sfx('levelUp');
  if (game.net) MP.system(playerName() + ' found a ' + d.name + '!');
}
