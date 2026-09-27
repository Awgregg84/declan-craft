/* ===================== Playing together =====================
   The host's iPad runs the world: creatures, falling sand, water, furnaces, time of day.
   Guests build the same terrain from the seed, send their own moves and block changes,
   and show the host's creatures. A guest's things are saved inside the host's world. */
const MP_PROTO = 1;
const MP_MAX_GUESTS = 3;
const r2 = v => Math.round(v * 100) / 100;
const okXYZ = a => Array.isArray(a) && a.length === 3 && a.every(v => typeof v === 'number' && isFinite(v));
function lerpAngle(a, b, k) { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * k; }

class RemotePlayer {
  constructor(id, name, skin) {
    this.id = id; this.name = name || 'Player'; this.skin = PLAYER_SKINS.includes(skin) ? skin : 'declan';
    this.x = 0; this.y = 0; this.z = 0; this.tx = 0; this.ty = 0; this.tz = 0; this.has = false;
    this.yaw = 0; this.pitch = 0; this.bodyYaw = 0; this.tyaw = 0; this.tpitch = 0; this.tbody = 0;
    this.walk = 0; this.walkAmt = 0; this.sneaking = false; this.flying = false; this.alive = true; this.mode = 'survival';
    this.held = 0; this.swingP = 1; this.swings = 0; this.invuln = 0; this.w = 0.3; this.h = 1.8; this.eye = 1.62;
    this.sleepT = 0; this.link = null; this.tag = null; this.lastState = null;
  }
  heldId() { return this.held; }
  lookDir() { const cp = Math.cos(this.pitch); return [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp]; }
}
function encodeState(p) {
  const f = (p.sneaking ? 1 : 0) | (p.flying ? 2 : 0) | (p.alive ? 4 : 0) | (game.mode === 'creative' ? 8 : 0) | (game.sleeping > 0 ? 16 : 0);
  return [r2(p.x), r2(p.y), r2(p.z), r2(p.yaw), r2(p.pitch), r2(p.bodyYaw), f, p.heldId(), p.swings || 0];
}
function applyState(r, a) {
  if (!Array.isArray(a) || a.length < 9 || !a.slice(0, 6).every(v => typeof v === 'number' && isFinite(v))) return;
  r.lastState = a.slice(0, 9);
  r.tx = a[0]; r.ty = a[1]; r.tz = a[2]; r.tyaw = a[3]; r.tpitch = clamp(a[4], -1.6, 1.6); r.tbody = a[5];
  const f = a[6] | 0;
  r.sneaking = !!(f & 1); r.flying = !!(f & 2); r.alive = !!(f & 4); r.mode = (f & 8) ? 'creative' : 'survival';
  const held = a[7] | 0;
  r.held = held > 0 && itemDef(held) ? held : 0;
  if ((a[8] | 0) !== r.swings) { r.swings = a[8] | 0; r.swingP = 0; }
  if (!r.has) { r.x = r.tx; r.y = r.ty; r.z = r.tz; r.yaw = r.tyaw; r.pitch = r.tpitch; r.bodyYaw = r.tbody; r.has = true; }
}
function updateRemote(r, dt) {
  const k = Math.min(1, dt * 12), ox = r.x, oz = r.z;
  if (Math.abs(r.tx - r.x) + Math.abs(r.ty - r.y) + Math.abs(r.tz - r.z) > 8) { r.x = r.tx; r.y = r.ty; r.z = r.tz; }
  else { r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.z += (r.tz - r.z) * k; }
  r.yaw = lerpAngle(r.yaw, r.tyaw, k); r.pitch = lerp(r.pitch, r.tpitch, k); r.bodyYaw = lerpAngle(r.bodyYaw, r.tbody, k);
  const hs = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 1e-3);
  r.walk += hs * dt * 2.6;
  r.walkAmt = lerp(r.walkAmt, r.flying ? 0 : Math.min(1, hs / 4.3), Math.min(1, dt * 8));
  if (r.swingP < 1) r.swingP = Math.min(1, r.swingP + dt * 3.3);
  if (r.invuln > 0) r.invuln -= dt;
}
function encodeEnt(e) {
  if (e.mob) {
    const flags = (e.hurt > 0 ? 1 : 0) | (e.dead ? 2 : 0) | (e.armSwing > 0 ? 4 : 0) | (e.onGround ? 8 : 0);
    const extra = e.type === 'sheep' ? (e.wool | 0) : e.type === 'villager' ? VILLAGER_PROFS.indexOf(e.prof) * 100000 + ((e.vseed | 0) % 100000)
      : e.type === 'magma' ? (e.size || 1) : e.type === 'piglin' ? (e.angryT > 0 ? 1 : 0) : 0;
    return [e.nid, MOB_TYPES.indexOf(e.type), r2(e.x), r2(e.y), r2(e.z), r2(e.bodyYaw), r2(e.headYaw), r2(e.pitch), r2(e.walkAmt), flags, r2(e.fuse || 0), extra];
  }
  if (e.type === 'tnt') return [e.nid, -1, r2(e.x), r2(e.y), r2(e.z), r2(e.fuse)];
  if (e.type === 'falling') return [e.nid, -2, r2(e.x), r2(e.y), r2(e.z), e.id];
  return null;
}
/* guest: creatures from the host glide to their latest positions */
function updateProxy(e, dt) {
  e.age += dt;
  const k = Math.min(1, dt * 10);
  if (e.tx !== undefined) {
    const ox = e.x, oy = e.y, oz = e.z;
    if (Math.abs(e.tx - e.x) + Math.abs(e.ty - e.y) + Math.abs(e.tz - e.z) > 10) { e.x = e.tx; e.y = e.ty; e.z = e.tz; }
    else { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.z += (e.tz - e.z) * k; }
    if (e.mob) {
      e.walk += (Math.hypot(e.x - ox, e.z - oz) / Math.max(dt, 1e-3)) * dt * 2.6;
      e.walkAmt = lerp(e.walkAmt, e.walkT || 0, k);
      e.bodyYaw = lerpAngle(e.bodyYaw, e.bodyT || 0, k); e.headYaw = lerpAngle(e.headYaw, e.headT || 0, k); e.pitch = lerp(e.pitch, e.pitchT || 0, k);
      if (e.type === 'magma') { e.vy = (e.y - oy) / Math.max(dt, 1e-3); if (e.onGround && !e.wasGround) e.squash = 0.25; e.wasGround = e.onGround; }
    }
  }
  if (e.hurt > 0) e.hurt -= dt;
  if (e.armSwing > 0) e.armSwing -= dt;
  if (e.squash > 0) e.squash -= dt;
  if (e.dead) { e.dead += dt; if (e.dead > 0.9) { e.removed = true; smokeParticles(e.x, e.y + e.h * 0.5, e.z, 10, e.w + 0.2, false); } }
  if (e.type === 'tnt') { e.fuse -= dt; if (Math.random() < dt * 20) smokeParticles(e.x, e.y + 1.1, e.z, 1, 0.05, false); }
}
function cleanStack(s) {
  if (!s || typeof s !== 'object') return null;
  const id = s.id | 0;
  if (id <= 0 || id === B.UNLOADED || !itemDef(id)) return null;
  const out = { id, count: clamp(s.count | 0, 1, maxStack(id)) };
  if (s.dmg) out.dmg = clamp(s.dmg | 0, 0, 5000);
  return out;
}
function cleanGuestSave(d) {
  if (!d || typeof d !== 'object') return null;
  const num = (v, a, b, def) => (typeof v === 'number' && isFinite(v) ? clamp(v, a, b) : def);
  const inv = Array.isArray(d.inv) ? d.inv.slice(0, 36).map(cleanStack) : [];
  while (inv.length < 36) inv.push(null);
  const sp = Array.isArray(d.spawn) && d.spawn.length === 3 && d.spawn.every(v => typeof v === 'number' && isFinite(v)) ? d.spawn.map(v => v | 0) : null;
  return {
    x: num(d.x, -1e6, 1e6, 0), y: num(d.y, -60, 300, 90), z: num(d.z, -1e6, 1e6, 0), yaw: num(d.yaw, -1e3, 1e3, 0), pitch: num(d.pitch, -1.6, 1.6, 0),
    health: num(d.health, 1, 20, 20), food: num(d.food, 0, 20, 20), air: num(d.air, 0, 10, 10), inv, sel: num(d.sel | 0, 0, 8, 0), spawn: sp,
    mode: d.mode === 'creative' ? 'creative' : 'survival', flying: !!d.flying, dim: d.dim === 'nether' ? 'nether' : 'over',
  };
}
const FX_KINDS = ['break', 'place', 'door', 'boom'];
const STALE_T = new Set(['st', 'set', 'open', 'tile', 'close', 'tnt', 'egg', 'portal']);

