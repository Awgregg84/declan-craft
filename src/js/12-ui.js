/* ===================== Interface ===================== */
const ui = { dirty: true, cursor: null, screen: 'scr-title', inv: null, hoverRef: null, hbEls: [], hearts: -1, food: -1, air: -1, nameT: 0, toastT: 0, back: 'scr-title', px: 0, py: 0 };
const SCREENS = ['scr-title', 'scr-worlds', 'scr-loading', 'scr-pause', 'scr-settings', 'scr-help', 'scr-death', 'scr-inv', 'scr-mp', 'scr-join', 'scr-char', 'scr-msg'];
const SPLASHES = ['Now with Sky Islands!', 'Made for Declan!', '100% blocks!', 'Punch a tree!', 'Watch out for creepers!', 'Blonde hair, blue eyes!',
  'Build a castle!', 'Diamonds hide deep down!', 'Sleep tight!', 'Never dig straight down!', 'Pigs say oink!', 'Build it big!', 'Also try bridges!', 'Torches keep monsters away!',
  'Now with villagers!', 'Hrmm!', 'Trade for emeralds!', 'Play together!', 'Now with the Nether!', 'Mind the lava!', 'Light the portal!'];
const MAPS = {
  valley: { name: 'Sunny Valley', desc: 'Rolling hills, forests, lakes and beaches, deep caves full of ore, and snowy mountain peaks.' },
  sky: { name: 'Sky Islands', desc: 'Floating islands above a sea of clouds. Build bridges between them, and mind the edge!' },
};

function uiScale() {
  const w = window.innerWidth, hgt = window.innerHeight;
  const hs = clamp(Math.floor(Math.min(w / 11.2, hgt / 8.5, 52)), 30, 52);
  const s = clamp(Math.floor(Math.min((w - 40) / 11, hgt / 12, 48)), 26, 48);
  document.documentElement.style.setProperty('--hs', hs + 'px');
  document.documentElement.style.setProperty('--s', s + 'px');
}
function showScreen(id) {
  for (const s of SCREENS) el(s).hidden = s !== id;
  ui.screen = id;
  const first = id && el(id) ? el(id).querySelector('.btn, input, .slot') : null;
  if (first && !IS_TOUCH && id !== 'scr-inv') setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 30);
}
function paintStack(node, st) {
  const key = st ? st.id + ':' + st.count + ':' + (st.dmg || 0) : '';
  if (node._k === key) return;
  node._k = key;
  node.textContent = '';
  if (!st) return;
  const ic = document.createElement('div');
  ic.className = 'ic'; ic.style.backgroundImage = 'url(' + ICONS[st.id] + ')';
  node.appendChild(ic);
  if (st.count > 1) { const ct = document.createElement('span'); ct.className = 'ct'; ct.textContent = st.count; node.appendChild(ct); }
  const tool = toolOf(st.id);
  if (tool && st.dmg) {
    const d = document.createElement('div'), i = document.createElement('i'), f = clamp(1 - st.dmg / tool.dur, 0, 1);
    d.className = 'dur'; i.style.width = (f * 100) + '%'; i.style.background = 'hsl(' + Math.round(f * 120) + ',90%,50%)';
    d.appendChild(i); node.appendChild(d);
  }
}

/* ---------- HUD ---------- */
function buildHotbar() {
  const hb = el('hotbar');
  hb.textContent = ''; ui.hbEls = [];
  for (let i = 0; i < 9; i++) {
    const s = h('div', { class: 'hs', role: 'button', 'aria-label': 'Hotbar slot ' + (i + 1) });
    s.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); selectSlot(i); });
    hb.appendChild(s); ui.hbEls.push(s);
  }
}
function selectSlot(i) {
  const pl = game.player;
  if (pl.sel !== i) { pl.sel = i; ui.dirty = true; const s = pl.inv[i]; showItemName(s ? itemName(s.id) : ''); }
}
function showItemName(name) { const n = el('item-name'); n.textContent = name; n.style.opacity = name ? 1 : 0; ui.nameT = 2; }
function toast(msg, secs) { const t = el('toast'); t.textContent = msg; t.style.opacity = 1; ui.toastT = secs || 2.5; }
function chat(msg, color) {
  const log = el('chat-log'), d = document.createElement('div');
  d.textContent = msg; if (color) d.style.color = color;
  log.appendChild(d);
  while (log.children.length > 8) log.removeChild(log.firstChild);
  setTimeout(() => { d.style.opacity = 0; }, 9000);
  setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 10500);
}
function iconRow(node, value, full, half, empty, label) {
  node.textContent = '';
  for (let i = 0; i < 10; i++) {
    const v = value - i * 2, img = document.createElement('img');
    img.alt = ''; img.src = v >= 2 ? full : v === 1 ? half : empty;
    node.appendChild(img);
  }
  node.setAttribute('aria-label', label);
}
function renderHUD(dt) {
  const pl = game.player;
  if (ui.dirty) {
    for (let i = 0; i < 9; i++) { paintStack(ui.hbEls[i], pl.inv[i]); ui.hbEls[i].classList.toggle('sel', i === pl.sel); }
    ui.dirty = false;
    if (ui.inv) refreshInv();
  }
  const surv = game.mode === 'survival';
  el('stats').style.visibility = surv ? 'visible' : 'hidden';
  if (surv) {
    const hp = Math.ceil(pl.health);
    if (hp !== ui.hearts) { ui.hearts = hp; iconRow(el('hearts'), hp, HUD_ICONS.heart, HUD_ICONS.heartHalf, HUD_ICONS.heartEmpty, 'Health ' + hp / 2 + ' of 10'); }
    el('hearts').classList.toggle('shake', hp <= 4 && Math.floor(nowS() * 8) % 2 === 0);
    const fd = Math.ceil(pl.food);
    if (fd !== ui.food) { ui.food = fd; iconRow(el('hunger'), fd, HUD_ICONS.food, HUD_ICONS.foodHalf, HUD_ICONS.foodEmpty, 'Hunger ' + fd / 2 + ' of 10'); }
    const air = pl.headInWater || pl.air < 10 ? pl.air : -1;
    if (air !== ui.air) {
      ui.air = air;
      const a = el('air'); a.textContent = '';
      for (let i = 0; i < air; i++) { const img = document.createElement('img'); img.alt = ''; img.src = HUD_ICONS.bubble; a.appendChild(img); }
    }
  }
  if (ui.nameT > 0) { ui.nameT -= dt; if (ui.nameT <= 0) el('item-name').style.opacity = 0; }
  if (ui.toastT > 0) { ui.toastT -= dt; if (ui.toastT <= 0) el('toast').style.opacity = 0; }
}

