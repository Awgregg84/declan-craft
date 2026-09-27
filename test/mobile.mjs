
export default async function (E, shot, sleep, page, waitFor) {
  await waitFor(() => game.world.readyAround(game.menuSpawn[0], game.menuSpawn[2], 2) > 0.9, 30000, 'title');
  await sleep(600); await shot('m1-title');
  await page.tap('#btn-play'); await sleep(500); await shot('m2-worlds');
  await E(() => game.startWorld('valley', 'survival', true));
  await waitFor(() => game.state === 'playing', 90000, 'playing');
  await sleep(1500);
  await E(() => { const pl = game.player; pl.pitch = -0.2; pl.give(B.OAK_PLANKS, 12); pl.give(B.TORCH, 8); ui.dirty = true; });
  await sleep(800); await shot('m3-play');
  await E(() => openInv('inv'));
  await sleep(700); await shot('m4-inventory');
  await E(() => { game.closeUI(); game.pause(); });
  await sleep(500); await shot('m5-pause');
}
