'use strict';
// End-to-end transport smoke test using Node's built-in WebSocket client.
const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');
const PORT = 18765;
const BASE = `http://127.0.0.1:${PORT}`;
const WS_URL = `ws://127.0.0.1:${PORT}/ws`;

function waitFor(ws, predicate, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.removeEventListener('message', onMessage); reject(new Error('WebSocket message timeout')); }, timeout);
    const onMessage = event => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (!predicate(data)) return;
      clearTimeout(timer); ws.removeEventListener('message', onMessage); resolve(data);
    };
    ws.addEventListener('message', onMessage);
  });
}
function connect(url = WS_URL) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => reject(new Error('WebSocket open timeout')), 3000);
    ws.addEventListener('open', () => { clearTimeout(timer); resolve(ws); }, { once: true });
    ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('WebSocket connection failed')); }, { once: true });
  });
}
async function waitHealth() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Server did not start');
}

(async () => {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore'
  });
  let host, client;
  try {
    await waitHealth();
    host = await connect();
    const hostRegistered = waitFor(host, m => m.type === 'registered');
    host.send(JSON.stringify({ type: 'register-host', peerId: 'bunker-SMOKE123', roomCode: 'SMOKE123' }));
    if ((await hostRegistered).peerId !== 'bunker-SMOKE123') throw new Error('Host registration failed');

    client = await connect();
    const clientRegistered = waitFor(client, m => m.type === 'registered');
    client.send(JSON.stringify({ type: 'register-client', peerId: 'client-smoketest123456' }));
    if ((await clientRegistered).peerId !== 'client-smoketest123456') throw new Error('Client registration failed');

    const connId = 'conn-smoketest123456';
    const incoming = waitFor(host, m => m.type === 'incoming' && m.connId === connId);
    const opened = waitFor(client, m => m.type === 'connection-open' && m.connId === connId);
    client.send(JSON.stringify({ type: 'connect', targetId: 'bunker-SMOKE123', connId }));
    await incoming; await opened;

    const hostData = waitFor(host, m => m.type === 'data' && m.connId === connId && m.data?.action === 'joinLobby');
    const clientData = waitFor(client, m => m.type === 'data' && m.connId === connId && m.data?.type === 'hello');
    host.send(JSON.stringify({ type: 'data', connId, data: { type: 'hello', roomCode: 'SMOKE123' } }));
    client.send(JSON.stringify({ type: 'data', connId, data: { action: 'joinLobby', name: 'Smoke Player' } }));
    await hostData; await clientData;

    const heartbeat = waitFor(client, m => m.type === 'heartbeat-ack');
    client.send(JSON.stringify({ type: 'heartbeat', at: Date.now() }));
    await heartbeat;

    const closed = waitFor(host, m => m.type === 'connection-close' && m.connId === connId);
    client.send(JSON.stringify({ type: 'close-connection', connId }));
    await closed;

    const health = await fetch(`${BASE}/health`).then(r => r.json());
    if (health.ok !== true) throw new Error('Health check failed');
    console.log('PASS: WebSocket host/client registration, join handshake, bidirectional relay, heartbeat and close');
  } catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
  } finally {
    try { client?.close(); } catch {}
    try { host?.close(); } catch {}
    child.kill('SIGTERM');
  }
})();
