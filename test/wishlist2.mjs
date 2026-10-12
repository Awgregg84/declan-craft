// Declan's second wish list, playing alone. Sections can be picked: node test/wishlist2.mjs armor enchant ...
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), out = path.join(dir, 'shots');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html'));
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(0);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
const want = process.argv.slice(2), on = k => !want.length || want.includes(k);

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await browser.newPage({ viewport: { width: 1024, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:' + server.address().port + '/');
  await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
  const E = (fn, arg) => p.evaluate(fn, arg);
  const waitFor = (fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
  const shot = async name => { await p.screenshot({ path: path.join(out, 'w2-' + name + '.png') }); };
  await E(() => { game.startWorld('valley', 'survival', true); });
  await waitFor(() => game.state === 'playing', 90000);
  await E(() => {
    game.dragLook = true; game.settings.difficulty = 2; game.world.time = 0.25;
    window.__toasts = []; const t0 = toast; window.toast = (m, s) => { window.__toasts.push(m); return t0(m, s); };
    window.T = {
      stage(x, y, z, r, h) { const w = game.world; for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { w.setBlock(x + dx, y - 1, z + dz, B.STONE, 0); for (let k = 0; k < (h || 6); k++) w.setBlock(x + dx, y + k, z + dz, B.AIR, 0); } },
      clearMobs() { for (const e of game.entities) if (e.mob || e.type === 'proj' || e.type === 'item' || e.type === 'tnt' || e.type === 'xp') e.removed = true; },
      aim(tx, ty, tz) { const pl = game.player, dx = tx - pl.x, dy = ty - (pl.y + pl.eye), dz = tz - pl.z; pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
      put(x, y, z, opts) { Object.assign(game.player, { x, y, z, vx: 0, vy: 0, vz: 0, fallDist: 0, flying: false }, opts || {}); },
      hold(id, count, extra) { const pl = game.player; pl.inv[0] = id ? Object.assign({ id, count: count || 1 }, extra || {}) : null; pl.sel = 0; game.ui.dirty = true; },
      count(id) { return game.player.inv.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0); },
      ents(type) { return game.entities.filter(e => !e.removed && e.type === type); },
      tap() { game.input.use = true; game.input.usePressed = true; game.input.useOnce = true; },
    };
  });
  const base = await E(() => { const pl = game.player; return { x: Math.floor(pl.x), y: 100, z: Math.floor(pl.z) }; });
  const area = (dx, dz) => ({ x: base.x + dx, y: base.y, z: base.z + dz });
  const goto = async C => {
    await E(C => T.put(C.x + 0.5, C.y + 3, C.z + 0.5, { flying: true }), C);
    await waitFor(C => game.world.readyAround(C.x + 0.5, C.z + 0.5, 1) >= 1, 60000, C);
  };

  if (on('armor')) {
    // ---------- armor and shields ----------
    const A = area(0, 0);
    await goto(A);
    await E(A => { T.stage(A.x, A.y, A.z, 10); T.clearMobs(); T.put(A.x + 0.5, A.y, A.z + 0.5); for (let i = 0; i < 41; i++) game.player.inv[i] = null; }, A);
    const rc = await E(() => {
      const g = (rows, m) => { const grid = new Array(9).fill(0); rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== ' ') grid[y * 3 + x] = m; }); return matchRecipe(grid, 3); };
      return { helm: g(['III', 'I I'], I.IRON_INGOT), chest: g(['D D', 'DDD', 'DDD'], I.DIAMOND), legs: g(['LLL', 'L L', 'L L'], I.LEATHER), boots: g(['G G', 'G G'], I.GOLD_INGOT),
        shield: matchRecipe([B.OAK_PLANKS, I.IRON_INGOT, B.OAK_PLANKS, B.BIRCH_PLANKS, B.OAK_PLANKS, B.OAK_PLANKS, 0, B.SPRUCE_PLANKS, 0], 3) };
    });
    check('armor and shield recipes', rc.helm && rc.helm.out === armorIdOf(2, 0) && rc.chest.out === armorIdOf(3, 1) && rc.legs.out === armorIdOf(0, 2) && rc.boots.out === armorIdOf(1, 3) && rc.shield && rc.shield.out === 331, rc);
    function armorIdOf(m, k) { return 350 + m * 4 + k; }
    // tap Place holding armor: it goes on
    await E(() => { T.hold(I.ARMOR + 2 * 4 + 1); T.aim(game.player.x, game.player.y + 3, game.player.z - 5); T.tap(); });
    await sleep(300);
    const eq = await E(() => ({ worn: game.player.inv[37] && game.player.inv[37].id, hand: game.player.inv[0], pts: armorPoints(game.player.inv) }));
    check('tapping Place with a chestplate puts it on', eq.worn === I_ARMOR(2, 1) && !eq.hand && eq.pts === 6, eq);
    function I_ARMOR(m, k) { return 350 + m * 4 + k; }
    // full diamond: zombie hits hurt much less, and the armor wears
    const z = await E(A => {
      const pl = game.player;
      for (let k = 0; k < 4; k++) pl.inv[36 + k] = { id: I.ARMOR + 3 * 4 + k, count: 1 };
      pl.health = 20; pl.invuln = 0;
      pl.damage(10, 'zombie', null, pl.x, pl.z - 2);
      const after = pl.health, wear = pl.inv[37].dmg;
      pl.health = 20; pl.invuln = 0;
      pl.damage(4, 'fall');
      return { after, wear, fall: pl.health, pts: armorPoints(pl.inv) };
    }, A);
    check('full diamond armor (20 points) takes 80% off a hit and wears; falls go straight through', Math.abs(z.after - 18) < 0.01 && z.wear >= 2 && z.fall === 16 && z.pts === 20, z);
    // the armor bar shows
    await sleep(300);
    check('the armor bar shows ten full icons', await E(() => el('armor').children.length === 10 && /Armor 10 of 10/.test(el('armor').getAttribute('aria-label'))));
    // shield in the off-hand slot, sword in hand: hold Place to block a zombie in front
    const sb = await E(A => {
      const pl = game.player;
      for (let k = 0; k < 4; k++) pl.inv[36 + k] = null;
      pl.inv[40] = { id: I.SHIELD, count: 1 };
      T.hold(toolId(3, 3));
      pl.health = 20; pl.invuln = 0; pl.yaw = 0; pl.pitch = 0;
      game.input.use = true; game.input.usePressed = true;
      return true;
    }, A);
    await sleep(500);
    const b1 = await E(A => {
      const pl = game.player, blocking = pl.blocking;
      const zf = spawnMob(game, 'zombie', pl.x, pl.y, pl.z - 1.5); zf.frozen = 30;
      pl.damage(5, 'zombie', zf, zf.x, zf.z);
      const front = pl.health, sh = pl.inv[40].dmg;
      pl.damage(5, 'zombie', null, pl.x, pl.z + 2);   // from behind
      return { blocking, front, back: pl.health, sh, slow: Math.abs(pl.vx) < 2 };
    }, A);
    check('holding Place raises the off-hand shield: a hit from in front does nothing (the shield wears), one from behind hurts', b1.blocking && b1.front === 20 && b1.sh >= 6 && b1.back === 15, b1);
    // an arrow from in front is stopped too
    const b2 = await E(A => {
      const pl = game.player;
      pl.health = 20; pl.invuln = 0;
      shootProjectile(game, 'arrow', pl.x, pl.y + 1.5, pl.z - 6, 0, 0, 30, { owner: 'mob', dmg: 6 });
      return true;
    }, A);
    await sleep(800);
    check('a raised shield stops an arrow from in front', await E(() => game.player.health === 20 && !T.ents('proj').some(a => !a.stuck)), await E(() => game.player.health));
    await E(() => { game.input.use = false; });
    await sleep(200);
    check('letting go lowers the shield', await E(() => !game.player.blocking));
    // the shield in the hand works the same
    await E(() => { const pl = game.player; pl.inv[40] = null; T.hold(I.SHIELD); game.input.use = true; game.input.usePressed = true; });
    await sleep(400);
    check('a shield held in the hand goes up too', await E(() => game.player.blocking));
    await E(() => { game.input.use = false; });
    // pictures: wearing iron armor with a shield, from behind and in front; first person with the shield up
    await E(A => {
      const pl = game.player;
      for (let k = 0; k < 4; k++) pl.inv[36 + k] = { id: I.ARMOR + 2 * 4 + k, count: 1 };
      pl.inv[36] = { id: I.ARMOR + 3 * 4, count: 1 };
      pl.inv[40] = { id: I.SHIELD, count: 1 }; T.hold(toolId(3, 3));
      T.clearMobs(); game.view = 2; pl.yaw = 0.6; pl.pitch = -0.2;
    }, A);
    await sleep(600); await shot('armor-front');
    await E(() => { game.input.use = true; game.input.usePressed = true; });
    await sleep(500); await shot('armor-blocking');
    await E(() => { game.view = 0; }); await sleep(300); await shot('shield-first-person');
    await E(() => { game.input.use = false; }); await sleep(300); await shot('shield-first-person-down');
    // the inventory shows armor slots; shift-click moves armor in and out
    await E(() => { game.view = 0; openInv('inv'); });
    await sleep(400); await shot('armor-inventory');
    const inv = await E(() => {
      const slots = document.querySelectorAll('.armor-slot').length;
      const pl = game.player; const helm = pl.inv[36];
      quickMove({ arr: pl.inv, i: 36 });   // off into the bag
      const off = !pl.inv[36] && pl.inv.slice(0, 36).some(s => s && s.id === helm.id);
      const i = pl.inv.findIndex((s, i) => i < 36 && s && s.id === helm.id);
      quickMove({ arr: pl.inv, i });
      return { slots, off, back: pl.inv[36] && pl.inv[36].id === helm.id };
    });
    check('the inventory has 4 armor slots and a shield slot; shift-click puts armor on and takes it off', inv.slots === 5 && inv.off && inv.back, inv);
    await E(() => game.closeUI());
    // wear and tags survive dropping and picking up
    const dp = await E(A => {
      const pl = game.player; T.clearMobs();
      T.hold(toolId(3, 0)); pl.inv[0].dmg = 77; pl.inv[0].tag = { test: 1 };
      pl.dropHeld(true);
      const e = T.ents('item')[0];
      return { dropped: !!e && e.dmg === 77 };
    }, A);
    await sleep(1500);
    await E(() => { const e = T.ents('item')[0]; if (e) T.put(e.x, e.y, e.z); });
    await waitFor(() => game.player.inv.some(s => s && s.id === toolId(3, 0)), 3000);
    const pk = await E(() => { const s = game.player.inv.find(s => s && s.id === toolId(3, 0)); return s ? { dmg: s.dmg, tag: s.tag } : null; });
    check('a worn pickaxe keeps its wear (and tag) when dropped and picked up again', dp.dropped && pk && pk.dmg === 77 && pk.tag && pk.tag.test === 1, { dp, pk });
  }

  if (on('enchant')) {
    // ---------- experience and enchanting ----------
    const X = area(40, 0);
    await goto(X);
    await E(X => { T.stage(X.x, X.y, X.z, 10); T.clearMobs(); T.put(X.x + 0.5, X.y, X.z + 0.5); for (let i = 0; i < 41; i++) game.player.inv[i] = null; setXp(game.player, 0); game.setMode('survival'); }, X);
    // defeating a zombie drops experience orbs that float to you
    const k1 = await E(X => {
      const z = spawnMob(game, 'zombie', X.x + 0.5, X.y, X.z - 2.5); z.frozen = 30; z.hp = 1;
      T.hold(toolId(3, 3)); T.aim(z.x, z.y + 1.2, z.z);
      game.input.mine = true; game.input.minePressed = true;
      return z.nid;
    }, X);
    await sleep(300);
    await E(() => { game.input.mine = false; });
    check('defeating a zombie drops experience orbs', await waitFor(() => T.ents('xp').length > 0 || game.player.xp > 0, 3000), await E(() => ({ orbs: T.ents('xp').length, xp: game.player.xp })));
    check('the orbs float to you and you get the experience', await waitFor(() => game.player.xp >= 5 && !T.ents('xp').length, 6000), await E(() => ({ xp: game.player.xp, level: game.player.xpLevel, orbs: T.ents('xp').length })));
    check('the XP bar shows how far along you are', await E(() => parseFloat(el('xpbar').firstChild.style.width) > 0));
    // mining coal ore gives experience; with Silk Touch you get the ore itself and no experience
    const m1 = await E(X => {
      const w = game.world, pl = game.player; setXp(pl, 0); T.clearMobs();
      for (let i = 0; i < 6; i++) w.setBlock(X.x + 2, X.y + i % 3, X.z - 3 + Math.floor(i / 3), B.COAL_ORE, 0);
      T.hold(toolId(3, 0));
      for (let i = 0; i < 3; i++) pl.breakBlock(X.x + 2, X.y + i, X.z - 3, true);
      const orbs = T.ents('xp').reduce((n, e) => n + e.value, 0);
      pl.inv[0].tag = { ench: [['silk_touch', 1]] };
      for (let i = 0; i < 3; i++) pl.breakBlock(X.x + 2, X.y + i, X.z - 2, true);
      const ore = T.ents('item').filter(e => e.id === B.COAL_ORE).length, coal = T.ents('item').filter(e => e.id === I.COAL).length;
      return { orbs, ore, coal, orbs2: T.ents('xp').reduce((n, e) => n + e.value, 0) };
    }, X);
    check('coal ore gives coal and some experience; Silk Touch gives the ore block and no extra experience', m1.coal === 3 && m1.ore === 3 && m1.orbs2 === m1.orbs, m1);
    // lapis ore drops 4 to 8 lapis lazuli; Fortune III gives more on average
    const lp = await E(X => {
      const w = game.world, pl = game.player; T.clearMobs();
      let plain = 0, lucky = 0;
      T.hold(toolId(2, 0));
      for (let i = 0; i < 20; i++) for (const [id, n] of blockDrops(B.LAPIS_ORE, toolId(2, 0), pl.inv[0])) if (id === I.LAPIS) plain += n;
      pl.inv[0].tag = { ench: [['fortune', 3]] };
      for (let i = 0; i < 20; i++) for (const [id, n] of blockDrops(B.LAPIS_ORE, toolId(2, 0), pl.inv[0])) if (id === I.LAPIS) lucky += n;
      const wood = blockDrops(B.LAPIS_ORE, toolId(0, 0)).length;
      return { plain, lucky, wood };
    }, X);
    check('lapis ore drops 4-8 lapis (needs a stone pickaxe or better); Fortune III gives more', lp.plain >= 80 && lp.plain <= 160 && lp.lucky > lp.plain * 1.4 && lp.wood === 0, lp);
    // an enchanting table with bookshelves around it
    const tb = await E(X => {
      const w = game.world, tx = X.x, ty = X.y, tz = X.z - 5;
      w.setBlock(tx, ty, tz, B.ENCH_TABLE, 0);
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2 && dz !== 2 && !(dx === 0 && dz === -2)) w.setBlock(tx + dx, ty, tz + dz, B.BOOKSHELF, 0);
      return { shelves: shelfPower(w, tx, ty, tz), tx, ty, tz };
    }, X);
    check('bookshelves around an enchanting table are counted', tb.shelves === 10, tb);
    await E(tb => { const pl = game.player; T.put(tb.tx + 0.5, tb.ty, tb.tz + 2.5); T.aim(tb.tx + 0.5, tb.ty + 0.5, tb.tz + 0.5); }, tb);
    await sleep(1500);
    await shot('enchanting-table');
    await E(() => { T.hold(toolId(3, 3)); game.player.inv[5] = { id: I.LAPIS, count: 10 }; setXp(game.player, 0); T.tap(); });
    await sleep(400);
    const scr = await E(() => ({ kind: ui.inv && ui.inv.kind, opts: document.querySelectorAll('.ench-opt').length }));
    check('tapping the enchanting table opens its screen with three choices', scr.kind === 'ench' && scr.opts === 3, scr);
    // put the sword and some lapis in: with no levels, the choices say what they need
    const e1 = await E(() => {
      const E2 = ui.inv.ench, pl = game.player;
      E2.slots[0] = pl.inv[0]; pl.inv[0] = null; E2.slots[1] = pl.inv[5]; pl.inv[5] = null; refreshInv();
      return Array.from(document.querySelectorAll('.ench-opt')).map(b => ({ text: b.textContent, cant: b.classList.contains('cant') }));
    });
    check('the choices name real sword enchantments, and say you need more levels', e1.length === 3 && e1.every(o => o.cant && /Needs level/.test(o.text)) && e1.every(o => /Sharpness|Knockback|Fire Aspect|Looting|Unbreaking/.test(o.text)), e1);
    await shot('enchanting-screen');
    const e2 = await E(() => {
      const pl = game.player; setXp(pl, totalForLevel(30)); refreshInv();
      const before = pl.xpLevel, opt = enchOptions(ui.inv.ench.slots[0], ui.inv.ench.shelves, pl.enchSeed)[2];
      document.querySelectorAll('.ench-opt')[2].click();
      const it = ui.inv.ench.slots[0];
      return { ench: it.tag && it.tag.ench, opt: opt.ench, lapis: ui.inv.ench.slots[1] && ui.inv.ench.slots[1].count, levels: before - pl.xpLevel, glint: !!document.querySelector('.ench-slots .glint') };
    });
    check('the third choice enchants the sword, costing 3 levels and 3 lapis (and it shimmers)', e2.ench && JSON.stringify(e2.ench) === JSON.stringify(e2.opt) && e2.lapis === 7 && e2.levels === 3 && e2.glint, e2);
    const e3 = await E(() => { const s = ui.inv.ench.slots[0]; game.closeUI(); return { back: game.player.inv.some(q => q && q.id === s.id && q.tag && q.tag.ench), lapis: T.count(I.LAPIS) }; });
    check('closing the table gives the sword and lapis back', e3.back && e3.lapis === 7, e3);
    // what enchantments do
    const fx = await E(X => {
      const pl = game.player, out = {};
      // Sharpness III adds 3 damage
      T.clearMobs(); T.put(X.x + 0.5, X.y, X.z + 0.5);
      const z1 = spawnMob(game, 'zombie', X.x + 0.5, X.y, X.z + 3.5); z1.frozen = 30;
      T.hold(toolId(3, 3), 1, { tag: { ench: [['sharpness', 3]] } }); T.aim(z1.x, z1.y + 1.2, z1.z); pl.attackCd = 0; pl.sprinting = false;
      pl.pickTarget(); game.input.mine = true; game.input.minePressed = true; pl.interact(0.016, false); game.input.mine = false;
      out.sharp = 20 - z1.hp;
      // Efficiency V digs much faster
      out.dig = [breakTime(B.STONE, toolId(1, 0), { id: toolId(1, 0) }), breakTime(B.STONE, toolId(1, 0), { id: toolId(1, 0), tag: { ench: [['efficiency', 5]] } })];
      // Protection IV on all four pieces, and Feather Falling IV
      for (let k = 0; k < 4; k++) pl.inv[36 + k] = { id: I.ARMOR + 0 * 4 + k, count: 1, tag: { ench: [['protection', 4]].concat(k === 3 ? [['feather_falling', 4]] : []) } };
      pl.health = 20; pl.invuln = 0; pl.damage(10, 'fall'); out.fall = 20 - pl.health;
      pl.health = 20; pl.invuln = 0; pl.damage(10, 'zombie', null, pl.x, pl.z - 2); out.hit = 20 - pl.health;
      for (let k = 0; k < 4; k++) pl.inv[36 + k] = null;
      pl.health = 20;
      return out;
    }, X);
    check('Sharpness III adds 3 damage to a sword hit (7 + 3)', fx.sharp === 10, fx);
    check('Efficiency V makes a stone pickaxe dig stone much faster', fx.dig[1] < fx.dig[0] / 4, fx.dig);
    check('Protection IV on leather armor and Feather Falling IV soften falls and hits', fx.fall < 2.1 && fx.hit < 3, fx);
    // Infinity: the bow shoots without using the arrow; Flame: the arrow sets a zombie on fire
    await waitFor(() => game.player.shotCd <= 0, 3000);
    const bw = await E(X => {
      const pl = game.player; T.clearMobs();
      const z = spawnMob(game, 'zombie', X.x + 0.5, X.y, X.z + 6.5); z.frozen = 30;
      T.hold(I.BOW, 1, { tag: { ench: [['infinity', 1], ['flame', 1]] } }); pl.inv[5] = { id: I.ARROW, count: 1 };
      T.aim(z.x, z.y + 1.2, z.z); T.tap();
      return z.nid;
    }, X);
    await sleep(900);
    const bw2 = await E(nid => { const z = game.entities.find(e => e.nid === nid); return { arrows: T.count(I.ARROW), fire: z && z.fireT > 0, hp: z && z.hp }; }, bw);
    check('an Infinity bow keeps its arrow, and a Flame arrow sets the zombie on fire', bw2.arrows === 1 && bw2.fire && bw2.hp < 20, bw2);
    // a Bottle o' Enchanting breaks into experience
    const xb = await E(X => { const pl = game.player; T.clearMobs(); setXp(pl, 0); T.hold(I.XP_BOTTLE, 2); T.aim(X.x + 0.5, X.y - 1, X.z + 2.5); T.tap(); return true; }, X);
    check('a thrown Bottle o\' Enchanting breaks into experience you collect', await waitFor(() => game.player.xp >= 3, 6000), await E(() => ({ xp: game.player.xp, bottles: T.count(I.XP_BOTTLE), orbs: T.ents('xp').length })));
    // cooking gives experience when you take it out
    const ck = await E(() => {
      const pl = game.player; setXp(pl, 0);
      const t = { type: 'furnace', slots: [null, null, { id: I.IRON_INGOT, count: 10 }], burn: 0, burnMax: 0, cook: 0 };
      openInv('furnace', t);
      clickSlot({ arr: t.slots, i: 2, kind: 'furnaceOut' }, 0, true);
      game.closeUI();
      return { xp: pl.xp, ingots: T.count(I.IRON_INGOT) };
    });
    check('taking 10 iron ingots out of a furnace gives about 7 experience', ck.xp >= 6 && ck.xp <= 8 && ck.ingots === 10, ck);
    // experience and enchanted things are saved
    const sv = await E(() => { const pl = game.player; setXp(pl, totalForLevel(12) + 5); pl.inv[8] = { id: I.ARMOR + 3 * 4, count: 1, tag: { ench: [['respiration', 2]] } }; game.save(); const d = JSON.parse(store.get(saveKey('valley'))).player; return { xp: d.xp, want: totalForLevel(12) + 5, inv8: d.inv[8] }; });
    check('experience and enchantments are saved with the world', sv.xp === sv.want && sv.inv8.tag.ench[0][0] === 'respiration', sv);
    // lapis ore is found deep underground
    const ores = await E(() => { let n = 0; for (const c of game.world.chunks.values()) for (let i = 0; i < 32 * 256; i++) if (c.blocks[i] === B.LAPIS_ORE) n++; return { n, chunks: game.world.chunks.size }; });
    check('lapis lazuli ore is in the ground', ores.n > 0, ores);
  }

  if (on('books')) {
    // ---------- sugar cane, paper, books and signs ----------
    const K = area(80, 0);
    await goto(K);
    await E(K => { T.stage(K.x, K.y, K.z, 10); T.clearMobs(); T.put(K.x + 0.5, K.y, K.z + 0.5); for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.setMode('survival'); }, K);
    const rc = await E(() => {
      const g = (rows, key) => { const grid = new Array(9).fill(0); rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== ' ') grid[y * 3 + x] = key[r[x]]; }); return matchRecipe(grid, 3); };
      return {
        paper: g(['CCC'], { C: B.SUGAR_CANE }), sugar: matchRecipe([B.SUGAR_CANE, 0, 0, 0], 2), book: matchRecipe([I.PAPER, I.PAPER, I.PAPER, I.LEATHER], 2),
        quill: matchRecipe([I.FEATHER, I.BOOK, I.COAL, 0], 2), sign: g(['PPP', 'PPP', ' S '], { P: B.OAK_PLANKS, S: I.STICK }), shelf: g(['PPP', 'KKK', 'PPP'], { P: B.SPRUCE_PLANKS, K: I.BOOK }),
        table: g([' B ', 'DOD', 'OOO'], { B: I.BOOK, D: I.DIAMOND, O: B.OBSIDIAN }),
      };
    });
    check('paper, sugar, books, book and quill, signs, bookshelves and the enchanting table can be crafted',
      rc.paper.out === I_('PAPER') && rc.paper.count === 3 && rc.sugar.out === I_('SUGAR') && rc.book.out === I_('BOOK') && rc.quill.out === I_('WRITABLE_BOOK') && rc.sign.out === 98 && rc.sign.count === 3 && rc.shelf.out === 40 && rc.table.out === 99, rc);
    function I_(n) { return { PAPER: 325, SUGAR: 324, BOOK: 326, WRITABLE_BOOK: 327 }[n]; }
    // sugar cane needs water next to the ground it is on, and grows up to three tall
    const cn = await E(K => {
      const w = game.world, x = K.x + 3, y = K.y, z = K.z;
      w.setBlock(x, y - 1, z, B.GRASS, 0); w.setBlock(x + 4, y - 1, z, B.GRASS, 0);
      const dry = w.canStay(x + 4, y, z, B.SUGAR_CANE, 0);
      w.setBlock(x + 1, y - 1, z, B.WATER, 8);
      const wet = w.canStay(x, y, z, B.SUGAR_CANE, 0);
      w.setBlock(x, y, z, B.SUGAR_CANE, 0);
      for (let i = 0; i < 5; i++) w.growCane(x, y + Math.min(i, 2), z);
      let tall = 0; while (w.getBlock(x, y + tall, z) === B.SUGAR_CANE) tall++;
      w.setBlock(x, y, z, B.AIR, 0);
      return { dry, wet, tall, left: w.getBlock(x, y + 1, z) === B.SUGAR_CANE };
    }, K);
    check('sugar cane only grows beside water, up to three tall, and breaking the bottom brings the rest down', !cn.dry && cn.wet && cn.tall === 3 && !cn.left, cn);
    const nat = await E(() => { let n = 0; for (const c of game.world.chunks.values()) for (const i of c.blocks.keys()) if (c.blocks[i] === B.SUGAR_CANE) n++; return n; });
    check('sugar cane grows by the water in the world', nat > 0, nat);
    // write in a book and quill, then sign it
    await E(() => { T.hold(I.WRITABLE_BOOK); T.aim(game.player.x, game.player.y + 3, game.player.z - 6); T.tap(); });
    await sleep(400);
    check('tapping Place with a book and quill opens it to write in', await E(() => ui.screen === 'scr-book' && !el('book-edit').hidden));
    await p.fill('#book-edit', 'Once upon a time there was a creeper.');
    await p.click('#btn-book-next');
    await p.fill('#book-edit', 'It liked flowers. The End.');
    await sleep(200);
    await shot('book-writing');
    await p.click('#btn-book-done');
    const wb = await E(() => ({ tag: game.player.inv[0].tag, screen: ui.screen }));
    check('the pages are kept in the book', wb.tag && wb.tag.pages.length === 2 && /creeper/.test(wb.tag.pages[0]) && wb.screen === null, wb);
    await E(() => { T.tap(); });
    await sleep(300);
    await p.click('#btn-book-sign');
    await p.fill('#book-title-in', 'The Creeper');
    await p.click('#btn-book-sign-ok');
    const sb = await E(() => ({ st: game.player.inv[0], name: stackName(game.player.inv[0]) }));
    check('signing it makes a Written Book with its title, author and pages', sb.st.id === I_('WRITTEN') || (sb.st.id === 328 && sb.st.tag.book.title === 'The Creeper' && sb.st.tag.book.author === 'Declan' && sb.st.tag.book.pages[1] === 'It liked flowers. The End.' && sb.name === 'The Creeper'), sb);
    await E(() => { T.tap(); });
    await sleep(300);
    const rd = await E(() => ({ screen: ui.screen, text: el('book-page').textContent, by: el('book-by').textContent, edit: !el('book-edit').hidden }));
    check('a written book opens to read (not to write in)', rd.screen === 'scr-book' && /creeper/.test(rd.text) && /Declan/.test(rd.by) && !rd.edit, rd);
    await shot('book-reading');
    await p.click('#btn-book-done');
    // story books: the librarian sells them and village chests have them
    const st = await E(() => {
      const t = { type: 'chest', slots: new Array(27).fill(null) }; fillVillageChest(t);
      const books = t.slots.filter(s => s && s.id === I.WRITTEN_BOOK);
      const lib = tradesFor('librarian', 1).some(tr => tr.get[0] === I.WRITTEN_BOOK && tr.get[2] === 'story');
      return { books: books.length, title: books[0] && books[0].tag.book.title, pages: books[0] && books[0].tag.book.pages.length, lib, n: STORY_BOOKS.length, ascii: STORY_BOOKS.every(b => /^[\x20-\x7e\n]*$/.test(b.pages.join('') + b.title)) };
    });
    check('village chests hold story books, and librarians sell them', st.books >= 1 && st.pages >= 4 && st.lib && st.n >= 8 && st.ascii, st);
    // a village house chest fills the first time it is opened, and only once
    const vc = await E(K => {
      const w = game.world, x = K.x - 3, y = K.y, z = K.z;
      w.setBlock(x, y, z, B.CHEST, 2 | 8);
      const t = w.getTile(x, y, z, 'chest'), n = t.slots.filter(Boolean).length, data = w.getData(x, y, z);
      w.tiles.delete(tileKey(x, y, z));
      const t2 = w.getTile(x, y, z, 'chest');
      w.setBlock(x, y, z, B.AIR, 0);
      return { n, data, again: t2.slots.filter(Boolean).length };
    }, K);
    check('a village chest is filled the first time it is opened, and not again', vc.n >= 4 && vc.data === 2 && vc.again === 0, vc);
    // signs: on the ground, turned to face you; then on a wall
    const sg = await E(K => {
      const w = game.world, pl = game.player; T.clearMobs();
      T.put(K.x + 0.5, K.y, K.z + 3.5); T.hold(B.SIGN, 3);
      T.aim(K.x + 0.5, K.y + 0.01, K.z + 0.5); T.tap();
      return true;
    }, K);
    await sleep(400);
    const s1 = await E(K => ({ block: game.world.getBlock(K.x, K.y, K.z), data: game.world.getData(K.x, K.y, K.z), screen: ui.screen }), K);
    check('a sign put on the ground stands facing you, and the sign screen opens', s1.block === 98 && s1.data < 16 && s1.screen === 'scr-sign', s1);
    const lines = await p.$$('.sign-line');
    await lines[0].fill('Welcome to');
    await lines[1].fill("Declan's House");
    await lines[3].fill('No creepers!');
    await p.click('#btn-sign-done');
    const s2 = await E(K => ({ lines: signLines(game.world, K.x, K.y, K.z), screen: ui.screen, left: T.count(B.SIGN) }), K);
    check('the words are on the sign', s2.lines && s2.lines[0] === 'Welcome to' && s2.lines[1] === "Declan's House" && s2.lines[2] === '' && s2.lines[3] === 'No creepers!' && s2.screen === null && s2.left === 2, s2);
    await E(K => { const w = game.world; for (let y = K.y; y < K.y + 3; y++) for (let x = K.x - 2; x <= K.x + 2; x++) w.setBlock(x, y, K.z - 2, B.STONE_BRICKS, 0); T.put(K.x + 2.5, K.y, K.z + 1.5); T.aim(K.x + 2.5, K.y + 1.5, K.z - 1.6); T.tap(); }, K);
    await sleep(400);
    const s3 = await E(K => ({ block: game.world.getBlock(K.x + 2, K.y + 1, K.z - 1), data: game.world.getData(K.x + 2, K.y + 1, K.z - 1), screen: ui.screen }), K);
    check('a sign put on a wall hangs there', s3.block === 98 && s3.data === 16 && s3.screen === 'scr-sign', s3);
    const l2 = await p.$$('.sign-line');
    await l2[1].fill('Diamonds ->');
    await p.click('#btn-sign-done');
    await E(K => { T.put(K.x + 0.5, K.y, K.z + 4.5); T.aim(K.x + 1, K.y + 0.8, K.z - 0.5); }, K);
    await sleep(1200);
    await shot('signs');
    // tap a sign to change what it says
    await E(K => { T.hold(null); T.aim(K.x + 0.5, K.y + 0.8, K.z + 0.5); T.tap(); }, K);
    await sleep(300);
    const s4 = await E(() => ({ screen: ui.screen, v: document.querySelectorAll('.sign-line')[1].value }));
    check('tapping a sign opens it again with its words', s4.screen === 'scr-sign' && s4.v === "Declan's House", s4);
    await p.click('#btn-sign-done');
    // breaking the wall drops the wall sign; the words go with it
    const s5 = await E(K => {
      const w = game.world; T.clearMobs();
      w.setBlock(K.x + 2, K.y + 1, K.z - 2, B.AIR, 0);
      return { sign: w.getBlock(K.x + 2, K.y + 1, K.z - 1), tile: !!w.tiles.get(tileKey(K.x + 2, K.y + 1, K.z - 1)), dropped: T.ents('item').some(e => e.id === B.SIGN) };
    }, K);
    check('a wall sign falls off when its wall is broken, and its words go too', s5.sign === 0 && !s5.tile && s5.dropped, s5);
    // signs and books are saved
    const sv = await E(K => { game.save(); const d = JSON.parse(store.get(saveKey('valley'))); return { tile: d.world.tiles[K.x + ',' + K.y + ',' + K.z], book: d.player.inv[0] }; }, K);
    check('sign words are saved with the world', sv.tile && sv.tile.type === 'sign' && sv.tile.lines[3] === 'No creepers!', sv.tile);
    // the village near the start has a librarian (a house with bookshelves) and an armorer (a smithy)
    const vg = await E(() => {
      const v = game.gen.findVillage(game.mapId, game.seed, game.player.x, game.player.z, []);
      const lib = tradesFor('librarian', 3).length, arm = tradesFor('armorer', 3).some(tr => armorOf(tr.get[0]));
      return { v: !!v, lib, arm, profs: VILLAGER_PROFS.slice(6, 8) };
    });
    check('librarians and armorers have trades', vg.lib >= 6 && vg.arm && vg.profs.join() === 'librarian,armorer', vg);
  }

  if (on('potions')) {
    // ---------- potions, brewing and effects ----------
    const Q = area(120, 0);
    await goto(Q);
    await E(Q => { T.stage(Q.x, Q.y, Q.z, 10); T.clearMobs(); T.put(Q.x + 0.5, Q.y, Q.z + 0.5); for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.setMode('survival'); game.player.effects = {}; }, Q);
    const rc = await E(() => ({
      bottle: matchRecipe([B.GLASS, 0, B.GLASS, 0, B.GLASS, 0, 0, 0, 0], 3), stand: matchRecipe([0, I.IRON_INGOT, 0, B.COBBLE, B.MOSSY_COBBLE, B.COBBLE, 0, 0, 0], 3),
    }));
    check('glass bottles and brewing stands can be crafted', rc.bottle && rc.bottle.out === 330 && rc.bottle.count === 3 && rc.stand && rc.stand.out === 100, rc);
    // fill a bottle at some water
    await E(Q => { const w = game.world; for (let dx = -1; dx <= 1; dx++) w.setBlock(Q.x + dx, Q.y - 1, Q.z - 1, B.WATER, 0); T.hold(I.GLASS_BOTTLE, 3); T.aim(Q.x + 0.5, Q.y - 0.5, Q.z - 0.5); T.tap(); }, Q);
    await sleep(400);
    const fb = await E(() => ({ bottles: T.count(I.GLASS_BOTTLE), water: T.count(I.POTION) }));
    check('tapping water with a glass bottle fills it', fb.bottles === 2 && fb.water === 1, fb);
    // brew: three water bottles and sugar make potions of swiftness
    await E(Q => { const w = game.world; w.setBlock(Q.x + 2, Q.y, Q.z - 4, B.BREWING_STAND, 0); T.put(Q.x + 2.5, Q.y, Q.z - 1.5); T.aim(Q.x + 2.5, Q.y + 0.5, Q.z - 3.5); T.hold(null); T.tap(); }, Q);
    await sleep(400);
    const bs = await E(() => ({ kind: ui.inv && ui.inv.kind, slots: document.querySelectorAll('.brew .slot').length }));
    check('tapping a brewing stand opens it (three bottle slots and one for the ingredient)', bs.kind === 'brew' && bs.slots === 4, bs);
    await E(() => { const t = ui.inv.tile; for (let i = 0; i < 3; i++) t.slots[i] = { id: I.POTION, count: 1 }; t.slots[3] = { id: I.SUGAR, count: 2 }; ui.inv.book = true; buildInv(); });
    await sleep(2500);
    await shot('brewing');
    check('the brew bubbles along', await E(() => ui.inv && ui.inv.tile.t > 1 && parseFloat(el('brew-fill').style.height) > 5));
    check('after a little while they are potions of swiftness, and one sugar is used', await waitFor(() => ui.inv && ui.inv.tile.slots[0] && ui.inv.tile.slots[0].id === I.POTION + 3, 12000), await E(() => ui.inv && ui.inv.tile.slots));
    const b2 = await E(() => { const t = ui.inv.tile; return { p: t.slots.slice(0, 3).map(s => s && s.id), sugar: t.slots[3] && t.slots[3].count }; });
    check('all three bottles brewed', b2.p.every(id => id === I_POT(3)) && b2.sugar === 1, b2);
    function I_POT(k, sp) { return (sp ? 390 : 370) + k; }
    // gunpowder makes splash potions
    await E(() => { const t = ui.inv.tile; t.slots[3] = { id: I.GUNPOWDER, count: 1 }; stepBrew(t, 8.5); });
    const sp = await E(() => ui.inv.tile.slots.map(s => s && s.id));
    check('brewing with gunpowder makes splash potions', sp[0] === I_POT(3, true) && sp[1] === I_POT(3, true) && !sp[3], sp);
    await E(() => game.closeUI());
    // drink a potion of swiftness: faster for 3 minutes, and the bottle is left
    await E(() => { const pl = game.player; T.hold(I.POTION + 3); T.aim(pl.x, pl.y + 6, pl.z - 1); game.input.use = true; game.input.usePressed = true; });
    await waitFor(() => hasEffect(game.player, 'swiftness'), 4000);
    await E(() => { game.input.use = false; });
    await sleep(600);
    const dr = await E(() => ({ fx: game.player.effects.swiftness && Math.round(game.player.effects.swiftness.t), hand: game.player.inv[0] && game.player.inv[0].id, hud: el('effects').textContent }));
    check('drinking a potion of swiftness gives Swiftness for 3 minutes and leaves the bottle', dr.fx >= 175 && dr.fx <= 180 && dr.hand === 330 && /Swiftness [23]:[0-5][0-9]/.test(dr.hud), dr);
    await shot('effects');
    // what the effects do
    const ef = await E(Q => {
      const pl = game.player, out = {}, w = game.world;
      // night vision: everything bright
      giveEffect(pl, 'night_vision', 30);
      out.nv = true;
      // fire resistance: lava doesn't hurt
      pl.effects = {}; giveEffect(pl, 'fire_resistance', 30); pl.health = 20; pl.invuln = 0; pl.damage(4, 'lava'); out.fire = pl.health;
      // water breathing: no air lost under water
      pl.effects = {}; giveEffect(pl, 'water_breathing', 30); pl.air = 10; pl.headInWater = true; for (let i = 0; i < 60; i++) pl.vitals(0.1, false); out.air = pl.air;
      // poison: hurts down to half a heart, never further; a water bottle washes it off
      pl.effects = {}; pl.headInWater = false; pl.health = 4; pl.invuln = 0; giveEffect(pl, 'poison', 30);
      for (let i = 0; i < 100; i++) { pl.invuln = 0; tickEffects(pl, 0.1); }
      out.poison = pl.health;
      potionOnPlayer(pl, 0, 1); out.washed = !hasEffect(pl, 'poison');
      // invisibility: a zombie a few blocks away can't see you
      pl.effects = {}; pl.health = 20; T.clearMobs();
      const z = spawnMob(game, 'zombie', pl.x + 5, pl.y, pl.z); z.frozen = 30;
      out.seen = !!mobTarget(game, z);
      giveEffect(pl, 'invisibility', 30); out.hidden = !mobTarget(game, z);
      z.x = pl.x + 1.5; out.close = !!mobTarget(game, z);
      pl.effects = {};
      return out;
    }, Q);
    check('Fire Resistance: lava does not hurt', ef.fire === 20, ef);
    check('Water Breathing: no air is lost under water', ef.air === 10, ef);
    check('Poison hurts but never below half a heart, and a water bottle washes it off', ef.poison === 1 && ef.washed, ef);
    check('Invisibility: monsters only notice you right next to them', ef.seen && ef.hidden && ef.close, ef);
    // splash potions: thrown, they splash creatures (poison a zombie; healing hurts zombies) and players nearby
    const sp1 = await E(Q => {
      const pl = game.player; T.clearMobs(); pl.health = 10;
      const z = spawnMob(game, 'zombie', Q.x + 0.5, Q.y, Q.z - 4.5); z.frozen = 30;
      const c = spawnMob(game, 'cow', Q.x + 2.5, Q.y, Q.z - 4.5);
      T.hold(I.SPLASH + 10); T.aim(z.x, z.y + 0.5, z.z); T.tap();
      return { z: z.nid, c: c.nid };
    }, Q);
    await sleep(1200);
    const sp2 = await E(n => { const z = game.entities.find(e => e.nid === n.z), c = game.entities.find(e => e.nid === n.c); return { zp: z && z.effects && z.effects.poison > 0, cp: c && c.effects && c.effects.poison > 0, used: !T.count(I.SPLASH + 10) }; }, sp1);
    check('a thrown splash potion of poison poisons the creatures where it lands', sp2.zp && sp2.cp && sp2.used, sp2);
    const sp3 = await E(Q => {
      const pl = game.player; T.clearMobs(); pl.health = 10; pl.effects = {};
      const z = spawnMob(game, 'zombie', pl.x + 1.5, pl.y, pl.z); z.frozen = 30;
      splashPotion(game, pl.x + 1, pl.y + 0.5, pl.z, 1);
      return { hp: z.hp, me: pl.health };
    }, Q);
    check('a splash of healing heals players nearby and hurts zombies', sp3.hp < 20 && sp3.me > 14, sp3);
    // a pufferfish poisons whoever eats it; magma cubes drop magma cream
    const pf = await E(() => { const pl = game.player; pl.effects = {}; pl.food = 10; T.hold(I.PUFFERFISH); game.input.use = true; game.input.usePressed = true; return true; });
    check('eating a pufferfish poisons you', await waitFor(() => hasEffect(game.player, 'poison'), 4000));
    await E(() => { game.input.use = false; game.player.effects = {}; });
    check('magma cubes can drop magma cream', await E(() => MOB_DEFS.magma.drops.some(d => d[0] === I.MAGMA_CREAM)));
    // effects are saved
    const sv = await E(() => { const pl = game.player; giveEffect(pl, 'leaping', 100); game.save(); return JSON.parse(store.get(saveKey('valley'))).player.effects; });
    check('effects are saved with the world', sv && sv.leaping >= 99, sv);
    await E(() => { game.player.effects = {}; });
  }

  if (on('fish')) {
    // ---------- fish and fishing ----------
    const F = area(160, 0);
    await goto(F);
    // a big pool, two deep, with a little stone stand in the middle to fish from
    await E(F => {
      const w = game.world;
      for (let dx = -15; dx <= 15; dx++) for (let dz = -15; dz <= 15; dz++) {
        const x = F.x + dx, z = F.z + dz;
        w.setBlock(x, F.y - 4, z, B.GLASS, 0); w.setBlock(x, F.y - 3, z, B.WATER, 0); w.setBlock(x, F.y - 2, z, B.WATER, 0);
        for (let y = F.y - 1; y < F.y + 5; y++) if (w.getBlock(x, y, z) !== B.AIR) w.setBlock(x, y, z, B.AIR, 0);
      }
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) w.setBlock(F.x + dx, F.y - 1, F.z + dz, B.STONE, 0);
      T.clearMobs(); T.put(F.x + 0.5, F.y, F.z + 0.5); for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.setMode('survival'); game.player.effects = {};
      game.player.health = 20; game.player.food = 20;
    }, F);
    await sleep(500);
    const rc = await E(() => ({ rod: matchRecipe([0, 0, I.STICK, 0, I.STICK, I.STRING, I.STICK, 0, I.STRING], 3), cod: SMELT[I.COD], salmon: SMELT[I.SALMON],
      eggs: ['cod', 'salmon', 'tropical', 'pufferfish'].every(m => EGG_MOBS.includes(m)), fisher: VILLAGER_PROFS[VILLAGER_PROFS.length - 1], trades: tradesFor('fisherman', 1).map(t => t.get[0]) }));
    check('fishing rods can be crafted, fish can be cooked, and there are fish spawn eggs', rc.rod && rc.rod.out === 332 && rc.cod === 334 && rc.salmon === 336 && rc.eggs, rc);
    check('fishermen sell fishing rods and cooked fish', rc.fisher === 'fisherman' && rc.trades.includes(332) && rc.trades.includes(334), rc);
    // schools of fish turn up in water nearby
    const sp = await E(() => { for (let i = 0; i < 30; i++) fishSpawnTick(game); return game.entities.filter(e => e.mob && !e.removed && MOB_DEFS[e.type].fish).map(e => [e.type, Math.round(e.y * 10) / 10]); });
    check('fish turn up in the water', sp.length >= 3 && sp.every(f => f[1] > 95.5 && f[1] < 99), sp);
    // fish swim about but stay in the water
    const nids = await E(F => { T.clearMobs(); return ['cod', 'salmon', 'tropical', 'pufferfish'].map((t, i) => spawnMob(game, t, F.x + 4.5 + i * 1.5, F.y - 2.6, F.z - 4.5, { variant: 2 }).nid); }, F);
    await sleep(3000);
    const sw = await E(([F, nids]) => game.entities.filter(e => nids.includes(e.nid) && !e.removed).map(e => ({ t: e.type, inW: game.world.getBlock(Math.floor(e.x), Math.floor(e.y + e.h * 0.5), Math.floor(e.z)) === B.WATER, moved: Math.hypot(e.x - F.x - 4.5, e.z - F.z + 4.5) > 0.3, hp: e.hp })), [F, nids]);
    check('fish swim about and stay in the water', sw.length === 4 && sw.every(f => f.inW && f.hp === 3) && sw.some(f => f.moved), sw);
    await E(F => { T.aim(F.x + 6, F.y - 2.5, F.z - 4.5); game.player.pitch = Math.min(game.player.pitch, -0.6); }, F);
    await sleep(600);
    await shot('fish');
    // a fish out of the water flops about and dries out
    const lf = await E(F => {   // (in a little stone pen, so it can't flop back into the water)
      const w = game.world; for (const [dx, dz] of [[0, 1], [2, 1], [1, 0], [1, 2]]) w.setBlock(F.x + dx, F.y, F.z + dz, B.STONE, 0);
      const f = spawnMob(game, 'cod', F.x + 1.5, F.y, F.z + 1.5); return f.nid;
    }, F);
    await waitFor(n => { const f = game.entities.find(e => e.nid === n); return !f || f.dead || f.removed || f.hp < 3; }, 10000, lf);
    const ld = await E(n => { const f = game.entities.find(e => e.nid === n); return f ? { hp: f.hp, dead: !!f.dead || f.removed } : { gone: true }; }, lf);
    check('a fish out of the water flops about and gets hurt', ld.gone || ld.dead || ld.hp < 3, ld);
    await E(F => { const w = game.world; for (const [dx, dz] of [[0, 1], [2, 1], [1, 0], [1, 2]]) w.setBlock(F.x + dx, F.y, F.z + dz, B.AIR, 0); }, F);
    // a pufferfish puffs up when you come close, and stings
    const pf = await E(() => {
      const pl = game.player; pl.health = 20; pl.invuln = 0; pl.effects = {};
      const e = spawnMob(game, 'pufferfish', pl.x + 0.7, pl.y + 0.9, pl.z);
      const before = e.puff || 0;
      for (let i = 0; i < 20; i++) pufferTick(game, e, 0.05);
      const r = { before, puff: e.puff, hp: pl.health, poison: hasEffect(pl, 'poison') };
      e.removed = true; pl.effects = {};
      return r;
    });
    check('a pufferfish puffs up when someone is close, and stings with poison', pf.before === 0 && pf.puff === 1 && pf.hp < 20 && pf.poison, pf);
    // fishing: cast, wait for a bite, reel in a catch
    await E(F => { T.clearMobs(); T.put(F.x + 0.5, F.y, F.z + 0.5); T.hold(I.FISHING_ROD); T.aim(F.x + 0.5, F.y - 2, F.z - 6); T.tap(); }, F);
    check('tapping with a rod casts the float out', await waitFor(() => game.player.bobber && game.player.bobber.state === 'water', 4000), await E(() => game.player.bobber && { s: game.player.bobber.state, y: game.player.bobber.y }));
    await sleep(1000);
    const bob = await E(() => { const b = game.player.bobber; return { x: b.x, y: b.y, z: b.z, wait: b.waitT }; });
    check('the float sits on top of the water', bob.y > 98.6 && bob.y < 99 && bob.wait >= 0.5, bob);
    await shot('fishing');
    await E(() => { game.view = 1; });
    await sleep(500);
    await shot('fishing-back');
    await E(() => { game.view = 0; });
    // reeling in with nothing on the line catches nothing
    const n0 = await E(() => { T.tap(); return true; });
    await sleep(300);
    const nr = await E(() => {   // (leaves left hanging by the digging can drop saplings: those don't count)
      const catches = [I.COD, I.SALMON, I.TROPICAL_FISH, I.PUFFERFISH, I.BOW, I.FISHING_ROD, I.WRITTEN_BOOK, I.EMERALD, I.LAPIS, I.XP_BOTTLE, I.STICK, I.STRING, I.ROTTEN_FLESH, I.GLASS_BOTTLE, I.LEATHER, armorId(0, 3)];
      return { bob: !!game.player.bobber, items: T.ents('item').filter(e => catches.includes(e.id)).length + T.ents('xp').length, dmg: game.player.inv[0].dmg || 0 };
    });
    check('reeling in before a bite catches nothing', !nr.bob && nr.items === 0 && nr.dmg === 0, nr);
    await sleep(400);
    await E(() => T.tap());
    await waitFor(() => game.player.bobber && game.player.bobber.state === 'water', 4000);
    await E(() => { game.player.bobber.waitT = 0.05; });
    check('a fish bites: the float dips under', await waitFor(() => game.player.bobber && game.player.bobber.biteT > 0, 2000));
    const xp0 = await E(() => { const pl = game.player, held = pl.inv[0]; pl.inv[0] = null; const n = pl.inv.filter(Boolean).length; pl.inv[0] = held; T.tap(); return { xp: pl.xp || 0, n }; });
    const caught = await waitFor(n => game.player.inv.slice(1).filter(Boolean).length > n, 5000, xp0.n);
    await waitFor(x => game.player.xp > x, 4000, xp0.xp);
    const ct = await E(() => ({ inv: game.player.inv.slice(1, 36).filter(Boolean).map(s => s.id), items: T.ents('item').map(e => e.id), xp: game.player.xp, dmg: game.player.inv[0] && game.player.inv[0].dmg, toast: window.__toasts.slice(-2) }));
    check('reeling in after a bite pulls the catch out of the water to you, with some XP', caught && ct.xp > xp0.xp && ct.dmg === 1, ct);
    // what you can catch
    const lt = await E(() => {
      const tally = luck => { const o = { fish: 0, treasure: 0, junk: 0 }; for (let i = 0; i < 4000; i++) { const l = fishingLoot(luck); if ([I.COD, I.SALMON, I.TROPICAL_FISH, I.PUFFERFISH].includes(l.id)) o.fish++; else if ([I.BOW, I.FISHING_ROD, I.WRITTEN_BOOK, I.EMERALD, I.LAPIS, I.XP_BOTTLE].includes(l.id)) o.treasure++; else o.junk++; } return o; };
      const ench = []; for (let i = 0; i < 200; i++) { const l = fishingLoot(3); if (l.id === I.BOW || l.id === I.FISHING_ROD) ench.push(l.tag.ench.length); }
      return { plain: tally(0), lucky: tally(3), ench: ench.length && ench.every(n => n >= 1 && n <= 2) };
    });
    check('mostly fish, sometimes treasure or junk; Luck of the Sea finds more treasure', lt.plain.fish > 3200 && lt.plain.treasure > 100 && lt.plain.junk > 250 && lt.lucky.treasure > lt.plain.treasure * 1.6 && lt.lucky.junk < lt.plain.junk && lt.ench, lt);
    // switching away from the rod pulls the float back in
    await E(() => T.tap());
    await waitFor(() => game.player.bobber && game.player.bobber.state === 'water', 4000);
    await E(() => { game.player.inv[1] = { id: B.DIRT, count: 1 }; game.player.sel = 1; });
    check('putting the rod away pulls the float back in', await waitFor(() => !game.player.bobber && !T.ents('bobber').length, 2000));
    // cooked fish are food
    const ck = await E(() => { const pl = game.player; pl.food = 10; pl.sel = 0; T.hold(I.COOKED_COD); game.input.use = true; game.input.usePressed = true; return true; });
    check('eating cooked cod fills you up', await waitFor(() => game.player.food > 10, 4000));
    await E(() => { game.input.use = false; });
  }

  if (on('boats')) {
    // ---------- boats and submarines ----------
    const Bt = area(200, 0);
    await goto(Bt);
    // a deep pool (four blocks of water) with a stone shore along one side
    await E(Bt => {
      const w = game.world;
      for (let dx = -12; dx <= 12; dx++) for (let dz = -20; dz <= 9; dz++) {
        const x = Bt.x + dx, z = Bt.z + dz, shore = dz >= 5;
        w.setBlock(x, Bt.y - 6, z, B.GLASS, 0);
        for (let y = Bt.y - 5; y <= Bt.y - 1; y++) w.setBlock(x, y, z, shore ? B.STONE : y <= Bt.y - 2 ? B.WATER : B.AIR, 0);
        for (let y = Bt.y; y < Bt.y + 6; y++) if (w.getBlock(x, y, z) !== B.AIR) w.setBlock(x, y, z, B.AIR, 0);
      }
      T.clearMobs(); for (const e of game.entities) if (e.vehicle) e.removed = true;
      T.put(Bt.x + 0.5, Bt.y, Bt.z + 6.5, { yaw: 0, pitch: 0 }); for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.setMode('survival');
      game.player.health = 20; game.player.food = 20; game.player.air = 10;
      window.__sfx = []; const s0 = sfx; sfx = (...a) => { window.__sfx.push(a[0]); return s0(...a); };
    }, Bt);
    await sleep(500);
    const rc = await E(() => ({ boat: matchRecipe([B.OAK_PLANKS, 0, B.BIRCH_PLANKS, B.OAK_PLANKS, B.SPRUCE_PLANKS, B.OAK_PLANKS, 0, 0, 0], 3), sub: matchRecipe([0, B.GLASS, 0, I.IRON_INGOT, I.COAL, I.IRON_INGOT, I.IRON_INGOT, I.IRON_INGOT, I.IRON_INGOT], 3) }));
    check('boats (planks) and submarines (iron, glass and coal) can be crafted', rc.boat && rc.boat.out === 339 && rc.sub && rc.sub.out === 340, rc);
    // put a boat on the water
    await E(Bt => { T.hold(I.BOAT); T.aim(Bt.x + 0.5, Bt.y - 1.5, Bt.z + 2.5); T.tap(); }, Bt);
    await sleep(500);
    const bp = await E(Bt => { const b = T.ents('boat')[0]; return b ? { y: b.y, z: b.z, afloat: b.afloat, held: game.player.inv[0], top: Bt.y - 2 + 0.875 } : null; }, Bt);
    check('tapping water with a boat puts it on the water, floating', bp && bp.afloat && Math.abs(bp.y - bp.top - 0.03) < 0.06 && !bp.held, bp);
    // get in, row forward and turn
    await E(Bt => { const b = T.ents('boat')[0]; T.aim(b.x, b.y + 0.3, b.z); T.tap(); }, Bt);
    await sleep(400);
    const in1 = await E(() => ({ riding: game.player.riding && game.player.riding.type, y: game.player.y }));
    check('tapping the boat gets you in', in1.riding === 'boat', in1);
    const r0 = await E(() => { const b = game.player.riding; game.input.joyY = 1; return { z: b.z, x: b.x }; });
    await waitFor(z => game.player.riding && game.player.riding.z < z - 2.5, 8000, r0.z);
    const r1 = await E(() => { const b = game.player.riding; return { z: b.z, x: b.x, v: Math.hypot(b.vx, b.vz), pz: game.player.z, wheel: b.wheel, afloat: b.afloat }; });
    check('pushing forward rows the boat along (and you with it)', r0.z - r1.z > 2 && Math.abs(r1.pz - r1.z) < 0.1 && r1.wheel > 0 && r1.afloat, { r0, r1 });
    await shot('boat');
    const t0 = await E(() => { game.input.joyY = 0; game.input.joyX = 1; return { yaw: game.player.riding.yaw, look: game.player.yaw }; });
    await waitFor(y => game.player.riding && y - game.player.riding.yaw > 0.6, 8000, t0.yaw);
    const t1 = await E(() => { game.input.joyX = 0; return { yaw: game.player.riding.yaw, look: game.player.yaw }; });
    const turned = t0.yaw - t1.yaw, looked = t0.look - t1.look;
    check('left and right turn the boat, and the view turns with it', turned > 0.5 && Math.abs(turned - looked) < 0.05, { turned, looked });
    await E(() => { game.view = 1; });
    await sleep(600);
    await shot('boat-back');
    await E(() => { game.view = 0; });
    check('rowing splashes', await E(() => window.__sfx.includes('paddle')));
    // fishing from a boat works
    await E(() => { game.player.inv[0] = { id: I.FISHING_ROD, count: 1 }; game.player.sel = 0; T.aim(game.player.x, game.player.y, game.player.z - 6); T.tap(); });
    const fb = await waitFor(() => game.player.bobber && game.player.bobber.state === 'water', 6000);
    await sleep(500);
    check('you can fish from a boat', fb && await E(() => !!game.player.bobber && !game.player.bobber.removed), await E(() => { const pl = game.player, b = pl.bobber, v = pl.riding; return { b: b && [b.state, b.x, b.y, b.z, b.removed], v: v && [v.x, v.y, v.z], held: pl.heldId(), cd: pl.useCd, pitch: pl.pitch }; }));
    await E(() => { T.tap(); game.player.inv[0] = null; });
    // sneak to get out: into the water beside it, out here
    await E(() => { game.input.sneak = false; });
    await sleep(150);
    await E(() => { game.input.sneak = true; });
    await sleep(300);
    const out1 = await E(() => { game.input.sneak = false; const b = T.ents('boat')[0], pl = game.player; return { riding: !!pl.riding, d: Math.hypot(pl.x - b.x, pl.z - b.z), inWater: pl.inWater }; });
    check('sneak gets you out (into the water, if there is no land)', !out1.riding && out1.d > 0.8 && out1.d < 2.5, out1);
    // break it: two hits in Survival, and it drops back as a boat
    const br = await E(() => {
      const b = T.ents('boat')[0], pl = game.player, inp = game.input; inp.use = false;
      T.put(b.x + 1.6, b.y + 0.6, b.z, { flying: true }); T.aim(b.x, b.y + 0.25, b.z);
      const tg = [];
      for (let i = 0; i < 2; i++) { pl.attackCd = 0; pl.pickTarget(); tg.push(pl.targetEnt === b); inp.mine = true; inp.minePressed = true; pl.interact(0.016, false); inp.mine = false; }
      return { tg, boats: T.ents('boat').length, item: T.ents('item').some(e => e.id === I.BOAT) || T.count(I.BOAT) > 0 };
    });
    check('two hits break a boat, and it drops back as a boat', br.boats === 0 && br.item, br);
    // a submarine: put it in, climb in, look down and push forward to dive
    await E(Bt => { T.clearMobs(); T.put(Bt.x + 0.5, Bt.y, Bt.z + 6.5, { yaw: 0, pitch: 0, flying: false }); T.hold(I.SUBMARINE); T.aim(Bt.x + 0.5, Bt.y - 1.5, Bt.z + 2.5); T.tap(); }, Bt);
    await sleep(500);
    const sp0 = await E(Bt => { const s = T.ents('submarine')[0]; return s ? { y: s.y, afloat: s.afloat, top: Bt.y - 2 + 0.875 } : null; }, Bt);
    check('a submarine goes on the water too, sitting low in it', sp0 && sp0.afloat && Math.abs(sp0.y - (sp0.top - 0.45)) < 0.1, sp0);
    await E(() => { const s = T.ents('submarine')[0]; T.aim(s.x, s.y + 0.6, s.z); T.tap(); });
    await sleep(400);
    check('tapping the submarine gets you in', await E(() => game.player.riding && game.player.riding.type === 'submarine'));
    const d0 = await E(() => { const pl = game.player, s = pl.riding; pl.pitch = -0.7; game.input.joyY = 1; return { y: s.y, z: s.z }; });
    await waitFor(y => game.player.riding.y < y - 1.5, 10000, d0.y);
    const d1 = await E(() => { const pl = game.player, s = pl.riding; game.input.joyY = 0; return { y: s.y, z: s.z, air: pl.air, head: pl.headInWater, slope: s.slope }; });
    check('looking down and pushing forward dives (the nose tips down)', d0.y - d1.y > 1 && d0.z - d1.z > 1 && d1.slope < -0.2, { d0, d1 });
    await sleep(1500);
    const d2 = await E(() => { const pl = game.player; return { air: pl.air, head: pl.headInWater, light: game.sky && game.sky.subLight, fogEnd: R.fogEnd }; });
    check('inside a submarine you can breathe under water, its lamps light the water, and you can see far', d2.head && d2.air === 10 && d2.light && d2.fogEnd > 40, d2);
    await shot('submarine-inside');
    await E(() => { game.view = 2; });
    await sleep(600);
    await shot('submarine-front');
    await E(() => { game.view = 1; });
    await sleep(400);
    await shot('submarine-back');
    await E(() => { game.view = 0; });
    // tap for a sonar ping
    await E(() => { window.__sfx = []; T.tap(); });
    await sleep(300);
    check('a tap in a submarine sends a sonar ping', await E(() => window.__sfx.includes('sonar')));
    // look up and push: it rises, but stops at the top of the water
    await E(() => { game.player.pitch = 1.1; game.input.joyY = 1; });
    await waitFor(() => game.player.riding.y > 98, 10000);
    await sleep(1500);
    const up = await E(Bt => { game.input.joyY = 0; const s = game.player.riding; return { y: s.y, top: Bt.y - 2 + 0.875, afloat: s.afloat }; }, Bt);
    check('going up, it stops at the top of the water', up.afloat && up.y <= up.top - 0.3 && up.y > up.top - 1.2, up);
    // saved with the world
    const sv = await E(() => { game.save(); return JSON.parse(store.get(saveKey('valley'))).world.vehicles; });
    check('boats and submarines are saved with the world', Array.isArray(sv) && sv.some(v => v.k === 'submarine'), sv);
    await E(() => { game.input.sneak = false; }); await sleep(150); await E(() => { game.input.sneak = true; }); await sleep(300); await E(() => { game.input.sneak = false; });
    check('sneak gets you out of the submarine', await E(() => !game.player.riding));
  }

  if (on('tv')) {
    // ---------- TVs and coloring boards ----------
    const V = area(240, 0);
    await goto(V);
    await E(V => { T.stage(V.x, V.y, V.z, 8); T.clearMobs(); T.put(V.x + 0.5, V.y, V.z + 3.5, { yaw: 0, pitch: 0 }); for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.setMode('survival'); game.world.time = 0.25; }, V);
    await sleep(400);
    const rc = await E(() => ({ tv: matchRecipe([I.IRON_INGOT, B.GLASS, I.IRON_INGOT, I.IRON_INGOT, I.COAL, I.IRON_INGOT, 0, 0, 0], 3), board: matchRecipe([I.STICK, I.STICK, I.STICK, I.STICK, I.PAPER, I.STICK, I.STICK, I.STICK, I.STICK], 3) }));
    check('TVs (iron, glass, coal) and coloring boards (sticks and paper) can be crafted', rc.tv && rc.tv.out === 101 && rc.board && rc.board.out === 102, rc);
    // put a TV down: it faces you; tap it to turn it on
    await E(V => { T.hold(B.TV); T.aim(V.x + 0.5, V.y - 0.01, V.z + 0.5); T.tap(); }, V);
    await sleep(400);
    const tv0 = await E(V => ({ b: game.world.getBlock(V.x, V.y, V.z), d: game.world.getData(V.x, V.y, V.z) }), V);
    check('a TV goes down facing you', tv0.b === 101 && (tv0.d & 3) === 0, tv0);
    await E(V => { T.hold(null); T.aim(V.x + 0.5, V.y + 0.5, V.z + 0.9); T.tap(); }, V);
    await sleep(1500);
    const tv1 = await E(V => ({ d: game.world.getData(V.x, V.y, V.z), layer: DYN.map.has('tv:' + game.world.map + ':' + V.x + ',' + V.y + ',' + V.z) }), V);
    check('tapping the TV turns it on, and a show plays', (tv1.d & 4) && tv1.layer, tv1);
    await E(V => { T.put(V.x + 0.5, V.y, V.z + 2.6); T.aim(V.x + 0.5, V.y + 0.55, V.z + 0.5); game.world.clock = Math.ceil(game.world.clock / 25) * 25 + 3; }, V);
    await sleep(1200);
    await shot('tv');
    const sh = await E(V => {
      const w = game.world, seen = new Set(), same = [];
      const c0 = w.clock;
      for (let i = 0; i < 40; i++) { w.clock = i * 25 + 5; seen.add(tvShow(w, V.x, V.y, V.z).show); }
      w.clock = 1005; const a = tvShow(w, V.x, V.y, V.z).show; w.clock = 1010; same.push(a === tvShow(w, V.x, V.y, V.z).show);
      w.clock = c0;
      // every show draws without trouble
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const ctx = cv.getContext('2d');
      let ok = 0; for (let k = 0; k < TV_SHOWS.length; k++) for (const t of [0.8, 7.5, 24]) { try { TV_SHOWS[k](ctx, t, tvRand(k * 77 + 1)); ok++; } catch (e) { return { err: k + ': ' + e.message }; } }
      return { kinds: seen.size, n: TV_SHOWS.length, same: same[0], ok };
    }, V);
    check('you can not pick the show: a show plays for a while, then something else comes on', sh.kinds >= 6 && sh.same && sh.ok === sh.n * 3, sh);
    await E(V => { T.put(V.x + 0.5, V.y, V.z + 3.5); T.aim(V.x + 0.5, V.y + 0.5, V.z + 0.9); T.tap(); }, V);
    await sleep(400);
    check('tap again to turn it off', await E(V => !(game.world.getData(V.x, V.y, V.z) & 4), V));
    // a coloring board on an easel: the coloring screen opens; fill the creeper green
    await E(V => { T.put(V.x + 2.5, V.y, V.z + 3.5, { yaw: 0, pitch: 0 }); T.hold(B.BOARD, 2); T.aim(V.x + 2.5, V.y - 0.01, V.z + 1.5); T.tap(); }, V);
    await sleep(500);
    const b0 = await E(V => ({ b: game.world.getBlock(V.x + 2, V.y, V.z + 1), d: game.world.getData(V.x + 2, V.y, V.z + 1), screen: ui.screen, pic: el('board-pic-name').textContent }), V);
    check('a coloring board stands where you put it, and opens for coloring (a creeper to start)', b0.b === 102 && b0.d < 16 && b0.screen === 'scr-board' && b0.pic === 'Creeper', b0);
    const cell = async (cx, cy) => { const r = await p.$eval('#board-canvas', c => { const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }); await p.mouse.click(r.x + (cx + 0.5) * r.w / 16, r.y + (cy + 0.5) * r.h / 16); };
    await p.click('[aria-label="Color 9"]');   // green
    await p.click('#btn-board-fill');
    await cell(1, 1);
    await p.click('[aria-label="Color 7"]');   // yellow: a brush stroke
    await p.click('#btn-board-brush');
    const r = await p.$eval('#board-canvas', c => { const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
    await p.mouse.move(r.x + 2.5 * r.w / 16, r.y + 13.5 * r.h / 16); await p.mouse.down(); for (let i = 3; i <= 12; i++) await p.mouse.move(r.x + (i + 0.5) * r.w / 16, r.y + 13.5 * r.h / 16); await p.mouse.up();
    const pc = await E(() => ({ green: BOARDUI.px.filter(c => c === '8').length, yellow: BOARDUI.px.filter(c => c === '6').length, lines: boardOutline(BOARDUI.pic).reduce((a, b) => a + b, 0) }));
    check('Fill colors a whole part (up to the lines), and the brush paints where you drag', pc.green > 100 && pc.yellow >= 10 && pc.lines > 50, pc);
    await shot('board-screen');
    await p.click('#btn-board-done');
    await sleep(300);
    const b1 = await E(V => { const t = boardTile(game.world, V.x + 2, V.y, V.z + 1); return { screen: ui.screen, pic: t && t.pic, green: t && t.px.split('').filter(c => c === '8').length }; }, V);
    check('Done puts the picture on the board', b1.screen === null && b1.pic === 1 && b1.green > 100, b1);
    // another board, on a wall: pick a different picture (taking two taps, once there are colors)
    await E(V => { const w = game.world; for (let y = V.y; y < V.y + 3; y++) for (let x = V.x + 3; x <= V.x + 6; x++) w.setBlock(x, y, V.z - 1, B.STONE_BRICKS, 0); T.put(V.x + 4.5, V.y, V.z + 2.5); T.aim(V.x + 4.5, V.y + 1.5, V.z - 0.01); T.tap(); }, V);
    await sleep(500);
    const w0 = await E(V => ({ b: game.world.getBlock(V.x + 4, V.y + 1, V.z), d: game.world.getData(V.x + 4, V.y + 1, V.z), screen: ui.screen }), V);
    check('a board put on a wall hangs there', w0.b === 102 && w0.d >= 16 && w0.screen === 'scr-board', w0);
    await p.click('[aria-label="Color 5"]');
    await p.click('#btn-board-fill');
    await cell(1, 1);
    await p.click('#btn-board-next');
    const n1 = await E(() => ({ pic: BOARDUI.pic, note: !el('board-new-note').hidden }));
    await p.click('#btn-board-next');
    const n2 = await E(() => ({ pic: BOARDUI.pic, name: el('board-pic-name').textContent, blank: BOARDUI.px.every(c => c === '.') }));
    check('a new picture takes two taps once you have colored (so colors are not lost by mistake)', n1.pic === 1 && n1.note && n2.pic === 2 && n2.name === 'Heart' && n2.blank, { n1, n2 });
    await p.click('[aria-label="Color 5"]');
    await cell(7, 6);
    await p.click('#btn-board-done');
    await E(V => { T.put(V.x + 3.5, V.y, V.z + 4.5); T.aim(V.x + 3.2, V.y + 0.9, V.z + 0.5); }, V);
    await sleep(1200);
    await shot('boards');
    // saved with the world, and sent to other players with the world
    const sv = await E(V => {
      game.save(); const d = JSON.parse(store.get(saveKey('valley'))), t = d.world.tiles[(V.x + 4) + ',' + (V.y + 1) + ',' + V.z];
      const td = dataTiles(game.world), clean = cleanDataTiles({ '1,2,3': { type: 'board', px: 'zz', pic: 1 }, '4,5,6': { type: 'board', px: '.'.repeat(256), pic: 99 } });
      return { maxPic: BOARD_PICS.length - 1, saved: t && t.type === 'board' && t.pic === 2, sent: Object.values(td).filter(t => t.type === 'board').length, bad: !clean['1,2,3'], pic: clean['4,5,6'] && clean['4,5,6'].pic };
    }, V);
    check('boards are saved with the world and sent to other players (bad ones turned away)', sv.saved && sv.sent === 2 && sv.bad && sv.pic === sv.maxPic, sv);
    // taking the wall away drops the board
    const br = await E(V => { const w = game.world; T.clearMobs(); w.setBlock(V.x + 4, V.y + 1, V.z - 1, B.AIR, 0); return { b: w.getBlock(V.x + 4, V.y + 1, V.z), tile: !!w.tiles.get(tileKey(V.x + 4, V.y + 1, V.z)), item: T.ents('item').some(e => e.id === B.BOARD) }; }, V);
    check('a board falls off when its wall goes (and its picture goes with it)', br.b === 0 && !br.tile && br.item, br);
  }

  if (on('hardcore')) {
    // ---------- Hardcore worlds ----------
    await E(() => { game.save(); game.quitToTitle(); });
    await waitFor(() => game.state === 'title', 30000);
    const valleyBefore = await E(() => store.get(saveKey('valley')) ? JSON.parse(store.get(saveKey('valley'))).seed : null);
    await E(() => { store.del(saveKey('hardcore')); store.del(HC_LAST_KEY); });
    await p.click('#btn-play');
    await sleep(400);
    const wc = await E(() => [...document.querySelectorAll('#world-cards .card')].map(c => ({ h: c.querySelector('h3').textContent, modes: c.querySelectorAll('.modes .btn').length, hc: c.classList.contains('hardcore') })));
    check('there are three worlds to pick: Sunny Valley, Sky Islands and Hardcore (no Creative there)', wc.length === 3 && wc[2].h === 'Hardcore' && wc[2].hc && wc[2].modes === 0, wc);
    await shot('worlds');
    await p.click('#world-cards .card.hardcore .actions .btn');
    await waitFor(() => game.state === 'playing', 90000);
    await sleep(800);
    const hc = await E(() => {
      game.settings.difficulty = 0;
      const out = { hardcore: game.hardcore, slot: game.slot, mode: game.mode, diff: difficulty(), modeBtn: el('btn-mode').hidden };
      game.setMode('creative'); out.after = game.mode;
      game.runCommand('/gamemode creative'); out.cmd = game.mode;
      game.runCommand('/give diamond 64'); out.gave = T.count(I.DIAMOND);
      ui.hearts = -2;
      return out;
    });
    await sleep(400);
    const hearts = await E(() => { const imgs = el('hearts').querySelectorAll('img'); return imgs.length && imgs[0].getAttribute('src') === HUD_ICONS.hcHeart; });
    await E(() => { game.settings.difficulty = 1; });
    check('in Hardcore: Survival only (no switching to Creative, no cheats), always at least Normal, with Hardcore hearts', hc.hardcore && hc.slot === 'hardcore' && hc.mode === 'survival' && hc.diff === 2 && hc.modeBtn && hc.after === 'survival' && hc.cmd === 'survival' && hc.gave === 0 && hearts, { hc, hearts });
    await shot('hardcore-hud');
    const sv = await E(() => { game.day = 3; game.save(); const d = JSON.parse(store.get(saveKey('hardcore'))); return { hardcore: d.hardcore, valley: store.get(saveKey('valley')) ? JSON.parse(store.get(saveKey('valley'))).seed : null }; });
    check('a Hardcore world has its own save (the others are left alone)', sv.hardcore === true && sv.valley === valleyBefore, sv);
    // one life: the world is over
    await E(() => { const pl = game.player; pl.invuln = 0; pl.damage(1000, 'lava'); });
    await sleep(500);
    const dd = await E(() => ({ screen: ui.screen, h: el('death-h').textContent, msg: el('death-msg').textContent, respawn: !el('btn-respawn').hidden, again: !el('btn-hc-new').hidden, save: !!store.get(saveKey('hardcore')), last: JSON.parse(store.get(HC_LAST_KEY) || 'null') }));
    check('dying in Hardcore is Game Over: no respawning, and the world is gone', dd.screen === 'scr-death' && dd.h === 'Game Over!' && !dd.respawn && dd.again && !dd.save && dd.last && dd.last.days === 3 && /one life/.test(dd.msg) && /3 days/.test(dd.msg), dd);
    await shot('hardcore-over');
    const seed0 = await E(() => game.seed);
    await p.click('#btn-hc-new');
    await waitFor(() => game.state === 'playing', 90000);
    const nw = await E(s => ({ hardcore: game.hardcore, newSeed: game.seed !== s, alive: game.player.alive, hp: game.player.health }), seed0);
    check('New Hardcore World starts a brand new one', nw.hardcore && nw.newSeed && nw.alive && nw.hp === 20, nw);
    await E(() => { const pl = game.player; pl.invuln = 0; pl.damage(1000, 'void'); });
    await sleep(300);
    await p.click('#btn-death-title');
    await sleep(500);
    await p.click('#btn-play');
    await sleep(400);
    const st = await E(() => document.querySelector('#world-cards .card.hardcore .status').textContent);
    check('the Hardcore card remembers how long the last world lasted', /New world\. Last time you lasted 1 day\./.test(st), st);
    await E(() => { game.startWorld('valley', 'survival', false); });
    await waitFor(() => game.state === 'playing', 90000);
  }

  if (on('fixes')) {
    // ---------- things a code review found ----------
    const Fx = area(280, 0);
    await goto(Fx);
    await E(Fx => { T.stage(Fx.x, Fx.y, Fx.z, 12, 8); T.clearMobs(); for (const e of game.entities) if (e.vehicle) e.removed = true; T.put(Fx.x + 0.5, Fx.y, Fx.z + 6.5, { yaw: 0, pitch: -0.15 }); for (let i = 0; i < 41; i++) game.player.inv[i] = null; game.setMode('survival'); game.player.health = 20; }, Fx);
    await sleep(400);
    // every block picture can be drawn in the world (the brewing stand held or dropped looked like leaves)
    const bt = await E(() => {
      const bad = [];
      for (let id = 0; id < 256; id++) { const d = BLOCKS[id]; if (!d || !d.tex) continue; const t = d.tex; for (const n of typeof t === 'string' ? [t] : [t.side, t.top, t.bottom, t.front, t.back].filter(Boolean)) if (!(TILE[n] < 256)) bad.push(n); }
      return { bad, brew: BT[B.BREWING_STAND * 6] === TILE.brewing_item };
    });
    check('every block picture can be drawn in the world (a brewing stand in the hand is a brewing stand)', bt.bad.length === 0 && bt.brew, bt);
    // a big magma cube heals up to its own full health; poison and regeneration each keep their own beat
    const mob = await E(Fx => {
      const big = spawnMob(game, 'magma', Fx.x + 9.5, Fx.y, Fx.z - 9.5, { size: 2 }), out = { full: big.hp };
      big.hp = 3; potionOnMob(game, big, potionByKey('healing'), 1); out.healed = big.hp;
      const c = spawnMob(game, 'cow', Fx.x - 9.5, Fx.y, Fx.z - 9.5); c.hp = 5; c.effects = { poison: 10, regeneration: 10 };
      for (let i = 0; i < 7; i++) tickMobEffects(game, c, 0.1);
      out.early = c.hp;
      for (let i = 0; i < 6; i++) tickMobEffects(game, c, 0.1);
      out.cow = c.hp; big.removed = c.removed = true;
      return out;
    }, Fx);
    check('a big magma cube heals up to its own full health, and poison and regeneration each keep their own time', mob.full === 12 && mob.healed === 11 && mob.early === 5 && mob.cow === 5, mob);
    // in Creative, armor and the shield slot are on the item screen
    const cr = await E(() => {
      const pl = game.player;
      game.setMode('creative'); pl.inv[0] = { id: armorId(3, 0), count: 1 }; pl.sel = 0;
      openInv('inv');
      const out = { kind: ui.inv.kind, slots: document.querySelectorAll('.creative-wear .slot').length };
      quickMove({ arr: pl.inv, i: 0 }); out.worn = !!pl.inv[ARMOR_INV] && pl.inv[ARMOR_INV].id === armorId(3, 0); out.hand = pl.inv[0];
      quickMove({ arr: pl.inv, i: ARMOR_INV }); out.back = !!pl.inv[0] && pl.inv[0].id === armorId(3, 0); out.still = pl.inv[ARMOR_INV];
      game.closeUI(); game.setMode('survival'); pl.inv[0] = null;
      return out;
    });
    check('in Creative, the item screen has the armor and shield slots: armor goes on and comes off', cr.kind === 'creative' && cr.slots === 5 && cr.worn && !cr.hand && cr.back && !cr.still, cr);
    // a furnace's output: number keys can't put things in it, and taking things out with one gives experience
    const fo = await E(Fx => {
      const w = game.world, pl = game.player, x = Fx.x + 3, y = Fx.y, z = Fx.z - 3;
      w.setBlock(x, y, z, B.FURNACE, 0);
      const t = w.getTile(x, y, z, 'furnace');
      t.slots[2] = { id: I.IRON_INGOT, count: 10 };
      pl.inv[0] = { id: I.DIAMOND, count: 64 }; setXp(pl, 0);
      openInv('furnace', t);
      ui.hoverRef = { arr: t.slots, i: 2, kind: 'furnaceOut' };
      const key = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1' }));
      key();
      const out = { out1: t.slots[2] && t.slots[2].count, hand1: pl.inv[0] && pl.inv[0].id === I.DIAMOND && pl.inv[0].count, xp1: pl.xp };
      pl.inv[0] = null; key();
      out.out2 = t.slots[2]; out.hand2 = pl.inv[0] && pl.inv[0].id === I.IRON_INGOT && pl.inv[0].count; out.xp2 = pl.xp;
      game.closeUI(); ui.hoverRef = null; pl.inv[0] = null;
      return out;
    }, Fx);
    check("number keys can't put things into a furnace's output, and taking it out that way still gives experience", fo.out1 === 10 && fo.hand1 === 64 && fo.xp1 === 0 && !fo.out2 && fo.hand2 === 10 && fo.xp2 >= 6, fo);
    // shift-click crafting only makes what fits
    const sc = await E(() => {
      const pl = game.player;
      for (let i = 0; i < 36; i++) pl.inv[i] = { id: B.DIRT, count: 64 };
      pl.inv[5] = { id: I.DIAMOND, count: 60 };
      openInv('inv');
      ui.inv.grid[0] = { id: B.DIAMOND_BLOCK, count: 1 }; updateCraft();
      const made = !!ui.inv.out && ui.inv.out.out === I.DIAMOND && ui.inv.out.count === 9;
      takeCraft(true);
      const out = { made, diamonds: T.count(I.DIAMOND), block: ui.inv.grid[0] && ui.inv.grid[0].count };
      ui.inv.grid[0] = null; game.closeUI();
      for (let i = 0; i < 41; i++) pl.inv[i] = null;
      return out;
    });
    check('shift-click crafting only makes what fits (no free diamonds when the bag is nearly full)', sc.made && sc.diamonds === 60 && sc.block === 1, sc);
    // a fishing rod only looks cast while its float is out; going through a portal takes the float in
    const rod = await E(() => {
      const pl = game.player;
      pl.inv[0] = { id: I.FISHING_ROD, count: 1 }; pl.sel = 0; pl.bobber = null; pl.bob = 7.3;   // (walking)
      const out = { walking: heldMesh(pl, I.FISHING_ROD) === tileMesh('fishing_rod_cast') };
      useRod(game, pl, false); out.cast = !!pl.bobber;
      game.closeForTravel(); out.after = pl.bobber;
      pl.inv[0] = null;
      return out;
    });
    check('a fishing rod only looks cast while its float is out, and a portal trip takes the float in', !rod.walking && rod.cast && rod.after === null, rod);
    // the potion effect list: the rows stay (so a screen reader isn't read the time every second); the time ticks quietly
    const fxr = await E(async () => {
      potionOnPlayer(game.player, potionByKey('swiftness'), 1); renderEffects();
      const row = el('effects').firstElementChild, tm = row && row.querySelector('.fx-time'), t0 = tm && tm.textContent;
      await new Promise(r => setTimeout(r, 1300));
      renderEffects();
      const row2 = el('effects').firstElementChild;
      const out = { same: !!row && row === row2, t0, t1: row2 && row2.querySelector('.fx-time').textContent, hidden: tm && tm.getAttribute('aria-hidden'), text: row2 && row2.textContent };
      game.player.effects = {}; renderEffects();
      return out;
    });
    check('the potion effect list keeps its rows while the time ticks (and the ticking is hidden from screen readers)', fxr.same && fxr.t0 !== fxr.t1 && fxr.hidden === 'true' && /Swiftness/.test(fxr.text), fxr);
    // a gallery of coloring boards: the pictures are painted once, not over and over
    const gal = await E(Fx => {
      const w = game.world;
      for (let i = 0; i < 80; i++) w.setBlock(Fx.x - 10 + (i % 20), Fx.y, Fx.z - 6 - Math.floor(i / 20), B.BOARD, 0);
      window.__pbN = 0; window.__pb0 = paintBoard; window.paintBoard = (ctx, t) => { window.__pbN++; return window.__pb0(ctx, t); };
      T.put(Fx.x + 0.5, Fx.y, Fx.z + 6.5, { yaw: 0, pitch: -0.2 });
      return true;
    }, Fx);
    await sleep(2000);
    const g1 = await E(() => window.__pbN);
    await sleep(2000);
    const g2 = await E(() => window.__pbN);
    await shot('gallery');
    await E(Fx => { window.paintBoard = window.__pb0; for (let i = 0; i < 80; i++) game.world.setBlock(Fx.x - 10 + (i % 20), Fx.y, Fx.z - 6 - Math.floor(i / 20), B.AIR, 0); }, Fx);
    check('80 coloring boards in view: their pictures are painted once, not over and over', gal && g1 >= 40 && g2 - g1 < 10, { g1, g2 });
    // a submarine can be put down deep under water, right where you point; a boat can't go down there
    await E(Fx => {
      const w = game.world, x0 = Fx.x + 2, z0 = Fx.z - 11;
      for (let dx = 0; dx < 9; dx++) for (let dz = 0; dz < 9; dz++) for (let y = Fx.y - 10; y <= Fx.y - 1; y++) w.setBlock(x0 + dx, y, z0 + dz, dx === 0 || dx === 8 || dz === 0 || dz === 8 || y === Fx.y - 10 ? B.STONE : B.WATER, 0);
      T.put(x0 + 4.5, Fx.y - 9, z0 + 6.5, { yaw: 0, pitch: 0 });
      game.player.air = 10;
      T.hold(I.SUBMARINE); T.aim(x0 + 4.5, Fx.y - 7.6, z0 + 2.5); T.tap();
    }, Fx);
    await sleep(500);
    const sub = await E(() => { const pl = game.player, v = T.ents('submarine')[0]; return { y: v && v.y, py: pl.y, d: v && Math.hypot(v.x - pl.x, v.z - pl.z), held: pl.inv[0] }; });
    await E(() => { T.hold(I.BOAT); T.aim(game.player.x, game.player.y + 1.2, game.player.z - 2); T.tap(); });
    await sleep(500);
    const bo = await E(() => ({ boats: T.ents('boat').length, held: game.player.inv[0] && game.player.inv[0].id === I.BOAT }));
    check('deep under water a submarine goes right where you point (and a boat stays in your hand)', sub.y !== undefined && Math.abs(sub.y - sub.py) < 2.5 && sub.d < 4 && !sub.held && bo.boats === 0 && bo.held, { sub, bo });
    await E(() => { for (const e of game.entities) if (e.vehicle) e.removed = true; game.player.inv[0] = null; });
    // dying with a sign open keeps its words
    await E(Fx => { T.put(Fx.x + 0.5, Fx.y, Fx.z + 6.5); const w = game.world, x = Fx.x - 3, y = Fx.y, z = Fx.z + 3; w.setBlock(x, y, z, B.SIGN, 0); openSign(x, y, z); document.querySelectorAll('.sign-line')[0].value = 'Still here'; game.player.invuln = 0; game.player.damage(1000, 'lava'); }, Fx);
    await sleep(400);
    const dw = await E(Fx => ({ words: (signLines(game.world, Fx.x - 3, Fx.y, Fx.z + 3) || [])[0], screen: ui.screen, open: SIGNUI.open }), Fx);
    check('dying with a sign open keeps its words', dw.words === 'Still here' && dw.screen === 'scr-death' && !dw.open, dw);
    await E(() => game.respawn());
    await sleep(300);
  }

  if (on('chars')) {
    // ---------- the family, ready-made, and making your own characters ----------
    await E(() => game.quitToTitle());
    await waitFor(() => game.state === 'title', 30000);
    await sleep(500);
    await p.click('#btn-char');
    await sleep(300);
    const slot = n => '.char-slot:has(.char-card span:text-is("' + n + '"))';
    const fam = await E(() => ({ screen: ui.screen, add: !!document.querySelector('.char-new'), cards: [...document.querySelectorAll('.char-slot .char-card span')].map(s => s.textContent), skin: PROFILE.skin }));
    check('the family is on the character screen, ready-made, with a Make a character button', fam.screen === 'scr-char' && fam.add && fam.cards.join() === 'Mommy,Daddy,Cooper,Lily,Michael,Luca' && fam.skin === 'declan', fam);
    const fl = await E(() => {
      const L = n => PROFILE.chars.find(c => c.name === n).look, is = (n, k, v) => L(n)[LK[k]] === v;
      const opaque = (n, u0, u1, v0, v1) => { const d = lookPixels(L(n)); for (let v = v0; v < v1; v++) for (let u = u0; u < u1; u++) if (d[(v * 64 + u) * 4 + 3] > 25) return true; return false; };
      const ears = n => opaque(n, 0, 16, 32, 38), pigs = n => opaque(n, 16, 36, 32, 40);
      return {
        mommy: is('Mommy', 'hairColor', 0) && is('Mommy', 'hair', 2),
        daddy: is('Daddy', 'hair', 0) && is('Daddy', 'hairColor', 3) && is('Daddy', 'beard', 1) && is('Daddy', 'glasses', 1),
        cooper: is('Cooper', 'hairColor', 3) && is('Cooper', 'head', 1),
        lily: is('Lily', 'hairColor', 3) && is('Lily', 'hair', 8) && pigs('Lily') && !pigs('Mommy'),
        michael: is('Michael', 'hairColor', 4) && is('Michael', 'mouth', 2),
        luca: is('Luca', 'hairColor', 0) && is('Luca', 'ears', 1) && ears('Luca') && !ears('Mommy'),
        blueEyes: PROFILE.chars.every(c => c.look[LK.eyes] === 0),
      };
    });
    check("the family looks as asked: blonde Mommy, Daddy's beard and glasses, Cooper's big head, Lily's pigtails, Michael's evil grin, Luca's big ears, all with blue eyes", Object.values(fl).every(Boolean), fl);
    await p.click(slot('Cooper') + ' .char-card');
    await sleep(300);
    const cp = await E(() => ({ skin: PROFILE.skin, name: PROFILE.name, cur: PROFILE.cur, big: headScaleFor('custom_me'), btn: el('btn-char').textContent }));
    check('tapping Cooper plays as Cooper, big head and all', cp.skin === 'custom_me' && cp.cur === 2 && cp.name === 'Cooper' && cp.big > 1 && /Cooper/.test(cp.btn), cp);
    await shot('family');
    // make one
    await p.click('.char-new');
    await sleep(500);
    const mk = await E(() => ({ screen: ui.screen, tabs: [...document.querySelectorAll('.maker-tab')].map(b => b.textContent), swatches: document.querySelectorAll('#maker-opts .swatch').length }));
    check('Make a character opens the maker, with Face, Hair, Glasses, Top, Bottom, Shoes and Hat', mk.screen === 'scr-maker' && mk.tabs.join() === 'Face,Hair,Glasses,Top,Bottom,Shoes,Hat' && mk.swatches === 12, mk);
    const choose = async (tab, row, opt) => {
      await p.click('.maker-tab:text-is("' + tab + '")');
      if (typeof opt === 'number') await p.click('[aria-label="' + row + ' ' + opt + '"]');
      else await p.click('.maker-row[aria-label="' + row + '"] .maker-choice:text-is("' + opt + '")');
    };
    await p.fill('#maker-name', 'Declan');
    await choose('Face', 'Skin', 3); await choose('Face', 'Eyes', 2); await choose('Face', 'Mouth', 'Evil grin'); await choose('Face', 'Freckles', 'Freckles');
    await choose('Face', 'Ears', 'Big ears'); await choose('Face', 'Head', 'Big head');
    await choose('Hair', 'Hair', 'Pigtails'); await choose('Hair', 'Hair color', 4); await choose('Hair', 'Beard', 'Beard');
    await choose('Glasses', 'Glasses', 'Glasses');
    await choose('Top', 'Top', 'Hoodie'); await choose('Top', 'Color', 4); await choose('Top', 'Picture', 'First letter');
    await choose('Bottom', 'Bottom', 'Pants'); await choose('Bottom', 'Color', 7);
    await choose('Shoes', 'Shoes', 'Boots'); await choose('Shoes', 'Color', 13);
    await choose('Hat', 'Hat', 'Cap'); await choose('Hat', 'Color', 1);
    // the extra pieces really are drawn: big ears and pigtails stick out, and a big head stands taller (drawn here, standing still)
    const measure = () => E(() => {
      const cv = el('maker-view');
      drawPreview(cv.getBoundingClientRect(), { head: [0, 0, 0] }, 0.35, 0, cv, MODELS.player_custom_prev);
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0, top = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) { const i = (y * cv.width + x) * 4; if (d[i] + d[i + 1] + d[i + 2] > 90) { n++; if (top < 0) top = y; } }
      return { n, top };
    });
    const pieces = {};
    await choose('Face', 'Ears', 'Normal ears'); pieces.earsOff = await measure();
    await choose('Face', 'Ears', 'Big ears'); pieces.earsOn = await measure();
    await choose('Hair', 'Hair', 'Short'); pieces.pigsOff = await measure();
    await choose('Hair', 'Hair', 'Pigtails'); pieces.pigsOn = await measure();
    await choose('Face', 'Head', 'Normal head'); pieces.headOff = await measure();
    await choose('Face', 'Head', 'Big head'); pieces.headOn = await measure();
    check('big ears and pigtails are drawn on the character, and a big head is drawn bigger',
      pieces.earsOn.n - pieces.earsOff.n > 300 && pieces.pigsOn.n - pieces.pigsOff.n > 300 && pieces.headOn.top < pieces.headOff.top - 5 && pieces.headOn.n > pieces.headOff.n, pieces);
    await sleep(600);
    const lk = await E(() => ui.maker.look.join());
    check('every choice goes into the look (and the name gives the letter on the top)', lk === [2, 8, 3, 1, 1, 1, 2, 1, 1, 1, 2, 3, 3, 3, 6, 1, 12, 1, 0, 3].join(), lk);
    check('the character is shown as it is made', await E(() => { const cv = el('maker-view'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 120) n++; return n > cv.width * cv.height * 0.05; }));
    await shot('maker');
    await p.click('#btn-maker-save');
    await sleep(400);
    const sv = await E(() => {
      const px = lookPixels(PROFILE.chars[PROFILE.cur].look);
      return { screen: ui.screen, skin: PROFILE.skin, n: PROFILE.chars.length, cur: PROFILE.cur, name: PROFILE.name, cards: [...document.querySelectorAll('.char-card span')].map(s => s.textContent),
        painted: SKIN_DATA[SKIN.custom_me].every((v, i) => v === px[i]), big: headScaleFor('custom_me'), btn: el('btn-char').textContent };
    });
    check('Save keeps it after the family, picks it, and you play as it with its name', sv.screen === 'scr-char' && sv.skin === 'custom_me' && sv.n === 7 && sv.cur === 6 && sv.name === 'Declan' && sv.cards.includes('Declan') && sv.painted && sv.big > 1 && /Declan/.test(sv.btn), sv);
    // another one, with Surprise me!
    await p.click('.char-new');
    await sleep(300);
    await p.fill('#maker-name', 'Grandpa');
    await p.click('#btn-maker-random');
    await p.click('#btn-maker-random');
    await p.click('#btn-maker-save');
    await sleep(300);
    const two = await E(() => ({ n: PROFILE.chars.length, cur: PROFILE.cur, name: PROFILE.name }));
    check('more characters can be made (Surprise me! picks a look)', two.n === 8 && two.cur === 7 && two.name === 'Grandpa', two);
    await shot('chars');
    // change Declan: a crown instead of the cap
    await p.click(slot('Declan') + ' .char-edit');
    await sleep(300);
    const ed = await E(() => ({ name: el('maker-name').value, del: !el('btn-maker-delete').hidden }));
    await choose('Hat', 'Hat', 'Crown');
    await p.click('#btn-maker-save');
    await sleep(300);
    const ch = await E(() => ({ hat: PROFILE.chars[6].look[LK.hat], cur: PROFILE.cur, name: PROFILE.name }));
    check('Change opens a character to change it', ed.name === 'Declan' && ed.del && ch.hat === 3 && ch.cur === 6 && ch.name === 'Declan', { ed, ch });
    // delete Grandpa (it takes two taps), then Luca (one of the family, before Declan in the list)
    await p.click(slot('Grandpa') + ' .char-edit');
    await sleep(300);
    await p.click('#btn-maker-delete');
    const d1 = await E(() => ({ n: PROFILE.chars.length, label: el('btn-maker-delete').textContent }));
    await p.click('#btn-maker-delete');
    await sleep(300);
    const d2 = await E(() => ({ n: PROFILE.chars.length, skin: PROFILE.skin, cur: PROFILE.cur, screen: ui.screen }));
    await p.click(slot('Luca') + ' .char-edit');
    await sleep(300);
    await p.click('#btn-maker-delete');
    await p.click('#btn-maker-delete');
    await sleep(300);
    const d3 = await E(() => ({ names: PROFILE.chars.map(c => c.name), skin: PROFILE.skin, cur: PROFILE.cur, name: PROFILE.name }));
    check('Delete asks once more, then deletes (and you stay who you were)', d1.n === 8 && /again/.test(d1.label) && d2.n === 7 && d2.skin === 'custom_me' && d2.cur === 6 && d2.screen === 'scr-char'
      && d3.names.join() === 'Mommy,Daddy,Cooper,Lily,Michael,Declan' && d3.skin === 'custom_me' && d3.cur === 5 && d3.name === 'Declan', { d1, d2, d3 });
    await p.click('#btn-char-done');
    await sleep(800);
    await shot('title-made');
    // other players see a made character too (painted into a spare skin), and odd looks are turned away
    const rp = await E(() => {
      const look = PROFILE.chars[PROFILE.cur].look, r = new RemotePlayer('t1', 'Declan', 'declan', look), bad = new RemotePlayer('t2', 'X', 'sister', [1, 2, 'x']);
      const px = lookPixels(look), ones = new Array(LOOK_SPEC.length).fill(1);
      return { skin: r.skin, same: SKIN_DATA[SKIN[r.skin]].every((v, i) => v === px[i]), big: headScaleFor(r.skin), bad: bad.skin,
        clamp: cleanLook([99, -5].concat(ones.slice(2))), short: cleanLook([1, 2]), old: cleanLook(ones.slice(0, 15)), frac: cleanLook([1.5].concat(ones.slice(1))) };
    });
    check('a guest playing as a made character looks the same here (big head too)', rp.skin === 'custom_r0' && rp.same && rp.big > 1 && rp.bad === 'sister', rp);
    check('looks from other iPads are checked', rp.clamp && rp.clamp[0] === 5 && rp.clamp[1] === 0 && rp.short === null && rp.old === null && rp.frac === null, rp);
    // after a reload: still there, still the one you play as, and the family is not put back
    await p.reload();
    await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
    await sleep(1500);
    const rl = await E(() => {
      const px = lookPixels(PROFILE.chars[PROFILE.cur].look);
      return { names: PROFILE.chars.map(c => c.name), skin: PROFILE.skin, cur: PROFILE.cur, name: PROFILE.name, painted: SKIN_DATA[SKIN.custom_me].every((v, i) => v === px[i]), big: headScaleFor('custom_me') };
    });
    check('made characters are kept on this iPad and painted when the game starts; a deleted one stays deleted', rl.names.join() === 'Mommy,Daddy,Cooper,Lily,Michael,Declan' && rl.skin === 'custom_me' && rl.cur === 5 && rl.name === 'Declan' && rl.painted && rl.big > 1, rl);
    await E(() => { game.startWorld('valley', 'creative', true); });
    await waitFor(() => game.state === 'playing', 90000);
    await E(() => { game.view = 2; game.player.pitch = 0; });
    await sleep(1500);
    await shot('made-ingame');
  }

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close(); server.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
