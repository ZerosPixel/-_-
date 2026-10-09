const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// Minimal RFC 6455 WebSocket endpoint using Node built-ins only. This avoids
// native modules or paid services; Render terminates HTTPS and forwards upgrades.
class WebSocketConnection extends EventEmitter {
  constructor(socket, head = Buffer.alloc(0)) {
    super();
    this.socket = socket;
    this.readyState = OPEN;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.fragmentBytes = 0;
    this.maxPayload = 1024 * 1024;
    this._closeSent = false;
    socket.on('data', chunk => { this.buffer = Buffer.concat([this.buffer, chunk]); this._consumeFrames(); });
    socket.on('error', error => { this.emit('error', error); this._finishClose(); });
    socket.on('close', () => this._finishClose());
    socket.on('end', () => this._finishClose());
    if (head.length) queueMicrotask(() => { this.buffer = Buffer.concat([this.buffer, head]); this._consumeFrames(); });
  }
  send(value) {
    if (this.readyState !== OPEN) throw new Error('WebSocket is not open');
    this._writeFrame(0x1, Buffer.from(String(value), 'utf8'));
  }
  ping(payload = Buffer.alloc(0)) {
    if (this.readyState !== OPEN) return;
    this._writeFrame(0x9, Buffer.from(payload));
  }
  close(code = 1000, reason = '') {
    if (this.readyState !== OPEN) return;
    const reasonBytes = Buffer.from(String(reason).slice(0, 120), 'utf8');
    const payload = Buffer.alloc(2 + reasonBytes.length);
    payload.writeUInt16BE(code, 0); reasonBytes.copy(payload, 2);
    this.readyState = CLOSING;
    this._closeSent = true;
    try { this._writeFrame(0x8, payload); } catch {}
    this.socket.end();
    setTimeout(() => { if (this.readyState !== CLOSED) this.socket.destroy(); }, 1500).unref?.();
  }
  terminate() { this.socket.destroy(); this._finishClose(); }
  _writeFrame(opcode, payload) {
    if (this.readyState === CLOSED) return;
    let header;
    if (payload.length < 126) {
      header = Buffer.from([0x80 | opcode, payload.length]);
    } else if (payload.length <= 0xffff) {
      header = Buffer.alloc(4); header[0] = 0x80 | opcode; header[1] = 126; header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10); header[0] = 0x80 | opcode; header[1] = 127; header.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    this.socket.write(Buffer.concat([header, payload]));
  }
  _consumeFrames() {
    while (this.readyState !== CLOSED && this.buffer.length >= 2) {
      const first = this.buffer[0], second = this.buffer[1];
      const fin = !!(first & 0x80), opcode = first & 0x0f, masked = !!(second & 0x80);
      let length = second & 0x7f, offset = 2;
      if (!masked) return this.close(1002, 'Client frames must be masked');
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2); offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        const big = this.buffer.readBigUInt64BE(2);
        if (big > BigInt(this.maxPayload)) return this.close(1009, 'Message too large');
        length = Number(big); offset = 10;
      }
      if (length > this.maxPayload) return this.close(1009, 'Message too large');
      if (this.buffer.length < offset + 4 + length) return;
      const mask = this.buffer.subarray(offset, offset + 4); offset += 4;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
      this.buffer = this.buffer.subarray(offset + length);
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];

      if (opcode === 0x8) {
        if (!this._closeSent && this.readyState === OPEN) {
          this._closeSent = true; this.readyState = CLOSING;
          try { this._writeFrame(0x8, payload); } catch {}
        }
        this.socket.end(); this._finishClose(); return;
      }
      if (opcode === 0x9) { this._writeFrame(0xA, payload); continue; }
      if (opcode === 0xA) { this.emit('pong', payload); continue; }
      if (opcode === 0x2) { this.close(1003, 'Binary messages are not supported'); return; }
      if (opcode === 0x1) {
        if (this.fragments.length) return this.close(1002, 'Unexpected data frame');
        if (!fin) { this.fragments = [payload]; this.fragmentBytes = payload.length; continue; }
        this.emit('message', payload);
        continue;
      }
      if (opcode === 0x0) {
        if (!this.fragments.length) return this.close(1002, 'Unexpected continuation frame');
        this.fragments.push(payload); this.fragmentBytes += payload.length;
        if (this.fragmentBytes > this.maxPayload) return this.close(1009, 'Message too large');
        if (fin) {
          const complete = Buffer.concat(this.fragments, this.fragmentBytes);
          this.fragments = []; this.fragmentBytes = 0;
          this.emit('message', complete);
        }
        continue;
      }
      return this.close(1002, 'Unsupported WebSocket frame');
    }
  }
  _finishClose() {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    this.emit('close');
  }
}
const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 10000;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp'
};
const hostsByRoom = new Map();
const clientsById = new Map();
const connections = new Map();
const socketMeta = new WeakMap();
const activeSockets = new Set();
const HOST_STALE_AFTER_MS = 65000;

