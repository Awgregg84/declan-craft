/* ===================== Networking: room codes and direct connections =====================
   Two iPads find each other through matchmaking services that only pass along the connection
   setup, then talk over an encrypted WebRTC data channel: directly, or through a relay when the
   network doesn't allow a direct path. Names and game messages only travel inside that channel.
   Matchmaking uses the free PeerJS service and, as a backup (PeerJS is often slow or busy), two
   public message services (MQTT). Setup messages sent through those are encrypted with the room code. */
const NET_CFG = Object.assign({
  host: '0.peerjs.com', port: 443, secure: true, path: '/', key: 'peerjs',
  mqtt: ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'],
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
    { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
  ],
}, window.DC_NET || {});
const ROOM_WORDS = ['APPLE', 'BEAR', 'BEE', 'BIRD', 'BOAT', 'CAKE', 'CAT', 'COW', 'CRAB', 'DUCK', 'FISH', 'FOX', 'FROG', 'GOAT', 'KITE', 'LAMB',
  'LION', 'MOON', 'MOUSE', 'OWL', 'PANDA', 'PIG', 'PUPPY', 'SEAL', 'SHIP', 'SNOW', 'STAR', 'SUN', 'TIGER', 'TREE', 'WOLF', 'ZEBRA', 'BEAN',
  'CORN', 'LEAF', 'ROCK', 'WAVE', 'RAIN', 'CLOUD', 'HORSE'];
const PEER_PREFIX = 'declancraft-v1-';
const NET_CHUNK = 15000;
function randomRoomCode() { return ROOM_WORDS[randInt(0, ROOM_WORDS.length - 1)] + randInt(2, 9); }
function normalizeCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
function roomPeerId(code) { return PEER_PREFIX + normalizeCode(code).toLowerCase(); }
/* Room codes are a word from ROOM_WORDS and a number 2-9, so a mistyped code can usually be put
   right: WORSE8 is HORSE8, HORSEB is HORSE8. Returns { code, near } (near: other likely codes). */
const CODE_LETTER = { 0: 'O', 1: 'I', 2: 'Z', 3: 'E', 4: 'A', 5: 'S', 6: 'G', 7: 'T', 8: 'B', 9: 'G' };
const CODE_DIGIT = { Z: '2', E: '3', A: '4', S: '5', G: '6', T: '7', B: '8', Q: '9' };
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
function fixRoomCode(typed) {
  const code = normalizeCode(typed), last = code.slice(-1), head = code.slice(0, -1).replace(/[0-9]/g, d => CODE_LETTER[d]);
  if (code.length < 3) return { code, near: [] };
  if (/[2-9]/.test(last) && ROOM_WORDS.includes(head)) return { code: head + last, near: [] };
  if (CODE_DIGIT[last] && ROOM_WORDS.includes(head)) return { code: head + CODE_DIGIT[last], near: [] };   // a letter that looks like the number
  if (!/[2-9]/.test(last)) return { code, near: [] };
  const ranked = ROOM_WORDS.map(w => [editDistance(head, w), w]).sort((a, b) => a[0] - b[0]);
  const max = head.length >= 5 ? 2 : 1, near = ranked.filter(r => r[0] <= max);
  if (near.length && (near.length === 1 || near[1][0] > near[0][0])) return { code: near[0][1] + last, near: [] };
  return { code, near: near.slice(0, 3).map(r => r[1] + last) };
}
function randomId(n) { let s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); }
const canSeal = () => !!(window.crypto && crypto.subtle && window.TextEncoder);

/* The ways of finding each other, used together: every setup message goes out on each one that
   is open (and on any that opens a little later), and the other side drops copies it already has.
   h: onOpen() once the first way is open, onSignal(m), onGone(src) when PeerJS can't find the
   other side, onClose(why, fails) once every way has failed. room: the room both sides know
   (the key for the encrypted ways; without it only PeerJS is used). */
