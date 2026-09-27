/* ===================== Box models and item meshes ===================== */
const MODELS = {};
class MeshBuilder {
  constructor() { this.f = []; this.q = 0; }
  v(x, y, z, u, v, layer, shade) { this.f.push(x, y, z, u, v, layer, shade); }
  quad(p, uvs, layer, shade, T, inset) {
    const e = inset === undefined ? 0.02 : inset;
    let umin = 1e9, umax = -1e9, vmin = 1e9, vmax = -1e9;
    for (const q of uvs) { umin = Math.min(umin, q[0]); umax = Math.max(umax, q[0]); vmin = Math.min(vmin, q[1]); vmax = Math.max(vmax, q[1]); }
    for (let k = 0; k < 4; k++) {
      let u = uvs[k][0], v = uvs[k][1];
      if (umax > umin) u += u === umin ? e : -e;
      if (vmax > vmin) v += v === vmin ? e : -e;
      this.v(p[k][0], p[k][1], p[k][2], u / T, v / T, layer, shade);
    }
    this.q++;
  }
  build(mesh) { return uploadModelMesh(new Float32Array(this.f), this.q, mesh); }
}
function addBox(mb, x0, y0, z0, w, hgt, d, u, v, layer, inflate) {
  const i = inflate || 0, X0 = x0 - i, Y0 = y0 - i, Z0 = z0 - i, X1 = x0 + w + i, Y1 = y0 + hgt + i, Z1 = z0 + d + i, T = 64;
  mb.quad([[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]], [[u + d, v + d + hgt], [u + d + w, v + d + hgt], [u + d + w, v + d], [u + d, v + d]], layer, 0.92, T);
  mb.quad([[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0]], [[u, v + d + hgt], [u + d, v + d + hgt], [u + d, v + d], [u, v + d]], layer, 0.72, T);
  mb.quad([[X1, Y0, Z1], [X1, Y0, Z0], [X1, Y1, Z0], [X1, Y1, Z1]], [[u + d + w, v + d + hgt], [u + 2 * d + w, v + d + hgt], [u + 2 * d + w, v + d], [u + d + w, v + d]], layer, 0.72, T);
  mb.quad([[X1, Y0, Z0], [X0, Y0, Z0], [X0, Y1, Z0], [X1, Y1, Z0]], [[u + 2 * d + w, v + d + hgt], [u + 2 * d + 2 * w, v + d + hgt], [u + 2 * d + 2 * w, v + d], [u + 2 * d + w, v + d]], layer, 0.8, T);
  mb.quad([[X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0], [X0, Y1, Z0]], [[u + d, v + d], [u + d + w, v + d], [u + d + w, v], [u + d, v]], layer, 1.0, T);
  mb.quad([[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1]], [[u + d + w, v], [u + d + 2 * w, v], [u + d + 2 * w, v + d], [u + d + w, v + d]], layer, 0.55, T);
}
function defModel(name, skin, scale, parts) {
  const m = { name, scale, parts: {}, list: [] };
  for (const p of parts) {
    const mb = new MeshBuilder();
    const b = p.box;
    addBox(mb, b[0], b[1], b[2], b[3], b[4], b[5], p.uv[0], p.uv[1], SKIN[p.skin || skin], p.inflate);
    const part = { name: p.name, mesh: mb.build(), pivot: p.pivot || [0, 0, 0], follow: p.follow || null, tint: !!p.tint };
    m.parts[p.name] = part; m.list.push(part);
  }
  MODELS[name] = m;
  return m;
}
function humanoid(name, skin, scale, extras) {
  return defModel(name, skin, scale, [
    { name: 'head', box: [-4, 24, -4, 8, 8, 8], uv: [0, 0], pivot: [0, 24, 0] },
    { name: 'hat', box: [-4, 24, -4, 8, 8, 8], uv: [32, 0], pivot: [0, 24, 0], inflate: 0.5, follow: 'head' },
    { name: 'body', box: [-4, 12, -2, 8, 12, 4], uv: [16, 16], pivot: [0, 24, 0] },
    { name: 'rarm', box: [-8, 12, -2, 4, 12, 4], uv: [40, 16], pivot: [-6, 22, 0] },
    { name: 'larm', box: [4, 12, -2, 4, 12, 4], uv: [32, 48], pivot: [6, 22, 0] },
    { name: 'rleg', box: [-4, 0, -2, 4, 12, 4], uv: [0, 16], pivot: [-2, 12, 0] },
    { name: 'lleg', box: [0, 0, -2, 4, 12, 4], uv: [16, 48], pivot: [2, 12, 0] },
  ].concat(extras || []));
}
const PLAYER_SKINS = ['declan', 'sister'];
const VILLAGER_PROFS = ['farmer', 'butcher', 'toolsmith', 'shepherd', 'mason', 'cleric'];
function playerModelFor(skin) { return MODELS['player_' + skin] || MODELS.player; }
function buildModels() {
  humanoid('player', 'declan', 0.9375 / 16);
  MODELS.player_declan = MODELS.player;
  humanoid('player_sister', 'sister', 0.9375 / 16);
  for (const prof of VILLAGER_PROFS) {
    defModel('villager_' + prof, 'villager_' + prof, 0.9 / 16, [
      { name: 'head', box: [-4, 24, -4, 8, 10, 8], uv: [0, 0], pivot: [0, 24, 0] },
      { name: 'nose', box: [-1, 25, 4, 2, 4, 2], uv: [32, 0], pivot: [0, 24, 0], follow: 'head' },
      { name: 'body', box: [-4, 5, -3, 8, 19, 6], uv: [0, 20] },
      { name: 'rarmU', box: [-8, 16, -2, 4, 8, 4], uv: [32, 20], pivot: [-6, 23, 0] },
      { name: 'larmU', box: [4, 16, -2, 4, 8, 4], uv: [32, 20], pivot: [6, 23, 0] },
      { name: 'arms', box: [-8, 16, 3, 16, 4, 4], uv: [0, 46] },
      { name: 'rleg', box: [-4, 0, -2, 4, 6, 4], uv: [40, 0], pivot: [-2, 6, 0] },
      { name: 'lleg', box: [0, 0, -2, 4, 6, 4], uv: [40, 0], pivot: [2, 6, 0] },
    ]);
  }
  humanoid('zombie', 'zombie', 1 / 16);
  defModel('piglin', 'piglin', 1 / 16, [
    { name: 'head', box: [-5, 24, -4, 10, 8, 8], uv: [0, 0], pivot: [0, 24, 0] },
    { name: 'snout', box: [-2, 25, 4, 4, 3, 1], uv: [36, 0], pivot: [0, 24, 0], follow: 'head' },
    { name: 'ear1', box: [-6, 25, -2, 1, 5, 4], uv: [48, 0], pivot: [0, 24, 0], follow: 'head' },
    { name: 'ear2', box: [5, 25, -2, 1, 5, 4], uv: [48, 0], pivot: [0, 24, 0], follow: 'head' },
    { name: 'body', box: [-4, 12, -2, 8, 12, 4], uv: [16, 16], pivot: [0, 24, 0] },
    { name: 'rarm', box: [-8, 12, -2, 4, 12, 4], uv: [40, 16], pivot: [-6, 22, 0] },
    { name: 'sword', box: [-6.5, 11, 1, 1, 1, 12], uv: [0, 34], pivot: [-6, 22, 0], follow: 'rarm' },
    { name: 'larm', box: [4, 12, -2, 4, 12, 4], uv: [32, 48], pivot: [6, 22, 0] },
    { name: 'rleg', box: [-4, 0, -2, 4, 12, 4], uv: [0, 16], pivot: [-2, 12, 0] },
    { name: 'lleg', box: [0, 0, -2, 4, 12, 4], uv: [16, 48], pivot: [2, 12, 0] },
  ]);
  defModel('magma', 'magma', 1 / 16, [{ name: 'body', box: [-4, 0, -4, 8, 8, 8], uv: [0, 0] }]);
  defModel('creeper', 'creeper', 1 / 16, [
    { name: 'head', box: [-4, 18, -4, 8, 8, 8], uv: [0, 0], pivot: [0, 18, 0] },
    { name: 'body', box: [-4, 6, -2, 8, 12, 4], uv: [16, 16] },
    { name: 'leg1', box: [-4, 0, 2, 4, 6, 4], uv: [0, 16], pivot: [-2, 6, 4] },
    { name: 'leg2', box: [0, 0, 2, 4, 6, 4], uv: [0, 16], pivot: [2, 6, 4] },
    { name: 'leg3', box: [-4, 0, -6, 4, 6, 4], uv: [0, 16], pivot: [-2, 6, -4] },
    { name: 'leg4', box: [0, 0, -6, 4, 6, 4], uv: [0, 16], pivot: [2, 6, -4] },
  ]);
  defModel('pig', 'pig', 1 / 16, [
    { name: 'head', box: [-4, 8, 6, 8, 8, 8], uv: [0, 0], pivot: [0, 12, 6] },
    { name: 'snout', box: [-2, 9, 14, 4, 3, 1], uv: [32, 0], pivot: [0, 12, 6], follow: 'head' },
    { name: 'body', box: [-5, 6, -8, 10, 8, 16], uv: [0, 32] },
    { name: 'leg1', box: [-5, 0, 3, 4, 6, 4], uv: [0, 16], pivot: [-3, 6, 5] },
    { name: 'leg2', box: [1, 0, 3, 4, 6, 4], uv: [0, 16], pivot: [3, 6, 5] },
    { name: 'leg3', box: [-5, 0, -7, 4, 6, 4], uv: [0, 16], pivot: [-3, 6, -5] },
    { name: 'leg4', box: [1, 0, -7, 4, 6, 4], uv: [0, 16], pivot: [3, 6, -5] },
  ]);
  defModel('cow', 'cow', 1 / 16, [
    { name: 'head', box: [-4, 16, 9, 8, 8, 6], uv: [0, 0], pivot: [0, 20, 9] },
    { name: 'muzzle', box: [-2, 16, 15, 4, 3, 1], uv: [40, 0], pivot: [0, 20, 9], follow: 'head' },
    { name: 'horn1', box: [-5, 22, 11, 1, 3, 1], uv: [32, 0], pivot: [0, 20, 9], follow: 'head' },
    { name: 'horn2', box: [4, 22, 11, 1, 3, 1], uv: [32, 0], pivot: [0, 20, 9], follow: 'head' },
    { name: 'body', box: [-6, 12, -9, 12, 10, 18], uv: [0, 36] },
    { name: 'leg1', box: [-6, 0, 4, 4, 12, 4], uv: [0, 16], pivot: [-4, 12, 6] },
    { name: 'leg2', box: [2, 0, 4, 4, 12, 4], uv: [0, 16], pivot: [4, 12, 6] },
    { name: 'leg3', box: [-6, 0, -8, 4, 12, 4], uv: [0, 16], pivot: [-4, 12, -6] },
    { name: 'leg4', box: [2, 0, -8, 4, 12, 4], uv: [0, 16], pivot: [4, 12, -6] },
  ]);
  defModel('sheep', 'sheep', 1 / 16, [
    { name: 'head', box: [-3, 14, 7, 6, 6, 8], uv: [0, 0], pivot: [0, 16, 7] },
    { name: 'woolhead', box: [-3, 17, 7, 6, 3, 6], uv: [0, 0], pivot: [0, 16, 7], follow: 'head', skin: 'sheep_wool', inflate: 0.6, tint: true },
    { name: 'body', box: [-4, 10, -7, 8, 8, 14], uv: [0, 32] },
    { name: 'wool', box: [-4, 10, -7, 8, 8, 14], uv: [0, 0], skin: 'sheep_wool', inflate: 1.75, tint: true, follow: 'body' },
    { name: 'leg1', box: [-4, 0, 2, 4, 10, 4], uv: [0, 16], pivot: [-2, 10, 4] },
    { name: 'leg2', box: [0, 0, 2, 4, 10, 4], uv: [0, 16], pivot: [2, 10, 4] },
    { name: 'leg3', box: [-4, 0, -6, 4, 10, 4], uv: [0, 16], pivot: [-2, 10, -4] },
    { name: 'leg4', box: [0, 0, -6, 4, 10, 4], uv: [0, 16], pivot: [2, 10, -4] },
  ]);
  defModel('chicken', 'chicken', 1 / 16, [
    { name: 'head', box: [-2, 9, 3, 4, 6, 3], uv: [0, 0], pivot: [0, 10, 4] },
    { name: 'beak', box: [-2, 11, 6, 4, 2, 2], uv: [16, 0], pivot: [0, 10, 4], follow: 'head' },
    { name: 'wattle', box: [-1, 9, 6, 2, 2, 2], uv: [16, 8], pivot: [0, 10, 4], follow: 'head' },
    { name: 'body', box: [-3, 5, -4, 6, 6, 8], uv: [0, 16] },
    { name: 'wing1', box: [-4, 7, -3, 1, 4, 6], uv: [32, 16], pivot: [-3, 11, 0] },
    { name: 'wing2', box: [3, 7, -3, 1, 4, 6], uv: [32, 16], pivot: [3, 11, 0] },
    { name: 'leg1', box: [-2, 0, 0, 1, 5, 1], uv: [32, 32], pivot: [-1.5, 5, 0.5] },
    { name: 'leg2', box: [1, 0, 0, 1, 5, 1], uv: [32, 32], pivot: [1.5, 5, 0.5] },
  ]);
}

