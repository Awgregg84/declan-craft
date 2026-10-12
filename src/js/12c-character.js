/* ===================== Your character: look and name (kept only on this device) ===================== */
const PROFILE_KEY = 'declancraft:v1:profile';
const SKIN_LABELS = { declan: 'Blonde hair', sister: 'Brown hair' };
const PROFILE = (() => {
  let p = {};
  try { p = JSON.parse(store.get(PROFILE_KEY) || '{}') || {}; } catch (e) { p = {}; }
  p.chars = (Array.isArray(p.chars) ? p.chars : []).slice(0, MAX_CHARS).map(c => c && typeof c === 'object' ? { name: cleanName(c.name), look: cleanLook(c.look) } : null).filter(c => c && c.look);
  if (!p.seeded) { p.chars = p.chars.concat(FAMILY.map(f => ({ name: f.name, look: f.look.slice() }))).slice(0, MAX_CHARS); p.seeded = 1; store.set(PROFILE_KEY, JSON.stringify(p)); }   // the family, once
  p.cur = Number.isInteger(p.cur) && p.chars[p.cur] ? p.cur : 0;
  if (!PLAYER_SKINS.includes(p.skin) && !(p.skin === 'custom_me' && p.chars[p.cur])) p.skin = 'declan';   // (custom_me: one you made)
  if (typeof p.name !== 'string') p.name = '';
  if (typeof p.pid !== 'string' || p.pid.length < 6) { p.pid = Math.random().toString(36).slice(2, 12); store.set(PROFILE_KEY, JSON.stringify(p)); }
  return p;
})();
function saveProfile() { store.set(PROFILE_KEY, JSON.stringify(PROFILE)); }
function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
function playerName() { return cleanName(PROFILE.name) || (PROFILE.skin === 'declan' ? 'Declan' : 'Player'); }

function buildCharScreen() {
  const wrap = el('char-pick');
  wrap.textContent = '';
  for (const skin of PLAYER_SKINS) {
    const b = h('button', { type: 'button', class: 'btn char-card', 'aria-pressed': PROFILE.skin === skin ? 'true' : 'false' },
      h('img', { src: faceIcon(skin, 96), alt: '' }), h('span', { text: SKIN_LABELS[skin] }));
    b.addEventListener('click', () => { PROFILE.skin = skin; saveProfile(); sfx('click'); buildCharScreen(); updateCharButtons(); });
    wrap.appendChild(b);
  }
  // the characters you made: tap one to play as it, or Change to make it look different
  PROFILE.chars.forEach((c, i) => {
    const on = PROFILE.skin === 'custom_me' && PROFILE.cur === i, nm = c.name || 'No name';
    const b = h('button', { type: 'button', class: 'btn char-card', 'aria-pressed': on ? 'true' : 'false' }, h('img', { src: lookFace(c.look, 96), alt: '' }), h('span', { text: nm }));
    b.addEventListener('click', () => { sfx('click'); pickChar(i); });
    const ed = h('button', { type: 'button', class: 'btn char-edit', text: 'Change', 'aria-label': 'Change how ' + nm + ' looks' });
    ed.addEventListener('click', () => { sfx('click'); openMaker(i); });
    wrap.appendChild(h('div', { class: 'char-slot' }, b, ed));
  });
  if (PROFILE.chars.length < MAX_CHARS) {
    const nb = h('button', { type: 'button', class: 'btn char-card char-new' }, h('span', { class: 'char-plus', 'aria-hidden': 'true', text: '+' }), h('span', { text: 'Make a character' }));
    nb.addEventListener('click', () => { sfx('click'); openMaker(-1); });
    wrap.appendChild(nb);
  }
  el('char-name').value = PROFILE.name;
}
/* play as a character you made (it brings its name with it) */
function pickChar(i) {
  const c = PROFILE.chars[i];
  if (!c) return;
  PROFILE.skin = 'custom_me'; PROFILE.cur = i;
  if (c.name) PROFILE.name = c.name;
  saveProfile(); applyMyLook();
  buildCharScreen(); updateCharButtons();
}
function updateCharButtons() {
  for (const id of ['btn-char', 'btn-mp-char']) {
    const b = el(id);
    if (!b) continue;
    b.textContent = '';
    b.append(h('img', { src: faceIcon(PROFILE.skin, 48), alt: '' }), h('span', { text: 'Playing as ' + playerName() }), h('small', { text: 'Change' }));
  }
}
/* Opens the character screen; `then` runs after Done (used when a name is needed first). */
function showCharScreen(back, note, then) {
  ui.charBack = back || 'scr-title';
  ui.charThen = then || null;
  buildCharScreen();
  el('char-note').textContent = note || 'Your name stays on this device. Other players see it when you play together.';
  showScreen('scr-char');
}
function setupCharScreen() {
  const inp = el('char-name');
  inp.addEventListener('input', () => { PROFILE.name = cleanName(inp.value); saveProfile(); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el('btn-char-done').click(); } e.stopPropagation(); });
  el('btn-char-done').addEventListener('click', () => {
    initAudio(); sfx('click');
    PROFILE.name = cleanName(inp.value); saveProfile();
    updateCharButtons();
    const then = ui.charThen;
    ui.charThen = null;
    if (then && cleanName(PROFILE.name)) then();
    else showScreen(ui.charBack);
  });
  updateCharButtons();
}