class Signal {
  constructor(id, h, token, room, rejoin) {
    this.id = id; this.h = h; this.open = false; this.closed = false;
    this.seen = new Set(); this.sent = []; this.fails = [];
    this.lines = [new PeerLine(this, id, token, rejoin)];
    if (room && canSeal()) { const key = netKey(room); for (const url of NET_CFG.mqtt || []) this.lines.push(new MqttLine(this, url, id, key)); }
  }
  lineOpen(line) {
    if (this.closed) return;
    const now = performance.now();
    for (const s of this.sent) if (now - s.at < 30000) line.send(s.msg);   // what went out before this way was ready
    if (this.open) return;
    this.open = true;
    if (this.h.onOpen) this.h.onOpen();
  }
  lineMsg(line, m) {
    if (this.closed || !m || typeof m.type !== 'string') return;
    const mid = m.payload && m.payload.mid;
    if (mid) {
      if (this.seen.has(mid)) return;
      this.seen.add(mid);
      if (this.seen.size > 600) this.seen.delete(this.seen.values().next().value);
    }
    if (m.type === 'OFFER' || m.type === 'ANSWER' || m.type === 'CANDIDATE') { if (this.h.onSignal) this.h.onSignal(m); }
    else if ((m.type === 'EXPIRE' || m.type === 'LEAVE') && this.h.onGone) this.h.onGone(m.src);
  }
  lineFail(line, why, detail) {
    if (this.closed) return;
    this.fails.push({ way: line.kind, why, detail: detail || '' });
    if (why === 'taken' && !this.open) { this.close(); if (this.h.onClose) this.h.onClose('taken', this.fails); return; }   // that room code is in use: pick another
    if (this.lines.some(l => l.state !== 'failed')) return;
    this.closed = true;
    const has = w => this.fails.some(f => f.why === w);
    if (this.h.onClose) this.h.onClose(has('error') ? 'error' : has('lost') ? 'lost' : has('slow') ? 'slow' : 'offline', this.fails);
  }
  /* is some way still trying (or open)? */
  alive() { return !this.closed && this.lines.some(l => l.state !== 'failed'); }
  backupAlive() { return !this.closed && this.lines.some(l => l.kind !== 'peerjs' && l.state !== 'failed'); }
  send(type, dst, payload) {
    if (this.closed) return;
    const msg = { type, dst, payload: Object.assign({ mid: randomId(12) }, payload) };
    this.sent.push({ msg, at: performance.now() });
    if (this.sent.length > 80) this.sent.shift();
    for (const l of this.lines) if (l.state === 'open') l.send(msg);
  }
  close() { if (this.closed) return; this.closed = true; for (const l of this.lines) l.close(); }
}

/* The PeerJS service (WebSocket). Reusing the same token for the same id lets a room come back
   after a network blip: the server may then quietly re-attach (no OPEN), so when rejoining,
   a socket that stays open counts as open. */
