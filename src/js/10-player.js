/* ===================== Player ===================== */
function rayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
  let tmin = -Infinity, tmax = Infinity;
  const o = [ox, oy, oz], d = [dx, dy, dz], lo = [x0, y0, z0], hi = [x1, y1, z1];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) { if (o[a] < lo[a] || o[a] > hi[a]) return -1; continue; }
    let t1 = (lo[a] - o[a]) / d[a], t2 = (hi[a] - o[a]) / d[a];
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }
  return tmax < 0 ? -1 : Math.max(tmin, 0);
}
function raycast(world, ox, oy, oz, dx, dy, dz, maxD) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity, tdz = dz ? Math.abs(1 / dz) : Infinity;
  let tmx = dx ? (dx > 0 ? x + 1 - ox : ox - x) * tdx : Infinity;
  let tmy = dy ? (dy > 0 ? y + 1 - oy : oy - y) * tdy : Infinity;
  let tmz = dz ? (dz > 0 ? z + 1 - oz : oz - z) * tdz : Infinity;
  let face = -1, t = 0;
  for (let i = 0; i < 64 && t <= maxD; i++) {
    const b = world.getBlock(x, y, z);
    if (TARGETABLE[b]) {
      const bd = BLOCKS[b], bx = bd.boxFn ? bd.boxFn(world.getData(x, y, z)) : bd.box;
      if (!bx) return { x, y, z, id: b, face, t };
      const tb = rayBox(ox, oy, oz, dx, dy, dz, x + bx[0], y + bx[1], z + bx[2], x + bx[3], y + bx[4], z + bx[5]);
      if (tb >= 0 && tb <= maxD) return { x, y, z, id: b, face, t: tb };
    }
    if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; face = sx > 0 ? 1 : 0; }
    else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; face = sy > 0 ? 3 : 2; }
    else { z += sz; t = tmz; tmz += tdz; face = sz > 0 ? 5 : 4; }
  }
  return null;
}
function facingFromYaw(yaw) {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  if (Math.abs(s) > Math.abs(c)) return s > 0 ? 3 : 1;
  return c > 0 ? 0 : 2;
}
function breakTime(id, held) {
  const d = BLOCKS[id];
  if (!d || d.hardness < 0) return -1;
  if (d.hardness === 0) return 0.05;
  const tool = toolOf(held);
  const right = tool && tool.kind === d.tool;
  const can = d.tier === 0 || (right && tool.tier >= d.tier);
  let speed = right ? tool.speed : 1;
  if (tool && tool.kind === 'sword' && (id === B.OAK_LEAVES || id === B.BIRCH_LEAVES || id === B.SPRUCE_LEAVES)) speed = 1.5;
  return (d.hardness * (can ? 1.5 : 5)) / speed;
}
const SOUND_OF = id => (BLOCKS[id] && BLOCKS[id].sound) || 'stone';

class Player {
  constructor() {
    this.x = 0.5; this.y = 90; this.z = 0.5; this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0; this.pitch = 0; this.w = 0.3; this.h = 1.8; this.eye = 1.62;
    this.onGround = false; this.flying = false; this.sneaking = false; this.sprinting = false;
    this.inWater = false; this.inLava = false; this.headInWater = false;
    this.health = 20; this.food = 20; this.air = 10; this.alive = true;
    this.inv = new Array(36).fill(null); this.sel = 0;
    this.spawn = null; this.fallDist = 0; this.invuln = 0;
    this.regenT = 0; this.foodT = 0; this.airT = 0; this.hazardT = 0; this.starveT = 0;
    this.walk = 0; this.walkAmt = 0; this.bodyYaw = 0; this.swingP = 1; this.equip = 1; this.lastHeld = -2;
    this.mining = null; this.eatT = 0; this.eatSndT = 0; this.useCd = 0; this.breakCd = 0; this.attackCd = 0; this.jumpCd = 0;
    this.bob = 0; this.bobAmt = 0; this.stepT = 0; this.target = null; this.targetEnt = null; this.digSndT = 0;
    this.lastJump = -1; this.lastFwd = -1;
  }
  held() { return this.inv[this.sel]; }
  heldId() { const s = this.inv[this.sel]; return s ? s.id : 0; }
  swing() { if (this.swingP >= 0.5 || this.swingP === 1) this.swingP = 0; }
  damage(amount, cause, src) {
    if (!this.alive || game.mode === 'creative' || amount <= 0) return;
    if (this.invuln > 0 && cause !== 'void') return;
    this.health -= amount;
    this.invuln = 0.5;
    game.hurtFlash = 0.45;
    game.hurtTilt = 1;
    this.lastCause = cause;
    sfx('hurt');
    if (this.health <= 0) { this.health = 0; this.alive = false; game.onDeath(cause, src); }
  }
  addFoodExhaust(v) { if (game.mode === 'survival' && game.settings.difficulty > 0) this.foodT += v; }

