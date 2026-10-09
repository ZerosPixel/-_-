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
  let host, client, intruder, replacement, reconnectClient;
  try {
    await waitHealth();
    host = await connect();
    const hostRegistered = waitFor(host, m => m.type === 'registered');
    const hostToken = 'host-smoketest-session-token-12345';
    host.send(JSON.stringify({ type: 'register-host', peerId: 'bunker-SMOKE123', roomCode: 'SMOKE123', hostToken }));
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

    // A different host session must not take over the room.
    const intruder = await connect();
    const intruderError = waitFor(intruder, m => m.type === 'server-error');
    intruder.send(JSON.stringify({ type: 'register-host', peerId: 'bunker-SMOKE123', roomCode: 'SMOKE123', hostToken: 'host-a-different-session-token' }));
    if ((await intruderError).errorType !== 'unavailable-id') throw new Error('A different session incorrectly took the room');
    intruder.close();

    // The same host session may reclaim its room if a previous socket is stale.
    const replacement = await connect();
    const oldHostClosed = new Promise(resolve => host.addEventListener('close', () => resolve(true), { once: true }));
    const replacementRegistered = waitFor(replacement, m => m.type === 'registered');
    replacement.send(JSON.stringify({ type: 'register-host', peerId: 'bunker-SMOKE123', roomCode: 'SMOKE123', hostToken }));
    if ((await replacementRegistered).peerId !== 'bunker-SMOKE123') throw new Error('Returning host could not reclaim the room');
    await Promise.race([oldHostClosed, new Promise((_, reject) => setTimeout(() => reject(new Error('Old host socket was not closed after takeover')), 1000))]);

    // Cleanup from the old socket must not delete the replacement room mapping.
    const reconnectClient = await connect();
    const reconnectClientRegistered = waitFor(reconnectClient, m => m.type === 'registered');
    reconnectClient.send(JSON.stringify({ type: 'register-client', peerId: 'client-reconnecttest123456' }));
    await reconnectClientRegistered;
    const replacementIncoming = waitFor(replacement, m => m.type === 'incoming');
    const replacementOpen = waitFor(reconnectClient, m => m.type === 'connection-open');
    reconnectClient.send(JSON.stringify({ type: 'connect', targetId: 'bunker-SMOKE123', connId: 'conn-reconnecttest123456' }));
    await replacementIncoming; await replacementOpen;
    reconnectClient.close(); replacement.close();

    const health = await fetch(`${BASE}/health`).then(r => r.json());
    if (health.ok !== true) throw new Error('Health check failed');
    console.log('PASS: WebSocket relay, heartbeat, same-session host recovery, busy-room protection and stale-socket cleanup');
  } catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
  } finally {
    try { client?.close(); } catch {}
    try { host?.close(); } catch {}
    try { intruder?.close(); } catch {}
    try { replacement?.close(); } catch {}
    try { reconnectClient?.close(); } catch {}
    child.kill('SIGTERM');
  }
})();
