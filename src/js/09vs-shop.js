/* ===================== Money and the Declan-craft Store (the sixth wish list) ===================== */
// Coins ($1) and ten dollar bills ($10) sit in your bag like anything else; the inventory shows how much you have.
// You get money by selling things at a store, from chests, a little from gold ore, and Grunkle Stan starts with lots.
// Every village has a Declan-craft Store (so does Declan Falls) with a shopkeeper behind the counter: tap him to buy
// and sell, for simple whole-dollar prices. In Creative, everything is free. Trading with emeralds is just as before.
// Playing together, a guest's money is in their own bag, and the host checks each purchase before it happens.
defItem(I.COIN, 'Coin', { tex: 'coin' });
defItem(I.BILL, 'Ten Dollar Bill', { tex: 'bill' });
/* what the store sells, and what it buys: [item, how many, dollars] (new ones go on the end: playing together sends their numbers) */
const SHOP_BUY = [
  [I.BREAD, 3, 3], [I.APPLE, 4, 2], [I.PIZZA, 1, 4], [I.COOKED_PORKCHOP, 3, 4], [B.TORCH, 8, 3], [B.GLASS, 8, 4], [B.OAK_PLANKS, 16, 3],
  [B.WOOL + 14, 4, 3], [B.WOOL + 11, 4, 3], [toolId(2, 0), 1, 15], [toolId(2, 3), 1, 12], [I.BOW, 1, 10], [I.ARROW, 16, 4], [I.FISHING_ROD, 1, 6],
  [B.RAIL, 16, 10], [I.MINECART, 1, 12], [B.PARTY_TNT, 1, 8], [I.WRITABLE_BOOK, 1, 3],
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => [I.TALE + k, 1, 5]),
  [I.LASER, 1, 40], [I.WAND, 1, 30], [I.SPACE_HELMET, 1, 20], [I.ROBOT, 1, 50], [I.CAR, 1, 45], [I.GOLF_CART, 1, 60], [I.PLANE, 1, 80],
];
const SHOP_SELL = [
  [B.COBBLE, 16, 1], [B.DIRT, 32, 1], [B.OAK_LOG, 8, 2], [B.WOOL, 4, 2], [I.COAL, 8, 2], [I.IRON_INGOT, 1, 3], [I.GOLD_INGOT, 1, 5],
  [I.DIAMOND, 1, 20], [I.EMERALD, 1, 5], [I.ROTTEN_FLESH, 8, 1], [I.GUNPOWDER, 2, 2], [I.COD, 4, 2], [B.PUMPKIN, 2, 2], [B.SUGAR_CANE, 8, 1],
  [I.FEATHER, 4, 1], [I.STRING, 4, 1], [I.LEATHER, 2, 2], [B.MOON_CHEESE, 1, 10],
];
const moneyOf = pl => countItem(pl, I.COIN) + 10 * countItem(pl, I.BILL);
const money$ = n => '$' + n;
/* put money in a bag (bills for the tens, coins for the rest); anything that doesn't fit drops at your feet */
function giveMoney(pl, n) {
  for (const [id, k] of [[I.BILL, Math.floor(n / 10)], [I.COIN, n % 10]]) {
    if (k <= 0) continue;
    const left = pl.give(id, k);
    if (left > 0) dropItem(game, pl.x, pl.y + 1.2, pl.z, id, left, true);
  }
}
/* pay n dollars: coins first, then bills (with change in coins) */
function payMoney(pl, n) {
  if (moneyOf(pl) < n) return false;
  const c = countItem(pl, I.COIN);
  if (c >= n) { takeItem(pl, I.COIN, n); return true; }
  takeItem(pl, I.COIN, c);
  const rest = n - c, bills = Math.ceil(rest / 10);
  takeItem(pl, I.BILL, bills);
  if (bills * 10 - rest > 0) giveMoney(pl, bills * 10 - rest);
  return true;
}
/* why a deal can't happen ('' when it can): who has an inv (a player, or the host's copy of a guest's things) */
function shopWhy(who, mode, sell, it) {
  if (!it) return 'Not for sale';
  if (sell) return countItem(who, it[0]) >= it[1] ? '' : 'You need ' + it[1] + ' ' + itemName(it[0]) + ' to sell';
  return mode === 'creative' || moneyOf(who) >= it[2] ? '' : 'You need ' + money$(it[2]) + '. You have ' + money$(moneyOf(who)) + '.';
}
/* the deal itself, on the iPad whose bag it is */
function shopApply(pl, sell, it) {
  if (sell) { takeItem(pl, it[0], it[1]); giveMoney(pl, it[2]); }
  else {
    if (game.mode !== 'creative') payMoney(pl, it[2]);
    const left = pl.give(it[0], it[1]);
    if (left > 0) dropItem(game, pl.x, pl.y + 1.2, pl.z, it[0], left, true);
  }
  game.stats.shopped = (game.stats.shopped || 0) + 1;
  ui.dirty = true;
}

