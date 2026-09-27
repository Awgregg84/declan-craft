/* ===================== WebGL2 plumbing ===================== */
let gl = null, glCanvas = null;
const PROG = {};
let texTiles = null, texSkins = null, texClouds = null, quadEBO = null;
const MAX_QUADS = 40000;
const CUTOUT_TILE = new Uint8Array(256);   // coverage-preserving mips
const TRANS_TILE = new Uint8Array(256);

const TERRAIN_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aPos;
layout(location=1) in vec4 aUV;
layout(location=2) in vec4 aLight;
uniform mat4 uViewProj;
uniform vec3 uOffset;
uniform float uTime;
out vec3 vUV;
out float vShade;
out vec2 vLight;
out float vDist;
out float vFlag;
const float AO[4] = float[4](0.45, 0.64, 0.82, 1.0);
const float SH[8] = float[8](0.62, 0.62, 1.0, 0.5, 0.8, 0.8, 0.9, 0.9);
void main() {
  vec3 p = aPos.xyz * 0.0625 + uOffset;
  float w = aPos.w;
  float ao = mod(w, 4.0);
  float face = mod(floor(w * 0.25), 8.0);
  float fl = floor(w * 0.03125);
  vShade = SH[int(face)] * AO[int(ao)];
  vec2 uv = aUV.xy * 0.0625;
  if (fl > 0.5 && fl < 1.5) uv += vec2(uTime * 0.02, uTime * 0.09);
  else if (fl > 1.5) uv += vec2(uTime * 0.01, uTime * 0.035);
  vUV = vec3(uv, aUV.z);
  vFlag = fl;
  vLight = aLight.xy * (15.0 / 255.0);
  vDist = length(p);
  gl_Position = uViewProj * vec4(p, 1.0);
}`;
const TERRAIN_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uTex;
uniform float uSkyLight;
uniform vec3 uSkyTint;
uniform vec3 uFogColor;
uniform vec2 uFog;
uniform float uAlphaTest;
uniform vec3 uMinLight;
in vec3 vUV; in float vShade; in vec2 vLight; in float vDist; in float vFlag;
out vec4 outColor;
float curve(float l) { float x = clamp(l / 15.0, 0.0, 1.0); return x / (4.0 - 3.0 * x); }
void main() {
  vec4 c = texture(uTex, vUV);
  if (c.a < uAlphaTest) discard;
  float sky = curve(vLight.x * uSkyLight);
  float blk = min(1.0, curve(vLight.y) * 1.25);
  vec3 light = max(uSkyTint * sky, vec3(1.0, 0.84, 0.6) * blk);
  light = max(light, uMinLight);
  if (vFlag > 1.5) light = vec3(1.0);
  vec3 col = c.rgb * vShade * light;
  float fog = clamp((vDist - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  outColor = vec4(mix(col, uFogColor, fog), c.a);
}`;
const ENTITY_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in float aLayer;
layout(location=3) in float aShade;
uniform mat4 uViewProj;
uniform mat4 uModel;
out vec3 vUV; out float vShade; out float vDist;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vUV = vec3(aUV, aLayer); vShade = aShade; vDist = length(wp.xyz);
  gl_Position = uViewProj * wp;
}`;
const ENTITY_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uTex;
uniform float uBright;
uniform vec4 uTint;
uniform vec3 uColor;
uniform vec3 uFogColor;
uniform vec2 uFog;
uniform float uAlpha;
in vec3 vUV; in float vShade; in float vDist;
out vec4 outColor;
void main() {
  vec4 c = texture(uTex, vUV);
  if (c.a < 0.1) discard;
  vec3 col = c.rgb * uColor * vShade * uBright;
  col = mix(col, uTint.rgb, uTint.a);
  float fog = clamp((vDist - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  outColor = vec4(mix(col, uFogColor, fog), c.a * uAlpha);
}`;
const SKY_VS = `#version 300 es
precision highp float;
out vec2 vNdc;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  vNdc = p; gl_Position = vec4(p, 0.99999, 1.0);
}`;
const SKY_FS = `#version 300 es
precision highp float;
uniform vec3 uRight, uUp, uFwd;
uniform vec2 uTan;
uniform vec3 uZenith, uHorizon, uBottom, uSunDir, uGlow;
uniform float uStars, uGlowAmt, uSunVis;
in vec2 vNdc;
out vec4 outColor;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 dir = normalize(uFwd + vNdc.x * uTan.x * uRight + vNdc.y * uTan.y * uUp);
  float e = dir.y;
  vec3 col = e > 0.0 ? mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.65, e), 0.75)) : mix(uHorizon, uBottom, smoothstep(0.0, 0.3, -e));
  float sd = max(dot(dir, uSunDir), 0.0);
  col += uGlow * uGlowAmt * pow(sd, 5.0) * (1.0 - smoothstep(0.0, 0.45, abs(e - 0.05)));
  if (uStars > 0.01 && e > 0.02) {
    vec3 q = floor(dir * 170.0);
    float hv = hash(q);
    if (hv > 0.9972) col += vec3(uStars * min(1.0, (hv - 0.9972) * 500.0));
  }
  vec3 sT = normalize(cross(uSunDir, vec3(0.0, 0.0, 1.0)));
  vec3 sB = cross(sT, uSunDir);
  float sdot = dot(dir, uSunDir);
  if (sdot > 0.0) {
    vec2 sp = vec2(dot(dir, sT), dot(dir, sB)) / sdot;
    float m = max(abs(sp.x), abs(sp.y));
    if (m < 0.085) col = mix(col, m < 0.055 ? vec3(1.0, 1.0, 0.86) : vec3(1.0, 0.93, 0.6), uSunVis);
    else col += vec3(1.0, 0.85, 0.5) * 0.18 * smoothstep(0.32, 0.085, m) * uSunVis;
  } else {
    vec2 mp = vec2(dot(dir, sT), dot(dir, sB)) / (-sdot);
    float m = max(abs(mp.x), abs(mp.y));
    if (m < 0.065) {
      vec2 cell = floor(mp * 60.0);
      float cr = hash(vec3(cell, 3.0));
      col = vec3(0.86, 0.88, 0.92) * (cr > 0.75 ? 0.72 : 1.0);
    } else col += vec3(0.5, 0.6, 0.8) * 0.08 * smoothstep(0.25, 0.065, m) * uStars;
  }
  outColor = vec4(col, 1.0);
}`;
const CLOUD_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
uniform mat4 uViewProj;
uniform vec3 uCam;
uniform float uY, uExtent;
out vec2 vW; out float vDist;
void main() {
  vec3 p = vec3(aPos.x * uExtent, uY - uCam.y, aPos.y * uExtent);
  vW = vec2(aPos.x * uExtent + uCam.x, aPos.y * uExtent + uCam.z);
  vDist = length(p.xz);
  gl_Position = uViewProj * vec4(p, 1.0);
}`;
const CLOUD_FS = `#version 300 es
precision highp float;
uniform sampler2D uClouds;
uniform float uTime;
uniform vec3 uColor, uFogColor;
uniform float uFogEnd, uAlpha;
in vec2 vW; in float vDist;
out vec4 outColor;
void main() {
  vec2 uv = (vW + vec2(uTime * 1.2, 0.0)) / (12.0 * 64.0);
  float a = texture(uClouds, uv).r;
  if (a < 0.5) discard;
  float fog = clamp(vDist / uFogEnd, 0.0, 1.0);
  outColor = vec4(mix(uColor, uFogColor, fog * fog), uAlpha * (1.0 - fog * fog));
}`;
const LINE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uViewProj;
uniform vec3 uOffset;
void main() { gl_Position = uViewProj * vec4(aPos + uOffset, 1.0); }`;
const LINE_FS = `#version 300 es
precision highp float;
uniform vec4 uColor;
out vec4 outColor;
void main() { outColor = uColor; }`;

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader error: ' + gl.getShaderInfoLog(s));
  return s;
}
function program(vs, fs, names) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link error: ' + gl.getProgramInfoLog(p));
  const u = {};
  for (const n of names) u[n] = gl.getUniformLocation(p, n);
  return { p, u };
}

