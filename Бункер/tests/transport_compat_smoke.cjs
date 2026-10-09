'use strict';
// Runs the browser transport shim against the local WebSocket relay using Node 22's native WebSocket.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const PORT = 18766;
const BASE = `http://127.0.0.1:${PORT}`;

global.window = { BUNKER_WS_URL: `ws://127.0.0.1:${PORT}/ws` };
global.location = { protocol: 'http:', host: `127.0.0.1:${PORT}` };
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'transport.js'), 'utf8'), { filename: 'transport.js' });
const Peer = window.Peer;

function once(emitter, eventName, timeout = 3500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${eventName}`)), timeout);
    emitter.on(eventName, (...args) => { clearTimeout(timer); resolve(...args); });
  });
}
function waitHttp() {
  return (async () => {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`${BASE}/health`)).ok) return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('relay did not start');
  })();
}

(async () => {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  let host, client;
  try {
    await waitHttp();
    host = new Peer('bunker-SHIM1234');
    const hostOpen = once(host, 'open');
    await hostOpen;

    let hostConnPromise = once(host, 'connection');
    client = new Peer();
    await once(client, 'open');
    const clientConn = client.connect('bunker-SHIM1234', { reliable: true, serialization: 'json' });
    const clientConnOpen = once(clientConn, 'open');
    const hostConn = await hostConnPromise;
    const hostConnOpen = once(hostConn, 'open');
    await Promise.all([clientConnOpen, hostConnOpen]);

    const hostGot = once(hostConn, 'data');
    clientConn.send({ action: 'test-client', value: 42 });
    const hostMessage = await hostGot;
    if (hostMessage.action !== 'test-client' || hostMessage.value !== 42) throw new Error('client-to-host payload mismatch');

    const clientGot = once(clientConn, 'data');
    hostConn.send({ type: 'test-host', value: 99 });
    const clientMessage = await clientGot;
    if (clientMessage.type !== 'test-host' || clientMessage.value !== 99) throw new Error('host-to-client payload mismatch');

    clientConn.close();
    await once(hostConn, 'close');
    console.log('PASS: browser transport shim interoperates with the WebSocket relay in both directions');
  } catch (error) {
    console.error('FAIL:', error?.stack || error);
    process.exitCode = 1;
  } finally {
    try { client?.destroy(); } catch {}
    try { host?.destroy(); } catch {}
    child.kill('SIGTERM');
  }
})();