const MP = {
  role: null, code: '', token: '', sig: null, roomOpen: false, hostLink: null, hostName: '', we: 0,
  links: new Map(), newLinks: new Set(), pending: [], remotes: new Map(), proxies: new Map(), guestSaves: {},
  outBlocks: [], outFx: [], snapT: 0, timeT: 0, tileT: 0, saveT: 0, applying: false, welcomed: false,
  joinTimer: null, reopenT: null, tries: 0, hostSleep: 0,

  send(m) { if (this.role === 'guest' && this.hostLink) { m.we = this.we; this.hostLink.send(m); } },
  broadcast(m, except) { for (const [id, l] of this.links) if (id !== except) l.send(m); },
  tell(r, text, color) { if (r && r.link) r.link.send({ t: 'chat', m: text, c: color }); },
  allLinks() { return Array.from(this.newLinks).concat(Array.from(this.links.values())); },

  /* ---------- host ---------- */
  startHosting() {
    if (this.role) return;
    if (!window.RTCPeerConnection || !window.WebSocket) { toast("This browser can't play together.", 4); return; }
    this.role = 'host'; game.net = this; this.tries = 0; this.code = ''; this.told = '';
    this.hookWorld();
    this.openRoom(true);
    this.updateUI();
  },
  openRoom(newCode) {
    if (newCode || !this.code) { this.code = randomRoomCode(); this.token = randomId(12); }
    this.roomOpen = false;
    const sig = this.sig = new Signal(roomPeerId(this.code), {
      onOpen: () => {
        if (this.sig !== sig) return;
        this.roomOpen = true; this.tries = 0;
        this.updateUI();
        if (this.told === this.code) return;   // back after a network blip, same code
        this.told = this.code;
        chat('Your room code is ' + this.code + '. On the other iPad: Play Together, Join a Game, then type ' + this.code + '.', '#ffff55');
      },
      onSignal: m => { if (this.sig === sig) this.hostSignal(m); },
      onClose: why => {
        if (this.sig !== sig || this.role !== 'host') return;
        this.roomOpen = false;
        this.updateUI();
        if (why === 'taken' && this.tries++ < 5) { this.openRoom(true); return; }
        if (why === 'offline' && this.tries++ === 0) toast("Couldn't open a room yet. The iPad needs to be online. Trying again...", 4);
        clearTimeout(this.reopenT);
        this.reopenT = setTimeout(() => { if (this.role === 'host' && !this.roomOpen) this.openRoom(false); }, 5000);
      },
    }, this.token);
  },
  hostSignal(m) {
    const cid = m.payload && m.payload.connectionId;
    if (!cid || !m.src) return;
    let link = this.allLinks().find(l => l.cid === cid && l.remote === m.src);
    if (!link) {
      if (m.type !== 'OFFER' || this.newLinks.size >= 6) return;
      link = new Link(this.sig, m.src, cid, false, {
        onOpen: () => {},
        onMessage: (l, msg) => this.hostMsg(l, msg),
        onClose: (l, why) => this.hostLinkClosed(l, why),
      });
      this.newLinks.add(link);
    }
    link.onSignal(m);
  },
  hostMsg(l, m) {
    if (this.role !== 'host') return;
    if (!l.player) {
      if (m.t !== 'hello' || l.hello) return;
      if (m.v !== MP_PROTO) { l.send({ t: 'deny', why: 'version' }); setTimeout(() => l.close('deny'), 600); return; }
      if (this.links.size + this.pending.length >= MP_MAX_GUESTS) { l.send({ t: 'deny', why: 'full' }); setTimeout(() => l.close('deny'), 600); return; }
      l.hello = { name: cleanName(m.name) || 'Player', skin: PLAYER_SKINS.includes(m.skin) ? m.skin : 'declan', pid: String(m.pid || '').replace(/[^a-z0-9]/gi, '').slice(0, 16) || randomId(8) };
      this.pending.push(l);
      this.showPrompt();
      return;
    }
    const r = l.player, w = game.world;
    // after going through a portal, messages about the old world are left behind
    if ((m.we | 0) !== this.we && STALE_T.has(m.t)) {
      if ((m.t === 'tile' || m.t === 'close') && (m.we | 0) === this.we - 1) this.staleTile(m, r);   // except a chest's last changes
      return;
    }
    switch (m.t) {
      case 'st': applyState(r, m.s); break;
      case 'portal': {   // a guest stepped through: everyone travels
        const x = m.x | 0, y = m.y | 0, z = m.z | 0;
        if (game.state !== 'playing' || Math.hypot(x + 0.5 - r.tx, z + 0.5 - r.tz) > 3) break;
        if (w.getBlock(x, y, z) !== B.NETHER_PORTAL && w.getBlock(x, y + 1, z) !== B.NETHER_PORTAL) break;
        game.travel(x, w.getBlock(x, y, z) === B.NETHER_PORTAL ? y : y + 1, z, r.name);
        break;
      }
      case 'set': {
        const b = Array.isArray(m.b) ? m.b : [];
        for (let i = 0; i + 4 < b.length && i < 5000; i += 5) {
          const x = b[i] | 0, y = b[i + 1] | 0, z = b[i + 2] | 0, id = b[i + 3] | 0, d = b[i + 4] | 0;
          if (y < 0 || y >= WH || id < 0 || id > 254 || !BLOCKS[id] || Math.abs(x - r.tx) > 64 || Math.abs(z - r.tz) > 64) continue;
          const old = w.getBlock(x, y, z), k = tileKey(x, y, z), t = w.tiles.get(k);
          const keep = t && ((t.type === 'chest' && id === B.CHEST) || (t.type === 'furnace' && (id === B.FURNACE || id === B.FURNACE_LIT)));
          if (t && !keep && this.tileUser(t, r.id)) { this.outBlocks.push(x, y, z, old, w.getData(x, y, z)); continue; }   // in use by someone else: put it back
          if (t && !keep) {   // they broke a chest or furnace: its things drop for them
            w.tiles.delete(k);
            this.sendDrops(r, t.slots.filter(Boolean).map(s => [s.id, s.count, s.dmg || 0]), x + 0.5, y + 0.5, z + 0.5);
            if (ui.inv && ui.inv.tile === t) game.closeUI();
          }
          w.applyRemote(x, y, z, id, d & 255);
          if (old === B.UNLOADED) this.outBlocks.push(x, y, z, id, d & 255);   // not loaded here, so pass it on by hand
        }
        this.takeFx(m.fx, r.id);
        break;
      }
      case 'hit': {
        const e = game.entities.find(q => q.nid === m.e && q.mob && !q.dead && !q.removed);
        if (e && Math.hypot(e.x - r.tx, e.z - r.tz) < 8) hurtMob(game, e, clamp(+m.d || 1, 0, 20), isFinite(+m.x) ? +m.x : r.tx, isFinite(+m.z) ? +m.z : r.tz, 'player', r.id);
        break;
      }
      case 'tnt': if (w.getBlock(m.x | 0, m.y | 0, m.z | 0) === B.TNT) { w.setBlock(m.x | 0, m.y | 0, m.z | 0, B.AIR, 0, true); primeTNT(game, m.x | 0, m.y | 0, m.z | 0, 4); } break;
      case 'egg': if (isMobType(m.m) && isFinite(+m.x) && isFinite(+m.y) && isFinite(+m.z) && Math.hypot(+m.x - r.tx, +m.z - r.tz) < 12) spawnMob(game, m.m, +m.x, +m.y, +m.z, { home: [+m.x, +m.z] }); break;
      case 'trade': { const e = game.entities.find(q => q.nid === m.e && q.type === 'villager'); if (e) e.tradeT = m.end ? 0 : 20; break; }
      case 'open': {
        const x = m.x | 0, y = m.y | 0, z = m.z | 0, id = w.getBlock(x, y, z);
        const kind = id === B.CHEST ? 'chest' : (id === B.FURNACE || id === B.FURNACE_LIT) ? 'furnace' : null;
        if (!kind) { l.send({ t: 'busy', x, y, z }); break; }   // not there (or not loaded yet)
        const t = w.getTile(x, y, z, kind), by = this.tileUser(t, r.id);
        if (by) { l.send({ t: 'busy', x, y, z, by }); break; }   // one player at a time, so nothing is lost or copied
        if (!t.viewers) Object.defineProperty(t, 'viewers', { value: new Set(), enumerable: false });
        t.viewers.add(r.id);
        this.sendTile(t, x, y, z, r.id);
        break;
      }
      case 'tile': {
        const t = w.tiles.get(tileKey(m.x | 0, m.y | 0, m.z | 0));
        if (t && t.viewers && t.viewers.has(r.id) && this.applyTile(t, m)) this.tileChanged(t, r.id);
        break;
      }
      case 'close': { const t = w.tiles.get(tileKey(m.x | 0, m.y | 0, m.z | 0)); if (t && t.viewers) t.viewers.delete(r.id); break; }
      case 'chat': {
        const text = String(m.m || '').replace(/[\u0000-\u001f]/g, '').slice(0, 120).trim();
        if (!text) break;
        const line = m.sys ? text : '<' + r.name + '> ' + text;
        chat(line, m.sys ? '#dddddd' : undefined);
        this.broadcast({ t: 'chat', m: line, c: m.sys ? '#dddddd' : undefined }, r.id);
        break;
      }
      case 'cmd': game.runCommand(String(m.c || '').slice(0, 120), r); break;
      case 'sleep': r.sleepT = performance.now(); this.bedtime(r.name); break;
      case 'save': { const d = cleanGuestSave(m.d); if (d) this.guestSaves[r.id] = Object.assign(d, { name: r.name }); break; }
      case 'bye': l.close('bye'); break;
    }
  },
  showPrompt() {
    const l = this.pending[0], box = el('join-prompt');
    if (!l || this.role !== 'host') { box.hidden = true; return; }
    el('join-face').src = faceIcon(l.hello.skin, 64);
    el('join-prompt-text').textContent = l.hello.name + ' wants to join your world.';
    box.hidden = false;
    game.releasePointer();   // on a computer, free the mouse so the buttons can be clicked
    sfx('join');
  },
  answerPrompt(allow) {
    const l = this.pending.shift();
    if (l && !l.closed) {
      if (allow) this.acceptGuest(l);
      else { l.send({ t: 'deny', why: 'no' }); setTimeout(() => l.close('deny'), 600); }
    }
    this.showPrompt();
  },
  acceptGuest(l) {
    const hi = l.hello, w = game.world, pl = game.player;
    if (this.links.size >= MP_MAX_GUESTS && !this.links.has(hi.pid)) { l.send({ t: 'deny', why: 'full' }); setTimeout(() => l.close('deny'), 600); return; }
    const old = this.links.get(hi.pid);
    if (old) { old.player = null; this.links.delete(hi.pid); old.close('replaced'); this.removeRemote(hi.pid, true); }
    this.newLinks.delete(l);
    const r = new RemotePlayer(hi.pid, hi.name, hi.skin);
    r.link = l; l.player = r;
    this.links.set(hi.pid, l); this.remotes.set(hi.pid, r);
    const saved = this.guestSaves[hi.pid] || null, here = saved && (saved.dim || 'over') === game.dim;
    const at = here ? [saved.x, saved.y, saved.z] : (pl.alive ? [r2(pl.x), r2(pl.y + 0.05), r2(pl.z)] : game.spawnPos());
    const you = saved ? Object.assign({}, saved, { x: at[0], y: at[1], z: at[2] }) : null;
    r.x = r.tx = at[0]; r.y = r.ty = at[1]; r.z = r.tz = at[2]; r.has = true;
    const players = [{ id: 'host', name: playerName(), skin: PROFILE.skin }];
    for (const o of this.remotes.values()) if (o !== r) players.push({ id: o.id, name: o.name, skin: o.skin });
    l.send({
      t: 'welcome', v: MP_PROTO, map: game.mapId, seed: game.seed, vb: game.overVB, mode: game.mode, time: w.time, day: game.day, clock: w.clock,
      spawn: game.worldSpawn, edits: w.serialize().edits, you, at, host: playerName(), players, dim: game.dim, we: this.we, ns: game.netherSpawn,
      wait: game.arrival ? 1 : 0,   // we are on the way through a portal: where to step out comes when we get there
    });
    this.broadcast({ t: 'pj', id: hi.pid, name: hi.name, skin: hi.skin }, hi.pid);
    chat(hi.name + ' joined the game', '#ffff55'); sfx('join');
    this.updateUI();
  },
  hostLinkClosed(l, why) {
    this.newLinks.delete(l);
    const pi = this.pending.indexOf(l);
    if (pi >= 0) { this.pending.splice(pi, 1); this.showPrompt(); }
    const r = l.player;
    if (!r || this.links.get(r.id) !== l) return;
    this.links.delete(r.id);
    this.removeRemote(r.id, false, why === 'bye' ? ' left the game' : ' lost connection');
  },
  removeRemote(id, quiet, msg) {
    const r = this.remotes.get(id);
    if (!r) return;
    this.remotes.delete(id);
    if (r.tag) r.tag.remove();
    if (game.world) for (const t of game.world.tiles.values()) if (t.viewers) t.viewers.delete(id);
    if (!quiet) { chat(r.name + (msg || ' left the game'), '#ffff55'); sfx('leave'); }
    if (this.role === 'host') this.broadcast({ t: 'pl', id });
    this.updateUI();
  },
  sendTile(t, x, y, z, only) {
    const msg = { t: 'tile', x, y, z, s: t.slots, burn: r2(t.burn || 0), burnMax: r2(t.burnMax || 0), cook: r2(t.cook || 0) };
    if (only) { const l = this.links.get(only); if (l) l.send(msg); return; }
    if (t.viewers) for (const id of t.viewers) { const l = this.links.get(id); if (l) l.send(msg); }
  },
  /* host: a guest's copy of a chest or furnace they have open */
  applyTile(t, m) {
    if (!Array.isArray(m.s) || m.s.length !== t.slots.length) return false;
    for (let i = 0; i < t.slots.length; i++) t.slots[i] = cleanStack(m.s[i]);
    if (t.type === 'furnace') { const n = (v, hi) => (isFinite(+v) ? clamp(+v, 0, hi) : 0); t.burn = n(m.burn, 3600); t.burnMax = n(m.burnMax, 3600); t.cook = n(m.cook, SMELT_TIME); }
    return true;
  },
  /* host: a chest or furnace a guest had open when we all went through a portal belongs to the world left behind
     (its saved copy holds the same chest), so the guest's last changes go there and nothing is lost or copied */
  staleTile(m, r) {
    const left = game.dims[game.dim === 'nether' ? 'over' : 'nether'], t = left && left.tiles && left.tiles[tileKey(m.x | 0, m.y | 0, m.z | 0)];
    if (!t || !t.viewers || !t.viewers.has(r.id)) return;
    if (m.t === 'close') t.viewers.delete(r.id);
    else this.applyTile(t, m);
  },
  tileChanged(t, except) {
    if (this.role !== 'host') return;
    if (t.viewers && t.viewers.size) {
      for (const [k, v] of game.world.tiles) if (v === t) {
        const p = k.split(',').map(Number);
        for (const id of t.viewers) if (id !== except) this.sendTile(t, p[0], p[1], p[2], id);
      }
    }
    if (ui.inv && ui.inv.tile === t) refreshInv();
  },
  /* host: the name of someone else who has this chest or furnace open, if anyone */
  tileUser(t, except) {
    if (ui.inv && ui.inv.tile === t && except !== 'host') return playerName();
    if (t.viewers) for (const id of t.viewers) { const o = this.remotes.get(id); if (id !== except && o) return o.name; }
    return null;
  },
  /* this device opens a chest or furnace (null when someone else is using it) */
  useTile(x, y, z, kind) {
    if (this.role === 'guest') return this.openTile(x, y, z, kind);
    const t = game.world.getTile(x, y, z, kind), by = this.role === 'host' ? this.tileUser(t, 'host') : null;
    if (by) { toast(by + ' is using this ' + kind + '.', 2.5); return null; }
    return t;
  },
  /* someone clicked a slot in an open chest or furnace screen on this iPad */
  tileTouched(t) {
    if (this.role === 'guest' && t.remote && !t.loading) { this.pushTile(t); this.sendSave(); }   // save right away so the chest and her things always match
    else if (this.role === 'host') this.tileChanged(t);
  },
  pushTile(t) { this.send({ t: 'tile', x: t.x, y: t.y, z: t.z, s: t.slots, burn: r2(t.burn || 0), burnMax: r2(t.burnMax || 0), cook: r2(t.cook || 0) }); },
  closeTile(t) {
    if (this.role !== 'guest' || !t.remote || t.gone) return;
    if (!t.loading) this.pushTile(t);
    this.send({ t: 'close', x: t.x, y: t.y, z: t.z });
    this.sendSave();
  },
  sendDrops(r, loot, x, y, z) { if (r && r.link && loot.length) r.link.send({ t: 'drops', l: loot, x: r2(x), y: r2(y), z: r2(z) }); },
  hurtRemote(r, dmg, cause, kx, ky, kz) {
    if (!r.link) return;
    r.invuln = 0.5;
    r.link.send({ t: 'hurt', a: dmg, c: cause, v: [r2(kx), r2(ky), r2(kz)] });
  },
  explosion(x, y, z, power, reach) {
    this.outFx.push(['boom', r2(x), r2(y), r2(z), power]);
    for (const r of this.remotes.values()) {
      if (!r.alive || !r.lastState) continue;
      const ex = r.tx, ey = r.ty + 0.9, ez = r.tz, d = Math.hypot(ex - x, ey - y, ez - z);
      if (d >= reach) continue;
      const imp = 1 - d / reach, l = d || 1;
      const dmg = r.mode === 'survival' ? Math.floor(((imp * imp + imp) / 2) * 2.4 * power + 1) : 0;
      this.hurtRemote(r, dmg, 'explosion', ((ex - x) / l) * imp * 14, Math.max(3, ((ey - y) / l) * imp * 10), ((ez - z) / l) * imp * 14);
    }
  },
  syncTime() { if (this.role === 'host') this.broadcast({ t: 'time', w: game.world.time, day: game.day }); },
  bedtime(name) {
    const w = game.world, night = w.time > 0.53 && w.time < 0.97;
    if (!night) return;
    const now = performance.now(), recent = t => now - t < 6000;
    const everyone = recent(this.hostSleep) && Array.from(this.remotes.values()).every(r => recent(r.sleepT) || !r.alive);
    if (everyone) {
      w.time = 0.01; game.day++;
      this.hostSleep = 0; for (const r of this.remotes.values()) r.sleepT = 0;
      chat('Good morning! Day ' + game.day + '.');
      this.broadcast({ t: 'chat', m: 'Good morning! Day ' + game.day + '.' });
      this.syncTime();
    } else {
      const line = name + ' is in bed. Everyone needs to sleep to skip the night.';
      chat(line, '#dddddd'); this.broadcast({ t: 'chat', m: line, c: '#dddddd' });
    }
  },

  /* ---------- guest ---------- */
  join(code) {
    code = normalizeCode(code);
    const status = t => { el('join-status').textContent = t; };
    if (code.length < 3) { status('Type the room code shown on the other iPad.'); return; }
    if (!window.RTCPeerConnection || !window.WebSocket) { status("This browser can't play together."); return; }
    this.reset();
    this.role = 'guest'; game.net = this; this.code = code; this.welcomed = false;
    status('Connecting...');
    el('btn-join-go').disabled = true;
    const sig = this.sig = new Signal(PEER_PREFIX + 'g' + randomId(10), {
      onOpen: () => {
        if (this.sig !== sig) return;
        this.hostLink = new Link(sig, roomPeerId(code), 'dc_' + randomId(10), true, {
          onOpen: l => {
            status('Connected! Waiting for the host to let you in...');
            l.send({ t: 'hello', v: MP_PROTO, name: playerName(), skin: PROFILE.skin, pid: PROFILE.pid });
            // the host may take a while to tap Let them in
            clearTimeout(this.joinTimer);
            this.joinTimer = setTimeout(() => { if (this.role === 'guest' && !this.welcomed) this.joinFailed('The host did not answer. Ask them to tap Let them in, then try again.'); }, 150000);
          },
          onMessage: (l, msg) => this.guestMsg(msg),
          onClose: (l, why) => this.guestClosed(why, l),
        });
      },
      onSignal: m => { if (this.sig === sig && this.hostLink) this.hostLink.onSignal(m); },
      onGone: src => {
        if (this.sig !== sig || this.welcomed || src !== roomPeerId(code) || (this.hostLink && this.hostLink.ready)) return;
        this.joinFailed('No game found with the code ' + code + '. Check the code, and that the other iPad tapped Invite a Player.');
      },
      onClose: why => {
        if (this.sig !== sig || this.welcomed || (this.hostLink && this.hostLink.ready)) return;
        this.joinFailed(why === 'offline' ? "Couldn't reach the connection service. Check that this iPad is online." : 'Connection problem. Please try again.');
      },
    });
    this.joinTimer = setTimeout(() => {
      if (this.role !== 'guest' || this.welcomed || (this.hostLink && this.hostLink.opened)) return;
      this.joinFailed("Couldn't connect to that game. Check the code, and that both iPads are online.");
    }, 35000);
  },
  cancelJoin() { if (this.role === 'guest' && !this.welcomed) { if (this.hostLink) this.hostLink.send({ t: 'bye' }); this.reset(); } },
  joinFailed(msg) {
    if (this.role !== 'guest') return;
    const playing = this.welcomed;
    this.reset();
    if (playing) { game.quitToTitle(true); showMsg('Disconnected', msg); return; }
    el('join-status').textContent = msg;
    el('btn-join-go').disabled = false;
  },
  guestClosed(why, l) {
    if (this.role !== 'guest' || (l && l !== this.hostLink)) return;
    if (!this.welcomed) {
      this.joinFailed(why === 'deny' ? 'The host said not now.' : l && !l.opened ? "Couldn't connect to that game. Check the code, and that both iPads are online." : 'The connection closed. Please try again.');
      return;
    }
    const who = this.hostName || 'The host';
    this.reset();
    game.quitToTitle(true);
    showMsg('Disconnected', 'Lost the connection to ' + who + "'s world. Your things were saved there a few seconds ago. Check that both iPads are online, then join again.");
  },
  leave() {
    if (this.role !== 'guest') return;
    this.sendSave();
    this.send({ t: 'bye' });
    const l = this.hostLink;
    this.reset(true);
    setTimeout(() => { if (l) l.close('bye'); }, 400);
  },
  sendSave() {
    if (this.role !== 'guest' || !this.welcomed) return;
    const pl = game.player, at = pl.alive ? [pl.x, pl.y, pl.z] : game.spawnPos();
    this.send({ t: 'save', d: { x: r2(at[0]), y: r2(at[1]), z: r2(at[2]), yaw: r2(pl.yaw), pitch: r2(pl.pitch), health: pl.alive ? pl.health : 20, food: pl.alive ? pl.food : 20, air: pl.air, inv: pl.inv, sel: pl.sel, spawn: pl.spawn, mode: game.mode, flying: pl.flying, dim: game.dim } });
  },
  guestMsg(m) {
    if (this.role !== 'guest') return;
    switch (m.t) {
      case 'deny': this.joinFailed(m.why === 'full' ? 'That game is full.' : m.why === 'version' ? 'The two iPads have different versions of Declan-craft. Close the game on both iPads, open it again while online, and try again.' : 'The host said not now.'); break;
      case 'welcome': this.startGuest(m); break;
      case 'b': if ((m.we | 0) === this.we) { this.applyBlocks(Array.isArray(m.b) ? m.b : []); this.playFx(m.fx); } break;
      case 'dim': {
        if (!this.welcomed || !okXYZ(m.at)) break;
        game.closeForTravel();   // first, so a chest still open here sends its last changes for the world being left
        this.we = m.we | 0;
        this.outBlocks = []; this.outFx = [];   // changes to the world being left must not land in the new one
        for (const e of this.proxies.values()) e.removed = true;
        this.proxies.clear();
        for (const r of this.remotes.values()) { r.has = false; r.lastState = null; }
        game.guestDim({ dim: m.dim, edits: m.edits && typeof m.edits === 'object' ? m.edits : {}, at: m.at, time: m.time, clock: m.clock, ns: m.dim === 'nether' && okXYZ(m.ns) ? m.ns : null });
        break;
      }
      case 'tp': {   // where to step out of the portal
        if ((m.we | 0) !== this.we || !okXYZ(m.at)) break;
        const pl = game.player;
        [pl.x, pl.y, pl.z] = m.at; pl.vx = pl.vy = pl.vz = 0; pl.fallDist = 0; pl.portalLock = true;
        if (isFinite(+m.yaw)) pl.yaw = pl.bodyYaw = +m.yaw;
        if (game.dim === 'nether') game.netherSpawn = m.at.slice();
        game.awaitTp = 0;
        break;
      }
      case 'u': {
        if (!this.welcomed) break;
        this.applyEnts(Array.isArray(m.e) ? m.e : []);
        if (Array.isArray(m.p)) for (const ps of m.p) { const r = ps && this.remotes.get(ps.id); if (r) applyState(r, ps.s); }
        break;
      }
      case 'pj': if (m.id && !this.remotes.has(m.id)) { this.remotes.set(m.id, new RemotePlayer(m.id, cleanName(m.name) || 'Player', m.skin)); chat(cleanName(m.name) + ' joined the game', '#ffff55'); sfx('join'); } break;
      case 'pl': { const r = this.remotes.get(m.id); if (r) { this.removeRemote(m.id, true); chat(r.name + ' left the game', '#ffff55'); sfx('leave'); } break; }
      case 'time': if (game.world && isFinite(+m.w)) { game.world.time = +m.w; game.day = m.day | 0 || game.day; } break;
      case 'hurt': {
        const pl = game.player;
        if (game.state !== 'playing' || !pl.alive) break;
        pl.damage(clamp(+m.a || 0, 0, 40), typeof m.c === 'string' && Object.prototype.hasOwnProperty.call(DEATH_MSG, m.c) ? m.c : 'zombie');
        if (Array.isArray(m.v)) { pl.vx += +m.v[0] || 0; pl.vy = Math.max(pl.vy, +m.v[1] || 0); pl.vz += +m.v[2] || 0; }
        break;
      }
      case 'drops': if (Array.isArray(m.l)) for (const it of m.l) { const s = cleanStack({ id: it[0], count: it[1], dmg: it[2] }); if (s) { const e = dropItem(game, +m.x, +m.y, +m.z, s.id, s.count, true); if (e && s.dmg) e.dmg = s.dmg; } } break;
      case 'tile': {   // what is inside a chest or furnace this device just opened (it then runs here until closed)
        const t = ui.inv && ui.inv.tile;
        if (!t || !t.remote || !t.loading || t.x !== m.x || t.y !== m.y || t.z !== m.z) break;
        if (Array.isArray(m.s) && m.s.length === t.slots.length) for (let i = 0; i < t.slots.length; i++) t.slots[i] = cleanStack(m.s[i]);
        t.burn = +m.burn || 0; t.burnMax = +m.burnMax || 0; t.cook = +m.cook || 0; t.loading = false;
        refreshInv();
        break;
      }
      case 'busy': {
        const t = ui.inv && ui.inv.tile;
        if (!t || !t.remote || t.x !== m.x || t.y !== m.y || t.z !== m.z) break;
        t.loading = false; t.gone = true;
        game.closeUI();
        toast(m.by ? cleanName(m.by) + ' is using this ' + t.type + '.' : 'Try that again in a moment.', 2.5);
        break;
      }
      case 'chat': chat(String(m.m || '').slice(0, 160), typeof m.c === 'string' ? m.c : undefined); break;
      case 'closing': {
        const who = this.hostName || 'The host', l = this.hostLink;
        if (ui.inv && ui.inv.tile && ui.inv.tile.remote) this.closeTile(ui.inv.tile);
        this.sendSave();   // the host writes this last one into its world
        this.reset(true);
        setTimeout(() => { if (l) l.close('bye'); }, 1000);
        game.quitToTitle(true);
        showMsg('Game ended', who + ' saved and closed their world. Your things are saved in it for next time.');
        break;
      }
    }
  },
  startGuest(m) {
    if (this.welcomed) return;
    this.welcomed = true;
    clearTimeout(this.joinTimer);
    if (this.sig) { const s = this.sig; this.sig = null; s.close(); }
    this.hostName = cleanName(m.host) || 'Host';
    this.remotes.clear();
    for (const p of Array.isArray(m.players) ? m.players : []) if (p && p.id) this.remotes.set(p.id, new RemotePlayer(p.id, cleanName(p.name) || 'Player', p.skin));
    const you = m.you ? cleanGuestSave(m.you) : null;
    const at = okXYZ(m.at) ? m.at : null;
    this.we = m.we | 0;
    const ns = okXYZ(m.ns) ? m.ns : null;
    game.startGuestWorld({ map: m.map, seed: m.seed | 0, vb: Array.isArray(m.vb) ? m.vb.map(String) : [], edits: m.edits && typeof m.edits === 'object' ? m.edits : {}, dim: m.dim, ns,
      time: +m.time || 0.02, clock: +m.clock || 0, day: m.day | 0 || 1, mode: m.mode === 'creative' ? 'creative' : 'survival',
      spawn: Array.isArray(m.spawn) ? m.spawn : null, you, at, tpWait: !!m.wait });
    this.hookWorld();
    this.updateUI();
    chat('You joined ' + this.hostName + "'s world!", '#ffff55'); sfx('join');
  },
  applyBlocks(b) {
    const w = game.world;
    if (!w || !this.welcomed) return;
    this.applying = true;
    for (let i = 0; i + 4 < b.length; i += 5) {
      const id = b[i + 3] | 0;
      if (id >= 0 && id < 255 && BLOCKS[id]) w.applyRemote(b[i] | 0, b[i + 1] | 0, b[i + 2] | 0, id, b[i + 4] & 255);
    }
    this.applying = false;
    const t = ui.inv && ui.inv.tile;
    if (t && t.remote) { const id = w.getBlock(t.x, t.y, t.z); if (id !== B.CHEST && id !== B.FURNACE && id !== B.FURNACE_LIT && id !== B.UNLOADED) game.closeUI(); }
  },
  applyEnts(list) {
    const seen = new Set();
    for (const a of list) {
      if (!Array.isArray(a) || a.length < 6) continue;
      const nid = a[0], ti = a[1] | 0;
      seen.add(nid);
      let e = this.proxies.get(nid);
      if (e && e.removed) { this.proxies.delete(nid); e = null; if (ti >= 0 && (a[9] & 2)) continue; }
      if (!e) {
        const type = ti >= 0 ? MOB_TYPES[ti] : ti === -1 ? 'tnt' : ti === -2 ? 'falling' : null;
        if (!type) continue;
        e = new Entity(type, +a[2], +a[3], +a[4]);
        e.proxy = true; e.nid = nid;
        if (ti >= 0) { const d = MOB_DEFS[type]; e.mob = true; e.w = d.w; e.h = d.h; e.hp = d.hp; e.bodyYaw = e.headYaw = +a[5] || 0; }
        else { e.w = 0.49; e.h = 0.98; }
        this.proxies.set(nid, e);
        game.entities.push(e);
      }
      e.tx = +a[2]; e.ty = +a[3]; e.tz = +a[4];
      if (ti >= 0) {
        e.bodyT = +a[5] || 0; e.headT = +a[6] || 0; e.pitchT = +a[7] || 0; e.walkT = +a[8] || 0;
        const f = a[9] | 0;
        if (f & 1) e.hurt = Math.max(e.hurt, 0.15);
        if ((f & 2) && !e.dead) e.dead = 0.001;
        if (f & 4) e.armSwing = 0.3;
        e.onGround = !!(f & 8);
        e.fuse = +a[10] || 0;
        const x = a[11] | 0;
        if (e.type === 'sheep' && e.wool !== x) { e.wool = clamp(x, 0, 15); e.color = hexRGB(WOOL_COLORS[e.wool]).map(v => v / 255); }
        if (e.type === 'villager') { e.prof = VILLAGER_PROFS[Math.floor(x / 100000)] || 'farmer'; e.vseed = x % 100000; }
        if (e.type === 'magma') { e.size = clamp(x, 1, 2); e.w = 0.3 * e.size; e.h = 0.6 * e.size; }
        if (e.type === 'piglin') e.angry = x === 1;
      } else if (ti === -1) e.fuse = +a[5] || 0;
      else e.id = BLOCKS[a[5] | 0] ? a[5] | 0 : B.SAND;
    }
    for (const [nid, e] of this.proxies) {
      if (seen.has(nid)) continue;
      if (e.dead && e.dead < 0.9 && !e.removed) continue;
      e.removed = true;
      this.proxies.delete(nid);
    }
  },
  openTile(x, y, z, kind) {
    const t = kind === 'chest' ? { type: 'chest', slots: new Array(27).fill(null) } : { type: 'furnace', slots: [null, null, null], burn: 0, burnMax: 0, cook: 0 };
    Object.assign(t, { remote: true, loading: true, x, y, z });
    this.send({ t: 'open', x, y, z });
    return t;
  },
  sendHit(e, dmg, fx, fz) { this.send({ t: 'hit', e: e.nid, d: dmg, x: r2(fx), z: r2(fz) }); },

  /* ---------- both ---------- */
  hookWorld() {
    const w = game.world;
    if (!w) return;
    w.onChange = (x, y, z, id, d) => { if (this.role === 'host' || (this.role === 'guest' && !this.applying)) this.outBlocks.push(x, y, z, id, d); };
  },
  localFx(kind, x, y, z, id) { if (this.role) this.outFx.push([kind, x, y, z, id, this.role === 'host' ? 'host' : PROFILE.pid]); },
  /* host: sounds from a guest's action, played here and passed on to everyone else */
  takeFx(list, from) {
    if (!Array.isArray(list)) return;
    const ok = list.filter(f => Array.isArray(f) && FX_KINDS.includes(f[0]) && f[0] !== 'boom' && [1, 2, 3, 4].every(i => typeof f[i] === 'number' && isFinite(f[i]))).slice(0, 64);
    this.playFx(ok);
    for (const f of ok) this.outFx.push([f[0], f[1], f[2], f[3], f[4], from]);
  },
  playFx(list) {
    if (!Array.isArray(list)) return;
    for (const f of list) {
      if (!Array.isArray(f) || (this.role === 'guest' && f[5] === PROFILE.pid)) continue;
      const k = f[0], x = +f[1], y = +f[2], z = +f[3], id = f[4] | 0;
      if (![x, y, z].every(isFinite)) continue;
      if (k === 'break' && BLOCKS[id]) { sfx('break_' + SOUND_OF(id), x + 0.5, y + 0.5, z + 0.5); blockParticles(x, y, z, id, 10, true); }
      else if (k === 'place' && BLOCKS[id]) sfx('place_' + SOUND_OF(id), x + 0.5, y + 0.5, z + 0.5);
      else if (k === 'door') sfx('door', x + 0.5, y + 0.5, z + 0.5);
      else if (k === 'boom') {
        const p = clamp(+f[4] || 3, 1, 6);
        sfx('explode', x, y, z); smokeParticles(x, y, z, 40, p * 0.6, true);
        if (Math.hypot(game.player.x - x, game.player.z - z) < 24) game.shake = Math.max(game.shake || 0, 0.25 + p * 0.08);
      }
    }
  },
  say(text) {
    if (this.role === 'guest') { chat('<' + playerName() + '> ' + text); this.send({ t: 'chat', m: text }); return; }
    const line = '<' + playerName() + '> ' + text;
    chat(line);
    if (this.role === 'host') this.broadcast({ t: 'chat', m: line });
  },
  system(text) {
    if (this.role === 'guest') this.send({ t: 'chat', m: text, sys: 1 });
    else if (this.role === 'host') this.broadcast({ t: 'chat', m: text, c: '#dddddd' });
  },
  sleepStart() { if (this.role === 'guest') this.send({ t: 'sleep' }); else if (this.role === 'host') { this.hostSleep = performance.now(); this.bedtime(playerName()); } },
  tick(dt) {
    if (!this.role) return;
    const now = performance.now(), w = game.world;
    for (const r of this.remotes.values()) updateRemote(r, dt);
    if (this.role === 'host') {
      if (this.outBlocks.length || this.outFx.length) {
        const msg = { t: 'b', b: this.outBlocks, fx: this.outFx, we: this.we };
        this.broadcast(msg);
        this.outBlocks = []; this.outFx = [];
      }
      if (w) w.extraCenters = Array.from(this.remotes.values()).filter(r => r.lastState).map(r => [r.tx, r.tz]);
      this.snapT += dt;
      if (this.snapT >= 0.1) {
        this.snapT = 0;
        const me = { id: 'host', s: encodeState(game.player) };
        for (const l of this.links.values()) {
          const r = l.player;
          if (!r) continue;
          const ents = [];
          for (const e of game.entities) {
            if (e.removed || !(e.mob || e.type === 'tnt' || e.type === 'falling') || Math.abs(e.x - r.tx) > 72 || Math.abs(e.z - r.tz) > 72) continue;
            const a = encodeEnt(e);
            if (a) ents.push(a);
          }
          const ps = [me];
          for (const o of this.remotes.values()) if (o !== r && o.lastState) ps.push({ id: o.id, s: o.lastState });
          l.send({ t: 'u', e: ents, p: ps });
        }
      }
      this.timeT += dt;
      if (this.timeT >= 2) { this.timeT = 0; this.syncTime(); }
    } else if (this.welcomed) {
      if (this.outBlocks.length || this.outFx.length) {
        this.send({ t: 'set', b: this.outBlocks, fx: this.outFx });   // (send adds the world epoch)
        this.outBlocks = []; this.outFx = [];
      }
      this.snapT += dt;
      if (this.snapT >= 0.1) { this.snapT = 0; this.send({ t: 'st', s: encodeState(game.player) }); }
      this.saveT += dt;
      if (this.saveT >= 3) { this.saveT = 0; this.sendSave(); }
      // a furnace open on this device cooks here, and the host gets its state twice a second
      const ft = ui.inv && ui.inv.tile;
      if (ft && ft.remote && !ft.loading && ft.type === 'furnace') {
        stepFurnace(ft, dt);
        if (w) w.lightFurnace(ft.x, ft.y, ft.z, ft);
        this.tileT += dt;
        if (this.tileT >= 0.5) { this.tileT = 0; this.pushTile(ft); }
      }
      const quiet = this.hostLink ? now - this.hostLink.lastRx : 0;
      el('net-wait').hidden = quiet < 3000;
      if (quiet > 3000) el('net-wait').textContent = 'Waiting for ' + this.hostName + '...';
    }
  },
  updateTags() {
    const box = el('nametags'), W = window.innerWidth, H = window.innerHeight, cam = R.cam, m = R.vp;
    for (const r of this.remotes.values()) {
      if (!r.tag) { r.tag = h('div', { class: 'nametag' }, r.name); box.appendChild(r.tag); }
      const x = r.x - cam.x, y = r.y + (r.sneaking ? 1.95 : 2.2) - cam.y, z = r.z - cam.z;
      const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
      if (cw <= 0.1 || !r.has || !r.alive || Math.hypot(x, y, z) > 48 || game.state !== 'playing') { r.tag.style.display = 'none'; continue; }
      const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13];
      const sx = (cx / cw * 0.5 + 0.5) * W, sy = (1 - (cy / cw * 0.5 + 0.5)) * H;
      r.tag.style.display = '';
      r.tag.style.transform = 'translate(' + Math.round(sx) + 'px,' + Math.round(sy) + 'px) translate(-50%, -100%)';
    }
  },
  updateUI() {
    const badge = el('room-badge'), box = el('pause-room');
    el('tb-chat').hidden = !(this.role === 'host' || (this.role === 'guest' && this.welcomed));
    if (this.role === 'host') {
      const n = this.remotes.size + 1;
      badge.hidden = false;
      badge.textContent = this.roomOpen ? 'Room ' + this.code + (n > 1 ? ' - ' + n + ' players' : '') : (n > 1 ? n + ' players' : 'Opening room...');
      el('btn-invite').hidden = true; box.hidden = false;
      el('room-code-big').textContent = this.roomOpen ? this.code : '...';
      el('room-help').textContent = (this.roomOpen ? 'On the other iPad, tap Play Together, then Join a Game, and type ' + this.code + '.' : 'Opening a room. The iPad needs to be online.') +
        (this.remotes.size ? ' Playing now: ' + Array.from(this.remotes.values(), r => r.name).join(', ') + '.' : '');
      el('btn-quit').textContent = 'Save and Quit to Title';
    } else if (this.role === 'guest' && this.welcomed) {
      badge.hidden = false; badge.textContent = 'In ' + this.hostName + "'s world";
      el('btn-invite').hidden = true; box.hidden = true;
      el('btn-quit').textContent = 'Leave ' + this.hostName + "'s World";
    } else {
      badge.hidden = true; box.hidden = true;
      el('btn-invite').hidden = false;
      el('btn-quit').textContent = 'Save and Quit to Title';
    }
  },
  /* everything back to single-player (sockets are closed quietly) */
  reset(keepHostLink) {
    const links = this.allLinks(), hl = keepHostLink ? null : this.hostLink, sig = this.sig;
    this.role = null; game.net = null;
    this.sig = null; this.hostLink = null; this.roomOpen = false; this.welcomed = false; this.code = '';
    clearTimeout(this.joinTimer); clearTimeout(this.reopenT);
    for (const r of this.remotes.values()) if (r.tag) r.tag.remove();
    this.remotes.clear(); this.links.clear(); this.newLinks.clear(); this.pending = [];
    for (const e of this.proxies.values()) e.removed = true;
    this.proxies.clear();
    this.outBlocks = []; this.outFx = []; this.applying = false;
    if (game.world) { game.world.onChange = null; game.world.extraCenters = []; }
    el('join-prompt').hidden = true; el('net-wait').hidden = true;
    if (sig) sig.close();
    for (const l of links) l.close('bye');
    if (hl) hl.close('bye');
    this.updateUI();
  },
  /* host: send block changes still waiting (before the world changes under them) */
  flush() {
    if (this.role !== 'host' || !(this.outBlocks.length || this.outFx.length)) return;
    this.broadcast({ t: 'b', b: this.outBlocks, fx: this.outFx, we: this.we });
    this.outBlocks = []; this.outFx = [];
  },
  /* host: we went through a portal; everyone else comes too */
  dimChanged(who) {
    if (this.role !== 'host') return;
    this.we++;
    const w = game.world, pl = game.player, edits = w.serialize().edits;
    for (const r of this.remotes.values()) { r.lastState = null; r.has = false; r.sleepT = 0; r.tx = r.x = pl.x; r.ty = r.y = pl.y; r.tz = r.z = pl.z; }   // they are coming here
    for (const t of w.tiles.values()) if (t.viewers) t.viewers.clear();
    const line = (who || playerName()) + (game.dim === 'nether' ? ' went into the Nether' : ' went back to ' + MAPS[game.mapId].name) + '. Everyone travels together!';
    chat(line, '#ff9966');
    this.broadcast({ t: 'dim', dim: game.dim, we: this.we, edits, at: [r2(pl.x), r2(pl.y), r2(pl.z)], time: w.time, clock: w.clock, ns: game.netherSpawn });
    this.broadcast({ t: 'chat', m: line, c: '#ff9966' });
  },
  /* host: the portal on the other side is ready: everyone steps out of it */
  arrived(p) {
    if (this.role !== 'host') return;
    const w = game.world, at = (s, dy) => w.getBlock(Math.floor(s[0]), Math.floor(s[1] + dy), Math.floor(s[2]));
    const safe = s => solidGround(at(s, -0.5)) && roomy(at(s, 0.1)) && roomy(at(s, 1.1));   // firm ground, and no lava or water to stand in
    let i = 0;
    for (const l of this.links.values()) {
      const side = [0, -0.7, 0.7][i % 3];
      let k = i < 3 ? 1 : 2, s = portalSpot(p, k, side);
      if (!safe(s)) { k = -k; s = portalSpot(p, k, side); }
      if (!safe(s)) { k = 0; s = portalSpot(p, 0, 0); }   // inside the portal always has the frame to stand on
      if (l.player) { const r = l.player; r.tx = r.x = s[0]; r.ty = r.y = s[1]; r.tz = r.z = s[2]; }
      l.send({ t: 'tp', we: this.we, at: s.map(r2), yaw: r2(portalYaw(p) + (k < 0 ? Math.PI : 0)) });   // facing away from the portal
      i++;
    }
  },
  /* host leaving (after saving): tell everyone, take each guest's last save for a moment, then close */
  stop() {
    if (this.role !== 'host') { this.reset(); return; }
    this.broadcast({ t: 'closing' });
    const links = this.allLinks(), map = game.mapId;
    for (const l of links) {
      const r = l.player;
      l.h = { onMessage: (l2, m) => { if (r && m.t === 'save') { const d = cleanGuestSave(m.d); if (d) patchSavedGuest(map, r.id, Object.assign(d, { name: r.name })); } } };
    }
    this.links.clear(); this.newLinks.clear();
    this.reset();
    setTimeout(() => { for (const l of links) l.close('bye'); }, 1500);
  },
};
function drawRemotePlayers(game, s, t, cam) {
  for (const r of MP.remotes.values()) {
    if (!r.has || !r.alive) continue;
    const dx = r.x - cam.x, dz = r.z - cam.z;
    if (dx * dx + dz * dz > R.fogEnd * R.fogEnd) continue;
    if (!boxInFrustum(R.planes, dx - 1, r.y - cam.y, dz - 1, dx + 1, r.y - cam.y + 2.2, dz + 1)) continue;
    entityBegin(texSkins);
    gl.enable(gl.CULL_FACE);
    drawHumanoid(r, playerModelFor(r.skin), r.held, s, t, cam);
  }
  entityBegin(texSkins);
}
/* write one guest's things into a saved world (used just after the host closed it) */
function patchSavedGuest(map, id, d) {
  if (MP.guestSavesMap === map) MP.guestSaves[id] = d;
  const key = saveKey(map), raw = store.get(key);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (!data.players || typeof data.players !== 'object') data.players = {};
    data.players[id] = d;
    store.set(key, JSON.stringify(data));
  } catch (e) { /* leave the save as it was */ }
}
function showMsg(title, text) {
  el('msg-title').textContent = title;
  el('msg-text').textContent = text;
  showScreen('scr-msg');
}