const _pm = M4.create();
/* pose: { partName: [rx, ry, rz] } */
function drawModel(model, base, pose, color) {
  const u = PROG.entity.u;
  let tinted = false;
  for (const part of model.list) {
    const r = pose ? pose[part.follow || part.name] : null;
    _pm.set(base);
    if (r && (r[0] || r[1] || r[2])) {
      const pv = part.pivot;
      M4.translate(_pm, _pm, pv[0], pv[1], pv[2]);
      if (r[2]) M4.rotZ(_pm, _pm, r[2]);
      if (r[1]) M4.rotY(_pm, _pm, r[1]);
      if (r[0]) M4.rotX(_pm, _pm, r[0]);
      M4.translate(_pm, _pm, -pv[0], -pv[1], -pv[2]);
    }
    gl.uniformMatrix4fv(u.uModel, false, _pm);
    if (part.tint) { gl.uniform3fv(u.uColor, color || [1, 1, 1]); tinted = true; }
    else if (tinted) { gl.uniform3f(u.uColor, 1, 1, 1); tinted = false; }
    gl.bindVertexArray(part.mesh.vao);
    gl.drawElements(gl.TRIANGLES, part.mesh.quads * 6, gl.UNSIGNED_INT, 0);
  }
  if (tinted) gl.uniform3f(u.uColor, 1, 1, 1);
}
function drawPart(part, m) {
  gl.uniformMatrix4fv(PROG.entity.u.uModel, false, m);
  gl.bindVertexArray(part.mesh.vao);
  gl.drawElements(gl.TRIANGLES, part.mesh.quads * 6, gl.UNSIGNED_INT, 0);
}