/* ---------- inventory screens ---------- */
function slotEl(ref, cls) {
  const s = h('div', { class: 'slot' + (cls ? ' ' + cls : ''), tabindex: '0', role: 'button' });
  s._ref = ref;
  s.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); ui.px = e.clientX; ui.py = e.clientY; clickSlot(ref, e.button === 2 ? 1 : 0, e.shiftKey); moveCursorEl(); });
  s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickSlot(ref, 0, e.shiftKey); } });
  s.addEventListener('pointerenter', e => { ui.hoverRef = ref; if (e.pointerType === 'mouse') showTip(ref, e.clientX, e.clientY); });
  s.addEventListener('pointerleave', () => { if (ui.hoverRef === ref) ui.hoverRef = null; el('tip').hidden = true; });
  s.addEventListener('focus', () => { ui.hoverRef = ref; });
  ui.inv.els.push(s);
  return s;
}
function refStack(ref) {
  if (ref.kind === 'creative') return { id: ref.id, count: 1 };
  if (ref.kind === 'out') return ui.inv.out ? { id: ui.inv.out.out, count: ui.inv.out.count } : null;
  if (ref.kind === 'book') return { id: ref.r.out, count: ref.r.count };
  return ref.arr[ref.i];
}
function showTip(ref, x, y) {
  const st = refStack(ref), tip = el('tip');
  if (!st) { tip.hidden = true; return; }
  let html = itemName(st.id);
  const tool = toolOf(st.id);
  if (tool) html += '<small>Durability ' + (tool.dur - (st.dmg || 0)) + ' / ' + tool.dur + '</small>';
  if (ref.kind === 'book') html += '<small>' + recipeText(ref.r) + '</small>';
  const f = st.id >= 256 && ITEMS[st.id].food;
  if (f) html += '<small>Fills ' + f / 2 + ' hunger</small>';
  tip.innerHTML = html;
  tip.hidden = false;
  tip.style.left = Math.min(x + 14, window.innerWidth - 200) + 'px';
  tip.style.top = Math.max(0, y - 30) + 'px';
}
function ingName(w) { return typeof w === 'string' ? ({ planks: 'Planks', log: 'Log', wool: 'Wool', stone: 'Cobblestone' })[w] : itemName(w); }
function recipeText(r) {
  const cnt = {};
  if (r.items) r.items.forEach(w => { const n = ingName(w); cnt[n] = (cnt[n] || 0) + 1; });
  else r.pattern.forEach(row => { for (const ch of row) if (ch !== ' ') { const n = ingName(r.key[ch]); cnt[n] = (cnt[n] || 0) + 1; } });
  return 'Needs ' + Object.keys(cnt).map(k => cnt[k] + ' ' + k).join(', ') + (r.count > 1 ? ' - makes ' + r.count : '');
}
function moveCursorEl() {
  const c = el('cursor-stack');
  paintStack(c, ui.cursor);
  c.style.left = ui.px + 'px'; c.style.top = ui.py + 'px';
}
function canAccept(ref, id) { return !ref.accept || ref.accept(id); }
function clickSlot(ref, button, shift) {
  const inv = ui.inv, pl = game.player;
  if (!inv) return;
  if (inv.tile && inv.tile.loading) return;   // still fetching this chest or furnace from the host
  if (ref.kind === 'creative') {
    if (ui.cursor) ui.cursor = null;
    else if (shift) pl.give(ref.id, maxStack(ref.id));
    else ui.cursor = { id: ref.id, count: button === 1 ? 1 : maxStack(ref.id) };
    sfx('click');
  } else if (ref.kind === 'book') {
    fillRecipe(ref.r);
  } else if (ref.kind === 'out') {
    takeCraft(shift);
  } else if (ref.kind === 'furnaceOut') {
    const s = ref.arr[ref.i];
    if (!s) return;
    if (shift) { const left = pl.give(s.id, s.count); if (left) s.count = left; else ref.arr[ref.i] = null; }
    else if (!ui.cursor) { ui.cursor = s; ref.arr[ref.i] = null; }
    else if (ui.cursor.id === s.id && ui.cursor.count + s.count <= maxStack(s.id)) { ui.cursor.count += s.count; ref.arr[ref.i] = null; }
  } else {
    const s = ref.arr[ref.i], cur = ui.cursor;
    if (shift && s) { quickMove(ref); }
    else if (button === 0) {
      if (!cur) { if (s) { ui.cursor = s; ref.arr[ref.i] = null; } }
      else if (!s) { if (canAccept(ref, cur.id)) { ref.arr[ref.i] = cur; ui.cursor = null; } }
      else if (s.id === cur.id && !toolOf(s.id)) { const k = Math.min(maxStack(s.id) - s.count, cur.count); s.count += k; cur.count -= k; if (cur.count <= 0) ui.cursor = null; }
      else if (canAccept(ref, cur.id)) { ref.arr[ref.i] = cur; ui.cursor = s; }
    } else {
      if (!cur) { if (s) { const k = Math.ceil(s.count / 2); ui.cursor = { id: s.id, count: k, dmg: s.dmg }; s.count -= k; if (s.count <= 0) ref.arr[ref.i] = null; } }
      else if (!s) { if (canAccept(ref, cur.id)) { ref.arr[ref.i] = { id: cur.id, count: 1, dmg: cur.dmg }; cur.count--; if (cur.count <= 0) ui.cursor = null; } }
      else if (s.id === cur.id && s.count < maxStack(s.id) && !toolOf(s.id)) { s.count++; cur.count--; if (cur.count <= 0) ui.cursor = null; }
      else if (canAccept(ref, cur.id)) { ref.arr[ref.i] = cur; ui.cursor = s; }
    }
    sfx('click');
  }
  if (ui.cursor && ui.cursor.count <= 0) ui.cursor = null;
  updateCraft();
  ui.dirty = true;
  refreshInv();
  if (ui.hoverRef === ref && !IS_TOUCH) showTip(ref, ui.px, ui.py);
  if (inv.tile && ui.inv === inv) MP.tileTouched(inv.tile);
}
function moveInto(st, arr, from, to, accept) {
  for (const pass of [0, 1]) for (let i = from; i < to && st.count > 0; i++) {
    const s = arr[i];
    if (accept && !accept(st.id, i)) continue;
    if (pass === 0 && s && s.id === st.id && s.count < maxStack(s.id) && !toolOf(s.id)) { const k = Math.min(maxStack(s.id) - s.count, st.count); s.count += k; st.count -= k; }
    if (pass === 1 && !s) { arr[i] = { id: st.id, count: st.count, dmg: st.dmg }; st.count = 0; }
  }
}
function quickMove(ref) {
  const inv = ui.inv, pl = game.player, st = ref.arr[ref.i];
  if (!st) return;
  if (ref.arr === pl.inv) {
    if (inv.kind === 'chest') moveInto(st, inv.tile.slots, 0, 27);
    else if (inv.kind === 'furnace') {
      if (SMELT[st.id] !== undefined) moveInto(st, inv.tile.slots, 0, 1);
      else if (fuelValue(st.id) > 0) moveInto(st, inv.tile.slots, 1, 2);
    }
    if (st.count > 0) { if (ref.i < 9) moveInto(st, pl.inv, 9, 36); else moveInto(st, pl.inv, 0, 9); }
  } else {
    moveInto(st, pl.inv, 0, 9); moveInto(st, pl.inv, 9, 36);
  }
  if (st.count <= 0) ref.arr[ref.i] = null;
}
function updateCraft() {
  const inv = ui.inv;
  if (!inv || !inv.grid) return;
  inv.out = matchRecipe(inv.grid.map(s => (s ? s.id : 0)), inv.n);
}
function takeCraft(shift) {
  const inv = ui.inv, pl = game.player;
  let made = 0;
  do {
    if (!inv.out) break;
    const out = inv.out;
    if (shift) { if (pl.give(out.out, out.count) > 0) break; }
    else {
      if (ui.cursor && (ui.cursor.id !== out.out || ui.cursor.count + out.count > maxStack(out.out))) break;
      if (ui.cursor) ui.cursor.count += out.count; else ui.cursor = { id: out.out, count: out.count };
    }
    for (let i = 0; i < inv.grid.length; i++) { const s = inv.grid[i]; if (s) { s.count--; if (s.count <= 0) inv.grid[i] = null; } }
    made++;
    updateCraft();
  } while (shift && made < 64);
  if (made) { sfx('craft'); if (game.stats) game.stats.crafted = (game.stats.crafted || 0) + made; }
}
function countAvailable() {
  const have = new Map(), pl = game.player;
  for (const s of pl.inv) if (s) have.set(s.id, (have.get(s.id) || 0) + s.count);
  if (ui.inv && ui.inv.grid) for (const s of ui.inv.grid) if (s) have.set(s.id, (have.get(s.id) || 0) + s.count);
  return have;
}
function recipeCells(r, n) {
  const cells = [];
  if (r.items) r.items.forEach((w, k) => cells.push([k, w]));
  else r.pattern.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== ' ') cells.push([y * n + x, r.key[row[x]]]); });
  return cells;
}
function canCraft(r, have) {
  const h2 = new Map(have);
  for (const [, w] of recipeCells(r, 3)) {
    let ok = false;
    for (const [id, c] of h2) if (c > 0 && ingredientMatches(w, id)) { h2.set(id, c - 1); ok = true; break; }
    if (!ok) return false;
  }
  return true;
}
function returnGrid() {
  const inv = ui.inv, pl = game.player;
  if (!inv || !inv.grid) return;
  for (let i = 0; i < inv.grid.length; i++) {
    const s = inv.grid[i];
    if (!s) continue;
    const left = pl.give(s.id, s.count);
    if (left > 0) dropItem(game, pl.x, pl.y + 1.2, pl.z, s.id, left, true);
    inv.grid[i] = null;
  }
}
function fillRecipe(r) {
  const inv = ui.inv, pl = game.player;
  if (!inv.grid) return;
  returnGrid();
  const cells = recipeCells(r, inv.n), taken = [];
  for (const [gi, w] of cells) {
    let found = -1;
    for (let i = 0; i < 36; i++) { const s = pl.inv[i]; if (s && ingredientMatches(w, s.id)) { found = i; break; } }
    if (found < 0) {
      for (const [gj, id] of taken) { pl.give(id, 1); inv.grid[gj] = null; }
      toast('You need more ingredients for ' + itemName(r.out));
      updateCraft(); refreshInv(); ui.dirty = true;
      return;
    }
    const s = pl.inv[found];
    s.count--; if (s.count <= 0) pl.inv[found] = null;
    inv.grid[gi] = { id: s.id, count: 1 };
    taken.push([gi, s.id]);
  }
  sfx('click');
  updateCraft(); ui.dirty = true; refreshInv();
}
function invGrid(parent, arr, from, to, cols, opts) {
  const g = h('div', { class: 'grid', style: '--cols:' + cols });
  for (let i = from; i < to; i++) g.appendChild(slotEl(Object.assign({ arr, i, kind: 'normal' }, opts || {})));
  parent.appendChild(g);
  return g;
}
function playerSection(panel) {
  const pl = game.player;
  invGrid(panel, pl.inv, 9, 36, 9);
  const hb = invGrid(panel, pl.inv, 0, 9, 9);
  hb.style.marginTop = 'calc(var(--s) * 0.2)';
}
function openInv(kind, tile) {
  if (ui.inv) closeInv();
  game.releasePointer();
  const creative = game.mode === 'creative';
  if (kind === 'inv' && creative) kind = 'creative';
  const n = kind === 'craft' ? 3 : 2;
  ui.inv = { kind, tile, n, grid: kind === 'craft' ? new Array(9).fill(null) : kind === 'inv' ? new Array(4).fill(null) : null, out: null, els: [], book: false, search: '' };
  buildInv();
  showScreen('scr-inv');
  game.uiOpen = true;
}
function buildInv() {
  const inv = ui.inv, root = el('inv-root');
  root.textContent = ''; inv.els = [];
  const panel = h('div', { class: 'panel' });
  if (inv.kind === 'creative') {
    panel.appendChild(h('h3', { text: 'Creative items' }));
    const search = h('input', { class: 'search', type: 'search', placeholder: 'Search items', 'aria-label': 'Search items', id: 'creative-search' });
    search.value = inv.search || '';
    search.addEventListener('input', () => { inv.search = search.value; buildInv(); const s2 = el('creative-search'); s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); });
    search.addEventListener('keydown', e => e.stopPropagation());
    panel.appendChild(search);
    const q = (inv.search || '').toLowerCase().trim();
    const list = CREATIVE_LIST.filter(id => !q || itemName(id).toLowerCase().includes(q));
    const wrap = h('div', { class: 'creative-grid' });
    const g = h('div', { class: 'grid', style: '--cols:9' });
    for (const id of list) g.appendChild(slotEl({ kind: 'creative', id }));
    wrap.appendChild(g);
    wrap.addEventListener('pointerdown', e => { if (ui.cursor && e.target === wrap) { ui.cursor = null; moveCursorEl(); } });
    panel.appendChild(wrap);
    panel.appendChild(h('p', { class: 'hint', text: 'Click an item to pick it up, then click a hotbar slot. Click the item list while holding something to throw it away.' }));
    invGrid(panel, game.player.inv, 0, 9, 9);
  } else {
    if (inv.kind === 'inv' || inv.kind === 'craft') {
      const top = h('div', { class: 'inv-top' });
      if (inv.kind === 'inv') top.appendChild(h('div', { class: 'char-box' }, h('canvas', { id: 'inv-char', 'aria-label': playerName() })));
      else top.appendChild(h('h3', { text: 'Crafting' }));
      const craft = h('div', { class: 'craft' });
      invGrid(craft, inv.grid, 0, inv.n * inv.n, inv.n, { kind: 'normal' });
      craft.appendChild(h('div', { class: 'arrow' }));
      craft.appendChild(slotEl({ kind: 'out' }, 'big'));
      top.appendChild(craft);
      panel.appendChild(top);
    } else if (inv.kind === 'furnace') {
      panel.appendChild(h('h3', { text: 'Furnace' }));
      const f = h('div', { class: 'fur' }), slots = inv.tile.slots;
      f.appendChild(slotEl({ arr: slots, i: 0, kind: 'normal', accept: id => SMELT[id] !== undefined }));
      f.appendChild(h('div'));
      f.appendChild(h('div'));
      const fl = h('div', { class: 'flame' }); fl.appendChild(h('div', { class: 'fill', id: 'fur-flame' })); f.appendChild(fl);
      const ar = h('div', { class: 'arrow' }); ar.appendChild(h('div', { class: 'fill', id: 'fur-arrow' })); f.appendChild(ar);
      f.appendChild(slotEl({ arr: slots, i: 2, kind: 'furnaceOut' }, 'big'));
      f.appendChild(slotEl({ arr: slots, i: 1, kind: 'normal', accept: id => fuelValue(id) > 0 }));
      panel.appendChild(f);
      panel.appendChild(h('p', { class: 'hint', text: 'Put something to cook on top and fuel like coal or wood underneath.' }));
    } else if (inv.kind === 'chest') {
      panel.appendChild(h('h3', { text: 'Chest' }));
      invGrid(panel, inv.tile.slots, 0, 27, 9);
    } else if (inv.kind === 'trade') { const tp = h('div', { class: 'panel trade-panel' }); buildTrade(tp); root.appendChild(tp); }
    panel.appendChild(h('h3', { text: 'Inventory' }));
    playerSection(panel);
    if (inv.grid) {
      const sb = h('div', { class: 'side-btns' });
      const bk = h('button', { type: 'button', class: 'btn', 'aria-pressed': inv.book ? 'true' : 'false' }, inv.book ? 'Hide recipes' : 'Show recipes');
      bk.addEventListener('click', () => { inv.book = !inv.book; buildInv(); });
      sb.appendChild(bk);
      panel.appendChild(sb);
    }
  }
  root.appendChild(panel);
  if (inv.grid && inv.book) {
    const book = h('div', { class: 'panel book' });
    book.appendChild(h('h3', { text: inv.n === 3 ? 'Recipes' : 'Recipes (use a crafting table for bigger ones)' }));
    const g = h('div', { class: 'grid' }), seen = new Set(), have = countAvailable();
    const rs = RECIPES.filter(r => recipeFits(r, inv.n) && !seen.has(r.out) && seen.add(r.out));
    rs.sort((a, b) => canCraft(b, have) - canCraft(a, have));
    for (const r of rs) g.appendChild(slotEl({ kind: 'book', r }, canCraft(r, have) ? 'can' : 'ghost'));
    book.appendChild(g);
    book.appendChild(h('p', { class: 'hint', text: 'Green means you have everything. Click one to fill the grid.' }));
    root.appendChild(book);
  }
  refreshInv();
}
function refreshInv() {
  const inv = ui.inv;
  if (!inv) return;
  for (const s of inv.els) {
    const ref = s._ref;
    if (ref.kind === 'creative' || ref.kind === 'book') { if (!s._k) paintStack(s, refStack(ref)); continue; }
    paintStack(s, refStack(ref));
  }
  moveCursorEl();
}
function updateFurnaceUI() {
  const inv = ui.inv;
  if (!inv || inv.kind !== 'furnace') return;
  const t = inv.tile, fl = el('fur-flame'), ar = el('fur-arrow');
  if (fl) fl.style.height = (t.burnMax ? clamp(t.burn / t.burnMax, 0, 1) * 100 : 0) + '%';
  if (ar) ar.style.width = (clamp(t.cook / SMELT_TIME, 0, 1) * 60) + '%';
  refreshInv();
}
function closeInv() {
  const inv = ui.inv, pl = game.player;
  if (!inv) return;
  returnGrid();
  if (ui.cursor) {
    const left = pl.give(ui.cursor.id, ui.cursor.count);
    if (left > 0 && game.mode === 'survival') dropItem(game, pl.x, pl.y + 1.2, pl.z, ui.cursor.id, left, true);
    ui.cursor = null;
  }
  ui.inv = null; ui.hoverRef = null;
  el('tip').hidden = true;
  paintStack(el('cursor-stack'), null);
  el('inv-root').textContent = '';
  game.uiOpen = false;
  ui.dirty = true;
  if (inv.kind === 'chest') sfx('chest');
  if (inv.kind === 'trade') { inv.villager.tradeT = 0; if (inv.villager.proxy) MP.send({ t: 'trade', e: inv.villager.nid, end: 1 }); }
  if (inv.tile && inv.tile.remote) MP.closeTile(inv.tile);
}