  update(dt) {
    const inp = game.input, world = game.world, creative = game.mode === 'creative';
    if (this.invuln > 0) this.invuln -= dt;
    if (this.jumpCd > 0) this.jumpCd -= dt;
    let fx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0) + inp.joyX;
    let fz = (inp.fwd ? 1 : 0) - (inp.back ? 1 : 0) + inp.joyY;
    const len = Math.hypot(fx, fz);
    if (len > 1) { fx /= len; fz /= len; }
    this.sneaking = !!inp.sneak && !this.flying;
    if ((inp.sprint || inp.joySprint) && fz > 0.5 && !this.sneaking && (this.food > 6 || creative)) this.sprinting = true;
    if (fz <= 0.2 || this.sneaking || (this.collidedH && !this.flying)) this.sprinting = false;
    let speed = this.flying ? (this.sprinting ? 21.6 : 10.9) : this.sneaking ? 1.3 : this.sprinting ? 5.6 : 4.317;
    if ((this.inWater || this.inLava) && !this.flying) speed *= this.inLava ? 0.35 : 0.55;
    if (this.eatT > 0) speed *= 0.4;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const wx = (-sy * fz + cy * fx) * speed, wz = (-cy * fz - sy * fx) * speed;
    const ice = world.getBlock(Math.floor(this.x), Math.floor(this.y - 0.1), Math.floor(this.z)) === B.ICE;
    const acc = this.flying ? 6 : this.onGround ? (ice ? 2 : 14) : (this.inWater ? 6 : 2.4);
    this.vx += (wx - this.vx) * Math.min(1, acc * dt);
    this.vz += (wz - this.vz) * Math.min(1, acc * dt);
    if (this.flying) {
      const tv = (inp.jump ? 8 : 0) - (inp.sneak ? 8 : 0);
      this.vy += (tv - this.vy) * Math.min(1, 10 * dt);
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(this.vx), Math.abs(this.vz), Math.abs(this.vy)) * dt / 0.4));
      for (let i = 0; i < steps; i++) moveEntity(world, this, this.vx * dt / steps, this.vy * dt / steps, this.vz * dt / steps);
      liquidAt(world, this);
      if (this.onGround && !creative) this.flying = false;
      if (this.onGround && inp.sneak) this.flying = false;
      this.fallDist = 0;
    } else {
      if (inp.jump) {
        if (this.inWater || this.inLava) this.vy = Math.min(this.vy + 26 * dt, 3.4);
        else if (this.onGround && this.jumpCd <= 0) {
          this.vy = 8.7; this.jumpCd = 0.12;
          if (this.sprinting) { this.vx += -sy * 1.4; this.vz += -cy * 1.4; }
          this.addFoodExhaust(this.sprinting ? 0.8 : 0.2);
        }
      }
      if (this.sneaking && this.onGround) {
        let dx = this.vx * dt, dz = this.vz * dt;
        const st = 0.02;
        while (dx !== 0 && boxFree(world, this.x + dx, this.y - 0.6, this.z, this.w - 0.02, 0.58)) dx = Math.abs(dx) <= st ? 0 : dx - Math.sign(dx) * st;
        while (dz !== 0 && boxFree(world, this.x + dx, this.y - 0.6, this.z + dz, this.w - 0.02, 0.58)) dz = Math.abs(dz) <= st ? 0 : dz - Math.sign(dz) * st;
        this.vx = dx / dt; this.vz = dz / dt;
      }
      physicsStep(world, this, dt, 30);
      if (this.landed) {
        if (this.fallDist > 3.5 && !creative) this.damage(Math.floor(this.fallDist - 3), 'fall');
        if (this.fallDist > 1.2) sfx('step_' + SOUND_OF(world.getBlock(Math.floor(this.x), Math.floor(this.y - 0.2), Math.floor(this.z))), this.x, this.y, this.z, 0.6);
        this.fallDist = 0;
      }
      if (this.onGround) this.fallDist = 0;
      if (game.settings.autoJump && this.onGround && this.collidedH && len > 0.3) {
        const dirx = wx / (speed || 1), dirz = wz / (speed || 1);
        if (boxFree(world, this.x + dirx * 0.45, this.y + 1.05, this.z + dirz * 0.45, this.w, this.h)) this.vy = 8.7;
      }
    }
    this.h = this.sneaking ? 1.5 : 1.8;
    const eyeT = this.sneaking ? 1.27 : 1.62;
    this.eye += (eyeT - this.eye) * Math.min(1, dt * 12);
    this.collidedH = this.collidedH || false;
    const eb = world.getBlock(Math.floor(this.x), Math.floor(this.y + this.eye), Math.floor(this.z));
    this.headInWater = eb === B.WATER; this.headInLava = eb === B.LAVA;
    // walking animation and footsteps
    const hs = Math.hypot(this.vx, this.vz);
    this.walk += hs * dt * 2.6;
    this.walkAmt = lerp(this.walkAmt, this.onGround || this.flying ? Math.min(1, hs / 4.3) : 0, Math.min(1, dt * 8));
    if (this.onGround && hs > 1 && !this.sneaking) {
      this.stepT -= dt * hs;
      if (this.stepT <= 0) { this.stepT = 1.9; sfx('step_' + SOUND_OF(world.getBlock(Math.floor(this.x), Math.floor(this.y - 0.2), Math.floor(this.z))), this.x, this.y, this.z, 0.35); }
    }
    this.bob += hs * dt * 1.9;
    this.bobAmt = lerp(this.bobAmt, this.onGround && !this.flying ? Math.min(1, hs / 4.3) : 0, Math.min(1, dt * 6));
    if (hs > 0.5) this.bodyYaw = approachAngle(this.bodyYaw, Math.atan2(-this.vx, -this.vz), dt * 8);
    const d = ((this.yaw - this.bodyYaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
    if (Math.abs(d) > 0.9) this.bodyYaw = this.yaw - Math.sign(d) * 0.9;
    if (this.swingP < 1) this.swingP = Math.min(1, this.swingP + dt * 3.3);
    const hid = this.heldId();
    if (hid !== this.lastHeld) { this.equip = 0; this.lastHeld = hid; }
    this.equip = Math.min(1, this.equip + dt * 5);
    this.vitals(dt, creative);
    this.interact(dt, creative);
  }
  vitals(dt, creative) {
    const world = game.world;
    if (!this.alive) return;
    if (this.y < -24) {
      if (creative) { this.y = Math.max(world.topSolid(Math.floor(this.x), Math.floor(this.z)), 70) + 3; this.vy = 0; this.flying = true; }
      else this.damage(1000, 'void');
      return;
    }
    if (creative) { this.health = 20; this.food = 20; this.air = 10; return; }
    this.hazardT -= dt;
    if (this.inLava && this.hazardT <= 0) { this.hazardT = 0.5; this.damage(4, 'lava'); }
    if (this.hazardT <= 0) {
      collideBoxes(world, this.x - this.w - 0.05, this.y - 0.05, this.z - this.w - 0.05, this.x + this.w + 0.05, this.y + this.h, this.z + this.w + 0.05, _boxes);
      for (let i = 0; i < _boxes.length; i += 6) {
        const b = world.getBlock(Math.floor(_boxes[i]), Math.floor(_boxes[i + 1]), Math.floor(_boxes[i + 2]));
        if (b === B.CACTUS && this.x + this.w + 0.05 > _boxes[i] && this.x - this.w - 0.05 < _boxes[i + 3] && this.z + this.w + 0.05 > _boxes[i + 2] && this.z - this.w - 0.05 < _boxes[i + 5] && this.y < _boxes[i + 4] && this.y + this.h > _boxes[i + 1]) {
          this.hazardT = 0.5; this.damage(1, 'cactus'); break;
        }
      }
    }
    if (this.headInWater) {
      this.airT += dt;
      if (this.airT > 1.5) { this.airT = 0; if (this.air > 0) this.air--; else this.damage(2, 'drown'); }
    } else { this.airT = 0; if (this.air < 10) { this.regAirT = (this.regAirT || 0) + dt; if (this.regAirT > 0.2) { this.regAirT = 0; this.air++; } } }
    const diff = game.settings.difficulty;
    const moving = Math.hypot(this.vx, this.vz) > 0.5;
    if (diff > 0) {
      this.foodT += dt * (this.sprinting ? 3 : moving ? 1 : 0.6);
      if (this.foodT >= 45) { this.foodT -= 45; this.food = Math.max(0, this.food - 1); }
    } else this.food = 20;
    if (this.health < 20 && (this.food >= 18 || diff === 0)) {
      this.regenT += dt;
      if (this.regenT >= (diff === 0 ? 1.5 : 3)) { this.regenT = 0; this.health = Math.min(20, this.health + 1); this.addFoodExhaust(6); }
    } else this.regenT = 0;
    if (this.food <= 0 && this.health > 1) {
      this.starveT += dt;
      if (this.starveT > 4) { this.starveT = 0; this.damage(1, 'starve'); }
    }
  }
  eyePos() { return [this.x, this.y + this.eye, this.z]; }
  lookDir() { const cp = Math.cos(this.pitch); return [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp]; }
  pickTarget() {
    const [ox, oy, oz] = this.eyePos(), [dx, dy, dz] = this.lookDir();
    const reach = game.mode === 'creative' ? 5.5 : 4.6;
    const hit = raycast(game.world, ox, oy, oz, dx, dy, dz, reach);
    let best = null, bt = hit ? hit.t : reach;
    for (const e of game.entities) {
      if (!e.mob || e.dead) continue;
      const t = rayBox(ox, oy, oz, dx, dy, dz, e.x - e.w, e.y, e.z - e.w, e.x + e.w, e.y + e.h, e.z + e.w);
      if (t >= 0 && t < bt) { bt = t; best = e; }
    }
    this.targetEnt = best;
    this.target = best ? null : hit;
  }
  interact(dt, creative) {
    const inp = game.input, world = game.world;
    if (this.useCd > 0) this.useCd -= dt;
    if (this.breakCd > 0) this.breakCd -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (!this.alive || game.uiOpen) { this.mining = null; this.eatT = 0; return; }
    this.pickTarget();
    const held = this.held(), hid = held ? held.id : 0;
    // attack / mine
    if (inp.mine) {
      if (this.targetEnt) {
        this.mining = null;
        if (inp.minePressed || this.attackCd <= 0) {
          if (this.attackCd <= 0) {
            const tool = toolOf(hid);
            const dmg = tool ? tool.dmg : 1;
            hurtMob(game, this.targetEnt, this.sprinting ? dmg + 1 : dmg, this.x, this.z, 'player');
            this.attackCd = 0.4;
            this.swing();
            if (tool && !creative) this.damageTool(tool.kind === 'sword' ? 1 : 2);
            this.addFoodExhaust(0.5);
          }
        }
      } else if (this.target) {
        const t = this.target;
        if (creative) {
          if (this.breakCd <= 0 && !(toolOf(hid) && toolOf(hid).kind === 'sword')) { this.breakBlock(t.x, t.y, t.z, false); this.breakCd = 0.22; this.swing(); }
        } else {
          if (!this.mining || this.mining.x !== t.x || this.mining.y !== t.y || this.mining.z !== t.z || this.mining.id !== t.id) this.mining = { x: t.x, y: t.y, z: t.z, id: t.id, p: 0 };
          const bt = breakTime(t.id, hid);
          if (bt >= 0 && this.breakCd <= 0) {
            this.mining.p += dt / Math.max(bt, 0.05);
            if (this.swingP >= 0.6) this.swing();
            this.digSndT -= dt;
            if (this.digSndT <= 0) { this.digSndT = 0.24; sfx('dig_' + SOUND_OF(t.id), t.x + 0.5, t.y + 0.5, t.z + 0.5, 0.5); blockParticles(t.x, t.y, t.z, t.id, 2, false); }
            if (this.mining.p >= 1) { this.breakBlock(t.x, t.y, t.z, true); this.mining = null; this.breakCd = 0.18; }
          }
        }
      } else { this.mining = null; if (inp.minePressed) this.swing(); }
    } else this.mining = null;
    inp.minePressed = false;
    // use / place / eat
    const food = hid >= 256 && ITEMS[hid].food;
    if (inp.use && food && (this.food < 20 || creative) && !(this.target && !this.sneaking && this.isInteractive(this.target.id))) {
      this.eatT += dt;
      this.eatSndT -= dt;
      if (this.eatSndT <= 0) { this.eatSndT = 0.22; sfx('eat'); }
      if (this.eatT >= 1.6) {
        this.eatT = 0;
        this.food = Math.min(20, this.food + ITEMS[hid].food);
        if (!creative) this.consumeHeld(1);
        sfx('burp');
      }
    } else this.eatT = 0;
    if (inp.use && this.useCd <= 0 && !food) {
      if (this.useBlock(hid, creative)) { this.useCd = inp.usePressed ? 0.25 : 0.22; }
      else if (inp.usePressed) this.useCd = 0.1;
    }
    inp.usePressed = false;
  }
  isInteractive(id) { return id === B.DOOR || id === B.CRAFTING_TABLE || id === B.FURNACE || id === B.FURNACE_LIT || id === B.CHEST || id === B.BED || id === B.TNT; }
  useBlock(hid, creative) {
    const t = this.target, world = game.world;
    if (!t) return false;
    if (!this.sneaking || !hid) {
      if (t.id === B.CRAFTING_TABLE) { this.swing(); game.openScreen('craft'); return true; }
      if (t.id === B.FURNACE || t.id === B.FURNACE_LIT) { this.swing(); game.openScreen('furnace', world.getTile(t.x, t.y, t.z, 'furnace')); return true; }
      if (t.id === B.CHEST) { this.swing(); sfx('chest'); game.openScreen('chest', world.getTile(t.x, t.y, t.z, 'chest')); return true; }
      if (t.id === B.BED) { game.trySleep(t.x, t.y, t.z); return true; }
      if (t.id === B.TNT) { world.setBlock(t.x, t.y, t.z, B.AIR, 0, true); primeTNT(game, t.x, t.y, t.z, 4); this.swing(); return true; }
      if (t.id === B.DOOR) {
        const d = world.getData(t.x, t.y, t.z), ly = (d & 8) ? t.y - 1 : t.y, ld = world.getData(t.x, ly, t.z) ^ 4;
        world.setBlock(t.x, ly, t.z, B.DOOR, ld, true);
        if (world.getBlock(t.x, ly + 1, t.z) === B.DOOR) world.setBlock(t.x, ly + 1, t.z, B.DOOR, ld | 8, true);
        sfx('door', t.x + 0.5, t.y + 0.5, t.z + 0.5); this.swing(); return true;
      }
    }
    if (hid === I.DOOR && t.face >= 0) {
      let px = t.x + DX[t.face], py = t.y + DY[t.face], pz = t.z + DZ[t.face];
      if (BLOCKS[t.id].replaceable && !LIQUID[t.id]) { px = t.x; py = t.y; pz = t.z; }
      const free = b => b === B.AIR || (BLOCKS[b] && BLOCKS[b].replaceable && !LIQUID[b]);
      if (py < 1 || py + 1 >= WH || !free(world.getBlock(px, py, pz)) || !free(world.getBlock(px, py + 1, pz))) return false;
      const below = world.getBlock(px, py - 1, pz);
      if (!SOLID[below] || !OPAQUE[below]) return false;
      const hitsP = e => e.x + e.w > px && e.x - e.w < px + 1 && e.z + e.w > pz && e.z - e.w < pz + 1 && e.y < py + 2 && e.y + e.h > py;
      if (hitsP(this)) return false;
      const f = facingFromYaw(this.yaw);
      world.setBlock(px, py, pz, B.DOOR, f, true);
      world.setBlock(px, py + 1, pz, B.DOOR, f | 8, true);
      sfx('place_wood', px + 0.5, py + 0.5, pz + 0.5); this.swing();
      if (!creative) this.consumeHeld(1);
      return true;
    }
    if (!hid || hid >= 256) return false;
    let px = t.x + DX[t.face], py = t.y + DY[t.face], pz = t.z + DZ[t.face];
    if (t.face < 0) return false;
    if (BLOCKS[t.id].replaceable && t.id !== hid && !LIQUID[t.id]) { px = t.x; py = t.y; pz = t.z; }
    if (py < 0 || py >= WH) return false;
    const cur = world.getBlock(px, py, pz);
    if (cur === B.UNLOADED || !(cur === B.AIR || BLOCKS[cur].replaceable)) return false;
    if (SOLID[hid]) {
      const bb = BLOCKS[hid].box || [0, 0, 0, 1, 1, 1];
      const x0 = px + bb[0], y0 = py + bb[1], z0 = pz + bb[2], x1 = px + bb[3], y1 = py + bb[4], z1 = pz + bb[5];
      const hits = e => e.x + e.w > x0 && e.x - e.w < x1 && e.y + e.h > y0 && e.y < y1 && e.z + e.w > z0 && e.z - e.w < z1;
      if (hits(this)) return false;
      for (const e of game.entities) if (e.mob && !e.dead && hits(e)) return false;
    }
    let data = 0;
    if (BLOCKS[hid].facing) data = facingFromYaw(this.yaw);
    if (hid === B.TORCH) {
      if (t.face === 3) return false;
      data = t.face === 2 ? 0 : ({ 0: 1, 1: 2, 4: 3, 5: 4 })[t.face];
      if (!world.canStay(px, py, pz, hid, data)) { data = 0; if (!world.canStay(px, py, pz, hid, 0)) return false; }
    } else if (!world.canStay(px, py, pz, hid, data)) return false;
    if (cur !== B.AIR && !LIQUID[cur]) world.setBlock(px, py, pz, B.AIR, 0, true);
    world.setBlock(px, py, pz, hid, data, true);
    if (hid === B.CHEST) world.getTile(px, py, pz, 'chest');
    if (hid === B.FURNACE) world.getTile(px, py, pz, 'furnace');
    sfx('place_' + SOUND_OF(hid), px + 0.5, py + 0.5, pz + 0.5);
    this.swing();
    if (!creative) this.consumeHeld(1);
    if (game.stats) game.stats.placed = (game.stats.placed || 0) + 1;
    return true;
  }
  breakBlock(x, y, z, drops) {
    const world = game.world, id = world.getBlock(x, y, z);
    if (!id || id === B.UNLOADED) return;
    const hid = this.heldId();
    let repl = B.AIR;
    if (id === B.ICE && game.mode === 'survival' && SOLID[world.getBlock(x, y - 1, z)]) repl = B.WATER;
    world.setBlock(x, y, z, repl, 0, true);
    sfx('break_' + SOUND_OF(id), x + 0.5, y + 0.5, z + 0.5);
    blockParticles(x, y, z, id, 14, true);
    if (drops) {
      for (const [did, n] of blockDrops(id, hid)) dropItem(game, x + 0.5, y + 0.4, z + 0.5, did, n);
      const tool = toolOf(hid);
      if (tool && BLOCKS[id].hardness > 0) this.damageTool(tool.kind === 'sword' ? 2 : 1);
      this.addFoodExhaust(0.1);
    }
    if (game.stats) game.stats.mined = (game.stats.mined || 0) + 1;
  }
  consumeHeld(n) {
    const s = this.inv[this.sel];
    if (!s) return;
    s.count -= n;
    if (s.count <= 0) this.inv[this.sel] = null;
    game.ui.dirty = true;
  }
  damageTool(n) {
    const s = this.inv[this.sel], tool = s && toolOf(s.id);
    if (!tool) return;
    s.dmg = (s.dmg || 0) + n;
    if (s.dmg >= tool.dur) { this.inv[this.sel] = null; sfx('toolBreak'); }
    game.ui.dirty = true;
  }
  give(id, count) {
    const max = maxStack(id);
    let left = count;
    for (const pass of [0, 1]) {
      for (let i = 0; i < 36 && left > 0; i++) {
        const s = this.inv[i];
        if (pass === 0 && s && s.id === id && s.count < max && !toolOf(id)) { const k = Math.min(max - s.count, left); s.count += k; left -= k; }
        if (pass === 1 && !s) { const k = Math.min(max, left); this.inv[i] = { id, count: k }; left -= k; }
      }
    }
    if (left !== count) game.ui.dirty = true;
    return left;
  }
  dropHeld(all) {
    const s = this.inv[this.sel];
    if (!s) return;
    const n = all ? s.count : 1;
    const [dx, dy, dz] = this.lookDir();
    const e = dropItem(game, this.x + dx * 0.3, this.y + this.eye - 0.3, this.z + dz * 0.3, s.id, n, true);
    if (e) { e.vx = dx * 5; e.vy = dy * 5 + 2; e.vz = dz * 5; if (s.dmg) e.dmg = s.dmg; }
    s.count -= n;
    if (s.count <= 0) this.inv[this.sel] = null;
    this.swing();
    game.ui.dirty = true;
  }
}

