/* ===================== Weather: rain, snow and thunderstorms ===================== */
// In the Overworld the weather changes now and then: clear for a while, then rain (snow in cold places; in a desert
// nothing falls), sometimes with thunder and lightning. The host (or a one-player game) decides and tells the guests.
// Rain puts out creatures that are on fire, stops zombies burning, sends endermen away and makes fish bite sooner.
const WX = {
  on: false, thunder: false, snowAll: false, t: 600,   // what the weather is doing, and how long until it changes
  amt: 0, dark: 0, storm: 0, snap: true,   // how much is falling here, how dark the sky is, how stormy (eased in and out)
  kind: 1, kindT: 0,   // what falls where you are: 0 nothing (a desert), 1 rain, 2 snow
  flash: 0, boltT: 4, bolt: null, rumbles: [],
  tops: null, topsX: 0, topsZ: 0, topsR: 0, topsT: 0,   // where the rain stops in each column around you, and its light
  prog: null, vao: null, vbo: null, buf: null, snd: null, sndT: 0, ear: 1,
};
const WX_CLEAR = [420, 1200], WX_WET = [120, 300];   // seconds of clear weather, and of rain or snow

/* a world starting (or the title screen): its saved weather, or clear for a while */
function wxLoad(d) {
  WX.on = !!(d && d.on); WX.thunder = WX.on && !!d.th; WX.snowAll = WX.on && !!d.sn;
  WX.t = d && +d.t > 0 ? Math.min(+d.t, 3600) : randRange(WX_CLEAR[0], WX_CLEAR[1]);
  WX.amt = WX.dark = WX.storm = WX.flash = 0; WX.snap = true; WX.kindT = 0;
  WX.bolt = null; WX.rumbles.length = 0; WX.tops = null; WX.boltT = randRange(2, 6);
}
function wxSave() { return { on: WX.on, th: WX.thunder, sn: WX.snowAll, t: Math.round(WX.t) }; }
const wxBits = () => (WX.on ? 1 : 0) | (WX.thunder ? 2 : 0) | (WX.snowAll ? 4 : 0);
function wxSetBits(b) { b |= 0; WX.on = !!(b & 1); WX.thunder = WX.on && !!(b & 2); WX.snowAll = WX.on && !!(b & 4); }
/* the host (or a one-player game) changes the weather: 'clear', 'rain', 'thunder' or 'snow' (snow everywhere) */
function wxSet(kind) {
  WX.on = kind !== 'clear'; WX.thunder = kind === 'thunder'; WX.snowAll = kind === 'snow';
  WX.t = WX.on ? randRange(WX_WET[0], WX_WET[1]) : randRange(WX_CLEAR[0], WX_CLEAR[1]);
  if (WX.thunder) WX.boltT = randRange(2, 5);
  MP.syncTime();
}
/* is it raining on this spot? (out in the open, where rain falls) */
const wxRaining = () => WX.amt > 0.5 && WX.kind === 1;
const wxWetAt = (world, x, y, z) => wxRaining() && (world.getLight(Math.floor(x), Math.floor(y), Math.floor(z)) >> 4) >= 15;

/* a different world (or another dimension): its weather shows at once (none on the Moon or in the Nether), with no
   thunder still on its way from the last one */