/* ---------- title logo and world thumbnails ---------- */
const FONT5 = {
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'], E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'], L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  '-': ['...', '...', '...', '###', '...', '...', '...'], R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
};
function drawLogo() {
  const cv = el('logo'), text = 'DECLAN-CRAFT', cell = 16, depth = 8;
  const cells = [];
  let x = 0;
  for (const ch of text) { const g = FONT5[ch]; g.forEach((row, y) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') cells.push([x + i, y]); }); x += g[0].length + 1; }
  const W = (x - 1) * cell + depth + 4, H = 7 * cell + depth + 4;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const set = new Set(cells.map(c => c[0] + ',' + c[1]));
  const pat = (name, scale) => { const c = document.createElement('canvas'); c.width = c.height = 16 * scale; const x2 = c.getContext('2d'); x2.imageSmoothingEnabled = false; x2.drawImage(tileSrc(name), 0, 0, 16 * scale, 16 * scale); return ctx.createPattern(c, 'repeat'); };
  const stone = pat('stone', 2), grass = pat('grass_top', 2);
  for (let d = depth; d > 0; d--) {
    ctx.fillStyle = d === depth ? '#111' : 'rgb(' + (40 + (depth - d) * 4) + ',' + (40 + (depth - d) * 4) + ',' + (44 + (depth - d) * 4) + ')';
    for (const [cx, cy] of cells) ctx.fillRect(cx * cell + d + 2, cy * cell + d + 2, cell, cell);
  }
  for (const [cx, cy] of cells) {
    const px = cx * cell + 2, py = cy * cell + 2;
    ctx.fillStyle = stone; ctx.fillRect(px, py, cell, cell);
    if (!set.has(cx + ',' + (cy - 1))) {
      ctx.fillStyle = grass; ctx.fillRect(px, py, cell, 5);
      for (let i = 0; i < cell; i += 2) if ((cx * 7 + i) % 5 < 3) ctx.fillRect(px + i, py + 5, 2, 2 + ((cx + i) % 3));
    }
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    if (!set.has(cx + ',' + (cy - 1))) ctx.fillRect(px, py, cell, 2);
    if (!set.has((cx - 1) + ',' + cy)) ctx.fillRect(px, py, 2, cell);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    if (!set.has(cx + ',' + (cy + 1))) ctx.fillRect(px, py + cell - 2, cell, 2);
    if (!set.has((cx + 1) + ',' + cy)) ctx.fillRect(px + cell - 2, py, 2, cell);
  }
}
function drawThumb(cv, map) {
  const W = 160, H = 70, ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;
  const r = mulberry32(map === 'sky' ? 7 : 3);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5f8ff0'); g.addColorStop(1, map === 'sky' ? '#d8e8ff' : '#a9c8ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff8c0'; ctx.fillRect(122, 8, 12, 12);
  const tree = (x, y) => { ctx.fillStyle = '#6b5132'; ctx.fillRect(x, y - 6, 2, 6); ctx.fillStyle = '#3e7d24'; ctx.fillRect(x - 3, y - 12, 8, 7); ctx.fillStyle = '#56993a'; ctx.fillRect(x - 2, y - 13, 5, 2); };
  if (map === 'sky') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 14; i++) ctx.fillRect((r() * W) | 0, 54 + ((r() * 12) | 0), 14 + ((r() * 20) | 0), 4);
    const isl = (x, y, w) => {
      for (let k = 0; k < w; k++) { const d = Math.min(k, w - k); ctx.fillStyle = '#7a7a7a'; ctx.fillRect(x + k, y + 3, 1, Math.max(1, d * 0.8)); }
      ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x, y + 1, w, 3); ctx.fillStyle = '#5d9b3a'; ctx.fillRect(x, y, w, 2);
      tree(x + (w >> 1), y);
    };
    isl(10, 30, 40); isl(68, 20, 30); isl(112, 38, 36); isl(52, 48, 18);
  } else {
    for (let x = 0; x < W; x++) {
      const hgt = 40 + Math.sin(x * 0.05) * 7 + Math.sin(x * 0.13) * 3;
      ctx.fillStyle = '#5d9b3a'; ctx.fillRect(x, hgt, 1, 2);
      ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x, hgt + 2, 1, 4);
      ctx.fillStyle = '#7a7a7a'; ctx.fillRect(x, hgt + 6, 1, H);
    }
    ctx.fillStyle = '#2f64d6'; ctx.fillRect(0, 52, 50, 18);
    ctx.fillStyle = '#f2f6f9'; ctx.fillRect(112, 22, 14, 4); ctx.fillRect(116, 18, 6, 4);
    for (const x of [62, 74, 86, 140]) tree(x, 40 + Math.sin(x * 0.05) * 7 + Math.sin(x * 0.13) * 3);
  }
}
function buildWorldCards() {
  const wrap = el('world-cards');
  wrap.textContent = '';
  el('worlds-h').textContent = ui.hostMode ? 'Choose a World to Share' : 'Choose a World';
  for (const id of ['valley', 'sky']) {
    const info = MAPS[id], save = loadSaveMeta(id);
    const card = h('article', { class: 'card' });
    const cv = h('canvas', { 'aria-hidden': 'true' });
    drawThumb(cv, id);
    card.appendChild(cv);
    card.appendChild(h('h3', { text: info.name }));
    card.appendChild(h('p', { text: info.desc }));
    card.appendChild(h('p', { class: 'status', text: save ? 'Saved world - ' + (save.mode === 'creative' ? 'Creative' : 'Survival') + ', day ' + (save.day || 1) + (save.nether ? ', in the Nether' : '') : 'New world' }));
    const actions = h('div', { class: 'actions' });
    let mode = save ? save.mode : 'survival';
    if (!save) {
      const modes = h('div', { class: 'modes', role: 'group', 'aria-label': 'Game mode' });
      const b1 = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'true' }, 'Survival');
      const b2 = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false' }, 'Creative');
      b1.addEventListener('click', () => { mode = 'survival'; b1.setAttribute('aria-pressed', 'true'); b2.setAttribute('aria-pressed', 'false'); sfx('click'); });
      b2.addEventListener('click', () => { mode = 'creative'; b2.setAttribute('aria-pressed', 'true'); b1.setAttribute('aria-pressed', 'false'); sfx('click'); });
      modes.append(b1, b2);
      actions.appendChild(modes);
    }
    const play = h('button', { type: 'button', class: 'btn' }, save ? 'Continue' : 'Create World');
    play.addEventListener('click', () => { sfx('click'); game.startWorld(id, save ? null : mode, false); });
    actions.appendChild(play);
    if (save) {
      const fresh = h('button', { type: 'button', class: 'btn' }, 'Start a New World');
      fresh.addEventListener('click', () => {
        sfx('click');
        const conf = h('div', { class: 'confirm' });
        conf.appendChild(h('p', { text: 'This replaces your saved ' + info.name + ' world. Pick a mode for the new one:' }));
        const row = h('div', { class: 'modes' });
        const s1 = h('button', { type: 'button', class: 'btn danger' }, 'Survival');
        const s2 = h('button', { type: 'button', class: 'btn danger' }, 'Creative');
        s1.addEventListener('click', () => game.startWorld(id, 'survival', true));
        s2.addEventListener('click', () => game.startWorld(id, 'creative', true));
        row.append(s1, s2);
        const cancel = h('button', { type: 'button', class: 'btn' }, 'Keep my world');
        cancel.addEventListener('click', () => { conf.remove(); fresh.hidden = false; });
        conf.append(row, cancel);
        fresh.hidden = true;
        actions.appendChild(conf);
      });
      actions.appendChild(fresh);
    }
    card.appendChild(actions);
    wrap.appendChild(card);
  }
}

