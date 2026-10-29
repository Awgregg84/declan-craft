/* ===================== Live pictures: words on signs, coloring boards and TV shows ===================== */
// One texture array of 128x128 pictures. Each sign, board or TV channel on screen borrows a layer (the one
// used longest ago is taken back) and paints it with a 2D canvas when its picture changes.
const DYN = { tex: null, n: 64, keys: [], used: null, usedF: null, frame: 0, map: new Map(), canvas: null, ctx: null, quads: {} };
function initDyn() {
  DYN.tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, DYN.tex);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 128, 128, DYN.n);
  for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D_ARRAY, p, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  DYN.keys = new Array(DYN.n).fill(null);
  DYN.used = new Float64Array(DYN.n);
  DYN.usedF = new Int32Array(DYN.n).fill(-1);
  DYN.canvas = document.createElement('canvas'); DYN.canvas.width = DYN.canvas.height = 128;
  DYN.ctx = DYN.canvas.getContext('2d');
}
/* the layer with key's picture, painted by paint(ctx) when it isn't there yet or ver has changed (ver: anything,
   compared with ===; signs and boards pass their tile, which is a new object whenever the picture changes) */
function dynLayer(key, ver, paint) {
  if (CAMS.pass) return -1;   // (drawing what a security camera sees: no pictures in pictures)
  let e = DYN.map.get(key);
  if (!e) {
    let best = 0;
    for (let i = 1; i < DYN.n; i++) if (DYN.used[i] < DYN.used[best]) best = i;
    if (DYN.usedF[best] === DYN.frame) return -1;   // every layer is already showing something in this frame: this one goes without
    if (DYN.keys[best]) DYN.map.delete(DYN.keys[best]);
    e = { i: best, ver: null };
    DYN.keys[best] = key; DYN.map.set(key, e);
  }
  if (e.ver !== ver) {
    e.ver = ver;
    const ctx = DYN.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 128, 128);
    ctx.imageSmoothingEnabled = false;
    paint(ctx);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, DYN.tex);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, e.i, 128, 128, 1, gl.RGBA, gl.UNSIGNED_BYTE, DYN.canvas);
  }
  DYN.used[e.i] = performance.now(); DYN.usedF[e.i] = DYN.frame;
  return e.i;
}
/* a new frame (pictures drawn in it keep their layers until the next one) */
function dynFrame() { DYN.frame++; }
/* is a picture drawn with matrix m (around the camera, facing +z) turned toward the camera? */
const dynFacing = m => m[8] * m[12] + m[9] * m[13] + m[10] * m[14] < 0;
/* a flat picture facing +z, w by h, centered on the origin, showing part (u0, v0)-(u1, v1) of a layer (0-1) */
function dynQuad(layer, u0, v0, u1, v1) {
  const k = layer + ':' + u0 + ':' + v0 + ':' + u1 + ':' + v1;
  if (DYN.quads[k]) return DYN.quads[k];
  const mb = new MeshBuilder();
  mb.quad([[-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0]], [[u0, v1], [u1, v1], [u1, v0], [u0, v0]], layer, 1, 1, 0);
  return (DYN.quads[k] = mb.build());
}
/* draw layer's picture as a w x h rectangle with matrix m (already placed, rotated and scaled to blocks) */
function drawDyn(layer, m, u0, v0, u1, v1, bright) {
  if (CAMS.pass || layer < 0) return;
  const P = PROG.entity;
  entityBegin(DYN.tex);
  gl.uniform1f(P.u.uBright, bright);
  drawMesh(dynQuad(layer, u0, v0, u1, v1), m);
}