/* ---- first person hand and third person model ---- */
const _hm = M4.create();
function drawFirstPerson(pl, s, world) {
  const P = PROG.entity;
  gl.clear(gl.DEPTH_BUFFER_BIT);
  M4.perspective(R.handProj, 70 * Math.PI / 180, R.width / R.height, 0.02, 10);
  const bright = brightAt(world, pl.x, pl.y + pl.eye, pl.z, s);
  const sp = pl.swingP >= 1 ? 0 : pl.swingP, f1 = Math.sin(sp * Math.PI), f2 = Math.sin(Math.sqrt(sp) * Math.PI), f3 = Math.sin(Math.sqrt(sp) * TAU);
  const bobOn = game.settings.bobbing && !REDUCED_MOTION ? pl.bobAmt : 0;
  const bx = Math.sin(pl.bob) * 0.035 * bobOn, by = -Math.abs(Math.cos(pl.bob)) * 0.045 * bobOn;
  const eq = 1 - pl.equip;
  const eat = pl.eatT > 0 ? Math.abs(Math.sin(pl.eatT * 12)) * 0.05 : 0;
  const held = pl.held();
  gl.enable(gl.CULL_FACE);
  if (!held) {
    entityBegin(texSkins, R.handProj);
    gl.uniform2f(P.u.uFog, 100, 200); gl.uniform1f(P.u.uBright, bright);
    M4.identity(_hm);
    M4.translate(_hm, _hm, 0.64 + bx - f2 * 0.3, -0.64 + by + f3 * 0.1 - eq * 0.5, -0.4 - f1 * 0.25);
    M4.rotY(_hm, _hm, 0.32 - f2 * 0.35);
    M4.rotX(_hm, _hm, 1.72 + f2 * 0.35);
    M4.rotZ(_hm, _hm, 0.1);
    M4.scale(_hm, _hm, 1 / 16, 1 / 16, 1 / 16);
    M4.translate(_hm, _hm, 6, -22, 0);
    drawPart(MODELS.player.parts.rarm, _hm);
  } else {
    entityBegin(texTiles, R.handProj);
    gl.uniform2f(P.u.uFog, 100, 200); gl.uniform1f(P.u.uBright, bright);
    M4.identity(_hm);
    if (isCubeItem(held.id)) {
      M4.translate(_hm, _hm, 0.62 + bx - f2 * 0.36, -0.5 + by + f3 * 0.14 - f1 * 0.08 - eq * 0.55, -1.12 - f1 * 0.22);
      M4.rotY(_hm, _hm, 0.72 - f2 * 0.4);
      M4.rotX(_hm, _hm, 0.14 - f1 * 0.7);
      M4.scale(_hm, _hm, 0.36 / 16, 0.36 / 16, 0.36 / 16);
      M4.translate(_hm, _hm, 0, -8, 0);
    } else {
      M4.translate(_hm, _hm, 0.56 + bx - f2 * 0.32 - (pl.eatT > 0 ? 0.3 : 0), -0.5 + by + f3 * 0.12 - eq * 0.55 + eat + (pl.eatT > 0 ? 0.14 : 0), -0.95 - f1 * 0.2);
      M4.rotY(_hm, _hm, -0.78 + f2 * 0.25);
      M4.rotZ(_hm, _hm, 0.32 + f1 * 0.8);
      M4.scale(_hm, _hm, 0.5 / 16, 0.5 / 16, 0.5 / 16);
      M4.translate(_hm, _hm, 0, -3, 0);
    }
    drawMesh(itemMesh(held.id), _hm);
  }
}
const _pmB = M4.create(), _pmH = M4.create();
function playerPose(pl, t) {
  const a = Math.sin(pl.walk) * 0.8 * pl.walkAmt;
  const sp = pl.swingP >= 1 ? 0 : pl.swingP, f2 = Math.sin(Math.sqrt(sp) * Math.PI);
  const hy = ((pl.yaw - pl.bodyYaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const idle = Math.sin(t * 1.6) * 0.04;
  const sneak = pl.sneaking ? 0.35 : 0;
  return {
    head: [-pl.pitch, hy, 0],
    body: [sneak, 0, 0],
    rarm: [-a - f2 * 1.3 - (pl.held() ? 0.25 : 0) + idle, f2 * 0.3, 0.05 + idle],
    larm: [a - idle, 0, -0.05 - idle],
    rleg: [a, 0, 0], lleg: [-a, 0, 0],
  };
}
function drawPlayerModel(game, s, t, cam) {
  const pl = game.player, P = PROG.entity, sc = MODELS.player.scale;
  gl.uniform1f(P.u.uBright, brightAt(game.world, pl.x, pl.y + 1.2, pl.z, s));
  gl.uniform4fv(P.u.uTint, pl.invuln > 0.25 ? [0.8, 0.1, 0.1, 0.4] : [0, 0, 0, 0]);
  M4.identity(_pmB);
  M4.translate(_pmB, _pmB, pl.x - cam.x, pl.y - cam.y, pl.z - cam.z);
  M4.rotY(_pmB, _pmB, pl.bodyYaw + Math.PI);
  M4.scale(_pmB, _pmB, sc, sc, sc);
  const pose = playerPose(pl, t);
  drawModel(MODELS.player, _pmB, pose);
  const held = pl.held();
  if (held) {
    entityBegin(texTiles);
    gl.uniform1f(P.u.uBright, brightAt(game.world, pl.x, pl.y + 1.2, pl.z, s));
    _pmH.set(_pmB);
    M4.translate(_pmH, _pmH, -6, 22, 0);
    M4.rotX(_pmH, _pmH, pose.rarm[0]);
    M4.rotY(_pmH, _pmH, pose.rarm[1]);
    M4.translate(_pmH, _pmH, 0, -11, 1.5);
    if (isCubeItem(held.id)) { M4.rotY(_pmH, _pmH, 0.6); M4.scale(_pmH, _pmH, 0.38, 0.38, 0.38); M4.translate(_pmH, _pmH, 0, -8, 0); }
    else { M4.rotX(_pmH, _pmH, -1.2); M4.rotY(_pmH, _pmH, -Math.PI / 2); M4.scale(_pmH, _pmH, 0.6, 0.6, 0.6); M4.translate(_pmH, _pmH, 0, -3, 0); }
    drawMesh(itemMesh(held.id), _pmH);
    entityBegin(texSkins);
  }
}