class PeerLine {
  constructor(sig, id, token, rejoin) {
    this.sig = sig; this.kind = 'peerjs'; this.state = 'connecting';
    const url = (NET_CFG.secure ? 'wss://' : 'ws://') + NET_CFG.host + ':' + NET_CFG.port + NET_CFG.path + 'peerjs?key=' + NET_CFG.key +
      '&id=' + encodeURIComponent(id) + '&token=' + (token || randomId(10)) + '&version=1.5.5';
    try { this.ws = new WebSocket(url); } catch (e) { setTimeout(() => this.fail('offline'), 0); return; }
    this.ws.onopen = () => {
      this.wsOpened = true;
      if (rejoin) this.quietT = setTimeout(() => { if (this.state === 'connecting') this.onMsg({ type: 'OPEN' }); }, 2500);
    };
    this.ws.onmessage = e => { let m = null; try { m = JSON.parse(e.data); } catch (x) { return; } if (m) this.onMsg(m); };
    this.ws.onclose = () => this.fail(this.state === 'open' ? 'lost' : this.wsOpened ? 'error' : 'offline', this.state === 'open' ? '' : 'closed');
    this.ws.onerror = () => {};
    this.hb = setInterval(() => this.raw({ type: 'HEARTBEAT' }), 5000);
    this.slowT = setTimeout(() => { if (this.state === 'connecting') this.fail(this.wsOpened ? 'slow' : 'offline'); }, 20000);   // it sometimes takes minutes
  }
  onMsg(m) {
    switch (m.type) {
      case 'OPEN': if (this.state !== 'connecting') break; this.state = 'open'; clearTimeout(this.slowT); this.sig.lineOpen(this); break;
      case 'ID-TAKEN': this.fail('taken'); break;
      case 'ERROR': case 'INVALID-KEY': this.fail('error', m.payload && m.payload.msg); break;
      default: if (this.state !== 'failed') this.sig.lineMsg(this, m);
    }
  }
  fail(why, detail) {
    if (this.state === 'failed') return;
    this.state = 'failed';
    this.stop();
    this.sig.lineFail(this, why, detail);
  }
  stop() { clearInterval(this.hb); clearTimeout(this.quietT); clearTimeout(this.slowT); try { if (this.ws) this.ws.close(); } catch (e) { /* ignore */ } }
  raw(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  send(m) { this.raw(m); }
  close() { if (this.state === 'failed') return; this.state = 'failed'; this.stop(); }
}

/* A public message service (MQTT over WebSocket). Each side listens on its own topic; setup
   messages are sealed with a key made from the room, so the service can't read or fake them. */
const MQTT_ROOT = 'dcraft/';
function netKey(room) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode('declan-craft room ' + room))
    .then(h => crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']));
}
async function sealMsg(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key, new TextEncoder().encode(JSON.stringify(obj))));
  return bytesCat([iv, ct]);
}
async function openMsg(key, b) {
  try { return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, await key, b.subarray(12)))); }
  catch (e) { return null; }
}
function bytesCat(list) {
  let n = 0; for (const b of list) n += b.length;
  const out = new Uint8Array(n); let o = 0;
  for (const b of list) { out.set(b, o); o += b.length; }
  return out;
}
const mqttStr = s => { const b = new TextEncoder().encode(s); return bytesCat([new Uint8Array([b.length >> 8, b.length & 255]), b]); };
function mqttPacket(first, body) {
  const len = []; let n = body.length;
  do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; len.push(d); } while (n > 0);
  return bytesCat([new Uint8Array([first].concat(len)), body]);
}
class MqttLine {
  constructor(sig, url, id, key) {
    this.sig = sig; this.kind = url.replace(/^wss?:\/\//, '').split(/[:/]/)[0]; this.state = 'connecting';
    this.id = id; this.key = key; this.buf = new Uint8Array(0); this.out = Promise.resolve(); this.inq = Promise.resolve();
    try { this.ws = new WebSocket(url, 'mqtt'); } catch (e) { setTimeout(() => this.fail('offline'), 0); return; }
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => {   // CONNECT: MQTT 3.1.1, clean session, 30 s keep-alive
      this.wsOpened = true;
      this.raw(mqttPacket(0x10, bytesCat([mqttStr('MQTT'), new Uint8Array([4, 2, 0, 30]), mqttStr('dc' + randomId(18))])));
    };
    this.ws.onmessage = e => { if (e.data instanceof ArrayBuffer) this.feed(new Uint8Array(e.data)); };
    this.ws.onclose = () => this.fail(this.state === 'open' ? 'lost' : this.wsOpened ? 'error' : 'offline', this.state === 'open' ? '' : this.why);
    this.ws.onerror = () => {};
    this.ping = setInterval(() => this.raw(new Uint8Array([0xc0, 0])), 20000);
    this.slowT = setTimeout(() => { if (this.state === 'connecting') this.fail(this.wsOpened ? 'slow' : 'offline'); }, 15000);
  }
  feed(bytes) {
    this.buf = this.buf.length ? bytesCat([this.buf, bytes]) : bytes;
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return;
      let len = 0, mul = 1, i = 1;
      for (;;) {
        if (i >= b.length) return;
        const d = b[i++];
        len += (d & 127) * mul; mul *= 128;
        if (!(d & 128)) break;
        if (i > 4) { this.fail('error', 'bad packet'); return; }
      }
      if (b.length < i + len) return;
      this.packet(b[0], b.subarray(i, i + len));
      this.buf = b.subarray(i + len);
      if (this.state === 'failed') return;
    }
  }
  packet(first, body) {
    const type = first >> 4;
    if (type === 2) {   // CONNACK
      if (body[1] !== 0) { this.why = 'refused (' + body[1] + ')'; this.fail('error', this.why); return; }
      this.raw(mqttPacket(0x82, bytesCat([new Uint8Array([0, 1]), mqttStr(MQTT_ROOT + this.id), new Uint8Array([0])])));   // SUBSCRIBE to our own topic
    } else if (type === 9) {   // SUBACK
      if (body[body.length - 1] === 0x80) { this.fail('error', 'subscribe refused'); return; }
      if (this.state !== 'connecting') return;
      this.state = 'open'; clearTimeout(this.slowT);
      this.sig.lineOpen(this);
    } else if (type === 3 && this.state === 'open') {   // PUBLISH
      const tl = (body[0] << 8) | body[1], qos = (first >> 1) & 3, data = body.slice(2 + tl + (qos ? 2 : 0));
      this.inq = this.inq.then(() => openMsg(this.key, data)).then(m => { if (m && this.state === 'open') this.sig.lineMsg(this, m); });
    }
  }
  send(m) {
    const msg = { type: m.type, src: this.id, dst: m.dst, payload: m.payload };
    this.out = this.out.then(() => sealMsg(this.key, msg)).then(b => this.raw(mqttPacket(0x30, bytesCat([mqttStr(MQTT_ROOT + m.dst), b])))).catch(() => {});
  }
  raw(b) { if (this.ws && this.ws.readyState === 1) this.ws.send(b); }
  fail(why, detail) {
    if (this.state === 'failed') return;
    this.state = 'failed';
    this.stop();
    this.sig.lineFail(this, why, detail);
  }
  stop() { clearInterval(this.ping); clearTimeout(this.slowT); try { if (this.ws) { if (this.ws.readyState === 1) this.ws.send(new Uint8Array([0xe0, 0])); this.ws.close(); } } catch (e) { /* ignore */ } }
  close() { if (this.state === 'failed') return; this.state = 'failed'; this.stop(); }
}

