/* ===================== Security cameras and monitors ===================== */
// Put a security camera up on a wall (or stand one on top of a block): it looks out the way it faces. A Camera
// Monitor shows what a camera near it sees, live, with the camera's number in the corner. Tap the monitor to switch
// to the next camera. Each iPad draws the pictures itself, a few times a second, from where the camera is: the world
// is drawn again, small, into the monitor's picture.
const CAM_RANGE = 64;   // how far from a monitor its cameras can be
const CAM_YAW4 = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
const CAMS = {
  pass: false, at: null,   // (drawing a camera's picture now, and which camera)
  fb: null, rb: null, broken: false,
  want: new Map(), done: new Map(), lists: new Map(),
  view: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, fov: 80 * Math.PI / 180, roll: 0 },
};
const CAM_POSE_STAND = { body: [0.12, 0, 0] }, CAM_POSE_WALL = { body: [0.3, 0, 0] };   // (tipped down a little)

/* the cameras near a monitor, nearest first (worked out again every second or so) */
function camerasNear(w, x, y, z, fresh) {
  const key = w.map + ':' + game.dim + ':' + x + ',' + y + ',' + z, got = CAMS.lists.get(key);
  if (got && !fresh && game.t - got.t < 1 && game.t >= got.t) return got.list;
  const list = [], r = CAM_RANGE >> 4, cx0 = x >> 4, cz0 = z >> 4;
  for (let cx = cx0 - r; cx <= cx0 + r; cx++) for (let cz = cz0 - r; cz <= cz0 + r; cz++) {
    const c = w.getChunk(cx, cz);
    if (!c || !c.specials || !c.specials.size) continue;
    for (const i of c.specials) {
      if (c.blocks[i] !== B.CAMERA) continue;
      const bx = cx * 16 + (i & 15), by = i >> 8, bz = cz * 16 + ((i >> 4) & 15), d = (bx - x) ** 2 + (by - y) ** 2 + (bz - z) ** 2;
      if (d <= CAM_RANGE * CAM_RANGE) list.push({ x: bx, y: by, z: bz, data: c.data[i], d });
    }
  }
  list.sort((a, b) => a.d - b.d || a.x - b.x || a.y - b.y || a.z - b.z);
  if (list.length > 64) list.length = 64;
  CAMS.lists.delete(key); CAMS.lists.set(key, { t: game.t, list });
  if (CAMS.lists.size > 64) CAMS.lists.delete(CAMS.lists.keys().next().value);
  return list;
}
/* which way a camera's model is turned (its lens looks along its +z) */
const camTurn = data => (data < 16 ? (data & 15) * Math.PI / 8 : CAM_YAW4[data & 3]);
/* where a camera's lens is, and which way it looks */
function camView(c, v) {
  const th = camTurn(c.data), wall = c.data >= 16, k = wall ? 0.32 : 0.27;
  v.x = c.x + 0.5 + Math.sin(th) * k; v.y = c.y + (wall ? 0.54 : 0.5); v.z = c.z + 0.5 + Math.cos(th) * k;
  v.yaw = th + Math.PI; v.pitch = wall ? -0.3 : -0.12;
  return v;
}
const camKey = (w, c) => 'cam:' + w.map + ':' + game.dim + ':' + c.x + ',' + c.y + ',' + c.z;

/* tap a monitor: the next camera */
function useMonitor(game, x, y, z) {
  const w = game.world, d = w.getData(x, y, z), list = camerasNear(w, x, y, z, true);
  if (!list.length) {
    toast('There are no security cameras near this monitor. Put one up, then tap the monitor again!', 4);
    sfx('tvOff', x + 0.5, y + 0.5, z + 0.5);
    return;
  }
  const k = ((d >> 2) + 1) % list.length;
  w.setBlock(x, y, z, B.MONITOR, (d & 3) | (k << 2), true);
  toast('Camera ' + (k + 1) + ' of ' + list.length, 2);
  sfx('camSwitch', x + 0.5, y + 0.5, z + 0.5);
  if (game.net) MP.localFx('sfx', x + 0.5, y + 0.5, z + 0.5, SFX_NET.indexOf('camSwitch'));
}

/* a camera on its block: on a little stand, or on an arm out from the wall */
const _cm = M4.create();
SPECIAL_DRAW[B.CAMERA] = (w, x, y, z, data, s, t, cam) => {
  if (CAMS.pass && CAMS.at && CAMS.at[0] === x && CAMS.at[1] === y && CAMS.at[2] === z) return;   // (a camera doesn't see itself)
  const wall = data >= 16, P = PROG.entity;
  entityBegin(texSkins);
  gl.uniform1f(P.u.uBright, brightAt(w, x + 0.5, y + 0.6, z + 0.5, s));
  M4.identity(_cm);
  M4.translate(_cm, _cm, x + 0.5 - cam.x, y - cam.y, z + 0.5 - cam.z);
  M4.rotY(_cm, _cm, camTurn(data));
  M4.scale(_cm, _cm, 1 / 16, 1 / 16, 1 / 16);
  gl.enable(gl.CULL_FACE);
  drawModel(MODELS[wall ? 'camera_wall' : 'camera_stand'], _cm, wall ? CAM_POSE_WALL : CAM_POSE_STAND);
};

