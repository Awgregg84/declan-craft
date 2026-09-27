/* ===================== Renderer ===================== */
const R = {
  proj: M4.create(), view: M4.create(), vp: M4.create(), planes: new Float32Array(24),
  handProj: M4.create(), m: M4.create(), m2: M4.create(),
  cam: { x: 0, y: 70, z: 0, yaw: 0, pitch: 0, fov: 70 * Math.PI / 180 },
  width: 1, height: 1, dpr: 1, scale: 1.5,
  fogStart: 60, fogEnd: 100, fogColor: [0.7, 0.83, 1], sky: null,
  visO: [], visT: [], cloudVAO: null, crack: [], partMesh: null, partBuf: new Float32Array(2048 * 28),
};
const lightCurve = l => { const x = clamp(l / 15, 0, 1); return x / (4 - 3 * x); };
const vmix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function resizeGL() {
  let dpr = Math.min(window.devicePixelRatio || 1, R.scale);
  const cw = glCanvas.clientWidth || 1, ch = glCanvas.clientHeight || 1;
  if (cw * ch * dpr * dpr > 3.7e6) dpr = Math.sqrt(3.7e6 / (cw * ch));
  const w = Math.max(1, Math.floor(cw * dpr)), hgt = Math.max(1, Math.floor(ch * dpr));
  if (glCanvas.width !== w || glCanvas.height !== hgt) { glCanvas.width = w; glCanvas.height = hgt; }
  R.width = w; R.height = hgt; R.dpr = dpr;
}
function initRenderExtras() {
  R.cloudVAO = gl.createVertexArray();
  gl.bindVertexArray(R.cloudVAO);
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadEBO);
  gl.bindVertexArray(null);
  for (let s = 0; s < 10; s++) {
    const mb = new MeshBuilder(), L = TILE['destroy_' + s];
    const F = [
      [[16, 0, 16], [16, 0, 0], [16, 16, 0], [16, 16, 16]], [[0, 0, 0], [0, 0, 16], [0, 16, 16], [0, 16, 0]],
      [[0, 16, 16], [16, 16, 16], [16, 16, 0], [0, 16, 0]], [[0, 0, 0], [16, 0, 0], [16, 0, 16], [0, 0, 16]],
      [[0, 0, 16], [16, 0, 16], [16, 16, 16], [0, 16, 16]], [[16, 0, 0], [0, 0, 0], [0, 16, 0], [16, 16, 0]],
    ];
    for (const f of F) mb.quad(f, [[0, 16], [16, 16], [16, 0], [0, 0]], L, 1, 16, 0);
    R.crack.push(mb.build());
  }
  R.partMesh = uploadModelMesh(new Float32Array(28), 0, null);
}

/* ---- sky, fog and light for a time of day ---- */
function skyState(time, map, underwater) {
  const ang = time * TAU, sy = Math.sin(ang);
  const len = Math.hypot(Math.cos(ang), sy, 0.22);
  const sunDir = [Math.cos(ang) / len, sy / len, 0.22 / len];
  const day = smoothstep(-0.2, 0.25, sy);
  const sunset = clamp(1 - Math.abs(sy) / 0.38, 0, 1) * (sy > -0.35 ? 1 : 0);
  let zenith = vmix([0.012, 0.018, 0.06], [0.33, 0.56, 1.0], day);
  let horizon = vmix([0.035, 0.05, 0.12], [0.68, 0.82, 1.0], day);
  horizon = vmix(horizon, [1.0, 0.55, 0.28], sunset * 0.5);
  const bottom = map === 'sky' ? vmix(horizon, vmix([0.05, 0.06, 0.14], [0.78, 0.86, 1.0], day), 0.6) : vmix(horizon, [0.02, 0.02, 0.04], 0.5);
  const s = {
    sunDir, day, zenith, horizon, bottom, glow: [1.0, 0.45, 0.2], glowAmt: sunset,
    stars: clamp(1 - day * 1.8, 0, 1), sunVis: clamp((sy + 0.2) * 4, 0, 1),
    skyLight: lerp(0.4, 1.0, day), skyTint: vmix([0.6, 0.68, 1.0], [1, 1, 1], day),
    cloud: vmix([0.12, 0.13, 0.2], [1, 1, 1], day), fog: horizon.slice(),
  };
  if (underwater === 'water') { s.fog = vmix([0.05, 0.12, 0.35], [0.1, 0.25, 0.6], day); }
  else if (underwater === 'lava') s.fog = [0.8, 0.28, 0.05];
  return s;
}