/* Check Connection (Play Together screen): which matchmaking services answer from here (each
   one carries a message back to this iPad), and whether this network lets direct connections
   and the relay through. About ten seconds; calls done({ ways, ice, webrtc }). */
function netCheck(done) {
  const id = PEER_PREFIX + 'chk' + randomId(10), t0 = performance.now(), lines = [];
  const probe = {
    lineOpen(line) { line.send({ type: 'CANDIDATE', dst: id, payload: { mid: randomId(8), echo: 1 } }); },
    lineMsg(line, m) { if (m.payload && m.payload.echo && line.echoMs === undefined) line.echoMs = performance.now() - t0; },
    lineFail(line, why) { line.why = why; },
  };
  lines.push(new PeerLine(probe, id));
  if (canSeal()) { const key = netKey('check ' + id); for (const url of NET_CFG.mqtt || []) lines.push(new MqttLine(probe, url, id, key)); }
  const ice = { host: 0, srflx: 0, relay: 0 };
  let pc = null;
  try {
    pc = new RTCPeerConnection({ iceServers: NET_CFG.iceServers });
    pc.createDataChannel('check');
    pc.onicecandidate = e => { const t = e.candidate && (/ typ (\w+)/.exec(e.candidate.candidate) || [])[1]; if (t && t in ice) ice[t]++; };
    pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => {});
  } catch (e) { pc = null; }
  setTimeout(() => {
    for (const l of lines) l.close();
    try { if (pc) pc.close(); } catch (e) { /* ignore */ }
    const say = { offline: "can't reach it", slow: 'no answer', error: 'had a problem', lost: 'dropped the connection', taken: 'had a problem' };
    done({
      ways: lines.map(l => ({ name: l.kind === 'peerjs' ? 'PeerJS' : l.kind.replace(/^broker\./, ''), ok: l.echoMs !== undefined,
        text: l.echoMs !== undefined ? 'OK (' + (l.echoMs / 1000).toFixed(1) + ' s)' : say[l.why] || 'no answer' })),
      ice, webrtc: !!pc,
    });
  }, 10000);
}