function wxNewWorld() { WX.snap = true; WX.rumbles.length = 0; WX.bolt = null; WX.flash = 0; WX.tops = null; WX.topsT = 0; }
function wxTick(game, dt) {
  const pl = game.player, w = game.world;
  if (MP.role !== 'guest') {
    WX.t -= dt;
    if (WX.t <= 0) wxSet(WX.on ? 'clear' : Math.random() < 0.3 ? 'thunder' : 'rain');
  }
  WX.kindT -= dt;
  if (WX.kindT <= 0) { WX.kindT = 1; WX.kind = WX.snowAll ? 2 : game.gen.climateAt(w.map, game.seed, pl.x, pl.z); }
  const here = WX.on && game.dim === 'over', k = WX.snap ? 1 : Math.min(1, dt * 0.3);
  WX.snap = false;
  WX.dark += ((here ? (WX.thunder ? 1 : 0.75) : 0) - WX.dark) * k;
  WX.amt += ((here && WX.kind ? 1 : 0) - WX.amt) * k;
  WX.storm += ((here && WX.thunder ? 1 : 0) - WX.storm) * k;
  if (WX.amt < 0.002) WX.amt = 0;
  if (WX.dark < 0.002) WX.dark = 0;
  // thunder: now and then a flash of lightning somewhere nearby, and the rumble a moment later
  if (WX.storm > 0.5 && game.state === 'playing') {
    WX.boltT -= dt;
    if (WX.boltT <= 0) { WX.boltT = randRange(5, 16); wxStrike(game); }
  }
  if (WX.flash > 0) WX.flash = Math.max(0, WX.flash - dt * 2.4);
  if (WX.bolt) { WX.bolt.life -= dt; if (WX.bolt.life <= 0) WX.bolt = null; }
  for (let i = WX.rumbles.length - 1; i >= 0; i--) {
    const r = WX.rumbles[i];
    if ((r.t -= dt) <= 0) { sfx(r.near ? 'thunderNear' : 'thunderFar', undefined, undefined, undefined, r.v); WX.rumbles.splice(i, 1); }
  }
  // drops splashing on the ground close by
  WX.topsT -= dt;
  if (WX.amt > 0.3 && WX.kind === 1 && WX.tops && game.state === 'playing') {
    const R0 = WX.topsR, size = R0 * 2 + 1;
    for (let n = WX.amt * dt * 40; n > 0; n--) {
      if ((n < 1 && Math.random() > n) || PARTICLES.length > 1300) break;
      const x = Math.floor(pl.x) + randInt(-6, 6), z = Math.floor(pl.z) + randInt(-6, 6), gx = x - WX.topsX + R0, gz = z - WX.topsZ + R0;
      if (gx < 0 || gz < 0 || gx >= size || gz >= size) continue;
      const top = WX.tops[gz * size + gx];
      if (top >= 255 || top <= 0 || Math.abs(top - pl.y) > 8) continue;
      PARTICLES.push({ x: x + Math.random(), y: top + 0.05, z: z + Math.random(), vx: randRange(-0.7, 0.7), vy: randRange(1.2, 2.4), vz: randRange(-0.7, 0.7),
        life: randRange(0.18, 0.32), tile: TILE.drip, u: 0, v: 0, us: 16, size: randRange(0.03, 0.05), grav: 14 });
    }
  }
}
/* a flash of lightning: a jagged bolt from the clouds to the ground some way off, and thunder after it */
function wxStrike(game) {
  const pl = game.player, w = game.world, a = Math.random() * TAU, d = randRange(26, 70);
  const x = pl.x + Math.cos(a) * d, z = pl.z + Math.sin(a) * d;
  let top = w.topSolid(Math.floor(x), Math.floor(z));
  if (top < 0) top = Math.floor(pl.y) - 24;
  const y1 = top + 1, y0 = Math.max(y1 + 40, pl.y + 45), n = 16, pts = [];
  let px = x, pz = z;
  for (let i = 0; i <= n; i++) { pts.push([px, y1 + (y0 - y1) * (i / n), pz]); px += randRange(-1.4, 1.4); pz += randRange(-1.4, 1.4); }   // (from where it lands, up)
  const fork = randInt(4, 9), fp = [pts[fork].slice()];   // a little branch off the side
  for (let i = 1; i <= 4; i++) { const q = fp[i - 1]; fp.push([q[0] + randRange(-1.6, 1.6) + (px > x ? -0.8 : 0.8), q[1] - (y0 - y1) / n, q[2] + randRange(-1.6, 1.6)]); }
  WX.bolt = { pts, fork: fp, life: 0.42 };
  WX.flash = 1;
  WX.rumbles.push({ t: d / 90 + 0.1, near: d < 40, v: clamp(1.5 - d / 70, 0.4, 1) });
}

