/* ===================== Networking: room codes and direct connections =====================
   Two iPads find each other through the free PeerJS service (it only passes along the
   connection setup), then talk over an encrypted WebRTC data channel: directly, or through
   the PeerJS relay when the network doesn't allow a direct path. Names and game messages
   only travel inside that channel. */
const NET_CFG = Object.assign({
  host: '0.peerjs.com', port: 443, secure: true, path: '/', key: 'peerjs',
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' },
    { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }],
}, window.DC_NET || {});
const ROOM_WORDS = ['APPLE', 'BEAR', 'BEE', 'BIRD', 'BOAT', 'CAKE', 'CAT', 'COW', 'CRAB', 'DUCK', 'FISH', 'FOX', 'FROG', 'GOAT', 'KITE', 'LAMB',
  'LION', 'MOON', 'MOUSE', 'OWL', 'PANDA', 'PIG', 'PUPPY', 'SEAL', 'SHIP', 'SNOW', 'STAR', 'SUN', 'TIGER', 'TREE', 'WOLF', 'ZEBRA', 'BEAN',
  'CORN', 'LEAF', 'ROCK', 'WAVE', 'RAIN', 'CLOUD', 'HORSE'];
const PEER_PREFIX = 'declancraft-v1-';
const NET_CHUNK = 15000;
function randomRoomCode() { return ROOM_WORDS[randInt(0, ROOM_WORDS.length - 1)] + randInt(2, 9); }
function normalizeCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
function roomPeerId(code) { return PEER_PREFIX + normalizeCode(code).toLowerCase(); }
function randomId(n) { let s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); }

/* Connection to the PeerJS matchmaking server (WebSocket). Reusing the same token for the same
   id lets a room come back after a network blip: the server then quietly re-attaches (no OPEN). */
class Signal {
  constructor(id, h, token) {
    this.id = id; this.h = h; this.open = false; this.closed = false;
    const url = (NET_CFG.secure ? 'wss://' : 'ws://') + NET_CFG.host + ':' + NET_CFG.port + NET_CFG.path + 'peerjs?key=' + NET_CFG.key +
      '&id=' + encodeURIComponent(id) + '&token=' + (token || randomId(10)) + '&version=1.5.5';
    try { this.ws = new WebSocket(url); } catch (e) { setTimeout(() => this.fail('offline'), 0); return; }
    this.ws.onopen = () => { if (token) this.quietT = setTimeout(() => { if (!this.open && !this.closed) this.onMsg({ type: 'OPEN' }); }, 2500); };
    this.ws.onmessage = e => { let m = null; try { m = JSON.parse(e.data); } catch (x) { return; } if (m) this.onMsg(m); };
    this.ws.onclose = () => this.fail(this.open ? 'lost' : 'offline');
    this.ws.onerror = () => {};
    this.hb = setInterval(() => this.raw({ type: 'HEARTBEAT' }), 5000);
  }
  onMsg(m) {
    switch (m.type) {
      case 'OPEN': if (this.open) break; this.open = true; if (this.h.onOpen) this.h.onOpen(); break;
      case 'ID-TAKEN': this.fail('taken'); break;
      case 'ERROR': case 'INVALID-KEY': this.fail('error'); break;
      case 'OFFER': case 'ANSWER': case 'CANDIDATE': if (this.h.onSignal) this.h.onSignal(m); break;
      case 'EXPIRE': case 'LEAVE': if (this.h.onGone) this.h.onGone(m.src, m.type); break;
    }
  }
  fail(why) {
    if (this.closed) return;
    this.closed = true; this.open = false;
    clearInterval(this.hb); clearTimeout(this.quietT);
    try { this.ws.close(); } catch (e) { /* ignore */ }
    if (this.h.onClose) this.h.onClose(why);
  }
  raw(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  send(type, dst, payload) { this.raw({ type, dst, payload }); }
  close() { if (this.closed) return; this.closed = true; clearInterval(this.hb); clearTimeout(this.quietT); try { this.ws.close(); } catch (e) { /* ignore */ } }
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
        await this.pc.setRemoteDescription(p.sdp);
        this.remoteSet = true; this.flushCandidates();
        const a = await this.pc.createAnswer();
        await this.pc.setLocalDescription(a);
        this.sig.send('ANSWER', this.remote, { sdp: { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp }, connectionId: this.cid, type: 'data' });
      } else if (m.type === 'ANSWER') {
        await this.pc.setRemoteDescription(p.sdp);
        this.remoteSet = true; this.flushCandidates();
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
    dc.onopen = () => { this.ready = this.opened = true; this.lastRx = performance.now(); if (this.h.onOpen) this.h.onOpen(this); };
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
