/* ===================== Villagers and trading ===================== */
const PROF_NAMES = { farmer: 'Farmer', butcher: 'Butcher', toolsmith: 'Toolsmith', shepherd: 'Shepherd', mason: 'Mason', cleric: 'Cleric' };

/* Each job buys something easy to collect for emeralds, and sells useful things for emeralds. */
function tradesFor(prof, vseed) {
  const E = I.EMERALD, t = (give, get) => ({ give, get });
  switch (prof) {
    case 'farmer': return [t([[B.PUMPKIN, 4]], [E, 1]), t([[B.DANDELION, 10]], [E, 1]), t([[E, 1]], [I.BREAD, 6]),
      t([[E, 1]], [I.APPLE, 4]), t([[E, 1]], [B.OAK_SAPLING, 4]), t([[E, 2]], [B.PUMPKIN, 3])];
    case 'butcher': return [t([[I.PORKCHOP, 8]], [E, 1]), t([[I.BEEF, 8]], [E, 1]), t([[I.CHICKEN, 10]], [E, 1]), t([[I.COAL, 16]], [E, 1]),
      t([[E, 1]], [I.COOKED_PORKCHOP, 5]), t([[E, 1]], [I.STEAK, 5])];
    case 'toolsmith': return [t([[I.COAL, 16]], [E, 1]), t([[I.IRON_INGOT, 4]], [E, 1]), t([[E, 1]], [toolId(1, 0), 1]), t([[E, 3]], [toolId(2, 0), 1]),
      t([[E, 3]], [toolId(2, 1), 1]), t([[E, 4]], [toolId(2, 3), 1]), t([[E, 10]], [toolId(3, 0), 1]), t([[E, 12]], [toolId(3, 3), 1])];
    case 'shepherd': {
      const c1 = 1 + (vseed % 15), c2 = 1 + ((vseed * 7 + 5) % 15), c3 = c2 === c1 ? 1 + (c1 % 15) : c2;
      return [t([[B.WOOL, 12]], [E, 1]), t([[E, 1]], [B.WOOL + c1, 4]), t([[E, 1]], [B.WOOL + c3, 4]), t([[E, 3]], [B.BED, 1])];
    }
    case 'mason': return [t([[B.COBBLE, 16]], [E, 1]), t([[B.CLAY, 10]], [E, 1]), t([[E, 1]], [B.BRICKS, 10]), t([[E, 1]], [B.STONE_BRICKS, 12]),
      t([[E, 1]], [B.GLASS, 6]), t([[E, 2]], [B.GLOWSTONE, 3])];
    case 'cleric': return [t([[I.ROTTEN_FLESH, 16]], [E, 1]), t([[I.GOLD_INGOT, 2]], [E, 1]), t([[E, 1]], [I.GUNPOWDER, 4]),
      t([[E, 2]], [B.OBSIDIAN, 3]), t([[E, 6]], [I.DIAMOND, 1])];
  }
  return [];
}
function countItem(pl, id) { let n = 0; for (const s of pl.inv) if (s && s.id === id) n += s.count; return n; }
function takeItem(pl, id, n) {
  for (let i = 35; i >= 0 && n > 0; i--) {
    const s = pl.inv[i];
    if (!s || s.id !== id) continue;
    const k = Math.min(n, s.count);
    s.count -= k; n -= k;
    if (s.count <= 0) pl.inv[i] = null;
  }
  game.ui.dirty = true;
}
const canTrade = (pl, tr) => tr.give.every(([id, n]) => countItem(pl, id) >= n);
const tradeText = tr => tr.give.map(([id, n]) => n + ' ' + itemName(id)).join(' and ') + ' for ' + tr.get[1] + ' ' + itemName(tr.get[0]);

