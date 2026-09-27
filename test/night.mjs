export default async function (E, shot, sleep, page, waitFor) {
  await E(() => game.startWorld('valley', 'creative', true));
  await waitFor(() => game.state === 'playing', 90000, 'playing');
  await sleep(1000);
  await E(() => {
    const pl = game.player, w = game.world, bx = Math.floor(pl.x), bz = Math.floor(pl.z), by = 112;
    for (let x = -10; x <= 10; x++) for (let z = -14; z <= 4; z++) w.setBlock(bx + x, by, bz + z, B.GRASS, 0);
    for (let x = -3; x <= 3; x++) for (let y = 1; y <= 4; y++) { w.setBlock(bx + x, by + y, bz - 8, B.COBBLE, 0); }
    w.setBlock(bx, by + 1, bz - 8, B.AIR, 0); w.setBlock(bx, by + 2, bz - 8, B.AIR, 0);
    w.setBlock(bx - 4, by + 1, bz - 5, B.TORCH, 0); w.setBlock(bx + 4, by + 1, bz - 5, B.TORCH, 0);
    w.setBlock(bx + 2, by + 2, bz - 7, B.TORCH, 3);
    w.setBlock(bx - 6, by + 1, bz - 10, B.JACK_O_LANTERN, 0); w.setBlock(bx + 7, by + 1, bz - 3, B.GLOWSTONE, 0);
    w.setBlock(bx - 2, by + 1, bz - 3, B.BED, 0); w.setBlock(bx + 2, by + 1, bz - 3, B.CHEST, 0); w.setBlock(bx + 3, by + 1, bz - 3, B.FURNACE_LIT, 0);
    w.setBlock(bx + 5, by + 1, bz - 7, B.CRAFTING_TABLE, 0); w.setBlock(bx - 5, by + 1, bz - 1, B.TNT, 0); w.setBlock(bx - 4, by + 1, bz - 1, B.GLASS, 0);
    w.setBlock(bx + 1, by + 1, bz - 1, B.POPPY, 0); w.setBlock(bx + 1, by + 1, bz - 2, B.DANDELION, 0); w.setBlock(bx - 1, by + 1, bz - 1, B.OAK_SAPLING, 0);
    w.setBlock(bx + 6, by + 1, bz - 1, B.CACTUS, 0);
    Object.assign(pl, { x: bx + 0.5, y: by + 1, z: bz + 2.5, yaw: 0, pitch: -0.28, flying: false });
    w.time = 0.25; el('click-hint').hidden = true;
  });
  await sleep(1500); await shot('n1-day');
  await E(() => { game.world.time = 0.72; });
  await sleep(1200); await shot('n2-night');
  await E(() => { const pl = game.player, w = game.world; w.time = 0.25; const x = Math.floor(pl.x), z = Math.floor(pl.z) + 1; for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let y = 0; y < 3; y++) w.setBlock(x + dx, 113 + y, z + dz, B.WATER, 0); pl.y = 113.2; pl.pitch = 0.1; });
  await sleep(1500); await shot('n3-underwater');
}