/* ---- the sky and the fog when it rains ---- */
function wxSky(s, under) {
  if (s.nether || game.state === 'title') return;
  const k = WX.dark, f = WX.flash;
  if (k <= 0 && f <= 0) return;
  const g = lerp(0.07, 0.62, s.day), snow = WX.kind === 2;
  const grey = snow ? [g * 1.08, g * 1.1, g * 1.16] : [g * 0.86, g * 0.9, g];
  s.zenith = vmix(s.zenith, grey, k * 0.85);
  s.horizon = vmix(s.horizon, grey.map(c => Math.min(1, c * 1.1)), k * 0.85);
  s.bottom = vmix(s.bottom, grey, k * 0.6);
  if (!under) s.fog = vmix(s.fog, grey.map(c => Math.min(1, c * 1.1)), k * 0.85);
  s.cloud = vmix(s.cloud, grey.map(c => c * 0.85), k * 0.9);
  s.glowAmt *= 1 - k; s.sunVis *= 1 - k * 0.92; s.stars *= 1 - k;
  s.skyLight *= 1 - 0.16 * k - 0.12 * WX.storm;
  s.day *= 1 - 0.6 * WX.storm;   // a thunderstorm is as dark as evening: monsters come out, and zombies don't burn
  if (f > 0) {
    const fl = [0.82, 0.84, 0.98];
    s.zenith = vmix(s.zenith, fl, f * 0.6); s.horizon = vmix(s.horizon, fl, f * 0.6);
    if (!under) s.fog = vmix(s.fog, fl, f * 0.35);
    s.skyLight = Math.min(1, s.skyLight + f * 0.45);
  }
}
function wxFog() {
  if (WX.dark <= 0 || game.state === 'title') return;
  R.fogEnd *= 1 - 0.2 * WX.dark; R.fogStart *= 1 - 0.5 * WX.dark;
}