/* a monitor: its camera's picture on the screen (or fuzz until it comes through), with the camera's number */
const _mn = M4.create(), _ml = M4.create();
SPECIAL_DRAW[B.MONITOR] = (w, x, y, z, data, s, t, cam) => {
  if (CAMS.pass) return;   // (seen by a camera: no picture there, so it asks for none)
  const d2 = (x + 0.5 - cam.x) ** 2 + (z + 0.5 - cam.z) ** 2;
  if (d2 > 32 * 32) return;
  M4.identity(_mn);
  M4.translate(_mn, _mn, x + 0.5 - cam.x, y + 9 / 16 - cam.y, z + 0.5 - cam.z);
  M4.rotY(_mn, _mn, CAM_YAW4[data & 3]);
  M4.translate(_mn, _mn, 0, 0, 0.503);
  M4.scale(_mn, _mn, 12 / 16, 10 / 16, 1);
  if (!dynFacing(_mn)) return;   // (from behind, the picture isn't drawn)
  gl.disable(gl.CULL_FACE);
  const list = camerasNear(w, x, y, z), V = TV_H / 128;
  if (!list.length) {   // no cameras yet
    const blink = Math.floor(t * 1.5) % 2, layer = dynLayer('monitor:none', blink, ctx => monitorNone(ctx, blink));
    if (layer >= 0) drawDyn(layer, _mn, 0, 0, 1, V, 1);
    return;
  }
  const k = (data >> 2) % list.length, c = list[k], key = camKey(w, c), e = CAMS.done.get(key);
  CAMS.want.set(key, c);
  if (e && !CAMS.broken && DYN.map.get(key) === e.dyn) {
    const layer = dynLayer(key, 'cam', () => {});
    if (layer >= 0) drawDyn(layer, _mn, 0, V, 1, 0, 1);   // (drawn by the graphics chip: the other way up from a painted picture)
  } else {
    const layer = dynLayer('monitor:fuzz', Math.floor(t * 12), ctx => tvFuzz(ctx, t));
    if (layer >= 0) drawDyn(layer, _mn, 0, 0, 1, V, 1);
  }
  const blink = Math.floor(t * 1.5) % 2, lab = dynLayer('camlabel:' + (k + 1) + ':' + blink, 0, ctx => camLabel(ctx, k + 1, blink));
  if (lab >= 0) { M4.copy(_ml, _mn); M4.translate(_ml, _ml, 0, 0, 0.006); drawDyn(lab, _ml, 0, 0, 1, V, 1); }
};
function camLabel(ctx, n, blink) {
  tvText(ctx, 'CAM ' + n, 24, 11, '#ffffff', 11);
  if (blink) {
    ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(98, 11, 4, 0, Math.PI * 2); ctx.fill();
    tvText(ctx, 'REC', 114, 11, '#ff6a6a', 10);
  }
}
function monitorNone(ctx, blink) {
  ctx.fillStyle = '#0a1a3a'; ctx.fillRect(0, 0, TV_W, TV_H);
  if (blink) tvText(ctx, 'NO CAMERA', TV_W / 2, 42, '#ffffff', 14);
  tvText(ctx, 'Put up a', TV_W / 2, 66, '#9ac8ff', 10);
  tvText(ctx, 'security camera!', TV_W / 2, 80, '#9ac8ff', 10);
}

/* once a frame, before the world is drawn: the camera on a monitor that has waited longest gets a new picture */
function renderCameras() {
  const want = CAMS.want;
  if (!want.size) return;
  if (CAMS.broken || game.state !== 'playing') { want.clear(); return; }
  const every = game.settings.quality ? 0.12 : 0.25;   // (a few pictures a second is plenty, and kind to the iPad)
  let best = null, age = -1;
  for (const [key] of want) {
    const e = CAMS.done.get(key), a = e && DYN.map.get(key) === e.dyn && game.t >= e.t ? game.t - e.t : 1e9;
    if (a >= every && a > age) { best = key; age = a; }
  }
  const c = best && want.get(best);
  want.clear();
  if (!c || game.world.getBlock(c.x, c.y, c.z) !== B.CAMERA) return;
  const layer = dynLayer(best, 'cam', ctx => tvFuzz(ctx, game.t));
  if (layer < 0 || (!CAMS.fb && !initCamFB())) return;
  gl.bindFramebuffer(gl.FRAMEBUFFER, CAMS.fb);
  gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, DYN.tex, 0, layer);
  const W = R.width, H = R.height;
  R.width = TV_W; R.height = TV_H;
  CAMS.pass = true; CAMS.at = [c.x, c.y, c.z];
  try { renderWorld(camView(c, CAMS.view), 0, false, true); }
  finally { CAMS.pass = false; CAMS.at = null; R.width = W; R.height = H; gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  CAMS.done.delete(best); CAMS.done.set(best, { t: game.t, dyn: DYN.map.get(best) });
  if (CAMS.done.size > 64) CAMS.done.delete(CAMS.done.keys().next().value);
}
function initCamFB() {
  CAMS.fb = gl.createFramebuffer(); CAMS.rb = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, CAMS.rb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 128, 128);
  gl.bindFramebuffer(gl.FRAMEBUFFER, CAMS.fb);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, CAMS.rb);
  gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, DYN.tex, 0, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) CAMS.broken = true;   // (then monitors just show fuzz)
  return ok;
}
