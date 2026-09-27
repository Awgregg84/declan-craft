
export default async function (E, shot, sleep) {
  // build a sky platform so every mob is visible
  await E(() => {
    game.setMode('creative');
    const pl = game.player, w = game.world;
    const bx = Math.floor(pl.x), bz = Math.floor(pl.z), by = Math.min(118, Math.floor(pl.y) + 14);
    for (let x = -12; x <= 12; x++) for (let z = -3; z <= 14; z++) w.setBlock(bx + x, by, bz - z, (x + z) % 2 ? B.OAK_PLANKS : B.BIRCH_PLANKS, 0);
    Object.assign(pl, { x: bx + 0.5, y: by + 1, z: bz + 0.5, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: -0.12, flying: false });
    game.testY = by;
    el('click-hint').hidden = true;
  });
  await sleep(1200);
  const items = [['hand', 0], ['block', 'B.GRASS'], ['furnace', 'B.FURNACE']];
  for (const [name, expr] of items) {
    await E(ex => { const pl = game.player; pl.sel = 0; pl.inv[0] = ex === 0 ? null : { id: eval(ex), count: 1 }; pl.equip = 1; ui.dirty = true; }, expr);
    await sleep(600); await shot('hand-' + name);
  }
  await E(() => {
    const pl = game.player, types = ['pig', 'cow', 'sheep', 'chicken', 'zombie', 'creeper'];
    types.forEach((t, i) => { const e = spawnMob(game, t, pl.x + (i - 2.5) * 2.2, game.testY + 1, pl.z - 7); e.yaw = e.bodyYaw = e.headYaw = Math.PI; e.aiT = 999; e.moving = false; e.burnT = -1000; });
    dropItem(game, pl.x - 1, pl.y + 1, pl.z - 3, B.GRASS, 1);
    dropItem(game, pl.x + 1, pl.y + 1, pl.z - 3, toolId(3, 3), 1);
    pl.inv[0] = null; ui.dirty = true;
  });
  await sleep(1800); await shot('mobs');
  await E(() => { game.view = 1; game.player.pitch = -0.3; });
  await sleep(800); await shot('mobs-3p');
  await E(() => { game.view = 0; const pl = game.player; pl.yaw = Math.PI; pl.pitch = -0.2; });
  await sleep(800); await shot('mobs-back');
}