function setupCamera(cam) {
  M4.perspective(R.proj, cam.fov, R.width / R.height, 0.05, 1200);
  M4.identity(R.view); if (cam.roll) M4.rotZ(R.view, R.view, cam.roll); M4.rotX(R.view, R.view, -cam.pitch); M4.rotY(R.view, R.view, -cam.yaw);
  M4.mul(R.vp, R.proj, R.view);
  frustumPlanes(R.vp, R.planes);
}
function collectVisible(world, Rd) {
  R.visO.length = 0; R.visT.length = 0;
  const cam = R.cam, maxD2 = (Rd + 0.5) * (Rd + 0.5);
  const pcx = Math.floor(cam.x) >> 4, pcz = Math.floor(cam.z) >> 4;
  for (const c of world.order) {
    const dx = c.cx - pcx, dz = c.cz - pcz;
    if (dx * dx + dz * dz > maxD2) continue;
    const ox = c.cx * 16 - cam.x, oz = c.cz * 16 - cam.z;
    for (let s = 0; s < NSEC; s++) {
      const m = c.meshes[s], t = c.tmeshes[s];
      if (!m && !t) continue;
      const oy = s * 16 - cam.y;
      if (!boxInFrustum(R.planes, ox, oy, oz, ox + 16, oy + 16, oz + 16)) continue;
      if (m) R.visO.push(c, s);
      if (t) R.visT.push(c, s);
    }
  }
}
function drawSky(s) {
  const P = PROG.sky, cam = R.cam;
  gl.useProgram(P.p);
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  gl.uniform3f(P.u.uFwd, -sy * cp, sp, -cy * cp);
  gl.uniform3f(P.u.uRight, cy, 0, -sy);
  gl.uniform3f(P.u.uUp, sy * sp, cp, cy * sp);
  const t = Math.tan(cam.fov / 2);
  gl.uniform2f(P.u.uTan, t * R.width / R.height, t);
  gl.uniform3fv(P.u.uZenith, s.zenith); gl.uniform3fv(P.u.uHorizon, s.horizon); gl.uniform3fv(P.u.uBottom, s.bottom);
  gl.uniform3fv(P.u.uSunDir, s.sunDir); gl.uniform3fv(P.u.uGlow, s.glow);
  gl.uniform1f(P.u.uStars, s.stars); gl.uniform1f(P.u.uGlowAmt, s.glowAmt); gl.uniform1f(P.u.uSunVis, s.sunVis);
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
  gl.bindVertexArray(null);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
}
function terrainUniforms(s, time, alphaTest) {
  const P = PROG.terrain;
  gl.useProgram(P.p);
  gl.uniformMatrix4fv(P.u.uViewProj, false, R.vp);
  gl.uniform1f(P.u.uTime, time);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texTiles); gl.uniform1i(P.u.uTex, 0);
  gl.uniform1f(P.u.uSkyLight, s.skyLight); gl.uniform3fv(P.u.uSkyTint, s.skyTint);
  gl.uniform3fv(P.u.uFogColor, R.fogColor); gl.uniform2f(P.u.uFog, R.fogStart, R.fogEnd);
  gl.uniform1f(P.u.uAlphaTest, alphaTest); gl.uniform1f(P.u.uMinLight, 0.035);
}
function drawTerrainList(list, trans) {
  const P = PROG.terrain, cam = R.cam;
  const n = list.length;
  for (let j = 0; j < n; j += 2) {
    const i = trans ? n - 2 - j : j;
    const c = list[i], s = list[i + 1], m = trans ? c.tmeshes[s] : c.meshes[s];
    if (!m) continue;
    gl.uniform3f(P.u.uOffset, c.cx * 16 - cam.x, s * 16 - cam.y, c.cz * 16 - cam.z);
    gl.bindVertexArray(m.vao);
    gl.drawElements(gl.TRIANGLES, m.quads * 6, gl.UNSIGNED_INT, 0);
  }
}
function drawClouds(s, time, y) {
  const P = PROG.cloud;
  gl.useProgram(P.p);
  gl.uniformMatrix4fv(P.u.uViewProj, false, R.vp);
  gl.uniform3f(P.u.uCam, R.cam.x, R.cam.y, R.cam.z);
  gl.uniform1f(P.u.uY, y); gl.uniform1f(P.u.uExtent, R.fogEnd * 2.2 + 64);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texClouds); gl.uniform1i(P.u.uClouds, 1);
  gl.uniform1f(P.u.uTime, time);
  gl.uniform3fv(P.u.uColor, s.cloud); gl.uniform3fv(P.u.uFogColor, s.horizon);
  gl.uniform1f(P.u.uFogEnd, R.fogEnd * 2.2 + 64); gl.uniform1f(P.u.uAlpha, 0.82);
  gl.bindVertexArray(R.cloudVAO);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);
}
function entityBegin(tex, vp) {
  const P = PROG.entity;
  gl.useProgram(P.p);
  gl.uniformMatrix4fv(P.u.uViewProj, false, vp || R.vp);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex); gl.uniform1i(P.u.uTex, 0);
  gl.uniform3fv(P.u.uFogColor, R.fogColor); gl.uniform2f(P.u.uFog, R.fogStart, R.fogEnd);
  gl.uniform4f(P.u.uTint, 0, 0, 0, 0); gl.uniform3f(P.u.uColor, 1, 1, 1); gl.uniform1f(P.u.uAlpha, 1); gl.uniform1f(P.u.uBright, 1);
}
function brightAt(world, x, y, z, s) {
  const L = world.getLight(Math.floor(x), Math.floor(y), Math.floor(z));
  return Math.max(0.05, lightCurve((L >> 4) * s.skyLight), Math.min(1, lightCurve(L & 15) * 1.25));
}
function drawOutline(x, y, z) {
  const P = PROG.line;
  gl.useProgram(P.p);
  gl.uniformMatrix4fv(P.u.uViewProj, false, R.vp);
  gl.uniform3f(P.u.uOffset, x - R.cam.x, y - R.cam.y, z - R.cam.z);
  gl.uniform4f(P.u.uColor, 0, 0, 0, 0.55);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(outlineVAO);
  gl.drawArrays(gl.LINES, 0, 24);
  gl.disable(gl.BLEND);
}
function drawCrack(x, y, z, stage) {
  entityBegin(texTiles);
  const m = R.m;
  M4.identity(m);
  M4.translate(m, m, x - R.cam.x - 0.002, y - R.cam.y - 0.002, z - R.cam.z - 0.002);
  M4.scale(m, m, 1.004 / 16, 1.004 / 16, 1.004 / 16);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -1);
  drawMesh(R.crack[clamp(stage, 0, 9)], m);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.depthMask(true); gl.disable(gl.BLEND);
}
function drawParticles(list, world, s) {
  if (!list.length) return;
  const cam = R.cam, buf = R.partBuf;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const rx = cy, rz = -sy, ux = sy * sp, uy = cp, uz = cy * sp;
  let n = 0;
  for (const p of list) {
    if (n >= 2048) break;
    const b = p.bright !== undefined ? p.bright : brightAt(world, p.x, p.y, p.z, s);
    const x = p.x - cam.x, y = p.y - cam.y, z = p.z - cam.z, h = p.size;
    const u0 = p.u / 16, v0 = p.v / 16, u1 = (p.u + p.us) / 16, v1 = (p.v + p.us) / 16;
    const C = [[-1, -1, u0, v1], [1, -1, u1, v1], [1, 1, u1, v0], [-1, 1, u0, v0]];
    for (let k = 0; k < 4; k++) {
      const o = (n * 4 + k) * 7, a = C[k][0] * h, bb = C[k][1] * h;
      buf[o] = x + rx * a + ux * bb; buf[o + 1] = y + uy * bb; buf[o + 2] = z + rz * a + uz * bb;
      buf[o + 3] = C[k][2]; buf[o + 4] = C[k][3]; buf[o + 5] = p.tile; buf[o + 6] = b;
    }
    n++;
  }
  entityBegin(texTiles);
  uploadModelMesh(buf.subarray(0, n * 28), n, R.partMesh);
  M4.identity(R.m);
  drawMesh(R.partMesh, R.m);
}

