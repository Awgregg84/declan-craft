/* ===================== Books, writing and signs ===================== */
// Paper comes from sugar cane, and three paper and some leather make a book. Add a feather and some coal for a
// Book and Quill to write in; sign it with a title and it becomes a Written Book anyone can read. Librarians and
// village chests have story books. Signs (six planks and a stick) stand on the ground or hang on a wall, with
// four lines of words that everyone can see.
const BOOK_PAGES = 50, PAGE_CHARS = 256, SIGN_CHARS = 15;
TAG_CLEAN.pages = v => Array.isArray(v) ? v.slice(0, BOOK_PAGES).map(p => cleanText(p, PAGE_CHARS)) : null;
TAG_CLEAN.book = v => {
  if (!v || typeof v !== 'object' || !Array.isArray(v.pages)) return null;
  return { title: cleanText(v.title, 32) || 'Book', author: cleanText(v.author, 16) || '?', pages: v.pages.slice(0, BOOK_PAGES).map(p => cleanText(p, PAGE_CHARS)) };
};
/* a stack's name: a written book is called by its title */
function stackName(st) {
  if (st && st.id === I.WRITTEN_BOOK && st.tag && st.tag.book) return st.tag.book.title;
  return st ? itemName(st.id) : '';
}

/* ---- story books (found in village chests, and sold by librarians) ---- */
const STORY_BOOKS = [
  { title: 'How to Play', author: 'The Librarian', pages: [
    'Welcome to Declan-craft! Punch a tree to get wood. Turn logs into planks, and planks into a crafting table. A crafting table lets you make tools.',
    'Make a wooden pickaxe first. Mine stone for a stone pickaxe. Find coal for torches before night comes, because monsters come out in the dark!',
    'Build a little house and make a bed before the first night. Sleeping in a bed skips the night, and you wake up there if anything goes wrong.',
    'Experience orbs come from monsters, ores and cooking. Spend your levels at an enchanting table with lapis lazuli to make your things stronger.',
    'You can write your own books! Make a Book and Quill from a book, a feather and some coal. Happy crafting!'] },
  { title: 'The Brave Little Pig', author: 'Farmer Tom', pages: [
    'Once upon a time there was a little pink pig called Pip. Pip was the smallest pig on the farm, and the other pigs said he was too small to do anything important.',
    'One night a zombie came shuffling toward the village. Everyone was fast asleep. Everyone except Pip, who was looking up at the stars.',
    "Pip wanted to ring the village bell, but pigs can't ring bells. So he did the only thing he could. He oinked. He oinked the loudest oink that was ever oinked.",
    'The villagers woke up and lit their torches. The zombie did not like the light one bit, and it shuffled away into the dark forest.',
    'In the morning the villagers gave Pip a whole apple to himself. He was still the smallest pig on the farm, but now everybody called him Pip the Brave. The End.'] },
  { title: 'The Creeper Who Wanted a Friend', author: 'Anonymous', pages: [
    'There once was a creeper named Clyde. More than anything, Clyde wanted a friend. But every time he came near someone, they ran away!',
    "'Maybe it's my hissing,' thought Clyde. So he practiced being quiet. 'Maybe it's my frowny face,' he thought. So he practiced smiling. That was very hard.",
    "One day Clyde found a builder building a house all alone. 'Hello,' said Clyde, very quietly and very carefully. And he did NOT explode.",
    "The builder was surprised, but then she smiled and said, 'Do you want to help me build?' Clyde couldn't hold blocks, but he was very good at cheering.",
    'From then on Clyde had a best friend. And every year on his birthday they set off one Party TNT together. No damage, just confetti. The End.'] },
  { title: 'All About the Nether', author: 'A Brave Explorer', pages: [
    'To get to the Nether, build a frame of obsidian 4 wide and 5 tall. Light the inside with flint and steel or a fire charge. Then step in and wait!',
    'The Nether is hot. There are lava seas everywhere, so build bridges and look before you step. Soul sand slows you down.',
    'Zombified piglins are peaceful unless you hit one. If you do, they ALL come after you. Magma cubes bounce about, and lava does not bother them.',
    'Ghasts float in the big caves and shoot fireballs. Hit a fireball to send it right back! A Potion of Fire Resistance makes lava harmless for a while.',
    'Every block you walk in the Nether is 8 blocks back home, so it is a great shortcut. Always remember where your portal is!'] },
  { title: 'Jokes for Builders', author: 'The Jester', pages: [
    'Why did the cow go to space? To see the moooon!\n\nWhat do you call a pig that does karate? A pork chop!',
    'How do builders stay fit? They run around the block!\n\nWhere do creepers go on holiday? Bora BOOM!',
    "What is a ghost's favorite creature? A ghast! Boooo!\n\nWhy did the chicken join the band? It had the drumsticks!",
    "Why don't endermen like water? It makes them feel blue.\n\nWhat do you call a sleeping bull? A bulldozer!"] },
  { title: 'The Lost Diamond', author: 'Captain Emerald', pages: [
    "Long ago a miner named Molly hid a huge diamond deep underground. Before she left she wrote a clue: 'Where lava glows and the stone is dark, follow the torches to find the mark.'",
    'Many explorers looked for the diamond. Some got lost in the caves. Some fell in the lava (oops). Some found nothing but coal.',
    'Then a young builder came along who always carried plenty of torches, and never, ever dug straight down.',
    'Deep in a cave, next to a lava lake, the builder found a line of old torches on the wall. At the end of the line, one stone block had a little X scratched on it.',
    'The builder mined the block, and there it was! Not one diamond, but a whole nest of them, sparkling in the torchlight. And the builder shared them with all their friends. The End.'] },
  { title: 'Fishing for Beginners', author: 'Old Fisher Finn', pages: [
    'Make a fishing rod from three sticks and two string. Stand by some water and tap to cast your line. Then watch the bobber!',
    'When the bobber dips under the water with a splash, tap again to reel it in. Wait too long and the fish swims away.',
    'You might catch cod, salmon, a bright tropical fish or a pufferfish. Never eat a pufferfish! It will make you feel very poisoned.',
    'Sometimes you catch treasure: an enchanted bow, a book or even emeralds. Sometimes you catch junk, like an old boot. That is fishing!',
    'Cook your fish in a furnace for a tasty meal. A rod with the Lure enchantment catches fish faster. Good luck!'] },
  { title: 'Brewing Basics', author: 'The Cleric', pages: [
    'Potions! First make glass bottles from glass, and a brewing stand from an iron ingot and three cobblestone. Tap some water with a glass bottle to fill it.',
    'Put up to three water bottles in the bottom of the brewing stand and one ingredient at the top. Then wait for the bubbles!',
    'Apple: Healing. Ghast Tear: Regeneration. Sugar: Swiftness. Nether Quartz: Strength. Magma Cream: Fire Resistance. Glowstone: Night Vision.',
    'Pufferfish: Water Breathing. Feather: Leaping. Glass: Invisibility. Rotten Flesh: Poison. Soul Sand: Slowness.',
    'Brew any potion with gunpowder to make a splash potion. Throw it, and it splashes everyone and everything nearby. A water bottle washes away poison.'] },
  { title: 'The Shy Enderman', author: 'Night Owl', pages: [
    'Ellie the enderman was very, very shy. She did not like it when anyone looked her in the eyes. It made her so nervous that she got cross and teleported away.',
    'Ellie loved collecting blocks. A little grass here, a flower there. She carried them carefully and put them down in new places to make the world prettier.',
    "One night a builder saw Ellie moving a flower. The builder knew not to stare, so instead the builder looked at her feet and said, 'That is a lovely flower.'",
    "Ellie was so happy that someone liked her flowers. She left an ender pearl by the builder's door as a present, and teleported away to find more flowers. The End."] },
];
function randomStoryBook(r) {
  const b = STORY_BOOKS[Math.floor((r || Math.random)() * STORY_BOOKS.length)];
  return { book: { title: b.title, author: b.author, pages: b.pages.slice() } };
}
/* what a village house's chest holds the first time it is opened */
function fillVillageChest(t) {
  const put = (id, n, ex) => { if (n <= 0) return; const free = []; for (let i = 0; i < t.slots.length; i++) if (!t.slots[i]) free.push(i); if (!free.length) return; t.slots[free[randInt(0, free.length - 1)]] = Object.assign({ id, count: n }, ex || {}); };
  put(I.WRITTEN_BOOK, 1, { tag: randomStoryBook() });
  if (Math.random() < 0.5) put(I.WRITTEN_BOOK, 1, { tag: randomStoryBook() });
  put(I.PAPER, randInt(1, 5));
  put(I.BOOK, randInt(0, 2));
  put(I.BREAD, randInt(1, 3));
  put(I.APPLE, randInt(0, 3));
  put(I.LAPIS, randInt(0, 4));
  put(I.EMERALD, randInt(0, 2));
  if (Math.random() < 0.3) put(I.WRITABLE_BOOK, 1);
  if (Math.random() < 0.25) put(I.XP_BOTTLE, randInt(1, 2));
}