function initGL() {
  glCanvas = el('gl');
  try {
    gl = glCanvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance' });
  } catch (e) { gl = null; }
  if (!gl) return false;
  PROG.terrain = program(TERRAIN_VS, TERRAIN_FS, ['uViewProj', 'uOffset', 'uTime', 'uTex', 'uSkyLight', 'uSkyTint', 'uFogColor', 'uFog', 'uAlphaTest', 'uMinLight']);
  PROG.entity = program(ENTITY_VS, ENTITY_FS, ['uViewProj', 'uModel', 'uTex', 'uBright', 'uTint', 'uColor', 'uFogColor', 'uFog', 'uAlpha']);
  PROG.sky = program(SKY_VS, SKY_FS, ['uRight', 'uUp', 'uFwd', 'uTan', 'uZenith', 'uHorizon', 'uBottom', 'uSunDir', 'uGlow', 'uStars', 'uGlowAmt', 'uSunVis']);
  PROG.cloud = program(CLOUD_VS, CLOUD_FS, ['uViewProj', 'uCam', 'uY', 'uExtent', 'uClouds', 'uTime', 'uColor', 'uFogColor', 'uFogEnd', 'uAlpha']);
  PROG.line = program(LINE_VS, LINE_FS, ['uViewProj', 'uOffset', 'uColor']);
  // one shared index buffer: every mesh is a list of quads
  const idx = new Uint32Array(MAX_QUADS * 6);
  for (let q = 0, v = 0; q < MAX_QUADS; q++, v += 4) { const o = q * 6; idx[o] = v; idx[o + 1] = v + 1; idx[o + 2] = v + 2; idx[o + 3] = v; idx[o + 4] = v + 2; idx[o + 5] = v + 3; }
  quadEBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadEBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  return true;
}

