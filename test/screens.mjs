export default async function (E, shot, sleep, page, waitFor) {
  await E(() => game.startWorld('sky', 'survival', true));
  await waitFor(() => game.state === 'playing', 90000, 'sky playing');
  await sleep(2500);
  await E(() => { el('click-hint').hidden = true; const pl = game.player; pl.pitch = -0.05; pl.yaw = 0.6; });
  await sleep(1500); await shot('s1-sky-islands');
  await E(() => { game.view = 1; const pl = game.player; pl.pitch = -0.45; pl.yaw = 2.2; });
  await sleep(1200); await shot('s2-sky-third');
  await E(() => { game.view = 0; const pl = game.player; pl.pitch = -0.9; pl.yaw = 1.4; });
  await sleep(1000); await shot('s3-sky-edge');
  // screens
  await E(() => { const pl = game.player; pl.give(B.OAK_LOG, 12); pl.give(B.COBBLE, 30); pl.give(I.COAL, 9); pl.give(B.IRON_ORE, 5); pl.give(toolId(0, 0), 1); pl.inv[3].dmg = 30; ui.dirty = true; openInv('craft'); ui.inv.book = true; buildInv(); });
  await sleep(700); await shot('s4-crafting-table');
  await E(() => { game.closeUI(); const t = { type: 'furnace', slots: [{ id: B.IRON_ORE, count: 3 }, { id: I.COAL, count: 2 }, { id: I.IRON_INGOT, count: 1 }], burn: 20, burnMax: 40, cook: 2.5 }; openInv('furnace', t); });
  await sleep(600); await shot('s5-furnace');
  await E(() => { game.closeUI(); const t = { type: 'chest', slots: new Array(27).fill(null) }; t.slots[0] = { id: I.DIAMOND, count: 7 }; t.slots[4] = { id: B.TNT, count: 3 }; openInv('chest', t); });
  await sleep(600); await shot('s6-chest');
  await E(() => { game.closeUI(); game.setMode('creative'); openInv('inv'); });
  await sleep(700); await shot('s7-creative');
  await E(() => { game.closeUI(); game.pause(); });
  await sleep(500); await shot('s8-pause');
  await E(() => { game.resume(); game.setMode('survival'); el('click-hint').hidden = true; const pl = game.player; pl.health = 7; pl.food = 13; ui.hearts = -2; ui.food = -2; game.world.time = 0.72; const w = game.world, x = Math.floor(pl.x), y = Math.floor(pl.y), z = Math.floor(pl.z); for (const [dx, dz] of [[3, -2], [-3, -3], [0, -6]]) w.setBlock(x + dx, w.topSolid(x + dx, z + dz) + 1, z + dz, B.TORCH, 0); pl.pitch = -0.35; pl.yaw = 0; });
  await sleep(1500); await shot('s9-night-torches');
}