/* ---- reading and writing books ---- */
const BOOKUI = { slot: -1, st: null, pages: null, page: 0, edit: false, signing: false };
function openBook(slot) {
  const pl = game.player, st = pl.inv[slot];
  if (!st || (st.id !== I.WRITABLE_BOOK && st.id !== I.WRITTEN_BOOK)) return;
  if (ui.inv) closeInv();
  game.releasePointer();
  const edit = st.id === I.WRITABLE_BOOK, b = st.tag && st.tag.book;
  Object.assign(BOOKUI, { slot, st, edit, signing: false, page: 0, pages: edit ? ((st.tag && st.tag.pages) || ['']).slice() : (b ? b.pages.slice() : ['']) });
  if (!BOOKUI.pages.length) BOOKUI.pages.push('');
  game.uiOpen = true;
  showScreen('scr-book');
  showBookPage();
  sfx('pageTurn');
}
function showBookPage() {
  const B2 = BOOKUI, st = B2.st, b = st.tag && st.tag.book, n = B2.pages.length;
  el('book-title').textContent = B2.edit ? 'Book and Quill' : (b ? b.title : 'Book');
  el('book-by').textContent = B2.edit ? 'Write anything you like. Tap Sign when it is finished.' : 'by ' + (b ? b.author : '?');
  el('book-page').hidden = B2.edit; el('book-edit').hidden = !B2.edit;
  if (B2.edit) el('book-edit').value = B2.pages[B2.page] || '';
  else el('book-page').textContent = B2.pages[B2.page] || '';
  el('book-num').textContent = 'Page ' + (B2.page + 1) + ' of ' + n;
  el('btn-book-prev').disabled = B2.page === 0;
  el('btn-book-next').textContent = B2.edit && B2.page === n - 1 ? (n < BOOK_PAGES ? 'New page >' : 'Next >') : 'Next >';
  el('btn-book-next').disabled = B2.page === n - 1 && !(B2.edit && n < BOOK_PAGES);
  el('btn-book-sign').hidden = !B2.edit;
  el('book-sign-row').hidden = !B2.signing;
}
function bookKeep() { if (BOOKUI.edit) BOOKUI.pages[BOOKUI.page] = cleanText(el('book-edit').value, PAGE_CHARS); }
function bookTurn(d) {
  bookKeep();
  const B2 = BOOKUI;
  if (d > 0 && B2.page === B2.pages.length - 1) { if (!B2.edit || B2.pages.length >= BOOK_PAGES) return; B2.pages.push(''); }
  B2.page = clamp(B2.page + d, 0, B2.pages.length - 1);
  sfx('pageTurn');
  showBookPage();
}
/* put the words back in the book (if it is still where it was) and close it */
function closeBook(sign) {
  const B2 = BOOKUI, pl = game.player;
  bookKeep();
  const st = pl.inv[B2.slot];
  if (st && st === B2.st && B2.edit) {
    while (B2.pages.length > 1 && !B2.pages[B2.pages.length - 1].trim()) B2.pages.pop();   // (empty pages at the end)
    if (sign) {
      st.id = I.WRITTEN_BOOK;
      st.tag = { book: { title: sign, author: playerName(), pages: B2.pages.slice() } };
      toast('You signed "' + sign + '"', 2.5);
    } else st.tag = Object.assign(st.tag || {}, { pages: B2.pages.slice() });
    ui.dirty = true;
    if (MP.role === 'guest') MP.sendSave();
  }
  B2.st = null; B2.slot = -1;
  el('book-edit').blur(); el('book-title-in').blur();
  game.uiOpen = false;
  showScreen(null);
  game.releaseKeys();
  if (!game.touchOn && !game.dragLook) { game.requestPointer(); el('click-hint').hidden = !!document.pointerLockElement; }
}
function setupBookScreen() {
  const click = (id, fn) => el(id).addEventListener('click', () => { initAudio(); sfx('click'); fn(); });
  click('btn-book-prev', () => bookTurn(-1));
  click('btn-book-next', () => bookTurn(1));
  click('btn-book-done', () => closeBook(null));
  click('btn-book-sign', () => { bookKeep(); BOOKUI.signing = true; showBookPage(); const t = el('book-title-in'); t.value = ''; t.focus(); });
  click('btn-book-sign-cancel', () => { BOOKUI.signing = false; showBookPage(); });
  click('btn-book-sign-ok', () => {
    const title = cleanText(el('book-title-in').value, 32).trim();
    if (!title) { toast('Type a title first', 2); el('book-title-in').focus(); return; }
    closeBook(title);
  });
  for (const id of ['book-edit', 'book-title-in']) el(id).addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); closeBook(null); } if (id === 'book-title-in' && e.key === 'Enter') { e.preventDefault(); el('btn-book-sign-ok').click(); } });
}