function send(ws, object) {
  if (ws && ws.readyState === OPEN) {
    try { ws.send(JSON.stringify(object)); return true; } catch { return false; }
  }
  return false;
}
function closeConnection(connId, sourceSocket = null) {
  const rec = connections.get(connId);
  if (!rec) return;
  connections.delete(connId);
  const other = sourceSocket === rec.hostWs ? rec.clientWs : rec.hostWs;
  if (other !== sourceSocket) send(other, { type: 'connection-close', connId });
}
function cleanupSocket(ws) {
  const meta = socketMeta.get(ws);
  if (!meta) return;
  socketMeta.delete(ws);
  if (meta.role === 'host') {
    const current = hostsByRoom.get(meta.roomCode);
    if (current?.ws === ws) hostsByRoom.delete(meta.roomCode);
    for (const [connId, rec] of connections) if (rec.hostWs === ws) closeConnection(connId, ws);
  } else if (meta.role === 'client') {
    if (clientsById.get(meta.peerId) === ws) clientsById.delete(meta.peerId);
    for (const [connId, rec] of connections) if (rec.clientWs === ws) closeConnection(connId, ws);
  }
}
function handleMessage(ws, message) {
  if (!message || typeof message !== 'object') return;
  const meta = socketMeta.get(ws);
  if (message.type === 'heartbeat') {
    const now = Date.now();
    ws.isAlive = true;
    if (meta?.role === 'host') {
      const room = hostsByRoom.get(meta.roomCode);
      if (room?.ws === ws) room.lastSeenAt = now;
    } else if (meta?.role === 'client' && clientsById.get(meta.peerId) === ws) {
      // Helps health diagnostics and stale-client cleanup.
      ws.lastSeenAt = now;
    }
    send(ws, { type: 'heartbeat-ack', at: message.at || now });
    return;
  }
  if (message.type === 'register-host') {
    const roomCode = String(message.roomCode || '').trim().toUpperCase();
    const peerId = String(message.peerId || '');
    if (!/^[A-Z0-9]{4,16}$/.test(roomCode) || peerId !== `bunker-${roomCode}`) {
      send(ws, { type: 'server-error', errorType: 'invalid-id', message: 'Invalid room code.' }); return;
    }
    const hostToken = String(message.hostToken || '');
    if (hostToken && !/^host-[a-z0-9-]{8,100}$/i.test(hostToken)) {
      send(ws, { type: 'server-error', errorType: 'invalid-id', message: 'Invalid host session token.' }); return;
    }
    const existing = hostsByRoom.get(roomCode);
    const hasDifferentLiveSocket = existing?.ws?.readyState === OPEN && existing.ws !== ws;
    const sameHostSession = !!hostToken && !!existing?.hostToken && hostToken === existing.hostToken;
    const staleLegacySession = hasDifferentLiveSocket && !existing?.hostToken &&
      Date.now() - Number(existing.lastSeenAt || 0) > HOST_STALE_AFTER_MS;
    if (hasDifferentLiveSocket && !sameHostSession && !staleLegacySession) {
      send(ws, { type: 'server-error', errorType: 'unavailable-id', message: 'Room code is already in use.' }); return;
    }

    // Swap the room mapping BEFORE closing the old socket. Its eventual close
    // handler checks socket identity and therefore cannot delete the new host.
    hostsByRoom.set(roomCode, { ws, peerId, hostToken: hostToken || null, lastSeenAt: Date.now() });
    socketMeta.set(ws, { role: 'host', roomCode, peerId });
    if (hasDifferentLiveSocket) {
      try { existing.ws.close(4001, 'host session reconnected'); } catch {}
    }
    send(ws, { type: 'registered', peerId });
    return;
  }
  if (message.type === 'register-client') {
    const peerId = String(message.peerId || '');
    if (!/^client-[a-z0-9-]{8,100}$/i.test(peerId)) {
      send(ws, { type: 'server-error', errorType: 'invalid-id', message: 'Invalid client ID.' }); return;
    }
    const existing = clientsById.get(peerId);
    if (existing && existing !== ws && existing.readyState === OPEN) {
      send(ws, { type: 'server-error', errorType: 'unavailable-id', message: 'Client ID is already in use.' }); return;
    }
    clientsById.set(peerId, ws);
    socketMeta.set(ws, { role: 'client', peerId });
    send(ws, { type: 'registered', peerId });
    return;
  }
  if (!meta) {
    send(ws, { type: 'server-error', errorType: 'not-registered', message: 'Register the client first.' }); return;
  }
  if (message.type === 'connect') {
    if (meta.role !== 'client') return;
    const targetId = String(message.targetId || '');
    const roomCode = targetId.startsWith('bunker-') ? targetId.slice('bunker-'.length).toUpperCase() : '';
    const host = hostsByRoom.get(roomCode);
    if (!host || host.peerId !== targetId || host.ws.readyState !== OPEN) {
      send(ws, { type: 'connect-error', errorType: 'peer-unavailable', message: 'Host room is not active yet.' }); return;
    }
    const connId = String(message.connId || '');
    if (!/^conn-[a-z0-9-]{8,120}$/i.test(connId) || connections.has(connId)) {
      send(ws, { type: 'connect-error', errorType: 'server-error', message: 'Invalid connection ID.' }); return;
    }
    const rec = { roomCode, hostWs: host.ws, clientWs: ws, hostPeerId: host.peerId, clientPeerId: meta.peerId };
    connections.set(connId, rec);
    send(host.ws, { type: 'incoming', connId, peerId: meta.peerId });
    send(ws, { type: 'connection-open', connId, peerId: targetId });
    return;
  }
  if (message.type === 'data') {
    const connId = String(message.connId || '');
    const rec = connections.get(connId);
    if (!rec || (ws !== rec.hostWs && ws !== rec.clientWs)) return;
    const target = ws === rec.hostWs ? rec.clientWs : rec.hostWs;
    send(target, { type: 'data', connId, data: message.data });
    return;
  }
  if (message.type === 'close-connection') {
    const connId = String(message.connId || '');
    const rec = connections.get(connId);
    if (rec && (ws === rec.hostWs || ws === rec.clientWs)) closeConnection(connId, ws);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, service: 'bunker-websocket-relay', activeRooms: hostsByRoom.size, connectedClients: clientsById.size, activeSockets: activeSockets.size }));
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end('Bad path'); return; }
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(ROOT + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Not found'); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
  fs.createReadStream(filePath).pipe(res);
});

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  const key = req.headers['sec-websocket-key'];
  const validUpgrade = String(req.headers.upgrade || '').toLowerCase() === 'websocket';
  if (pathname !== '/ws' || !validUpgrade || !key) {
    socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); socket.destroy(); return;
  }
  const accept = crypto.createHash('sha1').update(String(key) + WS_GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const ws = new WebSocketConnection(socket, head);
  ws.isAlive = true;
  ws.lastSeenAt = Date.now();
  activeSockets.add(ws);
  ws.on('pong', () => { ws.isAlive = true; ws.lastSeenAt = Date.now(); });
  ws.on('message', raw => {
    let message;
    try { message = JSON.parse(raw.toString('utf8')); } catch { send(ws, { type: 'server-error', errorType: 'bad-message', message: 'Invalid JSON message.' }); return; }
    try { handleMessage(ws, message); }
    catch (error) { console.error('Message handling error:', error); send(ws, { type: 'server-error', errorType: 'server-error', message: 'Server could not process the message.' }); }
  });
  const finishSocket = () => { activeSockets.delete(ws); cleanupSocket(ws); };
  ws.on('close', finishSocket);
  ws.on('error', finishSocket);
});

// Detect half-open sockets (for example, a phone suspending its browser tab).
// This also prevents a dead host connection from keeping a room registered forever.
const socketHeartbeat = setInterval(() => {
  for (const ws of activeSockets) {
    if (ws.readyState !== OPEN) { activeSockets.delete(ws); continue; }
    if (ws.isAlive === false) { ws.terminate(); activeSockets.delete(ws); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch { ws.terminate(); activeSockets.delete(ws); }
  }
}, 25000);
socketHeartbeat.unref?.();

server.listen(PORT, '0.0.0.0', () => console.log(`BUNKER server listening on ${PORT}`));

// Test helpers are not exposed over HTTP; exported only when required from Node tests.
module.exports = { server, hostsByRoom, clientsById, connections, activeSockets };
