// Finding each other when the PeerJS service is down or slow: the backup message services (MQTT)
// carry the connection setup instead. Also: clear messages with a code when joining fails, and
// the Check Connection tool on the Play Together screen.
// Needs the dev copies of the services: cd tools && npm install
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import net from 'net';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir = path.dirname(new URL(import.meta.url).pathname), out = path.join(dir, 'shots');
const tools = createRequire(path.join(dir, '..', 'tools', 'package.json'));   // the dev services installed in tools/
const { PeerServer } = tools('peer');
const { Aedes } = tools('aedes');
const { createServer: brokerServer } = tools('aedes-server-factory');
const { WebSocketServer } = tools('ws');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(dir, '..', 'dist', 'declan-craft.html'));
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(0);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
const HOST = { skin: 'declan', name: 'Declan', pid: 'hostpid0001' }, GUEST = { skin: 'sister', name: 'Cora', pid: 'guestpid002' };

// a port nothing listens on (a service that is down)
const deadPort = () => new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
// a local MQTT broker over WebSocket, counting what passes through it
async function broker() {
  const b = await Aedes.createBroker(), srv = brokerServer(b, { ws: true });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const info = { url: 'ws://127.0.0.1:' + srv.address().port + '/mqtt', published: 0, close: () => { srv.close(); b.close(); } };
  b.on('publish', (packet, client) => { if (client && packet.topic.startsWith('dcraft/')) info.published++; });
  return info;
}
// a PeerJS lookalike that takes the connection but never answers (the service being very slow)
async function silentPeer() {
  const wss = new WebSocketServer({ port: 0, host: '127.0.0.1', handleProtocols: p => p.values().next().value || false });
  await new Promise(r => wss.on('listening', r));
  return { port: wss.address().port, close: () => wss.close() };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'] });
  const url = 'http://localhost:' + server.address().port + '/';
  const contexts = [];
  async function open(profile, label, cfg) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
    contexts.push(ctx);
    await ctx.addInitScript(([cfg, prof]) => {
      window.DC_NET = Object.assign({ host: '127.0.0.1', secure: false, path: '/', key: 'peerjs', iceServers: [] }, cfg);
      if (!localStorage.getItem('declancraft:v1:profile')) localStorage.setItem('declancraft:v1:profile', JSON.stringify(prof));
    }, [cfg, profile]);
    const p = await ctx.newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(label + ': ' + e.message));
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT.ok, null, { timeout: 60000 });
    return p;
  }
  const waitFor = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
  const errs = [];
  const done = async (...pages) => { for (const p of pages) { errs.push(...p.errs); await p.context().close(); } };

  /* host a creative world and let a guest in; returns how long joining took */
  async function playTogether(cfg, label) {
    const H = await open(HOST, label + ' host', cfg), G = await open(GUEST, label + ' guest', cfg);
    await H.evaluate(() => { game.dragLook = true; ui.hostMode = true; game.startWorld('valley', 'creative', true); });
    const roomOk = await waitFor(H, () => game.state === 'playing' && MP.roomOpen, 120000);
    const code = await H.evaluate(() => MP.code);
    const t0 = Date.now();
    await G.evaluate(code => { game.dragLook = true; MP.join(code); }, code);
    const asked = await waitFor(H, () => !el('join-prompt').hidden, 40000);
    const prompts = await H.evaluate(() => MP.pending.length);
    await H.evaluate(() => MP.answerPrompt(true));
    const joined = await waitFor(G, () => game.state === 'playing' && MP.welcomed, 120000);
    const secs = Math.round((Date.now() - t0) / 1000);
    let blocks = false;
    if (joined) {
      const B0 = await H.evaluate(() => { const pl = game.player, x = Math.floor(pl.x) + 2, y = Math.floor(pl.y) + 3, z = Math.floor(pl.z); game.world.setBlock(x, y, z, B.GOLD_BLOCK, 0); return { x, y, z }; });
      const a = await waitFor(G, B0 => game.world.getBlock(B0.x, B0.y, B0.z) === B.GOLD_BLOCK, 15000, B0);
      await G.evaluate(B0 => game.world.setBlock(B0.x, B0.y + 1, B0.z, B.DIAMOND_BLOCK, 0), B0);
      const b = await waitFor(H, B0 => game.world.getBlock(B0.x, B0.y + 1, B0.z) === B.DIAMOND_BLOCK, 15000, B0);
      blocks = a && b;
    }
    return { H, G, roomOk, asked, prompts, joined, blocks, secs };
  }

  // 1. PeerJS is down: both backups carry the setup
  {
    const b1 = await broker(), b2 = await broker(), dead = await deadPort();
    const r = await playTogether({ port: dead, mqtt: [b1.url, b2.url] }, 'down');
    check('PeerJS down: the room still opens', r.roomOk);
    check('...the guest gets in through the backup services', r.asked && r.joined, { secs: r.secs, prompts: r.prompts });
    check('...and they play together (blocks both ways)', r.blocks);
    check('...each setup message was shown to the host only once', r.prompts === 1, r.prompts);
    check('...the backups carried it', b1.published > 0 && b2.published > 0, { b1: b1.published, b2: b2.published });
    await r.G.screenshot({ path: path.join(out, 'mp-backup-guest.png') });
    await done(r.H, r.G); b1.close(); b2.close();
  }

  // 2. PeerJS answers the connection but never says hello (very slow); one backup is down too
  {
    const b1 = await broker(), slow = await silentPeer(), dead = await deadPort();
    const r = await playTogether({ port: slow.port, mqtt: [b1.url, 'ws://127.0.0.1:' + dead + '/mqtt'] }, 'slow');
    check('PeerJS very slow and one backup down: the guest still gets in, quickly', r.roomOk && r.joined && r.blocks && r.secs < 30, { secs: r.secs });
    await done(r.H, r.G); b1.close(); slow.close();
  }

  // 3. everything up: setup messages arrive twice (PeerJS and backup) and are used once
  {
    const peerPort = 9100 + Math.floor(Math.random() * 800), peer = PeerServer({ port: peerPort, host: '127.0.0.1', path: '/' }), b1 = await broker();
    await sleep(300);
    const r = await playTogether({ port: peerPort, mqtt: [b1.url] }, 'all');
    check('everything up: the guest gets in, once', r.roomOk && r.joined && r.blocks && r.prompts === 1, { secs: r.secs, prompts: r.prompts });
    await done(r.H, r.G);
    // a wrong code: told plainly, with a code to read out
    const G2 = await open({ skin: 'declan', name: 'Max', pid: 'otherpid003' }, 'wrong', { port: peerPort, mqtt: [b1.url] });
    await G2.evaluate(() => { showScreen('scr-join'); MP.join('ZZZZ9'); });
    const wrong = await waitFor(G2, () => /No game found with the code ZZZZ9.*\(G[12]/.test(el('join-status').textContent), 30000);
    check('a wrong room code: "No game found", with a code', wrong, await G2.evaluate(() => el('join-status').textContent));
    // Check Connection: PeerJS and the backup answer; no relay or path finder in this test network
    await G2.evaluate(() => { showScreen('scr-mp'); el('btn-net-check').click(); });
    const chk = await waitFor(G2, () => !!document.querySelector('#net-check .verdict'), 20000);
    const rows = await G2.evaluate(() => [...el('net-check').children].map(d => d.className + ': ' + d.textContent));
    check('Check Connection lists each service and a verdict', chk && rows.some(t => /^ok: .*PeerJS\): OK/.test(t)) && rows.some(t => /^ok: .*127\.0\.0\.1\): OK/.test(t)) && rows.some(t => /^verdict: Matchmaking works/.test(t)), rows);
    await G2.screenshot({ path: path.join(out, 'mp-netcheck.png') });
    await done(G2); b1.close(); peer.close && peer.close();
  }

  // 4. no services reachable at all: the guest is told to check the internet, and the host sees why the room isn't open
  {
    const d1 = await deadPort(), d2 = await deadPort();
    const cfg = { port: d1, mqtt: ['ws://127.0.0.1:' + d2 + '/mqtt'] };
    const G = await open(GUEST, 'none guest', cfg);
    await G.evaluate(() => { showScreen('scr-join'); MP.join('FROG7'); });
    const told = await waitFor(G, () => { const t = el('join-status').textContent; return /Couldn't reach the connection services.*\(S0: /.test(t) && /P-offline/.test(t) && /1-offline/.test(t); }, 25000);
    check('nothing reachable: "Check that this iPad is online" (S0)', told, await G.evaluate(() => el('join-status').textContent));
    const H = await open(HOST, 'none host', cfg);
    await H.evaluate(() => MP.startHosting());
    const why = await waitFor(H, () => /Opening a room.*\(S0/.test(el('room-help').textContent), 25000);
    check('...and a host sees why the room is not open yet', why, await H.evaluate(() => el('room-help').textContent));
    await H.evaluate(() => MP.reset());
    await done(G, H);
  }

  // 5. services that take the connection but never answer: "not answering" (S3), naming each one
  {
    const sp = await silentPeer(), sb = await silentPeer();
    const G = await open(GUEST, 'silent guest', { port: sp.port, mqtt: ['ws://127.0.0.1:' + sb.port + '/mqtt'] });
    await G.evaluate(() => { showScreen('scr-join'); MP.join('FROG7'); });
    const slow = await waitFor(G, () => { const t = el('join-status').textContent; return /aren't answering.*\(S3: /.test(t) && /P-slow/.test(t) && /1-slow/.test(t); }, 40000);
    check('services that never answer: "not answering" (S3), naming each', slow, await G.evaluate(() => el('join-status').textContent));
    await done(G); sp.close(); sb.close();
  }

  check('no script errors', errs.length === 0, errs.slice(0, 4));
  await browser.close(); server.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
