'use strict';
/* =========================================================================
   Declan-craft - a block building game for Declan.
   Everything (world, textures, models, sounds) is generated in code.
   ========================================================================= */

const BOOT = { ok: false, errorShown: false };
function showBootProblem(title, detail) {
  const n = document.getElementById('boot-note');
  if (!n) return;
  n.hidden = false;
  n.textContent = '';
  const a = document.createElement('p'), b = document.createElement('p');
  a.className = 'boot-h'; a.textContent = title; b.textContent = detail;
  n.append(a, b);
}
window.addEventListener('error', e => {
  const msg = (e && (e.message || (e.error && e.error.message))) || 'unknown error';
  if (!BOOT.ok) showBootProblem('Declan-craft could not start on this device.', 'Details: ' + msg + '. Updating the browser usually fixes this. You can also play on a computer.');
  else if (!BOOT.errorShown && typeof toast === 'function') { BOOT.errorShown = true; try { toast('Something went wrong: ' + msg, 8); } catch (x) { /* ignore */ } }
});

const CS = 16, WH = 128, NSEC = WH >> 4, CVOL = CS * CS * WH;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const nowS = () => performance.now() / 1000;
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const IS_TOUCH = !!((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
  (('ontouchstart' in window) && navigator.maxTouchPoints > 0));

function posKey(x, y, z) { return ((x + 1048576) * 2097152 + (z + 1048576)) * 256 + y; }
function chunkKey(cx, cz) { return (cx + 32768) * 65536 + (cz + 32768); }
function tileKey(x, y, z) { return x + ',' + y + ',' + z; }

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function randRange(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/* ---------- 4x4 matrices (column-major, WebGL layout) ---------- */
const M4 = {
  create() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  identity(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  copy(o, a) { o.set(a); return o; },
  perspective(o, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o.fill(0); o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf;
    return o;
  },
  mul(o, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
      o[c * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
      o[c * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
      o[c * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
    }
    return o;
  },
  translate(o, a, x, y, z) {
    if (o !== a) for (let i = 0; i < 12; i++) o[i] = a[i];
    o[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    o[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    o[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    o[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    return o;
  },
  scale(o, a, x, y, z) {
    for (let i = 0; i < 4; i++) { o[i] = a[i] * x; o[4 + i] = a[4 + i] * y; o[8 + i] = a[8 + i] * z; o[12 + i] = a[12 + i]; }
    return o;
  },
  rotX(o, a, r) {
    const s = Math.sin(r), c = Math.cos(r);
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (o !== a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; o[3] = a[3]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
    o[4] = a10 * c + a20 * s; o[5] = a11 * c + a21 * s; o[6] = a12 * c + a22 * s; o[7] = a13 * c + a23 * s;
    o[8] = a20 * c - a10 * s; o[9] = a21 * c - a11 * s; o[10] = a22 * c - a12 * s; o[11] = a23 * c - a13 * s;
    return o;
  },
  rotY(o, a, r) {
    const s = Math.sin(r), c = Math.cos(r);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (o !== a) { o[4] = a[4]; o[5] = a[5]; o[6] = a[6]; o[7] = a[7]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
    o[0] = a00 * c - a20 * s; o[1] = a01 * c - a21 * s; o[2] = a02 * c - a22 * s; o[3] = a03 * c - a23 * s;
    o[8] = a00 * s + a20 * c; o[9] = a01 * s + a21 * c; o[10] = a02 * s + a22 * c; o[11] = a03 * s + a23 * c;
    return o;
  },
  rotZ(o, a, r) {
    const s = Math.sin(r), c = Math.cos(r);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    if (o !== a) { o[8] = a[8]; o[9] = a[9]; o[10] = a[10]; o[11] = a[11]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
    o[0] = a00 * c + a10 * s; o[1] = a01 * c + a11 * s; o[2] = a02 * c + a12 * s; o[3] = a03 * c + a13 * s;
    o[4] = a10 * c - a00 * s; o[5] = a11 * c - a01 * s; o[6] = a12 * c - a02 * s; o[7] = a13 * c - a03 * s;
    return o;
  },
};

/* Frustum planes (Gribb-Hartmann) from a clip matrix; boxes tested in the same space. */
function frustumPlanes(m, out) {
  for (let p = 0; p < 6; p++) {
    const r = p >> 1, sgn = (p & 1) ? -1 : 1;
    const a = m[3] + sgn * m[r], b = m[7] + sgn * m[4 + r], c = m[11] + sgn * m[8 + r], d = m[15] + sgn * m[12 + r];
    out[p * 4] = a; out[p * 4 + 1] = b; out[p * 4 + 2] = c; out[p * 4 + 3] = d;
  }
  return out;
}
function boxInFrustum(pl, x0, y0, z0, x1, y1, z1) {
  for (let p = 0; p < 24; p += 4) {
    const a = pl[p], b = pl[p + 1], c = pl[p + 2], d = pl[p + 3];
    if (a * (a > 0 ? x1 : x0) + b * (b > 0 ? y1 : y0) + c * (c > 0 ? z1 : z0) + d < 0) return false;
  }
  return true;
}

/* ---------- storage that never throws ---------- */
const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

function el(id) { return document.getElementById(id); }
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids) if (k !== null && k !== undefined && k !== false) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return e;
}