function openTrade(e) {
  if (ui.inv) closeInv();
  game.releasePointer();
  ui.inv = { kind: 'trade', villager: e, trades: tradesFor(e.prof, e.vseed || 0), els: [], grid: null, out: null, n: 0, book: false, search: '' };
  buildInv();
  showScreen('scr-inv');
  game.uiOpen = true;
  e.tradeT = 20;
  if (e.proxy) MP.send({ t: 'trade', e: e.nid });
  sfx('villagerSay', e.x, e.y + 1.6, e.z);
}
function buildTrade(panel) {
  const inv = ui.inv, e = inv.villager, pl = game.player;
  panel.appendChild(h('h3', { text: PROF_NAMES[e.prof] || 'Villager' }));
  const list = h('div', { class: 'trades' });
  for (const tr of inv.trades) {
    const ok = canTrade(pl, tr);
    const row = h('button', { type: 'button', class: 'trade' + (ok ? '' : ' cant'), 'aria-label': 'Trade ' + tradeText(tr) + (ok ? '' : ', you need more') });
    for (const [id, n] of tr.give) row.appendChild(tradeStack(id, n));
    row.appendChild(h('span', { class: 'tarrow', 'aria-hidden': 'true' }));
    row.appendChild(tradeStack(tr.get[0], tr.get[1]));
    row.addEventListener('click', () => doTrade(tr));
    list.appendChild(row);
  }
  panel.appendChild(list);
  panel.appendChild(h('p', { class: 'trade-msg' + (inv.msgNo ? ' no' : ''), role: 'status', text: inv.msg || '' }));
  panel.appendChild(h('p', { class: 'hint', text: 'Tap a trade to swap. Grey ones need more items. You get emeralds by trading, and from emerald ore under mountains.' }));
}
function tradeStack(id, n) { const d = h('span', { class: 'tstack' }); paintStack(d, { id, count: n }); return d; }
function doTrade(tr) {
  const pl = game.player, e = ui.inv && ui.inv.villager;
  if (!e) return;
  if (!canTrade(pl, tr)) {
    sfx('villagerNo', e.x, e.y + 1.6, e.z);
    const need = 'You need ' + tr.give.map(([id, n]) => n + ' ' + itemName(id)).join(' and ');
    toast(need, 2.5);
    ui.inv.msg = need; ui.inv.msgNo = true;   // the toast is behind the trade panel, so say it there too
    rebuildTrade(tr);
    return;
  }
  for (const [id, n] of tr.give) takeItem(pl, id, n);
  const left = pl.give(tr.get[0], tr.get[1]);
  if (left > 0) dropItem(game, pl.x, pl.y + 1.2, pl.z, tr.get[0], left, true);
  sfx('villagerYes', e.x, e.y + 1.6, e.z); sfx('pop');
  game.stats.traded = (game.stats.traded || 0) + 1;
  ui.inv.msg = 'You got ' + tr.get[1] + ' ' + itemName(tr.get[0]) + '!'; ui.inv.msgNo = false;
  ui.dirty = true;
  if (MP.role === 'guest') MP.sendSave();   // a guest's things live in the host's world
  rebuildTrade(tr);
}
/* Redraw the trade list, keeping keyboard focus on the same row. */
function rebuildTrade(tr) {
  const i = ui.inv.trades.indexOf(tr), a = document.activeElement, refocus = a && a.classList && a.classList.contains('trade');
  buildInv();
  if (refocus) { const row = document.querySelectorAll('.trade')[i]; if (row) row.focus(); }
}

/* Walking about: stay near home (closer at night), run from zombies, look at nearby players. Returns [mx, mz, speed multiplier]. */
function villagerSteer(game, e, dt) {
  if (e.tradeT > 0) e.tradeT -= dt;
  let near = null, nd = 7;
  for (const p of allPlayers(game)) {
    if (!p.alive) continue;
    const d = Math.hypot(p.x - e.x, p.z - e.z);
    if (d < nd && Math.abs(p.y - e.y) < 4) { nd = d; near = p; }
  }
  e.lookP = near ? Math.atan2((near.y + 1.5) - (e.y + 1.7), nd) * 0.7 : 0;
  for (const z of game.entities) {
    if (z.type !== 'zombie' || z.dead || z.removed) continue;
    const dx = e.x - z.x, dz = e.z - z.z, d = Math.hypot(dx, dz);
    if (d < 7) { e.yaw = Math.atan2(-dx, -dz); return [dx / (d || 1), dz / (d || 1), 1.9]; }
  }
  if (e.panic > 0) {
    e.panic -= dt;
    if (Math.random() < dt * 1.2) e.yaw += randRange(-1.2, 1.2);
    return [-Math.sin(e.yaw), -Math.cos(e.yaw), 1.8];
  }
  if (e.tradeT > 0 && near) { e.yaw = Math.atan2(-(near.x - e.x), -(near.z - e.z)); e.moving = false; return [0, 0, 0]; }
  const night = game.sky ? game.sky.day < 0.3 : false;
  if (e.home) {
    const hx = e.home[0] - e.x, hz = e.home[1] - e.z, hd = Math.hypot(hx, hz);
    if (hd > (night ? 5 : 16)) { e.moving = true; e.yaw = Math.atan2(-hx, -hz); e.aiT = 1; return [hx / hd, hz / hd, 0.6]; }
  }
  e.aiT -= dt;
  if (e.aiT <= 0) {
    if (Math.random() < 0.55) { e.moving = false; e.aiT = randRange(2, 6); }
    else { e.moving = true; e.yaw = Math.random() * TAU; e.aiT = randRange(1.5, 3.5); }
    if (Math.random() < 0.12) sfx('villagerSay', e.x, e.y + 1.6, e.z);
  }
  if (e.moving) return [-Math.sin(e.yaw), -Math.cos(e.yaw), 0.5];
  if (near) e.yaw = Math.atan2(-(near.x - e.x), -(near.z - e.z));
  return [0, 0, 0];
}

/* A village's people appear when the chunk with its well loads (once per visit). */
function spawnVillagers(game, sp) {
  const x = sp[1], y = sp[2], z = sp[3], count = sp[4], vid = sp[5];
  if (game.entities.some(e => e.village === vid && !e.removed)) return;
  const profs = String(sp[6] || '').split(',').filter(Boolean), w = game.world;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU, sx = x + Math.cos(a) * 1.5, sz = z + Math.sin(a) * 1.5;
    const top = w.topSolid(Math.floor(sx), Math.floor(sz));
    const sy = top > 0 && Math.abs(top + 1 - y) < 4 ? top + 1 : y;
    spawnMob(game, 'villager', sx, sy, sz, { prof: profs[i % profs.length] || 'farmer', home: [x, z - 3], village: vid, vseed: (hashString(vid) + i * 7919) % 100000 });
  }
}
