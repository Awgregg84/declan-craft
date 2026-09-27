/* ===================== Your character: look and name (kept only on this device) ===================== */
const PROFILE_KEY = 'declancraft:v1:profile';
const SKIN_LABELS = { declan: 'Blonde hair', sister: 'Brown hair' };
const PROFILE = (() => {
  let p = {};
  try { p = JSON.parse(store.get(PROFILE_KEY) || '{}') || {}; } catch (e) { p = {}; }
  if (!PLAYER_SKINS.includes(p.skin)) p.skin = 'declan';
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
  el('char-name').value = PROFILE.name;
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