/* ---- signs ---- */
const SIGNUI = { x: 0, y: 0, z: 0, open: false };
/* the words on the sign at x, y, z (a tile on this device; the host sends everyone's) */
const signLines = (w, x, y, z) => { const t = w.tiles.get(tileKey(x, y, z)); return t && t.type === 'sign' && Array.isArray(t.lines) ? t.lines : null; };
function openSign(x, y, z) {
  const w = game.world, lines = signLines(w, x, y, z) || ['', '', '', ''];
  if (ui.inv) closeInv();
  game.releasePointer();
  Object.assign(SIGNUI, { x, y, z, open: true });
  const ins = document.querySelectorAll('.sign-line');
  ins.forEach((inp, i) => { inp.value = lines[i] || ''; });
  game.uiOpen = true;
  showScreen('scr-sign');
  setTimeout(() => { try { ins[0].focus(); } catch (e) { /* ignore */ } }, 30);
}
function closeSign() {
  if (!SIGNUI.open) return;
  SIGNUI.open = false;
  const lines = Array.from(document.querySelectorAll('.sign-line'), inp => cleanText(inp.value, SIGN_CHARS));
  document.querySelectorAll('.sign-line').forEach(inp => inp.blur());
  const { x, y, z } = SIGNUI;
  if (game.world && game.world.getBlock(x, y, z) === B.SIGN) {
    setSignText(game.world, x, y, z, lines);
    if (MP.role === 'guest') MP.send({ t: 'sign', x, y, z, l: lines });
    else if (MP.role === 'host') MP.broadcast({ t: 'sign', x, y, z, l: lines, we: MP.we });
  }
  game.uiOpen = false;
  showScreen(null);
  game.releaseKeys();
  if (!game.touchOn && !game.dragLook) { game.requestPointer(); el('click-hint').hidden = !!document.pointerLockElement; }
}
function setSignText(w, x, y, z, lines) {
  w.tiles.set(tileKey(x, y, z), { type: 'sign', lines: [0, 1, 2, 3].map(i => cleanText(lines[i], SIGN_CHARS)) });   // (a new tile each time, so its picture is painted again)
}
function setupSignScreen() {
  el('btn-sign-done').addEventListener('click', () => { initAudio(); sfx('click'); closeSign(); });
  document.querySelectorAll('.sign-line').forEach((inp, i, all) => inp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); if (i < 3) all[i + 1].focus(); else closeSign(); }
    if (e.key === 'Escape') { e.preventDefault(); closeSign(); }
  }));
}
/* the sign's words, painted into a live picture (the top half of it) */
function paintSign(ctx, lines) {
  ctx.fillStyle = '#1e140a';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 14px "Pixelify Sans", "Courier New", monospace';
  for (let i = 0; i < 4; i++) if (lines[i]) ctx.fillText(lines[i], 64, 9 + i * 15.5, 124);
}
const _sg = M4.create();
SPECIAL_DRAW[B.SIGN] = (w, x, y, z, data, s, t, cam) => {
  const P = PROG.entity, wall = data >= 16, yaw = wall ? [0, -Math.PI / 2, Math.PI, Math.PI / 2][data & 3] : (data & 15) * Math.PI / 8;
  const bright = brightAt(w, x + 0.5, y + 0.6, z + 0.5, s);
  entityBegin(texSkins);
  gl.uniform1f(P.u.uBright, bright);
  M4.identity(_sg);
  M4.translate(_sg, _sg, x + 0.5 - cam.x, y - cam.y, z + 0.5 - cam.z);
  M4.rotY(_sg, _sg, yaw);
  M4.scale(_sg, _sg, 1 / 16, 1 / 16, 1 / 16);
  gl.enable(gl.CULL_FACE);
  drawModel(MODELS[wall ? 'wall_sign' : 'sign'], _sg, null);
  const lines = signLines(w, x, y, z);
  if (!lines || !lines.some(Boolean)) return;
  M4.translate(_sg, _sg, 0, wall ? 8 : 12, wall ? -5.9 : 1.1);   // just in front of the board
  M4.scale(_sg, _sg, 16, 8, 1);
  if (!dynFacing(_sg)) return;   // (the words can't be seen from behind)
  const tile = w.tiles.get(tileKey(x, y, z)), layer = dynLayer('sign:' + w.map + ':' + x + ',' + y + ',' + z, tile, ctx => paintSign(ctx, lines));
  if (layer >= 0) drawDyn(layer, _sg, 0, 0, 1, 0.5, bright);
};