/* ---- items as 3D meshes (pixel units, centered on x/z, feet at y=0) ---- */
const ITEM_MESH = {};
function isCubeItem(id) { return id < 256 && (RENDER[id] === R_CUBE || RENDER[id] === R_LIQUID || RENDER[id] === R_CACTUS || RENDER[id] === R_BED); }
function itemMesh(id) {
  if (ITEM_MESH[id]) return ITEM_MESH[id];
  const mesh = isCubeItem(id) ? blockCubeMesh(id) : spriteMesh(id < 256 ? BT[id * 6] : TILE[ITEMS[id].tex]);
  ITEM_MESH[id] = mesh;
  return mesh;
}
function blockCubeMesh(id) {
  const mb = new MeshBuilder();
  const hgt = RENDER[id] === R_BED ? 9 : 16, ins = RENDER[id] === R_CACTUS ? 1 : 0;
  const x0 = -8 + ins, x1 = 8 - ins, z0 = -8 + ins, z1 = 8 - ins;
  const F = [
    [[x1, 0, z1], [x1, 0, z0], [x1, hgt, z0], [x1, hgt, z1]],
    [[x0, 0, z0], [x0, 0, z1], [x0, hgt, z1], [x0, hgt, z0]],
    [[x0, hgt, z1], [x1, hgt, z1], [x1, hgt, z0], [x0, hgt, z0]],
    [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]],
    [[x0, 0, z1], [x1, 0, z1], [x1, hgt, z1], [x0, hgt, z1]],
    [[x1, 0, z0], [x0, 0, z0], [x0, hgt, z0], [x1, hgt, z0]],
  ];
  const shade = [0.62, 0.62, 1, 0.5, 0.8, 0.8];
  for (let d = 0; d < 6; d++) {
    const t = tileFor(id, d, 0), vt = (RENDER[id] === R_BED && d !== 2 && d !== 3) ? 7 : 0;
    mb.quad(F[d], [[0, 16], [16, 16], [16, vt], [0, vt]], t, shade[d], 16, 0);
  }
  return mb.build();
}
function spriteMesh(layer) {
  const px = TILE_DATA[layer], mb = new MeshBuilder(), T = 0.5;
  const A = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && px[(y * 16 + x) * 4 + 3] > 20;
  mb.quad([[-8, 0, T], [8, 0, T], [8, 16, T], [-8, 16, T]], [[0, 16], [16, 16], [16, 0], [0, 0]], layer, 1, 16, 0);
  mb.quad([[8, 0, -T], [-8, 0, -T], [-8, 16, -T], [8, 16, -T]], [[16, 16], [0, 16], [0, 0], [16, 0]], layer, 0.8, 16, 0);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!A(x, y)) continue;
    const X0 = -8 + x, X1 = X0 + 1, Y1 = 16 - y, Y0 = Y1 - 1, u = x + 0.5, v = y + 0.5, uv = [[u, v], [u, v], [u, v], [u, v]];
    if (!A(x - 1, y)) mb.quad([[X0, Y0, -T], [X0, Y0, T], [X0, Y1, T], [X0, Y1, -T]], uv, layer, 0.7, 16, 0);
    if (!A(x + 1, y)) mb.quad([[X1, Y0, T], [X1, Y0, -T], [X1, Y1, -T], [X1, Y1, T]], uv, layer, 0.7, 16, 0);
    if (!A(x, y - 1)) mb.quad([[X0, Y1, T], [X1, Y1, T], [X1, Y1, -T], [X0, Y1, -T]], uv, layer, 0.9, 16, 0);
    if (!A(x, y + 1)) mb.quad([[X0, Y0, -T], [X1, Y0, -T], [X1, Y0, T], [X0, Y0, T]], uv, layer, 0.6, 16, 0);
  }
  return mb.build();
}
function drawMesh(mesh, m) {
  gl.uniformMatrix4fv(PROG.entity.u.uModel, false, m);
  gl.bindVertexArray(mesh.vao);
  gl.drawElements(gl.TRIANGLES, mesh.quads * 6, gl.UNSIGNED_INT, 0);
}

/* selection box lines */
let outlineVAO = null;
function buildOutline() {
  const e = 0.004, a = -e, b = 1 + e;
  const P = [[a, a, a], [b, a, a], [b, a, b], [a, a, b], [a, b, a], [b, b, a], [b, b, b], [a, b, b]];
  const E = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7];
  const f = new Float32Array(E.length * 3);
  E.forEach((k, i) => f.set(P[k], i * 3));
  outlineVAO = gl.createVertexArray();
  gl.bindVertexArray(outlineVAO);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, f, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
}