/* ---- the store screen ---- */
function openShop(e) {
  if (ui.inv) closeInv();
  game.releasePointer();
  ui.inv = { kind: 'shop', villager: e, tab: 0, els: [], grid: null, out: null, n: 0, book: false, search: '' };
  buildInv();
  showScreen('scr-inv');
  game.uiOpen = true;
  e.tradeT = 20;
  if (e.proxy) MP.send({ t: 'trade', e: e.nid });
  sfx('shopBell', e.x, e.y + 1.6, e.z);
}
function buildShop(panel) {
  const inv = ui.inv, pl = game.player, creative = game.mode === 'creative';
  panel.appendChild(h('h3', { text: 'Declan-craft Store' }));
  panel.appendChild(h('p', { class: 'money big', id: 'shop-money', text: creative ? 'Creative: everything is free!' : 'You have ' + money$(moneyOf(pl)) }));
  const tabs = h('div', { class: 'shop-tabs', role: 'tablist' });
  ['Buy', 'Sell'].forEach((n, t) => {
    const b = h('button', { type: 'button', class: 'shop-tab' + (inv.tab === t ? ' on' : ''), role: 'tab', 'aria-selected': inv.tab === t ? 'true' : 'false', text: n });
    b.addEventListener('click', () => { inv.tab = t; inv.msg = ''; sfx('click'); buildInv(); });
    tabs.appendChild(b);
  });
  panel.appendChild(tabs);
  const sell = inv.tab === 1, list = h('div', { class: 'trades shop-list' });
  (sell ? SHOP_SELL : SHOP_BUY).forEach((it, k) => {
    const ok = !shopWhy(pl, game.mode, sell, it), what = it[1] + ' ' + itemName(it[0]);
    const row = h('button', { type: 'button', class: 'trade' + (ok ? '' : ' cant'), 'aria-label': (sell ? 'Sell ' + what + ' for ' : 'Buy ' + what + ' for ') + money$(it[2]) + (ok ? '' : ', you need more') });
    if (sell) { row.appendChild(tradeStack(it[0], it[1])); row.appendChild(h('span', { class: 'tarrow', 'aria-hidden': 'true' })); row.appendChild(h('span', { class: 'price', text: money$(it[2]) })); }
    else { row.appendChild(h('span', { class: 'price', text: money$(it[2]) })); row.appendChild(h('span', { class: 'tarrow', 'aria-hidden': 'true' })); row.appendChild(tradeStack(it[0], it[1])); }
    row.appendChild(h('span', { class: 'shop-name', text: itemName(it[0]) }));
    row.addEventListener('click', () => shopDeal(sell, k));
    list.appendChild(row);
  });
  panel.appendChild(list);
  panel.appendChild(h('p', { class: 'trade-msg' + (inv.msgNo ? ' no' : ''), role: 'status', text: inv.msg || '' }));
  panel.appendChild(h('p', { class: 'hint', text: sell ? 'Tap a row to sell those things for money.' : 'Tap a row to buy it. Get money by selling things here, from chests, and by mining gold ore.' }));
}
function shopSay(msg, no) { if (!ui.inv || ui.inv.kind !== 'shop') return; ui.inv.msg = msg; ui.inv.msgNo = !!no; const tab = ui.inv.tab, y = (document.querySelector('.shop-list') || {}).scrollTop; buildInv(); ui.inv.tab = tab; const l = document.querySelector('.shop-list'); if (l && y) l.scrollTop = y; }
/* tap a row */
function shopDeal(sell, k) {
  const pl = game.player, e = ui.inv && ui.inv.villager, it = (sell ? SHOP_SELL : SHOP_BUY)[k];
  if (!e || !it) return;
  const why = shopWhy(pl, game.mode, sell, it);
  if (why) { sfx('villagerNo', e.x, e.y + 1.6, e.z); toast(why, 2.5); shopSay(why, true); return; }
  if (MP.role === 'guest') {   // the host checks it first (her things as they are right now go along just before)
    if (ui.inv.wait > game.t) return;
    ui.inv.wait = game.t + 3;
    MP.sendSave();
    MP.send({ t: 'shop', e: e.nid, k, s: sell ? 1 : 0 });
    return;
  }
  shopDone(sell, it, e);
}
function shopDone(sell, it, e) {
  shopApply(game.player, sell, it);
  sfx('cashRegister', e.x, e.y + 1.6, e.z);
  if (MP.role === 'guest') MP.sendSave();
  shopSay(sell ? 'You sold ' + it[1] + ' ' + itemName(it[0]) + ' for ' + money$(it[2]) + '!' : 'You bought ' + it[1] + ' ' + itemName(it[0]) + '!');
}
/* the host's answer to a guest */
function shopReply(m) {
  const inv = ui.inv, e = inv && inv.kind === 'shop' && inv.villager, sell = !!m.s, it = (sell ? SHOP_SELL : SHOP_BUY)[m.k | 0];
  if (inv) inv.wait = 0;
  if (!e || !it) return;
  if (!m.ok || shopWhy(game.player, game.mode, sell, it)) { sfx('villagerNo', e.x, e.y + 1.6, e.z); shopSay('The shopkeeper says not just now.', true); return; }
  shopDone(sell, it, e);
}
/* a guest wants to buy or sell: check it against what they have (their last save, sent just before) */
function shopMsg(game, r, m) {
  const e = game.entities.find(q => q.nid === m.e && q.type === 'villager' && q.prof === 'shopkeeper' && !q.removed);
  const sell = !!m.s, it = (sell ? SHOP_SELL : SHOP_BUY)[m.k | 0], sv = MP.guestSaves[r.id];
  const ok = !!(e && it && sv && Math.hypot(e.x - r.tx, e.z - r.tz) < 8 && !shopWhy(sv, sv.mode || r.mode, sell, it));
  if (ok) { sfx('cashRegister', e.x, e.y + 1.6, e.z); game.stats.shopped = (game.stats.shopped || 0) + 1; }
  if (r.link) r.link.send({ t: 'shopok', k: m.k | 0, s: sell ? 1 : 0, ok: ok ? 1 : 0 });
}

/* ---- the shopkeeper and the store's sign (when its part of the world first loads) ---- */
const STORE_SIGN = ['Declan-craft', 'Store', 'Buy and sell!', ''];
function spawnShop(game, sp) {
  const x = sp[1], y = sp[2], z = sp[3], sid = sp[5], w = game.world;
  if (!game.entities.some(e => e.village === sid && !e.removed)) spawnMob(game, 'villager', x, y, z, { prof: 'shopkeeper', home: [x, z], village: sid, vseed: hashString(sid) % 100000 });
  const sx = sp[6] | 0, sy = sp[7] | 0, sz = sp[8] | 0;
  if (w.getBlock(sx, sy, sz) === B.SIGN && !signLines(w, sx, sy, sz)) {
    setSignText(w, sx, sy, sz, STORE_SIGN);
    if (MP.role === 'host') MP.broadcast({ t: 'sign', x: sx, y: sy, z: sz, l: signLines(w, sx, sy, sz), we: MP.we });
  }
}
