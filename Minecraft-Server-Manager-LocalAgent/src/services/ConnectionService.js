const { io } = require('socket.io-client');
const EventEmitter = require('events');

class ConnectionService extends EventEmitter {
  constructor(apiUrl, agentToken) {
    super();
    this.apiUrl = apiUrl;
    this.agentToken = agentToken;
    this.socket = null;
  }

  connect() {
    this.validateCredentials();
    
    this.socket = io(this.apiUrl, {
      auth: { token: this.agentToken }
    });

    this.attachSocketListeners();
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  validateCredentials() {
    if (!this.apiUrl) throw new Error('API URL is required');
    if (!this.agentToken) throw new Error('Agent Token is required');
  }

  attachSocketListeners() {
    this.socket.on('connect', () => this.emit('connected'));
    this.socket.on('disconnect', () => this.emit('disconnected'));
    this.socket.on('connect_error', (err) => this.emit('error', err));
    
    this.socket.on('START_SERVER', (config) => this.emit('command_start', config));
    this.socket.on('STOP_SERVER', () => this.emit('command_stop'));
  }

  sendTelemetry(stats) {
    this.verifyConnection();
    this.socket.emit('TELEMETRY_UPDATE', stats);
  }

  sendLog(logLine) {
    this.verifyConnection();
    this.socket.emit('SERVER_LOG', logLine);
  }

  sendTunnelInfo(info) {
    this.verifyConnection();
    this.socket.emit('TUNNEL_INFO', info);
  }

  verifyConnection() {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket is not connected');
    }
  }
}

module.exports = ConnectionService;
