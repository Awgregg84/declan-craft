export default async function (E, shot, sleep, page, waitFor) {
  const log = (...a) => console.log('  ', ...a);
  await E(() => game.startWorld('valley', 'survival', true));
  await waitFor(() => game.state === 'playing', 90000, 'playing');
  await sleep(800);
  const P = await E(() => {
    const pl = game.player, w = game.world, bx = Math.floor(pl.x), bz = Math.floor(pl.z), by = 112;
    for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) w.setBlock(bx + x, by, bz + z, B.STONE, 0);
    Object.assign(pl, { x: bx + 0.5, y: by + 1, z: bz + 0.5, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0 });
    game.settings.difficulty = 2;
    return { bx, by, bz };
  });
  await sleep(400);
  // keyboard: walk forward 1 s, jump
  const z0 = await E(() => game.player.z);
  await page.mouse.click(640, 360);
  await sleep(300);
  const lockInfo = await E(() => ({ locked: game.locked, drag: game.dragLook, paused: game.paused }));
  if (lockInfo.paused) await E(() => game.resume());
  // speed while W is held, after speeding up, per game second (game time runs slower than real time when frames are slow)
  await page.keyboard.down('KeyW'); await sleep(600);
  const a = await E(() => [game.player.z, game.world.clock]);
  await sleep(1200);
  const b = await E(() => [game.player.z, game.world.clock]);
  await page.keyboard.up('KeyW');
  const z1 = b[0], gt = b[1] - a[1], v = (a[0] - b[0]) / gt;
  log('keyboard walk -> moved', (z0 - z1).toFixed(2), 'blocks, steady speed', v.toFixed(2), 'blocks per game s', v > 3.3 ? 'PASS' : 'FAIL', JSON.stringify(lockInfo));
  await page.keyboard.press('Digit3'); await sleep(100);
  log('hotbar key ->', (await E(() => game.player.sel)) === 2 ? 'PASS' : 'FAIL');
  await page.keyboard.press('KeyE'); await sleep(300);
  const invOpen = await E(() => !!ui.inv);
  await page.keyboard.press('KeyE'); await sleep(300);
  log('E toggles inventory ->', invOpen && !(await E(() => !!ui.inv)) ? 'PASS' : 'FAIL');
  // commands
  const cmds = await E(() => { game.runCommand('/give diamond 5'); game.runCommand('/time set night'); game.runCommand('/summon pig'); const pl = game.player; return { dia: pl.inv.filter(s => s && s.id === I.DIAMOND).reduce((a, s) => a + s.count, 0), time: game.world.time, pigs: game.entities.filter(e => e.type === 'pig').length }; });
  log('commands ->', cmds.dia === 5 && cmds.time > 0.5 && cmds.pigs >= 1 ? 'PASS' : 'FAIL', JSON.stringify(cmds));
  // furnace smelting over time
  await E(P => { const w = game.world; w.setBlock(P.bx + 3, P.by + 1, P.bz, B.FURNACE, 0); const t = w.getTile(P.bx + 3, P.by + 1, P.bz, 'furnace'); t.slots[0] = { id: B.IRON_ORE, count: 2 }; t.slots[1] = { id: I.COAL, count: 1 }; }, P);
  await sleep(4500);
  const fur = await E(P => { const w = game.world, t = w.getTile(P.bx + 3, P.by + 1, P.bz); return { block: w.getBlock(P.bx + 3, P.by + 1, P.bz) === B.FURNACE_LIT, out: t.slots[2], cook: +t.cook.toFixed(2), burn: +t.burn.toFixed(1) }; }, P);
  log('furnace (after 4.5s, needs 5s per item) ->', fur.block ? 'lit PASS' : 'FAIL', JSON.stringify(fur));
  // falling sand
  await E(P => { const w = game.world; w.setBlock(P.bx - 3, P.by + 6, P.bz, B.SAND, 0); }, P);
  await sleep(2500);
  const sand = await E(P => ({ landed: game.world.getBlock(P.bx - 3, P.by + 1, P.bz) === B.SAND, hover: game.world.getBlock(P.bx - 3, P.by + 6, P.bz) }), P);
  log('falling sand ->', sand.landed ? 'PASS' : 'FAIL', JSON.stringify(sand));
  // sapling grows into a tree via growTree
  const tree = await E(P => { const w = game.world; w.setBlock(P.bx - 6, P.by, P.bz - 6, B.GRASS, 0); const ok = w.growTree(P.bx - 6, P.by + 1, P.bz - 6, 0); return { ok, log: w.getBlock(P.bx - 6, P.by + 2, P.bz - 6) === B.OAK_LOG }; }, P);
  log('tree growth ->', tree.ok && tree.log ? 'PASS' : 'FAIL');
  // zombie attack -> death -> respawn
  await E(P => { const pl = game.player; pl.health = 5; game.world.time = 0.75; const z = spawnMob(game, 'zombie', pl.x, pl.y, pl.z - 2); z.burnT = -1e9; }, P);
  await waitFor(() => game.state === 'dead', 15000, 'death');
  const dead = await E(() => ({ state: game.state, msg: el('death-msg').textContent, screen: ui.screen }));
  log('zombie kills player ->', dead.state === 'dead' ? 'PASS' : 'FAIL', JSON.stringify(dead));
  await shot('flow-death');
  await page.click('#btn-respawn'); await sleep(500);
  const resp = await E(() => ({ state: game.state, hp: game.player.health, alive: game.player.alive }));
  log('respawn ->', resp.state === 'playing' && resp.alive && resp.hp === 20 ? 'PASS' : 'FAIL', JSON.stringify(resp));
  // creeper explosion
  await E(P => { for (const e of game.entities) if (e.mob) e.removed = true; const pl = game.player; Object.assign(pl, { x: P.bx + 0.5, y: P.by + 1, z: P.bz + 0.5 }); pl.invuln = 0; const c = spawnMob(game, 'creeper', pl.x + 2, pl.y, pl.z); c.burnT = -1e9; window.__creeper = c; }, P);
  await sleep(3500);
  const boom = await E(P => { let holes = 0; for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) if (game.world.getBlock(P.bx + x, P.by, P.bz + z) === 0) holes++; return { holes, hp: game.player.health, creepers: game.entities.includes(window.__creeper) ? 1 : 0 }; }, P);
  log('creeper explodes ->', boom.holes > 0 && boom.creepers === 0 ? 'PASS' : 'FAIL', JSON.stringify(boom));
  // bed sleep at night skips to morning
  await E(P => { const w = game.world, pl = game.player; if (game.state !== 'playing') game.respawn(); for (const e of game.entities) if (e.mob) e.removed = true; w.setBlock(P.bx + 5, P.by + 1, P.bz + 5, B.STONE, 0); w.setBlock(P.bx + 5, P.by + 2, P.bz + 5, B.BED, 0); w.time = 0.7; game.trySleep(P.bx + 5, P.by + 2, P.bz + 5); }, P);
  await waitFor(() => game.day >= 2 || game.sleeping <= 0, 20000, 'sleep to finish'); await sleep(200);
  const bed = await E(() => ({ time: +game.world.time.toFixed(3), day: game.day, spawn: game.player.spawn }));
  log('sleep ->', bed.time < 0.2 && bed.day >= 2 ? 'PASS' : 'FAIL', JSON.stringify(bed));
}
