export default async function (E, shot, sleep, page, waitFor) {
  const log = (...a) => console.log('  ', ...a);
  await E(() => game.startWorld('valley', 'survival', true));
  await waitFor(() => game.state === 'playing', 90000, 'playing');
  await sleep(800);
  // platform high in the sky, player at its centre looking -Z
  const P = await E(() => {
    const pl = game.player, w = game.world;
    const bx = Math.floor(pl.x), bz = Math.floor(pl.z), by = 112;
    for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) w.setBlock(bx + x, by, bz + z, B.STONE, 0);
    Object.assign(pl, { x: bx + 0.5, y: by + 1, z: bz + 0.5, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, flying: false });
    w.setBlock(bx, by + 1, bz - 2, B.DIRT, 0);
    el('click-hint').hidden = true;
    return { bx, by, bz };
  });
  await sleep(600);
  // 1. mine dirt by hand (0.75 s)
  await E(P => { const pl = game.player; pl.pitch = -0.32; }, P);
  await sleep(300);
  log('target before mining:', JSON.stringify(await E(() => game.player.target && { id: game.player.target.id, x: game.player.target.x, y: game.player.target.y, z: game.player.target.z, face: game.player.target.face })));
  await E(() => { game.input.mine = true; game.input.minePressed = true; });
  await sleep(1600);
  await E(() => { game.input.mine = false; });
  await E(P => { const pl = game.player; pl.z -= 1.2; }, P);
  await sleep(1500);
  const r1 = await E(P => ({ block: game.world.getBlock(P.bx, P.by + 1, P.bz - 2), inv: game.player.inv.filter(Boolean).map(s => itemName(s.id) + ' x' + s.count) }), P);
  log('1. mine dirt ->', r1.block === 0 ? 'PASS (air)' : 'FAIL block=' + r1.block, '| inventory:', r1.inv.join(', '));
  // 2. place a block where we look (floor two ahead)
  await E(() => { const pl = game.player; pl.inv[0] = { id: B.COBBLE, count: 5 }; pl.sel = 0; ui.dirty = true; pl.pitch = -0.6; });
  await sleep(300);
  const tgt = await E(() => game.player.target && { x: game.player.target.x, y: game.player.target.y, z: game.player.target.z, face: game.player.target.face });
  await E(() => { game.input.use = true; game.input.usePressed = true; });
  await sleep(450);   // long enough to span a frame even with slow software rendering
  await E(() => { game.input.use = false; });
  await sleep(200);
  const r2 = await E(t => ({ ok: game.world.getBlock(t.x + DX[t.face], t.y + DY[t.face], t.z + DZ[t.face]) === B.COBBLE, count: game.player.inv[0] && game.player.inv[0].count }), tgt);
  log('2. place cobble ->', r2.ok ? 'PASS' : 'FAIL', '| cobble left', r2.count);
  // 3. crafting logs -> planks -> crafting table
  const r3 = await E(() => {
    const pl = game.player; pl.inv[5] = { id: B.OAK_LOG, count: 2 }; openInv('inv');
    const find = (arr, i) => ui.inv.els.find(s => s._ref.arr === arr && s._ref.i === i)._ref;
    clickSlot(find(pl.inv, 5), 0, false);
    clickSlot(find(ui.inv.grid, 0), 0, false);
    const out1 = ui.inv.out && itemName(ui.inv.out.out) + ' x' + ui.inv.out.count;
    clickSlot({ kind: 'out' }, 0, true);
    const planks = pl.inv.filter(s => s && s.id === B.OAK_PLANKS).reduce((a, s) => a + s.count, 0);
    fillRecipe(RECIPES.find(r => r.out === B.CRAFTING_TABLE));
    const out2 = ui.inv.out && itemName(ui.inv.out.out);
    game.closeUI();
    return { out1, planks, out2 };
  });
  log('3. crafting ->', r3.out1 === 'Oak Planks x4' && r3.planks === 8 && r3.out2 === 'Crafting Table' ? 'PASS' : 'FAIL', JSON.stringify(r3));
  // 4. water flow
  await E(P => { game.world.setBlock(P.bx + 5, P.by + 1, P.bz + 5, B.WATER, 0); window.__c0 = game.world.clock; }, P);
  await waitFor(() => game.world.clock - window.__c0 > 2.4, 20000, 'water to flow');   // game time, not wall time
  const r4 = await E(P => { let n = 0; for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) if (game.world.getBlock(P.bx + x, P.by + 1, P.bz + z) === B.WATER) n++; let down = 0; for (let y = P.by; y > P.by - 20; y--) if (game.world.getBlock(P.bx + 8 + 1, y, P.bz + 5) === B.WATER) down++; return { n, down }; }, P);
  log('4. water spread ->', r4.n > 20 ? 'PASS' : 'FAIL', JSON.stringify(r4));
  // 5. torch lighting inside a sealed stone box below the platform
  const r5 = await E(P => {
    const w = game.world, x0 = P.bx - 6, y0 = P.by - 12, z0 = P.bz - 6;
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) for (let z = 0; z < 5; z++) w.setBlock(x0 + x, y0 + y, z0 + z, (x % 4 && y % 4 && z % 4) ? B.AIR : B.STONE, 0);
    const before = w.getLight(x0 + 2, y0 + 2, z0 + 3);
    w.setBlock(x0 + 2, y0 + 1, z0 + 2, B.TORCH, 0);
    const after = w.getLight(x0 + 2, y0 + 2, z0 + 3);
    w.setBlock(x0 + 2, y0 + 1, z0 + 2, B.AIR, 0);
    const gone = w.getLight(x0 + 2, y0 + 2, z0 + 3);
    return { before: [before >> 4, before & 15], after: [after >> 4, after & 15], gone: [gone >> 4, gone & 15] };
  }, P);
  log('5. torch light ->', r5.after[1] === 12 && r5.gone[1] === 0 && r5.before[0] === 0 ? 'PASS' : 'CHECK', JSON.stringify(r5));
  // 6. skylight under an overhang updates when a roof block is placed and removed
  const r6 = await E(P => {
    const w = game.world, x = P.bx + 3, z = P.bz - 5, y = P.by + 1;
    const a = w.getLight(x, y, z) >> 4; w.setBlock(x, y + 2, z, B.STONE, 0); const b = w.getLight(x, y, z) >> 4; w.setBlock(x, y + 2, z, B.AIR, 0); const c = w.getLight(x, y, z) >> 4;
    return { open: a, roofed: b, reopened: c };
  }, P);
  log('6. sky light ->', r6.open === 15 && r6.roofed === 14 && r6.reopened === 15 ? 'PASS' : 'CHECK', JSON.stringify(r6));
  // 7. TNT
  const r7 = await E(P => { const w = game.world;
    for (let x = -9; x <= 9; x++) for (let z = -9; z <= 9; z++) for (let y = P.by - 20; y <= P.by + 2; y++) if (LIQUID[w.getBlock(P.bx + x, y, P.bz + z)]) w.setBlock(P.bx + x, y, P.bz + z, B.AIR, 0);   // water from test 4 would fill the blast holes
    w.setBlock(P.bx - 5, P.by + 1, P.bz - 5, B.TNT, 0); w.setBlock(P.bx - 5, P.by + 1, P.bz - 5, B.AIR, 0); primeTNT(game, P.bx - 5, P.by + 1, P.bz - 5, 1); return true; }, P);
  await waitFor(() => !game.entities.some(e => e.type === 'tnt'), 20000, 'TNT to explode'); await sleep(300);   // game time runs slower than real time when frames are slow
  const r7b = await E(P => { let holes = 0; for (let x = -9; x <= -1; x++) for (let z = -9; z <= -1; z++) if (game.world.getBlock(P.bx + x, P.by, P.bz + z) === 0) holes++; return { holes, hp: game.player.health }; }, P);
  log('7. TNT ->', r7b.holes > 5 ? 'PASS' : 'FAIL', JSON.stringify(r7b));
  await shot('mech-after');
  // 8. save + reload + continue
  const mark = await E(P => { game.world.setBlock(P.bx + 7, P.by + 1, P.bz + 7, B.GOLD_BLOCK, 0); game.save(); return (store.get(saveKey('valley')) || '').length; }, P);
  log('8. saved bytes', mark);
  await page.reload();
  await sleep(2500);
  await E(() => game.startWorld('valley', null, false));
  await waitFor(() => game.state === 'playing', 90000, 'reload playing');
  const r8 = await E(P => ({ gold: game.world.getBlock(P.bx + 7, P.by + 1, P.bz + 7) === B.GOLD_BLOCK, planks: game.player.inv.filter(s => s && s.id === B.OAK_PLANKS).reduce((a, s) => a + s.count, 0), pos: [game.player.x, game.player.y, game.player.z].map(v => Math.round(v)) }), P);
  log('8. reload ->', r8.gold ? 'PASS' : 'FAIL', JSON.stringify(r8));
}