function buildTileTexture() {
  const n = TILE_DATA.length;
  for (const nm of ['door_top', 'oak_leaves', 'birch_leaves', 'spruce_leaves', 'glass', 'torch', 'tall_grass', 'dandelion', 'poppy', 'cornflower', 'dead_bush', 'oak_sapling', 'birch_sapling', 'spruce_sapling', 'cactus_side', 'cactus_top', 'cactus_bottom', 'bed_side', 'bed_end'])
    CUTOUT_TILE[TILE[nm]] = 1;
  for (const nm of ['water', 'ice', 'nether_portal']) TRANS_TILE[TILE[nm]] = 1;   // see-through from far away too
  for (const nm of TILE_NAMES) if (TILE[nm] >= TILE.stick) CUTOUT_TILE[TILE[nm]] = 1;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
  const levels = 5;
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, gl.RGBA8, 16, 16, n);
  let cur = new Uint8Array(1024 * n);
  for (let i = 0; i < n; i++) cur.set(TILE_DATA[i], i * 1024);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, 16, 16, n, gl.RGBA, gl.UNSIGNED_BYTE, cur);
  let size = 16;
  for (let lv = 1; lv < levels; lv++) {
    const ns = size >> 1, next = new Uint8Array(ns * ns * 4 * n);
    for (let l = 0; l < n; l++) {
      const src = l * size * size * 4, dst = l * ns * ns * 4;
      for (let y = 0; y < ns; y++) for (let x = 0; x < ns; x++) {
        let r = 0, g = 0, b = 0, a = 0, w = 0, cov = 0;
        for (let k = 0; k < 4; k++) {
          const sx = x * 2 + (k & 1), sy = y * 2 + (k >> 1), i = src + (sy * size + sx) * 4;
          const al = cur[i + 3];
          a += al; if (al > 127) cov++;
          const ww = al + 1; r += cur[i] * ww; g += cur[i + 1] * ww; b += cur[i + 2] * ww; w += ww;
        }
        const o = dst + (y * ns + x) * 4;
        next[o] = r / w; next[o + 1] = g / w; next[o + 2] = b / w;
        next[o + 3] = CUTOUT_TILE[l] ? (cov >= 1 ? 255 : 0) : TRANS_TILE[l] ? a / 4 : (cov >= 2 ? 255 : a / 4);
      }
    }
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, lv, 0, 0, 0, ns, ns, n, gl.RGBA, gl.UNSIGNED_BYTE, next);
    cur = next; size = ns;
  }
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  texTiles = tex;
}
function buildSkinTexture() {
  const n = SKIN_DATA.length;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 64, 64, n);
  const all = new Uint8Array(64 * 64 * 4 * n);
  for (let i = 0; i < n; i++) all.set(SKIN_DATA[i], i * 64 * 64 * 4);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, 64, 64, n, gl.RGBA, gl.UNSIGNED_BYTE, all);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  texSkins = tex;
}
function buildCloudTexture() {
  const N = 64, data = new Uint8Array(N * N * 4), r = mulberry32(4242);
  const g = 8, v = new Float32Array(g * g);
  for (let i = 0; i < g * g; i++) v[i] = r();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const fx = (x / N) * g, fy = (y / N) * g, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const at = (a, b) => v[((b + g) % g) * g + ((a + g) % g)];
    let n = lerp(lerp(at(x0, y0), at(x0 + 1, y0), tx), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), tx), ty);
    n = n * 0.75 + r() * 0.25;
    const on = n > 0.58 ? 255 : 0;
    data.set([on, on, on, 255], (y * N + x) * 4);
  }
  texClouds = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texClouds);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

/* Chunk section mesh: interleaved 16-byte vertices, shared quad index buffer. */
function uploadSectionMesh(mesh, u8, quads) {
  if (!mesh) {
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.UNSIGNED_SHORT, false, 16, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, false, 16, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, false, 16, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadEBO);
    gl.bindVertexArray(null);
    mesh = { vao, buf, quads: 0 };
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
  gl.bufferData(gl.ARRAY_BUFFER, u8.subarray(0, quads * 64), gl.STATIC_DRAW);
  mesh.quads = Math.min(quads, MAX_QUADS);
  return mesh;
}
function freeSectionMesh(mesh) { if (!mesh) return; gl.deleteBuffer(mesh.buf); gl.deleteVertexArray(mesh.vao); }

/* Entity-style mesh: float pos(3) uv(2) layer(1) shade(1), quads. */
function uploadModelMesh(floats, quads, mesh) {
  if (!mesh) {
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 28, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 20);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 28, 24);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadEBO);
    gl.bindVertexArray(null);
    mesh = { vao, buf, quads: 0 };
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
  gl.bufferData(gl.ARRAY_BUFFER, floats, gl.DYNAMIC_DRAW);
  mesh.quads = quads;
  return mesh;
}
