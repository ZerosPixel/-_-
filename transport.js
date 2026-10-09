/*
 * БУНКЕР — WebSocket transport.
 * Все браузеры подключаются к одному HTTPS/WSS-серверу. Это заменяет WebRTC/P2P
 * и не требует STUN/TURN или прямых входящих соединений между устройствами.
 */
(function () {
  'use strict';

  const OPEN = 1;
  const listeners = new Map();
  const randomId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

  class EventEmitter {
    on(name, fn) {
      if (typeof fn !== 'function') return this;
      if (!listeners.has(this)) listeners.set(this, new Map());
      const map = listeners.get(this);
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(fn);
      return this;
    }
    emit(name, ...args) {
      const map = listeners.get(this);
      const callbacks = map?.get(name);
      if (!callbacks) return false;
      for (const fn of [...callbacks]) {
        try { fn(...args); } catch (error) { console.error(`Bunker transport event ${name} failed`, error); }
      }
      return callbacks.length > 0;
    }
    removeAllListeners() { listeners.delete(this); }
  }

  function socketUrl() {
    if (window.BUNKER_WS_URL) return String(window.BUNKER_WS_URL);
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/ws`;
  }

  class BunkerDataConnection extends EventEmitter {
    constructor(peer, remotePeerId, connId = randomId('conn')) {
      super();
      this.provider = peer;
      this.peer = remotePeerId;
      this.id = connId;
      this.connId = connId;
      this.metadata = {};
      this.open = false;
      this.closed = false;
      this._announced = false;
    }
    send(data) {
      if (!this.open || this.closed) throw new Error('DataConnection is not open');
      this.provider._send({ type: 'data', connId: this.connId, data });
    }
    close() {
      if (this.closed) return;
      if (this.provider.open) this.provider._send({ type: 'close-connection', connId: this.connId });
      this._closeLocal();
    }
    _open() {
      if (this.closed || this.open) return;
      this.open = true;
      this._announced = true;
      this.emit('open');
    }
    _data(data) {
      if (!this.closed) this.emit('data', data);
    }
    _error(error) {
      if (!this.closed) this.emit('error', error);
    }
    _closeLocal() {
      if (this.closed) return;
      this.closed = true;
      this.open = false;
      this.provider.connections.delete(this.connId);
      this.emit('close');
    }
    _closeRemote() { this._closeLocal(); }
  }

  class BunkerPeer extends EventEmitter {
    constructor(id, options = {}) {
      super();
      this.id = id || randomId('client');
      this.options = options;
      this.isHost = /^bunker-[A-Z0-9]+$/i.test(this.id);
      // Stable for this host instance across WebSocket reconnects. Lets the server
      // distinguish a returning host from a different client reusing a room code.
      this._hostToken = this.isHost ? randomId('host') : null;
      this.disconnected = false;
      this.destroyed = false;
      this.open = false;
      this.connections = new Map();
      this._socket = null;
      this._heartbeat = null;
      this._lastHeartbeatAckAt = 0;
      this._everRegistered = false;
      this._manualClose = false;
      this._connectSocket();
    }

    _connectSocket() {
      if (this.destroyed) return;
      let socket;
      try { socket = new WebSocket(socketUrl()); }
      catch (error) {
        this.disconnected = true;
        this.emit('error', { type: 'network', message: error?.message || 'WebSocket is unavailable' });
        return;
      }
      this._socket = socket;
      this._manualClose = false;

      socket.addEventListener('open', () => {
        if (socket !== this._socket || this.destroyed) return;
        const message = this.isHost
          ? { type: 'register-host', peerId: this.id, roomCode: this.id.slice('bunker-'.length).toUpperCase(), hostToken: this._hostToken }
          : { type: 'register-client', peerId: this.id };
        this._rawSend(message);
        this._lastHeartbeatAckAt = Date.now();
        clearInterval(this._heartbeat);
        // Active WebSocket traffic prevents Render's free service from idling
        // while players are in the lobby/game. Browsers may throttle background timers.
        this._heartbeat = setInterval(() => {
          if (socket !== this._socket || socket.readyState !== OPEN) return;
          // A socket can look OPEN after a mobile tab resumes even though the server
          // disappeared. Reopen it if several heartbeat replies were missed.
          if (Date.now() - this._lastHeartbeatAckAt > 65000) {
            clearInterval(this._heartbeat);
            this._heartbeat = null;
            this.open = false;
            this.disconnected = true;
            for (const conn of [...this.connections.values()]) conn._closeRemote();
            try { socket.close(4002, 'heartbeat timeout'); } catch {}
            this._connectSocket();
            return;
          }
          this._rawSend({ type: 'heartbeat', at: Date.now() });
        }, 20000);
      });

      socket.addEventListener('message', event => {
        if (socket !== this._socket || this.destroyed) return;
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        this._handleServerMessage(message);
      });

      socket.addEventListener('error', () => {
        if (socket === this._socket && !this.destroyed) this.emit('error', { type: 'network', message: 'WebSocket connection failed' });
      });

      socket.addEventListener('close', () => {
        if (socket !== this._socket) return;
        clearInterval(this._heartbeat);
        this._heartbeat = null;
        const wasConnected = this.open;
        this.open = false;
        this.disconnected = true;
        for (const conn of [...this.connections.values()]) conn._closeRemote();
        if (!this.destroyed && !this._manualClose && (wasConnected || this._everRegistered)) this.emit('disconnected');
        if (this.destroyed) this.emit('close');
      });
    }

    _rawSend(message) {
      if (this._socket?.readyState !== OPEN) return false;
      try { this._socket.send(JSON.stringify(message)); return true; }
      catch (error) { console.warn('Bunker WebSocket send failed', error); return false; }
    }

    _send(message) {
      if (!this._rawSend(message)) throw new Error('WebSocket is not connected');
    }

    _handleServerMessage(message) {
      switch (message.type) {
        case 'registered':
          this.open = true;
          this.disconnected = false;
          this._everRegistered = true;
          this.emit('open', this.id);
          break;
        case 'server-error':
          this.emit('error', { type: message.errorType || 'server-error', message: message.message || 'Server rejected the connection' });
          break;
        case 'connection-open': {
          let conn = this.connections.get(message.connId);
          if (!conn) {
            conn = new BunkerDataConnection(this, message.peerId, message.connId);
            this.connections.set(conn.connId, conn);
          }
          conn._open();
          break;
        }
        case 'incoming': {
          let conn = this.connections.get(message.connId);
          if (!conn) {
            conn = new BunkerDataConnection(this, message.peerId, message.connId);
            this.connections.set(conn.connId, conn);
          }
          // Give the app a chance to attach listeners before the connection opens.
          this.emit('connection', conn);
          queueMicrotask(() => conn._open());
          break;
        }
        case 'data':
          this.connections.get(message.connId)?._data(message.data);
          break;
        case 'connection-close':
          this.connections.get(message.connId)?._closeRemote();
          break;
        case 'connect-error':
          this.emit('error', { type: message.errorType || 'peer-unavailable', message: message.message || 'Room is unavailable' });
          break;
        case 'heartbeat-ack':
          this._lastHeartbeatAckAt = Date.now();
          break;
      }
    }

    connect(peerId, options = {}) {
      const conn = new BunkerDataConnection(this, peerId, randomId('conn'));
      conn.options = options;
      this.connections.set(conn.connId, conn);
      if (!this.open) {
        queueMicrotask(() => conn._error({ type: 'network', message: 'Not connected to the room server' }));
        return conn;
      }
      this._send({ type: 'connect', targetId: peerId, connId: conn.connId });
      return conn;
    }

    reconnect() {
      if (this.destroyed || (this._socket && this._socket.readyState !== WebSocket.CLOSED && !this.disconnected)) return;
      clearInterval(this._heartbeat);
      this._heartbeat = null;
      this.open = false;
      this.disconnected = true;
      this._connectSocket();
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this._manualClose = true;
      clearInterval(this._heartbeat);
      this._heartbeat = null;
      for (const conn of [...this.connections.values()]) conn._closeRemote();
      try { this._socket?.close(1000, 'client destroyed'); } catch {}
      this.open = false;
      this.disconnected = true;
      // PeerJS emits close on destroy; keep the same observable contract.
      queueMicrotask(() => this.emit('close'));
    }
  }

  window.Peer = BunkerPeer;
  window.BunkerTransport = { Peer: BunkerPeer, DataConnection: BunkerDataConnection, socketUrl };
})();