/* ---- character preview drawn into a DOM rectangle ---- */
const _pv = M4.create(), _pp = M4.create(), _pb = M4.create();
function drawPreview(rect, pose, yaw, t, target) {
  let x = 0, y = 0, w, hgt;
  if (target) { w = target.width; hgt = target.height; if (w > R.width || hgt > R.height) return; }
  else {
    const cr = glCanvas.getBoundingClientRect();
    x = Math.round((rect.left - cr.left) * R.dpr); y = Math.round((cr.bottom - rect.bottom) * R.dpr);
    w = Math.round(rect.width * R.dpr); hgt = Math.round(rect.height * R.dpr);
  }
  if (w < 4 || hgt < 4) return;
  gl.enable(gl.SCISSOR_TEST); gl.scissor(x, y, w, hgt); gl.viewport(x, y, w, hgt);
  if (target) { gl.clearColor(0.04, 0.05, 0.08, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); }
  else gl.clear(gl.DEPTH_BUFFER_BIT);
  M4.perspective(_pp, 30 * Math.PI / 180, w / hgt, 0.1, 100);
  M4.identity(_pv); M4.translate(_pv, _pv, 0, -0.98, -4.6);
  M4.mul(_pv, _pp, _pv);
  entityBegin(texSkins, _pv);
  gl.uniform2f(PROG.entity.u.uFog, 1000, 2000);
  M4.identity(_pb); M4.rotY(_pb, _pb, yaw);
  const sc = MODELS.player.scale;
  M4.scale(_pb, _pb, sc, sc, sc);
  gl.enable(gl.CULL_FACE);
  drawModel(MODELS.player, _pb, pose);
  gl.disable(gl.SCISSOR_TEST);
  gl.viewport(0, 0, R.width, R.height);
  if (target) {
    const ctx = target.getContext('2d');
    ctx.clearRect(0, 0, w, hgt);
    ctx.drawImage(glCanvas, 0, R.height - hgt, w, hgt, 0, 0, w, hgt);
  }
}