/* ---- drawing the rain and snow: a sheet of falling drops in every column around you ---- */
const WX_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aUV;
layout(location=2) in vec2 aSA;
uniform mat4 uViewProj;
out vec3 vUV; out vec2 vSA; out float vDist;
void main() { vUV = aUV; vSA = aSA; vDist = length(aPos); gl_Position = uViewProj * vec4(aPos, 1.0); }`;
const WX_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uTex;
uniform vec3 uFogColor;
uniform vec2 uFog;
uniform float uAlpha;
in vec3 vUV; in vec2 vSA; in float vDist;
out vec4 outColor;
void main() {
  vec4 c = texture(uTex, vUV);
  float a = c.a * vSA.y * uAlpha;
  if (a < 0.01) discard;
  float fog = clamp((vDist - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  outColor = vec4(mix(c.rgb * vSA.x, uFogColor, fog), a * (1.0 - fog * 0.7));
}`;
const WX_MAXQ = 1200;
function wxInitGL() {
  WX.prog = program(WX_VS, WX_FS, ['uViewProj', 'uTex', 'uFogColor', 'uFog', 'uAlpha']);
  WX.vao = gl.createVertexArray();
  gl.bindVertexArray(WX.vao);
  WX.vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, WX.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, WX_MAXQ * 4 * 32, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadEBO);
  gl.bindVertexArray(null);
  WX.buf = new Float32Array(WX_MAXQ * 32);
}
/* the highest block in each column around (cx, cz) that stops rain (anything solid, or water), and the light there */
function wxColumns(world, cx, cz, rad, camY) {
  const size = rad * 2 + 1;
  if (!WX.tops || WX.tops.length !== size * size) { WX.tops = new Uint8Array(size * size); WX.lights = new Uint8Array(size * size); }
  WX.topsX = cx; WX.topsZ = cz; WX.topsR = rad; WX.topsT = 0.25;
  for (let gz = 0; gz < size; gz++) for (let gx = 0; gx < size; gx++) {
    const x = cx + gx - rad, z = cz + gz - rad, c = world.getChunk(x >> 4, z >> 4), gi = gz * size + gx;
    if (!c) { WX.tops[gi] = 255; continue; }
    const b = c.blocks, base = (x & 15) | ((z & 15) << 4);
    let y = WH - 1;
    for (; y >= 0; y--) { const id = b[base | (y << 8)]; if (id && (SOLID[id] || LIQUID[id])) break; }
    WX.tops[gi] = y + 1;
    WX.lights[gi] = world.getLight(x, Math.max(y + 1, Math.min(WH - 1, Math.floor(camY))), z);
  }
}
const wxHash = (x, z) => { let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function wxVert(o, x, y, z, u, v, layer, sh, a) { const b = WX.buf; b[o] = x; b[o + 1] = y; b[o + 2] = z; b[o + 3] = u; b[o + 4] = v; b[o + 5] = layer; b[o + 6] = sh; b[o + 7] = a; }
function wxQuad(q, ax, az, bx, bz, y0, y1, u0, u1, v0, v1, layer, sh, a0, a1) {
  const o = q * 32;
  wxVert(o, ax, y0, az, u0, v0, layer, sh, a0); wxVert(o + 8, bx, y0, bz, u1, v0, layer, sh, a0);
  wxVert(o + 16, bx, y1, bz, u1, v1, layer, sh, a1); wxVert(o + 24, ax, y1, az, u0, v1, layer, sh, a1);
}
function drawWeather(s, cam) {
  const falling = WX.amt > 0.01 && WX.kind > 0;
  if ((!falling && !WX.bolt) || game.state === 'title') return;
  if (!WX.prog) wxInitGL();
  const world = game.world, rad = game.settings.quality ? 9 : 7, cx = Math.floor(cam.x), cz = Math.floor(cam.z);
  let n = 0;
  if (falling) {
    const moved = cx !== WX.topsX || cz !== WX.topsZ;   // (moving: looked at again at most ten times a second)
    if (!WX.tops || WX.topsR !== rad || WX.topsT <= 0 || (moved && WX.topsT < 0.15)) wxColumns(world, cx, cz, rad, cam.y);
    const size = WX.topsR * 2 + 1, R0 = WX.topsR, snow = WX.kind === 2, T = game.t, layer = snow ? TILE.snowfall : TILE.rain;
    const yTop = cam.y + rad * 1.3, yMid = cam.y + 2.5, yLow = cam.y - rad, rr = (rad + 0.5) * (rad + 0.5);
    const sl = s.skyLight, nv = s.nightVision ? 0.8 : 0.06;
    for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
      const x = cx + dx, z = cz + dz, gx = x - WX.topsX + R0, gz = z - WX.topsZ + R0;
      if (gx < 0 || gz < 0 || gx >= size || gz >= size) continue;
      const gi = gz * size + gx, top = WX.tops[gi];
      if (top >= 255) continue;
      const y0 = Math.max(top, yLow);
      if (y0 >= yTop) continue;
      const mx = x + 0.5 - cam.x, mz = z + 0.5 - cam.z, d2 = mx * mx + mz * mz;
      if (d2 > rr || d2 < 0.12) continue;
      const len = Math.sqrt(d2), px = (-mz / len) * 0.5, pz = (mx / len) * 0.5;
      const fade = Math.pow(1 - len / (rad + 0.5), 1.3) * Math.min(1, 0.4 + len * 0.4);   // (fainter far off, and right in front of you)
      const L = WX.lights[gi], sh = Math.max(nv, lightCurve((L >> 4) * sl), Math.min(1, lightCurve(L & 15) * 1.25));
      const h = wxHash(x, z);
      let u0 = Math.floor(h * 16) / 16;   // (two pictures across each column, so the drops are thin)
      const vy = snow ? 2 : 1, speed = snow ? 1.6 + h * 0.8 : 9 + h * 4, off = h * 7 - T * speed;
      if (snow) u0 += Math.sin(T * 0.7 + h * TAU) * 0.3;
      const ax = mx - px, az = mz - pz, bx = mx + px, bz = mz + pz, ym = Math.max(y0, Math.min(yMid, yTop));
      const ry = y => y - cam.y, vv = y => -y * vy + off;
      if (ym > y0 && n < WX_MAXQ) wxQuad(n++, ax, az, bx, bz, ry(y0), ry(ym), u0, u0 + 2, vv(y0), vv(ym), layer, sh, fade, fade);
      if (yTop > ym && n < WX_MAXQ) wxQuad(n++, ax, az, bx, bz, ry(ym), ry(yTop), u0, u0 + 2, vv(ym), vv(yTop), layer, sh, fade, 0);
    }
  }
  const nFall = n;
  if (WX.bolt) {   // the lightning: a bright line of camera-facing strips, with a soft glow around it
    const b = WX.bolt, a = b.life > 0.3 ? 1 : b.life > 0.2 ? 0.35 : b.life > 0.12 ? 0.9 : 0.4;
    const strip = (pts, wd, al) => {
      for (let i = 0; i + 1 < pts.length && n < WX_MAXQ; i++) {
        const p = pts[i], q = pts[i + 1];
        const ax = p[0] - cam.x, ay = p[1] - cam.y, az = p[2] - cam.z, bx = q[0] - cam.x, by = q[1] - cam.y, bz = q[2] - cam.z;
        const dx = bx - ax, dy = by - ay, dz = bz - az;   // across the strip: at right angles to it and to the way you look at it
        let sx = dy * az - dz * ay, sy = dz * ax - dx * az, sz = dx * ay - dy * ax;
        const sn = Math.hypot(sx, sy, sz) || 1; sx *= wd / sn; sy *= wd / sn; sz *= wd / sn;
        const o = n * 32, L = TILE.bolt;
        wxVert(o, ax - sx, ay - sy, az - sz, 0, 0, L, 1, al); wxVert(o + 8, ax + sx, ay + sy, az + sz, 1, 0, L, 1, al);
        wxVert(o + 16, bx + sx, by + sy, bz + sz, 1, 1, L, 1, al); wxVert(o + 24, bx - sx, by - sy, bz - sz, 0, 1, L, 1, al);
        n++;
      }
    };
    strip(b.pts, 2.6, 0.22 * a); strip(b.pts, 0.55, a); strip(b.fork, 0.35, a * 0.8);
  }
  if (!n) return;
  const P = WX.prog;
  gl.useProgram(P.p);
  gl.uniformMatrix4fv(P.u.uViewProj, false, R.vp);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texTiles); gl.uniform1i(P.u.uTex, 0);
  gl.uniform3fv(P.u.uFogColor, R.fogColor);
  gl.bindVertexArray(WX.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, WX.vbo);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, WX.buf.subarray(0, n * 32));
  if (nFall) {
    gl.uniform2f(P.u.uFog, R.fogStart, R.fogEnd); gl.uniform1f(P.u.uAlpha, WX.amt * (WX.kind === 2 ? 0.9 : 0.7));
    gl.drawElements(gl.TRIANGLES, nFall * 6, gl.UNSIGNED_INT, 0);
  }
  if (n > nFall) {   // (lightning shows through the fog, and adds light)
    gl.uniform2f(P.u.uFog, 1e5, 2e5); gl.uniform1f(P.u.uAlpha, 1);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawElements(gl.TRIANGLES, (n - nFall) * 6, gl.UNSIGNED_INT, nFall * 24);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  gl.bindVertexArray(null);
}

