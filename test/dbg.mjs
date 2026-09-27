export default async function (E, shot, sleep, page, waitFor) {
  await E(() => game.startWorld('valley', 'survival', true));
  await waitFor(() => game.state === 'playing', 90000, 'playing');
  await sleep(800);
  await E(() => {
    const pl = game.player, w = game.world, bx = Math.floor(pl.x), bz = Math.floor(pl.z), by = 112;
    for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) w.setBlock(bx + x, by, bz + z, B.STONE, 0);
    Object.assign(pl, { x: bx + 0.5, y: by + 1, z: bz + 0.5, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0 });
    game.settings.difficulty = 2;
    window.__k = [];
    window.addEventListener('keydown', e => window.__k.push('down:' + e.code + (e.repeat ? ':r' : '') + ':' + (document.activeElement && (document.activeElement.id || document.activeElement.tagName))), true);
    window.addEventListener('keyup', e => window.__k.push('up:' + e.code), true);
    window.addEventListener('blur', () => window.__k.push('blur'), true);
  });
  await sleep(400);
  const z0 = await E(() => game.player.z);
  await page.mouse.click(640, 360);
  await sleep(300);
  console.log('after click', JSON.stringify(await E(() => ({ locked: game.locked, paused: game.paused, ui: game.uiOpen, chat: !!game.chatOpen, state: game.state, mine: game.input.mine, z: +game.player.z.toFixed(2), onGround: game.player.onGround, sneak: game.input.sneak, eat: game.player.eatT }))));
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 3; i++) { await sleep(250); console.log(' t' + i, JSON.stringify(await E(() => { const p = game.player; return { inp: game.input, p: { vx: +p.vx.toFixed(2), vz: +p.vz.toFixed(2), x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), pitch: p.pitch, flying: p.flying, inWater: p.inWater, inLava: p.inLava, sprint: p.sprinting, sneaking: p.sneaking, eatT: p.eatT, collidedH: p.collidedH, alive: p.alive, h: p.h }, mobs: game.entities.filter(e => e.mob).map(e => e.type + '@' + e.x.toFixed(1) + ',' + e.z.toFixed(1)), fps: game.fps }; }))); }
  await page.keyboard.up('KeyW');
  console.log('blocks around player', JSON.stringify(await E(() => { const pl = game.player, w = game.world, x = Math.floor(pl.x), z = Math.floor(pl.z), out = {}; for (let y = 113; y <= 115; y++) out[y] = [w.getBlock(x, y, z), w.getBlock(x, y, z - 1), w.getBlock(x, y, z - 2)].map(b => itemName(b)); out.top = w.topSolid(x, z - 3); return out; })));
  console.log('keys', JSON.stringify(await E(() => window.__k)), 'moved', (z0 - await E(() => game.player.z)).toFixed(2));
}