/* One direct connection to another player: an RTCPeerConnection with one ordered, reliable channel. */
class Link {
  constructor(sig, remote, cid, initiator, h) {
    this.sig = sig; this.remote = remote; this.cid = cid; this.h = h;
    this.ready = false; this.closed = false; this.remoteSet = false;
    this.pending = []; this.inbox = new Map(); this.outQ = []; this.seq = 0;
    this.lastRx = performance.now(); this.lastTx = 0;
    let pc;
    try { pc = this.pc = new RTCPeerConnection({ iceServers: NET_CFG.iceServers }); }
    catch (e) { setTimeout(() => this.close('nowebrtc'), 0); return; }
    this.born = performance.now();
    this.ka = setInterval(() => this.keepAlive(), 1000);
    pc.onicecandidate = e => {
      if (!e.candidate || this.closed || !this.sig) return;
      this.sig.send('CANDIDATE', remote, { candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate, connectionId: cid, type: 'data' });
    };
    pc.onconnectionstatechange = () => { const st = pc.connectionState; if (st === 'failed' || st === 'closed') this.close('lost'); };
    pc.oniceconnectionstatechange = () => { if (pc.iceConnectionState === 'failed') this.close('lost'); };
    if (initiator) {
      this.setChannel(pc.createDataChannel('dc', { ordered: true }));
      pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => {
        this.sig.send('OFFER', remote, { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }, connectionId: cid, type: 'data' });
      }).catch(() => this.close('error'));
    } else pc.ondatachannel = e => this.setChannel(e.channel);
  }
  async onSignal(m) {
    const p = m.payload || {};
    if (this.closed) return;
    try {
      if (m.type === 'OFFER') {
        if (this.remoteSet || this.gotOffer) return;   // the same offer again, through another way
        this.gotOffer = true;
        await this.pc.setRemoteDescription(p.sdp);
        this.remoteSet = true; this.flushCandidates();
        const a = await this.pc.createAnswer();
        await this.pc.setLocalDescription(a);
        this.sig.send('ANSWER', this.remote, { sdp: { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp }, connectionId: this.cid, type: 'data' });
      } else if (m.type === 'ANSWER') {
        if (this.remoteSet || this.gotAnswer) return;
        this.gotAnswer = true;
        await this.pc.setRemoteDescription(p.sdp);
        this.remoteSet = true; this.flushCandidates();
        if (this.h.onRemote) this.h.onRemote(this);   // the other side answered: now the direct connection
      } else if (m.type === 'CANDIDATE' && p.candidate) {
        if (this.remoteSet) await this.pc.addIceCandidate(p.candidate);
        else this.pending.push(p.candidate);
      }
    } catch (e) { if (m.type !== 'CANDIDATE') this.close('error'); }
  }
  /* A small "still here" message when nothing else was sent lately (for example while the host
     decides whether to let someone in), and a timeout when the other side goes quiet. */
  keepAlive() {
    if (this.closed) return;
    const now = performance.now();
    if (!this.ready) { if (now - this.born > 30000) this.close('timeout'); return; }
    if (now - this.lastTx > 2500) this.send({ t: 'ping' });
    if (now - this.lastRx > 20000) this.close('timeout');
  }
  flushCandidates() { const list = this.pending; this.pending = []; for (const c of list) this.pc.addIceCandidate(c).catch(() => {}); }
  setChannel(dc) {
    this.dc = dc;
    dc.bufferedAmountLowThreshold = 262144;
    dc.onopen = () => { if (this.ready || this.closed) return; this.ready = this.opened = true; this.lastRx = performance.now(); if (this.h.onOpen) this.h.onOpen(this); };
    if (dc.readyState === 'open') setTimeout(() => dc.onopen(), 0);   // already open when handed over (some Safari versions)
    dc.onclose = () => this.close('lost');
    dc.onmessage = e => { this.lastRx = performance.now(); if (typeof e.data === 'string') this.recv(e.data); };
    dc.onbufferedamountlow = () => this.pump();
  }
  send(obj) {
    if (this.closed || !this.ready || this.dc.readyState !== 'open') return false;
    const s = JSON.stringify(obj);
    if (s.length <= NET_CHUNK) this.outQ.push(s);
    else {
      const id = ++this.seq, n = Math.ceil(s.length / NET_CHUNK);
      for (let i = 0; i < n; i++) this.outQ.push('#' + id + ':' + i + ':' + n + ':' + s.slice(i * NET_CHUNK, (i + 1) * NET_CHUNK));
    }
    this.pump();
    this.lastTx = performance.now();
    return true;
  }
  pump() {
    try {
      while (this.outQ.length && this.dc && this.dc.readyState === 'open' && this.dc.bufferedAmount < 1048576) this.dc.send(this.outQ.shift());
    } catch (e) { this.close('lost'); }
  }
  recv(s) {
    if (s.charCodeAt(0) === 35) {   // '#' = one piece of a big message
      const a = s.indexOf(':'), b = s.indexOf(':', a + 1), c = s.indexOf(':', b + 1);
      const id = s.slice(1, a), i = +s.slice(a + 1, b), n = +s.slice(b + 1, c);
      if (!(Number.isInteger(n) && n > 1 && n <= 1000 && Number.isInteger(i) && i >= 0 && i < n)) return;   // at most about 15 MB
      let box = this.inbox.get(id);
      if (!box) { if (this.inbox.size >= 3) return; box = { parts: new Array(n), got: 0 }; this.inbox.set(id, box); }
      if (box.parts.length !== n) return;
      if (box.parts[i] === undefined) { box.parts[i] = s.slice(c + 1); box.got++; }
      if (box.got < n) return;
      this.inbox.delete(id);
      s = box.parts.join('');
    }
    let m = null;
    try { m = JSON.parse(s); } catch (e) { return; }
    if (m && typeof m === 'object' && m.t !== 'ping' && this.h.onMessage) this.h.onMessage(this, m);
  }
  close(why) {
    if (this.closed) return;
    this.closed = true; this.ready = false;
    clearInterval(this.ka);
    try { if (this.dc) this.dc.close(); } catch (e) { /* ignore */ }
    try { if (this.pc) this.pc.close(); } catch (e) { /* ignore */ }
    if (this.h.onClose) this.h.onClose(this, why || 'closed');
  }
}