/* ---- the sound of rain: a hiss that is muffled indoors, with drops pattering close by (snow: a soft wind) ---- */
function wxSound(game, dt) {
  const ctx = AUDIO.ctx;
  if (!ctx || ctx.state !== 'running' || !AUDIO.noise) return;
  const live = game.state === 'playing' && !(game.paused && !game.net);
  let level = 0;
  if (live && WX.amt > 0) {
    const pl = game.player, L = game.world.getLight(Math.floor(pl.x), Math.floor(pl.y + 1.6), Math.floor(pl.z)) >> 4;
    WX.ear += (L / 15 - WX.ear) * Math.min(1, dt * 2);
    level = WX.amt * (WX.kind === 1 ? 0.3 + 0.7 * WX.ear : 0.35 * WX.ear);
  }
  if (!WX.snd) {
    if (level < 0.01) return;
    const src = ctx.createBufferSource(); src.buffer = AUDIO.noise; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2000;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(AUDIO.sfx);
    src.start();
    WX.snd = { src, lp, g };
  }
  const t = ctx.currentTime, snow = WX.kind === 2;
  WX.snd.g.gain.setTargetAtTime(Math.max(0.0001, level * (snow ? 0.07 : 0.15)), t, 0.3);
  WX.snd.lp.frequency.setTargetAtTime(snow ? 450 : 650 + 2800 * WX.ear, t, 0.3);
  if (level < 0.005) {
    if ((WX.sndT += dt) > 3) { try { WX.snd.src.stop(); } catch (e) { /* already stopped */ } WX.snd.g.disconnect(); WX.snd = null; WX.sndT = 0; }
  } else WX.sndT = 0;
  if (!snow && level > 0.12 && Math.random() < dt * 16 * level) nz({ f: randRange(2500, 6500), q: 3, dur: 0.03, vol: 0.035 * level, pan: randRange(-0.8, 0.8) });
}