/* ---------- settings and help ---------- */
const SETTINGS_DEF = [
  { key: 'renderDist', label: 'Render distance', type: 'range', min: 2, max: 12, fmt: v => v + ' chunks' },
  { key: 'fov', label: 'Field of view', type: 'range', min: 50, max: 110, fmt: v => v + ' degrees' },
  { key: 'sens', label: 'Mouse and touch look speed', type: 'range', min: 20, max: 250, fmt: v => v + '%' },
  { key: 'volume', label: 'Sound volume', type: 'range', min: 0, max: 100, fmt: v => v + '%' },
  { key: 'music', label: 'Music', type: 'toggle' },
  { key: 'difficulty', label: 'Difficulty', type: 'seg', options: ['Peaceful', 'Easy', 'Normal'] },
  { key: 'keepInv', label: 'Keep items when you die', type: 'toggle' },
  { key: 'autoJump', label: 'Auto-jump', type: 'toggle' },
  { key: 'bobbing', label: 'View bobbing', type: 'toggle' },
  { key: 'clouds', label: 'Clouds', type: 'toggle' },
  { key: 'quality', label: 'Graphics', type: 'seg', options: ['Fast', 'Fancy'] },
  { key: 'touch', label: 'Touch controls', type: 'seg', options: ['Auto', 'On', 'Off'] },
];
function buildSettings() {
  const list = el('settings-list'), S = game.settings;
  list.textContent = '';
  for (const d of SETTINGS_DEF) {
    const box = h('div', { class: 'set' });
    const id = 'set-' + d.key;
    if (d.type === 'range') {
      const lab = h('label', { for: id });
      const inp = h('input', { type: 'range', id, min: d.min, max: d.max, step: 1 });
      inp.value = S[d.key];
      const upd = () => { lab.textContent = d.label + ': ' + d.fmt(+inp.value); };
      upd();
      inp.addEventListener('input', () => { S[d.key] = +inp.value; upd(); game.applySettings(); });
      inp.addEventListener('keydown', e => e.stopPropagation());
      box.append(lab, inp);
    } else if (d.type === 'toggle') {
      const b = h('button', { type: 'button', class: 'btn', id, 'aria-pressed': S[d.key] ? 'true' : 'false' });
      const upd = () => { b.textContent = d.label + ': ' + (S[d.key] ? 'On' : 'Off'); b.setAttribute('aria-pressed', S[d.key] ? 'true' : 'false'); };
      upd();
      b.addEventListener('click', () => { S[d.key] = !S[d.key]; upd(); sfx('click'); game.applySettings(); });
      box.appendChild(b);
    } else {
      box.appendChild(h('span', { class: 'lbl', id: id + '-l', text: d.label }));
      const seg = h('div', { class: 'seg', role: 'group', 'aria-labelledby': id + '-l' });
      d.options.forEach((o, i) => {
        const b = h('button', { type: 'button', class: 'btn', 'aria-pressed': S[d.key] === i ? 'true' : 'false' }, o);
        b.addEventListener('click', () => { S[d.key] = i; for (const c of seg.children) c.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-pressed', 'true'); sfx('click'); game.applySettings(); });
        seg.appendChild(b);
      });
      box.appendChild(seg);
    }
    list.appendChild(box);
  }
}
function buildHelp() {
  const k = s => '<kbd>' + s + '</kbd>';
  el('help-body').innerHTML =
    '<section><h3>Keyboard and mouse</h3><dl>' +
    '<dt>' + k('W') + k('A') + k('S') + k('D') + '</dt><dd>Walk</dd>' +
    '<dt>' + k('Space') + '</dt><dd>Jump. Double-tap to fly in Creative</dd>' +
    '<dt>' + k('Shift') + '</dt><dd>Sneak (you will not fall off edges) or fly down</dd>' +
    '<dt>Double-tap ' + k('W') + '</dt><dd>Sprint (or hold ' + k('R') + ')</dd>' +
    '<dt>Left click</dt><dd>Break blocks, hit mobs</dd>' +
    '<dt>Right click</dt><dd>Place blocks, eat, open chests and tables</dd>' +
    '<dt>' + k('1') + '-' + k('9') + ', wheel</dt><dd>Pick a hotbar slot</dd>' +
    '<dt>' + k('E') + '</dt><dd>Inventory and crafting</dd>' +
    '<dt>' + k('Q') + '</dt><dd>Drop the item in your hand</dd>' +
    '<dt>' + k('V') + ' or ' + k('F5') + '</dt><dd>See your character from behind or the front</dd>' +
    '<dt>' + k('T') + ' or ' + k('/') + '</dt><dd>Chat and commands</dd>' +
    '<dt>' + k('F3') + '</dt><dd>Coordinates and info</dd>' +
    '<dt>' + k('Esc') + '</dt><dd>Pause</dd></dl></section>' +
    '<section><h3>Touch screens</h3><ul>' +
    '<li>Left circle: move. Push it all the way to run.</li>' +
    '<li>Drag anywhere else to look around.</li>' +
    '<li>Tap the screen or Place to place a block. Hold Break (or press and hold the screen) to dig.</li>' +
    '<li>Tap a hotbar slot to pick it. Bag opens your inventory.</li></ul></section>' +
    '<section><h3>Your first day</h3><ol>' +
    '<li>Hold break on a tree trunk to collect logs.</li>' +
    '<li>Open your inventory and turn logs into planks.</li>' +
    '<li>Make a crafting table (4 planks) and place it.</li>' +
    '<li>Make sticks, then a wooden pickaxe.</li>' +
    '<li>Mine stone for a stone pickaxe and a furnace.</li>' +
    '<li>Find coal and make torches before night.</li>' +
    '<li>Build a shelter, or make a bed from wool and planks to skip the night.</li></ol></section>' +
    '<section><h3>Handy tips</h3><ul>' +
    '<li>Stone needs a pickaxe. Iron needs a stone pickaxe. Diamonds and gold need iron.</li>' +
    '<li>Cook meat and smelt ore in a furnace.</li>' +
    '<li>Zombies burn in sunlight. Creepers hiss before they explode.</li>' +
    '<li>Right-click TNT to light it, then run!</li>' +
    '<li>Commands: /time set day, /gamemode creative, /give diamond 5, /summon pig, /summon piglin, /locate village, /spawnpoint, /help.</li>' +
    '<li>Your world saves by itself in this browser.</li></ul></section>' +
    '<section><h3>The Nether</h3><ul>' +
    '<li>Build a frame of obsidian 4 wide and 5 tall (the corners can be left out), then use flint and steel on the inside to light it.</li>' +
    '<li>Flint comes from breaking gravel. Put flint and an iron ingot together to make flint and steel. Clerics trade obsidian for emeralds.</li>' +
    '<li>Stand in the purple portal for a moment to travel. Walk back in to come home. Every block in the Nether is 8 blocks back home.</li>' +
    '<li>The Nether has lava seas, glowstone, quartz and soul sand, which slows you down.</li>' +
    '<li>Zombified piglins are peaceful unless you hit one. Then they all come after you. Magma cubes hop after you and do not mind lava.</li>' +
    '<li>If you die in the Nether, you wake up by the portal you came through. Beds do not work there.</li>' +
    '<li>Playing together: when one player goes through a portal, everyone travels together.</li></ul></section>' +
    '<section><h3>Villagers and trading</h3><ul>' +
    '<li>Villages have a well, houses and gardens. A new Sunny Valley world starts next to one. Type /locate village to find one.</li>' +
    '<li>Tap a villager (or right-click) to trade. Each job trades different things.</li>' +
    '<li>Villagers pay emeralds for easy things: 16 cobblestone to a Mason, 10 dandelions to a Farmer, 16 coal to a Toolsmith.</li>' +
    '<li>Spend emeralds on tools, food, glass, beds and even diamonds.</li></ul></section>' +
    '<section><h3>Playing together</h3><ol>' +
    '<li>Both players need the game open and the internet on.</li>' +
    '<li>The host taps Play Together, then Host a Game, and picks a world. (Or taps Invite a Player in the game menu.)</li>' +
    '<li>The game shows a room code, like FROG7.</li>' +
    '<li>The other player taps Play Together, then Join a Game, and types the code.</li>' +
    '<li>The host taps Let them in. The world, and everything the guest collects, is saved on the host\'s device.</li>' +
    '<li>Up to 4 players can share a world. Tap Chat (or press T) to send a message.</li>' +
    '<li>To skip the night, everyone gets in a bed.</li>' +
    '<li>If the connection drops, join again with the same code. Your things come back.</li></ol></section>';
}

/* ---------- touch controls ---------- */
function setupTouch() {
  const inp = game.input;
  const hold = (id, on, off) => {
    const b = el(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } b.classList.add('on'); on(); });
    const up = e => { e.preventDefault(); b.classList.remove('on'); if (off) off(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  };
  hold('tb-jump', () => { inp.jump = true; game.onJumpPress(); }, () => { inp.jump = false; });
  hold('tb-sneak', () => { inp.sneak = true; }, () => { inp.sneak = false; });
  hold('tb-mine', () => { inp.mine = true; inp.minePressed = true; }, () => { inp.mine = false; });
  hold('tb-place', () => { inp.use = true; inp.usePressed = true; }, () => { inp.use = false; });
  // a plain tap (click) so the iPad keyboard is allowed to open
  el('tb-chat').addEventListener('click', e => { e.preventDefault(); if (game.chatOpen) game.closeChat(); else game.openChat('', true); });
  el('chat-input').addEventListener('blur', () => { if (game.touchOn) setTimeout(() => { if (game.chatOpen && document.activeElement !== el('chat-input')) game.closeChat(); }, 200); });
  hold('tb-inv', () => game.toggleInventory());
  hold('tb-view', () => game.cycleView());
  hold('tb-pause', () => game.pause());
  hold('tb-fly', () => { if (game.mode === 'creative') { game.player.flying = !game.player.flying; toast(game.player.flying ? 'Flying' : 'Walking', 1); } });
  const joy = el('joy'), knob = el('joy-knob');
  let jid = null;
  const joyMove = e => {
    const r = joy.getBoundingClientRect(), R0 = r.width / 2;
    let dx = (e.clientX - (r.left + R0)) / R0, dy = (e.clientY - (r.top + R0)) / R0;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    inp.joyX = dx; inp.joyY = -dy; inp.joySprint = l > 0.95 && -dy > 0.7;
    knob.style.transform = 'translate(' + dx * R0 * 0.6 + 'px,' + dy * R0 * 0.6 + 'px)';
  };
  joy.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); jid = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } joyMove(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === jid) joyMove(e); });
  const jend = e => { if (e.pointerId !== jid) return; jid = null; inp.joyX = inp.joyY = 0; inp.joySprint = false; knob.style.transform = ''; };
  joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
}
